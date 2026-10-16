import { ConflictException } from '@nestjs/common';
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
    status?: string;
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
            t.status as tenant_status,
            COALESCE(u.role, 'staff') as user_role,
            COALESCE(u.full_name, $2) as user_full_name
          FROM public.memberships m
          JOIN public.tenants t ON t.id = m.tenant_id
          LEFT JOIN public.users u ON u.id = m.user_id AND u.tenant_id = m.tenant_id
          WHERE m.user_id = $1
        `;
        const res = await this.pool.query(query, [user.id, user.full_name]);
        if (res.rows && res.rows.length > 0) {
          const memberships = res.rows.map((r: any) => {
            const isSuspended = r.tenant_status === 'SUSPENDED' || r.membership_status === 'SUSPENDED';
            return {
              tenant_id: r.tenant_id,
              tenant_name: r.tenant_name,
              tenant_slug: r.tenant_slug,
              role: r.user_role,
              status: isSuspended ? 'SUSPENDED' : r.membership_status,
            };
          });

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
                  status: active.status,
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
      // Idempotency: a retried sign-up for the same workspace returns the existing company.
      if (dto.slug && existingSession.active_tenant.slug === dto.slug) {
        const tenant = await this.tenancyService.getTenantById(existingSession.active_tenant.id);
        const branches = await this.tenancyService.getBranchesByTenant(tenant.id);
        const branch = branches[0];
        const company = branch ? await this.tenancyService.getCompanyById(tenant.id, branch.company_id) : null;
        if (company && branch) return { tenant, company, default_branch: branch };
      }
      // One owner account registers one company; extra companies are added from inside the workspace.
      throw new ConflictException('This account already owns a Stokrova workspace. Sign in to continue.');
    }

    return this.tenancyService.provisionTenant(
      {
        ...dto,
        owner_email: user.email,
        owner_full_name: dto.owner_full_name || user.full_name,
      },
      user.id,
    );
  }
}
