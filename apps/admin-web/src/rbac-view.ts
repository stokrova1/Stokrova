/**
 * STOKROVA Admin Web — Scoped Dynamic RBAC & Staff Management View
 * 5-tier dimensional scope assignments (Tenant -> Company -> Branch -> Warehouse -> Register),
 * staff invitation link generation, and active role capability matrices.
 */

import { themeTokens, semanticTokens } from '@stokrova/ui';

export interface ScopeTargetSummary {
  companyName?: string;
  branchName?: string;
  warehouseName?: string;
  registerCode?: string;
}

export interface StaffMemberRecord {
  id: string;
  fullName: string;
  email: string;
  roleCode: string;
  roleName: string;
  scope: ScopeTargetSummary;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedDateIso: string;
}

export interface StaffInvitationSummary {
  id: string;
  email: string;
  fullName: string;
  roleName: string;
  scopeDescription: string;
  inviteUrl: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAtIso: string;
}

export class RbacViewModel {
  private staff: Map<string, StaffMemberRecord> = new Map();
  private invitations: Map<string, StaffInvitationSummary> = new Map();
  private theme: 'light' | 'dark';

  constructor(theme: 'light' | 'dark' = 'dark') {
    this.theme = theme;
  }

  public addStaffMember(member: StaffMemberRecord): void {
    this.staff.set(member.id, { ...member });
  }

  public listStaff(): StaffMemberRecord[] {
    return Array.from(this.staff.values());
  }

  public addInvitation(invitation: StaffInvitationSummary): void {
    this.invitations.set(invitation.id, { ...invitation });
  }

  public listInvitations(): StaffInvitationSummary[] {
    return Array.from(this.invitations.values());
  }

