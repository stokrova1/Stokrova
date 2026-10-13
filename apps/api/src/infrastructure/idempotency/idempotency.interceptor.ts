import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { IdempotencyService } from './idempotency.service.js';
import { IdempotencyConflictError } from '../../common/errors/api-error.js';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const rawKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-operation-id'] as string);

    if (!rawKey || rawKey.trim() === '') {
      return next.handle();
    }

    const idempotencyKey = rawKey.trim();
    const tenantId =
      (req as any).tenantId ||
      (req as any).tenantContext?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      'global';

    const path = req.originalUrl || req.url;
    const method = req.method;
    const payload = req.body;

    const decision = await this.idempotencyService.evaluateOperation(
      tenantId,
      idempotencyKey,
      path,
      method,
      payload,
    );

    if (decision.status === 'CONFLICT') {
      throw new IdempotencyConflictError(decision.message);
    }

    if (decision.status === 'IN_PROGRESS') {
      throw new IdempotencyConflictError(
        `Operation with key '${idempotencyKey}' is currently in progress. Please retry shortly.`,
      );
    }

    if (decision.status === 'RESOLVED') {
      res.status(decision.statusCode);
      res.setHeader('x-idempotent-replay', 'true');
      return of(decision.body);
    }

    // New operation: execute and capture result
    return next.handle().pipe(
      tap({
        next: (body) => {
          this.idempotencyService.resolveOperation(
            tenantId,
            idempotencyKey,
            res.statusCode || 200,
            body,
          );
        },
      }),
      catchError((err) => {
        this.idempotencyService.rejectOperation(
          tenantId,
          idempotencyKey,
          err?.message,
        );
        throw err;
      }),
    );
  }
}
