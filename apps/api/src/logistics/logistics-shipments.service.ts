import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Shipment,
  ShipmentLine,
  ShipmentPackage,
  ShipmentMilestone,
  ShipmentResponse,
  ListShipmentsResponse,
  CreateShipmentRequest,
  BookCarrierShipmentRequest,
  CancelShipmentRequest,
  AddShipmentMilestoneRequest,
  CarrierWebhookPayload,
  ShipmentStatus,
} from '@stokrova/contracts';
import {
  CreateShipmentSchema,
  BookCarrierShipmentSchema,
  CancelShipmentSchema,
  AddShipmentMilestoneSchema,
  CarrierWebhookPayloadSchema,
} from '@stokrova/validation';
import {
  assertShipmentTransition,
  reconcileProviderMilestone,
  LogisticsDomainError,
  type DomainShipmentStatus,
} from '@stokrova/domain';
import { LogisticsFulfillmentService } from './logistics-fulfillment.service.js';
import { MockCarrierAdapter } from './adapters/carrier.adapter.js';

@Injectable()
export class LogisticsShipmentsService {
  private readonly logger = new Logger(LogisticsShipmentsService.name);
  private readonly shipments = new DurableMap<Shipment>('shipments');
  private readonly processedWebhooks = new Set<string>();
  private readonly bookedOperations = new Map<string, string>(); // operationId -> shipmentId
  private shipmentSeq = 1001;

  constructor(
    private readonly fulfillmentService: LogisticsFulfillmentService,
    private readonly carrierAdapter: MockCarrierAdapter,
  ) {}

