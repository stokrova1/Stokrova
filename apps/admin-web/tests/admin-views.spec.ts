import { describe, it, expect } from 'vitest';
import {
  CatalogViewModel,
  InventoryViewModel,
  OrdersViewModel,
  WorkflowsStudioViewModel,
  DashboardViewModel,
} from '../src/index.js';

describe('Phase 26A @stokrova/admin-web — Interactive Views Suite', () => {
  describe('CatalogViewModel', () => {
    it('supports SKU multi-attribute variant cataloging, barcode aliases, and searching', () => {
      const catalog = new CatalogViewModel('dark');
      catalog.addProduct({
        id: 'prod_1',
        sku: 'SHIRT-SLK-BLU-L',
        barcode: '5012345678901',
        name: 'Royal Silk Oxford Shirt',
        category: 'Apparel',
        attributes: { size: 'L', color: 'Blue', fabric: 'Silk' },
        costPriceMinor: 2500n, // $25.00
        retailPriceMinor: 8900n, // $89.00
        wholesalePriceMinor: 5500n, // $55.00
        stockOnHand: 45,
        barcodeAliases: ['5012345678999'],
        isArchived: false,
      });

      // Search by SKU substring
      expect(catalog.searchProducts('SHIRT-SLK')).toHaveLength(1);
      // Search by attribute
      expect(catalog.searchProducts('Silk')).toHaveLength(1);
      // Lookup by primary barcode
      expect(catalog.getProductByBarcode('5012345678901')?.sku).toBe('SHIRT-SLK-BLU-L');
      // Lookup by barcode alias
      expect(catalog.getProductByBarcode('5012345678999')?.sku).toBe('SHIRT-SLK-BLU-L');

      // Update pricing
      catalog.updatePricing('SHIRT-SLK-BLU-L', 9900n, 6000n);
      expect(catalog.getProductBySku('SHIRT-SLK-BLU-L')?.retailPriceMinor).toBe(9900n);

      // Render HTML table
      const html = catalog.renderCatalogTableHtml();
      expect(html).toContain('Royal Silk Oxford Shirt');
      expect(html).toContain('size: L');
      expect(html).toContain('$99.00');
    });

    it('generates 2D attribute matrix grid for rapid variant visualization', () => {
      const catalog = new CatalogViewModel('dark');
      catalog.addProduct({
        id: 'p1',
        sku: 'TSHIRT-BLK-S',
        barcode: '111',
        name: 'Classic Tee (Black/S)',
        category: 'Apparel',
        attributes: { color: 'Black', size: 'S' },
        costPriceMinor: 500n,
        retailPriceMinor: 2000n,
        wholesalePriceMinor: 1200n,
        stockOnHand: 15,
        barcodeAliases: [],
        isArchived: false,
      });
      catalog.addProduct({
        id: 'p2',
        sku: 'TSHIRT-BLK-M',
        barcode: '112',
        name: 'Classic Tee (Black/M)',
        category: 'Apparel',
        attributes: { color: 'Black', size: 'M' },
        costPriceMinor: 500n,
        retailPriceMinor: 2000n,
        wholesalePriceMinor: 1200n,
        stockOnHand: 25,
        barcodeAliases: [],
        isArchived: false,
      });

      const { matrix, cells } = catalog.getMatrixGrid('Classic Tee', 'color', 'size');
      expect(matrix.primaryValues).toEqual(['Black']);
      expect(matrix.secondaryValues).toEqual(['M', 'S']);
      expect(cells.get('Black::S')?.stock).toBe(15);
      expect(cells.get('Black::M')?.stock).toBe(25);
    });
  });

  describe('InventoryViewModel', () => {
    it('manages 8-tier hierarchy, FEFO lot expiration statuses, and QA quarantine holds', () => {
      const inventory = new InventoryViewModel('dark');

      // Add hierarchy nodes
      inventory.addLocation({
        id: 'loc_comp',
        code: 'APEX-CORP',
        name: 'Apex Global Ltd',
        tier: 'COMPANY',
        parentId: null,
      });
      inventory.addLocation({
        id: 'loc_wh1',
        code: 'DC-NORTH',
        name: 'North Logistics Hub',
        tier: 'FACILITY',
        parentId: 'loc_comp',
      });
      inventory.addLocation({
        id: 'loc_bin1',
        code: 'A-01-02-B',
        name: 'Aisle 1 Rack 2 Bin B',
        tier: 'BIN',
        parentId: 'loc_wh1',
        capacityUnits: 200,
        occupiedUnits: 150,
      });

      // Add FEFO lot
      const nearExpiryDate = new Date(Date.now() + 15 * 86400000).toISOString(); // 15 days out
      inventory.addLot({
        lotNumber: 'LOT-2026-09A',
        sku: 'MED-VACCINE-100',
        productName: 'Sterile Solution 100ml',
        binLocationCode: 'A-01-02-B',
        quantity: 150,
        expiryDateIso: nearExpiryDate,
        holdStatus: 'ACTIVE',
        receivedDateIso: new Date().toISOString(),
        ssccPalletId: '001234567800000018',
      });

      const fefo = inventory.calculateFefoStatus(nearExpiryDate);
      expect(fefo.status).toBe('NEAR_EXPIRY');
      expect(fefo.daysRemaining).toBeLessThanOrEqual(16);

      // Place lot on QA hold
      inventory.setLotHoldStatus('LOT-2026-09A', 'QA_HOLD');
      expect(inventory.getLot('LOT-2026-09A')?.holdStatus).toBe('QA_HOLD');

      // Record stock transfer
      const mvt = inventory.transferStock('MED-VACCINE-100', 'A-01-02-B', 'Q-01-HOLD', 50, 'usr_qa', 'Quarantine Inspection');
      expect(mvt.fromBin).toBe('A-01-02-B');
      expect(mvt.toBin).toBe('Q-01-HOLD');
      expect(inventory.getMovements()).toHaveLength(1);

      // HTML Render
      const fefoHtml = inventory.renderFefoExplorerHtml();
      expect(fefoHtml).toContain('LOT-2026-09A');
      expect(fefoHtml).toContain('QA HOLD');
      expect(fefoHtml).toContain('001234567800000018');
    });
  });

  describe('OrdersViewModel', () => {
    it('manages sales order status progression pipeline with validation guards', () => {
      const orders = new OrdersViewModel('dark');
      orders.addSalesOrder({
        orderId: 'so_101',
        orderNumber: 'SO-2026-0001',
        customerName: 'Global Distro Corp',
        customerId: 'cust_gd',
        status: 'DRAFT',
        createdAtIso: new Date().toISOString(),
        lines: [
          {
            id: 'l1',
            sku: 'SKU-01',
            productName: 'Widget Alpha',
            quantity: 10,
            unitPriceMinor: 2000n,
            discountMinor: 0n,
            taxRateBps: 1000,
            lineTotalMinor: 22000n,
          },
        ],
        totalMinor: 22000n,
        currencyCode: 'USD',
      });

      // Valid progression: DRAFT -> APPROVED -> PICKED
      orders.advanceOrderStatus('so_101', 'APPROVED');
      expect(orders.getSalesOrder('so_101')?.status).toBe('APPROVED');

      orders.advanceOrderStatus('so_101', 'PICKED');
      expect(orders.getSalesOrder('so_101')?.status).toBe('PICKED');

      // Invalid transition directly to PAID from PICKED without PACKED/INVOICED
      expect(() => orders.advanceOrderStatus('so_101', 'PAID')).toThrow(
        /Invalid status transition/,
      );

      // Render Pipeline HTML
      const html = orders.renderPipelineHtml();
      expect(html).toContain('SO-2026-0001');
      expect(html).toContain('$220.00');
    });

    it('evaluates purchase order 3-way matching detecting quantity and price discrepancies', () => {
      const orders = new OrdersViewModel('dark');
      orders.addPurchaseOrder({
        poId: 'po_500',
        poNumber: 'PO-2026-0500',
        supplierName: 'Direct Suppliers LLC',
        supplierId: 'supp_ds',
        status: 'RECEIVED',
        createdAtIso: new Date().toISOString(),
        currencyCode: 'USD',
        lines: [
          {
            sku: 'ITEM-X',
            productName: 'Steel Component X',
            orderedQty: 100,
            receivedQty: 100,
            invoicedQty: 120, // Discrepancy! Invoiced 120 vs Received 100
            unitCostMinor: 1500n,
            invoicedUnitCostMinor: 1500n,
          },
        ],
      });

      const matchRes = orders.evaluateThreeWayMatch('po_500');
      expect(matchRes.status).toBe('QTY_DISCREPANCY');
      expect(matchRes.lineDiscrepancies[0]?.reason).toBe('QTY_MISMATCH');
      expect(matchRes.lineDiscrepancies[0]?.actual).toBe(120);
    });
  });

  describe('WorkflowsStudioViewModel', () => {
    it('constructs DAG graphs and strictly prevents cyclic dependencies', () => {
      const studio = new WorkflowsStudioViewModel('dark');
      studio.addNode({
        id: 'n1',
        label: 'Order Placed',
        type: 'TRIGGER',
        description: 'New sales order received',
        config: {},
        position: { x: 50, y: 100 },
      });
      studio.addNode({
        id: 'n2',
        label: 'Credit Check',
        type: 'CONDITION',
        description: 'Verify client credit balance',
        config: {},
        position: { x: 250, y: 100 },
      });
      studio.addNode({
        id: 'n3',
        label: 'Auto Fulfill',
        type: 'ACTION',
        description: 'Generate warehouse pick wave',
        config: {},
        position: { x: 450, y: 100 },
      });

      // Acyclic edges: n1 -> n2 -> n3
      studio.addEdge({ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' });
      studio.addEdge({ id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3' });
      expect(studio.isAcyclic()).toBe(true);

      // Attempting to add a cycle: n3 -> n1
      expect(() => {
        studio.addEdge({ id: 'e_cycle', sourceNodeId: 'n3', targetNodeId: 'n1' });
      }).toThrow(/Graph cycle detected/);

      // Render studio HTML
      const html = studio.renderStudioGraphHtml();
      expect(html).toContain('Order Placed');
      expect(html).toContain('Credit Check');
      expect(html).toContain('Auto Fulfill');
    });
  });

  describe('DashboardViewModel', () => {
    it('renders executive KPI cards and operational alerts with integer minor currency math', () => {
      const dashboard = new DashboardViewModel({
        grossMerchandiseValueMinor: 125000000n, // $1,250,000.00
        netRevenueMinor: 95000000n, // $950,000.00
        grossMarginBps: 4250, // 42.50%
        stockoutRiskIndex: 12,
        warehouseUtilizationPct: 78.4,
        openTillSessionsCount: 6,
        cashierVarianceAlertsMinor: 2500n, // $25.00
        activeWorkflowsRunning: 14,
        currencyCode: 'USD',
      });

      dashboard.addAlert({
        id: 'alt_1',
        severity: 'WARNING',
        title: 'Till Session Variance Detected',
        message: 'Register REG-02 closed with $25.00 shortage.',
        timestampIso: new Date().toISOString(),
      });

      const html = dashboard.renderDashboardHtml();
      expect(html).toContain('$1,250,000.00');
      expect(html).toContain('42.50%');
      expect(html).toContain('Register REG-02 closed with $25.00 shortage.');
    });
  });
});
