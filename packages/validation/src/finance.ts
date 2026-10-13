import { z } from 'zod';

export const AccountTypeSchema = z.enum([
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
]);

export const AccountSubtypeSchema = z.enum([
  // Assets
  'CASH',
  'BANK',
  'ACCOUNTS_RECEIVABLE',
  'INVENTORY',
  'CURRENT_ASSET',
  'FIXED_ASSET',
  'WORK_IN_PROCESS',
  // Liabilities
  'ACCOUNTS_PAYABLE',
  'GRNI_CLEARING',
  'TAX_PAYABLE',
  'CUSTOMER_DEPOSIT',
  'CURRENT_LIABILITY',
  'LONG_TERM_LIABILITY',
  // Equity
  'RETAINED_EARNINGS',
  'OWNER_EQUITY',
  'CAPITAL',
  // Revenue
  'OPERATING_REVENUE',
  'SALES_REVENUE',
  'OTHER_REVENUE',
  // Expenses
  'COST_OF_GOODS_SOLD',
  'OPERATING_EXPENSE',
  'PAYROLL_EXPENSE',
  'TAX_EXPENSE',
  'DEPRECIATION_EXPENSE',
  'CASH_VARIANCE_EXPENSE',
  'SCRAP_EXPENSE',
  'PURCHASE_VARIANCE',
]);

export const NormalBalanceSchema = z.enum(['DEBIT', 'CREDIT']);

export const PeriodStatusSchema = z.enum(['OPEN', 'CLOSED', 'LOCKED']);

export const JournalEntryStatusSchema = z.enum([
  'DRAFT',
  'POSTED',
  'REVERSED',
]);

export const JournalSourceTypeSchema = z.enum([
  'MANUAL',
  'POS_SALE',
  'SALES_INVOICE',
  'INVOICE_ISSUANCE',
  'CUSTOMER_PAYMENT',
  'PAYMENT_SETTLEMENT',
  'CUSTOMER_CREDIT_NOTE',
  'CUSTOMER_REFUND',
  'PO_RECEIPT',
  'GRN_RECEIPT',
  'SUPPLIER_INVOICE',
  'SUPPLIER_PAYMENT',
  'SUPPLIER_CREDIT_NOTE',
  'LANDED_COST',
  'SALES_DISPATCH_COGS',
  'MANUFACTURING_WIP_CONSUMPTION',
  'MANUFACTURING_FG_RECEIPT',
  'MANUFACTURING_SCRAP',
  'INVENTORY_LOSS',
  'INVENTORY_ADJUSTMENT',
  'CASH_VARIANCE',
  'CASH_RECONCILIATION',
  'REVERSAL',
]);

export const TaxTypeSchema = z.enum([
  'VAT',
  'SALES_TAX',
  'WITHHOLDING',
  'COMPOUND',
]);

export const ReconciliationTypeSchema = z.enum([
  'AR',
  'AP',
  'INVENTORY',
  'GRNI',
  'CASH',
  'WIP',
]);

export const CreateAccountingBookSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  code: z
    .string()
    .trim()
    .min(1, 'Book code is required')
    .max(32, 'Book code cannot exceed 32 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Book name is required')
    .max(255, 'Book name cannot exceed 255 characters'),
  functional_currency: z.string().trim().length(3).default('USD').optional(),
  fiscal_year_start_month: z.number().int().min(1).max(12).default(1).optional(),
});

export const UpdateAccountingBookSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
});

export const CreateFiscalYearSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().min(1, 'Book ID is required'),
  year_code: z.string().trim().min(1).max(32),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
});

export const CreateAccountingPeriodSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().min(1, 'Book ID is required'),
  fiscal_year_id: z.string().min(1, 'Fiscal year ID is required'),
  period_number: z.number().int().min(1).max(12),
  name: z.string().trim().min(1).max(100),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
});

export const CloseAccountingPeriodSchema = z.object({
  closed_by: z.string().min(1, 'Closed by user ID is required'),
  notes: z.string().trim().max(1000).optional(),
});

export const ReopenAccountingPeriodSchema = z.object({
  reopened_by: z.string().min(1, 'Reopened by user ID is required'),
  reason: z.string().trim().min(1, 'Reason for reopening is required').max(1000),
});

