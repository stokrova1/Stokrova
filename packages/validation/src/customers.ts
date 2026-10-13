import { z } from 'zod';

const NonNegativeIntegerOrStringSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((val) => val.toString());

export const CustomerStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
export const CustomerPaymentTermsSchema = z.enum(['IMMEDIATE', 'NET_15', 'NET_30', 'NET_60', 'NET_90', 'CUSTOM']);
export const CustomerAddressTypeSchema = z.enum(['BILLING', 'SHIPPING', 'BOTH']);

export const CreateCustomerGroupSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  default_discount_percent_bp: z.number().int().min(0).max(10000).optional().default(0),
  credit_limit_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  payment_terms_days: z.number().int().nonnegative().optional().default(0),
});

export const CreateCustomerAddressSchema = z.object({
  address_type: CustomerAddressTypeSchema.optional().default('BOTH'),
  is_default: z.boolean().optional().default(false),
  street_line_1: z.string().trim().min(1).max(255),
  street_line_2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state_province: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().max(30).nullable().optional(),
  country_code: z.string().trim().length(2).toUpperCase().optional().default('US'),
});

export const CreateCustomerSchema = z.object({
  customer_code: z.string().trim().min(1).max(50),
  display_name: z.string().trim().min(1).max(100),
  legal_name: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  customer_group_id: z.string().trim().nullable().optional(),
  price_list_id: z.string().trim().nullable().optional(),
  credit_limit_minor: NonNegativeIntegerOrStringSchema.optional().default('0'),
  payment_terms: CustomerPaymentTermsSchema.optional().default('IMMEDIATE'),
  notes: z.string().trim().max(500).nullable().optional(),
  addresses: z.array(CreateCustomerAddressSchema).optional(),
});

export const UpdateCustomerSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  legal_name: z.string().trim().max(150).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  customer_group_id: z.string().trim().nullable().optional(),
  price_list_id: z.string().trim().nullable().optional(),
  credit_limit_minor: NonNegativeIntegerOrStringSchema.optional(),
  payment_terms: CustomerPaymentTermsSchema.optional(),
  status: CustomerStatusSchema.optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ValidatedCreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type ValidatedUpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export type ValidatedCreateCustomerGroup = z.infer<typeof CreateCustomerGroupSchema>;
export type ValidatedCreateCustomerAddress = z.infer<typeof CreateCustomerAddressSchema>;
