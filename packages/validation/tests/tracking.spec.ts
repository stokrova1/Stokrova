import { describe, it, expect } from 'vitest';
import {
  CreateBatchSchema,
  QuarantineHoldSchema,
  CreateSerialSchema,
  BatchRegisterSerialsSchema,
} from '../src/tracking.js';

describe('Tracking Validation Schemas (Phase 2D)', () => {
  describe('CreateBatchSchema', () => {
    it('validates and transforms batch creation payload', () => {
      const result = CreateBatchSchema.safeParse({
        variant_id: 'var_123',
        batch_number: 'batch-2026-01',
        supplier_lot_number: 'LOT-XYZ-9',
        manufacture_date: '2026-01-01T00:00:00.000Z',
        expiry_date: '2026-12-31T00:00:00.000Z',
        certificate_of_analysis_url: 'https://cdn.example.com/coa/batch-01.pdf',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.batch_number).toBe('BATCH-2026-01'); // uppercase
      }
    });

    it('rejects invalid URL or missing variant_id', () => {
      const badUrl = CreateBatchSchema.safeParse({
        variant_id: 'var_123',
        batch_number: 'LOT-1',
        certificate_of_analysis_url: 'not-a-url',
      });
      expect(badUrl.success).toBe(false);

      const missingVariant = CreateBatchSchema.safeParse({
        variant_id: '',
        batch_number: 'LOT-1',
      });
      expect(missingVariant.success).toBe(false);
    });
  });

  describe('QuarantineHoldSchema', () => {
    it('validates supported quarantine reason codes', () => {
      const valid = QuarantineHoldSchema.safeParse({
        reason: 'QA_INSPECTION_PENDING',
        notes: 'Hold until microbiological assay passes.',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects unrecognized quarantine reason code', () => {
      const invalid = QuarantineHoldSchema.safeParse({
        reason: 'RANDOM_REASON',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('CreateSerialSchema & BatchRegisterSerialsSchema', () => {
    it('validates valid serial format with permitted symbols', () => {
      const result = CreateSerialSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        serial_number: 'SN-2026.04/A_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects serial numbers with invalid characters', () => {
      const result = CreateSerialSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        serial_number: 'SN#BAD@VAL',
      });
      expect(result.success).toBe(false);
    });

    it('validates bulk serial registration', () => {
      const result = BatchRegisterSerialsSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        serial_numbers: ['SN-001', 'SN-002', 'SN-003'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty serial array in bulk registration', () => {
      const result = BatchRegisterSerialsSchema.safeParse({
        variant_id: 'var_123',
        warehouse_id: 'wh_main',
        serial_numbers: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
