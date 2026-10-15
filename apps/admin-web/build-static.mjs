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
        <span>Platform Super-Admin</span>
      </div>
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
            const res = await fetch(endpoint, {
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
            const overviewRes = await fetch('/api/v1/platform-admin/overview').then(r => r.ok ? r.json() : null).catch(() => null);
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
        }
      };

      window.addEventListener('DOMContentLoaded', () => {
        window.stokrovaFounder.hydrateLivePlatformData();
      });
    })();
  </script>
</body>
</html>
`.trim();

// 3. Write Output
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), founderAppHtml, 'utf-8');
console.log('✅ Generated pure STOKROVA Platform Founder Console at apps/admin-web/dist/index.html');
