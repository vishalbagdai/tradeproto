/* App state, router, shell and live ticks. Pages live in pages-customer.js and pages-admin.js. */
(function () {
  const D = window.DATA;
  const { esc, money, pct, icon, toast, modal, closeModal, applyTheme, store } = window.UI;

  const S = {
    route: 'dashboard',
    theme: store.get('theme', null),
    palette: store.get('palette', 'greenRed'),
    killed: false,
    globalStop: false,
    menu: false,
    open: store.get('open', {}),
    sort: 'pnl',
    range: '1M',
    chartStrategy: 'all',
    ordersFilter: { status: 'all', sid: 'all', mode: 'all' },
    positions: D.positions.map((p) => ({ ...p })),
    strategies: D.strategies.map((s) => ({ ...s, params: { ...s.params } })),
    orders: D.orders.map((o) => ({ ...o })),
    users: D.users.map((u) => ({ ...u, strategies: [...u.strategies] })),
    invites: D.invites.map((i) => ({ ...i })),
    submissions: D.submissions.map((x) => ({ ...x })),
    audit: D.audit.map((a) => ({ ...a })),
    goLive: { broker: true, paperDays: true, risk: true, terms: true, twofa: true, test: false },
    alerts: { fill: true, stop: true, risk: true, kill: true, recap: true },
    backtest: null,
    signedIn: true,
  };

  const PAGES = {};
  const ACTIONS = {};

  // ---------- position math ----------
  const posPnl = (p) => (p.credit ? (p.entry - p.mark) * p.mult * p.qty : (p.mark - p.entry) * p.mult * p.qty);
  const posPct = (p) => (posPnl(p) / (p.entry * p.mult * p.qty)) * 100;
  const strat = (id) => S.strategies.find((s) => s.id === id);
  const stratName = (id) => { const s = strat(id); return s ? s.name : id; };
  const openPnl = (list = S.positions) => list.reduce((a, p) => a + posPnl(p), 0);
  const capAtRisk = (list = S.positions) => list.reduce((a, p) => a + (p.credit ? p.maxL : p.maxL || 0), 0);
  const isOpen = (k) => S.open[k] !== false;

  // ---------- routes ----------
  const NAV = [
    ['dashboard', 'Dashboard'],
    ['strategies', 'Strategies'],
    ['orders', 'Orders'],
    ['analytics', 'Analytics'],
    ['leaderboard', 'Leaderboard'],
    ['backtest', 'Backtest'],
  ];
  const ADMIN_NAV = [
    ['admin-users', 'Users'],
    ['admin-invites', 'Invites'],
    ['admin-strategies', 'Strategy catalog'],
    ['admin-review', 'Review submissions'],
    ['admin-audit', 'Global stop & audit'],
    ['admin-health', 'System health'],
  ];

  function navKey(route) {
    if (route.startsWith('strategy-') || route === 'my-versions') return 'strategies';
    if (route.startsWith('admin')) return 'admin';
    return route;
  }

  function shell(inner) {
    const key = navKey(S.route);
    const admin = key === 'admin';
    const anyLive = S.strategies.some((s) => s.on && s.mode === 'LIVE');
    return `
    <header class="top">
      <div class="top-in">
        <a class="brand" href="#dashboard">${icon.mark}<span>${esc(D.APP_NAME)}</span></a>
        <nav class="nav" aria-label="Main">
          ${NAV.map(([r, l]) => `<a href="#${r}" class="${key === r ? 'on' : ''}" ${key === r ? 'aria-current="page"' : ''}>${l}</a>`).join('')}
          ${D.user.role === 'admin' ? `<a href="#admin-users" class="${admin ? 'on' : ''}">Admin</a>` : ''}
        </nav>
        <div class="top-right">
          <span class="clock"><span class="dot ${S.killed ? 'bad' : ''}"></span><span data-live="clock">${LIVE.clock()}</span></span>
          <button class="mode-switch" type="button" data-act="mode-info" title="Trading mode">${anyLive ? '<span class="mode live">LIVE</span>' : '<span class="mode paper">PAPER</span>'}<span class="hide-sm">${anyLive ? 'Live on' : 'Paper only'}</span></button>
          <button class="btn danger" type="button" data-act="${S.killed ? 'resume' : 'kill'}">${S.killed ? 'Resume' : 'Kill switch'}</button>
          <div class="menu-wrap">
            <button class="avatar" type="button" data-act="menu" aria-haspopup="true" aria-expanded="${S.menu}" aria-label="Profile menu">${esc(D.user.initials)}</button>
            ${S.menu ? `<div class="menu" role="menu">
              <div class="who"><div style="font-weight:600">${esc(D.user.name)}</div><div class="muted" style="font-size:12.5px">${esc(D.user.email)}</div></div>
              <a href="#appearance" role="menuitem">Appearance</a>
              <a href="#account" role="menuitem">Account and connections</a>
              <a href="#my-versions" role="menuitem">My strategy versions</a>
              <a href="#go-live" role="menuitem">Go live checklist</a>
              <a href="#plans" role="menuitem">Plan</a>
              <a href="#admin-users" role="menuitem">Admin</a>
              <button type="button" data-act="signout" role="menuitem">Sign out</button>
            </div>` : ''}
          </div>
        </div>
      </div>
    </header>
    ${admin ? `<div class="subnav"><nav class="nav" aria-label="Admin">${ADMIN_NAV.map(([r, l]) => `<a href="#${r}" class="${S.route === r ? 'on' : ''}">${l}</a>`).join('')}</nav></div>` : ''}
    ${S.killed || S.globalStop ? `<div class="banner" role="alert"><div class="wrap"><span>${S.globalStop ? 'Global stop is on. No new orders for any user.' : 'Kill switch is on. All strategies are stopped and no new orders will be sent.'}</span><button class="btn xs" type="button" data-act="${S.globalStop ? 'global-release' : 'resume'}">${S.globalStop ? 'Release global stop' : 'Resume trading'}</button></div></div>` : ''}
    <div class="proto"><div class="wrap"><span><b>Prototype</b> with sample data. No real orders are sent.</span><span>Prices tick every 2 seconds to show live updates.</span></div></div>
    <main class="wrap" id="main">${inner}</main>`;
  }

  function render() {
    const raw = (location.hash || '#dashboard').slice(1) || 'dashboard';
    S.route = raw;
    const app = document.getElementById('app');
    if (!S.signedIn && raw !== 'signin' && raw !== 'signup') { location.hash = 'signin'; return; }
    let page = PAGES[raw];
    let arg = null;
    if (!page && raw.startsWith('strategy-')) { page = PAGES.strategy; arg = raw.slice(9); }
    if (!page) page = PAGES.notfound;
    const html = page(arg);
    if (raw === 'signin' || raw === 'signup') app.innerHTML = html;
    else app.innerHTML = shell(html);
    const t = document.querySelector('h1');
    document.title = `${t ? t.textContent : ''} · ${D.APP_NAME}`;
  }

  function rerender() {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  window.addEventListener('hashchange', () => { S.menu = false; closeModal(); render(); window.scrollTo(0, 0); });

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (S.menu && !e.target.closest('.menu')) { S.menu = false; rerender(); }
      return;
    }
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.change];
    if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el, e);
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-submit]');
    if (!f) return;
    e.preventDefault();
    const fn = ACTIONS[f.dataset.submit];
    if (fn) fn(new FormData(f), f);
  });

  // Shared actions
  Object.assign(ACTIONS, {
    'close-modal': () => closeModal(),
    menu: () => { S.menu = !S.menu; rerender(); },
    toggle: (k) => { S.open[k] = !isOpen(k); store.set('open', S.open); rerender(); },
    'expand-all': () => { Object.keys(S.open).forEach((k) => { S.open[k] = true; }); S.open = {}; store.set('open', S.open); rerender(); },
    'collapse-all': () => {
      ['summary', 'chart', 'all', 'fills', ...S.strategies.map((s) => `s-${s.id}`)].forEach((k) => { S.open[k] = false; });
      store.set('open', S.open); rerender();
    },
    kill: () => modal('Stop all trading?', `
        <p>This stops every strategy on your account right away. Working orders are cancelled. Open positions stay open so you can close them yourself.</p>
        <div class="callout warn"><span>⚠</span><span>Live strategies affected: <b>${S.strategies.filter((s) => s.on && s.mode === 'LIVE').map((s) => esc(s.name)).join(', ') || 'none'}</b></span></div>
        <label class="chk"><input type="checkbox" id="kill-flat"> Also close all open positions at market</label>`,
      '<button class="btn" type="button" data-act="close-modal">Keep trading</button><button class="btn danger" type="button" data-act="kill-confirm">Stop all trading</button>'),
    'kill-confirm': () => {
      const flat = document.getElementById('kill-flat')?.checked;
      S.killed = true;
      S.orders.filter((o) => o.status === 'Working').forEach((o) => { o.status = 'Cancelled'; o.reason = 'Kill switch'; });
      if (flat) S.positions = [];
      closeModal();
      toast(flat ? 'Trading stopped and positions closed. Slack alert sent.' : 'Trading stopped. Slack alert sent.');
      rerender();
    },
    resume: () => { S.killed = false; toast('Trading resumed.'); rerender(); },
    'mode-info': () => {
      const live = S.strategies.filter((s) => s.on && s.mode === 'LIVE');
      const paper = S.strategies.filter((s) => s.on && s.mode === 'PAPER');
      modal('Trading mode', `
        <p class="muted">Each strategy runs in paper or live mode. Change a strategy's mode on the Strategies page.</p>
        <dl class="kv"><dt>Live</dt><dd>${live.map((s) => esc(s.name)).join(', ') || 'None'}</dd><dt>Paper</dt><dd>${paper.map((s) => esc(s.name)).join(', ') || 'None'}</dd></dl>`,
      '<a class="btn" href="#go-live">Go live checklist</a><a class="btn pri" href="#strategies">Manage strategies</a>');
    },
    signout: () => { S.signedIn = false; S.menu = false; location.hash = 'signin'; },
    nav: (r) => { location.hash = r; },
  });

  // ---------- live ticks ----------
  const SIM_START = new Date(2026, 9, 27, 14, 32, 5);
  const LOADED = Date.now();
  const LIVE = {
    clock: () => `${S.killed ? 'Trading stopped' : 'Market open'} · ${LIVE.time()} ET`,
    // Simulated trading-day clock that starts at 14:32:05 ET when the page loads.
    time: () => {
      const t = new Date(SIM_START.getTime() + (Date.now() - LOADED));
      return `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
    },
  };
  function tick() {
    if (S.killed) return;
    const r = Math.random;
    S.positions.forEach((p) => {
      const step = p.credit ? (r() - 0.5) * 0.06 : (r() - 0.48) * 0.16;
      p.mark = Math.max(p.credit ? 0.05 : 1, +(p.mark + step).toFixed(2));
    });
    document.querySelectorAll('[data-live]').forEach((el) => {
      const [kind, id] = el.dataset.live.split(':');
      let html = null;
      const p = S.positions.find((x) => x.id === id);
      if (kind === 'clock') html = LIVE.clock();
      else if (kind === 'time') html = `${LIVE.time()} ET`;
      else if (kind === 'mark' && p) html = p.credit ? money(p.mark) : money(p.mark);
      else if (kind === 'pnl' && p) { const v = posPnl(p); el.className = `pnl1 ${window.UI.cls(v)}`; html = money(v, { sign: true }); }
      else if (kind === 'pct' && p) { const v = posPct(p); el.className = `pnl2 ${window.UI.cls(v)}`; html = pct(v); }
      else if (kind === 'open-total') { const v = openPnl(); el.className = `${el.dataset.base || ''} ${window.UI.cls(v)}`; html = money(v, { sign: true }); }
      else if (kind === 'open-pct') { const v = (openPnl() / Math.max(1, capAtRisk())) * 100; el.className = `${el.dataset.base || ''} ${window.UI.cls(v)}`; html = pct(v); }
      else if (kind === 'strat-total') { const list = S.positions.filter((x) => x.sid === id); const v = openPnl(list); el.className = window.UI.cls(v); html = money(v, { sign: true }); }
      if (html !== null && el.innerHTML !== html) {
        el.innerHTML = html;
        if (kind === 'mark' || kind === 'pnl') { const td = el.closest('td'); if (td) { td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash'); } }
      }
    });
  }
  setInterval(tick, 2000);

  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (!S.theme) applyTheme(null, S.palette); });

  window.APP = { S, PAGES, ACTIONS, render, rerender, posPnl, posPct, strat, stratName, openPnl, capAtRisk, isOpen, LIVE };

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(S.theme, S.palette);
    render();
    tick();
  });
})();
