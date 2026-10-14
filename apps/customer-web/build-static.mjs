import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LandingViewModel } from './dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const landingView = new LandingViewModel('dark');

const headerHtml = landingView.renderHeaderHtml();
const heroHtml = landingView.renderHeroHtml();
const featuresHtml = landingView.renderFeaturesGridHtml();
const pricingHtml = landingView.renderPricingSectionHtml();
const registerModalHtml = landingView.renderRegisterModalHtml();
const loginModalHtml = landingView.renderLoginModalHtml();
const footerHtml = landingView.renderFooterHtml();

const completeWebsiteHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STOKROVA — Enterprise Multi-Branch Inventory & POS Operating System</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090B0E;
      --surface: #0E1116;
      --card-hover: #151921;
      --border: #1E242E;
      --border-strong: #2D3543;
      --primary: #BD9652;
      --primary-hover: #CCA55E;
      --text: #F0F6FC;
      --text-secondary: #8B949E;
      --text-muted: #586069;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --stokrova-font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--primary); }
    button { font-family: var(--font-sans); }
    input, select { font-family: var(--font-sans); }

    /* Toast Notification */
    #toast-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1F242C;
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
    }
    .workspace-sidebar {
      width: 250px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .workspace-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .workspace-nav-item:hover, .workspace-nav-item.active {
      background: rgba(189,150,82,0.15);
      color: var(--primary);
      font-weight: 600;
    }
    .workspace-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 28px;
    }
  </style>
