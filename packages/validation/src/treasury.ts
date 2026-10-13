import { z } from 'zod';

export const CreateBankAccountSchema = z.object({
  company_id: z.string().min(1),
  bank_name: z.string().min(1).max(255),
  account_name: z.string().min(1).max(255),
  account_number: z.string().min(1).max(100),
  currency: z.string().length(3).default('USD'),
  gl_account_id: z.string().min(1),
});

export const InitiateCashTransferSchema = z.object({
  source_company_id: z.string().min(1),
  source_bank_account_id: z.string().min(1),
  destination_company_id: z.string().min(1),
  destination_bank_account_id: z.string().min(1),
  amount_minor: z.string().regex(/^[1-9]\d*$/, 'Transfer amount must be strictly positive'),
  currency: z.string().length(3).default('USD'),
  operation_id: z.string().min(1),
  initiated_by: z.string().min(1),
});

export const ApproveCashTransferSchema = z.object({
  approved_by: z.string().min(1),
});

export const SyncBankFeedSchema = z.object({
  bank_account_id: z.string().min(1),
  provider_type: z.enum(['MANUAL', 'PLAID', 'OPEN_BANKING', 'SANDBOX']).default('MANUAL'),
  transactions: z.array(
    z.object({
      external_transaction_id: z.string().min(1),
      transaction_date: z.string().datetime(),
      amount_minor: z.string().regex(/^-?[1-9]\d*$/, 'Amount must be non-zero minor units'),
      description: z.string().min(1),
      transaction_type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'FEE', 'INTEREST', 'TRANSFER', 'OTHER']).optional(),
    }),
  ),
});

export const GenerateCashForecastSchema = z.object({
  company_id: z.string().min(1),
  horizon_days: z.number().int().min(1).max(365).default(30),
  currency: z.string().length(3).default('USD'),
});
