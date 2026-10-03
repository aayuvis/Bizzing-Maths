/* graphs.js — Graphing (docs/LIBRARY-CONTRACT.md).

   A coordinate plane the child draws on: points, a table of values, straight
   lines y = mx + c (up to four at once, with every crossing found and
   labelled), parallels and perpendiculars, quadratics, and two real-world
   graphs — distance–time (the speed is the gradient) and conversion graphs.
   Then challenges: a line through two points, which is steeper, name this
   line.

   One representation for every graph: y = a·x² + m·x + c, or x = k for a
   vertical line. The typed box and the sliders are two doors into the same
   numbers, and the parser is forgiving ("y=2x+1", "y = -x + 3", "2x",
   "y=x^2", "y = x/2 − 1"), because a child who has understood the line
   should not be stopped by a space.

   Touch and keyboard: points go down by a tap on the grid or by the arrows
   and Enter; sliders are native ranges (drag, or arrows when focused) and
   the arrows work on the page too. */

import { icon } from '../icons.js';
import * as kit from '../chapters/kit.js';
import { byId } from '../tricks.js';
import { seeded } from '../rand.js';
import { META } from './shelf.js';

export const TOOL = META.graphs;   // name, blurb and art live on the shelf (shelf.js), which loads without the tool

/* ------------------------------------------------------------ helpers */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const f1 = (x) => String(+(+x).toFixed(1));
const num = (x, dp = 3) => String(+(+x).toFixed(dp)).replace('-', '−');
const T = kit.text;
const EPS = 1e-9;
const onButton = (e) => !!(e && e.target && e.target.closest && e.target.closest('button,a,select,[data-act]'));
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const ri = (lo, hi, r) => lo + Math.floor(r() * (hi - lo + 1));

/* A number as a fraction p/q when it is one (q ≤ 1000), for exact answers. */
function rational(x, maxQ = 1000) {
  if (!Number.isFinite(x)) return null;
  for (let q = 1; q <= maxQ; q++) { const p = Math.round(x * q); if (Math.abs(p / q - x) < 1e-9) return [p, q]; }
  return null;
}
function exact(x) {
  const fr = rational(x, 100);
  if (!fr) return '≈ ' + num(x, 2);
  const [p, q] = fr; if (q === 1) return num(p);
  return `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
}
const ptStr = ([x, y]) => `(${exact(x)}, ${exact(y)})`;

/* ------------------------------------------------ the parser, forgiving */

const NUM = String.raw`(?:\d+\.?\d*|\.\d+)`;
const TERM = new RegExp(`^(${NUM}(?:/${NUM})?)?\\*?x(\\^2)?(?:/(${NUM}))?$`);
const CONST = new RegExp(`^(${NUM})(?:/(${NUM}))?$`);
/* an expression in x → {a, m, c}, or null if it is not one we read */
function polyOf(s) {
  if (!s) return null;
  const out = { a: 0, m: 0, c: 0 };
  let i = 0;
  if (s[0] !== '+' && s[0] !== '-') s = '+' + s;
  while (i < s.length) {
    const sign = s[i] === '-' ? -1 : 1; i++;
    let j = i; while (j < s.length && s[j] !== '+' && s[j] !== '-') j++;
    const body = s.slice(i, j); i = j;
    if (!body) return null;
    let mt;
    if ((mt = body.match(TERM))) {
      let k = 1;
      if (mt[1]) { const [p, q] = mt[1].split('/').map(Number); k = q === undefined ? p : p / q; }
      if (mt[3]) k /= Number(mt[3]);
      if (!Number.isFinite(k)) return null;
      if (mt[2]) out.a += sign * k; else out.m += sign * k;
    } else if ((mt = body.match(CONST))) {
      const k = mt[2] ? Number(mt[1]) / Number(mt[2]) : Number(mt[1]);
      if (!Number.isFinite(k)) return null;
      out.c += sign * k;
    } else return null;
  }
  for (const k of ['a', 'm', 'c']) if (Math.abs(out[k]) < 1e-12) out[k] = 0;
  return out;
}
export function parseEq(src) {
  if (src === undefined || src === null) return null;
  let s = String(src).toLowerCase().replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/²/g, '^2').replace(/\s+/g, '').replace(/\*\*/g, '^');
  if (!s) return null;
  s = s.replace(/^f\(x\)=/, '').replace(/^y\(x\)=/, '');
  if (s.includes('=')) {
    const parts = s.split('='); if (parts.length !== 2) return null;
    const [L, R] = parts;
    if (L === 'y') s = R; else if (R === 'y') s = L;
    else if (L === 'x' || R === 'x') { const p = polyOf(L === 'x' ? R : L); return p && !p.a && !p.m ? { vert: p.c } : null; }
    else return null;
  }
  if (s.includes('y')) return null;
  return polyOf(s);
}
/* {a, m, c} → "y = 2x + 1", in the same notation the parser reads */
function coefText(k, sym) {
  const ak = Math.abs(k), fr = rational(ak, 12);
  if (fr && fr[1] !== 1) return `${fr[0] === 1 && sym ? '' : fr[0]}${sym}/${fr[1]}`;
  if (ak === 1 && sym) return sym;
  return `${+ak.toFixed(3)}${sym}`;
}
export function fmtEq(fn) {
  if (!fn) return '';
  if (fn.vert !== undefined) return `x = ${fn.vert < 0 ? '−' : ''}${coefText(fn.vert, '')}`;
  const terms = [[fn.a, 'x²'], [fn.m, 'x'], [fn.c, '']].filter(([k]) => Math.abs(k) > 1e-12);
  if (!terms.length) return 'y = 0';
  return 'y = ' + terms.map(([k, sym], i) => `${k < 0 ? (i ? ' − ' : '−') : i ? ' + ' : ''}${coefText(k, sym)}`).join('');
}
const yAt = (fn, x) => (fn.a || 0) * x * x + fn.m * x + fn.c;
const isLine = (fn) => fn && fn.vert === undefined && !fn.a;

/* Where two graphs meet: solve their difference, degree two at most. */
function crossings(f, g) {
  if (f.vert !== undefined && g.vert !== undefined) return { kind: Math.abs(f.vert - g.vert) < EPS ? 'same' : 'parallel', pts: [] };
  if (f.vert !== undefined || g.vert !== undefined) { const v = f.vert !== undefined ? f : g, o = v === f ? g : f; return { kind: 'meet', pts: [[v.vert, yAt(o, v.vert)]] }; }
  const A = (f.a || 0) - (g.a || 0), B = f.m - g.m, C = f.c - g.c;
  if (Math.abs(A) < EPS) {
    if (Math.abs(B) < EPS) return { kind: Math.abs(C) < EPS ? 'same' : 'parallel', pts: [] };
    const x = -C / B; return { kind: 'meet', pts: [[x, yAt(f, x)]] };
  }
  const D = B * B - 4 * A * C;
  if (D < -EPS) return { kind: 'miss', pts: [] };
  if (Math.abs(D) <= EPS) { const x = -B / (2 * A); return { kind: 'touch', pts: [[x, yAt(f, x)]] }; }
  const s = Math.sqrt(D); return { kind: 'meet', pts: [(-B - s) / (2 * A), (-B + s) / (2 * A)].sort((p, q) => p - q).map((x) => [x, yAt(f, x)]) };
}

/* -------------------------------------------------------- the plane */

const W = 340, M = 20, PW = 300;
const plane = (R) => {
  const k = PW / (2 * R);
  return { R, k, S: ([x, y]) => [M + (x + R) * k, M + (R - y) * k], inv: ([sx, sy]) => [(sx - M) / k - R, R - (sy - M) / k] };
};
/* A line clipped to the square: its two ends, or null if it misses. */
function lineEnds(fn, R) {
  if (fn.vert !== undefined) return Math.abs(fn.vert) <= R ? [[fn.vert, -R], [fn.vert, R]] : null;
  if (Math.abs(fn.m) < EPS) return Math.abs(fn.c) <= R ? [[-R, fn.c], [R, fn.c]] : null;
  const xa = (-R - fn.c) / fn.m, xb = (R - fn.c) / fn.m;
  const lo = Math.max(-R, Math.min(xa, xb)), hi = Math.min(R, Math.max(xa, xb));
  if (lo > hi) return null;
  return [[lo, yAt(fn, lo)], [hi, yAt(fn, hi)]];
}
/* A curve as runs of sample points inside (a little beyond) the square. */
function curveRuns(fn, R, n = 240) {
  const runs = []; let cur = [];
  for (let i = 0; i <= n; i++) { const x = -R + (2 * R * i) / n, y = yAt(fn, x); if (Math.abs(y) <= R * 1.25) cur.push([x, y]); else { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur);
  return runs;
}
function drawFn(fn, pl, cls) {
  if (isLine(fn) || fn.vert !== undefined) { const e = lineEnds(fn, pl.R); if (!e) return ''; const [a, b] = e.map(pl.S); return `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${cls}"/>`; }
  return curveRuns(fn, pl.R).map((run) => `<polyline points="${run.map(pl.S).map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" class="${cls}" fill="none"/>`).join('');
}
function planeSVG(pl, inner, { hits = false, label = 'A coordinate grid', clip = 'main' } = {}) {
  const { R, S, k } = pl, step = R <= 10 ? 1 : 2, lab = R <= 5 ? 1 : R <= 10 ? 2 : 5;
  let s = `<defs><clipPath id="t-graphs-clip-${clip}"><rect x="${M}" y="${M}" width="${PW}" height="${PW}"/></clipPath></defs>`;
  s += `<rect x="${M}" y="${M}" width="${PW}" height="${PW}" class="t-graphs-bg"/>`;
  for (let i = -R; i <= R; i += step) { if (!i) continue; const [x] = S([i, 0]), [, y] = S([0, i]); s += `<line x1="${f1(x)}" y1="${M}" x2="${f1(x)}" y2="${M + PW}" class="dg-grid"/><line x1="${M}" y1="${f1(y)}" x2="${M + PW}" y2="${f1(y)}" class="dg-grid"/>`; }
  const o = S([0, 0]);
  s += `<line x1="${M}" y1="${f1(o[1])}" x2="${M + PW}" y2="${f1(o[1])}" class="t-graphs-axis"/><line x1="${f1(o[0])}" y1="${M}" x2="${f1(o[0])}" y2="${M + PW}" class="t-graphs-axis"/>`;
  for (let i = -R; i <= R; i += lab) { if (!i) continue; const p = S([i, 0]), q = S([0, i]); s += T(f1(p[0]), f1(p[1] + 13), num(i), 't-graphs-n') + T(f1(q[0] - 5), f1(q[1] + 4), num(i), 't-graphs-n', 'end'); }
  s += T(f1(o[0] - 5), f1(o[1] + 13), '0', 't-graphs-n', 'end') + T(M + PW - 4, f1(o[1] - 6), 'x', 't-graphs-ax', 'end') + T(f1(o[0] + 8), M + 12, 'y', 't-graphs-ax', 'start');
  s += `<g clip-path="url(#t-graphs-clip-${clip})">${inner}</g>`;
  if (hits) for (let x = -R; x <= R; x += step) for (let y = -R; y <= R; y += step) { const p = S([x, y]); s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(Math.max(5, step * k * 0.48))}" class="t-graphs-hit" data-act="lib" data-arg="${hits}|${x},${y}"/>`; }
  return kit.svg(W, W, s, label);
}
const dot = (pl, p, cls = 't-graphs-dot', r = 5) => { const q = pl.S(p); return `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${r}" class="${cls}"/>`; };
function tag(pl, p, text, cls = 't-graphs-tag') {
  const q = pl.S(p), right = q[0] < W - 90, up = q[1] > 40;
  return T(f1(q[0] + (right ? 8 : -8)), f1(q[1] + (up ? -8 : 16)), text, cls, right ? 'start' : 'end');
}

/* ------------------------------------------------ slots: typed ⇄ sliders */

