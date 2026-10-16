import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  Fulfillment,
  FulfillmentLine,
  FulfillmentResponse,
  ListFulfillmentsResponse,
  PlanFulfillmentRequest,
  HoldFulfillmentRequest,
  ReleaseFulfillmentRequest,
  FulfillmentStatus,
} from '@stokrova/contracts';
import {
  PlanFulfillmentSchema,
  HoldFulfillmentSchema,
  ReleaseFulfillmentSchema,
} from '@stokrova/validation';
import {
  assertFulfillmentTransition,
  validateFulfillmentQuantities,
  LogisticsDomainError,
  type DomainFulfillmentStatus,
} from '@stokrova/domain';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class LogisticsFulfillmentService {
  private readonly fulfillments = new DurableMap<Fulfillment>('fulfillments');
  private fulfillmentSeq = 1001;

  constructor(private readonly ordersService: OrdersService) {}

  async planFulfillment(
    tenantId: string,
    req: PlanFulfillmentRequest,
  ): Promise<FulfillmentResponse> {
    const parsed = PlanFulfillmentSchema.parse(req);

    const order = await this.ordersService.getOrderById(tenantId, parsed.order_id);
    if (!order) {
      throw new NotFoundException(`Sales order '${parsed.order_id}' not found.`);
    }

    // Verify line quantities against order lines
    const existingFulfillments = Array.from(this.fulfillments.values()).filter(
      (f) => f.tenant_id === tenantId && f.order_id === parsed.order_id && f.status !== 'CANCELLED',
    );

    // Calculate already allocated quantities per order line
    const alreadyAllocatedMap = new Map<string, number>();
    for (const f of existingFulfillments) {
      for (const line of f.lines) {
        const cur = alreadyAllocatedMap.get(line.order_line_id) ?? 0;
        alreadyAllocatedMap.set(line.order_line_id, cur + line.quantity_allocated);
      }
    }

    const availableOrderLines = order.lines.map((l: any) => ({
      id: l.id,
      quantity: l.quantity - (alreadyAllocatedMap.get(l.id) ?? 0),
    }));

    try {
      validateFulfillmentQuantities(
        availableOrderLines,
        parsed.items.map((i) => ({
          order_line_id: i.order_line_id,
          quantity: i.quantity,
        })),
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const id = `ful_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const datePrefix = now.slice(0, 10).replace(/-/g, '');
    const fulfillmentNumber = `FUL-${datePrefix}-${this.fulfillmentSeq++}`;

    const lines: FulfillmentLine[] = parsed.items.map((item) => ({
      id: `fl_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      fulfillment_id: id,
      order_line_id: item.order_line_id,
      variant_id: item.variant_id,
      sku: item.sku,
      quantity_allocated: item.quantity,
      quantity_packed: 0,
      quantity_dispatched: 0,
      created_at: now,
      updated_at: now,
    }));

    const fulfillment: Fulfillment = {
      id,
      tenant_id: tenantId,
      fulfillment_number: fulfillmentNumber,
      order_id: parsed.order_id,
      warehouse_id: parsed.warehouse_id,
      status: 'PLANNED',
      priority: parsed.priority ?? 'STANDARD',
      delivery_window_start: parsed.delivery_window_start ?? null,
      delivery_window_end: parsed.delivery_window_end ?? null,
      hold_reason: null,
      hold_approved_by: null,
      released_at: null,
      lines,
      created_at: now,
      updated_at: now,
    };

    this.fulfillments.set(id, fulfillment);
    return { fulfillment };
  }

  async getFulfillment(
    tenantId: string,
    id: string,
  ): Promise<FulfillmentResponse> {
    const fulfillment = this.fulfillments.get(id);
    if (!fulfillment || fulfillment.tenant_id !== tenantId) {
      throw new NotFoundException(`Fulfillment '${id}' not found.`);
    }
    return { fulfillment };
  }

  async listFulfillments(
    tenantId: string,
    orderId?: string,
  ): Promise<ListFulfillmentsResponse> {
    const list = Array.from(this.fulfillments.values()).filter(
      (f) => f.tenant_id === tenantId && (!orderId || f.order_id === orderId),
    );
    return { fulfillments: list };
  }

  async holdFulfillment(
    tenantId: string,
    id: string,
    req: HoldFulfillmentRequest,
  ): Promise<FulfillmentResponse> {
    const parsed = HoldFulfillmentSchema.parse(req);
    const { fulfillment } = await this.getFulfillment(tenantId, id);

    try {
      assertFulfillmentTransition(
        fulfillment.status as DomainFulfillmentStatus,
        'HOLD',
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: Fulfillment = {
      ...fulfillment,
      status: 'HOLD',
      hold_reason: parsed.hold_reason,
      updated_at: now,
    };

    this.fulfillments.set(id, updated);
    return { fulfillment: updated };
  }

  async releaseFulfillment(
    tenantId: string,
    id: string,
    req: ReleaseFulfillmentRequest,
  ): Promise<FulfillmentResponse> {
    const parsed = ReleaseFulfillmentSchema.parse(req);
    const { fulfillment } = await this.getFulfillment(tenantId, id);

    if (fulfillment.status !== 'HOLD') {
      throw new BadRequestException(
        `Fulfillment '${id}' is not currently on hold.`,
      );
    }

    const now = new Date().toISOString();
    const updated: Fulfillment = {
      ...fulfillment,
      status: 'ALLOCATED',
      hold_approved_by: parsed.approved_by,
      released_at: now,
      updated_at: now,
    };

    this.fulfillments.set(id, updated);
    return { fulfillment: updated };
  }

  async updateFulfillmentStatus(
    tenantId: string,
    id: string,
    nextStatus: FulfillmentStatus,
  ): Promise<FulfillmentResponse> {
    const { fulfillment } = await this.getFulfillment(tenantId, id);

    try {
      assertFulfillmentTransition(
        fulfillment.status as DomainFulfillmentStatus,
        nextStatus as DomainFulfillmentStatus,
      );
    } catch (err: unknown) {
      if (err instanceof LogisticsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: Fulfillment = {
      ...fulfillment,
      status: nextStatus,
      updated_at: now,
    };

    this.fulfillments.set(id, updated);
    return { fulfillment: updated };
  }

  // Internal helper to retrieve fulfillment entity
  async getFulfillmentEntity(
    tenantId: string,
    id: string,
  ): Promise<Fulfillment> {
    const { fulfillment } = await this.getFulfillment(tenantId, id);
    return fulfillment;
  }
}
