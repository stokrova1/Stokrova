import { z } from 'zod';

export const EnvironmentSchema = z.enum(['development', 'test', 'staging', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const AppConfigSchema = z.object({
  // Application
  nodeEnv: EnvironmentSchema.default('development'),
  appName: z.string().min(1).default('STOKROVA API'),
  appVersion: z.string().min(1).default('0.1.0'),
  apiPort: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database (PostgreSQL)
  databaseUrl: z.string().min(1).default('postgresql://stokrova:stokrova_dev_password@localhost:5432/stokrova_dev'),

  // Supabase
  supabaseUrl: z.string().url().default('https://example.supabase.co'),
  supabaseAnonKey: z.string().min(1).default('dev-anon-key'),
  supabaseServiceRoleKey: z.string().min(1).default('dev-service-role-key'),

  // Redis
  redisUrl: z.string().min(1).default('redis://localhost:6379'),
  redisEnabled: z.boolean().default(true),

  // Object Storage (Cloudflare R2 / S3-compatible)
  storageEndpoint: z.string().min(1).default('https://storage.example.com'),
  storageBucket: z.string().min(1).default('stokrova-assets'),
  storageAccessKeyId: z.string().min(1).default('dev-storage-key'),
  storageSecretAccessKey: z.string().min(1).default('dev-storage-secret'),
  storagePublicUrl: z.string().optional(),

  // Observability
  sentryDsn: z.string().optional(),
  otelEndpoint: z.string().optional(),
  logLevel: LogLevelSchema.default('info'),

  // Security & Rate Limits
  rateLimitTtlMs: z.coerce.number().int().positive().default(60000),
  rateLimitLimit: z.coerce.number().int().positive().default(100),
  idempotencyTtlSeconds: z.coerce.number().int().positive().default(86400),
  jwtSecret: z.string().optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export class ConfigValidationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    const formatted = issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    super(`Application Configuration Validation Failed:\n${formatted}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

/**
 * Parses raw environment variables into a typed AppConfig.
 * Throws ConfigValidationError if mandatory fields fail validation.
 */
export function validateConfig(
  rawEnv: Record<string, string | undefined> = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {},
): AppConfig {
  const parsedInput = {
    nodeEnv: rawEnv['NODE_ENV'] || 'development',
    appName: rawEnv['APP_NAME'] || 'STOKROVA API',
    appVersion: rawEnv['APP_VERSION'] || '0.1.0',
    apiPort: rawEnv['API_PORT'] || rawEnv['PORT'] || '3000',

    databaseUrl: rawEnv['DATABASE_URL'] || 'postgresql://stokrova:stokrova_dev_password@localhost:5432/stokrova_dev',

    supabaseUrl: rawEnv['SUPABASE_URL'] || 'https://example.supabase.co',
    supabaseAnonKey: rawEnv['SUPABASE_ANON_KEY'] || 'dev-anon-key',
    supabaseServiceRoleKey: rawEnv['SUPABASE_SERVICE_ROLE_KEY'] || 'dev-service-role-key',

    redisUrl: rawEnv['REDIS_URL'] || 'redis://localhost:6379',
    redisEnabled: rawEnv['REDIS_ENABLED'] !== 'false',

    storageEndpoint: rawEnv['STORAGE_ENDPOINT'] || rawEnv['R2_ENDPOINT'] || 'https://storage.example.com',
    storageBucket: rawEnv['STORAGE_BUCKET'] || rawEnv['R2_BUCKET'] || 'stokrova-assets',
    storageAccessKeyId: rawEnv['STORAGE_ACCESS_KEY_ID'] || rawEnv['R2_ACCESS_KEY_ID'] || 'dev-storage-key',
    storageSecretAccessKey: rawEnv['STORAGE_SECRET_ACCESS_KEY'] || rawEnv['R2_SECRET_ACCESS_KEY'] || 'dev-storage-secret',
    storagePublicUrl: rawEnv['STORAGE_PUBLIC_URL'] || rawEnv['R2_PUBLIC_URL'],

    sentryDsn: rawEnv['SENTRY_DSN'],
    otelEndpoint: rawEnv['OTEL_EXPORTER_OTLP_ENDPOINT'],
    logLevel: rawEnv['LOG_LEVEL'] || 'info',

    rateLimitTtlMs: rawEnv['RATE_LIMIT_TTL_MS'] || '60000',
    rateLimitLimit: rawEnv['RATE_LIMIT_LIMIT'] || '100',
    idempotencyTtlSeconds: rawEnv['IDEMPOTENCY_TTL_SECONDS'] || '86400',
    jwtSecret: rawEnv['JWT_SECRET'],
  };

  // In production, enforce non-placeholder values
  if (parsedInput.nodeEnv === 'production') {
    if (!rawEnv['DATABASE_URL']) {
      throw new ConfigValidationError([
        {
          code: z.ZodIssueCode.custom,
          path: ['databaseUrl'],
          message: 'DATABASE_URL is strictly mandatory in production environment.',
        },
      ]);
    }
  }

  const result = AppConfigSchema.safeParse(parsedInput);
  if (!result.success) {
    throw new ConfigValidationError(result.error.issues);
  }

  return result.data;
}

/**
 * Sanitizes AppConfig to prevent leaking sensitive secrets into logs or console.
 */
export function sanitizeConfig(config: AppConfig): Record<string, unknown> {
  const maskUrl = (rawUrl: string): string => {
    try {
      const URLClass = (globalThis as { URL?: { new (url: string): { password?: string; toString(): string } } }).URL;
      if (!URLClass) return '[MASKED_URL]';
      const parsed = new URLClass(rawUrl);
      if (parsed.password) {
        parsed.password = '******';
      }
      return parsed.toString();
    } catch {
      return '[MASKED_URL]';
    }
  };

  return {
    nodeEnv: config.nodeEnv,
    appName: config.appName,
    appVersion: config.appVersion,
    apiPort: config.apiPort,
    databaseUrl: maskUrl(config.databaseUrl),
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: '[REDACTED]',
    supabaseServiceRoleKey: '[REDACTED]',
    redisUrl: maskUrl(config.redisUrl),
    redisEnabled: config.redisEnabled,
    storageEndpoint: config.storageEndpoint,
    storageBucket: config.storageBucket,
    storageAccessKeyId: '[REDACTED]',
    storageSecretAccessKey: '[REDACTED]',
    storagePublicUrl: config.storagePublicUrl,
    sentryDsn: config.sentryDsn ? '[CONFIGURED]' : '[NOT_SET]',
    otelEndpoint: config.otelEndpoint ? '[CONFIGURED]' : '[NOT_SET]',
    logLevel: config.logLevel,
    rateLimitTtlMs: config.rateLimitTtlMs,
    rateLimitLimit: config.rateLimitLimit,
    idempotencyTtlSeconds: config.idempotencyTtlSeconds,
    jwtSecret: config.jwtSecret ? '[REDACTED]' : undefined,
  };
}
