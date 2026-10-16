import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  DispositionRecord,
  DispositionResponse,
  ListDispositionsResponse,
  ExecuteDispositionRequest,
} from '@stokrova/contracts';
import { ExecuteDispositionSchema } from '@stokrova/validation';
import { calculateNetRefund, ReturnsDomainError } from '@stokrova/domain';
import { LocationsService } from '../warehouse/locations.service.js';
import { RmaService } from './rma.service.js';

@Injectable()
export class DispositionService {
  private readonly dispositions = new DurableMap<DispositionRecord>('disposition_actions');

  constructor(
    private readonly rmaService: RmaService,
    private readonly locationsService: LocationsService,
  ) {}

  async executeDisposition(
    tenantId: string,
    req: ExecuteDispositionRequest,
  ): Promise<DispositionResponse> {
    const parsed = ExecuteDispositionSchema.parse(req);

    // 1. Verify RMA belongs to tenant
    const rma = await this.rmaService.getRmaEntity(tenantId, parsed.rma_id);
    if (rma.status !== 'PARTIALLY_RECEIVED' && rma.status !== 'RECEIVED') {
      throw new BadRequestException(
        `Cannot execute disposition for RMA in '${rma.status}' status. Goods must be received.`,
      );
    }

    // 2. Verify destination location exists
    const destLoc = await this.locationsService.getLocationById(
      tenantId,
      parsed.destination_location_id,
    );

    // 3. Compute financial refund and restocking fee under Rule 26
    const totalGrossCents = parsed.gross_unit_price_cents * parsed.quantity;
    let refundCalc;
    try {
      refundCalc = calculateNetRefund(totalGrossCents, parsed.restocking_fee_bp);
    } catch (err: unknown) {
      if (err instanceof ReturnsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    const disposition: DispositionRecord = {
      id: `disp_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      rma_id: parsed.rma_id,
      inspection_id: parsed.inspection_id ?? null,
      variant_id: parsed.variant_id,
      sku: parsed.sku,
      quantity: parsed.quantity,
      action_type: parsed.action_type,
      destination_location_id: parsed.destination_location_id,
      destination_location_code: destLoc.code,
      status: 'EXECUTED',
      gross_refund_cents: refundCalc.gross_refund_cents,
      restocking_fee_cents: refundCalc.restocking_fee_cents,
      net_refund_cents: refundCalc.net_refund_cents,
      currency: parsed.currency,
      executed_by: parsed.operator_id ?? null,
      executed_at: now,
      notes: parsed.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    this.dispositions.set(disposition.id, disposition);

    // 4. Check if all RMA items are received and dispositioned, then mark RMA as COMPLETED
    const existingDispositions = Array.from(this.dispositions.values()).filter(
      (d) => d.tenant_id === tenantId && d.rma_id === parsed.rma_id,
    );
    const totalDispositioned = existingDispositions.reduce((acc, d) => acc + d.quantity, 0);
    const totalReceived = rma.lines.reduce((acc, l) => acc + l.quantity_received, 0);
    const totalAuthorized = rma.lines.reduce((acc, l) => acc + l.quantity_authorized, 0);

    if (totalReceived >= totalAuthorized && totalDispositioned >= totalReceived) {
      await this.rmaService.updateRmaEntity(tenantId, {
        ...rma,
        status: 'COMPLETED',
        completed_at: now,
        updated_at: now,
      });
    }

    return { disposition };
  }

  async getDispositionById(
    tenantId: string,
    id: string,
  ): Promise<DispositionResponse> {
    const disposition = this.dispositions.get(id);
    if (!disposition || disposition.tenant_id !== tenantId) {
      throw new NotFoundException(`Disposition record '${id}' not found.`);
    }
    return { disposition };
  }

  async listDispositionsByRma(
    tenantId: string,
    rmaId: string,
  ): Promise<ListDispositionsResponse> {
    await this.rmaService.getRmaEntity(tenantId, rmaId);

    const dispositions = Array.from(this.dispositions.values()).filter(
      (d) => d.tenant_id === tenantId && d.rma_id === rmaId,
    );
    return { dispositions };
  }
}
