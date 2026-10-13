import { describe, it, expect } from 'vitest';
import {
  brandColors,
  themeTokens,
  contrastRatio,
  isWcagAaaCompliant,
  generateCssVariables,
  generateCssVariableString,
  formatCurrencyMinor,
  calculatePosCartSummary,
  calculatePosPaymentState,
  POS_QUICK_KEYS,
  MOBILE_NAVIGATION_TABS,
  getBarcodeScanFeedback,
  sortPickingTasksByRoute,
  buildUserNavigation,
  searchNavigationShortcuts,
  MASTER_NAVIGATION_SECTIONS,
  type PosCartItem,
  type MobilePickTaskItem,
} from '../src/index.js';

describe('Phase 25 @stokrova/ui — Cross-Platform UI Shell Cohesion & Accessibility Suite', () => {
  describe('1. Universal Design Tokens & WCAG AAA Compliance Guarantee', () => {
    it('verifies primary Imperial Gold (#BD9652) and Charcoal Slate (#293136) token fidelity', () => {
      expect(brandColors.gold[500]).toBe('#BD9652');
      expect(brandColors.slate[800]).toBe('#293136');
    });

    it('guarantees WCAG AAA contrast ratio (>= 7.0:1) across both light and dark themes', () => {
      // Light Mode: textPrimary on background
      const lightRatio = contrastRatio(themeTokens.light.textPrimary, themeTokens.light.background);
      expect(lightRatio).toBeGreaterThanOrEqual(7.0);
      expect(isWcagAaaCompliant(themeTokens.light.textPrimary, themeTokens.light.background)).toBe(true);

      // Dark Mode: textPrimary on background
      const darkRatio = contrastRatio(themeTokens.dark.textPrimary, themeTokens.dark.background);
      expect(darkRatio).toBeGreaterThanOrEqual(7.0);
      expect(isWcagAaaCompliant(themeTokens.dark.textPrimary, themeTokens.dark.background)).toBe(true);

      // Contrast of card background on dark mode
      const cardTextRatio = contrastRatio(themeTokens.dark.textPrimary, themeTokens.dark.card);
      expect(cardTextRatio).toBeGreaterThanOrEqual(7.0);
    });

    it('generates consistent CSS variables for cross-platform injection', () => {
      const darkVars = generateCssVariables('dark');
      expect(darkVars['--stokrova-primary']).toBe('#BD9652');
      expect(darkVars['--stokrova-surface']).toBe('#1E2428');
      expect(darkVars['--stokrova-border']).toBe('#333D46');

      const css = generateCssVariableString('dark');
      expect(css).toContain('--stokrova-primary: #BD9652;');
      expect(css).toContain('--stokrova-bg: #161B1E;');
    });
  });

  describe('2. Pure Minor Unit Currency Formatting Across Currencies (Rule 26)', () => {
    it('formats pure integer minor units into locale-aware currency strings without floats', () => {
      expect(formatCurrencyMinor(0n, 'USD')).toBe('$0.00');
      expect(formatCurrencyMinor(4900n, 'USD')).toBe('$49.00');
      expect(formatCurrencyMinor(19999n, 'USD')).toBe('$199.99');
      expect(formatCurrencyMinor(1000000n, 'USD')).toBe('$10,000.00');

      // Negative values
      expect(formatCurrencyMinor(-2500n, 'USD')).toBe('-$25.00');
    });
  });

  describe('3. POS High-Speed Checkout Calculation & Hotkeys (Phase 23)', () => {
    it('evaluates F1-F12 keyboard shortcuts for touch-free cash register operation', () => {
      const keyMap = new Map(POS_QUICK_KEYS.map((k) => [k.key, k.label]));
      expect(keyMap.get('F1')).toBe('Search Item');
      expect(keyMap.get('F2')).toBe('Select Customer');
      expect(keyMap.get('F4')).toBe('Discount');
      expect(keyMap.get('F7')).toBe('Hold Sale');
      expect(keyMap.get('F8')).toBe('Recall Sale');
      expect(keyMap.get('F9')).toBe('Open Drawer');
      expect(keyMap.get('F12')).toBe('Pay / Tender');
      expect(keyMap.get('Escape')).toBe('Cancel Ticket');
    });

    it('calculates complex split tender payment with exact change in minor units', () => {
      const cart: PosCartItem[] = [
        {
          id: 'item_1',
          variantId: 'var_drill',
          sku: 'SKU-001',
          title: 'Heavy Duty Power Drill',
          unitPriceMinor: 14900n, // $149.00
          quantity: 2, // $298.00 gross
          discountMinor: 1000n, // $10.00 discount
          taxMinor: 2384n, // 8% tax
        },
      ];

      const summary = calculatePosCartSummary(cart);
      expect(summary.subtotalMinor).toBe(29800n);
      expect(summary.totalDiscountMinor).toBe(1000n);
      expect(summary.totalTaxMinor).toBe(2384n);
      expect(summary.grandTotalMinor).toBe(31184n); // 29800 - 1000 + 2384 = $311.84

      // Split payments: $200.00 Card + $120.00 Cash = $320.00 tendered
      const payments = [
        { tenderType: 'CARD' as const, amountMinor: 20000n, reference: 'card_auth_01' },
        { tenderType: 'CASH' as const, amountMinor: 12000n },
      ];

      const state = calculatePosPaymentState(summary.grandTotalMinor, payments);
      expect(state.totalTenderedMinor).toBe(32000n);
      expect(state.remainingDueMinor).toBe(0n);
      expect(state.changeDueMinor).toBe(816n); // $320.00 - $311.84 = $8.16
      expect(state.isFullySettled).toBe(true);
      expect(formatCurrencyMinor(state.changeDueMinor, 'USD')).toBe('$8.16');
    });
  });

  describe('4. Mobile Warehouse Handheld Sensory Feedback & Serpentine Routing', () => {
    it('provides distinct audio frequencies, durations, and haptic vibrations for scanner feedback', () => {
      const success = getBarcodeScanFeedback('SUCCESS');
      expect(success.toneFrequencyHz).toBe(1800);
      expect(success.toneDurationMs).toBe(80);
      expect(success.hapticPatternMs).toEqual([40]);
      expect(success.visualBorderColor).toBe('#16A34A');

      const warning = getBarcodeScanFeedback('WARNING');
      expect(warning.toneFrequencyHz).toBe(880);
      expect(warning.visualBorderColor).toBe('#D97706');

      const error = getBarcodeScanFeedback('ERROR');
      expect(error.toneFrequencyHz).toBe(260);
      expect(error.visualBorderColor).toBe('#DC2626');
    });

    it('sorts wave picking tasks along an optimized serpentine warehouse route', () => {
      const tasks: MobilePickTaskItem[] = [
        {
          lineId: 'line_4',
          sku: 'SKU-04',
          barcode: '400',
          productName: 'Item 4',
          binLocationCode: 'ZONE-A-RACK-04-BIN-1',
          routeSequenceIndex: 4,
          quantityRequired: 5,
          quantityPicked: 0,
          isComplete: false,
        },
        {
          lineId: 'line_1',
          sku: 'SKU-01',
          barcode: '100',
          productName: 'Item 1',
          binLocationCode: 'ZONE-A-RACK-01-BIN-1',
          routeSequenceIndex: 1,
          quantityRequired: 2,
          quantityPicked: 2,
          isComplete: true, // Complete tasks pushed to end
        },
        {
          lineId: 'line_2',
          sku: 'SKU-02',
          barcode: '200',
          productName: 'Item 2',
          binLocationCode: 'ZONE-A-RACK-02-BIN-1',
          routeSequenceIndex: 2,
          quantityRequired: 1,
          quantityPicked: 0,
          isComplete: false,
        },
      ];

      const sorted = sortPickingTasksByRoute(tasks);
      expect(sorted[0]?.lineId).toBe('line_2'); // Incomplete task with route sequence 2
      expect(sorted[1]?.lineId).toBe('line_4'); // Incomplete task with route sequence 4
      expect(sorted[2]?.lineId).toBe('line_1'); // Complete task sorted last
    });

    it('provides ergonomic 4-tab thumb-zone navigation bar for mobile handhelds', () => {
      expect(MOBILE_NAVIGATION_TABS.map((t) => t.id)).toEqual(['scan', 'pick', 'receive', 'audit']);
    });
  });

  describe('5. Master 12-Domain Navigation & Quick Global Search (Cmd+K)', () => {
    it('filters master navigation items based on user RBAC permission codes', () => {
      // Cashier permissions: commerce accessible, manufacturing/finance inaccessible
      const cashierNav = buildUserNavigation(['pos.transact', 'sales.read']);
      const cashierSections = cashierNav.map((s) => s.id);
      expect(cashierSections).toContain('commerce');
      expect(cashierSections).not.toContain('manufacturing');
      expect(cashierSections).not.toContain('finance');

      // Admin all permissions
      const adminNav = buildUserNavigation(['*']);
      expect(adminNav.length).toBeGreaterThanOrEqual(7);
    });

    it('searches navigation shortcuts accurately for Cmd+K launcher', () => {
      const results = searchNavigationShortcuts('inventory', MASTER_NAVIGATION_SECTIONS);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.label.toLowerCase()).toContain('stock');
    });
  });
});
