import type { SubscriptionTier } from '@stokrova/contracts';

export interface PlatformAdminQueryDto {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface SuspendBusinessDto {
  reason: string;
}

export interface ReactivateBusinessDto {
  reason: string;
}

export interface UpdateBusinessTierDto {
  tier: SubscriptionTier;
}

export interface UpdatePlanPriceDto {
  monthly_price_minor?: string | number;
  annual_price_minor?: string | number;
}

export interface SuspendUserDto {
  reason: string;
}

export interface ReactivateUserDto {
  reason: string;
}

export interface PlatformOverviewResponse {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalGmvMinor: string;
  platformMrrMinor: string;
  activeWorkCenters: number;
  systemHealthPct: number;
}

export interface PlatformTenantItem {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  ownerName: string;
  ownerEmail: string;
  currencyCode: string;
  subscriptionTier: SubscriptionTier;
  companiesCount: number;
  branchesCount: number;
  monthlyGmvMinor: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBusinessesResponse {
  items: PlatformTenantItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  tenantId?: string;
  tenantName?: string;
  lastActiveIso: string;
}

export interface PaginatedUsersResponse {
  items: PlatformUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  database: {
    connected: boolean;
    latencyMs: number;
    poolTotal: number;
    poolIdle: number;
    poolWaiting: number;
  };
  auth: {
    status: 'ONLINE' | 'OFFLINE';
    provider: string;
  };
  crdt: {
    outboxLag: number;
    status: 'SYNCHRONIZED' | 'LAGGING';
  };
  security: {
    rlsActive: boolean;
    merkleTamperChain: 'SEALED' | 'VERIFIED';
  };
}

export interface PlatformAuditEventItem {
  id: string;
  tenantId?: string;
  actorId: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: string;
}
