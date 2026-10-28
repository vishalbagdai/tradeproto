/* Shared helpers: formatting, charts, modal, toast, theme. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (n, opts = {}) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    const sign = opts.sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : (n < 0 ? '−' : '');
    const abs = Math.abs(n);
    const dp = opts.dp ?? 2;
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
  };
  const pct = (n, dp = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(dp)}%`;
  const signed = (n, dp = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(dp)}`;
  const cls = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : 'flat');

  const icon = {
    chev: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><polyline points="4,6 8,10 12,6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // Brand mark: the payoff diagram of an iron condor.
    mark: '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="6" fill="var(--accent)"/><polyline points="4,18 8,18 11,9 15,9 18,18 22,18" fill="none" stroke="var(--on-accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    check: '✓',
  };

  // ---------- charts ----------
  const charts = {};
  let chartSeq = 0;

  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(v);
    return out;
  }

  /* Line chart with area fill, y ticks, sparse x labels and a hover readout.
     values: numbers; labels: x labels (same length); fmt: y formatter */
  function lineChart(values, labels, opts = {}) {
    const id = `c${++chartSeq}`;
    const h = opts.height || 240;
    const color = opts.color || (values[values.length - 1] >= values[0] ? 'var(--gain)' : 'var(--loss)');
    const fmtY = opts.fmt || ((v) => money(v, { dp: 0 }));
    const min = Math.min(...values, opts.zero ? 0 : Infinity);
    const max = Math.max(...values, opts.zero ? 0 : -Infinity);
    const ticks = niceTicks(min, max, 4);
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const W = 1000;
    const H = 100;
    const x = (i) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
    const y = (v) => H - ((v - lo) / (hi - lo || 1)) * H;
    const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(2)}`).join('');
    const area = `${line}L${W},${H}L0,${H}Z`;
    const grid = ticks.map((t) => `<line class="grid-l" x1="0" x2="${W}" y1="${y(t)}" y2="${y(t)}" vector-effect="non-scaling-stroke"/>`).join('');
    const zero = opts.zero && lo < 0 ? `<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` : '';
    const yl = ticks.map((t) => `<div class="yl" style="position:absolute;left:0;width:52px;text-align:right;top:calc(8px + (100% - 32px) * ${(y(t) / H).toFixed(4)} - 7px);font-size:11px;color:var(--muted)" >${esc(fmtY(t))}</div>`).join('');
    const n = labels.length;
    const xCount = Math.min(6, n);
    const xi = [];
    for (let k = 0; k < xCount; k++) xi.push(Math.round((k / Math.max(1, xCount - 1)) * (n - 1)));
    const xl = [...new Set(xi)].map((i, k, arr) => {
      const p = n === 1 ? 0.5 : i / (n - 1);
      const tx = k === 0 ? '0' : k === arr.length - 1 ? '-100%' : '-50%';
      return `<div style="position:absolute;bottom:0;left:calc(60px + (100% - 68px) * ${p.toFixed(4)});transform:translateX(${tx});font-size:11px;color:var(--muted);white-space:nowrap">${esc(labels[i])}</div>`;
    }).join('');
    const last = values[values.length - 1];
    charts[id] = { values, labels, fmt: opts.tipFmt || ((v) => money(v)), lo, hi, color };
    return `<div class="chartbox" data-chart="${id}" style="position:relative;height:${h}px">
      ${yl}
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="position:absolute;left:60px;right:8px;top:8px;bottom:24px;width:calc(100% - 68px);height:calc(100% - 32px);overflow:visible" aria-hidden="true">
        <defs><linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
        ${grid}${zero}
        <path d="${area}" fill="url(#g${id})" stroke="none"/>
        <path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        <line class="hx" x1="0" x2="0" y1="0" y2="${H}" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke" style="display:none"/>
      </svg>
      <span class="end-dot" style="position:absolute;width:9px;height:9px;border-radius:50%;background:${color};border:2px solid var(--surface);left:calc(60px + (100% - 68px) - 4.5px);top:calc(8px + (100% - 32px) * ${(y(last) / H).toFixed(4)} - 4.5px)"></span>
      <span class="hdot" style="position:absolute;width:9px;height:9px;border-radius:50%;background:${color};border:2px solid var(--surface);display:none;pointer-events:none"></span>
      <div class="tip" style="position:absolute;top:0;display:none;pointer-events:none;background:var(--text);color:var(--bg);padding:5px 8px;border-radius:6px;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums;z-index:2"></div>
      ${xl}
    </div>`;
  }

  function onChartMove(e) {
    const box = e.target.closest('.chartbox');
    if (!box) return;
    const c = charts[box.dataset.chart];
    if (!c) return;
    const r = box.getBoundingClientRect();
    const pw = r.width - 68;
    const px = Math.min(Math.max(e.clientX - r.left - 60, 0), pw);
    const i = Math.round((px / pw) * (c.values.length - 1));
    const v = c.values[i];
    const ph = r.height - 32;
    const yy = 8 + ph * (1 - (v - c.lo) / (c.hi - c.lo || 1));
    const xx = 60 + (c.values.length === 1 ? pw / 2 : (i / (c.values.length - 1)) * pw);
    const dot = box.querySelector('.hdot');
    const tip = box.querySelector('.tip');
    const hx = box.querySelector('.hx');
    dot.style.display = 'block'; dot.style.left = `${xx - 4.5}px`; dot.style.top = `${yy - 4.5}px`;
    hx.style.display = 'block'; hx.setAttribute('x1', (i / Math.max(1, c.values.length - 1)) * 1000); hx.setAttribute('x2', (i / Math.max(1, c.values.length - 1)) * 1000);
    tip.style.display = 'block';
    tip.innerHTML = `<b>${esc(c.fmt(v))}</b> · ${esc(c.labels[i])}`;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(xx - tw / 2, 0), r.width - tw)}px`;
  }
  function onChartLeave(e) {
    const box = e.target.closest && e.target.closest('.chartbox');
    if (!box) return;
    box.querySelectorAll('.hdot,.tip,.hx').forEach((el) => { el.style.display = 'none'; });
  }
  document.addEventListener('mousemove', onChartMove);
  document.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('.chartbox') && !e.relatedTarget?.closest?.('.chartbox')) onChartLeave(e); });

  function spark(values, color) {
    const W = 200; const H = 40;
    const min = Math.min(...values); const max = Math.max(...values);
    const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / (max - min || 1)) * (H - 6)).toFixed(1)}`).join(' ');
    const c = color || (values[values.length - 1] >= values[0] ? 'var(--gain)' : 'var(--loss)');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }

  // ---------- modal & toast ----------
  function modal(title, body, footer, opts = {}) {
    closeModal();
    const el = document.createElement('div');
    el.className = 'scrim';
    el.id = 'scrim';
    el.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mt">
      <div class="modal-h"><h2 id="mt">${title}</h2><button class="x" type="button" data-act="close-modal" aria-label="Close">×</button></div>
      <div class="modal-b">${body}</div>
      ${footer ? `<div class="modal-f">${footer}</div>` : ''}
    </div>`;
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
    document.body.appendChild(el);
    const f = el.querySelector('input,select,textarea,button.pri,button.danger');
    if (f) f.focus();
  }
  function closeModal() { document.getElementById('scrim')?.remove(); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function toast(msg) {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---------- theme ----------
  function applyTheme(themeId, palette) {
    const root = document.documentElement;
    const keys = ['--bg', '--surface', '--sunk', '--text', '--muted', '--border', '--line', '--accent', '--on-accent', '--gain', '--loss', '--warn', '--danger', '--hover', 'color-scheme'];
    keys.forEach((k) => root.style.removeProperty(k));
    const t = window.DATA.THEMES.find((x) => x.id === themeId);
    const dark = t ? t.kind === 'Dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    if (t) {
      const set = (k, v) => root.style.setProperty(k, v);
      set('--bg', t.bg); set('--surface', t.surface); set('--text', t.text); set('--muted', t.muted);
      set('--accent', t.accent); set('--on-accent', t.onAccent); set('--gain', t.gain); set('--loss', t.loss);
      set('--sunk', `color-mix(in srgb, ${t.text} ${dark ? 4 : 3.5}%, ${t.bg})`);
      set('--border', `color-mix(in srgb, ${t.text} ${dark ? 20 : 17}%, ${t.bg})`);
      set('--line', `color-mix(in srgb, ${t.text} ${dark ? 11 : 8}%, ${t.bg})`);
      set('--hover', `color-mix(in srgb, ${t.text} 6%, transparent)`);
      set('--warn', dark ? '#e3b341' : '#9a6700');
      set('--danger', dark ? '#da3633' : '#cf222e');
      set('color-scheme', dark ? 'dark' : 'light');
    }
    if (palette === 'blueOrange') {
      root.style.setProperty('--gain', dark ? '#79c0ff' : '#0550ae');
      root.style.setProperty('--loss', dark ? '#ffa657' : '#a8470a');
    }
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(`autotrade.${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`autotrade.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  window.UI = { esc, money, pct, signed, cls, icon, lineChart, spark, modal, closeModal, toast, applyTheme, store };
})();
