import { z } from 'zod';

export const InterCompanyStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
]);

export const WebhookEventTypeSchema = z.enum([
  'ORDER_CREATED',
  'ORDER_UPDATED',
  'ORDER_PAID',
  'ORDER_FULFILLED',
  'INVENTORY_STOCK_LOW',
  'INVENTORY_MOVEMENT',
  'PAYMENT_SETTLED',
  'PAYMENT_FAILED',
  'SHIPMENT_DISPATCHED',
  'DELIVERY_COMPLETED',
  'FINANCE_JOURNAL_POSTED',
  'B2B_CREDIT_HOLD',
  'EDI_DOCUMENT_RECEIVED',
  'LOYALTY_TIER_UPGRADED',
]);

export const WebhookDeliveryStatusSchema = z.enum([
  'PENDING',
  'SUCCESS',
  'FAILED',
  'RETRYING',
  'DEAD_LETTER',
]);

export const DocumentTypeSchema = z.enum([
  'INVOICE',
  'RECEIPT',
  'PACKING_SLIP',
  'BILL_OF_LADING',
  'DELIVERY_MANIFEST',
  'PURCHASE_ORDER',
]);

export const DocumentRenderFormatSchema = z.enum([
  'HTML',
  'PDF',
  'JSON',
  'TEXT_RECEIPT',
]);

export const NotificationChannelSchema = z.enum([
  'IN_APP',
  'EMAIL',
  'SMS',
  'WEBHOOK',
]);

export const NotificationSeveritySchema = z.enum([
  'INFO',
  'SUCCESS',
  'WARNING',
  'CRITICAL',
]);

export const CreateHoldingGroupSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Holding code is required')
    .max(32, 'Holding code cannot exceed 32 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Holding name is required')
    .max(255, 'Holding name cannot exceed 255 characters'),
  parent_company_id: z.string().min(1, 'Parent company ID is required'),
  subsidiary_company_ids: z
    .array(z.string().min(1))
    .min(1, 'At least one subsidiary company is required'),
  consolidation_currency: z.string().trim().length(3).default('USD').optional(),
  is_active: z.boolean().default(true).optional(),
});

export const UpdateHoldingGroupSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subsidiary_company_ids: z.array(z.string().min(1)).optional(),
  is_active: z.boolean().optional(),
});

export const CreateInterCompanyTransferItemSchema = z.object({
  variant_id: z.string().min(1, 'Variant ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_transfer_price_minor: z
    .string()
    .regex(/^\d+$/, 'Price must be non-negative integer string'),
});

export const CreateInterCompanyTransferSchema = z.object({
  source_company_id: z.string().min(1, 'Source company ID is required'),
  source_warehouse_id: z.string().min(1, 'Source warehouse ID is required'),
  destination_company_id: z.string().min(1, 'Destination company ID is required'),
  destination_warehouse_id: z.string().min(1, 'Destination warehouse ID is required'),
  currency: z.string().trim().length(3).default('USD').optional(),
  items: z
    .array(CreateInterCompanyTransferItemSchema)
    .min(1, 'At least one transfer item is required'),
});

export const CreateWebhookSubscriptionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Webhook name is required')
    .max(255, 'Webhook name cannot exceed 255 characters'),
  target_url: z.string().trim().url('Target URL must be a valid HTTP/HTTPS URL'),
  event_types: z
    .array(WebhookEventTypeSchema)
    .min(1, 'At least one event type is required'),
  secret_token: z.string().trim().min(8).max(128).optional(),
  retry_limit: z.number().int().min(1).max(10).default(5).optional(),
  is_active: z.boolean().default(true).optional(),
});

export const UpdateWebhookSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  target_url: z.string().trim().url().optional(),
  event_types: z.array(WebhookEventTypeSchema).optional(),
  retry_limit: z.number().int().min(1).max(10).optional(),
  is_active: z.boolean().optional(),
});

export const RenderDocumentSchema = z.object({
  document_type: DocumentTypeSchema,
  entity_id: z.string().min(1, 'Entity ID is required'),
  format: DocumentRenderFormatSchema.default('HTML').optional(),
  custom_notes: z.string().trim().max(1000).optional().nullable(),
});

export const SendNotificationSchema = z.object({
  user_id: z.string().trim().optional().nullable(),
  channel: NotificationChannelSchema,
  severity: NotificationSeveritySchema,
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message cannot exceed 5000 characters'),
  metadata: z.record(z.unknown()).optional(),
});
