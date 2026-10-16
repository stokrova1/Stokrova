import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BillingService } from './billing.service.js';

/** Addresses that stay open when a workspace is closed, so the owner can still sign in and pay. */
const ALWAYS_OPEN = ['/v1/billing', '/v1/auth', '/v1/platform-admin', '/v1/health', '/health'];

/**
 * Closes a business's workspace once its free trial is over and a plan invoice is unpaid,
 * unless the founder has let it run free. Billing, sign-in and the founder console stay reachable.
 */
@Injectable()
export class BillingAccessGuard implements CanActivate {
  constructor(private readonly billing: BillingService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<{ path?: string; url?: string; headers: Record<string, unknown> }>();
    const path = String(req.path ?? req.url ?? '');
    if (ALWAYS_OPEN.some((p) => path === p || path.startsWith(p + '/'))) return true;
    const tenantId = req.headers['x-tenant-id'];
    if (typeof tenantId !== 'string' || !tenantId) return true;
    if (this.billing.accessNow(tenantId) === 'CLOSED') {
      throw new HttpException(
        {
          error: {
            code: 'WORKSPACE_CLOSED_UNPAID',
            message: 'Your free trial has ended and your plan invoice is unpaid. Pay it in Plan & Billing to reopen your workspace.',
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }
}
