import { z } from 'zod';

export const SecuritySeveritySchema = z.enum(['INFO', 'WARN', 'CRITICAL']);

export const CreateAuditEventSchema = z.object({
  actor_user_id: z.string().nullable().optional(),
  device_id: z.string().nullable().optional(),
  action: z.string().trim().min(1, 'action is required'),
  entity_type: z.string().trim().min(1, 'entity_type is required'),
  entity_id: z.string().trim().min(1, 'entity_id is required'),
  occurred_at: z.string().datetime().optional(),
  request_id: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const RecordSecurityEventSchema = z.object({
  tenant_id: z.string().nullable().optional(),
  event_type: z.string().trim().min(1, 'event_type is required'),
  severity: SecuritySeveritySchema.default('INFO'),
  details: z.record(z.unknown()).nullable().optional(),
});

export const AuditQueryFiltersSchema = z.object({
  actor_user_id: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  action: z.string().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const SecurityQueryFiltersSchema = z.object({
  tenant_id: z.string().optional(),
  event_type: z.string().optional(),
  severity: SecuritySeveritySchema.optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ValidatedCreateAuditEvent = z.infer<typeof CreateAuditEventSchema>;
export type ValidatedRecordSecurityEvent = z.infer<typeof RecordSecurityEventSchema>;
export type ValidatedAuditQueryFilters = z.infer<typeof AuditQueryFiltersSchema>;
export type ValidatedSecurityQueryFilters = z.infer<typeof SecurityQueryFiltersSchema>;
