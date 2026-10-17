/*
 * Operations: what needs attention today (low stock, expiry, overdue money), customers who owe you,
 * what you owe suppliers, guided stock counts, reorder suggestions, best sellers (ABC),
 * product import from a spreadsheet, product photos and barcode labels.
 * Every figure comes from the server (/operations/*, /insights/abc, /replenishment); this file only draws it.
 */

const money = (minor) => (minor === null || minor === undefined ? '—' : `₦${(Number(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BUCKETS = [['CURRENT', 'Not due yet'], ['D1_30', '1–30 days late'], ['D31_60', '31–60 days'], ['D61_90', '61–90 days'], ['D90_PLUS', 'Over 90 days']];

const CSS = `
.stk-op{margin:0 0 28px}.stk-op .stk-op-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.stk-op .stk-op-tiles>div{border:1px solid var(--border);border-radius:12px;padding:12px 14px;transition:border-color .2s,transform .2s}
.stk-op .stk-op-tiles>div:hover{border-color:var(--primary);transform:translateY(-1px)}
.stk-op .stk-op-tiles span{display:block;color:var(--text-secondary)}.stk-op .stk-op-tiles b{display:block;font-variant-numeric:tabular-nums;margin:2px 0}
.stk-op .stk-op-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--border);margin:8px 0}
.stk-op .stk-op-bar i{display:block;height:100%;background:var(--primary)}.stk-op .stk-op-bar i:nth-child(odd){opacity:.55}
.stk-op .stk-op-muted{color:var(--text-secondary)}.stk-op .stk-op-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
.stk-op table{width:100%;border-collapse:collapse}.stk-op td,.stk-op th{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left}
.stk-op input.stk-op-num{width:90px}.stk-op .stk-op-flag{border:1px solid var(--border-strong);border-radius:999px;padding:1px 8px;white-space:nowrap}
.stk-op .stk-op-scroll{max-height:380px;overflow:auto}.stk-op img.stk-op-thumb{width:36px;height:36px;object-fit:cover;border-radius:8px;border:1px solid var(--border)}
@media print{body *{visibility:hidden}.stk-op-labels,.stk-op-labels *{visibility:visible}.stk-op-labels{position:absolute;inset:0}}
.stk-op-labels{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stk-op-labels>div{border:1px dashed var(--border);padding:8px;text-align:center}`;

function caller(api) {
  return async (method, path, body) => {
    const res = await api(method, path, body);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j?.message || `Error ${res.status}`); e.status = res.status; throw e; }
    return j;
  };
}

function section(panel, cls, title, intro) {
  if (!document.getElementById('stk-op-css')) { const s = document.createElement('style'); s.id = 'stk-op-css'; s.textContent = CSS; document.head.appendChild(s); }
  let root = panel.querySelector(`.stk-op.${cls}`);
  if (!root) {
    root = document.createElement('section');
    root.className = `stk-op ${cls}`;
    const anchor = panel.querySelector('.stk-live-records');
    if (anchor) anchor.before(root); else panel.appendChild(root);
  }
  root.dataset.title = title; root.dataset.intro = intro || '';
  return root;
}
const head = (root) => `<h3>${esc(root.dataset.title)}</h3>${root.dataset.intro ? `<p class="stk-op-muted">${esc(root.dataset.intro)}</p>` : ''}`;
const tiles = (list) => `<div class="stk-op-tiles">${list.map(([l, v, s]) => `<div><span>${esc(l)}</span><b>${v}</b>${s ? `<small class="stk-op-muted">${esc(s)}</small>` : ''}</div>`).join('')}</div>`;
const fail = (root, e) => { root.innerHTML = `${head(root)}<p class="stk-op-muted">${e.status === 403 ? 'Your role or plan does not include this.' : esc(e.message)}</p>`; };

/** Money owed (either direction): split bar, buckets, worst payers first. */
export function renderAging(root, r, who) {
  const total = r.total_minor || 0;
  const bar = total ? `<div class="stk-op-bar" aria-hidden="true">${BUCKETS.map(([k]) => `<i style="width:${((r.totals[k] || 0) / total) * 100}%"></i>`).join('')}</div>` : '';
  root.innerHTML = `${head(root)}${tiles([['Total unpaid', money(total)], ['Overdue', money(r.overdue_minor), total ? `${Math.round((r.overdue_minor / total) * 100)}% of unpaid` : ''], ...BUCKETS.map(([k, l]) => [l, money(r.totals[k])])])}${bar}
  ${r.parties.length ? `<div class="stk-op-scroll"><table><thead><tr><th>${esc(who)}</th><th>Unpaid</th><th>Overdue</th><th>Oldest</th><th>Documents</th></tr></thead><tbody>${r.parties.map((p) => `<tr><td>${esc(p.party_name)}</td><td>${money(p.total_minor)}</td><td>${money(p.overdue_minor)}</td><td>${p.oldest_days_late ? `${p.oldest_days_late} days late` : 'on time'}</td><td>${p.documents}</td></tr>`).join('')}</tbody></table></div>` : '<p class="stk-op-muted">Nothing unpaid — all settled.</p>'}`;
}

/** Today's to-do list for the owner, plus where the daily summary is sent. */
export function renderAttention(root, d, call, reload) {
  const s = d.settings || {};
  const ch = d.channels || {};
  root.innerHTML = `${head(root)}${tiles([
    ['Sales today', money(d.sales_minor), `${d.sales_count} sales · cash ${money(d.cash_minor)} · transfer ${money(d.transfer_minor)}`],
    ['Out of stock', String(d.out_of_stock)], ['Running low', String(d.low_stock.length), `at or below ${s.low_stock_at}`],
    ['Expiring soon', String(d.expiring.length), `within ${s.expiry_days} days`],
    ['Customers owe (overdue)', money(d.overdue_receivables_minor)], ['You owe (overdue)', money(d.overdue_payables_minor)],
  ])}
  ${d.low_stock.length ? `<p><b>Reorder soon:</b> ${d.low_stock.slice(0, 10).map((l) => `<span class="stk-op-flag">${esc(l.label)} · ${l.available} left</span>`).join(' ')}</p>` : ''}
  ${d.expiring.length ? `<p><b>Expiring:</b> ${d.expiring.slice(0, 10).map((e) => `<span class="stk-op-flag">${esc(e.label)} · ${e.expired ? 'expired' : `${e.days_left} days`}</span>`).join(' ')}</p>` : ''}
  <details><summary>Daily summary by email or WhatsApp</summary>
    <form class="stk-op-row stk-op-alerts">
      <label>Email <input name="email" type="email" value="${esc(s.email || '')}"></label>
      <label>WhatsApp <input name="whatsapp" placeholder="+234…" value="${esc(s.whatsapp || '')}"></label>
      <label>Send at <input class="stk-op-num" name="send_hour" type="number" min="0" max="23" value="${s.send_hour ?? 20}">:00</label>
      <label>Low at <input class="stk-op-num" name="low_stock_at" type="number" min="0" value="${s.low_stock_at ?? 5}"></label>
      <label>Expiry warning <input class="stk-op-num" name="expiry_days" type="number" min="1" max="365" value="${s.expiry_days ?? 30}"> days</label>
      <label><input name="enabled" type="checkbox" ${s.enabled ? 'checked' : ''}> Send every day</label>
      <button type="submit">Save</button><button type="button" data-send>Send now</button><span class="stk-op-muted" data-status></span>
    </form>
    <p class="stk-op-muted">${ch.email ? 'Email is ready.' : 'Email sending is not switched on for the server yet.'} ${ch.whatsapp ? 'WhatsApp is ready.' : 'WhatsApp sending is not switched on yet.'}</p>
  </details>`;
  const f = root.querySelector('form.stk-op-alerts');
  const status = f.querySelector('[data-status]');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    try { await call('POST', '/operations/alerts/settings', { ...v, enabled: !!v.enabled, send_hour: Number(v.send_hour), low_stock_at: Number(v.low_stock_at), expiry_days: Number(v.expiry_days) }); status.textContent = ' Saved.'; reload(); }
    catch (e) { status.textContent = ` ${e.status === 403 ? 'Only the owner can change this.' : e.message}`; }
  });
  f.querySelector('[data-send]').addEventListener('click', async () => {
    try { const r = await call('POST', '/operations/alerts/send-now'); status.textContent = ' ' + r.results.map((x) => `${x.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}: ${x.ok ? 'sent' : x.detail}`).join(' · '); }
    catch (e) { status.textContent = ` ${e.message}`; }
  });
}

/** Guided stock count: start, type what's on the shelf, see the gap in money, post. */
export function renderCounts(root, counts, warehouses, call, reload) {
  const open = counts.find((c) => c.status === 'OPEN');
  const past = counts.filter((c) => c.status !== 'OPEN').slice(0, 5);
  if (!open) {
    root.innerHTML = `${head(root)}<form class="stk-op-row"><select name="w">${warehouses.map((w) => `<option value="${esc(w.id)}">${esc(w.name || w.code || w.id)}</option>`).join('')}</select><button ${warehouses.length ? '' : 'disabled'}>Start a stock count</button><span class="stk-op-muted" data-status>${warehouses.length ? '' : 'Add a warehouse or shop first.'}</span></form>
    ${past.length ? `<table><thead><tr><th>Date</th><th>Status</th><th>Missing</th><th>Extra</th></tr></thead><tbody>${past.map((c) => `<tr><td>${new Date(c.created_at).toLocaleDateString()}</td><td>${c.status === 'POSTED' ? 'Posted' : 'Cancelled'}</td><td>${c.summary.missing_units} · ${money(c.summary.missing_value_minor)}</td><td>${c.summary.extra_units} · ${money(c.summary.extra_value_minor)}</td></tr>`).join('')}</tbody></table>` : ''}`;
    const f = root.querySelector('form');
    f.addEventListener('submit', async (ev) => { ev.preventDefault(); try { await call('POST', '/operations/stock-counts', { warehouse_id: f.w.value }); reload(); } catch (e) { f.querySelector('[data-status]').textContent = ` ${e.message}`; } });
    return;
  }
  const s = open.summary;
  root.innerHTML = `${head(root)}${tiles([['Counted', `${s.counted_lines} of ${s.total_lines}`], ['Missing', `${s.missing_units} units`, money(s.missing_value_minor)], ['Extra', `${s.extra_units} units`, money(s.extra_value_minor)], ['Net', money(s.net_value_minor), s.lines_without_cost ? `${s.lines_without_cost} without cost price` : '']])}
  <input type="search" placeholder="Find a product" class="stk-op-find">
  <div class="stk-op-scroll"><table><thead><tr><th>Product</th><th>System says</th><th>Counted</th><th>Difference</th></tr></thead><tbody>${s.lines.map((l) => `<tr data-label="${esc(l.label.toLowerCase())}"><td>${esc(l.label)}</td><td>${l.expected}</td><td><input class="stk-op-num" type="number" min="0" step="1" data-v="${esc(l.variant_id)}" value="${l.counted ?? ''}"></td><td>${l.difference === null ? '—' : l.difference > 0 ? `+${l.difference}` : l.difference}</td></tr>`).join('')}</tbody></table></div>
  <div class="stk-op-row"><button data-save>Save counts</button><button data-post>Post differences to stock</button><button data-cancel>Cancel count</button><span class="stk-op-muted" data-status></span></div>`;
  const status = root.querySelector('[data-status]');
  root.querySelector('.stk-op-find').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); root.querySelectorAll('tbody tr[data-label]').forEach((tr) => { tr.style.display = tr.dataset.label.includes(q) ? '' : 'none'; }); });
  const save = () => call('POST', `/operations/stock-counts/${open.id}/lines`, { lines: [...root.querySelectorAll('input[data-v]')].map((i) => ({ variant_id: i.dataset.v, counted: i.value === '' ? null : Number(i.value) })) });
  const saveBtn = root.querySelector('[data-save]');
  saveBtn.addEventListener('click', async () => {
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(saveBtn, 'Saving counts…');
    try {
      await save();
      if (window.stokrovaToast) window.stokrovaToast('Stock counts saved.');
      reload();
    } catch (e) {
      status.textContent = ` ${e.message}`;
    } finally {
      if (window.stokrovaStopLoading) window.stokrovaStopLoading(saveBtn);
    }
  });

  const postBtn = root.querySelector('[data-post]');
  postBtn.addEventListener('click', () => {
    const doPost = async () => {
      if (window.stokrovaStartLoading) window.stokrovaStartLoading(postBtn, 'Posting…');
      try {
        await save();
        await call('POST', `/operations/stock-counts/${open.id}/post`);
        if (window.stokrovaToast) window.stokrovaToast('Counted differences posted to stock.');
        reload();
      } catch (e) {
        status.textContent = ` ${e.message}`;
      } finally {
        if (window.stokrovaStopLoading) window.stokrovaStopLoading(postBtn);
      }
    };
    if (window.stokrovaConfirmInline) {
      window.stokrovaConfirmInline({
        target: postBtn,
        message: 'Post every counted difference to stock? This cannot be undone.',
        onConfirm: doPost,
      });
    } else if (confirm('Post every counted difference to stock? This cannot be undone.')) {
      doPost();
    }
  });

  const cancelBtn = root.querySelector('[data-cancel]');
  cancelBtn.addEventListener('click', () => {
    const doCancel = async () => {
      if (window.stokrovaStartLoading) window.stokrovaStartLoading(cancelBtn, 'Cancelling…');
      try {
        await call('POST', `/operations/stock-counts/${open.id}/cancel`);
        if (window.stokrovaToast) window.stokrovaToast('Stock count cancelled.');
        reload();
      } catch (e) {
        status.textContent = ` ${e.message}`;
      } finally {
        if (window.stokrovaStopLoading) window.stokrovaStopLoading(cancelBtn);
      }
    };
    if (window.stokrovaConfirmInline) {
      window.stokrovaConfirmInline({
        target: cancelBtn,
        message: 'Cancel this stock count?',
        onConfirm: doCancel,
      });
    } else {
      doCancel();
    }
  });
}

export function renderReorder(root, recs, call, reload) {
  const list = (Array.isArray(recs) ? recs : recs?.data || []).filter((r) => r.status === 'PENDING' || r.status === 'APPROVED');
  root.innerHTML = `${head(root)}<div class="stk-op-row"><button data-eval>Check stock now</button><span class="stk-op-muted" data-status></span></div>
  ${list.length ? `<table><thead><tr><th>Product</th><th>In stock</th><th>Reorder at</th><th>Suggested</th><th>Est. cost</th><th></th></tr></thead><tbody>${list.map((r) => `<tr><td>${esc(r.sku)}</td><td>${r.net_stock_position}</td><td>${r.reorder_point}</td><td><b>${r.recommended_quantity}</b></td><td>${money(r.estimated_cost_cents)}</td><td>${r.status === 'PENDING' ? `<button data-ok="${esc(r.id)}">Approve</button> <button data-no="${esc(r.id)}">Dismiss</button>` : 'Approved'}</td></tr>`).join('')}</tbody></table>` : '<p class="stk-op-muted">No reorders needed right now. Set reorder levels per product to get suggestions.</p>'}`;
  const status = root.querySelector('[data-status]');
  root.querySelector('[data-eval]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(btn, 'Checking stock…');
    try { await call('POST', '/replenishment/evaluate', {}); reload(); } catch (err) { status.textContent = ` ${err.message}`; }
    finally { if (window.stokrovaStopLoading) window.stokrovaStopLoading(btn); }
  });
  root.querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', async () => {
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(b, 'Approving…');
    try { await call('POST', `/replenishment/recommendations/${b.dataset.ok}/approve`, {}); reload(); } catch (err) { status.textContent = ` ${err.message}`; }
    finally { if (window.stokrovaStopLoading) window.stokrovaStopLoading(b); }
  }));
  root.querySelectorAll('[data-no]').forEach((b) => b.addEventListener('click', () => {
    const doReject = async () => {
      if (window.stokrovaStartLoading) window.stokrovaStartLoading(b, 'Dismissing…');
      try { await call('POST', `/replenishment/recommendations/${b.dataset.no}/reject`, { reason: 'Dismissed by user' }); reload(); } catch (err) { status.textContent = ` ${err.message}`; }
      finally { if (window.stokrovaStopLoading) window.stokrovaStopLoading(b); }
    };
    if (window.stokrovaConfirmInline) {
      window.stokrovaConfirmInline({
        target: b,
        message: 'Dismiss this reorder suggestion?',
        onConfirm: doReject,
      });
    } else {
      doReject();
    }
  }));
}

export function renderAbc(root, r) {
  const share = (v) => (r.total_value ? `${Math.round((v / r.total_value) * 100)}% of sales` : '');
  root.innerHTML = `${head(root)}${tiles([['A — your stars', `${r.a_items_count} products`, share(r.a_items_value)], ['B — steady', `${r.b_items_count} products`, share(r.b_items_value)], ['C — slow', `${r.c_items_count} products`, share(r.c_items_value)], ['Sales counted', money(r.total_value), `${r.from} to ${r.to}`]])}
  ${r.items.length ? `<div class="stk-op-scroll"><table><thead><tr><th>#</th><th>Product</th><th>Class</th><th>Sales</th><th>Running share</th></tr></thead><tbody>${r.items.map((i) => `<tr><td>${i.rank}</td><td>${esc(i.name)}</td><td><span class="stk-op-flag">${i.abc_class}</span></td><td>${money(i.value)}</td><td>${(i.cumulative_share_basis_points / 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>` : '<p class="stk-op-muted">No sales in the last 90 days yet.</p>'}`;
}

/** Minimal CSV reader (quoted fields, commas, new lines). */
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return h ? body.map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] ?? '').trim()]))) : [];
}

