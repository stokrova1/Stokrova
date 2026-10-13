import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { OrdersService } from './orders.service.js';

describe('Multi-Channel Sales Orders & Fulfillment Engine (Phase 3D)', () => {
  let tenancyService: TenancyService;
  let branchesService: BranchesService;
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
  let ordersService: OrdersService;

  let tenant1Id: string;
  let tenant2Id: string;
  let branch1Id: string;
  let warehouse1Id: string;
  let variant1Id: string;
  let variant2Id: string;

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

    ordersService = new OrdersService(
      branchesService,
      warehousesService,
      variantsService,
      stockReservationsService,
      stockLedgerService,
    );

    // 1. Provision Tenant 1 & Tenant 2
    const t1 = await tenancyService.provisionTenant(
      {
        name: 'Omni Retail 1',
        slug: 'omni-1',
        owner_email: 'owner@omni1.com',
        owner_full_name: 'Owner Omni',
        default_currency: 'USD',
      },
      'usr_owner1',
    );
    tenant1Id = t1.tenant.id;

    const t2 = await tenancyService.provisionTenant(
      {
        name: 'Omni Retail 2',
        slug: 'omni-2',
        owner_email: 'owner@omni2.com',
        owner_full_name: 'Owner Two',
        default_currency: 'USD',
      },
      'usr_owner2',
    );
    tenant2Id = t2.tenant.id;

    // 2. Setup Branch for Tenant 1
    const branch1 = await branchesService.createBranch(tenant1Id, {
      company_id: t1.company.id,
      name: 'Downtown Flagship',
      code: 'FLAGSHIP-1',
    });
    branch1Id = branch1.id;

    // 3. Setup Warehouse for Tenant 1
    const wh1 = await warehousesService.createWarehouse(tenant1Id, {
      name: 'Central Warehouse',
      code: 'WH-CENTRAL',
      branch_id: branch1Id,
    });
    warehouse1Id = wh1.id;

    // 4. Setup Products & Variants
    const uomPiece = await uomService.createUom(tenant1Id, {
      name: 'Piece',
      code: 'PCS',
      category: 'COUNT',
      is_base_unit: true,
    });
    const cat = await categoriesService.createCategory(tenant1Id, {
      name: 'Electronics',
      code: 'ELEC',
    });
    const brand = await brandsService.createBrand(tenant1Id, {
      name: 'StokTech',
      code: 'STK',
    });

    const tmpl1 = await templatesService.createTemplate(tenant1Id, {
      name: 'Wireless Headphones',
      code: 'WH-1000',
      type: 'STANDARD',
      category_id: cat.id,
      brand_id: brand.id,
      base_uom_id: uomPiece.id,
    });

    const v1 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl1.id,
      sku: 'WH-1000-BLK',
      cost_price_minor: '5000',
      selling_price_minor: '10000',
      attributes: { color: 'Black' },
    });
    variant1Id = v1.id;

    const v2 = await variantsService.createVariant(tenant1Id, {
      template_id: tmpl1.id,
      sku: 'WH-1000-SLV',
      cost_price_minor: '5000',
      selling_price_minor: '15000',
      attributes: { color: 'Silver' },
    });
    variant2Id = v2.id;

    // 5. Seed Initial Stock in Warehouse 1 (50 units each)
    await stockLedgerService.postMovement(tenant1Id, 'usr_owner1', {
      movement_type: 'PURCHASE_RECEIPT',
      destination_warehouse_id: warehouse1Id,
      variant_id: variant1Id,
      quantity: 50,
      unit_cost_minor: '5000',
      idempotency_key: 'seed:v1',
      reference_type: 'PURCHASE_ORDER',
      reference_id: 'po_init_1',
    });

    await stockLedgerService.postMovement(tenant1Id, 'usr_owner1', {
      movement_type: 'PURCHASE_RECEIPT',
      destination_warehouse_id: warehouse1Id,
      variant_id: variant2Id,
      quantity: 50,
      unit_cost_minor: '5000',
      idempotency_key: 'seed:v2',
      reference_type: 'PURCHASE_ORDER',
      reference_id: 'po_init_2',
    });
  });

  describe('1. Sales Order Creation & Pure Integer Math', () => {
    it('creates a draft sales order with accurate line calculations and grand totals', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        lines: [
          {
            variant_id: variant1Id,
            quantity: 2,
            unit_price_minor: '10000', // $100.00
            discount_minor: '1000',   // $10.00 discount
            tax_minor: '1500',        // $15.00 tax
          },
          {
            variant_id: variant2Id,
            quantity: 1,
            unit_price_minor: '15000', // $150.00
            discount_minor: '0',
            tax_minor: '1200',        // $12.00 tax
          },
        ],
      });

      expect(order.id).toBeDefined();
      expect(order.order_number).toMatch(/^SO-\d+-\d+$/);
      expect(order.status).toBe('DRAFT');
      expect(order.payment_status).toBe('UNPAID');
      expect(order.fulfillment_status).toBe('UNFULFILLED');
      expect(order.lines).toHaveLength(2);

      // Line 1: (2 * 10000) - 1000 + 1500 = 20000 - 1000 + 1500 = 20500
      expect(order.lines[0]?.line_total_minor).toBe('20500');
      // Line 2: (1 * 15000) - 0 + 1200 = 16200
      expect(order.lines[1]?.line_total_minor).toBe('16200');

      // Order Summary:
      // Subtotal: 20000 + 15000 = 35000
      // Discount: 1000 + 0 = 1000
      // Tax: 1500 + 1200 = 2700
      // Grand Total: 20500 + 16200 = 36700
      expect(order.subtotal_minor).toBe('35000');
      expect(order.total_discount_minor).toBe('1000');
      expect(order.total_tax_minor).toBe('2700');
      expect(order.grand_total_minor).toBe('36700');
      expect(order.amount_paid_minor).toBe('0');
    });

    it('throws NotFoundException when referencing invalid branch or warehouse', async () => {
      await expect(
        ordersService.createSalesOrder(tenant1Id, {
          channel_type: 'POS',
          branch_id: 'non_existent_branch',
          warehouse_id: warehouse1Id,
          lines: [{ variant_id: variant1Id, quantity: 1, unit_price_minor: '1000' }],
        }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        ordersService.createSalesOrder(tenant1Id, {
          channel_type: 'POS',
          branch_id: branch1Id,
          warehouse_id: 'non_existent_wh',
          lines: [{ variant_id: variant1Id, quantity: 1, unit_price_minor: '1000' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects order creation with zero lines or negative values', async () => {
      await expect(
        ordersService.createSalesOrder(tenant1Id, {
          channel_type: 'B2B_WHOLESALE',
          branch_id: branch1Id,
          warehouse_id: warehouse1Id,
          lines: [],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.createSalesOrder(tenant1Id, {
          channel_type: 'B2B_WHOLESALE',
          branch_id: branch1Id,
          warehouse_id: warehouse1Id,
          lines: [{ variant_id: variant1Id, quantity: 0, unit_price_minor: '1000' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Confirmation & Stock Reservation Integration', () => {
    it('confirms draft sales order and reserves stock against ATP', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [
          { variant_id: variant1Id, quantity: 10, unit_price_minor: '10000' },
          { variant_id: variant2Id, quantity: 5, unit_price_minor: '12000' },
        ],
      });

      const confirmed = await ordersService.confirmSalesOrder(tenant1Id, order.id);
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmed_at).toBeDefined();

      // Check that ATP decreased for variant 1: 50 on-hand - 10 reserved = 40 ATP
      const bal1 = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal1.on_hand_quantity).toBe(50);
      expect(bal1.reserved_quantity).toBe(10);
      expect(bal1.available_to_promise).toBe(40);
    });

    it('fails to confirm order if requested quantity exceeds ATP', async () => {
      const hugeOrder = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'B2B_WHOLESALE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 100, unit_price_minor: '10000' }], // Only 50 in stock
      });

      await expect(ordersService.confirmSalesOrder(tenant1Id, hugeOrder.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('3. Line Item Fulfillment & Over-Fulfillment Protection', () => {
    it('tracks partial fulfillment and advances to PICKING / PARTIALLY_FULFILLED', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [
          { variant_id: variant1Id, quantity: 10, unit_price_minor: '10000' },
          { variant_id: variant2Id, quantity: 10, unit_price_minor: '12000' },
        ],
      });

      await ordersService.confirmSalesOrder(tenant1Id, order.id);

      const line1Id = order.lines[0]?.id!;
      const line2Id = order.lines[1]?.id!;

      // Partial fulfillment of Line 1
      const step1 = await ordersService.fulfillOrderLines(tenant1Id, order.id, {
        fulfillment_items: [{ line_id: line1Id, quantity_to_fulfill: 4 }],
      });

      expect(step1.status).toBe('PICKING');
      expect(step1.fulfillment_status).toBe('PARTIALLY_FULFILLED');
      expect(step1.lines[0]?.fulfilled_quantity).toBe(4);
      expect(step1.lines[1]?.fulfilled_quantity).toBe(0);

      // Fulfill remainder of Line 1 and all of Line 2
      const step2 = await ordersService.fulfillOrderLines(tenant1Id, order.id, {
        fulfillment_items: [
          { line_id: line1Id, quantity_to_fulfill: 6 },
          { line_id: line2Id, quantity_to_fulfill: 10 },
        ],
      });

      expect(step2.status).toBe('PACKING');
      expect(step2.fulfillment_status).toBe('FULFILLED');
      expect(step2.lines[0]?.fulfilled_quantity).toBe(10);
      expect(step2.lines[1]?.fulfilled_quantity).toBe(10);
    });

    it('rejects over-fulfillment exceeding line quantity (Domain Invariant)', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 5, unit_price_minor: '10000' }],
      });
      await ordersService.confirmSalesOrder(tenant1Id, order.id);

      const lineId = order.lines[0]?.id!;

      await expect(
        ordersService.fulfillOrderLines(tenant1Id, order.id, {
          fulfillment_items: [{ line_id: lineId, quantity_to_fulfill: 6 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Dispatch, Ledger Movements & Delivery', () => {
    it('dispatches fulfilled order, posting immutable stock movements and fulfilling reservations', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'B2B_WHOLESALE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 8, unit_price_minor: '10000' }],
      });

      await ordersService.confirmSalesOrder(tenant1Id, order.id);

      const lineId = order.lines[0]?.id!;
      await ordersService.fulfillOrderLines(tenant1Id, order.id, {
        fulfillment_items: [{ line_id: lineId, quantity_to_fulfill: 8 }],
      });

      const dispatched = await ordersService.dispatchSalesOrder(
        tenant1Id,
        'usr_picker1',
        order.id,
        { carrier: 'FedEx', tracking_number: 'FX-987654321' },
      );

      expect(dispatched.status).toBe('DISPATCHED');
      expect(dispatched.dispatched_at).toBeDefined();

      // Physical stock on-hand reduced: 50 - 8 = 42
      const bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.on_hand_quantity).toBe(42);
      expect(bal.reserved_quantity).toBe(0);
      expect(bal.available_to_promise).toBe(42);

      // Deliver the order
      const delivered = await ordersService.deliverSalesOrder(tenant1Id, order.id);
      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.delivered_at).toBeDefined();
      expect(delivered.fulfillment_status).toBe('FULFILLED');
    });
  });

  describe('5. Order Cancellation & Reservation Release', () => {
    it('releases reserved stock when cancelling a confirmed order', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 15, unit_price_minor: '10000' }],
      });

      await ordersService.confirmSalesOrder(tenant1Id, order.id);

      // Stock was reserved: ATP 35
      let bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.available_to_promise).toBe(35);

      // Cancel order
      const cancelled = await ordersService.cancelSalesOrder(tenant1Id, order.id);
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelled_at).toBeDefined();

      // Reservation released: ATP recovered to 50
      bal = await stockLedgerService.getBalance(tenant1Id, warehouse1Id, variant1Id, null, null);
      expect(bal.available_to_promise).toBe(50);
      expect(bal.reserved_quantity).toBe(0);
    });

    it('prevents cancelling an already delivered order', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'MANUAL',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 2, unit_price_minor: '10000' }],
      });
      await ordersService.confirmSalesOrder(tenant1Id, order.id);
      await ordersService.fulfillOrderLines(tenant1Id, order.id, {
        fulfillment_items: [{ line_id: order.lines[0]?.id!, quantity_to_fulfill: 2 }],
      });
      await ordersService.dispatchSalesOrder(tenant1Id, 'usr_picker1', order.id);
      await ordersService.deliverSalesOrder(tenant1Id, order.id);

      await expect(ordersService.cancelSalesOrder(tenant1Id, order.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('6. Multi-Tenant Isolation & Querying', () => {
    it('prevents tenant cross-talk across orders and operations', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 1, unit_price_minor: '5000' }],
      });

      // Tenant 2 cannot view Tenant 1's order
      await expect(ordersService.getOrderById(tenant2Id, order.id)).rejects.toThrow(
        NotFoundException,
      );

      // Tenant 2 cannot confirm Tenant 1's order
      await expect(ordersService.confirmSalesOrder(tenant2Id, order.id)).rejects.toThrow(
        NotFoundException,
      );

      // Tenant 2 listing returns empty list
      const t2Orders = await ordersService.listSalesOrders(tenant2Id);
      expect(t2Orders).toHaveLength(0);

      const t1Orders = await ordersService.listSalesOrders(tenant1Id);
      expect(t1Orders).toHaveLength(1);
    });
  });

  describe('7. Payment Synchronization', () => {
    it('transitions payment status from UNPAID -> PARTIALLY_PAID -> PAID', async () => {
      const order = await ordersService.createSalesOrder(tenant1Id, {
        channel_type: 'ECOMMERCE',
        branch_id: branch1Id,
        warehouse_id: warehouse1Id,
        lines: [{ variant_id: variant1Id, quantity: 1, unit_price_minor: '10000' }], // grand_total = 10000
      });

      expect(order.payment_status).toBe('UNPAID');

      // Pay $40.00
      const step1 = await ordersService.recordOrderPayment(tenant1Id, order.id, 4000n);
      expect(step1.payment_status).toBe('PARTIALLY_PAID');
      expect(step1.amount_paid_minor).toBe('4000');

      // Pay remaining $60.00
      const step2 = await ordersService.recordOrderPayment(tenant1Id, order.id, 6000n);
      expect(step2.payment_status).toBe('PAID');
      expect(step2.amount_paid_minor).toBe('10000');
    });
  });
});
