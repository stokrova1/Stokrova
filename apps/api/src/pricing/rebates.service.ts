import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  RebateAgreement,
  RebateTier,
  RebateAccrual,
  CreateRebateAgreementRequest,
  AddRebateTierRequest,
  CalculateRebateAccrualRequest,
  SettleRebateRequest,
} from '@stokrova/contracts';
import {
  calculateGraduatedRebate,
  calculateRetroactiveRebate,
  assertValidRebateStatusTransition,
  DomainRebateTier,
} from '@stokrova/domain';

@Injectable()
export class RebatesService {
  private agreementsStore = new Map<string, RebateAgreement>();
  private tiersStore = new Map<string, RebateTier[]>(); // agreementId -> tiers
  private accrualsStore = new Map<string, RebateAccrual>(); // accrualId -> accrual

  // --------------------------------------------------------------------------
  // Agreement & Tier Administration
  // --------------------------------------------------------------------------

  async createAgreement(
    tenantId: string,
    req: CreateRebateAgreementRequest,
  ): Promise<RebateAgreement> {
    const existing = Array.from(this.agreementsStore.values()).find(
      (a) => a.tenant_id === tenantId && a.agreement_number === req.agreement_number,
    );
    if (existing) {
      throw new ConflictException(`Rebate agreement '${req.agreement_number}' already exists.`);
    }

    const now = new Date().toISOString();
    const agreement: RebateAgreement = {
      id: `ragr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      agreement_number: req.agreement_number,
      name: req.name.trim(),
      rebate_type: req.rebate_type,
      counterparty_type: req.counterparty_type,
      counterparty_id: req.counterparty_id,
      currency_code: req.currency_code || 'USD',
      calculation_method: req.calculation_method || 'GRADUATED_TIERS',
      settlement_frequency: req.settlement_frequency || 'QUARTERLY',
      valid_from: req.valid_from,
      valid_until: req.valid_until,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    this.agreementsStore.set(agreement.id, agreement);
    this.tiersStore.set(agreement.id, []);
    return agreement;
  }

  async addTier(
    tenantId: string,
    agreementId: string,
    req: AddRebateTierRequest,
  ): Promise<RebateTier> {
    const agreement = await this.getAgreement(tenantId, agreementId);

    const tier: RebateTier = {
      id: `rtier_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      agreement_id: agreement.id,
      tier_number: req.tier_number,
      threshold_quantity: req.threshold_quantity ?? null,
      threshold_amount_minor: req.threshold_amount_minor ?? null,
      rebate_rate_bp: req.rebate_rate_bp,
      fixed_rebate_per_unit_minor: req.fixed_rebate_per_unit_minor ?? null,
      created_at: new Date().toISOString(),
    };

    const currentTiers = this.tiersStore.get(agreement.id) || [];
    currentTiers.push(tier);
    this.tiersStore.set(agreement.id, currentTiers);

    return tier;
  }

  async getAgreement(tenantId: string, agreementId: string): Promise<RebateAgreement> {
    const a = this.agreementsStore.get(agreementId);
    if (!a || a.tenant_id !== tenantId) {
      throw new NotFoundException(`Rebate agreement '${agreementId}' not found.`);
    }
    return a;
  }

  // --------------------------------------------------------------------------
  // Accrual Calculation Engine
  // --------------------------------------------------------------------------

  async calculateAccrual(
    tenantId: string,
    req: CalculateRebateAccrualRequest,
  ): Promise<RebateAccrual> {
    const agreement = await this.getAgreement(tenantId, req.agreement_id);
    const rawTiers = this.tiersStore.get(agreement.id) || [];

    const isSpend =
      agreement.rebate_type === 'CUSTOMER_SPEND' ||
      agreement.rebate_type === 'SUPPLIER_SPEND';

    const domainTiers: DomainRebateTier[] = rawTiers.map((t) => ({
      tier_number: t.tier_number,
      threshold_quantity: t.threshold_quantity,
      threshold_amount_minor: t.threshold_amount_minor,
      rebate_rate_bp: t.rebate_rate_bp,
      fixed_rebate_per_unit_minor: t.fixed_rebate_per_unit_minor,
    }));

    let calculatedAccrualMinor = '0';
    if (agreement.calculation_method === 'GRADUATED_TIERS') {
      calculatedAccrualMinor = calculateGraduatedRebate({
        isSpendBased: isSpend,
        totalQuantity: req.eligible_quantity,
        totalSpendMinor: req.eligible_spend_minor,
        tiers: domainTiers,
      });
    } else {
      const retro = calculateRetroactiveRebate({
        isSpendBased: isSpend,
        totalQuantity: req.eligible_quantity,
        totalSpendMinor: req.eligible_spend_minor,
        tiers: domainTiers,
      });
      calculatedAccrualMinor = retro.rebate_minor;
    }

    const accrualId = `racc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const accrual: RebateAccrual = {
      id: accrualId,
      tenant_id: tenantId,
      agreement_id: agreement.id,
      counterparty_id: agreement.counterparty_id,
      period_identifier: req.period_identifier,
      eligible_quantity: req.eligible_quantity,
      eligible_spend_minor: req.eligible_spend_minor,
      calculated_accrual_minor: calculatedAccrualMinor,
      status: 'ACCRUED',
      credit_note_reference: null,
      settlement_reference: null,
      operation_id: req.operation_id || null,
      last_recalculated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.accrualsStore.set(accrual.id, accrual);
    return accrual;
  }

  async getAccrual(tenantId: string, accrualId: string): Promise<RebateAccrual> {
    const acc = this.accrualsStore.get(accrualId);
    if (!acc || acc.tenant_id !== tenantId) {
      throw new NotFoundException(`Rebate accrual '${accrualId}' not found.`);
    }
    return acc;
  }

  // --------------------------------------------------------------------------
  // Claim, Approval & Settlement Lifecycle
  // --------------------------------------------------------------------------

  async claimAccrual(tenantId: string, accrualId: string): Promise<RebateAccrual> {
    const accrual = await this.getAccrual(tenantId, accrualId);
    assertValidRebateStatusTransition(accrual.status, 'CLAIMED');

    accrual.status = 'CLAIMED';
    accrual.last_recalculated_at = new Date().toISOString();
    return accrual;
  }

  async approveClaim(
    tenantId: string,
    accrualId: string,
    _approvedBy: string,
  ): Promise<RebateAccrual> {
    const accrual = await this.getAccrual(tenantId, accrualId);
    assertValidRebateStatusTransition(accrual.status, 'APPROVED');

    accrual.status = 'APPROVED';
    accrual.last_recalculated_at = new Date().toISOString();
    return accrual;
  }

  async settleRebate(
    tenantId: string,
    req: SettleRebateRequest,
  ): Promise<RebateAccrual> {
    // 1. Idempotency Check via operation_id
    const existing = Array.from(this.accrualsStore.values()).find(
      (a) => a.tenant_id === tenantId && a.operation_id === req.operation_id && a.status === 'SETTLED',
    );
    if (existing) {
      return existing; // Idempotent return
    }

    const accrual = await this.getAccrual(tenantId, req.accrual_id);
    if (accrual.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot settle rebate in status '${accrual.status}'. Must be 'APPROVED'.`,
      );
    }

    assertValidRebateStatusTransition(accrual.status, 'SETTLED');

    accrual.status = 'SETTLED';
    accrual.settlement_reference = req.settlement_reference;
    accrual.credit_note_reference = req.credit_note_reference || null;
    accrual.operation_id = req.operation_id;
    accrual.last_recalculated_at = new Date().toISOString();

    return accrual;
  }
}
