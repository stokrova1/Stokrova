/**
 * STOKROVA Customer Web — Public Marketing Website & Universal Business Workspace Portal
 * Self-service business onboarding, role-based staff login, and tenant workspace launcher.
 */

import { formatCurrencyMinor, themeTokens } from '@stokrova/ui';

export interface PricingPlanItem {
  id: string;
  name: string;
  monthlyPriceMinor: bigint;
  currency: string;
  badge?: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export class LandingViewModel {
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public getPricingPlans(): PricingPlanItem[] {
    return [
      {
        id: 'starter',
        name: 'Starter',
        monthlyPriceMinor: 4900n, // $49.00
        currency: 'USD',
        description: 'Single-location retailers and boutique shops seeking automated inventory and fast POS.',
        features: [
          '1 Branch Location & Cashier Till',
          'Up to 3 Staff Members',
          'Offline-First Touch POS Register',
          'Basic Real-Time Stock Tracking',
          'Standard Thermal Receipt Printing',
          'Community & Email Support',
        ],
      },
      {
        id: 'growth',
        name: 'Growth',
        monthlyPriceMinor: 14900n, // $149.00
        currency: 'USD',
        badge: 'MOST POPULAR',
        recommended: true,
        description: 'Fast-growing brands operating multiple stores with inter-branch transfers and lot tracking.',
        features: [
          'Up to 5 Branch Locations',
          'Unlimited Staff & Till Sessions',
          'Inter-Store Stock Transfers & IN-TRANSIT Tracking',
          'FEFO & Expiration Lot Management',
          'Automated Double-Entry Accounting Ledger',
          'Priority 24/7 SLA Support',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPriceMinor: 39900n, // $399.00
        currency: 'USD',
        badge: 'ENTERPRISE',
        description: 'Large distribution networks and multi-warehouse enterprises with custom workflows.',
        features: [
          'Unlimited Branches & Regional Warehouses',
          'Rugged Warehouse Wave-Picking Checklist',
          'Visual DAG Business Workflow Engine',
          'Dedicated Multi-Tenant Isolation (Rule 21)',
          'Custom Webhooks & REST/GraphQL API Access',
          'Dedicated Solution Architect & Custom Onboarding',
        ],
      },
    ];
  }

  public renderHeaderHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <header style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100;">
        <div style="display: flex; align-items: center; gap: 28px;">
          <a href="#" style="text-decoration: none; display: flex; align-items: center; gap: 8px;">
            <span style="color: ${tokens.primary}; font-size: 1.3rem; font-weight: 800;">◆</span>
            <span style="color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.05em;">STOKROVA</span>
          </a>
          <nav style="display: flex; gap: 20px; font-size: 0.875rem;">
            <a href="#features" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Features</a>
            <a href="#architecture" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Multi-Branch</a>
            <a href="#pos" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Offline POS</a>
            <a href="#pricing" style="color: ${tokens.textSecondary}; text-decoration: none; font-weight: 500;">Pricing</a>
          </nav>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <button onclick="window.stokrovaCustomerApp.openLoginModal()" style="background: transparent; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 8px 18px; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
            Staff Sign In
          </button>
          <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="background: ${tokens.primary}; color: #0E1116; border: none; padding: 8px 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(189,150,82,0.3); transition: all 0.15s ease;">
            Register Your Business
          </button>
        </div>
      </header>
    `;
  }

  public renderHeroHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <section style="padding: 72px 32px 56px 32px; text-align: center; max-width: 1040px; margin: 0 auto;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(189,150,82,0.12); border: 1px solid ${tokens.primary}; padding: 4px 14px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: ${tokens.primary}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px;">
          <span>⚡ Next-Generation Multi-Branch Retail & Logistics ERP</span>
        </div>
        <h1 style="font-size: 3.25rem; font-weight: 900; line-height: 1.15; color: ${tokens.textPrimary}; margin: 0 0 20px 0; letter-spacing: -0.02em;">
          One Unified Operating System for Stores, Warehouses & Finance
        </h1>
        <p style="font-size: 1.15rem; line-height: 1.6; color: ${tokens.textSecondary}; max-width: 780px; margin: 0 auto 36px auto;">
          Run your point of sale offline without fear of data loss, manage inventory across hundreds of branches with authoritative FEFO lot tracking, and maintain pure double-entry ledger accuracy.
        </p>
        <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <button onclick="window.stokrovaCustomerApp.openRegisterModal()" style="background: ${tokens.primary}; color: #0E1116; border: none; padding: 14px 28px; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(189,150,82,0.4);">
            Register Your Business Workspace →
          </button>
          <button onclick="window.stokrovaCustomerApp.openLoginModal()" style="background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 14px 24px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
            Staff Sign In to Workspace
          </button>
        </div>

        <div style="display: flex; justify-content: center; gap: 40px; margin-top: 56px; padding-top: 36px; border-top: 1px solid ${tokens.border}; color: ${tokens.textMuted}; font-size: 0.8125rem;">
          <div>✓ Offline-First POS Engine</div>
          <div>✓ Multi-Branch Stock Transfers</div>
          <div>✓ Balanced Double-Entry Journals</div>
          <div>✓ Strict Multi-Tenant Isolation (Rule 21)</div>
        </div>
      </section>
    `;
  }

  public renderFeaturesGridHtml(): string {
    const tokens = themeTokens[this.theme];
    const features = [
      {
        icon: '🏪',
        title: 'Multi-Branch & Inter-Store Transfers',
        desc: 'Execute stock movements between stores and distribution centers with two-step dispatch/receipt and IN-TRANSIT ledger tracking.',
      },
      {
        icon: '⚡',
        title: 'Offline-Tolerant Point of Sale',
        desc: 'Keep ringing up sales even during internet blackouts. Background sync queues reconcile sales orders and payments when connectivity returns.',
      },
      {
        icon: '📦',
        title: 'Authoritative FEFO & Serial Lot Control',
        desc: 'First-Expired, First-Out picking prevents perishable write-offs. Full chain of custody for serial-numbered and batch items.',
      },
      {
        icon: '⚖️',
        title: 'Immutable Double-Entry Ledger',
        desc: 'Every inventory intake, sale, and return automatically posts balanced journal entries (Debits = Credits) in pure integer minor units.',
      },
      {
        icon: '⚙️',
        title: 'Visual DAG Workflow Automation',
        desc: 'Automate approvals, stock thresholds, and purchase orders via Kahn cycle-validated Directed Acyclic Graphs without schema locks.',
      },
      {
        icon: '🛡️',
        title: 'Cryptographic RBAC & Security',
        desc: 'Enforce branch-scoped permissions across Cashiers, Store Managers, Warehouse Pickers, and Business Owners.',
      },
    ];

    const cardsHtml = features
      .map(
        (f) => `
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 28px; text-align: left; transition: transform 0.15s ease;">
          <div style="font-size: 2rem; margin-bottom: 16px;">${f.icon}</div>
          <h3 style="font-size: 1.125rem; font-weight: 700; color: ${tokens.textPrimary}; margin: 0 0 10px 0;">${f.title}</h3>
          <p style="font-size: 0.875rem; line-height: 1.5; color: ${tokens.textSecondary}; margin: 0;">${f.desc}</p>
        </div>
      `
      )
      .join('');

    return `
      <section id="features" style="padding: 64px 32px; max-width: 1120px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 12px 0;">Built for Rigorous Physical Operations</h2>
          <p style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 600px; margin: 0 auto;">Engineered specifically to eliminate inventory shrink, stockout penalties, and till variance.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  public renderPricingSectionHtml(): string {
    const tokens = themeTokens[this.theme];
    const plans = this.getPricingPlans();

    const plansHtml = plans
      .map((p) => {
        const isRec = p.recommended;
        const borderStyle = isRec ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`;
        const badgeHtml = p.badge
          ? `<span style="background: ${isRec ? tokens.primary : tokens.cardHover}; color: ${isRec ? '#0E1116' : tokens.textPrimary}; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.06em;">${p.badge}</span>`
          : '';

        const featuresList = p.features
          .map(
            (feat) => `
            <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 0.875rem; color: ${tokens.textSecondary};">
              <span style="color: ${tokens.primary}; font-weight: 800;">✓</span>
              <span>${feat}</span>
            </li>
          `
          )
          .join('');

        return `
          <div style="background: ${tokens.surface}; border: ${borderStyle}; border-radius: 12px; padding: 32px 28px; display: flex; flex-direction: column; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0;">${p.name}</h3>
              ${badgeHtml}
            </div>
            <p style="font-size: 0.8125rem; color: ${tokens.textMuted}; min-height: 40px; margin: 0 0 20px 0;">${p.description}</p>
            <div style="margin-bottom: 24px;">
              <span style="font-size: 2.5rem; font-weight: 900; color: ${tokens.textPrimary}; font-family: var(--stokrova-font-mono);">${formatCurrencyMinor(p.monthlyPriceMinor, p.currency)}</span>
              <span style="font-size: 0.875rem; color: ${tokens.textMuted};"> / month</span>
            </div>
            <button onclick="window.stokrovaCustomerApp.openRegisterModal('${p.id}')" style="background: ${isRec ? tokens.primary : 'transparent'}; color: ${isRec ? '#0E1116' : tokens.textPrimary}; border: ${isRec ? 'none' : `1px solid ${tokens.borderStrong}`}; padding: 12px 20px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; cursor: pointer; margin-bottom: 28px; transition: all 0.15s ease;">
              Choose ${p.name} →
            </button>
            <ul style="list-style: none; padding: 0; margin: 0; border-top: 1px solid ${tokens.border}; padding-top: 20px;">
              ${featuresList}
            </ul>
          </div>
        `;
      })
      .join('');

