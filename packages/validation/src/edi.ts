import { z } from 'zod';

export const EdiStandardSchema = z.enum(['ANSI_X12', 'UN_EDIFACT']);

export const EdiTransactionTypeSchema = z.enum([
  '850',
  '855',
  '856',
  '810',
  '997',
  'ORDERS',
  'ORDRSP',
  'DESADV',
  'INVOIC',
  'CONTRL',
]);

export const EdiDirectionSchema = z.enum(['INBOUND', 'OUTBOUND']);

export const EdiMessageStatusSchema = z.enum([
  'RECEIVED',
  'PARSED',
  'PROCESSED',
  'GENERATED',
  'TRANSMITTED',
  'ACKNOWLEDGED',
  'REJECTED',
  'FAILED',
]);

export const EdiPurchaseOrderLineSchema = z.object({
  line_number: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  gtin_upc: z.string().trim().nullable().optional(),
  description: z.string().trim().default(''),
  quantity: z.number().int().positive(),
  unit_price_minor: z.string().regex(/^\d+$/, 'unit_price_minor must be an integer minor units string'),
  uom: z.string().trim().min(1).default('EA'),
});

export const EdiPurchaseOrderSchema = z.object({
  po_number: z.string().trim().min(1),
  po_date: z.string().trim().min(1),
  buyer_name: z.string().trim().min(1),
  buyer_id: z.string().trim().min(1),
  supplier_id: z.string().trim().nullable().optional(),
  currency: z.string().trim().length(3).default('USD'),
  total_amount_minor: z.string().regex(/^\d+$/, 'total_amount_minor must be an integer minor units string'),
  lines: z.array(EdiPurchaseOrderLineSchema).min(1),
});

export const EdiPurchaseOrderAckLineSchema = z.object({
  line_number: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  status: z.enum(['IA', 'IR', 'IP', 'IQ']),
  quantity_acknowledged: z.number().int().nonnegative(),
  unit_price_minor: z.string().regex(/^\d+$/, 'unit_price_minor must be an integer minor units string'),
});

export const EdiPurchaseOrderAckSchema = z.object({
  po_number: z.string().trim().min(1),
  ack_type: z.enum(['ACCEPTED', 'REJECTED', 'MODIFIED']),
  ack_date: z.string().trim().min(1),
  lines: z.array(EdiPurchaseOrderAckLineSchema).min(1),
});

export const EdiAsnItemSchema = z.object({
  sku: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  uom: z.string().trim().min(1).default('EA'),
  lot_number: z.string().trim().nullable().optional(),
  serial_numbers: z.array(z.string().trim()).nullable().optional(),
});

export const EdiPalletSchema = z.object({
  sscc_18: z.string().trim().regex(/^\d{18}$/, 'SSCC-18 must be exactly 18 digits'),
  tare_weight_grams: z.number().int().nonnegative().optional(),
  items: z.array(EdiAsnItemSchema).min(1),
});

export const EdiAdvanceShipNoticeSchema = z.object({
  shipment_id: z.string().trim().min(1),
  bol_number: z.string().trim().min(1),
  ship_date: z.string().trim().min(1),
  estimated_delivery_date: z.string().trim().optional(),
  carrier_code: z.string().trim().min(2).max(10),
  tracking_number: z.string().trim().min(1),
  pallets: z.array(EdiPalletSchema).min(1),
});

export const EdiInvoiceLineSchema = z.object({
  line_number: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  description: z.string().trim().default(''),
  quantity: z.number().int().positive(),
  unit_price_minor: z.string().regex(/^\d+$/, 'unit_price_minor must be an integer minor units string'),
  line_total_minor: z.string().regex(/^\d+$/, 'line_total_minor must be an integer minor units string'),
});

export const EdiInvoiceSchema = z.object({
  invoice_number: z.string().trim().min(1),
  po_number: z.string().trim().min(1),
  invoice_date: z.string().trim().min(1),
  currency: z.string().trim().length(3).default('USD'),
  subtotal_minor: z.string().regex(/^\d+$/, 'subtotal_minor must be an integer minor units string'),
  tax_minor: z.string().regex(/^\d+$/, 'tax_minor must be an integer minor units string'),
  total_minor: z.string().regex(/^\d+$/, 'total_minor must be an integer minor units string'),
  lines: z.array(EdiInvoiceLineSchema).min(1),
});

export const EdiFunctionalAckSchema = z.object({
  original_control_number: z.string().trim().min(1),
  group_control_number: z.string().trim().min(1),
  status: z.enum(['A', 'R', 'E']),
  error_codes: z.array(z.string().trim()).optional(),
});

export const CreateEdiPartnerSchema = z.object({
  partner_name: z.string().trim().min(1).max(255),
  edi_standard: EdiStandardSchema.default('ANSI_X12'),
  sender_id: z.string().trim().min(1).max(50),
  sender_qualifier: z.string().trim().min(2).max(4).default('01'),
  receiver_id: z.string().trim().min(1).max(50),
  receiver_qualifier: z.string().trim().min(2).max(4).default('01'),
  element_delimiter: z.string().length(1).default('*'),
  segment_delimiter: z.string().length(1).default('~'),
  subelement_delimiter: z.string().length(1).default(':'),
});

export const ParseEdiDocumentSchema = z.object({
  partner_id: z.string().uuid(),
  raw_content: z.string().trim().min(1, 'raw_content must not be empty'),
});

export const GenerateEdi855Schema = z.object({
  partner_id: z.string().uuid(),
  control_number: z.string().trim().optional(),
  po_ack: EdiPurchaseOrderAckSchema,
});

export const GenerateEdi856Schema = z.object({
  partner_id: z.string().uuid(),
  control_number: z.string().trim().optional(),
  asn: EdiAdvanceShipNoticeSchema,
});

export const GenerateEdi810Schema = z.object({
  partner_id: z.string().uuid(),
  control_number: z.string().trim().optional(),
  invoice: EdiInvoiceSchema,
});

export const GenerateEdi997Schema = z.object({
  partner_id: z.string().uuid(),
  control_number: z.string().trim().optional(),
  ack: EdiFunctionalAckSchema,
});