function gvf(raw, d, lo, hi, step) { if (raw === undefined || raw === null || raw === '') return d; const v = Number(raw); return Number.isFinite(v) ? clamp(Math.round(v / step) * step, lo, hi) : d; }
const SL = { m: [-5, 5, 0.5], c: [-10, 10, 1], a: [-3, 3, 0.5] };
/* A graph the child controls two ways. ui[key] is the typed text; sliders
   write ui[sliders.m] etc. Whichever changed last wins, and the other is
   rewritten to match — except that a half-typed equation is never overwritten. */
function slot(ctx, key, def, sliders) {
  const ui = ctx.ui; ui.F = ui.F || {}; ui.seen = ui.seen || {}; ui.bad = ui.bad || {};
  if (!ui.F[key]) setSlot(ctx, key, def, sliders);
  const seen = ui.seen;
  if (ui[key] !== seen[key]) {
    const p = parseEq(ui[key]);
    ui.bad[key] = !p && String(ui[key] || '').trim() !== '';
    if (p) { ui.F[key] = p; for (const [co, k] of Object.entries(sliders)) { ui[k] = String(p.vert !== undefined ? 0 : p[co] || 0); seen[k] = ui[k]; } }
    seen[key] = ui[key];
  } else {
    const changed = Object.entries(sliders).filter(([, k]) => ui[k] !== seen[k]);
    if (changed.length) {
      const f = ui.F[key], nf = f.vert !== undefined ? { a: 0, m: 0, c: 0 } : { ...f };
      for (const [co, k] of changed) { const [lo, hi, st] = SL[co]; nf[co] = gvf(ui[k], nf[co] || 0, lo, hi, st); seen[k] = ui[k]; }
      ui.F[key] = nf; ui[key] = fmtEq(nf); seen[key] = ui[key]; ui.bad[key] = false;
    }
  }
  return ui.F[key];
}
function setSlot(ctx, key, fn, sliders) {
  const ui = ctx.ui; ui.F = ui.F || {}; ui.seen = ui.seen || {}; ui.bad = ui.bad || {};
  ui.F[key] = { ...fn }; ui[key] = fmtEq(fn); ui.seen[key] = ui[key]; ui.bad[key] = false;
  for (const [co, k] of Object.entries(sliders)) { ui[k] = String(fn.vert !== undefined ? 0 : fn[co] || 0); ui.seen[k] = ui[k]; }
}
function nudge(ctx, key, sliders, co, by) {
  const f = ctx.ui.F && ctx.ui.F[key]; if (!f || !sliders[co]) return;
  const [lo, hi] = SL[co], base = f.vert !== undefined ? 0 : f[co] || 0;
  ctx.ui[sliders[co]] = String(clamp(+(base + by).toFixed(6), lo, hi));
}
const slider = (id, ui, k, co, label) => { const [lo, hi, st] = SL[co]; return `<label class="t-graphs-slider">${label} = <b>${num(gvf(ui[k], 0, lo, hi, 1e-9))}</b>
  <input type="range" id="t-graphs-${id}" data-lib-input="${k}" min="${lo}" max="${hi}" step="${st}" value="${esc(ui[k] === undefined ? 0 : ui[k])}" aria-label="${label}"></label>`; };
const eqInput = (id, ui, key, label) => `<label class="t-graphs-eqlab">${label}<input id="t-graphs-${id}" class="t-graphs-eq ${ui.bad && ui.bad[key] ? 'bad' : ''}" data-lib-input="${key}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(ui[key] || '')}" aria-label="${label}"></label>
  ${ui.bad && ui.bad[key] ? '<span class="t-graphs-hint">I can’t read that yet — try something like y = 2x + 1</span>' : ''}`;

/* ------------------------------------------------------------ gradients */

function stepRun(m) { for (let q = 1; q <= 12; q++) if (Math.abs(Math.round(m * q) - m * q) < 1e-9) return q; return 1; }
function gradientWords(m) {
  if (Math.abs(m) < EPS) return 'Flat: 0 up for every 1 across. The gradient is 0.';
  const q = stepRun(m), dir = m > 0 ? 'up' : 'down';
  let s = `${dir} <b>${num(Math.abs(m))}</b> for every <b>1</b> across`;
  if (q > 1) s += ` — that is ${dir} ${num(Math.abs(m * q))} for every ${q} across`;
  return s[0].toUpperCase() + s.slice(1) + '.';
}
/* the step triangle: from the intercept, `run` across then `rise` up */
function stepTriangle(fn, R) {
  const sq = stepRun(fn.m), run = sq * Math.max(1, Math.round(R / 5 / sq)), x0 = Math.abs(fn.c) <= R && run <= R ? 0 : null;
  if (x0 === null) return null;
  const p = [x0, yAt(fn, x0)], q = [x0 + run, p[1]], t = [x0 + run, yAt(fn, x0 + run)];
  return { p, q, t, run, rise: t[1] - q[1] };
}

/* ================================================================ tabs */

const TABS = [['points', 'Points'], ['table', 'Table'], ['lines', 'Lines'], ['curves', 'Curves'], ['real', 'Real life'], ['challenge', 'Challenges']];
const LINKS = { points: ['coordinates-and-moves'], table: ['nth-term', 'line-graph'], lines: ['line-graph', 'nth-term'], curves: ['line-graph'], real: ['line-graph'], challenge: ['line-graph', 'coordinates-and-moves', 'nth-term'] };
function links(ids) {
  const real = ids.filter((id) => byId[id]);
  return real.length ? `<div class="t-graphs-links"><span class="muted">In the Atlas:</span> ${real.map((id) => `<button class="chip t-graphs-link" data-act="openStop" data-arg="${id}">${esc(byId[id].title)}</button>`).join(' ')}</div>` : '';
}
const tabOf = (ctx) => (TABS.some((t) => t[0] === ctx.ui.tab) ? ctx.ui.tab : ctx.band === '11-14' ? 'lines' : 'points');
const Rof = (ctx) => ([5, 10, 20].includes(ctx.ui.R) ? ctx.ui.R : ctx.band === '6-7' ? 5 : 10);
const zoom = (ctx) => `<div class="row gap t-graphs-row"><span class="muted">Grid:</span>${[5, 10, 20].map((R) => `<button class="btn small ${Rof(ctx) === R ? 'primary' : ''}" data-act="lib" data-arg="zoom|${R}">−${R} to ${R}</button>`).join('')}</div>`;

