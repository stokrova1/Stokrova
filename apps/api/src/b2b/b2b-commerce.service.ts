import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  B2bOrganization,
  B2bCreditAccount,
  CreditExposureBreakdown,
  B2bContractPriceItem,
  ResolvedB2bPrice,
  B2bRequisition,
  CreateB2bOrganizationRequest,
  UpdateB2bCreditLimitRequest,
  SetB2bContractPriceRequest,
  EvaluateB2bPriceRequest,
  CheckCreditExposureRequest,
  CreateRequisitionRequest,
  ApproveRequisitionRequest,
  RejectRequisitionRequest,
} from '@stokrova/contracts';
import {
  CreateB2bOrganizationSchema,
  UpdateB2bCreditLimitSchema,
  SetB2bContractPriceSchema,
  EvaluateB2bPriceSchema,
  CheckCreditExposureSchema,
  CreateRequisitionSchema,
  ApproveRequisitionSchema,
  RejectRequisitionSchema,
} from '@stokrova/validation';
import {
  calculateCreditExposure,
  resolveB2bUnitPrice,
  evaluateRequisitionApprovalRequired,
  assertValidRequisitionTransition,
} from '@stokrova/domain';

@Injectable()
export class B2bCommerceService {
  private readonly organizations = new DurableMap<B2bOrganization>('b2b_organizations');
  private readonly creditAccounts = new DurableMap<B2bCreditAccount>('b2b_credit_accounts');
  private readonly contractPrices = new Map<string, B2bContractPriceItem>();
  private readonly requisitions = new DurableMap<B2bRequisition>('b2b_requisitions');
  private requisitionCounter = 1000;

  // ==========================================================================
  // B2B Organization Hierarchy
  // ==========================================================================

  async createOrganization(
    tenantId: string,
    req: CreateB2bOrganizationRequest,
  ): Promise<B2bOrganization> {
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }
    const parsed = CreateB2bOrganizationSchema.parse(req);
    const now = new Date().toISOString();
    const id = `b2borg_${randomUUID()}`;

    const org: B2bOrganization = {
      id,
      tenant_id: tenantId,
      parent_org_id: parsed.parent_org_id ?? null,
      name: parsed.name,
      tax_identifier: parsed.tax_identifier ?? null,
      org_type: parsed.org_type,
      credit_limit_minor: parsed.credit_limit_minor,
      payment_terms_days: parsed.payment_terms_days,
      currency: parsed.currency,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.organizations.set(org.id, org);

    // Automatically initialize credit account
    const creditAccount: B2bCreditAccount = {
      id: `b2bcred_${randomUUID()}`,
      tenant_id: tenantId,
      organization_id: org.id,
      credit_limit_minor: org.credit_limit_minor,
      used_exposure_minor: '0',
      available_credit_minor: org.credit_limit_minor,
      status: 'ACTIVE',
      hold_reason: null,
      last_evaluated_at: now,
    };
    this.creditAccounts.set(org.id, creditAccount);

    return org;
  }

  async getOrganization(
    tenantId: string,
    orgId: string,
  ): Promise<B2bOrganization> {
    const org = this.organizations.get(orgId);
    if (!org || org.tenant_id !== tenantId) {
      throw new NotFoundException(`B2B Organization '${orgId}' not found`);
    }
    return org;
  }

  async listOrganizations(tenantId: string): Promise<B2bOrganization[]> {
    return Array.from(this.organizations.values()).filter(
      (o) => o.tenant_id === tenantId,
    );
  }

  // ==========================================================================
  // Credit Limit & Underwriting Engine
  // ==========================================================================

  async updateCreditLimit(
    tenantId: string,
    orgId: string,
    req: UpdateB2bCreditLimitRequest,
  ): Promise<B2bCreditAccount> {
    await this.getOrganization(tenantId, orgId);
    const parsed = UpdateB2bCreditLimitSchema.parse(req);
    const now = new Date().toISOString();

    let account = this.creditAccounts.get(orgId);
    if (!account) {
      account = {
        id: `b2bcred_${randomUUID()}`,
        tenant_id: tenantId,
        organization_id: orgId,
        credit_limit_minor: parsed.credit_limit_minor,
        used_exposure_minor: '0',
        available_credit_minor: parsed.credit_limit_minor,
        status: parsed.status ?? 'ACTIVE',
        hold_reason: parsed.hold_reason ?? null,
        last_evaluated_at: now,
      };
    } else {
      account = {
        ...account,
        credit_limit_minor: parsed.credit_limit_minor,
        status: parsed.status ?? account.status,
        hold_reason: parsed.hold_reason ?? account.hold_reason,
        last_evaluated_at: now,
      };
    }

    this.creditAccounts.set(orgId, account);
    return account;
  }

  async getCreditAccount(
    tenantId: string,
    orgId: string,
  ): Promise<B2bCreditAccount> {
    await this.getOrganization(tenantId, orgId);
    const account = this.creditAccounts.get(orgId);
    if (!account) {
      throw new NotFoundException(`Credit account for '${orgId}' not found`);
    }
    return account;
  }

  async checkCreditExposure(
    tenantId: string,
    req: CheckCreditExposureRequest,
  ): Promise<CreditExposureBreakdown> {
    const parsed = CheckCreditExposureSchema.parse(req);
    const account = await this.getCreditAccount(tenantId, parsed.organization_id);

    const breakdown = calculateCreditExposure(
      account.credit_limit_minor,
      parsed.unpaid_invoices_minor,
      parsed.pending_orders_minor,
      parsed.overdue_days ?? 0,
      parsed.grace_period_days ?? 30,
    );

    // Update real-time account cache
    const updatedAccount: B2bCreditAccount = {
      ...account,
      used_exposure_minor: breakdown.total_exposure_minor,
      available_credit_minor: breakdown.available_credit_minor,
      status: breakdown.status,
      hold_reason: breakdown.is_overdue_hold
        ? 'Account in overdue credit hold'
        : breakdown.is_over_limit
          ? 'Credit limit exceeded'
          : account.hold_reason,
      last_evaluated_at: new Date().toISOString(),
    };
    this.creditAccounts.set(parsed.organization_id, updatedAccount);

    return breakdown;
  }

