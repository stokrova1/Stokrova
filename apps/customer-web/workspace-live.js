/*
 * Connects each owner-workspace page to the signed-in company's real records.
 * Signed in: the page's sample content is replaced by that company's records from the server
 * (or an honest "no records yet" message). Signed out: the labeled sample workspace stays.
 */
import { resolveLiveConfig } from './executive-live.js';

const T = '{tenant}';
/** Page id -> [section title, server path]. Paths match the repository's API controllers. */
export const PAGE_SOURCES = {
  pos: [['Products at the till — current price & stock', '/pos/products'], ['Registers', '/pos/registers']],
  'cashier-desk': [['Registers', '/registers'], ['Returns waiting for approval', '/returns']],
  orders: [['Sales orders', '/orders']],
  invoices: [['Invoices', '/invoices'], ['Payments & refunds', '/payments']],
  quotes: [['Quotations', '/quotations'], ['B2B organizations', '/b2b/organizations']],
  crm: [['Customers', '/customers'], ['Leads', '/crm/leads'], ['Opportunities', '/crm/opportunities']],
  pricing: [['Price lists', '/pricing/pricelists'], ['Tax rates', '/pricing/taxes']],
  promotions: [['Campaigns', '/crm/campaigns']],
  loyalty: [['Customer groups', '/customers/groups']],
  catalog: [['Prices & stock right now', '/pos/products'], ['Products & variants', '/catalog/variants'], ['Brands', '/catalog/brands'], ['Categories', '/catalog/categories']],
  ledger: [['Stock movements', '/inventory/ledger']],
  locations: [['Locations', '/warehouses/locations'], ['Zones', '/warehouses/zones']],
  availability: [['Stock balances', '/inventory/balances'], ['Reservations', '/inventory/reservations']],
  suppliers: [['Suppliers', '/procurement/suppliers']],
  po: [['Purchase orders', `/tenants/${T}/procurement/purchase-orders`], ['Purchase requests', `/tenants/${T}/procurement/purchase-requests`]],
  receiving: [['Goods receipts', `/tenants/${T}/procurement/goods-receipts`], ['Supplier bills', `/tenants/${T}/procurement/purchase-invoices`]],
  picking: [['Pick lists', '/warehouses/pick-lists'], ['Waves', '/warehouses/waves']],
  dispatch: [['Shipments', '/logistics/shipments'], ['Fulfillments', '/logistics/fulfillments']],
  fleet: [['Delivery runs', '/delivery/runs'], ['Vehicles', '/delivery/vehicles'], ['Drivers', '/delivery/drivers']],
  bom: [['Bills of materials', `/tenants/${T}/manufacturing/boms`]],
  mo: [['Production orders', `/tenants/${T}/manufacturing/orders`], ['Work centers', `/tenants/${T}/manufacturing/work-centers`]],
  accountant: [['Trial balance', '/finance/reports/trial-balance']],
  registers: [['Registers', '/registers']],
  gl: [['Journal entries', '/finance/journal-entries'], ['Accounts', '/finance/accounts']],
  tax: [['Fiscal entities', '/fiscal/entities'], ['Tax rates', '/pricing/taxes']],
  treasury: [['Cash flow', '/finance/reports/cash-flow']],
  consolidation: [['Holding groups', '/integrations/holding-groups'], ['Inter-company transfers', '/integrations/inter-company/transfers']],
  abc: [['Dead stock', '/analytics/dead-stock'], ['Stock turnover', '/analytics/turnover']],
  audit: [['Audit trail', '/audit']],
  compliance: [['Security events', '/audit/security']],
  workflows: [['Workflows', '/workflows'], ['Task queue', '/workflows/tasks/queue']],
  org: [['Branches', '/branches'], ['Work centers', '/work-centers']],
  rbac: [['Roles', '/rbac/roles'], ['Invitations', '/rbac/invitations']],
  devices: [['Devices', '/devices'], ['Hardware', '/hardware/devices']],
  billing: [['Free trial & workspace access', '/billing/access'], ['Your Stokrova plan', '/billing/subscription'], ['Plan invoices — what you owe Stokrova', '/billing/invoices'], ['Plans & current prices', '/billing/plans']],
  integrations: [['Webhooks', '/integrations/webhooks/subscriptions'], ['EDI partners', '/edi/partners'], ['Connections', '/integrations/instances']],
};

/**
 * List path -> create form. Fields mirror the server's required create rules
 * (packages/validation); the server validates again and its message is shown as-is.
 */