</head>
<body>

  <!-- PUBLIC CUSTOMER SURFACE -->
  <div id="customer-public-surface">
    ${headerHtml}
    <main>
      ${heroHtml}
      ${featuresHtml}
      ${pricingHtml}
    </main>
    ${footerHtml}
  </div>

  <!-- AUTH MODALS -->
  ${registerModalHtml}
  ${loginModalHtml}

  <!-- AUTHENTICATED BUSINESS WORKSPACE (LAUNCHED ON SIGN IN OR REGISTER) -->
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
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">Account Administrator</strong>
          (<span id="ws-role-display" style="color: var(--primary); font-weight: 600;">Business Owner</span>)
        </div>
        <button onclick="window.stokrovaCustomerApp.signOut()" style="background: var(--surface); color: var(--text); border: 1px solid var(--borderStrong); padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">
          Sign Out →
        </button>
      </div>
    </div>

    <div class="workspace-body">
      <aside class="workspace-sidebar">
        <div style="padding: 8px 14px; font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Business Operations</div>
        <div id="ws-nav-dashboard" class="workspace-nav-item active" onclick="window.stokrovaCustomerApp.showWsView('dashboard')">📊 Operations Dashboard</div>
        <div id="ws-nav-catalog" class="workspace-nav-item" onclick="window.stokrovaCustomerApp.showWsView('catalog')">🏷️ Product Catalog & Matrix</div>
        <div id="ws-nav-inventory" class="workspace-nav-item" onclick="window.stokrovaCustomerApp.showWsView('inventory')">📦 FEFO Lots & Warehouses</div>
        <div id="ws-nav-pos" class="workspace-nav-item" onclick="window.stokrovaCustomerApp.showWsView('pos')">💳 Cashier Till & POS</div>
        <div id="ws-nav-ledger" class="workspace-nav-item" onclick="window.stokrovaCustomerApp.showWsView('ledger')">⚖️ Balanced Journal Ledger</div>
      </aside>

      <main class="workspace-viewport">
        <!-- View: Dashboard -->
        <div id="ws-view-dashboard" class="ws-view-content">
          <div style="margin-bottom: 24px;">
            <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Enterprise Operations Dashboard</h1>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Multi-branch performance metrics and till session summaries.</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Today's Net Revenue</div>
              <div class="stokrova-net-revenue" style="font-size: 1.75rem; font-weight: 800; color: var(--text); font-family: var(--stokrova-font-mono); margin-top: 6px;">$38,200.00</div>
              <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 4px;">+14.2% vs previous period</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Stockout Risk Alerts</div>
              <div style="font-size: 1.75rem; font-weight: 800; color: #F59E0B; font-family: var(--stokrova-font-mono); margin-top: 6px;">2 SKUs</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">Automated replenishment queued</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Open Till Sessions</div>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--text); font-family: var(--stokrova-font-mono); margin-top: 6px;">4 Active</div>
              <div style="font-size: 0.75rem; color: #4ADE80; margin-top: 4px;">0 cashier variance detected</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">In-Transit Transfers</div>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--primary); font-family: var(--stokrova-font-mono); margin-top: 6px;">1 Movement</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">London Flagship → Birmingham</div>
            </div>
          </div>
        </div>

        <!-- View: Catalog -->
        <div id="ws-view-catalog" class="ws-view-content" style="display: none;">
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Product Variant Catalog</h1>
          <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 0.875rem;">Multi-attribute items, barcode lookups, and retail pricing.</p>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead style="background: #151921; border-bottom: 1px solid var(--border); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem;">
                <tr>
                  <th style="padding: 12px 16px; text-align: left;">SKU</th>
                  <th style="padding: 12px 16px; text-align: left;">Product Name</th>
                  <th style="padding: 12px 16px; text-align: left;">Barcode</th>
                  <th style="padding: 12px 16px; text-align: left;">Stock</th>
                  <th style="padding: 12px 16px; text-align: right;">Retail Price</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">LAPTOP-PRO-16</td>
                  <td style="padding: 14px 16px;">Apex Pro 16-inch Workstation Laptop</td>
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5011000000018</td>
                  <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">40 units</td>
                  <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$2,499.00</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SMARTPHONE-ULTRA-5G</td>
                  <td style="padding: 14px 16px;">Apex Ultra 5G Smartphone 256GB</td>
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5011000000025</td>
                  <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">85 units</td>
                  <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$999.00</td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono); font-weight: 600;">SHIRT-OXFORD-BLU-M</td>
                  <td style="padding: 14px 16px;">Royal Oxford Cotton Shirt (Blue/M)</td>
                  <td style="padding: 14px 16px; font-family: var(--stokrova-font-mono);">5012000000011</td>
                  <td style="padding: 14px 16px; color: #4ADE80; font-weight: 600;">120 units</td>
                  <td style="padding: 14px 16px; text-align: right; font-family: var(--stokrova-font-mono); font-weight: 700;">$65.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- View: Inventory -->
        <div id="ws-view-inventory" class="ws-view-content" style="display: none;">
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">FEFO Lot Inventory Explorer</h1>
          <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 0.875rem;">Authoritative batch tracking and bin location allocations.</p>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Active Batches & Bins</div>
            <div style="color: var(--text-secondary); font-size: 0.875rem;">
              • Lot LOT-2026-MED-001 (Vaccine Ampoules) located at Bin B-02-01-01 (Qty: 500)<br>
              • Lot LOT-2026-BEV-042 (Espresso Beans) located at Bin A-01-04-02 (Qty: 250)
            </div>
          </div>
        </div>

        <!-- View: POS -->
        <div id="ws-view-pos" class="ws-view-content" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Point of Sale Register (Till 01)</h1>
              <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">High-speed offline-first barcode register and payment processing.</p>
            </div>
            <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid #1E4620; padding: 6px 14px; border-radius: 6px; font-size: 0.8125rem; color: #4ADE80; font-weight: 600;">
              ● Till Float: $250.00 Active
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px;">
            <!-- Product SKU Quick Selection -->
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
              <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: var(--text);">Quick Item Ringing & Barcode Scanner</h3>
              <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                <input id="pos-barcode-input" type="text" placeholder="Scan barcode or type SKU..." style="flex: 1; padding: 10px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 0.875rem;" onkeydown="if(event.key==='Enter') window.stokrovaCustomerApp.addBarcodeToCart()" />
                <button type="button" onclick="window.stokrovaCustomerApp.addBarcodeToCart()" style="padding: 10px 16px; background: var(--primary); color: #0E1116; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Scan</button>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button type="button" onclick="window.stokrovaCustomerApp.addItemToCart('LAPTOP-PRO-16', 'Apex Pro 16 Laptop', 2499.00)" style="padding: 12px; background: var(--card-hover); border: 1px solid var(--borderStrong); border-radius: 6px; text-align: left; cursor: pointer; color: var(--text);">
                  <div style="font-weight: 700; font-size: 0.875rem;">Apex Pro 16 Laptop</div>
                  <div style="color: var(--primary); font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$2,499.00</div>
                </button>
                <button type="button" onclick="window.stokrovaCustomerApp.addItemToCart('SMARTPHONE-ULTRA-5G', 'Apex Ultra 5G Phone', 999.00)" style="padding: 12px; background: var(--card-hover); border: 1px solid var(--borderStrong); border-radius: 6px; text-align: left; cursor: pointer; color: var(--text);">
                  <div style="font-weight: 700; font-size: 0.875rem;">Apex Ultra 5G Phone</div>
                  <div style="color: var(--primary); font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$999.00</div>
                </button>
                <button type="button" onclick="window.stokrovaCustomerApp.addItemToCart('SHIRT-OXFORD-BLU-M', 'Oxford Cotton Shirt', 65.00)" style="padding: 12px; background: var(--card-hover); border: 1px solid var(--borderStrong); border-radius: 6px; text-align: left; cursor: pointer; color: var(--text);">
                  <div style="font-weight: 700; font-size: 0.875rem;">Oxford Cotton Shirt</div>
                  <div style="color: var(--primary); font-family: var(--stokrova-font-mono); font-size: 0.8125rem; margin-top: 4px;">$65.00</div>
                </button>
              </div>
            </div>

            <!-- Active Cart & Payment -->
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column;">
              <h3 style="margin: 0 0 14px 0; font-size: 1rem; color: var(--text);">Current Register Ticket</h3>
              <div id="pos-cart-items" style="flex: 1; min-height: 140px; border-bottom: 1px solid var(--border); margin-bottom: 14px; font-size: 0.875rem;">
                <div style="color: var(--text-muted); text-align: center; padding: 40px 0;">Till ticket is empty. Scan an item to ring up sale.</div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 1.125rem; font-weight: 800; margin-bottom: 16px;">
                <span>Total Due:</span>
                <span id="pos-cart-total" style="color: var(--primary); font-family: var(--stokrova-font-mono);">$0.00</span>
              </div>

              <button id="pos-checkout-btn" disabled onclick="window.stokrovaCustomerApp.completeSale()" style="width: 100%; padding: 12px; background: var(--border); color: var(--text-muted); border: none; border-radius: 6px; font-weight: 700; font-size: 0.9375rem; cursor: not-allowed; transition: all 0.15s ease;">
                Complete Sale & Post to Ledger
              </button>
            </div>
          </div>
        </div>

        <!-- View: Ledger -->
        <div id="ws-view-ledger" class="ws-view-content" style="display: none;">
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Double-Entry General Ledger</h1>
          <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 0.875rem;">Immutable journal entries with balanced debits and credits.</p>
          <div id="ws-ledger-entries" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem; display: flex; flex-direction: column; gap: 14px;">
            <div class="ledger-row" style="border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <div style="color: #4ADE80; margin-bottom: 4px;">✓ JRNL-2026-10-001 | Sales Order SO-2026-001</div>
              <div style="color: var(--text-secondary); margin-left: 20px;">DR 1010 Cash at Bank: $2,499.00</div>
              <div style="color: var(--text-secondary); margin-left: 20px;">CR 4010 Retail Revenue: $2,499.00</div>
              <div style="color: var(--text-muted); font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced)</div>
            </div>
          </div>
        </div>
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
      todayRevenue: 38200.00,

      openRegisterModal(planId) {
        const modal = document.getElementById('modal-register');
        if (modal) modal.style.display = 'flex';
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
        if (modal) modal.style.display = 'flex';
      },

      closeLoginModal() {
        const modal = document.getElementById('modal-login');
        if (modal) modal.style.display = 'none';
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

        let tenantName = slug.toUpperCase() + ' Operations Ltd';
        let branch = 'Central Branch';
        let name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        let role = 'Business Owner (Administrator)';

        try {
          const stored = JSON.parse(localStorage.getItem('stokrova_tenants') || '{}');
          if (stored[slug]) {
            const org = stored[slug];
            tenantName = org.companyName;
            branch = org.branchName || 'Main Branch';
            if (email === org.ownerEmail.toLowerCase()) {
              name = org.ownerName;
              role = 'Business Owner (Administrator)';
            } else {
              role = 'Store Operations Staff';
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
        this.showToast(\`Added 1x \${name} to till ticket.\`);
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

        // Apply role permissions to sidebar
        const navDashboard = document.getElementById('ws-nav-dashboard');
        const navCatalog = document.getElementById('ws-nav-catalog');
        const navInventory = document.getElementById('ws-nav-inventory');
        const navPos = document.getElementById('ws-nav-pos');
        const navLedger = document.getElementById('ws-nav-ledger');

        if (userRole.includes('Cashier')) {
          navDashboard.style.display = 'none';
          navCatalog.style.display = 'flex';
          navInventory.style.display = 'none';
          navPos.style.display = 'flex';
          navLedger.style.display = 'none';
          this.showWsView('pos');
        } else if (userRole.includes('Picker')) {
          navDashboard.style.display = 'none';
          navCatalog.style.display = 'none';
          navInventory.style.display = 'flex';
          navPos.style.display = 'none';
          navLedger.style.display = 'none';
          this.showWsView('inventory');
        } else if (userRole.includes('Manager')) {
          navDashboard.style.display = 'flex';
          navCatalog.style.display = 'flex';
          navInventory.style.display = 'flex';
          navPos.style.display = 'flex';
          navLedger.style.display = 'none';
          this.showWsView('dashboard');
        } else {
          // Owner
          [navDashboard, navCatalog, navInventory, navPos, navLedger].forEach(el => el.style.display = 'flex');
          this.showWsView('dashboard');
        }
      },

      signOut() {
        document.getElementById('business-workspace-container').style.display = 'none';
        document.getElementById('customer-public-surface').style.display = 'block';
        this.showToast('You have signed out of your business workspace.');
      },

      showWsView(viewId) {
        const views = ['dashboard', 'catalog', 'inventory', 'pos', 'ledger'];
        views.forEach(v => {
          const el = document.getElementById('ws-view-' + v);
          const nav = document.getElementById('ws-nav-' + v);
          if (el) el.style.display = (v === viewId) ? 'block' : 'none';
          if (nav) {
            if (v === viewId) nav.classList.add('active');
            else nav.classList.remove('active');
          }
        });
      },

      showToast(msg) {
        const toast = document.getElementById('toast-notification');
        const toastMsg = document.getElementById('toast-message');
        if (toast && toastMsg) {
          toastMsg.textContent = msg;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      }
    };
  </script>
</body>
</html>
`;

const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(path.join(distDir, 'index.html'), completeWebsiteHtml.trim(), 'utf-8');
console.log('✅ Generated STOKROVA Customer Website & Business Portal index.html at', path.join(distDir, 'index.html'));
