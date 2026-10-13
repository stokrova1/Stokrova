import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { BranchesService } from './branches.service.js';
import { WorkCentersService } from './work-centers.service.js';
import { RegistersService } from './registers.service.js';

describe('RegistersService (Tills, Sessions & Till Balancing)', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let registersService: RegistersService;
  let tenantId: string;
  let branchId: string;
  let paymentWorkCenterId: string;
  const cashierUserId = 'usr_cashier_01';

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    workCentersService = new WorkCentersService(branchesService);
    registersService = new RegistersService(branchesService, workCentersService);

    const provisionResult = await tenancyService.provisionTenant(
      {
        name: 'Supermart Group',
        slug: 'supermart-group',
        owner_email: 'owner@supermart.com',
        owner_full_name: 'Supermart Owner',
      },
      'usr_owner_01',
    );

    tenantId = provisionResult.tenant.id;
    branchId = provisionResult.default_branch.id;

    const wc = await workCentersService.createWorkCenter(tenantId, {
      branch_id: branchId,
      name: 'Central Cashier Station',
      type: 'PAYMENT',
    });
    paymentWorkCenterId = wc.id;
  });

  describe('Register Creation', () => {
    it('creates register attached to branch and work center', async () => {
      const register = await registersService.createRegister(tenantId, {
        branch_id: branchId,
        work_center_id: paymentWorkCenterId,
        name: 'Till 01',
        code: 'POS-01',
      });

      expect(register.id).toBeDefined();
      expect(register.name).toBe('Till 01');
      expect(register.code).toBe('POS-01');
      expect(register.status).toBe('ACTIVE');
      expect(register.work_center_id).toBe(paymentWorkCenterId);
    });

    it('rejects duplicate register code within same branch', async () => {
      await registersService.createRegister(tenantId, {
        branch_id: branchId,
        name: 'Till 01',
        code: 'POS-01',
      });

      await expect(
        registersService.createRegister(tenantId, {
          branch_id: branchId,
          name: 'Till 01 Duplicate',
          code: 'POS-01',
        }),
      ).rejects.toThrowError(/Register with code 'POS-01' already exists/);
    });
  });

  describe('Session Lifecycle & Cash Movements', () => {
    let registerId: string;

    beforeEach(async () => {
      const reg = await registersService.createRegister(tenantId, {
        branch_id: branchId,
        work_center_id: paymentWorkCenterId,
        name: 'Main POS Till',
        code: 'POS-MAIN',
      });
      registerId = reg.id;
    });

    it('opens a session with opening float and records initial float movement', async () => {
      const session = await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 20000, // ₦200.00
        notes: 'Morning shift opening float',
      });

      expect(session.status).toBe('OPEN');
      expect(session.opening_float_minor).toBe('20000');
      expect(session.opened_by_user_id).toBe(cashierUserId);

      // Verify active session lookup
      const active = await registersService.getActiveSession(tenantId, registerId);
      expect(active?.id).toBe(session.id);
    });

    it('rejects opening a new session when an active session already exists', async () => {
      await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 10000,
      });

      await expect(
        registersService.openSession(tenantId, cashierUserId, {
          register_id: registerId,
          opening_float_minor: 15000,
        }),
      ).rejects.toThrowError(/already has an active OPEN session/);
    });

    it('rejects negative opening float', async () => {
      await expect(
        registersService.openSession(tenantId, cashierUserId, {
          register_id: registerId,
          opening_float_minor: -500,
        }),
      ).rejects.toThrowError(/cannot be negative/);
    });

    it('records valid operative cash movements', async () => {
      const session = await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 10000,
      });

      const sale = await registersService.recordCashMovement(
        tenantId,
        session.id,
        cashierUserId,
        {
          movement_type: 'CASH_SALE',
          amount_minor: 50000,
          reason: 'Customer sale #101',
        },
      );
      expect(sale.movement_type).toBe('CASH_SALE');
      expect(sale.amount_minor).toBe('50000');

      const refund = await registersService.recordCashMovement(
        tenantId,
        session.id,
        cashierUserId,
        {
          movement_type: 'CASH_REFUND',
          amount_minor: 5000,
          reason: 'Customer return #101',
        },
      );
      expect(refund.movement_type).toBe('CASH_REFUND');
      expect(refund.amount_minor).toBe('5000');
    });

    it('rejects recording cash movement when session is not OPEN', async () => {
      const session = await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 10000,
      });

      // Close the session
      await registersService.closeSession(tenantId, session.id, cashierUserId, {
        closing_actual_minor: 10000,
      });

      await expect(
        registersService.recordCashMovement(tenantId, session.id, cashierUserId, {
          movement_type: 'CASH_SALE',
          amount_minor: 25000,
        }),
      ).rejects.toThrowError(/Session must be OPEN/);
    });

    it('rejects zero or negative cash movement amount', async () => {
      const session = await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 10000,
      });

      await expect(
        registersService.recordCashMovement(tenantId, session.id, cashierUserId, {
          movement_type: 'CASH_SALE',
          amount_minor: 0,
        }),
      ).rejects.toThrowError(/must be strictly positive/);

      await expect(
        registersService.recordCashMovement(tenantId, session.id, cashierUserId, {
          movement_type: 'CASH_SALE',
          amount_minor: -100,
        }),
      ).rejects.toThrowError(/must be strictly positive/);
    });
  });

  describe('Session Summary and Blind Till Closing Reconciliation', () => {
    let registerId: string;
    let sessionId: string;

    beforeEach(async () => {
      const reg = await registersService.createRegister(tenantId, {
        branch_id: branchId,
        name: 'Checkout Till 02',
        code: 'POS-02',
      });
      registerId = reg.id;

      // Open session with ₦50,000 opening float
      const session = await registersService.openSession(tenantId, cashierUserId, {
        register_id: registerId,
        opening_float_minor: 50000,
      });
      sessionId = session.id;

      // Add movements:
      // Cash Sales: +₦150,000
      await registersService.recordCashMovement(tenantId, sessionId, cashierUserId, {
        movement_type: 'CASH_SALE',
        amount_minor: 150000,
      });
      // Cash In (additional change added): +₦20,000
      await registersService.recordCashMovement(tenantId, sessionId, cashierUserId, {
        movement_type: 'CASH_IN',
        amount_minor: 20000,
      });
      // Cash Refund: -₦10,000
      await registersService.recordCashMovement(tenantId, sessionId, cashierUserId, {
        movement_type: 'CASH_REFUND',
        amount_minor: 10000,
      });
      // Cash Out (midday bank drop): -₦100,000
      await registersService.recordCashMovement(tenantId, sessionId, cashierUserId, {
        movement_type: 'CASH_OUT',
        amount_minor: 100000,
      });

      // Expected closing = 50,000 + 150,000 + 20,000 - 10,000 - 100,000 = 110,000
    });

    it('calculates session summary with accurate expected closing minor', async () => {
      const summary = await registersService.getSessionSummary(tenantId, sessionId);

      expect(summary.total_cash_sales_minor).toBe('150000');
      expect(summary.total_cash_in_minor).toBe('20000');
      expect(summary.total_cash_refunds_minor).toBe('10000');
      expect(summary.total_cash_out_minor).toBe('100000');
      expect(summary.expected_closing_minor).toBe('110000');
    });

    it('closes session with exact match (zero variance)', async () => {
      const closed = await registersService.closeSession(tenantId, sessionId, cashierUserId, {
        closing_actual_minor: 110000, // exact count
        notes: 'Exact physical count verified',
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.closing_expected_minor).toBe('110000');
      expect(closed.closing_actual_minor).toBe('110000');
      expect(closed.variance_minor).toBe('0');
      expect(closed.closed_by_user_id).toBe(cashierUserId);
      expect(closed.closed_at).toBeDefined();
    });

    it('closes session with cash surplus / overage', async () => {
      // Counted ₦112,000 when expected was ₦110,000 -> variance +2,000
      const closed = await registersService.closeSession(tenantId, sessionId, cashierUserId, {
        closing_actual_minor: 112000,
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.closing_expected_minor).toBe('110000');
      expect(closed.closing_actual_minor).toBe('112000');
      expect(closed.variance_minor).toBe('2000');
    });

    it('closes session with cash shortage', async () => {
      // Counted ₦107,500 when expected was ₦110,000 -> variance -2,500
      const closed = await registersService.closeSession(tenantId, sessionId, cashierUserId, {
        closing_actual_minor: 107500,
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.closing_expected_minor).toBe('110000');
      expect(closed.closing_actual_minor).toBe('107500');
      expect(closed.variance_minor).toBe('-2500');
    });

    it('rejects closing an already closed session', async () => {
      await registersService.closeSession(tenantId, sessionId, cashierUserId, {
        closing_actual_minor: 110000,
      });

      await expect(
        registersService.closeSession(tenantId, sessionId, cashierUserId, {
          closing_actual_minor: 110000,
        }),
      ).rejects.toThrowError(/Cannot close session with status 'CLOSED'/);
    });
  });
});
