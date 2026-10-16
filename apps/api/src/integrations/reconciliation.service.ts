import { DurableMap } from '../infrastructure/database/durable-map.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  IntegrationReconciliation,
  IntegrationEntityType,
  IntegrationReconciliationStatus,
} from '@stokrova/contracts';

export interface RecordComparisonInput {
  entity_type: IntegrationEntityType;
  external_id: string;
  internal_id: string;
  external_state: Record<string, unknown>;
  internal_state: Record<string, unknown>;
}

@Injectable()
export class ReconciliationService {
  private readonly reconciliations = new DurableMap<IntegrationReconciliation>('integration_reconciliations');

  async compareAndRecord(
    tenantId: string,
    instanceId: string,
    input: RecordComparisonInput,
  ): Promise<IntegrationReconciliation> {
    const discrepancies: Record<string, { internal: unknown; external: unknown }> = {};

    // Compare common key fields: status, amount, quantity
    for (const key of ['status', 'total_amount_minor', 'amount', 'quantity', 'stock_quantity']) {
      const extVal = input.external_state[key];
      const intVal = input.internal_state[key];

      if (extVal !== undefined && intVal !== undefined && String(extVal) !== String(intVal)) {
        discrepancies[key] = { internal: intVal, external: extVal };
      }
    }

    const hasDiscrepancy = Object.keys(discrepancies).length > 0;
    const status: IntegrationReconciliationStatus = hasDiscrepancy
      ? 'DISCREPANCY_DETECTED'
      : 'MATCHED';

    const id = `rec_${randomUUID()}`;
    const now = new Date().toISOString();

    const record: IntegrationReconciliation = {
      id,
      tenant_id: tenantId,
      integration_instance_id: instanceId,
      entity_type: input.entity_type,
      external_id: input.external_id,
      internal_id: input.internal_id,
      status,
      discrepancy_details: hasDiscrepancy ? discrepancies : undefined,
      checked_at: now,
      resolved_at: null,
    };

    this.reconciliations.set(id, record);
    return record;
  }

  async resolveDiscrepancy(
    tenantId: string,
    reconciliationId: string,
  ): Promise<IntegrationReconciliation> {
    const record = this.reconciliations.get(reconciliationId);
    if (!record || record.tenant_id !== tenantId) {
      throw new NotFoundException(`Reconciliation record '${reconciliationId}' not found.`);
    }

    record.status = 'RESOLVED';
    record.resolved_at = new Date().toISOString();
    return record;
  }

  async listReconciliations(
    tenantId: string,
    instanceId?: string,
    status?: IntegrationReconciliationStatus,
  ): Promise<IntegrationReconciliation[]> {
    return Array.from(this.reconciliations.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (instanceId && r.integration_instance_id !== instanceId) return false;
      if (status && r.status !== status) return false;
      return true;
    });
  }
}
