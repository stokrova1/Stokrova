// ============================================================================
// STOKROVA — Integration Hub, External Connectors & Developer Platform Domain
// Golden Rules Compliance:
// - Rule 6: Never execute arbitrary tenant-supplied code / scripts
// - Rule 7 & 11: Receipts not financial truth, never silently delete history
// - Rule 9: Never rely on client-side authorization
// - Rule 18 & 19: Critical commands idempotent and atomic concurrency
// - Rule 21: Preserve tenant isolation
// - Rule 22: Pure domain logic without node:* or external dependencies
// - Rule 26: Pure integer arithmetic for delays, minor units, and basis points
// ============================================================================

export type ConnectorType =
  | 'ECOMMERCE_SHOPIFY'
  | 'ECOMMERCE_WOOCOMMERCE'
  | 'ECOMMERCE_GENERIC'
  | 'PAYMENT_STRIPE'
  | 'PAYMENT_GENERIC'
  | 'CARRIER_FEDEX'
  | 'CARRIER_GENERIC'
  | 'ACCOUNTING_QUICKBOOKS'
  | 'ERP_GENERIC'
  | 'CUSTOM_WEBHOOK';

export type ConnectorCategory =
  | 'ECOMMERCE'
  | 'PAYMENT'
  | 'CARRIER'
  | 'ACCOUNTING'
  | 'ERP'
  | 'WEBHOOK';

export type ConnectorCapability =
  | 'HEALTH_CHECK'
  | 'AUTH_VALIDATION'
  | 'ORDER_IMPORT'
  | 'CATALOG_EXPORT'
  | 'STOCK_SYNC'
  | 'PAYMENT_VERIFY'
  | 'PAYMENT_REFUND'
  | 'SHIPMENT_TRACK'
  | 'INBOUND_WEBHOOK'
  | 'OUTBOUND_WEBHOOK'
  | 'RECONCILE';

export interface ConnectorDefinition {
  code: ConnectorType;
  name: string;
  category: ConnectorCategory;
  version: string;
  capabilities: ConnectorCapability[];
  config_schema_json?: string;
  supports_webhooks: boolean;
  is_active: boolean;
}

export type IntegrationInstanceStatus =
  | 'DRAFT'
  | 'CONFIGURED'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DISCONNECTED';

export type IntegrationSyncDirection = 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL';

export type ConflictResolutionPolicy =
  | 'STOKROVA_WINS'
  | 'EXTERNAL_WINS'
  | 'MANUAL_REVIEW'
  | 'NEWEST_VERSION';

export type FieldTransformType =
  | 'DIRECT'
  | 'ENUM_MAP'
  | 'DATE_FORMAT'
  | 'CURRENCY_MINOR'
  | 'BASIS_POINTS'
  | 'DEFAULT_VALUE';

// ============================================================================
// Domain Errors
// ============================================================================

export type IntegrationErrorCode =
  | 'UNKNOWN_CONNECTOR'
  | 'INVALID_INSTANCE_TRANSITION'
  | 'SSRF_ENDPOINT_BLOCKED'
  | 'INVALID_FIELD_TRANSFORMATION'
  | 'CONFLICT_REQUIRES_MANUAL_REVIEW'
  | 'UNAUTHORIZED_INTEGRATION_ACCESS'
  | 'WEBHOOK_REPLAY_DETECTED'
  | 'WEBHOOK_SIGNATURE_MISMATCH'
  | 'API_KEY_REVOKED'
  | 'API_KEY_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_CREDENTIAL_REFERENCE';

export class IntegrationDomainError extends Error {
  constructor(
    public readonly code: IntegrationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IntegrationDomainError';
  }
}

// ============================================================================
// 1. Connector Catalog Governance
// ============================================================================

