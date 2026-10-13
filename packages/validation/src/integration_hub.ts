import { z } from 'zod';

export const ConnectorTypeSchema = z.enum([
  'ECOMMERCE_SHOPIFY',
  'ECOMMERCE_WOOCOMMERCE',
  'ECOMMERCE_GENERIC',
  'PAYMENT_STRIPE',
  'PAYMENT_GENERIC',
  'CARRIER_FEDEX',
  'CARRIER_GENERIC',
  'ACCOUNTING_QUICKBOOKS',
  'ERP_GENERIC',
  'CUSTOM_WEBHOOK',
]);

export const IntegrationInstanceStatusSchema = z.enum([
  'DRAFT',
  'CONFIGURED',
  'VALIDATING',
  'ACTIVE',
  'SUSPENDED',
  'DISCONNECTED',
]);

export const IntegrationSyncDirectionSchema = z.enum([
  'IMPORT',
  'EXPORT',
  'BIDIRECTIONAL',
]);

export const ConflictResolutionPolicySchema = z.enum([
  'STOKROVA_WINS',
  'EXTERNAL_WINS',
  'MANUAL_REVIEW',
  'NEWEST_VERSION',
]);

export const IntegrationEntityTypeSchema = z.enum([
  'ORDER',
  'CUSTOMER',
  'PRODUCT',
  'PAYMENT',
  'SHIPMENT',
  'JOURNAL_ENTRY',
]);

export const FieldTransformTypeSchema = z.enum([
  'DIRECT',
  'ENUM_MAP',
  'DATE_FORMAT',
  'CURRENCY_MINOR',
  'BASIS_POINTS',
  'DEFAULT_VALUE',
]);

function isSafeExternalEndpoint(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) return false;
  try {
    const afterProto = trimmed.split('://')[1];
    if (!afterProto) return false;
    const hostPart = afterProto.split('/')[0] ?? '';
    if (hostPart.includes('@')) return false;
    const host = hostPart.split(':')[0]?.toLowerCase() ?? '';
    if (
      host === 'localhost' ||
      host === 'ip6-localhost' ||
      host === 'ip6-loopback' ||
      host === '[::1]' ||
      host === '0.0.0.0'
    ) {
      return false;
    }
    const parts = host.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const p0 = parseInt(parts[0]!, 10);
      const p1 = parseInt(parts[1]!, 10);
      if (p0 === 127 || p0 === 0 || p0 === 10) return false;
      if (p0 === 172 && p1 >= 16 && p1 <= 31) return false;
      if (p0 === 192 && p1 === 168) return false;
      if (p0 === 169 && p1 === 254) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const ExternalEndpointUrlSchema = z
  .string()
  .trim()
  .refine(isSafeExternalEndpoint, {
    message: 'URL fails SSRF validation: internal/loopback/cloud metadata destinations are blocked',
  });

export const CreateIntegrationInstanceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Integration name is required')
    .max(255, 'Integration name cannot exceed 255 characters'),
  connector_code: ConnectorTypeSchema,
  company_id: z.string().trim().min(1).optional().nullable(),
  branch_id: z.string().trim().min(1).optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

export const UpdateIntegrationInstanceSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  config: z.record(z.unknown()).optional(),
  status: IntegrationInstanceStatusSchema.optional(),
});

export const CreateDeveloperApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'API key name is required')
    .max(255, 'API key name cannot exceed 255 characters'),
  scopes: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one capability scope is required'),
  rate_limit_per_minute: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(60)
    .optional(),
  expires_in_days: z
    .number()
    .int()
    .positive()
    .max(365)
    .optional(),
});

export const StoreIntegrationCredentialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Credential name is required')
    .max(255, 'Credential name cannot exceed 255 characters'),
  secret: z
    .string()
    .trim()
    .min(1, 'Secret value is required')
    .max(4096, 'Secret value cannot exceed 4096 characters'),
  expires_at: z.string().optional().nullable(),
});

export const CreateEntityMappingSchema = z.object({
  entity_type: IntegrationEntityTypeSchema,
  external_id: z
    .string()
    .trim()
    .min(1, 'External ID is required')
    .max(255, 'External ID cannot exceed 255 characters'),
  internal_id: z
    .string()
    .trim()
    .min(1, 'Internal entity ID is required')
    .max(255, 'Internal entity ID cannot exceed 255 characters'),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateFieldMappingSchema = z.object({
  entity_type: IntegrationEntityTypeSchema,
  source_field: z
    .string()
    .trim()
    .min(1, 'Source field is required')
    .max(255, 'Source field cannot exceed 255 characters'),
  target_field: z
    .string()
    .trim()
    .min(1, 'Target field is required')
    .max(255, 'Target field cannot exceed 255 characters'),
  transform_type: FieldTransformTypeSchema.default('DIRECT').optional(),
  transform_config: z.record(z.unknown()).optional(),
  is_required: z.boolean().default(false).optional(),
});

export const TriggerSyncRunSchema = z.object({
  direction: IntegrationSyncDirectionSchema.default('IMPORT').optional(),
  cursor_checkpoint: z.string().trim().max(1024).optional().nullable(),
});

export const InboundWebhookPayloadSchema = z.object({
  provider: z
    .string()
    .trim()
    .min(1, 'Provider is required')
    .max(64, 'Provider cannot exceed 64 characters'),
  provider_event_id: z
    .string()
    .trim()
    .min(1, 'Provider event ID is required')
    .max(255, 'Provider event ID cannot exceed 255 characters'),
  event_type: z
    .string()
    .trim()
    .min(1, 'Event type is required')
    .max(128, 'Event type cannot exceed 128 characters'),
  timestamp: z.number().int().positive().optional(),
  payload: z.record(z.unknown()),
  signature: z.string().trim().max(512).optional(),
});
