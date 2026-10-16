import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  StockReservation,
  CreateStockReservationRequest,
  ReservationStatus,
} from '@stokrova/contracts';
import { isReservationExpired } from '@stokrova/domain';
import { StockLedgerService } from './stock-ledger.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';

@Injectable()
export class StockReservationsService {
  private reservationsStore = new DurableMap<StockReservation>('stock_reservations');

  constructor(
    private readonly stockLedgerService: StockLedgerService,
    private readonly variantsService: VariantsService,
    private readonly warehousesService: WarehousesService,
  ) {}

  async createReservation(
    tenantId: string,
    req: CreateStockReservationRequest,
  ): Promise<StockReservation> {
    await this.variantsService.getVariantById(tenantId, req.variant_id);
    await this.warehousesService.getWarehouseById(tenantId, req.warehouse_id);

    // 1. Verify Available to Promise (ATP)
    const currentBalance = await this.stockLedgerService.getBalance(
      tenantId,
      req.warehouse_id,
      req.variant_id,
      null,
      req.batch_id || null,
    );

    if (currentBalance.available_to_promise < req.quantity) {
      throw new BadRequestException(
        `Insufficient available-to-promise inventory (${currentBalance.available_to_promise} available, ${req.quantity} requested).`,
      );
    }

    const ttlSeconds = req.ttl_seconds || 900;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    // 2. Adjust Balance (increment reserved_quantity)
    this.stockLedgerService.mutateReservationBalance(
      tenantId,
      req.warehouse_id,
      req.variant_id,
      req.batch_id || null,
      req.quantity,
    );

    // 3. Create Reservation Record
    const reservation: StockReservation = {
      id: `res_${randomUUID().replace(/-/g, '')}`,
      tenant_id: tenantId,
      variant_id: req.variant_id,
      warehouse_id: req.warehouse_id,
      batch_id: req.batch_id || null,
      serial_id: req.serial_id || null,
      quantity: req.quantity,
      status: 'ACTIVE',
      reference_type: req.reference_type,
      reference_id: req.reference_id,
      expires_at: expiresAt,
      fulfilled_at: null,
      released_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.reservationsStore.set(reservation.id, reservation);
    return reservation;
  }

  async releaseReservation(
    tenantId: string,
    id: string,
  ): Promise<StockReservation> {
    const reservation = await this.getReservationById(tenantId, id);

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot release reservation with status '${reservation.status}'.`,
      );
    }

    // Recover ATP by decrementing reserved_quantity
    this.stockLedgerService.mutateReservationBalance(
      tenantId,
      reservation.warehouse_id,
      reservation.variant_id,
      reservation.batch_id,
      -reservation.quantity,
    );

    const now = new Date().toISOString();
    reservation.status = 'RELEASED';
    reservation.released_at = now;
    reservation.updated_at = now;

    this.reservationsStore.set(reservation.id, reservation);
    return reservation;
  }

  async fulfillReservation(
    tenantId: string,
    id: string,
  ): Promise<StockReservation> {
    const reservation = await this.getReservationById(tenantId, id);

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot fulfill reservation with status '${reservation.status}'.`,
      );
    }

    // Decrement reserved quantity (physical on-hand will be decremented by ledger entry)
    this.stockLedgerService.mutateReservationBalance(
      tenantId,
      reservation.warehouse_id,
      reservation.variant_id,
      reservation.batch_id,
      -reservation.quantity,
    );

    const now = new Date().toISOString();
    reservation.status = 'FULFILLED';
    reservation.fulfilled_at = now;
    reservation.updated_at = now;

    this.reservationsStore.set(reservation.id, reservation);
    return reservation;
  }

  async getReservationById(
    tenantId: string,
    id: string,
  ): Promise<StockReservation> {
    const reservation = this.reservationsStore.get(id);
    if (!reservation || reservation.tenant_id !== tenantId) {
      throw new NotFoundException(`Stock reservation with ID '${id}' not found.`);
    }
    return reservation;
  }

  async getReservations(
    tenantId: string,
    filter?: {
      variant_id?: string;
      warehouse_id?: string;
      status?: ReservationStatus;
    },
  ): Promise<StockReservation[]> {
    return Array.from(this.reservationsStore.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (filter?.variant_id && r.variant_id !== filter.variant_id) return false;
      if (filter?.warehouse_id && r.warehouse_id !== filter.warehouse_id) return false;
      if (filter?.status && r.status !== filter.status) return false;
      return true;
    });
  }

  async reconcileExpiredReservations(tenantId: string): Promise<number> {
    let expiredCount = 0;
    const now = new Date().toISOString();

    for (const res of this.reservationsStore.values()) {
      if (res.tenant_id === tenantId && res.status === 'ACTIVE') {
        if (isReservationExpired(res.expires_at, now)) {
          // Release reservation
          this.stockLedgerService.mutateReservationBalance(
            tenantId,
            res.warehouse_id,
            res.variant_id,
            res.batch_id,
            -res.quantity,
          );
          res.status = 'EXPIRED';
          res.updated_at = now;
          this.reservationsStore.set(res.id, res);
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }

  clearStore(): void {
    this.reservationsStore.clear();
  }
}
