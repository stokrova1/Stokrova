import { describe, it, expect } from 'vitest';
import {
  MobileRoleRouter,
  MobileCashierTillViewModel,
  type AuthenticatedUserProfile,
} from '../src/index.js';

describe('Phase 28 — Mobile Single App Dynamic Role Router & Sub-Tabs', () => {
  it('detects user role and activates role-specific sub-controller', () => {
    // Owner Profile
    const ownerProfile: AuthenticatedUserProfile = {
      userId: 'usr_owner',
      userName: 'Alexander Vance',
      roleCode: 'BUSINESS_OWNER',
      tenantId: 'ten_01',
      tenantName: 'Vance Industrial Corp',
      branchName: 'Berlin Central Depot',
    };

    const ownerRouter = new MobileRoleRouter(ownerProfile);
    expect(ownerRouter.executiveVm).toBeDefined();
    expect(ownerRouter.cashierVm).toBeUndefined();
    expect(ownerRouter.pickerVm).toBeUndefined();

    // Check sub-tabs for owner (preventing screen overcrowding)
    const ownerTabs = ownerRouter.getRoleSubTabs();
    expect(ownerTabs.map((t) => t.id)).toEqual(['revenue', 'floor', 'alerts']);

    // Cashier Profile
    const cashierProfile: AuthenticatedUserProfile = {
      userId: 'usr_cashier',
      userName: 'Elena Rostova',
      roleCode: 'CASHIER',
      tenantId: 'ten_01',
      tenantName: 'Vance Industrial Corp',
      branchName: 'Berlin Central Depot',
    };

    const cashierRouter = new MobileRoleRouter(cashierProfile);
    expect(cashierRouter.cashierVm).toBeDefined();
    expect(cashierRouter.executiveVm).toBeUndefined();
    const cashierTabs = cashierRouter.getRoleSubTabs();
    expect(cashierTabs.map((t) => t.id)).toEqual(['till', 'cart', 'history']);

    // Warehouse Picker Profile
    const pickerProfile: AuthenticatedUserProfile = {
      userId: 'usr_picker',
      userName: 'Marco Chen',
      roleCode: 'WAREHOUSE_PICKER',
      tenantId: 'ten_01',
      tenantName: 'Vance Industrial Corp',
      branchName: 'Berlin Central Depot',
    };

    const pickerRouter = new MobileRoleRouter(pickerProfile);
    expect(pickerRouter.pickerVm).toBeDefined();
    const pickerTabs = pickerRouter.getRoleSubTabs();
    expect(pickerTabs.map((t) => t.id)).toEqual(['route', 'bins', 'exceptions']);
  });

  it('renders fresh, concise headers with zero technical jargon', () => {
    const profile: AuthenticatedUserProfile = {
      userId: 'usr_cashier',
      userName: 'Elena Rostova',
      roleCode: 'CASHIER',
      tenantId: 'ten_01',
      tenantName: 'Vance Industrial Corp',
      branchName: 'Berlin Central Depot',
    };

    const router = new MobileRoleRouter(profile);
    const headerHtml = router.renderFreshHeaderHtml();

    // Verify concise, beautiful headers
    expect(headerHtml).toContain('Vance Industrial Corp');
    expect(headerHtml).toContain('Berlin Central Depot');
    expect(headerHtml).toContain('Elena Rostova');
    expect(headerHtml).toContain('CASHIER');
    expect(headerHtml).toContain('● Online');

    // Confirm absence of jargon/clutter
    expect(headerHtml).not.toContain('OP-4409');
    expect(headerHtml).not.toContain('LATENCY');
    expect(headerHtml).not.toContain('BUFFER: 0 PENDING');

    // Sub-tab bar
    const subTabBar = router.renderSubTabBarHtml();
    expect(subTabBar).toContain('Till & Scan');
    expect(subTabBar).toContain('Cart');
    expect(subTabBar).toContain('Shift Sales');

  });

  it('operates MobileCashierTillViewModel cart and tender lifecycle cleanly', () => {
    const till = new MobileCashierTillViewModel('TILL-01');
    expect(till.getActiveSubTab()).toBe('till');
    expect(till.getCart()).toHaveLength(0);

    // Add items
    till.addToCart({ sku: 'SKU-01', productName: 'Hex Bolts M12', unitPriceMinor: 2500 }, 2);
    till.addToCart({ sku: 'SKU-02', productName: 'Safety Gloves XL', unitPriceMinor: 4000 }, 1);

    expect(till.getCartItemCount()).toBe(3);
    // (2500 * 2) + (4000 * 1) = 5000 + 4000 = 9000 minor ($90.00)
    expect(till.getCartTotalMinor()).toBe(9000);

    // Switch sub-tab
    till.setSubTab('cart');
    expect(till.getActiveSubTab()).toBe('cart');

    // Tender sale
    const receipt = till.tenderSale('CASH');
    expect(receipt.totalMinor).toBe(9000);
    expect(receipt.paymentMethod).toBe('CASH');
    expect(till.getCart()).toHaveLength(0);
    expect(till.getOrderHistory()).toHaveLength(1);
    expect(till.getActiveSubTab()).toBe('till');
  });
});
