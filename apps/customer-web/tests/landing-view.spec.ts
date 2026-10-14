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

  it('renders hero section with multi-tenant assurance and enterprise workspace CTA', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderHeroHtml();

    expect(html).toContain('One Unified Operating System for Stores, Warehouses & Finance');
    expect(html).toContain('Register Your Business Workspace →');
    expect(html).toContain('Staff Sign In to Workspace');
    expect(html).not.toContain('Start 14-Day Free Trial');
    expect(html).not.toContain('Explore Live Demo Business');
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

  it('renders staff login modal with live credential fields and no demo presets', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderLoginModalHtml();

    expect(html).toContain('Staff Sign In');
    expect(html).toContain('BUSINESS WORKSPACE / SLUG');
    expect(html).toContain('STAFF WORK EMAIL');
    expect(html).toContain('PASSWORD / PIN');
    expect(html).toContain('form-login-customer');
    expect(html).not.toContain('Quick Demo Login');
    expect(html).not.toContain('Victoria');
    expect(html).not.toContain('demo1234');
  });

  it('renders multi-branch architecture section with holding hierarchy and Rule 21 isolation', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderArchitectureSectionHtml();

    expect(html).toContain('id="architecture"');
    expect(html).toContain('Multi-Company & Multi-Branch Topology');
    expect(html).toContain('Multi-Entity Holding Hierarchy');
    expect(html).toContain('Two-Step In-Transit Transfers');
    expect(html).toContain('Rule 21 Multi-Tenant Isolation');
  });

  it('renders offline POS showcase section with sub-50ms scanner buffer and split tender', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderPosSectionHtml();

    expect(html).toContain('id="pos"');
    expect(html).toContain('Offline-Tolerant Point of Sale Architecture');
    expect(html).toContain('Sub-50ms Scans');
    expect(html).toContain('Multi-Payment Splitting');
    expect(html).toContain('Zero-Drop Local Queue');
    expect(html).toContain('Thermal Receipts');
    expect(html).toContain('Launch Interactive Workspace →');
  });
});