  // ==========================================================================
  // Contract Pricing & Tiered Volume Break Resolution
  // ==========================================================================

  async setContractPrice(
    tenantId: string,
    orgId: string,
    req: SetB2bContractPriceRequest,
  ): Promise<B2bContractPriceItem> {
    await this.getOrganization(tenantId, orgId);
    const parsed = SetB2bContractPriceSchema.parse(req);
    const id = `cprc_${randomUUID()}`;

    const priceItem: B2bContractPriceItem = {
      id,
      tenant_id: tenantId,
      organization_id: orgId,
      sku: parsed.sku,
      custom_price_minor: parsed.custom_price_minor,
      currency: parsed.currency,
      min_quantity: parsed.min_quantity,
      valid_from: parsed.valid_from ?? null,
      valid_until: parsed.valid_until ?? null,
    };

    this.contractPrices.set(id, priceItem);
    return priceItem;
  }

  async listContractPrices(
    tenantId: string,
    orgId: string,
  ): Promise<B2bContractPriceItem[]> {
    return Array.from(this.contractPrices.values()).filter(
      (p) => p.tenant_id === tenantId && p.organization_id === orgId,
    );
  }

  async evaluatePrice(
    _tenantId: string,
    req: EvaluateB2bPriceRequest,
  ): Promise<ResolvedB2bPrice> {
    const parsed = EvaluateB2bPriceSchema.parse(req);

    return resolveB2bUnitPrice({
      sku: parsed.sku,
      quantity: parsed.quantity,
      catalogListPriceMinor: parsed.catalog_list_price_minor,
      contractPriceMinor: parsed.contract_price_minor,
      volumeBreaks: parsed.volume_breaks,
      groupDiscountBp: parsed.group_discount_bp,
    });
  }

  // ==========================================================================
  // Purchase Requisitions & Approval Workflow
  // ==========================================================================

  async createRequisition(
    tenantId: string,
    req: CreateRequisitionRequest,
  ): Promise<B2bRequisition> {
    await this.getOrganization(tenantId, req.organization_id);
    const parsed = CreateRequisitionSchema.parse(req);
    const now = new Date().toISOString();
    const id = `req_${randomUUID()}`;
    const requisitionNumber = `REQ-2026-${++this.requisitionCounter}`;

    const totalAmountBigInt = parsed.items.reduce(
      (acc, item) => acc + BigInt(item.total_minor),
      0n,
    );
    const totalAmountMinor = totalAmountBigInt.toString();

    const reqEval = evaluateRequisitionApprovalRequired(
      totalAmountMinor,
      parsed.requester_approval_limit_minor,
    );
    const requiresApproval = reqEval.requires_approval;

    const status = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

    const requisition: B2bRequisition = {
      id,
      tenant_id: tenantId,
      organization_id: parsed.organization_id,
      requisition_number: requisitionNumber,
      requester_user_id: parsed.requester_user_id,
      approver_user_id: requiresApproval ? null : parsed.requester_user_id,
      status,
      total_amount_minor: totalAmountMinor,
      currency: parsed.currency,
      items: parsed.items,
      approval_notes: requiresApproval
        ? null
        : 'Auto-approved within self-approval limit',
      created_at: now,
      updated_at: now,
    };

    this.requisitions.set(id, requisition);
    return requisition;
  }

  async getRequisition(
    tenantId: string,
    requisitionId: string,
  ): Promise<B2bRequisition> {
    const req = this.requisitions.get(requisitionId);
    if (!req || req.tenant_id !== tenantId) {
      throw new NotFoundException(`Requisition '${requisitionId}' not found`);
    }
    return req;
  }

  async listRequisitions(
    tenantId: string,
    organizationId?: string,
  ): Promise<B2bRequisition[]> {
    return Array.from(this.requisitions.values()).filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (organizationId && r.organization_id !== organizationId) return false;
      return true;
    });
  }

  async approveRequisition(
    tenantId: string,
    requisitionId: string,
    req: ApproveRequisitionRequest,
  ): Promise<B2bRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);
    const parsed = ApproveRequisitionSchema.parse(req);

    assertValidRequisitionTransition(requisition.status, 'APPROVED');

    const updated: B2bRequisition = {
      ...requisition,
      status: 'APPROVED',
      approver_user_id: parsed.approver_user_id,
      approval_notes: parsed.notes ?? 'Approved by authorized manager',
      updated_at: new Date().toISOString(),
    };

    this.requisitions.set(requisitionId, updated);
    return updated;
  }

  async rejectRequisition(
    tenantId: string,
    requisitionId: string,
    req: RejectRequisitionRequest,
  ): Promise<B2bRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);
    const parsed = RejectRequisitionSchema.parse(req);

    assertValidRequisitionTransition(requisition.status, 'REJECTED');

    const updated: B2bRequisition = {
      ...requisition,
      status: 'REJECTED',
      approver_user_id: parsed.approver_user_id,
      approval_notes: parsed.rejection_reason,
      updated_at: new Date().toISOString(),
    };

    this.requisitions.set(requisitionId, updated);
    return updated;
  }
}