export const CreateAccountSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().trim().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(1, 'Account code is required')
    .max(32, 'Account code cannot exceed 32 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Account name is required')
    .max(255, 'Account name cannot exceed 255 characters'),
  type: AccountTypeSchema,
  subtype: AccountSubtypeSchema,
  parent_account_id: z.string().trim().optional().nullable(),
  currency: z.string().trim().length(3).default('USD').optional(),
  is_active: z.boolean().default(true).optional(),
});

export const UpdateAccountSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subtype: AccountSubtypeSchema.optional(),
  parent_account_id: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const CreateJournalEntryLineSchema = z.object({
  account_id: z.string().min(1, 'Account ID is required'),
  debit_minor: z
    .string()
    .regex(/^\d+$/, 'Debit amount must be a non-negative integer string')
    .default('0')
    .optional(),
  credit_minor: z
    .string()
    .regex(/^\d+$/, 'Credit amount must be a non-negative integer string')
    .default('0')
    .optional(),
  currency: z.string().trim().length(3).default('USD').optional(),
  description: z.string().trim().max(500).optional().nullable(),
  reference_entity_type: z.string().trim().max(64).optional().nullable(),
  reference_entity_id: z.string().trim().max(128).optional().nullable(),
});

export const CreateJournalEntrySchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().trim().optional().nullable(),
  period_id: z.string().trim().optional().nullable(),
  posting_date: z
    .string()
    .min(1, 'Posting date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid posting date format',
    }),
  narration: z
    .string()
    .trim()
    .min(1, 'Narration is required')
    .max(1000, 'Narration cannot exceed 1000 characters'),
  currency: z.string().trim().length(3).default('USD').optional(),
  source_type: JournalSourceTypeSchema.default('MANUAL').optional(),
  source_id: z.string().trim().optional().nullable(),
  operation_id: z.string().trim().optional().nullable(),
  lines: z
    .array(CreateJournalEntryLineSchema)
    .min(2, 'Journal entry must contain at least 2 lines for double-entry balance'),
});

export const ReverseJournalEntrySchema = z.object({
  reversal_date: z
    .string()
    .min(1, 'Reversal date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid reversal date format',
    }),
  narration: z.string().trim().max(1000).optional(),
});

export const CreatePostingRuleSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().min(1, 'Book ID is required'),
  event_type: z.string().trim().min(1, 'Event type is required'),
  rule_code: z.string().trim().min(1, 'Rule code is required'),
  description: z.string().trim().max(500).optional(),
  debit_account_code: z.string().trim().min(1, 'Debit account code is required'),
  credit_account_code: z.string().trim().min(1, 'Credit account code is required'),
});

export const UpdatePostingRuleSchema = z.object({
  description: z.string().trim().max(500).optional(),
  debit_account_code: z.string().trim().min(1).optional(),
  credit_account_code: z.string().trim().min(1).optional(),
  is_active: z.boolean().optional(),
});

export const PerformReconciliationSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().min(1, 'Book ID is required'),
  reconciliation_type: ReconciliationTypeSchema,
  as_of_date: z.string().min(1, 'As of date is required'),
  performed_by: z.string().min(1, 'Performed by user is required'),
  notes: z.string().trim().max(1000).optional(),
});

export const CreateTaxGroupSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(255),
  tax_rate_ids: z.array(z.string().min(1)).min(1, 'At least one tax rate is required'),
  is_active: z.boolean().default(true).optional(),
});

export const CalculateTaxSchema = z.object({
  amount_minor: z
    .string()
    .regex(/^\d+$/, 'Base amount must be an integer minor unit string'),
  tax_rate_ids: z.array(z.string().min(1)).min(1, 'At least one tax rate ID required'),
  is_inclusive: z.boolean().optional(),
});

export const GetAccountsFilterSchema = z.object({
  company_id: z.string().optional(),
  book_id: z.string().optional(),
  type: AccountTypeSchema.optional(),
  is_active: z.boolean().optional(),
});

export const GetJournalEntriesFilterSchema = z.object({
  company_id: z.string().optional(),
  book_id: z.string().optional(),
  period_id: z.string().optional(),
  status: JournalEntryStatusSchema.optional(),
  source_type: JournalSourceTypeSchema.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const GetFinancialReportFilterSchema = z.object({
  company_id: z.string().min(1, 'Company ID is required'),
  book_id: z.string().optional(),
  as_of_date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
