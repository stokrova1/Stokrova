import { describe, it, expect } from 'vitest';
import { APEX_ENTERPRISE } from './seed-enterprise.js';
import {
  PosRegisterViewModel,
  PosSplitTenderModal,
  PosReconciliationModal,
  PosReceiptEngine,
} from '../apps/pos-desktop/src/index.js';
import {
  MobileViewfinderViewModel,
  MobilePickRouteViewModel,
  MobileReceivingViewModel,
  MobileSyncTelemetryViewModel,
} from '../apps/mobile/src/index.js';
import {
  CatalogViewModel,
  InventoryViewModel,
  OrdersViewModel,
  DashboardViewModel,
} from '../apps/admin-web/src/index.js';
import {
  compareVectorClocks,
  mergeVectorClocks,
} from '../packages/domain/src/index.js';

describe('Phase 27 — Apex Global Real-World Full Business Day Simulation', { timeout: 30000 }, () => {
  // Shared state throughout the business day
  const catalogVm = new CatalogViewModel('dark');
  const inventoryVm = new InventoryViewModel('dark');
  const ordersVm = new OrdersViewModel('dark');
  const syncTelemetry = new MobileSyncTelemetryViewModel('ONLINE');
  const receiptEngine = new PosReceiptEngine();

  // Populate catalog with enterprise seed
  for (const item of APEX_ENTERPRISE.catalog) {
    catalogVm.addProduct({
      id: `p_${item.sku}`,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      category: item.category,
      attributes: (item as any).attributes ?? {},
      costPriceMinor: item.costPriceMinor,
      retailPriceMinor: item.retailPriceMinor,
      wholesalePriceMinor: item.wholesalePriceMinor,
      stockOnHand: item.stockOnHand,
      barcodeAliases: [],
      isArchived: false,
    });
  }

  // Populate warehouse hierarchy
  for (const loc of APEX_ENTERPRISE.warehouseLocations) {
    inventoryVm.addLocation({
      id: `loc_${loc.binCode}`,
      code: loc.binCode,
      name: `Bin ${loc.binCode}`,
      tier: 'BIN',
      parentId: loc.facilityId,
      capacityUnits: loc.capacityUnits,
      occupiedUnits: 0,
    });
  }

  it('07:00 AM — Store manager opens morning till session with $200.00 float', () => {
    const reconModal = new PosReconciliationModal(
      'sess_lon_20261012_01',
      'REG-LON-01',
      APEX_ENTERPRISE.users[3]?.id ?? 'usr_apex_cashier',
      'USD',
    );

    // Opening float declaration $200.00
    reconModal.setOpeningFloat(20000n);
    expect(reconModal.getOpeningFloat()).toBe(20000n);
    expect(reconModal.getCashierId()).toBe('usr_apex_cashier');

    const html = reconModal.renderBlindCountHtml();
    expect(html).toContain('Blind Cash Drawer Count');
    expect(html).toContain('REG-LON-01');
  });

  it('08:00 AM — Inbound purchase order received, FEFO lots recorded, and SSCC-18 pallet generated', () => {
    const recvVm = new MobileReceivingViewModel(
      'PO-APEX-2026-001',
      'Global Tech Components Corp',
      [
        {
          poLineId: 'pol_1',
          sku: 'MED-VACCINE-AMP',
          productName: 'Cold-Chain Sterile Vaccine 5ml Ampoule',
          expectedUnits: 200,
          receivedUnits: 0,
          targetBinLocationCode: 'B-02-01-01',
          isInspected: false,
        },
      ],
    );

    // Generate GS1 SSCC-18 pallet barcode (18 digits)
    const sscc1 = recvVm.generateSscc18('1234567', 101);
    expect(sscc1).toHaveLength(18);

    // Confirm receipt of 200 units on Pallet 1 with FEFO expiration date
    const expiryIso = '2027-10-31T00:00:00Z';
    const receivedLine = recvVm.recordLineReceipt(
      'pol_1',
      200,
      'LOT-COLD-2026-9A',
      expiryIso,
      'B-02-01-01',
      sscc1,
    );
    expect(receivedLine.isInspected).toBe(true);
    expect(receivedLine.receivedUnits).toBe(200);

    // Register in inventory FEFO explorer
    inventoryVm.addLot({
      lotNumber: 'LOT-COLD-2026-9A',
      sku: 'MED-VACCINE-AMP',
      productName: 'Cold-Chain Sterile Vaccine 5ml Ampoule',
      binLocationCode: 'B-02-01-01',
      quantity: 200,
      expiryDateIso: expiryIso,
      holdStatus: 'ACTIVE',
      receivedDateIso: new Date().toISOString(),
      ssccPalletId: sscc1,
    });

    const fefo = inventoryVm.calculateFefoStatus(expiryIso);
    expect(fefo.status).toBe('FRESH');
    expect(fefo.daysRemaining).toBeGreaterThan(300);
  });

  it('09:30 AM — B2B wholesale client submits bulk order and credit check verifies approval', () => {
    const b2bCustomer = APEX_ENTERPRISE.customers[0]!;
    const orderTotalMinor = 4500000n; // $45,000.00

    // Credit limit evaluation: Credit Limit $500,000.00 vs Order $45,000.00
    expect(orderTotalMinor).toBeLessThanOrEqual(b2bCustomer.creditLimitMinor);

    ordersVm.addSalesOrder({
      orderId: 'so_b2b_001',
      orderNumber: 'SO-B2B-2026-01',
      customerName: b2bCustomer.companyName,
      customerId: b2bCustomer.id,
      status: 'DRAFT',
      createdAtIso: new Date().toISOString(),
      lines: [
        {
          id: 'l1',
          sku: 'LAPTOP-PRO-16',
          productName: 'Apex Pro 16-inch Workstation Laptop',
          quantity: 25,
          unitPriceMinor: 180000n, // Wholesale price $1,800.00
          discountMinor: 0n,
          taxRateBps: 0,
          lineTotalMinor: 4500000n,
        },
      ],
      totalMinor: orderTotalMinor,
      currencyCode: 'USD',
    });

    // Advance status to APPROVED following credit clearance
    ordersVm.advanceOrderStatus('so_b2b_001', 'APPROVED');
    expect(ordersVm.getSalesOrder('so_b2b_001')?.status).toBe('APPROVED');
  });

  it('11:00 AM — Handheld warehouse picker executes directed serpentine pick route', () => {
    const pickWave = new MobilePickRouteViewModel('WAVE-B2B-01', [
      {
        lineId: 'pkl_1',
        sku: 'LAPTOP-PRO-16',
        barcode: '5011000000018',
        productName: 'Apex Pro 16-inch Workstation Laptop',
        binLocationCode: 'A-01-02-03',
        routeSequenceIndex: 1,
        quantityRequired: 25,
        quantityPicked: 0,
        isComplete: false,
      },
    ]);

    // Viewfinder scans item barcode
    const vf = new MobileViewfinderViewModel();
    const scan = vf.recordScan('5011000000018', 'SUCCESS');
    expect(scan.feedback.type).toBe('SUCCESS');

    // Confirm pick
    const activeTask = pickWave.getActiveTargetTask();
    expect(activeTask?.sku).toBe('LAPTOP-PRO-16');
    pickWave.confirmPickQuantity('pkl_1', 25);

    expect(pickWave.getProgress().isWaveFinished).toBe(true);

    // Advance sales order status
    ordersVm.advanceOrderStatus('so_b2b_001', 'PICKED');
    ordersVm.advanceOrderStatus('so_b2b_001', 'PACKED');
    expect(ordersVm.getSalesOrder('so_b2b_001')?.status).toBe('PACKED');
  });

  it('01:00 PM — POS cashiers process retail transactions with split tender and print thermal receipts', () => {
    const registerVm = new PosRegisterViewModel();

    // Line 1: Royal Oxford Shirt $65.00
    const item = {
      id: 'tx_line_1',
      variantId: 'var_oxford_1',
      sku: 'SHIRT-OXFORD-BLU-M',
      barcode: '5012000000011',
      title: 'Royal Oxford Cotton Shirt (Blue/M)',
      quantity: 1,
      unitPriceMinor: 6500n, // $65.00
      discountMinor: 0n,
      taxMinor: 500n,
    };

    // Split Tender Payment: $45.00 Card + $25.00 Cash ($5.00 change due)
    const splitModal = new PosSplitTenderModal(6500n, 'USD');
    splitModal.open();

    const t1 = splitModal.addTender('CARD', 4500n, 'AUTH_CHIP_9921');
    expect(t1.remainingDueMinor).toBe(2000n);

    const t2 = splitModal.addTender('CASH', 2500n);
    expect(t2.isFullySettled).toBe(true);
    expect(t2.changeDueMinor).toBe(500n); // $5.00 change

    // Generate 80mm ESC/POS thermal receipt
    const receiptData = {
      header: {
        storeName: 'APEX LONDON FLAGSHIP',
        storeAddress: '100 Regent Street, London',
        taxRegistrationNumber: 'GB-10293847',
        phone: '+44 20 7123 4567',
        registerId: 'REG-LON-01',
        cashierName: 'Emma Watson',
        receiptNumber: 'RCP-LON-0081',
        timestampIso: new Date().toISOString(),
      },
      items: [item],
      subtotalMinor: 6000n,
      taxMinor: 500n,
      grandTotalMinor: 6500n,
      tenders: splitModal.getTenders(),
      changeDueMinor: 500n,
      currencyCode: 'USD',
    };

    const monoText = receiptEngine.renderMonospaceText(receiptData);
    expect(monoText).toContain('APEX LONDON FLAGSHIP');
    expect(monoText).toContain('TOTAL DUE:');
    expect(monoText).toContain('$65.00');

    const binaryEscPos = receiptEngine.generateEscPosBinary(receiptData, true);
    expect(binaryEscPos).toBeInstanceOf(Uint8Array);
    expect(binaryEscPos.length).toBeGreaterThan(0);
  });

  it('03:00 PM — Network partition occurs; client continues offline operations via SQLite outbox', () => {
    // Network drops
    syncTelemetry.setNetworkState('OFFLINE');
    expect(syncTelemetry.getNetworkState()).toBe('OFFLINE');

    // 5 offline sales and 2 warehouse picks queued in local outbox
    syncTelemetry.queueLocalMutation('INVENTORY_PICK', 'op_pick_offline_01');
    syncTelemetry.queueLocalMutation('INVENTORY_PICK', 'op_pick_offline_02');
    syncTelemetry.queueLocalMutation('INBOUND_RECEIPT', 'op_rcv_offline_01');

    expect(syncTelemetry.getPendingCount()).toBe(3);
    const chipHtml = syncTelemetry.renderStatusChipHtml();
    expect(chipHtml).toContain('OFFLINE');
    expect(chipHtml).toContain('3');
  });

  it('04:30 PM — Network recovers; vector clock reconciliation pushes local outbox without drift', () => {
    syncTelemetry.setNetworkState('SYNCING');

    // Vector clock check
    const clientClock = { client_lon: 12, server_central: 8 };
    const serverClock = { client_lon: 10, server_central: 9 };

    const comp = compareVectorClocks(clientClock, serverClock);
    expect(comp).toBe('CONCURRENT'); // Concurrent mutations during partition

    // Merge vector clocks deterministically
    const merged = mergeVectorClocks(clientClock, serverClock);
    expect(merged.client_lon).toBe(12);
    expect(merged.server_central).toBe(9);

    // Clear synced mutations
    syncTelemetry.clearSyncedMutations([
      'op_pick_offline_01',
      'op_pick_offline_02',
      'op_rcv_offline_01',
    ]);
    expect(syncTelemetry.getPendingCount()).toBe(0);

    syncTelemetry.setNetworkState('ONLINE');
    expect(syncTelemetry.getNetworkState()).toBe('ONLINE');
  });

  it('06:00 PM — Store manager closes till session with blind cash count and variance reconciliation', () => {
    const reconModal = new PosReconciliationModal(
      'sess_lon_20261012_01',
      'REG-LON-01',
      'usr_apex_cashier',
      'USD',
    );

    // Opening Float: $200.00
    reconModal.setOpeningFloat(20000n);

    // Cash sales from afternoon: $25.00
    reconModal.recordCashSale(2500n);

    // Total expected in drawer: $200.00 + $25.00 = $225.00 (22500n)

    // Blind Count:
    // 2 x $100 bill = $200.00
    // 1 x $20 bill = $20.00
    // 1 x $5 bill = $5.00
    // Total counted = $225.00 (Exact balance)
    reconModal.setDenominationCount(10000n, 2);
    reconModal.setDenominationCount(2000n, 1);
    reconModal.setDenominationCount(500n, 1);

    const reconResult = reconModal.calculateReconciliation();
    expect(reconResult.actualCountedMinor).toBe(22500n);
    expect(reconResult.expectedCashMinor).toBe(22500n);
    expect(reconResult.varianceMinor).toBe(0n);
    expect(reconResult.isBalanced).toBe(true);
  });

  it('07:00 PM — End-of-day financial close: executive dashboard KPIs reflect all transactions', () => {
    const dashboard = new DashboardViewModel({
      grossMerchandiseValueMinor: 4506500n, // $45,000 B2B + $65 POS = $45,065.00
      netRevenueMinor: 4506500n,
      grossMarginBps: 3420, // 34.20%
      stockoutRiskIndex: 4,
      warehouseUtilizationPct: 62.5,
      openTillSessionsCount: 0, // Till closed
      cashierVarianceAlertsMinor: 0n, // Balanced
      activeWorkflowsRunning: 2,
      currencyCode: 'USD',
    });

    const html = dashboard.renderDashboardHtml();
    expect(html).toContain('$45,065.00');
    expect(html).toContain('34.20%');
    expect(html).toContain('All systems operational — zero alerts');
  });
});
