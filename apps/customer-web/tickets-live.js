/*
 * Shop-counter order slips and each worker's "My day".
 *  - Order taker (Orders page): writes the customer's list, items are held, a slip prints with a barcode.
 *  - Picker (Picking page): scans the slip, ticks what was found, flags anything missing.
 *  - Cashier (Till): scans the same slip, sees items and prices, records cash/transfer (pos-live.js).
 *  - My day: every signed-in worker sees their own counts for today from /staff/my-day.
 */

const money = (minor) => (Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Code 39: readable by every standard barcode scanner (they type the code + Enter).
const C39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw', 5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '*': 'nwnnwnwnn',
};

/** Black-and-white Code 39 barcode as SVG markup (prints on any receipt printer). */
export function barcodeSvg(code, height = 56) {
  const text = `*${String(code).toUpperCase()}*`;
  let x = 10; const bars = [];
  for (const ch of text) {
    const pat = C39[ch];
    if (!pat) throw new Error(`Cannot draw "${ch}" in a barcode.`);
    [...pat].forEach((p, i) => { const w = p === 'w' ? 3 : 1; if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="${height}"/>`); x += w; });
    x += 1;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 10}" height="${height}" viewBox="0 0 ${x + 10} ${height}" role="img" aria-label="Barcode ${esc(code)}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${bars.join('')}</g></svg>`;
}

export function slipHtml(t) {
  const total = (t.lines || []).reduce((s, l) => s + l.unit_price_minor * l.quantity, 0);
  return `<h3 style="margin:0">Order slip</h3><p style="margin:4px 0">${esc(t.code)}${t.customer_name ? ` · ${esc(t.customer_name)}` : ''}<br>${esc(new Date(t.created_at).toLocaleString())}</p>
  <table style="width:100%">${t.lines.map((l) => `<tr><td>☐ ${l.quantity} × ${esc(l.label)}</td><td style="text-align:right">${money(l.unit_price_minor * l.quantity)}</td></tr>`).join('')}</table><hr>
  <p>Estimated total ${money(total)}<br><small>Final price is confirmed at the till.</small></p><div style="text-align:center">${barcodeSvg(t.code)}<br>${esc(t.code)}</div><p><small>Take this slip to the cashier to pay. Items are held until ${esc(new Date(t.expires_at).toLocaleTimeString())}.</small></p>`;
}

const STATUS = { OPEN: 'Waiting for picker', PICKING: 'Being picked', READY: 'Ready to pay', PAID: 'Paid', CANCELLED: 'Cancelled', EXPIRED: 'Hold expired' };

const CSS = `.stk-tk{border:1px solid var(--border);border-radius:12px;padding:16px;margin:0 0 20px;display:grid;gap:12px}
.stk-tk .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.stk-tk input,.stk-tk select{padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:inherit}
.stk-tk table{width:100%;border-collapse:collapse}.stk-tk td,.stk-tk th{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left}.stk-tk .num{text-align:right;font-variant-numeric:tabular-nums}
.stk-tk .results{max-height:220px;overflow:auto}.stk-day{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.stk-day div{border:1px solid var(--border);border-radius:10px;padding:10px 12px}.stk-day b{display:block;font-variant-numeric:tabular-nums}`;

function setup(panel, cls) {
  if (!document.getElementById('stk-tk-css')) { const s = document.createElement('style'); s.id = 'stk-tk-css'; s.textContent = CSS; document.head.appendChild(s); }
  const root = document.createElement('section');
  root.className = `stk-tk ${cls}`;
  const anchor = panel.querySelector('.stk-live-records');
  if (anchor) anchor.before(root); else panel.prepend(root);
  return root;
}

function caller(api) {
  return async (method, path, body) => {
    const res = await api(method, path, body);
    if (res.status === 403) throw new Error('Your role is not allowed to do this.');
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error?.message || (Array.isArray(j?.message) ? j.message.join(', ') : j?.message) || `Error ${res.status}`);
    return j;
  };
}

function printDoc(title, html) {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return false;
  w.document.write(`<title>${esc(title)}</title><body style="font-family:monospace;padding:12px">${html}<script>print()<\/script></body>`);
  w.document.close();
  return true;
}

/** Order taker: write the customer's list, submit, print the slip. */
export function mountTicketDesk(cfg, panel, api) {
  const call = caller(api);
  const root = setup(panel, 'stk-tk-desk');
  const st = { stores: [], store: '', products: [], list: [], open: [], msg: '', q: '' };
  const say = (m) => { st.msg = m; render(); };

  async function loadProducts() {
    try { st.products = await call('GET', `/pos/products${st.store ? `?warehouse_id=${encodeURIComponent(st.store)}` : ''}`); } catch (e) { st.products = []; st.msg = e.message; }
  }
  async function loadOpen() { try { st.open = await call('GET', '/pos/tickets?status=OPEN,PICKING,READY'); } catch { st.open = []; } }

  function render() {
    const q = st.q.toLowerCase();
    const found = st.products.filter((p) => !q || [p.sku, p.barcode].some((x) => String(x || '').toLowerCase().includes(q))).slice(0, 20);
    const est = st.list.reduce((s, l) => s + Number(l.price_minor) * l.quantity, 0);
    root.innerHTML = `<h2 class="stk-demo-section">Write a customer's list</h2>
      <p class="stk-demo-description">Type or scan what the customer wants. On submit the items are held for them, a slip with a barcode prints, and the picker and cashier work from that slip.</p>
      ${st.msg ? `<p role="status">${esc(st.msg)}</p>` : ''}
      <div class="row"><label>Shop / store <select name="store">${st.stores.map((w) => `<option value="${esc(w.id)}" ${w.id === st.store ? 'selected' : ''}>${esc(w.name || w.code)}</option>`).join('') || '<option value="">No stores yet</option>'}</select></label>
        <input name="customer" placeholder="Customer name (optional)" aria-label="Customer name" value="${esc(st.customer || '')}"></div>
      <input name="q" placeholder="Scan barcode or search product, then Enter" aria-label="Find product" value="${esc(st.q)}">
      <div class="results"><table><tbody>${found.map((p) => `<tr><td>${esc(p.sku)}</td><td class="num">${money(p.price_minor)}</td><td class="num">${p.available_quantity} available</td><td><button class="stk-btn" data-add="${esc(p.variant_id)}">Add</button></td></tr>`).join('') || '<tr><td>No products match.</td></tr>'}</tbody></table></div>
      <table><tbody>${st.list.map((l, i) => `<tr><td>${esc(l.sku)}</td><td><button class="stk-btn" data-dec="${i}" aria-label="One less">−</button> ${l.quantity} <button class="stk-btn" data-inc="${i}" aria-label="One more">+</button></td><td class="num">${money(l.price_minor * l.quantity)}</td><td><button class="stk-btn" data-del="${i}" aria-label="Remove">✕</button></td></tr>`).join('') || '<tr><td>The list is empty.</td></tr>'}</tbody></table>
      <div class="row"><strong>Estimated ${money(est)}</strong><button class="stk-btn stk-btn-primary" data-act="submit" ${st.list.length ? '' : 'disabled'}>Submit &amp; print slip</button></div>
      <h2 class="stk-demo-section">Slips in progress</h2>
      <table><tbody>${st.open.map((t) => `<tr><td>${esc(t.code)}</td><td>${esc(t.customer_name || '')}</td><td>${esc(STATUS[t.status] || t.status)}</td><td><button class="stk-btn" data-print="${esc(t.code)}">Reprint</button> <button class="stk-btn" data-cancel="${esc(t.code)}">Cancel</button></td></tr>`).join('') || '<tr><td>No open slips.</td></tr>'}</tbody></table>`;
    const s = root.querySelector('[name=q]');
    if (st.q) { s.focus(); s.setSelectionRange(st.q.length, st.q.length); }
  }

  const add = (p) => { if (!p) return; const l = st.list.find((x) => x.variant_id === p.variant_id); if (l) l.quantity++; else st.list.push({ variant_id: p.variant_id, sku: p.sku, price_minor: p.price_minor, quantity: 1 }); };

  root.addEventListener('input', (e) => {
    if (e.target.name === 'q') { st.q = e.target.value; render(); }
    if (e.target.name === 'customer') st.customer = e.target.value;
  });
  root.addEventListener('change', async (e) => { if (e.target.name === 'store') { st.store = e.target.value; st.list = []; await loadProducts(); render(); } });
  root.addEventListener('keydown', (e) => {
    if (e.target.name !== 'q' || e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.target.value.trim().toLowerCase();
    const p = st.products.find((x) => String(x.barcode || '').toLowerCase() === v || String(x.sku).toLowerCase() === v) || st.products.find((x) => String(x.sku).toLowerCase().includes(v));
    if (!p) return say('No product with that code.');
    add(p); st.q = ''; st.msg = ''; render();
  });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.add) add(st.products.find((p) => p.variant_id === d.add));
    else if (d.inc) st.list[d.inc].quantity++;
    else if (d.dec) { if (--st.list[d.dec].quantity < 1) st.list.splice(d.dec, 1); }
    else if (d.del) st.list.splice(d.del, 1);
    else if (d.print) { const t = st.open.find((x) => x.code === d.print); if (t && !printDoc('Order slip', slipHtml(t))) return say('Allow pop-ups to print.'); }
    else if (d.cancel) { try { await call('POST', `/pos/tickets/${encodeURIComponent(d.cancel)}/cancel`); await loadOpen(); await loadProducts(); return say(`Slip ${d.cancel} cancelled; the items are back on sale.`); } catch (err) { return say(err.message); } }
    else if (d.act === 'submit') {
      b.disabled = true;
      try {
        const t = await call('POST', '/pos/tickets', { warehouse_id: st.store, customer_name: st.customer || null, items: st.list.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })) });
        st.list = []; st.customer = '';
        await Promise.all([loadOpen(), loadProducts()]);
        const printed = printDoc('Order slip', slipHtml(t));
        return say(`Slip ${t.code} submitted — items are held. ${printed ? 'Printing now.' : 'Allow pop-ups to print the slip.'}`);
      } catch (err) { return say(err.message); }
    }
    render();
  });

  (async () => {
    try { st.stores = await call('GET', '/pos/tickets/stores'); } catch (e) { st.msg = e.message; }
    st.store = st.stores[0]?.id || '';
    await Promise.all([loadProducts(), loadOpen()]);
    render();
  })();
  render();
}

