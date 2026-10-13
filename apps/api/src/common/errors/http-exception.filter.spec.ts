import { describe, it, expect, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from './http-exception.filter.js';
import { ResourceNotFoundError, ValidationError, ForbiddenError } from './api-error.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

describe('GlobalHttpExceptionFilter (Phase 1 Specification Section 28 & 29)', () => {
  const filter = new GlobalHttpExceptionFilter();

  const createMockHost = (requestId = 'req_test_123'): {
    host: ArgumentsHost;
    statusStub: ReturnType<typeof vi.fn>;
    jsonStub: ReturnType<typeof vi.fn>;
  } => {
    const jsonStub = vi.fn();
    const statusStub = vi.fn().mockReturnValue({ json: jsonStub });

    const mockResponse = {
      status: statusStub,
    };

    const mockRequest = {
      headers: { 'x-request-id': requestId },
      method: 'POST',
      url: '/v1/tenants',
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    return { host, statusStub, jsonStub };
  };

  it('formats AppError subclasses with standard API envelope and requestId', () => {
    const { host, statusStub, jsonStub } = createMockHost('req_custom_999');
    const exception = new ResourceNotFoundError('Tenant branch not found', { branchId: 'br_99' });

    filter.catch(exception, host);

    expect(statusStub).toHaveBeenCalledWith(404);
    expect(jsonStub).toHaveBeenCalledWith({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Tenant branch not found',
        requestId: 'req_custom_999',
        details: { branchId: 'br_99' },
      },
    });
  });

  it('formats ValidationError with status 400 and details', () => {
    const { host, statusStub, jsonStub } = createMockHost('req_val_1');
    const exception = new ValidationError('Payload validation failed', {
      issues: [{ path: 'slug', message: 'Slug already taken' }],
    });

    filter.catch(exception, host);

    expect(statusStub).toHaveBeenCalledWith(400);
    expect(jsonStub).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Payload validation failed',
        requestId: 'req_val_1',
        details: { issues: [{ path: 'slug', message: 'Slug already taken' }] },
      },
    });
  });

  it('formats ForbiddenError with status 403', () => {
    const { host, statusStub, jsonStub } = createMockHost('req_sec_403');
    const exception = new ForbiddenError('Cross-tenant access prohibited');

    filter.catch(exception, host);

    expect(statusStub).toHaveBeenCalledWith(403);
    expect(jsonStub).toHaveBeenCalledWith({
      error: {
        code: 'AUTH_FORBIDDEN',
        message: 'Cross-tenant access prohibited',
        requestId: 'req_sec_403',
      },
    });
  });

  it('formats standard Nest HttpException cleanly', () => {
    const { host, statusStub, jsonStub } = createMockHost('req_nest_http');
    const exception = new HttpException('Bad Request Sample', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(statusStub).toHaveBeenCalledWith(400);
    expect(jsonStub).toHaveBeenCalledWith({
      error: {
        code: 'HTTP_400',
        message: 'Bad Request Sample',
        requestId: 'req_nest_http',
      },
    });
  });

  it('redacts unhandled internal Error messages in production mode', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    const { host, statusStub, jsonStub } = createMockHost('req_prod_error');
    const exception = new Error('FATAL: password authentication failed for user "postgres"');

    filter.catch(exception, host);

    expect(statusStub).toHaveBeenCalledWith(500);
    expect(jsonStub).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred.',
        requestId: 'req_prod_error',
      },
    });

    process.env['NODE_ENV'] = originalEnv;
  });
});
