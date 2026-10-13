import { z } from 'zod';

export const SalesInvoiceStatusSchema = z.enum([
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'VOID',
  'CREDITED',
]);

export const CreateSalesInvoiceSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  customer_id: z.string().trim().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const VoidSalesInvoiceSchema = z.object({
  reason: z.string().trim().min(1, 'Reason for voiding is required').max(255),
});

export type ValidatedCreateSalesInvoice = z.infer<typeof CreateSalesInvoiceSchema>;
export type ValidatedVoidSalesInvoice = z.infer<typeof VoidSalesInvoiceSchema>;
