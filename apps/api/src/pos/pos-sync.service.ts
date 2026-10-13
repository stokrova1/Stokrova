import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  PosSyncBatchRequest,
  PosSyncBatchResponse,
  PosSyncTransactionResolution,
} from '@stokrova/contracts';
import {
  validatePosSyncSequence,
  evaluateOfflineInventoryReconciliation,
  advanceVectorClock,
} from '@stokrova/domain';
import { PosService } from './pos.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { InvoicingService } from '../invoicing/invoicing.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OutboxService } from '../infrastructure/outbox/outbox.service.js';

interface StoredSyncBatch {
  id: string;
  tenant_id: string;
  device_id: string;
  pos_session_id: string;
  total_submitted: number;
  processed_count: number;
  duplicate_count: number;
  conflict_count: number;
  rejected_count: number;
  created_at: string;
}

interface StoredSyncTransaction {
  id: string;
  tenant_id: string;
  client_tx_id: string;
  device_id: string;
  pos_session_id: string;
  client_sequence: number;
  idempotency_key: string;
  status: string;
  server_order_id: string | null;
  reconciliation_note: string | null;
  created_at: string;
}

@Injectable()
export class PosSyncService {
  private deviceLastSequence = new Map<string, number>(); // `${tenantId}:${deviceId}` -> lastSeq
  private deviceVectorClocks = new Map<string, Record<string, number>>();
  private syncBatchesStore = new Map<string, StoredSyncBatch>();
  private syncTransactionsStore = new Map<string, StoredSyncTransaction>();
  private processedTxIdempotency = new Map<string, PosSyncTransactionResolution>();

  constructor(
    private readonly posService: PosService,
    private readonly ordersService: OrdersService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly paymentsService: PaymentsService,
    private readonly invoicingService: InvoicingService,
    private readonly auditService?: AuditService,
    private readonly outboxService?: OutboxService,
  ) {}

