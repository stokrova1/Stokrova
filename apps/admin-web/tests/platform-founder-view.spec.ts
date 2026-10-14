import { describe, it, expect } from 'vitest';
import { PlatformFounderView } from '../src/index.js';

describe('PlatformFounderView — Founder Super-Admin Management Suite', () => {
  it('seeds default platform tenant companies and lists them', () => {
    const founder = new PlatformFounderView('dark');
    const tenants = founder.listTenants();

    expect(tenants.length).toBeGreaterThanOrEqual(4);
    expect(tenants.some((t) => t.id === 'ten_apex_global')).toBe(true);
    expect(tenants.some((t) => t.slug === 'metro-retail')).toBe(true);
  });

  it('enrolls and provisions a new business organization tenant', () => {
    const founder = new PlatformFounderView('dark');

    founder.addTenant({
      id: 'ten_zenith_dist',
      name: 'Zenith Global Distribution Ltd',
      slug: 'zenith-dist',
      ownerName: 'Liam Henderson',
      ownerEmail: 'liam@zenith.com',
      currencyCode: 'USD',
      subscriptionTier: 'ENTERPRISE_LOGISTICS',
      status: 'ACTIVE',
      companiesCount: 3,
      branchesCount: 6,
      monthlyGmvMinor: 350000000n, // $3,500,000.00
      createdAt: '2026-10-14T10:00:00Z',
    });

    const tenant = founder.getTenant('ten_zenith_dist');
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe('Zenith Global Distribution Ltd');
    expect(tenant?.subscriptionTier).toBe('ENTERPRISE_LOGISTICS');
  });

  it('toggles tenant account status between ACTIVE and SUSPENDED (killswitch)', () => {
    const founder = new PlatformFounderView('dark');

    const success = founder.setTenantStatus('ten_apex_global', 'SUSPENDED');
    expect(success).toBe(true);
    expect(founder.getTenant('ten_apex_global')?.status).toBe('SUSPENDED');

    const reactivated = founder.setTenantStatus('ten_apex_global', 'ACTIVE');
    expect(reactivated).toBe(true);
    expect(founder.getTenant('ten_apex_global')?.status).toBe('ACTIVE');
  });

  it('calculates global platform-wide SaaS MRR and aggregated GMV metrics', () => {
    const founder = new PlatformFounderView('dark');
    const metrics = founder.getPlatformMetrics();

    expect(metrics.totalTenants).toBeGreaterThanOrEqual(4);
    expect(metrics.activeTenants).toBeGreaterThan(0);
    expect(metrics.platformMrrMinor).toBeGreaterThan(0n);
    expect(metrics.totalGmvMinor).toBeGreaterThan(0n);
    expect(metrics.systemHealthPct).toBe(99.98);
  });

  it('renders complete Founder Portal HTML with KPI cards, tenant directory, and enroll modal', () => {
    const founder = new PlatformFounderView('dark');
    const html = founder.renderPlatformFounderPortalHtml();

    expect(html).toContain('PLATFORM FOUNDER CONSOLE');
    expect(html).toContain('Global Ecosystem Administration');
    expect(html).toContain('Apex Global Retail & Logistics Ltd');
    expect(html).toContain('Enroll New Business Client');
    expect(html).toContain('new-company-name');
    expect(html).toContain('new-company-slug');
  });
});
