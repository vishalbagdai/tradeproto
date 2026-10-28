/* Customer-facing pages. */
(function () {
  const D = window.DATA;
  const A = window.APP;
  const { S, PAGES, ACTIONS } = A;
  const { esc, money, pct, signed, cls, icon, lineChart, spark, modal, closeModal, toast, applyTheme, store } = window.UI;

  const modeChip = (m) => `<span class="mode ${m === 'LIVE' ? 'live' : 'paper'}">${m}</span>`;
  const statusChip = (s) => {
    const map = { Filled: 'good', Working: 'info', 'Partially filled': 'warn', Cancelled: '', Rejected: 'bad' };
    return `<span class="chip ${map[s] ?? ''}">${esc(s)}</span>`;
  };
  const pricingChip = (p) => `<span class="chip ${p === 'Free' ? 'good' : p.startsWith('Free for') ? 'info' : 'warn'}">${esc(p)}</span>`;

  function section(key, title, meta, body, opts = {}) {
    const open = A.isOpen(key);
    return `<section class="card" aria-label="${esc(opts.label || title)}">
      <div class="sec-h">
        <h2><button class="tog" type="button" aria-expanded="${open}" data-act="toggle" data-arg="${key}">${icon.chev}<span>${title}</span></button></h2>
        <div class="meta">${meta}</div>
      </div>
      ${open ? `<div class="body">${body}</div>` : ''}
    </section>`;
  }

  // ---------- position table ----------
  function sortPositions(list) {
    const l = [...list];
    if (S.sort === 'pnl') l.sort((a, b) => A.posPnl(b) - A.posPnl(a));
    if (S.sort === 'expiry') l.sort((a, b) => a.dte - b.dte);
    if (S.sort === 'strategy') l.sort((a, b) => A.stratName(a.sid).localeCompare(A.stratName(b.sid)));
    return l;
  }

  function posTable(list, opts = {}) {
    const withStrat = opts.withStrategy;
    const rows = sortPositions(list).map((p) => {
      const s = A.strat(p.sid);
      const pnl = A.posPnl(p);
      const pc = A.posPct(p);
      return `<tr>
        ${withStrat ? `<td><span class="v1"><a href="#strategy-${s.id}" style="color:inherit;text-decoration:none">${esc(s.name)}</a> ${modeChip(p.mode)}</span><span class="v2">${esc(p.status)}</span></td>` : ''}
        <td><span class="v1">${esc(p.title)}</span><span class="v2">${esc(p.legs)}</span></td>
        <td><span class="v1">${esc(p.expiry)}</span><span class="v2">${p.dte === 0 ? 'Flat by 15:55' : `${p.dte} days`}</span></td>
        <td class="r"><span class="v1">${p.qty}</span></td>
        <td class="r"><span class="v1">${money(p.entry)}${p.credit ? ' cr' : ' avg'}</span><span class="v2" data-live="mark:${p.id}">${money(p.mark)}</span></td>
        <td class="r"><span class="v1">${p.maxP === null ? '+$100 cap' : money(p.maxP, { sign: true, dp: 0 })}</span><span class="v2">${money(-p.maxL, { sign: true, dp: 0 })}</span></td>
        <td><span class="v1">${esc(p.target)}</span><span class="v2">${esc(p.stop)}</span></td>
        <td class="r"><span class="v1">${p.credit ? signed(p.delta) : `+${p.delta}`}</span><span class="v2">${esc(p.opened)}</span></td>
        ${withStrat ? '' : `<td><span class="v2" style="margin-top:0">${esc(p.status)}</span></td>`}
        <td class="r"><span class="pnl1 ${cls(pnl)}" data-live="pnl:${p.id}">${money(pnl, { sign: true })}</span><span class="pnl2 ${cls(pc)}" data-live="pct:${p.id}">${pct(pc)}</span></td>
        <td><div class="acts"><a class="btn xs" href="#orders" data-act="orders-for" data-arg="${p.sid}">Orders</a><button class="btn xs ghost-danger" type="button" data-act="close-pos" data-arg="${p.id}">Close…</button></div></td>
      </tr>`;
    }).join('');
    const total = opts.total ? `<tfoot><tr>
        <td colspan="${withStrat ? 8 : 8}"><span class="v1">Total · ${list.length} position${list.length === 1 ? '' : 's'}</span><span class="v2">Capital at risk ${money(A.capAtRisk(list), { dp: 0 })}</span></td>
        <td class="r"><span class="pnl1" data-live="open-total" data-base="pnl1">${money(A.openPnl(list), { sign: true })}</span><span class="pnl2" data-live="open-pct" data-base="pnl2">${pct((A.openPnl(list) / Math.max(1, A.capAtRisk(list))) * 100)}</span></td><td></td></tr></tfoot>` : '';
    return `<div class="tw"><table class="tbl">
      <thead><tr>
        ${withStrat ? '<th>Strategy<span class="s">Status</span></th>' : ''}
        <th>Position<span class="s">Legs</span></th>
        <th>Expiry<span class="s">Days left</span></th>
        <th class="r">Qty</th>
        <th class="r">Entry<span class="s">Mark</span></th>
        <th class="r">Max profit<span class="s">Max loss</span></th>
        <th>Target<span class="s">Stop</span></th>
        <th class="r">Delta<span class="s">Opened</span></th>
        ${withStrat ? '' : '<th>Status</th>'}
        <th class="r">P&amp;L<span class="s">Return</span></th>
        <th><span class="sr">Actions</span></th>
      </tr></thead>
      <tbody>${rows}</tbody>${total}
    </table></div>`;
  }

  // ---------- P&L chart data ----------
  function chartSeries() {
    const r = S.range;
    if (S.chartStrategy !== 'all') {
      const s = A.strat(S.chartStrategy);
      const n = { '1D': 60, '1W': 5, '1M': 21, YTD: 205, '1Y': 252, All: 400 }[r];
      const vals = D.strategyCurve(s.seed, n, s.stats.pnl / 400);
      const labels = vals.map((_, i) => (r === '1D' ? D.intraday[Math.min(i, D.intraday.length - 1)].label : D.daily[D.daily.length - n + i]?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: r === 'All' || r === '1Y' ? '2-digit' : undefined })));
      return { values: vals, labels, fmt: (v) => money(v, { sign: true, dp: 0 }), zero: true };
    }
    if (r === '1D') return { values: D.intraday.map((p) => p.equity), labels: D.intraday.map((p) => `${p.label} ET`) };
    const all = D.daily;
    let slice;
    if (r === '1W') slice = all.slice(-5);
    else if (r === '1M') slice = all.slice(-21);
    else if (r === 'YTD') slice = all.filter((d) => d.date.getFullYear() === 2026);
    else if (r === '1Y') slice = all.slice(-252);
    else slice = all;
    const short = r === '1W' || r === '1M';
    return {
      values: slice.map((d) => d.equity),
      labels: slice.map((d) => d.date.toLocaleDateString('en-US', short ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: '2-digit' })),
    };
  }

  // ---------- DASHBOARD ----------
  PAGES.dashboard = () => {
    const acct = D.account;
    const all = S.positions;
    const open = A.openPnl();
    const cr = (open / Math.max(1, A.capAtRisk())) * 100;
    const cs = chartSeries();
    const chg = cs.values[cs.values.length - 1] - cs.values[0];
    const chgPct = S.chartStrategy === 'all' ? (chg / cs.values[0]) * 100 : null;
    const myStrats = S.strategies.filter((s) => s.on || all.some((p) => p.sid === s.id));

    const summary = `<div class="kpis">
      <div class="kpi"><span class="label">Net liquidating value</span><span class="big">${money(acct.nlv)}</span><span class="s">Cash ${money(acct.cash)}</span></div>
      <div class="kpi"><span class="label">Today's P&amp;L</span><span class="big ${cls(acct.todayPnl)}">${money(acct.todayPnl, { sign: true })}</span><span class="s">${pct((acct.todayPnl / acct.nlv) * 100, 2)} of account</span></div>
      <div class="kpi"><span class="label">Open P&amp;L · ${all.length} positions</span><span class="big" data-live="open-total" data-base="big">${money(open, { sign: true })}</span><span class="s"><span data-live="open-pct" data-base="">${pct(cr)}</span> of capital at risk</span></div>
      <div class="kpi"><span class="label">Buying power</span><span class="big">${money(acct.bp)}</span><span class="s">Option BP · tastytrade</span></div>
    </div>`;

    const chart = `<div class="pad" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center">
        <div class="pills" role="group" aria-label="Chart range">${['1D', '1W', '1M', 'YTD', '1Y', 'All'].map((r) => `<button type="button" class="${S.range === r ? 'on' : ''}" data-act="range" data-arg="${r}" aria-pressed="${S.range === r}">${r}</button>`).join('')}</div>
        <select id="chart-strategy" aria-label="Strategy" data-change="chart-strategy"><option value="all">Whole account</option>${S.strategies.filter((s) => !s.locked).map((s) => `<option value="${s.id}" ${S.chartStrategy === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      </div>
      ${lineChart(cs.values, cs.labels, { fmt: cs.fmt, zero: cs.zero, tipFmt: cs.fmt })}
    </div>`;

    const fills = S.orders.filter((o) => o.status === 'Filled').slice(0, 4);
    const fillsBody = `<div class="tw"><table class="tbl">
      <thead><tr><th>Time<span class="s">Date</span></th><th>Strategy<span class="s">Mode</span></th><th>Order<span class="s">Legs</span></th><th class="r">Filled<span class="s">Limit</span></th><th class="r">Amount<span class="s">Fees</span></th></tr></thead>
      <tbody>${fills.map((o) => `<tr>
        <td><span class="v1">${o.t} ET</span><span class="v2">${o.d}</span></td>
        <td><span class="v1">${esc(A.stratName(o.sid))}</span><span class="v2">${modeChip(o.mode)}</span></td>
        <td><span class="v1">${esc(o.what)}</span><span class="v2">${esc(o.legs)}</span></td>
        <td class="r"><span class="v1">${esc(o.filled)}</span><span class="v2">${esc(o.limit)}</span></td>
        <td class="r"><span class="v1">${money(o.amt, { sign: true })}</span><span class="v2">${o.fees === null ? '—' : money(o.fees)}</span></td>
      </tr>`).join('')}</tbody></table></div>`;

    const stratSections = myStrats.map((s) => {
      const list = all.filter((p) => p.sid === s.id);
      const tot = A.openPnl(list);
      const meta = `${modeChip(s.mode)}<span><b>${list.length}</b> open</span><span>P&amp;L <b class="${cls(tot)}" data-live="strat-total:${s.id}">${money(tot, { sign: true })}</b></span><span>${s.on ? (S.killed ? 'Stopped' : 'Running') : 'Off'}</span><a href="#strategy-${s.id}">Details</a>`;
      const body = list.length ? posTable(list) : `<div class="empty">No open positions. ${s.id === 'wide' ? 'Next entry Thursday 10:00 ET.' : 'Waiting for the next entry signal.'}</div>`;
      return section(`s-${s.id}`, `${esc(s.name)}${s.version ? ` <span class="muted" style="font-weight:500">· ${esc(s.version)}</span>` : ''}`, meta, body, { label: s.name });
    }).join('');

    return `
      <div class="page-h">
        <div class="t"><h1>Dashboard</h1><span class="sub">tastytrade ${esc(D.user.account)} · updated <span data-live="time"></span></span></div>
        <div class="row-gap"><button class="btn" type="button" data-act="expand-all">Expand all</button><button class="btn" type="button" data-act="collapse-all">Collapse all</button></div>
      </div>
      ${section('summary', 'Account summary', '<span>Sample data</span>', summary)}
      ${section('chart', 'P&amp;L', `<span>${S.range} · ${S.chartStrategy === 'all' ? 'Whole account' : esc(A.stratName(S.chartStrategy))}</span><b class="${cls(chg)}">${money(chg, { sign: true })}${chgPct === null ? '' : ` · ${pct(chgPct, 2)}`}</b>`, chart)}
      ${section('all', 'Open positions · all in one', `<span><b>${all.length}</b> open</span><span>Open P&amp;L <b data-live="open-total" data-base="">${money(open, { sign: true })}</b></span>
        <select id="pos-sort" aria-label="Sort positions" data-change="sort"><option value="pnl" ${S.sort === 'pnl' ? 'selected' : ''}>Sort: P&amp;L</option><option value="expiry" ${S.sort === 'expiry' ? 'selected' : ''}>Sort: expiry</option><option value="strategy" ${S.sort === 'strategy' ? 'selected' : ''}>Sort: strategy</option></select>`,
        all.length ? posTable(all, { withStrategy: true, total: true }) : '<div class="empty">No open positions.</div>')}
      ${stratSections}
      ${section('fills', 'Recent fills', '<a href="#orders">All orders</a>', fillsBody)}
    `;
  };

  Object.assign(ACTIONS, {
    range: (r) => { S.range = r; A.rerender(); },
    'chart-strategy': (v) => { S.chartStrategy = v; A.rerender(); },
    sort: (v) => { S.sort = v; A.rerender(); },
    'orders-for': (sid) => { S.ordersFilter = { status: 'all', sid, mode: 'all' }; location.hash = 'orders'; },
    'close-pos': (id) => {
      const p = S.positions.find((x) => x.id === id);
      const s = A.strat(p.sid);
      const pnl = A.posPnl(p);
      modal(`Close ${esc(p.title)}?`, `
        <dl class="kv">
          <dt>Strategy</dt><dd>${esc(s.name)} ${modeChip(p.mode)}</dd>
          <dt>Legs</dt><dd>${esc(p.legs)} · ${esc(p.expiry)}</dd>
          <dt>Order</dt><dd>${p.credit ? `Buy to close at ${money(p.mark)} limit` : `Sell ${p.qty} at market`}</dd>
          <dt>Estimated P&amp;L</dt><dd class="${cls(pnl)}">${money(pnl, { sign: true })} (${pct(A.posPct(p))})</dd>
        </dl>
        ${p.mode === 'LIVE' ? '<div class="callout warn"><span>⚠</span><span>This sends a real order to tastytrade.</span></div>' : '<div class="callout"><span>ℹ</span><span>Paper order. Filled against the live mid price.</span></div>'}`,
      `<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn danger" type="button" data-act="close-pos-confirm" data-arg="${p.id}">Send close order</button>`);
    },
    'close-pos-confirm': (id) => {
      const p = S.positions.find((x) => x.id === id);
      const pnl = A.posPnl(p);
      S.positions = S.positions.filter((x) => x.id !== id);
      S.orders.unshift({ id: p.mode === 'LIVE' ? String(48300 + S.orders.length) : `P-${1200 + S.orders.length}`, t: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }), d: 'Oct 27', sid: p.sid, mode: p.mode, status: 'Filled', what: `Close ${p.title}`, legs: `${p.legs} · ${p.expiry}`, type: p.credit ? 'Limit · Day' : 'Market · Day', reason: 'Closed by you', limit: p.credit ? `${money(p.mark)} db` : 'market', filled: `${p.qty} of ${p.qty} @ ${money(p.mark)}`, amt: p.credit ? -p.mark * 100 * p.qty : p.mark * p.qty, fees: p.mode === 'LIVE' ? 4.52 : 0 });
      closeModal();
      toast(`Closed. Realized ${money(pnl, { sign: true })}. Slack alert sent.`);
      A.rerender();
    },
  });

  // ---------- STRATEGIES ----------
  function stratCard(s) {
    const curve = D.strategyCurve(s.seed, 40, s.stats.pnl / 40);
    const mine = ['spx-ic', 'tight', 'mom', 'wide'].includes(s.id) || s.kind === 'mine' || s.added;
    return `<article class="card strat">
      <div class="strat-h">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
          <h3 style="font-size:15px"><a href="#strategy-${s.id}" style="color:inherit;text-decoration:none">${esc(s.name)}</a>${s.version ? ` <span class="muted" style="font-weight:500">· ${esc(s.version)}</span>` : ''}</h3>
          <div class="row-gap">${pricingChip(s.pricing)}<span class="chip">${esc(s.style)}</span>${s.kind === 'mine' ? '<span class="chip info">My version</span>' : s.kind === 'community' ? `<span class="chip">By ${esc(s.owner)}</span>` : ''}</div>
        </div>
        ${mine ? `<label class="switch" title="Turn strategy on or off"><input type="checkbox" ${s.on ? 'checked' : ''} data-change="strat-on" data-arg="${s.id}" id="on-${s.id}" aria-label="${esc(s.name)} on"><span class="tr"></span></label>` : ''}
      </div>
      <p class="muted" style="font-size:13px">${esc(s.desc)}</p>
      ${spark(curve)}
      <div class="strat-stats num">
        <div><span class="label">Win rate</span><b>${s.stats.win}%</b></div>
        <div><span class="label">Avg trade</span><b class="${cls(s.stats.avg)}">${money(s.stats.avg, { sign: true })}</b></div>
        <div><span class="label">P&amp;L · ${s.stats.trades} trades</span><b class="${cls(s.stats.pnl)}">${money(s.stats.pnl, { sign: true, dp: 0 })}</b></div>
      </div>
      <div class="strat-f">
        ${mine ? `<div class="pills" role="group" aria-label="Mode"><button type="button" class="${s.mode === 'PAPER' ? 'on' : ''}" data-act="strat-mode" data-arg="${s.id}:PAPER" aria-pressed="${s.mode === 'PAPER'}">Paper</button><button type="button" class="${s.mode === 'LIVE' ? 'on' : ''}" data-act="strat-mode" data-arg="${s.id}:LIVE" aria-pressed="${s.mode === 'LIVE'}">Live</button></div>`
        : s.locked ? '<span class="muted" style="font-size:13px">Paid plans come after legal review.</span>'
        : `<button class="btn pri xs" type="button" data-act="strat-add" data-arg="${s.id}">Add · ${esc(s.pricing)}</button>`}
        <div class="row-gap">
          <a class="btn xs" href="#strategy-${s.id}">Details</a>
          ${s.locked ? '' : `<button class="btn xs" type="button" data-act="customize" data-arg="${s.id}">Customize</button>`}
        </div>
      </div>
    </article>`;
  }

  PAGES.strategies = () => {
    const mine = S.strategies.filter((s) => ['spx-ic', 'tight', 'mom', 'wide'].includes(s.id) || s.kind === 'mine' || s.added);
    const avail = S.strategies.filter((s) => !mine.includes(s) && !s.hidden);
    return `
      <div class="page-h">
        <div class="t"><h1>Strategies</h1><span class="sub">${mine.filter((s) => s.on).length} running · ${mine.filter((s) => s.on && s.mode === 'LIVE').length} live</span></div>
        <div class="row-gap"><a class="btn" href="#my-versions">My versions</a><a class="btn" href="#backtest">Backtest</a></div>
      </div>
      <h2>My strategies</h2>
      <div class="grid g3">${mine.map(stratCard).join('')}</div>
      <h2 style="margin-top:8px">Available to add</h2>
      <div class="grid g3">${avail.map(stratCard).join('') || '<p class="muted">You have every strategy.</p>'}</div>`;
  };

  function paramFields(s) {
    const labels = {
      shortDelta: ['Short strike delta', 'number', '0.01'], wing: ['Wing width (points)', 'number', '5'], entry: ['Entry time (ET)', 'time'], target: ['Profit target (% of credit)', 'number', '5'],
      stop: ['Stop (% of max risk)', 'number', '5'], maxOpen: ['Max open positions', 'number', '1'], vixMin: ['VIX minimum', 'number', '1'], vixMax: ['VIX maximum', 'number', '1'],
      testSize: ['Test entry (shares)', 'number', '1'], adds: ['Number of adds', 'number', '1'], addStep: ['Add every (dollars)', 'number', '0.05'], trail: ['Trailing stop (dollars)', 'number', '0.05'],
      flatBy: ['Flat by (ET)', 'time'], dayCap: ['Daily profit cap ($)', 'number', '10'], dayStop: ['Daily loss stop ($)', 'number', '10'],
    };
    return Object.entries(s.params).map(([k, v]) => {
      const [lab, type, step] = labels[k] || [k, 'text'];
      return `<div class="field"><label for="p-${k}">${lab}</label><input id="p-${k}" name="${k}" type="${type}" ${step ? `step="${step}"` : ''} value="${esc(v)}"></div>`;
    }).join('');
  }

  Object.assign(ACTIONS, {
    'strat-on': (on, el) => {
      const s = A.strat(el.dataset.arg);
      s.on = on;
      toast(`${s.name} turned ${on ? 'on' : 'off'}.`);
      A.rerender();
    },
    'strat-mode': (arg) => {
      const [id, m] = arg.split(':');
      const s = A.strat(id);
      if (s.mode === m) return;
      if (m === 'LIVE') {
        const ready = Object.values(S.goLive).every(Boolean);
        if (!ready) {
          modal('Finish the go-live checklist first', '<p>Live trading sends real orders with your money. Finish the checklist to unlock live mode, including one test order.</p>',
            '<button class="btn" type="button" data-act="close-modal">Not now</button><a class="btn pri" href="#go-live">Open checklist</a>');
          return;
        }
        modal(`Switch ${esc(s.name)} to live?`, `<p>From the next signal, this strategy sends real orders to tastytrade account ${esc(D.user.account)}.</p>
          <dl class="kv"><dt>Max per trade</dt><dd>${money(s.maxPerTrade, { dp: 0 })} risk</dd><dt>Allocation</dt><dd>${money(s.alloc || 2000, { dp: 0 })}</dd><dt>Daily loss limit</dt><dd>$500 (account)</dd></dl>`,
        `<button class="btn" type="button" data-act="close-modal">Stay on paper</button><button class="btn pri" type="button" data-act="strat-live-confirm" data-arg="${id}">Switch to live</button>`);
        return;
      }
      s.mode = 'PAPER';
      toast(`${s.name} is now paper trading.`);
      A.rerender();
    },
    'strat-live-confirm': (id) => { const s = A.strat(id); s.mode = 'LIVE'; s.on = true; closeModal(); toast(`${s.name} is live.`); A.rerender(); },
    'strat-add': (id) => {
      const s = A.strat(id);
      s.added = true; s.on = true; s.mode = 'PAPER';
      toast(`${s.name} added in paper mode${s.pricing.startsWith('Free for') ? '. Your 30-day free period starts today' : ''}.`);
      A.rerender();
    },
    customize: (id) => {
      const s = A.strat(id);
      modal(`Customize ${esc(s.name)}`, `
        <form id="cust-form" data-submit="save-version" data-arg="${s.id}" style="display:flex;flex-direction:column;gap:14px">
          <div class="field"><label for="v-name">Name for your version</label><input id="v-name" name="__name" type="text" value="${esc(s.kind === 'mine' ? s.name : `${s.name} · tuned`)}" required></div>
          <div class="form-grid">${paramFields(s)}</div>
          <div class="callout"><span>ℹ</span><span>Your version starts in paper mode. After 14 paper days you can submit it to the admin, who can publish it for everyone.</span></div>
          <input type="hidden" name="__from" value="${s.id}">
        </form>`,
      '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn" type="button" data-act="cust-backtest">Backtest first</button><button class="btn pri" type="submit" form="cust-form">Save as my version</button>', { wide: true });
    },
    'cust-backtest': () => { closeModal(); location.hash = 'backtest'; },
    'save-version': (fd) => {
      const from = A.strat(fd.get('__from'));
      const name = fd.get('__name').trim() || `${from.name} · tuned`;
      const params = {};
      Object.keys(from.params).forEach((k) => { const v = fd.get(k); params[k] = from.params[k] !== null && typeof from.params[k] === 'number' ? Number(v) : v; });
      if (from.kind === 'mine') {
        from.name = name; from.params = params;
        toast('Version saved.');
      } else {
        const id = `v${Date.now().toString(36)}`;
        S.strategies.push({ ...from, id, name, version: 'my version', kind: 'mine', basedOn: from.name, owner: 'You', on: true, mode: 'PAPER', params, stats: { trades: 0, win: 0, avg: 0, pnl: 0, dd: 0, sharpe: 0 }, seed: 91, submitted: 'Draft', desc: `Your version of ${from.name}.`, added: true });
        toast(`Saved “${name}”. It is running in paper mode.`);
      }
      closeModal();
      location.hash = 'my-versions';
      A.rerender();
    },
  });

  // ---------- STRATEGY DETAIL ----------
  PAGES.strategy = (id) => {
    const s = A.strat(id);
    if (!s) return PAGES.notfound();
    const curve = D.strategyCurve(s.seed, 120, s.stats.pnl / 120);
    const labels = D.daily.slice(-120).map((d) => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const list = S.positions.filter((p) => p.sid === id);
    const ords = S.orders.filter((o) => o.sid === id);
    const pnames = { shortDelta: 'Short delta', wing: 'Wing width', entry: 'Entry time', target: 'Profit target', stop: 'Stop', maxOpen: 'Max open', vixMin: 'VIX min', vixMax: 'VIX max', testSize: 'Test entry', adds: 'Adds', addStep: 'Add step', trail: 'Trailing stop', flatBy: 'Flat by', dayCap: 'Daily cap', dayStop: 'Daily stop' };
    const units = { target: '% of credit', stop: '% of max risk', wing: ' pts', entry: ' ET', flatBy: ' ET', testSize: ' sh', dayCap: '', dayStop: '' };
    return `
      <div class="page-h">
        <div class="t" style="flex-direction:column;align-items:flex-start;gap:6px">
          <a href="#strategies" style="font-size:13px">← Strategies</a>
          <h1>${esc(s.name)}${s.version ? ` <span class="muted" style="font-weight:500">· ${esc(s.version)}</span>` : ''}</h1>
          <div class="row-gap">${modeChip(s.mode)}${pricingChip(s.pricing)}<span class="chip">${esc(s.style)}</span><span class="chip">${esc(s.underlying)}</span>${s.basedOn ? `<span class="chip info">Based on ${esc(s.basedOn)}</span>` : ''}</div>
        </div>
        <div class="row-gap">${s.locked ? '' : `<button class="btn" type="button" data-act="customize" data-arg="${s.id}">Customize</button>`}<a class="btn" href="#backtest">Backtest</a></div>
      </div>
      <p class="muted" style="max-width:70ch">${esc(s.desc)}</p>
      <section class="card"><div class="kpis">
        <div class="kpi"><span class="label">Total P&amp;L</span><span class="big ${cls(s.stats.pnl)}">${money(s.stats.pnl, { sign: true, dp: 0 })}</span><span class="s">${s.stats.trades} trades</span></div>
        <div class="kpi"><span class="label">Win rate</span><span class="big">${s.stats.win}%</span><span class="s">${Math.round((s.stats.trades * s.stats.win) / 100)} wins</span></div>
        <div class="kpi"><span class="label">Avg trade</span><span class="big ${cls(s.stats.avg)}">${money(s.stats.avg, { sign: true })}</span><span class="s">after fees</span></div>
        <div class="kpi"><span class="label">Max drawdown</span><span class="big loss">${money(s.stats.dd, { sign: true, dp: 0 })}</span><span class="s">Sharpe ${s.stats.sharpe.toFixed(1)}</span></div>
      </div></section>
      <section class="card"><div class="sec-h plain"><h2>Cumulative P&amp;L · last 120 trading days</h2><span class="meta">Paper and live combined</span></div><div class="body pad">${lineChart(curve, labels, { fmt: (v) => money(v, { sign: true, dp: 0 }), zero: true, tipFmt: (v) => money(v, { sign: true, dp: 0 }) })}</div></section>
      <div class="grid g2">
        <section class="card"><div class="sec-h plain"><h2>Rules</h2>${s.locked ? '' : `<button class="btn xs" type="button" data-act="customize" data-arg="${s.id}">Edit in my version</button>`}</div>
          <div class="body pad">${Object.keys(s.params).length ? `<dl class="kv">${Object.entries(s.params).map(([k, v]) => `<dt>${pnames[k] || k}</dt><dd>${k === 'dayCap' || k === 'dayStop' || k === 'addStep' || k === 'trail' ? '$' : ''}${esc(v)}${units[k] ?? ''}</dd>`).join('')}</dl>` : '<p class="muted">Rules are shown once the strategy is available on your plan.</p>'}</div></section>
        <section class="card"><div class="sec-h plain"><h2>Risk</h2></div><div class="body pad"><dl class="kv">
          <dt>Risk type</dt><dd>${esc(s.risk)}</dd><dt>Max risk per trade</dt><dd>${money(s.maxPerTrade, { dp: 0 })}</dd><dt>Your allocation</dt><dd>${s.alloc ? money(s.alloc, { dp: 0 }) : 'Not set'}</dd><dt>Owner</dt><dd>${esc(s.owner)}</dd><dt>Users running it</dt><dd>${s.assigned ?? 1}</dd>
        </dl></div></section>
      </div>
      <section class="card"><div class="sec-h plain"><h2>Open positions</h2><span class="meta"><b>${list.length}</b> open</span></div><div class="body">${list.length ? posTable(list) : '<div class="empty">No open positions.</div>'}</div></section>
      <section class="card"><div class="sec-h plain"><h2>Orders</h2><a href="#orders" data-act="orders-for" data-arg="${s.id}">See all</a></div><div class="body">${ords.length ? ordersTable(ords.slice(0, 6)) : '<div class="empty">No orders yet.</div>'}</div></section>`;
  };

  // ---------- MY VERSIONS ----------
  PAGES['my-versions'] = () => {
    const mine = S.strategies.filter((s) => s.kind === 'mine');
    return `
      <div class="page-h"><div class="t"><h1>My strategy versions</h1><span class="sub">Save your own settings, run them, and submit good ones to the admin.</span></div>
        <a class="btn pri" href="#strategies">Customize a strategy</a></div>
      <section class="card"><div class="tw"><table class="tbl simple">
        <thead><tr><th>Version<span class="s">Based on</span></th><th>Mode</th><th class="r">Paper trades<span class="s">Win rate</span></th><th class="r">P&amp;L</th><th>Review status</th><th><span class="sr">Actions</span></th></tr></thead>
        <tbody>${mine.map((s) => `<tr>
          <td><span class="v1"><a href="#strategy-${s.id}" style="color:inherit">${esc(s.name)}</a></span><span class="v2">${esc(s.basedOn)}</span></td>
          <td>${modeChip(s.mode)} <span class="muted" style="font-size:12.5px">${s.on ? 'On' : 'Off'}</span></td>
          <td class="r"><span class="v1">${s.stats.trades}</span><span class="v2">${s.stats.trades ? `${s.stats.win}%` : '—'}</span></td>
          <td class="r"><span class="v1 ${cls(s.stats.pnl)}">${money(s.stats.pnl, { sign: true, dp: 0 })}</span></td>
          <td>${s.submitted === 'Draft' ? '<span class="chip">Draft</span>' : s.submitted === 'Published' ? '<span class="chip good">Published</span>' : `<span class="chip warn">${esc(s.submitted)}</span>`}</td>
          <td><div class="acts">
            <button class="btn xs" type="button" data-act="customize" data-arg="${s.id}">Edit</button>
            ${s.submitted === 'Draft' ? `<button class="btn xs pri" type="button" data-act="submit-version" data-arg="${s.id}">Submit for review</button>` : ''}
          </div></td></tr>`).join('')}</tbody></table></div></section>
      <div class="callout"><span>ℹ</span><span>The admin reviews submitted versions. A published version shows up for everyone as a community strategy, with your name on it. You can keep using your own copy either way.</span></div>`;
  };
  ACTIONS['submit-version'] = (id) => {
    const s = A.strat(id);
    if (s.stats.trades < 5) {
      modal('Not enough paper trades yet', `<p>${esc(s.name)} needs at least 14 paper days and 5 trades before review. It has ${s.stats.trades} trades so far.</p><p class="muted">For this prototype you can submit anyway.</p>`,
        `<button class="btn" type="button" data-act="close-modal">Wait</button><button class="btn pri" type="button" data-act="submit-version-force" data-arg="${id}">Submit anyway</button>`);
      return;
    }
    ACTIONS['submit-version-force'](id);
  };
  ACTIONS['submit-version-force'] = (id) => {
    const s = A.strat(id);
    s.submitted = 'Pending review';
    S.submissions.unshift({ id: `s${Date.now()}`, name: s.name, by: D.user.name, basedOn: s.basedOn, submitted: 'Oct 27, 2026', paperDays: 0, trades: s.stats.trades, win: s.stats.win, pnl: s.stats.pnl, status: 'Pending review', changes: Object.entries(s.params).slice(0, 3).map(([k, v]) => `${k} → ${v}`) });
    closeModal();
    toast('Submitted. The admin gets a Slack message.');
    A.rerender();
  };

  // ---------- ORDERS ----------
  function ordersTable(list) {
    return `<div class="tw"><table class="tbl">
      <thead><tr><th>Time<span class="s">Date</span></th><th>Status<span class="s">Mode</span></th><th>Strategy<span class="s">Order #</span></th><th>Order<span class="s">Legs</span></th><th>Type<span class="s">Reason</span></th><th class="r">Limit<span class="s">Filled</span></th><th class="r">Amount<span class="s">Fees</span></th><th><span class="sr">Actions</span></th></tr></thead>
      <tbody>${list.map((o) => `<tr>
        <td><span class="v1">${o.t} ET</span><span class="v2">${o.d}</span></td>
        <td>${statusChip(o.status)}<span class="v2">${modeChip(o.mode)}</span></td>
        <td><span class="v1">${esc(A.stratName(o.sid))}</span><span class="v2 mono">#${esc(o.id)}</span></td>
        <td><span class="v1">${esc(o.what)}</span><span class="v2">${esc(o.legs)}</span></td>
        <td><span class="v1">${esc(o.type)}</span><span class="v2">${esc(o.reason)}</span></td>
        <td class="r"><span class="v1">${esc(o.limit)}</span><span class="v2">${esc(o.filled)}</span></td>
        <td class="r"><span class="v1">${o.amt ? money(o.amt, { sign: true }) : '$0.00'}</span><span class="v2">${o.status === 'Working' ? 'if filled' : o.fees === null ? '—' : money(o.fees)}</span></td>
        <td><div class="acts"><button class="btn xs" type="button" data-act="order-detail" data-arg="${o.id}">Details</button>${o.status === 'Working' ? `<button class="btn xs ghost-danger" type="button" data-act="order-cancel" data-arg="${o.id}">Cancel</button>` : ''}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  PAGES.orders = () => {
    const f = S.ordersFilter;
    const list = S.orders.filter((o) => (f.status === 'all' || o.status === f.status) && (f.sid === 'all' || o.sid === f.sid) && (f.mode === 'all' || o.mode === f.mode));
    const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
    return `
      <div class="page-h"><div class="t"><h1>Orders and fills</h1><span class="sub">New fills appear here live</span></div>
        <div class="row-gap"><button class="btn" type="button" data-act="export">Export CSV</button></div></div>
      <section class="card pad"><div class="form-grid">
        <div class="field"><label for="f-status">Status</label><select id="f-status" data-change="of" data-arg="status">${opt('all', f.status, 'All statuses')}${['Working', 'Filled', 'Partially filled', 'Cancelled', 'Rejected'].map((x) => opt(x, f.status, x)).join('')}</select></div>
        <div class="field"><label for="f-sid">Strategy</label><select id="f-sid" data-change="of" data-arg="sid">${opt('all', f.sid, 'All strategies')}${S.strategies.filter((s) => !s.locked).map((s) => opt(s.id, f.sid, esc(s.name))).join('')}</select></div>
        <div class="field"><label for="f-mode">Mode</label><select id="f-mode" data-change="of" data-arg="mode">${opt('all', f.mode, 'Paper and live')}${opt('PAPER', f.mode, 'Paper')}${opt('LIVE', f.mode, 'Live')}</select></div>
        <div class="field"><label for="f-from">From</label><input id="f-from" type="date" value="2026-10-01"></div>
      </div></section>
      <section class="card">
        <div class="sec-h plain"><span class="meta"><b>${list.length}</b> orders${f.status !== 'all' || f.sid !== 'all' || f.mode !== 'all' ? ' · <button class="btn xs" type="button" data-act="of-clear">Clear filters</button>' : ''}</span></div>
        <div class="body">${list.length ? ordersTable(list) : '<div class="empty">No orders match these filters.</div>'}</div>
      </section>`;
  };
  Object.assign(ACTIONS, {
    of: (v, el) => { S.ordersFilter[el.dataset.arg] = v; A.rerender(); },
    'of-clear': () => { S.ordersFilter = { status: 'all', sid: 'all', mode: 'all' }; A.rerender(); },
    export: () => toast('In the real app this downloads orders as a CSV file.'),
    'order-cancel': (id) => {
      const o = S.orders.find((x) => x.id === id);
      modal('Cancel this order?', `<dl class="kv"><dt>Order</dt><dd>#${esc(o.id)} · ${esc(o.what)}</dd><dt>Limit</dt><dd>${esc(o.limit)}</dd><dt>Strategy</dt><dd>${esc(A.stratName(o.sid))}</dd></dl><p class="muted">The strategy will retry at its next check if the exit rule still applies.</p>`,
        `<button class="btn" type="button" data-act="close-modal">Keep order</button><button class="btn danger" type="button" data-act="order-cancel-confirm" data-arg="${id}">Cancel order</button>`);
    },
    'order-cancel-confirm': (id) => { const o = S.orders.find((x) => x.id === id); o.status = 'Cancelled'; o.reason = 'Cancelled by you'; closeModal(); toast(`Order #${id} cancelled.`); A.rerender(); },
    'order-detail': (id) => {
      const o = S.orders.find((x) => x.id === id);
      modal(`Order #${esc(o.id)}`, `<div class="row-gap">${statusChip(o.status)}${modeChip(o.mode)}</div>
        <dl class="kv"><dt>Strategy</dt><dd>${esc(A.stratName(o.sid))}</dd><dt>Order</dt><dd>${esc(o.what)}</dd><dt>Legs</dt><dd>${esc(o.legs)}</dd><dt>Type</dt><dd>${esc(o.type)}</dd><dt>Limit</dt><dd>${esc(o.limit)}</dd><dt>Filled</dt><dd>${esc(o.filled)}</dd><dt>Amount</dt><dd>${money(o.amt, { sign: true })}</dd><dt>Fees</dt><dd>${o.fees === null ? '—' : money(o.fees)}</dd><dt>Reason</dt><dd>${esc(o.reason)}</dd><dt>Sent</dt><dd>${o.d}, 2026 · ${o.t}:02 ET</dd></dl>
        <div><div class="label" style="margin-bottom:6px">Timeline</div><ol class="steps" style="border:1px solid var(--line);border-radius:8px">
          <li><span class="tick ok">✓</span><span><b>Signal</b><br><span class="muted">${esc(o.reason)} · ${o.t}:00 ET</span></span></li>
          <li><span class="tick ok">✓</span><span><b>Risk checks passed</b><br><span class="muted">Daily loss, max positions, buying power</span></span></li>
          <li><span class="tick ${o.status === 'Rejected' ? '' : 'ok'}">${o.status === 'Rejected' ? '✕' : '✓'}</span><span><b>${o.mode === 'LIVE' ? 'Sent to tastytrade' : 'Paper engine'}</b><br><span class="muted">${o.status === 'Rejected' ? esc(o.reason) : `${o.t}:02 ET`}</span></span></li>
          <li><span class="tick ${o.status === 'Filled' ? 'ok' : ''}">${o.status === 'Filled' ? '✓' : '·'}</span><span><b>${esc(o.status)}</b><br><span class="muted">${esc(o.filled)}</span></span></li>
        </ol></div>`, '<button class="btn" type="button" data-act="close-modal">Close</button>');
    },
  });

  // ---------- ANALYTICS ----------
  PAGES.analytics = () => {
    const days = D.daily.slice(-126);
    const wins = days.filter((d) => d.pnl > 0);
    const losses = days.filter((d) => d.pnl < 0);
    const total = days.reduce((a, d) => a + d.pnl, 0);
    const gp = wins.reduce((a, d) => a + d.pnl, 0);
    const gl = -losses.reduce((a, d) => a + d.pnl, 0);
    let peak = -Infinity; let dd = 0;
    days.forEach((d) => { peak = Math.max(peak, d.equity); dd = Math.min(dd, d.equity - peak); });
    const best = days.reduce((a, d) => (d.pnl > a.pnl ? d : a));
    const worst = days.reduce((a, d) => (d.pnl < a.pnl ? d : a));
    const maxAbs = Math.max(...days.map((d) => Math.abs(d.pnl)));
    const heat = days.map((d) => {
      const a = Math.min(1, Math.abs(d.pnl) / maxAbs);
      const c = d.pnl >= 0 ? 'var(--gain)' : 'var(--loss)';
      const title = `${d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${money(d.pnl, { sign: true })}`;
      return `<div title="${title}" aria-label="${title}" style="background:color-mix(in srgb, ${c} ${Math.round(12 + a * 78)}%, var(--sunk))"></div>`;
    }).join('');
    const byStrat = S.strategies.filter((s) => !s.locked).map((s) => ({ name: s.name, v: s.stats.pnl }));
    const maxS = Math.max(...byStrat.map((x) => Math.abs(x.v)));
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((n, i) => ({ name: n, v: days.filter((d) => d.date.getDay() === i + 1).reduce((a, d) => a + d.pnl, 0) }));
    const maxW = Math.max(...wd.map((x) => Math.abs(x.v)));
    const bar = (x, max) => `<div class="bar-row"><span>${esc(x.name)}</span><div class="bar-track"><span style="left:0;width:${(Math.abs(x.v) / max) * 100}%;background:${x.v >= 0 ? 'var(--gain)' : 'var(--loss)'}"></span></div><b class="num ${cls(x.v)}" style="text-align:right">${money(x.v, { sign: true, dp: 0 })}</b></div>`;
    return `
      <div class="page-h"><div class="t"><h1>Analytics</h1><span class="sub">Last 6 months · paper and live</span></div></div>
      <section class="card"><div class="kpis">
        <div class="kpi"><span class="label">Net P&amp;L</span><span class="big ${cls(total)}">${money(total, { sign: true, dp: 0 })}</span><span class="s">${days.length} trading days</span></div>
        <div class="kpi"><span class="label">Winning days</span><span class="big">${Math.round((wins.length / days.length) * 100)}%</span><span class="s">${wins.length} up · ${losses.length} down</span></div>
        <div class="kpi"><span class="label">Profit factor</span><span class="big">${(gp / gl).toFixed(2)}</span><span class="s">Gross ${money(gp, { dp: 0 })} / ${money(gl, { dp: 0 })}</span></div>
        <div class="kpi"><span class="label">Max drawdown</span><span class="big loss">${money(dd, { sign: true, dp: 0 })}</span><span class="s">Peak to trough</span></div>
        <div class="kpi"><span class="label">Best / worst day</span><span class="big"><span class="gain">${money(best.pnl, { sign: true, dp: 0 })}</span></span><span class="s">Worst <span class="loss">${money(worst.pnl, { sign: true, dp: 0 })}</span> · ${worst.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
      </div></section>
      <section class="card"><div class="sec-h plain"><h2>Daily P&amp;L calendar</h2><span class="meta">Each square is one trading day. Hover for the amount.</span></div><div class="body pad"><div class="heat">${heat}</div></div></section>
      <div class="grid g2">
        <section class="card"><div class="sec-h plain"><h2>P&amp;L by strategy</h2><span class="meta">All time</span></div><div class="body pad"><div class="bars">${byStrat.map((x) => bar(x, maxS)).join('')}</div></div></section>
        <section class="card"><div class="sec-h plain"><h2>P&amp;L by weekday</h2><span class="meta">Last 6 months</span></div><div class="body pad"><div class="bars">${wd.map((x) => bar(x, maxW)).join('')}</div></div></section>
      </div>`;
  };

  // ---------- BACKTEST ----------
  PAGES.backtest = () => {
    const b = S.backtest;
    const sel = b?.sid || 'spx-ic';
    let results = '';
    if (b?.running) results = `<section class="card pad" style="display:flex;flex-direction:column;gap:10px"><b>Running backtest…</b><div class="progress"><span style="width:${b.progress}%"></span></div><span class="muted" style="font-size:13px">Replaying ${b.progress < 50 ? 'option chains from CBOE history' : 'entries and exits day by day'}</span></section>`;
    else if (b?.done) {
      const s = A.strat(b.sid);
      const curve = D.strategyCurve(s.seed + 3, 250, (s.stats.pnl * 1.6) / 250);
      const labels = D.daily.slice(-250).map((d) => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));
      const end = curve[curve.length - 1];
      results = `<section class="card"><div class="kpis">
          <div class="kpi"><span class="label">Net P&amp;L</span><span class="big ${cls(end)}">${money(end, { sign: true, dp: 0 })}</span><span class="s">${pct((end / b.capital) * 100)} on ${money(b.capital, { dp: 0 })}</span></div>
          <div class="kpi"><span class="label">Trades</span><span class="big">${Math.round(s.stats.trades * 2.3)}</span><span class="s">${s.stats.win}% winners</span></div>
          <div class="kpi"><span class="label">Max drawdown</span><span class="big loss">${money(s.stats.dd * 1.3, { sign: true, dp: 0 })}</span><span class="s">Sharpe ${(s.stats.sharpe * 0.9).toFixed(2)}</span></div>
          <div class="kpi"><span class="label">Avg days in trade</span><span class="big">${s.id === 'mom' ? '0.0' : '4.2'}</span><span class="s">Fees included</span></div>
        </div></section>
        <section class="card"><div class="sec-h plain"><h2>Equity curve · ${esc(s.name)}</h2><button class="btn xs" type="button" data-act="customize" data-arg="${s.id}">Save these settings as my version</button></div><div class="body pad">${lineChart(curve, labels, { fmt: (v) => money(v, { sign: true, dp: 0 }), zero: true, tipFmt: (v) => money(v, { sign: true, dp: 0 }) })}</div></section>
        <div class="callout"><span>ℹ</span><span>Backtests use end-of-day option chains and fill at the mid price minus $0.05 slippage per leg. Real fills can be worse.</span></div>`;
    }
    return `
      <div class="page-h"><div class="t"><h1>Backtest</h1><span class="sub">Try a strategy on past data before running it</span></div></div>
      <section class="card pad"><form data-submit="run-backtest" style="display:flex;flex-direction:column;gap:14px">
        <div class="form-grid">
          <div class="field"><label for="bt-s">Strategy</label><select id="bt-s" name="sid">${S.strategies.filter((s) => !s.locked).map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="bt-from">From</label><input id="bt-from" name="from" type="date" value="2025-10-27"></div>
          <div class="field"><label for="bt-to">To</label><input id="bt-to" name="to" type="date" value="2026-10-23"></div>
          <div class="field"><label for="bt-cap">Starting capital ($)</label><input id="bt-cap" name="capital" type="number" step="1000" value="${b?.capital || 25000}"></div>
          <div class="field"><label for="bt-slip">Slippage per leg ($)</label><input id="bt-slip" name="slip" type="number" step="0.01" value="0.05"></div>
        </div>
        <div class="row-gap"><button class="btn pri" type="submit" ${b?.running ? 'disabled' : ''}>Run backtest</button><span class="muted" style="font-size:13px">Takes about a minute in the real app. Here it takes 2 seconds.</span></div>
      </form></section>
      ${results}`;
  };
  ACTIONS['run-backtest'] = (fd) => {
    S.backtest = { sid: fd.get('sid'), capital: Number(fd.get('capital')) || 25000, running: true, progress: 0 };
    A.rerender();
    const iv = setInterval(() => {
      S.backtest.progress += 20;
      if (S.backtest.progress >= 100) { clearInterval(iv); S.backtest.running = false; S.backtest.done = true; toast('Backtest finished.'); }
      if (S.route === 'backtest') A.rerender();
    }, 400);
  };

  // ---------- LEADERBOARD ----------
  PAGES.leaderboard = () => `
    <div class="page-h"><div class="t"><h1>Leaderboard</h1><span class="sub">Strategy returns across members who opted in · last 90 days</span></div>
      <label class="switch"><input type="checkbox" checked data-change="lb-opt" id="lb-opt"><span class="tr"></span><span>Include my versions</span></label></div>
    <section class="card"><div class="tw"><table class="tbl simple">
      <thead><tr><th>#</th><th>Strategy<span class="s">Author</span></th><th class="r">Return</th><th class="r">Win rate</th><th class="r">Max drawdown</th><th class="r">Trades</th><th class="r">Members using</th></tr></thead>
      <tbody>${D.leaderboard.map((r, i) => `<tr>
        <td class="num muted">${i + 1}</td>
        <td><span class="v1">${esc(r.name)}</span><span class="v2">${esc(r.by)}</span></td>
        <td class="r"><b class="${cls(r.ret)}">${pct(r.ret)}</b></td>
        <td class="r">${r.win}%</td>
        <td class="r loss">${pct(r.dd)}</td>
        <td class="r">${r.trades}</td>
        <td class="r">${r.users}</td></tr>`).join('')}</tbody></table></div></section>
    <p class="muted" style="font-size:13px">Returns are on allocated capital and include paper results. Names show only for members who opted in. Past results do not predict future returns.</p>`;
  ACTIONS['lb-opt'] = (v) => toast(v ? 'Your versions are on the leaderboard.' : 'Your versions are hidden from the leaderboard.');

  // ---------- GO LIVE ----------
  PAGES['go-live'] = () => {
    const g = S.goLive;
    const items = [
      ['broker', 'Connect tastytrade', 'Connected with OAuth. Account 5WT•••1234.', '#account'],
      ['twofa', 'Turn on two-factor login', 'Authenticator app is on.', '#account'],
      ['paperDays', 'Paper trade for 14 days', '21 paper days completed.', '#dashboard'],
      ['risk', 'Set account risk limits', 'Daily loss limit $500 · max 4 open positions.', '#account'],
      ['terms', 'Accept the trading terms', 'Version 3 accepted on Sep 2, 2026.', '#account'],
      ['test', 'Send one test order', 'Sends a 1-lot SPY limit order far from the market, then cancels it.', null],
    ];
    const done = items.filter(([k]) => g[k]).length;
    return `
      <div class="page-h"><div class="t"><h1>Go live</h1><span class="sub">${done} of ${items.length} steps done</span></div><a class="btn pri ${done === items.length ? '' : ''}" href="#strategies" ${done === items.length ? '' : 'aria-disabled="true"'}>Choose strategies to run live</a></div>
      <div class="progress" aria-hidden="true"><span style="width:${(done / items.length) * 100}%"></span></div>
      <section class="card"><ol class="steps">${items.map(([k, t, d, link]) => `<li>
        <span class="tick ${g[k] ? 'ok' : ''}">${g[k] ? '✓' : ''}</span>
        <span style="flex:1;min-width:0"><b>${t}</b><br><span class="muted" style="font-size:13px">${d}</span></span>
        ${g[k] ? (link ? `<a class="btn xs" href="${link}">Review</a>` : '<span class="chip good">Done</span>') : `<button class="btn xs pri" type="button" data-act="test-order">Send test order</button>`}
      </li>`).join('')}</ol></section>
      <section class="card">
        <div class="sec-h plain"><h2>Blackout windows</h2><button class="btn xs" type="button" data-act="add-blackout">Add window</button></div>
        <div class="body"><div class="tw"><table class="tbl simple"><thead><tr><th>Event</th><th>Date</th><th>No new entries</th><th>Applies to</th></tr></thead><tbody>
          <tr><td><b>FOMC decision</b></td><td>Nov 4, 2026</td><td>All day</td><td>All strategies</td></tr>
          <tr><td><b>CPI release</b></td><td>Nov 12, 2026</td><td>Until 10:30 ET</td><td>All strategies</td></tr>
          <tr><td><b>Thanksgiving half day</b></td><td>Nov 27, 2026</td><td>After 12:00 ET</td><td>Momentum scaling</td></tr>
        </tbody></table></div></div>
      </section>`;
  };
  Object.assign(ACTIONS, {
    'test-order': () => {
      toast('Test order sent… ');
      setTimeout(() => { S.goLive.test = true; toast('Test order accepted by tastytrade and cancelled. Live mode unlocked.'); if (S.route === 'go-live') A.rerender(); }, 1200);
    },
    'add-blackout': () => modal('Add blackout window', `<form id="bo" data-submit="bo-save" class="form-grid">
        <div class="field"><label for="bo-n">Event</label><input id="bo-n" type="text" value="Jobs report"></div>
        <div class="field"><label for="bo-d">Date</label><input id="bo-d" type="date" value="2026-11-06"></div>
        <div class="field"><label for="bo-u">No entries until</label><input id="bo-u" type="time" value="10:30"></div></form>`,
      '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="submit" form="bo">Add</button>'),
    'bo-save': () => { closeModal(); toast('Blackout window added.'); },
  });

  // ---------- ACCOUNT ----------
  PAGES.account = () => {
    const a = S.alerts;
    const al = (k, l) => `<label class="chk"><input type="checkbox" ${a[k] ? 'checked' : ''} data-change="alert" data-arg="${k}" id="al-${k}"> ${l}</label>`;
    return `
      <div class="page-h"><div class="t"><h1>Account and connections</h1></div></div>
      <div class="side-layout">
        <nav class="side" aria-label="Account sections">
          <div class="hd">Profile</div>
          <a href="#account" class="on" data-act="jump" data-arg="sec-profile">Name and email</a>
          <a href="#appearance">Appearance</a>
          <div class="hd">Settings</div>
          <a href="#account" data-act="jump" data-arg="sec-broker">tastytrade</a>
          <a href="#account" data-act="jump" data-arg="sec-alerts">Slack alerts</a>
          <a href="#account" data-act="jump" data-arg="sec-risk">Risk limits</a>
          <a href="#account" data-act="jump" data-arg="sec-security">Security</a>
          <a href="#plans">Plan</a>
        </nav>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <section class="card" id="sec-profile"><div class="sec-h plain"><h2>Name and email</h2></div><div class="body pad"><form data-submit="saved" class="form-grid">
            <div class="field"><label for="pf-n">Name</label><input id="pf-n" type="text" value="${esc(D.user.name)}"></div>
            <div class="field"><label for="pf-e">Email</label><input id="pf-e" type="email" value="${esc(D.user.email)}"></div>
            <div class="field"><label for="pf-tz">Time zone</label><select id="pf-tz"><option>Central (Chicago)</option><option>Eastern (New York)</option></select></div>
            <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">Save</button></div></form></div></section>

          <section class="card" id="sec-broker"><div class="sec-h plain"><h2>tastytrade</h2><span class="chip good"><span class="dot"></span> Connected</span></div><div class="body pad" style="display:flex;flex-direction:column;gap:12px">
            <dl class="kv"><dt>Account</dt><dd>${esc(D.user.account)} · Margin</dd><dt>Connected</dt><dd>Sep 2, 2026 with OAuth</dd><dt>Token</dt><dd>Encrypted · refreshes automatically</dd><dt>Market data</dt><dd>DXLink streaming</dd></dl>
            <p class="muted" style="font-size:13px">We never see or store your tastytrade password.</p>
            <div class="row-gap"><button class="btn" type="button" data-act="reconnect">Reconnect</button><button class="btn ghost-danger" type="button" data-act="disconnect">Disconnect</button></div>
          </div></section>

          <section class="card" id="sec-alerts"><div class="sec-h plain"><h2>Slack alerts</h2><span class="chip good">#trading-alerts</span></div><div class="body pad" style="display:flex;flex-direction:column;gap:10px">
            <div class="row-gap"><button class="btn" type="button" data-act="slack-test">Send test message</button><button class="btn" type="button" data-act="slack-channel">Change channel</button></div>
            <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:4px">Send me</legend>
              ${al('fill', 'Order filled')}${al('stop', 'Stop hit')}${al('risk', 'Risk limit hit')}${al('kill', 'Kill switch used')}${al('recap', 'End-of-day recap at 16:15 ET')}
              <label class="chk"><input type="checkbox" checked disabled> Errors and broker disconnects (always on)</label></fieldset>
          </div></section>

          <section class="card" id="sec-risk"><div class="sec-h plain"><h2>Risk limits</h2><span class="meta">Apply to all strategies</span></div><div class="body pad"><form data-submit="saved" style="display:flex;flex-direction:column;gap:14px">
            <div class="form-grid">
              <div class="field"><label for="rk-d">Daily loss limit ($)</label><input id="rk-d" type="number" value="500" step="50"><span class="hint">All strategies stop for the day when reached.</span></div>
              <div class="field"><label for="rk-p">Max open positions</label><input id="rk-p" type="number" value="4"></div>
              <div class="field"><label for="rk-t">Max risk per trade ($)</label><input id="rk-t" type="number" value="1000" step="100"></div>
              <div class="field"><label for="rk-bp">Keep buying power above ($)</label><input id="rk-bp" type="number" value="10000" step="500"></div>
            </div><div><button class="btn pri" type="submit">Save limits</button></div></form></div></section>

          <section class="card" id="sec-security"><div class="sec-h plain"><h2>Security</h2></div><div class="body pad" style="display:flex;flex-direction:column;gap:12px">
            <dl class="kv"><dt>Two-factor login</dt><dd>On · authenticator app</dd><dt>Last sign-in</dt><dd>Today 08:12 CT · Chrome on Windows</dd><dt>Terms</dt><dd>Version 3 accepted Sep 2, 2026</dd></dl>
            <div class="row-gap"><button class="btn" type="button" data-act="recovery">Show recovery codes</button><button class="btn" type="button" data-act="saved">Change password</button><button class="btn" type="button" data-act="signout-all">Sign out other devices</button></div>
          </div></section>
        </div>
      </div>`;
  };
  Object.assign(ACTIONS, {
    jump: (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    saved: () => toast('Saved.'),
    alert: (v, el) => { S.alerts[el.dataset.arg] = v; toast('Alert settings saved.'); },
    'slack-test': () => toast('Test message sent to #trading-alerts.'),
    'slack-channel': () => modal('Change Slack channel', '<div class="field"><label for="sl-c">Channel</label><select id="sl-c"><option>#trading-alerts</option><option>#vishal-bot</option><option>Direct message to me</option></select></div>', '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="slack-save">Save</button>'),
    'slack-save': () => { closeModal(); toast('Slack channel updated.'); },
    reconnect: () => modal('Reconnect tastytrade', '<p>You will go to tastytrade to approve access, then come back here. Your strategies keep running while you reconnect.</p>', '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="reconnect-go">Continue to tastytrade</button>'),
    'reconnect-go': () => { closeModal(); toast('Reconnected. New token stored encrypted.'); },
    disconnect: () => modal('Disconnect tastytrade?', '<p>This deletes the stored token and pauses all live strategies. Paper strategies keep running on delayed data.</p>', '<button class="btn" type="button" data-act="close-modal">Keep connected</button><button class="btn danger" type="button" data-act="disconnect-go">Disconnect</button>'),
    'disconnect-go': () => { closeModal(); toast('In the prototype the connection stays on so you can keep exploring.'); },
    recovery: () => modal('Recovery codes', `<p class="muted">Each code works once. Store them somewhere safe.</p><div class="mono" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:14px">${['7KQ2-M9XA', 'P4DT-1ZRW', 'B8NC-6YHE', 'Q3LV-2KSF', 'H5RJ-9WUC', 'T1GM-4PXD'].map((c) => `<span>${c}</span>`).join('')}</div><p class="muted" style="font-size:12.5px">Sample codes for the prototype.</p>`, '<button class="btn" type="button" data-act="close-modal">Done</button>'),
    'signout-all': () => toast('Signed out of 2 other devices.'),
  });

  // ---------- APPEARANCE ----------
  PAGES.appearance = () => {
    const cur = S.theme;
    const tiles = D.THEMES.map((t) => `<button class="tile" type="button" role="radio" aria-checked="${cur === t.id}" data-act="theme" data-arg="${t.id}">
        <span class="sw" style="background:${t.bg}">
          <span style="display:block;height:9px;width:70%;border-radius:3px;background:${t.text}"></span>
          <span style="display:block;height:6px;width:45%;border-radius:3px;background:${t.muted};margin-top:6px"></span>
          <span style="position:absolute;left:8px;bottom:8px;display:flex;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:${t.gain}"></span><span style="width:10px;height:10px;border-radius:50%;background:${t.loss}"></span></span>
          <span style="position:absolute;right:8px;bottom:8px;width:34px;height:14px;border-radius:4px;background:${t.accent}"></span>
          <span style="position:absolute;right:8px;top:8px;width:20px;height:20px;border-radius:4px;background:${t.surface};border:1px solid ${t.muted}"></span>
        </span>
        <span class="nm"><b>${t.name}</b><span class="muted">${t.kind}</span></span>
      </button>`).join('');
    const curName = cur ? D.THEMES.find((t) => t.id === cur).name : 'Follow my device';
    return `
      <div class="page-h"><div class="t"><h1>Appearance</h1><span class="sub">Saved to your profile, so the website and the Windows app match.</span></div></div>
      <div class="side-layout">
        <nav class="side" aria-label="Profile"><div class="hd">Profile</div><a href="#account">Name and email</a><a href="#appearance" class="on" aria-current="page">Appearance</a><a href="#account">Security</a><div class="hd">Settings</div><a href="#account">Connections</a><a href="#account">Alerts</a><a href="#plans">Plan</a></nav>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <section class="card"><div class="sec-h plain"><h2>Theme</h2><span class="meta">Current: <b>${esc(curName)}</b></span></div>
            <div class="body pad" style="display:flex;flex-direction:column;gap:14px">
              <label class="chk"><input type="radio" name="follow" ${cur ? '' : 'checked'} data-act="theme" data-arg=""> Follow my device (Classic Light by day, Midnight in dark mode)</label>
              <div class="tiles" role="radiogroup" aria-label="Theme">${tiles}</div>
            </div></section>
          <section class="card"><div class="sec-h plain"><h2>Gain and loss colors</h2></div><div class="body pad" style="display:flex;flex-direction:column;gap:10px">
            <div class="grid g2" role="radiogroup" aria-label="Gain and loss colors">
              <label class="callout" style="cursor:pointer"><input type="radio" name="gl" ${S.palette === 'greenRed' ? 'checked' : ''} data-change="palette" value="greenRed"><span><b>Green and red</b><br><span class="muted">The usual trading colors.</span></span></label>
              <label class="callout" style="cursor:pointer"><input type="radio" name="gl" ${S.palette === 'blueOrange' ? 'checked' : ''} data-change="palette" value="blueOrange"><span><b>Blue and orange</b><br><span class="muted">Easier to tell apart with red-green color blindness.</span></span></label>
            </div>
            <p class="muted" style="font-size:13px">Gains and losses always show a + or − sign, so color is never the only cue.</p></div></section>
          <section class="card"><div class="sec-h plain"><h2>Preview</h2><span class="meta">This whole app already uses your choice</span></div><div class="body pad"><div class="kpis" style="border:1px solid var(--line);border-radius:8px">
            <div class="kpi"><span class="label">Today's P&amp;L</span><span class="big gain">+$212.40</span><span class="s">+0.41%</span></div>
            <div class="kpi"><span class="label">SPX condor · Nov 13</span><span class="big loss">−$62.00</span><span class="s">−17.7% of credit</span></div>
            <div class="kpi"><span class="label">Buying power</span><span class="big">$31,060.00</span><span class="s">Muted text sample</span></div>
          </div><div class="row-gap" style="margin-top:12px"><button class="btn pri" type="button">Primary button</button><button class="btn" type="button">Secondary</button>${modeChip('LIVE')}${modeChip('PAPER')}<span class="chip good">Filled</span><span class="chip bad">Rejected</span></div></div></section>
          <div class="row-gap" style="justify-content:flex-end"><button class="btn" type="button" data-act="theme-reset">Reset</button><button class="btn pri" type="button" data-act="theme-save">Save to my profile</button></div>
        </div>
      </div>`;
  };
  Object.assign(ACTIONS, {
    theme: (id) => { S.theme = id || null; applyTheme(S.theme, S.palette); store.set('theme', S.theme); A.rerender(); },
    palette: (v) => { S.palette = v; applyTheme(S.theme, S.palette); store.set('palette', v); A.rerender(); },
    'theme-reset': () => { S.theme = null; S.palette = 'greenRed'; applyTheme(null, 'greenRed'); store.set('theme', null); store.set('palette', 'greenRed'); A.rerender(); toast('Reset to follow your device.'); },
    'theme-save': () => { store.set('theme', S.theme); store.set('palette', S.palette); toast('Appearance saved to your profile.'); },
  });

  // ---------- PLANS ----------
  PAGES.plans = () => `
    <div class="page-h"><div class="t"><h1>Plan</h1><span class="sub">Invite-only. Everything is free for now.</span></div></div>
    <div class="grid g2">
      <section class="card pad" style="display:flex;flex-direction:column;gap:12px;border-color:var(--accent)">
        <div class="row-gap" style="justify-content:space-between"><h2 style="font-size:18px">Friends</h2><span class="chip good">Your plan</span></div>
        <div class="big">$0 <span class="muted" style="font-size:14px;font-weight:500">/ month</span></div>
        <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px"><li>All free strategies, paper and live</li><li>Your own strategy versions</li><li>Backtests and analytics</li><li>Slack alerts</li></ul>
      </section>
      <section class="card pad" style="display:flex;flex-direction:column;gap:12px">
        <div class="row-gap" style="justify-content:space-between"><h2 style="font-size:18px">Pro</h2><span class="chip warn">Later</span></div>
        <div class="big muted">To be decided</div>
        <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px"><li>Paid strategies such as Earnings straddle scanner</li><li>More backtest history</li><li>Priority support</li></ul>
        <p class="muted" style="font-size:13px">Paid plans start only after legal review.</p>
        <button class="btn" type="button" disabled>Not available yet</button>
      </section>
    </div>`;

  // ---------- AUTH ----------
  const authArt = `<div class="art">
      <a class="brand" href="#signin">${icon.mark}<span>${esc(D.APP_NAME)}</span></a>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:44ch">
        <h1 style="font-size:28px">Your strategies, running on your tastytrade account.</h1>
        <p class="muted">Paper trade first, go live when you are ready, and stop everything with one button.</p>
        <svg viewBox="0 0 400 140" style="width:100%;max-width:420px;height:auto" aria-hidden="true"><line x1="0" x2="400" y1="100" y2="100" stroke="var(--border)"/><polyline points="10,124 110,124 160,40 240,40 290,124 390,124" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/><text x="200" y="30" text-anchor="middle" fill="var(--muted)" font-size="12">max profit = credit</text><text x="200" y="118" text-anchor="middle" fill="var(--muted)" font-size="12">SPX at expiry</text></svg>
      </div>
      <p class="muted" style="font-size:12.5px">Invite-only · Trading involves risk of loss.</p>
    </div>`;
  PAGES.signin = () => `<div class="auth">${authArt}<div class="form"><div class="box">
      ${S.twofa ? `<h1>Enter your 6-digit code</h1><p class="muted">From your authenticator app.</p>
        <form data-submit="signin-code" style="display:flex;flex-direction:column;gap:16px"><div class="code-in">${[1, 2, 3, 4, 5, 6].map((i) => `<input type="text" inputmode="numeric" maxlength="1" aria-label="Digit ${i}" value="${'482913'[i - 1]}">`).join('')}</div>
        <button class="btn pri lg" type="submit">Verify</button><a href="#signin" data-act="twofa-back">Use a recovery code</a></form>`
      : `<h1>Sign in</h1><p class="muted">Welcome back.</p>
        <form data-submit="signin" style="display:flex;flex-direction:column;gap:14px">
          <div class="field"><label for="si-e">Email</label><input id="si-e" type="email" value="${esc(D.user.email)}" required></div>
          <div class="field"><label for="si-p">Password</label><input id="si-p" type="password" value="password123" required></div>
          <button class="btn pri lg" type="submit">Continue</button>
        </form>
        <p class="muted" style="font-size:13px">Have an invite? <a href="#signup">Create your account</a></p>`}
    </div></div></div>`;
  PAGES.signup = () => `<div class="auth">${authArt}<div class="form"><div class="box">
      <h1>Create your account</h1><p class="muted">You need an invite code from the admin.</p>
      <form data-submit="signup" style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label for="su-c">Invite code</label><input id="su-c" type="text" value="FRND-7Q2K" class="mono"></div>
        <div class="field"><label for="su-n">Name</label><input id="su-n" type="text" value="Dev T."></div>
        <div class="field"><label for="su-e">Email</label><input id="su-e" type="email" value="dev.t@example.com"></div>
        <div class="field"><label for="su-p">Password</label><input id="su-p" type="password" value="password123"><span class="hint">At least 12 characters.</span></div>
        <label class="chk"><input type="checkbox" checked> I accept the trading terms and understand trading involves risk of loss.</label>
        <button class="btn pri lg" type="submit">Create account</button>
      </form>
      <p class="muted" style="font-size:13px">Already have an account? <a href="#signin">Sign in</a></p>
    </div></div></div>`;
  Object.assign(ACTIONS, {
    signin: () => { S.twofa = true; A.render(); },
    'twofa-back': () => { S.twofa = false; A.render(); },
    'signin-code': () => { S.twofa = false; S.signedIn = true; location.hash = 'dashboard'; },
    signup: () => {
      modal('Set up two-factor login', `<p>Scan this code with an authenticator app, then enter the 6-digit code.</p>
        <div style="width:150px;height:150px;border-radius:8px;background:repeating-conic-gradient(var(--text) 0 25%, var(--surface) 0 50%) 0 0/18px 18px;border:8px solid var(--surface);outline:1px solid var(--border)" aria-label="Sample QR code"></div>
        <div class="field"><label for="tf-c">Code</label><input id="tf-c" type="text" value="482913" class="mono"></div>`,
      '<button class="btn pri" type="button" data-act="signup-2">Verify and continue</button>');
    },
    'signup-2': () => modal('Connect tastytrade', '<p>Next you approve access on tastytrade. We store an encrypted token and never see your password. You can skip this and paper trade with delayed data.</p>',
      '<button class="btn" type="button" data-act="signup-done">Skip for now</button><button class="btn pri" type="button" data-act="signup-done">Connect with tastytrade</button>'),
    'signup-done': () => { closeModal(); S.signedIn = true; location.hash = 'dashboard'; toast('Welcome! Your account is ready.'); },
  });

  PAGES.notfound = () => `<div class="page-h"><h1>Page not found</h1></div><p><a href="#dashboard">Go to the dashboard</a></p>`;

  window.CUSTOMER = { ordersTable, modeChip, statusChip, pricingChip };
})();
