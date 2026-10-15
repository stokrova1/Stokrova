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
const tourOverlayHtml = landingView.renderTourOverlayHtml();

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

    /* Cosmic Motions & Multi-Step Stepper Enhancements */
    .signup-stepper-card {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .industry-choice-label:hover {
      border-color: var(--primary) !important;
      background: rgba(189,150,82,0.08) !important;
    }
    .signup-plan-card:hover {
      border-color: var(--primary) !important;
      transform: translateY(-2px);
    }
    @keyframes spinPulse {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .btn-spinner {
      display: inline-block;
      animation: spinPulse 0.8s linear infinite;
    }

    /* World-Class Guided Tour Overlay Styles */
    #stokrova-tour-spotlight {
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #stokrova-tour-card {
      animation: slideUpTour 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUpTour {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

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
  ${tourOverlayHtml}

  <!-- AUTHENTICATED BUSINESS WORKSPACE (LAUNCHED ON SIGN IN, REGISTER OR DEMO) -->
  <div id="business-workspace-container">
    <div class="workspace-topbar">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: var(--primary);">
          <span>◆</span>
          <span id="ws-tenant-display">Apex Global Retail Ltd</span>
        </div>
        <span style="font-size: 0.75rem; background: rgba(189,150,82,0.18); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;" id="ws-branch-display">London Flagship</span>
        <span style="font-size: 0.75rem; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">LIVE PRODUCTION</span>
      </div>

      <div style="display: flex; align-items: center; gap: 14px;">
        <button onclick="window.stokrovaCustomerApp.startTour()" style="background: rgba(189,150,82,0.18); color: var(--primary); border: 1px solid var(--primary); padding: 5px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
          <span>🌍</span> <span>Take Tour ✦</span>
        </button>
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

      // Multi-Step Registration State & Cosmic Engine
      currentSignupStep: 1,
      cosmicAnimId: null,
      cosmicParticles: [],
      pendingTenant: null,
      verifiedStaffData: null,

      openRegisterModal(planId) {
        const modal = document.getElementById('modal-register');
        if (modal) {
          modal.style.display = 'flex';
          this.setSignupStep(1);
          this.startCosmicParticles();
          const firstInput = document.getElementById('reg-company-name');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
        if (planId) {
          this.selectSignupPlan(planId);
        }
      },

      closeRegisterModal() {
        const modal = document.getElementById('modal-register');
        if (modal) modal.style.display = 'none';
        this.stopCosmicParticles();
      },

      setSignupStep(step) {
        this.currentSignupStep = step;
        const widths = ['25%', '50%', '75%', '100%', '100%'];
        
        for (let i = 1; i <= 5; i++) {
          const pane = document.getElementById('reg-step-' + i);
          if (pane) pane.style.display = (i === step) ? 'block' : 'none';
        }

        const loader = document.getElementById('signup-step-loader');
        if (loader) loader.style.display = 'none';

        const stepperHeader = document.getElementById('signup-stepper-header');
        if (stepperHeader) {
          stepperHeader.style.display = (step === 5) ? 'none' : 'block';
        }

        const numEl = document.getElementById('signup-current-step-num');
        const pctEl = document.getElementById('signup-step-percent');
        const fillEl = document.getElementById('signup-progress-fill');

        if (numEl) numEl.textContent = String(Math.min(step, 4));
        if (pctEl && widths[step - 1]) pctEl.textContent = widths[step - 1];
        if (fillEl && widths[step - 1]) fillEl.style.width = widths[step - 1];
      },

      nextSignupStep(current) {
        if (current === 1) {
          const comp = document.getElementById('reg-company-name');
          const slug = document.getElementById('reg-slug');
          const compVal = comp ? comp.value.trim() : '';
          const slugVal = slug ? slug.value.trim() : '';
          if (!compVal || !slugVal) {
            this.showToast('Please enter your business legal name and workspace slug.');
            return;
          }
        } else if (current === 2) {
          const branch = document.getElementById('reg-branch-name');
          const branchVal = branch ? branch.value.trim() : '';
          if (!branchVal) {
            this.showToast('Please enter your flagship store or warehouse branch name.');
            return;
          }
        } else if (current === 3) {
          const ownerName = document.getElementById('reg-owner-name');
          const ownerEmail = document.getElementById('reg-owner-email');
          const pass = document.getElementById('reg-password');
          const nameVal = ownerName ? ownerName.value.trim() : '';
          const emailVal = ownerEmail ? ownerEmail.value.trim() : '';
          const passVal = pass ? pass.value : '';
          if (!nameVal || !emailVal || !passVal) {
            this.showToast('Please enter owner full name, work email, and master password.');
            return;
          }
        }

        // Dedicated Page Loading State: hide current step & show loader
        const currentPane = document.getElementById('reg-step-' + current);
        const loader = document.getElementById('signup-step-loader');
        const header = document.getElementById('signup-stepper-header');
        const loaderTitle = document.getElementById('signup-loader-title');

        if (currentPane) currentPane.style.display = 'none';
        if (header) header.style.display = 'none';
        if (loader) loader.style.display = 'block';
        if (loaderTitle) loaderTitle.textContent = 'Calibrating Step ' + (current + 1) + '...';

        setTimeout(() => {
          this.setSignupStep(current + 1);
        }, 320);
      },

      prevSignupStep(current) {
        if (current > 1) {
          this.setSignupStep(current - 1);
        }
      },

      autoSuggestSlug(val) {
        const slugInput = document.getElementById('reg-slug');
        if (slugInput && !slugInput.dataset.manuallyEdited) {
          slugInput.value = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
      },

      selectSignupPlan(tier) {
        const select = document.getElementById('reg-tier');
        if (select) select.value = tier;
        ['starter', 'growth', 'enterprise'].forEach(t => {
          const card = document.getElementById('plan-card-' + t);
          if (card) {
            if (t === tier) {
              card.style.borderColor = 'var(--primary)';
              card.style.borderWidth = '2px';
            } else {
              card.style.borderColor = 'var(--border)';
              card.style.borderWidth = '1px';
            }
          }
        });
      },

      startCosmicParticles() {
        const canvas = document.getElementById('signup-cosmic-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth || window.innerWidth;
        canvas.height = canvas.offsetHeight || window.innerHeight;

        this.cosmicParticles = [];
        const count = 45;
        for (let i = 0; i < count; i++) {
          this.cosmicParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1,
            color: (Math.random() > 0.4) ? '#BD9652' : '#E0CB9F',
            alpha: Math.random() * 0.6 + 0.2
          });
        }

        const render = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw connections
          for (let i = 0; i < this.cosmicParticles.length; i++) {
            for (let j = i + 1; j < this.cosmicParticles.length; j++) {
              const dx = this.cosmicParticles[i].x - this.cosmicParticles[j].x;
              const dy = this.cosmicParticles[i].y - this.cosmicParticles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 80) {
                ctx.strokeStyle = 'rgba(189, 150, 82, ' + (0.15 * (1 - dist / 80)) + ')';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(this.cosmicParticles[i].x, this.cosmicParticles[i].y);
                ctx.lineTo(this.cosmicParticles[j].x, this.cosmicParticles[j].y);
                ctx.stroke();
              }
            }
          }

          // Draw particles
          this.cosmicParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;

          this.cosmicAnimId = requestAnimationFrame(render);
        };

        if (this.cosmicAnimId) cancelAnimationFrame(this.cosmicAnimId);
        this.cosmicAnimId = requestAnimationFrame(render);
      },

      stopCosmicParticles() {
        if (this.cosmicAnimId) {
          cancelAnimationFrame(this.cosmicAnimId);
          this.cosmicAnimId = null;
        }
      },

      handleRegisterSubmit(e) {
        e.preventDefault();
        const companyName = document.getElementById('reg-company-name')?.value.trim() || 'Apex Global Retail Ltd';
        const slug = document.getElementById('reg-slug')?.value.trim().toLowerCase() || 'apex';
        const currency = document.getElementById('reg-currency')?.value || 'USD';
        const branchName = document.getElementById('reg-branch-name')?.value.trim() || 'London Flagship';
        const ownerName = document.getElementById('reg-owner-name')?.value.trim() || 'Victoria Sterling';
        const ownerEmail = document.getElementById('reg-owner-email')?.value.trim() || 'victoria@apex.com';
        const tier = document.getElementById('reg-tier')?.value || 'growth';

        const tenantData = {
          companyName,
          slug,
          currency,
          branchName,
          ownerName,
          ownerEmail,
          tier,
          registeredAt: new Date().toISOString()
        };

        this.pendingTenant = tenantData;

        // Persist locally
        try {
          const stored = JSON.parse(localStorage.getItem('stokrova_tenants') || '{}');
          stored[slug] = tenantData;
          localStorage.setItem('stokrova_tenants', JSON.stringify(stored));
        } catch (_) {}

        // Async notify backend (non-blocking for resilient UX)
        try {
          fetch('/api/tenants/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: companyName,
              slug: slug,
              owner_email: ownerEmail,
              owner_full_name: ownerName,
              default_currency: currency,
              initial_branch_name: branchName,
              plan_tier: tier,
            })
          }).catch(() => {});
        } catch (_) {}

        // Populate Customization Screen Data
        const compEl = document.getElementById('prov-dyn-company');
        const brnEl = document.getElementById('prov-dyn-branch');
        const ownEl = document.getElementById('prov-dyn-owner');
        const slugEl = document.getElementById('prov-dyn-slug');
        const welEl = document.getElementById('prov-dyn-welcome');

        if (compEl) compEl.textContent = companyName;
        if (brnEl) brnEl.textContent = branchName;
        if (ownEl) ownEl.textContent = ownerName;
        if (slugEl) slugEl.textContent = slug;
        if (welEl) welEl.textContent = ownerName;

        // Advance to Step 5
        this.setSignupStep(5);

        // Run dynamic progress simulation
        this.runCustomizationSimulation();
      },

      runCustomizationSimulation() {
        const pctEl = document.getElementById('prov-percent');
        const fillEl = document.getElementById('prov-progress-fill');
        const lblEl = document.getElementById('prov-stage-label');
        const actionsEl = document.getElementById('prov-completion-actions');

        let pct = 0;
        const milestones = [
          { at: 15, id: 'm-step-1', label: 'Tenant database cryptographic isolation established...' },
          { at: 35, id: 'm-step-2', label: 'Configuring company chart of accounts...' },
          { at: 55, id: 'm-step-3', label: 'Setting up flagship till laser buffers...' },
          { at: 75, id: 'm-step-4', label: 'Authorizing double-entry ledger truth...' },
          { at: 90, id: 'm-step-5', label: 'Issuing cryptographic master key...' },
          { at: 100, id: 'm-step-6', label: 'Workspace online and live!' },
        ];

        const timer = setInterval(() => {
          pct += 5;
          if (pct > 100) pct = 100;

          if (pctEl) pctEl.textContent = pct + '%';
          if (fillEl) fillEl.style.width = pct + '%';

          milestones.forEach(m => {
            if (pct >= m.at) {
              const el = document.getElementById(m.id);
              if (el) {
                el.style.color = '#4ADE80';
                const icon = el.querySelector('.m-icon');
                if (icon) icon.textContent = '✓';
              }
              if (lblEl) lblEl.textContent = m.label;
            }
          });

          if (pct >= 100) {
            clearInterval(timer);
            if (actionsEl) actionsEl.style.display = 'block';
            this.showToast('✓ Workspace customized & ready!');
          }
        }, 45);
      },

      launchWorkspaceWithTour() {
        this.closeRegisterModal();
        const t = this.pendingTenant || {
          companyName: 'Apex Global Retail Ltd',
          branchName: 'London Flagship',
          ownerName: 'Victoria Sterling',
        };
        this.launchWorkspace({
          tenantName: t.companyName,
          branchName: t.branchName,
          userName: t.ownerName,
          userRole: 'Business Owner (Administrator)'
        });
        setTimeout(() => {
          this.startTour();
        }, 350);
      },

      launchWorkspaceDirect() {
        this.closeRegisterModal();
        const t = this.pendingTenant || {
          companyName: 'Apex Global Retail Ltd',
          branchName: 'London Flagship',
          ownerName: 'Victoria Sterling',
        };
        this.launchWorkspace({
          tenantName: t.companyName,
          branchName: t.branchName,
          userName: t.ownerName,
          userRole: 'Business Owner (Administrator)'
        });
      },

      // World-Class Interactive Guided Tour Engine
      currentTourStep: 1,
      tourData: [
        {
          viewId: 'dashboard',
          targetSelector: '.workspace-topbar',
          title: 'Universal Operations Command Bar',
          desc: 'Control every high-street branch, pop-up store, and regional distribution warehouse from a single pane of glass. Your data is protected by enterprise cryptographic tenant isolation—zero cross-tenant data bleed.',
          snippet: '🌍 Multi-Branch Switcher Active • Status: Live Production (Tenant Isolation Active ✓)'
        },
        {
          viewId: 'dashboard',
          targetSelector: '.kpi-tiles-grid',
          title: 'Executive Telemetry & Financial Pulse',
          desc: 'Monitor GMV, real-time net revenue, and gross margins across all stores. Because STOKROVA uses pure integer minor currency units, every figure is penny-perfect with zero floating-point rounding errors.',
          snippet: '📊 12-Month Net Revenue: $382,000.00 | Gross Margin: 38.50% | Till Variance: $0.00'
        },
        {
          viewId: 'pos',
          targetSelector: '.pos-preview-wrapper',
          title: 'Offline-Tolerant Point of Sale & Laser Buffer',
          desc: 'Ring up sales at counter speed. Hardware laser scanners are detected automatically (<50ms). If retail internet goes down, sales persist in encrypted local SQLite outbox queues and sync automatically upon reconnection.',
          snippet: '<button onclick="window.stokrovaCustomerApp.simulateTourScan()" style="background:#BD9652; color:#0E1116; border:none; padding:6px 14px; border-radius:4px; font-weight:700; font-size:0.75rem; cursor:pointer;">⚡ Test Laser Barcode Scan (5011000000018)</button>'
        },
        {
          viewId: 'inventory',
          targetSelector: '.workspace-viewport',
          title: 'Authoritative FEFO Lots & In-Transit Transfers',
          desc: 'Eliminate phantom stock. When goods move between branches, they sit in an audited IN-TRANSIT GL custody account until verified by destination receiving. Perishables enforce First-Expired, First-Out picking.',
          snippet: '📦 Chain of Custody: Central DC Dispatch → In-Transit Custody → Blind Receiving Verified'
        },
        {
          viewId: 'ledger',
          targetSelector: '.workspace-viewport',
          title: 'Immutable Double-Entry Ledger & Till Audits',
          desc: 'Pure accounting truth. Every till sale, inventory movement, and customer refund automatically writes balanced double-entry journals (Debits = Credits). Blind session variance counts ensure drawer integrity.',
          snippet: '⚖️ Pure Double-Entry: DR 1010 Bank Cash $86.40 = CR 4010 Retail Sales $86.40 (Delta: $0.00)'
        }
      ],

      startTour() {
        const overlay = document.getElementById('stokrova-tour-overlay');
        if (!overlay) return;
        overlay.style.display = 'block';
        this.currentTourStep = 1;
        this.renderTourStep(1);
        this.showToast('🌍 Welcome to the STOKROVA guided dashboard walkthrough!');
      },

      renderTourStep(stepNum) {
        this.currentTourStep = stepNum;
        const data = this.tourData[stepNum - 1];
        if (!data) return;

        // Switch to the relevant workspace view
        if (data.viewId) {
          this.showWsView(data.viewId);
        }

        const numEl = document.getElementById('tour-step-num');
        const titleEl = document.getElementById('tour-card-title');
        const descEl = document.getElementById('tour-card-desc');
        const snippetEl = document.getElementById('tour-action-snippet');
        const btnPrev = document.getElementById('tour-btn-prev');
        const btnNext = document.getElementById('tour-btn-next');
        const spotlight = document.getElementById('stokrova-tour-spotlight');

        if (numEl) numEl.textContent = String(stepNum);
        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (snippetEl) snippetEl.innerHTML = data.snippet;

        if (btnPrev) {
          btnPrev.style.display = (stepNum === 1) ? 'none' : 'inline-block';
        }

        if (btnNext) {
          if (stepNum === this.tourData.length) {
            btnNext.textContent = 'Finish Tour & Start Operating ✓';
            btnNext.style.background = '#4ADE80';
            btnNext.style.color = '#0E1116';
          } else {
            btnNext.textContent = 'Next Feature →';
            btnNext.style.background = 'var(--primary)';
            btnNext.style.color = '#0E1116';
          }
        }

        // Position Spotlight
        setTimeout(() => {
          if (spotlight && data.targetSelector) {
            const target = document.querySelector(data.targetSelector);
            if (target) {
              const rect = target.getBoundingClientRect();
              spotlight.style.opacity = '1';
              spotlight.style.top = Math.max(0, rect.top - 6) + 'px';
              spotlight.style.left = Math.max(0, rect.left - 6) + 'px';
              spotlight.style.width = (rect.width + 12) + 'px';
              spotlight.style.height = (rect.height + 12) + 'px';
            } else {
              spotlight.style.opacity = '0';
            }
          }
        }, 80);
      },

      nextTourStep() {
        if (this.currentTourStep < this.tourData.length) {
          this.renderTourStep(this.currentTourStep + 1);
        } else {
          this.endTour(true);
        }
      },

      prevTourStep() {
        if (this.currentTourStep > 1) {
          this.renderTourStep(this.currentTourStep - 1);
        }
      },

      endTour(completed = false) {
        const overlay = document.getElementById('stokrova-tour-overlay');
        if (overlay) overlay.style.display = 'none';
        const spotlight = document.getElementById('stokrova-tour-spotlight');
        if (spotlight) spotlight.style.opacity = '0';

        this.showWsView('dashboard');
        if (completed) {
          this.showToast('✦ Tour complete! You have full command of your business dashboard.');
        } else {
          this.showToast('Tour dismissed. Click "Take Tour ✦" anytime to reopen.');
        }
      },

      simulateTourScan() {
        this.addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00);
        this.showToast('⚡ Laser Scanner Triggered: Added 1x Apex Pro 16 Laptop (<42ms hardware buffer)!');
        const snippetEl = document.getElementById('tour-action-snippet');
        if (snippetEl) {
          snippetEl.innerHTML = '<span style="color:#4ADE80; font-weight:700;">✓ Scanner Buffer Fired:</span> 1x LAPTOP-PRO-16 added to cart. DR 1010 Bank = CR 4010 Sales balanced!';
        }
      },

      openLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) {
          modal.style.display = 'flex';
          const step1 = document.getElementById('login-step-credentials');
          const step2 = document.getElementById('login-step-verification');
          if (step1) step1.style.display = 'block';
          if (step2) step2.style.display = 'none';
          const firstInput = document.getElementById('login-email');
          if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
      },

      closeLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) modal.style.display = 'none';
      },

      backToLoginCredentials() {
        const step1 = document.getElementById('login-step-credentials');
        const step2 = document.getElementById('login-step-verification');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        const firstInput = document.getElementById('login-email');
        if (firstInput) setTimeout(() => firstInput.focus(), 50);
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
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');
        const slugEl = document.getElementById('login-slug');

        const email = emailEl ? emailEl.value.trim().toLowerCase() : '';
        const password = passEl ? passEl.value : '';
        let slug = slugEl ? slugEl.value.trim().toLowerCase() : '';

        if (!email || !password) {
          this.showToast('Please enter your staff work email and password.');
          return;
        }

        // Switch to Step 2: Searching & Verifying
        const step1 = document.getElementById('login-step-credentials');
        const step2 = document.getElementById('login-step-verification');
        const searchState = document.getElementById('login-searching-state');
        const verifiedState = document.getElementById('login-verified-state');
        const progressFill = document.getElementById('login-verify-progress-fill');

        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        if (searchState) searchState.style.display = 'block';
        if (verifiedState) verifiedState.style.display = 'none';
        if (progressFill) progressFill.style.width = '25%';

        // Match company and staff data
        let tenantName = 'Apex Global Retail Ltd';
        let branch = 'London Flagship';
        let name = 'Victoria Sterling';
        let role = 'Business Owner (Administrator)';
        let lastActive = 'Today at 09:42 AM • Active Session';

        try {
          const stored = JSON.parse(localStorage.getItem('stokrova_tenants') || '{}');
          if (slug && stored[slug]) {
            const org = stored[slug];
            tenantName = org.companyName;
            branch = org.branchName || 'London Flagship';
            if (email === (org.ownerEmail || '').toLowerCase()) {
              name = org.ownerName;
              role = 'Business Owner (Administrator)';
            }
          } else {
            for (const s in stored) {
              const org = stored[s];
              if (org.ownerEmail && org.ownerEmail.toLowerCase() === email) {
                tenantName = org.companyName;
                slug = org.slug;
                branch = org.branchName || 'London Flagship';
                name = org.ownerName;
                role = 'Business Owner (Administrator)';
                break;
              }
            }
          }
        } catch (_) {}

        if (!slug) slug = 'apex';

        // Determine staff role & name if not matched as registered owner
        if (role !== 'Business Owner (Administrator)') {
          if (email.includes('manager') || email.includes('david')) {
            name = "David O'Connor";
            role = 'Store Operations Manager';
            lastActive = 'Today at 08:30 AM • Shift Active';
          } else if (email.includes('cashier') || email.includes('emma')) {
            name = 'Emma Watson';
            role = 'Front Counter Cashier';
            lastActive = 'Today at 10:15 AM • Till Registered';
          } else if (email.includes('picker') || email.includes('samuel')) {
            name = 'Samuel Adebayo';
            role = 'Warehouse Lead & Picker';
            lastActive = 'Today at 07:00 AM • Dock Active';
          } else {
            const prefix = email.split('@')[0] || 'staff';
            name = prefix.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            role = 'Store Operations Staff';
            lastActive = 'Active Today • Verified Identity';
          }
        } else if (email.includes('owner') || email.includes('victoria') || email.includes('admin')) {
          name = 'Victoria Sterling';
          role = 'Business Owner (Administrator)';
        }

        // Send non-blocking verification request to backend API
        try {
          fetch('http://localhost:3000/api/v1/tenants/verify-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, slug: slug })
          }).catch(() => {});
        } catch (_) {}

        // Animate radar scanning progress
        if (progressFill) {
          setTimeout(() => { if (progressFill) progressFill.style.width = '65%'; }, 160);
          setTimeout(() => { if (progressFill) progressFill.style.width = '100%'; }, 340);
        }

        this.verifiedStaffData = {
          tenantName: tenantName,
          branchName: branch,
          userName: name,
          userRole: role,
        };

        // Reveal verified card with green checkmarks
        setTimeout(() => {
          const compEl = document.getElementById('login-dyn-company');
          const slugEl = document.getElementById('login-dyn-slug');
          const nameEl = document.getElementById('login-dyn-name');
          const roleEl = document.getElementById('login-dyn-role');
          const lastEl = document.getElementById('login-dyn-last-active');

          if (compEl) compEl.textContent = tenantName;
          if (slugEl) slugEl.textContent = slug + '.stokrova.com';
          if (nameEl) nameEl.textContent = name;
          if (roleEl) roleEl.textContent = role;
          if (lastEl) lastEl.textContent = lastActive;

          if (searchState) searchState.style.display = 'none';
          if (verifiedState) verifiedState.style.display = 'block';

          this.showToast('✓ Workspace found & verified for ' + name);
        }, 440);
      },

      confirmLoginLaunch() {
        this.closeLoginModal();
        const data = this.verifiedStaffData || {
          tenantName: 'Apex Global Retail Ltd',
          branchName: 'London Flagship',
          userName: 'Victoria Sterling',
          userRole: 'Business Owner (Administrator)',
        };
        this.showToast('✓ Access granted: Welcome back, ' + data.userName + '!');
        this.launchWorkspace(data);
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
        window.stokrovaCustomerApp.endTour();
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
