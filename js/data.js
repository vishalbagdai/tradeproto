/* Dummy data for the prototype. Nothing here is real account data. */
(function () {
  const APP_NAME = 'Autotrade';

  // Seeded random numbers so charts look the same on every load.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // 15 themes: id, name, kind, bg, surface, text, muted, accent, onAccent, gain, loss
  const THEMES = [
    ['classic', 'Classic Light', 'Light', '#ffffff', '#ffffff', '#1f2328', '#59636e', '#0969da', '#ffffff', '#1a7f37', '#cf222e'],
    ['midnight', 'Midnight', 'Dark', '#0d1117', '#161b22', '#e6edf3', '#9198a1', '#4493f8', '#0d1117', '#3fb950', '#f85149'],
    ['slate', 'Slate', 'Dark', '#0f172a', '#1e293b', '#e2e8f0', '#94a3b8', '#38bdf8', '#0f172a', '#4ade80', '#f87171'],
    ['ocean', 'Ocean', 'Light', '#f0f7fb', '#ffffff', '#0b2a3c', '#4a6272', '#006c9c', '#ffffff', '#0f7a3d', '#b42318'],
    ['forest', 'Forest', 'Dark', '#0f1f17', '#183026', '#e3f1e8', '#9fbcab', '#5dd39e', '#0f1f17', '#7ee2a8', '#ff8a80'],
    ['sunset', 'Sunset', 'Light', '#fff7f0', '#ffffff', '#2d1b12', '#6b5246', '#c2410c', '#ffffff', '#15803d', '#b91c1c'],
    ['lavender', 'Lavender', 'Light', '#f7f5ff', '#ffffff', '#231a3d', '#5f5675', '#6d28d9', '#ffffff', '#15803d', '#be123c'],
    ['rose', 'Rose', 'Light', '#fff5f7', '#ffffff', '#3a1420', '#73505b', '#be185d', '#ffffff', '#15803d', '#b91c1c'],
    ['sand', 'Sand', 'Light', '#faf6ee', '#fffdf8', '#2b2418', '#665b48', '#8a5a00', '#ffffff', '#2f7d32', '#b3261e'],
    ['graphite', 'Graphite', 'Dark', '#1a1a1a', '#262626', '#ededed', '#a3a3a3', '#8ab4f8', '#1a1a1a', '#81c995', '#f28b82'],
    ['arctic', 'Arctic', 'Dark', '#2b303b', '#353c4a', '#eceff4', '#b8c0cf', '#8fbcd4', '#2b303b', '#a8d08d', '#f2a0a6'],
    ['parchment', 'Parchment', 'Light', '#fbf6e9', '#f1ead6', '#2a2a22', '#5e5a4a', '#1f5f99', '#ffffff', '#2e6b1f', '#a12a1a'],
    ['dusk', 'Dusk', 'Dark', '#1b1530', '#261d42', '#ece8ff', '#b0a6d6', '#b39dff', '#1b1530', '#6ee7a8', '#ff8fa3'],
    ['contrast', 'High Contrast', 'Dark', '#000000', '#0a0a0a', '#ffffff', '#e0e0e0', '#ffd400', '#000000', '#00e676', '#ff6e6e'],
    ['terminal', 'Terminal', 'Dark', '#0a0f0a', '#111a11', '#c8f7c5', '#8fbf8c', '#39d97a', '#0a0f0a', '#6dff9a', '#ff6b6b'],
  ].map(([id, name, kind, bg, surface, text, muted, accent, onAccent, gain, loss]) => ({ id, name, kind, bg, surface, text, muted, accent, onAccent, gain, loss }));

  const user = { id: 'u1', name: 'Vishal B.', initials: 'VB', email: 'vishal@example.com', role: 'admin', account: '5WT•••1234', joined: 'Sep 2, 2026' };

  // Strategy catalog (admin-managed) plus the user's own versions.
  const strategies = [
    {
      id: 'spx-ic', name: 'SPX iron condor', kind: 'catalog', owner: 'Admin', pricing: 'Free', on: true, mode: 'LIVE',
      underlying: 'SPX', style: 'Iron condor · 0–21 DTE', risk: 'Defined', maxPerTrade: 700, alloc: 5000,
      desc: 'Sells a 10-delta iron condor on SPX each morning when VIX is between 13 and 28. Takes profit at 50% of credit and stops at 20% of max risk.',
      params: { shortDelta: 0.10, wing: 10, entry: '10:00', target: 50, stop: 20, maxOpen: 2, vixMin: 13, vixMax: 28 },
      stats: { trades: 64, win: 78, avg: 41.2, pnl: 2638, dd: -812, sharpe: 1.6 }, seed: 11, assigned: 6,
    },
    {
      id: 'tight', name: 'Tight-wing condor', version: 'my version', kind: 'mine', basedOn: 'SPX iron condor', owner: 'You', pricing: 'Free', on: true, mode: 'PAPER',
      underlying: 'SPX', style: 'Iron condor · 0–7 DTE', risk: 'Defined', maxPerTrade: 400, alloc: 2000,
      desc: 'Your version of SPX iron condor with 5-point wings and a 40% profit target.',
      params: { shortDelta: 0.08, wing: 5, entry: '10:05', target: 40, stop: 20, maxOpen: 1, vixMin: 14, vixMax: 26 },
      stats: { trades: 21, win: 81, avg: 22.4, pnl: 412, dd: -190, sharpe: 1.4 }, seed: 23, submitted: 'Pending review',
    },
    {
      id: 'mom', name: 'Momentum scaling', kind: 'catalog', owner: 'Admin', pricing: 'Free', on: true, mode: 'PAPER',
      underlying: 'SPY', style: 'Intraday · scale-in', risk: 'Stop-based', maxPerTrade: 30, alloc: 25000,
      desc: 'Takes a small test entry on a 5-minute breakout above VWAP, adds twice as price confirms, trails a stop and is flat by 15:55 ET. Daily cap +$100 / −$60.',
      params: { testSize: 10, adds: 2, addStep: 0.30, trail: 0.70, flatBy: '15:55', dayCap: 100, dayStop: 60 },
      stats: { trades: 132, win: 54, avg: 6.8, pnl: 898, dd: -344, sharpe: 1.1 }, seed: 37, assigned: 4,
    },
    {
      id: 'wide', name: 'Wide condor', version: 'community', kind: 'community', owner: 'Raj P.', pricing: 'Free', on: true, mode: 'PAPER',
      underlying: 'SPX', style: 'Iron condor · 14–30 DTE', risk: 'Defined', maxPerTrade: 1500, alloc: 6000,
      desc: 'Published from a member version. 25-point wings, 16-delta shorts, enters once a week.',
      params: { shortDelta: 0.16, wing: 25, entry: '10:00', target: 50, stop: 25, maxOpen: 2, vixMin: 12, vixMax: 30 },
      stats: { trades: 18, win: 72, avg: 88.0, pnl: 1120, dd: -640, sharpe: 1.2 }, seed: 41, assigned: 3,
    },
    {
      id: 'pcs', name: '0DTE put credit spread', kind: 'catalog', owner: 'Admin', pricing: 'Free for 30 days', on: false, mode: 'PAPER',
      underlying: 'SPX', style: 'Credit spread · 0 DTE', risk: 'Defined', maxPerTrade: 500, alloc: 0,
      desc: 'Sells a 5-delta put spread at 11:00 ET on up-trend days. Exits at 70% of credit or at 15:30 ET.',
      params: { shortDelta: 0.05, wing: 5, entry: '11:00', target: 70, stop: 100, maxOpen: 1, vixMin: 12, vixMax: 24 },
      stats: { trades: 47, win: 89, avg: 14.9, pnl: 701, dd: -455, sharpe: 0.9 }, seed: 53, assigned: 2,
    },
    {
      id: 'earn', name: 'Earnings straddle scanner', kind: 'catalog', owner: 'Admin', pricing: 'Paid · later', on: false, mode: 'PAPER', locked: true,
      underlying: 'Single stocks', style: 'Long straddle · event', risk: 'Defined', maxPerTrade: 800, alloc: 0,
      desc: 'Buys straddles 5 days before earnings when implied move is below the 8-quarter average move. Paid plans come after legal review.',
      params: {}, stats: { trades: 36, win: 47, avg: 31.0, pnl: 1116, dd: -920, sharpe: 0.7 }, seed: 67, assigned: 0,
    },
  ];

  const positions = [
    { id: 'p1', sid: 'spx-ic', mode: 'LIVE', title: 'Iron condor × 1', legs: '5850/5840P · 5950/5960C', occ: 'SPXW 261030', expiry: 'Oct 30', dte: 3, qty: 1, entry: 3.20, mark: 1.85, credit: true, maxP: 320, maxL: 680, target: '50% credit', stop: '20% risk', delta: -0.04, opened: 'Oct 27 10:02', status: 'Monitoring', mult: 100 },
    { id: 'p2', sid: 'tight', mode: 'PAPER', title: 'Iron condor × 1', legs: '5860/5855P · 5940/5945C', occ: 'SPXW 261030', expiry: 'Oct 30', dte: 3, qty: 1, entry: 1.40, mark: 0.90, credit: true, maxP: 140, maxL: 360, target: '40% credit', stop: '20% risk', delta: -0.02, opened: 'Oct 27 10:05', status: 'Monitoring', mult: 100 },
    { id: 'p3', sid: 'mom', mode: 'PAPER', title: 'SPY · long 40 sh', legs: 'Test entry + 2 adds', occ: 'SPY', expiry: 'Today', dte: 0, qty: 40, entry: 585.10, mark: 586.30, credit: false, maxP: null, maxL: 28, target: 'Trailing', stop: '$584.40', delta: 40, opened: 'Oct 27 10:41', status: 'Add at $586.90', mult: 1 },
    { id: 'p4', sid: 'spx-ic', mode: 'LIVE', title: 'Iron condor × 1', legs: '5800/5790P · 5900/5910C', occ: 'SPXW 261113', expiry: 'Nov 13', dte: 17, qty: 1, entry: 3.50, mark: 4.12, credit: true, maxP: 350, maxL: 650, target: '50% credit', stop: '20% risk', delta: 0.09, opened: 'Oct 23 10:01', status: 'Stop check 0/2', mult: 100 },
  ];

  const orders = [
    { id: '48213', t: '14:12', d: 'Oct 27', sid: 'spx-ic', mode: 'LIVE', status: 'Working', what: 'Close iron condor × 1', legs: '5800/5790P · 5900/5910C · Nov 13', type: 'Limit · Day', reason: 'Profit target', limit: '$1.75 db', filled: '0 of 1', amt: -175, fees: null },
    { id: 'P-1187', t: '10:41', d: 'Oct 27', sid: 'mom', mode: 'PAPER', status: 'Filled', what: 'Buy 20 SPY · add #2', legs: 'Position after: 40 sh', type: 'Market · Day', reason: 'Scale-in signal', limit: 'market', filled: '20 of 20 @ $585.05', amt: -11701, fees: 0 },
    { id: 'P-1186', t: '10:22', d: 'Oct 27', sid: 'mom', mode: 'PAPER', status: 'Filled', what: 'Buy 10 SPY · add #1', legs: 'Position after: 20 sh', type: 'Market · Day', reason: 'Scale-in signal', limit: 'market', filled: '10 of 10 @ $585.20', amt: -5852, fees: 0 },
    { id: 'P-1185', t: '10:09', d: 'Oct 27', sid: 'mom', mode: 'PAPER', status: 'Filled', what: 'Buy 10 SPY · test entry', legs: 'Position after: 10 sh', type: 'Market · Day', reason: 'VWAP breakout', limit: 'market', filled: '10 of 10 @ $585.00', amt: -5850, fees: 0 },
    { id: 'P-1184', t: '10:05', d: 'Oct 27', sid: 'tight', mode: 'PAPER', status: 'Filled', what: 'Open iron condor × 1', legs: '5860/5855P · 5940/5945C · Oct 30', type: 'Limit · Day', reason: 'Entry signal', limit: '$1.40 cr', filled: '1 of 1 @ $1.40', amt: 140, fees: 0 },
    { id: '48190', t: '10:02', d: 'Oct 27', sid: 'spx-ic', mode: 'LIVE', status: 'Filled', what: 'Open iron condor × 1', legs: '5850/5840P · 5950/5960C · Oct 30', type: 'Limit · Day', reason: 'Entry signal', limit: '$3.20 cr', filled: '1 of 1 @ $3.20', amt: 320, fees: 4.52 },
    { id: 'P-1102', t: '10:05', d: 'Oct 24', sid: 'tight', mode: 'PAPER', status: 'Cancelled', what: 'Open iron condor × 1', legs: '5860/5855P · 5940/5945C · Oct 30', type: 'Limit · Day', reason: 'No fill in 60 s', limit: '$1.45 cr', filled: '0 of 1', amt: 0, fees: null },
    { id: '48101', t: '15:41', d: 'Oct 24', sid: 'spx-ic', mode: 'LIVE', status: 'Filled', what: 'Close iron condor × 1', legs: '5790/5780P · 5890/5900C · Oct 24', type: 'Limit · Day', reason: 'Profit target', limit: '$1.55 db', filled: '1 of 1 @ $1.55', amt: -155, fees: 4.52 },
    { id: 'P-1099', t: '14:58', d: 'Oct 24', sid: 'mom', mode: 'PAPER', status: 'Partially filled', what: 'Sell 30 SPY · trail stop', legs: 'Position after: 12 sh', type: 'Stop · Day', reason: 'Trailing stop hit', limit: '$581.20 stop', filled: '18 of 30 @ $581.18', amt: 10461, fees: 0 },
    { id: '48022', t: '10:01', d: 'Oct 22', sid: 'spx-ic', mode: 'LIVE', status: 'Rejected', what: 'Open iron condor × 1', legs: '5780/5770P · 5880/5890C · Nov 6', type: 'Limit · Day', reason: 'Insufficient buying power', limit: '$3.30 cr', filled: '0 of 1', amt: 0, fees: null },
    { id: '47988', t: '10:00', d: 'Oct 21', sid: 'spx-ic', mode: 'LIVE', status: 'Filled', what: 'Open iron condor × 1', legs: '5790/5780P · 5890/5900C · Oct 24', type: 'Limit · Day', reason: 'Entry signal', limit: '$3.10 cr', filled: '1 of 1 @ $3.10', amt: 310, fees: 4.52 },
    { id: 'P-1050', t: '10:00', d: 'Oct 20', sid: 'wide', mode: 'PAPER', status: 'Filled', what: 'Close iron condor × 1', legs: '5650/5625P · 6000/6025C · Nov 6', type: 'Limit · Day', reason: 'Profit target', limit: '$3.90 db', filled: '1 of 1 @ $3.90', amt: -390, fees: 0 },
  ];

  // Daily P&L history: ~2 years of trading days ending Oct 27, 2026.
  function buildDaily() {
    const r = rng(7);
    const days = [];
    const end = new Date(2026, 9, 27);
    const d = new Date(2024, 9, 28);
    let equity = 40000;
    while (d <= end) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) {
        const shock = r() < 0.06 ? -(180 + r() * 420) : 0;
        const pnl = Math.round((r() - 0.42) * 260 + shock + 6);
        equity += pnl;
        days.push({ date: new Date(d), pnl, equity });
      }
      d.setDate(d.getDate() + 1);
    }
    // Pin the latest equity to the dashboard value.
    const shift = 52418.30 - days[days.length - 1].equity;
    days.forEach((x) => { x.equity += shift; });
    days[days.length - 1].pnl = 212.40;
    return days;
  }

  // Intraday equity points for the 1D chart (every 5 min, 9:30–14:30).
  function buildIntraday() {
    const r = rng(99);
    const pts = [];
    let v = 52206;
    for (let m = 0; m <= 300; m += 5) {
      v += (r() - 0.45) * 28;
      pts.push({ label: `${9 + Math.floor((30 + m) / 60)}:${String((30 + m) % 60).padStart(2, '0')}`, equity: v });
    }
    const shift = 52418.30 - pts[pts.length - 1].equity;
    pts.forEach((p) => { p.equity += shift; });
    return pts;
  }

  function strategyCurve(seed, n, drift) {
    const r = rng(seed);
    let v = 0;
    const out = [];
    for (let i = 0; i < n; i++) { v += (r() - 0.5) * 60 + drift; out.push(v); }
    return out;
  }

  const users = [
    { id: 'u1', name: 'Vishal B.', email: 'vishal@example.com', role: 'Admin', status: 'Active', broker: 'Connected', mode: 'LIVE', strategies: ['spx-ic', 'tight', 'mom', 'wide'], joined: 'Sep 2, 2026', last: 'now', pnl30: 1284.5 },
    { id: 'u2', name: 'Raj P.', email: 'raj.p@example.com', role: 'Member', status: 'Active', broker: 'Connected', mode: 'LIVE', strategies: ['spx-ic', 'wide'], joined: 'Sep 9, 2026', last: '12 min ago', pnl30: 942.1 },
    { id: 'u3', name: 'Priya S.', email: 'priya.s@example.com', role: 'Member', status: 'Active', broker: 'Connected', mode: 'PAPER', strategies: ['spx-ic', 'mom', 'pcs'], joined: 'Sep 14, 2026', last: '1 h ago', pnl30: 318.0 },
    { id: 'u4', name: 'Amit K.', email: 'amit.k@example.com', role: 'Member', status: 'Active', broker: 'Not connected', mode: 'PAPER', strategies: ['mom'], joined: 'Sep 30, 2026', last: 'Yesterday', pnl30: -64.2 },
    { id: 'u5', name: 'Neha R.', email: 'neha.r@example.com', role: 'Member', status: 'Paused', broker: 'Token expired', mode: 'PAPER', strategies: ['spx-ic'], joined: 'Oct 3, 2026', last: '5 days ago', pnl30: 120.0 },
    { id: 'u6', name: 'Karan M.', email: 'karan.m@example.com', role: 'Member', status: 'Active', broker: 'Connected', mode: 'PAPER', strategies: ['spx-ic', 'wide', 'pcs', 'mom'], joined: 'Oct 11, 2026', last: '3 h ago', pnl30: 577.9 },
    { id: 'u7', name: 'Dev T.', email: 'dev.t@example.com', role: 'Member', status: 'Invited', broker: '—', mode: '—', strategies: [], joined: '—', last: '—', pnl30: 0 },
  ];

  const invites = [
    { code: 'FRND-7Q2K', email: 'dev.t@example.com', created: 'Oct 25, 2026', expires: 'Nov 1, 2026', status: 'Sent', by: 'Vishal B.' },
    { code: 'FRND-M4XP', email: 'karan.m@example.com', created: 'Oct 10, 2026', expires: 'Oct 17, 2026', status: 'Used', by: 'Vishal B.' },
    { code: 'FRND-9ZRT', email: 'neha.r@example.com', created: 'Oct 2, 2026', expires: 'Oct 9, 2026', status: 'Used', by: 'Vishal B.' },
    { code: 'FRND-C1LB', email: 'sam.w@example.com', created: 'Sep 20, 2026', expires: 'Sep 27, 2026', status: 'Expired', by: 'Vishal B.' },
  ];

  const submissions = [
    { id: 's1', name: 'Tight-wing condor', by: 'Vishal B.', basedOn: 'SPX iron condor', submitted: 'Oct 26, 2026', paperDays: 21, trades: 21, win: 81, pnl: 412, status: 'Pending review', changes: ['Wing width 10 → 5', 'Profit target 50% → 40%', 'Short delta 0.10 → 0.08', 'Max open 2 → 1'] },
    { id: 's2', name: 'Late-day iron fly', by: 'Karan M.', basedOn: 'SPX iron condor', submitted: 'Oct 22, 2026', paperDays: 9, trades: 7, win: 57, pnl: -38, status: 'Needs more paper days', changes: ['Structure condor → fly', 'Entry 10:00 → 14:30', 'Profit target 50% → 25%'] },
    { id: 's3', name: 'Wide condor', by: 'Raj P.', basedOn: 'SPX iron condor', submitted: 'Sep 30, 2026', paperDays: 30, trades: 18, win: 72, pnl: 1120, status: 'Published', changes: ['Wing width 10 → 25', 'Short delta 0.10 → 0.16', 'DTE 0–21 → 14–30'] },
  ];

  const audit = [
    { t: 'Oct 27 14:12:03', who: 'System', what: 'Order 48213 sent', detail: 'SPX iron condor · close · profit target', level: 'info' },
    { t: 'Oct 27 10:41:12', who: 'System', what: 'Paper fill', detail: 'Momentum scaling · add #2 · Vishal B.', level: 'info' },
    { t: 'Oct 27 10:02:47', who: 'System', what: 'Live fill', detail: 'SPX iron condor · open · $3.20 cr · Vishal B.', level: 'info' },
    { t: 'Oct 26 21:15:30', who: 'Vishal B.', what: 'Submitted strategy version', detail: 'Tight-wing condor for review', level: 'info' },
    { t: 'Oct 25 09:12:10', who: 'Vishal B.', what: 'Invite created', detail: 'dev.t@example.com · expires Nov 1', level: 'info' },
    { t: 'Oct 24 15:59:58', who: 'System', what: 'Token refresh failed', detail: 'Neha R. · tastytrade token expired · user paused', level: 'warn' },
    { t: 'Oct 22 10:01:04', who: 'tastytrade', what: 'Order rejected', detail: '48022 · insufficient buying power · Vishal B.', level: 'warn' },
    { t: 'Oct 21 11:30:00', who: 'Vishal B.', what: 'Global stop released', detail: 'Trading resumed for all users', level: 'info' },
    { t: 'Oct 21 11:02:41', who: 'Vishal B.', what: 'Global stop used', detail: 'Reason: CPI print volatility', level: 'bad' },
    { t: 'Oct 20 08:00:00', who: 'Vishal B.', what: 'Strategy assigned', detail: '0DTE put credit spread → Priya S., Karan M.', level: 'info' },
  ];

  const health = [
    { name: 'Web API', detail: '2 instances · p95 84 ms', status: 'ok' },
    { name: 'Execution worker', detail: 'Heartbeat 2 s ago · 0 errors today', status: 'ok' },
    { name: 'Market data (DXLink)', detail: 'Streaming 214 symbols · lag 180 ms', status: 'ok' },
    { name: 'Redis Streams', detail: 'orders: 0 pending · signals: 3 pending', status: 'ok' },
    { name: 'PostgreSQL + TimescaleDB', detail: '41% disk · last backup 02:00 ET', status: 'ok' },
    { name: 'tastytrade API', detail: '1 user token expired (Neha R.)', status: 'warn' },
    { name: 'Slack alerts', detail: '128 sent today · 0 failed', status: 'ok' },
    { name: 'Free data feeds', detail: 'Yahoo ok · CBOE ok · Finnhub 52/60 per min', status: 'ok' },
  ];

  const leaderboard = [
    { name: 'SPX iron condor', by: 'Admin', users: 6, ret: 9.8, win: 78, dd: -3.1, trades: 64 },
    { name: 'Wide condor', by: 'Raj P.', users: 3, ret: 8.4, win: 72, dd: -4.6, trades: 18 },
    { name: 'Tight-wing condor', by: 'Vishal B.', users: 1, ret: 6.9, win: 81, dd: -2.4, trades: 21 },
    { name: 'Momentum scaling', by: 'Admin', users: 4, ret: 3.6, win: 54, dd: -1.4, trades: 132 },
    { name: '0DTE put credit spread', by: 'Admin', users: 2, ret: 2.8, win: 89, dd: -1.8, trades: 47 },
    { name: 'Late-day iron fly', by: 'Karan M.', users: 1, ret: -0.4, win: 57, dd: -1.1, trades: 7 },
  ];

  window.DATA = {
    APP_NAME, THEMES, user, strategies, positions, orders, users, invites, submissions, audit, health, leaderboard,
    daily: buildDaily(), intraday: buildIntraday(), strategyCurve, rng,
    account: { nlv: 52418.30, bp: 31060.00, cash: 18240.55, todayPnl: 212.40 },
  };
})();
