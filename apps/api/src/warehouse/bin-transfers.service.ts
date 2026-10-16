import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InternalBinTransfer,
  InternalTransferLine,
  InternalTransferResponse,
  ListInternalTransfersResponse,
  CreateInternalTransferRequest,
} from '@stokrova/contracts';
import { CreateInternalTransferSchema } from '@stokrova/validation';
import {
  assertBinTransferInvariants,
  assertTransferTransition,
  WarehouseOpsDomainError,
  type DomainTransferLocation,
  type DomainTransferItem,
  type DomainTransferStatus,
} from '@stokrova/domain';
import { WarehousesService } from './warehouses.service.js';
import { LocationsService } from './locations.service.js';

@Injectable()
export class BinTransfersService {
  private readonly transfers = new DurableMap<InternalBinTransfer>('internal_bin_transfers');
  private readonly transferLines = new DurableMap<InternalTransferLine>('internal_bin_transfer_lines');
  private transferSeq = 1001;

  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly locationsService: LocationsService,
  ) {}

  async createTransfer(
    tenantId: string,
    req: CreateInternalTransferRequest,
  ): Promise<InternalTransferResponse> {
    const parsed = CreateInternalTransferSchema.parse(req);

    // 1. Verify warehouse
    await this.warehousesService.getWarehouseById(tenantId, parsed.warehouse_id);

    // 2. Verify source & destination locations
    const src = await this.locationsService.getLocationById(
      tenantId,
      parsed.source_location_id,
    );
    const dst = await this.locationsService.getLocationById(
      tenantId,
      parsed.destination_location_id,
    );

    const domainSrc: DomainTransferLocation = {
      id: src.id,
      code: src.code,
      is_active: src.is_active,
      type: src.type as DomainTransferLocation['type'],
    };

    const domainDst: DomainTransferLocation = {
      id: dst.id,
      code: dst.code,
      is_active: dst.is_active,
      type: dst.type as DomainTransferLocation['type'],
      mix_policy: dst.mix_policy as DomainTransferLocation['mix_policy'],
      max_weight_kg: dst.max_weight_kg,
      max_volume_cm3: dst.max_volume_cm3,
    };

    // 3. Enforce domain invariants for all lines
    try {
      if (dst.mix_policy === 'SINGLE_SKU') {
        const distinctSkus = new Set(parsed.lines.map((l) => l.sku.trim().toUpperCase()));
        if (distinctSkus.size > 1) {
          throw new WarehouseOpsDomainError(
            'SINGLE_SKU_VIOLATION',
            `Destination location '${dst.code}' has a SINGLE_SKU policy, but transfer contains multiple distinct SKUs.`,
          );
        }
      }

      for (const line of parsed.lines) {
        const item: DomainTransferItem = {
          sku: line.sku,
          quantity: line.quantity,
          unit_weight_kg: line.unit_weight_kg,
          unit_volume_cm3: line.unit_volume_cm3,
        };
        assertBinTransferInvariants(domainSrc, domainDst, item);
      }
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const nextNum = this.transferSeq++;
    const transferNumber = `TRF-${nextNum}`;
    const now = new Date().toISOString();
    const transferId = `trf_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const createdLines: InternalTransferLine[] = parsed.lines.map((l) => {
      const line: InternalTransferLine = {
        id: `trf_line_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenant_id: tenantId,
        transfer_id: transferId,
        variant_id: l.variant_id,
        sku: l.sku,
        quantity: l.quantity,
        batch_id: l.batch_id ?? null,
        serial_numbers: l.serial_numbers ?? null,
        created_at: now,
      };
      this.transferLines.set(line.id, line);
      return line;
    });

    const transfer: InternalBinTransfer = {
      id: transferId,
      tenant_id: tenantId,
      warehouse_id: parsed.warehouse_id,
      transfer_number: transferNumber,
      transfer_type: parsed.transfer_type,
      status: 'PENDING',
      source_location_id: src.id,
      source_location_code: src.code,
      destination_location_id: dst.id,
      destination_location_code: dst.code,
      lines: createdLines,
      operator_id: parsed.operator_id ?? null,
      notes: parsed.notes ?? null,
      completed_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    this.transfers.set(transfer.id, transfer);
    return { transfer };
  }

  async startTransfer(
    tenantId: string,
    id: string,
  ): Promise<InternalTransferResponse> {
    const transfer = await this.getTransferEntity(tenantId, id);

    try {
      assertTransferTransition(
        transfer.status as DomainTransferStatus,
        'IN_TRANSIT',
      );

      const updated: InternalBinTransfer = {
        ...transfer,
        status: 'IN_TRANSIT',
        updated_at: new Date().toISOString(),
      };

      this.transfers.set(id, updated);
      return { transfer: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async completeTransfer(
    tenantId: string,
    id: string,
  ): Promise<InternalTransferResponse> {
    const transfer = await this.getTransferEntity(tenantId, id);

    try {
      assertTransferTransition(
        transfer.status as DomainTransferStatus,
        'COMPLETED',
      );

      const now = new Date().toISOString();
      const updated: InternalBinTransfer = {
        ...transfer,
        status: 'COMPLETED',
        completed_at: now,
        updated_at: now,
      };

      this.transfers.set(id, updated);
      return { transfer: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async cancelTransfer(
    tenantId: string,
    id: string,
  ): Promise<InternalTransferResponse> {
    const transfer = await this.getTransferEntity(tenantId, id);

    try {
      assertTransferTransition(
        transfer.status as DomainTransferStatus,
        'CANCELLED',
      );

      const now = new Date().toISOString();
      const updated: InternalBinTransfer = {
        ...transfer,
        status: 'CANCELLED',
        cancelled_at: now,
        updated_at: now,
      };

      this.transfers.set(id, updated);
      return { transfer: updated };
    } catch (err: unknown) {
      if (err instanceof WarehouseOpsDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async getTransferById(
    tenantId: string,
    id: string,
  ): Promise<InternalTransferResponse> {
    const transfer = await this.getTransferEntity(tenantId, id);
    return { transfer };
  }

  async listTransfers(
    tenantId: string,
    warehouseId: string,
  ): Promise<ListInternalTransfersResponse> {
    await this.warehousesService.getWarehouseById(tenantId, warehouseId);

    const transfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenant_id === tenantId && t.warehouse_id === warehouseId,
    );
    return { transfers };
  }

  private async getTransferEntity(
    tenantId: string,
    id: string,
  ): Promise<InternalBinTransfer> {
    const transfer = this.transfers.get(id);
    if (!transfer || transfer.tenant_id !== tenantId) {
      throw new NotFoundException(`Internal transfer '${id}' not found.`);
    }
    return transfer;
  }
}
