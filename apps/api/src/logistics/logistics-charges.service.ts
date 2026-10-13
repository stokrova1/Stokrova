import {
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  LogisticsCharge,
  AddLogisticsChargeRequest,
} from '@stokrova/contracts';
import { AddLogisticsChargeSchema } from '@stokrova/validation';
import { calculateTotalLogisticsCharges } from '@stokrova/domain';
import { LogisticsShipmentsService } from './logistics-shipments.service.js';

@Injectable()
export class LogisticsChargesService {
  private readonly charges = new Map<string, LogisticsCharge[]>(); // shipmentId -> charges

  constructor(private readonly shipmentsService: LogisticsShipmentsService) {}

  async addCharge(
    tenantId: string,
    shipmentId: string,
    req: AddLogisticsChargeRequest,
  ): Promise<LogisticsCharge> {
    const parsed = AddLogisticsChargeSchema.parse(req);
    // Verify shipment exists and belongs to tenant
    await this.shipmentsService.getShipment(tenantId, shipmentId);

    const chargeId = `chg_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();

    const charge: LogisticsCharge = {
      id: chargeId,
      tenant_id: tenantId,
      shipment_id: shipmentId,
      charge_type: parsed.charge_type,
      provenance: parsed.provenance,
      amount_minor: parsed.amount_minor,
      currency: parsed.currency,
      notes: parsed.notes ?? null,
      created_at: now,
    };

    const existing = this.charges.get(shipmentId) ?? [];
    this.charges.set(shipmentId, [...existing, charge]);

    return charge;
  }

  async getShipmentCharges(
    tenantId: string,
    shipmentId: string,
  ): Promise<{ charges: LogisticsCharge[]; totalMinor: string }> {
    await this.shipmentsService.getShipment(tenantId, shipmentId);
    const list = this.charges.get(shipmentId) ?? [];
    const total = calculateTotalLogisticsCharges(list);

    return {
      charges: list,
      totalMinor: total.toString(),
    };
  }
}