export const STANDARD_CONNECTOR_DEFINITIONS: readonly ConnectorDefinition[] = [
  {
    code: 'ECOMMERCE_SHOPIFY',
    name: 'Shopify Storefront & Orders Connector',
    category: 'ECOMMERCE',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'AUTH_VALIDATION',
      'ORDER_IMPORT',
      'CATALOG_EXPORT',
      'STOCK_SYNC',
      'INBOUND_WEBHOOK',
      'RECONCILE',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'ECOMMERCE_WOOCOMMERCE',
    name: 'WooCommerce Storefront Connector',
    category: 'ECOMMERCE',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'AUTH_VALIDATION',
      'ORDER_IMPORT',
      'STOCK_SYNC',
      'INBOUND_WEBHOOK',
      'RECONCILE',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'ECOMMERCE_GENERIC',
    name: 'Generic B2B / Custom Marketplace Connector',
    category: 'ECOMMERCE',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'ORDER_IMPORT',
      'CATALOG_EXPORT',
      'STOCK_SYNC',
      'INBOUND_WEBHOOK',
      'OUTBOUND_WEBHOOK',
      'RECONCILE',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'PAYMENT_STRIPE',
    name: 'Stripe Payments, Subscriptions & Disputes Connector',
    category: 'PAYMENT',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'AUTH_VALIDATION',
      'PAYMENT_VERIFY',
      'PAYMENT_REFUND',
      'INBOUND_WEBHOOK',
      'RECONCILE',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'PAYMENT_GENERIC',
    name: 'Provider-Neutral Payment Terminal & Gateway Connector',
    category: 'PAYMENT',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'PAYMENT_VERIFY',
      'PAYMENT_REFUND',
      'INBOUND_WEBHOOK',
      'RECONCILE',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'CARRIER_FEDEX',
    name: 'FedEx Shipping, Rates & Tracking Connector',
    category: 'CARRIER',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'AUTH_VALIDATION',
      'SHIPMENT_TRACK',
      'INBOUND_WEBHOOK',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'CARRIER_GENERIC',
    name: 'Provider-Neutral Carrier Adapter Connector',
    category: 'CARRIER',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'SHIPMENT_TRACK',
      'INBOUND_WEBHOOK',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'ACCOUNTING_QUICKBOOKS',
    name: 'QuickBooks Online Financial Sync Connector',
    category: 'ACCOUNTING',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'AUTH_VALIDATION',
      'RECONCILE',
      'OUTBOUND_WEBHOOK',
    ],
    supports_webhooks: false,
    is_active: true,
  },
  {
    code: 'ERP_GENERIC',
    name: 'Enterprise ERP / Warehouse Management Connector',
    category: 'ERP',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'ORDER_IMPORT',
      'STOCK_SYNC',
      'RECONCILE',
      'INBOUND_WEBHOOK',
      'OUTBOUND_WEBHOOK',
    ],
    supports_webhooks: true,
    is_active: true,
  },
  {
    code: 'CUSTOM_WEBHOOK',
    name: 'Custom Webhook Subscriber & Event Gateway',
    category: 'WEBHOOK',
    version: '2026.1',
    capabilities: [
      'HEALTH_CHECK',
      'INBOUND_WEBHOOK',
      'OUTBOUND_WEBHOOK',
    ],
    supports_webhooks: true,
    is_active: true,
  },
] as const;

export function getConnectorDefinition(code: string): ConnectorDefinition {
  const found = STANDARD_CONNECTOR_DEFINITIONS.find((c) => c.code === code);
  if (!found) {
    throw new IntegrationDomainError(
      'UNKNOWN_CONNECTOR',
      `Connector with code '${code}' is not registered in the STOKROVA Connector Catalog.`,
      { code },
    );
  }
  return found;
}

// ============================================================================
// 2. Integration Instance Lifecycle State Machine
// ============================================================================

export const VALID_INSTANCE_TRANSITIONS: Record<
  IntegrationInstanceStatus,
  IntegrationInstanceStatus[]
> = {
  DRAFT: ['CONFIGURED', 'DISCONNECTED'],
  CONFIGURED: ['VALIDATING', 'DRAFT', 'DISCONNECTED'],
  VALIDATING: ['ACTIVE', 'CONFIGURED', 'DISCONNECTED'],
  ACTIVE: ['SUSPENDED', 'DISCONNECTED', 'VALIDATING'],
  SUSPENDED: ['ACTIVE', 'DISCONNECTED', 'VALIDATING'],
  DISCONNECTED: ['DRAFT'],
};

export function assertValidInstanceTransition(
  current: IntegrationInstanceStatus,
  next: IntegrationInstanceStatus,
): void {
  if (current === next) return;
  const allowed = VALID_INSTANCE_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new IntegrationDomainError(
      'INVALID_INSTANCE_TRANSITION',
      `Cannot transition integration instance from state '${current}' to '${next}'.`,
      { current, next, allowed },
    );
  }
}

// ============================================================================
// 3. SSRF Defense Engine (Pure URL & IP Allow/Blocklist Validation)
// ============================================================================

/**
 * Validates external destination endpoints to prevent Server-Side Request Forgery (SSRF).
 * Blocks:
 * - Non-HTTP/HTTPS protocols (e.g. file:, ftp:, gopher:, ssh:)
 * - Embedded credentials (user:pass@host)
 * - Loopback addresses (localhost, 127.0.0.1, ::1, 127.x.x.x, 0.0.0.0)
 * - Private IPv4 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Cloud metadata services (169.254.169.254, 169.254.x.x)
 */
