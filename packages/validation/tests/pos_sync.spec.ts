import { describe, it, expect } from 'vitest';
import {
  OfflineSalePayloadSchema,
  OfflineCashMovementPayloadSchema,
  OfflinePosTransactionEnvelopeSchema,
  PosSyncBatchRequestSchema,
} from '../src/pos-sync.js';

describe('Offline POS Sync Validation Schemas (Phase 3E)', () => {
  describe('Offline Sale Payload Schema', () => {
    it('validates and parses a compliant offline sale payload', () => {
      const validPayload = {
        customer_name: 'Walk-in Customer',
        lines: [
          {
            variant_id: 'var_123',
            quantity: 2,
            unit_price_minor: 5000,
            discount_minor: '500',
            tax_minor: 400,
          },
        ],
        payments: [
          {
            tender_type: 'CASH',
            amount_minor: 9900,
            idempotency_key: 'idem_tender_1',
          },
        ],
      };

      const result = OfflineSalePayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines[0]?.unit_price_minor).toBe('5000');
        expect(result.data.lines[0]?.discount_minor).toBe('500');
        expect(result.data.payments[0]?.amount_minor).toBe('9900');
      }
    });

    it('rejects sale payload without lines or payments', () => {
      const noLines = {
        lines: [],
        payments: [{ tender_type: 'CASH', amount_minor: '100', idempotency_key: 'k1' }],
      };
      expect(OfflineSalePayloadSchema.safeParse(noLines).success).toBe(false);

      const noPayments = {
        lines: [{ variant_id: 'v1', quantity: 1, unit_price_minor: '100' }],
        payments: [],
      };
      expect(OfflineSalePayloadSchema.safeParse(noPayments).success).toBe(false);
    });
  });

  describe('Offline Cash Movement Payload Schema', () => {
    it('validates compliant cash movement payloads', () => {
      const valid = {
        movement_type: 'CASH_IN',
        amount_minor: 50000,
        reason: 'Opening float top-up',
        idempotency_key: 'idem_float_1',
      };
      const result = OfflineCashMovementPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount_minor).toBe('50000');
      }
    });

    it('rejects empty reason or invalid movement type', () => {
      const invalid = {
        movement_type: 'INVALID_TYPE',
        amount_minor: 1000,
        reason: '',
        idempotency_key: 'k1',
      };
      expect(OfflineCashMovementPayloadSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Batch Request Schema', () => {
    it('validates a complete batch sync envelope', () => {
      const batch = {
        device_id: 'pos_dev_01',
        pos_register_id: 'reg_01',
        pos_session_id: 'sess_01',
        transactions: [
          {
            client_tx_id: 'tx_uuid_001',
            device_id: 'pos_dev_01',
            pos_session_id: 'sess_01',
            client_sequence: 1,
            client_timestamp: '2026-10-08T15:00:00.000Z',
            tx_type: 'SALE',
            idempotency_key: 'tx_idem_001',
            sale_payload: {
              lines: [{ variant_id: 'v1', quantity: 1, unit_price_minor: '2000' }],
              payments: [{ tender_type: 'CARD', amount_minor: '2000', idempotency_key: 't1' }],
            },
          },
        ],
      };

      const result = PosSyncBatchRequestSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it('rejects batch with empty transactions list', () => {
      const emptyBatch = {
        device_id: 'pos_dev_01',
        pos_register_id: 'reg_01',
        pos_session_id: 'sess_01',
        transactions: [],
      };
      expect(PosSyncBatchRequestSchema.safeParse(emptyBatch).success).toBe(false);
    });
  });
});
