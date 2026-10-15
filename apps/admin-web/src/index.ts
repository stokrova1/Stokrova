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
    const isDark = this.theme === 'dark';
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
      ? `<img src="${logoUrl}" alt="${companyDisplayName}" class="company-logo" style="height: 28px; max-width: 140px; object-fit: contain; margin-right: 8px;" />`
      : `<div class="stokrova-brand-lockup" style="display: flex; align-items: center; gap: 8px; margin-right: 12px; cursor: pointer;" onclick="window.stokrovaApp?.showView('dashboard')">
          <span class="brand-symbol" style="color: ${primaryColor}; font-size: 1.25rem; line-height: 1; font-weight: 800;">◆</span>
          <span class="brand-wordmark" style="color: ${isDark ? '#F8FAFC' : '#293136'}; font-weight: 800; font-size: 1.05rem; letter-spacing: 0.04em;">STOKROVA</span>
        </div>`;

    return `
      <header class="stokrova-admin-header" style="height: 64px; box-sizing: border-box; background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 1000; position: relative;">
        <!-- Left: Logo & Company / Branch Switcher -->
        <div class="header-brand" style="display: flex; align-items: center; gap: 8px;">
          ${logoHtml}
          
          <!-- Interactive Company & Branch Switcher Dropdown -->
          <div class="workspace-switcher-wrapper" style="position: relative;">
            <button id="branch-switcher-btn" onclick="window.stokrovaApp?.toggleBranchDropdown(event)" style="display: inline-flex; align-items: center; gap: 8px; background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 8px; padding: 6px 12px; cursor: pointer; color: ${tokens.textPrimary}; font-size: 0.8125rem; font-weight: 600; transition: all 0.15s ease;">
              <span class="company-brand-name" style="color: ${tokens.textPrimary}; font-weight: 700; font-size: 0.875rem;">${companyDisplayName}</span>
              <span class="workspace-pill" style="border: 1px solid ${tokens.borderStrong}; background: ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}; color: ${tokens.textSecondary}; font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px;">
                ${this.context.tenantName} / ${this.context.branchName}
              </span>
              <span style="font-size: 0.65rem; color: ${tokens.textMuted};">▼</span>
            </button>

            <!-- Dropdown Menu -->
            <div id="branch-switcher-dropdown" style="display: none; position: absolute; top: calc(100% + 6px); left: 0; width: 300px; background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 10px; box-shadow: 0 10px 28px rgba(0,0,0,0.25); z-index: 2000; padding: 8px; animation: fadeIn 0.15s ease-out;">
              <div style="padding: 6px 8px; font-size: 0.6875rem; font-weight: 700; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.08em;">Active Workspace Location</div>
              
              <!-- Active Entity -->
              <div style="margin-top: 4px;">
                <div style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700; color: ${primaryColor};">${companyDisplayName}</div>
                <div class="branch-option" onclick="window.stokrovaApp?.selectBranch('${this.context.companyId}', '${companyDisplayName}', '${this.context.branchId}', '${this.context.branchName}')" style="padding: 6px 10px; margin: 2px 0; border-radius: 6px; font-size: 0.8125rem; color: ${tokens.textPrimary}; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${isDark ? 'rgba(189,150,82,0.12)' : '#FDFBF7'};">
                  <span>📍 ${this.context.branchName}</span>
                  <span style="color: #16A34A; font-size: 0.7rem; font-weight: 600;">ACTIVE</span>
                </div>
              </div>

              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid ${tokens.border}; text-align: center;">
                <a href="/settings/organization" onclick="event.preventDefault(); window.stokrovaApp?.showView('org'); window.stokrovaApp?.toggleBranchDropdown(event);" style="color: ${primaryColor}; font-size: 0.75rem; text-decoration: none; font-weight: 600;">Manage Organization Topology →</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Actions, Command Palette, Sync Status, Theme Toggle -->
        <div class="header-actions" style="display: flex; align-items: center; gap: 10px;">
          <!-- Quick Search Launcher -->
          <button class="quick-search-trigger" onclick="window.stokrovaApp?.openQuickSearch()" style="border: 1px solid ${tokens.borderStrong}; color: ${tokens.textSecondary}; background: ${tokens.card}; padding: 6px 14px; border-radius: 8px; font-size: 0.8125rem; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: all 0.15s ease;">
            <span style="font-size: 0.85rem;">🔍</span>
            <span>Quick Search</span>
            <kbd style="border: 1px solid ${tokens.borderStrong}; background: ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}; padding: 2px 6px; border-radius: 4px; font-size: 0.6875rem; font-family: var(--stokrova-font-mono, monospace);">Cmd+K</kbd>
          </button>

          <!-- Get Desktop App Button -->
          <button class="download-desktop-trigger" onclick="window.stokrovaApp?.openDesktopModal()" title="Download Native Desktop App for Windows or Mac" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; background: ${primaryColor}; color: ${tokens.primaryForeground}; border: none; font-weight: 600; font-size: 0.8125rem; cursor: pointer; box-shadow: 0 2px 6px rgba(189,150,82,0.2); transition: opacity 0.15s ease;">
            <span style="font-size: 0.95rem;">🖥️</span>
            <span>Get Desktop App</span>
          </button>

          <!-- Get Mobile App Button -->
          <button class="download-mobile-trigger" onclick="window.stokrovaApp?.openMobileModal()" title="Download Mobile App for iOS or Android" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-weight: 600; font-size: 0.8125rem; cursor: pointer; transition: opacity 0.15s ease;">
            <span style="font-size: 0.95rem;">📱</span>
            <span>Get Mobile App</span>
          </button>

          <!-- Notifications Bell -->
          <button class="notifications-trigger" onclick="window.stokrovaApp?.toggleNotificationsDropdown(event)" title="Operational Notifications (3 unread)" style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; cursor: pointer;">
            <span style="font-size: 1rem;">🔔</span>
            <span style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: #EF4444; border: 2px solid ${tokens.card};"></span>
          </button>

          <!-- Light / Dark Theme Toggle Button -->
          <button class="theme-toggle-btn" onclick="window.stokrovaApp?.toggleTheme()" title="Switch Light / Dark Theme" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; font-size: 1rem; cursor: pointer; transition: all 0.15s ease;">
            <span>${isDark ? '☀️' : '🌙'}</span>
          </button>

          <!-- Online Sync Indicator -->
          <div style="padding-left: 4px;">
            <span class="status-indicator online" title="Double-Entry Sync Cluster Online • 0ms lag" style="display: inline-flex; align-items: center; gap: 6px; color: #16A34A; font-size: 0.75rem; font-weight: 700; background: ${isDark ? '#14291F' : '#F0FDF4'}; border: 1px solid ${isDark ? '#1E4620' : '#BBF7D0'}; padding: 4px 10px; border-radius: 9999px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #16A34A; box-shadow: 0 0 6px #16A34A;"></span>
              <span>● Online</span>
            </span>
          </div>
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
      <div class="company-welcome-banner" style="background: ${tokens.card}; border: 1px solid ${tokens.border}; border-radius: 10px; padding: 18px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div>
          <h2 style="margin: 0 0 6px 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 700;">Welcome back to ${companyDisplayName}${greetingName}!</h2>
          <p style="margin: 0; color: ${tokens.textSecondary}; font-size: 0.875rem;">Your operational dashboard and business controls for ${this.context.branchName} are ready.</p>
        </div>
        <div class="banner-badge" style="background: ${tokens.cardHover}; border: 1px solid ${tokens.borderStrong}; border-radius: 6px; padding: 6px 12px; font-size: 0.75rem; color: ${tokens.textMuted}; font-weight: 600;">
          Role: ${this.context.userRoleCodes.join(', ') || 'Staff Member'}
        </div>
      </div>
    `.trim();
  }

  public renderDesktopDownloadModalHtml(): string {
    const tokens = themeTokens[this.theme];
    const isDark = this.theme === 'dark';
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color ||
      tokens.primary;

    return `
      <div id="desktop-modal-backdrop" class="modal-backdrop" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;" onclick="if(event.target === this) window.stokrovaApp?.closeDesktopModal()">
        <div class="desktop-download-modal" style="background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 28px; max-width: 480px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); animation: modalIn 0.2s cubic-bezier(0.22, 1, 0.36, 1);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h3 style="margin: 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 800;">🖥️ Install STOKROVA Desktop App</h3>
            <button onclick="window.stokrovaApp?.closeDesktopModal()" style="background: transparent; border: none; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer;">✕</button>
          </div>
          <p style="margin: 0 0 20px 0; color: ${tokens.textSecondary}; font-size: 0.875rem; line-height: 1.5;">
            Experience your personalized dashboard in a dedicated native desktop window with full offline resilience and instant taskbar access.
          </p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <a href="/downloads/stokrova-setup-windows.exe" class="download-link" onclick="window.stokrovaApp?.showToast('Starting STOKROVA Windows installer download...')" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-radius: 8px; background: ${primaryColor}; color: ${tokens.primaryForeground}; text-decoration: none; font-weight: 700; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(189,150,82,0.25);">
              <span>Download for Windows (.exe)</span>
              <span>⬇️</span>
            </a>
            <a href="/downloads/stokrova-setup-mac.dmg" class="download-link" onclick="window.stokrovaApp?.showToast('Starting STOKROVA macOS DMG installer download...')" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-radius: 8px; background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; font-weight: 700; font-size: 0.875rem;">
              <span>Download for macOS (.dmg)</span>
              <span>⬇️</span>
            </a>
          </div>
          <div style="margin-top: 18px; font-size: 0.75rem; color: ${tokens.textMuted}; text-align: center; line-height: 1.4;">
            Offline-first engine with local cache and hardware device encryption
          </div>
        </div>
      </div>
    `.trim();
  }

  public renderMobilePairingModalHtml(): string {
    const tokens = themeTokens[this.theme];
    const isDark = this.theme === 'dark';
    const primaryColor =
      this.context.branding?.brandPrimaryColor ||
      this.context.branding?.primary_color ||
      tokens.primary;
    const companyDisplayName =
      this.context.branding?.company_name ||
      this.context.branding?.companyName ||
      this.context.companyName;

    return `
      <div id="mobile-modal-backdrop" class="modal-backdrop" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 10000; align-items: center; justify-content: center;" onclick="if(event.target === this) window.stokrovaApp?.closeMobileModal()">
        <div class="mobile-pairing-modal" style="background: ${tokens.card}; border: 1px solid ${tokens.borderStrong}; border-radius: 12px; padding: 28px; max-width: 440px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center; animation: modalIn 0.2s cubic-bezier(0.22, 1, 0.36, 1);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <h3 style="margin: 0; color: ${tokens.textPrimary}; font-size: 1.25rem; font-weight: 800; text-align: left;">📱 Connect ${companyDisplayName} Mobile Scanner</h3>
            <button onclick="window.stokrovaApp?.closeMobileModal()" style="background: transparent; border: none; font-size: 1.25rem; color: ${tokens.textMuted}; cursor: pointer;">✕</button>
          </div>
          <p style="margin: 0 0 18px 0; color: ${tokens.textSecondary}; font-size: 0.875rem; line-height: 1.5; text-align: left;">
            Use your handheld scanner or smartphone camera to scan this QR code and automatically connect to <strong>${this.context.branchName}</strong>.
          </p>
          <div class="qr-code-box" style="background: #FFFFFF; padding: 16px; border-radius: 10px; display: inline-block; margin: 0 auto 16px auto; box-shadow: 0 2px 10px rgba(0,0,0,0.12); border: 2px solid ${tokens.border};">
            <div style="width: 150px; height: 150px; border: 2px dashed ${primaryColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; color: #111; font-family: monospace;">
              <span style="font-size: 1.8rem; margin-bottom: 4px;">📷</span>
              <span style="font-weight: 700;">[STOKROVA-PAIR]</span>
              <span>TEN: ${this.context.tenantId}</span>
              <span>BR: ${this.context.branchId}</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 14px;">
            <a href="/downloads/stokrova-mobile.apk" class="download-badge" onclick="window.stokrovaApp?.showToast('Downloading Android APK...')" style="background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600;">
              🤖 Android (.apk)
            </a>
            <a href="https://apps.apple.com/app/stokrova" target="_blank" class="download-badge" style="background: ${isDark ? '#1E2428' : '#F8FAFC'}; border: 1px solid ${tokens.borderStrong}; color: ${tokens.textPrimary}; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600;">
              🍏 iOS App Store
            </a>
          </div>
          <p style="margin: 0; font-size: 0.75rem; color: ${tokens.textMuted};">
            Instant branch association • Encrypted device fingerprinting • Fast staff PIN switching
          </p>
        </div>
      </div>
    `.trim();
  }



  public renderSidebarHtml(): string {
    const tokens = themeTokens[this.theme];
    const sections = this.getNavigationSections();

    const sectionsHtml = sections
      .map((sec: NavigationSection) => {
        const itemsHtml = sec.items
          .map((item: NavigationItem) => {
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
export * from './platform-founder-view.js';
export * from './procurement-view.js';
export * from './finance-view.js';
export * from './registers-view.js';
export * from './rbac-view.js';
export * from './organization-view.js';