/* ----------------------------------------------------------- points */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function parsePoint(s) {
  const t = String(s || '').replace(/[−–—]/g, '-').replace(/[()[\]\s]+/g, ' ').trim();
  const mt = t.match(/^(-?\d+(?:\.\d+)?)\s*[, ;]\s*(-?\d+(?:\.\d+)?)$/) || t.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);
  return mt ? [Number(mt[1]), Number(mt[2])] : null;
}
function quadrant([x, y]) {
  if (!x && !y) return 'at the origin, where the axes cross';
  if (!x) return 'on the y-axis'; if (!y) return 'on the x-axis';
  return x > 0 ? (y > 0 ? 'in the first quadrant (right and up)' : 'in the fourth quadrant (right and down)') : y > 0 ? 'in the second quadrant (left and up)' : 'in the third quadrant (left and down)';
}
function viewPoints(ctx) {
  const ui = ctx.ui, pl = plane(Rof(ctx)); ui.pts = ui.pts || []; ui.cur = ui.cur || [0, 0];
  const pts = ui.pts;
  let s = '';
  if (ui.join && pts.length > 1) s += `<polyline points="${pts.map(pl.S).map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" class="t-graphs-join" fill="none"/>`;
  pts.forEach((p, i) => { s += dot(pl, p) + tag(pl, p, `${LETTERS[i % 26]}`); });
  const c = pl.S(ui.cur); s += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="9" class="t-graphs-cur"/>`;
  const last = pts[pts.length - 1];
  const side = `<p>Tap the grid to plot a point, or move the ring with the arrows and press Enter. Or type one:</p>
    <div class="row gap t-graphs-row"><input id="t-graphs-pt" class="t-graphs-eq short" data-lib-input="ptxt" autocomplete="off" placeholder="(3, −2)" value="${esc(ui.ptxt || '')}" aria-label="A point, like (3, -2)">
      <button class="btn small primary" data-act="lib" data-arg="ptadd">Plot it</button></div>
    ${ui.ptxt && !parsePoint(ui.ptxt) ? '<span class="t-graphs-hint">Write it as (across, up) — like (3, −2).</span>' : ''}
    <p>Ring at <b>(${num(ui.cur[0])}, ${num(ui.cur[1])})</b>: ${num(Math.abs(ui.cur[0]))} ${ui.cur[0] < 0 ? 'left' : 'right'}, then ${num(Math.abs(ui.cur[1]))} ${ui.cur[1] < 0 ? 'down' : 'up'}.</p>
    ${last ? `<p>${LETTERS[(pts.length - 1) % 26]} ${ptStr(last)} is ${quadrant(last)}.</p>` : ''}
    <p class="muted">Along the corridor, then up (or down) the stairs: x first, then y.</p>
    <div class="t-graphs-list">${pts.map((p, i) => `<span class="chip">${LETTERS[i % 26]} ${ptStr(p)} <button class="t-graphs-x" data-act="lib" data-arg="ptdel|${i}" aria-label="Remove point ${LETTERS[i % 26]}">×</button></span>`).join(' ')}</div>
    <div class="row gap t-graphs-row"><button class="btn small ${ui.join ? 'primary' : ''}" data-act="lib" data-arg="ptjoin">Join the dots</button><button class="btn small" data-act="lib" data-arg="ptclear">Clear</button></div>
    <p class="muted">Keys: arrows move, Enter plots, Backspace removes the last point.</p>`;
  return `<div class="t-graphs-cols"><div class="card t-graphs-pic">${planeSVG(pl, s, { hits: 'ptat' })}${zoom(ctx)}</div><div class="card">${side}</div></div>`;
}
function actPoints(name, arg, ctx) {
  const ui = ctx.ui; ui.pts = ui.pts || []; ui.cur = ui.cur || [0, 0];
  const R = Rof(ctx), add = (p) => { if (Math.abs(p[0]) > 20 || Math.abs(p[1]) > 20) { ctx.toast('That is off the grid — keep between −20 and 20.'); return; } if (ui.pts.length >= 26) { ctx.toast('26 points is the most — clear some first.'); return; } ui.pts.push(p); ctx.sfx.click(); if (Math.abs(p[0]) > R || Math.abs(p[1]) > R) ui.R = 20; };
  if (name === 'ptat') { const p = String(arg).split(',').map(Number); if (p.length === 2 && p.every(Number.isFinite)) { ui.cur = p; add(p); } return true; }
  if (name === 'ptadd') { const p = parsePoint(ui.ptxt); if (!p) { ctx.toast('Write it as (across, up) — like (3, −2).'); return true; } add(p); ui.ptxt = ''; return true; }
  if (name === 'ptdel') { ui.pts.splice(+arg, 1); return true; }
  if (name === 'ptclear') { ui.pts = []; return true; }
  if (name === 'ptjoin') { ui.join = !ui.join; return true; }
  return false;
}
function keyPoints(e, ctx) {
  const ui = ctx.ui, R = Rof(ctx), st = R <= 10 ? 1 : 2; ui.cur = ui.cur || [0, 0];
  const mv = { ArrowUp: [0, st], ArrowDown: [0, -st], ArrowLeft: [-st, 0], ArrowRight: [st, 0] }[e.key];
  if (mv) { ui.cur = [clamp(ui.cur[0] + mv[0], -R, R), clamp(ui.cur[1] + mv[1], -R, R)]; return true; }
  if ((e.key === 'Enter' || e.key === ' ') && !onButton(e)) return actPoints('ptat', ui.cur.join(','), ctx);
  if (e.key === 'Backspace' || e.key === 'Delete') { if (ui.pts && ui.pts.length) ui.pts.pop(); return true; }
  return false;
}

/* ------------------------------------------------------------ table */

const par = (x) => (x < 0 ? `(${num(x)})` : num(x));
function substitute(fn, x) {
  const parts = [];
  if (fn.a) parts.push(`${Math.abs(fn.a) === 1 ? (fn.a < 0 ? '−' : '') : num(fn.a) + ' × '}${par(x)}²`);
  if (fn.m) parts.push(`${Math.abs(fn.m) === 1 ? (fn.m < 0 ? '−' : '') : num(fn.m) + ' × '}${par(x)}`);
  if (fn.c || !parts.length) parts.push(num(fn.c));
  return parts.join(' + ').replace(/\+ −/g, '− ');
}
function viewTable(ctx) {
  const ui = ctx.ui, pl = plane(Rof(ctx));
  if (ui.teq === undefined) ui.teq = ctx.band === '6-7' ? 'y = x + 2' : 'y = 2x + 1';
  const fn = parseEq(ui.teq), x0 = Number.isFinite(ui.tx0) ? ui.tx0 : -3, xs = Array.from({ length: 7 }, (_, i) => x0 + i);
  let s = '';
  if (fn && fn.vert === undefined) {
    if (ui.tjoin) s += drawFn(fn, pl, 't-graphs-c0');
    if (ui.tplot) xs.forEach((x) => { s += dot(pl, [x, yAt(fn, x)]); });
  }
  const rows = fn && fn.vert === undefined ? xs.map((x) => ({ x, y: yAt(fn, x), work: substitute(fn, x) })) : [];
  const table = rows.length ? `<div class="t-graphs-tablewrap"><table class="t-graphs-table"><tr><th>x</th>${rows.map((r) => `<td>${num(r.x)}</td>`).join('')}</tr><tr><th>y</th>${rows.map((r) => `<td><b>${num(r.y)}</b></td>`).join('')}</tr></table></div>
    <details class="t-graphs-work"><summary>Show the working</summary>${rows.map((r) => `<div>x = ${num(r.x)}: y = ${r.work} = <b>${num(r.y)}</b></div>`).join('')}</details>`
    : fn ? '<p>A line x = k is straight up and down — every point on it has the same x, so there is nothing to put in a table.</p>' : '<p class="t-graphs-hint">Type an equation like y = 2x + 1 or y = x² − 3.</p>';
  const side = `${eqInput('teq', ui, 'teq', 'Rule: ')}
    ${table}
    <div class="row gap t-graphs-row"><button class="btn small" data-act="lib" data-arg="tx|-1" aria-label="Table starts one lower">${icon('back', 16)} x</button><button class="btn small" data-act="lib" data-arg="tx|1" aria-label="Table starts one higher">x ${icon('next', 16)}</button>
      <button class="btn small ${ui.tplot ? 'primary' : ''}" data-act="lib" data-arg="tplot">Plot these points</button><button class="btn small ${ui.tjoin ? 'primary' : ''}" data-act="lib" data-arg="tjoin">Join them</button></div>
    ${fn && isLine(fn) && ui.tplot ? `<p>The points go up by <b>${num(fn.m)}</b> each time x goes up by 1 — they sit on a straight line.</p>` : ''}
    ${fn && fn.a && ui.tplot ? '<p>The steps are not all the same any more — the points bend round a curve.</p>' : ''}
    <p class="muted">Keys: ← → slide the table, Enter plots the points, J joins them.</p>`;
  return `<div class="t-graphs-cols"><div class="card t-graphs-pic">${planeSVG(pl, s)}${zoom(ctx)}</div><div class="card">${side}</div></div>`;
}
function actTable(name, arg, ctx) {
  const ui = ctx.ui;
  if (name === 'tx') { ui.tx0 = clamp((Number.isFinite(ui.tx0) ? ui.tx0 : -3) + (+arg || 0), -20, 14); return true; }
  if (name === 'tplot') { ui.tplot = !ui.tplot; return true; }
  if (name === 'tjoin') { ui.tjoin = !ui.tjoin; if (ui.tjoin) ui.tplot = true; return true; }
  return false;
}
function keyTable(e, ctx) {
  if (e.key === 'ArrowLeft') return actTable('tx', '-1', ctx);
  if (e.key === 'ArrowRight') return actTable('tx', '1', ctx);
  if (e.key === 'Enter' && !onButton(e)) return actTable('tplot', '', ctx);
  if (e.key === 'j' || e.key === 'J') return actTable('tjoin', '', ctx);
  return false;
}

/* ------------------------------------------------------------ lines */

const LDEF = [{ a: 0, m: 2, c: 1 }, { a: 0, m: -1, c: 4 }, { a: 0, m: 0.5, c: -2 }, { a: 0, m: -3, c: -5 }];
const lsl = (i) => ({ m: 'm' + i, c: 'c' + i });
function lineSlots(ctx) {
  const ui = ctx.ui; ui.nL = clamp(ui.nL || 2, 1, 4); ui.sel = clamp(ui.sel || 0, 0, ui.nL - 1);
  return Array.from({ length: ui.nL }, (_, i) => slot(ctx, 'eq' + i, LDEF[i], lsl(i)));
}
function lineFacts(fns) {
  const out = [];
  for (let i = 0; i < fns.length; i++) for (let j = i + 1; j < fns.length; j++) {
    const f = fns[i], g = fns[j], x = crossings(f, g);
    const perp = isLine(f) && isLine(g) ? Math.abs(f.m * g.m + 1) < 1e-9 : (f.vert !== undefined && isLine(g) && !g.m) || (g.vert !== undefined && isLine(f) && !f.m);
    out.push({ i, j, ...x, perp });
  }
  return out;
}
function viewLines(ctx) {
  const ui = ctx.ui, pl = plane(Rof(ctx)), fns = lineSlots(ctx), sel = ui.sel, facts = lineFacts(fns);
  let s = '';
  fns.forEach((fn, i) => { s += drawFn(fn, pl, `t-graphs-c${i}${i === sel ? ' sel' : ''}`); });
  const f = fns[sel];
  if (isLine(f)) {
    const st = stepTriangle(f, pl.R);
    if (st && Math.abs(st.rise) > EPS) { const [p, q, t] = [st.p, st.q, st.t].map(pl.S); s += `<polyline points="${f1(p[0])},${f1(p[1])} ${f1(q[0])},${f1(q[1])} ${f1(t[0])},${f1(t[1])}" class="t-graphs-step" fill="none"/>` + T(f1(q[0] + 6), f1((q[1] + t[1]) / 2 + 4), `${st.rise > 0 ? '↑' : '↓'} ${num(Math.abs(st.rise))}`, 't-graphs-steplab', 'start') + T(f1((p[0] + q[0]) / 2), f1(q[1] + (st.rise > 0 ? 14 : -6)), `→ ${num(st.run)}`, 't-graphs-steplab'); }
    if (Math.abs(f.c) <= pl.R) { const q0 = pl.S([0, f.c]); s += dot(pl, [0, f.c], 't-graphs-icpt', 6) + T(f1(q0[0] - 9), f1(q0[1] - 8), `(0, ${exact(f.c)})`, 't-graphs-tag', 'end'); }
  }
  for (const x of facts) for (const p of x.pts) if (Math.abs(p[0]) <= pl.R && Math.abs(p[1]) <= pl.R) {
    s += dot(pl, p, 't-graphs-cross', 6) + tag(pl, p, ptStr(p), 't-graphs-tag strong');
    if (x.perp) { const a = fns[x.i], b = fns[x.j], d1 = a.vert !== undefined ? [0, 1] : [1, a.m], d2 = b.vert !== undefined ? [0, 1] : [1, b.m], n1 = Math.hypot(...d1), n2 = Math.hypot(...d2), L = 10 / pl.k;
      const u = [d1[0] / n1 * L, d1[1] / n1 * L], v = [d2[0] / n2 * L, d2[1] / n2 * L], P0 = pl.S([p[0] + u[0], p[1] + u[1]]), P1 = pl.S([p[0] + u[0] + v[0], p[1] + u[1] + v[1]]), P2 = pl.S([p[0] + v[0], p[1] + v[1]]);
      s += `<polyline points="${f1(P0[0])},${f1(P0[1])} ${f1(P1[0])},${f1(P1[1])} ${f1(P2[0])},${f1(P2[1])}" class="t-graphs-right" fill="none"/>`; }
  }
  const rowsHtml = fns.map((fn, i) => `<div class="t-graphs-lrow ${i === sel ? 'sel' : ''}"><button class="t-graphs-key t-graphs-k${i}" data-act="lib" data-arg="lsel|${i}" aria-label="Choose line ${i + 1}">${i + 1}</button>
      <div class="t-graphs-lbody">${eqInput('eq-' + i, ui, 'eq' + i, '')}${i === sel && fn.vert === undefined ? slider(`m-${i}`, ui, 'm' + i, 'm', 'gradient m') + slider(`c-${i}`, ui, 'c' + i, 'c', 'intercept c') : ''}</div></div>`).join('');
  const about = f.vert !== undefined ? `<p><b>${esc(fmtEq(f))}</b> is straight up and down: every point on it has x = ${exact(f.vert)}. It is too steep for a gradient number.</p>`
    : f.a ? `<p>Line ${sel + 1} is a curve — see the Curves tab for how x² bends it.</p>`
      : `<p><b>Gradient ${exact(f.m)}</b>: ${gradientWords(f.m)} <b>Intercept ${exact(f.c)}</b>: it crosses the y-axis at (0, ${exact(f.c)}).</p>${(() => { const st = stepTriangle(f, pl.R); return st && Math.abs(st.rise) > EPS ? `<p class="muted">The dashed triangle goes ${num(st.run)} across and ${num(Math.abs(st.rise))} ${st.rise > 0 ? 'up' : 'down'}: ${num(st.rise)} ÷ ${num(st.run)} = ${exact(f.m)}, the gradient.</p>` : ''; })()}`;
  const meets = facts.map((x) => `<li><span class="t-graphs-key t-graphs-k${x.i} mini">${x.i + 1}</span> and <span class="t-graphs-key t-graphs-k${x.j} mini">${x.j + 1}</span> ${x.kind === 'same' ? 'are the same line.' : x.kind === 'parallel' ? 'are <b>parallel</b> — the same gradient, so they never meet.' : x.kind === 'miss' ? 'never meet.' : `${x.kind === 'touch' ? 'just touch' : 'cross'} at <b>${x.pts.map(ptStr).join(' and ')}</b>${x.perp ? ' — at a <b>right angle</b> (perpendicular: the gradients multiply to −1)' : ''}.`}</li>`).join('');
  const side = `${rowsHtml}
    <div class="row gap t-graphs-row">${ui.nL < 4 ? '<button class="btn small" data-act="lib" data-arg="ladd">Add a line</button>' : ''}
      ${ui.nL < 4 ? '<button class="btn small" data-act="lib" data-arg="lpar">Parallel to this</button><button class="btn small" data-act="lib" data-arg="lperp">Perpendicular to this</button>' : ''}
      ${ui.nL > 1 ? '<button class="btn small ghost" data-act="lib" data-arg="ldel">Remove this line</button>' : ''}</div>
    ${about}<ul class="t-graphs-meets">${meets}</ul>
    <p class="muted">Keys: 1–4 choose a line, ← → change the gradient, ↑ ↓ the intercept.</p>`;
  return `<div class="t-graphs-cols"><div class="card t-graphs-pic">${planeSVG(pl, s)}${zoom(ctx)}</div><div class="card">${side}</div></div>`;
}
function copySlot(ctx, from, to) {
  const ui = ctx.ui;
  for (const [a, b] of [['eq' + from, 'eq' + to], ['m' + from, 'm' + to], ['c' + from, 'c' + to]]) { ui[b] = ui[a]; ui.seen[b] = ui.seen[a]; }
  ui.F['eq' + to] = ui.F['eq' + from]; ui.bad['eq' + to] = ui.bad['eq' + from];
}
function actLines(name, arg, ctx) {
  const ui = ctx.ui, fns = lineSlots(ctx);
  if (name === 'lsel') { ui.sel = clamp(+arg || 0, 0, ui.nL - 1); return true; }
  if (name === 'ladd') { if (ui.nL < 4) { setSlot(ctx, 'eq' + ui.nL, LDEF[ui.nL], lsl(ui.nL)); ui.sel = ui.nL; ui.nL++; } return true; }
  if (name === 'lpar' || name === 'lperp') {
    if (ui.nL >= 4) return true;
    const f = fns[ui.sel]; let g;
    if (f.a) { ctx.toast('Choose a straight line first.'); return true; }
    if (name === 'lpar') g = f.vert !== undefined ? { vert: f.vert + (f.vert <= 5 ? 3 : -3) } : { a: 0, m: f.m, c: f.c + (f.c <= 5 ? 3 : -3) };
    else g = f.vert !== undefined ? { a: 0, m: 0, c: 0 } : Math.abs(f.m) < EPS ? { vert: 0 } : { a: 0, m: -1 / f.m, c: f.c };
    setSlot(ctx, 'eq' + ui.nL, g, lsl(ui.nL)); ui.sel = ui.nL; ui.nL++; return true;
  }
  if (name === 'ldel') {
    if (ui.nL <= 1) return true;
    for (let j = ui.sel; j < ui.nL - 1; j++) copySlot(ctx, j + 1, j);
    const last = ui.nL - 1; delete ui.F['eq' + last]; ui.nL--; ui.sel = clamp(ui.sel, 0, ui.nL - 1); return true;
  }
  return false;
}
function keyLines(e, ctx) {
  const ui = ctx.ui; lineSlots(ctx);
  if (/^[1-4]$/.test(e.key)) return actLines('lsel', String(+e.key - 1), ctx);
  const d = { ArrowLeft: ['m', -0.5], ArrowRight: ['m', 0.5], ArrowDown: ['c', -1], ArrowUp: ['c', 1] }[e.key];
  if (d) { nudge(ctx, 'eq' + ui.sel, lsl(ui.sel), d[0], d[1]); return true; }
  return false;
}

/* ----------------------------------------------------------- curves */

const QSL = { a: 'qa', m: 'qb', c: 'qc' };
function viewCurves(ctx) {
  const ui = ctx.ui, pl = plane(Rof(ctx)), f = slot(ctx, 'qeq', { a: 1, m: 0, c: 0 }, QSL), young = ctx.band !== '11-14';
  let s = drawFn({ a: 1, m: 0, c: 0 }, pl, 't-graphs-ref') + drawFn(f, pl, 't-graphs-c0 sel');
  let about = '';
  if (f.vert !== undefined) about = '<p>That is a straight up-and-down line, not a curve. Try y = x².</p>';
  else if (!f.a) about = '<p>With no x² term it is a straight line. Put an x² back to bend it.</p>';
  else {
    const vx = -f.m / (2 * f.a), vy = yAt(f, vx), roots = crossings(f, { a: 0, m: 0, c: 0 });
    if (Math.abs(vx) <= pl.R) s += `<line x1="${f1(pl.S([vx, 0])[0])}" y1="${M}" x2="${f1(pl.S([vx, 0])[0])}" y2="${M + PW}" class="t-graphs-sym"/>`;
    s += dot(pl, [vx, vy], 't-graphs-cross', 6) + tag(pl, [vx, vy], ptStr([vx, vy]), 't-graphs-tag strong');
    for (const p of roots.pts) s += dot(pl, p, 't-graphs-icpt', 5);
    about = `<p><b>${f.a > 0 ? 'A U shape' : 'An upside-down U (∩)'}</b> — ${f.a > 0 ? 'x² is never negative, so the curve has a lowest point' : 'a negative number times x² turns it over, so it has a highest point'}.</p>
      <p>The ${f.a > 0 ? 'lowest' : 'highest'} point (the <b>vertex</b>) is <b>${ptStr([vx, vy])}</b>. The dashed line x = ${exact(vx)} is its mirror line: the two sides match.</p>
      <p>${Math.abs(f.a) > 1 ? `a = ${num(f.a)} makes it <b>narrower</b> than y = x² (shown faint)` : Math.abs(f.a) < 1 ? `a = ${num(f.a)} makes it <b>wider</b> than y = x² (shown faint)` : 'The same width as y = x² (shown faint)'}${f.c ? `, and c = ${num(f.c)} slides it ${f.c > 0 ? 'up' : 'down'} ${num(Math.abs(f.c))}` : ''}.</p>
      <p>${roots.kind === 'miss' ? 'It never touches the x-axis — y = 0 has no answers.' : roots.kind === 'touch' ? `It just touches the x-axis at x = ${exact(roots.pts[0][0])}.` : `It crosses the x-axis at x = ${roots.pts.map((p) => exact(p[0])).join(' and x = ')} — where y = 0.`}</p>`;
  }
  const xs = [-3, -2, -1, 0, 1, 2, 3];
  const tbl = f.vert === undefined ? `<div class="t-graphs-tablewrap"><table class="t-graphs-table"><tr><th>x</th>${xs.map((x) => `<td>${num(x)}</td>`).join('')}</tr><tr><th>y</th>${xs.map((x) => `<td>${num(yAt(f, x))}</td>`).join('')}</tr></table></div>` : '';
  const side = `${young ? '<p class="kicker">Mostly for 11–14 — but have a look</p>' : ''}${eqInput('qeq', ui, 'qeq', 'Curve: ')}
    ${slider('qa', ui, 'qa', 'a', 'a (the x² number)')}${slider('qc', ui, 'qc', 'c', 'c (up or down)')}
    ${about}${tbl}
    <p class="muted">Keys: ← → change a, ↑ ↓ change c. Type y = x² − 2x − 3 for one that is not centred.</p>`;
  return `<div class="t-graphs-cols"><div class="card t-graphs-pic">${planeSVG(pl, s)}${zoom(ctx)}</div><div class="card">${side}</div></div>`;
}
function keyCurves(e, ctx) {
  slot(ctx, 'qeq', { a: 1, m: 0, c: 0 }, QSL);
  const d = { ArrowLeft: ['a', -0.5], ArrowRight: ['a', 0.5], ArrowDown: ['c', -1], ArrowUp: ['c', 1] }[e.key];
  if (d) { nudge(ctx, 'qeq', QSL, d[0], d[1]); return true; }
  return false;
}

/* -------------------------------------------------------- real life */

const SPEEDS = [3, 4, 5, 6, 12, 15, 18, 24];
function newJourney(r = Math.random) {
  for (let tries = 0; tries < 500; tries++) {
    const n = ri(3, 4, r), segs = []; let d = 0, t = 0, ok = true;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1, back = last && d > 0 && r() < 0.5, stop = !back && i > 0 && i < n - 1 && segs[i - 1].v !== 0 && r() < 0.4;
      let dt, dd, v;
      if (stop) { dt = pick([5, 10, 15, 20], r); dd = 0; v = 0; }
      else if (back) { const opts = SPEEDS.filter((sp) => Number.isInteger((d / sp) * 60) && (d / sp) * 60 % 5 === 0 && (d / sp) * 60 <= 90); if (!opts.length) { ok = false; break; } v = -pick(opts, r); dt = (d / -v) * 60; dd = -d; }
      else { const sp = pick(SPEEDS, r); dt = pick([10, 15, 20, 30, 40], r); dd = (sp * dt) / 60; if (Math.round(dd * 2) !== dd * 2) { ok = false; break; } v = sp; }
      segs.push({ t0: t, t1: t + dt, d0: d, d1: d + dd, v }); t += dt; d += dd;
    }
    if (!ok) continue;
    const top = Math.max(...segs.map((x) => Math.abs(x.v))), fastest = segs.filter((x) => Math.abs(x.v) === top);
    if (fastest.length !== 1 || t > 150 || Math.max(...segs.map((x) => x.d1)) > 20) continue;
    return { segs, fast: segs.indexOf(fastest[0]) };
  }
  return { segs: [{ t0: 0, t1: 30, d0: 0, d1: 2, v: 4 }, { t0: 30, t1: 40, d0: 2, d1: 2, v: 0 }, { t0: 40, t1: 60, d0: 2, d1: 6, v: 12 }], fast: 2 };
}
/* a small graph with its own axes (0 at the bottom left) */
function axesGraph(xmax, ymin, ymax, xstep, ystep, xl, yl, inner) {
  const X = (x) => 46 + (x / xmax) * 270, Y = (y) => 20 + ((ymax - y) / (ymax - ymin)) * 220;
  let s = `<rect x="46" y="20" width="270" height="220" class="t-graphs-bg"/>`;
  for (let x = 0; x <= xmax + 1e-9; x += xstep) s += `<line x1="${f1(X(x))}" y1="20" x2="${f1(X(x))}" y2="240" class="dg-grid"/>` + T(f1(X(x)), 254, num(x), 't-graphs-n');
  for (let y = Math.ceil(ymin / ystep) * ystep; y <= ymax + 1e-9; y += ystep) s += `<line x1="46" y1="${f1(Y(y))}" x2="316" y2="${f1(Y(y))}" class="dg-grid"/>` + T(40, f1(Y(y) + 4), num(y), 't-graphs-n', 'end');
  s += `<line x1="46" y1="${f1(Y(Math.max(0, ymin)))}" x2="316" y2="${f1(Y(Math.max(0, ymin)))}" class="t-graphs-axis"/><line x1="46" y1="20" x2="46" y2="240" class="t-graphs-axis"/>`;
  s += T(181, 272, xl, 't-graphs-ax') + `<text x="12" y="130" class="t-graphs-ax" text-anchor="middle" transform="rotate(-90 12 130)">${esc(yl)}</text>`;
  return { X, Y, svg: (extra) => kit.svg(330, 280, s + inner(X, Y) + (extra || ''), `A graph of ${yl} against ${xl}`) };
}
const CONV = {
  inch: { name: 'Inches to centimetres', xl: 'inches', yl: 'centimetres', k: 2.54, b: 0, x0: 0, x1: 20, xs: 2, ys: 10, note: 'One inch is exactly 2.54 cm, by definition. The line goes through (0, 0): no inches is no centimetres, so the graph means “multiply by 2.54”.' },
  mile: { name: 'Miles to kilometres', xl: 'miles', yl: 'kilometres', k: 1.609344, b: 0, x0: 0, x1: 20, xs: 2, ys: 5, note: 'One mile is exactly 1.609344 km, by definition — about 8 km for every 5 miles. Through (0, 0), so it is “multiply”.' },
  temp: { name: '°C to °F', xl: '°C', yl: '°F', k: 1.8, b: 32, x0: -20, x1: 40, xs: 10, ys: 20, note: 'F = 1.8 × C + 32. This line does NOT go through (0, 0): 0 °C is 32 °F. So it is “multiply, then add” — a gradient and an intercept, like y = mx + c.' },
};
function viewReal(ctx) {
  const ui = ctx.ui, kind = ui.rk === 'conv' ? 'conv' : 'dt';
  const seg = `<div class="seg small">${[['dt', 'Distance–time'], ['conv', 'Conversion']].map(([k, l]) => `<button class="${kind === k ? 'on' : ''}" data-act="lib" data-arg="rk|${k}">${l}</button>`).join('')}</div>`;
  if (kind === 'dt') {
    if (!ui.jr) ui.jr = newJourney();
    const J = ui.jr, segs = J.segs, sel = clamp(ui.jsel || 0, 0, segs.length - 1), s0 = segs[sel];
    const tmax = segs[segs.length - 1].t1, dmax = Math.max(2, Math.ceil(Math.max(...segs.map((x) => x.d1))));
    const g = axesGraph(tmax, 0, dmax, tmax > 90 ? 20 : 10, dmax > 10 ? 2 : 1, 'time (minutes)', 'distance from home (km)', (X, Y) =>
      segs.map((x, i) => `<line x1="${f1(X(x.t0))}" y1="${f1(Y(x.d0))}" x2="${f1(X(x.t1))}" y2="${f1(Y(x.d1))}" class="t-graphs-leg${i === sel ? ' sel' : ''}"/><line x1="${f1(X(x.t0))}" y1="${f1(Y(x.d0))}" x2="${f1(X(x.t1))}" y2="${f1(Y(x.d1))}" class="t-graphs-hitline" data-act="lib" data-arg="jsel|${i}"/>`).join('')
      + segs.map((x) => `<circle cx="${f1(X(x.t1))}" cy="${f1(Y(x.d1))}" r="3.5" class="t-graphs-dot"/>`).join(''));
    const dd = s0.d1 - s0.d0, dt = s0.t1 - s0.t0;
    const what = s0.v === 0 ? '<b>Flat</b> — the distance does not change, so they have <b>stopped</b>. Speed 0 km/h.'
      : `${dd > 0 ? 'Going away from home' : 'Coming back home'}: ${num(Math.abs(dd))} km in ${dt} minutes.<br>Gradient = ${num(dd)} km ÷ ${dt} min${dt === 60 ? '' : ` = ${num(dd / dt, 4)} km per minute`}.<br>Times 60 for an hour: <b>${num(Math.abs(s0.v))} km/h</b>.`;
    const q = J.answered === undefined
      ? `<p><b>Which part of the journey was fastest?</b> Choose a part (tap it, or ← →), then press “This one”.</p><button class="btn primary" data-act="lib" data-arg="jans">This one</button>`
      : `<p class="t-graphs-note ${J.answered === J.fast ? 'win' : ''}">${J.answered === J.fast ? '✓ Yes — ' : 'Not that one. '}The fastest part is part ${J.fast + 1}: the <b>steepest</b> line, ${num(Math.abs(segs[J.fast].v))} km/h. Steeper means more distance for each minute.</p><button class="btn primary" data-act="lib" data-arg="jnew">New journey</button>`;
    const side = `<p class="kicker">Part ${sel + 1} of ${segs.length} · from ${s0.t0} to ${s0.t1} minutes</p><p>${what}</p>
      <div class="row gap t-graphs-row"><button class="btn small" data-act="lib" data-arg="jmove|-1" aria-label="Previous part">${icon('back', 16)}</button>${segs.map((_, i) => `<button class="btn small ${i === sel ? 'primary' : ''}" data-act="lib" data-arg="jsel|${i}">${i + 1}</button>`).join('')}<button class="btn small" data-act="lib" data-arg="jmove|1" aria-label="Next part">${icon('next', 16)}</button></div>
      <p class="muted">On a distance–time graph the <b>gradient is the speed</b>. Flat is stopped; steeper is faster; sloping down is heading home.</p>${q}`;
    return seg + `<div class="t-graphs-cols"><div class="card t-graphs-pic">${g.svg()}</div><div class="card">${side}</div></div>`;
  }
  const ck = CONV[ui.ck] ? ui.ck : 'inch', C = CONV[ck], x = clamp(Math.round(Number(ui.cx === undefined ? (C.x0 + C.x1) / 2 : ui.cx)) || 0, C.x0, C.x1), y = C.k * x + C.b;
  const y0 = Math.min(0, C.k * C.x0 + C.b), y1 = C.k * C.x1 + C.b, ys = C.ys;
  const g = axesGraph(C.x1 - C.x0, Math.floor(y0 / ys) * ys, Math.ceil(y1 / ys) * ys, C.xs, ys, C.xl, C.yl, (X, Y) => {
    const Xv = (v) => X(v - C.x0);
    return `<line x1="${f1(Xv(C.x0))}" y1="${f1(Y(C.k * C.x0 + C.b))}" x2="${f1(Xv(C.x1))}" y2="${f1(Y(y1))}" class="t-graphs-c0"/>`
      + `<polyline points="${f1(Xv(x))},${f1(Y(Math.max(0, Math.floor(y0 / ys) * ys)))} ${f1(Xv(x))},${f1(Y(y))} 46,${f1(Y(y))}" class="t-graphs-guide" fill="none"/><circle cx="${f1(Xv(x))}" cy="${f1(Y(y))}" r="5" class="t-graphs-cross"/>`;
  });
  // the x-axis labels of a graph that starts below 0 count from C.x0
  const svg = g.svg().replace(/(<text x="[\d.]+" y="254" class="t-graphs-n" text-anchor="middle">)([−\d.]+)(<\/text>)/g, (m0, a, v, b) => a + num(Number(v.replace('−', '-')) + C.x0) + b);
  const side = `<div class="row gap t-graphs-row">${Object.entries(CONV).map(([k, c]) => `<button class="btn small ${k === ck ? 'primary' : ''}" data-act="lib" data-arg="ck|${k}">${c.name}</button>`).join('')}</div>
    <label class="t-graphs-slider">${C.xl}: <b>${num(x)}</b><input type="range" id="t-graphs-cx" data-lib-input="cx" min="${C.x0}" max="${C.x1}" step="1" value="${x}" aria-label="${C.xl}"></label>
    <p class="t-graphs-big">${num(x)} ${esc(C.xl)} = ${num(y, 2)} ${esc(C.yl)}</p>
    <p>Go up from ${num(x)} to the line, then across to read ${num(y, 2)}.</p>
    <p class="muted">${C.note}</p><p class="muted">Keys: ← → move the reader.</p>`;
  return seg + `<div class="t-graphs-cols"><div class="card t-graphs-pic">${svg}</div><div class="card">${side}</div></div>`;
}
function actReal(name, arg, ctx) {
  const ui = ctx.ui;
  if (name === 'rk') { ui.rk = arg === 'conv' ? 'conv' : 'dt'; return true; }
  if (name === 'jsel') { if (ui.jr) ui.jsel = clamp(+arg || 0, 0, ui.jr.segs.length - 1); return true; }
  if (name === 'jmove') { if (ui.jr) ui.jsel = clamp((ui.jsel || 0) + (+arg || 0), 0, ui.jr.segs.length - 1); return true; }
  if (name === 'jans') {
    const J = ui.jr; if (!J || J.answered !== undefined) return true;
    J.answered = clamp(ui.jsel || 0, 0, J.segs.length - 1);
    if (J.answered === J.fast) { ctx.sfx.good(); ctx.tick(true, 2); ctx.data.fastRight = (ctx.data.fastRight || 0) + 1; ctx.save(); } else ctx.sfx.bad();
    return true;
  }
  if (name === 'jnew') { ui.jr = newJourney(); ui.jsel = 0; return true; }
  if (name === 'ck') { if (CONV[arg]) { ui.ck = arg; ui.cx = String((CONV[arg].x0 + CONV[arg].x1) / 2); } return true; }
  return false;
}
function keyReal(e, ctx) {
  const ui = ctx.ui;
  if (ui.rk === 'conv') {
    const C = CONV[CONV[ui.ck] ? ui.ck : 'inch'], cur = Math.round(Number(ui.cx === undefined ? (C.x0 + C.x1) / 2 : ui.cx)) || 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { ui.cx = String(clamp(cur - 1, C.x0, C.x1)); return true; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { ui.cx = String(clamp(cur + 1, C.x0, C.x1)); return true; }
    return false;
  }
  if (e.key === 'ArrowLeft') return actReal('jmove', '-1', ctx);
  if (e.key === 'ArrowRight') return actReal('jmove', '1', ctx);
  if (e.key === 'Enter' && !onButton(e)) return actReal(ui.jr && ui.jr.answered !== undefined ? 'jnew' : 'jans', '', ctx);
  return false;
}

/* ------------------------------------------------------- challenges */

function newChallenge(kind, band, r = Math.random) {
  const young = band !== '11-14';
  if (kind === 'steeper') {
    for (;;) {
      const ms = young ? [0.5, 1, 2, 3, 4] : [-4, -3, -2, -1, -0.5, 0.5, 1, 2, 3, 4];
      const A = { a: 0, m: pick(ms, r), c: ri(-4, 4, r) }, B = { a: 0, m: pick(ms, r), c: ri(-4, 4, r) };
      if (Math.abs(Math.abs(A.m) - Math.abs(B.m)) < EPS) continue;
      return { kind, A, B, ans: Math.abs(A.m) > Math.abs(B.m) ? 'A' : 'B', done: false };
    }
  }
  if (kind === 'name') {
    const ms = young ? [1, 2, 3] : [-3, -2, -1, 1, 2, 3, 0.5, -0.5];
    return { kind, fn: { a: 0, m: pick(ms, r), c: young ? ri(0, 5, r) : ri(-6, 6, r) }, done: false, tries: 0 };
  }
  for (;;) {   // through two points
    const m = pick(young ? [1, 2, 3] : [-3, -2, -1, 1, 2, 3, 0.5, -0.5], r), c = young ? ri(0, 4, r) : ri(-5, 5, r);
    const q = Math.abs(m) === 0.5 ? 2 : 1, x1 = q * ri(-3, 1, r), x2 = x1 + q * ri(1, 3, r);
    const P1 = [x1, m * x1 + c], P2 = [x2, m * x2 + c];
    if ([...P1, ...P2].some((v) => Math.abs(v) > 9 || !Number.isInteger(v))) continue;
    if (young && (P1[1] < 0 || P2[1] < 0 || x1 < 0)) continue;
    return { kind: 'through', P1, P2, done: false, tries: 0, show: false };
  }
}
const CHSL = { m: 'chm', c: 'chc' };
function chState(ctx) {
  const ui = ctx.ui;
  if (!ui.ch) ui.ch = newChallenge('through', ctx.band);
  ui.chScore = ui.chScore || { right: 0, tries: 0 };
  return ui.ch;
}
function viewChallenge(ctx) {
  const ui = ctx.ui, ch = chState(ctx), pl = plane(Rof(ctx) === 5 ? 10 : Rof(ctx)), sc = ui.chScore;
  const seg = `<div class="seg small">${[['through', 'Through two points'], ['steeper', 'Which is steeper?'], ['name', 'Name this line']].map(([k, l]) => `<button class="${ch.kind === k ? 'on' : ''}" data-act="lib" data-arg="chkind|${k}">${l}</button>`).join('')}</div>`;
  let s = '', side = '';
  if (ch.kind === 'through') {
    const f = slot(ctx, 'chq', { a: 0, m: 1, c: 0 }, CHSL);
    s += drawFn(f, pl, 't-graphs-c1') + dot(pl, ch.P1, 't-graphs-cross', 6) + tag(pl, ch.P1, `A ${ptStr(ch.P1)}`, 't-graphs-tag strong') + dot(pl, ch.P2, 't-graphs-cross', 6) + tag(pl, ch.P2, `B ${ptStr(ch.P2)}`, 't-graphs-tag strong');
    const on1 = f.vert === undefined && Math.abs(yAt(f, ch.P1[0]) - ch.P1[1]) < 1e-9, on2 = f.vert === undefined && Math.abs(yAt(f, ch.P2[0]) - ch.P2[1]) < 1e-9;
    const rise = ch.P2[1] - ch.P1[1], run = ch.P2[0] - ch.P1[0];
    side = `<p><b>Make a straight line through A and B.</b> Use the sliders or type the equation.</p>
      ${eqInput('chq', ui, 'chq', 'Your line: ')}${slider('chm', ui, 'chm', 'm', 'gradient m')}${slider('chc', ui, 'chc', 'c', 'intercept c')}
      <p>${on1 ? '✓ through A' : '✗ misses A'} · ${on2 ? '✓ through B' : '✗ misses B'}</p>
      ${ch.done ? `<p class="t-graphs-note win">✓ ${esc(fmtEq(f))} goes through both.</p><button class="btn primary" data-act="lib" data-arg="chnew">Next</button>`
        : `<div class="row gap t-graphs-row"><button class="btn primary" data-act="lib" data-arg="chcheck">Check</button>${ch.tries >= 2 ? '<button class="btn small" data-act="lib" data-arg="chshow">Show me how</button>' : ''}</div>`}
      ${ch.show ? `<p class="t-graphs-formula">From A to B: across ${num(run)}, up ${num(rise)}.<br>Gradient = ${num(rise)} ÷ ${num(run)} = ${exact(rise / run)}.<br>c = ${num(ch.P1[1])} − ${exact(rise / run)} × ${par(ch.P1[0])} = ${exact(ch.P1[1] - (rise / run) * ch.P1[0])}.</p>` : ''}
      <p class="muted">Keys: ← → gradient, ↑ ↓ intercept, Enter checks.</p>`;
  } else if (ch.kind === 'steeper') {
    s += drawFn(ch.A, pl, 't-graphs-c0') + drawFn(ch.B, pl, 't-graphs-c1');
    const ea = lineEnds(ch.A, pl.R), eb = lineEnds(ch.B, pl.R);
    if (ea) s += tag(pl, ea[1], 'A', 't-graphs-tag strong'); if (eb) s += tag(pl, eb[1], 'B', 't-graphs-tag strong');
    const young = ctx.band !== '11-14';
    side = `<p><b>Which line is steeper, A or B?</b></p>
      ${young ? '' : `<p><span class="t-graphs-key t-graphs-k0 mini">A</span> ${esc(fmtEq(ch.A))} &nbsp; <span class="t-graphs-key t-graphs-k1 mini">B</span> ${esc(fmtEq(ch.B))}</p>`}
      ${ch.done ? `<p class="t-graphs-note ${ch.got === ch.ans ? 'win' : ''}">${ch.got === ch.ans ? '✓ Yes' : 'Not this time'} — ${ch.ans} is steeper. Its gradient is ${exact(ch[ch.ans].m)}: ${num(Math.abs(ch[ch.ans].m))} ${ch[ch.ans].m > 0 ? 'up' : 'down'} for every 1 across, against ${num(Math.abs(ch[ch.ans === 'A' ? 'B' : 'A'].m))}.${young ? '' : ' Steepness is the size of the gradient — a minus sign only means it slopes down.'}</p><button class="btn primary" data-act="lib" data-arg="chnew">Next</button>`
        : `<div class="row gap t-graphs-row"><button class="btn primary" data-act="lib" data-arg="chpick|A">A</button><button class="btn primary" data-act="lib" data-arg="chpick|B">B</button></div><p class="muted">Keys: A or B.</p>`}`;
  } else {
    s += drawFn(ch.fn, pl, 't-graphs-c0');
    const got = parseEq(ui.chn);
    side = `<p><b>What is the equation of this line?</b> Find where it crosses the y-axis, then how far it goes up for each 1 across.</p>
      ${eqInput('chn', ui, 'chn', 'y = mx + c: ')}
      ${ch.done ? `<p class="t-graphs-note win">✓ ${esc(fmtEq(ch.fn))}</p><button class="btn primary" data-act="lib" data-arg="chnew">Next</button>`
        : `<div class="row gap t-graphs-row"><button class="btn primary" data-act="lib" data-arg="chcheck">Check</button></div>${ch.tries && got ? `<p class="t-graphs-hint">${got.vert !== undefined || got.a ? 'It is a straight, sloping line: y = mx + c.' : Math.abs(got.m - ch.fn.m) > EPS ? 'Look again at the gradient: how far up (or down) for 1 across?' : 'The gradient is right — where does it cross the y-axis?'}</p>` : ''}`}`;
  }
  return seg + `<div class="t-graphs-cols"><div class="card t-graphs-pic">${planeSVG(pl, s, { clip: 'ch' })}</div><div class="card"><p class="kicker">${sc.right} right of ${sc.tries}</p>${side}</div></div>`;
}
function win(ctx, ch) { ch.done = true; ctx.ui.chScore.right++; ctx.sfx.good(); ctx.tick(true, 2); ctx.data.chRight = (ctx.data.chRight || 0) + 1; ctx.save(); }
function actChallenge(name, arg, ctx) {
  const ui = ctx.ui, ch = chState(ctx);
  if (name === 'chkind') { ui.ch = newChallenge(['through', 'steeper', 'name'].includes(arg) ? arg : 'through', ctx.band); ui.chn = ''; return true; }
  if (name === 'chnew') { ui.ch = newChallenge(ch.kind, ctx.band); ui.chn = ''; return true; }
  if (name === 'chshow') { ch.show = true; return true; }
  if (name === 'chpick') {
    if (ch.kind !== 'steeper' || ch.done) return true;
    ch.got = arg === 'B' ? 'B' : 'A'; ui.chScore.tries++;
    if (ch.got === ch.ans) win(ctx, ch); else { ch.done = true; ctx.sfx.bad(); }
    return true;
  }
  if (name === 'chcheck') {
    if (ch.done) return true;
    if (ch.kind === 'through') {
      const f = slot(ctx, 'chq', { a: 0, m: 1, c: 0 }, CHSL); ch.tries++; ui.chScore.tries++;
      if (isLine(f) && [ch.P1, ch.P2].every((p) => Math.abs(yAt(f, p[0]) - p[1]) < 1e-9)) win(ctx, ch);
      else { ctx.sfx.bad(); ctx.toast(isLine(f) ? 'Not through both yet — look at the ticks.' : 'It needs to be a straight line.'); }
      return true;
    }
    if (ch.kind === 'name') {
      const g = parseEq(ui.chn); if (!g) { ctx.toast('Type an equation like y = 2x + 1.'); return true; }
      ch.tries++; ui.chScore.tries++;
      if (isLine(g) && Math.abs(g.m - ch.fn.m) < 1e-9 && Math.abs(g.c - ch.fn.c) < 1e-9) win(ctx, ch); else ctx.sfx.bad();
      return true;
    }
  }
  return false;
}
function keyChallenge(e, ctx) {
  const ch = chState(ctx);
  if (ch.kind === 'steeper') { const k = { a: 'A', b: 'B', 1: 'A', 2: 'B' }[e.key.toLowerCase()]; if (k) return actChallenge('chpick', k, ctx); if (e.key === 'Enter' && ch.done && !onButton(e)) return actChallenge('chnew', '', ctx); return false; }
  if (ch.kind === 'through') {
    slot(ctx, 'chq', { a: 0, m: 1, c: 0 }, CHSL);
    const d = { ArrowLeft: ['m', -0.5], ArrowRight: ['m', 0.5], ArrowDown: ['c', -1], ArrowUp: ['c', 1] }[e.key];
    if (d && !ch.done) { nudge(ctx, 'chq', CHSL, d[0], d[1]); return true; }
  }
  if (e.key === 'Enter' && !onButton(e)) return actChallenge(ch.done ? 'chnew' : 'chcheck', '', ctx);
  return false;
}

/* ============================================================ the tool */

const VIEWS = { points: viewPoints, table: viewTable, lines: viewLines, curves: viewCurves, real: viewReal, challenge: viewChallenge };
const ACTS = [actPoints, actTable, actLines, actReal, actChallenge];
const KEYS = { points: keyPoints, table: keyTable, lines: keyLines, curves: keyCurves, real: keyReal, challenge: keyChallenge };

export function view(ctx) {
  const t = tabOf(ctx);
  const seg = `<div class="seg t-graphs-seg" role="tablist">${TABS.map(([id, l]) => `<button role="tab" aria-selected="${id === t}" class="${id === t ? 'on' : ''}" data-act="lib" data-arg="tab|${id}">${l}</button>`).join('')}</div>`;
  return `<div class="t-graphs">${seg}${VIEWS[t](ctx)}${links(LINKS[t])}</div>`;
}
export function act(name, arg, ctx) {
  if (name === 'tab') { if (TABS.some((t) => t[0] === arg)) ctx.ui.tab = arg; return; }
  if (name === 'zoom') { if ([5, 10, 20].includes(+arg)) ctx.ui.R = +arg; return; }
  for (const f of ACTS) if (f(name, arg, ctx)) return;
}
export function key(e, ctx) {
  const t = tabOf(ctx);
  if (t !== 'challenge' && (e.key === '+' || e.key === '=' || e.key === '-')) {
    const Rs = [5, 10, 20], i = Rs.indexOf(Rof(ctx)); ctx.ui.R = Rs[clamp(i + (e.key === '-' ? 1 : -1), 0, 2)]; return true;
  }
  return !!KEYS[t](e, ctx);
}

export const CSS = `
.t-graphs-seg.seg{margin:0 auto 10px}
@media (min-width:761px){.t-graphs-seg.seg{flex-wrap:nowrap}}
.t-graphs-cols{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:760px){.t-graphs-cols{grid-template-columns:minmax(0,1fr)}}
.t-graphs-pic{text-align:center;padding-top:12px}
.t-graphs-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:8px 0}
.t-graphs-eqlab{display:flex;align-items:center;gap:8px;font-weight:650;flex-wrap:wrap}
.t-graphs-eq{flex:1;min-width:150px;padding:9px 12px;border-radius:var(--r-md);border:1.5px solid var(--line);background:var(--paper);color:var(--ink);font:700 17px var(--mono)}
.t-graphs-eq.short{flex:0 1 140px;min-width:110px}
.t-graphs-eq:focus{outline:none;border-color:var(--action)}
.t-graphs-eq.bad{border-color:var(--fix)}
.t-graphs-hint{display:block;color:var(--fix);font-size:var(--fs-label);margin:4px 0}
.t-graphs-slider{display:block;margin:6px 0;font-size:var(--fs-label)}
.t-graphs-slider input{display:block;width:100%;accent-color:var(--action);min-height:30px}
.t-graphs-lrow{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:var(--r-md);margin-bottom:6px}
.t-graphs-lrow.sel{background:var(--surface2)}
.t-graphs-lbody{flex:1;min-width:0}
.t-graphs-key{flex:none;width:34px;height:34px;border-radius:50%;border:0;color:var(--surface);font:800 15px var(--mono);cursor:pointer;display:inline-grid;place-items:center}
.t-graphs-key.mini{width:22px;height:22px;font-size:12px;vertical-align:middle}
.t-graphs-k0{background:var(--action)}.t-graphs-k1{background:var(--fix)}.t-graphs-k2{background:var(--mastered)}.t-graphs-k3{background:var(--medium)}
.t-graphs-meets{padding-left:18px;margin:8px 0}.t-graphs-meets li{margin:4px 0}
.t-graphs-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.t-graphs-x{border:0;background:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0 2px;min-width:24px;min-height:24px}
.t-graphs-tablewrap{overflow-x:auto;margin:10px 0}
.t-graphs-table{border-collapse:collapse;font-family:var(--mono)}
.t-graphs-table th,.t-graphs-table td{border:1px solid var(--line);padding:6px 10px;text-align:center}
.t-graphs-table th{background:var(--surface2)}
.t-graphs-work{font-family:var(--mono);font-size:var(--fs-label);margin:6px 0}
.t-graphs-note{background:var(--surface2);border-radius:var(--r-md);padding:8px 12px}
.t-graphs-note.win{background:color-mix(in srgb,var(--mastered) 14%,var(--surface));border-left:4px solid var(--mastered)}
.t-graphs-formula{font-family:var(--mono);background:var(--surface2);border-radius:var(--r-md);padding:10px 12px;line-height:1.7}
.t-graphs-big{font:800 22px var(--mono);color:var(--ink)}
.t-graphs-links{margin:6px 0 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.t-graphs-link{border:0;cursor:pointer;color:var(--action)}
.t-graphs-bg{fill:var(--surface);stroke:var(--line)}
.t-graphs-axis{stroke:var(--ink);stroke-width:1.8}
.t-graphs-n{font:600 10px var(--mono);fill:var(--muted)}
.t-graphs-ax{font:700 13px var(--ui);fill:var(--ink)}
.t-graphs-hit{fill:transparent;cursor:pointer}.t-graphs-hit:hover{fill:color-mix(in srgb,var(--action) 22%,transparent)}
.t-graphs-dot{fill:var(--action);stroke:var(--surface);stroke-width:1.5}
.t-graphs-cur{fill:none;stroke:var(--fix);stroke-width:3;pointer-events:none}
.t-graphs-tag{font:700 12px var(--mono);fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px}
.t-graphs-tag.strong{fill:var(--fix)}
.t-graphs-join{stroke:var(--action);stroke-width:2;stroke-linejoin:round}
.t-graphs-c0,.t-graphs-c1,.t-graphs-c2,.t-graphs-c3{stroke-width:2.6;stroke-linecap:round;fill:none}
.t-graphs-c0{stroke:var(--action)}.t-graphs-c1{stroke:var(--fix)}.t-graphs-c2{stroke:var(--mastered)}.t-graphs-c3{stroke:var(--medium)}
.t-graphs-c0.sel,.t-graphs-c1.sel,.t-graphs-c2.sel,.t-graphs-c3.sel{stroke-width:4}
.t-graphs-ref{stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4;fill:none}
.t-graphs-step{stroke:var(--ink);stroke-width:2;stroke-dasharray:5 3}
.t-graphs-steplab{font:800 12px var(--mono);fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:3px}
.t-graphs-icpt{fill:var(--surface);stroke:var(--ink);stroke-width:2.5}
.t-graphs-cross{fill:var(--fix);stroke:var(--surface);stroke-width:2}
.t-graphs-right{stroke:var(--ink);stroke-width:1.5}
.t-graphs-sym{stroke:var(--fix);stroke-width:1.5;stroke-dasharray:7 5}
.t-graphs-leg{stroke:var(--action);stroke-width:3;stroke-linecap:round}
.t-graphs-leg.sel{stroke:var(--fix);stroke-width:5}
.t-graphs-hitline{stroke:transparent;stroke-width:18;cursor:pointer}
.t-graphs-guide{stroke:var(--fix);stroke-width:1.6;stroke-dasharray:5 4}
`;

/* ========================================================== selftest */

export function selftest(ok, makeCtx) {
  const r = seeded('graphs-selftest'), near = (a, b, t = 1e-9) => Math.abs(a - b) < t;

  // --- the parser reads each notation to the right m and c
  const cases = [
    ['y=2x+1', 0, 2, 1], ['y = -x + 3', 0, -1, 3], ['y=x^2', 1, 0, 0], ['2x', 0, 2, 0], ['y = 3', 0, 0, 3], ['y=−2x−4', 0, -2, -4],
    ['y = 1/2x + 1', 0, 0.5, 1], ['y=x/2', 0, 0.5, 0], ['Y = 3X - 2', 0, 3, -2], ['y=0.5x', 0, 0.5, 0], ['y=4-x', 0, -1, 4], ['y=2x^2-3', 2, 0, -3],
    ['y = x² + 1', 1, 0, 1], ['2x+1=y', 0, 2, 1], ['y = 3 + 2x', 0, 2, 3], ['y=-x', 0, -1, 0], ['x', 0, 1, 0], ['y = 2*x + 5', 0, 2, 5], ['y=3x/4-1', 0, 0.75, -1],
    ['y = x^2 - 2x - 3', 1, -2, -3], ['y=-0.5x^2+4', -0.5, 0, 4], ['f(x) = 5x', 0, 5, 0], ['y = .5x + .5', 0, 0.5, 0.5], ['y = x + x', 0, 2, 0], ['y = 7', 0, 0, 7], ['y=-3', 0, 0, -3],
    ['y = 10x − 10', 0, 10, -10], ['y = x²', 1, 0, 0], ['y=2(x)', null], ['hello', null], ['y=2x+', null], ['y=', null], ['', null], ['y = mx + c', null], ['y=2x=3', null], ['y=2x^3', null], ['x+y=3', null],
  ];
  for (const [s, a, m, c] of cases) {
    const p = parseEq(s);
    if (a === null) ok(p === null, `parser rejects "${s}"`);
    else ok(p && p.vert === undefined && near(p.a, a) && near(p.m, m) && near(p.c, c), `parser: "${s}" → a ${a}, m ${m}, c ${c} (got ${JSON.stringify(p)})`);
  }
  ok(parseEq('x = 3').vert === 3 && parseEq('x=-2').vert === -2 && parseEq('3 = x').vert === 3, 'parser reads vertical lines');
  // round trip: what the tool writes, it reads back
  for (let i = 0; i < 400; i++) {
    const fn = { a: pick([0, 0, 0, 1, -1, 0.5, 2, -1.5], r), m: pick([0, 1, -1, 2, -3, 0.5, -0.5, 1 / 3, -2 / 3, 0.25, 1.5], r), c: pick([0, 1, -1, 4, -7, 0.5, 2.5, -1 / 3], r) };
    const p = parseEq(fmtEq(fn)); ok(p && near(p.a, fn.a) && near(p.m, fn.m) && near(p.c, fn.c), `round trip ${fmtEq(fn)}`);
    ok(!/undefined|NaN/.test(fmtEq(fn)), 'fmtEq clean');
  }
  ok(fmtEq({ vert: -2 }) === 'x = −2' && parseEq(fmtEq({ vert: -2 })).vert === -2, 'vertical round trip');
  ok(fmtEq({ a: 0, m: -1, c: 3 }) === 'y = −x + 3' && fmtEq({ a: 1, m: 0, c: 0 }) === 'y = x²' && fmtEq({ a: 0, m: 0.5, c: -2 }) === 'y = x/2 − 2', 'fmtEq reads naturally');

  // --- every plotted point of a line satisfies y = mx + c, and so does the drawing
  for (const R of [5, 10, 20]) {
    const pl = plane(R);
    for (let x = -R; x <= R; x++) for (const y of [-R, 0, R]) { const b = pl.inv(pl.S([x, y])); ok(near(b[0], x) && near(b[1], y), 'plane: screen ↔ grid'); }
    for (let i = 0; i < 150; i++) {
      const fn = { a: 0, m: pick([-5, -3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, 4.5], r), c: ri(-12, 12, r) };
      const e = lineEnds(fn, R);
      const inside = [...Array(401).keys()].some((k) => { const x = -R + (2 * R * k) / 400, y = yAt(fn, x); return Math.abs(y) <= R; });
      ok(!!e === inside, `line ${fmtEq(fn)} on ±${R}: drawn iff it crosses the grid`);
      if (!e) continue;
      for (const p of e) { ok(near(p[1], fn.m * p[0] + fn.c, 1e-9), `line end on ${fmtEq(fn)}`); ok(Math.abs(p[0]) <= R + 1e-9 && Math.abs(p[1]) <= R + 1e-9, 'line end inside the grid'); }
      const svg = drawFn(fn, pl, 'x'), mt = svg.match(/x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/);
      ok(!!mt, 'line drawn');
      if (mt) { const tol = (0.06 / pl.k) * (1 + Math.abs(fn.m)); for (const [sx, sy] of [[+mt[1], +mt[2]], [+mt[3], +mt[4]]]) { const [x, y] = pl.inv([sx, sy]); ok(Math.abs(y - (fn.m * x + fn.c)) < tol, `drawn pixel lies on ${fmtEq(fn)}`); } }
    }
    for (let i = 0; i < 60; i++) {
      const fn = { a: pick([-2, -1, -0.5, 0.5, 1, 3], r), m: ri(-3, 3, r), c: ri(-8, 8, r) };
      for (const run of curveRuns(fn, R)) for (const p of run) ok(near(p[1], fn.a * p[0] * p[0] + fn.m * p[0] + fn.c, 1e-9), `curve point on ${fmtEq(fn)}`);
      const svg = drawFn(fn, pl, 'x'); for (const pr of [...svg.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].slice(0, 40)) { const [x, y] = pl.inv([+pr[1], +pr[2]]); ok(Math.abs(y - yAt(fn, x)) < (0.06 / pl.k) * (1 + Math.abs(2 * fn.a * x + fn.m)) + 1e-6, `drawn curve pixel on ${fmtEq(fn)}`); }
    }
  }
  // the step triangle's rise over run is the gradient
  for (const m of [-4, -2.5, -1, -0.5, 1 / 3, 0.5, 1, 2, 3, 0.25]) for (const c of [-3, 0, 5]) {
    const st = stepTriangle({ a: 0, m, c }, 10);
    ok(st && near(st.rise / st.run, m) && near(st.p[1], c) && near(st.t[1], m * st.t[0] + c), `step triangle m=${m}`);
    ok(Number.isInteger(Math.round(st.rise * 1e6) / 1e6) || stepRun(m) === 1, `step triangle rise is whole when it can be (m=${m})`);
  }
  ok(/up <b>2<\/b> for every <b>1<\/b>/i.test(gradientWords(2)) && /down <b>0.5<\/b>.*down 1 for every 2 across/i.test(gradientWords(-0.5)), 'gradient in words');

  // --- crossings satisfy both graphs
  const on = (fn, p, t = 1e-7) => (fn.vert !== undefined ? near(p[0], fn.vert, t) : Math.abs(yAt(fn, p[0]) - p[1]) < t);
  for (let i = 0; i < 600; i++) {
    const mk = () => (r() < 0.1 ? { vert: ri(-6, 6, r) } : { a: r() < 0.25 ? pick([-1, 0.5, 1, 2], r) : 0, m: pick([-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3], r), c: ri(-8, 8, r) });
    const f = mk(), g = mk(), x = crossings(f, g);
    for (const p of x.pts) ok(on(f, p) && on(g, p), `crossing ${ptStr(p)} lies on ${fmtEq(f)} and ${fmtEq(g)}`);
    if (isLine(f) && isLine(g)) {
      if (f.m === g.m) ok(x.kind === (f.c === g.c ? 'same' : 'parallel') && !x.pts.length, 'equal gradients: parallel or the same');
      else ok(x.pts.length === 1, 'different gradients meet once');
    }
    // brute force: a sign change of f − g on a fine grid means a crossing was found there
    if (f.vert === undefined && g.vert === undefined) {
      const d = (xx) => yAt(f, xx) - yAt(g, xx);
      for (let k = -200; k < 200; k++) { const x0 = k / 10, x1 = (k + 1) / 10; if (d(x0) * d(x1) < 0) ok(x.pts.some((p) => p[0] >= x0 - 1e-9 && p[0] <= x1 + 1e-9), `a crossing between ${x0} and ${x1} was found`); }
    }
  }
  ok(ptStr([1 / 3, -2.5]) === '(1/3, −5/2)' && ptStr([2, 0]) === '(2, 0)', 'exact crossing coordinates');
  // perpendicular and parallel buttons make what they say
  {
    const ctx = makeCtx('graphs', '11-14'); act('tab', 'lines', ctx); view(ctx);
    for (const [m, c] of [[2, 1], [-0.5, 3], [3, -2], [0, 4], [1 / 3, 0]]) {
      ctx.ui.nL = 1; ctx.ui.sel = 0; setSlot(ctx, 'eq0', { a: 0, m, c }, lsl(0)); act('lperp', '', ctx); view(ctx);
      const f = ctx.ui.F.eq0, g = ctx.ui.F.eq1, x = crossings(f, g);
      ok(ctx.ui.nL === 2 && (m ? near(f.m * g.m, -1) : g.vert === 0), `perpendicular to m=${m}`);
      ok(x.pts.length === 1 && near(x.pts[0][0], 0) && near(x.pts[0][1], c), `perpendicular meets at the intercept (m=${m})`);
      ok(lineFacts([f, g])[0].perp, 'marked perpendicular');
      const h = view(ctx); ok(h.includes('right angle') && h.includes('t-graphs-right'), 'right angle drawn and named');
      ctx.ui.nL = 1; act('lpar', '', ctx); view(ctx);
      ok(near(ctx.ui.F.eq1.m, m) && crossings(ctx.ui.F.eq0, ctx.ui.F.eq1).kind === 'parallel' && view(ctx).includes('parallel'), `parallel to m=${m}`);
    }
  }

  // --- real-world graphs: the gradient of each leg is the speed stated
  for (let i = 0; i < 300; i++) {
    const J = newJourney(r); let t = 0, d = 0;
    J.segs.forEach((sgm, k) => {
      ok(sgm.t0 === t && near(sgm.d0, d), 'journey is continuous');
      ok(sgm.t1 > sgm.t0 && sgm.d1 >= -1e-9, 'journey goes forward in time and never below home');
      ok(near((sgm.d1 - sgm.d0) / ((sgm.t1 - sgm.t0) / 60), sgm.v), `leg ${k}: gradient ${sgm.d1 - sgm.d0}/${sgm.t1 - sgm.t0} min is ${sgm.v} km/h`);
      t = sgm.t1; d = sgm.d1;
    });
    const top = Math.max(...J.segs.map((x) => Math.abs(x.v)));
    ok(Math.abs(J.segs[J.fast].v) === top && J.segs.filter((x) => Math.abs(x.v) === top).length === 1, 'one fastest leg, correctly named');
  }
  for (const [k, C] of Object.entries(CONV)) for (let x = C.x0; x <= C.x1; x++) {
    const y = C.k * x + C.b;
    if (k === 'inch') ok(near(y, x * 2.54), 'inches'); if (k === 'mile') ok(near(y, x * 1.609344), 'miles'); if (k === 'temp') ok(near(y, (x * 9) / 5 + 32), 'temperature');
  }
  ok(near(CONV.temp.k * 100 + CONV.temp.b, 212) && near(CONV.temp.k * -40 + CONV.temp.b, -40), 'water boils at 212 °F; −40 is the same in both');

  // --- challenges are fair and checked
  for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 120; i++) {
    const th = newChallenge('through', band, r), m = (th.P2[1] - th.P1[1]) / (th.P2[0] - th.P1[0]), c = th.P1[1] - m * th.P1[0];
    ok(th.P1[0] !== th.P2[0] && near(th.P2[1], m * th.P2[0] + c), 'through: a line fits');
    ok([...th.P1, ...th.P2].every((v) => Number.isInteger(v) && Math.abs(v) <= 10), 'through: whole-number points on the grid');
    const st = newChallenge('steeper', band, r); ok(Math.abs(st[st.ans].m) > Math.abs(st[st.ans === 'A' ? 'B' : 'A'].m), 'steeper: answer is the bigger gradient');
    const nm = newChallenge('name', band, r); ok(lineEnds(nm.fn, 10) && parseEq(fmtEq(nm.fn)) && near(parseEq(fmtEq(nm.fn)).m, nm.fn.m), 'name: visible and nameable');
  }

  // --- flows on fake contexts
  for (const band of ['6-7', '8-10', '11-14']) {
    const ctx = makeCtx('graphs', band); let ticks = 0; ctx.tick = () => { ticks++; };
    const clean = (where) => { const h = view(ctx); ok(typeof h === 'string' && h.length > 200 && !/undefined|NaN|\[object Object\]/.test(h), `${band} ${where}: view clean`); return h; };
    clean('start');
    for (const [t] of TABS) { act('tab', t, ctx); ok(tabOf(ctx) === t, `tab ${t}`); for (const R of [5, 10, 20]) { act('zoom', String(R), ctx); clean(`${t} ±${R}`); } }
    act('zoom', '10', ctx);
    // points: by tap, by keys, by typing
    act('tab', 'points', ctx); act('ptat', '3,-2', ctx); ok(ctx.ui.pts.length === 1 && ctx.ui.pts[0][0] === 3 && ctx.ui.pts[0][1] === -2, 'tap plots a point');
    ctx.ui.cur = [0, 0]; key({ key: 'ArrowRight' }, ctx); key({ key: 'ArrowRight' }, ctx); key({ key: 'ArrowUp' }, ctx); key({ key: 'Enter' }, ctx);
    ok(ctx.ui.pts.length === 2 && ctx.ui.pts[1].join() === '2,1', 'arrows + Enter plot a point');
    for (const [s, x, y] of [['(4, -1)', 4, -1], ['(−3,5)', -3, 5], ['2 7', 2, 7], ['[0; -6]', 0, -6]]) { ctx.ui.ptxt = s; act('ptadd', '', ctx); const p = ctx.ui.pts.at(-1); ok(p[0] === x && p[1] === y, `typed point ${s}`); }
    ctx.ui.ptxt = '<img src=x>'; const hp = clean('bad point'); ok(!hp.includes('<img src=x>'), 'typed text is escaped');
    key({ key: 'Backspace' }, ctx); ok(ctx.ui.pts.length === 5, 'Backspace removes the last point');
    act('ptjoin', '', ctx); ok(clean('joined').includes('t-graphs-join'), 'join the dots');
    act('ptdel', '0', ctx); ok(ctx.ui.pts.length === 4, 'remove a point');
    // table: the plotted points satisfy the rule
    act('tab', 'table', ctx); ctx.ui.teq = 'y = 3x - 2'; act('tplot', '', ctx); const ht = clean('table');
    for (let x = -3; x <= 3; x++) ok(ht.includes(`<b>${num(3 * x - 2)}</b>`), `table y at x=${x}`);
    const pl = plane(10); for (const mt of ht.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="5" class="t-graphs-dot"/g)) { const [x, y] = pl.inv([+mt[1], +mt[2]]); ok(Math.abs(y - (3 * x - 2)) < 0.02, 'table point drawn on its line'); }
    key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.tx0 === -2, 'arrow slides the table');
    ctx.ui.teq = 'y = x^2 - 4'; act('tjoin', '', ctx); ok(clean('table curve').includes('polyline'), 'table joins a curve');
    ctx.ui.teq = 'x = 3'; clean('table vertical'); ctx.ui.teq = 'nonsense'; ok(clean('table bad').includes('Type an equation'), 'table asks for a rule');
    // lines: sliders and typing are the same line
    act('tab', 'lines', ctx); view(ctx);
    ctx.ui.eq0 = 'y = -2x + 5'; view(ctx); ok(ctx.ui.m0 === '-2' && ctx.ui.c0 === '5', 'typing moves the sliders');
    ctx.ui.m0 = '1.5'; view(ctx); ok(ctx.ui.eq0 === 'y = 3x/2 + 5' && near(ctx.ui.F.eq0.m, 1.5), `slider rewrites the equation (${ctx.ui.eq0})`);
    ctx.ui.eq0 = 'y = 2x +'; const hb = clean('half typed'); ok(ctx.ui.eq0 === 'y = 2x +' && hb.includes('can’t read') && near(ctx.ui.F.eq0.m, 1.5), 'a half-typed equation is kept, not overwritten');
    ctx.ui.eq0 = 'y = 2x + 1'; ctx.ui.eq1 = 'y = -x + 4'; const hl = clean('two lines'); ok(hl.includes('(1, 3)'), 'crossing (1, 3) labelled');
    ok(hl.includes('Up <b>2</b> for every <b>1</b> across'), 'gradient words shown');
    ctx.ui.sel = 0; key({ key: 'ArrowRight' }, ctx); view(ctx); ok(near(ctx.ui.F.eq0.m, 2.5), 'arrow steepens the line');
    key({ key: 'ArrowUp' }, ctx); view(ctx); ok(near(ctx.ui.F.eq0.c, 2), 'arrow lifts the line');
    key({ key: '2' }, ctx); ok(ctx.ui.sel === 1, 'number key picks a line');
    act('ladd', '', ctx); act('ladd', '', ctx); ok(ctx.ui.nL === 4, 'four lines'); clean('four lines');
    act('lsel', '1', ctx); act('ldel', '', ctx); view(ctx); ok(ctx.ui.nL === 3 && near(ctx.ui.F.eq1.m, LDEF[2].m), 'removing a line shifts the rest up');
    ctx.ui.eq2 = 'x = 4'; act('lsel', '2', ctx); ok(clean('vertical').includes('straight up and down'), 'vertical line explained');
    // curves
    act('tab', 'curves', ctx); ctx.ui.qeq = 'y = x^2 - 2x - 3'; const hq = clean('curve'); ok(hq.includes('(1, −4)') && hq.includes('x = −1 and x = 3'), 'vertex (1, −4), roots −1 and 3');
    ctx.ui.qa = '-1'; const hq2 = clean('curve turned'); ok(near(ctx.ui.F.qeq.a, -1) && hq2.includes('upside-down'), 'negative a turns it over');
    key({ key: 'ArrowUp' }, ctx); view(ctx); ok(near(ctx.ui.F.qeq.c, -2), 'arrow slides the curve up');
    ctx.ui.qeq = 'y = x^2 + 1'; ok(clean('no roots').includes('never touches'), 'no real roots');
    ctx.ui.qeq = 'y = 2x'; clean('curve that is a line');
    // real life
    act('tab', 'real', ctx); clean('journey');
    const J = ctx.ui.jr; while ((ctx.ui.jsel || 0) < J.fast) key({ key: 'ArrowRight' }, ctx);
    const tb = ticks; key({ key: 'Enter' }, ctx); ok(J.answered === J.fast && ticks === tb + 1, 'fastest leg by keys');
    const hj = clean('journey answered'); ok(hj.includes('steepest'), 'fastest explained as steepest');
    act('jnew', '', ctx); act('jsel', String((ctx.ui.jr.fast + 1) % ctx.ui.jr.segs.length), ctx); act('jans', '', ctx); ok(ctx.ui.jr.answered !== ctx.ui.jr.fast && ticks === tb + 1, 'wrong leg does not tick');
    act('rk', 'conv', ctx);
    for (const k of Object.keys(CONV)) { act('ck', k, ctx); ctx.ui.cx = '10'; const hc = clean(`conversion ${k}`); ok(hc.includes(num(CONV[k].k * 10 + CONV[k].b, 2)), `conversion ${k} reads 10`); key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.cx === '11', 'arrow moves the reader'); }
    // challenges
    act('tab', 'challenge', ctx); act('chkind', 'through', ctx);
    const ch = ctx.ui.ch, m = (ch.P2[1] - ch.P1[1]) / (ch.P2[0] - ch.P1[0]), c = ch.P1[1] - m * ch.P1[0];
    view(ctx); ctx.ui.chq = 'y = 100x'; view(ctx); act('chcheck', '', ctx); ok(!ch.done, 'a wrong line is not accepted');
    ctx.ui.chq = fmtEq({ a: 0, m, c }); view(ctx); const tc = ticks; act('chcheck', '', ctx); ok(ch.done && ticks === tc + 1, `the right line is accepted (${fmtEq({ a: 0, m, c })})`);
    clean('through done');
    act('chnew', '', ctx); const ch2 = ctx.ui.ch; view(ctx);
    const m2 = (ch2.P2[1] - ch2.P1[1]) / (ch2.P2[0] - ch2.P1[0]), c2 = ch2.P1[1] - m2 * ch2.P1[0];
    ctx.ui.chm = '0'; ctx.ui.chc = '0'; view(ctx);
    for (let k = 0; k < 40 && Math.abs(ctx.ui.F.chq.m - m2) > EPS; k++) { key({ key: ctx.ui.F.chq.m < m2 ? 'ArrowRight' : 'ArrowLeft' }, ctx); view(ctx); }
    for (let k = 0; k < 40 && Math.abs(ctx.ui.F.chq.c - c2) > EPS; k++) { key({ key: ctx.ui.F.chq.c < c2 ? 'ArrowUp' : 'ArrowDown' }, ctx); view(ctx); }
    key({ key: 'Enter' }, ctx); ok(ch2.done, 'through two points solved with the keys alone');
    act('chshow', '', ctx);
    act('chkind', 'steeper', ctx); const s1 = ctx.ui.ch; key({ key: s1.ans.toLowerCase() }, ctx); ok(s1.done && s1.got === s1.ans, 'steeper by key'); clean('steeper done');
    act('chnew', '', ctx); const s2 = ctx.ui.ch; act('chpick', s2.ans === 'A' ? 'B' : 'A', ctx); ok(s2.done && s2.got !== s2.ans, 'steeper wrong pick'); clean('steeper wrong');
    act('chkind', 'name', ctx); const n1 = ctx.ui.ch; ctx.ui.chn = 'y = 99x'; act('chcheck', '', ctx); ok(!n1.done, 'name: wrong'); clean('name wrong');
    ctx.ui.chn = `y=${n1.fn.m}x+${n1.fn.c}`.replace('+-', '-'); act('chcheck', '', ctx); ok(n1.done, `name: right as typed (${ctx.ui.chn})`);
    ok(ctx.data.chRight >= 3, 'challenge wins saved');
    // zoom keys
    act('tab', 'lines', ctx); act('zoom', '10', ctx); key({ key: '-' }, ctx); ok(Rof(ctx) === 20, 'minus zooms out'); key({ key: '+' }, ctx); key({ key: '+' }, ctx); ok(Rof(ctx) === 5, 'plus zooms in');
  }
  for (const id of Object.values(LINKS).flat()) ok(!!byId[id], `Atlas stop ${id} exists`);
  ok(['line-graph', 'nth-term', 'coordinates-and-moves'].every((id) => Object.values(LINKS).flat().includes(id)), 'links the three Atlas stops');
  ok(CSS.replace(/@media[^{]*\{/g, '').split('}').map((x) => x.split('{')[0].trim()).filter(Boolean).every((sel) => sel.split(',').every((s) => /^\.t-graphs-/.test(s.trim()))), 'every CSS class is prefixed t-graphs-');
  ok(!/#[0-9a-fA-F]{3,6}\b|rgb\(/.test(CSS), 'CSS colours come from variables');
}
