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
    expect(html).toContain('Strict Multi-Tenant Isolation');
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

  it('renders staff login modal with live credential fields and automatic workspace discovery', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderLoginModalHtml();

    expect(html).toContain('Staff Sign In');
    expect(html).not.toContain('BUSINESS WORKSPACE / SLUG');
    expect(html).toContain('STAFF WORK EMAIL');
    expect(html).toContain('PASSWORD / PIN');
    expect(html).toContain('form-login-customer');
    expect(html).not.toContain('Quick Demo Login');
    expect(html).not.toContain('Victoria');
    expect(html).not.toContain('demo1234');
  });

  it('renders multi-branch architecture section with holding hierarchy and multi-tenant isolation', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderArchitectureSectionHtml();

    expect(html).toContain('id="architecture"');
    expect(html).toContain('Multi-Company & Multi-Branch Topology');
    expect(html).toContain('Multi-Entity Holding Hierarchy');
    expect(html).toContain('Two-Step In-Transit Transfers');
    expect(html).toContain('Multi-Tenant Security & Isolation');
  });

  it('renders offline POS showcase section with sub-50ms scanner buffer and split tender', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderPosSectionHtml();

    expect(html).toContain('id="pos"');
    expect(html).toContain('Offline-Tolerant Point of Sale Architecture');
    expect(html).toContain('Sub-50ms Scans');
    expect(html).toContain('Multi-Payment Splitting');
    expect(html).toContain('Register Your Business Workspace →');
    expect(html).not.toContain('Launch Interactive Workspace →');
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
    expect(html).toContain('How does STOKROVA guarantee our business and financial data is kept isolated?');
    expect(html).toContain('ESC/POS');
  });

  it('renders pre-footer closing CTA banner with live business registration and staff sign in actions', () => {
    const view = new LandingViewModel('dark');
    const ctaHtml = view.renderClosingCtaHtml();

    expect(ctaHtml).toContain('Run every branch from one screen.');
    expect(ctaHtml).toContain('Register your business →');
    expect(ctaHtml).toContain('Staff sign in →');
    expect(ctaHtml).not.toContain('Explore the demo');
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

    expect(archHtml).toContain('Enterprise Group Holdings');
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

  it('renders 5-step onboarding stepper with dedicated pages, inter-step loader, and welcoming promise screen', () => {
    const view = new LandingViewModel('dark');
    const regModalHtml = view.renderRegisterModalHtml();

    expect(regModalHtml).toContain('id="signup-cosmic-canvas"');
    expect(regModalHtml).toContain('id="signup-stepper-header"');
    expect(regModalHtml).toContain('id="signup-current-step-num"');
    expect(regModalHtml).toContain('id="signup-progress-fill"');
    expect(regModalHtml).not.toContain('id="step-node-1"');
    expect(regModalHtml).toContain('id="signup-step-loader"');
    expect(regModalHtml).toContain('id="reg-step-1"');
    expect(regModalHtml).toContain('id="reg-step-2"');
    expect(regModalHtml).toContain('id="reg-step-3"');
    expect(regModalHtml).toContain('id="reg-step-4"');
    expect(regModalHtml).toContain('id="reg-step-5"');
    expect(regModalHtml).toContain('id="stokrova-promise-banner"');
    expect(regModalHtml).toContain('The STOKROVA Operational Promise');
    expect(regModalHtml).toContain('100% Offline Transaction Resilience');
    expect(regModalHtml).toContain('Enterprise Organization Privacy & Data Security');
    expect(regModalHtml).toContain('Pure Integer Double-Entry Ledger Truth');
    expect(regModalHtml).toContain('id="reg-branch-name"');
    expect(regModalHtml).toContain('id="prov-percent"');
    expect(regModalHtml).toContain('id="prov-progress-fill"');
    expect(regModalHtml).toContain('id="prov-milestones"');
    expect(regModalHtml).toContain('id="prov-completion-actions"');
    expect(regModalHtml).toContain('id="prov-countdown-banner"');
    expect(regModalHtml).toContain('id="prov-countdown-sec"');
    expect(regModalHtml).toContain('Launching dashboard in');
    expect(regModalHtml).not.toContain('Auto-launching');
    expect(regModalHtml).not.toContain('Take Interactive Tour');
    expect(regModalHtml).not.toContain('Enter Dashboard Directly');
  });

  it('renders world-class guided tour overlay with globe icon and interactive navigation steps', () => {
    const view = new LandingViewModel('dark');
    const tourHtml = view.renderTourOverlayHtml();

    expect(tourHtml).toContain('id="stokrova-tour-overlay"');
    expect(tourHtml).toContain('id="stokrova-tour-backdrop"');
    expect(tourHtml).toContain('id="stokrova-tour-spotlight"');
    expect(tourHtml).toContain('id="stokrova-tour-card"');
    expect(tourHtml).toContain('STOKROVA TOUR');
    expect(tourHtml).toContain('🌍');
    expect(tourHtml).toContain('id="tour-step-num"');
    expect(tourHtml).toContain('id="tour-step-total"');
    expect(tourHtml).toContain('id="tour-role-badge"');
    expect(tourHtml).toContain('id="tour-card-title"');
    expect(tourHtml).toContain('id="tour-card-desc"');
    expect(tourHtml).toContain('id="tour-btn-next"');
    expect(tourHtml).toContain('id="tour-btn-prev"');
    expect(tourHtml).toContain('Dismiss (Esc)');
    expect(tourHtml).not.toContain('Dismiss Tour (Esc)');
    expect(tourHtml).toContain('Next');
    expect(tourHtml).not.toContain('Next Feature');
  });

  it('renders staff login modal with two-stage verification screen and green confirmation checks', () => {
    const view = new LandingViewModel('dark');
    const html = view.renderLoginModalHtml();

    expect(html).toContain('id="modal-login"');
    expect(html).not.toContain('id="login-slug"');
    expect(html).toContain('id="login-step-credentials"');
    expect(html).toContain('id="login-step-verification"');
    expect(html).toContain('id="login-searching-state"');
    expect(html).toContain('id="login-verified-state"');
    expect(html).toContain('id="login-dyn-company"');
    expect(html).toContain('id="login-dyn-slug"');
    expect(html).toContain('id="login-dyn-name"');
    expect(html).toContain('id="login-dyn-role"');
    expect(html).toContain('id="login-dyn-last-active"');
    expect(html).toContain('id="btn-confirm-login"');
    expect(html).toContain('Confirm & Enter Dashboard →');
    expect(html).toContain('Switch Account');
    expect(html).toContain('Dedicated Privacy Active');
  });

  it('guarantees dist/index.html inline client script is 100% syntactically valid with zero syntax errors', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const vm = await import('node:vm');

    const htmlPath = path.resolve(__dirname, '../dist/index.html');
    if (!fs.existsSync(htmlPath)) return; // Skipped if dist not yet generated

    const html = fs.readFileSync(htmlPath, 'utf8');
    const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
    expect(scriptMatches.length).toBeGreaterThan(0);

    for (const m of scriptMatches) {
      const code = m[1]?.trim();
      if (!code) continue; // External CDN script
      expect(() => new vm.Script(code)).not.toThrow();
    }
  });

  it('guarantees client script evaluates in browser context without ReferenceError or TypeError', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const vm = await import('node:vm');

    const htmlPath = path.resolve(__dirname, '../dist/index.html');
    if (!fs.existsSync(htmlPath)) return;

    const html = fs.readFileSync(htmlPath, 'utf8');
    const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
    const clientScript = scriptMatches.find((m) => m[1] && m[1].includes('window.stokrovaCustomerApp'));
    expect(clientScript).toBeDefined();

    const code = clientScript![1];

    // Verify no undeclared build token leaks or synthetic demo data
    expect(code).not.toMatch(/\b(todayRevenue:\s*isDemo\b)/);
    expect(code).not.toMatch(/\bisDemo\b/);
    expect(html).not.toContain('Apex Global Retail');
    expect(html).not.toContain('Victoria Sterling');
    expect(html).not.toContain('modal-demo-confirm');

    const mockStorage: Record<string, string> = {};
    const elements: Record<string, any> = {};
    const mockWindow: any = {
      location: { hostname: 'localhost', port: '3000', hash: '', origin: 'http://localhost:3000' },
      addEventListener: () => {},
      sessionStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
      document: {
        getElementById: (id: string) => {
          if (!elements[id]) {
            elements[id] = {
              id,
              style: {},
              classList: { add: () => {}, remove: () => {} },
              value: '',
              querySelectorAll: () => [],
              focus: () => {},
            };
          }
          return elements[id];
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        documentElement: { style: { setProperty: () => {} } },
        addEventListener: () => {},
      },
      setTimeout: (fn: Function) => fn(),
      clearTimeout: () => {},
      setInterval: () => {},
      clearInterval: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
    };
    mockWindow.window = mockWindow;
    mockWindow.document.defaultView = mockWindow;

    const ctx = vm.createContext(mockWindow);
    expect(() => vm.runInContext(code, ctx)).not.toThrow();

    expect(ctx.window.stokrovaCustomerApp).toBeDefined();
    expect(typeof ctx.window.stokrovaCustomerApp.openLoginModal).toBe('function');
    expect(typeof ctx.window.stokrovaCustomerApp.openRegisterModal).toBe('function');

    // Test calling openLoginModal
    elements['mobile-nav-drawer'] = { style: { display: 'flex' } };
    expect(() => ctx.window.stokrovaCustomerApp.openLoginModal()).not.toThrow();
    expect(elements['modal-login']?.style.display).toBe('flex');
    expect(elements['mobile-nav-drawer']?.style.display).toBe('none');

    // Test calling closeLoginModal
    expect(() => ctx.window.stokrovaCustomerApp.closeLoginModal()).not.toThrow();
    expect(elements['modal-login']?.style.display).toBe('none');

    // Test calling openRegisterModal
    elements['mobile-nav-drawer'] = { style: { display: 'flex' } };
    expect(() => ctx.window.stokrovaCustomerApp.openRegisterModal()).not.toThrow();
    expect(elements['modal-register']?.style.display).toBe('flex');
    expect(elements['mobile-nav-drawer']?.style.display).toBe('none');

    // Test calling closeRegisterModal
    expect(() => ctx.window.stokrovaCustomerApp.closeRegisterModal()).not.toThrow();
    expect(elements['modal-register']?.style.display).toBe('none');
  });

  it('ensures modals have top-layer z-index and registration/login forms have novalidate to prevent browser freeze', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const htmlPath = path.resolve(__dirname, '../dist/index.html');
    if (!fs.existsSync(htmlPath)) return;

    const html = fs.readFileSync(htmlPath, 'utf8');

    // Both primary dialogs must be at z-index 20000 (above mobile drawer 10000)
    expect(html).toMatch(/id="modal-register"[^>]*z-index:\s*20000/);
    expect(html).toMatch(/id="modal-login"[^>]*z-index:\s*20000/);

    // Multi-step form must have novalidate so hidden steps do not block submission
    expect(html).toMatch(/<form id="form-register-customer"[^>]*novalidate/);
    expect(html).toMatch(/<form id="form-login-customer"[^>]*novalidate/);
  });
});