  public renderStaffManagementHtml(): string {
    const tokens = themeTokens[this.theme];
    const staff = this.listStaff();
    const invitations = this.listInvitations();

    const staffRows = staff
      .map((s) => {
        const scopeLabel = s.scope.branchName
          ? `Branch: ${s.scope.branchName}`
          : s.scope.companyName
          ? `Company: ${s.scope.companyName}`
          : 'Tenant Global';

        const st = semanticTokens;
        let badgeColor: { readonly bg: string; readonly text: string; readonly border: string } = st.success[this.theme];
        if (s.status === 'INVITED') badgeColor = st.info[this.theme];
        if (s.status === 'SUSPENDED') badgeColor = st.error[this.theme];

        return `
          <tr style="border-bottom: 1px solid ${tokens.border};">
            <td style="padding: 12px 14px;">
              <div style="font-weight: 600;">${s.fullName}</div>
              <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${s.email}</div>
            </td>
            <td style="padding: 12px 14px;">
              <span style="background: rgba(189,150,82,0.15); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                ${s.roleName}
              </span>
            </td>
            <td style="padding: 12px 14px; font-size: 0.8125rem; color: ${tokens.textSecondary};">
              ${scopeLabel}
            </td>
            <td style="padding: 12px 14px; text-align: center;">
              <span style="background: ${badgeColor.bg}; color: ${badgeColor.text}; border: 1px solid ${badgeColor.border}; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                ${s.status}
              </span>
            </td>
            <td style="padding: 12px 14px; text-align: right;">
              <button onclick="window.stokrovaApp?.openEditScopeModal ? window.stokrovaApp.openEditScopeModal('${s.fullName}') : window.stokrovaApp?.showToast('Edit scope target for ${s.fullName}')" style="padding: 5px 10px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">
                Configure Scope ↗
              </button>
            </td>
          </tr>
        `.trim();
      })
      .join('\n');

    const inviteRows = invitations
      .map((inv) => `
        <tr style="border-bottom: 1px solid ${tokens.border};">
          <td style="padding: 10px 14px;">
            <div style="font-weight: 600;">${inv.fullName}</div>
            <div style="font-size: 0.75rem; color: ${tokens.textMuted};">${inv.email}</div>
          </td>
          <td style="padding: 10px 14px; font-size: 0.8125rem;">${inv.roleName}</td>
          <td style="padding: 10px 14px; font-size: 0.8125rem; color: ${tokens.textSecondary};">${inv.scopeDescription}</td>
          <td style="padding: 10px 14px; font-size: 0.75rem; font-family: var(--stokrova-font-mono); color: ${tokens.primary};">
            ${inv.inviteUrl.split('?token=')[0]}...
          </td>
          <td style="padding: 10px 14px; text-align: right;">
            <button onclick="navigator.clipboard.writeText('${inv.inviteUrl}'); window.stokrovaApp?.showToast('Copied invitation link to clipboard!')" style="padding: 4px 8px; border-radius: 4px; background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">
              Copy Link
            </button>
          </td>
        </tr>
      `.trim())
      .join('\n');

    return `
      <div class="rbac-staff-management-view" style="color: ${tokens.textPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Staff Members & Scoped Dynamic RBAC</h3>
            <p style="margin: 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Multi-dimensional operational boundaries: Branch, Warehouse, and Register scopes</p>
          </div>
          <button onclick="window.openStaffInviteModal ? window.openStaffInviteModal() : (window.stokrovaApp?.openStaffInviteModal ? window.stokrovaApp.openStaffInviteModal() : null)" style="padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            + Invite Staff Member
          </button>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <div style="padding: 12px 16px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; font-weight: 700; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Active Team Members</span>
            <span style="font-size: 0.75rem; color: ${tokens.textMuted};" id="staff-count-badge">${staff.length} Staff Members Active</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem; text-align: left;">
                <th style="padding: 10px 14px;">Staff Name & Email</th>
                <th style="padding: 10px 14px;">Assigned Role</th>
                <th style="padding: 10px 14px;">Operational Scope</th>
                <th style="padding: 10px 14px; text-align: center;">Status</th>
                <th style="padding: 10px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="staff-table-body">
              ${staffRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: ${tokens.textMuted};">No active staff members</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden;">
          <div style="padding: 12px 16px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; font-weight: 700; font-size: 0.85rem;">
            Pending Staff Invitations
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.7rem; text-align: left;">
                <th style="padding: 10px 14px;">Invitee</th>
                <th style="padding: 10px 14px;">Target Role</th>
                <th style="padding: 10px 14px;">Assigned Scope</th>
                <th style="padding: 10px 14px;">Secure URL</th>
                <th style="padding: 10px 14px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="pending-invitations-list">
              ${inviteRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: ${tokens.textMuted};">No pending invitations</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- 5-Tier Scope Hierarchy (Dimensional Scoping) -->
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 20px; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: ${tokens.textPrimary};">5-Tier Operational Scope Tree (Dimensional Boundaries)</h4>
              <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: ${tokens.textSecondary};">Guarantees strict tenant isolation while enabling precise per-facility delegation</p>
            </div>
            <span style="background: rgba(189,150,82,0.15); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700;">
              Hierarchical RBAC Active
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
            <div style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; border-top: 3px solid #BD9652;">
              <div style="font-size: 0.65rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700;">Tier 1: Tenant Scope</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${tokens.textPrimary}; margin-top: 4px;">Active Sovereign Tenant</div>
              <div style="font-size: 0.7rem; color: #16A34A; margin-top: 4px;">● Global Tenant Root</div>
            </div>
            <div style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; border-top: 3px solid #3B82F6;">
              <div style="font-size: 0.65rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700;">Tier 2: Company Scope</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${tokens.textPrimary}; margin-top: 4px;">Operating Legal Entity</div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary}; margin-top: 4px;">Legal & Fiscal Entity</div>
            </div>
            <div style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; border-top: 3px solid #10B981;">
              <div style="font-size: 0.65rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700;">Tier 3: Branch Scope</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${tokens.textPrimary}; margin-top: 4px;">Active Commercial Branch</div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary}; margin-top: 4px;">Commercial Store Front</div>
            </div>
            <div style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; border-top: 3px solid #8B5CF6;">
              <div style="font-size: 0.65rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700;">Tier 4: Warehouse Scope</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${tokens.textPrimary}; margin-top: 4px;">Facility Storage Bins</div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary}; margin-top: 4px;">Multi-Tier Storage Bins</div>
            </div>
            <div style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 12px; border-top: 3px solid #EC4899;">
              <div style="font-size: 0.65rem; color: ${tokens.textMuted}; text-transform: uppercase; font-weight: 700;">Tier 5: Till Register Scope</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: ${tokens.textPrimary}; margin-top: 4px;">Cashier Workstation</div>
              <div style="font-size: 0.7rem; color: ${tokens.textSecondary}; margin-top: 4px;">Hardware POS Float</div>
            </div>
          </div>
        </div>

        <!-- Capability Matrix (Audit Section 4 & 32 Roles) -->
        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 10px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="padding: 14px 18px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: ${tokens.textPrimary};">Enterprise Role Capability Matrix</h4>
              <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: ${tokens.textSecondary};">Granular domain permissions enforced at API, domain invariants, and UI presentation</p>
            </div>
            <span style="font-size: 0.75rem; color: ${tokens.textMuted};">Server-Side Authorization Enforced</span>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
              <thead>
                <tr style="border-bottom: 2px solid ${tokens.borderStrong}; color: ${tokens.textMuted}; text-transform: uppercase; font-size: 0.6875rem; text-align: left; background: ${tokens.card};">
                  <th style="padding: 10px 14px;">Role Profile</th>
                  <th style="padding: 10px 12px; text-align: center;">Sales & POS</th>
                  <th style="padding: 10px 12px; text-align: center;">Pricing & Discounts</th>
                  <th style="padding: 10px 12px; text-align: center;">Inventory & Bins</th>
                  <th style="padding: 10px 12px; text-align: center;">Procurement & Match</th>
                  <th style="padding: 10px 12px; text-align: center;">Double-Entry Ledger</th>
                  <th style="padding: 10px 12px; text-align: center;">Audit & Forensics</th>
                  <th style="padding: 10px 12px; text-align: center;">Tenant Settings</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid ${tokens.border};">
                  <td style="padding: 10px 14px; font-weight: 700; color: #BD9652;">🏢 Business Owner</td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">ALL</span></td>
                </tr>
                <tr style="border-bottom: 1px solid ${tokens.border};">
                  <td style="padding: 10px 14px; font-weight: 600; color: ${tokens.textPrimary};">🏪 Store Manager</td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Branch</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #F59E0B;">&le; 10% Override</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Branch</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Receipt Only</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #F59E0B;">Tills Only</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Read</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                </tr>
                <tr style="border-bottom: 1px solid ${tokens.border};">
                  <td style="padding: 10px 14px; font-weight: 600; color: ${tokens.textPrimary};">💳 Head Cashier</td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">POS Checkout</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #64748B;">Lookup</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Till Blind Count</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                </tr>
                <tr style="border-bottom: 1px solid ${tokens.border};">
                  <td style="padding: 10px 14px; font-weight: 600; color: ${tokens.textPrimary};">📦 Warehouse Operator</td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Pick & Transfer</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Goods Inbound</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #EF4444;">DENIED</span></td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: 600; color: ${tokens.textPrimary};">⚖️ Financial Controller</td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Read</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Full Manage</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Valuation</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">3-Way Match Audit</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A; font-weight: 700;">GL Post & Reconcile</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #16A34A;">Audit Trail</span></td>
                  <td style="padding: 10px 12px; text-align: center;"><span style="color: #64748B;">Fiscal Rules</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Staff Invitation Modal -->
        <div id="modal-invite-staff" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
          <div style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; width: 100%; max-width: 520px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0; font-size: 1.25rem; color: ${tokens.textPrimary}; font-weight: 700;">Invite & Add Staff Member</h3>
                <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: ${tokens.textSecondary};">Provision worker account with role-scoped operational permissions</p>
              </div>
              <button onclick="window.closeStaffInviteModal ? window.closeStaffInviteModal() : (window.stokrovaApp?.closeStaffInviteModal ? window.stokrovaApp.closeStaffInviteModal() : null)" style="background: none; border: none; font-size: 1.4rem; color: ${tokens.textMuted}; cursor: pointer;">&times;</button>
            </div>

            <form id="form-invite-staff" onsubmit="window.handleStaffInviteSubmit ? window.handleStaffInviteSubmit(event) : (window.stokrovaApp?.handleStaffInviteSubmit ? window.stokrovaApp.handleStaffInviteSubmit(event) : null)">
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">STAFF FULL NAME *</label>
                <input id="invite-staff-name" type="text" required placeholder="e.g. Jane Doe" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">WORK EMAIL ADDRESS *</label>
                <input id="invite-staff-email" type="email" required placeholder="staff@company.com" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">ASSIGNED ROLE *</label>
                  <select id="invite-staff-role" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                    <option value="Store Manager">Store Manager</option>
                    <option value="Head Cashier" selected>Head Cashier</option>
                    <option value="Warehouse Operator">Warehouse Operator</option>
                    <option value="Procurement Officer">Procurement Officer</option>
                    <option value="Financial Controller">Financial Controller</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">BRANCH / FACILITY *</label>
                  <select id="invite-staff-branch" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem;">
                    <option value="Primary Branch" selected>Primary Branch</option>
                    <option value="All Branches (Tenant Wide)">All Branches (Tenant Wide)</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 24px;">
                <label style="display: block; font-size: 0.75rem; font-weight: 600; color: ${tokens.textSecondary}; margin-bottom: 6px;">TEMPORARY ACCESS PIN / PASSWORD *</label>
                <input id="invite-staff-pin" type="text" required placeholder="4-digit PIN (e.g. 1234)" style="width: 100%; padding: 10px 12px; border-radius: 6px; background: ${tokens.cardHover}; border: 1px solid ${tokens.border}; color: ${tokens.textPrimary}; font-size: 0.875rem; font-family: var(--stokrova-font-mono);" />
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button type="button" onclick="window.closeStaffInviteModal ? window.closeStaffInviteModal() : (window.stokrovaApp?.closeStaffInviteModal ? window.stokrovaApp.closeStaffInviteModal() : null)" style="padding: 10px 18px; border-radius: 6px; border: 1px solid ${tokens.border}; background: transparent; color: ${tokens.textPrimary}; font-size: 0.875rem; cursor: pointer;">
                  Cancel
                </button>
                <button type="submit" style="padding: 10px 22px; border-radius: 6px; border: none; background: ${tokens.primary}; color: ${tokens.primaryForeground}; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
                  Send Invite & Add Staff →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `.trim();
  }
}
