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
              <button onclick="window.stokrovaApp?.showToast('Edit scope target for ${s.fullName}')" style="padding: 5px 10px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 0.75rem; cursor: pointer;">
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
          <button onclick="window.stokrovaApp?.showToast('Staff invitation modal triggered.')" style="padding: 8px 16px; border-radius: 6px; background: ${tokens.primary}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer;">
            + Invite Staff Member
          </button>
        </div>

        <div style="background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <div style="padding: 12px 16px; background: ${tokens.cardHover}; border-bottom: 1px solid ${tokens.border}; font-weight: 700; font-size: 0.85rem;">
            Active Team Members
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
            <tbody>
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
            <tbody>
              ${inviteRows || `<tr><td colspan="5" style="padding: 20px; text-align: center; color: ${tokens.textMuted};">No pending invitations</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `.trim();
  }
}
