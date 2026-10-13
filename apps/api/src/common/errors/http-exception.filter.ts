import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from './api-error.js';
import type { ApiErrorShape } from './api-error.js';
import { sanitizeUrl } from '../utils/url-sanitizer.js';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request?.headers?.['x-request-id'] as string) ||
      (request as any)?.['requestId'] ||
      'req_unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An internal server error occurred.';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = `HTTP_${statusCode}`;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj['message'] as string) || exception.message;
        code = (resObj['code'] as string) || `HTTP_${statusCode}`;
        if (resObj['details']) {
          details = resObj['details'] as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      // Diagnostic logging for unexpected internal errors
      const safeUrl = sanitizeUrl(request.originalUrl || request.url || '');
      this.logger.error(
        `Unhandled exception for request [${requestId}] on ${request.method} ${safeUrl}: ${exception.message}`,
        exception.stack,
      );

      // In production, never expose raw internal/SQL errors
      if (process.env['NODE_ENV'] !== 'production') {
        // Redact any database connection strings or secret keys even in dev
        message = exception.message.replace(/postgres:\/\/[^@]+@/g, 'postgres://[REDACTED]@');
      } else {
        message = 'An internal server error occurred.';
      }
    }

    const payload: ApiErrorShape = {
      error: {
        code,
        message,
        requestId,
        ...(details ? { details } : {}),
      },
    };

    response.status(statusCode).json(payload);
  }
}
