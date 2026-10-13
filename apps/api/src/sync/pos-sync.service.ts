import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PosSyncBatchRequest,
  PosSyncBatchResponse,
  PosSyncTransactionResolution,
  DeviceSyncStatusResponse,
  OfflinePosTransactionEnvelope,
} from '@stokrova/contracts';
import {
  validatePosSyncSequence,
  advanceVectorClock,
  evaluateOfflineInventoryReconciliation,
  calculateBatchSummary,
} from '@stokrova/domain';
import { PosService } from '../pos/pos.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface StoredPosSyncBatch {
  id: string;
  tenant_id: string;
  device_id: string;
  pos_session_id: string;
  pos_register_id: string;
  total_submitted: number;
  processed_count: number;
  duplicate_count: number;
  conflict_count: number;
  rejected_count: number;
  resolutions: PosSyncTransactionResolution[];
  created_at: string;
}

@Injectable()
export class PosSyncService {
  // Key: `${tenantId}:${deviceId}` -> last acknowledged client_sequence
  private deviceSequences = new Map<string, number>();

  // Key: `${tenantId}:${deviceId}` -> vector clock
  private deviceVectorClocks = new Map<string, Record<string, number>>();

  // Key: `${tenantId}:${clientTxId}` -> PosSyncTransactionResolution
  private txResolutionsByClientTxId = new Map<string, PosSyncTransactionResolution>();

  // Key: `${tenantId}:${idempotencyKey}` -> PosSyncTransactionResolution
  private txResolutionsByIdempotencyKey = new Map<string, PosSyncTransactionResolution>();

  // Key: batch_id -> StoredPosSyncBatch
  private batchesStore = new Map<string, StoredPosSyncBatch>();

  constructor(
    private readonly posService: PosService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly auditService: AuditService,
  ) {}

  // --------------------------------------------------------------------------
  // Device Status & Sequence Tracking
  // --------------------------------------------------------------------------

