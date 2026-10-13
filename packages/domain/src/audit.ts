export type SecuritySeverity = 'INFO' | 'WARN' | 'CRITICAL';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /access_token/i,
  /refresh_token/i,
  /pan/i,
  /cvv/i,
  /pin/i,
  /credit_card/i,
];

/**
 * Asserts that an audit record cannot be modified or deleted.
 * Stokrova audit trails are strictly append-only.
 */
export function assertAuditRecordImmutable(operation: 'UPDATE' | 'DELETE' | 'INSERT'): void {
  if (operation === 'UPDATE' || operation === 'DELETE') {
    throw new Error(`Audit records are strictly append-only. Mutation '${operation}' is prohibited.`);
  }
}

/**
 * Sanitizes sensitive fields before persisting or exporting audit logs.
 * Replaces credentials, tokens, and payment card details with '[REDACTED]'.
 */
export function sanitizeSensitiveAuditData(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeSensitiveAuditData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeSensitiveAuditData(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Classifies the security severity of an event type based on threat model.
 */
export function classifySecuritySeverity(eventType: string): SecuritySeverity {
  const normalized = (eventType || '').toUpperCase().trim();

  if (
    normalized.includes('CROSS_TENANT') ||
    normalized.includes('TOKEN_FORGERY') ||
    normalized.includes('BRUTE_FORCE') ||
    normalized.includes('SQL_INJECTION') ||
    normalized.includes('UNAUTHORIZED_ADMIN')
  ) {
    return 'CRITICAL';
  }

  if (
    normalized.includes('DEVICE_REVOKED') ||
    normalized.includes('UNAUTHORIZED') ||
    normalized.includes('FORBIDDEN') ||
    normalized.includes('INVALID_SIGNATURE') ||
    normalized.includes('AUTH_FAILURE')
  ) {
    return 'WARN';
  }

  return 'INFO';
}

/**
 * Normalizes an audit action string to UPPER_SNAKE_CASE
 */
export function normalizeAuditAction(action: string): string {
  if (!action || action.trim() === '') {
    throw new Error('Audit action cannot be empty');
  }
  return action.trim().replace(/[\s.-]+/g, '_').toUpperCase();
}
