import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  TaxRegistration,
  TaxJurisdictionConfig,
  TaxFilingPeriod,
  TaxReturn,
  TaxFilingSubmission,
  CreateTaxRegistrationRequest,
  CreateTaxJurisdictionConfigRequest,
  CreateTaxFilingPeriodRequest,
  PrepareTaxReturnRequest,
} from '@stokrova/contracts';
import {
  calculateTaxAmountFromBasisPoints,
  calculateNetTaxDue,
  assertValidTaxReturnStatusTransition,
  reconcileTaxWithGl,
} from '@stokrova/domain';
import {
  ITaxProviderAdapter,
  MockTaxProviderAdapter,
} from './adapters/tax-provider.adapter.js';

@Injectable()
export class TaxComplianceService {
  private registrations: Map<string, TaxRegistration> = new Map();
  private configs: Map<string, TaxJurisdictionConfig> = new Map(); // key: tenantId:jurCode:version
  private periods: Map<string, TaxFilingPeriod> = new Map();
  private returns: Map<string, TaxReturn> = new Map();
  private submissions: Map<string, TaxFilingSubmission> = new Map();
  private defaultAdapter: ITaxProviderAdapter = new MockTaxProviderAdapter();

  // ==========================================================================
  // Registrations & Jurisdiction Configurations
  // ==========================================================================

