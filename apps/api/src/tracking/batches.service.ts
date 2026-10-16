import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StockBatch,
  CreateBatchRequest,
  UpdateBatchRequest,
  QuarantineHoldRequest,
  QuarantineReleaseRequest,
  BatchStatus,
  ShelfLifeMetrics,
} from '@stokrova/contracts';
import {
  calculateShelfLifeMetrics,
  TrackingDomainError,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';

@Injectable()
export class BatchesService {
  private batchesStore = new DurableMap<StockBatch>('stock_batches');

  constructor(private readonly variantsService: VariantsService) {}

  async createBatch(tenantId: string, req: CreateBatchRequest): Promise<StockBatch> {
    // 1. Verify variant exists in tenant
    await this.variantsService.getVariantById(tenantId, req.variant_id);

    const batchNumber = req.batch_number.trim().toUpperCase();

    // 2. Check unique batch number per variant + tenant
    const existing = Array.from(this.batchesStore.values()).find(
      (b) =>
        b.tenant_id === tenantId &&
        b.variant_id === req.variant_id &&
        b.batch_number === batchNumber,
    );
    if (existing) {
      throw new ConflictException(
        `Batch '${batchNumber}' already exists for this variant.`,
      );
    }

    // 3. Validate date coherence using domain
    if (req.manufacture_date && req.expiry_date) {
      try {
        calculateShelfLifeMetrics(req.expiry_date, req.manufacture_date);
      } catch (err: unknown) {
        if (err instanceof TrackingDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const now = new Date().toISOString();
    const batch: StockBatch = {
      id: `batch_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      variant_id: req.variant_id,
      batch_number: batchNumber,
      supplier_lot_number: req.supplier_lot_number?.trim() || null,
      status: 'AVAILABLE',
      manufacture_date: req.manufacture_date || null,
      expiry_date: req.expiry_date || null,
      retest_date: req.retest_date || null,
      certificate_of_analysis_url: req.certificate_of_analysis_url || null,
      quarantine_reason: null,
      quarantine_notes: null,
      quarantined_at: null,
      released_at: null,
      released_by: null,
      created_at: now,
      updated_at: now,
    };

    this.batchesStore.set(batch.id, batch);
    return batch;
  }

  async getBatches(
    tenantId: string,
    variantId?: string,
    status?: BatchStatus,
  ): Promise<StockBatch[]> {
    return Array.from(this.batchesStore.values()).filter((b) => {
      if (b.tenant_id !== tenantId) return false;
      if (variantId && b.variant_id !== variantId) return false;
      if (status && b.status !== status) return false;
      return true;
    });
  }

  async getBatchById(tenantId: string, id: string): Promise<StockBatch> {
    const batch = this.batchesStore.get(id);
    if (!batch || batch.tenant_id !== tenantId) {
      throw new NotFoundException(`Stock batch with ID '${id}' not found.`);
    }
    return batch;
  }

  async getBatchWithMetrics(
    tenantId: string,
    id: string,
    asOfDate?: string,
  ): Promise<{ batch: StockBatch; shelf_life: ShelfLifeMetrics }> {
    const batch = await this.getBatchById(tenantId, id);
    const shelfLife = calculateShelfLifeMetrics(
      batch.expiry_date,
      batch.manufacture_date,
      asOfDate,
    );
    return {
      batch,
      shelf_life: shelfLife as ShelfLifeMetrics,
    };
  }

  async updateBatch(
    tenantId: string,
    id: string,
    req: UpdateBatchRequest,
  ): Promise<StockBatch> {
    const batch = await this.getBatchById(tenantId, id);

    if (req.supplier_lot_number !== undefined) {
      batch.supplier_lot_number = req.supplier_lot_number?.trim() || null;
    }

    if (req.manufacture_date !== undefined) {
      batch.manufacture_date = req.manufacture_date || null;
    }

    if (req.expiry_date !== undefined) {
      batch.expiry_date = req.expiry_date || null;
    }

    if (req.retest_date !== undefined) {
      batch.retest_date = req.retest_date || null;
    }

    if (req.certificate_of_analysis_url !== undefined) {
      batch.certificate_of_analysis_url = req.certificate_of_analysis_url || null;
    }

    // Validate coherent dates
    if (batch.manufacture_date && batch.expiry_date) {
      try {
        calculateShelfLifeMetrics(batch.expiry_date, batch.manufacture_date);
      } catch (err: unknown) {
        if (err instanceof TrackingDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    batch.updated_at = new Date().toISOString();
    this.batchesStore.set(batch.id, batch);
    return batch;
  }

  async quarantineHold(
    tenantId: string,
    id: string,
    req: QuarantineHoldRequest,
  ): Promise<StockBatch> {
    const batch = await this.getBatchById(tenantId, id);

    if (batch.status === 'DEPLETED') {
      throw new BadRequestException('Cannot quarantine a depleted stock batch.');
    }

    const now = new Date().toISOString();
    batch.status = 'QUARANTINED';
    batch.quarantine_reason = req.reason;
    batch.quarantine_notes = req.notes?.trim() || null;
    batch.quarantined_at = now;
    batch.updated_at = now;

    this.batchesStore.set(batch.id, batch);
    return batch;
  }

  async quarantineRelease(
    tenantId: string,
    id: string,
    req: QuarantineReleaseRequest,
    userId?: string,
  ): Promise<StockBatch> {
    const batch = await this.getBatchById(tenantId, id);

    if (batch.status !== 'QUARANTINED') {
      throw new BadRequestException(
        `Batch '${batch.batch_number}' is not currently quarantined (status: ${batch.status}).`,
      );
    }

    const now = new Date().toISOString();
    batch.status = 'AVAILABLE';
    batch.released_at = now;
    batch.released_by = userId || 'system';
    if (req.notes) {
      batch.quarantine_notes = batch.quarantine_notes
        ? `${batch.quarantine_notes} | Release: ${req.notes.trim()}`
        : req.notes.trim();
    }
    batch.updated_at = now;

    this.batchesStore.set(batch.id, batch);
    return batch;
  }

  async getFefoPickingOrder(
    tenantId: string,
    variantId: string,
  ): Promise<StockBatch[]> {
    const batches = await this.getBatches(tenantId, variantId, 'AVAILABLE');
    const now = new Date().toISOString();
    const validBatches = batches.filter(
      (b) => !b.expiry_date || new Date(b.expiry_date) > new Date(now),
    );

    return validBatches.sort((a, b) => {
      if (a.expiry_date && b.expiry_date) {
        return (
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
      }
      if (a.expiry_date && !b.expiry_date) return -1;
      if (!a.expiry_date && b.expiry_date) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  clearStore(): void {
    this.batchesStore.clear();
  }
}
