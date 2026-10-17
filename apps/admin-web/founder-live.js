// Founder console: refined sign-in screen + live governance panels (staff accounts, plans,
// system health, audit trail). Presentation + wiring only; every figure comes from the
// /platform-admin API, which re-checks platform-admin access on each request.
(function () {
  // Plan list comes from the server (/platform-admin/plans); these are only labels until it loads.
  let TIERS = ['RETAIL_STARTER', 'WHOLESALE_GROWTH', 'ENTERPRISE_LOGISTICS'];
  const TIER_LABEL = { SOLO_TRADER: 'Starter (retired free plan)', RETAIL_STARTER: 'Starter', WHOLESALE_GROWTH: 'Growth', ENTERPRISE_LOGISTICS: 'Enterprise', CUSTOM: 'Enterprise (custom)' };
  const money = (minor, cur) => (Number(minor) / 100).toLocaleString(undefined, { style: 'currency', currency: cur || 'USD' });
  const toMinor = (v) => { const m = String(v).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/); return m ? String(Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'))) : null; };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const apiBase = () => {
    if (window.STOKROVA_API) return window.STOKROVA_API;
    const h = location.hostname, p = location.port;
    return (h === 'localhost' || h === '127.0.0.1') && p !== '3000' && p !== '' ? 'http://localhost:3000/v1' : '/v1';
  };
  async function token() {
    const sb = window._stokrovaSupabase;
    if (!sb) return null;
    const r = await sb.auth.getSession().catch(() => null);
    return r?.data?.session?.access_token || null;
  }
  async function api(path, init = {}) {
    const t = await token();
    if (!t) return { signedOut: true };
    const headers = Object.assign({ 'Content-Type': 'application/json' }, init.headers || {}, { Authorization: 'Bearer ' + t });
    try {
      const res = await fetch(apiBase() + '/platform-admin' + path, Object.assign({}, init, { headers }));
      const body = await res.json().catch(() => null);
      if (!res.ok) return { error: res.status === 403 ? 'This account is not allowed to do that.' : (body?.message || 'The server refused the request (' + res.status + ').') };
      return { data: body };
    } catch (_e) {
      return { error: 'The Stokrova server could not be reached.' };
    }
  }
  const toast = (m) => (window.stokrovaFounder?.showToast ? window.stokrovaFounder.showToast(m) : null);
  const when = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString(); };

  // ---------- Sign-in screen polish ----------
  function polishLogin() {
    const screen = document.getElementById('admin-login-screen');
    if (!screen || screen.dataset.polished) return;
    const card = screen.firstElementChild;
    if (!card) return;
    screen.dataset.polished = '1';
    card.classList.add('fl-login-card');
  }

  // ---------- Live panels ----------
  const SECTIONS = [
    { id: 'live-accounts', icon: '👥', title: 'Staff accounts', desc: 'Every person who can sign in to any business on Stokrova. Suspending an account locks that person out everywhere at once; reactivating restores them.' },
    { id: 'live-plans', icon: '💳', title: 'Plans & prices', desc: 'Set what each plan costs and which plan each business is on. Every new business starts with a 30-day free trial; under Manage you can let a business run free, give a discount or custom price, add free days, or record a payment. A new price is used for the next invoice of every business on that plan and shows on the website straight away; moving a business switches its billing immediately. Every change is written to the audit trail.' },
    { id: 'live-health', icon: '⚡', title: 'System health', desc: 'A live check of the database, sign-in service and sync queue, refreshed every time you open this panel.' },
    { id: 'live-audit', icon: '📜', title: 'Audit trail', desc: 'A permanent record of founder actions — who did what, to which business, and when.' },
  ];

  const PAGES = [
    ['overview', 'Admin dashboard', 'The platform at a glance. Review business growth, subscription revenue and overall activity.', '.platform-kpi-grid'],
    ['tenants', 'Businesses', 'Every business, clearly organized. Review accounts, inspect their details and manage access.', '.tenant-directory-container'],
    ['users', 'Staff accounts', 'The people behind each business. Review their roles, account status and recent activity.', '#live-accounts'],
    ['plans', 'Plans & prices', 'Keep subscriptions in focus. Set plan prices and manage each business’s billing and access.', '#live-plans'],
    ['telemetry', 'System health', 'Stay close to platform reliability. Check the database, sign-in service and sync queue.', '#live-health'],
    ['audit', 'Audit trail', 'A clear history of platform changes. Review actions, business records and the reasons behind them.', '#live-audit'],
  ];

  function mountPages(host) {
    const oldHeader = host.querySelector('.founder-header');
    const enroll = oldHeader?.querySelector('button');
    oldHeader?.remove();
    host.querySelectorAll('.platform-users-container,.saas-plans-container,.telemetry-container').forEach(el => el.remove());
    PAGES.forEach(([id, title, desc, selector]) => {
      const page = document.createElement('section');
      page.className = 'fl-page'; page.dataset.page = id; page.hidden = true;
      const intro = document.createElement('header'); intro.className = 'fl-page-intro';
      intro.innerHTML = `<div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>`;
      if (id === 'tenants' && enroll) intro.append(enroll);
      page.append(intro);
      const content = host.querySelector(selector);
      if (content) page.append(content);
      host.append(page);
    });
    const sidebar = document.querySelector('.founder-sidebar');
    if (sidebar) {
      sidebar.innerHTML = '<div class="nav-header-label">STOKROVA</div>' + PAGES.map(([id, title]) => `<button type="button" class="founder-nav-item" data-page-link="${id}">${esc(title)}</button>`).join('');
      sidebar.addEventListener('click', e => { const id = e.target.closest('[data-page-link]')?.dataset.pageLink; if (id) openPage(id); });
    }
    window.stokrovaFounderPages = { open: openPage };
    openPage('overview');
  }

  function openPage(id) {
    if (!PAGES.some(p => p[0] === id)) return;
    document.querySelectorAll('.fl-page').forEach(page => { page.hidden = page.dataset.page !== id; });
    document.querySelectorAll('[data-page-link]').forEach(link => {
      const active = link.dataset.pageLink === id;
      link.classList.toggle('active', active); link.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const viewport = document.querySelector('.content-viewport'); if (viewport) viewport.scrollTop = 0;
    const loaderId = { users: 'live-accounts', plans: 'live-plans', telemetry: 'live-health', audit: 'live-audit' }[id];
    if (loaderId) LOADERS[loaderId]();
  }

  function mountPanels() {
    const host = document.getElementById('founder-portal-container');
    if (!host || document.getElementById('fl-live-root')) return;
    const root = document.createElement('div');
    root.id = 'fl-live-root';
    root.innerHTML = SECTIONS.map((s) => `
      <section class="fl-panel" id="${s.id}">
        <header><div><h3>${s.icon} ${s.title}</h3><p>${s.desc}</p></div>
          <button type="button" class="fl-btn" data-refresh="${s.id}">↻ Refresh</button></header>
        <div class="fl-body" data-body="${s.id}"><div class="fl-note">Loading…</div></div>
      </section>`).join('');
    host.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);

    mountPages(host);
  }

  const body = (id) => document.querySelector(`[data-body="${id}"]`);
  const note = (id, msg, kind = '') => { const b = body(id); if (b) b.innerHTML = `<div class="fl-note ${kind}">${esc(msg)}</div>`; };
  function guard(id, r) {
    if (r.signedOut) { note(id, 'Sign in with your founder account to load live records.'); return false; }
    if (r.error) { note(id, r.error, 'err'); return false; }
    return true;
  }

  async function loadAccounts() {
    const r = await api('/users?limit=100');
    if (!guard('live-accounts', r)) return;
    const items = (r.data?.items || []).filter(u => u.role !== 'PLATFORM_SUPER_ADMIN' && u.role !== 'PLATFORM_FOUNDER' && !u.is_platform_admin);
    if (!items.length) return note('live-accounts', 'No accounts yet.');
    body('live-accounts').innerHTML = `<div class="fl-scroll"><table class="fl-table"><thead><tr><th>Name</th><th>Email</th><th>Business</th><th>Role</th><th>Last active</th><th>Status</th><th></th></tr></thead><tbody>${items.map((u) => `
      <tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.tenantName || '—')}</td><td>${esc(u.role)}</td><td>${esc(when(u.lastActiveIso))}</td>
      <td><span class="fl-pill ${u.status === 'ACTIVE' ? 'ok' : 'bad'}">${u.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
      <td><button type="button" class="fl-btn ${u.status === 'ACTIVE' ? 'danger' : ''}" data-user="${esc(u.id)}" data-act="${u.status === 'ACTIVE' ? 'suspend' : 'reactivate'}">${u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function loadPlans() {
    const [r, pr] = await Promise.all([api('/businesses?limit=100'), api('/plans')]);
    if (!guard('live-plans', pr) || !guard('live-plans', r)) return;
    const plans = pr.data || [];
    if (plans.length) TIERS = plans.map((p) => p.tier);
    plans.forEach((p) => { TIER_LABEL[p.tier] = p.name; });
    const items = r.data?.items || [];
    const priceRows = plans.map((p) => `<tr><td><strong>${esc(p.name)}</strong><div class="fl-muted">${items.filter((b) => b.subscriptionTier === p.tier).length} businesses</div></td>
      <td><input class="fl-select" data-price-m="${esc(p.tier)}" value="${(Number(p.monthly_price_minor) / 100).toFixed(2)}" inputmode="decimal" size="9"> <span class="fl-muted">now ${esc(money(p.monthly_price_minor, p.currency))}</span></td>
      <td><input class="fl-select" data-price-a="${esc(p.tier)}" value="${(Number(p.annual_price_minor) / 100).toFixed(2)}" inputmode="decimal" size="9"> <span class="fl-muted">now ${esc(money(p.annual_price_minor, p.currency))}</span></td>
      <td><button type="button" class="fl-btn" data-save-price="${esc(p.tier)}">Save price</button></td></tr>`).join('');
    const priceTable = `<div class="fl-scroll" style="margin-bottom:18px"><table class="fl-table"><thead><tr><th>Plan</th><th>Monthly (${esc(plans[0]?.currency || 'USD')})</th><th>Yearly</th><th></th></tr></thead><tbody>${priceRows}</tbody></table></div>`;
    if (!items.length) { body('live-plans').innerHTML = priceTable + '<div class="fl-note">No businesses have signed up yet.</div>'; return; }
    body('live-plans').innerHTML = priceTable + `<div class="fl-scroll"><table class="fl-table"><thead><tr><th>Business</th><th>Owner</th><th>Status</th><th>Plan</th><th>Billing</th></tr></thead><tbody>${items.map((b) => `
      <tr><td>${esc(b.name)}</td><td>${esc(b.ownerEmail)}</td><td><span class="fl-pill ${b.status === 'ACTIVE' ? 'ok' : 'bad'}">${esc(b.status)}</span></td>
      <td><select class="fl-select" data-tier="${esc(b.id)}" data-current="${esc(b.subscriptionTier)}">${TIERS.map((t) => `<option value="${t}" ${t === b.subscriptionTier ? 'selected' : ''}>${TIER_LABEL[t]}</option>`).join('')}</select></td>
      <td><button type="button" class="fl-btn" data-billing="${esc(b.id)}">Manage</button></td></tr>
      <tr class="fl-billing-row" data-billing-row="${esc(b.id)}" hidden><td colspan="5"></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function loadHealth() {
    const r = await api('/health');
    if (!guard('live-health', r)) return;
    const h = r.data || {};
    const db = h.database || {};
    const card = (label, value, ok) => `<div class="fl-stat"><span>${label}</span><strong class="${ok ? 'ok' : 'bad'}">${esc(value)}</strong></div>`;
    body('live-health').innerHTML = `<div class="fl-stats">
      ${card('Overall', h.status === 'HEALTHY' ? 'Healthy' : 'Degraded', h.status === 'HEALTHY')}
      ${card('Database', db.connected ? db.latencyMs + ' ms' : 'Unreachable', !!db.connected)}
      ${card('Connections in use', (db.poolTotal - db.poolIdle || 0) + ' of ' + (db.poolTotal ?? '—'), !db.poolWaiting)}
      ${card('Sign-in service', h.auth?.status === 'ONLINE' ? 'Online' : 'Offline', h.auth?.status === 'ONLINE')}
      ${card('Sync queue', (h.crdt?.outboxLag ?? 0) + ' waiting', !(h.crdt?.outboxLag > 0))}
      ${card('Business isolation', h.security?.rlsActive ? 'Enforced' : 'Off', !!h.security?.rlsActive)}
    </div><div class="fl-note">Checked ${esc(when(h.timestamp))}</div>`;
  }

  async function loadAudit() {
    const r = await api('/audit?limit=50');
    if (!guard('live-audit', r)) return;
    const items = r.data?.items || [];
    if (!items.length) return note('live-audit', 'No founder actions recorded yet.');
    body('live-audit').innerHTML = `<div class="fl-scroll"><table class="fl-table"><thead><tr><th>When</th><th>Action</th><th>Business</th><th>By</th><th>Details</th></tr></thead><tbody>${items.map((a) => `
      <tr><td>${esc(when(a.createdAt))}</td><td>${esc(String(a.eventType || '').replace(/_/g, ' ').toLowerCase())}</td><td>${esc(a.tenantId || '—')}</td><td>Administrator</td>
      <td class="fl-muted">${esc(a.payload?.reason || a.payload?.newTier || (a.payload?.monthly ? money(a.payload.monthly) + ' / month' : '') || (a.payload ? JSON.stringify(a.payload).slice(0, 80) : ''))}</td></tr>`).join('')}</tbody></table></div>`;
  }

  const STATE_TEXT = { TRIAL: 'On free trial', OPEN: 'Paid up', FREE: 'Running free (founder)', CLOSED: 'Closed — unpaid invoice' };
  async function toggleBilling(id, forceOpen) {
    const row = document.querySelector(`[data-billing-row="${CSS.escape(id)}"]`);
    if (!row) return;
    if (!row.hidden && !forceOpen) { row.hidden = true; return; }
    row.hidden = false;
    const cell = row.firstElementChild;
    cell.innerHTML = '<div class="fl-note">Loading…</div>';
    const r = await api(`/businesses/${encodeURIComponent(id)}/billing`);
    if (r.error || r.signedOut) { cell.innerHTML = `<div class="fl-note err">${esc(r.error || 'Sign in again to continue.')}</div>`; return; }
    const { access = {}, invoices = [], subscription = {} } = r.data || {};
    const g = subscription.plan_grants || {};
    const gl = g.limits || {};
    const lim = (k) => (k in gl ? (gl[k] === null ? 'unlimited' : gl[k]) : '');
    const o = access.override || { mode: 'NONE' };
    const open = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID');
    cell.innerHTML = `<div class="fl-billing" data-for="${esc(id)}">
      <div class="fl-stats">
        <div class="fl-stat"><span>Access</span><strong class="${access.state === 'CLOSED' ? 'bad' : 'ok'}">${esc(STATE_TEXT[access.state] || access.state)}</strong></div>
        <div class="fl-stat"><span>Free trial</span><strong>${access.trial_days_left ? esc(access.trial_days_left) + ' days left' : 'Ended'}</strong></div>
        <div class="fl-stat"><span>Unpaid invoices</span><strong class="${open.length ? 'bad' : 'ok'}">${open.length}</strong></div>
      </div>
      <div class="fl-bill-form">
        <label>How this business pays<select class="fl-select" data-f="mode">
          <option value="NONE" ${o.mode === 'NONE' ? 'selected' : ''}>Normal plan price</option>
          <option value="FREE" ${o.mode === 'FREE' ? 'selected' : ''}>Run free — never billed</option>
          <option value="DISCOUNT_PERCENT" ${o.mode === 'DISCOUNT_PERCENT' ? 'selected' : ''}>Discount (%)</option>
          <option value="FIXED_PRICE" ${o.mode === 'FIXED_PRICE' ? 'selected' : ''}>Custom monthly price</option></select></label>
        <label>Discount % or price<input class="fl-select" data-f="value" size="9" value="${esc(o.mode === 'FIXED_PRICE' ? (Number(o.value) / 100).toFixed(2) : o.value || '')}"></label>
        <label>Reason<input class="fl-select" data-f="note" size="22" value="${esc(o.note || '')}"></label>
        <button type="button" class="fl-btn" data-bill-act="override">Save billing</button>
        <label>Extra free days<input class="fl-select" data-f="days" size="5" value="30" inputmode="numeric"></label>
        <button type="button" class="fl-btn" data-bill-act="extend">Extend trial</button>
      </div>
      <div class="fl-bill-form">
        <label>Staff<input class="fl-select" data-f="max_users" size="7" placeholder="plan" value="${esc(lim('max_users'))}"></label>
        <label>Branches<input class="fl-select" data-f="max_branches" size="7" placeholder="plan" value="${esc(lim('max_branches'))}"></label>
        <label>Tills<input class="fl-select" data-f="max_active_registers" size="7" placeholder="plan" value="${esc(lim('max_active_registers'))}"></label>
        <label>Warehouses<input class="fl-select" data-f="max_warehouses" size="7" placeholder="plan" value="${esc(lim('max_warehouses'))}"></label>
        <label>Extra pages (e.g. workflows, mo)<input class="fl-select" data-f="features" size="22" value="${esc((g.features || []).join(', '))}"></label>
        <label>Reason<input class="fl-select" data-f="gnote" size="18"></label>
        <button type="button" class="fl-btn" data-bill-act="grants">Save plan extras</button>
      </div>
      <div class="fl-note">Leave a limit empty to use the plan's normal limit, or type "unlimited".</div>
      ${open.length ? `<table class="fl-table"><thead><tr><th>Unpaid invoice</th><th>Period</th><th>Amount</th><th></th></tr></thead><tbody>${open.map((i) => `<tr><td>${esc(i.invoice_number)}</td><td>${esc(when(i.period_start))}</td><td>${esc(money(i.total_minor, i.currency))}</td><td><button type="button" class="fl-btn" data-bill-act="paid" data-inv="${esc(i.id)}">Mark paid</button></td></tr>`).join('')}</tbody></table>` : ''}
      <div class="fl-note">Changes apply from the next invoice. "Run free" also reopens a closed workspace straight away.</div></div>`;
  }

  async function billingAction(btn) {
    const box = btn.closest('.fl-billing');
    const id = box.dataset.for;
    const f = (k) => box.querySelector(`[data-f="${k}"]`)?.value?.trim() ?? '';
    let r;
    btn.disabled = true;
    if (btn.dataset.billAct === 'override') {
      const mode = f('mode');
      let value = f('value');
      if (mode === 'FIXED_PRICE') { value = toMinor(value); if (value === null) { btn.disabled = false; return toast('Enter a price like 25 or 25.50.'); } }
      if ((mode === 'FREE' || mode === 'DISCOUNT_PERCENT' || mode === 'FIXED_PRICE') && !f('note')) { btn.disabled = false; return toast('Please give a reason.'); }
      r = await api(`/businesses/${encodeURIComponent(id)}/billing`, { method: 'PATCH', body: JSON.stringify({ mode, value, note: f('note') }) });
    } else if (btn.dataset.billAct === 'grants') {
      if (!f('gnote')) { btn.disabled = false; return toast('Please give a reason.'); }
      const limits = {};
      for (const k of ['max_users', 'max_branches', 'max_active_registers', 'max_warehouses']) {
        const v = f(k).toLowerCase();
        if (v === 'unlimited') limits[k] = null; else if (v) limits[k] = Number(v);
      }
      const features = f('features').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
      r = await api(`/businesses/${encodeURIComponent(id)}/entitlements`, { method: 'PATCH', body: JSON.stringify({ features, limits, note: f('gnote') }) });
    } else if (btn.dataset.billAct === 'extend') {
      r = await api(`/businesses/${encodeURIComponent(id)}/extend-trial`, { method: 'POST', body: JSON.stringify({ days: Number(f('days')) }) });
    } else {
      const reference = (window.prompt('Payment reference (e.g. bank transfer details):') || '').trim();
      if (!reference) { btn.disabled = false; return toast('A payment reference is required.'); }
      r = await api(`/businesses/${encodeURIComponent(id)}/invoices/${encodeURIComponent(btn.dataset.inv)}/mark-paid`, { method: 'POST', body: JSON.stringify({ reference }) });
    }
    btn.disabled = false;
    if (r.error || r.signedOut) return toast(r.error || 'Sign in again to continue.');
    toast('Saved.');
    toggleBilling(id, true); loadAudit();
  }

  const LOADERS = { 'live-accounts': loadAccounts, 'live-plans': loadPlans, 'live-health': loadHealth, 'live-audit': loadAudit };

  async function onClick(e) {
    const refresh = e.target.closest('[data-refresh]')?.dataset.refresh;
    if (refresh) return LOADERS[refresh]();
    const manage = e.target.closest('[data-billing]');
    if (manage) return toggleBilling(manage.dataset.billing);
    const billAct = e.target.closest('[data-bill-act]');
    if (billAct) return billingAction(billAct);
    const save = e.target.closest('[data-save-price]');
    if (save) {
      const tier = save.dataset.savePrice;
      const m = toMinor(document.querySelector(`[data-price-m="${tier}"]`).value);
      const a = toMinor(document.querySelector(`[data-price-a="${tier}"]`).value);
      if (m === null || a === null) return toast('Enter prices like 49 or 49.99.');
      if (!window.confirm(`Set ${TIER_LABEL[tier]} to ${money(m)} a month and ${money(a)} a year? Every business on this plan pays this from its next invoice.`)) return;
      save.disabled = true;
      const r = await api(`/plans/${encodeURIComponent(tier)}`, { method: 'PATCH', body: JSON.stringify({ monthly_price_minor: m, annual_price_minor: a }) });
      save.disabled = false;
      if (r.error || r.signedOut) return toast(r.error || 'Sign in again to continue.');
      toast('Price saved.');
      return loadPlans();
    }
    const btn = e.target.closest('[data-user]');
    if (!btn) return;
    const act = btn.dataset.act;
    const reason = (window.prompt(act === 'suspend' ? 'Why are you suspending this account?' : 'Why are you reactivating this account?') || '').trim();
    if (!reason) return toast('A reason is required.');
    btn.disabled = true;
    const r = await api(`/users/${encodeURIComponent(btn.dataset.user)}/${act}`, { method: 'POST', body: JSON.stringify({ reason }) });
    if (r.error || r.signedOut) { btn.disabled = false; return toast(r.error || 'Sign in again to continue.'); }
    toast(act === 'suspend' ? 'Account suspended.' : 'Account reactivated.');
    loadAccounts(); loadAudit();
  }

  async function onChange(e) {
    const sel = e.target.closest('[data-tier]');
    if (!sel) return;
    if (!window.confirm(`Move this business to ${TIER_LABEL[sel.value]}?`)) { sel.value = sel.dataset.current; return; }
    sel.disabled = true;
    const r = await api(`/businesses/${encodeURIComponent(sel.dataset.tier)}/tier`, { method: 'PATCH', body: JSON.stringify({ tier: sel.value }) });
    sel.disabled = false;
    if (r.error || r.signedOut) { sel.value = sel.dataset.current; return toast(r.error || 'Sign in again to continue.'); }
    sel.dataset.current = sel.value;
    toast('Plan updated.');
    loadPlans(); loadAudit();
  }

  function css() {
    if (document.getElementById('fl-style')) return;
    const s = document.createElement('style');
    s.id = 'fl-style';
    s.textContent = `
      .fl-page[hidden]{display:none!important}
      .fl-page-intro{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 26px;margin-bottom:24px;border-block:1px solid var(--primary);background:var(--primary);color:var(--primary-fg)}
      .fl-page-intro h1{font-size:1.75rem;line-height:1.3;margin:0 0 8px;font-weight:800;letter-spacing:0}
      .fl-page-intro p{font-size:.875rem;line-height:1.6;margin:0;max-width:760px}
      .fl-page-intro button{border:1px solid currentColor!important}
      .founder-sidebar button.founder-nav-item{background:transparent;border:0;text-align:left;font-family:inherit;flex-shrink:0}
      .founder-sidebar button.founder-nav-item.active{background:color-mix(in srgb,var(--primary) 15%,transparent);border-left:3px solid var(--primary)}
      .fl-page .fl-panel{border:0;background:transparent;padding:0}
      .fl-page .fl-panel header h3,.fl-page .fl-panel header p{display:none}
      .fl-page .fl-panel header{justify-content:flex-end}
      #fl-live-root{display:none!important}
      .content-viewport{min-width:0}
      @media(max-width:760px){.founder-sidebar{width:170px;min-width:170px}.content-viewport{padding:18px 14px}.fl-page-intro{padding:20px 18px;flex-wrap:wrap}.founder-top-bar{padding:10px 14px}}
      @media(max-width:520px){.app-layout{flex-direction:column}.founder-sidebar{width:100%;min-width:0;flex-direction:row;overflow-x:auto;padding:8px;border-right:0}.founder-sidebar .nav-header-label{display:none}.founder-sidebar button.founder-nav-item{white-space:nowrap}.fl-page-intro h1{overflow-wrap:anywhere}}
      .fl-login-wrap{display:flex;width:100%;max-width:980px;align-items:stretch;gap:0;border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55);animation:flIn .35s ease-out}
      .fl-login-wrap>div{border-radius:0 12px 12px 0!important;box-shadow:none!important;max-width:460px!important;flex:1 1 460px}
      .fl-login-side{flex:1 1 420px;padding:40px 36px;background:linear-gradient(160deg,rgba(189,150,82,.16),rgba(22,27,30,.96) 60%);border:1px solid rgba(189,150,82,.25);border-right:none;border-radius:12px 0 0 12px;color:#ACB8C3;display:flex;flex-direction:column;gap:14px}
      .fl-brand{display:flex;gap:8px;color:#BD9652;font-weight:900;letter-spacing:.12em}
      .fl-login-side h2{margin:6px 0 0;color:#F8FAFC;line-height:1.3}
      .fl-login-side p{margin:0;line-height:1.6}
      .fl-login-side ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
      .fl-login-side li{display:flex;gap:12px;align-items:flex-start;line-height:1.5}
      .fl-login-side li span{width:32px;height:32px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(189,150,82,.12);border:1px solid rgba(189,150,82,.3)}
      .fl-login-side strong{display:block;color:#F8FAFC}
      .fl-side-foot{margin-top:auto;padding-top:14px;border-top:1px solid rgba(189,150,82,.2);color:#7E919F}
      @media (max-width:860px){.fl-login-side{display:none}.fl-login-wrap>div{border-radius:12px!important}}
      @keyframes flIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      #fl-live-root{display:flex;flex-direction:column;gap:20px;margin-top:24px}
      .fl-panel{background:var(--card,#1E2428);border:1px solid var(--border,#333D46);border-radius:10px;padding:20px;scroll-margin-top:16px}
      .fl-panel header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
      .fl-panel h3{margin:0;color:var(--text-primary,#F8FAFC)}
      .fl-panel p{margin:4px 0 0;color:var(--text-muted,#7E919F);line-height:1.5;max-width:640px}
      .fl-btn{background:#293136;border:1px solid #414F5A;color:#F8FAFC;padding:6px 12px;border-radius:6px;cursor:pointer;white-space:nowrap;transition:background .15s}
      .fl-btn:hover{background:#333D46}.fl-btn:disabled{opacity:.5;cursor:wait}
      .fl-btn.danger{border-color:rgba(248,113,113,.4);color:#F87171;background:rgba(248,113,113,.08)}
      .fl-scroll{overflow-x:auto}
      .fl-table{width:100%;border-collapse:collapse}
      .fl-table th{text-align:left;color:var(--text-muted,#7E919F);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--border,#333D46);white-space:nowrap}
      .fl-table td{padding:10px;border-bottom:1px solid rgba(51,61,70,.5);color:var(--text-secondary,#CBD5E1)}
      .fl-table tr:hover td{background:rgba(189,150,82,.04)}
      .fl-pill{padding:2px 8px;border-radius:9999px;border:1px solid}
      .fl-pill.ok{color:#4ADE80;border-color:rgba(74,222,128,.3);background:rgba(74,222,128,.1)}
      .fl-pill.bad{color:#F87171;border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.1)}
      .fl-select{background:#161B1E;color:#F8FAFC;border:1px solid #414F5A;border-radius:6px;padding:5px 8px}
      .fl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:14px}
      .fl-stat{background:#161B1E;border:1px solid var(--border,#333D46);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;color:var(--text-muted,#7E919F)}
      .fl-stat strong{color:#F8FAFC}.fl-stat strong.ok{color:#4ADE80}.fl-stat strong.bad{color:#F87171}
      .fl-bill-form{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:4px 0 12px}.fl-bill-form label{display:flex;flex-direction:column;gap:4px;color:var(--text-muted,#7E919F)}.fl-billing{padding:6px 4px}
      .fl-note{color:var(--text-muted,#7E919F);padding:6px 0}.fl-note.err{color:#F87171}.fl-muted{color:var(--text-muted,#7E919F)}`;
    document.head.appendChild(s);
  }

  function start() {
    css();
    polishLogin();
    const layout = document.getElementById('admin-authenticated-layout');
    const check = () => { if (!layout || layout.style.display !== 'none') mountPanels(); };
    check();
    if (layout) new MutationObserver(check).observe(layout, { attributes: true, attributeFilter: ['style'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