  async createTaxRegistration(
    tenantId: string,
    req: CreateTaxRegistrationRequest,
  ): Promise<TaxRegistration> {
    const existing = Array.from(this.registrations.values()).find(
      (r) =>
        r.tenant_id === tenantId &&
        r.company_id === req.company_id &&
        r.jurisdiction_code === req.jurisdiction_code,
    );
    if (existing) {
      throw new ConflictException('Tax registration already exists for this jurisdiction');
    }

    const reg: TaxRegistration = {
      id: `treg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      company_id: req.company_id,
      jurisdiction_code: req.jurisdiction_code,
      tax_id_number: req.tax_id_number,
      tax_type: req.tax_type || 'VAT',
      filing_frequency: req.filing_frequency || 'MONTHLY',
      effective_from: req.effective_from,
      effective_to: req.effective_to ?? null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.registrations.set(reg.id, reg);
    return reg;
  }

  async createJurisdictionConfig(
    tenantId: string,
    req: CreateTaxJurisdictionConfigRequest,
  ): Promise<TaxJurisdictionConfig> {
    const version = req.version || 1;
    const key = `${tenantId}:${req.jurisdiction_code}:${version}`;
    if (this.configs.has(key)) {
      throw new ConflictException(`Tax configuration version ${version} already exists`);
    }

    const config: TaxJurisdictionConfig = {
      id: `tjcfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      jurisdiction_code: req.jurisdiction_code,
      version,
      standard_rate_basis_points: req.standard_rate_basis_points,
      reduced_rate_basis_points: req.reduced_rate_basis_points || 0,
      zero_rate_basis_points: req.zero_rate_basis_points || 0,
      output_tax_account_code: req.output_tax_account_code || '2100',
      input_tax_account_code: req.input_tax_account_code || '2105',
      effective_from: req.effective_from,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.configs.set(key, config);
    return config;
  }

  async createFilingPeriod(
    tenantId: string,
    req: CreateTaxFilingPeriodRequest,
  ): Promise<TaxFilingPeriod> {
    const reg = this.registrations.get(req.registration_id);
    if (!reg || reg.tenant_id !== tenantId) {
      throw new NotFoundException(`Tax registration ${req.registration_id} not found`);
    }

    const period: TaxFilingPeriod = {
      id: `tper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      registration_id: req.registration_id,
      period_name: req.period_name,
      start_date: req.start_date,
      end_date: req.end_date,
      due_date: req.due_date,
      status: 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.periods.set(period.id, period);
    return period;
  }

  // ==========================================================================
  // Tax Return Preparation & GL Reconciliation
  // ==========================================================================

  async prepareTaxReturn(
    tenantId: string,
    req: PrepareTaxReturnRequest,
    taxableSalesMinor: string,
    taxablePurchasesMinor: string,
    glControlBalanceMinor: string,
  ): Promise<TaxReturn> {
    // 1. Idempotency Check
    const existing = Array.from(this.returns.values()).find(
      (r) => r.tenant_id === tenantId && r.operation_id === req.operation_id,
    );
    if (existing) {
      return existing;
    }

    const period = this.periods.get(req.filing_period_id);
    if (!period || period.tenant_id !== tenantId) {
      throw new NotFoundException(`Filing period ${req.filing_period_id} not found`);
    }

    const reg = this.registrations.get(period.registration_id);
    if (!reg) {
      throw new NotFoundException('Associated tax registration not found');
    }

    // Find active jurisdiction config
    const config = Array.from(this.configs.values()).find(
      (c) => c.tenant_id === tenantId && c.jurisdiction_code === reg.jurisdiction_code && c.is_active,
    );
    const standardRate = config ? config.standard_rate_basis_points : 750; // default 7.5%

    // 2. Pure integer calculations
    const outputTaxMinor = calculateTaxAmountFromBasisPoints(taxableSalesMinor, standardRate);
    const inputTaxMinor = calculateTaxAmountFromBasisPoints(taxablePurchasesMinor, standardRate);
    const netTaxDueMinor = calculateNetTaxDue(outputTaxMinor, inputTaxMinor);

    // 3. GL Reconciliation
    const { discrepancy_minor } = reconcileTaxWithGl(netTaxDueMinor, glControlBalanceMinor);

    const taxReturn: TaxReturn = {
      id: `txret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      filing_period_id: req.filing_period_id,
      company_id: req.company_id,
      operation_id: req.operation_id,
      reporting_currency: 'USD',
      total_taxable_sales_minor: taxableSalesMinor,
      total_output_tax_minor: outputTaxMinor,
      total_taxable_purchases_minor: taxablePurchasesMinor,
      total_recoverable_input_tax_minor: inputTaxMinor,
      net_tax_due_minor: netTaxDueMinor,
      gl_control_account_balance_minor: glControlBalanceMinor,
      reconciliation_difference_minor: discrepancy_minor,
      status: 'VALIDATED',
      prepared_by: req.prepared_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.returns.set(taxReturn.id, taxReturn);
    return taxReturn;
  }

  async approveTaxReturn(
    tenantId: string,
    taxReturnId: string,
    approvedBy: string,
  ): Promise<TaxReturn> {
    const taxReturn = this.returns.get(taxReturnId);
    if (!taxReturn || taxReturn.tenant_id !== tenantId) {
      throw new NotFoundException(`Tax return ${taxReturnId} not found`);
    }

    assertValidTaxReturnStatusTransition(taxReturn.status, 'APPROVED');
    taxReturn.status = 'APPROVED';
    taxReturn.approved_by = approvedBy;
    taxReturn.updated_at = new Date().toISOString();

    return taxReturn;
  }

  // ==========================================================================
  // Electronic Filing & Submission Retry
  // ==========================================================================

  async submitTaxReturn(
    tenantId: string,
    taxReturnId: string,
    _submittedBy: string,
    adapter?: ITaxProviderAdapter,
  ): Promise<{ tax_return: TaxReturn; submission: TaxFilingSubmission }> {
    const taxReturn = this.returns.get(taxReturnId);
    if (!taxReturn || taxReturn.tenant_id !== tenantId) {
      throw new NotFoundException(`Tax return ${taxReturnId} not found`);
    }

    if (taxReturn.status !== 'APPROVED' && taxReturn.status !== 'VALIDATED') {
      throw new BadRequestException(`Tax return must be APPROVED before submission, current: ${taxReturn.status}`);
    }

    const provider = adapter || this.defaultAdapter;

    const result = await provider.submitReturn({
      filing_period: taxReturn.filing_period_id,
      tax_id_number: 'TAX-REG-12345',
      total_taxable_sales_minor: taxReturn.total_taxable_sales_minor,
      total_output_tax_minor: taxReturn.total_output_tax_minor,
      total_taxable_purchases_minor: taxReturn.total_taxable_purchases_minor,
      total_recoverable_input_tax_minor: taxReturn.total_recoverable_input_tax_minor,
      net_tax_due_minor: taxReturn.net_tax_due_minor,
    });

    const submission: TaxFilingSubmission = {
      id: `tsub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenant_id: tenantId,
      tax_return_id: taxReturnId,
      submission_attempt: 1,
      provider_type: 'MOCK_TAX_PORTAL',
      submission_reference: result.submission_reference,
      provider_status: result.provider_status,
      acknowledgement_token: result.acknowledgement_token || null,
      error_message: result.error_message || null,
      submitted_payload_hash: `hash_${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.submissions.set(submission.id, submission);

    if (result.provider_status === 'ACCEPTED') {
      taxReturn.status = 'ACCEPTED';
      taxReturn.submitted_at = new Date().toISOString();
      taxReturn.filing_reference = result.submission_reference;
    } else if (result.provider_status === 'TIMEOUT_PENDING') {
      // Truthful pending state: do NOT mark accepted or failed
      taxReturn.status = 'SUBMITTED';
      taxReturn.submitted_at = new Date().toISOString();
      taxReturn.filing_reference = result.submission_reference;
    }

    taxReturn.updated_at = new Date().toISOString();

    return { tax_return: taxReturn, submission };
  }

  async reconcileSubmissionStatus(
    tenantId: string,
    submissionId: string,
    adapter?: ITaxProviderAdapter,
  ): Promise<TaxFilingSubmission> {
    const sub = this.submissions.get(submissionId);
    if (!sub || sub.tenant_id !== tenantId) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const provider = adapter || this.defaultAdapter;
    const statusResult = await provider.getSubmissionStatus(sub.submission_reference);

    sub.provider_status = statusResult.provider_status;
    sub.acknowledgement_token = statusResult.acknowledgement_token || sub.acknowledgement_token;
    sub.error_message = statusResult.error_message || sub.error_message;

    const taxReturn = this.returns.get(sub.tax_return_id);
    if (taxReturn && statusResult.provider_status === 'ACCEPTED') {
      taxReturn.status = 'ACCEPTED';
      taxReturn.updated_at = new Date().toISOString();
    }

    return sub;
  }
}
