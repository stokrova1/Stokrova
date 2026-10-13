import { describe, it, expect } from 'vitest';
import { MobileWarehouseShell } from '../src/index.js';

describe('Phase 23 @stokrova/mobile — Warehouse Handheld Suite', () => {
  const baseConfig = {
    warehouseId: 'wh_distribution_01',
    warehouseName: 'Central Logistics Hub',
    operatorId: 'user_picker_12',
    operatorName: 'Marcus Cole',
    initialTab: 'scan' as const,
  };

  const getSampleTasks = () => [
    {
      lineId: 'pick_1',
      sku: 'SKU-BOLT-M8',
      barcode: '9312345678901',
      productName: 'M8 Hex Bolts 100pk',
      binLocationCode: 'ZONE-A-RACK-03-BIN-1',
      routeSequenceIndex: 3,
      quantityRequired: 5,
      quantityPicked: 0,
      isComplete: false,
    },
    {
      lineId: 'pick_2',
      sku: 'SKU-WRENCH-10',
      barcode: '9312345678902',
      productName: '10mm Metric Wrench',
      binLocationCode: 'ZONE-A-RACK-01-BIN-2',
      routeSequenceIndex: 1,
      quantityRequired: 2,
      quantityPicked: 0,
      isComplete: false,
    },
  ];

  it('initializes tab state and manages thumb-zone navigation', () => {
    const mobile = new MobileWarehouseShell(baseConfig);
    expect(mobile.getActiveTab()).toBe('scan');

    mobile.setActiveTab('pick');
    expect(mobile.getActiveTab()).toBe('pick');

    const tabs = mobile.getNavigationTabs();
    expect(tabs.map((t) => t.id)).toEqual(['scan', 'pick', 'receive', 'audit']);
  });

  it('orders picking wave tasks by serpentine route', () => {
    const mobile = new MobileWarehouseShell(baseConfig);
    mobile.loadPickWave(getSampleTasks());

    const ordered = mobile.getOrderedPickTasks();
    expect(ordered[0]?.lineId).toBe('pick_2'); // sequence 1 before sequence 3
    expect(ordered[1]?.lineId).toBe('pick_1');

    const next = mobile.getNextActivePickTask();
    expect(next?.sku).toBe('SKU-WRENCH-10');
  });

  it('evaluates barcode scanning and triggers sensory feedback profile', () => {
    const mobile = new MobileWarehouseShell(baseConfig);
    mobile.loadPickWave(getSampleTasks());

    // Scenario A: Exact expected item scan -> SUCCESS
    const scanA = mobile.processBarcodeScan('9312345678902');
    expect(scanA.feedback.type).toBe('SUCCESS');
    expect(scanA.feedback.toneFrequencyHz).toBe(1800);
    expect(scanA.matchedTask?.sku).toBe('SKU-WRENCH-10');

    // Scenario B: Item in wave but wrong sequence -> WARNING
    const scanB = mobile.processBarcodeScan('9312345678901');
    expect(scanB.feedback.type).toBe('WARNING');
    expect(scanB.feedback.toneFrequencyHz).toBe(880);

    // Scenario C: Unknown barcode -> ERROR
    const scanC = mobile.processBarcodeScan('UNKNOWN-BARCODE-999');
    expect(scanC.feedback.type).toBe('ERROR');
    expect(scanC.feedback.toneFrequencyHz).toBe(260);

    expect(mobile.getScanHistory()).toHaveLength(3);
  });

  it('confirms pick progress and tracks local outbox mutations', () => {
    const mobile = new MobileWarehouseShell(baseConfig);
    mobile.loadPickWave(getSampleTasks());

    expect(mobile.getPendingOutboxCount()).toBe(0);

    // Pick 1 of 2
    const res1 = mobile.confirmPick('pick_2', 1);
    expect(res1.isComplete).toBe(false);
    expect(mobile.getPendingOutboxCount()).toBe(1);

    // Pick remaining 1 of 2
    const res2 = mobile.confirmPick('pick_2', 1);
    expect(res2.isComplete).toBe(true);
    expect(mobile.getPendingOutboxCount()).toBe(2);

    // Next item in sequence is now pick_1
    const next = mobile.getNextActivePickTask();
    expect(next?.lineId).toBe('pick_1');
  });

  it('renders mobile handheld shell HTML layout with viewfinder and thumb-bar', () => {
    const mobile = new MobileWarehouseShell(baseConfig);
    mobile.loadPickWave(getSampleTasks());

    const html = mobile.renderMobileShellHtml();
    expect(html).toContain('stokrova-mobile-shell');
    expect(html).toContain('Central Logistics Hub');
    expect(html).toContain('Marcus Cole');
    expect(html).toContain('scanner-viewfinder-overlay');
    expect(html).toContain('ZONE-A-RACK-01-BIN-2');
    expect(html).toContain('thumb-zone-bottom-bar');
  });
});
