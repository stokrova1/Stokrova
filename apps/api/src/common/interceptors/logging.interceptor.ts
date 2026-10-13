import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = performance.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) || (req as any).requestId || 'unknown';
    const tenantId = (req as any).tenantId || (req as any).tenantContext?.tenantId;
    const userId = (req as any).userId || (req as any).user?.id;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Math.round(performance.now() - start);
          const statusCode = res.statusCode;

          const logPayload = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            requestId,
            tenantId,
            userId,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
          };

          this.logger.log(JSON.stringify(logPayload));
        },
        error: (err: any) => {
          const durationMs = Math.round(performance.now() - start);
          const statusCode = err?.status || err?.statusCode || 500;

          const logPayload = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            requestId,
            tenantId,
            userId,
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            errorMessage: err?.message,
          };

          this.logger.error(JSON.stringify(logPayload));
        },
      }),
    );
  }
}
