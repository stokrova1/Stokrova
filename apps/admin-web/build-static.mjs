import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlatformFounderView } from './dist/index.js';
import {
  generateCssVariableString,
  themeTokens,
  brandColors,
} from '@stokrova/ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Platform Founder View Model
const isDemo = process.env.STOKROVA_DEMO_MODE === 'true' || process.argv.includes('--demo');
const founderViewModel = new PlatformFounderView('dark', isDemo);
const founderHtml = founderViewModel.renderPlatformFounderPortalHtml();

// 2. Assemble Pure Platform Founder / Super-Admin HTML Application
const founderAppHtml = `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Platform Founder & Global Administration Console</title>
  <link rel="icon" type="image/png" href="https://assets.stokrova.com/icon-32.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
${generateCssVariableString('light')}
${generateCssVariableString('dark')}

    :root {
      --bg: #161B1E;
      --surface: #1E2428;
      --card: #1E2428;
      --card-hover: #293136;
      --border: #333D46;
      --border-strong: #414F5A;
      --borderStrong: #414F5A;
      --primary: #BD9652;
      --primary-hover: #CEB274;
      --primary-fg: #0E1116;
      --text-primary: #F8FAFC;
      --text-secondary: #ACB8C3;
      --text-muted: #7E919F;
      --success: #4ADE80;
      --error: #F87171;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --stokrova-font-mono: 'JetBrains Mono', monospace;
    }

    [data-theme="light"] {
      --bg: #F5F7F8;
      --surface: #FFFFFF;
      --card: #FFFFFF;
      --card-hover: #F9F4EB;
      --border: #D2D9DF;
      --border-strong: #ACB8C3;
      --borderStrong: #ACB8C3;
      --primary: #BD9652;
      --primary-hover: #A47E3D;
      --primary-fg: #FFFFFF;
      --text-primary: #1E2428;
      --text-secondary: #414F5A;
      --text-muted: #7E919F;
      --success: #166534;
      --error: #991B1B;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: var(--bg);
      color: var(--text-primary);
      font-family: var(--font-sans);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Founder Header Bar */
    .founder-top-bar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 56px;
      z-index: 1000;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: 0.04em;
      color: var(--primary);
    }
    .brand-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      background: rgba(189,150,82,0.15);
      color: var(--primary);
      border: 1px solid rgba(189,150,82,0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #4ADE80;
      background: rgba(74,222,128,0.1);
      border: 1px solid rgba(74,222,128,0.25);
      padding: 4px 12px;
      border-radius: 9999px;
    }

    .founder-profile-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--text-primary);
      font-weight: 600;
      background: var(--card-hover);
      border: 1px solid var(--border);
      padding: 5px 12px;
      border-radius: 6px;
    }

    /* App Layout */
    .app-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Founder Navigation Rail */
    .founder-sidebar {
      width: 260px;
      min-width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 16px 0;
      overflow-y: auto;
    }

    .nav-header-label {
      padding: 8px 16px 4px 16px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .founder-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 16px;
      margin: 2px 8px;
      border-radius: 6px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .founder-nav-item:hover {
      background: var(--card-hover);
      color: var(--text-primary);
    }
    .founder-nav-item.active {
      background: rgba(189,150,82,0.15);
      color: var(--primary);
      font-weight: 600;
      border-left: 3px solid var(--primary);
    }

    /* Content Viewport */
    .content-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 28px 32px;
      background: var(--bg);
    }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--card);
      border: 1px solid var(--primary);
      color: var(--text-primary);
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Custom Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
  </style>
</head>
<body>

  <!-- Platform Founder Sovereign Branded Login Screen -->
  <div id="admin-login-screen" style="display: flex; min-height: 100vh; width: 100%; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 25%, rgba(189,150,82,0.12) 0%, rgba(22,27,30,0.98) 55%, #0E1116 100%); padding: 24px; box-sizing: border-box; position: relative; z-index: 9999;">
    <div style="width: 100%; max-width: 460px; background: #1E2428; border: 1px solid rgba(189,150,82,0.35); border-radius: 12px; padding: 36px 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(189,150,82,0.1); backdrop-filter: blur(12px); box-sizing: border-box;">
      
      <!-- Sovereign Founder Emblem & Brand -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, rgba(189,150,82,0.25) 0%, rgba(189,150,82,0.05) 100%); border: 1.5px solid #BD9652; font-size: 1.85rem; margin-bottom: 14px; box-shadow: 0 0 24px rgba(189,150,82,0.25);">
          👑
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; font-size: 1.35rem; letter-spacing: 0.12em; color: #BD9652;">
          <span>◆</span>
          <span>STOKROVA</span>
        </div>
        <div style="font-size: 0.8125rem; font-weight: 700; color: #ACB8C3; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
          Platform Founder Console
        </div>
        <p style="margin: 6px 0 0 0; font-size: 0.75rem; color: #7E919F;">
          Sovereign Root Access & Multi-Tenant Infrastructure Governance
        </p>
      </div>

      <!-- High-Security Restriction Notice -->
      <div style="background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 22px; font-size: 0.75rem; color: #F87171; line-height: 1.5;">
        <div style="font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
          <span>🛡️</span>
          <span>RESTRICTED PLATFORM INFRASTRUCTURE</span>
        </div>
        <div>
          Reserved strictly for Platform Super-Administrators (<strong style="color: #F8FAFC;">stokrova1@gmail.com</strong>). Business owners and staff must authenticate via the customer portal.
        </div>
      </div>

      <!-- Login Form -->
      <form id="admin-login-form" method="post" action="javascript:void(0)" onsubmit="window.stokrovaFounder.handleAdminLogin(event)" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Email Input -->
        <div>
          <label for="founder-login-email" style="display: block; font-size: 0.6875rem; font-weight: 700; color: #ACB8C3; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
            Founder Master Email
          </label>
          <div style="position: relative;">
            <input
              type="email"
              id="founder-login-email"
              name="email"
              required
              value="stokrova1@gmail.com"
              placeholder="stokrova1@gmail.com"
              style="width: 100%; box-sizing: border-box; background: #161B1E; border: 1px solid #333D46; border-radius: 6px; padding: 10px 14px 10px 36px; color: #F8FAFC; font-size: 0.875rem; outline: none; transition: border-color 0.2s ease;"
              onfocus="this.style.borderColor='#BD9652'"
              onblur="this.style.borderColor='#333D46'"
            />
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.875rem; color: #7E919F;">✉</span>
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="founder-login-password" style="font-size: 0.6875rem; font-weight: 700; color: #ACB8C3; text-transform: uppercase; letter-spacing: 0.08em;">
              Master Root Password
            </label>
            <button
              type="button"
              onclick="window.stokrovaFounder.togglePasswordVisibility()"
              id="btn-toggle-password"
              style="background: transparent; border: none; color: #BD9652; font-size: 0.75rem; cursor: pointer; padding: 0; font-weight: 600;"
            >
              Show
            </button>
          </div>
          <div style="position: relative;">
            <input
              type="password"
              id="founder-login-password"
              name="password"
              required
              placeholder="••••••••••••••••"
              style="width: 100%; box-sizing: border-box; background: #161B1E; border: 1px solid #333D46; border-radius: 6px; padding: 10px 14px 10px 36px; color: #F8FAFC; font-size: 0.875rem; outline: none; transition: border-color 0.2s ease;"
              onfocus="this.style.borderColor='#BD9652'"
              onblur="this.style.borderColor='#333D46'"
            />
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 0.875rem; color: #7E919F;">🔒</span>
          </div>
        </div>

        <!-- Error Banner -->
        <div id="admin-login-error" style="display: none; background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.4); border-radius: 6px; padding: 10px 12px; font-size: 0.8125rem; color: #F87171; line-height: 1.4;">
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          id="btn-admin-login-submit"
          style="margin-top: 8px; width: 100%; background: linear-gradient(135deg, #BD9652 0%, #A47E3D 100%); color: #0E1116; border: none; border-radius: 6px; padding: 12px 18px; font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 14px rgba(189,150,82,0.35); display: flex; align-items: center; justify-content: center; gap: 8px;"
        >
          <span>Authenticate & Unlock Terminal</span>
          <span>→</span>
        </button>
      </form>

      <!-- Security Guarantee -->
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #333D46; text-align: center; font-size: 0.6875rem; color: #7E919F; line-height: 1.6;">
        <div>🔒 Enterprise Encrypted Session • Verified Audit Trail</div>
        <div style="margin-top: 2px;">All access attempts are securely authenticated and recorded.</div>
      </div>
    </div>
  </div>

  <!-- Authenticated Platform Founder Portal Shell -->
  <div id="admin-authenticated-layout" style="display: none; height: 100vh; flex-direction: column; overflow: hidden;">
    <!-- Top Founder Header -->
    <header class="founder-top-bar">
      <div class="brand-logo">
        <span>◆</span>
        <span>STOKROVA</span>
        <span class="brand-pill">Platform Founder Console</span>
      </div>

      <div class="header-actions">
        <span class="status-badge">
          <span>●</span>
          <span>Platform Live & Healthy</span>
        </span>

        <button onclick="window.stokrovaFounder.toggleTheme()" style="background: var(--card-hover); border: 1px solid var(--border); color: var(--text-secondary); padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
          🌓 Toggle Theme
        </button>

        <div class="founder-profile-badge">
          <span>👑</span>
          <span id="founder-user-badge-email">Platform Super-Admin</span>
        </div>

        <button onclick="window.stokrovaFounder.openSignOutModal()" id="btn-open-signout" style="background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); color: #F87171; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
          <span>🔒</span>
          <span>Lock & Sign Out</span>
        </button>
      </div>
    </header>

    <!-- App Body Layout -->
    <div class="app-layout">
      <!-- Sidebar Navigation -->
      <aside class="founder-sidebar">
        <div class="nav-header-label">Global Governance</div>
        <div class="founder-nav-item active" onclick="window.stokrovaFounder.scrollToSection('overview')">
          <span>📊 Platform Ecosystem Overview</span>
        </div>
        <div class="founder-nav-item" onclick="window.stokrovaFounder.scrollToSection('tenants')">
          <span>🏛️ Enrolled Businesses (Tenants)</span>
          <span id="nav-tenant-count" style="background: rgba(189,150,82,0.2); color: var(--primary); padding: 1px 6px; border-radius: 9999px; font-size: 0.7rem;">${founderViewModel.listTenants().length}</span>
        </div>
        <div class="founder-nav-item" onclick="window.stokrovaFounder.scrollToSection('users')">
          <span>👥 Platform Accounts & Owners</span>
        </div>

        <div class="nav-header-label" style="margin-top: 16px;">Commercial & Health</div>
        <div class="founder-nav-item" onclick="window.stokrovaFounder.scrollToSection('plans')">
          <span>💳 SaaS Subscriptions & Tiers</span>
        </div>
        <div class="founder-nav-item" onclick="window.stokrovaFounder.scrollToSection('telemetry')">
          <span>⚡ Infrastructure & Telemetry</span>
        </div>

        <div style="margin-top: auto; padding: 16px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted);">
          <div>Sovereign Multi-Tenant Root</div>
          <div style="margin-top: 2px;">Zero Business/Customer Overlap</div>
        </div>
      </aside>

      <!-- Main Content Viewport -->
      <main class="content-viewport">
        <div id="founder-portal-container">
          ${founderHtml}
        </div>
      </main>
    </div>
  </div>

  <!-- Sign Out Governance Warning Modal -->
  <div id="admin-signout-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); align-items: center; justify-content: center; z-index: 10001; padding: 20px; box-sizing: border-box;">
    <div style="width: 100%; max-width: 480px; background: #1E2428; border: 1px solid rgba(248,113,113,0.4); border-radius: 12px; padding: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 30px rgba(248,113,113,0.15); box-sizing: border-box; animation: slideIn 0.2s ease-out;">
      <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
          ⚠️
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="margin: 0; font-size: 1.15rem; color: #F8FAFC; font-weight: 700;">Platform Governance Warning</h3>
            <span style="font-size: 0.6875rem; font-weight: 700; background: rgba(248,113,113,0.2); color: #F87171; border: 1px solid rgba(248,113,113,0.4); padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">CRITICAL</span>
          </div>
          <div style="font-size: 0.8125rem; color: #ACB8C3; margin-top: 4px;">
            Termination of Sovereign Root Session
          </div>
        </div>
      </div>

      <div style="background: #161B1E; border: 1px solid #333D46; border-radius: 8px; padding: 14px; margin-bottom: 22px; font-size: 0.8125rem; color: #CBD5E1; line-height: 1.55;">
        <p style="margin: 0 0 8px 0;">
          You are about to terminate the active <strong>Platform Founder / Super-Admin session</strong> for this terminal.
        </p>
        <p style="margin: 0; color: #94A3B8; font-size: 0.75rem; line-height: 1.5;">
          • All root administrative capabilities will be locked immediately.<br>
          • Multi-tenant governance controls and tenant suspension killswitches will become inaccessible.<br>
          • Re-authentication with master founder credentials will be required to regain access.
        </p>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button
          type="button"
          id="btn-cancel-signout"
          onclick="window.stokrovaFounder.closeSignOutModal()"
          style="background: #293136; border: 1px solid #414F5A; color: #F8FAFC; padding: 10px 18px; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: background 0.15s ease;"
        >
          Cancel / Stay Signed In
        </button>
        <button
          type="button"
          id="btn-confirm-signout"
          onclick="window.stokrovaFounder.confirmSignOut()"
          style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); border: 1px solid #EF4444; color: #FFFFFF; padding: 10px 18px; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(220,38,38,0.3);"
        >
          <span>🔒</span>
          <span>Terminate Session & Lock Console</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast-notification">
    <span style="color: var(--primary);">✓</span>
    <span id="toast-message">Action successful</span>
  </div>

  <!-- Global Founder Interactive Controller -->
  <script>
    (function() {
      // In-memory tenant store for live interactivity
      const tenantData = ${isDemo ? JSON.stringify({
        'ten_apex_global': {
          id: 'ten_apex_global',
          name: 'Apex Global Retail & Logistics Ltd',
          slug: 'apex-global',
          ownerName: 'Victoria Sterling',
          ownerEmail: 'founder.victoria@apex-global.com',
          currencyCode: 'USD',
          subscriptionTier: 'ENTERPRISE_LOGISTICS',
          status: 'ACTIVE',
          companiesCount: 4,
          branchesCount: 5,
          monthlyGmv: '$4,850,000.00',
          createdAt: '2026-01-15'
        },
        'ten_metro_retail': {
          id: 'ten_metro_retail',
          name: 'Metro Department Stores PLC',
          slug: 'metro-retail',
          ownerName: 'Charles Montgomery',
          ownerEmail: 'charles@metro-stores.co.uk',
          currencyCode: 'GBP',
          subscriptionTier: 'COMMERCE_PRO',
          status: 'ACTIVE',
          companiesCount: 2,
          branchesCount: 8,
          monthlyGmv: '£2,150,000.00',
          createdAt: '2026-02-10'
        },
        'ten_aurora_boutiques': {
          id: 'ten_aurora_boutiques',
          name: 'Aurora Luxury Boutiques',
          slug: 'aurora-fashion',
          ownerName: 'Isabella Moreau',
          ownerEmail: 'isabella@auroraboutiques.com',
          currencyCode: 'EUR',
          subscriptionTier: 'COMMERCE_PRO',
          status: 'ACTIVE',
          companiesCount: 1,
          branchesCount: 3,
          monthlyGmv: '€920,000.00',
          createdAt: '2026-03-01'
        },
        'ten_lagos_fastmart': {
          id: 'ten_lagos_fastmart',
          name: 'Lagos FastMart Express',
          slug: 'lagos-fastmart',
          ownerName: 'Babatunde Adeleke',
          ownerEmail: 'baba@fastmart.ng',
          currencyCode: 'NGN',
          subscriptionTier: 'STARTER',
          status: 'SUSPENDED',
          companiesCount: 1,
          branchesCount: 2,
          monthlyGmv: '₦45,000,000.00',
          createdAt: '2026-04-12'
        }
      }, null, 6) : '{}'};

      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const SUPABASE_CONFIG = {
        url: 'https://vbtuccvxtgjhaywijmwa.supabase.co',
        anonKey: 'sb_publishable_SQZZBnrGJ4wwY4rUeZjtag_-jtZxCVp',
        apiBase: isLocalhost && window.location.port !== '3000' && window.location.port !== '' ? 'http://localhost:3000/v1' : '/v1',
      };
      // Founder access comes only from server-controlled account settings (app_metadata), never from
      // the email address or user-editable profile fields. The server re-checks every request.
      const isFounderAccount = (user) => !!user && user.app_metadata?.is_platform_admin === true;
      const authedFetch = async (url, init = {}) => {
        const sb = window._stokrovaSupabase || null;
        const token = sb ? (await sb.auth.getSession().catch(() => ({ data: {} })))?.data?.session?.access_token : null;
        const headers = Object.assign({}, init.headers || {}, token ? { Authorization: 'Bearer ' + token } : {});
        const base = window.STOKROVA_API || SUPABASE_CONFIG.apiBase;
        return fetch(base + url.replace(/^\\/api\\/v1/, ''), Object.assign({}, init, { headers }));
      };
      const getSupabase = () => {
        if (window._stokrovaSupabase) return window._stokrovaSupabase;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          window._stokrovaSupabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
          return window._stokrovaSupabase;
        }
        return null;
      };

      window.stokrovaFounder = {
        showToast(message) {
          const toast = document.getElementById('toast-notification');
          const msg = document.getElementById('toast-message');
          if (toast && msg) {
            msg.innerText = message;
            toast.style.display = 'flex';
            setTimeout(() => { toast.style.display = 'none'; }, 4000);
          }
        },

        toggleTheme() {
          const html = document.documentElement;
          const current = html.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          html.setAttribute('data-theme', next);
          this.showToast('Theme switched to ' + next + ' mode.');
        },

        scrollToSection(sectionId) {
          let targetEl = null;
          if (sectionId === 'overview') targetEl = document.querySelector('.platform-kpi-grid');
          else if (sectionId === 'tenants') targetEl = document.querySelector('.tenant-directory-container');
          else if (sectionId === 'users') targetEl = document.querySelector('.platform-users-container');
          else if (sectionId === 'plans') targetEl = document.querySelector('.saas-plans-container');
          else if (sectionId === 'telemetry') targetEl = document.querySelector('.telemetry-container');

          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          const navItems = document.querySelectorAll('.founder-nav-item');
          navItems.forEach(item => item.classList.remove('active'));
          event.currentTarget?.classList.add('active');
        },

        openEnrollModal() {
          const modal = document.getElementById('enroll-modal-backdrop');
          if (modal) modal.style.display = 'flex';
        },

        closeEnrollModal() {
          const modal = document.getElementById('enroll-modal-backdrop');
          if (modal) modal.style.display = 'none';
        },

        handleEnrollSubmit(e) {
          e.preventDefault();
          const name = document.getElementById('new-company-name').value;
          const slug = document.getElementById('new-company-slug').value;
          const ownerName = document.getElementById('new-owner-name').value;
          const ownerEmail = document.getElementById('new-owner-email').value;
          const currency = document.getElementById('new-currency-code').value;
          const tier = document.getElementById('new-subscription-tier').value;

          const newId = 'ten_' + slug.replace(/[^a-z0-9]/gi, '_').toLowerCase();

          tenantData[newId] = {
            id: newId,
            name: name,
            slug: slug,
            ownerName: ownerName,
            ownerEmail: ownerEmail,
            currencyCode: currency,
            subscriptionTier: tier,
            status: 'ACTIVE',
            companiesCount: 1,
            branchesCount: 1,
            monthlyGmv: '$0.00',
            createdAt: new Date().toISOString().split('T')[0]
          };

          // Append row to tbody
          const tbody = document.getElementById('tenant-table-tbody');
          if (tbody) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-tenant-id', newId);
            tr.className = 'tenant-row';
            tr.style.borderBottom = '1px solid var(--border)';
            tr.innerHTML = \`
              <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">
                <div class="tenant-name">\${name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">slug: \${slug} • id: \${newId}</div>
              </td>
              <td style="padding: 14px 16px; color: var(--text-secondary); font-size: 0.875rem;">
                <div>\${ownerName}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">\${ownerEmail}</div>
              </td>
              <td style="padding: 14px 16px;">
                <span style="background: rgba(189,150,82,0.18); color: #BD9652; border: 1px solid #BD9652; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">\${tier}</span>
              </td>
              <td style="padding: 14px 16px; color: var(--text-secondary); font-size: 0.8125rem;">
                1 co / 1 branch
              </td>
              <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">
                $0.00
              </td>
              <td style="padding: 14px 16px;">
                <span id="badge-status-\${newId}" style="background: rgba(74,222,128,0.1); color: #4ADE80; border: 1px solid rgba(74,222,128,0.3); padding: 3px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                  ACTIVE
                </span>
              </td>
              <td style="padding: 14px 16px; text-align: right;">
                <button onclick="window.stokrovaFounder.toggleTenantStatus('\${newId}')" id="btn-status-\${newId}" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: rgba(248,113,113,0.1); color: #F87171; border: 1px solid rgba(248,113,113,0.3);">
                  Suspend
                </button>
                <button onclick="window.stokrovaFounder.inspectTenant('\${newId}')" style="padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; background: var(--surface); color: var(--text-primary); border: 1px solid var(--border-strong); margin-left: 6px;">
                  Inspect ↗
                </button>
              </td>
            \`;
            tbody.insertBefore(tr, tbody.firstChild);
          }

          // Update counts
          const totalCountEl = document.getElementById('stat-total-tenants');
          const navCountEl = document.getElementById('nav-tenant-count');
          const activeCountEl = document.getElementById('stat-active-tenants');
          if (totalCountEl) totalCountEl.innerText = Object.keys(tenantData).length;
          if (navCountEl) navCountEl.innerText = Object.keys(tenantData).length;
          if (activeCountEl) {
            const activeCount = Object.values(tenantData).filter(t => t.status === 'ACTIVE').length;
            activeCountEl.innerText = activeCount;
          }

          this.closeEnrollModal();
          this.showToast('Successfully enrolled business: ' + name + ' (Tier: ' + tier + ')');
        },

        updateTenantRowUi(id, status) {
          const badge = document.getElementById('badge-status-' + id);
          const btn = document.getElementById('btn-status-' + id);

          if (badge) {
            badge.innerText = status;
            if (status === 'ACTIVE') {
              badge.style.background = 'rgba(74,222,128,0.1)';
              badge.style.color = '#4ADE80';
              badge.style.border = '1px solid rgba(74,222,128,0.3)';
            } else {
              badge.style.background = 'rgba(248,113,113,0.1)';
              badge.style.color = '#F87171';
              badge.style.border = '1px solid rgba(248,113,113,0.3)';
            }
          }

          if (btn) {
            btn.innerText = status === 'ACTIVE' ? 'Suspend' : 'Reactivate';
            if (status === 'ACTIVE') {
              btn.style.background = 'rgba(248,113,113,0.1)';
              btn.style.color = '#F87171';
              btn.style.border = '1px solid rgba(248,113,113,0.3)';
            } else {
              btn.style.background = 'rgba(74,222,128,0.1)';
              btn.style.color = '#4ADE80';
              btn.style.border = '1px solid rgba(74,222,128,0.3)';
            }
          }

          const activeCountEl = document.getElementById('stat-active-tenants');
          if (activeCountEl) {
            const activeCount = Object.values(tenantData).filter(t => t.status === 'ACTIVE').length;
            activeCountEl.innerText = activeCount;
          }
        },

        async toggleTenantStatus(id) {
          const tenant = tenantData[id];
          const isCurrentlyActive = tenant ? tenant.status === 'ACTIVE' : true;
          const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
          const endpoint = '/api/v1/platform-admin/businesses/' + encodeURIComponent(id) + (isCurrentlyActive ? '/suspend' : '/reactivate');

          const btn = document.getElementById('btn-status-' + id);
          if (btn) btn.disabled = true;

          try {
            const res = await authedFetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Platform administration governance killswitch' })
            });

            if (res.ok) {
              if (tenant) tenant.status = nextStatus;
              this.updateTenantRowUi(id, nextStatus);
              const actionWord = nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended';
              this.showToast('✓ Tenant ' + (tenant ? tenant.name : id) + ' successfully ' + actionWord + ' in database.');
            } else {
              const errData = await res.json().catch(() => ({}));
              this.showToast('Server update failed: ' + (errData.message || res.statusText));
            }
          } catch (netErr) {
            // Local fallback if running static preview without live backend
            if (tenant) {
              tenant.status = nextStatus;
              this.updateTenantRowUi(id, nextStatus);
              const actionWord = nextStatus === 'ACTIVE' ? 'reactivated' : 'suspended';
              this.showToast('Tenant ' + tenant.name + ' ' + actionWord + ' (offline preview).');
            }
          } finally {
            if (btn) btn.disabled = false;
          }
        },

        filterTenants(query) {
          const q = (query || '').toLowerCase().trim();
          const rows = document.querySelectorAll('.tenant-row');
          rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
          });
        },

        inspectTenant(id) {
          const tenant = tenantData[id];
          if (!tenant) return;

          const modal = document.getElementById('inspect-modal-backdrop');
          const title = document.getElementById('inspect-modal-title');
          const slug = document.getElementById('inspect-modal-slug');
          const body = document.getElementById('inspect-modal-body');

          if (title) title.innerText = tenant.name;
          if (slug) slug.innerText = 'Organization ID: ' + tenant.id + ' • Slug: ' + tenant.slug;
          if (body) {
            body.innerHTML = \`
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                <div style="background: var(--surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Master Account Owner</div>
                  <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">\${tenant.ownerName}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">\${tenant.ownerEmail}</div>
                </div>
                <div style="background: var(--surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">SaaS Tier & Commercial Plan</div>
                  <div style="font-weight: 700; color: #BD9652; margin-top: 2px;">\${tenant.subscriptionTier}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Auto-renewal via Stripe</div>
                </div>
              </div>

              <div style="background: var(--surface); padding: 12px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 16px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Topological Structure & Scalability</div>
                <div>Legal Companies: <strong>\${tenant.companiesCount}</strong></div>
                <div>Active Operating Branches & Hubs: <strong>\${tenant.branchesCount}</strong></div>
                <div>Base Currency: <strong>\${tenant.currencyCode}</strong></div>
                <div>Monthly Recorded Volume: <strong>\${tenant.monthlyGmv}</strong></div>
              </div>

              <div style="background: rgba(189,150,82,0.1); border: 1px solid rgba(189,150,82,0.3); border-radius: 6px; padding: 12px; font-size: 0.8125rem; color: var(--text-primary);">
                <strong>Enterprise Data Isolation:</strong><br>
                Dedicated organizational security boundary active. Complete data privacy across businesses.
              </div>
            \`;
          }
          if (modal) modal.style.display = 'flex';
        },

        closeInspectModal() {
          const modal = document.getElementById('inspect-modal-backdrop');
          if (modal) modal.style.display = 'none';
        },

        async hydrateLivePlatformData() {
          try {
            const overviewRes = await authedFetch('/api/v1/platform-admin/overview').then(r => r.ok ? r.json() : null).catch(() => null);
            if (overviewRes && overviewRes.data) {
              const o = overviewRes.data;
              const totalEl = document.getElementById('stat-total-tenants');
              const activeEl = document.getElementById('stat-active-tenants');
              const mrrEl = document.getElementById('stat-mrr');
              const gmvEl = document.getElementById('stat-total-gmv');
              const navCount = document.getElementById('nav-tenant-count');
              if (totalEl) totalEl.innerText = o.subscriber_tenants ?? 0;
              if (activeEl) activeEl.innerText = o.active_subscribers ?? 0;
              if (mrrEl) mrrEl.innerText = '$' + ((o.platform_mrr_cents || 0) / 100).toFixed(2);
              if (gmvEl) gmvEl.innerText = '$' + ((o.gross_merchandise_volume_cents || 0) / 100).toFixed(2);
              if (navCount) navCount.innerText = o.subscriber_tenants ?? 0;
            }
          } catch (_) {}
        },

        async handleAdminLogin(e) {
          if (e) e.preventDefault();
          const emailInput = document.getElementById('founder-login-email');
          const passInput = document.getElementById('founder-login-password');
          const errorEl = document.getElementById('admin-login-error');
          const submitBtn = document.getElementById('btn-admin-login-submit');

          const email = (emailInput?.value || '').trim().toLowerCase();
          const password = passInput?.value || '';

          if (errorEl) {
            errorEl.style.display = 'none';
            errorEl.innerText = '';
          }

          if (!email || !password) {
            if (errorEl) {
              errorEl.innerText = 'Please provide both your Founder Identity email and Master Root Password.';
              errorEl.style.display = 'block';
            }
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Verifying Sovereign Root Clearance...</span>';
          }

          const sb = getSupabase();
          let isAuthenticated = false;
          let userEmail = email;

          if (sb) {
            try {
              const { data, error } = await sb.auth.signInWithPassword({
                email: email,
                password: password,
              });

              if (error) {
                if (errorEl) {
                  errorEl.innerText = 'Authentication Failed: ' + (error.message || 'Invalid master credentials.');
                  errorEl.style.display = 'block';
                }
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<span>Authenticate & Unlock Terminal</span><span>→</span>';
                }
                return;
              }

              const user = data.user;
              userEmail = user?.email || email;

              // Check if user is authorized platform super-admin
              const isSuperAdmin = isFounderAccount(user);

              if (!isSuperAdmin) {
                // Terminate session immediately
                await sb.auth.signOut();
                if (errorEl) {
                  errorEl.innerText = 'Access Denied: Account lacks Platform Super-Admin governance privileges. Customer business owners must log in via the customer portal.';
                  errorEl.style.display = 'block';
                }
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<span>Authenticate & Unlock Terminal</span><span>→</span>';
                }
                return;
              }

              isAuthenticated = true;
            } catch (authErr) {
              {
                if (errorEl) {
                  errorEl.innerText = 'Authentication Error: ' + (authErr.message || 'Network error.');
                  errorEl.style.display = 'block';
                }
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<span>Authenticate & Unlock Terminal</span><span>→</span>';
                }
                return;
              }
            }
          } else {
            // No sign-in service available: never unlock the console.
            {
              if (errorEl) {
                errorEl.innerText = 'Sign-in is unavailable right now. Please try again in a moment.';
                errorEl.style.display = 'block';
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Authenticate & Unlock Terminal</span><span>→</span>';
              }
              return;
            }
          }

          if (isAuthenticated) {
            try {
              sessionStorage.setItem('stokrova_admin_authenticated', 'true');
              sessionStorage.setItem('stokrova_admin_email', userEmail);
            } catch (_) {}

            const loginScreen = document.getElementById('admin-login-screen');
            const authLayout = document.getElementById('admin-authenticated-layout');
            const emailBadge = document.getElementById('founder-user-badge-email');

            if (loginScreen) loginScreen.style.display = 'none';
            if (authLayout) authLayout.style.display = 'flex';
            if (emailBadge) emailBadge.innerText = userEmail;

            this.showToast('✓ Sovereign Root Clearance Verified. Welcome, Platform Founder.');
            this.hydrateLivePlatformData();
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Authenticate & Unlock Terminal</span><span>→</span>';
          }
        },

        togglePasswordVisibility() {
          const passInput = document.getElementById('founder-login-password');
          const toggleBtn = document.getElementById('btn-toggle-password');
          if (passInput) {
            if (passInput.type === 'password') {
              passInput.type = 'text';
              if (toggleBtn) toggleBtn.innerText = 'Hide';
            } else {
              passInput.type = 'password';
              if (toggleBtn) toggleBtn.innerText = 'Show';
            }
          }
        },

        openSignOutModal() {
          const modal = document.getElementById('admin-signout-modal');
          if (modal) modal.style.display = 'flex';
        },

        closeSignOutModal() {
          const modal = document.getElementById('admin-signout-modal');
          if (modal) modal.style.display = 'none';
        },

        async confirmSignOut() {
          const sb = getSupabase();
          if (sb) {
            try {
              await sb.auth.signOut();
            } catch (_) {}
          }

          try {
            sessionStorage.removeItem('stokrova_admin_authenticated');
            sessionStorage.removeItem('stokrova_admin_email');
          } catch (_) {}

          this.closeSignOutModal();

          const authLayout = document.getElementById('admin-authenticated-layout');
          const loginScreen = document.getElementById('admin-login-screen');
          const passInput = document.getElementById('founder-login-password');

          if (authLayout) authLayout.style.display = 'none';
          if (loginScreen) loginScreen.style.display = 'flex';
          if (passInput) passInput.value = '';

          this.showToast('Platform Founder session locked. Root console secured.');
        },

        async checkExistingSession() {
          let hasSession = false;
          try {
            // The stokrova_admin_authenticated flag alone never unlocks the console; a real founder session must exist.
            sessionStorage.removeItem('stokrova_admin_authenticated');
          } catch (_) {}

          const sb = getSupabase();
          if (sb) {
            try {
              const { data: { session } } = await sb.auth.getSession();
              if (session && session.user) {
                const userEmail = session.user.email || '';
                const isSuperAdmin = isFounderAccount(session.user);

                if (isSuperAdmin) {
                  hasSession = true;
                  try {
                    sessionStorage.setItem('stokrova_admin_authenticated', 'true');
                    sessionStorage.setItem('stokrova_admin_email', userEmail);
                  } catch (_) {}
                }
              }
            } catch (_) {}
          }

          const loginScreen = document.getElementById('admin-login-screen');
          const authLayout = document.getElementById('admin-authenticated-layout');
          const emailBadge = document.getElementById('founder-user-badge-email');

          if (hasSession) {
            if (loginScreen) loginScreen.style.display = 'none';
            if (authLayout) authLayout.style.display = 'flex';
            let email = 'stokrova1@gmail.com';
            try {
              email = sessionStorage.getItem('stokrova_admin_email') || email;
            } catch (_) {}
            if (emailBadge) emailBadge.innerText = email;
            this.hydrateLivePlatformData();
          } else {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (authLayout) authLayout.style.display = 'none';
          }
        }
      };

      window.addEventListener('DOMContentLoaded', () => {
        window.stokrovaFounder.checkExistingSession();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          window.stokrovaFounder.closeEnrollModal();
          window.stokrovaFounder.closeInspectModal();
          window.stokrovaFounder.closeSignOutModal();
        }
      });
    })();
  </script>
  <script src="founder-live.js"></script>
</body>
</html>
`.trim();

// 3. Write Output
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), founderAppHtml, 'utf-8');
fs.copyFileSync(path.join(__dirname, 'founder-live.js'), path.join(distDir, 'founder-live.js'));
console.log('✅ Generated pure STOKROVA Platform Founder Console at apps/admin-web/dist/index.html');
