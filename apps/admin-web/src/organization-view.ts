/**
 * STOKROVA Admin Web — Organization, Companies & Branch Management View
 * Legal entities, holding subsidiaries, physical branches, and work center stations.
 */

import { themeTokens } from '@stokrova/ui';

export interface AdminCompanyRecord {
  id: string;
  name: string;
  legalEntityCode: string;
  currencyCode: string;
  taxIdentifier: string;
  branchesCount: number;
  isHoldingCompany: boolean;
}

export interface AdminBranchRecord {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  code: string;
  address: string;
  registersCount: number;
  warehousesCount: number;
  isActive: boolean;
}

export class OrganizationViewModel {
  private companies: Map<string, AdminCompanyRecord> = new Map();
  private branches: Map<string, AdminBranchRecord> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addCompany(company: AdminCompanyRecord): void {
    this.companies.set(company.id, { ...company });
  }

  public listCompanies(): AdminCompanyRecord[] {
    return Array.from(this.companies.values());
  }

  public addBranch(branch: AdminBranchRecord): void {
    this.branches.set(branch.id, { ...branch });
  }

  public listBranches(): AdminBranchRecord[] {
    return Array.from(this.branches.values());
  }

  public renderOrganizationHtml(): string {
    const tokens = themeTokens[this.theme];
    const companies = this.listCompanies();
    const branches = this.listBranches();

    const companyRows = companies
      .map((c) => `
        <tr style="border-bottom: 1px solid ${tokens.border};">
          <td style="padding: 12px 14px; font-weight: 600;">
            <div>${c.name}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">${c.legalEntityCode}</div>
          </td>
          <td style="padding: 12px 14px; font-family: var(--stokrova-font-mono);">${c.currencyCode}</td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">${c.taxIdentifier}</td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">${c.branchesCount} branches</td>
          <td style="padding: 12px 14px; text-align: right;">
            <button onclick="window.stokrovaApp?.showToast('Configure company ${c.name}')" style="padding: 5px 10px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">
              Configure ↗
            </button>
          </td>
        </tr>
      `.trim())
      .join('\n');

    const branchRows = branches
      .map((b) => `
        <tr style="border-bottom: 1px solid ${tokens.border};">
          <td style="padding: 12px 14px; font-weight: 600;">
            <div>${b.name}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted}; font-family: var(--stokrova-font-mono);">${b.code}</div>
          </td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">${b.companyName}</td>
          <td style="padding: 12px 14px; font-size: 0.8125rem; color: ${tokens.textSecondary};">${b.address}</td>
          <td style="padding: 12px 14px; font-size: 0.8125rem;">
            ${b.registersCount} registers / ${b.warehousesCount} warehouses
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="background: ${b.isActive ? '#14291F' : '#2C1518'}; color: ${b.isActive ? '#4ADE80' : '#F87171'}; border: 1px solid ${b.isActive ? '#1E4620' : '#5C1D24'}; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
              ${b.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </td>
        </tr>
      `.trim())
      .join('\n');

    return `
      <div class="organization-management-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Legal Entities & Branch Topology</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Multi-company holding corporate structure and physical retail/warehouse facilities</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.stokrovaApp?.showToast('New Company dialog triggered.')" style="padding: 8px 14px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
              + Add Company
            </button>
            <button onclick="window.stokrovaApp?.showToast('New Branch dialog triggered.')" style="padding: 8px 14px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
              + Add Branch
            </button>
          </div>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <div style="padding: 12px 16px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; font-weight: 700; font-size: 0.85rem;">
            Subsidiary Companies & Holding Entities
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem; text-align: left;">
                <th style="padding: 10px 14px;">Entity Name & Code</th>
                <th style="padding: 10px 14px;">Currency</th>
                <th style="padding: 10px 14px;">Tax ID</th>
                <th style="padding: 10px 14px;">Branches</th>
                <th style="padding: 10px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${companyRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: ${tokens.textMuted};">No companies registered</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
          <div style="padding: 12px 16px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; font-weight: 700; font-size: 0.85rem;">
            Physical Operating Branches & Outlets
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem; text-align: left;">
                <th style="padding: 10px 14px;">Branch Name & Code</th>
                <th style="padding: 10px 14px;">Parent Company</th>
                <th style="padding: 10px 14px;">Location Address</th>
                <th style="padding: 10px 14px;">Stations & Storage</th>
                <th style="padding: 10px 14px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${branchRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: ${tokens.textMuted};">No branches configured</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `.trim();
  }
}
