/*
 * Executive Command Center — reads the company's own sales database through the STOKROVA API
 * (/v1/analytics/executive/*). Brand tokens and existing font sizes are preserved.
 *
 * Live mode uses the signed-in staff session: the workspace's auth client supplies the access token,
 * and /v1/auth/session supplies the active company (tenant). window.STOKROVA_API = { baseUrl, token, tenantId }
 * may also be set explicitly. Without a session, clearly labeled sample figures are shown.
 */
import { executiveSample } from './executive-metrics.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sampleSnapshot() {
  const days = executiveSample.map((d) => ({ date: d.date, netSalesMinor: d.sales * 100, cogsMinor: d.cost * 100, grossProfitMinor: (d.sales - d.cost) * 100 }));
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
  const period = (sales, cost, n) => ({ transactions: n, netSalesMinor: sales * 100, cogsMinor: cost * 100, grossProfitMinor: (sales - cost) * 100, marginPct: Math.round(((sales - cost) / sales) * 1000) / 10 });
  const last = executiveSample[executiveSample.length - 1];
  const today = period(last.sales, last.cost, 1);
  const sameDay = period(last.previousSales, last.previousCost, 1);
  const week = period(sum(executiveSample, 'sales'), sum(executiveSample, 'cost'), 7);
  const prev = period(sum(executiveSample, 'previousSales'), sum(executiveSample, 'previousCost'), 7);
  const cmp = (a, b) => ({ salesChangePct: Math.round(((a.netSalesMinor - b.netSalesMinor) / b.netSalesMinor) * 1000) / 10, marginPoints: Math.round((a.marginPct - b.marginPct) * 10) / 10 });
  return { asOf: '2026-10-15', today, sameDayLastWeek: sameDay, week, previousWeek: prev, dailyChange: cmp(today, sameDay), weeklyChange: cmp(week, prev), days };
}

const SAMPLE_PIPELINE = {
  orders: [['SO-10482', 'Confirmed', 'Paid', 6200000], ['SO-10481', 'Dispatched', 'Partially paid', 1845000], ['SO-10480', 'Delivered', 'Paid', 920000]],
  invoices: [['INV-3391', 'Paid', '', 6200000], ['INV-3390', 'Partially paid', 'Balance ₦9,225.00', 1845000], ['INV-3389', 'Issued', 'Due Oct 22', 410000]],
  payments: [['PAY-8812', 'Confirmed', 'Bank transfer', 6200000], ['PAY-8811', 'Captured', 'Bank transfer', 922500], ['PAY-8810', 'Confirmed', 'Cash', 920000]],
  refunds: [['RF-0213', 'Refunded', 'Bank transfer', -120000], ['RF-0212', 'Refunded', 'Cash', -45000]],
};

/** Builds live API settings from the signed-in session; returns null when nobody is signed in. */
export async function resolveLiveConfig() {
  if (window.STOKROVA_API) return window.STOKROVA_API;
  const sb = window._stokrovaSupabase;
  if (!sb || !sb.auth) return null;
  try {
    const { data } = await sb.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) return null;
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) && !['3000', ''].includes(location.port);
    const baseUrl = isLocal ? 'http://localhost:3000' : '';
    const res = await fetch(`${baseUrl}/v1/auth/session`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const session = await res.json();
    const tenantId = session.active_tenant && session.active_tenant.id;
    return tenantId ? { baseUrl: baseUrl || location.origin, token, tenantId } : null;
  } catch {
    return null;
  }
}