  async getDeviceSyncStatus(
    tenantId: string,
    deviceId: string,
  ): Promise<DeviceSyncStatusResponse> {
    const key = `${tenantId}:${deviceId}`;
    const lastSeq = this.deviceSequences.get(key) ?? 0;
    return {
      device_id: deviceId,
      last_acknowledged_sequence: lastSeq,
      server_timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Batch Synchronization & Conflict Resolution
  // --------------------------------------------------------------------------

  async processSyncBatch(
    tenantId: string,
    userId: string,
    req: PosSyncBatchRequest,
  ): Promise<PosSyncBatchResponse> {
    // 1. Validate Register & Session
    const register = await this.posService.getRegisterConfigById(tenantId, req.pos_register_id);
    await this.posService.getSessionById(tenantId, req.pos_session_id);

    const warehouseId = register.warehouse_id;
    const branchId = register.branch_id;

    const deviceKey = `${tenantId}:${req.device_id}`;
    let lastSeq = this.deviceSequences.get(deviceKey) ?? 0;
    let vectorClock = this.deviceVectorClocks.get(deviceKey) ?? {};

    // 2. Sort incoming transactions strictly by client sequence
    const sortedTxs = [...req.transactions].sort((a, b) => a.client_sequence - b.client_sequence);

    const resolutions: PosSyncTransactionResolution[] = [];

    // 3. Process each offline transaction with Rule 8, 10, 19, 24 invariants
    for (const tx of sortedTxs) {
      const resolution = await this.processIndividualTransaction(
        tenantId,
        userId,
        tx,
        lastSeq,
        branchId,
        warehouseId,
        req.pos_register_id,
        req.pos_session_id,
      );

      resolutions.push(resolution);

      if (resolution.status === 'PROCESSED' || resolution.status === 'CONFLICT_RECONCILED') {
        lastSeq = Math.max(lastSeq, tx.client_sequence);
        vectorClock = advanceVectorClock(vectorClock, req.device_id, tx.client_sequence);
      }
    }

    // 4. Update device state
    this.deviceSequences.set(deviceKey, lastSeq);
    this.deviceVectorClocks.set(deviceKey, vectorClock);

    // 5. Aggregate metrics
    const summary = calculateBatchSummary(resolutions);
    const batchId = `psync_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    const storedBatch: StoredPosSyncBatch = {
      id: batchId,
      tenant_id: tenantId,
      device_id: req.device_id,
      pos_session_id: req.pos_session_id,
      pos_register_id: req.pos_register_id,
      total_submitted: summary.total_submitted,
      processed_count: summary.processed_count,
      duplicate_count: summary.duplicate_count,
      conflict_count: summary.conflict_count,
      rejected_count: summary.rejected_count,
      resolutions,
      created_at: now,
    };

    this.batchesStore.set(batchId, storedBatch);

    return {
      batch_id: batchId,
      device_id: req.device_id,
      pos_session_id: req.pos_session_id,
      total_submitted: summary.total_submitted,
      processed_count: summary.processed_count,
      duplicate_count: summary.duplicate_count,
      conflict_count: summary.conflict_count,
      rejected_count: summary.rejected_count,
      resolutions,
      server_timestamp: now,
    };
  }

  private async processIndividualTransaction(
    tenantId: string,
    userId: string,
    tx: OfflinePosTransactionEnvelope,
    lastSeq: number,
    branchId: string,
    warehouseId: string,
    posRegisterId: string,
    posSessionId: string,
  ): Promise<PosSyncTransactionResolution> {
    const txIdKey = `${tenantId}:${tx.client_tx_id}`;
    const idemKey = `${tenantId}:${tx.idempotency_key}`;

    // A. Idempotency Check (Rule 8 & Rule 19)
    const existingByTxId = this.txResolutionsByClientTxId.get(txIdKey);
    if (existingByTxId) {
      return {
        ...existingByTxId,
        status: 'IDEMPOTENT_DUPLICATE',
      };
    }

    const existingByIdem = this.txResolutionsByIdempotencyKey.get(idemKey);
    if (existingByIdem) {
      return {
        ...existingByIdem,
        status: 'IDEMPOTENT_DUPLICATE',
      };
    }

    // B. Sequence Contiguity Check
    const seqCheck = validatePosSyncSequence(lastSeq, tx.client_sequence);
    if (seqCheck.isGap) {
      const resolution: PosSyncTransactionResolution = {
        client_tx_id: tx.client_tx_id,
        status: 'REJECTED',
        server_order_id: null,
        server_sequence: lastSeq,
        conflict_reason: `Sequence gap detected. Expected sequence ${lastSeq + 1}, received ${tx.client_sequence}.`,
        reconciliation_note: 'Client outbox must resend missing transactions first.',
      };
      return resolution;
    }

    // C. Process Transaction Type
    if (tx.tx_type === 'SALE' && tx.sale_payload) {
      return this.processOfflineSale(
        tenantId,
        userId,
        tx,
        branchId,
        warehouseId,
        posRegisterId,
        posSessionId,
      );
    }

    if (tx.tx_type === 'CASH_MOVEMENT' && tx.cash_movement_payload) {
      return this.processOfflineCashMovement(
        tenantId,
        userId,
        tx,
        posSessionId,
      );
    }

    const unhandledRes: PosSyncTransactionResolution = {
      client_tx_id: tx.client_tx_id,
      status: 'REJECTED',
      server_order_id: null,
      server_sequence: tx.client_sequence,
      conflict_reason: `Unsupported transaction type '${tx.tx_type}' or missing payload.`,
      reconciliation_note: null,
    };
    return unhandledRes;
  }

  private async processOfflineSale(
    tenantId: string,
    userId: string,
    tx: OfflinePosTransactionEnvelope,
    branchId: string,
    warehouseId: string,
    posRegisterId: string,
    posSessionId: string,
  ): Promise<PosSyncTransactionResolution> {
    const payload = tx.sale_payload!;
    let isDiscrepancyIncurred = false;
    let discrepancyNote: string | null = null;

    // 1. Inventory Check & Offline Reconciliation Evaluation (Rule 10, 24)
    for (const line of payload.lines) {
      const bal = await this.stockLedgerService.getBalance(
        tenantId,
        warehouseId,
        line.variant_id,
        null,
        null,
      );

      const recon = evaluateOfflineInventoryReconciliation(bal.on_hand_quantity, line.quantity);
      if (!recon.canDirectDebit) {
        isDiscrepancyIncurred = true;
        discrepancyNote = recon.reconciliationNote;
      }
    }

    // 2. Create Sales Order
    const order = await this.ordersService.createSalesOrder(tenantId, {
      channel_type: 'POS',
      branch_id: branchId,
      warehouse_id: warehouseId,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      pos_session_id: posSessionId,
      pos_register_id: posRegisterId,
      notes: payload.notes ?? `Created via offline POS sync (device: ${tx.device_id}, seq: ${tx.client_sequence})`,
      lines: payload.lines.map((l) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        unit_price_minor: l.unit_price_minor,
        discount_minor: l.discount_minor,
        tax_minor: l.tax_minor,
      })),
    });

    // 3. Process Multi-Tender Payments Idempotently (Rule 8, Rule 19)
    await this.paymentsService.processMultiTenderCheckout(tenantId, userId, {
      order_id: order.id,
      pos_session_id: posSessionId,
      total_payable_minor: order.grand_total_minor,
      tenders: payload.payments.map((p) => ({
        tender_type: p.tender_type,
        amount_minor: p.amount_minor,
        tender_reference: p.tender_reference,
        card_auth_code: p.card_auth_code,
        idempotency_key: p.idempotency_key,
      })),
    });

    // 4. Update order payment record
    let totalPaid = 0n;
    for (const p of payload.payments) {
      totalPaid += BigInt(p.amount_minor);
    }
    await this.ordersService.recordOrderPayment(tenantId, order.id, totalPaid);

    // 5. Post physical inventory movements
    for (const line of payload.lines) {
      const bal = await this.stockLedgerService.getBalance(
        tenantId,
        warehouseId,
        line.variant_id,
        null,
        null,
      );
      const recon = evaluateOfflineInventoryReconciliation(bal.on_hand_quantity, line.quantity);

      if (recon.fulfillableQty > 0) {
        await this.stockLedgerService.postMovement(tenantId, userId, {
          movement_type: 'SALES_DISPATCH',
          source_warehouse_id: warehouseId,
          destination_warehouse_id: null,
          variant_id: line.variant_id,
          quantity: recon.fulfillableQty,
          unit_cost_minor: line.unit_price_minor.toString(),
          idempotency_key: `sync_dispatch:${tx.client_tx_id}:${line.variant_id}`,
          reference_type: 'SALES_ORDER',
          reference_id: order.id,
          notes: `Offline sync dispatch for order ${order.order_number}`,
        });
      }

      if (recon.discrepancyQty > 0) {
        // Record inventory discrepancy adjustment
        await this.stockLedgerService.postMovement(tenantId, userId, {
          movement_type: 'STOCK_ADJUSTMENT',
          source_warehouse_id: warehouseId,
          destination_warehouse_id: null,
          variant_id: line.variant_id,
          quantity: recon.discrepancyQty,
          unit_cost_minor: line.unit_price_minor.toString(),
          idempotency_key: `sync_recon:${tx.client_tx_id}:${line.variant_id}`,
          reference_type: 'SALES_ORDER',
          reference_id: order.id,
          notes: recon.reconciliationNote,
        });

        // Emit audit record
        await this.auditService.recordAuditEvent(tenantId, {
          action: 'pos.sync.stock_discrepancy',
          entity_type: 'SALES_ORDER',
          entity_id: order.id,
          device_id: tx.device_id,
          metadata: {
            client_tx_id: tx.client_tx_id,
            variant_id: line.variant_id,
            discrepancy_quantity: recon.discrepancyQty,
            note: recon.reconciliationNote,
          },
        });
      }
    }

    const resolution: PosSyncTransactionResolution = {
      client_tx_id: tx.client_tx_id,
      status: isDiscrepancyIncurred ? 'CONFLICT_RECONCILED' : 'PROCESSED',
      server_order_id: order.id,
      server_sequence: tx.client_sequence,
      conflict_reason: isDiscrepancyIncurred ? 'STOCK_DISCREPANCY_DEFICIT' : null,
      reconciliation_note: discrepancyNote,
    };

    // Store resolutions for idempotency
    this.txResolutionsByClientTxId.set(`${tenantId}:${tx.client_tx_id}`, resolution);
    this.txResolutionsByIdempotencyKey.set(`${tenantId}:${tx.idempotency_key}`, resolution);

    return resolution;
  }

  private async processOfflineCashMovement(
    tenantId: string,
    userId: string,
    tx: OfflinePosTransactionEnvelope,
    posSessionId: string,
  ): Promise<PosSyncTransactionResolution> {
    const payload = tx.cash_movement_payload!;

    switch (payload.movement_type) {
      case 'CASH_IN':
        await this.posService.recordCashIn(tenantId, posSessionId, userId, {
          amount_minor: payload.amount_minor,
          reason: payload.reason,
        });
        break;
      case 'CASH_OUT':
        await this.posService.recordCashOut(tenantId, posSessionId, userId, {
          amount_minor: payload.amount_minor,
          reason: payload.reason,
        });
        break;
      case 'CASH_DROP':
        await this.posService.recordCashDrop(tenantId, posSessionId, userId, {
          amount_minor: payload.amount_minor,
          safe_drop_envelope: `ENV-${tx.client_sequence}`,
          reason: payload.reason,
        });
        break;
    }

    const resolution: PosSyncTransactionResolution = {
      client_tx_id: tx.client_tx_id,
      status: 'PROCESSED',
      server_order_id: null,
      server_sequence: tx.client_sequence,
      conflict_reason: null,
      reconciliation_note: `Cash movement '${payload.movement_type}' reconciled with session drawer.`,
    };

    this.txResolutionsByClientTxId.set(`${tenantId}:${tx.client_tx_id}`, resolution);
    this.txResolutionsByIdempotencyKey.set(`${tenantId}:${tx.idempotency_key}`, resolution);

    return resolution;
  }
}