export const CREATE_FORMS = {
  '/customers': { label: 'Add customer', fields: [['customer_code', 'Customer code', true], ['display_name', 'Name', true], ['email', 'Email'], ['phone', 'Phone']] },
  '/crm/leads': { label: 'Add lead', fields: [['first_name', 'First name', true], ['last_name', 'Last name', true], ['company_name', 'Company'], ['email', 'Email']] },
  '/procurement/suppliers': { label: 'Add supplier', fields: [['name', 'Supplier name', true], ['code', 'Code (letters, numbers, -)', true], ['email', 'Email'], ['phone', 'Phone']] },
  '/catalog/brands': { label: 'Add brand', fields: [['name', 'Brand name', true], ['code', 'Code', true], ['description', 'Description']] },
  '/catalog/categories': { label: 'Add category', fields: [['name', 'Category name', true], ['code', 'Code', true]] },
};

/**
 * Menu page -> permission codes (any one is enough). Signed in, the menu shows only the pages the
 * person's real roles allow (from /rbac/assignments/me); a test checks these match the server.
 */
export const PAGE_PERMISSIONS = {
  billing: ['billing.manage'],
  dashboard: ['analytics.view'],
  pos: ['register.open', 'pos.checkout'],
  'cashier-desk': ['register.open'],
  orders: ['sales.order.view'],
  invoices: ['sales.invoice.view'],
  quotes: ['sales.quotation.view'],
  crm: ['customers.view', 'crm.lead.view', 'crm.opportunity.view'],
  pricing: ['catalog.view', 'catalog.manage'],
  promotions: ['crm.campaign.view'],
  loyalty: ['customers.view'],
  catalog: ['catalog.view'],
  ledger: ['inventory.view'],
  locations: ['warehouses.view'],
  availability: ['inventory.view'],
  suppliers: ['purchases.create'],
  po: ['procurement.order.view', 'purchases.create'],
  receiving: ['purchases.receive', 'procurement.receipt.create'],
  picking: ['warehouses.view'],
  dispatch: ['logistics.shipment.view', 'logistics.fulfillment.view'],
  fleet: ['delivery.view'],
  bom: ['manufacturing.bom.view'],
  mo: ['manufacturing.order.view'],
  accountant: ['accounting.reports.view'],
  registers: ['registers.manage', 'register.open'],
  gl: ['accounting.journals.view', 'accounting.accounts.view'],
  tax: ['tax.view', 'tax.manage'],
  treasury: ['accounting.reports.view', 'treasury.view'],
  consolidation: ['finance.view', 'consolidation.view'],
  abc: ['analytics.view'],
  audit: ['audit.view'],
  compliance: ['audit.view'],
  workflows: ['approvals.manage'],
  org: ['branches.manage'],
  rbac: ['staff.manage', 'roles.manage'],
  devices: ['devices.manage'],
  integrations: ['integration.view', 'edi.manage'],
  rebranding: ['roles.manage'],
};

/** Pages a set of granted permission codes may open. Owners hold '*' or every code. */
export function visiblePages(granted) {
  const has = new Set(granted);
  return Object.keys(PAGE_PERMISSIONS).filter((id) => has.has('*') || PAGE_PERMISSIONS[id].some((c) => has.has(c)));
}

/** Pages shown = pages the person's role allows AND pages the business's plan includes. */
export function menuPages(rolePages, planPages) {
  if (!Array.isArray(planPages)) return rolePages;
  const plan = new Set(planPages);
  return rolePages.filter((id) => plan.has(id));
}

let ENTITLEMENTS = null;
async function loadEntitlements(cfg) {
  const res = await fetch(apiUrl(cfg, '/billing/entitlements'), { headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId } });
  ENTITLEMENTS = res.ok ? await res.json() : null;
  return ENTITLEMENTS;
}

async function applyRoleMenu(cfg) {
  const res = await fetch(apiUrl(cfg, '/rbac/assignments/me'), { headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId } });
  if (!res.ok) return;
  const allowed = new Set(menuPages(visiblePages(toRows(await res.json()).flatMap((a) => a.permissions || [])), ENTITLEMENTS?.pages));
  const items = [...document.querySelectorAll('.workspace-nav-item[data-view-id]')];
  items.forEach((item) => { item.style.display = allowed.has(item.getAttribute('data-view-id')) ? 'flex' : 'none'; });
  const active = document.querySelector('.workspace-nav-item.active');
  if (active && active.style.display === 'none') items.find((i) => i.style.display !== 'none')?.click();
}

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SKIP = /^(id|tenant_id|company_id|.*_hash|password.*|metadata|.*_json)$/;

/** Accepts the API's list shapes ([...], {data}, {items}, {rows}) and returns rows. */
export function toRows(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    for (const k of ['data', 'items', 'rows', 'results', 'entries']) if (Array.isArray(body[k])) return body[k];
    return [body];
  }
  return [];
}

const cell = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return Array.isArray(v) ? `${v.length} item${v.length === 1 ? '' : 's'}` : '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
  return String(v);
};

