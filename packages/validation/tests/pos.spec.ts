import { describe, it, expect } from 'vitest';
import {
  CreatePosRegisterConfigSchema,
  OpenPosSessionSchema,
  RecordPosCashInSchema,
  RecordPosCashOutSchema,
  RecordPosCashDropSchema,
  ClosePosSessionSchema,
  ReconcilePosSessionSchema,
} from '../src/pos.js';

describe('POS Validation Schemas (Phase 3B)', () => {
  describe('CreatePosRegisterConfigSchema', () => {
    it('validates a correct register config request', () => {
      const input = {
        branch_id: 'b_123',
        name: 'Register 1 - Front Counter',
        code: 'REG-01',
        warehouse_id: 'wh_main',
        blind_closing_enabled: true,
        max_cash_limit_minor: '500000',
        max_allowed_variance_minor: '2000',
        open_cash_drawer_on_sale: true,
      };
      const result = CreatePosRegisterConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty name or code', () => {
      const input = {
        branch_id: 'b_123',
        name: '',
        code: '',
        warehouse_id: 'wh_main',
      };
      const result = CreatePosRegisterConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('OpenPosSessionSchema', () => {
    it('validates opening session with denominations breakdown', () => {
      const input = {
        register_id: 'reg_123',
        opening_float_minor: '15000',
        denominations: [
          { denomination_minor: '10000', count: 1 },
          { denomination_minor: '5000', count: 1 },
        ],
        notes: 'Morning shift float',
      };
      const result = OpenPosSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.opening_float_minor).toBe('15000');
        expect(result.data.currency_code).toBe('USD');
      }
    });

    it('rejects negative opening float', () => {
      const input = {
        register_id: 'reg_123',
        opening_float_minor: '-100',
      };
      const result = OpenPosSessionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Cash Movements Schemas', () => {
    it('validates cash in and cash out operations', () => {
      const cashIn = RecordPosCashInSchema.safeParse({
        amount_minor: '5000',
        reason: 'Change replenishment from vault',
      });
      expect(cashIn.success).toBe(true);

      const cashOut = RecordPosCashOutSchema.safeParse({
        amount_minor: '2500',
        reason: 'Office coffee supplies',
        authorized_by_user_id: 'mgr_456',
      });
      expect(cashOut.success).toBe(true);
    });

    it('validates cash drop to safe with envelope reference', () => {
      const cashDrop = RecordPosCashDropSchema.safeParse({
        amount_minor: '200000',
        safe_drop_envelope: 'ENV-2026-10-08-01',
        reason: 'Midday cash limit skim',
        authorized_by_user_id: 'mgr_456',
      });
      expect(cashDrop.success).toBe(true);
    });

    it('rejects zero amount for cash movements', () => {
      const invalid = RecordPosCashInSchema.safeParse({
        amount_minor: '0',
        reason: 'Test',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Close and Reconcile Schemas', () => {
    it('validates session closing request', () => {
      const close = ClosePosSessionSchema.safeParse({
        closing_actual_minor: '45000',
        supervisor_user_id: 'mgr_456',
        supervisor_override_reason: 'Approved $2 variance',
        notes: 'Shift completed cleanly',
      });
      expect(close.success).toBe(true);
    });

    it('validates session reconciliation request', () => {
      const rec = ReconcilePosSessionSchema.safeParse({
        supervisor_user_id: 'mgr_456',
        notes: 'Reconciliation audited against physical bank bag',
      });
      expect(rec.success).toBe(true);
    });
  });
});
