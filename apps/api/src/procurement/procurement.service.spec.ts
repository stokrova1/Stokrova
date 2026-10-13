import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { UomService } from '../catalog/uom.service.js';
import { CategoriesService } from '../catalog/categories.service.js';
import { BrandsService } from '../catalog/brands.service.js';
import { TemplatesService } from '../catalog/templates.service.js';
import { VariantsService } from '../catalog/variants.service.js';
import { WarehousesService } from '../warehouse/warehouses.service.js';
import { LocationsService } from '../warehouse/locations.service.js';
import { BatchesService } from '../tracking/batches.service.js';
import { SerialsService } from '../tracking/serials.service.js';
import { StockLedgerService } from '../inventory/stock-ledger.service.js';

import { SuppliersService } from './suppliers.service.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { GoodsReceiptService } from './goods-receipt.service.js';
import { LandedCostService } from './landed-cost.service.js';
import { PurchaseInvoicesService } from './purchase-invoices.service.js';

describe('Procurement, Purchasing & Receiving Engine (Phase 4 Master)', () => {
  let tenancyService: TenancyService;
  let uomService: UomService;
  let categoriesService: CategoriesService;
  let brandsService: BrandsService;
  let templatesService: TemplatesService;
  let variantsService: VariantsService;
  let warehousesService: WarehousesService;
  let locationsService: LocationsService;
  let batchesService: BatchesService;
  let serialsService: SerialsService;
  let stockLedgerService: StockLedgerService;

  let suppliersService: SuppliersService;
  let purchaseOrdersService: PurchaseOrdersService;
  let goodsReceiptService: GoodsReceiptService;
  let landedCostService: LandedCostService;
  let purchaseInvoicesService: PurchaseInvoicesService;

  let tenantId: string;
  let branchId: string;
  let warehouseId: string;
  let locationAvailableId: string;
  let locationQuarantineId: string;
  let variantId: string;

  beforeEach(async () => {
    tenancyService = new TenancyService();
    uomService = new UomService();
    categoriesService = new CategoriesService();
    brandsService = new BrandsService();
    templatesService = new TemplatesService(uomService, categoriesService, brandsService);
    variantsService = new VariantsService(templatesService);
    warehousesService = new WarehousesService(tenancyService);
    locationsService = new LocationsService(warehousesService);
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

    suppliersService = new SuppliersService(variantsService);
    purchaseOrdersService = new PurchaseOrdersService(
      suppliersService,
      variantsService,
      warehousesService,
    );
    goodsReceiptService = new GoodsReceiptService(
      purchaseOrdersService,
      warehousesService,
      locationsService,
      stockLedgerService,
      batchesService,
    );
    landedCostService = new LandedCostService(goodsReceiptService);
    purchaseInvoicesService = new PurchaseInvoicesService(
      purchaseOrdersService,
      goodsReceiptService,
      suppliersService,
    );

    // 1. Provision Tenant & Branch
    const tenantRes = await tenancyService.provisionTenant(
      {
        name: 'Titan Global Industrial',
        slug: 'titan-global',
        owner_email: 'owner@titan.com',
        owner_full_name: 'Titan Owner',
        default_currency: 'USD',
      },
      'usr_owner_init',
    );
    tenantId = tenantRes.tenant.id;
    branchId = tenantRes.default_branch.id;

    // 2. Setup Warehouse & Storage Locations
    const wh = await warehousesService.createWarehouse(tenantId, {
      branch_id: branchId,
      code: 'WH-MAIN',
      name: 'Central Warehouse',
    });
    warehouseId = wh.id;

    const locAvailable = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'LOC-A1',
      name: 'Shelf A1 (Available)',
      type: 'INTERNAL_STORAGE',
    });
    locationAvailableId = locAvailable.id;

    const locQuarantine = await locationsService.createLocation(tenantId, {
      warehouse_id: warehouseId,
      code: 'LOC-QC',
      name: 'QC Quarantine Bay',
      type: 'QUARANTINE',
    });
    locationQuarantineId = locQuarantine.id;

    // 3. Setup Catalog
    const uom = await uomService.createUom(tenantId, {
      name: 'Unit',
      code: 'UNT',
      category: 'COUNT',
      is_base_unit: true,
    });
    const template = await templatesService.createTemplate(tenantId, {
      name: 'Hydraulic Actuator Pump',
      code: 'PUMP-ACTUATOR',
      type: 'STANDARD',
      base_uom_id: uom.id,
    });
    const variant = await variantsService.createVariant(tenantId, {
      template_id: template.id,
      sku: 'HAP-9000',
      cost_price_minor: '15000',   // $150.00
      selling_price_minor: '25000', // $250.00
      attributes: {},
    });
    variantId = variant.id;
  });

  describe('Phase 4A: Suppliers & Vendor Product Mappings', () => {
    it('creates supplier with tenant isolation and code uniqueness', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'HydroTech Components Inc',
        code: 'HT-COMP',
        currency_code: 'USD',
        payment_terms: 'NET_30',
        lead_time_days: 10,
      });

      expect(sup.supplier.id).toBeDefined();
      expect(sup.supplier.code).toBe('HT-COMP');

      // Reject duplicate code for same tenant
      await expect(
        suppliersService.createSupplier(tenantId, {
          name: 'HydroTech Duplicate',
          code: 'HT-COMP',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates and validates supplier product mapping with MOQ and order increments', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Apex Hydraulics Ltd',
        code: 'APEX-HYD',
      });

      const mapping = await suppliersService.createSupplierProductMapping(tenantId, {
        supplier_id: sup.supplier.id,
        variant_id: variantId,
        supplier_sku: 'APEX-SKU-99',
        minimum_order_quantity: 10,
        order_increment_quantity: 5,
        unit_cost_minor: 14000, // $140.00
        is_preferred: true,
      });

      expect(mapping.mapping.supplier_sku).toBe('APEX-SKU-99');
      expect(mapping.mapping.minimum_order_quantity).toBe(10);
      expect(mapping.mapping.is_preferred).toBe(true);

      const retrieved = await suppliersService.getSupplierProductMappings(
        tenantId,
        sup.supplier.id,
        variantId,
      );
      expect(retrieved.mappings).toHaveLength(1);
    });
  });

  describe('Phase 4B: Purchase Order Lifecycle & Approval Engine', () => {
    it('creates PO, evaluates spend thresholds, and issues order', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Apex Fasteners',
        code: 'APEX-FAST',
      });

      // Map product with MOQ 5
      await suppliersService.createSupplierProductMapping(tenantId, {
        supplier_id: sup.supplier.id,
        variant_id: variantId,
        supplier_sku: 'APEX-FAST-01',
        minimum_order_quantity: 5,
        order_increment_quantity: 5,
        unit_cost_minor: 14000,
      });

      // 1. Enforces MOQ on PO creation
      await expect(
        purchaseOrdersService.create(tenantId, {
          supplier_id: sup.supplier.id,
          destination_warehouse_id: warehouseId,
          lines: [
            {
              variant_id: variantId,
              quantity: 3, // violates MOQ of 5
              unit_cost_minor: 14000,
            },
          ],
        }),
      ).rejects.toThrow();

      // 2. Create valid PO: 10 units @ 14,000 minor ($140.00 each) = 140,000 subtotal ($1,400.00)
      // Total < $5,000 threshold -> Auto-approved upon submit!
      const po = await purchaseOrdersService.create(tenantId, {
        supplier_id: sup.supplier.id,
        destination_warehouse_id: warehouseId,
        lines: [
          {
            variant_id: variantId,
            quantity: 10,
            unit_cost_minor: 14000,
            tax_rate_basis_points: 500, // 5% tax = 7000
          },
        ],
      });

      expect(po.status).toBe('DRAFT');
      expect(po.subtotal_minor).toBe('140000');
      expect(po.tax_minor).toBe('7000');
      expect(po.total_minor).toBe('147000');

      // 3. Submit for approval -> Auto-approves under $5,000 threshold
      const submittedPo = await purchaseOrdersService.submitForApproval(tenantId, po.id, {
        requested_by: 'usr_purchaser_1',
      });
      expect(submittedPo.status).toBe('APPROVED');
      expect(submittedPo.approved_by).toBe('SYSTEM_AUTO_APPROVAL');

      // 4. Issue PO to vendor
      const issuedPo = await purchaseOrdersService.issue(tenantId, po.id);
      expect(issuedPo.status).toBe('ISSUED');
      expect(issuedPo.issued_at).toBeDefined();
    });

    it('requires manual manager approval for large orders exceeding threshold', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Heavy Machinery Co',
        code: 'HEAVY-MACH',
      });

      // 100 units @ 15,000 = 1,500,000 minor ($15,000.00 > $5,000 threshold)
      const po = await purchaseOrdersService.create(tenantId, {
        supplier_id: sup.supplier.id,
        destination_warehouse_id: warehouseId,
        lines: [
          {
            variant_id: variantId,
            quantity: 100,
            unit_cost_minor: 15000,
          },
        ],
      });

      const submitted = await purchaseOrdersService.submitForApproval(tenantId, po.id, {
        requested_by: 'usr_buyer',
      });
      expect(submitted.status).toBe('PENDING_APPROVAL');

      // Manager approves
      const approved = await purchaseOrdersService.approve(tenantId, po.id, {
        approved_by: 'mgr_director',
      });
      expect(approved.status).toBe('APPROVED');
      expect(approved.approved_by).toBe('mgr_director');
    });
  });

  describe('Phase 4C: Goods Receiving (GRN) & Quarantine Engine', () => {
    it('receives goods, partitions quarantine, and posts to double-entry stock ledger', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Global Parts Direct',
        code: 'GPD-SUP',
      });

      const po = await purchaseOrdersService.create(tenantId, {
        supplier_id: sup.supplier.id,
        destination_warehouse_id: warehouseId,
        lines: [
          {
            variant_id: variantId,
            quantity: 20,
            unit_cost_minor: 10000,
          },
        ],
      });
      await purchaseOrdersService.submitForApproval(tenantId, po.id, { requested_by: 'buyer' });
      await purchaseOrdersService.issue(tenantId, po.id);

      const poLineId = po.lines![0]!.id;

      // 1. Reject over-receipt beyond 5% tolerance (20 * 1.05 = 21 max; attempt 25)
      await expect(
        goodsReceiptService.create(tenantId, {
          purchase_order_id: po.id,
          destination_warehouse_id: warehouseId,
          received_by: 'dock_worker_1',
          lines: [
            {
              purchase_order_line_id: poLineId,
              variant_id: variantId,
              quantity_received: 25,
              quantity_accepted: 25,
              target_location_id: locationAvailableId,
            },
          ],
        }),
      ).rejects.toThrow();

      // 2. Create valid dock receipt: 20 units received (18 accepted, 2 quarantined due to packaging flaw)
      const grn = await goodsReceiptService.create(tenantId, {
        purchase_order_id: po.id,
        destination_warehouse_id: warehouseId,
        received_by: 'dock_worker_1',
        lines: [
          {
            purchase_order_line_id: poLineId,
            variant_id: variantId,
            quantity_received: 20,
            quantity_accepted: 18,
            quantity_quarantined: 2,
            quarantine_reason: 'Crushed carton exterior',
            lot_number: 'LOT-2026-X1',
            target_location_id: locationAvailableId,
            quarantine_location_id: locationQuarantineId,
          },
        ],
      });

      expect(grn.status).toBe('IN_INSPECTION');
      expect(grn.lines![0]!.quantity_accepted).toBe(18);
      expect(grn.lines![0]!.quantity_quarantined).toBe(2);

      // 3. Complete Goods Receipt -> updates stock ledger and PO received quantities
      const completedGrn = await goodsReceiptService.complete(tenantId, grn.id);
      expect(completedGrn.status).toBe('COMPLETED');

      // Verify stock ledger has credited 18 available units and 2 quarantine units
      const balances = await stockLedgerService.getBalances(tenantId, {
        warehouse_id: warehouseId,
        variant_id: variantId,
      });
      const availableBalance = balances.find((b) => b.location_id === locationAvailableId);
      expect(availableBalance?.on_hand_quantity).toBe(18);

      const quarantineBalance = balances.find((b) => b.location_id === locationQuarantineId);
      expect(quarantineBalance?.on_hand_quantity).toBe(2);

      // Verify PO received quantity is updated to 20
      const updatedPo = await purchaseOrdersService.getById(tenantId, po.id);
      expect(updatedPo.lines![0]!.received_quantity).toBe(20);
      expect(updatedPo.status).toBe('RECEIVED');
    });
  });

  describe('Phase 4D: Landed Cost Allocation Engine', () => {
    it('allocates landed cost charges by value with exact integer cent conservation', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Trans-Oceanic Freight Lines',
        code: 'TO-FL',
      });

      const po = await purchaseOrdersService.create(tenantId, {
        supplier_id: sup.supplier.id,
        destination_warehouse_id: warehouseId,
        lines: [
          {
            variant_id: variantId,
            quantity: 30,
            unit_cost_minor: 10000,
          },
        ],
      });
      await purchaseOrdersService.submitForApproval(tenantId, po.id, { requested_by: 'buyer' });
      await purchaseOrdersService.issue(tenantId, po.id);

      const grn = await goodsReceiptService.create(tenantId, {
        purchase_order_id: po.id,
        destination_warehouse_id: warehouseId,
        received_by: 'receiver_1',
        lines: [
          {
            purchase_order_line_id: po.lines![0]!.id,
            variant_id: variantId,
            quantity_received: 30,
            quantity_accepted: 30,
            target_location_id: locationAvailableId,
          },
        ],
      });
      await goodsReceiptService.complete(tenantId, grn.id);

      // Create Landed Cost Voucher: Freight $120.00 (12000 minor) + Customs $35.00 (3500 minor) = $155.00 (15500 minor)
      const voucher = await landedCostService.create(tenantId, {
        goods_receipt_ids: [grn.id],
        allocation_method: 'BY_VALUE',
        charges: [
          {
            category: 'FREIGHT',
            description: 'Container ocean freight',
            amount_minor: 12000,
          },
          {
            category: 'CUSTOMS_DUTY',
            description: 'Port duty tariff',
            amount_minor: 3500,
          },
        ],
      });

      expect(voucher.total_charges_minor).toBe('15500');
      expect(voucher.allocations).toHaveLength(1);
      expect(voucher.allocations![0]!.allocated_charge_minor).toBe('15500');

      // Post voucher
      const postedVoucher = await landedCostService.post(tenantId, voucher.id, 'cfo_agent');
      expect(postedVoucher.status).toBe('POSTED');
      expect(postedVoucher.posted_by).toBe('cfo_agent');
    });
  });

  describe('Phase 4E: 3-Way Matching & Purchase Invoicing Engine', () => {
    it('executes 3-way matching, flags discrepancies, and completes invoice approval', async () => {
      const sup = await suppliersService.createSupplier(tenantId, {
        name: 'Nordic Metalworks AB',
        code: 'NORDIC-MW',
      });

      // PO: 10 units @ 10,000 minor ($100.00 each)
      const po = await purchaseOrdersService.create(tenantId, {
        supplier_id: sup.supplier.id,
        destination_warehouse_id: warehouseId,
        lines: [
          {
            variant_id: variantId,
            quantity: 10,
            unit_cost_minor: 10000,
          },
        ],
      });
      await purchaseOrdersService.submitForApproval(tenantId, po.id, { requested_by: 'buyer' });
      await purchaseOrdersService.issue(tenantId, po.id);

      const poLineId = po.lines![0]!.id;

      // GRN: 10 received, 9 accepted, 1 rejected
      const grn = await goodsReceiptService.create(tenantId, {
        purchase_order_id: po.id,
        destination_warehouse_id: warehouseId,
        received_by: 'receiver_1',
        lines: [
          {
            purchase_order_line_id: poLineId,
            variant_id: variantId,
            quantity_received: 10,
            quantity_accepted: 9,
            quantity_rejected: 1,
            target_location_id: locationAvailableId,
          },
        ],
      });
      await goodsReceiptService.complete(tenantId, grn.id);

      // Scenario 1: Supplier bills for 10 units @ $110.00 (Price + Quantity Discrepancy!)
      const discrepancyInvoice = await purchaseInvoicesService.create(tenantId, {
        invoice_number: 'INV-DISCREPANT-01',
        supplier_invoice_reference: 'SUP-INV-888',
        supplier_id: sup.supplier.id,
        purchase_order_id: po.id,
        goods_receipt_id: grn.id,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        lines: [
          {
            purchase_order_line_id: poLineId,
            goods_receipt_line_id: grn.lines![0]!.id,
            variant_id: variantId,
            quantity_invoiced: 10, // 10 invoiced vs 9 accepted!
            unit_price_minor: 11000, // 11,000 invoiced vs 10,000 PO cost!
          },
        ],
      });

      expect(discrepancyInvoice.match_status).toBe('DISCREPANCY_FLAGGED');
      expect(discrepancyInvoice.status).toBe('DISCREPANCY');
      expect(discrepancyInvoice.quantity_variance).toBe(1);
      expect(discrepancyInvoice.discrepancy_notes).toContain('Both unit price mismatch');

      // Scenario 2: Compliant Vendor Invoice matching accepted goods exactly (9 units @ $100.00)
      const matchingInvoice = await purchaseInvoicesService.create(tenantId, {
        invoice_number: 'INV-MATCHING-02',
        supplier_invoice_reference: 'SUP-INV-889',
        supplier_id: sup.supplier.id,
        purchase_order_id: po.id,
        goods_receipt_id: grn.id,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        lines: [
          {
            purchase_order_line_id: poLineId,
            goods_receipt_line_id: grn.lines![0]!.id,
            variant_id: variantId,
            quantity_invoiced: 9,
            unit_price_minor: 10000,
          },
        ],
      });

      expect(matchingInvoice.match_status).toBe('PERFECT_MATCH');
      expect(matchingInvoice.status).toBe('MATCHED');
      expect(matchingInvoice.price_variance_minor).toBe('0');
      expect(matchingInvoice.quantity_variance).toBe(0);

      // Approve compliant invoice -> updates PO billed quantities
      const approvedInvoice = await purchaseInvoicesService.approve(
        tenantId,
        matchingInvoice.id,
        'ap_accountant_1',
      );
      expect(approvedInvoice.status).toBe('APPROVED');
      expect(approvedInvoice.approved_by).toBe('ap_accountant_1');

      const finalPo = await purchaseOrdersService.getById(tenantId, po.id);
      expect(finalPo.lines![0]!.billed_quantity).toBe(9);
    });
  });
});
