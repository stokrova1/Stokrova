import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ProofOfDelivery,
  PodResponse,
  DeliveryStopResponse,
  SubmitPodRequest,
  FailStopRequest,
} from '@stokrova/contracts';
import {
  SubmitPodSchema,
  FailStopSchema,
} from '@stokrova/validation';
import {
  assertDeliveryStopTransition,
  assertGeofenceWithinThreshold,
  evaluateRunCompletion,
  DeliveryFleetDomainError,
  type DomainDeliveryStopStatus,
} from '@stokrova/domain';
import { DeliveryRoutingService } from './delivery-routing.service.js';
import { FleetService } from './fleet.service.js';

@Injectable()
export class PodService {
  private readonly pods = new Map<string, ProofOfDelivery>();

  constructor(
    private readonly routingService: DeliveryRoutingService,
    private readonly fleetService: FleetService,
  ) {}

  async arriveAtStop(
    tenantId: string,
    stopId: string,
  ): Promise<DeliveryStopResponse> {
    const stop = await this.routingService.getStopEntity(tenantId, stopId);

    try {
      assertDeliveryStopTransition(
        stop.status as DomainDeliveryStopStatus,
        'ARRIVED',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated = {
      ...stop,
      status: 'ARRIVED' as const,
      actual_arrival: now,
      updated_at: now,
    };

    await this.routingService.updateStopEntity(tenantId, updated);
    return { stop: updated };
  }

  async submitPod(
    tenantId: string,
    stopId: string,
    req: SubmitPodRequest,
  ): Promise<PodResponse> {
    const parsed = SubmitPodSchema.parse(req);
    const stop = await this.routingService.getStopEntity(tenantId, stopId);

    try {
      assertDeliveryStopTransition(
        stop.status as DomainDeliveryStopStatus,
        'DELIVERED',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // Geofence verification if both target and delivered coordinates exist
    let geofenceDistance: number | null = null;
    if (
      stop.latitude_microdegrees !== null &&
      stop.latitude_microdegrees !== undefined &&
      stop.longitude_microdegrees !== null &&
      stop.longitude_microdegrees !== undefined &&
      parsed.delivered_latitude_microdegrees !== null &&
      parsed.delivered_latitude_microdegrees !== undefined &&
      parsed.delivered_longitude_microdegrees !== null &&
      parsed.delivered_longitude_microdegrees !== undefined
    ) {
      try {
        geofenceDistance = assertGeofenceWithinThreshold(
          stop.latitude_microdegrees,
          stop.longitude_microdegrees,
          parsed.delivered_latitude_microdegrees,
          parsed.delivered_longitude_microdegrees,
          250, // 250m max geofence tolerance
        );
      } catch (err: unknown) {
        if (err instanceof DeliveryFleetDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const now = new Date().toISOString();
    const podId = `pod_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const pod: ProofOfDelivery = {
      id: podId,
      tenant_id: tenantId,
      run_id: stop.run_id,
      stop_id: stop.id,
      verification_method: parsed.verification_method,
      recipient_name: parsed.recipient_name,
      signature_svg: parsed.signature_svg ?? null,
      photo_url: parsed.photo_url ?? null,
      otp_code: parsed.otp_code ?? null,
      delivered_latitude_microdegrees: parsed.delivered_latitude_microdegrees ?? null,
      delivered_longitude_microdegrees: parsed.delivered_longitude_microdegrees ?? null,
      geofence_distance_meters: geofenceDistance,
      notes: parsed.notes ?? null,
      delivered_at: now,
      created_at: now,
    };
    this.pods.set(pod.id, pod);

    const updatedStop = {
      ...stop,
      status: 'DELIVERED' as const,
      updated_at: now,
    };
    await this.routingService.updateStopEntity(tenantId, updatedStop);

    // Check if run is complete
    await this.checkRunCompletion(tenantId, stop.run_id);

    return { pod, stop: updatedStop };
  }

  async failStop(
    tenantId: string,
    stopId: string,
    req: FailStopRequest,
  ): Promise<DeliveryStopResponse> {
    const parsed = FailStopSchema.parse(req);
    const stop = await this.routingService.getStopEntity(tenantId, stopId);

    try {
      assertDeliveryStopTransition(
        stop.status as DomainDeliveryStopStatus,
        'ATTEMPTED_FAILED',
      );
    } catch (err: unknown) {
      if (err instanceof DeliveryFleetDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updatedStop = {
      ...stop,
      status: 'ATTEMPTED_FAILED' as const,
      failure_reason: parsed.failure_reason,
      notes: parsed.notes ? `${stop.notes ? stop.notes + '\n' : ''}${parsed.notes}` : stop.notes,
      updated_at: now,
    };
    await this.routingService.updateStopEntity(tenantId, updatedStop);

    // Check if run is complete
    await this.checkRunCompletion(tenantId, stop.run_id);

    return { stop: updatedStop };
  }

  async getPodByStopId(
    tenantId: string,
    stopId: string,
  ): Promise<ProofOfDelivery> {
    await this.routingService.getStopEntity(tenantId, stopId);
    const pod = Array.from(this.pods.values()).find(
      (p) => p.tenant_id === tenantId && p.stop_id === stopId,
    );
    if (!pod) {
      throw new NotFoundException(`Proof of delivery for stop '${stopId}' not found.`);
    }
    return pod;
  }

  private async checkRunCompletion(
    tenantId: string,
    runId: string,
  ): Promise<void> {
    const run = await this.routingService.getRunEntity(tenantId, runId);
    const isComplete = evaluateRunCompletion(
      run.stops.map((s) => ({ status: s.status as DomainDeliveryStopStatus })),
    );

    if (isComplete && run.status !== 'COMPLETED') {
      const now = new Date().toISOString();
      await this.routingService.updateRunEntity(tenantId, {
        ...run,
        status: 'COMPLETED',
        completed_at: now,
        updated_at: now,
      });

      // Release driver back to ON_DUTY
      if (run.driver_id) {
        await this.fleetService.updateDriverShift(tenantId, run.driver_id, {
          shift_status: 'ON_DUTY',
        });
      }
    }
  }
}
