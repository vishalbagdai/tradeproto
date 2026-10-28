/* Admin pages. */
(function () {
  const A = window.APP;
  const { S, PAGES, ACTIONS } = A;
  const { esc, money, pct, cls, modal, closeModal, toast } = window.UI;
  const { modeChip, pricingChip } = window.CUSTOMER;

  const stamp = () => {
    const d = new Date();
    return `Oct 27 ${d.toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York' })}`;
  };
  const log = (what, detail, level = 'info') => S.audit.unshift({ t: stamp(), who: 'Vishal B.', what, detail, level });

  const userStatus = (s) => `<span class="chip ${s === 'Active' ? 'good' : s === 'Paused' ? 'warn' : s === 'Disabled' ? 'bad' : 'info'}">${esc(s)}</span>`;
  const brokerChip = (b) => `<span class="chip ${b === 'Connected' ? 'good' : b === 'Token expired' ? 'bad' : ''}">${esc(b)}</span>`;

  // ---------- USERS ----------
  PAGES['admin-users'] = () => {
    const us = S.users;
    const active = us.filter((u) => u.status === 'Active').length;
    return `
      <div class="page-h"><div class="t"><h1>Users</h1><span class="sub">${us.length} people · ${active} active · invite-only</span></div>
        <a class="btn pri" href="#admin-invites">Invite someone</a></div>
      <section class="card"><div class="kpis">
        <div class="kpi"><span class="label">Active users</span><span class="big">${active}</span><span class="s">of ${us.length}</span></div>
        <div class="kpi"><span class="label">Trading live</span><span class="big">${us.filter((u) => u.mode === 'LIVE').length}</span><span class="s">others on paper</span></div>
        <div class="kpi"><span class="label">Need attention</span><span class="big ${us.some((u) => u.broker === 'Token expired') ? 'loss' : ''}">${us.filter((u) => u.broker === 'Token expired' || u.status === 'Paused').length}</span><span class="s">expired token or paused</span></div>
        <div class="kpi"><span class="label">Members' 30-day P&amp;L</span><span class="big ${cls(us.reduce((a, u) => a + u.pnl30, 0))}">${money(us.reduce((a, u) => a + u.pnl30, 0), { sign: true, dp: 0 })}</span><span class="s">paper and live</span></div>
      </div></section>
      <section class="card"><div class="tw"><table class="tbl simple">
        <thead><tr><th>Name<span class="s">Email</span></th><th>Status</th><th>tastytrade</th><th>Mode</th><th>Strategies</th><th class="r">30-day P&amp;L</th><th>Last active<span class="s">Joined</span></th><th><span class="sr">Actions</span></th></tr></thead>
        <tbody>${us.map((u) => `<tr>
          <td><span class="v1">${esc(u.name)} ${u.role === 'Admin' ? '<span class="chip info">Admin</span>' : ''}</span><span class="v2">${esc(u.email)}</span></td>
          <td>${userStatus(u.status)}</td>
          <td>${brokerChip(u.broker)}</td>
          <td>${u.mode === '—' ? '<span class="muted">—</span>' : modeChip(u.mode)}</td>
          <td><span class="v1">${u.strategies.length}</span><span class="v2" style="max-width:220px;white-space:normal">${u.strategies.map((id) => esc(A.stratName(id))).join(', ') || '—'}</span></td>
          <td class="r"><b class="${cls(u.pnl30)}">${u.status === 'Invited' ? '—' : money(u.pnl30, { sign: true })}</b></td>
          <td><span class="v1" style="font-weight:500">${esc(u.last)}</span><span class="v2">${esc(u.joined)}</span></td>
          <td><div class="acts"><button class="btn xs" type="button" data-act="user-manage" data-arg="${u.id}">Manage</button></div></td>
        </tr>`).join('')}</tbody></table></div></section>`;
  };
  Object.assign(ACTIONS, {
    'user-manage': (id) => {
      const u = S.users.find((x) => x.id === id);
      const avail = S.strategies.filter((s) => s.kind !== 'mine' && !s.locked);
      modal(`Manage ${esc(u.name)}`, `
        <div class="row-gap">${userStatus(u.status)}${brokerChip(u.broker)}${u.mode === '—' ? '' : modeChip(u.mode)}</div>
        <dl class="kv"><dt>Email</dt><dd>${esc(u.email)}</dd><dt>Joined</dt><dd>${esc(u.joined)}</dd><dt>30-day P&amp;L</dt><dd class="${cls(u.pnl30)}">${money(u.pnl30, { sign: true })}</dd></dl>
        <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Assigned strategies</legend>
          ${avail.map((s) => `<label class="chk"><input type="checkbox" name="as" value="${s.id}" ${u.strategies.includes(s.id) ? 'checked' : ''}> ${esc(s.name)} <span class="muted" style="font-size:12.5px">· ${esc(s.pricing)}</span></label>`).join('')}
        </fieldset>
        <div class="field"><label for="um-live">Live trading</label><select id="um-live"><option ${u.mode === 'LIVE' ? 'selected' : ''}>Allowed</option><option ${u.mode !== 'LIVE' ? 'selected' : ''}>Paper only</option></select></div>
        ${u.broker === 'Token expired' ? '<div class="callout warn"><span>⚠</span><span>The tastytrade token expired. The user gets an email and a Slack message to reconnect.</span></div>' : ''}`,
      `${u.status === 'Active' ? `<button class="btn ghost-danger" type="button" data-act="user-status" data-arg="${u.id}:Paused">Pause user</button>` : u.status === 'Invited' ? `<button class="btn" type="button" data-act="resend" data-arg="${esc(u.email)}">Resend invite</button>` : `<button class="btn" type="button" data-act="user-status" data-arg="${u.id}:Active">Reactivate</button>`}
       <button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="user-save" data-arg="${u.id}">Save</button>`);
    },
    'user-save': (id) => {
      const u = S.users.find((x) => x.id === id);
      u.strategies = [...document.querySelectorAll('#scrim input[name=as]:checked')].map((i) => i.value);
      const live = document.getElementById('um-live').value === 'Allowed';
      if (u.mode !== '—') u.mode = live ? 'LIVE' : 'PAPER';
      log('Strategies assigned', `${u.name} · ${u.strategies.map((x) => A.stratName(x)).join(', ') || 'none'}`);
      closeModal(); toast(`Saved. ${u.name} gets a Slack message about the change.`); A.rerender();
    },
    'user-status': (arg) => {
      const [id, st] = arg.split(':');
      const u = S.users.find((x) => x.id === id);
      u.status = st;
      log(st === 'Paused' ? 'User paused' : 'User reactivated', u.name, st === 'Paused' ? 'warn' : 'info');
      closeModal(); toast(st === 'Paused' ? `${u.name} paused. Their strategies stop sending orders.` : `${u.name} reactivated.`); A.rerender();
    },
    resend: (email) => { closeModal(); toast(`Invite sent again to ${email}.`); },
  });

  // ---------- INVITES ----------
  PAGES['admin-invites'] = () => `
    <div class="page-h"><div class="t"><h1>Invites</h1><span class="sub">Only people you invite can create an account.</span></div></div>
    <section class="card pad"><form data-submit="invite" style="display:flex;flex-direction:column;gap:14px">
      <h2>Invite a friend</h2>
      <div class="form-grid">
        <div class="field"><label for="iv-e">Email</label><input id="iv-e" name="email" type="email" placeholder="friend@example.com" required></div>
        <div class="field"><label for="iv-x">Expires after</label><select id="iv-x" name="exp"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
        <div class="field"><label for="iv-s">Start with strategy</label><select id="iv-s" name="sid"><option value="">None</option>${S.strategies.filter((s) => s.kind === 'catalog' && !s.locked).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field" style="justify-content:flex-end"><button class="btn pri" type="submit">Create invite</button></div>
      </div></form></section>
    <section class="card"><div class="tw"><table class="tbl simple">
      <thead><tr><th>Code</th><th>Email</th><th>Status</th><th>Created</th><th>Expires</th><th><span class="sr">Actions</span></th></tr></thead>
      <tbody>${S.invites.map((i) => `<tr>
        <td><span class="mono" style="font-size:13.5px;font-weight:600">${esc(i.code)}</span></td><td>${esc(i.email)}</td>
        <td><span class="chip ${i.status === 'Used' ? 'good' : i.status === 'Sent' ? 'info' : i.status === 'Revoked' ? 'bad' : ''}">${esc(i.status)}</span></td>
        <td>${esc(i.created)}</td><td>${esc(i.expires)}</td>
        <td><div class="acts">${i.status === 'Sent' ? `<button class="btn xs" type="button" data-act="copy-code" data-arg="${i.code}">Copy code</button><button class="btn xs ghost-danger" type="button" data-act="revoke" data-arg="${i.code}">Revoke</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></section>`;
  Object.assign(ACTIONS, {
    invite: (fd, form) => {
      const email = fd.get('email');
      const code = `FRND-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const exp = new Date(2026, 9, 27 + Number(fd.get('exp')));
      S.invites.unshift({ code, email, created: 'Oct 27, 2026', expires: exp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Sent', by: 'Vishal B.' });
      S.users.push({ id: `u${Date.now()}`, name: email.split('@')[0], email, role: 'Member', status: 'Invited', broker: '—', mode: '—', strategies: fd.get('sid') ? [fd.get('sid')] : [], joined: '—', last: '—', pnl30: 0 });
      log('Invite created', `${email} · code ${code}`);
      form.reset();
      toast(`Invite ${code} emailed to ${email}.`);
      A.rerender();
    },
    'copy-code': (code) => {
      try { navigator.clipboard.writeText(code).then(() => toast(`Copied ${code}.`), () => toast(`Code: ${code}`)); } catch { toast(`Code: ${code}`); }
    },
    revoke: (code) => { const i = S.invites.find((x) => x.code === code); i.status = 'Revoked'; log('Invite revoked', `${i.email} · ${code}`, 'warn'); toast(`Invite ${code} revoked.`); A.rerender(); },
  });

  // ---------- STRATEGY CATALOG ----------
  PAGES['admin-strategies'] = () => {
    const cat = S.strategies.filter((s) => s.kind !== 'mine');
    return `
      <div class="page-h"><div class="t"><h1>Strategy catalog</h1><span class="sub">${cat.length} strategies · what members can add</span></div>
        <button class="btn pri" type="button" data-act="strat-new">Add strategy</button></div>
      <section class="card"><div class="tw"><table class="tbl simple">
        <thead><tr><th>Strategy<span class="s">Type</span></th><th>Source</th><th>Pricing</th><th class="r">Users</th><th class="r">Win rate<span class="s">P&amp;L</span></th><th>Visible</th><th><span class="sr">Actions</span></th></tr></thead>
        <tbody>${cat.map((s) => `<tr>
          <td><span class="v1"><a href="#strategy-${s.id}" style="color:inherit">${esc(s.name)}</a></span><span class="v2">${esc(s.style)}</span></td>
          <td>${s.kind === 'community' ? `<span class="chip">Community · ${esc(s.owner)}</span>` : '<span class="chip info">Built-in</span>'}</td>
          <td>${pricingChip(s.pricing)}</td>
          <td class="r">${s.assigned ?? 0}</td>
          <td class="r"><span class="v1">${s.stats.win}%</span><span class="v2 ${cls(s.stats.pnl)}">${money(s.stats.pnl, { sign: true, dp: 0 })}</span></td>
          <td><label class="switch"><input type="checkbox" ${s.hidden ? '' : 'checked'} data-change="strat-visible" data-arg="${s.id}" id="vis-${s.id}" aria-label="${esc(s.name)} visible"><span class="tr"></span></label></td>
          <td><div class="acts"><button class="btn xs" type="button" data-act="strat-edit" data-arg="${s.id}">Edit</button><button class="btn xs" type="button" data-act="strat-assign" data-arg="${s.id}">Assign</button></div></td>
        </tr>`).join('')}</tbody></table></div></section>
      <div class="callout"><span>ℹ</span><span>Paid pricing is turned off until legal review is done. You can still mark a strategy “Free for X days” to try it out.</span></div>`;
  };
  function stratForm(s) {
    const p = s?.pricing || 'Free';
    const days = (p.match(/(\d+)/) || [])[1] || 30;
    return `<form id="sf" data-submit="strat-save" style="display:flex;flex-direction:column;gap:14px">
      <input type="hidden" name="id" value="${s ? s.id : ''}">
      <div class="form-grid">
        <div class="field"><label for="sf-n">Name</label><input id="sf-n" name="name" type="text" value="${esc(s?.name || '')}" required></div>
        <div class="field"><label for="sf-u">Underlying</label><input id="sf-u" name="und" type="text" value="${esc(s?.underlying || 'SPX')}"></div>
        <div class="field"><label for="sf-st">Type</label><input id="sf-st" name="style" type="text" value="${esc(s?.style || 'Iron condor · 0–7 DTE')}"></div>
        <div class="field"><label for="sf-r">Max risk per trade ($)</label><input id="sf-r" name="risk" type="number" value="${s?.maxPerTrade || 500}"></div>
      </div>
      <div class="field"><label for="sf-d">Description members see</label><textarea id="sf-d" name="desc">${esc(s?.desc || '')}</textarea></div>
      <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:4px"><legend class="label" style="margin-bottom:6px">Pricing</legend>
        <label class="chk"><input type="radio" name="price" value="Free" ${p === 'Free' ? 'checked' : ''}> Free</label>
        <label class="chk"><input type="radio" name="price" value="trial" ${p.startsWith('Free for') ? 'checked' : ''}> Free for <input type="number" name="days" value="${days}" style="width:70px" aria-label="Days"> days, then paid</label>
        <label class="chk" style="color:var(--muted)"><input type="radio" name="price" value="paid" disabled> Paid (after legal review)</label>
      </fieldset>
      <div class="field"><label for="sf-code">Strategy code</label><select id="sf-code" name="code"><option>Trading.Strategies.SpxIronCondor (NuGet 1.4.0)</option><option>Trading.Strategies.MomentumScaling (NuGet 1.2.1)</option><option>Trading.Strategies.CreditSpread (NuGet 0.9.0)</option></select><span class="hint">Strategies are .NET classes that implement IStrategy.</span></div>
    </form>`;
  }
  Object.assign(ACTIONS, {
    'strat-new': () => modal('Add strategy', stratForm(null), '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="submit" form="sf">Add to catalog</button>', { wide: true }),
    'strat-edit': (id) => modal(`Edit ${esc(A.stratName(id))}`, stratForm(A.strat(id)), '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="submit" form="sf">Save</button>', { wide: true }),
    'strat-save': (fd) => {
      const price = fd.get('price') === 'trial' ? `Free for ${fd.get('days')} days` : 'Free';
      const id = fd.get('id');
      if (id) {
        const s = A.strat(id);
        Object.assign(s, { name: fd.get('name'), underlying: fd.get('und'), style: fd.get('style'), maxPerTrade: Number(fd.get('risk')), desc: fd.get('desc'), pricing: s.locked ? s.pricing : price });
        log('Strategy edited', s.name);
        toast('Strategy saved.');
      } else {
        const s = { id: `n${Date.now().toString(36)}`, name: fd.get('name') || 'New strategy', kind: 'catalog', owner: 'Admin', pricing: price, on: false, mode: 'PAPER', underlying: fd.get('und'), style: fd.get('style'), risk: 'Defined', maxPerTrade: Number(fd.get('risk')), alloc: 0, desc: fd.get('desc') || 'New strategy.', params: { shortDelta: 0.1, wing: 10, entry: '10:00', target: 50, stop: 20, maxOpen: 1, vixMin: 13, vixMax: 28 }, stats: { trades: 0, win: 0, avg: 0, pnl: 0, dd: 0, sharpe: 0 }, seed: 5, assigned: 0 };
        S.strategies.push(s);
        log('Strategy added', `${s.name} · ${price}`);
        toast(`${s.name} added. Members can see it on the Strategies page.`);
      }
      closeModal(); A.rerender();
    },
    'strat-visible': (v, el) => { const s = A.strat(el.dataset.arg); s.hidden = !v; log(v ? 'Strategy shown' : 'Strategy hidden', s.name); toast(`${s.name} is ${v ? 'visible to members' : 'hidden from members'}.`); },
    'strat-assign': (id) => {
      const s = A.strat(id);
      modal(`Assign ${esc(s.name)}`, `<p class="muted">Checked members get this strategy in paper mode. They can switch it to live themselves after the go-live checklist.</p>
        ${S.users.filter((u) => u.status !== 'Invited').map((u) => `<label class="chk"><input type="checkbox" name="au" value="${u.id}" ${u.strategies.includes(id) ? 'checked' : ''}> ${esc(u.name)} <span class="muted" style="font-size:12.5px">· ${esc(u.email)}</span></label>`).join('')}`,
      `<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="assign-save" data-arg="${id}">Save</button>`);
    },
    'assign-save': (id) => {
      const on = [...document.querySelectorAll('#scrim input[name=au]:checked')].map((i) => i.value);
      S.users.forEach((u) => { if (u.status === 'Invited') return; const has = u.strategies.includes(id); if (on.includes(u.id) && !has) u.strategies.push(id); if (!on.includes(u.id) && has) u.strategies = u.strategies.filter((x) => x !== id); });
      const s = A.strat(id); s.assigned = on.length;
      log('Strategy assigned', `${s.name} → ${on.length} members`);
      closeModal(); toast(`${s.name} assigned to ${on.length} members.`); A.rerender();
    },
  });

  // ---------- REVIEW SUBMISSIONS ----------
  PAGES['admin-review'] = () => `
    <div class="page-h"><div class="t"><h1>Review submissions</h1><span class="sub">Member versions asking to be published for everyone</span></div></div>
    ${S.submissions.map((x) => `<section class="card">
      <div class="sec-h plain">
        <div style="display:flex;flex-direction:column;gap:4px"><h2>${esc(x.name)}</h2><span class="muted" style="font-size:13px">By ${esc(x.by)} · based on ${esc(x.basedOn)} · submitted ${esc(x.submitted)}</span></div>
        <span class="chip ${x.status === 'Published' ? 'good' : x.status === 'Pending review' ? 'warn' : x.status === 'Rejected' ? 'bad' : ''}">${esc(x.status)}</span>
      </div>
      <div class="body pad" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
        <div><div class="label" style="margin-bottom:6px">Changes from ${esc(x.basedOn)}</div><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${x.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <dl class="kv" style="align-content:start"><dt>Paper days</dt><dd>${x.paperDays}</dd><dt>Trades</dt><dd>${x.trades}</dd><dt>Win rate</dt><dd>${x.win}%</dd><dt>P&amp;L</dt><dd class="${cls(x.pnl)}">${money(x.pnl, { sign: true, dp: 0 })}</dd></dl>
      </div>
      ${x.status === 'Published' || x.status === 'Rejected' ? '' : `<div class="pad" style="border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn" type="button" data-act="sub-reject" data-arg="${x.id}">Send back with note</button>
        <button class="btn pri" type="button" data-act="sub-publish" data-arg="${x.id}">Publish to catalog</button></div>`}
    </section>`).join('')}`;
  Object.assign(ACTIONS, {
    'sub-publish': (id) => {
      const x = S.submissions.find((s) => s.id === id);
      modal(`Publish ${esc(x.name)}?`, `<p>It joins the catalog as a community strategy credited to ${esc(x.by)}. Members can add it in paper mode.</p>
        <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">Pricing</legend><label class="chk"><input type="radio" name="pp" checked> Free</label><label class="chk"><input type="radio" name="pp"> Free for 30 days</label></fieldset>`,
      `<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="sub-publish-go" data-arg="${id}">Publish</button>`);
    },
    'sub-publish-go': (id) => {
      const x = S.submissions.find((s) => s.id === id);
      x.status = 'Published';
      const mine = S.strategies.find((s) => s.kind === 'mine' && s.name === x.name);
      if (mine) mine.submitted = 'Published';
      S.strategies.push({ ...(S.strategies.find((s) => s.id === 'spx-ic')), id: `c${Date.now().toString(36)}`, name: x.name, version: 'community', kind: 'community', owner: x.by, on: false, mode: 'PAPER', added: false, assigned: 0, stats: { trades: x.trades, win: x.win, avg: x.trades ? x.pnl / x.trades : 0, pnl: x.pnl, dd: -200, sharpe: 1.0 }, seed: 77, desc: `Published from ${x.by}'s version.` });
      log('Strategy published', `${x.name} by ${x.by}`);
      closeModal(); toast(`${x.name} published. ${x.by} gets a Slack message.`); A.rerender();
    },
    'sub-reject': (id) => {
      modal('Send back with a note', '<div class="field"><label for="rj-n">Note to the author</label><textarea id="rj-n">Please run it for 14 paper days and keep max open at 1.</textarea></div>',
        `<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn pri" type="button" data-act="sub-reject-go" data-arg="${id}">Send</button>`);
    },
    'sub-reject-go': (id) => { const x = S.submissions.find((s) => s.id === id); x.status = 'Sent back'; log('Submission sent back', x.name, 'warn'); closeModal(); toast('Sent back to the author.'); A.rerender(); },
  });

  // ---------- GLOBAL STOP & AUDIT ----------
  PAGES['admin-audit'] = () => `
    <div class="page-h"><div class="t"><h1>Global stop and audit log</h1></div></div>
    <section class="card pad" style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center">
      <div style="display:flex;flex-direction:column;gap:4px;max-width:60ch"><h2>Global stop</h2>
        <p class="muted">Stops new orders for every user right away and cancels working orders. Open positions stay open. Everyone gets a Slack alert.</p></div>
      ${S.globalStop ? '<button class="btn lg" type="button" data-act="global-release">Release global stop</button>' : '<button class="btn danger lg" type="button" data-act="global-stop">Stop all users</button>'}
    </section>
    <section class="card">
      <div class="sec-h plain"><h2>Audit log</h2><span class="meta">Every admin action, order and system event · newest first</span></div>
      <div class="body"><div class="tw"><table class="tbl simple">
        <thead><tr><th>Time (ET)</th><th>Who</th><th>Event</th><th>Details</th></tr></thead>
        <tbody>${S.audit.map((a) => `<tr>
          <td class="mono">${esc(a.t)}</td><td>${esc(a.who)}</td>
          <td><span class="chip ${a.level === 'bad' ? 'bad' : a.level === 'warn' ? 'warn' : ''}">${esc(a.what)}</span></td>
          <td style="white-space:normal;min-width:240px">${esc(a.detail)}</td></tr>`).join('')}</tbody></table></div></div>
    </section>`;
  Object.assign(ACTIONS, {
    'global-stop': () => modal('Stop trading for all users?', `<div class="field"><label for="gs-r">Reason (goes in the audit log and the Slack alert)</label><input id="gs-r" type="text" value="Unexpected market volatility"></div>
        <p class="muted">${S.users.filter((u) => u.status === 'Active').length} active users are affected.</p>`,
      '<button class="btn" type="button" data-act="close-modal">Cancel</button><button class="btn danger" type="button" data-act="global-stop-go">Stop all users</button>'),
    'global-stop-go': () => {
      const r = document.getElementById('gs-r').value;
      S.globalStop = true; log('Global stop used', `Reason: ${r}`, 'bad');
      closeModal(); toast('Global stop is on. Slack alert sent to everyone.'); A.rerender();
    },
    'global-release': () => { S.globalStop = false; log('Global stop released', 'Trading resumed for all users'); toast('Global stop released.'); A.rerender(); },
  });

  // ---------- SYSTEM HEALTH ----------
  PAGES['admin-health'] = () => {
    const h = window.DATA.health;
    const lat = window.DATA.strategyCurve(3, 60, 0).map((v) => 160 + Math.abs(v) * 0.6);
    const labels = lat.map((_, i) => `${60 - i} min ago`);
    return `
      <div class="page-h"><div class="t"><h1>System health</h1><span class="sub">One Linux server · Docker Compose · checked every 30 s</span></div>
        <button class="btn" type="button" data-act="health-refresh">Refresh</button></div>
      <section class="card"><ul class="steps">${h.map((x) => `<li style="align-items:center">
        <span class="dot ${x.status === 'ok' ? '' : x.status === 'warn' ? 'warn' : 'bad'}" style="width:10px;height:10px"></span>
        <span style="flex:1;min-width:0"><b>${esc(x.name)}</b><br><span class="muted" style="font-size:13px">${esc(x.detail)}</span></span>
        <span class="chip ${x.status === 'ok' ? 'good' : 'warn'}">${x.status === 'ok' ? 'Healthy' : 'Needs attention'}</span></li>`).join('')}</ul></section>
      <div class="grid g2">
        <section class="card"><div class="sec-h plain"><h2>Market data lag</h2><span class="meta">Last hour · ms</span></div><div class="body pad">${window.UI.lineChart(lat, labels, { color: 'var(--accent)', fmt: (v) => `${Math.round(v)} ms`, tipFmt: (v) => `${Math.round(v)} ms`, height: 200 })}</div></section>
        <section class="card"><div class="sec-h plain"><h2>Today</h2></div><div class="body pad"><dl class="kv">
          <dt>Orders sent</dt><dd>38 (12 live · 26 paper)</dd><dt>Rejected</dt><dd>0</dd><dt>Signals evaluated</dt><dd>1,284</dd><dt>Slack messages</dt><dd>128</dd>
          <dt>Server CPU</dt><dd>23%</dd><dt>Memory</dt><dd>3.1 of 8 GB</dd><dt>Last deploy</dt><dd>Oct 26, 21:40 CT · v0.9.3</dd><dt>Last backup</dt><dd>Oct 27, 02:00 ET</dd>
        </dl></div></section>
      </div>`;
  };
  ACTIONS['health-refresh'] = () => toast('All checks ran. 7 healthy, 1 needs attention.');
})();