/** Picker: scan the slip, tick what was found. */
export function mountPicker(cfg, panel, api) {
  const call = caller(api);
  const root = setup(panel, 'stk-tk-pick');
  const st = { t: null, queue: [], msg: '' };
  const say = (m) => { st.msg = m; render(); };
  async function loadQueue() { try { st.queue = await call('GET', '/pos/tickets?status=OPEN,PICKING'); } catch { st.queue = []; } }

  function render() {
    const t = st.t;
    root.innerHTML = `<h2 class="stk-demo-section">Pick an order slip</h2>
      <p class="stk-demo-description">Scan the slip's barcode, collect each item, and confirm how many you found. When every line is confirmed the slip is ready for the cashier.</p>
      ${st.msg ? `<p role="status">${esc(st.msg)}</p>` : ''}
      <input name="code" placeholder="Scan or type slip code (TK-…), then Enter" aria-label="Slip code">
      ${t ? `<h3>${esc(t.code)} ${t.customer_name ? `· ${esc(t.customer_name)}` : ''} — ${esc(STATUS[t.status] || t.status)}</h3>
        <table><thead><tr><th>Item</th><th class="num">Listed</th><th class="num">Found</th><th></th></tr></thead><tbody>
        ${t.lines.map((l) => `<tr><td>${esc(l.label)}${l.missing && t.status === 'READY' ? ' <strong>· short</strong>' : ''}</td><td class="num">${l.quantity}</td><td class="num"><input type="number" min="0" max="${l.quantity}" step="1" value="${t.status === 'OPEN' ? l.quantity : l.picked_quantity}" data-qty="${esc(l.variant_id)}" style="width:72px" aria-label="Found quantity for ${esc(l.label)}"></td><td><button class="stk-btn" data-pick="${esc(l.variant_id)}">Confirm</button></td></tr>`).join('')}
        </tbody></table><div class="row"><button class="stk-btn stk-btn-primary" data-act="all" ${['PAID', 'CANCELLED', 'EXPIRED'].includes(t.status) ? 'disabled' : ''}>Confirm all lines</button></div>` : ''}
      <h2 class="stk-demo-section">Waiting to be picked</h2>
      <table><tbody>${st.queue.map((q) => `<tr><td>${esc(q.code)}</td><td>${esc(q.customer_name || '')}</td><td>${q.lines.length} item(s)</td><td><button class="stk-btn" data-open="${esc(q.code)}">Open</button></td></tr>`).join('') || '<tr><td>Nothing waiting.</td></tr>'}</tbody></table>`;
  }

  async function open(code) { try { st.t = await call('GET', `/pos/tickets/${encodeURIComponent(code)}`); st.msg = ''; } catch (e) { st.msg = e.message; } render(); }
  async function pick(variantId) {
    const qty = Number([...root.querySelectorAll('[data-qty]')].find((i) => i.dataset.qty === variantId)?.value);
    st.t = await call('POST', `/pos/tickets/${encodeURIComponent(st.t.code)}/pick`, { variant_id: variantId, picked_quantity: qty });
  }

  root.addEventListener('keydown', (e) => { if (e.target.name === 'code' && e.key === 'Enter') { e.preventDefault(); open(e.target.value.trim()); } });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    try {
      if (d.open) return open(d.open);
      if (d.pick) await pick(d.pick);
      if (d.act === 'all') for (const l of st.t.lines) await pick(l.variant_id);
      await loadQueue();
      say(st.t.status === 'READY' ? `Slip ${st.t.code} is ready — send the customer to the cashier.` : 'Saved.');
    } catch (err) { say(err.message); }
  });
  loadQueue().then(render);
  render();
}

