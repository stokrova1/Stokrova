import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LandingViewModel } from './dist/index.js';
import { renderMasterSidebarHtml, renderAllWorkspaceViewsHtml } from '@stokrova/ui';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const landingView = new LandingViewModel('dark');

const headerHtml = landingView.renderHeaderHtml();
const heroHtml = landingView.renderHeroHtml();
const featuresHtml = landingView.renderFeaturesGridHtml();
const architectureHtml = landingView.renderArchitectureSectionHtml();
const posHtml = landingView.renderPosSectionHtml();
const pricingHtml = landingView.renderPricingSectionHtml();
const registerModalHtml = landingView.renderRegisterModalHtml();
const loginModalHtml = landingView.renderLoginModalHtml();
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
  </style>
</head>
<body>

  <!-- PUBLIC CUSTOMER SURFACE -->
  <div id="customer-public-surface">
    ${headerHtml}
    <main>
      ${heroHtml}
      ${featuresHtml}
      ${architectureHtml}
      ${posHtml}
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
          Signed in as: <strong id="ws-user-display" style="color: var(--text);">Victoria Sterling</strong>
          (<span id="ws-role-display" style="color: var(--primary); font-weight: 600;">Business Owner</span>)
        </div>
        <button onclick="window.stokrovaCustomerApp.signOut()" style="background: var(--surface); color: var(--text); border: 1px solid var(--borderStrong); padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600;">
          Sign Out →
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
        this.showToast('You have signed out of your business workspace.');
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
console.log('✅ Generated STOKROVA Customer Website & Complete Business Portal index.html at', path.join(distDir, 'index.html'));
