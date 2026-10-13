import { z } from 'zod';

export const CreateConsolidationGroupSchema = z.object({
  group_code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  parent_company_id: z.string().min(1),
  reporting_currency: z.string().length(3).default('USD'),
});

export const AddGroupMemberSchema = z.object({
  company_id: z.string().min(1),
  book_id: z.string().min(1),
  ownership_percentage_basis_points: z.number().int().min(1).max(10000).default(10000),
  effective_from: z.string().datetime(),
  effective_to: z.string().datetime().nullable().optional(),
  inclusion_status: z.enum(['FULL', 'EQUITY', 'EXCLUDED']).default('FULL'),
  functional_currency: z.string().length(3).default('USD'),
});

export const MapEntityAccountSchema = z.object({
  company_id: z.string().min(1),
  source_account_code: z.string().min(1),
  group_account_code: z.string().min(1),
});

export const ExecuteConsolidationRunSchema = z.object({
  group_id: z.string().min(1),
  period_id: z.string().min(1),
  operation_id: z.string().min(1),
  fx_rates: z.record(z.string(), z.number().int().positive()).optional(),
  run_by: z.string().min(1),
  notes: z.string().optional(),
});

export const RecordIntercompanyTransactionSchema = z.object({
  transaction_reference: z.string().min(1),
  from_company_id: z.string().min(1),
  to_company_id: z.string().min(1),
  transaction_type: z.enum([
    'TRADE_SALE',
    'TRADE_PURCHASE',
    'SERVICE_CHARGE',
    'LOAN',
    'INTEREST',
    'CASH_TRANSFER',
  ]),
  source_document_type: z.string().min(1),
  source_document_id: z.string().min(1),
  currency: z.string().length(3).default('USD'),
  amount_minor: z.string().regex(/^\d+$/, 'Must be non-negative integer minor units'),
});

export const CreateEliminationRuleSchema = z.object({
  rule_code: z.string().min(1),
  name: z.string().min(1),
  transaction_type: z.string().min(1),
  debit_group_account_code: z.string().min(1),
  credit_group_account_code: z.string().min(1),
});