// Code 128-B barcode as SVG (printable labels without any library).
const C128 = '212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212,112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131,311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321,112313,132113,132311,211313,231113,231311,112133,112331,132131,113123,113321,133121,313121,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111,314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114,122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341,131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112'.split(',');
export function code128Svg(text, h = 50) {
  const codes = [104]; for (const ch of String(text)) { const v = ch.charCodeAt(0) - 32; if (v < 0 || v > 94) throw new Error('Barcode can only use plain letters and numbers.'); codes.push(v); }
  codes.push(codes.reduce((s, c, i) => s + c * (i || 1), 0) % 103, 106);
  let x = 10, bars = '';
  for (const c of codes) [...C128[c]].forEach((w, i) => { if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`; x += Number(w); });
  return `<svg viewBox="0 0 ${x + 10} ${h}" width="100%" height="${h}" fill="currentColor" role="img" aria-label="Barcode ${esc(text)}">${bars}</svg>`;
}

export function renderProductsTools(root, variants, warehouses, call, reload) {
  root.innerHTML = `${head(root)}
  <details><summary>Import products from a spreadsheet (CSV)</summary>
    <p class="stk-op-muted">Columns: SKU, Name, Cost, Price, Quantity, Barcode, Photo (https link). Save your Excel file as CSV first. Existing SKUs are skipped, never overwritten.</p>
    <div class="stk-op-row"><input type="file" accept=".csv,text/csv" data-file><select data-w>${warehouses.map((w) => `<option value="${esc(w.id)}">${esc(w.name || w.code || w.id)}</option>`).join('')}</select><button data-check disabled>Check file</button><button data-import disabled>Import</button></div>
    <div data-result class="stk-op-muted"></div>
  </details>
  <details><summary>Product photos & barcode labels</summary>
    <div class="stk-op-scroll"><table><thead><tr><th></th><th>Product</th><th>Photo link</th><th>Labels</th></tr></thead><tbody>${variants.map((v) => `<tr><td>${v.image_url ? `<img class="stk-op-thumb" src="${esc(v.image_url)}" alt="" loading="lazy">` : ''}</td><td>${esc(v.sku)}</td><td><input data-img="${esc(v.id)}" placeholder="https://…" value="${esc(v.image_url || '')}"> <button data-saveimg="${esc(v.id)}">Save</button></td><td><input class="stk-op-num" type="number" min="0" max="200" value="0" data-labels="${esc(v.id)}"></td></tr>`).join('')}</tbody></table></div>
    <div class="stk-op-row"><button data-print>Print labels</button><span class="stk-op-muted" data-status></span></div>
    <div class="stk-op-labels" hidden></div>
  </details>`;
  let rows = [];
  const res = root.querySelector('[data-result]');
  const w = root.querySelector('[data-w]');
  const show = (r) => { res.innerHTML = `${r.created ? `<b>${r.created} products added.</b> ` : `${r.ready} ready to import. `}${r.errors.length ? `<ul>${r.errors.slice(0, 30).map((e) => `<li>${e.row ? `Row ${e.row}: ` : ''}${esc(e.message)}</li>`).join('')}</ul>` : ''}`; };
  root.querySelector('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    rows = parseCsv(await f.text());
    res.textContent = `${rows.length} rows read.`;
    root.querySelector('[data-check]').disabled = root.querySelector('[data-import]').disabled = !rows.length;
  });
  root.querySelector('[data-check]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(btn, 'Checking file…');
    try { show(await call('POST', '/operations/products/import', { rows, warehouse_id: w.value, dry_run: true })); }
    catch (err) { res.textContent = err.message; }
    finally { if (window.stokrovaStopLoading) window.stokrovaStopLoading(btn); }
  });
  const importBtn = root.querySelector('[data-import]');
  importBtn.addEventListener('click', () => {
    const doImport = async () => {
      if (window.stokrovaStartLoading) window.stokrovaStartLoading(importBtn, 'Importing…');
      try {
        show(await call('POST', '/operations/products/import', { rows, warehouse_id: w.value }));
        if (window.stokrovaToast) window.stokrovaToast('Products imported successfully.');
        setTimeout(reload, 1500);
      } catch (err) {
        res.textContent = err.message;
      } finally {
        if (window.stokrovaStopLoading) window.stokrovaStopLoading(importBtn);
      }
    };
    if (window.stokrovaConfirmInline) {
      window.stokrovaConfirmInline({
        target: importBtn,
        message: `Import ${rows.length} products to ${w.options[w.selectedIndex]?.text || 'warehouse'}?`,
        onConfirm: doImport,
      });
    } else {
      doImport();
    }
  });
  const status = root.querySelector('[data-status]');
  root.querySelectorAll('[data-saveimg]').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.saveimg;
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(b, 'Saving…');
    try {
      await call('POST', `/operations/products/${id}/image`, { image_url: root.querySelector(`[data-img="${id}"]`).value });
      status.textContent = ' Photo saved.';
      if (window.stokrovaToast) window.stokrovaToast('Product photo saved.');
      reload();
    } catch (err) {
      status.textContent = ` ${err.message}`;
    } finally {
      if (window.stokrovaStopLoading) window.stokrovaStopLoading(b);
    }
  }));
  root.querySelector('[data-print]').addEventListener('click', () => {
    const sheet = root.querySelector('.stk-op-labels');
    const parts = [];
    try {
      for (const v of variants) {
        const n = Number(root.querySelector(`[data-labels="${v.id}"]`).value) || 0;
        const code = v.barcode || v.sku;
        for (let i = 0; i < n; i++) parts.push(`<div><b>${esc(v.attributes?.name || v.sku)}</b>${code128Svg(code)}<div>${esc(code)} · ${money(v.selling_price_minor)}</div></div>`);
      }
    } catch (e) { status.textContent = ` ${e.message}`; return; }
    if (!parts.length) { status.textContent = ' Enter how many labels to print for at least one product.'; return; }
    sheet.innerHTML = parts.join(''); sheet.hidden = false; window.print(); sheet.hidden = true;
  });
}

export function mountOperations(cfg, api) {
  const call = caller(api);
  const panel = (id) => document.getElementById('ws-view-' + id);
  const run = async (p, cls, title, intro, load) => {
    if (!p) return;
    const root = section(p, cls, title, intro);
    const reload = () => run(p, cls, title, intro, load);
    try { await load(root, reload); } catch (e) { if (e.status === 403 || e.status === 402) root.remove(); else fail(root, e); }
  };
  const warehouses = () => call('GET', '/warehouses').then((r) => (Array.isArray(r) ? r : r?.data || [])).catch(() => []);

  run(panel('dashboard'), 'stk-op-attention', 'Needs your attention today', 'Low stock, expiring batches, money owed and today\'s takings — worked out by the server.',
    async (root, reload) => renderAttention(root, await call('GET', '/operations/alerts'), call, reload));
  run(panel('invoices'), 'stk-op-recv', 'Customers who owe you', 'Unpaid invoices grouped by how late they are.',
    async (root) => renderAging(root, await call('GET', '/operations/receivables'), 'Customer'));
  for (const id of ['suppliers', 'receiving']) run(panel(id), 'stk-op-pay', 'What you owe suppliers', 'Unpaid supplier bills grouped by how late they are.',
    async (root) => renderAging(root, await call('GET', '/operations/payables'), 'Supplier'));
  run(panel('availability'), 'stk-op-count', 'Stock count', 'Count what is really on the shelf; differences are posted to stock and valued at cost.',
    async (root, reload) => { const [c, w] = await Promise.all([call('GET', '/operations/stock-counts'), warehouses()]); renderCounts(root, c, w, call, reload); });
  run(panel('availability'), 'stk-op-reorder', 'Reorder suggestions', 'Products at or below their reorder level, with how many to buy.',
    async (root, reload) => renderReorder(root, await call('GET', '/replenishment/recommendations'), call, reload));
  run(panel('abc'), 'stk-op-abc', 'Best sellers (ABC)', 'A products bring 80% of your sales in the last 90 days — never let them run out.',
    async (root) => renderAbc(root, await call('GET', '/insights/abc')));
  run(panel('catalog'), 'stk-op-products', 'Import, photos & labels', 'Add many products at once, attach photos and print barcode labels.',
    async (root, reload) => { const [v, w] = await Promise.all([call('GET', '/catalog/variants'), warehouses()]); renderProductsTools(root, Array.isArray(v) ? v : v?.data || [], w, call, reload); });
}
