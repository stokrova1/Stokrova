import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  DeliveryStop,
  DeliveryRunResponse,
  SubmitPodRequest,
  FailStopRequest,
  ProofOfDelivery,
} from '@stokrova/contracts';
import {
  assertRunCapacityLimits,
  reconcileDeliveredQuantities,
  evaluateDeliveryAttemptPolicy,
  LogisticsDomainError,
  type DeliveryReconciliationResult,
  type DeliveryAttemptEvaluation,
} from '@stokrova/domain';
import { DeliveryRoutingService } from '../delivery/delivery-routing.service.js';
import { FleetService } from '../delivery/fleet.service.js';
import { PodService } from '../delivery/pod.service.js';
import { LogisticsShipmentsService } from './logistics-shipments.service.js';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class LogisticsDeliveryService {
  private readonly podOperations = new Map<
    string,
    { pod: ProofOfDelivery; orderReconciliation: DeliveryReconciliationResult }
  >();
  private readonly stopAttempts = new Map<string, number>();

  constructor(
    private readonly routingService: DeliveryRoutingService,
    private readonly fleetService: FleetService,
    private readonly podService: PodService,
    private readonly shipmentsService: LogisticsShipmentsService,
    private readonly ordersService: OrdersService,
  ) {}

  async createDeliveryRunFromShipments(
    tenantId: string,
    warehouseId: string,
    vehicleId: string,
    driverId: string,
    shipmentIds: string[],
  ): Promise<DeliveryRunResponse> {
    if (!shipmentIds || shipmentIds.length === 0) {
      throw new BadRequestException('At least one shipment is required to create a delivery run.');
    }

    const vehicle = await this.fleetService.getVehicleEntity(tenantId, vehicleId);
    await this.fleetService.getDriverEntity(tenantId, driverId);

    // Fetch and validate all shipments
    const shipments = await Promise.all(
      shipmentIds.map((id) => this.shipmentsService.getShipmentEntity(tenantId, id)),
    );

    let totalWeight = 0;
    let totalVolume = 0;

    for (const s of shipments) {
      if (s.run_id) {
        throw new BadRequestException(
          `Shipment '${s.shipment_number}' is already assigned to delivery run '${s.run_id}'.`,
        );
      }
      for (const p of s.packages) {
        totalWeight += p.weight_grams;
        const vol = (p.length_cm ?? 20) * (p.width_cm ?? 20) * (p.height_cm ?? 20);
        totalVolume += vol;
      }
    }

    // Verify vehicle capacity limits
    try {
      assertRunCapacityLimits(
        vehicle.max_payload_grams,
        vehicle.max_volume_cm3,
        totalWeight,
        totalVolume,
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // Create stops for each shipment
    const stopsData = shipments.map((s) => {
      let shipWeight = 0;
      let shipVolume = 0;
      for (const p of s.packages) {
        shipWeight += p.weight_grams;
        shipVolume += (p.length_cm ?? 20) * (p.width_cm ?? 20) * (p.height_cm ?? 20);
      }

      return {
        order_id: s.order_id,
        order_number: s.shipment_number,
        recipient_name: 'Customer Delivery Contact',
        recipient_phone: '+15550001',
        delivery_address: '123 Enterprise Blvd, Metropolis',
        total_weight_grams: shipWeight,
        total_volume_cm3: shipVolume,
      };
    });

    const runRes = await this.routingService.createDeliveryRun(tenantId, {
      warehouse_id: warehouseId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      stops: stopsData,
    });

    // Update shipments with run and stop identifiers
    const createdRun = runRes.run;
    const runStops = createdRun.stops ?? [];

    for (let i = 0; i < shipments.length; i++) {
      const ship = shipments[i];
      const stop = runStops[i];
      if (ship && stop) {
        ship.run_id = createdRun.id;
        ship.stop_id = stop.id;
      }
    }

    return runRes;
  }

  async dispatchDeliveryRun(
    tenantId: string,
    runId: string,
  ): Promise<DeliveryRunResponse> {
    const run = await this.routingService.getRunEntity(tenantId, runId);

    const dispatchRes = await this.routingService.dispatchRun(tenantId, runId, {
      vehicle_id: run.vehicle_id ?? 'default_vehicle',
      driver_id: run.driver_id ?? 'default_driver',
    });

    // Transition associated shipments to OUT_FOR_DELIVERY
    const runStops = run.stops ?? [];
    for (const stop of runStops) {
      const matchingShipment = Array.from(
        (await this.shipmentsService.listShipments(tenantId)).shipments,
      ).find((s) => s.stop_id === stop.id || s.order_id === stop.order_id);

      if (matchingShipment && matchingShipment.status !== 'DELIVERED') {
        await this.shipmentsService.transitionShipmentStatus(
          tenantId,
          matchingShipment.id,
          'OUT_FOR_DELIVERY',
          'Assigned driver en route for delivery',
        );
      }
    }

    return dispatchRes;
  }

  async recordProofOfDelivery(
    tenantId: string,
    runId: string,
    stopId: string,
    driverUserId: string,
    req: SubmitPodRequest,
    operationId: string,
  ): Promise<{ pod: ProofOfDelivery; orderReconciliation: DeliveryReconciliationResult }> {
    // Idempotent recovery
    const existing = this.podOperations.get(operationId);
    if (existing) {
      return existing;
    }

    const run = await this.routingService.getRunEntity(tenantId, runId);
    if (run.driver_id) {
      const driver = await this.fleetService.getDriverEntity(tenantId, run.driver_id);
      if (driver.user_id !== driverUserId) {
        throw new ForbiddenException(
          `Driver '${driverUserId}' is not authorized to submit POD for run '${runId}' assigned to '${driver.user_id}'.`,
        );
      }
    }

    const stop = await this.routingService.getStopEntity(tenantId, stopId);

    // Arrive at stop if not arrived
    if (stop.status === 'PENDING') {
      await this.podService.arriveAtStop(tenantId, stopId);
    }

    const podRes = await this.podService.submitPod(tenantId, stopId, req);

    // Transition shipment to DELIVERED
    const shipmentsRes = await this.shipmentsService.listShipments(tenantId, {
      orderId: stop.order_id,
    });
    const shipment = shipmentsRes.shipments.find((s) => s.stop_id === stopId || s.order_id === stop.order_id);

    if (shipment) {
      await this.shipmentsService.transitionShipmentStatus(
        tenantId,
        shipment.id,
        'DELIVERED',
        `Delivered via ${req.verification_method}. Signed by ${req.recipient_name}.`,
      );
    }

    // Reconcile order quantities
    const order = await this.ordersService.getOrderById(tenantId, stop.order_id);
    const totalOrderQty = order.lines.reduce((acc: number, l: any) => acc + l.quantity, 0);

    // Calculate delivered quantity from this shipment/stop
    const currentDeliveredQty = shipment
      ? shipment.lines.reduce((acc: number, l: any) => acc + l.quantity, 0)
      : totalOrderQty;

    const previouslyDeliveredQty = order.lines.reduce(
      (acc: number, l: any) => acc + l.fulfilled_quantity,
      0,
    );

    const reconciliation = reconcileDeliveredQuantities(
      totalOrderQty,
      previouslyDeliveredQty,
      currentDeliveredQty,
    );

    const result = {
      pod: podRes.pod,
      orderReconciliation: reconciliation,
    };

    this.podOperations.set(operationId, result);
    return result;
  }

  async recordFailedAttempt(
    tenantId: string,
    runId: string,
    stopId: string,
    driverUserId: string,
    req: FailStopRequest,
  ): Promise<{ stop: DeliveryStop; outcome: DeliveryAttemptEvaluation }> {
    const run = await this.routingService.getRunEntity(tenantId, runId);
    if (run.driver_id) {
      const driver = await this.fleetService.getDriverEntity(tenantId, run.driver_id);
      if (driver.user_id !== driverUserId) {
        throw new ForbiddenException(
          `Driver '${driverUserId}' is not authorized to record stop failure for run '${runId}'.`,
        );
      }
    }

    const stop = await this.routingService.getStopEntity(tenantId, stopId);
    const currentAttempts = (this.stopAttempts.get(stopId) ?? 0) + 1;
    this.stopAttempts.set(stopId, currentAttempts);

    const policyOutcome = evaluateDeliveryAttemptPolicy(currentAttempts, 3);

    const failRes = await this.podService.failStop(tenantId, stopId, req);

    // Update shipment state based on policy
    const shipmentsRes = await this.shipmentsService.listShipments(tenantId, {
      orderId: stop.order_id,
    });
    const shipment = shipmentsRes.shipments.find((s) => s.stop_id === stopId || s.order_id === stop.order_id);

    if (shipment) {
      const nextStatus =
        policyOutcome.action === 'RETURN_TO_ORIGIN'
          ? 'RETURNED_TO_ORIGIN'
          : 'FAILED_ATTEMPT';

      await this.shipmentsService.transitionShipmentStatus(
        tenantId,
        shipment.id,
        nextStatus,
        `Attempt ${currentAttempts}/3 failed: ${req.failure_reason}. Policy action: ${policyOutcome.action}.`,
      );
    }

    return {
      stop: failRes.stop,
      outcome: policyOutcome,
    };
  }

  async syncOfflineDelivery(
    tenantId: string,
    driverUserId: string,
    offlinePodRecords: {
      operation_id: string;
      stop_id: string;
      run_id: string;
      pod_data: SubmitPodRequest;
    }[],
  ): Promise<{ syncedCount: number; duplicateCount: number; conflicts: string[] }> {
    let syncedCount = 0;
    let duplicateCount = 0;
    const conflicts: string[] = [];

    for (const record of offlinePodRecords) {
      if (this.podOperations.has(record.operation_id)) {
        duplicateCount++;
        continue;
      }

      try {
        await this.recordProofOfDelivery(
          tenantId,
          record.run_id,
          record.stop_id,
          driverUserId,
          record.pod_data,
          record.operation_id,
        );
        syncedCount++;
      } catch (err: unknown) {
        conflicts.push(
          `Stop ${record.stop_id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { syncedCount, duplicateCount, conflicts };
  }
}