export function renderRows(rows) {
  if (!rows.length) return '<p class="stk-demo-description">No records yet. Records you create here appear immediately.</p>';
  const cols = Object.keys(rows[0]).filter((k) => !SKIP.test(k) && typeof rows[0][k] !== 'object').slice(0, 6);
  const head = cols.map((c) => `<th>${esc(c.replace(/_minor$/, '').replace(/_/g, ' '))}</th>`).join('');
  const show = (c, v) => (/_minor$/.test(c) && v !== null && v !== undefined && v !== '' && !isNaN(Number(v))
    ? (Number(v) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : cell(v));
  const body = rows.slice(0, 50).map((r) => `<tr>${cols.map((c) => `<td>${esc(show(c, r[c]))}</td>`).join('')}</tr>`).join('');
  return `<div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    + (rows.length > 50 ? `<p class="stk-demo-label">Showing 50 of ${rows.length} records.</p>` : '');
}

const apiUrl = (cfg, path) => cfg.baseUrl.replace(/\/$/, '') + '/v1' + path.replace(T, encodeURIComponent(cfg.tenantId));

/** Field kinds: text (default), money (entered as 12.50, sent as minor units), int, date, pick:<list path>, one of [...]. */
const toMinor = (v) => { const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100)) : null; };
function convert(kind, v) {
  if (kind === 'money') return toMinor(v);
  if (kind === 'int') { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; }
  if (kind === 'date') { const d = new Date(v + 'T00:00:00Z'); return isNaN(d) ? null : d.toISOString(); }
  return v;
}

/**
 * Turns the form into the save body. Blank optional boxes are left out, never filled with defaults;
 * line items need a product and a whole-number quantity, and at least one line when the form has lines.
 */
export function formBody(form, data) {
  const body = { ...(form.fixed || {}) };
  for (const [name, , required, kind] of form.fields) {
    const v = String(data[name] ?? '').trim();
    if (!v) { if (required) return { error: 'Please fill in every required box.' }; continue; }
    const c = convert(kind, v);
    if (c === null) return { error: 'Please check the amounts and dates you entered.' };
    body[name] = c;
  }
  if (form.lines) {
    const lines = [];
    for (const row of data.lines || []) {
      if (!row.variant_id && !row.quantity) continue;
      const qty = convert('int', row.quantity);
      if (!row.variant_id || qty === null) return { error: 'Each line needs a product and a whole-number quantity.' };
      const line = { variant_id: row.variant_id, quantity: qty };
      if (String(row.price ?? '').trim()) {
        const m = toMinor(row.price);
        if (m === null) return { error: 'Please check the line prices.' };
        line[form.lines.price] = m;
      } else if (form.lines.priceRequired) return { error: 'Each line needs a price.' };
      lines.push(line);
    }
    if (!lines.length) return { error: 'Add at least one line item.' };
    body.lines = lines;
  }
  return { body };
}

const productLines = { price: 'unit_price_minor', priceRequired: true };
const WAREHOUSE = ['warehouse_id', 'Warehouse', true, 'pick:/warehouses'];
const BRANCH = ['branch_id', 'Branch', true, 'pick:/branches'];
CREATE_FORMS['/orders'] = { label: 'Save order', fixed: { channel_type: 'MANUAL' }, fields: [BRANCH, WAREHOUSE, ['customer_id', 'Customer', false, 'pick:/customers'], ['customer_name', 'Or walk-in customer name'], ['notes', 'Notes']], lines: productLines };
CREATE_FORMS['/quotations'] = { label: 'Save quotation', fields: [BRANCH, WAREHOUSE, ['customer_id', 'Customer', false, 'pick:/customers'], ['customer_name', 'Or customer name'], ['valid_until', 'Valid until', false, 'date']], lines: { price: 'unit_price_minor' } };
CREATE_FORMS[`/tenants/${T}/procurement/purchase-orders`] = { label: 'Save purchase order', fields: [['supplier_id', 'Supplier', true, 'pick:/procurement/suppliers'], ['destination_warehouse_id', 'Deliver to warehouse', true, 'pick:/warehouses'], ['expected_delivery_date', 'Expected delivery', false, 'date'], ['notes', 'Notes']], lines: { price: 'unit_cost_minor', priceRequired: true } };
CREATE_FORMS['/invoices'] = { label: 'Invoice this order', fields: [['order_id', 'Order', true, 'pick:/orders'], ['due_date', 'Due date', false, 'date'], ['notes', 'Notes']] };
CREATE_FORMS['/warehouses/locations'] = { label: 'Add storage location', fields: [['warehouse_id', 'Warehouse', true, 'pick:/warehouses'], ['code', 'Code', true], ['name', 'Name', true], ['type', 'Type', true, ['INTERNAL_STORAGE', 'PICKING_FACE', 'RECEIVING']]] };
CREATE_FORMS['/warehouses/zones'] = { label: 'Add zone', fields: [['warehouse_id', 'Warehouse', true, 'pick:/warehouses'], ['code', 'Code (letters, numbers, -)', true], ['name', 'Name', true], ['zone_type', 'Zone type', true, ['BULK_STORAGE', 'PICKING', 'COLD_CHAIN', 'HAZMAT', 'STAGING', 'CROSS_DOCK']]] };
CREATE_FORMS[`/tenants/${T}/manufacturing/orders`] = { label: 'Plan production order', fields: [['variant_id', 'Product to make', true, 'pick:/catalog/variants'], ['bom_id', 'Bill of materials', true, `pick:/tenants/${T}/manufacturing/boms`], ['warehouse_id', 'Warehouse', true, 'pick:/warehouses'], ['destination_location_id', 'Put finished goods in', true, 'pick:/warehouses/locations'], ['target_quantity', 'Quantity to make', true, 'int'], ['notes', 'Notes']] };
CREATE_FORMS['/payments'] = [
  { label: 'Record payment', fields: [['invoice_id', 'Invoice', false, 'pick:/invoices'], ['order_id', 'Or order', false, 'pick:/orders'], ['amount_minor', 'Amount', true, 'money'], ['payment_method', 'Method', true, ['CASH', 'BANK_TRANSFER']], ['provider_reference', 'Reference']] },
  { label: 'Refund payment', post: '/payments/{id}/refund', fields: [['id', 'Payment', true, 'pick:/payments'], ['amount_minor', 'Amount (blank = full)', false, 'money'], ['reason', 'Reason']] },
];

const optionLabel = (r) => [r.order_number || r.invoice_number || r.quotation_number || r.po_number, r.display_name || r.name || r.sku || r.code, r.amount_minor ? (Number(r.amount_minor) / 100).toFixed(2) : null, r.status].filter(Boolean).join(' · ') || r.id;
async function fillPicker(cfg, select, path) {
  try {
    const res = await fetch(apiUrl(cfg, path), { headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId } });
    const rows = res.ok ? toRows(await res.json()).map((r) => r.variant || r.order || r.invoice || r) : [];
    select.innerHTML = `<option value="">${rows.length ? 'Choose…' : 'None yet'}</option>` + rows.slice(0, 200).map((r) => `<option value="${esc(r.id)}">${esc(optionLabel(r))}</option>`).join('');
  } catch { select.innerHTML = '<option value="">Could not load</option>'; }
}

function input(cfg, name, kind, required, extra = '') {
  const req = required ? 'required' : '';
  if (Array.isArray(kind)) return `<select name="${name}" ${req}>${kind.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
  if (typeof kind === 'string' && kind.startsWith('pick:')) return `<select name="${name}" data-pick="${esc(kind.slice(5))}" ${req} ${extra}><option value="">Loading…</option></select>`;
  const type = kind === 'date' ? 'date' : kind === 'money' ? 'text" inputmode="decimal' : kind === 'int' ? 'number" min="1" step="1' : 'text';
  return `<input name="${name}" type="${type}" ${req} ${extra}>`;
}

function buildForm(cfg, path, form, slot) {
  const el = document.createElement('form');
  el.className = 'stk-live-create';
  const lineRow = () => `<div class="stk-live-line">${input(cfg, 'l_variant', 'pick:/catalog/variants', false, 'aria-label="Product"')}<input name="l_qty" type="number" min="1" step="1" placeholder="Qty" aria-label="Quantity"><input name="l_price" inputmode="decimal" placeholder="${form.lines?.price === 'unit_cost_minor' ? 'Unit cost' : 'Unit price'}" aria-label="Unit price"></div>`;
  el.innerHTML = form.fields.map(([n, l, r, k]) => `<label>${esc(l)}${r ? ' *' : ''}${input(cfg, n, k, r)}</label>`).join('')
    + (form.lines ? `<fieldset class="stk-live-lines"><legend>Line items *</legend><div data-lines>${lineRow()}</div><button type="button" class="stk-btn" data-add-line>+ Add line</button><p class="stk-demo-label" data-total></p></fieldset>` : '')
    + `<button type="submit" class="stk-btn stk-btn-primary">${esc(form.label)}</button><p class="stk-demo-label" role="status"></p>`;
  const pickers = () => el.querySelectorAll('select[data-pick]:not([data-filled])').forEach((s) => { s.dataset.filled = '1'; fillPicker(cfg, s, s.dataset.pick); });
  pickers();
  const readLines = () => [...el.querySelectorAll('.stk-live-line')].map((r) => ({ variant_id: r.querySelector('[name=l_variant]').value, quantity: r.querySelector('[name=l_qty]').value, price: r.querySelector('[name=l_price]').value }));
  const showTotal = () => { const t = el.querySelector('[data-total]'); if (!t) return; const sum = readLines().reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0); t.textContent = sum ? `Lines total: ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (the server calculates the final total)` : ''; };
  el.addEventListener('input', showTotal);
  el.querySelector('[data-add-line]')?.addEventListener('click', () => { el.querySelector('[data-lines]').insertAdjacentHTML('beforeend', lineRow()); pickers(); });
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = el.querySelector('[role=status]');
    const btn = el.querySelector('button[type=submit]');
    const data = Object.fromEntries(new FormData(el));
    if (form.lines) data.lines = readLines();
    const { body, error } = formBody(form, data);
    if (error) { status.textContent = error; return; }
    let target = path;
    if (form.post) { target = form.post.replace('{id}', encodeURIComponent(body.id)); delete body.id; }
    btn.disabled = true; status.textContent = 'Saving…';
    try {
      const res = await fetch(apiUrl(cfg, target), { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 403) status.textContent = 'Your role is not allowed to do this here.';
      else if (!res.ok) { const j = await res.json().catch(() => ({})); status.textContent = j?.error?.message || (Array.isArray(j?.message) ? j.message.join(', ') : j?.message) || `Not saved (error ${res.status}).`; }
      else {
        el.reset(); el.querySelectorAll('.stk-live-line:not(:first-child)').forEach((r) => r.remove()); showTotal();
        status.textContent = 'Saved. Dashboard totals include it on their next refresh.';
        slot.innerHTML = await loadSection(cfg, path);
      }
    } catch { status.textContent = 'Not saved — the server could not be reached.'; }
    btn.disabled = false;
  });
  return el;
}

