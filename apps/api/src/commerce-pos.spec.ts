import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TenancyService } from './tenancy/tenancy.service.js';
import { BranchesService } from './work-centers/branches.service.js';
import { WorkCentersService } from './work-centers/work-centers.service.js';
import { RegistersService } from './work-centers/registers.service.js';
import { WarehousesService } from './warehouse/warehouses.service.js';
import { LocationsService } from './warehouse/locations.service.js';
import { UomService } from './catalog/uom.service.js';
import { CategoriesService } from './catalog/categories.service.js';
import { BrandsService } from './catalog/brands.service.js';
import { TemplatesService } from './catalog/templates.service.js';
import { VariantsService } from './catalog/variants.service.js';
import { BatchesService } from './tracking/batches.service.js';
import { SerialsService } from './tracking/serials.service.js';
import { StockLedgerService } from './inventory/stock-ledger.service.js';
import { StockReservationsService } from './inventory/stock-reservations.service.js';
import { PricingService } from './pricing/pricing.service.js';
import { PosService } from './pos/pos.service.js';
import { OrdersService } from './orders/orders.service.js';
import { CustomersService } from './customers/customers.service.js';
import { InvoicingService } from './invoicing/invoicing.service.js';
import { QuotationsService } from './quotations/quotations.service.js';
import { PaymentsService } from './payments/payments.service.js';
import { PosCheckoutService } from './pos/pos-checkout.service.js';
import { PosSyncService } from './pos/pos-sync.service.js';
import { AuditService } from './audit/audit.service.js';
import { OutboxService } from './infrastructure/outbox/outbox.service.js';

