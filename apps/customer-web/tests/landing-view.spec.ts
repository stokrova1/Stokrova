import { describe, it, expect } from 'vitest';
import { LandingViewModel } from '../src/landing-view.js';
import { formatCurrencyMinor } from '@stokrova/ui';

describe('LandingViewModel & Customer Portal Suite (@stokrova/customer-web)', () => {
  it('initializes with default dark theme and returns 3 pricing tiers', () => {
    const view = new LandingViewModel('dark');
    const plans = view.getPricingPlans();

    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.id)).toEqual(['starter', 'growth', 'enterprise']);

    const growth = plans.find((p) => p.id === 'growth')!;
    expect(growth.recommended).toBe(true);
    expect(growth.monthlyPriceMinor).toBe(14900n);
    expect(formatCurrencyMinor(growth.monthlyPriceMinor, growth.currency)).toBe('$149.00');
  });

  it('renders header HTML with brand logo and authentication buttons', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderHeaderHtml();

    expect(html).toContain('STOKROVA');
    expect(html).toContain('Staff Sign In');
    expect(html).toContain('Register Your Business');
    expect(html).toContain('window.stokrovaCustomerApp.openLoginModal()');
    expect(html).toContain('window.stokrovaCustomerApp.openRegisterModal()');
  });

  it('renders hero section with multi-tenant assurance and free trial CTA', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderHeroHtml();

    expect(html).toContain('One Unified Operating System for Stores, Warehouses & Finance');
    expect(html).toContain('Start 14-Day Free Trial');
    expect(html).toContain('Rule 21');
    expect(html).toContain('Offline-First POS');
  });

  it('renders features grid covering all core commerce capabilities', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderFeaturesGridHtml();

    expect(html).toContain('Multi-Branch & Inter-Store Transfers');
    expect(html).toContain('Offline-Tolerant Point of Sale');
    expect(html).toContain('Authoritative FEFO & Serial Lot Control');
    expect(html).toContain('Immutable Double-Entry Ledger');
    expect(html).toContain('Visual DAG Workflow Automation');
  });

  it('renders self-service registration modal with all required tenant fields', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderRegisterModalHtml();

    expect(html).toContain('BUSINESS / COMPANY LEGAL NAME');
    expect(html).toContain('WORKSPACE SLUG (SUBDOMAIN)');
    expect(html).toContain('BASE CURRENCY');
    expect(html).toContain('OWNER WORK EMAIL');
    expect(html).toContain('form-register-customer');
    expect(html).toContain('.stokrova.com');
  });

  it('renders staff login modal with role presets for quick demo access', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderLoginModalHtml();

    expect(html).toContain('Universal Staff Sign In');
    expect(html).toContain('Quick Demo Login');
    expect(html).toContain('Victoria');
    expect(html).toContain('David');
    expect(html).toContain('Emma');
    expect(html).toContain('Samuel');
    expect(html).toContain('form-login-customer');
  });
});