function createForm(cfg, path, slot) {
  const forms = [].concat(CREATE_FORMS[path] || []);
  if (!forms.length) return null;
  const wrap = document.createElement('div');
  forms.forEach((f) => wrap.appendChild(buildForm(cfg, path, f, slot)));
  return wrap;
}

async function loadSection(cfg, path) {
  const url = apiUrl(cfg, path);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId } });
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const err = body?.error || body?.message?.error || {};
    if (err.code === 'PLAN_FEATURE_LOCKED') return `<p class="stk-demo-description">${esc(err.message)}</p>`;
    return '<p class="stk-demo-description">Your role does not have access to this section.</p>';
  }
  if (res.status === 402) return '<p class="stk-demo-description">Your workspace is closed until the plan invoice is paid. Open Plan &amp; Billing to reopen it.</p>';
  if (!res.ok) return `<p class="stk-demo-description">These records could not be loaded right now (error ${res.status}).</p>`;
  return renderRows(toRows(await res.json()));
}

const CREATE_CSS = '.stk-trial-banner{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:0 0 16px;padding:10px 14px;border-radius:8px;border:1px solid rgba(189,150,82,.4);background:rgba(189,150,82,.1);color:#F8FAFC}.stk-trial-banner.closed{border-color:rgba(248,113,113,.45);background:rgba(248,113,113,.1)}.stk-trial-banner button{background:transparent;border:1px solid currentColor;color:inherit;border-radius:6px;padding:4px 10px;cursor:pointer}.stk-live-create{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:8px 0 16px}.stk-live-create label{display:flex;flex-direction:column;gap:4px;min-width:160px}.stk-live-create [role=status]{flex-basis:100%;margin:0}.stk-live-lines{flex-basis:100%;border:1px solid var(--border,currentColor);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}.stk-live-line{display:grid;grid-template-columns:minmax(180px,2fr) 90px 120px;gap:8px}.stk-plan-panel{margin:0 0 20px}.stk-usage-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:12px 0}.stk-usage{display:flex;flex-direction:column;gap:6px}.stk-usage-bar{height:6px;border-radius:999px;background:rgba(148,163,184,.25);overflow:hidden}.stk-usage-bar i{display:block;height:100%;background:rgba(189,150,82,.9)}.stk-plan-actions{display:flex;gap:8px;flex-wrap:wrap}.stk-plan-btn{background:transparent;border:1px solid rgba(189,150,82,.6);color:inherit;border-radius:6px;padding:6px 12px;cursor:pointer}';

