/*
 * Business pulse: prices & margin, product profit, the manager's live staff board,
 * stock in/out and deliveries. Every figure is calculated on the server (/insights/*);
 * this file only draws it. Sections the signed-in role or plan can't use are left out.
 */

const money = (minor) => (minor === null || minor === undefined ? '—' : (Number(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (v) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}%`);
const delta = (v) => (v === null || v === undefined ? '<span class="stk-in-muted">no comparison yet</span>' : `<span class="${v >= 0 ? 'stk-in-up' : 'stk-in-down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}%</span>`);
const change = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 1000) / 10 : null);
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const day = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' });

const CSS = `
.stk-in{margin:0 0 28px}.stk-in .stk-in-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}
.stk-in .stk-in-tiles>div{border:1px solid var(--border);border-radius:12px;padding:12px 14px;transition:border-color .2s,transform .2s}
.stk-in .stk-in-tiles>div:hover{border-color:var(--primary);transform:translateY(-1px)}
.stk-in .stk-in-tiles span{display:block;color:var(--text-secondary)}.stk-in .stk-in-tiles b{display:block;font-variant-numeric:tabular-nums;margin:2px 0}
.stk-in svg.stk-in-chart{width:100%;height:auto;display:block;margin:8px 0}
.stk-in .stk-in-chart text{fill:var(--text-secondary)}.stk-in .bar-a{fill:var(--border-strong)}.stk-in .bar-b{fill:var(--primary)}.stk-in .guide{stroke:var(--border)}
.stk-in .spark polyline{fill:none;stroke:var(--primary);stroke-width:2}.stk-in .spark{width:84px;height:24px;vertical-align:middle}
.stk-in .stk-in-up{color:var(--primary)}.stk-in .stk-in-down{color:var(--text-secondary)}.stk-in .stk-in-muted{color:var(--text-secondary)}
.stk-in .stk-in-flag{border:1px solid var(--border-strong);border-radius:999px;padding:1px 8px;white-space:nowrap}
.stk-in .stk-in-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--border-strong);margin-right:6px}
.stk-in .stk-in-dot.on{background:var(--primary);animation:stkInPulse 1.6s infinite}
@keyframes stkInPulse{0%{box-shadow:0 0 0 0 var(--primary)}70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}
.stk-in .stk-in-feed{max-height:340px;overflow:auto}.stk-in input.stk-in-price{width:110px}
.stk-in .stk-in-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}`;

function caller(api) {
  return async (method, path, body) => {
    const res = await api(method, path, body);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j?.message || `Error ${res.status}`); e.status = res.status; throw e; }
    return j;
  };
}

function section(panel, cls) {
  if (!document.getElementById('stk-in-css')) { const s = document.createElement('style'); s.id = 'stk-in-css'; s.textContent = CSS; document.head.appendChild(s); }
  let root = panel.querySelector(`.stk-in.${cls}`);
  if (!root) {
    root = document.createElement('section');
    root.className = `stk-in ${cls}`;
    const anchor = panel.querySelector('.stk-live-records');
    if (anchor) anchor.before(root); else panel.appendChild(root);
  }
  return root;
}

const tiles = (list) => `<div class="stk-in-tiles">${list.map(([l, v, s]) => `<div><span>${esc(l)}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`).join('')}</div>`;

/** Two bars per day (a = grey, b = brand colour). */
export function pairChart(days, a, b, label) {
  const W = 700, H = 220, base = 180;
  const max = Math.max(1, ...days.flatMap((d) => [Math.abs(a(d) || 0), Math.abs(b(d) || 0)]));
  const slot = (W - 40) / days.length, bw = Math.min(28, slot / 3);
  return `<svg class="stk-in-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line class="guide" x1="20" x2="${W - 20}" y1="${base}" y2="${base}"/>${days.map((d, i) => {
    const x = 20 + i * slot + slot / 2;
    const ha = (Math.max(0, a(d) || 0) / max) * 160, hb = (Math.max(0, b(d) || 0) / max) * 160;
    return `<rect class="bar-a" rx="3" x="${x - bw - 2}" y="${base - ha}" width="${bw}" height="${ha}"><title>${esc(d.date)}</title></rect><rect class="bar-b" rx="3" x="${x + 2}" y="${base - hb}" width="${bw}" height="${hb}"/><text x="${x}" y="${base + 22}" text-anchor="middle">${esc(day(d.date))}</text>`;
  }).join('')}</svg>`;
}

