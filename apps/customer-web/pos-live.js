/*
 * The real till for signed-in staff: shift open/close with Z report, product scan/search with live
 * price and stock, cart, cash/transfer/split recording (Stokrova never takes the money; card is recorded as transfer), cash in/out, park/resume, receipts and returns.
 * When the connection drops, sales and cash movements are kept on this device and sent to
 * /pos/sync when it is back; each carries an idempotency key, so the server never counts one twice.
 */

const money = (minor) => (Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** "12.50" -> 1250. Returns null for anything that is not a non-negative amount. */
export function toMinor(v) {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Display total only; the server prices the sale again (rules, promotions, tax) at checkout. */
export function cartTotalMinor(cart) {
  return cart.reduce((sum, l) => sum + Number(l.price_minor) * l.quantity, 0);
}

export function addToCart(cart, product, qty = 1) {
  const line = cart.find((l) => l.variant_id === product.variant_id);
  if (line) line.quantity += qty;
  else cart.push({ variant_id: product.variant_id, sku: product.sku, price_minor: product.price_minor, quantity: qty });
  return cart;
}

/** Tenders must cover the total; cash may exceed it (change is given), card/transfer may not overpay. */
export function validateTenders(cart, tenders) {
  const total = cartTotalMinor(cart);
  if (!cart.length) return 'Add at least one product.';
  if (!tenders.length || tenders.some((t) => !(t.amount_minor > 0))) return 'Enter an amount for each payment.';
  const paid = tenders.reduce((s, t) => s + t.amount_minor, 0);
  if (paid < total) return `Payment is short by ${money(total - paid)}.`;
  const nonCash = tenders.filter((t) => t.tender_type !== 'CASH').reduce((s, t) => s + t.amount_minor, 0);
  if (nonCash > total) return 'Transfer cannot be more than the total.';
  return null;
}

/** Order slip from the order taker/picker -> till cart lines (only what the picker found). */
export function ticketToCart(ticket) {
  return (ticket.lines || []).filter((l) => l.picked_quantity > 0).map((l) => ({ variant_id: l.variant_id, sku: l.label, price_minor: l.unit_price_minor, quantity: l.picked_quantity }));
}

export function isTicketCode(v) {
  return /^tk-?[2-9a-hj-np-z]{6}$/i.test(String(v || '').trim());
}

export function buildCheckout(state, tenders, key) {
  return {
    idempotency_key: key,
    pos_session_id: state.session.id,
    pos_register_id: state.register.id,
    customer_id: state.customer_id || null,
    items: state.cart.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
    tenders: tenders.map((t, i) => ({ tender_type: t.tender_type, tendered_minor: String(t.amount_minor), idempotency_key: `${key}-t${i}`, ...(t.reference ? { provider_reference: t.reference } : {}) })),
  };
}

/** Same sale, in the offline envelope the server's /pos/sync expects. */
export function offlineSale(state, tenders, key, seq) {
  return {
    client_tx_id: key, device_id: state.deviceId, pos_session_id: state.session.id, client_sequence: seq,
    client_timestamp: new Date().toISOString(), tx_type: 'SALE', idempotency_key: key,
    sale_payload: {
      customer_id: state.customer_id || null,
      lines: state.cart.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price_minor: String(l.price_minor) })),
      payments: tenders.map((t, i) => ({ tender_type: t.tender_type, amount_minor: String(t.amount_minor), tender_reference: t.reference || null, idempotency_key: `${key}-t${i}` })),
    },
  };
}

export function offlineCash(state, type, amountMinor, reason, key, seq) {
  return {
    client_tx_id: key, device_id: state.deviceId, pos_session_id: state.session.id, client_sequence: seq,
    client_timestamp: new Date().toISOString(), tx_type: 'CASH_MOVEMENT', idempotency_key: key,
    cash_movement_payload: { movement_type: type, amount_minor: String(amountMinor), reason, idempotency_key: key },
  };
}

/** Removes queued items the server has accepted (processed, duplicate or reconciled); keeps rejected ones for review. */
export function settleQueue(queue, resolutions) {
  const done = new Set(resolutions.filter((r) => r.status !== 'REJECTED').map((r) => r.client_tx_id));
  return queue.filter((q) => !done.has(q.client_tx_id));
}

