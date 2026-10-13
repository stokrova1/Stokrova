import { describe, it, expect } from 'vitest';
import { AdminWebShell } from '../src/index.js';

describe('Phase 23 @stokrova/admin-web — Application Shell Suite', () => {
  const baseContext = {
    tenantId: 'tenant_omega',
    tenantName: 'Omega Global Retail',
    companyId: 'comp_emea',
    companyName: 'Omega EMEA Corp',
    branchId: 'br_london',
    branchName: 'London Flagship Branch',
    userRoleCodes: ['BRANCH_MANAGER'],
    userPermissions: ['sales.read', 'catalog.read', 'inventory.read', 'analytics.read'],
  };

  it('initializes with default workspace and dark mode theme', () => {
    const shell = new AdminWebShell({ context: baseContext });
    expect(shell.getContext().tenantName).toBe('Omega Global Retail');
    expect(shell.getTheme()).toBe('dark');
    expect(shell.getCurrentPath()).toBe('/analytics/dashboards');
  });

  it('allows dynamic branch and company workspace switching', () => {
    const shell = new AdminWebShell({ context: baseContext });
    shell.switchBranch('br_paris', 'Paris Champs-Élysées');
    expect(shell.getContext().branchName).toBe('Paris Champs-Élysées');

    shell.switchCompany('comp_apac', 'Omega APAC Corp');
    expect(shell.getContext().companyName).toBe('Omega APAC Corp');
  });

  it('filters navigation sections based on user permissions', () => {
    const shell = new AdminWebShell({ context: baseContext });
    const sections = shell.getNavigationSections();
    const sectionIds = sections.map((s) => s.id);

    expect(sectionIds).toContain('commerce');
    expect(sectionIds).toContain('inventory');
    expect(sectionIds).toContain('intelligence');
    // Financial General Ledger or Procurement orders should not appear without permissions
    expect(sectionIds).not.toContain('finance');
    expect(sectionIds).not.toContain('procurement');
  });

  it('executes quick-search launcher matching query across permitted routes', () => {
    const shell = new AdminWebShell({ context: baseContext });
    shell.openQuickSearch();
    expect(shell.isQuickSearchVisible()).toBe(true);

    const results = shell.queryQuickSearch('products');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.path).toBe('/catalog/products');

    shell.closeQuickSearch();
    expect(shell.isQuickSearchVisible()).toBe(false);
  });

  it('renders complete accessible HTML shell layout embedding brand styles and tokens', () => {
    const shell = new AdminWebShell({ context: baseContext, theme: 'dark' });
    const html = shell.renderCompleteShellHtml('<div id="dashboard-view">KPIs Content</div>');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('Omega Global Retail / London Flagship Branch');
    expect(html).toContain('id="dashboard-view"');
  });

  it('adapts to company branding with custom primary color and logo in header and banner', () => {
    const shell = new AdminWebShell({
      context: {
        ...baseContext,
        branding: {
          company_name: 'Apex Superstores Ltd',
          logo_url: 'https://cdn.apex.com/logo.png',
          primary_color: '#00C853',
          currency_symbol: '₦',
        },
      },
    });

    const header = shell.renderHeaderHtml();
    expect(header).toContain('Apex Superstores Ltd');
    expect(header).toContain('https://cdn.apex.com/logo.png');
    expect(header).toContain('Get Desktop App');

    const welcome = shell.renderWelcomeBannerHtml('Amina');
    expect(welcome).toContain('Welcome back to Apex Superstores Ltd, Amina');

    const html = shell.renderCompleteShellHtml('<main>Main Body</main>');
    expect(html).toContain('--stokrova-primary: #00C853;');
    expect(html).toContain('<title>Apex Superstores Ltd</title>');
  });

  it('renders desktop app download modal with multi-platform installers', () => {
    const shell = new AdminWebShell({ context: baseContext });
    const modalHtml = shell.renderDesktopDownloadModalHtml();

    expect(modalHtml).toContain('Install STOKROVA Desktop');
    expect(modalHtml).toContain('Windows (.exe)');
    expect(modalHtml).toContain('macOS (.dmg)');
    expect(modalHtml).toContain('Offline-first engine');
  });

  it('renders mobile scanner app download and instant branch QR pairing modal', () => {
    const shell = new AdminWebShell({ context: baseContext });
    const headerHtml = shell.renderHeaderHtml();
    expect(headerHtml).toContain('Get Mobile App');

    const pairingModalHtml = shell.renderMobilePairingModalHtml();
    expect(pairingModalHtml).toContain('Connect Omega EMEA Corp Mobile Scanner');
    expect(pairingModalHtml).toContain('Android (.apk)');
    expect(pairingModalHtml).toContain('iOS App Store');
    expect(pairingModalHtml).toContain('[STOKROVA-PAIR]');
    expect(pairingModalHtml).toContain('London Flagship Branch');
  });
});


