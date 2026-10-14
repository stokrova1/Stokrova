import { describe, it, expect } from 'vitest';
import { LandingViewModel } from '../src/landing-view.js';
import { formatCurrencyMinor } from '@stokrova/ui';

describe('LandingViewModel & Customer Portal Suite (@stokrova/customer-web)', () => {
  // ==========================================
  // ORIGINAL 8 PRESERVED TESTS (STRICT UNBROKEN CONTRACT)
  // ==========================================

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

  // ==========================================
  // NEW ENHANCEMENT TESTS (COVERING BRAND & UX ADDITIONS)
  // ==========================================

  it('renders hero command center with authentic executive KPIs, area chart, and accessibility table', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderHeroCommandCenterHtml();

    expect(html).toContain('app.stokrova.com/command-center');
    expect(html).toContain('$4,850,000');
    expect(html).toContain('$382,000.00');
    expect(html).toContain('38.50%');
    expect(html).toContain('Stockout Risk');
    expect(html).toContain('Till Variance');
    expect(html).toContain('Balanced');
    expect(html).toContain('Illustrative platform data.');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Example executive overview"');
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('Cost of Goods (Teal)');
    expect(html).toContain('Lagos Central');
    expect(html).toContain('Abuja Mall');
  });

  it('renders animated money flow strip demonstrating physical to financial pipeline', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderMoneyFlowStripHtml();

    expect(html).toContain('id="money-flow"');
    expect(html).toContain('Every sale, counted once — everywhere.');
    expect(html).toContain('Scan at till');
    expect(html).toContain('Sale recorded');
    expect(html).toContain('Stock updated');
    expect(html).toContain('Ledger balanced');
    expect(html).toContain('Owner sees profit');
    expect(html).toContain('5011000000018');
    expect(html).toContain('DR 1010 = CR 4010');
  });

  it('renders who its for section explaining operational scaling from single boutique to enterprise', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderWhoItsForSectionHtml();

    expect(html).toContain('id="who-its-for"');
    expect(html).toContain('Engineered to Fit Your Operational Scale');
    expect(html).toContain('Single Shop & Retail Store');
    expect(html).toContain('Growing Multi-Store Chain');
    expect(html).toContain('Distribution & Warehouse Group');
    expect(html).toContain('SINGLE BOUTIQUE');
    expect(html).toContain('EXPANDING BRAND');
    expect(html).toContain('REGIONAL ENTERPRISE');
  });

  it('renders FAQ accordion section with native details/summary and core architectural answers', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderFaqSectionHtml();

    expect(html).toContain('id="faq"');
    expect(html).toContain('Frequently Asked Questions');
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).toContain('How does STOKROVA maintain 100% uptime when retail internet goes down?');
    expect(html).toContain('Rule 21');
    expect(html).toContain('ESC/POS');
  });

  it('renders pre-footer closing CTA banner and interactive demo warning modal', () => {
    const view = new LandingViewModel('dark');
    const ctaHtml = view.renderClosingCtaHtml();
    const demoModalHtml = view.renderDemoConfirmModalHtml();

    expect(ctaHtml).toContain('Run every branch from one screen.');
    expect(ctaHtml).toContain('Register your business →');
    expect(ctaHtml).toContain('Explore the demo');

    expect(demoModalHtml).toContain('id="modal-demo-confirm"');
    expect(demoModalHtml).toContain('Open Live Interactive Demo');
    expect(demoModalHtml).toContain('Victoria Sterling');
    expect(demoModalHtml).toContain('Open demo →');
  });

  it('renders till session reconciliation waterfall and lot expiry tables in features and architecture', () => {
    const view = new LandingViewModel('dark');
    const featHtml = view.renderFeaturesGridHtml();
    const archHtml = view.renderArchitectureSectionHtml();

    expect(featHtml).toContain('Till Session Reconciliation Visual');
    expect(featHtml).toContain('Opening Float');
    expect(featHtml).toContain('Actual Blind Closing Count');
    expect(featHtml).toContain('LOT-2026-B1');
    expect(featHtml).toContain('USE FIRST');

    expect(archHtml).toContain('Apex Global Holding Group');
    expect(archHtml).toContain('London Flagship');
    expect(archHtml).toContain('Blind Receiving Count');
    expect(archHtml).toContain('LAPTOP-PRO-16');
  });

  it('renders responsive mobile drawer navigation and accessible dialog labels', () => {
    const view = new LandingViewModel('dark');
    const hdrHtml = view.renderHeaderHtml();
    const regModalHtml = view.renderRegisterModalHtml();

    expect(hdrHtml).toContain('id="nav-hamburger-btn"');
    expect(hdrHtml).toContain('id="mobile-nav-drawer"');
    expect(hdrHtml).toContain('aria-label="Toggle navigation menu"');

    expect(regModalHtml).toContain('role="dialog"');
    expect(regModalHtml).toContain('aria-modal="true"');
    expect(regModalHtml).toContain('for="reg-company-name"');
    expect(regModalHtml).toContain('for="reg-slug"');
  });
});