/** Every worker's own count for today. */
export function mountMyDay(cfg, panel, api) {
  const call = caller(api);
  const root = setup(panel, 'stk-tk-day');
  root.innerHTML = '<h2 class="stk-demo-section">My day</h2><p>Loading…</p>';
  const tile = (label, value) => `<div><span>${esc(label)}</span><b>${value}</b></div>`;
  call('GET', '/staff/my-day').then((d) => {
    const tiles = [];
    if (d.tickets_written) tiles.push(tile('Lists written', d.tickets_written), tile('Value of lists', money(d.tickets_written_value_minor)));
    if (d.tickets_picked || d.items_missing) tiles.push(tile('Slips picked', d.tickets_picked), tile('Items picked', d.items_picked), tile('Items missing', d.items_missing));
    if (d.sales) tiles.push(tile('Sales', d.sales), tile('Sales value', money(d.sales_value_minor)), tile('Cash taken', money(d.cash_minor)), tile('Transfers', money(d.transfer_minor)));
    if (d.tickets_cancelled) tiles.push(tile('Slips cancelled', d.tickets_cancelled));
    const span = d.first_activity_at ? `First activity ${new Date(d.first_activity_at).toLocaleTimeString()} · last ${new Date(d.last_activity_at).toLocaleTimeString()}` : 'Nothing recorded yet today.';
    root.innerHTML = `<h2 class="stk-demo-section">My day · ${esc(d.date)}</h2><p class="stk-demo-description">Your own work today, counted from what you recorded. ${esc(span)}</p>${tiles.length ? `<div class="stk-day">${tiles.join('')}</div>` : ''}`;
  }).catch(() => { root.innerHTML = '<h2 class="stk-demo-section">My day</h2><p>Your daily count could not be loaded right now.</p>'; });
}