export function validateExternalEndpointUrl(urlStr: string): {
  isValid: boolean;
  reason?: string;
} {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, reason: 'URL string must not be empty' };
  }

  const trimmed = urlStr.trim();

  // Basic scheme check
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return {
      isValid: false,
      reason: 'Only HTTP and HTTPS protocols are permitted for external integration endpoints',
    };
  }

  // Parse hostname and components without external URL library (pure string parser)
  try {
    const afterProto = trimmed.split('://')[1];
    if (!afterProto) return { isValid: false, reason: 'Malformed URL structure' };

    // Check for credentials in URL
    const hostPartAndPath = afterProto.split('/')[0] ?? '';
    if (hostPartAndPath.includes('@')) {
      return {
        isValid: false,
        reason: 'Embedded userinfo/credentials in endpoint URLs are strictly forbidden',
      };
    }

    const hostWithPort = hostPartAndPath.toLowerCase();
    const host = hostWithPort.split(':')[0] ?? '';

    // Loopback hostnames
    if (
      host === 'localhost' ||
      host === 'ip6-localhost' ||
      host === 'ip6-loopback' ||
      host === '[::1]' ||
      host === '0.0.0.0'
    ) {
      return { isValid: false, reason: 'Loopback and localhost destinations are prohibited (SSRF defense)' };
    }

    // IP address checks
    const ipv4Parts = host.split('.');
    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => /^\d+$/.test(p))) {
      const p0 = parseInt(ipv4Parts[0]!, 10);
      const p1 = parseInt(ipv4Parts[1]!, 10);
      const p2 = parseInt(ipv4Parts[2]!, 10);
      const p3 = parseInt(ipv4Parts[3]!, 10);

      // Validate byte range
      if ([p0, p1, p2, p3].some((p) => p < 0 || p > 255)) {
        return { isValid: false, reason: 'Invalid IPv4 address in endpoint URL' };
      }

      // Loopback: 127.0.0.0/8
      if (p0 === 127) {
        return { isValid: false, reason: 'Loopback 127.0.0.0/8 address prohibited (SSRF defense)' };
      }

      // Current network: 0.0.0.0/8
      if (p0 === 0) {
        return { isValid: false, reason: 'Broadcast/null address prohibited (SSRF defense)' };
      }

      // Private: 10.0.0.0/8
      if (p0 === 10) {
        return { isValid: false, reason: 'Private RFC 1918 10.0.0.0/8 address prohibited (SSRF defense)' };
      }

      // Private: 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
      if (p0 === 172 && p1 >= 16 && p1 <= 31) {
        return { isValid: false, reason: 'Private RFC 1918 172.16.0.0/12 address prohibited (SSRF defense)' };
      }

      // Private: 192.168.0.0/16
      if (p0 === 192 && p1 === 168) {
        return { isValid: false, reason: 'Private RFC 1918 192.168.0.0/16 address prohibited (SSRF defense)' };
      }

      // Link-local / Cloud Metadata: 169.254.0.0/16 (e.g. 169.254.169.254 AWS/GCP metadata)
      if (p0 === 169 && p1 === 254) {
        return { isValid: false, reason: 'Cloud metadata / link-local 169.254.0.0/16 prohibited (SSRF defense)' };
      }
    }

    return { isValid: true };
  } catch (err: unknown) {
    return {
      isValid: false,
      reason: `URL parsing failure: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ============================================================================
// 4. Secret Masking & Redaction Utilities
// ============================================================================

export function maskSecret(secret: string, visiblePrefix = 7, visibleSuffix = 4): string {
  if (!secret) return '';
  if (secret.length <= visiblePrefix + visibleSuffix) {
    return '****';
  }
  const prefix = secret.slice(0, visiblePrefix);
  const suffix = secret.slice(-visibleSuffix);
  return `${prefix}****${suffix}`;
}

export function redactSensitiveObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ['secret', 'password', 'key', 'token', 'apiKey', 'api_key', 'raw_secret', 'secret_token'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      result[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = redactSensitiveObject(v as Record<string, unknown>, sensitiveKeys);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ============================================================================
// 5. Configurable Field Mapping & Transformation Engine (Zero eval / Zero Code Injection)
// ============================================================================

export function applyFieldTransformation(
  val: unknown,
  transformType: FieldTransformType = 'DIRECT',
  config?: Record<string, unknown>,
): unknown {
  if (val === undefined || val === null) {
    if (transformType === 'DEFAULT_VALUE' && config?.['default_value'] !== undefined) {
      return config['default_value'];
    }
    return null;
  }

  switch (transformType) {
    case 'DIRECT':
      return val;

    case 'ENUM_MAP': {
      if (typeof val !== 'string') return String(val);
      const mapping = (config?.['mapping'] as Record<string, string>) ?? {};
      return mapping[val] ?? config?.['default_value'] ?? val;
    }

    case 'DATE_FORMAT': {
      // Normalize timestamp / date string to ISO-8601
      if (typeof val === 'number') {
        return new Date(val).toISOString();
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          throw new IntegrationDomainError(
            'INVALID_FIELD_TRANSFORMATION',
            `Cannot format invalid date string '${val}' to ISO-8601.`,
          );
        }
        return d.toISOString();
      }
      return val;
    }

    case 'CURRENCY_MINOR': {
      // Transform decimal currency (e.g. 19.99) or string into integer minor units (e.g. "1999")
      if (typeof val === 'number') {
        return Math.round(val * 100).toString();
      }
      if (typeof val === 'string') {
        const cleaned = val.trim().replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
          throw new IntegrationDomainError(
            'INVALID_FIELD_TRANSFORMATION',
            `Cannot parse '${val}' as decimal currency.`,
          );
        }
        return Math.round(num * 100).toString();
      }
      return val;
    }

    case 'BASIS_POINTS': {
      // Transform percentage (e.g. 15.5 for 15.5%) to integer basis points (1550)
      if (typeof val === 'number') {
        return Math.round(val * 100);
      }
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          throw new IntegrationDomainError(
            'INVALID_FIELD_TRANSFORMATION',
            `Cannot parse '${val}' as percentage rate.`,
          );
        }
        return Math.round(num * 100);
      }
      return val;
    }

    case 'DEFAULT_VALUE': {
      return val ?? config?.['default_value'] ?? null;
    }

    default:
      return val;
  }
}

// ============================================================================
// 6. Conflict Resolution Policy Engine
// ============================================================================

export interface ConflictResolutionInput {
  policy: ConflictResolutionPolicy;
  internalRecord: Record<string, unknown>;
  externalRecord: Record<string, unknown>;
  internalUpdatedAt: string;
  externalUpdatedAt: string;
}

export function resolveRecordConflict(
  input: ConflictResolutionInput,
): { winningRecord: Record<string, unknown>; resolution: 'INTERNAL' | 'EXTERNAL' | 'MANUAL_REQUIRED' } {
  const { policy, internalRecord, externalRecord, internalUpdatedAt, externalUpdatedAt } = input;

  switch (policy) {
    case 'STOKROVA_WINS':
      return { winningRecord: internalRecord, resolution: 'INTERNAL' };

    case 'EXTERNAL_WINS':
      return { winningRecord: externalRecord, resolution: 'EXTERNAL' };

    case 'NEWEST_VERSION': {
      const internalTime = new Date(internalUpdatedAt).getTime();
      const externalTime = new Date(externalUpdatedAt).getTime();

      if (isNaN(internalTime) || isNaN(externalTime)) {
        return { winningRecord: internalRecord, resolution: 'INTERNAL' };
      }

      if (externalTime > internalTime) {
        return { winningRecord: externalRecord, resolution: 'EXTERNAL' };
      }
      return { winningRecord: internalRecord, resolution: 'INTERNAL' };
    }

    case 'MANUAL_REVIEW':
      return { winningRecord: internalRecord, resolution: 'MANUAL_REQUIRED' };

    default:
      return { winningRecord: internalRecord, resolution: 'INTERNAL' };
  }
}

// ============================================================================
// 7. Inbound Webhook Replay & Timestamp Window Verification
// ============================================================================

export function isWithinReplayWindow(
  webhookTimestamp: number,
  currentTimestamp: number = Math.floor(Date.now() / 1000),
  windowSeconds = 300, // 5 minutes default
): boolean {
  if (isNaN(webhookTimestamp) || webhookTimestamp <= 0) {
    return false;
  }
  return Math.abs(currentTimestamp - webhookTimestamp) <= windowSeconds;
}

// ============================================================================
// 8. Deterministic Hash Utilities (Using pure utf8 & sha256 byte utilities)
// ============================================================================

import { utf8ToBytes, sha256Bytes, bytesToHex } from './webhooks.js';

export function computeSha256Hash(input: string): string {
  const bytes = utf8ToBytes(input);
  const hash = sha256Bytes(bytes);
  return bytesToHex(hash);
}
