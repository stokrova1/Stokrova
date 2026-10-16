import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { featureForPath } from '@stokrova/domain';
import { PlanEntitlementsService } from './plan-entitlements.service.js';

/**
 * Locks every server area that is not part of the business's plan (see plan-catalog.ts API_FEATURES),
 * so typing an address or calling the server directly cannot open a higher plan's feature.
 */
@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(private readonly plans: PlanEntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<{ path?: string; url?: string; headers: Record<string, unknown> }>();
    const feature = featureForPath(String(req.path ?? req.url ?? ''));
    if (!feature) return true;
    const path = String(req.path ?? req.url ?? '');
    const fromPath = /^(?:\/v1)?\/tenants\/([^/?]+)/.exec(path)?.[1];
    const tenantId = fromPath ?? req.headers['x-tenant-id'];
    if (typeof tenantId !== 'string' || !tenantId) return true; // TenantGuard on the route rejects it
    await this.plans.assertFeature(tenantId, feature);
    return true;
  }
}
