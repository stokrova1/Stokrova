import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { ErrorCodes } from '@stokrova/contracts';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly store = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options?: { windowMs?: number; maxRequests?: number }) {
    this.windowMs =
      options?.windowMs ??
      Number(process.env['RATE_LIMIT_WINDOW_MS'] || 60000); // 1 minute window
    this.maxRequests =
      options?.maxRequests ??
      Number(process.env['RATE_LIMIT_MAX_REQUESTS'] || 1000); // 1000 requests / window
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (process.env['RATE_LIMIT_DISABLED'] === 'true') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const tenantId = (req.headers['x-tenant-id'] as string) || 'public';
    const key = `${tenantId}:${ip}`;

    const now = Date.now();
    let bucket = this.store.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + this.windowMs,
      };
      this.store.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, this.maxRequests - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (bucket.count > this.maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        error: {
          code: ErrorCodes.VALIDATION_FAILED || 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please slow down and try again later.',
          retryAfterSeconds: resetSeconds,
        },
      });
      return;
    }

    next();
  }

  reset(): void {
    this.store.clear();
  }
}
