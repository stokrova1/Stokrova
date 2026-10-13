/**
 * Immutable Audit Trail and Security Monitoring Contracts
 * Based on SECURITY.md, DOMAIN_MODEL.md, and Phase 1G specifications
 */

export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_REFRESH'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'PERMISSION_GRANTED'
  | 'BRANCH_CREATED'
  | 'REGISTER_OPENED'
  | 'REGISTER_CLOSED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_REFUNDED'
  | 'RECEIPT_PRINTED'
  | 'STOCK_ADJUSTED'
  | 'PRICE_OVERRIDDEN'
  | 'DEVICE_REGISTERED'
  | 'DEVICE_REVOKED'
  | 'WORKFLOW_STARTED'
  | 'APPROVAL_RESOLVED'
  | 'CONFIG_UPDATED'
  | 'SYNC_PUSH_APPLIED';

export type SecuritySeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface AuditEventResponse {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  device_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  occurred_at: string;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateAuditEventRequest {
  actor_user_id?: string | null;
  device_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  occurred_at?: string;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SecurityEventResponse {
  id: string;
  tenant_id: string | null;
  event_type: string;
  severity: SecuritySeverity;
  occurred_at: string;
  details: Record<string, unknown> | null;
}

export interface RecordSecurityEventRequest {
  tenant_id?: string | null;
  event_type: string;
  severity?: SecuritySeverity;
  details?: Record<string, unknown> | null;
}

export interface AuditQueryFilters {
  actor_user_id?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface SecurityQueryFilters {
  tenant_id?: string;
  event_type?: string;
  severity?: SecuritySeverity;
  limit?: number;
  offset?: number;
}