    return `
      <section id="pricing" style="padding: 64px 32px; max-width: 1120px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 2.25rem; font-weight: 800; color: ${tokens.textPrimary}; margin: 0 0 12px 0;">Simple, Transparent SaaS Pricing</h2>
          <p style="font-size: 1rem; color: ${tokens.textSecondary}; max-width: 600px; margin: 0 auto;">No hidden transaction percentages. Select the tier that matches your physical operational scale.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; align-items: stretch;">
          ${plansHtml}
        </div>
      </section>
    `;
  }

  public renderRegisterModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-register" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.6); padding: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: ${tokens.textPrimary};">Register Your Business</h2>
              <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Create your isolated multi-branch workspace (Rule 21 Multi-Tenant Isolation)</p>
            </div>
            <button onclick="window.stokrovaCustomerApp.closeRegisterModal()" style="background: none; border: none; font-size: 1.5rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <form id="form-register-customer" onsubmit="window.stokrovaCustomerApp.handleRegisterSubmit(event)">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BUSINESS / COMPANY LEGAL NAME *</label>
              <input id="reg-company-name" type="text" required placeholder="e.g. Apex Global Retail Ltd" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">WORKSPACE SLUG (SUBDOMAIN) *</label>
                <div style="display: flex; align-items: center; background: ${tokens.background}; border: 1px solid ${tokens.border}; border-radius: 6px; overflow: hidden;">
                  <input id="reg-slug" type="text" required placeholder="apex" style="flex: 1; padding: 10px 12px; background: transparent; border: none; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
                  <span style="padding: 0 10px; font-size: 0.75rem; color: ${tokens.textMuted};">.stokrova.com</span>
                </div>
              </div>
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BASE CURRENCY *</label>
                <select id="reg-currency" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="NGN">NGN (₦) — Nigerian Naira</option>
                  <option value="KES">KES (KSh) — Kenyan Shilling</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">OWNER FULL NAME *</label>
                <input id="reg-owner-name" type="text" required placeholder="Victoria Sterling" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">OWNER WORK EMAIL *</label>
                <input id="reg-owner-email" type="email" required placeholder="victoria@apex.com" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">PASSWORD *</label>
                <input id="reg-password" type="password" required placeholder="••••••••••••" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">PLAN TIER</label>
                <select id="reg-tier" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                  <option value="starter">Starter — $49/mo</option>
                  <option value="growth" selected>Growth — $149/mo (Recommended)</option>
                  <option value="enterprise">Enterprise — $399/mo</option>
                </select>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">INITIAL FLAGSHIP / STORE BRANCH NAME</label>
              <input id="reg-branch-name" type="text" placeholder="e.g. London Central Flagship" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" onclick="window.stokrovaCustomerApp.closeRegisterModal()" style="padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                Cancel
              </button>
              <button type="submit" style="padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
                Complete Registration & Launch Workspace →
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  public renderLoginModalHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <div id="modal-login" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); padding: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
              <h2 style="margin: 0; font-size: 1.4rem; color: ${tokens.textPrimary};">Staff Sign In</h2>
              <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Enter your business slug and credentials to access your live workspace</p>
            </div>
            <button onclick="window.stokrovaCustomerApp.closeLoginModal()" style="background: none; border: none; font-size: 1.5rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
          </div>

          <form id="form-login-customer" onsubmit="window.stokrovaCustomerApp.handleLoginSubmit(event)">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BUSINESS WORKSPACE / SLUG *</label>
              <input id="login-slug" type="text" required placeholder="e.g. acme-retail" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">STAFF WORK EMAIL *</label>
              <input id="login-email" type="email" required placeholder="name@company.com" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
            </div>

            <div style="margin-bottom: 24px;">
              <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">PASSWORD / PIN *</label>
              <input id="login-password" type="password" required placeholder="••••••••••••" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.background}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" onclick="window.stokrovaCustomerApp.closeLoginModal()" style="padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                Cancel
              </button>
              <button type="submit" style="padding: 10px 24px; border-radius: 6px; border: none; background: ${tokens.primary}; color: #0E1116; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
                Sign In to Workspace →
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  public renderFooterHtml(): string {
    const tokens = themeTokens[this.theme];
    return `
      <footer style="background: ${tokens.surface}; border-top: 1px solid ${tokens.border}; padding: 48px 32px 32px 32px; color: ${tokens.textMuted}; font-size: 0.8125rem;">
        <div style="max-width: 1120px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 32px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="color: ${tokens.primary}; font-weight: 800;">◆</span>
              <span style="color: ${tokens.textPrimary}; font-weight: 800; font-size: 1.1rem;">STOKROVA</span>
            </div>
            <p style="margin: 0 0 12px 0; max-width: 320px; line-height: 1.5;">Enterprise multi-branch inventory, retail POS, and financial orchestration platform.</p>
            <div>Strict Multi-Tenant Rule 21 • Pure Minor Currency Math</div>
          </div>

          <div style="display: flex; gap: 48px;">
            <div>
              <div style="font-weight: 700; color: ${tokens.textPrimary}; margin-bottom: 12px; text-transform: uppercase; font-size: 0.75rem;">Platform</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <a href="#features" style="color: ${tokens.textSecondary}; text-decoration: none;">Features</a>
                <a href="#pricing" style="color: ${tokens.textSecondary}; text-decoration: none;">Pricing</a>
                <a href="https://admin.stokrova.com" target="_blank" style="color: ${tokens.primary}; text-decoration: none; font-weight: 600;">👑 Platform Founder Console</a>
              </div>
            </div>
            <div>
              <div style="font-weight: 700; color: ${tokens.textPrimary}; margin-bottom: 12px; text-transform: uppercase; font-size: 0.75rem;">Legal & Compliance</div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <span>Tenant Isolation Guarantee</span>
                <span>Immutable Financial History</span>
                <span>Audit Trail Compliant</span>
              </div>
            </div>
          </div>
        </div>

        <div style="max-width: 1120px; margin: 36px auto 0 auto; padding-top: 24px; border-top: 1px solid ${tokens.border}; text-align: center; font-size: 0.75rem;">
          © ${new Date().getFullYear()} STOKROVA. All rights reserved.
        </div>
      </footer>
    `;
  }
}
