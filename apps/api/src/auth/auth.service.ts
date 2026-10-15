import { Injectable, Inject, Optional } from '@nestjs/common';
import type { UserIdentity } from '@stokrova/contracts';
import { TenancyService } from '../tenancy/tenancy.service.js';
import { DATABASE_POOL } from '../infrastructure/database/database.tokens.js';
import type { CreateTenantRequest, ProvisionedTenantResult } from '@stokrova/contracts';

export interface UserSessionResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    is_platform_admin: boolean;
  };
  onboarding_status: 'COMPLETED' | 'ONBOARDING_REQUIRED';
  memberships: Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    role: string;
    status: string;
  }>;
  active_tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenancyService: TenancyService,
    @Optional() @Inject(DATABASE_POOL) private readonly pool?: any,
  ) {}

  async getSession(user: UserIdentity): Promise<UserSessionResponse> {
    if (this.pool && typeof this.pool.query === 'function') {
      try {
        const query = `
          SELECT 
            m.tenant_id, 
            m.status as membership_status,
            t.name as tenant_name, 
            t.slug as tenant_slug,
            COALESCE(u.role, 'staff') as user_role,
            COALESCE(u.full_name, $2) as user_full_name
          FROM public.memberships m
          JOIN public.tenants t ON t.id = m.tenant_id
          LEFT JOIN public.users u ON u.id = m.user_id AND u.tenant_id = m.tenant_id
          WHERE m.user_id = $1 AND m.status = 'ACTIVE'
        `;
        const res = await this.pool.query(query, [user.id, user.full_name]);
        if (res.rows && res.rows.length > 0) {
          const memberships = res.rows.map((r: any) => ({
            tenant_id: r.tenant_id,
            tenant_name: r.tenant_name,
            tenant_slug: r.tenant_slug,
            role: r.user_role,
            status: r.membership_status,
          }));

          const active = memberships[0];

          return {
            user: {
              id: user.id,
              email: user.email,
              full_name: res.rows[0].user_full_name || user.full_name,
              is_platform_admin: Boolean(user.is_platform_admin),
            },
            onboarding_status: 'COMPLETED',
            memberships,
            active_tenant: active
              ? {
                  id: active.tenant_id,
                  name: active.tenant_name,
                  slug: active.tenant_slug,
                }
              : undefined,
          };
        }
      } catch {
        // Fallback for non-db test environments
      }
    }

    // Fallback: check in-memory memberships if available
    const inMemMemberships = await this.tenancyService.getUserMemberships(user.id);
    if (inMemMemberships.length > 0) {
      const activeMem = inMemMemberships[0]!;
      const tenant = await this.tenancyService.getTenantById(activeMem.tenant_id).catch(() => null);

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          is_platform_admin: Boolean(user.is_platform_admin),
        },
        onboarding_status: 'COMPLETED',
        memberships: [
          {
            tenant_id: activeMem.tenant_id,
            tenant_name: tenant?.name || 'Active Tenant',
            tenant_slug: tenant?.slug || 'active-tenant',
            role: 'tenant_admin',
            status: activeMem.status,
          },
        ],
        active_tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
            }
          : undefined,
      };
    }

    // Authenticated actor with no memberships yet -> ONBOARDING_REQUIRED
    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_platform_admin: Boolean(user.is_platform_admin),
      },
      onboarding_status: 'ONBOARDING_REQUIRED',
      memberships: [],
    };
  }

  async completeOnboarding(
    user: UserIdentity,
    dto: CreateTenantRequest,
  ): Promise<ProvisionedTenantResult> {
    // Check if user already has an active tenant
    const existingSession = await this.getSession(user);
    if (existingSession.onboarding_status === 'COMPLETED' && existingSession.active_tenant) {
      // Idempotency: return existing tenant if slug matches
      if (dto.slug && existingSession.active_tenant.slug === dto.slug) {
        const tenant = await this.tenancyService.getTenantById(existingSession.active_tenant.id);
        const branches = await this.tenancyService.getBranchesByTenant(tenant.id);
        const company = await this.tenancyService.getCompanyById(tenant.id, tenant.id.replace('ten_', 'cmp_'));
        return {
          tenant,
          company: company || {
            id: `cmp_${tenant.id}`,
            tenant_id: tenant.id,
            name: tenant.name,
            currency_code: 'USD',
            created_at: new Date().toISOString(),
          },
          default_branch: branches[0] || {
            id: `brn_${tenant.id}`,
            tenant_id: tenant.id,
            company_id: `cmp_${tenant.id}`,
            name: 'Main Branch',
            code: 'MAIN',
            created_at: new Date().toISOString(),
          },
        };
      }
    }

    return this.tenancyService.provisionTenant(
      {
        ...dto,
        owner_email: user.email,
        owner_full_name: user.full_name,
      },
      user.id,
    );
  }
}
