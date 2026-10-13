import { HttpStatus } from '@nestjs/common';

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message: string = 'The requested resource was not found.', details?: Record<string, unknown>) {
    super(message, 'RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', HttpStatus.CONFLICT, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required.', details?: Record<string, unknown>) {
    super(message, 'AUTH_UNAUTHORIZED', HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied for the requested scope.', details?: Record<string, unknown>) {
    super(message, 'AUTH_FORBIDDEN', HttpStatus.FORBIDDEN, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Input validation failed.', details?: Record<string, unknown>) {
    super(message, 'VALIDATION_FAILED', HttpStatus.BAD_REQUEST, details);
  }
}

export class RateLimitExceededError extends AppError {
  constructor(message: string = 'Rate limit exceeded. Please retry later.', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS, details);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message: string = 'Idempotency operation conflict.', details?: Record<string, unknown>) {
    super(message, 'IDEMPOTENCY_CONFLICT', HttpStatus.CONFLICT, details);
  }
}
