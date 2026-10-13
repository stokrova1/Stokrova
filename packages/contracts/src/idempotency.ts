/**
 * Server-Side Idempotency Contract (Section 13)
 */

export type IdempotencyRecordStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

export interface IdempotencyRecord {
  id: string;
  tenant_id: string;
  idempotency_key: string;
  request_path: string;
  request_method: string;
  request_hash: string;
  status: IdempotencyRecordStatus;
  response_code?: number | null;
  response_body?: unknown;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export type IdempotencyDecision =
  | { status: 'NEW' }
  | { status: 'RESOLVED'; statusCode: number; body: unknown }
  | { status: 'IN_PROGRESS' }
  | { status: 'CONFLICT'; message: string };
