import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LandingViewModel } from './dist/index.js';
import { renderMasterSidebarHtml, renderAllWorkspaceViewsHtml } from '@stokrova/ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Copy UI assets (official logo, symbol, favicons) to dist/assets
const uiAssetsDir = path.resolve(__dirname, '../../packages/ui/assets');
const distDir = path.resolve(__dirname, 'dist');
const distAssetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

if (fs.existsSync(uiAssetsDir)) {
  const files = fs.readdirSync(uiAssetsDir);
  for (const file of files) {
    fs.copyFileSync(path.join(uiAssetsDir, file), path.join(distAssetsDir, file));
  }
}

// 2. Instantiate View Model & Render Sections
const landingView = new LandingViewModel('dark');

const headerHtml = landingView.renderHeaderHtml();
const heroHtml = landingView.renderHeroHtml();
const moneyFlowHtml = landingView.renderMoneyFlowStripHtml();
const featuresHtml = landingView.renderFeaturesGridHtml();
const architectureHtml = landingView.renderArchitectureSectionHtml();
const posHtml = landingView.renderPosSectionHtml();
const whoItsForHtml = landingView.renderWhoItsForSectionHtml();
const pricingHtml = landingView.renderPricingSectionHtml();
const faqHtml = landingView.renderFaqSectionHtml();
const closingCtaHtml = landingView.renderClosingCtaHtml();

const registerModalHtml = landingView.renderRegisterModalHtml();
const loginModalHtml = landingView.renderLoginModalHtml();
const demoConfirmModalHtml = landingView.renderDemoConfirmModalHtml();
const legalModalHtml = landingView.renderLegalModalHtml();

const footerHtml = landingView.renderFooterHtml();

const masterSidebarHtml = renderMasterSidebarHtml({
  activeViewId: 'dashboard',
  tenantName: 'Apex Global Retail Ltd',
  branchName: 'London Flagship',
  theme: 'dark',
  onItemClickFnName: 'window.stokrovaCustomerApp.showWsView',
});

const allWorkspaceViewsHtml = renderAllWorkspaceViewsHtml({
  theme: 'dark',
  tenantName: 'Apex Global Retail Ltd',
  branchName: 'London Flagship',
  currencyCode: 'USD',
  onActionToastFnName: 'window.stokrovaCustomerApp.showToast',
});

const completeWebsiteHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Enterprise Multi-Branch Inventory & POS Operating System</title>
  <link rel="icon" type="image/png" sizes="32x32" href="./assets/favicon-32x32.png">
  <link rel="apple-touch-icon" href="./assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Official STOKROVA Brand Tokens (Strictly Preserved) */
      --bg: #161B1E;             /* Midnight pitch dark background */
      --surface: #1E2428;        /* Dark slate elevated surface */
      --card-hover: #293136;     /* Wordmark slate */
      --border: #333D46;         /* Structural border */
      --border-strong: #414F5A;  /* Elevated component border */
      --primary: #BD9652;        /* Core Imperial Gold */
      --primary-hover: #CEB274;  /* Luminous Gold Hover */
      --text: #F8FAFC;           /* High-contrast crisp foreground */
      --text-secondary: #ACB8C3; /* Mid slate reading text (WCAG AAA) */
      --text-muted: #7E919F;     /* Subtle metadata */
      --teal: #2D8A9E;           /* Restrained Reconciliation Series */
      --green: #4ADE80;          /* Semantic Balanced / Success */
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --stokrova-font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Tabular numbers across all monetary and numerical elements */
    [font-variant-numeric~="tabular-nums"],
    .kpi-num,
    table,
    td,
    th {
      font-variant-numeric: tabular-nums;
    }

    a { color: var(--primary); }
    button { font-family: var(--font-sans); }
    input, select { font-family: var(--font-sans); }

    /* Focus visible ring discipline */
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    /* Visually Hidden Helper (WCAG AAA Compliance) */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Sticky Header Scrolled state */
    #main-header.scrolled {
      background: rgba(30, 36, 40, 0.9) !important;
      backdrop-filter: blur(12px) !important;
      border-bottom: 1px solid var(--border-strong) !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    /* Hero Command Center Animations */
    @keyframes glowBreathe {
      0% { opacity: 0.55; transform: scale(0.98); }
      100% { opacity: 0.95; transform: scale(1.02); }
    }
    .command-center-glow {
      animation: glowBreathe 6s ease-in-out infinite alternate;
    }

    @keyframes pulseDot {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    /* Revenue line chart drawing animation */
    @keyframes drawRevenueLine {
      from { stroke-dashoffset: 1000; }
      to { stroke-dashoffset: 0; }
    }
    .chart-revenue-line {
      stroke-dasharray: 1000;
      stroke-dashoffset: 0;
      animation: drawRevenueLine 1.2s ease-out forwards;
    }

    /* Card Hover Lift */
    .features-enhanced-grid > div,
    .money-flow-step,
    #architecture ol,
    #who-its-for > div > div {
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .features-enhanced-grid > div:hover,
    .money-flow-step:hover,
    #who-its-for > div > div:hover {
      transform: translateY(-2px);
      border-color: rgba(189, 150, 82, 0.4) !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    /* Details FAQ styling */
    details > summary::-webkit-details-marker { display: none; }
    details[open] summary span:last-child {
      transform: rotate(45deg);
    }
    details[open] {
      border-color: var(--primary) !important;
    }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--surface);
      border: 1px solid var(--primary);
      color: #F0F6FC;
      padding: 14px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      z-index: 10000;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Logged-In Business Workspace Container */
    #business-workspace-container {
      display: none;
      min-height: 100vh;
      background: var(--bg);
      flex-direction: column;
    }
    .workspace-topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .workspace-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 61px);
      overflow: hidden;
    }
    .workspace-sidebar {
      width: 270px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 12px 4px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .workspace-nav-section {
      margin-bottom: 12px;
    }
    .workspace-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 10px;
      margin: 1px 4px;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.12s ease;
    }
    .workspace-nav-item:hover {
      background: rgba(255,255,255,0.04);
      color: var(--text);
    }
    .workspace-nav-item.active {
      background: rgba(189,150,82,0.15);
      color: #E0CB9F;
      font-weight: 600;
      border-left: 3px solid var(--primary);
    }
    .workspace-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 28px;
      background: var(--bg);
    }
    .ws-view-content {
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ==========================================================================
       Mobile Refinement & Responsive Breakpoint Discipline
       - Main heading: 26–30px (controlled, no continuous fluid collapse)
       - Section headings: 20–24px
       - Card titles: 15–17px
       - Body copy: 14–16px (16px on inputs to prevent iOS auto-zoom)
       - Key finance numbers: 20–26px tabular-nums
       - Page gutters: 16px (12px on <= 360px)
       - Card internal spacing: 12–16px
       - Section spacing: 24–36px
       - Touch targets: >= 44x44px on all interactive controls
       - Zero page-level horizontal overflow
       ========================================================================== */

    html, body {
      max-width: 100vw;
      overflow-x: hidden;
    }

    /* iOS auto-zoom prevention: inputs & selects must be at least 16px */
    input, select, textarea {
      font-size: 16px !important;
    }

    button, .mobile-hamburger, .pos-tab-btn, summary {
      touch-action: manipulation;
    }

    @media (max-width: 960px) {
      .command-center-window { transform: none !important; }
      .floating-depth-card { display: none !important; }
      .kpi-tiles-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .chart-dual-panel { grid-template-columns: 1fr !important; }
    }

    @media (max-width: 768px) {
      /* Header & Nav */
      #main-header {
        padding: 12px 16px !important;
      }
      .desktop-nav { display: none !important; }
      .desktop-auth-actions { display: none !important; }
      .mobile-hamburger { display: inline-flex !important; }

      /* Section Spacing & Gutters: 24–36px vertical, 16px horizontal */
      .landing-section {
        padding-top: 32px !important;
        padding-bottom: 32px !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }
      .hero-section {
        padding-top: 36px !important;
        padding-bottom: 28px !important;
      }
      footer {
        padding: 32px 16px 24px 16px !important;
      }

      /* Mobile Headings & Typography Discipline */
      .hero-h1 {
        font-size: 28px !important;
        line-height: 1.2 !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 12px !important;
      }
      .section-h2, .closing-cta-h2 {
        font-size: 22px !important;
        line-height: 1.25 !important;
        letter-spacing: -0.01em !important;
        margin-bottom: 8px !important;
      }
      .card-h3, h3 {
        font-size: 16px !important;
        line-height: 1.3 !important;
      }
      .hero-sub, .section-sub {
        font-size: 14.5px !important;
        line-height: 1.55 !important;
      }

      /* Key Finance Numbers: 20–26px */
      .kpi-num {
        font-size: 22px !important;
        line-height: 1.2 !important;
      }
      .pricing-card-price {
        font-size: 26px !important;
      }

      /* Command Center & Finance Visuals */
      .command-center-outer-wrapper {
        margin-top: 24px !important;
      }
      .command-center-window {
        transform: none !important;
        border-radius: 10px !important;
      }
      .command-center-window > div:nth-child(2) {
        padding: 14px 12px !important;
      }
      .floating-depth-card {
        display: none !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      .chart-dual-panel {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }

      /* Money Flow Pipeline Strip */
      .money-flow-track {
        flex-direction: column !important;
        gap: 10px !important;
      }
      .money-flow-step {
        border-left: 3px solid var(--primary) !important;
        padding: 14px 12px !important;
      }

      /* Card Internal Spacing: 12–16px */
      .feature-card,
      .arch-card,
      .who-card,
      .pricing-card,
      .pos-benefit-card,
      .pos-preview-wrapper {
        padding: 16px 14px !important;
      }
      .wide-feature-card {
        padding: 18px 14px !important;
      }
      .wide-feature-card > div {
        flex-direction: column !important;
        gap: 16px !important;
      }
      .wide-feature-card > div > div {
        min-width: 100% !important;
      }

      /* Modal Sizing & Scrolling */
      .modal-dialog-inner {
        padding: 20px 16px !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .modal-grid-2col {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
      }
    }

    @media (max-width: 480px) {
      .landing-section {
        padding-top: 28px !important;
        padding-bottom: 28px !important;
      }
      .hero-h1 {
        font-size: 26px !important;
      }
      .hero-cta-btns {
        flex-direction: column !important;
        width: 100% !important;
      }
      .hero-cta-btns button {
        width: 100% !important;
      }
      .command-center-addr {
        font-size: 0.6875rem !important;
        padding: 2px 8px !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .kpi-tiles-grid > div:last-child {
        grid-column: 1 / -1 !important;
      }
      .pos-tab-btn {
        padding: 8px 10px !important;
        font-size: 0.75rem !important;
      }
      .pricing-card {
        padding: 20px 16px !important;
      }
    }

    @media (max-width: 360px) {
      /* Extra narrow viewports: 12px page gutters */
      #main-header,
      .landing-section,
      footer {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      .hero-h1 {
        font-size: 24px !important;
      }
      .section-h2, .closing-cta-h2 {
        font-size: 20px !important;
      }
      .kpi-tiles-grid {
        grid-template-columns: 1fr !important;
      }
      .kpi-tiles-grid > div:last-child {
        grid-column: auto !important;
      }
      .modal-dialog-inner {
        padding: 16px 12px !important;
      }
    }

    /* Accessibility: Reduced Motion Override */
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .command-center-glow { animation: none !important; }
      .chart-revenue-line { animation: none !important; stroke-dasharray: none !important; }
    }
  </style>
</head>
<body>

  <!-- PUBLIC CUSTOMER SURFACE -->
  <div id="customer-public-surface">
    ${headerHtml}
    <main>
      ${heroHtml}
      ${moneyFlowHtml}
      ${featuresHtml}
      ${architectureHtml}
      ${posHtml}
      ${whoItsForHtml}
      ${pricingHtml}
      ${faqHtml}
      ${closingCtaHtml}
    </main>
    ${footerHtml}
  </div>

  <!-- AUTH & DIALOG MODALS -->
  ${registerModalHtml}
  ${loginModalHtml}
  ${demoConfirmModalHtml}
  ${legalModalHtml}

  <!-- AUTHENTICATED BUSINESS WORKSPACE (LAUNCHED ON SIGN IN, REGISTER OR DEMO) -->
  <div id="business-workspace-container">
    <div class="workspace-topbar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: var(--primary);">
          <span>◆</span>
          <span id="ws-tenant-display">Apex Global Retail Ltd</span>
        </div>
        <span style="font-size: 0.75rem; background: rgba(189,150,82,0.18); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;" id="ws-branch-display">London Flagship</span>
        <span style="font-size: 0.75rem; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">LIVE PRODUCTION (Rule 21)</span>
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">Victoria Sterling</strong>
          (<span id="ws-role-display" style="color: var(--primary); font-weight: 600;">Business Owner</span>)
        </div>
        <button onclick="window.stokrovaCustomerApp.signOut()" style="background: rgba(248,81,73,0.1); color: #F87171; border: 1px solid #5C1D24; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">
          Exit Demo / Sign Out →
        </button>
      </div>
    </div>

    <div class="workspace-body">
      ${masterSidebarHtml}
      <main class="workspace-viewport">
        ${allWorkspaceViewsHtml}
      </main>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast-notification">
    <span style="color: var(--primary);">◆</span>
    <span id="toast-message">Notification</span>
  </div>

  <!-- Client Application Script -->
  <script>
    window.stokrovaCustomerApp = {
      cart: [],
      todayRevenue: 382000.00,

      // Modal management
      openRegisterModal(planId) {
        const modal = document.getElementById('modal-register');
        if (modal) {
          modal.style.display = 'flex';
          const firstInput = document.getElementById('reg-company-name');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
        if (planId) {
          const select = document.getElementById('reg-tier');
          if (select) select.value = planId;
        }
      },

      closeRegisterModal() {
        const modal = document.getElementById('modal-register');
        if (modal) modal.style.display = 'none';
      },

      openLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) {
          modal.style.display = 'flex';
          const firstInput = document.getElementById('login-slug');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
      },

      closeLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) modal.style.display = 'none';
      },

      confirmOpenDemo() {
        const modal = document.getElementById('modal-demo-confirm');
        if (modal) modal.style.display = 'flex';
      },

      closeDemoConfirmModal() {
        const modal = document.getElementById('modal-demo-confirm');
        if (modal) modal.style.display = 'none';
      },

      proceedToDemo() {
        this.closeDemoConfirmModal();
        this.launchWorkspace({
          tenantName: 'Apex Global Retail Ltd',
          branchName: 'London Flagship',
          userName: 'Victoria Sterling',
          userRole: 'Business Owner (Administrator)'
        });
      },

      openLegalModal(topic) {
        const modal = document.getElementById('modal-legal');
        if (modal) modal.style.display = 'flex';
      },

      closeLegalModal() {
        const modal = document.getElementById('modal-legal');
        if (modal) modal.style.display = 'none';
      },

      toggleMobileMenu() {
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer) {
          drawer.style.display = (drawer.style.display === 'flex') ? 'none' : 'flex';
        }
      },

      switchPosTab(tab) {
        const scanTab = document.getElementById('tab-content-scanner');
        const rcptTab = document.getElementById('tab-content-receipt');
        const btnScan = document.getElementById('btn-tab-pos-scanner');
        const btnRcpt = document.getElementById('btn-tab-pos-receipt');

        if (tab === 'scanner') {
          if (scanTab) scanTab.style.display = 'block';
          if (rcptTab) rcptTab.style.display = 'none';
          if (btnScan) {
            btnScan.style.background = 'var(--primary)';
            btnScan.style.color = '#0E1116';
            btnScan.style.fontWeight = '700';
          }
          if (btnRcpt) {
            btnRcpt.style.background = 'transparent';
            btnRcpt.style.color = 'var(--text-secondary)';
            btnRcpt.style.fontWeight = '600';
          }
        } else {
          if (scanTab) scanTab.style.display = 'none';
          if (rcptTab) rcptTab.style.display = 'block';
          if (btnScan) {
            btnScan.style.background = 'transparent';
            btnScan.style.color = 'var(--text-secondary)';
            btnScan.style.fontWeight = '600';
          }
          if (btnRcpt) {
            btnRcpt.style.background = 'var(--primary)';
            btnRcpt.style.color = '#0E1116';
            btnRcpt.style.fontWeight = '700';
          }
        }
      },

      handleRegisterSubmit(e) {
        e.preventDefault();
        const companyName = document.getElementById('reg-company-name').value.trim();
        const slug = document.getElementById('reg-slug').value.trim().toLowerCase();
        const currency = document.getElementById('reg-currency').value;
        const ownerName = document.getElementById('reg-owner-name').value.trim();
        const ownerEmail = document.getElementById('reg-owner-email').value.trim();
        const tier = document.getElementById('reg-tier').value;
        const branchName = document.getElementById('reg-branch-name').value.trim() || 'Central Branch';

        try {
          const stored = JSON.parse(localStorage.getItem('stokrova_tenants') || '{}');
          stored[slug] = {
            companyName,
            slug,
            currency,
            ownerName,
            ownerEmail,
            tier,
            branchName,
            registeredAt: new Date().toISOString()
          };
          localStorage.setItem('stokrova_tenants', JSON.stringify(stored));
        } catch (_) {}

        this.closeRegisterModal();
        this.showToast(\`✓ Organization '\${companyName}' provisioned! Launching workspace...\`);

        setTimeout(() => {
          this.launchWorkspace({
            tenantName: companyName,
            branchName: branchName,
            userName: ownerName,
            userRole: 'Business Owner (Administrator)',
          });
        }, 500);
      },

      handleLoginSubmit(e) {
        e.preventDefault();
        const slug = document.getElementById('login-slug').value.trim().toLowerCase();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;

        if (!slug || !email || !password) {
          this.showToast('Please enter your workspace slug, work email, and password.');
          return;
        }

        this.closeLoginModal();

        let tenantName = 'Apex Global Retail Ltd';
        let branch = 'London Flagship';
        let name = 'Victoria Sterling';
        let role = 'Business Owner (Administrator)';

        if (email.includes('manager') || email.includes('david')) {
          name = 'David O\\'Connor';
          role = 'Store Operations Manager';
        } else if (email.includes('cashier') || email.includes('emma')) {
          name = 'Emma Watson';
          role = 'Front Counter Cashier';
        } else if (email.includes('picker') || email.includes('samuel')) {
          name = 'Samuel Adebayo';
          role = 'Warehouse Picker';
        }

        try {
          const stored = JSON.parse(localStorage.getItem('stokrova_tenants') || '{}');
          if (stored[slug]) {
            const org = stored[slug];
            tenantName = org.companyName;
            branch = org.branchName || 'Main Branch';
            if (email === org.ownerEmail.toLowerCase()) {
              name = org.ownerName;
              role = 'Business Owner (Administrator)';
            }
          }
        } catch (_) {}

        this.showToast(\`✓ Authenticated as \${name} (\${role})\`);
        this.launchWorkspace({
          tenantName: tenantName,
          branchName: branch,
          userName: name,
          userRole: role,
        });
      },

      addItemToCart(sku, name, price) {
        const existing = this.cart.find(i => i.sku === sku);
        if (existing) {
          existing.qty += 1;
        } else {
          this.cart.push({ sku, name, price, qty: 1 });
        }
        this.renderCart();
        this.showToast(\`Added 1x \${name} to register ticket.\`);
      },

      addBarcodeToCart() {
        const input = document.getElementById('pos-barcode-input');
        if (!input) return;
        const code = input.value.trim().toUpperCase();
        input.value = '';
        if (code.includes('LAPTOP') || code === '5011000000018') {
          this.addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00);
        } else if (code.includes('PHONE') || code === '5011000000025') {
          this.addItemToCart('SMARTPHONE-ULTRA-5G', 'Apex Ultra 5G Phone', 999.00);
        } else {
          this.addItemToCart('SHIRT-OXFORD-BLU-M', 'Oxford Cotton Shirt', 65.00);
        }
      },

      renderCart() {
        const container = document.getElementById('pos-cart-items');
        const totalEl = document.getElementById('pos-cart-total');
        const checkoutBtn = document.getElementById('pos-checkout-btn');
        if (!container || !totalEl || !checkoutBtn) return;

        if (this.cart.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px 0;">Till ticket is empty. Scan an item to ring up sale.</div>';
          totalEl.textContent = '$0.00';
          checkoutBtn.disabled = true;
          checkoutBtn.style.background = 'var(--border)';
          checkoutBtn.style.color = 'var(--text-muted)';
          checkoutBtn.style.cursor = 'not-allowed';
          return;
        }

        let total = 0;
        let html = '';
        this.cart.forEach((item, idx) => {
          const lineTotal = item.price * item.qty;
          total += lineTotal;
          html += \`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
              <div>
                <div style="font-weight: 600; color: var(--text);">\${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--stokrova-font-mono);">\${item.sku} × \${item.qty}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 700; font-family: var(--stokrova-font-mono); color: var(--text);">$\${lineTotal.toFixed(2)}</span>
                <button onclick="window.stokrovaCustomerApp.removeItemFromCart(\${idx})" style="background: transparent; border: none; color: #F85149; cursor: pointer; font-size: 1rem;">×</button>
              </div>
            </div>
          \`;
        });

        container.innerHTML = html;
        totalEl.textContent = '$' + total.toFixed(2);
        checkoutBtn.disabled = false;
        checkoutBtn.style.background = 'var(--primary)';
        checkoutBtn.style.color = '#0E1116';
        checkoutBtn.style.cursor = 'pointer';
      },

      removeItemFromCart(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
      },

      completeSale() {
        if (this.cart.length === 0) return;
        let total = 0;
        this.cart.forEach(i => total += (i.price * i.qty));
        const saleRef = 'POS-SALE-' + Math.floor(100000 + Math.random() * 900000);
        const journalRef = 'JRNL-' + Date.now().toString().slice(-6);

        // Update Today's Net Revenue
        this.todayRevenue += total;
        const revEl = document.querySelector('#ws-view-dashboard .stokrova-net-revenue');
        if (revEl) {
          revEl.textContent = '$' + this.todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Post balanced transaction to general ledger
        const ledgerContainer = document.getElementById('ws-ledger-entries');
        if (ledgerContainer) {
          const entryDiv = document.createElement('div');
          entryDiv.className = 'ledger-row';
          entryDiv.style.borderBottom = '1px solid var(--border)';
          entryDiv.style.paddingBottom = '12px';
          entryDiv.innerHTML = \`
            <div style="color: #4ADE80; margin-bottom: 4px;">✓ \${journalRef} | Receipt \${saleRef}</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">DR 1010 Cash at Bank: $\${total.toFixed(2)}</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">CR 4010 Retail Revenue: $\${total.toFixed(2)}</div>
            <div style="color: var(--text-muted); font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced Double-Entry)</div>
          \`;
          ledgerContainer.insertBefore(entryDiv, ledgerContainer.firstChild);
        }

        this.cart = [];
        this.renderCart();
        this.showToast(\`✓ Sale \${saleRef} completed! Cash collected: $\${total.toFixed(2)}. Ledger balanced.\`);
      },

      launchWorkspace({ tenantName, branchName, userName, userRole }) {
        document.getElementById('customer-public-surface').style.display = 'none';
        const ws = document.getElementById('business-workspace-container');
        ws.style.display = 'flex';

        document.getElementById('ws-tenant-display').textContent = tenantName;
        document.getElementById('ws-branch-display').textContent = branchName;
        document.getElementById('ws-user-display').textContent = userName;
        document.getElementById('ws-role-display').textContent = userRole;

        const isCashier = userRole.includes('Cashier');
        const isPicker = userRole.includes('Picker');
        const isManager = userRole.includes('Manager');

        const allNavItems = document.querySelectorAll('.workspace-nav-item');
        allNavItems.forEach(item => {
          const vId = item.getAttribute('data-view-id');
          if (isCashier) {
            item.style.display = (vId === 'pos' || vId === 'catalog' || vId === 'orders') ? 'flex' : 'none';
          } else if (isPicker) {
            item.style.display = (vId === 'inventory' || vId === 'picking' || vId === 'locations' || vId === 'ledger') ? 'flex' : 'none';
          } else if (isManager) {
            item.style.display = (vId === 'org' || vId === 'compliance') ? 'none' : 'flex';
          } else {
            // Business Owner has FULL access across all 28 views!
            item.style.display = 'flex';
          }
        });

        if (isCashier) {
          this.showWsView('pos');
        } else if (isPicker) {
          this.showWsView('picking');
        } else {
          this.showWsView('dashboard');
        }
      },

      signOut() {
        document.getElementById('business-workspace-container').style.display = 'none';
        document.getElementById('customer-public-surface').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast('You have exited the business workspace.');
      },

      showWsView(viewId) {
        const allPanels = document.querySelectorAll('.ws-view-content');
        allPanels.forEach(p => p.style.display = 'none');
        const target = document.getElementById('ws-view-' + viewId);
        if (target) target.style.display = 'block';

        const allNavs = document.querySelectorAll('.workspace-nav-item');
        allNavs.forEach(n => {
          n.classList.remove('active');
          n.style.background = 'transparent';
          n.style.color = 'var(--text-secondary)';
          n.style.fontWeight = '500';
          n.style.borderLeft = 'none';
        });
        const activeNav = document.getElementById('ws-nav-' + viewId);
        if (activeNav) {
          activeNav.classList.add('active');
          activeNav.style.background = 'rgba(189,150,82,0.15)';
          activeNav.style.color = '#E0CB9F';
          activeNav.style.fontWeight = '600';
          activeNav.style.borderLeft = '3px solid #BD9652';
        }

        const viewport = document.querySelector('.workspace-viewport');
        if (viewport) viewport.scrollTop = 0;
      },

      showToast(msg) {
        const toast = document.getElementById('toast-notification');
        const toastMsg = document.getElementById('toast-message');
        if (toast && toastMsg) {
          toastMsg.textContent = msg;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      },

      // Corporate Rebranding helpers
      selectBrandAccent(hex) {
        const picker = document.getElementById('rebrand-color-picker');
        const textInput = document.getElementById('rebrand-hex-input');
        if (picker) picker.value = hex;
        if (textInput) textInput.value = hex;
        this.updateBrandPreview();
      },

      updateBrandPreview() {
        const hex = document.getElementById('rebrand-hex-input')?.value || '#BD9652';
        const name = document.getElementById('rebrand-company-name')?.value || 'Apex Global Retail Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

        const headEl = document.getElementById('preview-brand-header');
        if (headEl) {
          headEl.textContent = logo;
          headEl.style.color = hex;
        }
        const badgeEl = document.getElementById('preview-branch-badge');
        if (badgeEl) badgeEl.style.color = hex;
        const posBtn = document.getElementById('preview-pos-btn');
        if (posBtn) posBtn.style.background = hex;
        const scanBox = document.getElementById('preview-scanner-box');
        if (scanBox) scanBox.style.borderColor = hex;
        const scanTxt = document.getElementById('preview-scanner-text');
        if (scanTxt) scanTxt.style.color = hex;
        const pickBtn = document.getElementById('preview-pick-btn');
        if (pickBtn) pickBtn.style.background = hex;
        const rcptName = document.getElementById('preview-receipt-name');
        if (rcptName) rcptName.textContent = name;
        const rcptSlogan = document.getElementById('preview-receipt-slogan');
        if (rcptSlogan) rcptSlogan.textContent = slogan;
        const saveBtn = document.getElementById('btn-save-rebranding');
        if (saveBtn) saveBtn.style.background = hex;
      },

      saveCompanyRebranding() {
        const hex = document.getElementById('rebrand-hex-input')?.value || '#BD9652';
        const name = document.getElementById('rebrand-company-name')?.value || 'Apex Global Retail Ltd';
        const slogan = document.getElementById('rebrand-receipt-slogan')?.value || 'Luxury Lifestyle & Electronics';
        const logo = document.getElementById('rebrand-logo-text')?.value || '◆ APEX';

        document.documentElement.style.setProperty('--primary', hex);
        document.documentElement.style.setProperty('--primary-hover', hex);
        
        const tenantDisplay = document.getElementById('ws-tenant-display');
        if (tenantDisplay) tenantDisplay.textContent = name;

        try {
          localStorage.setItem('stokrova_tenant_brand', JSON.stringify({ hex, name, slogan, logo }));
        } catch (_) {}

        this.showToast(\`✓ Corporate rebrand saved! Brand accent (\${hex}) & company logo updated across all staff terminals, POS registers, and mobile devices.\`);
      },

      loadBrandSettings() {
        try {
          const raw = localStorage.getItem('stokrova_tenant_brand');
          if (!raw) return;
          const { hex, name, slogan, logo } = JSON.parse(raw);
          if (hex) {
            document.documentElement.style.setProperty('--primary', hex);
            document.documentElement.style.setProperty('--primary-hover', hex);
            const picker = document.getElementById('rebrand-color-picker');
            const textInput = document.getElementById('rebrand-hex-input');
            if (picker) picker.value = hex;
            if (textInput) textInput.value = hex;
          }
          if (name) {
            const tenantDisplay = document.getElementById('ws-tenant-display');
            if (tenantDisplay) tenantDisplay.textContent = name;
            const compInput = document.getElementById('rebrand-company-name');
            if (compInput) compInput.value = name;
          }
          if (slogan) {
            const slogInput = document.getElementById('rebrand-receipt-slogan');
            if (slogInput) slogInput.value = slogan;
          }
          if (logo) {
            const logoInput = document.getElementById('rebrand-logo-text');
            if (logoInput) logoInput.value = logo;
          }
          this.updateBrandPreview();
        } catch (_) {}
      },

      // Staff Roster helpers
      openStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'flex';
      },

      closeStaffInviteModal() {
        const modal = document.getElementById('modal-invite-staff');
        if (modal) modal.style.display = 'none';
      },

      handleStaffInviteSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('invite-staff-name').value.trim();
        const email = document.getElementById('invite-staff-email').value.trim();
        const role = document.getElementById('invite-staff-role').value;
        const branch = document.getElementById('invite-staff-branch').value;
        const pin = document.getElementById('invite-staff-pin').value.trim();

        if (!name || !email) {
          this.showToast('Please enter both staff member name and work email.');
          return;
        }

        const tableBody = document.getElementById('staff-table-body');
        if (tableBody) {
          const row = document.createElement('tr');
          row.style.borderBottom = '1px solid var(--border)';
          row.innerHTML = \`
            <td style="padding: 12px 16px; font-weight: 600;">
              <div>\${name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">\${email}</div>
            </td>
            <td style="padding: 12px 16px;">
              <span style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">\${role}</span>
            </td>
            <td style="padding: 12px 16px; color: var(--text-secondary); font-size: 0.8125rem;">\${branch}</td>
            <td style="padding: 12px 16px; text-align: center;">
              <span style="background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">ACTIVE</span>
            </td>
            <td style="padding: 12px 16px; text-align: right;">
              <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">PIN: \${pin}</span>
            </td>
          \`;
          tableBody.appendChild(row);
        }

        const countBadge = document.getElementById('staff-count-badge');
        if (countBadge && tableBody) {
          countBadge.textContent = \`\${tableBody.querySelectorAll('tr').length} Staff Members Active\`;
        }

        this.closeStaffInviteModal();
        this.showToast(\`✓ Staff member '\${name}' invited and added to workspace roster!\`);
      }
    };

    // Attach globals for inline events
    window.selectBrandAccent = (hex) => window.stokrovaCustomerApp.selectBrandAccent(hex);
    window.updateBrandPreview = () => window.stokrovaCustomerApp.updateBrandPreview();
    window.saveCompanyRebranding = () => window.stokrovaCustomerApp.saveCompanyRebranding();
    window.openStaffInviteModal = () => window.stokrovaCustomerApp.openStaffInviteModal();
    window.closeStaffInviteModal = () => window.stokrovaCustomerApp.closeStaffInviteModal();
    window.handleStaffInviteSubmit = (e) => window.stokrovaCustomerApp.handleStaffInviteSubmit(e);

    // Initialize brand settings
    window.stokrovaCustomerApp.loadBrandSettings();

    // Sticky Header Scroll Listener
    window.addEventListener('scroll', () => {
      const header = document.getElementById('main-header');
      if (header) {
        if (window.scrollY > 24) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    }, { passive: true });

    // Keyboard Escape Key listener for accessibility
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.stokrovaCustomerApp.closeRegisterModal();
        window.stokrovaCustomerApp.closeLoginModal();
        window.stokrovaCustomerApp.closeDemoConfirmModal();
        window.stokrovaCustomerApp.closeLegalModal();
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer) drawer.style.display = 'none';
      }
    });
  </script>
</body>
</html>
`;

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeWebsiteHtml.trim(), 'utf-8');
console.log('✅ Generated STOKROVA Customer Website & Complete Business Portal index.html at', path.join(distDir, 'index.html'));
