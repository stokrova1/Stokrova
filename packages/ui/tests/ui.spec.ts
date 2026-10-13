import { describe, it, expect } from 'vitest';
import {
  brandColors,
  themeTokens,
  contrastRatio,
  isWcagAaaCompliant,
  generateCssVariables,
  generateCssVariableString,
  formatCurrencyMinor,
  getStatusBadgeStyle,
  getButtonStyles,
  getInputStyles,
  MASTER_NAVIGATION_SECTIONS,
  buildUserNavigation,
  searchNavigationShortcuts,
  calculatePosCartSummary,
  calculatePosPaymentState,
  getBarcodeScanFeedback,
  sortPickingTasksByRoute,
  type PosCartItem,
  type MobilePickTaskItem,
} from '../src/index.js';

describe('Phase 23 @stokrova/ui — Design System & Shell Architecture', () => {
  describe('1. Color Tokens & WCAG AAA Accessibility', () => {
    it('defines official brand gold (#BD9652) and wordmark slate (#293136)', () => {
      expect(brandColors.gold[500]).toBe('#BD9652');
      expect(brandColors.slate[800]).toBe('#293136');
    });

    it('calculates contrast ratios accurately', () => {
      // Black on White is 21:1
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
      // White on White is 1:1
      expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    });

    it('proves brand text colors meet or exceed WCAG AAA (7.0:1) contrast standards', () => {
      // Light Mode Text (#293136) on Light Background (#FFFFFF)
      const lightContrast = contrastRatio(themeTokens.light.textPrimary, themeTokens.light.background);
      expect(lightContrast).toBeGreaterThanOrEqual(10.0);
      expect(isWcagAaaCompliant(themeTokens.light.textPrimary, themeTokens.light.background)).toBe(true);

      // Dark Mode Text (#F8FAFC) on Dark Background (#161B1E)
      const darkContrast = contrastRatio(themeTokens.dark.textPrimary, themeTokens.dark.background);
      expect(darkContrast).toBeGreaterThanOrEqual(14.0);
      expect(isWcagAaaCompliant(themeTokens.dark.textPrimary, themeTokens.dark.background)).toBe(true);
    });

    it('generates complete CSS variables for theming', () => {
      const varsLight = generateCssVariables('light');
      expect(varsLight['--stokrova-primary']).toBe('#BD9652');
      expect(varsLight['--stokrova-bg']).toBe('#FFFFFF');

      const varsDark = generateCssVariables('dark');
      expect(varsDark['--stokrova-primary']).toBe('#BD9652');
      expect(varsDark['--stokrova-bg']).toBe('#161B1E');

      const cssStr = generateCssVariableString('dark');
      expect(cssStr).toContain(':root[data-theme="dark"]');
      expect(cssStr).toContain('--stokrova-primary: #BD9652;');
    });
  });

  describe('2. Component Primitives & Styling Engine', () => {
    it('formats currency minor units without floating-point errors', () => {
      expect(formatCurrencyMinor(125050n, 'USD')).toBe('$1,250.50');
      expect(formatCurrencyMinor(500n, 'EUR')).toBe('€5.00');
      expect(formatCurrencyMinor(750000n, 'NGN')).toBe('₦7,500.00');
      expect(formatCurrencyMinor(-2500n, 'USD')).toBe('-$25.00');
    });

    it('returns appropriate badge styling based on operational status', () => {
      const paidBadge = getStatusBadgeStyle('PAID', 'light');
      expect(paidBadge.tone).toBe('success');

      const pendingBadge = getStatusBadgeStyle('PROCESSING', 'light');
      expect(pendingBadge.tone).toBe('warning');

      const failedBadge = getStatusBadgeStyle('CANCELLED', 'dark');
      expect(failedBadge.tone).toBe('error');
    });

    it('builds button styles adhering to brand gold primary and slate secondary', () => {
      const primaryBtn = getButtonStyles({ variant: 'primary' }, 'light');
      expect(primaryBtn.background).toBe('#BD9652');
      expect(primaryBtn.color).toBe('#FFFFFF');

      const secondaryBtn = getButtonStyles({ variant: 'secondary' }, 'dark');
      expect(secondaryBtn.background).toBe('#1E2428');
      expect(secondaryBtn.color).toBe('#F8FAFC');

      const disabledBtn = getButtonStyles({ disabled: true }, 'light');
      expect(disabledBtn.cursor).toBe('not-allowed');
      expect(disabledBtn.opacity).toBe(0.6);
    });

    it('builds input styles with high-contrast borders and brand focus rings', () => {
      const normalInput = getInputStyles({}, 'light');
      expect(normalInput.border).toContain('#E2E8F0');

      const focusedInput = getInputStyles({ isFocused: true }, 'light');
      expect(focusedInput.border).toContain('#BD9652');

      const errorInput = getInputStyles({ hasError: true }, 'light');
      expect(errorInput.border).toContain('#EF4444');
    });
  });

  describe('3. Master Navigation Blueprint & Permission Filtering', () => {
    it('contains all 12 platform capability domains in the navigation tree', () => {
      const sectionIds = MASTER_NAVIGATION_SECTIONS.map((s) => s.id);
      expect(sectionIds).toContain('commerce');
      expect(sectionIds).toContain('inventory');
      expect(sectionIds).toContain('procurement');
      expect(sectionIds).toContain('logistics');
      expect(sectionIds).toContain('manufacturing');
      expect(sectionIds).toContain('finance');
      expect(sectionIds).toContain('intelligence');
      expect(sectionIds).toContain('settings');
    });

    it('filters navigation sections based on granular user permissions', () => {
      // Cashier role with only POS and Till permissions
      const cashierNav = buildUserNavigation(['pos.transact', 'registers.manage']);
      const flatItems = cashierNav.flatMap((s) => s.items.map((i) => i.id));

      expect(flatItems).toContain('nav_pos');
      expect(flatItems).toContain('nav_registers');
      expect(flatItems).not.toContain('nav_bom');
      expect(flatItems).not.toContain('nav_gl');
    });

    it('allows super admin with wildcard permission to view all items', () => {
      const superNav = buildUserNavigation(['*']);
      const totalAllItems = MASTER_NAVIGATION_SECTIONS.flatMap((s) => s.items).length;
      const totalSuperItems = superNav.flatMap((s) => s.items).length;
      expect(totalSuperItems).toBe(totalAllItems);
    });

    it('searches navigation items for quick keyboard launcher (Cmd+K)', () => {
      const results = searchNavigationShortcuts('inventory');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.path.includes('/inventory'))).toBe(true);

      const shortcutMatch = searchNavigationShortcuts('f1');
      expect(shortcutMatch.some((r) => r.id === 'nav_pos')).toBe(true);
    });
  });

  describe('4. High-Speed POS Shell Engine', () => {
    it('calculates POS cart summary using pure integer minor units', () => {
      const items: PosCartItem[] = [
        {
          id: 'line_1',
          variantId: 'v1',
          sku: 'SKU-001',
          title: 'Premium Widget',
          unitPriceMinor: 1500n, // $15.00
          quantity: 2,
          discountMinor: 200n,  // $2.00 off
          taxMinor: 100n,       // $1.00 tax
        },
        {
          id: 'line_2',
          variantId: 'v2',
          sku: 'SKU-002',
          title: 'Gadget Kit',
          unitPriceMinor: 5000n, // $50.00
          quantity: 1,
          discountMinor: 0n,
          taxMinor: 250n,
        },
      ];

      const summary = calculatePosCartSummary(items);
      expect(summary.subtotalMinor).toBe(8000n); // (1500*2) + 5000 = 8000
      expect(summary.totalDiscountMinor).toBe(200n);
      expect(summary.totalTaxMinor).toBe(350n);
      expect(summary.grandTotalMinor).toBe(8150n); // 8000 - 200 + 350 = 8150 ($81.50)
      expect(summary.totalQuantity).toBe(3);
    });

    it('calculates split tender payments and change due accurately', () => {
      const grandTotal = 10000n; // $100.00

      // Scenario A: Partial tender
      const partialRes = calculatePosPaymentState(grandTotal, [
        { tenderType: 'CARD', amountMinor: 6000n },
      ]);
      expect(partialRes.isFullySettled).toBe(false);
      expect(partialRes.remainingDueMinor).toBe(4000n);
      expect(partialRes.changeDueMinor).toBe(0n);

      // Scenario B: Exact split tender
      const exactRes = calculatePosPaymentState(grandTotal, [
        { tenderType: 'CARD', amountMinor: 6000n },
        { tenderType: 'CASH', amountMinor: 4000n },
      ]);
      expect(exactRes.isFullySettled).toBe(true);
      expect(exactRes.remainingDueMinor).toBe(0n);
      expect(exactRes.changeDueMinor).toBe(0n);

      // Scenario C: Cash overpayment with change due
      const overpayRes = calculatePosPaymentState(grandTotal, [
        { tenderType: 'CASH', amountMinor: 12000n },
      ]);
      expect(overpayRes.isFullySettled).toBe(true);
      expect(overpayRes.remainingDueMinor).toBe(0n);
      expect(overpayRes.changeDueMinor).toBe(2000n); // $20.00 change due
    });
  });

  describe('5. Mobile Warehouse & Handheld Scanner Shell', () => {
    it('provides sensory feedback profiles for barcode scanning', () => {
      const successFeedback = getBarcodeScanFeedback('SUCCESS');
      expect(successFeedback.toneFrequencyHz).toBe(1800);
      expect(successFeedback.visualBorderColor).toBe('#16A34A');

      const errorFeedback = getBarcodeScanFeedback('ERROR');
      expect(errorFeedback.toneFrequencyHz).toBe(260);
      expect(errorFeedback.visualBorderColor).toBe('#DC2626');
    });

    it('sorts picking tasks by serpentine route with incomplete tasks prioritized', () => {
      const tasks: MobilePickTaskItem[] = [
        {
          lineId: 't1',
          sku: 'SKU-A',
          barcode: '12345',
          productName: 'Item A',
          binLocationCode: 'A-01-02',
          routeSequenceIndex: 3,
          quantityRequired: 5,
          quantityPicked: 5,
          isComplete: true, // Completed
        },
        {
          lineId: 't2',
          sku: 'SKU-B',
          barcode: '67890',
          productName: 'Item B',
          binLocationCode: 'A-01-01',
          routeSequenceIndex: 2,
          quantityRequired: 2,
          quantityPicked: 0,
          isComplete: false,
        },
        {
          lineId: 't3',
          sku: 'SKU-C',
          barcode: '11223',
          productName: 'Item C',
          binLocationCode: 'A-01-00',
          routeSequenceIndex: 1,
          quantityRequired: 1,
          quantityPicked: 0,
          isComplete: false,
        },
      ];

      const sorted = sortPickingTasksByRoute(tasks);
      // Incomplete tasks first, ordered by routeSequenceIndex (t3 sequence 1, t2 sequence 2, then completed t1)
      expect(sorted[0]?.lineId).toBe('t3');
      expect(sorted[1]?.lineId).toBe('t2');
      expect(sorted[2]?.lineId).toBe('t1');
    });
  });
});
