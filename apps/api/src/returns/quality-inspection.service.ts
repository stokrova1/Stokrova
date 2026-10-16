import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  QualityInspectionItem,
  QualityInspectionResponse,
  ListQualityInspectionsResponse,
  PerformQualityInspectionRequest,
} from '@stokrova/contracts';
import { PerformQualityInspectionSchema } from '@stokrova/validation';
import { LocationsService } from '../warehouse/locations.service.js';
import { RmaService } from './rma.service.js';

@Injectable()
export class QualityInspectionService {
  private readonly inspections = new DurableMap<QualityInspectionItem>('quality_inspections');

  constructor(
    private readonly rmaService: RmaService,
    private readonly locationsService: LocationsService,
  ) {}

  async performInspection(
    tenantId: string,
    req: PerformQualityInspectionRequest,
  ): Promise<QualityInspectionResponse> {
    const parsed = PerformQualityInspectionSchema.parse(req);

    // 1. Verify RMA belongs to tenant and is in receivable status
    const rma = await this.rmaService.getRmaEntity(tenantId, parsed.rma_id);
    if (rma.status !== 'PARTIALLY_RECEIVED' && rma.status !== 'RECEIVED') {
      throw new BadRequestException(
        `Cannot inspect items for RMA in '${rma.status}' status. Goods must be PARTIALLY_RECEIVED or RECEIVED.`,
      );
    }

    // 2. Verify return line exists
    const line = rma.lines.find((l) => l.id === parsed.return_line_id);
    if (!line) {
      throw new NotFoundException(
        `Return line '${parsed.return_line_id}' not found on RMA '${parsed.rma_id}'.`,
      );
    }

    // 3. Verify inspection quantity does not exceed received quantity
    if (parsed.quantity_inspected > line.quantity_received) {
      throw new BadRequestException(
        `Inspected quantity (${parsed.quantity_inspected}) cannot exceed received quantity (${line.quantity_received}) on line '${line.id}'.`,
      );
    }

    // 4. If quarantine location specified, verify it
    if (parsed.quarantine_location_id) {
      await this.locationsService.getLocationById(
        tenantId,
        parsed.quarantine_location_id,
      );
    }

    const now = new Date().toISOString();
    const inspection: QualityInspectionItem = {
      id: `qc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenant_id: tenantId,
      rma_id: parsed.rma_id,
      return_line_id: parsed.return_line_id,
      variant_id: line.variant_id,
      sku: line.sku,
      quantity_inspected: parsed.quantity_inspected,
      condition_grade: parsed.condition_grade,
      status: parsed.status,
      failure_reason_code: parsed.failure_reason_code ?? null,
      inspector_id: parsed.inspector_id ?? null,
      quarantine_location_id: parsed.quarantine_location_id ?? null,
      inspection_notes: parsed.inspection_notes ?? null,
      inspected_at: now,
      created_at: now,
      updated_at: now,
    };

    this.inspections.set(inspection.id, inspection);
    return { inspection };
  }

  async getInspectionById(
    tenantId: string,
    id: string,
  ): Promise<QualityInspectionResponse> {
    const inspection = this.inspections.get(id);
    if (!inspection || inspection.tenant_id !== tenantId) {
      throw new NotFoundException(`Quality inspection '${id}' not found.`);
    }
    return { inspection };
  }

  async listInspectionsByRma(
    tenantId: string,
    rmaId: string,
  ): Promise<ListQualityInspectionsResponse> {
    await this.rmaService.getRmaEntity(tenantId, rmaId);

    const inspections = Array.from(this.inspections.values()).filter(
      (i) => i.tenant_id === tenantId && i.rma_id === rmaId,
    );
    return { inspections };
  }
}
