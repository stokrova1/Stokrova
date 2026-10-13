import { z } from 'zod';

export const CreateTaxRegistrationSchema = z.object({
  company_id: z.string().min(1),
  jurisdiction_code: z.string().min(1).max(20),
  tax_id_number: z.string().min(1).max(50),
  tax_type: z.enum(['VAT', 'SALES_TAX', 'GST', 'WITHHOLDING']).default('VAT'),
  filing_frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).default('MONTHLY'),
  effective_from: z.string().datetime(),
  effective_to: z.string().datetime().nullable().optional(),
});

export const CreateTaxJurisdictionConfigSchema = z.object({
  jurisdiction_code: z.string().min(1).max(20),
  version: z.number().int().positive().default(1),
  standard_rate_basis_points: z.number().int().min(0).max(10000),
  reduced_rate_basis_points: z.number().int().min(0).max(10000).default(0),
  zero_rate_basis_points: z.number().int().min(0).max(10000).default(0),
  output_tax_account_code: z.string().min(1).default('2100'),
  input_tax_account_code: z.string().min(1).default('2105'),
  effective_from: z.string().datetime(),
});

export const CreateTaxFilingPeriodSchema = z.object({
  registration_id: z.string().min(1),
  period_name: z.string().min(1).max(50),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  due_date: z.string().datetime(),
});

export const PrepareTaxReturnSchema = z.object({
  filing_period_id: z.string().min(1),
  company_id: z.string().min(1),
  operation_id: z.string().min(1),
  prepared_by: z.string().min(1),
});

export const SubmitTaxReturnSchema = z.object({
  tax_return_id: z.string().min(1),
  submitted_by: z.string().min(1),
  provider_type: z.string().default('MOCK_TAX_PORTAL'),
});