describe('Phase 3 — Master Commerce, Sales & High-Speed POS Integration Suite', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
  let workCentersService: WorkCentersService;
  let registersService: RegistersService;
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
  let customersService: CustomersService;
  let invoicingService: InvoicingService;
  let quotationsService: QuotationsService;
  let paymentsService: PaymentsService;
  let posCheckoutService: PosCheckoutService;
  let posSyncService: PosSyncService;
  let auditService: AuditService;
  let outboxService: OutboxService;

  let tenant1Id: string;
  let tenant2Id: string;
  let branchId: string;
  let warehouseId: string;
  let registerId: string;
  let sessionId: string;
  let variantId: string;
  let variant2Id: string;
  let priceListId: string;

  beforeEach(async () => {
    auditService = new AuditService();
    outboxService = new OutboxService();

    tenancyService = new TenancyService();
    branchesService = new BranchesService(tenancyService);
    workCentersService = new WorkCentersService(branchesService);
    registersService = new RegistersService(branchesService, workCentersService);
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
      auditService,
      outboxService,
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

    customersService = new CustomersService(auditService);
    invoicingService = new InvoicingService(ordersService, customersService, auditService, outboxService);
    quotationsService = new QuotationsService(
      branchesService,
      warehousesService,
      variantsService,
      customersService,
      ordersService,
      auditService,
      outboxService,
    );

    paymentsService = new PaymentsService(registersService, posService);

    posCheckoutService = new PosCheckoutService(
      posService,
      pricingService,
      ordersService,
      stockLedgerService,
      invoicingService,
      paymentsService,
      customersService,
      auditService,
      outboxService,
    );

    posSyncService = new PosSyncService(
      posService,
      ordersService,
      stockLedgerService,
      paymentsService,
      invoicingService,
      auditService,
      outboxService,
    );

    // 1. Provision Tenant 1
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omni Retail Global',
        slug: 'omni-retail-global',
        owner_email: 'retail-owner@omni.com',
        owner_full_name: 'Retail Owner',
        default_currency: 'USD',
      },
      'usr_owner1',
    );
    tenant1Id = t1.tenant.id;

    // 2. Provision Tenant 2 for Isolation Checks
    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Competitor Corp',
        slug: 'competitor-corp',
        owner_email: 'owner@competitor.com',
        owner_full_name: 'Competitor Owner',
        default_currency: 'USD',
      },
      'usr_owner2',
    );
    tenant2Id = t2.tenant.id;

    // 3. Create Branch & Warehouse for Tenant 1
    const branch = await branchesService.createBranch(tenant1Id, {
      company_id: t1.company.id,
      code: 'MAIN-STORE',
      name: 'Main Flagship Store',
    });
    branchId = branch.id;

    const warehouse = await warehousesService.createWarehouse(tenant1Id, {
      branch_id: branchId,
      code: 'STORE-WH',
      name: 'Store Floor Warehouse',
    });
    warehouseId = warehouse.id;

    // 4. Create Catalog Items
    const uom = await uomService.createUom(tenant1Id, {
      code: 'PCS',
      name: 'Pieces',
      is_base_unit: true,
      category: 'COUNT',
    });

    const category = await categoriesService.createCategory(tenant1Id, {
      code: 'ELECTRONICS',
      name: 'Electronics',
    });

    const brand = await brandsService.createBrand(tenant1Id, {
      code: 'SONY',
      name: 'Sony',
    });

    const template = await templatesService.createTemplate(tenant1Id, {
      code: 'WH-1000XM5',
      name: 'Wireless Noise Cancelling Headphones',
      base_uom_id: uom.id,
      category_id: category.id,
      brand_id: brand.id,
      type: 'STANDARD',
    });

    const variant = await variantsService.createVariant(tenant1Id, {
      template_id: template.id,
      sku: 'SONY-WH1000XM5-BLK',
      barcode: '027242923485',
      cost_price_minor: '20000',
      selling_price_minor: '30000',
      attributes: { color: 'Black' },
    });
    variantId = variant.id;

    const variant2 = await variantsService.createVariant(tenant1Id, {
      template_id: template.id,
      sku: 'SONY-WH1000XM5-SLV',
      barcode: '027242923492',
      cost_price_minor: '20000',
      selling_price_minor: '35000',
      attributes: { color: 'Silver' },
    });
    variant2Id = variant2.id;

    // 5. Seed Initial Stock Movements (Current Stock = Sum of Posted Movements)
    await stockLedgerService.postMovement(tenant1Id, 'usr_wh_mgr', {
      movement_type: 'OPENING_BALANCE',
      source_warehouse_id: null,
      destination_warehouse_id: warehouseId,
      variant_id: variantId,
      quantity: 50,
      unit_cost_minor: '20000',
      idempotency_key: 'seed_stock_blk_50',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_seed_blk',
    });

    await stockLedgerService.postMovement(tenant1Id, 'usr_wh_mgr', {
      movement_type: 'OPENING_BALANCE',
      source_warehouse_id: null,
      destination_warehouse_id: warehouseId,
      variant_id: variant2Id,
      quantity: 1, // Exactly 1 unit for concurrency test
      unit_cost_minor: '20000',
      idempotency_key: 'seed_stock_slv_1',
      reference_type: 'SYSTEM_INITIALIZATION',
      reference_id: 'init_seed_slv',
    });

    // 6. Setup Price List
    const pl = await pricingService.createPriceList(tenant1Id, {
      code: 'RETAIL-STD',
      name: 'Standard Retail Price List',
      currency_code: 'USD',
      is_default: true,
    });
    priceListId = pl.id;

    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: priceListId,
      variant_id: variantId,
      min_quantity: 1,
      fixed_price_minor: '30000', // $300.00
    });

    await pricingService.createPriceListRule(tenant1Id, {
      pricelist_id: priceListId,
      variant_id: variant2Id,
      min_quantity: 1,
      fixed_price_minor: '35000', // $350.00
    });

    // 7. Setup POS Register & Open Session
    const register = await posService.createRegisterConfig(tenant1Id, {
      branch_id: branchId,
      warehouse_id: warehouseId,
      code: 'REG-01',
      name: 'Front Till 1',
      default_price_list_id: priceListId,
      max_cash_limit_minor: '500000',
    });
    registerId = register.id;

    const session = await posService.openSession(tenant1Id, 'usr_cashier1', {
      register_id: registerId,
      opening_float_minor: '10000', // $100.00 Float
      currency_code: 'USD',
      notes: 'Morning shift opening float',
    });
    sessionId = session.id;
  });

  // ==========================================================================
  // SCENARIO 1: Normal POS Fast-Path Sale
  // Cart -> Pricing -> Order -> Reserve -> Dispatch -> Invoice -> Payment -> Receipt
  // ==========================================================================
  it('Scenario 1: executes atomic POS checkout with decoupled ledger dispatch, invoice, payment, and receipt', async () => {
    const initialBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);
    expect(initialBalance.on_hand_quantity).toBe(50);
    expect(initialBalance.available_to_promise).toBe(50);

    const initialSummary = await posService.getSessionSummary(tenant1Id, sessionId);
    expect(initialSummary.current_drawer_balance_minor).toBe('10000'); // Float $100.00

    // Checkout: 2 units of Black Headphones ($300.00 each = $600.00 / 60000 minor) paid with CASH $600.00
    const checkoutRes = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'chk_sale_scen_1',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [
        {
          variant_id: variantId,
          quantity: 2,
        },
      ],
      tenders: [
        {
          tender_type: 'CASH',
          tendered_minor: '60000',
          idempotency_key: 'tnd_cash_scen_1',
        },
      ],
    });

    expect(checkoutRes.status).toBe('COMPLETED');
    expect(checkoutRes.total_payable_minor).toBe('60000');
    expect(checkoutRes.total_tendered_minor).toBe('60000');
    expect(checkoutRes.change_due_minor).toBe('0');
    expect(checkoutRes.is_fully_paid).toBe(true);

    // 1. Invariant: Payment != Invoice != Receipt != Order
    expect(checkoutRes.order_id).toBeDefined();
    expect(checkoutRes.invoice_id).toBeDefined();
    expect(checkoutRes.receipt_id).toBeDefined();
    expect(checkoutRes.checkout_id).toBeDefined();
    expect(checkoutRes.order_id).not.toBe(checkoutRes.invoice_id);
    expect(checkoutRes.invoice_id).not.toBe(checkoutRes.receipt_id);

    // 2. Sales Order Invariant: Dispatched
    const order = await ordersService.getOrderById(tenant1Id, checkoutRes.order_id);
    expect(order.status).toBe('DISPATCHED');
    expect(order.fulfillment_status).toBe('FULFILLED');
    expect(order.payment_status).toBe('PAID');

    // 3. Stock Ledger Invariant: Current Stock = Sum of Posted Movements
    const finalBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);
    expect(finalBalance.on_hand_quantity).toBe(48); // 50 - 2 = 48
    expect(finalBalance.available_to_promise).toBe(48);

    // 4. Sales Invoice Invariant: Persistent & Paid
    const invoice = await invoicingService.getInvoiceById(tenant1Id, checkoutRes.invoice_id);
    expect(invoice.status).toBe('PAID');
    expect(invoice.balance_due_minor).toBe('0');
    expect(invoice.amount_paid_minor).toBe('60000');

    // 5. Till Cash Invariant: Drawer cash balance increased by sale
    const updatedSummary = await posService.getSessionSummary(tenant1Id, sessionId);
    expect(updatedSummary.current_drawer_balance_minor).toBe('70000'); // 10000 + 60000 = 70000
    expect(updatedSummary.total_cash_sales_minor).toBe('60000');
  });

  // ==========================================================================
  // SCENARIO 2: Split Multi-Tender Payment
  // Split between Card and Cash; drawer balance increases only by Cash portion
  // ==========================================================================
  it('Scenario 2: processes multi-tender checkout and updates till drawer balance strictly by cash tender', async () => {
    // Buy 2 units = 60000 minor ($600.00)
    // Tender 1: CARD $400.00 (40000 minor)
    // Tender 2: CASH $200.00 (20000 minor)
    const checkoutRes = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'chk_split_tender_1',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [
        {
          variant_id: variantId,
          quantity: 2,
        },
      ],
      tenders: [
        {
          tender_type: 'CARD',
          tendered_minor: '40000',
          idempotency_key: 'tnd_card_split_1',
          provider_reference: 'AUTH_CHASE_8912',
        },
        {
          tender_type: 'CASH',
          tendered_minor: '20000',
          idempotency_key: 'tnd_cash_split_1',
        },
      ],
    });

    expect(checkoutRes.total_payable_minor).toBe('60000');
    expect(checkoutRes.total_tendered_minor).toBe('60000');
    expect(checkoutRes.change_due_minor).toBe('0');
    expect(checkoutRes.is_fully_paid).toBe(true);

    // Drawer float was 10000; should now be 10000 + 20000 cash = 30000 minor
    const summary = await posService.getSessionSummary(tenant1Id, sessionId);
    expect(summary.current_drawer_balance_minor).toBe('30000');
    expect(summary.total_cash_sales_minor).toBe('20000');
  });

  // ==========================================================================
  // SCENARIO 3: Cash Over-Tender, Change Calculation & Non-Cash Over-Tender Prohibition
  // ==========================================================================
  it('Scenario 3: handles cash over-tender with change returned and rejects non-cash over-tender', async () => {
    // 1. Valid Cash Over-tender: Total $300.00 (30000 minor), Cash Tender $400.00 (40000 minor)
    const checkoutRes = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'chk_overtender_cash',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [{ variant_id: variantId, quantity: 1 }],
      tenders: [
        {
          tender_type: 'CASH',
          tendered_minor: '40000',
          idempotency_key: 'tnd_overtender_cash',
        },
      ],
    });

    expect(checkoutRes.total_payable_minor).toBe('30000');
    expect(checkoutRes.total_tendered_minor).toBe('40000');
    expect(checkoutRes.change_due_minor).toBe('10000'); // $100.00 change due

    // Net till drawer increase = +$300.00 (+400.00 cash in, -100.00 change out)
    const summary = await posService.getSessionSummary(tenant1Id, sessionId);
    expect(summary.current_drawer_balance_minor).toBe('40000'); // 10000 float + 30000 net = 40000

    // 2. Invalid Non-Cash Over-tender: Card over-tender must be rejected
    await expect(
      posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
        idempotency_key: 'chk_overtender_card_bad',
        pos_session_id: sessionId,
        pos_register_id: registerId,
        items: [{ variant_id: variantId, quantity: 1 }],
        tenders: [
          {
            tender_type: 'CARD',
            tendered_minor: '40000',
            idempotency_key: 'tnd_overtender_card_bad',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ==========================================================================
  // SCENARIO 4: Failed Payment Safety & No Leaked Stock Depletion
  // ==========================================================================
  it('Scenario 4: preserves inventory integrity when checkout fails on insufficient payment tender', async () => {
    const initialBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);

    // Attempt checkout with insufficient payment ($200 tendered for $300 sale)
    await expect(
      posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
        idempotency_key: 'chk_underpaid_fail',
        pos_session_id: sessionId,
        pos_register_id: registerId,
        items: [{ variant_id: variantId, quantity: 1 }],
        tenders: [
          {
            tender_type: 'CASH',
            tendered_minor: '20000',
            idempotency_key: 'tnd_underpaid_1',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // Invariant: Stock must remain completely unchanged
    const afterBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);
    expect(afterBalance.on_hand_quantity).toBe(initialBalance.on_hand_quantity);
    expect(afterBalance.available_to_promise).toBe(initialBalance.available_to_promise);
  });

  // ==========================================================================
  // SCENARIO 5: Duplicate Checkout Submission Idempotency (Rule 19)
  // ==========================================================================
  it('Scenario 5: returns identical cached response on duplicate checkout submission without double stock depletion', async () => {
    const initialBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);

    const firstRun = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'idemp_chk_strict_duplicate',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [{ variant_id: variantId, quantity: 1 }],
      tenders: [
        {
          tender_type: 'CASH',
          tendered_minor: '30000',
          idempotency_key: 'tnd_idemp_strict',
        },
      ],
    });

    const secondRun = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'idemp_chk_strict_duplicate',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [{ variant_id: variantId, quantity: 1 }],
      tenders: [
        {
          tender_type: 'CASH',
          tendered_minor: '30000',
          idempotency_key: 'tnd_idemp_strict',
        },
      ],
    });

    expect(secondRun.checkout_id).toBe(firstRun.checkout_id);
    expect(secondRun.order_id).toBe(firstRun.order_id);
    expect(secondRun.invoice_id).toBe(firstRun.invoice_id);
    expect(secondRun.receipt_id).toBe(firstRun.receipt_id);

    // Invariant: Only 1 unit consumed, not 2
    const finalBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variantId);
    expect(finalBalance.on_hand_quantity).toBe(initialBalance.on_hand_quantity - 1);
  });

  // ==========================================================================
  // SCENARIO 6: Last-Unit Concurrency Race
  // ==========================================================================
  it('Scenario 6: deterministically awards last available unit and rejects subsequent cashier with insufficient stock error', async () => {
    // Silver variant has exactly 1 unit seeded
    const initialBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variant2Id);
    expect(initialBalance.available_to_promise).toBe(1);

    // Cashier A checks out the unit
    const cashierARes = await posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
      idempotency_key: 'chk_race_cashier_a',
      pos_session_id: sessionId,
      pos_register_id: registerId,
      items: [{ variant_id: variant2Id, quantity: 1 }],
      tenders: [
        {
          tender_type: 'CASH',
          tendered_minor: '35000',
          idempotency_key: 'tnd_race_a',
        },
      ],
    });
    expect(cashierARes.status).toBe('COMPLETED');

    // Cashier B attempts to check out the same unit
    await expect(
      posCheckoutService.processCheckout(tenant1Id, 'usr_cashier2', {
        idempotency_key: 'chk_race_cashier_b',
        pos_session_id: sessionId,
        pos_register_id: registerId,
        items: [{ variant_id: variant2Id, quantity: 1 }],
        tenders: [
          {
            tender_type: 'CASH',
            tendered_minor: '35000',
            idempotency_key: 'tnd_race_b',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    const finalBalance = await stockLedgerService.getBalance(tenant1Id, warehouseId, variant2Id);
    expect(finalBalance.on_hand_quantity).toBe(0);
    expect(finalBalance.available_to_promise).toBe(0);
  });

  // ==========================================================================
  // SCENARIO 7: Offline POS Sync & Stock Discrepancy Reconciliation (Rule 24 & 10)
  // ==========================================================================
  it('Scenario 7: syncs offline batch preserving commercial truth and creates compensating inventory movements on stock drift', async () => {
    const deviceId = 'pos_pad_lane_04';

    // Offline batch with 3 transactions:
    // Tx 1: Sequence 1 -> Sale of 1 unit
    // Ensure variant2Id stock on server is 0 to simulate offline drift
    await stockLedgerService.postMovement(tenant1Id, 'usr_wh_mgr', {
      movement_type: 'STOCK_ADJUSTMENT',
      source_warehouse_id: warehouseId,
      destination_warehouse_id: null,
      variant_id: variant2Id,
      quantity: 1,
      unit_cost_minor: '20000',
      idempotency_key: 'deplete_variant2_for_drift_test',
      reference_type: 'CYCLE_COUNT',
      reference_id: 'deplete_slv',
    });

    const syncRes = await posSyncService.processSyncBatch(tenant1Id, 'usr_cashier1', {
      device_id: deviceId,
      pos_register_id: registerId,
      pos_session_id: sessionId,
      transactions: [
        {
          client_tx_id: 'tx_off_001',
          device_id: deviceId,
          pos_session_id: sessionId,
          client_sequence: 1,
          client_timestamp: new Date().toISOString(),
          tx_type: 'SALE',
          idempotency_key: 'idemp_off_tx_001',
          sale_payload: {
            lines: [
              {
                variant_id: variantId,
                quantity: 1,
                unit_price_minor: '30000',
              },
            ],
            payments: [
              {
                tender_type: 'CASH',
                amount_minor: '30000',
                idempotency_key: 'pmt_off_tx_001',
              },
            ],
          },
        },
        {
          client_tx_id: 'tx_off_001_dup',
          device_id: deviceId,
          pos_session_id: sessionId,
          client_sequence: 1,
          client_timestamp: new Date().toISOString(),
          tx_type: 'SALE',
          idempotency_key: 'idemp_off_tx_001', // Identical idempotency key
          sale_payload: {
            lines: [
              {
                variant_id: variantId,
                quantity: 1,
                unit_price_minor: '30000',
              },
            ],
            payments: [
              {
                tender_type: 'CASH',
                amount_minor: '30000',
                idempotency_key: 'pmt_off_tx_001',
              },
            ],
          },
        },
        {
          client_tx_id: 'tx_off_002_drift',
          device_id: deviceId,
          pos_session_id: sessionId,
          client_sequence: 2,
          client_timestamp: new Date().toISOString(),
          tx_type: 'SALE',
          idempotency_key: 'idemp_off_tx_002',
          sale_payload: {
            lines: [
              {
                variant_id: variant2Id, // Stock is 0 on server!
                quantity: 1,
                unit_price_minor: '35000',
              },
            ],
            payments: [
              {
                tender_type: 'CASH',
                amount_minor: '35000',
                idempotency_key: 'pmt_off_tx_002',
              },
            ],
          },
        },
      ],
    });

    expect(syncRes.total_submitted).toBe(3);
    expect(syncRes.processed_count).toBe(1);
    expect(syncRes.duplicate_count).toBe(1);
    expect(syncRes.conflict_count).toBe(1);

    // Verify resolutions
    const res1 = syncRes.resolutions.find((r) => r.client_tx_id === 'tx_off_001');
    expect(res1?.status).toBe('PROCESSED');
    expect(res1?.server_order_id).toBeDefined();

    const res2 = syncRes.resolutions.find((r) => r.client_tx_id === 'tx_off_001_dup');
    expect(res2?.status).toBe('IDEMPOTENT_DUPLICATE');

    const res3 = syncRes.resolutions.find((r) => r.client_tx_id === 'tx_off_002_drift');
    expect(res3?.status).toBe('CONFLICT_RECONCILED');
    expect(res3?.server_order_id).toBeDefined(); // Commercial sale preserved!
  });

  // ==========================================================================
  // SCENARIO 8: Customer Returns & Cash Till Refunds
  // ==========================================================================
  it('Scenario 8: processes cash returns reducing drawer cash and re-stocking returned inventory', async () => {
    // Record cash-out return movement on till drawer ($50.00 cash refunded out of $100.00 float)
    const cashOut = await posService.recordCashOut(tenant1Id, sessionId, 'usr_cashier1', {
      amount_minor: '5000', // $50.00 cash refunded to customer
      reason: 'Customer return receipt #RCP-1001',
    });
    expect(cashOut.amount_minor).toBe('5000');

    // Drawer cash is decremented
    const summary = await posService.getSessionSummary(tenant1Id, sessionId);
    expect(summary.total_cash_out_minor).toBe('5000');

    // Restock the returned item via Inventory Core
    const returnMovement = await stockLedgerService.postMovement(tenant1Id, 'usr_cashier1', {
      movement_type: 'CUSTOMER_RETURN',
      source_warehouse_id: null,
      destination_warehouse_id: warehouseId,
      variant_id: variantId,
      quantity: 1,
      unit_cost_minor: '20000',
      idempotency_key: 'ret_rcp_1001_item_1',
      reference_type: 'CYCLE_COUNT',
      reference_id: 'ret_case_001',
      notes: 'Customer returned sealed product',
    });
    expect(returnMovement.entry.quantity).toBe(1);
    expect(returnMovement.entry.movement_type).toBe('CUSTOMER_RETURN');
  });

  // ==========================================================================
  // SCENARIO 9: Customer Credit Limits & Balance Tracking
  // ==========================================================================
  it('Scenario 9: enforces customer credit limits and manages outstanding receivables', async () => {
    // Create VIP Customer with $500.00 (50000 minor) credit limit
    const customer = await customersService.createCustomer(tenant1Id, 'usr_sales_rep', {
      customer_code: 'CUST-VIP-01',
      display_name: 'Apex Design Studios',
      credit_limit_minor: '50000',
      payment_terms: 'NET_30',
    });
    expect(customer.credit_limit_minor).toBe('50000');
    expect(customer.outstanding_balance_minor).toBe('0');

    // Check credit permit for $300.00 order -> Allowed
    await expect(
      customersService.assertCreditOrderPermitted(tenant1Id, customer.id, 30000n),
    ).resolves.toBeUndefined();

    // Adjust balance after credit order creation
    await customersService.adjustOutstandingBalance(tenant1Id, customer.id, 30000n);
    const updatedCustomer = await customersService.getCustomerById(tenant1Id, customer.id);
    expect(updatedCustomer.outstanding_balance_minor).toBe('30000');

    // Attempt another order of $250.00 -> 300 + 250 = 550 > 500 limit -> Rejected
    await expect(
      customersService.assertCreditOrderPermitted(tenant1Id, customer.id, 25000n),
    ).rejects.toThrow(BadRequestException);

    // Customer makes payment of $200.00
    await customersService.adjustOutstandingBalance(tenant1Id, customer.id, -20000n);
    const afterPaymentCustomer = await customersService.getCustomerById(tenant1Id, customer.id);
    expect(afterPaymentCustomer.outstanding_balance_minor).toBe('10000');

    // Now $250.00 order -> 100 + 250 = 350 <= 500 limit -> Allowed!
    await expect(
      customersService.assertCreditOrderPermitted(tenant1Id, customer.id, 25000n),
    ).resolves.toBeUndefined();
  });

  // ==========================================================================
  // SCENARIO 10: Quotation Lifecycle and 1-Click Conversion to Sales Order
  // ==========================================================================
  it('Scenario 10: advances quotation through lifecycle and converts directly into sales order', async () => {
    const customer = await customersService.createCustomer(tenant1Id, 'usr_sales_rep', {
      customer_code: 'CUST-CORP-99',
      display_name: 'Global Enterprises Inc',
    });

    // 1. Create Quotation in DRAFT with unit_price_minor specified (5 * $300.00 = $1500.00 / 150000 minor)
    const quotation = await quotationsService.createQuotation(tenant1Id, 'usr_sales_rep', {
      customer_id: customer.id,
      branch_id: branchId,
      warehouse_id: warehouseId,
      valid_until: '2026-12-31T23:59:59Z',
      lines: [
        {
          variant_id: variantId,
          quantity: 5,
          unit_price_minor: '30000',
        },
      ],
    });
    expect(quotation.status).toBe('DRAFT');
    expect(quotation.grand_total_minor).toBe('150000'); // 5 * $300 = $1500.00

    // 2. Accept Quotation
    const acceptedQuotation = await quotationsService.acceptQuotation(
      tenant1Id,
      quotation.id,
      'usr_sales_rep',
    );
    expect(acceptedQuotation.status).toBe('ACCEPTED');

    // 3. 1-Click Conversion to Sales Order
    const convertedOrder = await quotationsService.convertQuotation(
      tenant1Id,
      quotation.id,
      'usr_sales_rep',
      {
        idempotency_key: 'conv_q_order_001',
      },
    );
    expect(convertedOrder.id).toBeDefined();
    expect(convertedOrder.channel_type).toBe('DIRECT');
    expect(convertedOrder.status).toBe('DRAFT');
    expect(convertedOrder.lines.length).toBe(1);
    expect(convertedOrder.lines[0]?.quantity).toBe(5);

    // 4. Verify Quotation Status Transition to CONVERTED
    const finalQuotation = await quotationsService.getQuotationById(tenant1Id, quotation.id);
    expect(finalQuotation.status).toBe('CONVERTED');
    expect(finalQuotation.converted_sales_order_id).toBe(convertedOrder.id);

    // 5. Converting again must be rejected (immutable conversion)
    await expect(
      quotationsService.convertQuotation(tenant1Id, quotation.id, 'usr_sales_rep'),
    ).rejects.toThrow(ConflictException);
  });

  // ==========================================================================
  // SCENARIO 11: Multi-Tenant & Register Scope Isolation (Rule 21)
  // ==========================================================================
  it('Scenario 11: guarantees strict tenant and register session isolation', async () => {
    // Attempt to access Tenant 1 register configs using Tenant 2 ID -> empty or not found
    const t2Registers = await posService.getRegisterConfigs(tenant2Id);
    expect(t2Registers.length).toBe(0);

    await expect(
      posService.getRegisterConfigById(tenant2Id, registerId),
    ).rejects.toThrow(NotFoundException);

    // Attempt checkout by Tenant 2 against Tenant 1 session -> Rejected
    await expect(
      posCheckoutService.processCheckout(tenant2Id, 'usr_hacker', {
        idempotency_key: 'hack_cross_tenant_chk',
        pos_session_id: sessionId,
        pos_register_id: registerId,
        items: [{ variant_id: variantId, quantity: 1 }],
        tenders: [
          {
            tender_type: 'CASH',
            tendered_minor: '30000',
            idempotency_key: 'hack_tnd',
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);

    // Close Tenant 1 session with exact float count (10000 minor)
    await posService.closeSession(tenant1Id, sessionId, 'usr_cashier1', {
      closing_actual_minor: '10000',
    });

    // Attempting checkout against closed session must fail
    await expect(
      posCheckoutService.processCheckout(tenant1Id, 'usr_cashier1', {
        idempotency_key: 'chk_closed_session_attempt',
        pos_session_id: sessionId,
        pos_register_id: registerId,
        items: [{ variant_id: variantId, quantity: 1 }],
        tenders: [
          {
            tender_type: 'CASH',
            tendered_minor: '30000',
            idempotency_key: 'tnd_closed_attempt',
          },
        ],
      }),
    ).rejects.toThrow(ConflictException);
  });
});