/** Adds "Plan & Billing" under Settings (owners only, via PAGE_PERMISSIONS) using the existing page layout. */
function ensureBillingPage() {
  if (document.getElementById('ws-view-billing')) return;
  const navOrg = document.getElementById('ws-nav-org');
  const viewOrg = document.getElementById('ws-view-org');
  if (!navOrg || !viewOrg) return;
  const nav = navOrg.cloneNode(true);
  nav.id = 'ws-nav-billing';
  nav.setAttribute('data-view-id', 'billing');
  nav.setAttribute('data-nav-id', 'nav_billing');
  nav.classList.remove('active');
  nav.setAttribute('onclick', "window.stokrovaCustomerApp.showWsView('billing')");
  const label = nav.querySelector('.nav-label');
  if (label) label.textContent = 'Plan & Billing';
  navOrg.parentElement.appendChild(nav);
  const view = document.createElement('div');
  view.id = 'ws-view-billing';
  view.className = viewOrg.className;
  view.style.display = 'none';
  const DESC = 'Your Stokrova plan, when the current period ends, and every invoice Stokrova has issued you. Every business starts with a 30-day free trial, no credit card required. After that, each month is billed at the plan price in force on the day it renews, so what you see here is exactly what you owe.';
  const orgHeading = viewOrg.querySelector('h1,h3');
  const intro = orgHeading ? [...viewOrg.children].find((c) => c.contains(orgHeading)).cloneNode(true) : document.createElement('div');
  const h = intro.querySelector('h1,h3');
  if (h) h.textContent = 'Plan & Billing'; else intro.innerHTML = '<h3>Plan & Billing</h3>';
  [...intro.querySelectorAll('p')].forEach((el, i) => { if (i === 0) el.textContent = DESC; else el.remove(); });
  if (!intro.querySelector('p')) { const d = document.createElement('p'); d.className = 'stk-demo-description'; d.textContent = DESC; intro.appendChild(d); }
  [...intro.children].forEach((c) => { if (!c.contains(intro.querySelector('h1,h3')) && c.tagName !== 'P') c.remove(); });
  view.appendChild(intro);
  viewOrg.parentElement.appendChild(view);
}