  async createShipment(
    tenantId: string,
    req: CreateShipmentRequest,
  ): Promise<ShipmentResponse> {
    const parsed = CreateShipmentSchema.parse(req);
    const fulfillment = await this.fulfillmentService.getFulfillmentEntity(
      tenantId,
      parsed.fulfillment_id,
    );

    const shipmentId = `shp_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const datePrefix = now.slice(0, 10).replace(/-/g, '');
    const shipmentNumber = `SHP-${datePrefix}-${this.shipmentSeq++}`;

    const lines: ShipmentLine[] = parsed.lines.map((l) => ({
      id: `shpl_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      fulfillment_line_id: l.fulfillment_line_id,
      variant_id: l.variant_id,
      sku: l.sku,
      quantity: l.quantity,
      created_at: now,
    }));

    const packages: ShipmentPackage[] = parsed.packages.map((p) => ({
      id: `pkg_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      package_number: p.package_number,
      tracking_number: null,
      weight_grams: p.weight_grams,
      length_cm: p.length_cm ?? null,
      width_cm: p.width_cm ?? null,
      height_cm: p.height_cm ?? null,
      packaging_type: p.packaging_type ?? 'BOX',
      created_at: now,
    }));

    const initialMilestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: 'DRAFT',
      description: 'Shipment created in draft state',
      location: null,
      provider_event_id: null,
      recorded_at: now,
      created_at: now,
    };

    const shipment: Shipment = {
      id: shipmentId,
      tenant_id: tenantId,
      shipment_number: shipmentNumber,
      order_id: fulfillment.order_id,
      fulfillment_id: fulfillment.id,
      warehouse_id: fulfillment.warehouse_id,
      carrier_id: parsed.carrier_id ?? null,
      carrier_service_id: parsed.carrier_service_id ?? null,
      run_id: null,
      stop_id: null,
      tracking_number: null,
      label_url: null,
      status: 'DRAFT',
      lines,
      packages,
      milestones: [initialMilestone],
      charges: [],
      dispatched_at: null,
      delivered_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    this.shipments.set(shipmentId, shipment);
    return { shipment };
  }

  async bookCarrierShipment(
    tenantId: string,
    shipmentId: string,
    req: BookCarrierShipmentRequest,
  ): Promise<ShipmentResponse> {
    const parsed = BookCarrierShipmentSchema.parse(req);
    const { shipment } = await this.getShipment(tenantId, shipmentId);

    // Idempotent recovery
    const existingShipmentId = this.bookedOperations.get(parsed.operation_id);
    if (existingShipmentId === shipmentId && shipment.tracking_number) {
      return { shipment };
    }

    try {
      assertShipmentTransition(
        shipment.status as DomainShipmentStatus,
        'READY_FOR_DISPATCH',
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // Call carrier adapter with timeout and failure recovery
    let bookingResult;
    try {
      bookingResult = await this.carrierAdapter.bookShipment(
        shipment.shipment_number,
        parsed.service_id,
        parsed.operation_id,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Carrier booking failed for shipment ${shipmentId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        `Carrier booking service temporarily unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    this.bookedOperations.set(parsed.operation_id, shipmentId);

    const now = new Date().toISOString();
    const milestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: 'READY_FOR_DISPATCH',
      description: `Booked with carrier. Tracking number assigned: ${bookingResult.trackingNumber}`,
      location: null,
      provider_event_id: null,
      recorded_at: now,
      created_at: now,
    };

    // Update package tracking numbers
    const updatedPackages = shipment.packages.map((p) => ({
      ...p,
      tracking_number: bookingResult.trackingNumber,
    }));

    const updated: Shipment = {
      ...shipment,
      status: 'READY_FOR_DISPATCH',
      tracking_number: bookingResult.trackingNumber,
      label_url: bookingResult.labelUrl,
      packages: updatedPackages,
      milestones: [...shipment.milestones, milestone],
      updated_at: now,
    };

    this.shipments.set(shipmentId, updated);
    return { shipment: updated };
  }

  async dispatchShipment(
    tenantId: string,
    shipmentId: string,
  ): Promise<ShipmentResponse> {
    const { shipment } = await this.getShipment(tenantId, shipmentId);

    // Concurrency / double-dispatch check
    if (shipment.status === 'DISPATCHED' || shipment.dispatched_at) {
      throw new BadRequestException(
        `Shipment '${shipmentId}' has already been dispatched at ${shipment.dispatched_at}.`,
      );
    }

    try {
      assertShipmentTransition(
        shipment.status as DomainShipmentStatus,
        'DISPATCHED',
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const milestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: 'DISPATCHED',
      description: 'Shipment physically departed origin facility',
      location: 'Origin Warehouse',
      provider_event_id: null,
      recorded_at: now,
      created_at: now,
    };

    const updated: Shipment = {
      ...shipment,
      status: 'DISPATCHED',
      dispatched_at: now,
      milestones: [...shipment.milestones, milestone],
      updated_at: now,
    };

    this.shipments.set(shipmentId, updated);

    // Update fulfillment status
    await this.fulfillmentService.updateFulfillmentStatus(
      tenantId,
      shipment.fulfillment_id,
      'DISPATCHED',
    );

    return { shipment: updated };
  }

  async addMilestone(
    tenantId: string,
    shipmentId: string,
    req: AddShipmentMilestoneRequest,
  ): Promise<ShipmentResponse> {
    const parsed = AddShipmentMilestoneSchema.parse(req);
    const { shipment } = await this.getShipment(tenantId, shipmentId);

    const reconciliation = reconcileProviderMilestone(
      shipment.status as DomainShipmentStatus,
      parsed.status as DomainShipmentStatus,
    );

    const now = new Date().toISOString();
    const milestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: parsed.status,
      description: reconciliation.shouldUpdate
        ? parsed.description
        : `${parsed.description} [RECONCILED: ${reconciliation.reason}]`,
      location: parsed.location ?? null,
      provider_event_id: parsed.provider_event_id ?? null,
      recorded_at: now,
      created_at: now,
    };

    const newStatus = reconciliation.shouldUpdate ? parsed.status : shipment.status;
    const deliveredAt =
      newStatus === 'DELIVERED' && !shipment.delivered_at
        ? now
        : shipment.delivered_at;

    const updated: Shipment = {
      ...shipment,
      status: newStatus,
      delivered_at: deliveredAt,
      milestones: [...shipment.milestones, milestone],
      updated_at: now,
    };

    this.shipments.set(shipmentId, updated);
    return { shipment: updated };
  }

  async handleCarrierWebhook(
    payload: CarrierWebhookPayload,
  ): Promise<{ success: boolean; processed: boolean; reason?: string }> {
    const parsed = CarrierWebhookPayloadSchema.parse(payload);
    const webhookKey = `${parsed.carrier_code}:${parsed.provider_event_id}:${parsed.tracking_number}`;

    // Deduplication check
    if (this.processedWebhooks.has(webhookKey)) {
      this.logger.log(`Skipping duplicate carrier webhook ${webhookKey}`);
      return { success: true, processed: false, reason: 'DUPLICATE_WEBHOOK' };
    }

    // Find shipment by tracking number
    const targetShipment = Array.from(this.shipments.values()).find(
      (s) => s.tracking_number === parsed.tracking_number,
    );

    if (!targetShipment) {
      this.logger.warn(`Webhook received for unknown tracking number ${parsed.tracking_number}`);
      return { success: false, processed: false, reason: 'SHIPMENT_NOT_FOUND' };
    }

    this.processedWebhooks.add(webhookKey);

    await this.addMilestone(targetShipment.tenant_id, targetShipment.id, {
      status: parsed.status,
      description: parsed.description,
      location: parsed.location,
      provider_event_id: parsed.provider_event_id,
    });

    return { success: true, processed: true };
  }

  async cancelShipment(
    tenantId: string,
    shipmentId: string,
    req: CancelShipmentRequest,
  ): Promise<ShipmentResponse> {
    const parsed = CancelShipmentSchema.parse(req);
    const { shipment } = await this.getShipment(tenantId, shipmentId);

    try {
      assertShipmentTransition(
        shipment.status as DomainShipmentStatus,
        'CANCELLED',
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const milestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: 'CANCELLED',
      description: `Shipment cancelled. Reason: ${parsed.reason}`,
      location: null,
      provider_event_id: null,
      recorded_at: now,
      created_at: now,
    };

    const updated: Shipment = {
      ...shipment,
      status: 'CANCELLED',
      cancelled_at: now,
      milestones: [...shipment.milestones, milestone],
      updated_at: now,
    };

    this.shipments.set(shipmentId, updated);
    return { shipment: updated };
  }

  async transitionShipmentStatus(
    tenantId: string,
    shipmentId: string,
    nextStatus: ShipmentStatus,
    reason?: string,
  ): Promise<ShipmentResponse> {
    const { shipment } = await this.getShipment(tenantId, shipmentId);

    try {
      assertShipmentTransition(
        shipment.status as DomainShipmentStatus,
        nextStatus as DomainShipmentStatus,
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const milestone: ShipmentMilestone = {
      id: `mil_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      status: nextStatus,
      description: reason ?? `Status changed to ${nextStatus}`,
      location: null,
      provider_event_id: null,
      recorded_at: now,
      created_at: now,
    };

    const deliveredAt =
      nextStatus === 'DELIVERED' && !shipment.delivered_at
        ? now
        : shipment.delivered_at;

    const updated: Shipment = {
      ...shipment,
      status: nextStatus,
      delivered_at: deliveredAt,
      milestones: [...shipment.milestones, milestone],
      updated_at: now,
    };

    this.shipments.set(shipmentId, updated);
    return { shipment: updated };
  }

  async getShipment(
    tenantId: string,
    id: string,
  ): Promise<ShipmentResponse> {
    const shipment = this.shipments.get(id);
    if (!shipment || shipment.tenant_id !== tenantId) {
      throw new NotFoundException(`Shipment '${id}' not found.`);
    }
    return { shipment };
  }

  async listShipments(
    tenantId: string,
    filters?: { orderId?: string; fulfillmentId?: string; status?: string },
  ): Promise<ListShipmentsResponse> {
    const list = Array.from(this.shipments.values()).filter(
      (s) =>
        s.tenant_id === tenantId &&
        (!filters?.orderId || s.order_id === filters.orderId) &&
        (!filters?.fulfillmentId || s.fulfillment_id === filters.fulfillmentId) &&
        (!filters?.status || s.status === filters.status),
    );
    return { shipments: list };
  }

  // Internal helper
  async getShipmentEntity(tenantId: string, id: string): Promise<Shipment> {
    const { shipment } = await this.getShipment(tenantId, id);
    return shipment;
  }
}
