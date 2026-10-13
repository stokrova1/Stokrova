import { describe, it, expect } from 'vitest';
import {
  CreateBranchRequestSchema,
  CreateWorkCenterRequestSchema,
  CreateRegisterRequestSchema,
  OpenSessionRequestSchema,
  CloseSessionRequestSchema,
  RecordCashMovementRequestSchema,
} from '../src/work_centers.js';

describe('Work Centers & Registers Validation Schemas', () => {
  it('validates branch creation requests', () => {
    const valid = CreateBranchRequestSchema.safeParse({
      company_id: 'cmp_123',
      name: 'Victoria Island Branch',
      code: 'VI',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateBranchRequestSchema.safeParse({
      company_id: '',
      name: 'V',
      code: 'X',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates work center creation with allowed station types', () => {
    const valid = CreateWorkCenterRequestSchema.safeParse({
      branch_id: 'brn_123',
      name: 'Picking Bay Alpha',
      type: 'PICKING',
    });
    expect(valid.success).toBe(true);

    const invalidType = CreateWorkCenterRequestSchema.safeParse({
      branch_id: 'brn_123',
      name: 'Invalid Station',
      type: 'INVALID_STATION_TYPE',
    });
    expect(invalidType.success).toBe(false);
  });

  it('validates register creation requests', () => {
    const valid = CreateRegisterRequestSchema.safeParse({
      branch_id: 'brn_123',
      name: 'Till A',
      code: 'POS-A',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateRegisterRequestSchema.safeParse({
      branch_id: '',
      name: '',
      code: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates opening and closing session payloads', () => {
    const validOpen = OpenSessionRequestSchema.safeParse({
      register_id: 'reg_123',
      opening_float_minor: 50000,
    });
    expect(validOpen.success).toBe(true);

    const negativeOpen = OpenSessionRequestSchema.safeParse({
      register_id: 'reg_123',
      opening_float_minor: -100,
    });
    expect(negativeOpen.success).toBe(false);

    const validClose = CloseSessionRequestSchema.safeParse({
      closing_actual_minor: 65000,
      notes: 'Evening shift end',
    });
    expect(validClose.success).toBe(true);
  });

  it('validates operative cash movements and strictly requires positive amounts', () => {
    const validSale = RecordCashMovementRequestSchema.safeParse({
      movement_type: 'CASH_SALE',
      amount_minor: 12500,
    });
    expect(validSale.success).toBe(true);

    const zeroAmount = RecordCashMovementRequestSchema.safeParse({
      movement_type: 'CASH_SALE',
      amount_minor: 0,
    });
    expect(zeroAmount.success).toBe(false);

    const negativeAmount = RecordCashMovementRequestSchema.safeParse({
      movement_type: 'CASH_SALE',
      amount_minor: -500,
    });
    expect(negativeAmount.success).toBe(false);
  });
});