export async function mountExecutive(container) {
  const cfg = await resolveLiveConfig();
  const live = Boolean(cfg && cfg.baseUrl && cfg.token && cfg.tenantId);
  let currency = (cfg && cfg.currency) || (live ? 'NGN' : 'USD');
  const money = (minor) => (minor === null || minor === undefined ? 'Unavailable' : new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: live ? 2 : 0 }).format(minor / 100));
  const pct = (v, unit = '%') => (v === null || v === undefined ? 'Unavailable' : `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`);
  const api = (path, init = {}) =>
    fetch(`${cfg.baseUrl.replace(/\/$/, '')}/v1/analytics/executive/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });

  container.innerHTML = `
    <section class="stk-executive-overview">
      <h1>Executive Command Center</h1>
      <p class="stk-demo-description" id="stk-exec-status"></p>
      <div class="stk-executive-periods" id="stk-exec-periods"></div>
    </section>
    <section>
      <h2 class="stk-demo-section">Seven-day sales, cost and gross profit</h2>
      <div class="stk-executive-legend"><span><i></i>Gross profit</span><span><i></i>Product cost</span></div>
      <svg class="stk-executive-chart" id="stk-exec-chart" viewBox="0 0 700 240" role="img" aria-label="Daily gross profit and product cost"></svg>
      <div class="stk-demo-table-wrap stk-executive-comparison"><table class="stk-demo-table" id="stk-exec-compare"></table></div>
    </section>
    <section>
      <h2 class="stk-demo-section">Import sales spreadsheet</h2>
      <p class="stk-executive-note">Columns: <strong>reference, date (YYYY-MM-DD), net sales, cost</strong> — cost is optional; refunds are negative amounts. Re-uploading the same file updates rows instead of doubling totals.</p>
      <input type="file" accept=".csv,text/csv" id="stk-exec-file" ${live ? '' : 'disabled'} />
      <p class="stk-executive-note" id="stk-exec-import-status"></p>
    </section>
    <section>
      <h2 class="stk-demo-section">Sales pipeline</h2>
      <div class="stk-executive-legend" id="stk-exec-tabs">
        ${['orders', 'invoices', 'payments', 'refunds'].map((k, i) => `<button type="button" class="btn ${i ? 'btn-secondary' : 'btn-primary'}" data-kind="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
      </div>
      <div class="stk-demo-table-wrap"><table class="stk-demo-table" id="stk-exec-pipeline"></table></div>
    </section>`;

  const $ = (id) => container.querySelector('#' + id);
  $('stk-exec-status').innerHTML = live
    ? 'Live figures from your company database, refreshed every 30 seconds. Orders, imported sales and refunds all count toward these totals.'
    : '<strong>Sample data.</strong> Connect your database to see live figures — the totals, margins and comparisons below are illustrative.';

  function render(s) {
    const card = (title, p, cmp, cmpLabel) => `
      <div class="stk-executive-period"><h2>${title}</h2>
        <div class="stk-executive-values">
          <div><small>Net sales</small><strong>${money(p.netSalesMinor)}</strong><small>${pct(cmp.salesChangePct)} vs ${cmpLabel}</small></div>
          <div><small>Gross margin</small><strong>${p.marginPct === null ? 'Unavailable' : p.marginPct.toFixed(1) + '%'}</strong><small>${pct(cmp.marginPoints, ' pts')} vs ${cmpLabel}</small></div>
          <div><small>Gross profit</small><strong>${money(p.grossProfitMinor)}</strong><small>${p.transactions} records</small></div>
          <div><small>Product cost</small><strong>${money(p.cogsMinor)}</strong><small>${p.cogsMinor === null ? 'Some costs unknown' : 'Historical cost'}</small></div>
        </div></div>`;
    $('stk-exec-periods').innerHTML = card('Today', s.today, s.dailyChange, 'same day last week') + card('Last seven days', s.week, s.weeklyChange, 'previous seven days');
    const max = Math.max(1, ...s.days.map((d) => Math.abs(d.netSalesMinor)));
    const bw = 60, gap = (700 - 40 - bw * 7) / 6;
    $('stk-exec-chart').innerHTML = `<line class="stk-chart-guide" x1="20" x2="680" y1="200" y2="200"/>` + s.days.map((d, i) => {
      const x = 20 + i * (bw + gap);
      const profit = Math.max(0, d.grossProfitMinor ?? 0), cost = Math.max(0, d.cogsMinor ?? 0);
      const hp = (profit / max) * 180, hc = (cost / max) * 180;
      return `<rect class="stk-chart-cost" x="${x}" y="${200 - hc}" width="${bw}" height="${hc}"/><rect class="stk-chart-profit" x="${x}" y="${200 - hc - hp}" width="${bw}" height="${hp}"/><text x="${x + bw / 2}" y="222" text-anchor="middle">${esc(String(d.date).slice(-5))}</text>`;
    }).join('');
    $('stk-exec-compare').innerHTML = `<thead><tr><th>Measure</th><th>Last seven days</th><th>Previous seven days</th><th>Change</th></tr></thead><tbody>
      <tr><td>Net sales</td><td>${money(s.week.netSalesMinor)}</td><td>${money(s.previousWeek.netSalesMinor)}</td><td>${pct(s.weeklyChange.salesChangePct)}</td></tr>
      <tr><td>Gross profit</td><td>${money(s.week.grossProfitMinor)}</td><td>${money(s.previousWeek.grossProfitMinor)}</td><td></td></tr>
      <tr><td>Gross margin</td><td>${s.week.marginPct ?? 'Unavailable'}${s.week.marginPct === null ? '' : '%'}</td><td>${s.previousWeek.marginPct ?? 'Unavailable'}${s.previousWeek.marginPct === null ? '' : '%'}</td><td>${pct(s.weeklyChange.marginPoints, ' pts')}</td></tr></tbody>`;
  }

  async function refresh() {
    if (!live) return render(sampleSnapshot());
    try {
      const res = await api('snapshot');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Request failed (${res.status})`);
      render(await res.json());
    } catch (e) {
      $('stk-exec-status').textContent = `Live figures could not load: ${e.message}`;
    }
  }

  async function showPipeline(kind) {
    container.querySelectorAll('#stk-exec-tabs button').forEach((b) => (b.className = `btn ${b.dataset.kind === kind ? 'btn-primary' : 'btn-secondary'}`));
    let rows;
    if (live) {
      const res = await api(`pipeline?kind=${kind}`);
      rows = res.ok ? (await res.json()).map((r) => [r.reference, r.status, r.payment_status || r.payment_method || (r.balance_minor ? `Balance ${money(Number(r.balance_minor))}` : ''), Number(r.amount_minor)]) : [];
    } else rows = SAMPLE_PIPELINE[kind];
    $('stk-exec-pipeline').innerHTML = `<thead><tr><th>Reference</th><th>Status</th><th>Detail</th><th>Amount</th></tr></thead><tbody>${
      rows.length ? rows.map((r) => `<tr><td>${esc(r[0])}</td><td><span class="stk-demo-status">${esc(r[1])}</span></td><td>${esc(r[2])}</td><td>${money(r[3])}</td></tr>`).join('') : '<tr><td colspan="4">No records yet.</td></tr>'
    }</tbody>`;
  }

  container.querySelectorAll('#stk-exec-tabs button').forEach((b) => b.addEventListener('click', () => showPipeline(b.dataset.kind)));

  $('stk-exec-file').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file || !live) return;
    const status = $('stk-exec-import-status');
    if (file.size > 5_000_000) return (status.textContent = 'File is too large (5 MB max).');
    const csv = await file.text();
    const [head, ...lines] = csv.split(/\r?\n/).filter((l) => l.trim());
    const cols = head.split(',').map((c) => c.trim());
    const rows = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i] ?? `col${i}`, v.trim()])));
    status.textContent = `Importing ${rows.length} rows…`;
    const res = await api('import', { method: 'POST', body: JSON.stringify({ rows, csv, currency }) });
    const out = await res.json().catch(() => ({}));
    status.textContent = !res.ok ? out.message || 'Import failed.' : out.errors?.length ? `Nothing imported. Fix these rows: ${out.errors.join('; ')}` : `${out.imported} rows imported. Totals updated.`;
    ev.target.value = '';
    refresh();
  });

  refresh();
  showPipeline('orders');
  if (live) setInterval(refresh, 30_000);
}
