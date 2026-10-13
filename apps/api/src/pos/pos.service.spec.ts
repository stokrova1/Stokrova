import { describe, it, expect, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PosService } from './pos.service.js';
import { BranchesService } from '../work-centers/branches.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';

describe('POS Sessions, Registers & Till Balancing Services (Phase 3B)', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let warehousesService: WarehousesService;
  let pricingService: PricingService;
  let posService: PosService;

  let tenant1Id: string;
  let tenant2Id: string;
  let branch1Id: string;
  let warehouse1Id: string;
  let priceList1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    warehousesService = new WarehousesService(tenancyService);

    const uomService = new UomService();
    const categoriesService = new CategoriesService();
    const brandsService = new BrandsService();
    const templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    const variantsService = new VariantsService(templatesService);
    pricingService = new PricingService(variantsService);

    posService = new PosService(branchesService, warehousesService, pricingService);

    // Seed tenants & branches
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Retail Corp 1',
        slug: 'retail-corp-1',
        owner_email: 'owner1@retail.com',
        owner_full_name: 'Owner One',
        default_currency: 'USD',
      },
      'usr_owner1',
    );
    tenant1Id = t1.tenant.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Retail Corp 2',
        slug: 'retail-corp-2',
        owner_email: 'owner2@retail.com',
        owner_full_name: 'Owner Two',
        default_currency: 'USD',
      },
      'usr_owner2',
    );
    tenant2Id = t2.tenant.id;

    const b1 = await branchesService.createBranch(tenant1Id, {
      company_id: t1.company.id,
      name: 'Main Flagship Store',
      code: 'STORE-MAIN',
    });
    branch1Id = b1.id;

    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-STORE-01',
      name: 'Store Front Warehouse',
    });
    warehouse1Id = wh1.id;

    const pl1 = await pricingService.createPriceList(tenant1Id, {
      code: 'RETAIL_DEFAULT',
      name: 'Default Retail Prices',
      currency_code: 'USD',
      is_default: true,
    });
    priceList1Id = pl1.id;
  });

  describe('Register Configuration Management', () => {
    it('creates POS register with warehouse and pricing configuration', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        default_price_list_id: priceList1Id,
        name: 'Register Lane 1',
        code: 'REG-LANE-01',
        blind_closing_enabled: true,
        max_cash_limit_minor: '100000', // $1,000 threshold
        max_allowed_variance_minor: '1000', // $10 variance tolerance
        receipt_header: 'Welcome to STOKROVA Store',
        open_cash_drawer_on_sale: true,
      });

      expect(reg.id).toBeDefined();
      expect(reg.code).toBe('REG-LANE-01');
      expect(reg.warehouse_id).toBe(warehouse1Id);
      expect(reg.default_price_list_id).toBe(priceList1Id);
      expect(reg.max_cash_limit_minor).toBe('100000');
    });

    it('rejects duplicate register codes within same tenant', async () => {
      await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Register Lane 1',
        code: 'REG-DUP',
      });

      await expect(
        posService.createRegisterConfig(tenant1Id, {
          branch_id: branch1Id,
          warehouse_id: warehouse1Id,
          name: 'Another Lane',
          code: 'REG-DUP',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates register configuration correctly', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Register Original',
        code: 'REG-UP',
      });

      const updated = await posService.updateRegisterConfig(tenant1Id, reg.id, {
        name: 'Register Express',
        max_cash_limit_minor: '50000',
      });

      expect(updated.name).toBe('Register Express');
      expect(updated.max_cash_limit_minor).toBe('50000');
    });
  });

  describe('Session Operations & Denomination Checks', () => {
    it('opens session and enforces denomination breakdown matches declared opening float', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Lane 1',
        code: 'REG-SES-01',
      });

      // Mismatched denominations: 1 x $100 = $100 (10000 minor), but declared is $150 (15000 minor)
      await expect(
        posService.openSession(tenant1Id, 'usr_cashier1', {
          register_id: reg.id,
          opening_float_minor: '15000',
          denominations: [{ denomination_minor: '10000', count: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      // Correct denominations: 1 x $100 (10000) + 1 x $50 (5000) = $150 (15000)
      const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '15000',
        denominations: [
          { denomination_minor: '10000', count: 1 },
          { denomination_minor: '5000', count: 1 },
        ],
        notes: 'Shift started on time',
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe('OPEN');
      expect(session.opening_float_minor).toBe('15000');
    });

    it('prevents opening a second session on the same register while one is open', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Lane 2',
        code: 'REG-SES-02',
      });

      await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '10000',
      });

      await expect(
        posService.openSession(tenant1Id, 'usr_cashier2', {
          register_id: reg.id,
          opening_float_minor: '10000',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('supports suspend and resume state transitions', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Lane 3',
        code: 'REG-SES-03',
      });

      const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '10000',
      });

      const suspended = await posService.suspendSession(tenant1Id, session.id, 'usr_cashier1');
      expect(suspended.status).toBe('SUSPENDED');

      const resumed = await posService.resumeSession(tenant1Id, session.id, 'usr_cashier1');
      expect(resumed.status).toBe('OPEN');
    });
  });

  describe('Cash Movements & Drawer Underflow Prevention', () => {
    it('records cash in, cash sales, and enforces drawer underflow protection on cash drops & outs', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Till A',
        code: 'TILL-A',
      });

      const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '20000', // $200.00
      });

      // Cash in +$50.00
      await posService.recordCashIn(tenant1Id, session.id, 'usr_cashier1', {
        amount_minor: '5000',
        reason: 'Change replenishment',
      });

      // Sale cash +$150.00
      await posService.recordSaleCashMovement(
        tenant1Id,
        session.id,
        'usr_cashier1',
        15000n,
        'ord_sale_101',
      );

      // Current balance = 20000 + 5000 + 15000 = 40000 ($400.00)
      let summary = await posService.getSessionSummary(tenant1Id, session.id);
      expect(summary.current_drawer_balance_minor).toBe('40000');

      // Attempt Cash Out of $500.00 (exceeds $400.00 drawer balance) -> REJECTED
      await expect(
        posService.recordCashOut(tenant1Id, session.id, 'usr_cashier1', {
          amount_minor: '50000',
          reason: 'Emergency supplies',
        }),
      ).rejects.toThrow(BadRequestException);

      // Attempt Cash Drop of $500.00 (exceeds $400.00 drawer balance) -> REJECTED
      await expect(
        posService.recordCashDrop(tenant1Id, session.id, 'usr_cashier1', {
          amount_minor: '50000',
          safe_drop_envelope: 'ENV-99',
        }),
      ).rejects.toThrow(BadRequestException);

      // Valid Cash Drop of $250.00 (25000 minor)
      const drop = await posService.recordCashDrop(tenant1Id, session.id, 'usr_cashier1', {
        amount_minor: '25000',
        safe_drop_envelope: 'ENV-01',
        reason: 'Midday safe deposit',
        authorized_by_user_id: 'usr_mgr_1',
      });
      expect(drop.drawer_balance_after_minor).toBe('15000'); // Remaining $150.00

      // Summary checks
      summary = await posService.getSessionSummary(tenant1Id, session.id);
      expect(summary.current_drawer_balance_minor).toBe('15000');
      expect(summary.total_cash_drops_minor).toBe('25000');
    });
  });

  describe('Session Closing, Blind Count Reconciliation & Supervisor Policy', () => {
    it('closes session smoothly when blind count matches expected cash (BALANCED)', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Till B',
        code: 'TILL-B',
      });

      const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '10000', // $100.00
      });

      // Cash sale +$50.00
      await posService.recordSaleCashMovement(
        tenant1Id,
        session.id,
        'usr_cashier1',
        5000n,
        'ord_sale_102',
      );

      // Expected = 15000 ($150.00)
      const closed = await posService.closeSession(tenant1Id, session.id, 'usr_cashier1', {
        closing_actual_minor: '15000',
        notes: 'End of shift count',
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.variance_minor).toBe('0');
      expect(closed.variance_category).toBe('BALANCED');

      // Reconcile session
      const reconciled = await posService.reconcileSession(tenant1Id, session.id, {
        supervisor_user_id: 'usr_mgr_1',
        notes: 'Audited and verified against till tape',
      });
      expect(reconciled.status).toBe('RECONCILED');
    });

    it('enforces supervisor override when closing count variance exceeds allowed threshold', async () => {
      const reg = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Till C',
        code: 'TILL-C',
        max_allowed_variance_minor: '1000', // $10.00 max tolerance
      });

      const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg.id,
        opening_float_minor: '20000', // $200.00
      });

      // Actual count: $170.00 (shortage of $30.00 / -3000 minor, which exceeds $10.00 tolerance)
      // Without supervisor approval -> REJECTED
      await expect(
        posService.closeSession(tenant1Id, session.id, 'usr_cashier1', {
          closing_actual_minor: '17000',
        }),
      ).rejects.toThrow(BadRequestException);

      // With supervisor approval -> ACCEPTED
      const closed = await posService.closeSession(tenant1Id, session.id, 'usr_cashier1', {
        closing_actual_minor: '17000',
        supervisor_user_id: 'usr_mgr_1',
        supervisor_override_reason: 'Count investigated, cashier shorted change on busy hour',
      });

      expect(closed.status).toBe('CLOSED');
      expect(closed.variance_minor).toBe('-3000');
      expect(closed.variance_category).toBe('DEFICIT');
      expect(closed.supervisor_user_id).toBe('usr_mgr_1');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('strictly isolates registers, sessions, and cash operations between tenants', async () => {
      const reg1 = await posService.createRegisterConfig(tenant1Id, {
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        name: 'Tenant 1 Register',
        code: 'T1-REG',
      });

      const session1 = await posService.openSession(tenant1Id, 'usr_cashier1', {
        register_id: reg1.id,
        opening_float_minor: '10000',
      });

      // Tenant 2 cannot access Tenant 1 register
      await expect(
        posService.getRegisterConfigById(tenant2Id, reg1.id),
      ).rejects.toThrow(NotFoundException);

      // Tenant 2 cannot access Tenant 1 session
      await expect(
        posService.getSessionById(tenant2Id, session1.id),
      ).rejects.toThrow(NotFoundException);

      // Tenant 2 cannot record cash in Tenant 1 session
      await expect(
        posService.recordCashIn(tenant2Id, session1.id, 'usr_hacker', {
          amount_minor: '5000',
          reason: 'Unauthorized deposit',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