const CSS = `.stk-till{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr);gap:16px;margin:8px 0 20px}
.stk-till section{border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.stk-till .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.stk-till table{width:100%;border-collapse:collapse}.stk-till td,.stk-till th{padding:6px 4px;text-align:left;border-bottom:1px solid var(--border)}
.stk-till .num{text-align:right;font-variant-numeric:tabular-nums}.stk-till .full{grid-column:1/-1}
.stk-till .banner{grid-column:1/-1;border:1px solid var(--border-strong,var(--border));border-radius:8px;padding:8px 12px}
.stk-till .results{max-height:240px;overflow:auto}
@media (max-width:900px){.stk-till{grid-template-columns:1fr}}`;

export function mountTill(cfg, panel, api) {
  const KEY = `stk-till:${cfg.tenantId}`;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const st = Object.assign({ cart: [], parked: [], queue: [], seq: 0, products: [], deviceId: uid('dev') }, load());
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  let tenders = [{ tender_type: 'CASH', amount_minor: 0 }];
  let msg = '';

  if (!document.getElementById('stk-till-css')) { const s = document.createElement('style'); s.id = 'stk-till-css'; s.textContent = CSS; document.head.appendChild(s); }
  const root = document.createElement('div');
  root.className = 'stk-till';
  const anchor = panel.querySelector('.stk-live-records');
  if (anchor) anchor.before(root); else panel.prepend(root);

  const call = async (method, path, body) => {
    const res = await api(method, path, body);
    if (res.status === 403) throw Object.assign(new Error('Your role is not allowed to do this.'), { handled: true });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(j?.error?.message || (Array.isArray(j?.message) ? j.message.join(', ') : j?.message) || `Error ${res.status}`), { handled: true });
    return j;
  };
  const say = (m) => { msg = m; render(); };

  async function refreshProducts() {
    try { st.products = await call('GET', `/pos/products${st.register ? `?warehouse_id=${encodeURIComponent(st.register.warehouse_id)}` : ''}`); save(); } catch { /* keep the saved list for offline selling */ }
  }

  async function flush() {
    if (!st.queue.length || !navigator.onLine || !st.session) return;
    try {
      const r = await call('POST', '/pos/sync', { device_id: st.deviceId, pos_register_id: st.register.id, pos_session_id: st.session.id, transactions: st.queue });
      const before = st.queue.length;
      st.queue = settleQueue(st.queue, r.resolutions || []);
      save();
      say(`${before - st.queue.length} offline transaction(s) sent.${st.queue.length ? ` ${st.queue.length} need review.` : ''}`);
    } catch (e) { if (e.handled) say(`Offline sales could not be sent: ${e.message}`); }
  }

  async function openShift(form) {
    const float = toMinor(form.float.value);
    if (float === null) return say('Enter the starting cash, e.g. 5000.00.');
    try {
      const reg = st.registers.find((r) => r.id === form.register.value);
      const s = await call('POST', '/pos/sessions/open', { register_id: reg.id, opening_float_minor: String(float) });
      st.session = s.session || s; st.register = reg; save(); await refreshProducts(); say('Shift opened.');
    } catch (e) { say(e.message); }
  }

  async function completeSale() {
    const err = validateTenders(st.cart, tenders);
    if (err) return say(err);
    const payBtn = root.querySelector('[data-act="pay"]');
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(payBtn, 'Processing sale…');
    const key = uid('sale');
    const cartCopy = st.cart.map((l) => ({ ...l }));
    const totalMinor = cartTotalMinor(cartCopy);
    const paid = tenders.reduce((s, t) => s + t.amount_minor, 0);
    let receipt;
    try {
      if (st.ticketCode) {
        if (!navigator.onLine) return say('An order slip needs the connection to be paid. Try again when back online.');
        try {
          const { checkout: r } = await call('POST', `/pos/tickets/${encodeURIComponent(st.ticketCode)}/pay`, { pos_session_id: st.session.id, pos_register_id: st.register.id, idempotency_key: key, tenders: buildCheckout(st, tenders, key).tenders });
          receipt = { number: r.receipt_number || r.order_number, total: r.total_payable_minor, paid: r.total_tendered_minor, change: r.change_due_minor, offline: false, slip: st.ticketCode };
        } catch (e) { return say(e.message); }
        st.ticketCode = null;
      } else try {
        if (!navigator.onLine) throw new TypeError('offline');
        const r = await call('POST', '/pos/checkout', buildCheckout(st, tenders, key));
        receipt = { number: r.receipt_number || r.order_number, total: r.total_payable_minor, paid: r.total_tendered_minor, change: r.change_due_minor, offline: false };
      } catch (e) {
        if (e.handled) return say(e.message);
        st.queue.push(offlineSale(st, tenders, key, ++st.seq));
        receipt = { number: `${key} (offline)`, total: totalMinor, paid, change: Math.max(0, paid - totalMinor), offline: true };
      }
      st.lastReceipt = { ...receipt, lines: cartCopy, tenders: tenders.map((t) => ({ ...t })), at: new Date().toLocaleString() };
      st.cart = []; st.customer_id = null; tenders = [{ tender_type: 'CASH', amount_minor: 0 }]; save();
      const saleMsg = receipt.offline ? `Sale kept on this device; it will be sent when the connection is back. Change due: ${money(receipt.change)}.` : `Sale complete. Change due: ${money(receipt.change)}.`;
      say(saleMsg);
      if (window.stokrovaToast) window.stokrovaToast(saleMsg);
      if (!receipt.offline) refreshProducts().then(render);
    } finally {
      if (window.stokrovaStopLoading) window.stokrovaStopLoading(payBtn);
    }
  }

  async function cashMove(type, form) {
    const amt = toMinor(form.amount.value);
    const reason = form.reason.value.trim();
    if (!amt || !reason) return say('Enter an amount and a reason.');
    const btn = form.querySelector(`button[value="${type}"]`);
    if (window.stokrovaStartLoading) window.stokrovaStartLoading(btn, 'Recording…');
    try {
      if (!navigator.onLine) throw new TypeError('offline');
      await call('POST', `/pos/sessions/${encodeURIComponent(st.session.id)}/${type === 'CASH_IN' ? 'cash-in' : 'cash-out'}`, { amount_minor: String(amt), reason });
      const msg = `${type === 'CASH_IN' ? 'Cash in' : 'Cash out'} of ${money(amt)} recorded.`;
      say(msg);
      if (window.stokrovaToast) window.stokrovaToast(msg);
    } catch (e) {
      if (e.handled) return say(e.message);
      st.queue.push(offlineCash(st, type, amt, reason, uid('cash'), ++st.seq)); save();
      const offlineMsg = 'Cash movement kept on this device until the connection is back.';
      say(offlineMsg);
      if (window.stokrovaToast) window.stokrovaToast(offlineMsg);
    } finally {
      if (window.stokrovaStopLoading) window.stokrovaStopLoading(btn);
    }
  }

  async function closeShift(form) {
    const counted = toMinor(form.counted.value);
    if (counted === null) return say('Count the drawer and enter the cash amount.');
    if (st.queue.length) { await flush(); if (st.queue.length) return say('Send the offline sales before closing the shift.'); }
    const closeBtn = form.querySelector('button');
    const doClose = async () => {
      if (window.stokrovaStartLoading) window.stokrovaStartLoading(closeBtn, 'Closing shift…');
      try {
        await call('POST', `/pos/sessions/${encodeURIComponent(st.session.id)}/close`, { closing_actual_minor: String(counted) });
        const z = await call('GET', `/pos/sessions/${encodeURIComponent(st.session.id)}/summary`).catch(() => null);
        const takings = await call('GET', `/payments/takings/${encodeURIComponent(st.session.id)}`).catch(() => null);
        st.lastZ = { at: new Date().toLocaleString(), register: st.register.name, counted, summary: z, takings };
        st.session = null; save(); say('Shift closed. The end-of-day report is below.');
        if (window.stokrovaToast) window.stokrovaToast('Shift closed successfully.');
      } catch (e) {
        say(e.message);
      } finally {
        if (window.stokrovaStopLoading) window.stokrovaStopLoading(closeBtn);
      }
    };
    if (window.stokrovaConfirmInline) {
      window.stokrovaConfirmInline({
        target: closeBtn,
        message: 'Close this register shift and print end-of-day report?',
        onConfirm: doClose,
      });
    } else {
      doClose();
    }
  }

  async function startReturn(form) {
    const p = st.products.find((x) => x.variant_id === form.variant.value);
    const qty = Number(form.qty.value);
    if (!p || !Number.isInteger(qty) || qty < 1) return say('Choose the product and a whole-number quantity.');
    try {
      const r = await call('POST', '/returns', {
        warehouse_id: st.register.warehouse_id, type: 'CUSTOMER_RETURN', original_order_number: form.order.value.trim() || null,
        lines: [{ variant_id: p.variant_id, sku: p.sku, item_name: p.sku, quantity_authorized: qty, unit_price_cents: Number(p.price_minor), currency: (st.session?.currency_code || 'USD'), reason_code: form.reason.value }],
      });
      const id = r.rma?.id || r.id;
      if (id) await call('POST', `/returns/${encodeURIComponent(id)}/request`).catch(() => null);
      say('Return started. A manager approves it before any refund is given.');
    } catch (e) { say(e.message); }
  }

  function printDoc(title, html) {
    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) return say('Allow pop-ups to print.');
    w.document.write(`<title>${esc(title)}</title><body style="font-family:monospace;padding:12px">${html}<script>print()<\/script></body>`);
    w.document.close();
  }
  const receiptHtml = (r) => `<h3>${esc(st.register?.receipt_header || st.register?.name || 'Receipt')}</h3><p>${esc(r.number)}${r.slip ? `<br>Order slip ${esc(r.slip)} · PAID` : ''}<br>${esc(r.at)}</p><table>${r.lines.map((l) => `<tr><td>${l.quantity} × ${esc(l.sku)}</td><td style="text-align:right">${money(l.price_minor * l.quantity)}</td></tr>`).join('')}</table><hr><p>Total ${money(r.total)}<br>Paid ${money(r.paid)}<br>Change ${money(r.change)}</p><p>${esc(st.register?.receipt_footer || 'Thank you')}</p>`;

  function render() {
    const offline = !navigator.onLine;
    const head = `<div class="banner" role="status">${offline ? 'Offline — sales are kept on this device and sent automatically when the connection returns.' : 'Online'}${st.queue.length ? ` · ${st.queue.length} waiting to send <button class="stk-btn" data-act="flush">Send now</button>` : ''}${msg ? ` · ${esc(msg)}` : ''}</div>`;
    if (!st.session) {
      root.innerHTML = head + `<section class="full"><h2 class="stk-demo-section">Open a shift</h2>
        <form class="row" data-form="open"><label>Register <select name="register" required>${(st.registers || []).map((r) => `<option value="${esc(r.id)}">${esc(r.name || r.code)}</option>`).join('') || '<option value="">No registers yet</option>'}</select></label>
        <label>Starting cash <input name="float" inputmode="decimal" required placeholder="0.00"></label><button class="stk-btn stk-btn-primary">Open shift</button></form>
        ${st.lastZ ? zHtml() : ''}</section>`;
      return;
    }
    const q = (root.querySelector('[name=search]')?.value || '').toLowerCase();
    const found = st.products.filter((p) => !q || [p.sku, p.barcode].some((x) => String(x || '').toLowerCase().includes(q))).slice(0, 30);
    const total = cartTotalMinor(st.cart);
    root.innerHTML = head + `
      <section><h2 class="stk-demo-section">${esc(st.register.name)} · shift open</h2>
        <input name="search" placeholder="Scan a product or an order slip (TK-…), then Enter" value="${esc(q)}" aria-label="Scan or search products">
        <div class="results"><table><thead><tr><th>Product</th><th class="num">Price</th><th class="num">In stock</th><th></th></tr></thead><tbody>
        ${found.map((p) => `<tr><td>${esc(p.sku)}</td><td class="num">${money(p.price_minor)}</td><td class="num">${p.available_quantity}</td><td><button class="stk-btn" data-add="${esc(p.variant_id)}">Add</button></td></tr>`).join('') || '<tr><td colspan="4">No products match.</td></tr>'}
        </tbody></table></div></section>
      <section><h2 class="stk-demo-section">Sale</h2>${st.ticketCode ? `<p class="banner">Order slip <strong>${esc(st.ticketCode)}</strong> — items and quantities come from the picker. Take payment, or <button class="stk-btn" data-act="clearslip">clear slip</button>.</p>` : ''}
        <table><tbody>${st.cart.map((l, i) => `<tr><td>${esc(l.sku)}</td><td><button class="stk-btn" data-dec="${i}" aria-label="One less">−</button> ${l.quantity} <button class="stk-btn" data-inc="${i}" aria-label="One more">+</button></td><td class="num">${money(l.price_minor * l.quantity)}</td><td><button class="stk-btn" data-del="${i}" aria-label="Remove">✕</button></td></tr>`).join('') || '<tr><td>Scan or add a product to start.</td></tr>'}</tbody></table>
        <p class="num"><strong>Total ${money(total)}</strong></p>
        ${tenders.map((t, i) => `<div class="row"><select data-ttype="${i}">${[['CASH', 'Cash'], ['BANK_TRANSFER', 'Transfer (incl. card)']].map(([x, l]) => `<option value="${x}" ${x === t.tender_type ? 'selected' : ''}>${l}</option>`).join('')}</select><input data-tamt="${i}" inputmode="decimal" placeholder="Amount" value="${t.amount_minor ? (t.amount_minor / 100).toFixed(2) : ''}">${i ? `<button class="stk-btn" data-tdel="${i}">✕</button>` : ''}</div>`).join('')}
        <div class="row"><button class="stk-btn" data-act="exact">Exact amount</button><button class="stk-btn" data-act="split">Split payment</button><button class="stk-btn stk-btn-primary" data-act="pay">Complete sale</button></div>
        <div class="row"><button class="stk-btn" data-act="park" ${st.cart.length ? '' : 'disabled'}>Park sale</button>${st.parked.map((p, i) => `<button class="stk-btn" data-resume="${i}">Resume ${esc(p.label)}</button>`).join('')}${st.lastReceipt ? '<button class="stk-btn" data-act="reprint">Reprint last receipt</button>' : ''}</div>
      </section>
      <section><h2 class="stk-demo-section">Cash in / cash out</h2>
        <form class="row" data-form="cash"><input name="amount" inputmode="decimal" placeholder="Amount" aria-label="Amount"><input name="reason" placeholder="Reason" aria-label="Reason"><button class="stk-btn" name="t" value="CASH_IN">Cash in</button><button class="stk-btn" name="t" value="CASH_OUT">Cash out</button></form></section>
      <section><h2 class="stk-demo-section">Return at the till</h2>
        <form class="row" data-form="return"><input name="order" placeholder="Receipt / order no." aria-label="Receipt or order number"><select name="variant" aria-label="Product">${st.products.map((p) => `<option value="${esc(p.variant_id)}">${esc(p.sku)}</option>`).join('')}</select><input name="qty" type="number" min="1" step="1" value="1" aria-label="Quantity"><select name="reason" aria-label="Reason">${['DEFECTIVE', 'NOT_AS_DESCRIBED', 'BUYER_REMORSE', 'EXPIRED', 'OTHER'].map((r) => `<option>${r}</option>`).join('')}</select><button class="stk-btn">Start return</button></form></section>
      <section class="full"><h2 class="stk-demo-section">Close shift</h2>
        <form class="row" data-form="close"><label>Counted cash in drawer <input name="counted" inputmode="decimal" placeholder="0.00" required></label><button class="stk-btn stk-btn-primary">Close shift &amp; print end-of-day report</button></form></section>`;
    const s = root.querySelector('[name=search]');
    if (q) { s.focus(); s.setSelectionRange(q.length, q.length); }
  }

  function zHtml() {
    const z = st.lastZ, sm = z.summary || {};
    const rows = Object.entries(sm.summary || sm).filter(([k, v]) => /_minor$/.test(k) && typeof v !== 'object').map(([k, v]) => `<tr><td>${esc(k.replace(/_minor$/, '').replace(/_/g, ' '))}</td><td class="num">${money(v)}</td></tr>`).join('');
    return `<h2 class="stk-demo-section">End-of-day report · ${esc(z.register)} · ${esc(z.at)}</h2><table><tbody>${z.takings ? `<tr><td><strong>Cash received — should be in the drawer</strong></td><td class="num">${money(z.takings.cash_received_minor)}</td></tr><tr><td><strong>Transfers received — should be in the bank</strong></td><td class="num">${money(z.takings.transfer_received_minor)}</td></tr><tr><td>Total received</td><td class="num">${money(z.takings.total_received_minor)}</td></tr>` : ''}<tr><td>counted cash</td><td class="num">${money(z.counted)}</td></tr>${rows}</tbody></table><button class="stk-btn" data-act="printz">Print report</button>`;
  }

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'search') return render();
    if (t.dataset.tamt) { tenders[t.dataset.tamt].amount_minor = toMinor(t.value) || 0; }
    if (t.dataset.tref) { tenders[t.dataset.tref].reference = t.value; }
  });
  root.addEventListener('change', (e) => { const t = e.target; if (t.dataset.ttype) { tenders[t.dataset.ttype].tender_type = t.value; render(); } });
  root.addEventListener('keydown', (e) => {
    if (e.target.name !== 'search' || e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.target.value.trim().toLowerCase();
    if (isTicketCode(v)) {
      e.target.value = '';
      if (st.cart.length && !st.ticketCode) return say('Finish or park the current sale before scanning an order slip.');
      call('GET', `/pos/tickets/${encodeURIComponent(v)}`).then((t) => {
        if (t.status === 'PAID') return say(`Order slip ${t.code} is already paid.`);
        if (t.status !== 'READY') return say(t.status === 'OPEN' || t.status === 'PICKING' ? `The picker has not finished order slip ${t.code} yet.` : `Order slip ${t.code} is ${t.status.toLowerCase()}.`);
        st.cart = ticketToCart(t); st.ticketCode = t.code; save(); say(`Order slip ${t.code} loaded${t.customer_name ? ` for ${t.customer_name}` : ''}.`);
      }).catch((err) => say(err.message || 'That order slip could not be found.'));
      return;
    }
    const p = st.products.find((x) => String(x.barcode || '').toLowerCase() === v || String(x.sku).toLowerCase() === v)
      || st.products.find((x) => String(x.sku).toLowerCase().includes(v));
    if (!p) return say('No product with that code.');
    addToCart(st.cart, p); e.target.value = ''; save(); msg = ''; render();
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.closest('form')) return;
    const d = b.dataset;
    if (st.ticketCode && (d.add || d.inc || d.dec || d.del || d.act === 'park')) return say('This sale is an order slip. Clear the slip to change items.');
    if (d.act === 'clearslip') { st.ticketCode = null; st.cart = []; save(); return say('Order slip cleared; the items stay held for the customer.'); }
    if (d.add) { addToCart(st.cart, st.products.find((p) => p.variant_id === d.add)); }
    else if (d.inc) st.cart[d.inc].quantity++;
    else if (d.dec) { if (--st.cart[d.dec].quantity < 1) st.cart.splice(d.dec, 1); }
    else if (d.del) st.cart.splice(d.del, 1);
    else if (d.tdel) tenders.splice(d.tdel, 1);
    else if (d.resume) { if (st.cart.length) st.parked.push({ label: `#${st.parked.length + 1}`, cart: st.cart }); st.cart = st.parked.splice(d.resume, 1)[0].cart; }
    else if (d.act === 'exact') { const paid = tenders.slice(1).reduce((s, t) => s + t.amount_minor, 0); tenders[0].amount_minor = Math.max(0, cartTotalMinor(st.cart) - paid); }
    else if (d.act === 'split') tenders.push({ tender_type: 'BANK_TRANSFER', amount_minor: 0 });
    else if (d.act === 'park') { st.parked.push({ label: `#${st.parked.length + 1} (${money(cartTotalMinor(st.cart))})`, cart: st.cart }); st.cart = []; }
    else if (d.act === 'pay') return completeSale();
    else if (d.act === 'flush') return flush();
    else if (d.act === 'reprint') return printDoc('Receipt', receiptHtml(st.lastReceipt));
    else if (d.act === 'printz') return printDoc('End-of-day report', zHtml());
    save(); render();
  });
  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, kind = f.dataset.form;
    if (kind === 'open') openShift(f);
    else if (kind === 'cash') cashMove(e.submitter?.value || 'CASH_IN', f);
    else if (kind === 'close') closeShift(f);
    else if (kind === 'return') startReturn(f);
  });
  window.addEventListener('online', () => { render(); flush(); });
  window.addEventListener('offline', render);
  setInterval(flush, 30000);

  (async () => {
    try { st.registers = await call('GET', '/pos/registers'); } catch { st.registers = st.registers || []; }
    if (Array.isArray(st.registers?.registers)) st.registers = st.registers.registers;
    if (st.register) {
      try { const s = await call('GET', `/pos/sessions/active?register_id=${encodeURIComponent(st.register.id)}`); st.session = s && s.id ? s : (s?.session || (navigator.onLine ? null : st.session)); } catch { /* offline: keep the saved shift */ }
    }
    await refreshProducts(); save(); render(); flush();
  })();
  render();
}
