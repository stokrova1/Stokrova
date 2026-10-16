import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SalesChannelType,
  SalesOrderStatus,
  OrderPaymentStatus,
  OrderFulfillmentStatus,
  SalesOrderLineItem,
  CreateSalesOrderRequest,
  SalesOrderResponse,
  FulfillOrderLinesRequest,
  DispatchSalesOrderRequest,
} from '@stokrova/contracts';
import {
  OrderDomainError,
  InvalidOrderStateTransitionError,
  SalesOrderStatuses,
  canTransitionSalesOrderStatus,
  calculateOrderLineTotals,
  calculateOrderSummary,
  assertValidLineFulfillment,
  evaluateOrderFulfillmentStatus,
} from '@stokrova/domain';
import { BranchesService } from '../work-centers/branches.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { StockReservationsService } from '../inventory/stock-reservations.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { PosService } from '../pos/pos.service.js';
import { SalesLedgerWriter } from '../infrastructure/database/sales-ledger.writer.js';

export interface StoredSalesOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  channel_type: SalesChannelType;
  branch_id: string;
  warehouse_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  currency_code: string;
  status: SalesOrderStatus;
  payment_status: OrderPaymentStatus;
  fulfillment_status: OrderFulfillmentStatus;
  pos_session_id: string | null;
  pos_register_id: string | null;
  subtotal_minor: bigint;
  total_discount_minor: bigint;
  total_tax_minor: bigint;
  grand_total_minor: bigint;
  amount_paid_minor: bigint;
  lines: SalesOrderLineItem[];
  reservation_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

@Injectable()
export class OrdersService {
  private ordersStore = new Map<string, StoredSalesOrder>();
  private orderSequence = 1001;

  constructor(
    private readonly branchesService: BranchesService,
    private readonly warehousesService: WarehousesService,
    private readonly variantsService: VariantsService,
    private readonly stockReservationsService: StockReservationsService,
    private readonly stockLedgerService: StockLedgerService,
    @Optional() private readonly posService?: PosService,
    @Optional() private readonly ledger?: SalesLedgerWriter,
  ) {}

  /** Write-through to the tenant database so dashboards read durable records. */
  private async persist(order: StoredSalesOrder): Promise<void> {
    await this.ledger?.saveOrder(order);
  }

  // --------------------------------------------------------------------------
  // Sales Order Lifecycle Management
  // --------------------------------------------------------------------------

