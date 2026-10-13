/**
 * STOKROVA Admin Web Management Console — Application Shell Architecture
 * High-density enterprise layout, multi-tenant workspace switcher,
 * keyboard quick-launcher (Cmd+K), and role-filtered navigation.
 */

import {
  type WorkspaceContext,
  type NavigationSection,
  type NavigationItem,
  buildUserNavigation,
  searchNavigationShortcuts,
  generateCssVariableString,
  themeTokens,
} from '@stokrova/ui';

export interface AdminShellConfig {
  context: WorkspaceContext;
  theme?: 'light' | 'dark';
  initialPath?: string;
}

export class AdminWebShell {
  private context: WorkspaceContext;
  private theme: 'light' | 'dark';
  private currentPath: string;
  private isQuickSearchOpen = false;

  constructor(config: AdminShellConfig) {
    this.context = { ...config.context };
    this.theme = config.theme ?? 'dark';
    this.currentPath = config.initialPath ?? '/analytics/dashboards';
  }

  // ==========================================
  // Workspace & Context State
  // ==========================================

  public getContext(): WorkspaceContext {
    return { ...this.context };
  }

  public getTheme(): 'light' | 'dark' {
    return this.theme;
  }

  public getCurrentPath(): string {
    return this.currentPath;
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  public switchBranch(branchId: string, branchName: string): void {
    this.context.branchId = branchId;
    this.context.branchName = branchName;
  }

  public switchCompany(companyId: string, companyName: string): void {
    this.context.companyId = companyId;
    this.context.companyName = companyName;
  }

  public navigate(path: string): void {
    this.currentPath = path;
  }

  public setBranding(branding: NonNullable<WorkspaceContext['branding']>): void {
    this.context.branding = { ...branding };
  }

  // ==========================================
  // Role-Filtered Navigation & Search
  // ==========================================

  public getNavigationSections(): NavigationSection[] {
    return buildUserNavigation(this.context.userPermissions);
  }

  public openQuickSearch(): void {
    this.isQuickSearchOpen = true;
  }

  public closeQuickSearch(): void {
    this.isQuickSearchOpen = false;
  }

  public isQuickSearchVisible(): boolean {
    return this.isQuickSearchOpen;
  }

  public queryQuickSearch(query: string): NavigationItem[] {
    const allowedSections = this.getNavigationSections();
    return searchNavigationShortcuts(query, allowedSections);
  }

  // ==========================================
  // HTML Layout Rendering Engine
  // ==========================================

  public renderHeaderHtml(): string {
    const tokens = themeTokens[this.theme];
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color ||
      tokens.primary;
    const companyDisplayName =
      this.context.branding?.company_name ||
      this.context.branding?.companyName ||
      this.context.branding?.receiptHeader?.storeName ||
      this.context.companyName ||
      this.context.tenantName;

    const logoUrl =
      this.context.branding?.companyLogoUrl ||
      this.context.branding?.logo_url;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${companyDisplayName}" class="company-logo" style="height: 24px; max-width: 140px; object-fit: contain; margin-right: 8px;" />`
      : `<span class="brand-symbol" style="color: ${primaryColor}; font-size: 1.1rem; margin-right: 6px;">◆</span>`;

    return `
      <header class="stokrova-admin-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">
        <div class="header-brand" style="display: flex; align-items: center; gap: 8px;">
          ${logoHtml}
          <span class="company-brand-name" style="color: ${tokens.textPrimary}; font-weight: 700; font-size: 1.05rem;">${companyDisplayName}</span>
          <span class="workspace-pill" style="border: 1px solid ${tokens.borderStrong}; color: ${tokens.textSecondary}; font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px; margin-left: 6px;">
            ${this.context.tenantName} / ${this.context.branchName}
          </span>
        </div>
        <div class="header-actions" style="display: flex; align-items: center; gap: 12px;">
          <button class="download-desktop-trigger" title="Download Native Desktop App for Windows or Mac" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; background: ${primaryColor}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer; transition: opacity 0.15s ease;">
            <span style="font-size: 0.95rem;">🖥️</span>
            <span>Get Desktop App</span>
          </button>
          <button class="download-mobile-trigger" title="Download Mobile App for iOS or Android" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer; transition: opacity 0.15s ease;">
            <span style="font-size: 0.95rem;">📱</span>
            <span>Get Mobile App</span>
          </button>
          <button class="quick-search-trigger" style="border: 1px solid ${tokens.border}; color: ${tokens.textSecondary}; background: transparent; padding: 6px 12px; border-radius: 6px; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
            <span>Quick Search</span>
            <kbd style="border: 1px solid ${tokens.borderStrong}; padding: 1px 4px; border-radius: 4px; font-size: 0.7rem;">Cmd+K</kbd>
          </button>
          <span class="status-indicator online" title="Sync Cluster Online" style="color: #16A34A; font-size: 0.75rem; font-weight: 600;">● Online</span>
        </div>
      </header>
    `.trim();
  }

  public renderWelcomeBannerHtml(userName?: string): string {
    const tokens = themeTokens[this.theme];
    const companyDisplayName =
      this.context.branding?.company_name ||
      this.context.branding?.companyName ||
      this.context.branding?.receiptHeader?.storeName ||
      this.context.companyName ||
      this.context.tenantName;
    const greetingName = userName ? `, ${userName}` : '';

    return `
      <div class="company-welcome-banner" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 8px; padding: 18px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h2 style="margin: 0 0 6px 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 700;">Welcome back to ${companyDisplayName}${greetingName}!</h2>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Your operational dashboard and business controls for ${this.context.branchName} are ready.</p>
        </div>
        <div class="banner-badge" style="background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; padding: 6px 12px; font-size: 0.75rem; color: ${tokens.textMuted};">
          Role: ${this.context.userRoleCodes.join(', ') || 'Staff Member'}
        </div>
      </div>
    `.trim();
  }

  public renderDesktopDownloadModalHtml(): string {
    const tokens = themeTokens[this.theme];
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color ||
      tokens.primary;

    return `
      <div class="desktop-download-modal" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 8px 0; color: ${tokens.textPrimary}; font-size: 1.15rem;">🖥️ Install STOKROVA Desktop App</h3>
        <p style="margin: 0 0 18px 0; color: ${tokens.textSecondary}; font-size: 0.875rem; line-height: 1.4;">
          Experience your personalized dashboard in a dedicated native desktop window with full offline resilience and instant taskbar access.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a href="/downloads/stokrova-setup-windows.exe" class="download-link" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 6px; background: ${primaryColor}; color: ${tokens.primaryForeground}; text-decoration: none; font-weight: 600; font-size: 0.875rem;">
            <span>Download for Windows (.exe)</span>
            <span>⬇️</span>
          </a>
          <a href="/downloads/stokrova-setup-mac.dmg" class="download-link" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 6px; background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; font-weight: 600; font-size: 0.875rem;">
            <span>Download for macOS (.dmg)</span>
            <span>⬇️</span>
          </a>
        </div>
        <div style="margin-top: 14px; font-size: 0.75rem; color: ${tokens.textMuted}; text-align: center;">
          Offline-first engine with local cache and hardware device encryption
        </div>
      </div>
    `.trim();
  }

  public renderMobilePairingModalHtml(): string {
    const tokens = themeTokens[this.theme];
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color ||
      tokens.primary;
    const companyDisplayName =
      this.context.branding?.company_name ||
      this.context.branding?.companyName ||
      this.context.companyName;

    return `
      <div class="mobile-pairing-modal" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 12px; padding: 24px; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;">
        <h3 style="margin: 0 0 8px 0; color: ${tokens.textPrimary}; font-size: 1.15rem;">📱 Connect ${companyDisplayName} Mobile Scanner</h3>
        <p style="margin: 0 0 16px 0; color: ${tokens.textSecondary}; font-size: 0.875rem; line-height: 1.4;">
          Use your handheld scanner or smartphone camera to scan this QR code and automatically connect to <strong>${this.context.branchName}</strong>.
        </p>
        <div class="qr-code-box" style="background: #FFFFFF; padding: 16px; border-radius: 8px; display: inline-block; margin: 0 auto 16px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="width: 150px; height: 150px; border: 2px dashed ${primaryColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; color: #111; font-family: monospace;">
            <span style="font-size: 1.6rem; margin-bottom: 4px;">📷</span>
            <span>[STOKROVA-PAIR]</span>
            <span>TEN: ${this.context.tenantId}</span>
            <span>BR: ${this.context.branchId}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;">
          <a href="/downloads/stokrova-mobile.apk" class="download-badge" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
            🤖 Android (.apk)
          </a>
          <a href="https://apps.apple.com/app/stokrova" class="download-badge" style="background: ${tokens.surface}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
            🍏 iOS App Store
          </a>
        </div>
        <p style="margin: 0; font-size: 0.75rem; color: ${tokens.textMuted};">
          Instant branch association • Encrypted device fingerprinting • Fast staff PIN switching
        </p>
      </div>
    `.trim();
  }



  public renderSidebarHtml(): string {
    const tokens = themeTokens[this.theme];
    const sections = this.getNavigationSections();

    const sectionsHtml = sections
      .map((sec) => {
        const itemsHtml = sec.items
          .map((item) => {
            const isActive = item.path === this.currentPath;
            const activeStyle = isActive
              ? `background: ${tokens.cardHover}; color: ${tokens.primary}; font-weight: 600; border-left: 3px solid ${tokens.primary};`
              : `color: ${tokens.textSecondary};`;
            const shortcutHtml = item.shortcut ? `<kbd>${item.shortcut}</kbd>` : '';
            return `
              <li class="nav-item">
                <a href="${item.path}" style="${activeStyle}">
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-label">${item.label}</span>
                  ${shortcutHtml}
                </a>
              </li>
            `.trim();
          })
          .join('\n');

        return `
          <div class="nav-section">
            <h4 class="section-title" style="color: ${tokens.textMuted};">${sec.title}</h4>
            <ul class="nav-list">${itemsHtml}</ul>
          </div>
        `.trim();
      })
      .join('\n');

    return `
      <aside class="stokrova-admin-sidebar" style="background: ${tokens.surface}; border-right: 1px solid ${tokens.border};">
        ${sectionsHtml}
      </aside>
    `.trim();
  }

  public renderCompleteShellHtml(pageBodyContent: string): string {
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color;
    const cssVars = generateCssVariableString(
      this.theme,
      primaryColor,
    );
    const tokens = themeTokens[this.theme];
    const companyDisplayName =
      this.context.branding?.company_name ||
      this.context.branding?.companyName ||
      this.context.branding?.receiptHeader?.storeName ||
      this.context.companyName ||
      this.context.tenantName;

    return `
<!DOCTYPE html>
<html lang="en" data-theme="${this.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyDisplayName}</title>
  <style>
${cssVars}
    body {
      margin: 0;
      padding: 0;
      background: ${tokens.background};
      color: ${tokens.textPrimary};
      font-family: var(--stokrova-font-sans);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .app-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .content-viewport {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: ${tokens.background};
    }
  </style>
</head>
<body>
  ${this.renderHeaderHtml()}
  <div class="app-layout">
    ${this.renderSidebarHtml()}
    <main class="content-viewport">
      ${pageBodyContent}
    </main>
  </div>
</body>
</html>
    `.trim();
  }
}

export * from './catalog-view.js';
export * from './inventory-view.js';
export * from './orders-view.js';
export * from './workflows-view.js';
export * from './dashboard-view.js';
export * from './api-client.js';

