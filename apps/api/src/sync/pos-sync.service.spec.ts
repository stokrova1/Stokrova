import { describe, it, expect, beforeEach } from 'vitest';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { BranchesService } from '../work-centers/branches.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SerialsService } from '../tracking/serials.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';
import { StockReservationsService } from '../inventory/stock-reservations.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { PosService } from '../pos/pos.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { RegistersService } from '../work-centers/registers.service.js';
import { WorkCentersService } from '../work-centers/work-centers.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PosSyncService } from './pos-sync.service.js';

describe('Offline POS Sync & Conflict Resolution Engine (Phase 3E)', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let templatesService: TemplatesService;
  let variantsService: VariantsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;
  let stockLedgerService: StockLedgerService;
  let stockReservationsService: StockReservationsService;
  let pricingService: PricingService;
  let posService: PosService;
  let ordersService: OrdersService;
  let registersService: RegistersService;
  let paymentsService: PaymentsService;
  let auditService: AuditService;
  let posSyncService: PosSyncService;

  let tenant1Id: string;
  let tenant2Id: string;
  let branch1Id: string;
  let warehouse1Id: string;
  let variant1Id: string;
  let posRegister1Id: string;
  let posSession1Id: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);

    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);

    batchesService = new BatchesService(variantsService);
    serialsService = new SerialsService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
    );

    stockLedgerService = new StockLedgerService(
      variantsService,
      warehousesService,
      locationsService,
      batchesService,
      serialsService,
    );

    stockReservationsService = new StockReservationsService(
      stockLedgerService,
      variantsService,
      warehousesService,
    );

    pricingService = new PricingService(variantsService);
    posService = new PosService(branchesService, warehousesService, pricingService);

    ordersService = new OrdersService(
      branchesService,
      warehousesService,
      variantsService,
      stockReservationsService,
      stockLedgerService,
      posService,
    );

    workCentersService = new WorkCentersService(branchesService);
    registersService = new RegistersService(branchesService, workCentersService);
    paymentsService = new PaymentsService(registersService, posService);
    auditService = new AuditService();

    posSyncService = new PosSyncService(
      posService,
      ordersService,
      paymentsService,
      stockLedgerService,
      auditService,
    );

    // 1. Provision Tenants
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Offline POS Corp 1',
        slug: 'offline-pos-1',
        owner_email: 'owner1@offlinepos.com',
        owner_full_name: 'Owner POS 1',
        default_currency: 'USD',
      },
      'usr_owner1',
    );
    tenant1Id = t1.tenant.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Offline POS Corp 2',
        slug: 'offline-pos-2',
        owner_email: 'owner2@offlinepos.com',
        owner_full_name: 'Owner POS 2',
        default_currency: 'USD',
      },
      'usr_owner2',
    );
    tenant2Id = t2.tenant.id;

    // 2. Setup Branch & Warehouse
    const branch1 = await branchesService.createBranch(tenant1Id, {
      company_id: t1.company.id,
      name: 'Terminal Central Store',
      code: 'STORE-TERM-1',
    });
    branch1Id = branch1.id;

    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branch1Id,
      code: 'WH-TERM-01',
      name: 'Terminal Warehouse',
    });
    warehouse1Id = wh1.id;

    // 3. Setup Variant
    const uomPiece = await uomService.createUom(tenant1Id, {
      name: 'Piece',
      code: 'PCS',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      name: 'Beverages',
      code: 'BEV',
    });
    const brand = await brandsService.createBrand(tenant1Id, {
      name: 'CoolDrinks',
      code: 'COOL',
    });

    const tmpl1 = await templatesService.createTemplate(tenant1Id, {
      name: 'Organic Soda',
      code: 'SODA-ORG',
      type: 'STANDARD',
      category_id: cat.id,
      brand_id: brand.id,
      base_uom_id: uomPiece.id,
    });

    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl1.id,
      sku: 'SODA-CAN-330',
      cost_price_minor: '100',
      selling_price_minor: '300',
      attributes: {},
    });
    variant1Id = v1.id;

    // 4. Initial Stock Seed: 50 cans in warehouse 1
    await stockLedgerService.postMovement(tenant1Id, 'usr_owner1', {
      movement_type: 'PURCHASE_RECEIPT',
      destination_warehouse_id: warehouse1Id,
      variant_id: variant1Id,
      quantity: 50,
      unit_cost_minor: '150',
      idempotency_key: 'seed:soda:50',
      reference_type: 'PURCHASE_ORDER',
      reference_id: 'po_soda_01',
    });

    // 5. Setup POS Register & Open Session
    const reg1 = await posService.createRegisterConfig(tenant1Id, {
      branch_id: branch1Id,
      warehouse_id: warehouse1Id,
      code: 'REG-OFFLINE-01',
      name: 'Lane 1 Mobile Register',
    });
    posRegister1Id = reg1.id;

    const sess1 = await posService.openSession(tenant1Id, 'usr_cashier_1', {
      register_id: posRegister1Id,
      opening_float_minor: '10000', // $100.00 opening float
    });
    posSession1Id = sess1.id;
  });

  describe('1. Contiguous Offline Batch Synchronization', () => {
    it('synchronizes offline sales batch, allocating orders, debiting stock, and advancing sequence', async () => {
      const batchRes = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', {
        device_id: 'device_ipad_01',
        pos_register_id: posRegister1Id,
        pos_session_id: posSession1Id,
        transactions: [
          {
            client_tx_id: 'tx_offline_001',
            device_id: 'device_ipad_01',
            pos_session_id: posSession1Id,
            client_sequence: 1,
            client_timestamp: new Date().toISOString(),
            tx_type: 'SALE',
            idempotency_key: 'idem_tx_001',
            sale_payload: {
              customer_name: 'Alice In Store',
              lines: [
                {
                  variant_id: variant1Id,
                  quantity: 4,
                  unit_price_minor: '300', // $3.00 * 4 = $12.00
                },
              ],
              payments: [
                {
                  tender_type: 'CASH',
                  amount_minor: '1200',
                  idempotency_key: 'pay_tx_001',
                },
              ],
            },
          },
          {
            client_tx_id: 'tx_offline_002',
            device_id: 'device_ipad_01',
            pos_session_id: posSession1Id,
            client_sequence: 2,
            client_timestamp: new Date().toISOString(),
            tx_type: 'SALE',
            idempotency_key: 'idem_tx_002',
            sale_payload: {
              customer_name: 'Bob In Store',
              lines: [
                {
                  variant_id: variant1Id,
                  quantity: 6,
                  unit_price_minor: '300', // $3.00 * 6 = $18.00
                },
              ],
              payments: [
                {
                  tender_type: 'CARD',
                  amount_minor: '1800',
                  card_auth_code: 'AUTH_8899',
                  idempotency_key: 'pay_tx_002',
                },
              ],
            },
          },
        ],
      });

      expect(batchRes.total_submitted).toBe(2);
      expect(batchRes.processed_count).toBe(2);
      expect(batchRes.duplicate_count).toBe(0);
      expect(batchRes.conflict_count).toBe(0);
      expect(batchRes.resolutions[0]?.status).toBe('PROCESSED');
      expect(batchRes.resolutions[0]?.server_order_id).toBeDefined();
      expect(batchRes.resolutions[1]?.status).toBe('PROCESSED');
      expect(batchRes.resolutions[1]?.server_order_id).toBeDefined();

      // Physical stock decreased: 50 - 4 - 6 = 40
      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.on_hand_quantity).toBe(40);
      expect(bal.available_to_promise).toBe(40);

      // Device sequence advanced to 2
      const status = await posSyncService.getDeviceSyncStatus(tenant1Id, 'device_ipad_01');
      expect(status.last_acknowledged_sequence).toBe(2);
    });
  });

  describe('2. Absolute Idempotency Guarantees (Rule 8 & Rule 19)', () => {
    it('returns IDEMPOTENT_DUPLICATE on retry without duplicating orders, payments, or stock debits', async () => {
      const payload = {
        device_id: 'device_ipad_01',
        pos_register_id: posRegister1Id,
        pos_session_id: posSession1Id,
        transactions: [
          {
            client_tx_id: 'tx_offline_idem_001',
            device_id: 'device_ipad_01',
            pos_session_id: posSession1Id,
            client_sequence: 1,
            client_timestamp: new Date().toISOString(),
            tx_type: 'SALE' as const,
            idempotency_key: 'idem_retry_test',
            sale_payload: {
              lines: [{ variant_id: variant1Id, quantity: 5, unit_price_minor: '300' }],
              payments: [{ tender_type: 'CASH' as const, amount_minor: '1500', idempotency_key: 'pay_idem_01' }],
            },
          },
        ],
      };

      // 1st run
      const res1 = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', payload);
      expect(res1.processed_count).toBe(1);
      expect(res1.duplicate_count).toBe(0);
      const originalOrderId = res1.resolutions[0]?.server_order_id;

      // Check stock after run 1: 50 - 5 = 45
      let bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.on_hand_quantity).toBe(45);

      // 2nd run (identical retry from mobile terminal)
      const res2 = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', payload);
      expect(res2.processed_count).toBe(0);
      expect(res2.duplicate_count).toBe(1);
      expect(res2.resolutions[0]?.status).toBe('IDEMPOTENT_DUPLICATE');
      expect(res2.resolutions[0]?.server_order_id).toBe(originalOrderId);

      // Stock is NOT debited twice: remains 45
      bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.on_hand_quantity).toBe(45);
    });
  });

  describe('3. Sequence Gap Detection', () => {
    it('rejects transactions with sequence gap until missing predecessors are flushed', async () => {
      const batchRes = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', {
        device_id: 'device_lane_02',
        pos_register_id: posRegister1Id,
        pos_session_id: posSession1Id,
        transactions: [
          {
            client_tx_id: 'tx_gap_005',
            device_id: 'device_lane_02',
            pos_session_id: posSession1Id,
            client_sequence: 5, // Gap: expected 1
            client_timestamp: new Date().toISOString(),
            tx_type: 'SALE',
            idempotency_key: 'idem_gap_05',
            sale_payload: {
              lines: [{ variant_id: variant1Id, quantity: 1, unit_price_minor: '300' }],
              payments: [{ tender_type: 'CASH', amount_minor: '300', idempotency_key: 'p_gap' }],
            },
          },
        ],
      });

      expect(batchRes.rejected_count).toBe(1);
      expect(batchRes.resolutions[0]?.status).toBe('REJECTED');
      expect(batchRes.resolutions[0]?.conflict_reason).toContain('Sequence gap detected');
    });
  });

  describe('4. Graceful Offline Stock Deficit Reconciliation (Rule 7, 10, 24)', () => {
    it('preserves financial truth of offline sale and creates discrepancy ledger entry when stock is insufficient', async () => {
      // Suppose another branch/channel sold 48 cans while Lane 1 was offline, leaving only 2 on-hand
      await stockLedgerService.postMovement(tenant1Id, 'usr_owner1', {
        movement_type: 'SALES_DISPATCH',
        source_warehouse_id: warehouse1Id,
        destination_warehouse_id: null,
        variant_id: variant1Id,
        quantity: 48,
        unit_cost_minor: '150',
        idempotency_key: 'online_deplete_48',
        reference_type: 'SALES_ORDER',
        reference_id: 'so_online_001',
      });

      // Now server only has 2 cans left
      const balBefore = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(balBefore.on_hand_quantity).toBe(2);

      // Offline cashier sold 5 cans at the register while offline
      const batchRes = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', {
        device_id: 'device_ipad_reconcile',
        pos_register_id: posRegister1Id,
        pos_session_id: posSession1Id,
        transactions: [
          {
            client_tx_id: 'tx_offline_deficit_01',
            device_id: 'device_ipad_reconcile',
            pos_session_id: posSession1Id,
            client_sequence: 1,
            client_timestamp: new Date().toISOString(),
            tx_type: 'SALE',
            idempotency_key: 'idem_deficit_01',
            sale_payload: {
              customer_name: 'Walk-in Customer Deficit',
              lines: [{ variant_id: variant1Id, quantity: 5, unit_price_minor: '300' }],
              payments: [{ tender_type: 'CASH', amount_minor: '1500', idempotency_key: 'pay_def_01' }],
            },
          },
        ],
      });

      expect(batchRes.conflict_count).toBe(1);
      expect(batchRes.resolutions[0]?.status).toBe('CONFLICT_RECONCILED');
      expect(batchRes.resolutions[0]?.conflict_reason).toBe('STOCK_DISCREPANCY_DEFICIT');
      expect(batchRes.resolutions[0]?.server_order_id).toBeDefined();

      // Verify the sales order was created as financial truth
      const order = await ordersService.getOrderById(tenant1Id, batchRes.resolutions[0]!.server_order_id!);
      expect(order.grand_total_minor).toBe('1500');
      expect(order.payment_status).toBe('PAID');

      // Verify audit event was logged
      const auditEvents = await auditService.queryAuditEvents(tenant1Id, { entity_id: order.id });
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents[0]?.action).toBe('POS_SYNC_STOCK_DISCREPANCY');
    });
  });

  describe('5. Offline Cash Movements', () => {
    it('syncs offline cash float top-up into POS session drawer', async () => {
      const batchRes = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier_1', {
        device_id: 'device_lane_cash',
        pos_register_id: posRegister1Id,
        pos_session_id: posSession1Id,
        transactions: [
          {
            client_tx_id: 'tx_float_topup_01',
            device_id: 'device_lane_cash',
            pos_session_id: posSession1Id,
            client_sequence: 1,
            client_timestamp: new Date().toISOString(),
            tx_type: 'CASH_MOVEMENT',
            idempotency_key: 'idem_cash_topup',
            cash_movement_payload: {
              movement_type: 'CASH_IN',
              amount_minor: '5000', // $50.00 cash float addition
              reason: 'Midday register cash float addition',
              idempotency_key: 'idem_cash_topup',
            },
          },
        ],
      });

      expect(batchRes.processed_count).toBe(1);
      expect(batchRes.resolutions[0]?.status).toBe('PROCESSED');

      // Session drawer balance increased: $100.00 (opening) + $50.00 (cash in) = $150.00 (15000 minor)
      const summary = await posService.getSessionSummary(tenant1Id, posSession1Id);
      expect(summary.current_drawer_balance_minor).toBe('15000');
    });
  });

  describe('6. Multi-Tenant Isolation', () => {
    it('prevents tenant 2 from syncing to tenant 1 register or session', async () => {
      await expect(
        posSyncService.processSyncBatch(tenant2Id, 'usr_owner2', {
          device_id: 'dev_t2',
          pos_register_id: posRegister1Id,
          pos_session_id: posSession1Id,
          transactions: [
            {
              client_tx_id: 'tx_t2_01',
              device_id: 'dev_t2',
              pos_session_id: posSession1Id,
              client_sequence: 1,
              client_timestamp: new Date().toISOString(),
              tx_type: 'CASH_MOVEMENT',
              idempotency_key: 'idem_t2',
              cash_movement_payload: {
                movement_type: 'CASH_IN',
                amount_minor: '100',
                reason: 'test',
                idempotency_key: 'idem_t2',
              },
            },
          ],
        }),
      ).rejects.toThrow();
    });
  });
});
