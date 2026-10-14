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
        <span style="font-size: 0.75rem; background: #14291F; color: #4ADE80; border: 1px solid #1E4620; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">ACTIVE (Rule 21)</span>
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">Victoria Sterling</strong>
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
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--text); font-family: var(--stokrova-font-mono); margin-top: 6px;">$38,200.00</div>
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
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Point of Sale Register (Till 01)</h1>
          <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 0.875rem;">High-speed offline-first barcode register and payment processing.</p>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 12px;">💳</div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text);">Cashier Till Session Active</div>
            <p style="color: var(--text-secondary); font-size: 0.875rem; max-width: 440px; margin: 8px auto 16px auto;">Till float: $250.00. Ready for barcode scanning or quick SKU selection.</p>
            <button onclick="window.stokrovaCustomerApp.showToast('Sale ringing simulation: 1x LAPTOP-PRO-16 added to cart.')" style="background: var(--primary); color: #0E1116; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; cursor: pointer;">
              Scan SKU / Add to Cart
            </button>
          </div>
        </div>

        <!-- View: Ledger -->
        <div id="ws-view-ledger" class="ws-view-content" style="display: none;">
          <h1 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Double-Entry General Ledger</h1>
          <p style="margin: 0 0 20px 0; color: var(--text-secondary); font-size: 0.875rem;">Immutable journal entries with balanced debits and credits.</p>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; font-family: var(--stokrova-font-mono); font-size: 0.8125rem;">
            <div style="color: #4ADE80; margin-bottom: 4px;">✓ JRNL-2026-10-001 | Sales Order SO-2026-001</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">DR 1010 Cash at Bank: $2,499.00</div>
            <div style="color: var(--text-secondary); margin-left: 20px;">CR 4010 Retail Revenue: $2,499.00</div>
            <div style="color: var(--text-muted); font-size: 0.75rem; margin-left: 20px; margin-top: 2px;">Delta: $0.00 (Balanced)</div>
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

      fillDemoLogin(persona) {
        const emailInput = document.getElementById('login-email');
        const slugInput = document.getElementById('login-slug');
        if (!emailInput || !slugInput) return;

        slugInput.value = 'apex';
        if (persona === 'OWNER') {
          emailInput.value = 'victoria@apex.com';
        } else if (persona === 'MANAGER') {
          emailInput.value = 'david.oconnor@apex.com';
        } else if (persona === 'CASHIER') {
          emailInput.value = 'emma.watson@apex.com';
        } else if (persona === 'PICKER') {
          emailInput.value = 'samuel.adebayo@apex.com';
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
        const branchName = document.getElementById('reg-branch-name').value.trim() || 'Flagship Store';

        this.closeRegisterModal();
        this.showToast(\`✓ Organization '\${companyName}' provisioned! Tenant: \${slug}. Launching workspace...\`);

        setTimeout(() => {
          this.launchWorkspace({
            tenantName: companyName,
            branchName: branchName,
            userName: ownerName,
            userRole: 'Business Owner (Administrator)',
          });
        }, 800);
      },

      handleLoginSubmit(e) {
        e.preventDefault();
        const slug = document.getElementById('login-slug').value.trim();
        const email = document.getElementById('login-email').value.trim().toLowerCase();

        this.closeLoginModal();

        let role = 'Business Owner';
        let name = 'Victoria Sterling';
        let branch = 'London Flagship';

        if (email.includes('david')) {
          role = 'Store Manager';
          name = 'David O\\'Connor';
          branch = 'London Flagship';
        } else if (email.includes('emma')) {
          role = 'POS Cashier';
          name = 'Emma Watson';
          branch = 'London Till 01';
        } else if (email.includes('samuel')) {
          role = 'Warehouse Picker';
          name = 'Samuel Adebayo';
          branch = 'Amsterdam DC';
        }

        this.showToast(\`✓ Signed in as \${name} (\${role})\`);
        this.launchWorkspace({
          tenantName: slug.toUpperCase() + ' Operations Ltd',
          branchName: branch,
          userName: name,
          userRole: role,
        });
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