  async processSyncBatch(
    tenantId: string,
    userId: string,
    req: PosSyncBatchRequest,
  ): Promise<PosSyncBatchResponse> {
    const session = await this.posService.getSessionById(tenantId, req.pos_session_id);
    const register = await this.posService.getRegisterConfigById(tenantId, req.pos_register_id);

    const deviceKey = `${tenantId}:${req.device_id}`;
    let lastSeq = this.deviceLastSequence.get(deviceKey) ?? 0;
    let vectorClock = this.deviceVectorClocks.get(deviceKey) ?? {};

    const batchId = `syncb_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    let processedCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    let rejectedCount = 0;
    const resolutions: PosSyncTransactionResolution[] = [];

    // Sort envelopes by client_sequence to preserve causality
    const sortedEnvelopes = [...req.transactions].sort(
      (a, b) => a.client_sequence - b.client_sequence,
    );

    for (const env of sortedEnvelopes) {
      const idempotencyKey = `${tenantId}:${env.idempotency_key}`;

      // 1. Check Idempotency (Rule 19)
      const cachedResolution = this.processedTxIdempotency.get(idempotencyKey);
      if (cachedResolution) {
        duplicateCount++;
        resolutions.push({
          ...cachedResolution,
          client_tx_id: env.client_tx_id,
          status: 'IDEMPOTENT_DUPLICATE',
        });
        continue;
      }

      // 2. Validate Monotonic Sequence Progression
      const seqValidation = validatePosSyncSequence(lastSeq, env.client_sequence);
      if (seqValidation.isDuplicateOrRegressed) {
        duplicateCount++;
        resolutions.push({
          client_tx_id: env.client_tx_id,
          status: 'IDEMPOTENT_DUPLICATE',
          server_sequence: lastSeq,
          conflict_reason: `Duplicate or regressed sequence ${env.client_sequence} (last confirmed: ${lastSeq})`,
        });
        continue;
      }

      if (seqValidation.isGap) {
        rejectedCount++;
        resolutions.push({
          client_tx_id: env.client_tx_id,
          status: 'REJECTED',
          server_sequence: lastSeq,
          conflict_reason: `Sequence gap detected: expected ${lastSeq + 1}, received ${env.client_sequence}`,
        });
        continue;
      }

      // 3. Process Transaction by Type
      if (env.tx_type === 'SALE' && env.sale_payload) {
        let isStockConflict = false;
        let conflictNote: string | null = null;

        // Offline Stock Reconciliation (Rule 10 & 24)
        for (const line of env.sale_payload.lines) {
          const balance = await this.stockLedgerService.getBalance(
            tenantId,
            register.warehouse_id,
            line.variant_id,
          );

          const recon = evaluateOfflineInventoryReconciliation(
            balance.available_to_promise,
            line.quantity,
          );

          if (!recon.canDirectDebit) {
            isStockConflict = true;
            conflictNote = recon.reconciliationNote;

            // Log discrepancy cycle count adjustment (inflow to align server with offline reality)
            await this.stockLedgerService.postMovement(tenantId, userId, {
              movement_type: 'STOCK_COUNT_ADJUSTMENT',
              source_warehouse_id: null,
              destination_warehouse_id: register.warehouse_id,
              variant_id: line.variant_id,
              quantity: recon.discrepancyQty,
              unit_cost_minor: line.unit_price_minor.toString(),
              reference_type: 'CYCLE_COUNT',
              reference_id: env.client_tx_id,
              idempotency_key: `recon:${env.client_tx_id}:${line.variant_id}`,
              notes: recon.reconciliationNote || 'Offline sales discrepancy compensation',
            });
          }
        }

        // Create authoritative Sales Order
        const order = await this.ordersService.createSalesOrder(tenantId, {
          channel_type: 'POS',
          branch_id: register.branch_id,
          warehouse_id: register.warehouse_id,
          pos_session_id: session.id,
          pos_register_id: register.id,
          customer_id: env.sale_payload.customer_id ?? null,
          customer_name: env.sale_payload.customer_name ?? null,
          currency_code: 'USD',
          lines: env.sale_payload.lines.map((l) => ({
            variant_id: l.variant_id,
            quantity: l.quantity,
            unit_price_minor: l.unit_price_minor.toString(),
            discount_minor: l.discount_minor ? l.discount_minor.toString() : '0',
            tax_minor: l.tax_minor ? l.tax_minor.toString() : '0',
          })),
          notes: `Synced from offline device ${env.device_id} (Tx: ${env.client_tx_id})`,
        });

        // Confirm & Dispatch
        await this.ordersService.confirmSalesOrder(tenantId, order.id);
        await this.ordersService.fulfillOrderLines(tenantId, order.id, {
          fulfillment_items: order.lines.map((l) => ({
            line_id: l.id,
            quantity_to_fulfill: l.quantity,
          })),
        });
        await this.ordersService.dispatchSalesOrder(tenantId, userId, order.id);

        // Create Invoice
        const invoice = await this.invoicingService.createInvoice(tenantId, userId, {
          order_id: order.id,
          customer_id: env.sale_payload.customer_id ?? null,
        });

        // Capture Tenders
        const checkout = await this.paymentsService.processMultiTenderCheckout(
          tenantId,
          userId,
          {
            order_id: order.id,
            pos_session_id: session.id,
            total_payable_minor: order.grand_total_minor,
            tenders: env.sale_payload.payments.map((p) => ({
              tender_type: p.tender_type,
              amount_minor: p.amount_minor.toString(),
              idempotency_key: p.idempotency_key,
              provider_reference: p.tender_reference || p.card_auth_code || undefined,
            })),
          },
        );

        await this.invoicingService.recordPaymentOnInvoice(
          tenantId,
          invoice.id,
          BigInt(checkout.total_allocated_minor),
        );
        await this.ordersService.recordOrderPayment(
          tenantId,
          order.id,
          BigInt(checkout.total_allocated_minor),
        );

        const status = isStockConflict ? 'CONFLICT_RECONCILED' : 'PROCESSED';
        if (isStockConflict) {
          conflictCount++;
        } else {
          processedCount++;
        }

        const resolution: PosSyncTransactionResolution = {
          client_tx_id: env.client_tx_id,
          status,
          server_order_id: order.id,
          server_sequence: env.client_sequence,
          conflict_reason: isStockConflict ? 'Insufficient stock during offline sale' : null,
          reconciliation_note: conflictNote,
        };

        resolutions.push(resolution);
        this.processedTxIdempotency.set(idempotencyKey, resolution);
      } else if (env.tx_type === 'CASH_MOVEMENT' && env.cash_movement_payload) {
        if (env.cash_movement_payload.movement_type === 'CASH_IN') {
          await this.posService.recordCashIn(tenantId, session.id, userId, {
            amount_minor: env.cash_movement_payload.amount_minor.toString(),
            reason: env.cash_movement_payload.reason,
          });
        } else if (env.cash_movement_payload.movement_type === 'CASH_OUT') {
          await this.posService.recordCashOut(tenantId, session.id, userId, {
            amount_minor: env.cash_movement_payload.amount_minor.toString(),
            reason: env.cash_movement_payload.reason,
          });
        } else if (env.cash_movement_payload.movement_type === 'CASH_DROP') {
          await this.posService.recordCashDrop(tenantId, session.id, userId, {
            amount_minor: env.cash_movement_payload.amount_minor.toString(),
            safe_drop_envelope: 'OFFLINE_SAFE_DROP',
            reason: env.cash_movement_payload.reason,
          });
        }

        processedCount++;
        const resolution: PosSyncTransactionResolution = {
          client_tx_id: env.client_tx_id,
          status: 'PROCESSED',
          server_sequence: env.client_sequence,
        };
        resolutions.push(resolution);
        this.processedTxIdempotency.set(idempotencyKey, resolution);
      }

      // Advance sequence & vector clock
      lastSeq = env.client_sequence;
      vectorClock = advanceVectorClock(vectorClock, env.device_id, lastSeq);
    }

    this.deviceLastSequence.set(deviceKey, lastSeq);
    this.deviceVectorClocks.set(deviceKey, vectorClock);

    const batchRecord: StoredSyncBatch = {
      id: batchId,
      tenant_id: tenantId,
      device_id: req.device_id,
      pos_session_id: req.pos_session_id,
      total_submitted: req.transactions.length,
      processed_count: processedCount,
      duplicate_count: duplicateCount,
      conflict_count: conflictCount,
      rejected_count: rejectedCount,
      created_at: now,
    };
    this.syncBatchesStore.set(batchId, batchRecord);

    if (this.auditService) {
      await this.auditService.recordAuditEvent(tenantId, {
        actor_user_id: userId,
        action: 'POS_SYNC_BATCH_PROCESSED',
        entity_type: 'POS_SYNC_BATCH',
        entity_id: batchId,
        metadata: {
          device_id: req.device_id,
          total_submitted: req.transactions.length,
          processed_count: processedCount,
          conflict_count: conflictCount,
        },
      });
    }

    if (this.outboxService) {
      await this.outboxService.enqueueEvent(
        tenantId,
        'pos.sync_completed',
        {
          batch_id: batchId,
          device_id: req.device_id,
          processed_count: processedCount,
          conflict_count: conflictCount,
          timestamp: now,
        },
        `syncbatch:${batchId}`,
      );
    }

    return {
      batch_id: batchId,
      device_id: req.device_id,
      pos_session_id: req.pos_session_id,
      total_submitted: req.transactions.length,
      processed_count: processedCount,
      duplicate_count: duplicateCount,
      conflict_count: conflictCount,
      rejected_count: rejectedCount,
      resolutions,
      server_timestamp: now,
    };
  }

  clearStore(): void {
    this.deviceLastSequence.clear();
    this.deviceVectorClocks.clear();
    this.syncBatchesStore.clear();
    this.syncTransactionsStore.clear();
    this.processedTxIdempotency.clear();
  }
}
