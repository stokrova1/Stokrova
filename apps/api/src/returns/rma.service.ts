import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ReturnAuthorization,
  ReturnLine,
  RmaResponse,
  ListRmasResponse,
  CreateRmaRequest,
  UpdateRmaRequest,
  ApproveRmaRequest,
  RejectRmaRequest,
  ReceiveRmaRequest,
} from '@stokrova/contracts';
import {
  CreateRmaSchema,
  UpdateRmaSchema,
  ApproveRmaSchema,
  RejectRmaSchema,
  ReceiveRmaSchema,
} from '@stokrova/validation';
import {
  assertRmaTransition,
  assertReturnQuantityInvariants,
  evaluateRmaReceiptStatus,
  ReturnsDomainError,
  type DomainRmaStatus,
} from '@stokrova/domain';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';

@Injectable()
export class RmaService {
  private readonly rmas = new DurableMap<ReturnAuthorization>('return_authorizations');
  private readonly rmaLines = new DurableMap<ReturnLine>('return_lines');
  private rmaSeq = 1001;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  async createRma(
    tenantId: string,
    req: CreateRmaRequest,
  ): Promise<RmaResponse> {
    const parsed = CreateRmaSchema.parse(req);

    // 1. Verify warehouse belongs to tenant
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // 2. Validate line invariants
    try {
      for (const line of parsed.lines) {
        assertReturnQuantityInvariants({
          quantity_authorized: line.quantity_authorized,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const rmaId = `rma_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const datePrefix = now.slice(0, 10).replace(/-/g, '');
    const rmaNumber = `RMA-${datePrefix}-${this.rmaSeq++}`;

    const lines: ReturnLine[] = parsed.lines.map((l) => {
      const line: ReturnLine = {
        id: `rmal_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenant_id: tenantId,
        rma_id: rmaId,
        order_id: l.order_id ?? null,
        order_line_id: l.order_line_id ?? null,
        variant_id: l.variant_id,
        sku: l.sku,
        item_name: l.item_name,
        quantity_authorized: l.quantity_authorized,
        quantity_received: 0,
        unit_price_cents: l.unit_price_cents,
        currency: l.currency,
        reason_code: l.reason_code,
        customer_notes: l.customer_notes ?? null,
        batch_id: l.batch_id ?? null,
        serial_numbers: l.serial_numbers ?? null,
        created_at: now,
        updated_at: now,
      };
      this.rmaLines.set(line.id, line);
      return line;
    });

    const rma: ReturnAuthorization = {
      id: rmaId,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      rma_number: rmaNumber,
      type: parsed.type,
      status: 'DRAFT',
      customer_id: parsed.customer_id ?? null,
      customer_name: parsed.customer_name ?? null,
      customer_email: parsed.customer_email ?? null,
      original_order_id: parsed.original_order_id ?? null,
      original_order_number: parsed.original_order_number ?? null,
      resolution_preference: parsed.resolution_preference ?? 'REFUND',
      restocking_fee_bp: parsed.restocking_fee_bp ?? 0,
      return_tracking_number: parsed.return_tracking_number ?? null,
      carrier_code: parsed.carrier_code ?? null,
      receiving_location_id: null,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      received_at: null,
      completed_at: null,
      cancelled_at: null,
      notes: parsed.notes ?? null,
      lines,
      created_at: now,
      updated_at: now,
    };

    this.rmas.set(rma.id, rma);
    return { rma };
  }

  async requestRma(
    tenantId: string,
    id: string,
  ): Promise<RmaResponse> {
    const rma = await this.getRmaEntity(tenantId, id);

    try {
      assertRmaTransition(rma.status as DomainRmaStatus, 'REQUESTED');
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const updated: ReturnAuthorization = {
      ...rma,
      status: 'REQUESTED',
      updated_at: new Date().toISOString(),
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async approveRma(
    tenantId: string,
    id: string,
    req: ApproveRmaRequest,
  ): Promise<RmaResponse> {
    const parsed = ApproveRmaSchema.parse(req);
    const rma = await this.getRmaEntity(tenantId, id);

    try {
      assertRmaTransition(rma.status as DomainRmaStatus, 'APPROVED');
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: ReturnAuthorization = {
      ...rma,
      status: 'APPROVED',
      approved_by: parsed.approved_by,
      approved_at: now,
      notes: parsed.notes ? `${rma.notes ? rma.notes + '\n' : ''}${parsed.notes}` : rma.notes,
      updated_at: now,
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async rejectRma(
    tenantId: string,
    id: string,
    req: RejectRmaRequest,
  ): Promise<RmaResponse> {
    const parsed = RejectRmaSchema.parse(req);
    const rma = await this.getRmaEntity(tenantId, id);

    try {
      assertRmaTransition(rma.status as DomainRmaStatus, 'REJECTED');
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: ReturnAuthorization = {
      ...rma,
      status: 'REJECTED',
      rejection_reason: parsed.rejection_reason,
      updated_at: now,
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async receiveRma(
    tenantId: string,
    id: string,
    req: ReceiveRmaRequest,
  ): Promise<RmaResponse> {
    const parsed = ReceiveRmaSchema.parse(req);
    const rma = await this.getRmaEntity(tenantId, id);

    if (rma.status !== 'APPROVED' && rma.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(
        `Cannot receive goods for RMA in '${rma.status}' status. RMA must be APPROVED or PARTIALLY_RECEIVED.`,
      );
    }

    // Verify receiving location exists
    await this.locationsService.getLocationById(
      tenantId,
      parsed.receiving_location_id,
    );

    const updatedLines: ReturnLine[] = [];
    const now = new Date().toISOString();

    for (const rLine of rma.lines) {
      const incoming = parsed.lines.find((l) => l.line_id === rLine.id);
      if (incoming) {
        const newQtyReceived = rLine.quantity_received + incoming.quantity_received;

        try {
          assertReturnQuantityInvariants({
            quantity_authorized: rLine.quantity_authorized,
            quantity_received: newQtyReceived,
          });
        } catch (err: unknown) {
          if (err instanceof ReturnsDomainError) {
            throw new BadRequestException(err.message);
          }
          throw err;
        }

        const updatedLine: ReturnLine = {
          ...rLine,
          quantity_received: newQtyReceived,
          batch_id: incoming.batch_id ?? rLine.batch_id,
          serial_numbers: incoming.serial_numbers ?? rLine.serial_numbers,
          updated_at: now,
        };
        this.rmaLines.set(updatedLine.id, updatedLine);
        updatedLines.push(updatedLine);
      } else {
        updatedLines.push(rLine);
      }
    }

    const nextStatus = evaluateRmaReceiptStatus(
      updatedLines.map((l) => ({
        quantity_authorized: l.quantity_authorized,
        quantity_received: l.quantity_received,
      })),
    );

    const updated: ReturnAuthorization = {
      ...rma,
      status: nextStatus,
      receiving_location_id: parsed.receiving_location_id,
      received_at: now,
      lines: updatedLines,
      updated_at: now,
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async cancelRma(
    tenantId: string,
    id: string,
  ): Promise<RmaResponse> {
    const rma = await this.getRmaEntity(tenantId, id);

    try {
      assertRmaTransition(rma.status as DomainRmaStatus, 'CANCELLED');
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const updated: ReturnAuthorization = {
      ...rma,
      status: 'CANCELLED',
      cancelled_at: now,
      updated_at: now,
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async updateRma(
    tenantId: string,
    id: string,
    req: UpdateRmaRequest,
  ): Promise<RmaResponse> {
    const parsed = UpdateRmaSchema.parse(req);
    const rma = await this.getRmaEntity(tenantId, id);

    if (rma.status !== 'DRAFT' && rma.status !== 'REQUESTED') {
      throw new BadRequestException(
        `Cannot update RMA details in '${rma.status}' status.`,
      );
    }

    const updated: ReturnAuthorization = {
      ...rma,
      resolution_preference: parsed.resolution_preference ?? rma.resolution_preference,
      restocking_fee_bp: parsed.restocking_fee_bp ?? rma.restocking_fee_bp,
      return_tracking_number: parsed.return_tracking_number ?? rma.return_tracking_number,
      carrier_code: parsed.carrier_code ?? rma.carrier_code,
      notes: parsed.notes ?? rma.notes,
      updated_at: new Date().toISOString(),
    };

    this.rmas.set(id, updated);
    return { rma: updated };
  }

  async getRmaById(
    tenantId: string,
    id: string,
  ): Promise<RmaResponse> {
    const rma = await this.getRmaEntity(tenantId, id);
    return { rma };
  }

  async listRmas(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListRmasResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const rmas = Array.from(this.rmas.values()).filter(
      (r) => r.tenant_id === tenantId && r.warehouse_id === warehouseId,
    );
    return { rmas };
  }

  public async getRmaEntity(
    tenantId: string,
    id: string,
  ): Promise<ReturnAuthorization> {
    const rma = this.rmas.get(id);
    if (!rma || rma.tenant_id !== tenantId) {
      throw new NotFoundException(`RMA with ID '${id}' not found.`);
    }
    return rma;
  }

  public async updateRmaEntity(
    tenantId: string,
    rma: ReturnAuthorization,
  ): Promise<void> {
    if (rma.tenant_id !== tenantId) {
      throw new NotFoundException(`RMA with ID '${rma.id}' not found.`);
    }
    this.rmas.set(rma.id, rma);
  }
}
