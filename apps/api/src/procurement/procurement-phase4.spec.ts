import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
import { PurchaseInvoicesService } from './purchase-invoices.service.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';
import { RfqsService } from './rfqs.service.js';
import { SupplierQuotationsService } from './supplier-quotations.service.js';
import { SupplierReturnsService } from './supplier-returns.service.js';
import { SupplierPaymentsService } from './supplier-payments.service.js';
import {
  SupplierInactiveDomainError,
  OverReceiptToleranceExceededDomainError,
} from '@stokrova/domain';

describe('Phase 4 Master Acceptance & Integration Suite (Scenarios A - I)', () => {
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
  let purchaseInvoicesService: PurchaseInvoicesService;
  let purchaseRequestsService: PurchaseRequestsService;
  let rfqsService: RfqsService;
  let supplierQuotationsService: SupplierQuotationsService;
  let supplierReturnsService: SupplierReturnsService;
  let supplierPaymentsService: SupplierPaymentsService;

  let tenantAId: string;
  let tenantBId: string;
  let warehouseAId: string;
  let locationAvailableAId: string;
  let locationQuarantineAId: string;
  let variantAId: string;

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
    purchaseInvoicesService = new PurchaseInvoicesService(
      purchaseOrdersService,
      goodsReceiptService,
      suppliersService,
    );
    rfqsService = new RfqsService(
      warehousesService,
      variantsService,
      suppliersService,
    );
    purchaseRequestsService = new PurchaseRequestsService(
      purchaseOrdersService,
      warehousesService,
      variantsService,
      suppliersService,
    );
    supplierQuotationsService = new SupplierQuotationsService(
      suppliersService,
      variantsService,
      purchaseOrdersService,
      rfqsService,
    );
    supplierReturnsService = new SupplierReturnsService(
      stockLedgerService,
      warehousesService,
      locationsService,
      purchaseOrdersService,
      suppliersService,
    );
    supplierPaymentsService = new SupplierPaymentsService(
      suppliersService,
      purchaseInvoicesService,
    );

    // 1. Provision Tenant A & B
    const tenantARes = await tenancyService.provisionTenant(
      {
        name: 'Alpha Corp Enterprise',
        slug: 'alpha-corp',
        owner_email: 'owner@alpha.com',
        owner_full_name: 'Alpha Owner',
        default_currency: 'USD',
      },
      'usr_owner_a',
    );
    tenantAId = tenantARes.tenant.id;

    const tenantBRes = await tenancyService.provisionTenant(
      {
        name: 'Beta Ltd Logistics',
        slug: 'beta-ltd',
        owner_email: 'owner@beta.com',
        owner_full_name: 'Beta Owner',
        default_currency: 'EUR',
      },
      'usr_owner_b',
    );
    tenantBId = tenantBRes.tenant.id;

    // 2. Provision Warehouse & Locations for Tenant A
    const whA = await warehousesService.createWarehouse(tenantAId, {
      branch_id: tenantARes.default_branch.id,
      code: 'WH-MAIN-A',
      name: 'Alpha Central Warehouse',
    });
    warehouseAId = whA.id;

    const locAvailableA = await locationsService.createLocation(tenantAId, {
      warehouse_id: warehouseAId,
      code: 'LOC-PICK-A1',
      name: 'Primary Picking Zone',
      type: 'INTERNAL_STORAGE',
    });
    locationAvailableAId = locAvailableA.id;

    const locQuarantineA = await locationsService.createLocation(tenantAId, {
      warehouse_id: warehouseAId,
      code: 'LOC-QUAR-A1',
      name: 'Quarantine Holding Zone',
      type: 'QUARANTINE',
    });
    locationQuarantineAId = locQuarantineA.id;

    // 3. Provision Catalog items for Tenant A
    const uom = await uomService.createUom(tenantAId, {
      code: 'EA',
      name: 'Each',
      category: 'COUNT',
    });
    const cat = await categoriesService.createCategory(tenantAId, {
      name: 'Industrial Components',
      code: 'IND-COMP',
    });
    const template = await templatesService.createTemplate(tenantAId, {
      code: 'TMPL-HD-FLANGE',
      name: 'Heavy Duty Flange',
      type: 'STANDARD',
      base_uom_id: uom.id,
      category_id: cat.id,
    });
    const vA = await variantsService.createVariant(tenantAId, {
      template_id: template.id,
      sku: 'FLANGE-100-HD',
      cost_price_minor: '5000',
      selling_price_minor: '8000',
      attributes: { size: '100mm' },
    });
    variantAId = vA.id;
  });

  // =========================================================================
  // SCENARIO A: Standard Purchasing End-to-End Pipeline
  // PR -> RFQ -> Quote -> Selection -> PO -> GRN -> Inspection -> Ledger -> Invoice -> Payment
  // =========================================================================
  it('Scenario A: executes full procurement lifecycle from PR to supplier payment and ledger verification', async () => {
    // 1. Create Supplier
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Acme Heavy Steel Ltd',
      code: 'ACME-STEEL',
      currency_code: 'USD',
      payment_terms: 'NET_30',
      lead_time_days: 7,
    });
    const supplierId = supRes.supplier.id;

    // 2. Create and Approve Purchase Request (Internal Requisition)
    const pr = await purchaseRequestsService.create(tenantAId, {
      destination_warehouse_id: warehouseAId,
      preferred_supplier_id: supplierId,
      business_justification: 'Quarterly pipeline fabrication replenishment',
      lines: [
        {
          variant_id: variantAId,
          quantity: 100,
          estimated_unit_cost_minor: '5000', // $50.00
        },
      ],
    });
    expect(pr.status).toBe('DRAFT');
    expect(pr.estimated_total_minor).toBe('500000'); // $5,000.00

    await purchaseRequestsService.submit(tenantAId, pr.id);
    const approvedPr = await purchaseRequestsService.approve(tenantAId, pr.id, {
      approved_by: 'usr_procurement_manager',
    });
    expect(approvedPr.status).toBe('APPROVED');

    // 3. Issue RFQ to Supplier
    const rfq = await rfqsService.create(tenantAId, {
      destination_warehouse_id: warehouseAId,
      purchase_request_id: approvedPr.id,
      supplier_ids: [supplierId],
      lines: [
        {
          variant_id: variantAId,
          quantity: 100,
          target_unit_cost_minor: '5000',
        },
      ],
    });
    const issuedRfq = await rfqsService.issue(tenantAId, rfq.id);
    expect(issuedRfq.status).toBe('ISSUED');

    // 4. Capture Supplier Quotation
    const quote = await supplierQuotationsService.create(tenantAId, {
      supplier_id: supplierId,
      supplier_quotation_reference: 'ACME-QT-2026-999',
      rfq_id: issuedRfq.id,
      lead_time_days: 5,
      lines: [
        {
          variant_id: variantAId,
          quantity: 100,
          unit_cost_minor: '5000',
        },
      ],
    });
    expect(quote.status).toBe('RECEIVED');
    expect(quote.total_minor).toBe('500000');

    // 5. Compare & Select Quotation
    const comparison = await supplierQuotationsService.compare(tenantAId, issuedRfq.id);
    expect(comparison.comparisons.length).toBe(1);
    expect(comparison.recommended_quotation_id).toBe(quote.id);

    const selectedQuote = await supplierQuotationsService.select(tenantAId, quote.id);
    expect(selectedQuote.status).toBe('SELECTED');

    // 6. Convert to Purchase Order & Approve
    const { order: po } = await supplierQuotationsService.convertToPurchaseOrder(
      tenantAId,
      selectedQuote.id,
      warehouseAId,
    );
    expect(po.status).toBe('DRAFT');
    expect(po.total_minor).toBe('500000');

    // PO Approval & Issuance
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_buyer' });
    const approvedPo = await purchaseOrdersService.approve(tenantAId, po.id, {
      approved_by: 'usr_vp_supply',
    });
    const issuedPo = await purchaseOrdersService.issue(tenantAId, approvedPo.id);
    expect(issuedPo.status).toBe('ISSUED');

    // 7. Receive Goods (GRN) and Inspect
    const grn = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: issuedPo.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_dock_receiver',
      idempotency_key: 'idem-grn-scenario-a',
      lines: [
        {
          purchase_order_line_id: issuedPo.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 100,
          quantity_accepted: 100,
          quantity_quarantined: 0,
          quantity_rejected: 0,
          target_location_id: locationAvailableAId,
        },
      ],
    });
    expect(grn.status).toBe('IN_INSPECTION');

    // 8. Complete GRN -> Posts Authoritative Stock Ledger Movement
    const completedGrn = await goodsReceiptService.complete(tenantAId, grn.id);
    expect(completedGrn.status).toBe('COMPLETED');

    // Verify stock ledger strictly reflects +100 units
    const balance = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(balance.on_hand_quantity).toBe(100);

    // 9. Process Supplier Invoice with 3-Way Matching
    const invoice = await purchaseInvoicesService.create(tenantAId, {
      invoice_number: 'INV-ACME-001',
      supplier_invoice_reference: 'ACME-TAX-90812',
      supplier_id: supplierId,
      purchase_order_id: issuedPo.id,
      goods_receipt_id: completedGrn.id,
      invoice_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      lines: [
        {
          purchase_order_line_id: issuedPo.lines![0]!.id,
          variant_id: variantAId,
          quantity_invoiced: 100,
          unit_price_minor: '5000',
        },
      ],
    });
    expect(invoice.match_status).toBe('PERFECT_MATCH');
    expect(invoice.status).toBe('MATCHED');

    await purchaseInvoicesService.approve(tenantAId, invoice.id, 'usr_controller');

    // 10. Disburse Supplier Payment and Allocate to Invoice
    const payment = await supplierPaymentsService.create(tenantAId, {
      supplier_id: supplierId,
      amount_minor: '500000',
      idempotency_key: 'idem-pay-scenario-a',
      reference: 'WIRE-2026-CHASE-001',
      allocations: [
        {
          purchase_invoice_id: invoice.id,
          amount_minor: '500000',
        },
      ],
    });
    expect(payment.status).toBe('DISBURSED');

    // Invoice is fully paid
    const updatedInvoice = await purchaseInvoicesService.getById(tenantAId, invoice.id);
    expect(updatedInvoice.status).toBe('PAID');
    expect(updatedInvoice.amount_paid_minor).toBe('500000');
  });

  // =========================================================================
  // SCENARIO B: Partial Delivery Lifecycle
  // =========================================================================
  it('Scenario B: correctly tracks partial receipts, status progression, and outstanding balances', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Delta Valve Manufacturing',
      code: 'DELTA-VALVE',
    });
    const supplierId = supRes.supplier.id;

    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supplierId,
      destination_warehouse_id: warehouseAId,
      lines: [
        {
          variant_id: variantAId,
          quantity: 200,
          unit_cost_minor: '2500',
        },
      ],
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_b' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_mgr' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    const poLineId = po.lines![0]!.id;

    // Delivery 1: 80 units received
    const grn1 = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_receiver',
      lines: [
        {
          purchase_order_line_id: poLineId,
          variant_id: variantAId,
          quantity_received: 80,
          quantity_accepted: 80,
          target_location_id: locationAvailableAId,
        },
      ],
    });
    await goodsReceiptService.complete(tenantAId, grn1.id);

    const midPo = await purchaseOrdersService.getById(tenantAId, po.id);
    expect(midPo.status).toBe('PARTIALLY_RECEIVED');
    expect(midPo.lines![0]!.received_quantity).toBe(80);
    // Outstanding = 200 - 80 = 120

    // Delivery 2: Remaining 120 units received
    const grn2 = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_receiver',
      lines: [
        {
          purchase_order_line_id: poLineId,
          variant_id: variantAId,
          quantity_received: 120,
          quantity_accepted: 120,
          target_location_id: locationAvailableAId,
        },
      ],
    });
    await goodsReceiptService.complete(tenantAId, grn2.id);

    const finalPo = await purchaseOrdersService.getById(tenantAId, po.id);
    expect(finalPo.status).toBe('RECEIVED');
    expect(finalPo.lines![0]!.received_quantity).toBe(200);

    const totalStock = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(totalStock.on_hand_quantity).toBe(200);
  });

  // =========================================================================
  // SCENARIO C: Mixed Receipt Outcome (Accepted, Quarantined, Rejected)
  // =========================================================================
  it('Scenario C: isolates accepted, quarantined, and rejected quantities strictly enforcing mass conservation', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Precision Seals Co',
      code: 'PREC-SEAL',
    });
    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [
        {
          variant_id: variantAId,
          quantity: 100,
          unit_cost_minor: '1000',
        },
      ],
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_c' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_c' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    // Dock receipt of 100: 70 Accepted, 20 Quarantined, 10 Rejected
    const grn = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_dock_insp',
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 100,
          quantity_accepted: 70,
          quantity_quarantined: 20,
          quantity_rejected: 10,
          quarantine_reason: 'Packaging moisture damage - QA pending',
          target_location_id: locationAvailableAId,
          quarantine_location_id: locationQuarantineAId,
        },
      ],
    });
    await goodsReceiptService.complete(tenantAId, grn.id);

    // 1. Available location has strictly 70 units
    const availableStock = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(availableStock.on_hand_quantity).toBe(70);

    // 2. Quarantine location has strictly 20 units
    const quarantineStock = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationQuarantineAId,
    );
    expect(quarantineStock.on_hand_quantity).toBe(20);

    // 3. Rejected 10 units never enter warehouse inventory ledger! Total physical stock = 90
    const allMovements = await stockLedgerService.getLedgerEntries(tenantAId, {
      variant_id: variantAId,
    });
    const sumMovementQty = allMovements.reduce((acc, m) => acc + m.quantity, 0);
    expect(sumMovementQty).toBe(90);
  });

  // =========================================================================
  // SCENARIO D: Duplicate Receipt Idempotency (Golden Rule 8 & 19)
  // =========================================================================
  it('Scenario D: enforces duplicate receipt idempotency returning cached record with zero duplicate stock movements', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Reliable Fasteners',
      code: 'REL-FAST',
    });
    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 50, unit_cost_minor: '500' }],
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_d' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_d' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    const idemKey = 'idem-receipt-retry-abc-999';

    // First receipt request
    const grn1 = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_d',
      idempotency_key: idemKey,
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 50,
          quantity_accepted: 50,
          target_location_id: locationAvailableAId,
        },
      ],
    });

    // Identical duplicate retry request with same idempotency key
    const grn2 = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_d',
      idempotency_key: idemKey,
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 50,
          quantity_accepted: 50,
          target_location_id: locationAvailableAId,
        },
      ],
    });

    // Must return the exact same GRN instance
    expect(grn1.id).toBe(grn2.id);
    expect(grn1.grn_number).toBe(grn2.grn_number);

    // Complete the GRN
    await goodsReceiptService.complete(tenantAId, grn1.id);

    // Completing again must be idempotent and not post duplicate movements
    await goodsReceiptService.complete(tenantAId, grn1.id);

    const stock = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(stock.on_hand_quantity).toBe(50);
  });

  // =========================================================================
  // SCENARIO E: Over-Receipt Policy Enforced
  // =========================================================================
  it('Scenario E: prevents over-receipt exceeding tolerance limit', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Vulcan Steel Forge',
      code: 'VULC-STEEL',
    });
    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 100, unit_cost_minor: '1000' }],
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_e' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_e' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    // Attempting to receive 150 units against PO of 100 (50% over-receipt, exceeding default 5% tolerance)
    await expect(
      goodsReceiptService.create(tenantAId, {
        purchase_order_id: po.id,
        destination_warehouse_id: warehouseAId,
        received_by: 'usr_e',
        lines: [
          {
            purchase_order_line_id: po.lines![0]!.id,
            variant_id: variantAId,
            quantity_received: 150,
            quantity_accepted: 150,
            target_location_id: locationAvailableAId,
          },
        ],
      }),
    ).rejects.toThrow(OverReceiptToleranceExceededDomainError);
  });

  // =========================================================================
  // SCENARIO F: Damaged Goods Supplier Return (Debit Note / Return)
  // =========================================================================
  it('Scenario F: executes supplier return posting SUPPLIER_RETURN movement and reducing ledger inventory', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Apex Precision Castings',
      code: 'APEX-CAST',
    });
    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 50, unit_cost_minor: '3000' }],
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_f' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_f' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    // Initial intake of 50 units
    const grn = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_f',
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 50,
          quantity_accepted: 50,
          target_location_id: locationAvailableAId,
        },
      ],
    });
    await goodsReceiptService.complete(tenantAId, grn.id);

    const initialStock = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(initialStock.on_hand_quantity).toBe(50);

    // Return 15 defective units back to supplier
    const returnOrder = await supplierReturnsService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      purchase_order_id: po.id,
      goods_receipt_id: grn.id,
      warehouse_id: warehouseAId,
      reason: 'DEFECTIVE',
      notes: 'Sub-surface porosity detected during machining',
      lines: [
        {
          variant_id: variantAId,
          quantity: 15,
          unit_cost_minor: '3000',
          source_location_id: locationAvailableAId,
          reason: 'Porosity crack',
        },
      ],
    });
    expect(returnOrder.status).toBe('DRAFT');

    await supplierReturnsService.authorize(tenantAId, returnOrder.id, {
      authorized_by: 'usr_qa_director',
      credit_memo_reference: 'CM-APEX-7781',
    });

    const dispatchedReturn = await supplierReturnsService.dispatch(
      tenantAId,
      returnOrder.id,
      {
        carrier: 'Freightliner Express',
        tracking_number: 'TRK-990011',
      },
      'usr_dock_lead',
    );
    expect(dispatchedReturn.status).toBe('DISPATCHED');

    // Authoritative stock ledger must be reduced by 15 units (50 - 15 = 35)
    const stockAfterReturn = await stockLedgerService.getBalance(
      tenantAId,
      warehouseAId,
      variantAId,
      locationAvailableAId,
    );
    expect(stockAfterReturn.on_hand_quantity).toBe(35);

    // Complete the return lifecycle
    const completedReturn = await supplierReturnsService.complete(tenantAId, returnOrder.id);
    expect(completedReturn.status).toBe('COMPLETED');
  });

  // =========================================================================
  // SCENARIO G: Supplier Invoice Mismatch (3-Way Matching Discrepancy Flag)
  // =========================================================================
  it('Scenario G: detects 3-way price mismatch, sets DISCREPANCY status, and prevents automated approval', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Global Bearings Inc',
      code: 'GLOB-BEAR',
    });
    const po = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supRes.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 40, unit_cost_minor: '2000' }], // $20.00 agreed
    });
    await purchaseOrdersService.submitForApproval(tenantAId, po.id, { requested_by: 'usr_g' });
    await purchaseOrdersService.approve(tenantAId, po.id, { approved_by: 'usr_g' });
    await purchaseOrdersService.issue(tenantAId, po.id);

    const grn = await goodsReceiptService.create(tenantAId, {
      purchase_order_id: po.id,
      destination_warehouse_id: warehouseAId,
      received_by: 'usr_g',
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_received: 40,
          quantity_accepted: 40,
          target_location_id: locationAvailableAId,
        },
      ],
    });
    await goodsReceiptService.complete(tenantAId, grn.id);

    // Supplier attempts to invoice at $28.00 instead of agreed $20.00
    const invoice = await purchaseInvoicesService.create(tenantAId, {
      invoice_number: 'INV-MISMATCH-99',
      supplier_invoice_reference: 'VENDOR-REF-99',
      supplier_id: supRes.supplier.id,
      purchase_order_id: po.id,
      goods_receipt_id: grn.id,
      invoice_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      lines: [
        {
          purchase_order_line_id: po.lines![0]!.id,
          variant_id: variantAId,
          quantity_invoiced: 40,
          unit_price_minor: '2800', // $28.00 unit cost (price variance = $8.00 * 40 = $320.00)
        },
      ],
    });

    expect(invoice.match_status).toBe('DISCREPANCY_FLAGGED');
    expect(invoice.status).toBe('DISCREPANCY');
    expect(invoice.price_variance_minor).toBe('32000');
    expect(invoice.discrepancy_notes).toContain('Unit price mismatch');
  });

  // =========================================================================
  // SCENARIO H: Multi-Tenant Data Isolation (Golden Rule 21)
  // =========================================================================
  it('Scenario H: guarantees absolute tenant isolation across all procurement entities', async () => {
    // Tenant A creates a supplier and a PO
    const supA = await suppliersService.createSupplier(tenantAId, {
      name: 'Alpha Supplier Secret',
      code: 'ALPHA-SUP',
    });
    const poA = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supA.supplier.id,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 10, unit_cost_minor: '1000' }],
    });

    // Tenant B attempts to access Tenant A's supplier or purchase order
    await expect(suppliersService.getSupplierById(tenantBId, supA.supplier.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(purchaseOrdersService.getById(tenantBId, poA.id)).rejects.toThrow(
      NotFoundException,
    );

    // Listing under Tenant B returns empty array
    const ordersB = await purchaseOrdersService.list(tenantBId);
    expect(ordersB).toHaveLength(0);

    const suppliersB = await suppliersService.listSuppliers(tenantBId);
    expect(suppliersB.suppliers).toHaveLength(0);
  });

  // =========================================================================
  // SCENARIO I: Inactive / Blocked Supplier Purchasing Restriction
  // =========================================================================
  it('Scenario I: blocks new purchases from inactive suppliers while retaining existing historical records', async () => {
    const supRes = await suppliersService.createSupplier(tenantAId, {
      name: 'Temporarily Suspended Supplier',
      code: 'SUSPENDED-01',
    });
    const supplierId = supRes.supplier.id;

    // Place and issue historical order while active
    const historicalPo = await purchaseOrdersService.create(tenantAId, {
      supplier_id: supplierId,
      destination_warehouse_id: warehouseAId,
      lines: [{ variant_id: variantAId, quantity: 25, unit_cost_minor: '1500' }],
    });

    // Deactivate supplier due to audit findings
    await suppliersService.updateSupplier(tenantAId, supplierId, {
      status: 'INACTIVE',
    });

    // Attempting to create a new PO must be blocked
    await expect(
      purchaseOrdersService.create(tenantAId, {
        supplier_id: supplierId,
        destination_warehouse_id: warehouseAId,
        lines: [{ variant_id: variantAId, quantity: 10, unit_cost_minor: '1500' }],
      }),
    ).rejects.toThrow(SupplierInactiveDomainError);

    // Historical PO remains accessible (Golden Rule 11 & 27)
    const fetchedHistorical = await purchaseOrdersService.getById(tenantAId, historicalPo.id);
    expect(fetchedHistorical.id).toBe(historicalPo.id);
    expect(fetchedHistorical.supplier_id).toBe(supplierId);
  });
});