const LIMIT_TEXT = { max_users: 'Staff', max_branches: 'Branches', max_active_registers: 'Tills', max_warehouses: 'Warehouses' };

/** "Staff 2 of 3" text for one limit (null limit = unlimited). */
export function usageLine(key, used, limit) {
  return `${LIMIT_TEXT[key] || key}: ${used ?? 0} of ${limit === null || limit === undefined ? 'unlimited' : limit}`;
}

/** Plan & Billing: current plan, usage against its limits, and upgrade / downgrade buttons. */
function renderPlanPanel(cfg) {
  const e = ENTITLEMENTS;
  const view = document.getElementById('ws-view-billing');
  if (!e || !view || document.getElementById('stk-plan-panel')) return;
  const box = document.createElement('div');
  box.id = 'stk-plan-panel';
  box.className = 'stk-plan-panel';
  const bars = Object.keys(LIMIT_TEXT).map((k) => {
    const lim = e.limits?.[k];
    const used = e.usage?.[k] ?? 0;
    const pct = lim === null || lim === undefined ? 0 : Math.min(100, Math.round((used / Math.max(lim, 1)) * 100));
    return `<div class="stk-usage"><span>${esc(usageLine(k, used, lim))}</span><div class="stk-usage-bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  const names = { RETAIL_STARTER: 'Starter', WHOLESALE_GROWTH: 'Growth', ENTERPRISE_LOGISTICS: 'Enterprise' };
  const buttons = (e.offered_tiers || []).filter((t) => t !== e.tier).map((t) => {
    const up = (e.upgrades || []).some((u) => u.tier === t);
    return `<button type="button" class="stk-plan-btn" data-tier="${esc(t)}">${up ? 'Upgrade to' : 'Move to'} ${esc(names[t] || t)}</button>`;
  }).join('');
  box.innerHTML = `<h2 class="stk-demo-section">Your plan: ${esc(e.plan_name)}</h2>
    <p class="stk-demo-description">Your workspace shows exactly what the ${esc(e.plan_name)} plan includes. Upgrade any time to unlock more branches, staff and features — during your free trial the switch costs nothing; after it, you pay only the difference for the rest of the month.</p>
    <div class="stk-usage-list">${bars}</div><div class="stk-plan-actions">${buttons}</div><p role="status" class="stk-demo-description"></p>`;
  box.querySelectorAll('[data-tier]').forEach((b) => {
    b.onclick = async () => {
      const status = box.querySelector('[role=status]');
      b.disabled = true;
      const res = await fetch(apiUrl(cfg, '/billing/subscription/plan'), { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, 'Content-Type': 'application/json' }, body: JSON.stringify({ target_tier: b.dataset.tier, effective_immediately: true }) });
      b.disabled = false;
      if (res.ok) { status.textContent = 'Plan changed. Reloading your workspace…'; setTimeout(() => location.reload(), 800); return; }
      const body = await res.json().catch(() => ({}));
      status.textContent = body?.error?.message || body?.message?.error?.message || body?.message || `The plan could not be changed (error ${res.status}).`;
    };
  });
  const live = view.querySelector('.stk-live-records');
  if (live) live.before(box); else view.appendChild(box);
}

/** Trial countdown / closed-workspace notice at the top of the workspace (from /billing/access). */
async function showTrialBanner(cfg) {
  const res = await fetch(apiUrl(cfg, '/billing/access'), { headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId } });
  if (!res.ok) return;
  const a = await res.json();
  const host = document.querySelector('.ws-view-content')?.parentElement;
  if (!host || document.getElementById('stk-trial-banner')) return;
  let text = '';
  if (a.state === 'TRIAL') text = `Free trial — ${a.trial_days_left} day${a.trial_days_left === 1 ? '' : 's'} left. No credit card needed. When it ends, your chosen plan is billed in Plan & Billing.`;
  else if (a.state === 'CLOSED') text = 'Your 30-day free trial has ended and your plan invoice is unpaid, so the workspace is closed. Pay it in Plan & Billing to reopen everything.';
  if (!text) return;
  const b = document.createElement('div');
  b.id = 'stk-trial-banner';
  b.className = 'stk-trial-banner' + (a.state === 'CLOSED' ? ' closed' : '');
  b.innerHTML = `<span>${esc(text)}</span><button type="button">Plan &amp; Billing →</button>`;
  b.querySelector('button').onclick = () => window.stokrovaCustomerApp?.showWsView('billing');
  host.prepend(b);
  if (a.state === 'CLOSED') window.stokrovaCustomerApp?.showWsView('billing');
}

/** Naira amount from kobo, e.g. ₦49,000.00 */
export function nairaText(minor, currency = 'NGN') {
  const n = Number(minor || 0) / 100;
  return (currency === 'NGN' ? '₦' : currency + ' ') + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Plan & Billing: unpaid invoices with Pay with Paystack / Flutterwave buttons; confirms on return. */
async function renderInvoicePay(cfg) {
  const view = document.getElementById('ws-view-billing');
  if (!view || document.getElementById('stk-pay-panel')) return;
  const h = { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, 'Content-Type': 'application/json' };
  const box = document.createElement('div');
  box.id = 'stk-pay-panel';
  box.className = 'stk-plan-panel';
  const plan = document.getElementById('stk-plan-panel');
  if (plan) plan.after(box); else view.appendChild(box);
  // Back from the checkout page: ask the server (which asks the provider) before showing "paid".
  const q = new URLSearchParams(location.search);
  const pend = JSON.parse(sessionStorage.getItem('stk-pay-pending') || 'null');
  let note = '';
  if (pend && (q.get('reference') || q.get('tx_ref') || q.get('trxref'))) {
    sessionStorage.removeItem('stk-pay-pending');
    const r = await fetch(apiUrl(cfg, `/billing/invoices/${encodeURIComponent(pend.invoice_id)}/verify`), { method: 'POST', headers: h, body: JSON.stringify(pend) }).then((x) => x.json()).catch(() => ({}));
    note = r.paid ? 'Payment confirmed — thank you. Your workspace is fully open.' : 'We could not confirm that payment yet. If money left your account, it will show here within a few minutes.';
  }
  const [inv, prov] = await Promise.all([
    fetch(apiUrl(cfg, '/billing/invoices'), { headers: h }).then((x) => (x.ok ? x.json() : [])).catch(() => []),
    fetch(apiUrl(cfg, '/billing/payment-providers'), { headers: h }).then((x) => (x.ok ? x.json() : { providers: [] })).catch(() => ({ providers: [] })),
  ]);
  const open = toRows(inv).filter((i) => i.status !== 'PAID' && i.status !== 'VOID' && Number(i.total_minor) > 0);
  const label = { PAYSTACK: 'Pay with Paystack', FLUTTERWAVE: 'Pay with Flutterwave' };
  const rows = open.map((i) => `<div class="stk-usage"><span><b>${esc(i.invoice_number || i.id)}</b> · ${esc(nairaText(i.total_minor, i.currency))} · ${esc(String(i.period_start || '').slice(0, 10))} – ${esc(String(i.period_end || '').slice(0, 10))}</span>
    <div class="stk-plan-actions">${(prov.providers || []).map((p) => `<button type="button" class="stk-plan-btn" data-pay="${esc(i.id)}" data-provider="${p}">${label[p]}</button>`).join('') || '<span class="stk-demo-description">Online payment is being set up — you can also pay by bank transfer and Stokrova will mark it paid.</span>'}</div></div>`).join('');
  box.innerHTML = `<h2 class="stk-demo-section">Pay your invoices</h2>
    <p class="stk-demo-description">${open.length ? 'Settle securely in Naira by card, bank transfer or USSD. The moment the payment is confirmed, the invoice is marked paid and your workspace stays open.' : 'You are all paid up — nothing is due right now.'}</p>
    <div class="stk-usage-list">${rows}</div><p role="status" class="stk-demo-description">${esc(note)}</p>`;
  box.querySelectorAll('[data-pay]').forEach((b) => {
    b.onclick = async () => {
      const status = box.querySelector('[role=status]');
      b.disabled = true; status.textContent = 'Opening secure checkout…';
      const res = await fetch(apiUrl(cfg, `/billing/invoices/${encodeURIComponent(b.dataset.pay)}/pay`), { method: 'POST', headers: h, body: JSON.stringify({ provider: b.dataset.provider, return_url: location.origin + location.pathname + '?paid=1' }) });
      const body = await res.json().catch(() => ({}));
      b.disabled = false;
      if (res.ok && body.checkout_url) {
        sessionStorage.setItem('stk-pay-pending', JSON.stringify({ invoice_id: b.dataset.pay, provider: b.dataset.provider, reference: body.reference }));
        location.href = body.checkout_url;
        return;
      }
      status.textContent = body?.message || `The payment could not be started (error ${res.status}).`;
    };
  });
  if (note) window.stokrovaCustomerApp?.showWsView('billing');
}

export async function mountWorkspaceLive() {
  if (!document.getElementById('stk-live-create-css')) { const st = document.createElement('style'); st.id = 'stk-live-create-css'; st.textContent = CREATE_CSS; document.head.appendChild(st); }
  const cfg = await resolveLiveConfig();
  if (!cfg || !cfg.token || !cfg.tenantId) return false;
  ensureBillingPage();
  await loadEntitlements(cfg).catch(() => {});
  await applyRoleMenu(cfg).catch(() => {});
  await showTrialBanner(cfg).catch(() => {});
  await Promise.all(Object.entries(PAGE_SOURCES).map(async ([id, sections]) => {
    const panel = document.getElementById('ws-view-' + id);
    if (!panel) return;
    const heading = panel.querySelector('h1,h3');
    const intro = [...panel.children].find((c) => heading && c.contains(heading)) || null;
    const live = document.createElement('div');
    live.className = 'stk-live-records';
    live.innerHTML = sections.map(([title]) => `<h2 class="stk-demo-section">${esc(title)}</h2><div data-live-slot>Loading…</div>`).join('');
    // Hide the sample content; keep the page title and description.
    [...panel.children].forEach((child) => { if (child !== intro && !child.classList.contains('stk-page-end')) child.hidden = true; });
    if (intro && heading && intro !== heading) [...intro.children].forEach((c) => { if (!c.contains(heading) && c.tagName !== 'P') c.hidden = true; });
    panel.querySelectorAll('.stk-page-end span:first-child').forEach((s) => { s.textContent = 'STOKROVA · Your company records'; });
    if (intro) intro.after(live); else panel.prepend(live);
    const slots = live.querySelectorAll('[data-live-slot]');
    await Promise.all(sections.map(async ([, path], i) => {
      const f = createForm(cfg, path, slots[i]);
      if (f) slots[i].before(f);
      try { slots[i].innerHTML = await loadSection(cfg, path); }
      catch { slots[i].innerHTML = '<p class="stk-demo-description">These records could not be loaded right now.</p>'; }
    }));
  }));
  renderPlanPanel(cfg);
  await renderInvoicePay(cfg).catch(() => {});
  const posPanel = document.getElementById('ws-view-pos');
  if (posPanel) {
    const api = (method, path, body) => fetch(apiUrl(cfg, path), { method, headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    import('./pos-live.js').then((m) => m.mountTill(cfg, posPanel, api)).catch(() => {});
  }
  // Order slips (order taker -> picker -> cashier) and every worker's own "My day".
  const api2 = (method, path, body) => fetch(apiUrl(cfg, path), { method, headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  import('./tickets-live.js').then((m) => {
    const ordersPanel = document.getElementById('ws-view-orders');
    const pickingPanel = document.getElementById('ws-view-picking');
    if (ordersPanel) m.mountTicketDesk(cfg, ordersPanel, api2);
    if (pickingPanel) m.mountPicker(cfg, pickingPanel, api2);
    for (const id of ['dashboard', 'pos', 'orders', 'picking']) { const p = document.getElementById('ws-view-' + id); if (p) m.mountMyDay(cfg, p, api2); }
  }).catch(() => {});
  // Prices & margin, product profit, live staff board, stock in/out and deliveries.
  import('./insights-live.js').then((m) => m.mountInsights(cfg, api2)).catch(() => {});
  // Money owed, stock counts, reorders, best sellers, product import/photos/labels and daily alerts.
  import('./operations-live.js').then((m) => m.mountOperations(cfg, api2)).catch(() => {});
  return true;
}
