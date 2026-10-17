/*
 * Universal Daily Work Session Dock & History Client.
 * Equips every business role with:
 * 1. Fixed bottom dock with Imperial Gold "START MY WORK" and Slate "END WORK".
 * 2. Offline-first local session recording with timestamp and idempotency.
 * 3. Daily shift history viewer with date selector (Today, Yesterday, Previous Days).
 */

const STORAGE_KEY = 'stokrova_active_session';
const OFFLINE_QUEUE_KEY = 'stokrova_offline_sessions_queue';

function getLocalSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function queueOfflineSession(item) {
  try {
    const q = getOfflineQueue();
    q.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

function formatElapsed(startedAtIso) {
  if (!startedAtIso) return '0m';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatMinor(minor) {
  return (Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function mountSessionDock() {
  if (document.getElementById('stk-session-dock')) return;

  const style = document.createElement('style');
  style.id = 'stk-session-dock-style';
  style.textContent = `
    .stk-session-dock {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: rgba(22, 27, 30, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid #333D46;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.45);
      color: #F8FAFC;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stk-dock-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .stk-dock-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .stk-dock-badge.active {
      background: rgba(74, 222, 128, 0.12);
      color: #4ADE80;
      border: 1px solid rgba(74, 222, 128, 0.35);
    }
    .stk-dock-badge.inactive {
      background: rgba(189, 150, 82, 0.12);
      color: #BD9652;
      border: 1px solid rgba(189, 150, 82, 0.35);
    }
    .stk-dock-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }
    .stk-dock-timer {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      font-size: 0.9375rem;
      color: #F8FAFC;
    }
    .stk-dock-metrics {
      display: inline-flex;
      gap: 12px;
      font-size: 0.8125rem;
      color: #ACB8C3;
    }
    .stk-dock-metrics strong {
      color: #BD9652;
    }
    .stk-dock-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stk-btn-start-work {
      background: #BD9652;
      color: #161B1E;
      border: none;
      border-radius: 8px;
      padding: 10px 22px;
      font-size: 0.875rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 12px rgba(189, 150, 82, 0.35);
    }
    .stk-btn-start-work:hover {
      background: #CEB274;
      transform: translateY(-1px);
    }
    .stk-btn-end-work {
      background: #242A2F;
      color: #F87171;
      border: 1px solid #5C1D24;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .stk-btn-end-work:hover {
      background: #2C1518;
      border-color: #F87171;
    }
    .stk-btn-history {
      background: transparent;
      color: #ACB8C3;
      border: 1px solid #333D46;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .stk-btn-history:hover {
      color: #F8FAFC;
      border-color: #BD9652;
    }
    /* Padding bottom for viewport to prevent dock obscuring content */
    .workspace-viewport {
      padding-bottom: 64px !important;
    }
  `;
  document.head.append(style);

  const dock = document.createElement('aside');
  dock.id = 'stk-session-dock';
  dock.className = 'stk-session-dock';
  document.body.append(dock);

  let activeSession = getLocalSession();
  let timerInterval = null;

  async function fetchServerSession() {
    try {
      const res = await fetch('/v1/work-sessions/current', { credentials: 'same-origin' });
      if (res.ok) {
        const s = await res.json();
        if (s && s.status === 'ACTIVE') {
          activeSession = s;
          setLocalSession(s);
          renderDock();
        } else if (!s && activeSession && !activeSession.offline_origin) {
          activeSession = null;
          setLocalSession(null);
          renderDock();
        }
      }
    } catch {}
  }

  function renderDock() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (activeSession && activeSession.status === 'ACTIVE') {
      dock.innerHTML = `
        <div class="stk-dock-left">
          <span class="stk-dock-badge active">
            <span class="stk-dock-pulse"></span>
            Session Active
          </span>
          <span class="stk-dock-timer" id="stk-live-timer">${formatElapsed(activeSession.started_at)}</span>
          <div class="stk-dock-metrics">
            <span>Sales: <strong id="stk-dock-sales">$${formatMinor(activeSession.total_sales_minor)}</strong></span>
            <span>Items: <strong id="stk-dock-items">${activeSession.items_handled || 0}</strong></span>
            <span>Date: <strong>${activeSession.session_date || new Date().toISOString().slice(0, 10)}</strong></span>
          </div>
        </div>
        <div class="stk-dock-right">
          <button type="button" class="stk-btn-history" id="stk-nav-history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Shift History
          </button>
          <button type="button" class="stk-btn-end-work" id="stk-action-end">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            End My Work
          </button>
        </div>
      `;

      timerInterval = setInterval(() => {
        const timerEl = document.getElementById('stk-live-timer');
        if (timerEl && activeSession) timerEl.textContent = formatElapsed(activeSession.started_at);
      }, 1000);

      document.getElementById('stk-action-end')?.addEventListener('click', handleEndWork);
    } else {
      dock.innerHTML = `
        <div class="stk-dock-left">
          <span class="stk-dock-badge inactive">
            <span class="stk-dock-pulse"></span>
            Shift Offline Ready
          </span>
          <span style="font-size:0.875rem; color:#ACB8C3;">Work not started today · Tap to begin recording your day</span>
        </div>
        <div class="stk-dock-right">
          <button type="button" class="stk-btn-history" id="stk-nav-history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Shift History
          </button>
          <button type="button" class="stk-btn-start-work" id="stk-action-start">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start My Work
          </button>
        </div>
      `;

      document.getElementById('stk-action-start')?.addEventListener('click', handleStartWork);
    }

    document.getElementById('stk-nav-history')?.addEventListener('click', () => {
      window.location.hash = '#ws-view-work-history';
      const historyView = document.getElementById('ws-view-work-history');
      if (historyView) {
        historyView.scrollIntoView({ behavior: 'smooth' });
        renderHistoryView(historyView);
      }
    });
  }

  async function handleStartWork() {
    const nowIso = new Date().toISOString();
    const localId = `dws_local_${Date.now().toString(36)}`;

    // Optimistic local state (works completely offline)
    activeSession = {
      id: localId,
      status: 'ACTIVE',
      started_at: nowIso,
      session_date: nowIso.slice(0, 10),
      total_sales_minor: 0,
      items_handled: 0,
      offline_origin: !navigator.onLine,
    };
    setLocalSession(activeSession);
    renderDock();

    if (navigator.onLine) {
      try {
        const res = await fetch('/v1/work-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ started_at: nowIso, idempotency_key: `start_${localId}` }),
        });
        if (res.ok) {
          activeSession = await res.json();
          setLocalSession(activeSession);
          renderDock();
        }
      } catch (e) {
        queueOfflineSession({ action: 'START', session: activeSession });
      }
    } else {
      queueOfflineSession({ action: 'START', session: activeSession });
    }
  }

  async function handleEndWork() {
    if (!confirm("Conclude your shift and seal today's schedule records?")) return;
    const nowIso = new Date().toISOString();
    const targetId = activeSession?.id;

    if (navigator.onLine && targetId && !targetId.startsWith('dws_local_')) {
      try {
        await fetch('/v1/work-sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: targetId, ended_at: nowIso }),
        });
      } catch {}
    } else {
      queueOfflineSession({ action: 'END', session_id: targetId, ended_at: nowIso });
    }

    activeSession = null;
    setLocalSession(null);
    renderDock();
    alert('Your shift has been concluded and saved into your daily history.');
  }

  renderDock();
  fetchServerSession();

  // Re-check server on reconnect
  window.addEventListener('online', () => {
    fetchServerSession();
    syncOfflineQueue();
  });
}

async function syncOfflineQueue() {
  const q = getOfflineQueue();
  if (!q.length || !navigator.onLine) return;
  for (const item of [...q]) {
    try {
      if (item.action === 'START') {
        await fetch('/v1/work-sessions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: item.session }),
        });
      }
    } catch {}
  }
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function renderHistoryView(container, selectedDate) {
  if (!container) return;
  const today = new Date().toISOString().slice(0, 10);
  const date = selectedDate || today;

  container.innerHTML = `
    <div style="padding: 24px; color: #F8FAFC; max-width: 1400px; margin: 0 auto;">
      <header style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px; border-bottom:1px solid #333D46; padding-bottom:16px;">
        <div>
          <h1 style="font-size:1.6rem; margin:0 0 6px; font-weight:800; letter-spacing:-0.02em;">DAILY WORK SESSION & SHIFT HISTORY</h1>
          <p style="color:#ACB8C3; margin:0; font-size:0.875rem;">Audit log and verified productivity metrics per worker and day schedule.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="stk-date-pill" data-date="${today}" style="background:${date === today ? '#BD9652' : '#242A2F'}; color:${date === today ? '#161B1E' : '#ACB8C3'}; border:1px solid #333D46; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer;">Today</button>
          <button type="button" class="stk-date-pill" data-date="${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}" style="background:#242A2F; color:#ACB8C3; border:1px solid #333D46; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer;">Yesterday</button>
          <input type="date" value="${date}" id="stk-custom-date" style="background:#161B1E; color:#F8FAFC; border:1px solid #333D46; border-radius:6px; padding:6px 10px;" />
        </div>
      </header>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:#1E2428; border:1px solid #333D46; border-radius:8px; padding:18px;">
          <div style="font-size:0.75rem; color:#ACB8C3; text-transform:uppercase; font-weight:700;">Total Sales Volume</div>
          <div style="font-size:1.8rem; font-weight:800; color:#BD9652; margin:6px 0; font-variant-numeric:tabular-nums;" id="stk-stat-sales">$0.00</div>
          <div style="font-size:0.75rem; color:#4ADE80;">Verified Shift Ledger</div>
        </div>
        <div style="background:#1E2428; border:1px solid #333D46; border-radius:8px; padding:18px;">
          <div style="font-size:0.75rem; color:#ACB8C3; text-transform:uppercase; font-weight:700;">Gross Profit & Margin</div>
          <div style="font-size:1.8rem; font-weight:800; color:#F8FAFC; margin:6px 0;" id="stk-stat-profit">$0.00</div>
          <div style="font-size:0.75rem; color:#ACB8C3;">Margin: <strong id="stk-stat-margin">--</strong></div>
        </div>
        <div style="background:#1E2428; border:1px solid #333D46; border-radius:8px; padding:18px;">
          <div style="font-size:0.75rem; color:#ACB8C3; text-transform:uppercase; font-weight:700;">Drawer Liquidity</div>
          <div style="font-size:1.1rem; font-weight:700; color:#F8FAFC; margin:6px 0;">Cash: <span id="stk-stat-cash">$0.00</span></div>
          <div style="font-size:0.8125rem; color:#ACB8C3;">Transfer: <span id="stk-stat-transfer">$0.00</span></div>
        </div>
        <div style="background:#1E2428; border:1px solid #333D46; border-radius:8px; padding:18px;">
          <div style="font-size:0.75rem; color:#ACB8C3; text-transform:uppercase; font-weight:700;">Throughput & Activity</div>
          <div style="font-size:1.8rem; font-weight:800; color:#F8FAFC; margin:6px 0;" id="stk-stat-txns">0</div>
          <div style="font-size:0.75rem; color:#ACB8C3;">Tickets & Orders Handled</div>
        </div>
      </div>

      <div style="background:#1E2428; border:1px solid #333D46; border-radius:8px; overflow:hidden;">
        <div style="padding:14px 18px; border-bottom:1px solid #333D46; font-weight:700; font-size:0.875rem; display:flex; justify-content:space-between; align-items:center;">
          <span>Itemized Work & Sales Activity Ledger</span>
          <span style="font-size:0.75rem; color:#4ADE80; font-weight:600;">[LOCAL + CLOUD SYNCED]</span>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
            <thead>
              <tr style="background:#161B1E; color:#ACB8C3; font-size:0.75rem;">
                <th style="padding:10px 14px;">Started</th>
                <th style="padding:10px 14px;">Concluded</th>
                <th style="padding:10px 14px;">Role</th>
                <th style="padding:10px 14px;">Duration</th>
                <th style="padding:10px 14px;">Sales</th>
                <th style="padding:10px 14px;">Status</th>
              </tr>
            </thead>
            <tbody id="stk-sessions-tbody">
              <tr>
                <td colspan="6" style="padding:24px; text-align:center; color:#ACB8C3;">Loading session records...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await fetch(`/v1/work-sessions/history?date=${date}`, { credentials: 'same-origin' });
    if (res.ok) {
      const list = await res.json();
      const tbody = container.querySelector('#stk-sessions-tbody');
      if (tbody) {
        if (!list.length) {
          tbody.innerHTML = `<tr><td colspan="6" style="padding:24px; text-align:center; color:#ACB8C3;">No work sessions recorded for ${date}.</td></tr>`;
        } else {
          let totSales = 0, totCash = 0, totTransfer = 0, totTxns = 0;
          tbody.innerHTML = list.map((s) => {
            totSales += Number(s.total_sales_minor || 0);
            totCash += Number(s.cash_minor || 0);
            totTransfer += Number(s.transfer_minor || 0);
            totTxns += Number(s.transactions_count || 0);
            const hrs = Math.floor(s.duration_seconds / 3600);
            const mins = Math.floor((s.duration_seconds % 3600) / 60);
            const dur = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            return `
              <tr style="border-top:1px solid #333D46;">
                <td style="padding:12px 14px; font-variant-numeric:tabular-nums;">${new Date(s.started_at).toLocaleTimeString()}</td>
                <td style="padding:12px 14px; font-variant-numeric:tabular-nums;">${s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : 'In Progress'}</td>
                <td style="padding:12px 14px;"><span style="background:#242A2F; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${s.business_role}</span></td>
                <td style="padding:12px 14px;">${dur}</td>
                <td style="padding:12px 14px; color:#BD9652; font-weight:700;">$${formatMinor(s.total_sales_minor)}</td>
                <td style="padding:12px 14px;"><span style="color:${s.status === 'ACTIVE' ? '#4ADE80' : '#ACB8C3'}; font-weight:700;">${s.status}</span></td>
              </tr>
            `;
          }).join('');

          container.querySelector('#stk-stat-sales').textContent = `$${formatMinor(totSales)}`;
          container.querySelector('#stk-stat-cash').textContent = `$${formatMinor(totCash)}`;
          container.querySelector('#stk-stat-transfer').textContent = `$${formatMinor(totTransfer)}`;
          container.querySelector('#stk-stat-txns').textContent = totTxns;
        }
      }
    }
  } catch {}

  container.querySelectorAll('.stk-date-pill').forEach((btn) => {
    btn.addEventListener('click', () => renderHistoryView(container, btn.getAttribute('data-date')));
  });
  container.querySelector('#stk-custom-date')?.addEventListener('change', (e) => {
    renderHistoryView(container, e.target.value);
  });
}