const spark = (vals) => {
  const max = Math.max(1, ...vals.map((v) => Math.abs(v)));
  return `<svg class="spark" viewBox="0 0 84 24" aria-hidden="true"><polyline points="${vals.map((v, i) => `${2 + i * (80 / Math.max(1, vals.length - 1))},${22 - (Math.max(0, v) / max) * 20}`).join(' ')}"/></svg>`;
};

/** Product profit for the whole business (owner/manager) or only the signed-in seller. */
export function renderProducts(root, p, mine) {
  const t = p.totals;
  const title = mine ? 'What I sold' : 'Product performance';
  const intro = mine
    ? 'Every product you sold at the till, with the profit it made, compared with yesterday and last week.'
    : 'Every product sold today: units, money taken and the profit it made, after its cost price. Compared with yesterday and the same day last week.';
  if (!p.products.length) { root.innerHTML = `<h2 class="stk-demo-section">${title}</h2><p class="stk-demo-description">${intro} Nothing has been sold in the last two weeks yet.</p>`; return; }
  const top = p.products.slice(0, 12);
  root.innerHTML = `<h2 class="stk-demo-section">${title} · ${esc(p.date)}</h2><p class="stk-demo-description">${intro}</p>
  ${tiles([
    ['Units sold today', t.today.units.toLocaleString(), `${delta(change(t.today.units, t.yesterday.units))} vs yesterday`],
    ['Money taken today', money(t.today.revenue_minor), `${delta(change(t.today.revenue_minor, t.yesterday.revenue_minor))} vs yesterday`],
    ['Profit today', money(t.today.profit_minor), t.today.profit_minor === null ? 'Some products have no cost price' : `Margin ${pct(t.today.margin_pct)}`],
    ['Profit · last 7 days', money(t.week.profit_minor), `${delta(t.week.profit_minor === null || t.previous_week.profit_minor === null ? null : change(t.week.profit_minor, t.previous_week.profit_minor))} vs the 7 days before`],
  ])}
  <div class="stk-executive-legend"><span><i></i>Money taken</span><span><i></i>Profit</span></div>
  ${pairChart(t.daily, (d) => d.revenue_minor, (d) => d.profit_minor, 'Money taken and profit for the last seven days')}
  <div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr><th>Product</th><th>Sold today</th><th>vs last week</th><th>Money taken</th><th>Profit</th><th>Margin</th><th>7-day trend</th></tr></thead><tbody>
  ${top.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.today.units}</td><td>${delta(r.units_change_pct)}</td><td>${money(r.today.revenue_minor)}</td><td>${r.today.profit_minor === null ? '<span class="stk-in-flag">Cost not set</span>' : money(r.today.profit_minor)}</td><td>${pct(r.today.margin_pct)}</td><td>${spark(r.daily.map((d) => d.units))}</td></tr>`).join('')}
  </tbody></table></div>`;
}

export function renderActivity(root, a) {
  root.innerHTML = `<h2 class="stk-demo-section">Live activity · ${a.active_now} working now</h2>
  <p class="stk-demo-description">Every sale, slip and stock change your team records appears here as it happens, refreshed every 20 seconds. A green dot means that person did something in the last 15 minutes.</p>
  ${tiles([['Sales by the team today', a.totals.sales.toLocaleString()], ['Sales value', money(a.totals.sales_value_minor)], ['Cash to count', money(a.totals.cash_minor)], ['Transfers to check in the bank', money(a.totals.transfer_minor)]])}
  <div class="stk-in-grid"><div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr><th>Staff</th><th>Sales</th><th>Value</th><th>Slips</th><th>Stock moves</th><th>Last action</th></tr></thead><tbody>
  ${a.staff.length ? a.staff.map((s) => `<tr><td><span class="stk-in-dot${s.active_now ? ' on' : ''}"></span>${esc(s.name)}${s.role ? ` <span class="stk-in-muted">${esc(String(s.role).toLowerCase().replace(/_/g, ' '))}</span>` : ''}</td><td>${s.sales}</td><td>${money(s.sales_value_minor)}</td><td>${s.tickets_written + s.tickets_picked}</td><td>${s.stock_moves}</td><td>${time(s.last_activity_at)}</td></tr>`).join('') : '<tr><td colspan="6">Nobody has recorded anything yet today.</td></tr>'}
  </tbody></table></div>
  <div class="stk-demo-table-wrap stk-in-feed"><table class="stk-demo-table"><thead><tr><th>Time</th><th>Who</th><th>What</th><th>Amount</th></tr></thead><tbody>
  ${a.feed.length ? a.feed.map((f) => `<tr><td>${time(f.at)}</td><td>${esc(f.who)}</td><td>${esc(f.what)} <span class="stk-in-muted">${esc(f.reference)}</span></td><td>${f.amount_minor !== null ? money(f.amount_minor) : f.quantity !== null ? `${f.quantity > 0 ? '+' : ''}${f.quantity} units` : ''}</td></tr>`).join('') : '<tr><td colspan="4">No activity yet.</td></tr>'}
  </tbody></table></div></div>`;
}

export function renderStock(root, s) {
  root.innerHTML = `<h2 class="stk-demo-section">Stock coming in and going out</h2>
  <p class="stk-demo-description">Every receipt, sale, return, transfer and adjustment, added up from the stock record. Stock value uses each product's cost price.</p>
  ${tiles([
    ['Units in today', `+${s.today.in.toLocaleString()}`], ['Units out today', `−${s.today.out.toLocaleString()}`],
    ['Moved between stores today', s.today.moved.toLocaleString()], ['Stock value at cost', money(s.stock_value_minor), s.products_without_cost ? `${s.products_without_cost} products have no cost price` : ''],
    ['Out of stock', s.out_of_stock.toLocaleString()], ['Running low (5 or fewer)', s.running_low.toLocaleString()],
  ])}
  <div class="stk-executive-legend"><span><i></i>Out</span><span><i></i>In</span></div>
  ${pairChart(s.daily, (d) => d.out, (d) => d.in, 'Units in and out for the last seven days')}
  ${s.attention.length ? `<div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr><th>Needs attention</th><th>Available</th><th></th></tr></thead><tbody>${s.attention.map((x) => `<tr><td>${esc(x.label)}</td><td>${x.available}</td><td><span class="stk-in-flag">${x.level === 'OUT' ? 'Out of stock' : 'Running low'}</span></td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

export function renderDelivery(root, d) {
  root.innerHTML = `<h2 class="stk-demo-section">Deliveries</h2>
  <p class="stk-demo-description">Delivery runs across all your stores: what is planned, on the road right now and finished.</p>
  ${tiles([['On the road', d.on_the_road], ['Stops done on the road', `${d.stops_done_on_road} of ${d.stops_on_road}`], ['Finished today', d.completed_today], ['Planned', d.planned], ['Cancelled', d.cancelled]])}
  <div class="stk-executive-legend"><span><i></i>Sent out</span><span><i></i>Finished</span></div>
  ${pairChart(d.daily, (x) => x.dispatched, (x) => x.completed, 'Delivery runs sent out and finished for the last seven days')}
  ${d.runs_on_road.length ? `<div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr><th>Run</th><th>Driver</th><th>Vehicle</th><th>Stops</th><th>Left at</th></tr></thead><tbody>${d.runs_on_road.map((r) => `<tr><td>${esc(r.run_number)}</td><td>${esc(r.driver || '—')}</td><td>${esc(r.vehicle || '—')}</td><td>${r.done} of ${r.stops}</td><td>${time(r.dispatched_at)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

export function renderPrices(root, rows, call, reload) {
  const losing = rows.filter((r) => r.loss).length, noCost = rows.filter((r) => !r.cost_known).length;
  root.innerHTML = `<h2 class="stk-demo-section">Prices &amp; margin</h2>
  <p class="stk-demo-description">Each product's cost price (what you pay) and selling price (what the customer pays). Margin and profit per unit are worked out for you. A change reaches the till straight away and is recorded with who made it.</p>
  ${tiles([['Products', rows.length], ['Selling below cost', losing], ['Cost price not set', noCost]])}
  <div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr><th>Product</th><th>Cost price</th><th>Selling price</th><th>Profit per unit</th><th>Margin</th><th>Available</th><th></th></tr></thead><tbody>
  ${rows.length ? rows.map((r) => `<tr data-id="${esc(r.variant_id)}"><td>${esc(r.label)}${r.last_change ? `<br><span class="stk-in-muted">changed ${esc(new Date(r.last_change.changed_at).toLocaleDateString())}</span>` : ''}</td>
    <td><input class="stk-in-price" name="cost" inputmode="decimal" value="${r.cost_price_minor ? (r.cost_price_minor / 100).toFixed(2) : ''}" placeholder="Not set" aria-label="Cost price for ${esc(r.label)}"></td>
    <td><input class="stk-in-price" name="sell" inputmode="decimal" value="${(r.selling_price_minor / 100).toFixed(2)}" aria-label="Selling price for ${esc(r.label)}"></td>
    <td>${r.margin_minor === null ? '<span class="stk-in-flag">Add cost</span>' : money(r.margin_minor)}</td>
    <td>${r.loss ? `<span class="stk-in-flag">Loss ${pct(r.margin_pct)}</span>` : pct(r.margin_pct)}</td>
    <td>${r.available_quantity}${r.stock_level !== 'OK' ? ` <span class="stk-in-flag">${r.stock_level === 'OUT' ? 'Out' : 'Low'}</span>` : ''}</td>
    <td><button type="button" class="btn btn-secondary" data-save>Save</button><span role="status" class="stk-in-muted"></span></td></tr>`).join('') : '<tr><td colspan="7">No products yet. Add products in the catalog first.</td></tr>'}
  </tbody></table></div>`;
  root.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
    const tr = b.closest('tr');
    const status = tr.querySelector('[role=status]');
    const toMinor = (v) => (String(v).trim() === '' ? undefined : Math.round(Number(String(v).replace(/,/g, '')) * 100));
    const body = { cost_price_minor: toMinor(tr.querySelector('[name=cost]').value), selling_price_minor: toMinor(tr.querySelector('[name=sell]').value) };
    if ([body.cost_price_minor, body.selling_price_minor].some((v) => v !== undefined && !Number.isFinite(v))) { status.textContent = ' Enter numbers only.'; return; }
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(b, 'Saving…');
    else b.disabled = true;
    status.textContent = ' Saving…';
    try {
      await call('POST', `/insights/prices/${encodeURIComponent(tr.dataset.id)}`, body);
      status.textContent = ' Saved';
      if (window.stokrovaToast) window.stokrovaToast('Price updated.');
      reload();
    } catch (e) {
      status.textContent = ` ${e.status === 403 ? 'Your role cannot change prices.' : e.message}`;
    } finally {
      if (window.stokrovaStopLoading) window.stokrovaStopLoading(b);
      else b.disabled = false;
    }
  }));
}

/** Mounts every section the signed-in person is allowed to see. */
export function mountInsights(cfg, api) {
  const call = caller(api);
  const panel = (id) => document.getElementById('ws-view-' + id);
  const tryRender = async (p, cls, path, render) => {
    if (!p) return false;
    try { const data = await call('GET', path); render(section(p, cls), data); return true; }
    catch { p.querySelector(`.stk-in.${cls}`)?.remove(); return false; }
  };
  const dash = panel('dashboard');
  // Order matters on the page: activity, products, stock, deliveries.
  if (dash) {
    ['stk-in-activity', 'stk-in-products', 'stk-in-stock', 'stk-in-delivery'].forEach((c) => section(dash, c));
    tryRender(dash, 'stk-in-activity', '/insights/activity', renderActivity).then((ok) => {
      if (ok) setInterval(() => tryRender(dash, 'stk-in-activity', '/insights/activity', renderActivity), 20_000);
    });
    tryRender(dash, 'stk-in-products', '/insights/products', (r, d) => renderProducts(r, d, false)).then((ok) => {
      if (!ok) tryRender(dash, 'stk-in-products', '/insights/my-products', (r, d) => renderProducts(r, d, true));
    });
    tryRender(dash, 'stk-in-stock', '/insights/stock', renderStock);
    tryRender(dash, 'stk-in-delivery', '/insights/delivery', renderDelivery);
  }
  for (const id of ['availability', 'ledger']) tryRender(panel(id), 'stk-in-stock', '/insights/stock', renderStock);
  tryRender(panel('fleet'), 'stk-in-delivery', '/insights/delivery', renderDelivery);
  for (const id of ['pos', 'orders']) tryRender(panel(id), 'stk-in-mine', '/insights/my-products', (r, d) => renderProducts(r, d, true));
  for (const id of ['pricing', 'catalog', 'availability']) {
    const p = panel(id);
    const load = () => tryRender(p, 'stk-in-prices', '/insights/prices', (r, rows) => renderPrices(r, rows, call, load));
    load();
  }
}
