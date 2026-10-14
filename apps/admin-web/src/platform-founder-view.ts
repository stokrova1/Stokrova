/**
 * STOKROVA Platform Founder Console View Model
 * Tier 1 Super-Admin Portal for Platform Owner / Founder to manage
 * subscriber companies, enroll businesses, manage SaaS tiers, and view platform metrics.
 */

import { themeTokens, semanticTokens, formatCurrencyMinor } from '@stokrova/ui';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  currencyCode: string;
  subscriptionTier: 'STARTER' | 'COMMERCE_PRO' | 'ENTERPRISE_LOGISTICS';
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  companiesCount: number;
  branchesCount: number;
  monthlyGmvMinor: bigint;
  createdAt: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalGmvMinor: bigint;
  platformMrrMinor: bigint;
  activeWorkCenters: number;
  systemHealthPct: number;
}

export class PlatformFounderView {
  private tenants: Map<string, PlatformTenant> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
    this.seedDefaultPlatformTenants();
  }

  private seedDefaultPlatformTenants(): void {
    const defaultTenants: PlatformTenant[] = [
      {
        id: 'ten_apex_global',
        name: 'Apex Global Retail & Logistics Ltd',
        slug: 'apex-global',
        ownerName: 'Victoria Sterling',
        ownerEmail: 'founder.victoria@apex-global.com',
        currencyCode: 'USD',
        subscriptionTier: 'ENTERPRISE_LOGISTICS',
        status: 'ACTIVE',
        companiesCount: 4,
        branchesCount: 5,
        monthlyGmvMinor: 485000000n, // $4,850,000.00
        createdAt: '2026-01-15T08:00:00Z',
      },
      {
        id: 'ten_metro_retail',
        name: 'Metro Department Stores PLC',
        slug: 'metro-retail',
        ownerName: 'Charles Montgomery',
        ownerEmail: 'charles@metro-stores.co.uk',
        currencyCode: 'GBP',
        subscriptionTier: 'COMMERCE_PRO',
        status: 'ACTIVE',
        companiesCount: 2,
        branchesCount: 8,
        monthlyGmvMinor: 215000000n, // £2,150,000.00
        createdAt: '2026-02-10T11:30:00Z',
      },
      {
        id: 'ten_aurora_boutiques',
        name: 'Aurora Luxury Boutiques',
        slug: 'aurora-fashion',
        ownerName: 'Isabella Moreau',
        ownerEmail: 'isabella@auroraboutiques.com',
        currencyCode: 'EUR',
        subscriptionTier: 'COMMERCE_PRO',
        status: 'ACTIVE',
        companiesCount: 1,
        branchesCount: 3,
        monthlyGmvMinor: 92000000n, // €920,000.00
        createdAt: '2026-03-01T14:15:00Z',
      },
      {
        id: 'ten_lagos_fastmart',
        name: 'Lagos FastMart Express',
        slug: 'lagos-fastmart',
        ownerName: 'Babatunde Adeleke',
        ownerEmail: 'baba@fastmart.ng',
        currencyCode: 'NGN',
        subscriptionTier: 'STARTER',
        status: 'SUSPENDED',
        companiesCount: 1,
        branchesCount: 2,
        monthlyGmvMinor: 4500000000n, // ₦45,000,000.00
        createdAt: '2026-04-12T09:45:00Z',
      },
    ];

    for (const t of defaultTenants) {
      this.tenants.set(t.id, t);
    }
  }

  public listTenants(): PlatformTenant[] {
    return Array.from(this.tenants.values());
  }

  public getTenant(id: string): PlatformTenant | undefined {
    return this.tenants.get(id);
  }

  public addTenant(tenant: PlatformTenant): void {
    this.tenants.set(tenant.id, { ...tenant });
  }

  public setTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'): boolean {
    const existing = this.tenants.get(id);
    if (!existing) return false;
    existing.status = status;
    return true;
  }

  public setTenantTier(
    id: string,
    tier: 'STARTER' | 'COMMERCE_PRO' | 'ENTERPRISE_LOGISTICS',
  ): boolean {
    const existing = this.tenants.get(id);
    if (!existing) return false;
    existing.subscriptionTier = tier;
    return true;
  }

  public getPlatformMetrics(): PlatformMetrics {
    const all = this.listTenants();
    const active = all.filter((t) => t.status === 'ACTIVE');
    const suspended = all.filter((t) => t.status === 'SUSPENDED');

    // SaaS MRR calculation: Starter = $99/mo, Commerce Pro = $499/mo, Enterprise = $1,999/mo
    let mrrMinor = 0n;
    for (const t of active) {
      if (t.subscriptionTier === 'STARTER') mrrMinor += 9900n;
      else if (t.subscriptionTier === 'COMMERCE_PRO') mrrMinor += 49900n;
      else if (t.subscriptionTier === 'ENTERPRISE_LOGISTICS') mrrMinor += 199900n;
    }

    const totalGmv = all.reduce((acc, t) => acc + t.monthlyGmvMinor, 0n);
    const totalBranches = all.reduce((acc, t) => acc + t.branchesCount, 0);

    return {
      totalTenants: all.length,
      activeTenants: active.length,
      suspendedTenants: suspended.length,
      totalGmvMinor: totalGmv,
      platformMrrMinor: mrrMinor,
      activeWorkCenters: totalBranches * 3, // avg 3 till registers/scanner stations per branch
      systemHealthPct: 99.98,
    };
  }

  // ==========================================================================
  // HTML Rendering
  // ==========================================================================

  public renderPlatformKpiCardsHtml(): string {
    const tokens = themeTokens[this.theme];
    const metrics = this.getPlatformMetrics();

    return `
      <div class="platform-kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Total Enrolled Businesses</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${tokens.textPrimary};">${metrics.totalTenants}</div>
          <div style="font-size: 0.75rem; color: ${semanticTokens.success[this.theme].text}; margin-top: 4px;">● ${metrics.activeTenants} Active Subscribers</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Monthly Recurring Revenue (MRR)</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${tokens.primary};">${formatCurrencyMinor(metrics.platformMrrMinor, 'USD')}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">SaaS Platform Subscription Invoicing</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Global Processed Volume (GMV)</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${tokens.textPrimary};">${formatCurrencyMinor(metrics.totalGmvMinor, 'USD')}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Aggregated Across All Tenant Branches</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Platform Core Health</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${semanticTokens.success[this.theme].text};">${metrics.systemHealthPct}%</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">11 Microservices & Monotonic Sync Hub</div>
        </div>
      </div>
    `.trim();
  }

  public renderTenantDirectoryTableHtml(): string {
    const tokens = themeTokens[this.theme];
    const tenants = this.listTenants();

    const rowsHtml = tenants
      .map((t) => {
        const isSuspended = t.status === 'SUSPENDED';
        const statusBadgeColor = isSuspended
          ? semanticTokens.error[this.theme]
          : semanticTokens.success[this.theme];

        const tierBadge =
          t.subscriptionTier === 'ENTERPRISE_LOGISTICS'
            ? `<span style="background: rgba(189,150,82,0.18); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">ENTERPRISE</span>`
            : t.subscriptionTier === 'COMMERCE_PRO'
            ? `<span style="background: rgba(41,49,54,0.3); color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">COMMERCE PRO</span>`
            : `<span style="background: rgba(100,116,139,0.2); color: ${tokens.textSecondary}; border: 1px solid ${tokens.border}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">STARTER</span>`;

        return `
          <tr data-tenant-id="${t.id}" style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 14px 16px; font-weight: 600; color: ${tokens.textPrimary};">
              <div>${t.name}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: monospace;">slug: ${t.slug} • id: ${t.id}</div>
            </td>
            <td style="padding: 14px 16px; color: ${tokens.textSecondary}; font-size: 0.875rem;">
              <div>${t.ownerName}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${t.ownerEmail}</div>
            </td>
            <td style="padding: 14px 16px;">
              ${tierBadge}
            </td>
            <td style="padding: 14px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">
              ${t.companiesCount} ${t.companiesCount === 1 ? 'co' : 'cos'} / ${t.branchesCount} ${t.branchesCount === 1 ? 'branch' : 'branches'}
            </td>
            <td style="padding: 14px 16px; font-weight: 600; color: ${tokens.textPrimary}; font-size: 0.875rem;">
              ${formatCurrencyMinor(t.monthlyGmvMinor, t.currencyCode)}
            </td>
            <td style="padding: 14px 16px;">
              <span style="background: ${statusBadgeColor.bg}; color: ${statusBadgeColor.text}; border: 1px solid ${statusBadgeColor.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                ${t.status}
              </span>
            </td>
            <td style="padding: 14px 16px; text-align: right;">
              <button onclick="window.stokrovaFounder.toggleTenantStatus('${t.id}')" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: ${isSuspended ? semanticTokens.success[this.theme].bg : semanticTokens.error[this.theme].bg}; color: ${isSuspended ? semanticTokens.success[this.theme].text : semanticTokens.error[this.theme].text}; border: 1px solid ${isSuspended ? semanticTokens.success[this.theme].border : semanticTokens.error[this.theme].border};">
                ${isSuspended ? 'Reactivate' : 'Suspend'}
              </button>
              <button onclick="window.stokrovaFounder.inspectTenant('${t.id}')" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; margin-left: 6px;">
                Inspect ↗
              </button>
            </td>
          </tr>
        `;
      })
      .join('\n');

    return `
      <div class="tenant-directory-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-top: 16px;">
        <div style="padding: 16px 20px; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="margin: 0 0 4px 0; color: ${tokens.textPrimary}; font-size: 1.1rem; font-weight: 700;">Enrolled Business Organizations (Tenants)</h3>
            <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Multi-tenant isolation barrier active (Rule 21). Each business is cryptographically quarantined.</p>
          </div>
          <button onclick="window.stokrovaFounder.openEnrollModal()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
            <span>+</span>
            <span>Enroll New Business</span>
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
            <thead>
              <tr style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; font-size: 0.75rem; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">
                <th style="padding: 12px 16px;">Business Entity</th>
                <th style="padding: 12px 16px;">Account Owner</th>
                <th style="padding: 12px 16px;">SaaS Plan</th>
                <th style="padding: 12px 16px;">Structure</th>
                <th style="padding: 12px 16px;">Est. 30D Volume</th>
                <th style="padding: 12px 16px;">Status</th>
                <th style="padding: 12px 16px; text-align: right;">Killswitch & Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `.trim();
  }

  public renderEnrollModalHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div id="enroll-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
        <div style="background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 540px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h3 style="margin: 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 700;">Enroll New Business Client</h3>
            <button onclick="window.stokrovaFounder.closeEnrollModal()" style="background: transparent; border: none; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer;">✕</button>
          </div>

          <form id="enroll-business-form" onsubmit="window.stokrovaFounder.handleEnrollSubmit(event)">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Company / Legal Business Name</label>
                <input type="text" id="new-company-name" required placeholder="e.g. Zenith Global Distribution Ltd" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div>
                <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">URL Identifier / Slug</label>
                <input type="text" id="new-company-slug" required placeholder="zenith-global" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Owner Full Name</label>
                  <input type="text" id="new-owner-name" required placeholder="e.g. Liam Henderson" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Owner Email Address</label>
                  <input type="email" id="new-owner-email" required placeholder="liam@zenith.com" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Operating Currency</label>
                  <select id="new-currency-code" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">SaaS Subscription Plan</label>
                  <select id="new-subscription-tier" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                    <option value="ENTERPRISE_LOGISTICS">Enterprise Logistics ($1,999/mo)</option>
                    <option value="COMMERCE_PRO">Commerce Pro ($499/mo)</option>
                    <option value="STARTER">Starter ($99/mo)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
              <button type="button" onclick="window.stokrovaFounder.closeEnrollModal()" style="padding: 10px 18px; border-radius: 6px; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; font-weight: 600; font-size: 0.875rem; cursor: pointer;">
                Cancel
              </button>
              <button type="submit" style="padding: 10px 20px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.875rem; cursor: pointer;">
                Provision Business Account
              </button>
            </div>
          </form>
        </div>
      </div>
    `.trim();
  }

  public renderPlatformFounderPortalHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div class="platform-founder-portal">
        <div class="founder-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid ${tokens.border};">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(189,150,82,0.15); border: 1px solid #BD9652; color: #BD9652; border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">
              <span>👑</span>
              <span>PLATFORM FOUNDER CONSOLE</span>
            </div>
            <h1 style="margin: 0 0 6px 0; color: ${tokens.textPrimary}; font-size: 1.75rem; font-weight: 800;">Global Ecosystem Administration</h1>
            <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Manage all enrolled business accounts, subscription tiers, platform revenue, and infrastructure telemetry.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="window.stokrovaFounder.switchToBusinessMode()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
              <span>🏢</span>
              <span>Switch to Business View</span>
            </button>
          </div>
        </div>

        ${this.renderPlatformKpiCardsHtml()}
        ${this.renderTenantDirectoryTableHtml()}
        ${this.renderEnrollModalHtml()}
      </div>
    `.trim();
  }
}
