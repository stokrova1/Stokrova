import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Clickjacking protection: disallow framing entirely
    res.setHeader('X-Frame-Options', 'DENY');

    // Modern browser standard: disable buggy legacy XSS auditor
    res.setHeader('X-XSS-Protection', '0');

    // Referrer policy: send origin only for cross-origin HTTPS requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
    );

    // Permissions Policy: restrict browser sensor and hardware APIs
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=(), payment=()',
    );

    // HTTP Strict Transport Security: enforce HTTPS in production
    if (process.env['NODE_ENV'] === 'production' || req.secure) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // Strip server fingerprinting headers
    res.removeHeader('X-Powered-By');

    next();
  }
}
