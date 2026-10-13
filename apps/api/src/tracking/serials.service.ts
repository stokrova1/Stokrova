import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StockSerial,
  CreateSerialRequest,
  BatchRegisterSerialsRequest,
  UpdateSerialLocationRequest,
  QuarantineHoldRequest,
  QuarantineReleaseRequest,
  SerialStatus,
} from '@stokrova/contracts';
import {
  validateSerialNumber,
  TrackingDomainError,
} from '@stokrova/domain';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { BatchesService } from './batches.service.js';

@Injectable()
export class SerialsService {
  private serialsStore = new Map<string, StockSerial>();

  constructor(
    private readonly variantsService: VariantsService,
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
    private readonly batchesService: BatchesService,
  ) {}

  async createSerial(
    tenantId: string,
    req: CreateSerialRequest,
  ): Promise<StockSerial> {
    // 1. Verify variant
    await this.variantsService.getVariantById(tenantId, req.variant_id);

    // 2. Verify warehouse
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    // 3. Verify location if provided
    if (req.location_id) {
      const loc = await this.locationsService.getLocationById(tenantId, req.location_id);
      if (loc.warehouse_id !== req.warehouse_id) {
        throw new BadRequestException('Location does not belong to the specified warehouse.');
      }
    }

    // 4. Verify batch if provided
    if (req.batch_id) {
      const batch = await this.batchesService.getBatchById(tenantId, req.batch_id);
      if (batch.variant_id !== req.variant_id) {
        throw new BadRequestException('Batch does not belong to the specified variant.');
      }
    }

    // 5. Validate serial format
    let cleanSerial: string;
    try {
      cleanSerial = validateSerialNumber(req.serial_number);
    } catch (err: unknown) {
      if (err instanceof TrackingDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 6. Check uniqueness of (variant_id, serial_number) within tenant
    const existing = Array.from(this.serialsStore.values()).find(
      (s) =>
        s.tenant_id === tenantId &&
        s.variant_id === req.variant_id &&
        s.serial_number === cleanSerial,
    );
    if (existing) {
      throw new ConflictException(
        `Serial number '${cleanSerial}' already registered for this variant.`,
      );
    }

    const now = new Date().toISOString();
    const serial: StockSerial = {
      id: `sn_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      variant_id: req.variant_id,
      batch_id: req.batch_id || null,
      serial_number: cleanSerial,
      warehouse_id: req.warehouse_id,
      location_id: req.location_id || null,
      status: 'AVAILABLE',
      quarantine_reason: null,
      quarantine_notes: null,
      quarantined_at: null,
      released_at: null,
      released_by: null,
      warranty_start_date: req.warranty_start_date || null,
      warranty_end_date: req.warranty_end_date || null,
      created_at: now,
      updated_at: now,
    };

    this.serialsStore.set(serial.id, serial);
    return serial;
  }

  async bulkRegisterSerials(
    tenantId: string,
    req: BatchRegisterSerialsRequest,
  ): Promise<StockSerial[]> {
    const results: StockSerial[] = [];

    // Check duplicates inside request payload first
    const seen = new Set<string>();
    for (const raw of req.serial_numbers) {
      let clean: string;
      try {
        clean = validateSerialNumber(raw);
      } catch (err: unknown) {
        if (err instanceof TrackingDomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      if (seen.has(clean)) {
        throw new BadRequestException(`Duplicate serial number '${clean}' in registration list.`);
      }
      seen.add(clean);
    }

    // Register sequentially
    for (const raw of req.serial_numbers) {
      const serial = await this.createSerial(tenantId, {
        variant_id: req.variant_id,
        batch_id: req.batch_id,
        serial_number: raw,
        warehouse_id: req.warehouse_id,
        location_id: req.location_id,
      });
      results.push(serial);
    }

    return results;
  }

  async getSerials(
    tenantId: string,
    filter?: {
      variant_id?: string;
      warehouse_id?: string;
      batch_id?: string;
      status?: SerialStatus;
    },
  ): Promise<StockSerial[]> {
    return Array.from(this.serialsStore.values()).filter((s) => {
      if (s.tenant_id !== tenantId) return false;
      if (filter?.variant_id && s.variant_id !== filter.variant_id) return false;
      if (filter?.warehouse_id && s.warehouse_id !== filter.warehouse_id) return false;
      if (filter?.batch_id && s.batch_id !== filter.batch_id) return false;
      if (filter?.status && s.status !== filter.status) return false;
      return true;
    });
  }

  async getSerialById(tenantId: string, id: string): Promise<StockSerial> {
    const serial = this.serialsStore.get(id);
    if (!serial || serial.tenant_id !== tenantId) {
      throw new NotFoundException(`Stock serial with ID '${id}' not found.`);
    }
    return serial;
  }

  async updateLocation(
    tenantId: string,
    id: string,
    req: UpdateSerialLocationRequest,
  ): Promise<StockSerial> {
    const serial = await this.getSerialById(tenantId, id);

    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    if (req.location_id) {
      const loc = await this.locationsService.getLocationById(tenantId, req.location_id);
      if (loc.warehouse_id !== req.warehouse_id) {
        throw new BadRequestException('Location does not belong to the target warehouse.');
      }
    }

    serial.warehouse_id = req.warehouse_id;
    serial.location_id = req.location_id || null;
    serial.updated_at = new Date().toISOString();

    this.serialsStore.set(serial.id, serial);
    return serial;
  }

  async quarantineHold(
    tenantId: string,
    id: string,
    req: QuarantineHoldRequest,
  ): Promise<StockSerial> {
    const serial = await this.getSerialById(tenantId, id);

    if (serial.status === 'CONSUMED' || serial.status === 'DISPATCHED') {
      throw new BadRequestException(`Cannot quarantine serial with status '${serial.status}'.`);
    }

    const now = new Date().toISOString();
    serial.status = 'QUARANTINED';
    serial.quarantine_reason = req.reason;
    serial.quarantine_notes = req.notes?.trim() || null;
    serial.quarantined_at = now;
    serial.updated_at = now;

    this.serialsStore.set(serial.id, serial);
    return serial;
  }

  async quarantineRelease(
    tenantId: string,
    id: string,
    req: QuarantineReleaseRequest,
    userId?: string,
  ): Promise<StockSerial> {
    const serial = await this.getSerialById(tenantId, id);

    if (serial.status !== 'QUARANTINED') {
      throw new BadRequestException(
        `Serial '${serial.serial_number}' is not currently quarantined (status: ${serial.status}).`,
      );
    }

    const now = new Date().toISOString();
    serial.status = 'AVAILABLE';
    serial.released_at = now;
    serial.released_by = userId || 'system';
    if (req.notes) {
      serial.quarantine_notes = serial.quarantine_notes
        ? `${serial.quarantine_notes} | Release: ${req.notes.trim()}`
        : req.notes.trim();
    }
    serial.updated_at = now;

    this.serialsStore.set(serial.id, serial);
    return serial;
  }

  clearStore(): void {
    this.serialsStore.clear();
  }
}
