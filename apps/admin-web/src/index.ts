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
    return `
      <header class="stokrova-admin-header" style="background: ${tokens.surface}; border-bottom: 1px solid ${tokens.border};">
        <div class="header-brand">
          <span class="brand-symbol" style="color: ${tokens.primary};">◆</span>
          <span class="brand-name" style="color: ${tokens.textPrimary}; font-weight: 700;">STOKROVA</span>
          <span class="workspace-pill" style="border: 1px solid ${tokens.borderStrong}; color: ${tokens.textSecondary};">
            ${this.context.tenantName} / ${this.context.branchName}
          </span>
        </div>
        <div class="header-actions">
          <button class="quick-search-trigger" style="border: 1px solid ${tokens.border}; color: ${tokens.textSecondary};">
            <span>Quick Search</span>
            <kbd style="border: 1px solid ${tokens.borderStrong};">Cmd+K</kbd>
          </button>
          <span class="status-indicator online" title="Cluster Online">● Online</span>
        </div>
      </header>
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
    const cssVars = generateCssVariableString(this.theme);
    const tokens = themeTokens[this.theme];

    return `
<!DOCTYPE html>
<html lang="en" data-theme="${this.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — ${this.context.tenantName}</title>
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