  async createSalesOrder(
    tenantId: string,
    req: CreateSalesOrderRequest,
  ): Promise<SalesOrderResponse> {
    // 1. Validate branch & warehouse
    await this.branchesService.getBranchById(tenantId, req.branch_id);
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    // 2. Validate POS metadata if provided
    if (req.pos_session_id && this.posService) {
      await this.posService.getSessionById(tenantId, req.pos_session_id);
    }
    if (req.pos_register_id && this.posService) {
      await this.posService.getRegisterConfigById(tenantId, req.pos_register_id);
    }

    if (!req.lines || req.lines.length === 0) {
      throw new BadRequestException('Sales order must contain at least one line item.');
    }

    const orderId = `so_${randomUUID().replace(/-/g, '')}`;
    const orderNumber = `SO-${Date.now().toString().slice(-6)}-${this.orderSequence++}`;
    const now = new Date().toISOString();

    // 3. Process lines and calculate line math
    const lineItems: SalesOrderLineItem[] = [];
    const calculatedLines = [];

    for (const inputLine of req.lines) {
      const variant = await this.variantsService.getVariantById(tenantId, inputLine.variant_id);

      try {
        const lineTotals = calculateOrderLineTotals({
          quantity: inputLine.quantity,
          unit_price_minor: BigInt(inputLine.unit_price_minor),
          discount_minor: inputLine.discount_minor ? BigInt(inputLine.discount_minor) : 0n,
          tax_minor: inputLine.tax_minor ? BigInt(inputLine.tax_minor) : 0n,
        });

        calculatedLines.push(lineTotals);

        const lineItem: SalesOrderLineItem = {
          id: `sol_${randomUUID().replace(/-/g, '')}`,
          order_id: orderId,
          variant_id: inputLine.variant_id,
          sku: variant.sku,
          product_name: variant.sku,
          quantity: lineTotals.quantity,
          fulfilled_quantity: 0,
          unit_price_minor: lineTotals.unit_price_minor.toString(),
          discount_minor: lineTotals.discount_minor.toString(),
          tax_minor: lineTotals.tax_minor.toString(),
          line_total_minor: lineTotals.line_total_minor.toString(),
          // Historical cost at time of sale; null when the variant has no recorded cost.
          cogs_minor: (() => {
            const unitCost = BigInt((variant as { cost_price_minor?: string | number | bigint }).cost_price_minor ?? 0);
            return unitCost > 0n ? (unitCost * BigInt(lineTotals.quantity)).toString() : null;
          })(),
        } as SalesOrderLineItem & { cogs_minor: string | null };

        lineItems.push(lineItem);
      } catch (err) {
        if (err instanceof OrderDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    // 4. Calculate overall order summary
    const summary = calculateOrderSummary(calculatedLines);

    const storedOrder: StoredSalesOrder = {
      id: orderId,
      tenant_id: tenantId,
      order_number: orderNumber,
      channel_type: req.channel_type,
      branch_id: req.branch_id,
      warehouse_id: req.warehouse_id,
      customer_id: req.customer_id ?? null,
      customer_name: req.customer_name ?? null,
      customer_email: req.customer_email ?? null,
      customer_phone: req.customer_phone ?? null,
      shipping_address: req.shipping_address ?? null,
      billing_address: req.billing_address ?? null,
      currency_code: req.currency_code ?? 'USD',
      status: 'DRAFT',
      payment_status: 'UNPAID',
      fulfillment_status: 'UNFULFILLED',
      pos_session_id: req.pos_session_id ?? null,
      pos_register_id: req.pos_register_id ?? null,
      subtotal_minor: summary.subtotal_minor,
      total_discount_minor: summary.total_discount_minor,
      total_tax_minor: summary.total_tax_minor,
      grand_total_minor: summary.grand_total_minor,
      amount_paid_minor: 0n,
      lines: lineItems,
      reservation_ids: [],
      notes: req.notes ?? null,
      created_at: now,
      updated_at: now,
      confirmed_at: null,
      dispatched_at: null,
      delivered_at: null,
      cancelled_at: null,
    };

    this.ordersStore.set(orderId, storedOrder);
    await this.persist(storedOrder);
    return this.mapToResponse(storedOrder);
  }

  async getOrderById(tenantId: string, orderId: string): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }
    return this.mapToResponse(order);
  }

  async listSalesOrders(
    tenantId: string,
    filters?: {
      channel_type?: SalesChannelType;
      status?: SalesOrderStatus;
      customer_id?: string;
      branch_id?: string;
    },
  ): Promise<SalesOrderResponse[]> {
    return Array.from(this.ordersStore.values())
      .filter((o) => {
        if (o.tenant_id !== tenantId) return false;
        if (filters?.channel_type && o.channel_type !== filters.channel_type) return false;
        if (filters?.status && o.status !== filters.status) return false;
        if (filters?.customer_id && o.customer_id !== filters.customer_id) return false;
        if (filters?.branch_id && o.branch_id !== filters.branch_id) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((o) => this.mapToResponse(o));
  }

  async confirmSalesOrder(tenantId: string, orderId: string): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    if (!canTransitionSalesOrderStatus(order.status, SalesOrderStatuses.CONFIRMED)) {
      throw new BadRequestException(
        new InvalidOrderStateTransitionError(order.status, SalesOrderStatuses.CONFIRMED).message,
      );
    }

    // Reserve stock for all lines
    const reservationIds: string[] = [];
    for (const line of order.lines) {
      const reservation = await this.stockReservationsService.createReservation(tenantId, {
        variant_id: line.variant_id,
        warehouse_id: order.warehouse_id,
        quantity: line.quantity,
        reference_type: 'SALES_ORDER',
        reference_id: order.id,
      });
      reservationIds.push(reservation.id);
    }

    const now = new Date().toISOString();
    order.status = 'CONFIRMED';
    order.confirmed_at = now;
    order.updated_at = now;
    order.reservation_ids = reservationIds;

    await this.persist(order);
    return this.mapToResponse(order);
  }

  async fulfillOrderLines(
    tenantId: string,
    orderId: string,
    req: FulfillOrderLinesRequest,
  ): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    if (order.status === 'DRAFT' || order.status === 'CANCELLED' || order.status === 'DELIVERED') {
      throw new BadRequestException(
        `Cannot fulfill order in status '${order.status}'. Order must be confirmed first.`,
      );
    }

    for (const item of req.fulfillment_items) {
      const line = order.lines.find((l) => l.id === item.line_id);
      if (!line) {
        throw new NotFoundException(`Order line item with ID '${item.line_id}' not found.`);
      }

      try {
        assertValidLineFulfillment(line.quantity, line.fulfilled_quantity, item.quantity_to_fulfill);
      } catch (err) {
        if (err instanceof OrderDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      line.fulfilled_quantity += item.quantity_to_fulfill;
    }

    // Re-evaluate fulfillment status
    order.fulfillment_status = evaluateOrderFulfillmentStatus(order.lines);

    // If order was CONFIRMED, RESERVED, or PICKING, transition to PICKING/PACKING
    if (
      order.status === 'CONFIRMED' ||
      order.status === 'RESERVED' ||
      order.status === 'PICKING'
    ) {
      order.status = order.fulfillment_status === 'FULFILLED' ? 'PACKING' : 'PICKING';
    }

    order.updated_at = new Date().toISOString();
    await this.persist(order);
    return this.mapToResponse(order);
  }

  async dispatchSalesOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    req?: DispatchSalesOrderRequest,
  ): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    if (!canTransitionSalesOrderStatus(order.status, SalesOrderStatuses.DISPATCHED)) {
      throw new BadRequestException(
        new InvalidOrderStateTransitionError(order.status, SalesOrderStatuses.DISPATCHED).message,
      );
    }

    // Post stock movement for each line
    for (const line of order.lines) {
      const dispatchQty = line.fulfilled_quantity > 0 ? line.fulfilled_quantity : line.quantity;
      if (dispatchQty > 0) {
        await this.stockLedgerService.postMovement(tenantId, userId, {
          movement_type: 'SALES_DISPATCH',
          source_warehouse_id: order.warehouse_id,
          destination_warehouse_id: null,
          variant_id: line.variant_id,
          quantity: dispatchQty,
          unit_cost_minor: line.unit_price_minor,
          idempotency_key: `dispatch:${order.id}:${line.id}:${line.fulfilled_quantity}`,
          reference_type: 'SALES_ORDER',
          reference_id: order.id,
          notes: req?.notes ?? `Dispatched order ${order.order_number}`,
        });
      }
    }

    // Release/fulfill reservation records
    for (const resId of order.reservation_ids) {
      try {
        await this.stockReservationsService.fulfillReservation(tenantId, resId);
      } catch {
        // Safe ignore if already released or fulfilled
      }
    }

    const now = new Date().toISOString();
    order.status = 'DISPATCHED';
    order.dispatched_at = now;
    order.updated_at = now;

    await this.persist(order);
    return this.mapToResponse(order);
  }

  async deliverSalesOrder(tenantId: string, orderId: string): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    if (!canTransitionSalesOrderStatus(order.status, SalesOrderStatuses.DELIVERED)) {
      throw new BadRequestException(
        new InvalidOrderStateTransitionError(order.status, SalesOrderStatuses.DELIVERED).message,
      );
    }

    const now = new Date().toISOString();
    order.status = 'DELIVERED';
    order.delivered_at = now;
    order.fulfillment_status = 'FULFILLED';
    order.updated_at = now;

    await this.persist(order);
    return this.mapToResponse(order);
  }

