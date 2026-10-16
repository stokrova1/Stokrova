import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { StructuredLoggingInterceptor } from './common/interceptors/logging.interceptor.js';

import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware.js';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware.js';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    try {
      process.loadEnvFile('../../.env');
    } catch {
      // ignore
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security Headers Middleware (nosniff, DENY, CSP, HSTS, Permissions-Policy)
  const securityHeaders = new SecurityHeadersMiddleware();
  app.use(securityHeaders.use.bind(securityHeaders));

  // Sliding Window Rate Limiting Middleware
  const rateLimiter = new RateLimiterMiddleware();
  app.use(rateLimiter.use.bind(rateLimiter));

  // Enforce API versioning from API_CONVENTIONS.md
  app.setGlobalPrefix('v1');

  // Enforce global error sanitation and structured error responses
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Attach structured logging interceptor
  app.useGlobalInterceptors(new StructuredLoggingInterceptor());

  // Strict CORS policy based on configured allowlist
  const allowedOriginsEnv = process.env['CORS_ALLOWED_ORIGINS'];
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'tauri://localhost',
      ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser requests (e.g. mobile apps, CLI, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        (origin && origin.endsWith('.vercel.app'))
      ) {
        return callback(null, true);
      }
      return callback(
        new Error(`CORS origin '${origin}' not allowed by STOKROVA security policy.`),
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-branch-id',
      'x-register-id',
      'x-work-center-id',
      'idempotency-key',
      'x-operation-id',
      'x-request-id',
      'x-correlation-id',
      'x-test-user-id',
      'x-test-user-email',
      'x-test-platform-admin',
      'x-test-allowed-tenants',
    ],
    maxAge: 86400,
  });

  const port = process.env['PORT'] ? Number(process.env['PORT']) : 3000;
  await app.listen(port);
  console.log(`STOKROVA Business API running on http://localhost:${port}/v1`);
}

bootstrap();
