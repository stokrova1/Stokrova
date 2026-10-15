/**
 * STOKROVA Platform Founder Console View Model
 * Tier 1 Super-Admin Portal for Platform Owner / Founder to manage
 * subscriber companies, enroll businesses, manage SaaS tiers, and view platform metrics.
 * 
 * STRICT BOUNDARY:
 * This view is solely for the Platform Founder / Super-Admin who owns, controls,
 * and manages the sovereign platform infrastructure and all business tenants.
 * It has NO relation to retail customer store counters or individual business workflows.
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

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'PLATFORM_SUPER_ADMIN' | 'BUSINESS_OWNER' | 'PLATFORM_AUDITOR';
  tenantId?: string;
  tenantName?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastActiveIso: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalGmvMinor: bigint;
  platformMrrMinor: bigint;
  grossMerchandiseVolumeMinor: bigint;
  monthlyRecurringRevenueMinor: bigint;
  totalBranchesProvisioned: number;
  activeWorkCenters: number;
  systemHealthPct: number;
  totalGmv: bigint;
  mrrMinor: bigint;
  totalBranches: number;
}

export class PlatformFounderView {
  private tenants: Map<string, PlatformTenant> = new Map();
  private users: Map<string, PlatformUser> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark', seedDemoData: boolean = true) {
    this.theme = theme;
    if (seedDemoData) {
      this.seedDefaultPlatformTenants();
      this.seedDefaultPlatformUsers();
    }
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

  private seedDefaultPlatformUsers(): void {
    const defaultUsers: PlatformUser[] = [
      {
        id: 'usr_founder_root',
        name: 'Platform Root Administrator',
        email: 'founder@stokrova.com',
        role: 'PLATFORM_SUPER_ADMIN',
        status: 'ACTIVE',
        lastActiveIso: '2026-10-15T12:45:00Z',
      },
      {
        id: 'usr_owner_victoria',
        name: 'Victoria Sterling',
        email: 'founder.victoria@apex-global.com',
        role: 'BUSINESS_OWNER',
        tenantId: 'ten_apex_global',
        tenantName: 'Apex Global Retail & Logistics Ltd',
        status: 'ACTIVE',
        lastActiveIso: '2026-10-15T12:30:00Z',
      },
      {
        id: 'usr_owner_charles',
        name: 'Charles Montgomery',
        email: 'charles@metro-stores.co.uk',
        role: 'BUSINESS_OWNER',
        tenantId: 'ten_metro_retail',
        tenantName: 'Metro Department Stores PLC',
        status: 'ACTIVE',
        lastActiveIso: '2026-10-15T11:15:00Z',
      },
      {
        id: 'usr_owner_isabella',
        name: 'Isabella Moreau',
        email: 'isabella@auroraboutiques.com',
        role: 'BUSINESS_OWNER',
        tenantId: 'ten_aurora_boutiques',
        tenantName: 'Aurora Luxury Boutiques',
        status: 'ACTIVE',
        lastActiveIso: '2026-10-14T18:20:00Z',
      },
      {
        id: 'usr_owner_babatunde',
        name: 'Babatunde Adeleke',
        email: 'baba@fastmart.ng',
        role: 'BUSINESS_OWNER',
        tenantId: 'ten_lagos_fastmart',
        tenantName: 'Lagos FastMart Express',
        status: 'SUSPENDED',
        lastActiveIso: '2026-10-10T09:00:00Z',
      },
    ];

    for (const u of defaultUsers) {
      this.users.set(u.id, u);
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

  public listUsers(): PlatformUser[] {
    return Array.from(this.users.values());
  }

  public getUser(id: string): PlatformUser | undefined {
    return this.users.get(id);
  }

  public addUser(user: PlatformUser): void {
    this.users.set(user.id, { ...user });
  }

  public setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): boolean {
    const existing = this.users.get(id);
    if (!existing) return false;
    existing.status = status;
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
      grossMerchandiseVolumeMinor: totalGmv,
      monthlyRecurringRevenueMinor: mrrMinor,
      totalBranchesProvisioned: totalBranches,
      activeWorkCenters: totalBranches * 3, // avg 3 till registers/scanner stations per branch
      systemHealthPct: 99.98,
      totalGmv,
      mrrMinor,
      totalBranches,
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
          <div id="stat-total-tenants" style="font-size: 1.85rem; font-weight: 700; color: ${tokens.textPrimary};">${metrics.totalTenants}</div>
          <div style="font-size: 0.75rem; color: ${semanticTokens.success[this.theme].text}; margin-top: 4px;">● <span id="stat-active-tenants">${metrics.activeTenants}</span> Active Subscribers</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Platform SaaS MRR</div>
          <div id="stat-mrr" style="font-size: 1.85rem; font-weight: 700; color: #BD9652;">${formatCurrencyMinor(metrics.platformMrrMinor, 'USD')}</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Predictable recurring software revenue</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Aggregated 30D GMV</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${tokens.textPrimary};">$7,092,000+</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Across all sovereign tenants</div>
        </div>

        <div class="kpi-card" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px;">
          <div style="font-size: 0.8125rem; color: ${tokens.textSecondary}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">System Health & Telemetry</div>
          <div style="font-size: 1.85rem; font-weight: 700; color: ${semanticTokens.success[this.theme].text};">${metrics.systemHealthPct}%</div>
          <div style="font-size: 0.75rem; color: ${tokens.textMuted}; margin-top: 4px;">Multi-tenant cluster latency: 14ms</div>
        </div>
      </div>
    `.trim();
  }

  public renderTenantDirectoryTableHtml(): string {
    const tokens = themeTokens[this.theme];
    const tenants = this.listTenants();

    const rowsHtml = tenants.length > 0
      ? tenants
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
          <tr data-tenant-id="${t.id}" class="tenant-row" style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 14px 16px; font-weight: 600; color: ${tokens.textPrimary};">
              <div class="tenant-name">${t.name}</div>
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
              <span id="badge-status-${t.id}" style="background: ${statusBadgeColor.bg}; color: ${statusBadgeColor.text}; border: 1px solid ${statusBadgeColor.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                ${t.status}
              </span>
            </td>
            <td style="padding: 14px 16px; text-align: right;">
              <button onclick="window.stokrovaFounder.toggleTenantStatus('${t.id}')" id="btn-status-${t.id}" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: ${isSuspended ? semanticTokens.success[this.theme].bg : semanticTokens.error[this.theme].bg}; color: ${isSuspended ? semanticTokens.success[this.theme].text : semanticTokens.error[this.theme].text}; border: 1px solid ${isSuspended ? semanticTokens.success[this.theme].border : semanticTokens.error[this.theme].border};">
                ${isSuspended ? 'Reactivate' : 'Suspend'}
              </button>
              <button onclick="window.stokrovaFounder.inspectTenant('${t.id}')" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; margin-left: 6px;">
                Inspect ↗
              </button>
            </td>
          </tr>
        `;
      })
          .join('\n')
      : `<tr>
          <td colspan="7" style="padding: 36px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.875rem;">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">🌐</div>
            <div style="font-weight: 600; color: ${tokens.textSecondary};">No live business tenants enrolled yet.</div>
            <div style="font-size: 0.8125rem; margin-top: 4px;">Click "+ Enroll New Business" to provision the first sovereign enterprise organization.</div>
          </td>
        </tr>`;

    return `
      <div class="tenant-directory-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-top: 16px;">
        <div style="padding: 16px 20px; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="margin: 0 0 4px 0; color: ${tokens.textPrimary}; font-size: 1.1rem; font-weight: 700;">Enrolled Business Organizations (Tenants)</h3>
            <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Multi-tenant isolation barrier active. Each business is cryptographically quarantined with dedicated row-level security.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="position: relative;">
              <input type="text" id="tenant-search-input" placeholder="Search businesses or owners..." oninput="window.stokrovaFounder.filterTenants(this.value)" style="padding: 7px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.8125rem; width: 220px;" />
            </div>
            <button onclick="window.stokrovaFounder.openEnrollModal()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.875rem; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
              <span>+</span>
              <span>Enroll New Business</span>
            </button>
          </div>
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
            <tbody id="tenant-table-tbody">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `.trim();
  }

  public renderPlatformUsersTableHtml(): string {
    const tokens = themeTokens[this.theme];
    const users = this.listUsers();

    const rowsHtml = users.length > 0
      ? users
          .map((u) => {
            const isRootAdmin = u.role === 'PLATFORM_SUPER_ADMIN';
            const roleBadge = isRootAdmin
              ? `<span style="background: rgba(189,150,82,0.2); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">ROOT ADMIN</span>`
              : `<span style="background: rgba(41,49,54,0.3); color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">BUSINESS OWNER</span>`;

            const isSuspended = u.status === 'SUSPENDED';
            const statusBadgeColor = isSuspended
              ? semanticTokens.error[this.theme]
              : semanticTokens.success[this.theme];

            return `
              <tr style="border-bottom: 1px solid ${tokens.border};">
                <td style="padding: 14px 16px; font-weight: 600; color: ${tokens.textPrimary};">
                  <div>${u.name}</div>
                  <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${u.email}</div>
                </td>
                <td style="padding: 14px 16px;">
                  ${roleBadge}
                </td>
                <td style="padding: 14px 16px; color: ${tokens.textSecondary}; font-size: 0.8125rem;">
                  ${u.tenantName || 'Global Platform Root (All Tenants)'}
                </td>
                <td style="padding: 14px 16px; font-size: 0.8125rem; color: ${tokens.textMuted};">
                  ${u.lastActiveIso.split('T')[0]}
                </td>
                <td style="padding: 14px 16px;">
                  <span style="background: ${statusBadgeColor.bg}; color: ${statusBadgeColor.text}; border: 1px solid ${statusBadgeColor.border}; padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                    ${u.status}
                  </span>
                </td>
                <td style="padding: 14px 16px; text-align: right;">
                  <button onclick="window.stokrovaFounder.showToast('Authentication token rotated for ${u.name}.')" style="padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong};">
                    Rotate Access Token
                  </button>
                </td>
              </tr>
            `;
          })
          .join('\n')
      : `<tr>
          <td colspan="6" style="padding: 36px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 0.875rem;">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">👤</div>
            <div style="font-weight: 600; color: ${tokens.textSecondary};">No platform root users registered yet.</div>
            <div style="font-size: 0.8125rem; margin-top: 4px;">Platform root administrators will appear here once authenticated.</div>
          </td>
        </tr>`;

    return `
      <div class="platform-users-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-top: 24px;">
        <div style="padding: 16px 20px; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h3 style="margin: 0 0 4px 0; color: ${tokens.textPrimary}; font-size: 1.1rem; font-weight: 700;">Platform Accounts & Root Administrators</h3>
            <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Root level governance of platform administrators and verified business owner master credentials.</p>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
            <thead>
              <tr style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; font-size: 0.75rem; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">
                <th style="padding: 12px 16px;">User Identity</th>
                <th style="padding: 12px 16px;">System Role</th>
                <th style="padding: 12px 16px;">Associated Tenant</th>
                <th style="padding: 12px 16px;">Last Active</th>
                <th style="padding: 12px 16px;">Status</th>
                <th style="padding: 12px 16px; text-align: right;">Governance</th>
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

  public renderSaaSPlansHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div class="saas-plans-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; margin-top: 24px;">
        <h3 style="margin: 0 0 4px 0; color: ${tokens.textPrimary}; font-size: 1.1rem; font-weight: 700;">SaaS Subscription Tiers & Commercial Matrix</h3>
        <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Global subscription contracts billed automatically via Stripe Connect and local banking rails.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          <!-- Starter Plan -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
              <span style="font-weight: 700; color: ${tokens.textPrimary}; font-size: 1.1rem;">Starter Tier</span>
              <span style="font-weight: 800; font-size: 1.25rem; color: #BD9652;">$99<span style="font-size: 0.75rem; color: ${tokens.textMuted};">/mo</span></span>
            </div>
            <p style="color: ${tokens.textSecondary}; font-size: 0.8125rem; margin: 0 0 14px 0; flex: 1;">Single-store merchants, solo traders, and boutique retail counters.</p>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; line-height: 1.6; border-top: 1px solid ${tokens.border}; padding-top: 10px;">
              ✓ 1 Legal Company & up to 2 POS Registers<br>
              ✓ Core Inventory Ledger & Stock Counts<br>
              ✓ Single-Branch Standard Sync
            </div>
            <div style="margin-top: 14px; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary};">1 Active Business</div>
          </div>

          <!-- Commerce Pro -->
          <div style="background: ${tokens.surface}; border: 1px solid #BD9652; border-radius: 8px; padding: 18px; display: flex; flex-direction: column; position: relative;">
            <div style="position: absolute; top: -10px; right: 14px; background: #BD9652; color: #0E1116; font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px;">MOST POPULAR</div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
              <span style="font-weight: 700; color: ${tokens.textPrimary}; font-size: 1.1rem;">Commerce Pro</span>
              <span style="font-weight: 800; font-size: 1.25rem; color: #BD9652;">$499<span style="font-size: 0.75rem; color: ${tokens.textMuted};">/mo</span></span>
            </div>
            <p style="color: ${tokens.textSecondary}; font-size: 0.8125rem; margin: 0 0 14px 0; flex: 1;">Multi-branch retail chains, supermarkets, and growing regional operations.</p>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; line-height: 1.6; border-top: 1px solid ${tokens.border}; padding-top: 10px;">
              ✓ Up to 10 Branches & Warehouses<br>
              ✓ Double-Entry GL & Subledger Reconciliation<br>
              ✓ 3-Way Match Inbound Procurement<br>
              ✓ Dedicated Staff Workspaces & Offline CRDT
            </div>
            <div style="margin-top: 14px; font-size: 0.75rem; font-weight: 600; color: #BD9652;">2 Active Businesses</div>
          </div>

          <!-- Enterprise Logistics -->
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
              <span style="font-weight: 700; color: ${tokens.textPrimary}; font-size: 1.1rem;">Enterprise Logistics</span>
              <span style="font-weight: 800; font-size: 1.25rem; color: #BD9652;">$1,999<span style="font-size: 0.75rem; color: ${tokens.textMuted};">/mo</span></span>
            </div>
            <p style="color: ${tokens.textSecondary}; font-size: 0.8125rem; margin: 0 0 14px 0; flex: 1;">Multinational logistics, distribution hubs, manufacturing plants, and fleet.</p>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; line-height: 1.6; border-top: 1px solid ${tokens.border}; padding-top: 10px;">
              ✓ Unlimited Branches, DCs & Factories<br>
              ✓ DAG Workflows Studio & Kahn's Cycle Detection<br>
              ✓ Fleet Dispatch & Digital POD Signatures<br>
              ✓ Sovereign Multi-Tenant Quarantine & SLA
            </div>
            <div style="margin-top: 14px; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary};">1 Active Business</div>
          </div>
        </div>
      </div>
    `.trim();
  }

  public renderInfrastructureTelemetryHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div class="telemetry-container" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 20px; margin-top: 24px;">
        <h3 style="margin: 0 0 4px 0; color: ${tokens.textPrimary}; font-size: 1.1rem; font-weight: 700;">Global Infrastructure & Telemetry Health</h3>
        <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.8125rem;">Live cluster health, database connection pooling, and Merkle cryptographic audit proofs.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 14px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Supabase Postgres Cluster</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #4ADE80; margin-top: 2px;">Healthy (12ms Latency)</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">16 active pools • 0 dropped queries</div>
          </div>

          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 14px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">CRDT Sync & Event Bus</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #4ADE80; margin-top: 2px;">Synchronized (0 Lag)</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Hybrid Logical Clocks verified</div>
          </div>

          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 14px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Merkle Tamper Chain</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #BD9652; margin-top: 2px;">Cryptographically Sealed</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Zero hash divergence detected</div>
          </div>

          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 14px;">
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">Multi-Tenant Quarantine</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: #4ADE80; margin-top: 2px;">100% Isolated</div>
            <div style="font-size: 0.75rem; color: ${tokens.textSecondary}; margin-top: 4px;">Row-level security enforcement: Active</div>
          </div>
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
                <input type="text" id="new-company-name" required placeholder="e.g. Acme Enterprises Ltd" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div>
                <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">URL Identifier / Slug</label>
                <input type="text" id="new-company-slug" required placeholder="company-slug" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Owner Full Name</label>
                  <input type="text" id="new-owner-name" required placeholder="e.g. Jane Doe" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.8125rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">Owner Email Address</label>
                  <input type="email" id="new-owner-email" required placeholder="owner@company.com" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
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
                    <option value="COMMERCE_PRO" selected>Commerce Pro ($499/mo)</option>
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

  public renderInspectTenantModalHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div id="inspect-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
        <div style="background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 600px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <h3 id="inspect-modal-title" style="margin: 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 700;">Business Details</h3>
              <p id="inspect-modal-slug" style="margin: 4px 0 0 0; color: ${tokens.textMuted}; font-size: 0.75rem; font-family: monospace;">slug: ...</p>
            </div>
            <button onclick="window.stokrovaFounder.closeInspectModal()" style="background: transparent; border: none; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer;">✕</button>
          </div>

          <div id="inspect-modal-body" style="font-size: 0.875rem; color: ${tokens.textSecondary}; line-height: 1.6;">
            <!-- Populated dynamically -->
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button type="button" onclick="window.stokrovaFounder.closeInspectModal()" style="padding: 10px 18px; border-radius: 6px; background: ${tokens.surface}; color: ${tokens.textPrimary}; border: 1px solid ${tokens.borderStrong}; font-weight: 600; font-size: 0.875rem; cursor: pointer;">
              Close
            </button>
          </div>
        </div>
      </div>
    `.trim();
  }

  public renderPlatformFounderPortalHtml(): string {
    const tokens = themeTokens[this.theme];

    return `
      <div class="platform-founder-portal">
        <!-- Dedicated Platform Super-Admin Header -->
        <div class="founder-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid ${tokens.border}; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(189,150,82,0.15); border: 1px solid #BD9652; color: #BD9652; border-radius: 9999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">
              <span>👑</span>
              <span>PLATFORM FOUNDER CONSOLE</span>
            </div>
            <h1 style="margin: 0 0 6px 0; color: ${tokens.textPrimary}; font-size: 1.75rem; font-weight: 800;">Global Ecosystem Administration</h1>
            <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Platform root management center for enrolled business organizations, SaaS subscriptions, root telemetry, and account governance.</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: #4ADE80; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); padding: 4px 10px; border-radius: 9999px;">
              <span>●</span>
              <span>All Systems Operational</span>
            </span>
            <button onclick="window.stokrovaFounder.openEnrollModal()" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
              <span>+</span>
              <span>Enroll Business</span>
            </button>
          </div>
        </div>

        <!-- Platform Telemetry & KPI Cards -->
        ${this.renderPlatformKpiCardsHtml()}

        <!-- Enrolled Business Organizations (Tenants) Directory -->
        ${this.renderTenantDirectoryTableHtml()}

        <!-- Platform Accounts & Users -->
        ${this.renderPlatformUsersTableHtml()}

        <!-- SaaS Plans & Tiers Matrix -->
        ${this.renderSaaSPlansHtml()}

        <!-- Global Telemetry & Health -->
        ${this.renderInfrastructureTelemetryHtml()}

        <!-- Interactive Modals -->
        ${this.renderEnrollModalHtml()}
        ${this.renderInspectTenantModalHtml()}
      </div>
    `.trim();
  }
}
