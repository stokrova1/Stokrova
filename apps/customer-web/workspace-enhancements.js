/* Presentation-only workspace enhancements. Brand tokens and existing font sizes are preserved. */
(() => {
  const viewport = document.querySelector('.workspace-viewport');
  if (!viewport) return;
  const style = document.createElement('style');
  style.textContent = `
    #business-workspace-container { height: 100dvh; min-height: 0; overflow: hidden; }
    .workspace-topbar { flex-shrink: 0; flex-wrap: wrap; gap: 8px; }
    .workspace-body { height: auto; min-height: 0; flex: 1; }
    .workspace-sidebar { flex-shrink: 0; }
    .workspace-viewport { min-width: 0; min-height: 0; overscroll-behavior: contain; }
    .ws-view-content { min-height: 0; padding-bottom: 0; }
    .ws-view-content > :last-child { margin-bottom: 0 !important; }
    .stk-demo-page { color: var(--text); }
    .stk-demo-page h1 { font-size: 1.5rem; margin: 0 0 6px; }
    .stk-demo-description { color: var(--text-secondary); font-size: .875rem; margin: 0 0 20px; line-height: 1.6; }
    .stk-demo-label { font-size: .75rem; color: var(--text-muted); }
    .stk-demo-section { margin: 24px 0 12px; font-size: .875rem; font-weight: 700; }
    .stk-demo-summary { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 16px; margin-bottom: 24px; }
    .stk-demo-stat { border: 1px solid var(--border); background: var(--surface); border-radius: 8px; padding: 18px; }
    .stk-demo-stat strong { display: block; font-size: 1.5rem; margin: 6px 0; color: var(--primary-hover); font-variant-numeric: tabular-nums; }
    .stk-demo-stat p { font-size: .8125rem; color: var(--text-secondary); margin: 0; }
    .stk-demo-table-wrap { overflow-x: auto; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .stk-demo-table { width: 100%; border-collapse: collapse; font-size: .85rem; text-align: left; }
    .stk-demo-table th { color: var(--text-muted); font-size: .7rem; padding: 12px 14px; background: var(--surface); white-space: nowrap; }
    .stk-demo-table td { padding: 16px 14px; border-top: 1px solid var(--border); }
    .stk-demo-table td:first-child { font-weight: 600; }
    .stk-demo-status { color: var(--green); white-space: nowrap; font-size: .75rem; }
    .stk-demo-flow { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 0; border-block: 1px solid var(--border); margin-top: 12px; }
    .stk-demo-step { padding: 20px 16px; }
    .stk-demo-step strong { display: block; margin: 8px 0; font-size: .875rem; }
    .stk-demo-step p { color: var(--text-secondary); font-size: .8125rem; margin: 0; line-height: 1.6; }
    .stk-demo-step svg { color: var(--primary); }
    .stk-page-end { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: .75rem; color: var(--text-muted); }
    .stk-demo-badge { color: var(--primary-hover); font-size: .75rem; margin-bottom: 12px; }
    .stk-executive-overview { margin-bottom: 24px; }
    .stk-executive-overview h1 { font-size: 1.5rem; margin: 0 0 6px; }
    .stk-executive-periods { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,300px),1fr)); gap: 24px; }
    .stk-executive-period { padding-block: 16px; border-block: 1px solid var(--border); }
    .stk-executive-period h2 { font-size: 1rem; margin: 0 0 12px; }
    .stk-executive-values { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
    .stk-executive-values strong { display:block; font-size:1.65rem; margin:6px 0; font-family:var(--stokrova-font-mono); overflow-wrap:anywhere; }
    .stk-executive-values small { font-size:.75rem; color:var(--text-secondary); }
    .stk-executive-note { font-size:.8125rem; line-height:1.7; color:var(--text-secondary); }
    .stk-executive-note strong { color:var(--primary-hover); }
    .stk-executive-positive { color:var(--green); }
    .stk-executive-chart { width:100%; height:240px; display:block; }
    .stk-executive-chart text { fill:var(--text-muted); font-size:12px; }
    .stk-executive-chart .stk-chart-profit { fill:var(--primary); }
    .stk-executive-chart .stk-chart-cost { fill:var(--border-strong); }
    .stk-executive-chart .stk-chart-guide { stroke:var(--border); }
    .stk-executive-legend { display:flex; gap:16px; flex-wrap:wrap; font-size:.75rem; color:var(--text-secondary); margin:12px 0; }
    .stk-executive-legend span { display:inline-flex; align-items:center; gap:6px; }
    .stk-executive-legend i { width:10px; height:10px; background:var(--primary); }
    .stk-executive-legend span:last-child i { background:var(--border-strong); }
    .stk-executive-comparison { margin-top:16px; }
    .stk-page-intro { position:relative; overflow:hidden; background:linear-gradient(115deg, color-mix(in srgb,var(--primary) 80%,var(--bg)) 0%, var(--primary) 46%, var(--primary-hover) 58%, var(--primary) 70%, color-mix(in srgb,var(--primary) 86%,var(--bg)) 100%); color:var(--bg); padding:22px 24px; margin-bottom:24px; border-block:1px solid var(--primary-hover); display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .stk-page-intro::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0) 42%); pointer-events:none; }
    .stk-page-intro > * { position:relative; z-index:1; }
    .stk-page-intro h1,.stk-page-intro h3 { color:inherit!important; margin:0 0 6px!important; letter-spacing:0; }
    .stk-page-intro p { color:inherit!important; margin:0!important; line-height:1.6; max-width:760px; }
    .stk-page-intro > div { min-width:0; }
    .stk-subtab-container { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px; overflow-x: auto; }
    .stk-subtab-pill { padding: 6px 14px; font-size: 0.78rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease; }
    .stk-subtab-pill.active { background: var(--primary); color: var(--bg); border-color: var(--primary); font-weight: 700; }
    @media(max-width:640px){
      .stk-page-intro{padding:14px 14px;flex-wrap:wrap}
      .stk-page-intro h1,.stk-page-intro h3{font-size:1.15rem!important;overflow-wrap:anywhere}
      .stk-page-intro p{font-size:0.75rem!important;line-height:1.4!important}
      .stk-subtab-pill{padding:4px 10px;font-size:0.72rem}
      .stk-demo-stat{padding:12px}
      .stk-demo-stat strong{font-size:1.2rem}
      .workspace-body{flex-direction:column}
      .workspace-sidebar{width:100%!important;min-width:0!important;max-height:160px;overflow:auto;border-right:0;flex-shrink:0}
      .workspace-sidebar > :last-child{display:none}
      .workspace-viewport{width:100%;padding:12px!important}
    }
  `;
  document.head.append(style);
  const icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 12 2 2 4-4"/><path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/></svg>';
  const table = (headers, rows) => `<div class="stk-demo-table-wrap"><table class="stk-demo-table"><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const status = text => `<span class="stk-demo-status">● ${text}</span>`;
  const stats = values => `<div class="stk-demo-summary">${values.map(([name,value,note]) => `<div class="stk-demo-stat"><span class="stk-demo-label">${name}</span><strong>${value}</strong><p>${note}</p></div>`).join('')}</div>`;
  const flow = steps => `<div class="stk-demo-flow">${steps.map(([title,desc],i) => `<div class="stk-demo-step">${icon}<span class="stk-demo-label"> ${String(i+1).padStart(2,'0')}</span><strong>${title}</strong><p>${desc}</p></div>`).join('')}</div>`;
  const pages = [
    ['pricing','Price Lists & Contracts','Every customer relationship, priced with confidence. Compare retail and wholesale lists alongside the agreements that keep repeat business moving.',
      stats([['Price lists','3','Retail, trade and partner pricing'],['Sample contracts','2','Customer-specific agreements'],['Products covered','24','Shared product catalog']]) +
      '<h2 class="stk-demo-section">Price lists</h2>' + table(['List','Audience','Currency','Products','Status'],[['Standard Retail','In-store & online','USD','24',status('Active')],['Wholesale Trade','Approved business accounts','USD','18',status('Active')],['Partner Distribution','Distribution partners','USD','12',status('Active')]]) +
      '<h2 class="stk-demo-section">Customer agreements</h2>' + table(['Customer','Agreement','Price list','Term','Status'],[['Sterling Hospitality','CTR-2026-014','Wholesale Trade','Jan–Dec 2026',status('Active')],['Northbridge Stores','CTR-2026-021','Partner Distribution','Apr 2026–Mar 2027',status('Active')]])],
    ['promotions','Promotions & Coupons','Give every campaign a clear purpose. See the offer, audience and redemption activity together—without losing sight of your selling price.',
      stats([['Live offers','2','Seasonal and first-order campaigns'],['Demo redemptions','146','Across the two active offers'],['Upcoming offers','1','A partner campaign ready for launch']]) + table(['Coupon','Offer','Audience','Redemptions','Status'],[['WELCOME10','10% off a first order','New customers','84',status('Active')],['AUTUMN15','15% off selected products','Retail customers','62',status('Active')],['PARTNER20','20% off a partner order','Distribution partners','0','Scheduled']]) +
      '<h2 class="stk-demo-section">Campaign snapshot</h2>' + flow([['Welcome a new customer','WELCOME10 brings a first purchase into focus.'],['Keep seasonal stock moving','AUTUMN15 connects selected products to a timely offer.'],['Review what resonates','Redemption counts show which campaigns customers choose.']])],
    ['loyalty','Loyalty Rewards','Turn a single purchase into a lasting relationship. Follow member activity, reward balances and recent redemptions in one clear view.',
      stats([['Demo members','3','A snapshot of returning customers'],['Points available','4,250','Combined sample member balances'],['Recent redemptions','3','Rewards claimed by returning members']]) + table(['Member','Tier','Available points','Last activity','Status'],[['Olivia Bennett','Gold','2,400','Reward redeemed · Oct 14',status('Active')],['James Cooper','Silver','1,250','Purchase · Oct 14',status('Active')],['Sophia Reed','Member','600','Purchase · Oct 13',status('Active')]]) +
      '<h2 class="stk-demo-section">Recent reward activity</h2>' + table(['Member','Reward','Points redeemed','Date'],[['Olivia Bennett','$10 reward','1,000','Oct 14, 2026'],['James Cooper','$5 reward','500','Oct 12, 2026'],['Sophia Reed','$5 reward','500','Oct 10, 2026']])],
    ['treasury','Treasury & Bank Feeds','A clearer picture of cash, from the bank balance to the latest movement. Review connected accounts and matched transactions side by side.',
      stats([['Sample accounts','2','Operating and reserve accounts'],['Combined balance','$148,620','Illustrative available funds'],['Matched movements','3','Recent customer and supplier payments']]) + table(['Account','Currency','Balance','Feed status'],[['Operating Account · 4821','USD','$96,240',status('Connected')],['Reserve Account · 7093','USD','$52,380',status('Connected')]]) + '<h2 class="stk-demo-section">Recent bank movements</h2>' + table(['Reference','Movement','Amount','Match'],[['BNK-1042','Customer invoice receipt','+$4,800',status('Matched')],['BNK-1041','Supplier settlement','−$2,160',status('Matched')],['BNK-1040','Card settlement','+$1,420',status('Matched')]])],
    ['consolidation','Multi-Entity Consolidation','One group view, without losing the detail of each company. Compare entity performance and see how intercompany balances come together.',
      stats([['Sample entities','2','UK and European retail operations'],['Combined revenue','$382,000','Illustrative reporting period'],['Intercompany balance','$12,400','Offsetting receivable and payable']]) + table(['Entity','Reporting currency','Revenue','Intercompany position','Status'],[['Apex Retail UK Ltd','USD','$248,000','Receivable $12,400',status('Included')],['Apex Retail Europe Ltd','USD','$134,000','Payable $12,400',status('Included')]]) + '<h2 class="stk-demo-section">Consolidation overview</h2>' + flow([['Collect entity totals','Keep each company visible in the group report.'],['Review intercompany positions','Identify the balances that offset between entities.'],['Read the group result','View $382,000 in combined sample revenue.']])],
  ];
  for (const [id,title,description,body] of pages) {
    if (document.getElementById('ws-view-' + id)) continue;
    const panel = document.createElement('div');
    panel.id = 'ws-view-' + id;
    panel.className = 'ws-view-content stk-demo-page';
    panel.style.display = 'none';
    panel.innerHTML = `<div class="stk-demo-badge">DEMO WORKSPACE · SAMPLE DATA</div><h1>${title}</h1><p class="stk-demo-description">${description}</p>${body}`;
    viewport.append(panel);
  }
  const descriptions = {
    pos: 'Keep the queue moving. Scan products, collect payment and follow each sale from the till to the ledger.',
    orders: 'Every order, one clear journey—from approval and picking to payment and dispatch.',
    invoices: 'Know what is billed, what is due and what is paid. Keep customer balances and payment terms in view.',
    quotes: 'Build the next customer agreement with clarity. Review quoted value, pricing and the path to an approved order.',
    crm: 'Put every relationship in context. Review customer accounts, open opportunities and credit health together.',
    catalog: 'A dependable home for every product, variant and barcode. Keep the details behind each sale easy to find.',
    ledger: 'Follow the story behind every unit. Review stock receipts, transfers and adjustments in a traceable movement history.',
    locations: 'From company to bin, know exactly where stock belongs across every warehouse and branch.',
    availability: 'Promise with confidence. See physical stock alongside reservations and confirmed incoming supply.',
    suppliers: 'Keep your supply network close. Compare vendor relationships, payment terms and delivery lead times.',
    po: 'Bring purchasing into focus. Follow each order from supplier commitment to goods arriving at your door.',
    receiving: 'Make every arrival count. Compare ordered quantities, physical receipts and supplier bills before moving forward.',
    picking: 'Give every pick a clear next step. Follow the wave, verify the bin and move accurate orders toward dispatch.',
    dispatch: 'Ready for the road. Review packed shipments, container details and carrier documents in one place.',
    fleet: 'See each delivery through to its destination. Follow routes, handovers and recorded proof of delivery.',
    bom: 'See what goes into every finished product. Review components, quantities and assembly costs together.',
    mo: 'Turn planned production into finished stock. Track work orders, reserved materials and recorded output.',
    registers: 'Close every shift with confidence. Compare register floats, cash movements and counted balances.',
    gl: 'Read the financial story behind each transaction, with balanced journal entries and a clear audit trail.',
    tax: 'Keep fiscal detail close to the transaction. Review tax schedules, invoice stamps and reporting exports.',
    abc: 'See what earns its shelf space. Identify high-value products and slow-moving stock that deserves attention.',
    audit: 'A clear record of who changed what and when, backed by the ledger’s integrity checks.',
    compliance: 'Keep responsibility visible. Review separation of duties, access records and retention controls.',
    org: 'One business, clearly connected. Map legal entities, branches and warehouse facilities across your organization.',
    rebranding: 'Make every touchpoint recognizably yours—from the workspace and receipt to each till and mobile screen.',
    rbac: 'The right people, in the right places. See each team member’s role, assigned location and access status at a glance.',
    devices: 'Keep the checkout essentials connected. Review printers, scanners and cash drawer connections.',
    integrations: 'Keep information flowing between systems. Review event destinations, credentials and interchange connections.',
    workflows: 'From a business event to its next action. Follow each workflow step and review a dry-run result.',
  };
  for (const [id,copy] of Object.entries(descriptions)) {
    const panel = document.getElementById('ws-view-' + id);
    const heading = panel?.querySelector('h1,h3');
    const paragraph = heading?.parentElement?.querySelector('p');
    if (paragraph) paragraph.textContent = copy;
  }
  const staff = document.querySelector('#ws-view-rbac > div');
  if (staff) {
    const summary = document.createElement('div');
    summary.innerHTML = stats([['Demo team','4','Owner, manager, cashier and accountant'],['Scope coverage','3','Tenant, branch and company assignments'],['Pending invitations','0','No outstanding demo invitations']]);
    staff.insertBefore(summary, staff.children[1] || null);
  }
  const dashboard = document.querySelector('#ws-view-dashboard .executive-dashboard');
  if (dashboard) {
    const shortcuts = [...dashboard.querySelectorAll('h4')].find(h => h.textContent.trim() === 'Executive Shortcuts');
    const shortcutPanel = shortcuts?.parentElement?.parentElement;
    if (shortcutPanel) {
      const row = shortcutPanel.parentElement;
      shortcutPanel.remove();
      if (row) [...row.children].forEach(panel => { panel.style.gridColumn = 'span 6'; });
    }
    import('./executive-live.js').then(({ mountExecutive }) => mountExecutive(dashboard));
  }
  document.querySelectorAll('.ws-view-content').forEach(panel => {
    const footer = document.createElement('div');
    footer.className = 'stk-page-end';
    footer.innerHTML = '<span>STOKROVA · Demo workspace</span><span>End of section</span>';
    panel.append(footer);
  });
  const extraDescriptions = {
    dashboard:'Your business at a glance. Follow sales, margin, stock movements and the items that need attention today.',
    accountant:'Keep the books in balance. Review invoices, recorded receipts and outstanding customer balances.',
    'cashier-desk':'A clear view of your shift. Follow recorded sales, cash and transfers from the first sale to closing.',
    'my-day':'Your work, today. Review completed tasks, sales and the progress you have made this shift.',
    tickets:'From order to collection. Follow reserved items, picking progress and cashier handovers.',
    billing:'Your plan, clearly explained. Review subscription access, current prices and outstanding plan invoices.',
    prices:'Every product, priced with clarity. Compare cost, selling price and unit margin, and review price changes.',
    'product-profit':'See what each product contributes. Compare units sold, revenue and known profit across periods.',
    'live-board':'Your team in action. Follow sales, stock movements and completed work across the business.',
  };
  function polishPageIntro(panel) {
    if (panel.querySelector('.stk-page-intro')) return;
    const heading = panel.querySelector('h1,h3,h2');
    if (!heading) return;
    const id = panel.id.replace('ws-view-','');
    const intro = document.createElement('header'); intro.className = 'stk-page-intro';
    const copy = document.createElement('div');
    const parent = heading.parentElement;
    const paragraph = parent?.querySelector(':scope > p');
    const actionRow = parent?.parentElement;
    const actions = actionRow?.querySelector(':scope > button');
    copy.append(heading);
    if (id === 'dashboard') heading.textContent = 'Executive Command Center';
    if (paragraph) copy.append(paragraph);
    else {
      const p = document.createElement('p');
      p.className = 'stk-demo-description';
      p.textContent = descriptions[id] || extraDescriptions[id] || `Review ${heading.textContent.trim().toLowerCase()} records and the latest activity for your business.`;
      copy.append(p);
    }
    intro.append(copy);
    if (id === 'dashboard' && paragraph) paragraph.textContent = extraDescriptions.dashboard;
    if (actions && actionRow?.children.length === 2) intro.append(actions);
    panel.prepend(intro);
    if (parent && !parent.children.length) parent.remove();
    if (actionRow && actionRow !== panel && !actionRow.children.length) actionRow.remove();
  }
  document.querySelectorAll('.ws-view-content').forEach(polishPageIntro);
  new MutationObserver(() => document.querySelectorAll('.ws-view-content').forEach(polishPageIntro)).observe(viewport, { childList:true, subtree:true });

  function openAppDownloadModal() {
    let modal = document.getElementById('stk-app-download-modal');
    if (modal) {
      modal.remove();
    }
    modal = document.createElement('div');
    modal.id = 'stk-app-download-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,13,15,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:var(--surface,#1E2428);border:1px solid var(--border,#333D46);border-radius:12px;width:100%;max-width:560px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.6);color:var(--text,#F8FAFC);font-family:inherit;">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border,#333D46);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.25rem;">📱💻</span>
            <div>
              <h3 style="font-size:1rem;font-weight:700;margin:0;color:#FFFFFF;">STOKROVA Across All Devices</h3>
              <p style="font-size:0.75rem;color:var(--text-secondary,#ACB8C3);margin:2px 0 0 0;">One universal app. Sign in with your existing account to load your role's workspace.</p>
            </div>
          </div>
          <button id="stk-close-apps-modal" style="background:none;border:none;color:var(--text-muted,#7E919F);font-size:1.4rem;cursor:pointer;padding:4px;line-height:1;">&times;</button>
        </div>

        <div style="padding:18px 20px;">
          <div style="background:rgba(189,150,82,0.1);border:1px solid rgba(189,150,82,0.25);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.78rem;line-height:1.5;color:var(--text-secondary,#ACB8C3);">
            <strong style="color:var(--primary,#BD9652);">✦ Unified Architecture:</strong> All roles (Owner, Manager, Cashier, Picker, Accountant) use the same app. Your credentials automatically open your role's live workspace, keeping all data 1:1 synchronized.
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <div style="border:1px solid var(--border,#333D46);border-radius:8px;padding:12px;background:rgba(0,0,0,0.2);">
              <div style="font-weight:700;font-size:0.85rem;color:#FFFFFF;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                <span>📱</span> <span>Mobile Application</span>
              </div>
              <p style="font-size:0.72rem;color:var(--text-secondary,#ACB8C3);margin-bottom:10px;">Fast barcode scanning, offline shift records, wave picking & instant takings.</p>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <a href="#ios" style="display:flex;align-items:center;justify-content:center;gap:6px;background:var(--bg,#161B1E);border:1px solid var(--border,#333D46);color:#FFFFFF;font-size:0.75rem;font-weight:600;padding:7px;border-radius:6px;text-decoration:none;">
                  🍎 Download for iOS
                </a>
                <a href="#android" style="display:flex;align-items:center;justify-content:center;gap:6px;background:var(--bg,#161B1E);border:1px solid var(--border,#333D46);color:#FFFFFF;font-size:0.75rem;font-weight:600;padding:7px;border-radius:6px;text-decoration:none;">
                  🤖 Download Android APK
                </a>
              </div>
            </div>

            <div style="border:1px solid var(--border,#333D46);border-radius:8px;padding:12px;background:rgba(0,0,0,0.2);">
              <div style="font-weight:700;font-size:0.85rem;color:#FFFFFF;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                <span>💻</span> <span>Desktop Application</span>
              </div>
              <p style="font-size:0.72rem;color:var(--text-secondary,#ACB8C3);margin-bottom:10px;">Dedicated hardware tills, receipt printer drivers & offline database store.</p>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <a href="#windows" style="display:flex;align-items:center;justify-content:center;gap:6px;background:var(--bg,#161B1E);border:1px solid var(--border,#333D46);color:#FFFFFF;font-size:0.75rem;font-weight:600;padding:7px;border-radius:6px;text-decoration:none;">
                  🪟 Windows (.exe)
                </a>
                <a href="#macos" style="display:flex;align-items:center;justify-content:center;gap:6px;background:var(--bg,#161B1E);border:1px solid var(--border,#333D46);color:#FFFFFF;font-size:0.75rem;font-weight:600;padding:7px;border-radius:6px;text-decoration:none;">
                  🍏 macOS (.dmg)
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:10px 20px;background:rgba(0,0,0,0.3);border-top:1px solid var(--border,#333D46);display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-muted,#7E919F);">
          <span>Live real-time ledger synchronization</span>
          <button id="stk-close-apps-modal-btn" style="background:var(--surface,#1E2428);border:1px solid var(--border,#333D46);color:var(--text,#F8FAFC);padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.72rem;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.querySelector('#stk-close-apps-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#stk-close-apps-modal-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  function mountAppDownloadAction() {
    if (document.getElementById('stk-app-download-btn')) return;
    const topbarRight = document.querySelector('.workspace-topbar > div:last-child');
    if (!topbarRight) return;

    const btn = document.createElement('button');
    btn.id = 'stk-app-download-btn';
    btn.innerHTML = '<span>📱💻</span> <span>Get Apps</span>';
    btn.title = 'Download STOKROVA for Mobile & Desktop';
    btn.style.cssText = 'background:rgba(189,150,82,0.15);color:var(--primary,#BD9652);border:1px solid var(--primary,#BD9652);padding:5px 10px;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:5px;transition:all 0.15s ease;';
    btn.addEventListener('click', openAppDownloadModal);
    topbarRight.prepend(btn);
  }

  mountAppDownloadAction();
  setInterval(mountAppDownloadAction, 2000);

  function mountBranchSwitcher() {
    const branchEl = document.getElementById('ws-branch-display');
    if (!branchEl || branchEl.dataset.switcherActive) return;
    branchEl.dataset.switcherActive = 'true';
    branchEl.style.cursor = 'pointer';
    branchEl.title = 'Click to switch active branch or add a new branch';
    if (!branchEl.textContent.includes('▾')) {
      branchEl.innerHTML = `${branchEl.textContent.trim()} <span style="font-size:0.65rem;">▾</span>`;
    }

    branchEl.addEventListener('click', async (e) => {
      e.stopPropagation();
      let dropdown = document.getElementById('stk-branch-switcher-dropdown');
      if (dropdown) { dropdown.remove(); return; }

      dropdown = document.createElement('div');
      dropdown.id = 'stk-branch-switcher-dropdown';
      dropdown.style.cssText = 'position:absolute;top:calc(100% + 6px);left:0;z-index:9999;background:var(--surface,#1E2428);border:1px solid var(--border,#333D46);border-radius:8px;width:240px;box-shadow:0 16px 32px rgba(0,0,0,0.5);padding:8px;font-size:0.8rem;color:var(--text,#F8FAFC);';
      
      const cfg = await import('./executive-live.js').then((m) => m.resolveLiveConfig()).catch(() => null);
      let branches = [];
      if (cfg && cfg.baseUrl && cfg.token) {
        try {
          const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/v1/branches`, {
            headers: { Authorization: `Bearer ${cfg.token}`, 'x-tenant-id': cfg.tenantId },
          });
          if (res.ok) branches = await res.json();
        } catch {}
      }
      if (!branches.length) {
        branches = [
          { id: 'b_main', name: 'Main Branch', code: 'MAIN' },
        ];
      }

      dropdown.innerHTML = `
        <div style="font-size:0.7rem;text-transform:uppercase;color:var(--text-muted,#7E919F);padding:4px 8px;font-weight:700;border-bottom:1px solid var(--border,#333D46);margin-bottom:4px;">
          Active Facility / Branch
        </div>
        ${branches.map((b) => `
          <div class="stk-branch-item" data-id="${b.id}" data-name="${b.name}" style="padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;">${b.name}</span>
            <span style="font-size:0.68rem;font-family:monospace;color:var(--primary,#BD9652);">${b.code}</span>
          </div>
        `).join('')}
        <div style="border-top:1px solid var(--border,#333D46);margin-top:4px;padding-top:4px;">
          <button id="stk-add-branch-trigger" style="width:100%;text-align:left;background:none;border:none;color:var(--primary,#BD9652);font-weight:700;font-size:0.75rem;padding:6px 8px;border-radius:4px;cursor:pointer;">
            + Add New Branch
          </button>
        </div>
      `;

      branchEl.parentElement.style.position = 'relative';
      branchEl.parentElement.appendChild(dropdown);

      dropdown.querySelectorAll('.stk-branch-item').forEach((item) => {
        item.addEventListener('mouseenter', () => (item.style.background = 'rgba(189,150,82,0.12)'));
        item.addEventListener('mouseleave', () => (item.style.background = 'transparent'));
        item.addEventListener('click', () => {
          const name = item.dataset.name;
          branchEl.innerHTML = `${name} <span style="font-size:0.65rem;">▾</span>`;
          dropdown.remove();
          window.dispatchEvent(new CustomEvent('stokrova:branchchange', { detail: { branchId: item.dataset.id, branchName: name } }));
        });
      });

      dropdown.querySelector('#stk-add-branch-trigger')?.addEventListener('click', () => {
        dropdown.remove();
        const navItem = document.querySelector('.workspace-nav-item[data-view-id="org"]');
        if (navItem) navItem.click();
      });

      setTimeout(() => {
        document.addEventListener('click', () => dropdown?.remove(), { once: true });
      }, 50);
    });
  }

  mountBranchSwitcher();
  setInterval(mountBranchSwitcher, 2000);

  import('./workspace-live.js').then(({ mountWorkspaceLive }) => mountWorkspaceLive()).catch(() => {});
  import('./session-dock-live.js').then(({ mountSessionDock }) => mountSessionDock()).catch(() => {});
})();
