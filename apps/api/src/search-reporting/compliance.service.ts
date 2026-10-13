import { Injectable } from '@nestjs/common';
import type {
  GdprErasureRequest,
  SegregationOfDutiesRule,
  SodEvaluationResult,
  ComplianceReportExport,
} from '@stokrova/contracts';
import {
  sha256,
  pseudonymizePersonalData,
  evaluateSegregationOfDuties,
  generateUuidV7,
} from '@stokrova/domain';
import {
  gdprErasureRequestSchema,
  sodEvaluationRequestSchema,
  complianceReportQuerySchema,
  type GdprErasureRequestDto,
  type SodEvaluationRequestDto,
  type ComplianceReportQueryDto,
} from '@stokrova/validation';
import { AuditForensicsService } from './audit-forensics.service.js';

@Injectable()
export class ComplianceService {
  private readonly erasureRequests = new Map<string, GdprErasureRequest>();
  private readonly tenantSodRules = new Map<string, SegregationOfDutiesRule[]>();

  constructor(private readonly auditForensicsService: AuditForensicsService) {
    // Default SOX 404 Financial Segregation of Duties Rules
    this.tenantSodRules.set('default', [
      {
        id: 'sod_po_create_approve',
        name: 'PO Creation and Approval Segregation',
        action_a: 'purchase_order.create',
        action_b: 'purchase_order.approve',
        description: 'Creator of a Purchase Order cannot approve the same Purchase Order',
      },
      {
        id: 'sod_invoice_pay',
        name: 'Invoice Creation and Payment Execution',
        action_a: 'invoice.create',
        action_b: 'payment.execute',
        description: 'Creator of a Supplier Invoice cannot disburse payment',
      },
      {
        id: 'sod_credit_refund',
        name: 'Credit Note and Refund Authorization',
        action_a: 'credit_note.create',
        action_b: 'refund.authorize',
        description: 'Creator of a Customer Credit Note cannot authorize cash refund',
      },
    ]);
  }

  /**
   * Processes a GDPR Article 17 Right to Erasure / Pseudonymization request.
   * Adheres strictly to Golden Rule 11 (Never silently delete financial history!).
   * Personal Data fields are cryptographically masked while keeping ledger totals and references intact.
   */
  async processGdprErasure(
    tenantId: string,
    dto: GdprErasureRequestDto,
    subjectRecord: Record<string, unknown>,
    salt = 'stokrova_gdpr_salt'
  ): Promise<{
    request: GdprErasureRequest;
    pseudonymizedRecord: Record<string, unknown>;
  }> {
    const validated = gdprErasureRequestSchema.parse(dto);
    const requestId = generateUuidV7();
    const now = new Date().toISOString();

    const pseudonymized = pseudonymizePersonalData(
      subjectRecord,
      validated.pii_fields,
      salt
    );

    const erasureHash = sha256(
      `${tenantId}:${validated.subject_id}:${validated.pii_fields.join(',')}:${now}`
    );

    const request: GdprErasureRequest = {
      id: requestId,
      tenant_id: tenantId,
      subject_id: validated.subject_id,
      subject_type: validated.subject_type,
      requested_by_user_id: 'usr_compliance_officer',
      dpo_approved_by: validated.dpo_approved_by ?? null,
      status: 'PROCESSED',
      pii_fields: validated.pii_fields,
      records_affected_count: 1,
      erasure_hash: erasureHash,
      requested_at: now,
      processed_at: now,
      notes: validated.notes ?? null,
    };

    this.erasureRequests.set(requestId, request);

    // Record immutable audit chain block
    await this.auditForensicsService.appendAuditBlock(
      tenantId,
      request.requested_by_user_id,
      'GDPR_ERASURE_PROCESSED',
      'personal_data',
      validated.subject_id,
      {
        request_id: requestId,
        pii_fields: validated.pii_fields,
        erasure_hash: erasureHash,
      }
    );

    return {
      request,
      pseudonymizedRecord: pseudonymized,
    };
  }

  /**
   * Evaluates SOX 404 Segregation of Duties (SoD) against financial workflows.
   */
  evaluateSod(
    tenantId: string,
    dto: SodEvaluationRequestDto
  ): SodEvaluationResult {
    const validated = sodEvaluationRequestSchema.parse(dto);
    const rules = this.tenantSodRules.get(tenantId) ?? this.tenantSodRules.get('default') ?? [];

    const result = evaluateSegregationOfDuties(
      validated.actor_id,
      validated.performed_actions,
      validated.requested_action,
      rules
    );

    return {
      allowed: result.allowed,
      actor_id: result.actor_id,
      requested_action: result.requested_action,
      conflicting_actions: result.conflicting_actions,
      violation_reason: result.violation_reason ?? null,
    };
  }

  /**
   * Generates a tamper-verified compliance audit report (GDPR, SOX, ISO 27001).
   */
  async generateComplianceReport(
    tenantId: string,
    queryDto: ComplianceReportQueryDto
  ): Promise<ComplianceReportExport> {
    const validated = complianceReportQuerySchema.parse(queryDto);
    const chainVerification = await this.auditForensicsService.verifyAuditChain(tenantId);
    const allBlocks = await this.auditForensicsService.getAuditBlocks(tenantId);

    const fromTime = new Date(validated.from_date).getTime();
    const toTime = new Date(validated.to_date).getTime();

    const filteredBlocks = allBlocks.filter((b) => {
      const blockTime = new Date(b.timestamp).getTime();
      if (blockTime < fromTime || blockTime > toTime) return false;
      if (validated.actor_user_id && b.actor_id !== validated.actor_user_id) return false;
      if (validated.entity_type && b.resource !== validated.entity_type) return false;
      return true;
    });

    return {
      standard: validated.standard,
      generated_at: new Date().toISOString(),
      total_records: filteredBlocks.length,
      tamper_check_passed: chainVerification.is_valid,
      summary: {
        tenant_id: tenantId,
        chain_blocks_total: allBlocks.length,
        period_from: validated.from_date,
        period_to: validated.to_date,
        compliance_status: chainVerification.is_valid ? 'COMPLIANT' : 'INTEGRITY_BREACH',
      },
      records: filteredBlocks.map((b) => ({
        index: b.index,
        timestamp: b.timestamp,
        actor_id: b.actor_id,
        action: b.action,
        resource: b.resource,
        resource_id: b.resource_id,
        current_hash: b.current_hash,
      })),
    };
  }
}