  async cancelSalesOrder(tenantId: string, orderId: string): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    if (!canTransitionSalesOrderStatus(order.status, SalesOrderStatuses.CANCELLED)) {
      throw new BadRequestException(
        new InvalidOrderStateTransitionError(order.status, SalesOrderStatuses.CANCELLED).message,
      );
    }

    // Release all reserved stock
    for (const resId of order.reservation_ids) {
      try {
        await this.stockReservationsService.releaseReservation(tenantId, resId);
      } catch {
        // Safe ignore if already released or not active
      }
    }

    const now = new Date().toISOString();
    order.status = 'CANCELLED';
    order.cancelled_at = now;
    order.updated_at = now;

    await this.persist(order);
    return this.mapToResponse(order);
  }

  async recordOrderPayment(
    tenantId: string,
    orderId: string,
    amountPaidMinor: bigint,
  ): Promise<SalesOrderResponse> {
    const order = this.ordersStore.get(orderId);
    if (!order || order.tenant_id !== tenantId) {
      throw new NotFoundException(`Sales order with ID '${orderId}' not found.`);
    }

    order.amount_paid_minor += amountPaidMinor;
    if (order.amount_paid_minor >= order.grand_total_minor) {
      order.payment_status = 'PAID';
    } else if (order.amount_paid_minor > 0n) {
      order.payment_status = 'PARTIALLY_PAID';
    } else {
      order.payment_status = 'UNPAID';
    }

    order.updated_at = new Date().toISOString();
    await this.persist(order);
    return this.mapToResponse(order);
  }

  // --------------------------------------------------------------------------
  // Response Mapping
  // --------------------------------------------------------------------------

  private mapToResponse(order: StoredSalesOrder): SalesOrderResponse {
    return {
      id: order.id,
      tenant_id: order.tenant_id,
      order_number: order.order_number,
      channel_type: order.channel_type,
      branch_id: order.branch_id,
      warehouse_id: order.warehouse_id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      currency_code: order.currency_code,
      status: order.status,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,
      pos_session_id: order.pos_session_id,
      pos_register_id: order.pos_register_id,
      subtotal_minor: order.subtotal_minor.toString(),
      total_discount_minor: order.total_discount_minor.toString(),
      total_tax_minor: order.total_tax_minor.toString(),
      grand_total_minor: order.grand_total_minor.toString(),
      amount_paid_minor: order.amount_paid_minor.toString(),
      lines: order.lines.map((l) => ({ ...l })),
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      confirmed_at: order.confirmed_at,
      dispatched_at: order.dispatched_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
    };
  }
}
