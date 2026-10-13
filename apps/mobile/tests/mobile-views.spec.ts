import { describe, it, expect } from 'vitest';
import {
  MobileViewfinderViewModel,
  MobilePickRouteViewModel,
  MobileReceivingViewModel,
  MobileCycleCountViewModel,
  MobileSyncTelemetryViewModel,
} from '../src/index.js';

describe('Phase 26C @stokrova/mobile — Handheld Warehouse Suite', () => {
  describe('MobileViewfinderViewModel', () => {
    it('manages camera torch toggle, auto-detects 1D/2D symbologies, and triggers sensory feedback', () => {
      const vf = new MobileViewfinderViewModel();

      // Torch toggle
      expect(vf.isTorchOn()).toBe(false);
      expect(vf.toggleTorch()).toBe(true);
      expect(vf.isTorchOn()).toBe(true);

      // Symbology detection
      expect(vf.detectSymbology('012345678905')).toBe('UPC_A');
      expect(vf.detectSymbology('5012345678901')).toBe('EAN_13');
      expect(vf.detectSymbology('SKU-10029-A')).toBe('CODE_128');
      expect(vf.detectSymbology('(01)00123456789012(10)LOT99')).toBe('GS1_128');
      expect(vf.detectSymbology('STOKROVA:BIN:A-01-02')).toBe('QR_CODE');

      // Record successful scan
      const scan1 = vf.recordScan('012345678905', 'SUCCESS');
      expect(scan1.symbology).toBe('UPC_A');
      expect(scan1.feedback.type).toBe('SUCCESS');
      expect(scan1.feedback.visualBorderColor).toBe('#16A34A');
      expect(scan1.feedback.toneFrequencyHz).toBe(1800);

      // Record warning scan (out of sequence)
      const scan2 = vf.recordScan('SKU-10029-A', 'WARNING');
      expect(scan2.feedback.type).toBe('WARNING');
      expect(vf.getScanHistory()).toHaveLength(2);

      // HTML Render
      const html = vf.renderViewfinderOverlayHtml();
      expect(html).toContain('Torch: ON');
      expect(html).toContain('reticle-box');
      expect(html).toContain('laser-beam');
    });
  });

  describe('MobilePickRouteViewModel', () => {
    it('sequences S-route serpentine traversal, confirms picks, and reports short-pick exceptions', () => {
      const wave = new MobilePickRouteViewModel('WAVE-2026-88', [
        {
          lineId: 'l2',
          sku: 'SKU-02',
          barcode: '222',
          productName: 'Heavy Bolts Box',
          binLocationCode: 'Aisle 1 / Bay 3 / Bin A',
          routeSequenceIndex: 2,
          quantityRequired: 5,
          quantityPicked: 0,
          isComplete: false,
        },
        {
          lineId: 'l1',
          sku: 'SKU-01',
          barcode: '111',
          productName: 'Micro Fasteners',
          binLocationCode: 'Aisle 1 / Bay 1 / Bin B',
          routeSequenceIndex: 1,
          quantityRequired: 10,
          quantityPicked: 0,
          isComplete: false,
        },
      ]);

      // Route sequencing (Aisle 1 Bay 1 before Bay 3)
      const sorted = wave.getTasksSorted();
      expect(sorted[0]?.sku).toBe('SKU-01');
      expect(sorted[1]?.sku).toBe('SKU-02');

      // Active target task
      const target = wave.getActiveTargetTask();
      expect(target?.sku).toBe('SKU-01');

      // Pick confirmation
      wave.confirmPickQuantity('l1', 10);
      expect(wave.getProgress().completedTasks).toBe(1);
      expect(wave.getProgress().percentage).toBe(50);

      // Second target is now SKU-02
      expect(wave.getActiveTargetTask()?.sku).toBe('SKU-02');

      // Report short pick on SKU-02 (found only 3 out of 5; damaged stock)
      wave.confirmPickQuantity('l2', 3);
      const ex = wave.reportShortPick('l2', 2, 'DAMAGED_STOCK');
      expect(ex.quantityShort).toBe(2);
      expect(ex.reason).toBe('DAMAGED_STOCK');

      // Wave should now be 100% complete
      expect(wave.getProgress().isWaveFinished).toBe(true);
      expect(wave.getExceptions()).toHaveLength(1);

      // HTML Render
      const html = wave.renderPickRouteHtml();
      expect(html).toContain('WAVE-2026-88');
      expect(html).toContain('Wave Pick Complete');
    });
  });

  describe('MobileReceivingViewModel', () => {
    it('generates GS1 SSCC-18 pallet numbers and verifies inbound PO quantities with FEFO metadata', () => {
      const recv = new MobileReceivingViewModel('PO-2026-700', 'Apex Suppliers Ltd', [
        {
          poLineId: 'po_l1',
          sku: 'MED-SOLUTION-100',
          productName: 'Sterile Solution 100ml',
          expectedUnits: 100,
          receivedUnits: 0,
          targetBinLocationCode: 'INBOUND-DOCK-01',
          isInspected: false,
        },
      ]);

      // GS1 SSCC-18 generation
      const sscc = recv.generateSscc18('1234567', 42);
      expect(sscc).toHaveLength(18);
      expect(sscc.startsWith('01234567000000042')).toBe(true);

      // Receive line with lot and expiry
      const line = recv.recordLineReceipt(
        'po_l1',
        100,
        'LOT-2026-99',
        '2027-06-30T00:00:00Z',
        'INBOUND-DOCK-01',
        sscc,
      );
      expect(line.isInspected).toBe(true);
      expect(line.lotNumber).toBe('LOT-2026-99');
      expect(line.ssccPalletId).toBe(sscc);

      const summary = recv.getReceivingSummary();
      expect(summary.totalReceived).toBe(100);
      expect(summary.hasDiscrepancies).toBe(false);

      // HTML Render
      const html = recv.renderReceivingHtml();
      expect(html).toContain('PO-2026-700');
      expect(html).toContain('LOT-2026-99');
    });
  });

  describe('MobileCycleCountViewModel', () => {
    it('conducts location-guided blind physical counts and escalates discrepancies above tolerance', () => {
      const cc = new MobileCycleCountViewModel('BATCH-AUDIT-01', [
        {
          taskId: 't1',
          binLocationCode: 'AISLE-02-B-01',
          sku: 'VALVE-90',
          productName: 'Brass Gate Valve',
          theoreticalStock: 20,
          requiresSupervisorApproval: false,
          status: 'PENDING',
        },
      ]);

      expect(cc.getNextPendingTask()?.sku).toBe('VALVE-90');

      // Operator counts 15 (shortage of 5 units > tolerance of 2)
      const res = cc.submitBlindCount('t1', 15);
      expect(res.varianceUnits).toBe(-5);
      expect(res.requiresSupervisorApproval).toBe(true);
      expect(res.status).toBe('COUNTED');

      const summary = cc.getSummary();
      expect(summary.discrepancyCount).toBe(1);
      expect(summary.requiresApprovalCount).toBe(1);

      // HTML Render
      const html = cc.renderCycleCountHtml();
      expect(html).toContain('BATCH-AUDIT-01');
      expect(html).toContain('Approvals: 1');
    });
  });

  describe('MobileSyncTelemetryViewModel', () => {
    it('tracks offline mutation queue depth, network states, and vector clock conflict alerts', () => {
      const sync = new MobileSyncTelemetryViewModel('OFFLINE');
      expect(sync.getNetworkState()).toBe('OFFLINE');

      // Queue 3 offline picker mutations
      const op1 = sync.queueLocalMutation('INVENTORY_PICK', 'op_pick_1');
      sync.queueLocalMutation('INVENTORY_PICK', 'op_pick_2');
      sync.queueLocalMutation('CYCLE_COUNT', 'op_count_1');
      expect(sync.getPendingCount()).toBe(3);

      // Record a vector clock conflict
      sync.recordConflict({
        entityId: 'SKU-VALVE-90',
        conflictType: 'VECTOR_CLOCK_DIVERGENCE',
        serverTimestampIso: new Date().toISOString(),
        localTimestampIso: new Date().toISOString(),
        resolutionStrategy: 'EXCEPTION_WORKFLOW',
      });
      expect(sync.getConflicts()).toHaveLength(1);

      // Network recovers to SYNCING then ONLINE
      sync.setNetworkState('SYNCING');
      expect(sync.renderStatusChipHtml()).toContain('SYNCING');

      // Mutations acknowledged
      sync.clearSyncedMutations([op1.operationId]);
      expect(sync.getPendingCount()).toBe(2);

      sync.setNetworkState('ONLINE');
      const drawerHtml = sync.renderTelemetryDrawerHtml();
      expect(drawerHtml).toContain('VECTOR_CLOCK_DIVERGENCE');
      expect(drawerHtml).toContain('Queue Depth: <strong>2 mutations</strong>');
    });
  });
});
