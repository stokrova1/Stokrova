// ============================================================================
// STOKROVA — Global Search, Audit Forensics & Reporting Validation Schemas
// Benchmark: SAP S/4HANA Enterprise Search, Datadog Audit Trails, Stripe Reports
// ============================================================================

import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
  query: z.string().min(1, 'query is required').max(255),
  entity_type: z
    .enum([
      'PRODUCT',
      'VARIANT',
      'SKU_BARCODE',
      'SALES_ORDER',
      'INVOICE',
      'CUSTOMER',
      'BATCH_SERIAL',
      'JOURNAL_ENTRY',
    ])
    .optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const auditChainBlockSchema = z.object({
  index: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  tenant_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resource_id: z.string().min(1),
  payload_hash: z.string().length(64),
  previous_hash: z.string().length(64),
  current_hash: z.string().length(64),
});

export const verifyAuditChainSchema = z.object({
  genesis_hash: z.string().length(64).optional(),
  blocks: z.array(auditChainBlockSchema),
});

export const createDataExportSchema = z.object({
  entity_type: z.string().min(1, 'entity_type is required'),
  format: z.enum(['CSV', 'JSONL']).default('CSV'),
  filters: z.record(z.unknown()).optional(),
});

export const runCustomReportSchema = z.object({
  name: z.string().min(1, 'name is required'),
  metrics: z
    .array(
      z.enum([
        'TOTAL_REVENUE',
        'TOTAL_COGS',
        'GROSS_PROFIT',
        'ITEM_COUNT',
        'QUANTITY_SOLD',
        'AVERAGE_ORDER_VALUE',
      ])
    )
    .min(1, 'At least 1 metric is required'),
  dimensions: z
    .array(
      z.enum([
        'BRANCH',
        'CATEGORY',
        'WAREHOUSE',
        'CASHIER',
        'CUSTOMER',
        'DATE_DAY',
        'DATE_MONTH',
      ])
    )
    .min(1, 'At least 1 dimension is required'),
  filters: z.record(z.unknown()).optional(),
});

export const gdprErasureRequestSchema = z.object({
  subject_id: z.string().min(1, 'subject_id is required'),
  subject_type: z.string().min(1, 'subject_type is required').default('CUSTOMER'),
  pii_fields: z.array(z.string()).min(1, 'At least 1 pii_field is required'),
  dpo_approved_by: z.string().optional(),
  notes: z.string().optional(),
});

export const sodRuleSchema = z.object({
  name: z.string().min(1, 'name is required'),
  action_a: z.string().min(1, 'action_a is required'),
  action_b: z.string().min(1, 'action_b is required'),
  description: z.string().optional(),
});

export const sodEvaluationRequestSchema = z.object({
  actor_id: z.string().min(1, 'actor_id is required'),
  requested_action: z.string().min(1, 'requested_action is required'),
  performed_actions: z.array(z.string()).default([]),
});

export const complianceReportQuerySchema = z.object({
  standard: z.enum(['GDPR', 'SOX', 'ISO27001']),
  from_date: z.string().datetime(),
  to_date: z.string().datetime(),
  actor_user_id: z.string().optional(),
  entity_type: z.string().optional(),
});

export type GlobalSearchQueryDto = z.infer<typeof globalSearchQuerySchema>;
export type AuditChainBlockDto = z.infer<typeof auditChainBlockSchema>;
export type VerifyAuditChainDto = z.infer<typeof verifyAuditChainSchema>;
export type CreateDataExportDto = z.infer<typeof createDataExportSchema>;
export type RunCustomReportDto = z.infer<typeof runCustomReportSchema>;
export type GdprErasureRequestDto = z.infer<typeof gdprErasureRequestSchema>;
export type SodRuleDto = z.infer<typeof sodRuleSchema>;
export type SodEvaluationRequestDto = z.infer<typeof sodEvaluationRequestSchema>;
export type ComplianceReportQueryDto = z.infer<typeof complianceReportQuerySchema>;

