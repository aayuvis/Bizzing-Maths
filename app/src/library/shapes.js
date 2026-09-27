/* shapes.js — Shape Studio (docs/LIBRARY-CONTRACT.md).

   Seven workbenches, one idea: every number on the screen is measured from the
   drawing, or the drawing is built from the number, so the two can never
   disagree.

     Protractor   an angle and a protractor the child turns and reads; then
                  "estimate first" rounds scored by how close they came
     Polygons     3–12 sides, regular or not: symmetry found by actually
                  reflecting the corners, the angle sum shown as a fan of
                  triangles, and which regular shapes tile a floor
     Area         a squared grid to build on (perimeter counted edge by edge),
                  challenges, and formula panels drawn to scale
     Circle       r, d, C and A, with the circle unrolled and cut into slices
     3D & nets    solids built as real vertex/face models: F, E and V counted
                  from the model, the net unfolded from it, a cuboid's volume
                  and surface area on sliders
     Moves        reflect, rotate and translate on a grid — predict, then look
     Construct    ruler-and-compass constructions, one arc or line at a time:
                  perpendicular and angle bisectors, a triangle from three
                  sides (and why some cannot be built), a perpendicular from
                  a point, an equilateral triangle, copying an angle

   Touch and keyboard for everything: the protractor turns by tapping its rim
   or with ← →; the grids take taps or arrows + space; sliders are native
   ranges (drag, or arrows when focused) and ← → ↑ ↓ work on the page too;
   a construction steps with ← → and its points are tapped, then nudged with
   the arrows or the on-screen pad. */

import * as kit from '../chapters/kit.js';
import { byId } from '../tricks.js';
import { fold } from '../puzzles.js';
import { seeded } from '../rand.js';

export const TOOL = {
  id: 'shapes', name: 'Shape Studio',
  blurb: 'Measure angles with a protractor, build shapes on a grid, fold solids flat and move shapes about — and see why every rule is true.',
  art: 'lib-shapes',
};

/* ------------------------------------------------------------ helpers */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RAD = Math.PI / 180;
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const f1 = (x) => String(+(+x).toFixed(1));
/* a number for reading: rounded, no trailing zeros, a real minus sign */
const num = (x, dp = 2) => String(+(+x).toFixed(dp)).replace('-', '−');
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
/* a whole-number setting kept in ui (range inputs write strings) */
function gv(ui, k, d, lo, hi) {
  const raw = ui[k]; if (raw === undefined || raw === null || raw === '') return d;
  const v = Math.round(Number(raw)); return Number.isFinite(v) ? clamp(v, lo, hi) : d;
}
const P = (pts) => pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const line = (a, b, cls) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="${cls}"/>`;
const T = kit.text;
const onButton = (e) => !!(e && e.target && e.target.closest && e.target.closest('button,a,select,[data-act]'));

function links(ids) {
  const real = ids.filter((id) => byId[id]);
  if (!real.length) return '';
  return `<div class="t-shapes-links"><span class="muted">In the Atlas:</span> ${real.map((id) =>
    `<button class="chip t-shapes-link" data-act="openStop" data-arg="${id}">${esc(byId[id].title)}</button>`).join(' ')}</div>`;
}
const LINKS = {
  protractor: ['kinds-of-angle', 'angles-on-a-line', 'angles-in-a-shape'],
  polygon: ['sides-and-corners', 'lines-of-symmetry', 'angles-in-a-shape'],
  area: ['perimeter', 'area-rectangles', 'compound-area', 'area-triangles'],
  circle: ['round-the-circle'],
  solids: ['faces-edges-vertices', 'volume-cuboid'],
  moves: ['coordinates-and-moves', 'lines-of-symmetry'],
};

const BENCHES = [
  ['protractor', '📐 Protractor'], ['polygon', '⬡ Polygons'], ['area', '▦ Area'],
  ['circle', '◯ Circle'], ['solids', '🧊 3D & nets'], ['moves', '↔ Moves'], ['construct', '⌒ Construct'],
];

/* =================================================== 1. the protractor */

function angleType(t) {
  if (t < 90) return ['acute', 'less than a right angle'];
  if (t === 90) return ['right', 'exactly a quarter turn'];
  if (t < 180) return ['obtuse', 'between a right angle and a straight line'];
  if (t === 180) return ['straight', 'a half turn — a straight line'];
  return ['reflex', 'more than a half turn'];
}
function newAngle(band, r = Math.random) {
  const reflex = band === '11-14' && r() < 0.3;
  let theta = reflex ? 185 + Math.floor(r() * 171) : 8 + Math.floor(r() * 165);
  if (band === '6-7') theta = 5 * Math.round(theta / 5);
  const base = band === '6-7' ? 0 : 5 * Math.floor(r() * 72);
  return { theta, base };
}
/* Where an arm crosses the protractor's two scales, or null if it is behind
   it. The inside scale counts from the zero at `rot`, the outside scale from
   the zero at the other end of the baseline. */
function scaleAt(d, rot) { const v = mod(Math.round(d - rot), 360); return v <= 180 ? { inner: v, outer: 180 - v } : null; }
/* Reading the protractor: the gap between the arms along the scale. */
function readProtractor(theta, base, rot) {
  const a1 = scaleAt(base, rot), a2 = scaleAt(base + theta, rot);
  if (!a1 || !a2) return { ok: false, off: (!a1) + (!a2) };
  const zeroed = a1.inner === 0 || a1.outer === 0 || a2.inner === 0 || a2.outer === 0;
  const r = Math.abs(a1.inner - a2.inner);
  return { ok: true, zeroed, r, a1, a2, angle: theta > 180 ? 360 - r : r };
}
function prot(ctx) {
  const ui = ctx.ui;
  if (!ui.p) ui.p = { ...newAngle(ctx.band), rot: 0, shown: false, mode: 'measure', own: false, msg: '' };
  const p = ui.p;
  if (p.own) { p.theta = gv(ui, 'pang', p.theta, 1, ctx.band === '11-14' ? 359 : 179); if (p.theta === 180) p.theta = 179; }
  if (!ui.e) ui.e = { round: 1, stars: 0, shown: false, log: [] };
  return p;
}
const P_C = 210, P_R = 165;
const pat = (d, r) => [P_C + r * Math.cos(d * RAD), P_C - r * Math.sin(d * RAD)];
function protractorSVG(theta, base, rot, { proto = true, label = '?', hits = true } = {}) {
  let s = '';
  const a2 = base + theta, ar = 30, s1 = pat(base, ar), s2 = pat(a2, ar);
  s += `<path d="M${P_C},${P_C} L${f1(s1[0])},${f1(s1[1])} A${ar},${ar} 0 ${theta > 180 ? 1 : 0} 0 ${f1(s2[0])},${f1(s2[1])} Z" class="t-shapes-wedge"/>`;
  if (proto) {
    const e0 = pat(rot, P_R), e1 = pat(rot + 180, P_R), i0 = pat(rot, P_R - 46), i1 = pat(rot + 180, P_R - 46);
    s += `<path d="M${f1(e0[0])},${f1(e0[1])} A${P_R},${P_R} 0 0 0 ${f1(e1[0])},${f1(e1[1])} Z" class="t-shapes-proto"/>`;
    s += `<path d="M${f1(i0[0])},${f1(i0[1])} A${P_R - 46},${P_R - 46} 0 0 0 ${f1(i1[0])},${f1(i1[1])}" class="t-shapes-proto2"/>`;
    for (let k = 0; k <= 180; k++) {
      const d = rot + k, len = k % 10 === 0 ? 13 : k % 5 === 0 ? 9 : 5;
      s += line(pat(d, P_R), pat(d, P_R - len), k % 10 === 0 ? 't-shapes-tick big' : 't-shapes-tick');
      if (k % 10 === 0) {
        const o = pat(d, P_R - 22), i = pat(d, P_R - 40), rt = f1(90 - d);
        s += `<text x="${f1(o[0])}" y="${f1(o[1])}" class="t-shapes-pt out" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rt} ${f1(o[0])} ${f1(o[1])})">${180 - k}</text>`;
        s += `<text x="${f1(i[0])}" y="${f1(i[1])}" class="t-shapes-pt in" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rt} ${f1(i[0])} ${f1(i[1])})">${k}</text>`;
      }
    }
    s += line(pat(rot + 180, P_R + 4), pat(rot, P_R + 4), 't-shapes-base');
    s += line([P_C, P_C], pat(rot + 90, 12), 't-shapes-base');
  }
  s += line([P_C, P_C], pat(base, 200), 't-shapes-arm') + line([P_C, P_C], pat(a2, 200), 't-shapes-arm');
  s += `<circle cx="${P_C}" cy="${P_C}" r="4" class="t-shapes-vtx"/>`;
  if (label) { const lp = pat(base + theta / 2, theta < 30 ? 58 : 46); s += T(f1(lp[0]), f1(lp[1] + 5), label, 'dg-accent'); }
  if (hits) for (let d = 0; d < 360; d += 5) { const h = pat(d, P_R + 14); s += `<circle cx="${f1(h[0])}" cy="${f1(h[1])}" r="11" class="t-shapes-hit" data-act="lib" data-arg="rot|${d}"><title>Swing the zero line here</title></circle>`; }
  return kit.svg(420, 420, s, 'An angle with a protractor laid on it');
}
function viewProtractor(ctx) {
  const p = prot(ctx), ui = ctx.ui, e = ui.e;
  const seg = `<div class="seg small">${[['measure', 'Measure it'], ['estimate', 'Estimate first']].map(([m, l]) =>
    `<button class="${p.mode === m ? 'on' : ''}" data-act="lib" data-arg="pmode|${m}">${l}</button>`).join('')}</div>`;
  if (p.mode === 'estimate') {
    const est = ui.est === undefined ? '' : ui.est;
    const pic = protractorSVG(e.theta, e.base, e.theta > 180 ? e.base + e.theta : e.base, { proto: e.shown, label: e.shown ? `${e.theta}°` : '?', hits: false });
    let side;
    if (!e.shown) {
      side = `<p class="kicker">Round ${e.round} of 5 · ★ ${e.stars}</p>
        <p>How big is this angle? Guess first — no protractor yet.</p>
        <div class="row gap t-shapes-row"><button class="btn small" data-act="lib" data-arg="est|-10">−10</button><button class="btn small" data-act="lib" data-arg="est|-1">−1</button>
        <input id="t-shapes-est" class="t-shapes-in" data-lib-input="est" inputmode="numeric" autocomplete="off" aria-label="Your estimate in degrees" value="${esc(est)}" placeholder="°">
        <button class="btn small" data-act="lib" data-arg="est|1">+1</button><button class="btn small" data-act="lib" data-arg="est|10">+10</button></div>
        <p><button class="btn primary" data-act="lib" data-arg="echeck">Check my guess</button></p>
        <p class="muted">Tip: a right angle is 90°, a straight line 180°. Is it more or less? ← → change your guess, Enter checks.</p>`;
    } else {
      const last = e.log[e.log.length - 1] || { guess: 0, diff: 0, stars: 0 };
      const [ty, why] = angleType(e.theta);
      side = `<p class="kicker">Round ${e.round} of 5 · ★ ${e.stars}</p>
        <p class="t-shapes-big">${e.theta}°</p>
        <p>You said <b>${last.guess}°</b> — ${last.diff === 0 ? 'spot on!' : `${last.diff}° away.`} ${'★'.repeat(last.stars)}${'☆'.repeat(3 - last.stars)}</p>
        <p>It is <b>${ty}</b>: ${why}.</p>
        ${e.theta > 180 ? `<p class="muted">The protractor reads the small angle outside, ${360 - e.theta}°. 360 − ${360 - e.theta} = ${e.theta}.</p>` : ''}
        ${e.round < 5 ? `<button class="btn primary" data-act="lib" data-arg="enext">Next angle</button>`
          : `<p><b>Five rounds: ${e.stars} stars out of 15.</b> ${ctx.data.estBest ? `Your best: ${ctx.data.estBest}.` : ''}</p><button class="btn primary" data-act="lib" data-arg="enext">Play again</button>`}`;
    }
    return seg + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${pic}</div><div class="card">${side}</div></div>`;
  }
  const rd = readProtractor(p.theta, p.base, p.rot);
  let msg = '';
  if (p.shown) {
    if (!rd.ok) msg = `<p>${rd.off === 2 ? 'Both arms are' : 'One arm is'} behind the protractor. Turn it until both arms cross the numbers.</p>`;
    else {
      const [ty, why] = angleType(p.theta);
      msg = rd.zeroed
        ? `<p>One arm sits on <b>0</b>, so read the other arm on the <b>same</b> scale: <b>${rd.r}°</b>.</p>`
        : `<p>Neither arm is on 0 — so count the gap on the inside scale: from ${Math.min(rd.a1.inner, rd.a2.inner)} to ${Math.max(rd.a1.inner, rd.a2.inner)} is <b>${rd.r}°</b>. (Lining up 0 is easier.)</p>`;
      if (p.theta > 180) msg += `<p>This angle goes the long way round, so it is ${360}° − ${rd.r}° = <b>${rd.angle}°</b>.</p>`;
      msg += `<p class="t-shapes-big">${rd.angle}°</p><p>It is <b>${ty}</b>: ${why}.</p>`;
    }
  }
  const own = p.own ? `<label class="t-shapes-slider">Your angle: <b>${p.theta}°</b>
      <input type="range" id="t-shapes-pang" data-lib-input="pang" min="1" max="${ctx.band === '11-14' ? 359 : 179}" value="${p.theta}" aria-label="Angle to draw"></label>` : '';
  const side = `<p>Put the centre on the corner (it is already there). Turn the protractor until <b>0</b> lies along one arm, then read where the other arm crosses the <b>same</b> scale.</p>
    <div class="row gap t-shapes-row">
      <button class="btn small" data-act="lib" data-arg="turn|10" aria-label="Turn anticlockwise 10 degrees">⟲ 10°</button>
      <button class="btn small" data-act="lib" data-arg="turn|1" aria-label="Turn anticlockwise 1 degree">⟲ 1°</button>
      <button class="btn small" data-act="lib" data-arg="turn|-1" aria-label="Turn clockwise 1 degree">⟳ 1°</button>
      <button class="btn small" data-act="lib" data-arg="turn|-10" aria-label="Turn clockwise 10 degrees">⟳ 10°</button></div>
    <p class="muted">Tap the rim to swing the zero line there. Keys: ← → turn (Shift for 10°), Enter reads.</p>
    <div class="row gap t-shapes-row"><button class="btn primary" data-act="lib" data-arg="pread">Read it</button>
      <button class="btn" data-act="lib" data-arg="pnew">New angle</button>
      <button class="btn ghost" data-act="lib" data-arg="pown">${p.own ? 'Random angles' : 'Draw my own'}</button></div>
    ${own}
    ${p.shown ? '' : `<div class="row gap t-shapes-row"><input id="t-shapes-pread" class="t-shapes-in" data-lib-input="pread" inputmode="numeric" autocomplete="off" aria-label="What you read, in degrees" placeholder="°" value="${esc(ui.pread || '')}"><button class="btn small" data-act="lib" data-arg="pcheck">Check my reading</button></div>`}
    ${p.msg ? `<p class="t-shapes-note">${esc(p.msg)}</p>` : ''}
    ${msg}`;
  return seg + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${protractorSVG(p.theta, p.base, p.rot, { label: p.shown && rd.ok ? `${rd.angle}°` : '?' })}</div><div class="card">${side}</div></div>`;
}
function actProtractor(name, arg, ctx) {
  const p = prot(ctx), ui = ctx.ui, e = ui.e;
  if (name === 'pmode') { p.mode = arg === 'estimate' ? 'estimate' : 'measure'; if (p.mode === 'estimate' && e.theta === undefined) Object.assign(e, newAngle(ctx.band)); return true; }
  if (name === 'rot') { p.rot = mod(Math.round(+arg || 0), 360); p.shown = false; p.msg = ''; ctx.sfx.click(); return true; }
  if (name === 'turn') { p.rot = mod(p.rot + (Math.round(+arg) || 0), 360); p.shown = false; p.msg = ''; return true; }
  if (name === 'pread') { p.shown = true; ctx.data.measured = (ctx.data.measured || 0) + 1; ctx.save(); return true; }
  if (name === 'pnew') { Object.assign(p, newAngle(ctx.band), { rot: 0, shown: false, msg: '', own: false }); ui.pread = ''; return true; }
  if (name === 'pown') { p.own = !p.own; if (p.own) ui.pang = String(p.theta); else Object.assign(p, newAngle(ctx.band)); p.shown = false; p.msg = ''; return true; }
  if (name === 'pcheck') {
    const g = Math.round(Number(String(ui.pread || '').replace(/[^0-9.]/g, '')));
    if (!ui.pread || !Number.isFinite(g)) { p.msg = 'Type the number you read first.'; return true; }
    if (g === p.theta) { p.msg = `Yes — ${g}°. Well measured.`; p.shown = true; ctx.sfx.good(); ctx.tick(true, 2); ctx.data.measuredRight = (ctx.data.measuredRight || 0) + 1; ctx.save(); }
    else if (g === 180 - p.theta || (p.theta > 180 && g === 360 - p.theta)) { p.msg = `${g}° is the reading on the other scale, or the angle on the other side. Which scale starts at 0 on your arm?`; ctx.sfx.bad(); }
    else { p.msg = `Not quite. Is ${g}° ${angleType(g)[0]}? Look at the angle — is it ${angleType(p.theta)[0] === angleType(g)[0] ? 'close' : 'the same kind'}? Line 0 up on an arm and try again.`; ctx.sfx.bad(); }
    return true;
  }
  if (name === 'est') { const cur = Math.round(Number(ui.est)) || 90; ui.est = String(clamp(cur + (Math.round(+arg) || 0), 0, 360)); return true; }
  if (name === 'echeck') {
    if (e.shown) return true;
    const g = Math.round(Number(String(ui.est === undefined ? '' : ui.est).replace(/[^0-9.]/g, '')));
    if (ui.est === undefined || ui.est === '' || !Number.isFinite(g)) { ctx.toast('Type a guess first — any number of degrees.'); return true; }
    const diff = Math.abs(g - e.theta), stars = diff <= 5 ? 3 : diff <= 10 ? 2 : diff <= 20 ? 1 : 0;
    e.log.push({ theta: e.theta, guess: g, diff, stars }); e.stars += stars; e.shown = true;
    if (stars) { ctx.sfx.good(); if (stars === 3) ctx.tick(true, 1); } else ctx.sfx.bad();
    if (e.round === 5) { if (e.stars > (ctx.data.estBest || 0)) { ctx.data.estBest = e.stars; ctx.save(); } if (e.stars >= 12) ctx.confetti(40); }
    return true;
  }
  if (name === 'enext') {
    if (e.round >= 5 && e.shown) Object.assign(e, { round: 1, stars: 0, log: [] }); else e.round++;
    Object.assign(e, newAngle(ctx.band), { shown: false }); ui.est = ''; return true;
  }
  return false;
}
function keyProtractor(e, ctx) {
  const p = prot(ctx), step = e.shiftKey ? 10 : 1;
  if (p.mode === 'estimate') {
    const ee = ctx.ui.e;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') return !ee.shown && actProtractor('est', String(-(e.key === 'ArrowDown' ? 10 : step)), ctx);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') return !ee.shown && actProtractor('est', String(e.key === 'ArrowUp' ? 10 : step), ctx);
    if (e.key === 'Enter' && !onButton(e)) return actProtractor(ee.shown ? 'enext' : 'echeck', '', ctx);
    return false;
  }
  if (e.key === 'ArrowLeft') return actProtractor('turn', String(step), ctx);
  if (e.key === 'ArrowRight') return actProtractor('turn', String(-step), ctx);
  if (e.key === 'Enter' && !onButton(e)) return actProtractor('pread', '', ctx);
  if (e.key === 'n' || e.key === 'N') return actProtractor('pnew', '', ctx);
  return false;
}

/* ===================================================== 2. polygon lab */

const PNAME = ['', '', '', 'triangle', 'quadrilateral', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon', 'hendecagon', 'dodecagon'];
const regName = (n) => (n === 3 ? 'equilateral triangle' : n === 4 ? 'square' : 'regular ' + PNAME[n]);
function regularPts(n, R = 1) {
  const st = n % 2 ? Math.PI / 2 : -Math.PI / 2 + Math.PI / n;
  return Array.from({ length: n }, (_, i) => { const a = st + (i * 2 * Math.PI) / n; return [R * Math.cos(a), R * Math.sin(a)]; });
}
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function isConvexCCW(pts) { const n = pts.length; for (let i = 0; i < n; i++) if (cross(pts[i], pts[(i + 1) % n], pts[(i + 2) % n]) <= 1e-3) return false; return true; }
function irregularPts(n, seed) {
  const r = seeded(`poly${n}:${seed}`);
  for (let t = 0; t < 400; t++) {
    const angs = Array.from({ length: n }, (_, i) => ((i + 0.5 + (r() - 0.5) * 0.7) * 2 * Math.PI) / n).sort((a, b) => a - b);
    const pts = angs.map((a) => { const R = 0.72 + r() * 0.28; return [R * Math.cos(a), R * Math.sin(a)]; });
    if (isConvexCCW(pts)) return pts;
  }
  return regularPts(n);
}
function interiorAngles(pts) {
  const n = pts.length;
  return pts.map((v, i) => {
    const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const ax = v[0] - p[0], ay = v[1] - p[1], bx = q[0] - v[0], by = q[1] - v[1];
    return 180 - Math.atan2(ax * by - ay * bx, ax * bx + ay * by) / RAD;
  });
}
const centroid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
function reflectAxis([x, y], c, phi) {
  const dx = x - c[0], dy = y - c[1], cs = Math.cos(2 * phi), sn = Math.sin(2 * phi);
  return [c[0] + dx * cs + dy * sn, c[1] + dx * sn - dy * cs];
}
function rotAbout([x, y], c, a) { const dx = x - c[0], dy = y - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; }
const sameSet = (A, B, tol = 1e-6) => A.length === B.length && A.every((a) => B.some((b) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol));
/* Symmetry, found by trying it: an axis of a polygon passes through its
   centre and a corner or the middle of a side; reflect every corner in each
   candidate and keep the ones that land the shape on itself. */
function symmetry(pts) {
  const n = pts.length, c = centroid(pts), axes = [];
  const cand = [];
  pts.forEach((v, i) => { const w = pts[(i + 1) % n]; cand.push(Math.atan2(v[1] - c[1], v[0] - c[0]), Math.atan2((v[1] + w[1]) / 2 - c[1], (v[0] + w[0]) / 2 - c[0])); });
  for (const phi of cand) {
    const ang = mod(phi / RAD, 180);
    if (axes.some((a) => Math.abs(a - ang) < 1e-6 || Math.abs(Math.abs(a - ang) - 180) < 1e-6)) continue;
    if (sameSet(pts.map((p) => reflectAxis(p, c, phi)), pts)) axes.push(ang);
  }
  let order = 1;
  for (let d = n; d >= 2; d--) if (n % d === 0 && sameSet(pts.map((p) => rotAbout(p, c, (2 * Math.PI) / d)), pts)) { order = d; break; }
  return { axes, order, c };
}
const angleSum = (n) => (n - 2) * 180;
function degFrac(numr, den) {   // numr/den degrees, exact
  const w = Math.floor(numr / den), rem = numr % den;
  if (!rem) return `${w}°`;
  const g = gcd(rem, den);
  return `${w} ${rem / g}⁄${den / g}° (about ${num(numr / den)}°)`;
}
const tiles = (n) => (2 * n) % (n - 2) === 0;       // (n−2)·180/n divides 360 ⇔ n−2 divides 4
function gpoly(ctx) {
  const ui = ctx.ui;
  if (!ui.g) ui.g = { n: ctx.band === '6-7' ? 4 : 5, reg: true, seed: 1, fan: true, sym: true, ang: true };
  const g = ui.g; g.n = clamp(g.n, 3, 12);
  return g;
}
const gS = ([x, y]) => [170 + 125 * x, 170 - 125 * y];
function polygonSVG(pts, g, sy) {
  const n = pts.length, S = pts.map(gS);
  let s = `<polygon points="${P(S)}" class="dg-fill2"/>`;
  if (g.fan) {
    for (let i = 1; i < n - 1; i++) s += `<polygon points="${P([S[0], S[i], S[i + 1]])}" class="t-shapes-fan${i % 2}"/>`;
    for (let i = 2; i < n - 1; i++) s += line(S[0], S[i], 't-shapes-diag');
    if (n <= 9) for (let i = 1; i < n - 1; i++) { const c = centroid([S[0], S[i], S[i + 1]]); s += T(f1(c[0]), f1(c[1] + 4), '180°', 't-shapes-fanl'); }
  }
  if (g.sym) for (const a of sy.axes) {
    const c = gS(sy.c), dx = Math.cos(a * RAD) * 160, dy = -Math.sin(a * RAD) * 160;
    s += line([c[0] - dx, c[1] - dy], [c[0] + dx, c[1] + dy], 't-shapes-sym');
  }
  s += `<polygon points="${P(S)}" class="t-shapes-outline"/>`;
  if (g.ang && n <= 8) {
    const angs = interiorAngles(pts), c = centroid(pts);
    pts.forEach((v, i) => { const lp = gS([v[0] + (c[0] - v[0]) * 0.24, v[1] + (c[1] - v[1]) * 0.24]); s += T(f1(lp[0]), f1(lp[1] + 4), `${g.reg ? num(angs[i], 1) : Math.round(angs[i])}°`, 't-shapes-angl'); });
  }
  S.forEach((p) => { s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="4" class="t-shapes-vtx"/>`; });
  return kit.svg(340, 340, s, `A ${n}-sided shape`);
}
/* A regular n-gon with one corner at the origin and its first edge along
   direction phi (degrees) — for the corner-of-a-floor picture. */
function ngonAtCorner(n, side, phi) {
  const ext = 360 / n, out = [[0, 0]]; let x = 0, y = 0;
  for (let i = 0; i < n - 1; i++) { const d = (phi + i * ext) * RAD; x += side * Math.cos(d); y += side * Math.sin(d); out.push([x, y]); }
  return out;
}
function tileInfo(n) {
  const int = angleSum(n) / n, k = Math.floor(360 / int + 1e-9), gap = 360 - k * int;
  let fill = 0; for (let m = 3; m <= 12; m++) if (gap > 1e-9 && Math.abs(angleSum(m) / m - gap) < 1e-9) fill = m;
  return { int, k, gap: Math.abs(gap) < 1e-9 ? 0 : gap, fill };
}
function cornerSVG(n) {
  const { int, k, gap, fill } = tileInfo(n), side = n <= 4 ? 62 : n <= 6 ? 50 : n <= 8 ? 40 : 30;
  const C = [150, 150], toS = ([x, y]) => [C[0] + x, C[1] - y];
  let s = '';
  for (let j = 0; j < k; j++) s += `<polygon points="${P(ngonAtCorner(n, side, j * int).map(toS))}" class="t-shapes-tile${j % 2}"/>`;
  if (gap) {
    const a0 = k * int, rr = 44, p0 = toS([rr * Math.cos(a0 * RAD), rr * Math.sin(a0 * RAD)]), p1 = toS([rr, 0]);
    s += `<path d="M${C[0]},${C[1]} L${f1(p0[0])},${f1(p0[1])} A${rr},${rr} 0 ${gap > 180 ? 1 : 0} 0 ${f1(p1[0])},${f1(p1[1])} Z" class="t-shapes-gap"/>`;
    if (fill) s += `<polygon points="${P(ngonAtCorner(fill, side, a0).map(toS))}" class="t-shapes-fillin"/>`;
    const lp = toS([(rr + 16) * Math.cos((a0 + gap / 2) * RAD), (rr + 16) * Math.sin((a0 + gap / 2) * RAD)]);
    s += T(f1(lp[0]), f1(lp[1] + 5), `${num(gap, 1)}°`, 'dg-accent');
  }
  s += `<circle cx="${C[0]}" cy="${C[1]}" r="4" class="t-shapes-vtx"/>`;
  return kit.svg(300, 300, s, `${k} regular ${PNAME[n]}s round one corner`);
}
function viewPolygon(ctx) {
  const g = gpoly(ctx), n = g.n, pts = g.reg ? regularPts(n) : irregularPts(n, g.seed), sy = symmetry(pts);
  const sum = angleSum(n), young = ctx.band === '6-7';
  const tog = (k, l) => `<button class="btn small ${g[k] ? 'primary' : ''}" data-act="lib" data-arg="gtog|${k}" aria-pressed="${g[k]}">${l}</button>`;
  const picker = `<div class="row gap t-shapes-row"><button class="btn small" data-act="lib" data-arg="gn|-1" aria-label="One fewer side">−</button>
    <b class="t-shapes-n">${n} sides</b><button class="btn small" data-act="lib" data-arg="gn|1" aria-label="One more side">+</button>
    <button class="btn small ${g.reg ? 'primary' : ''}" data-act="lib" data-arg="greg|1">Regular</button><button class="btn small ${g.reg ? '' : 'primary'}" data-act="lib" data-arg="greg|0">Not regular</button>
    ${g.reg ? '' : '<button class="btn small" data-act="lib" data-arg="gnew">Another one</button>'}</div>
    <div class="row gap t-shapes-row">${tog('fan', 'Triangles')}${tog('sym', 'Mirror lines')}${tog('ang', 'Angles')}</div>
    <p class="muted">Keys: ← → sides, R regular or not, N another shape.</p>`;
  const angs = interiorAngles(pts);
  const rows = [
    ['Name', g.reg ? regName(n) : PNAME[n]],
    ['Sides', n], ['Corners (vertices)', n],
    ['Diagonals', `${n * (n - 3) / 2} <span class="muted">(${n - 3} from each corner)</span>`],
    ['Lines of symmetry', `${sy.axes.length}${g.reg ? ' — a regular shape has one for every side' : sy.axes.length ? '' : ' — none: no fold makes the halves match'}`],
    ['Rotational symmetry', `order ${sy.order}${sy.order === 1 ? ' (it only fits back after a full turn)' : ` (it fits back ${sy.order} times in a full turn)`}`],
  ];
  if (!young) rows.push(['Angle sum', `(${n} − 2) × 180° = <b>${sum}°</b>`]);
  if (!young && g.reg) rows.push(['Each inside angle', `${sum}° ÷ ${n} = <b>${degFrac(sum, n)}</b>`], ['Each outside angle', `360° ÷ ${n} = <b>${degFrac(360, n)}</b>`], ['Inside + outside', '180° — they make a straight line']);
  if (!young && !g.reg) rows.push(['Measured angles', `${angs.map((a) => Math.round(a)).join(' + ')} <span class="muted">(rounded)</span> = ${sum}°`]);
  const why = `<p><b>Why ${n} − 2?</b> From one corner, draw lines to every other corner you can. They cut the shape into <b>${n - 2} triangles</b>, and every triangle's angles add to 180°. Together the triangles' angles make exactly the shape's angles, so the sum is ${n - 2} × 180° = ${sum}°.</p>`;
  const ti = tileInfo(n);
  const tileTxt = tiles(n)
    ? `<p><b>Yes — ${PNAME[n]}s tile a floor.</b> ${ti.k} corners of ${num(ti.int, 2)}° meet and make exactly 360°, with no gap.</p>`
    : `<p><b>No — regular ${PNAME[n]}s leave a gap.</b> ${ti.k} corners of ${num(ti.int, 2)}° make ${num(ti.k * ti.int, 2)}°, ${num(ti.gap, 2)}° short of 360°, and one more would overlap.${ti.fill ? ` A regular ${PNAME[ti.fill]} (${num(angleSum(ti.fill) / ti.fill)}°) fills the gap at this corner — ${PNAME[n]}s and ${PNAME[ti.fill]}s together can tile a floor.` : ''}</p>`;
  const list = Array.from({ length: 10 }, (_, i) => i + 3).map((m) => `<span class="chip ${tiles(m) ? 't-shapes-yes' : 't-shapes-no'}">${m} ${tiles(m) ? '✓' : '✗'}</span>`).join(' ');
  return `<div class="t-shapes-cols"><div class="card t-shapes-pic">${polygonSVG(pts, g, sy)}${picker}</div>
    <div class="card"><table class="t-shapes-facts">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>${young ? '' : why}</div></div>
    ${g.reg ? `<div class="t-shapes-cols"><div class="card t-shapes-pic">${cornerSVG(n)}</div><div class="card"><p class="kicker">Does it tile?</p>${tileTxt}
      <p class="muted">Only three regular shapes tile on their own — the triangle, the square and the hexagon — because only their inside angles divide 360° exactly:</p><p>${list}</p></div></div>` : ''}`;
}
function actPolygon(name, arg, ctx) {
  const g = gpoly(ctx);
  if (name === 'gn') { g.n = clamp(g.n + (Math.round(+arg) || 0), 3, 12); return true; }
  if (name === 'greg') { g.reg = arg === '1'; return true; }
  if (name === 'gnew') { g.reg = false; g.seed++; return true; }
  if (name === 'gtog') { if (['fan', 'sym', 'ang'].includes(arg)) g[arg] = !g[arg]; return true; }
  return false;
}
function keyPolygon(e, ctx) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') return actPolygon('gn', '-1', ctx);
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') return actPolygon('gn', '1', ctx);
  if (e.key === 'r' || e.key === 'R') return actPolygon('greg', gpoly(ctx).reg ? '0' : '1', ctx);
  if (e.key === 'n' || e.key === 'N') return actPolygon('gnew', '', ctx);
  return false;
}

/* ============================================ 3. area and perimeter */

const COLS = 10, ROWS = 8, U = 30;
const cellsOf = (on) => Object.keys(on || {}).filter((k) => on[k]).map((k) => k.split(',').map(Number));
function areaPerim(on) {
  const cells = cellsOf(on), has = (r, c) => !!on[r + ',' + c];
  let adj = 0; for (const [r, c] of cells) { if (has(r, c + 1)) adj++; if (has(r + 1, c)) adj++; }
  return { A: cells.length, P: 4 * cells.length - 2 * adj };
}
const minPerim = (N) => { let k = 0; while (k * k < 4 * N) k++; return 2 * k; };   // 2⌈2√N⌉
function newChallenge(kind, band, r = Math.random) {
  const pool = band === '6-7' ? [4, 6, 8, 9] : band === '8-10' ? [6, 8, 10, 12, 15, 16] : [10, 12, 14, 18, 20, 24];
  const N = pool[Math.floor(r() * pool.length)];
  if (kind === 'exact') {
    const pairs = []; for (let a = 1; a * a <= N; a++) if (N % a === 0 && N / a <= COLS && a <= ROWS) pairs.push(2 * (a + N / a));
    const nonmin = pairs.filter((p) => p !== minPerim(N));
    const P = (nonmin.length ? nonmin : pairs)[Math.floor(r() * (nonmin.length || pairs.length))];
    return { kind, N, P, done: false };
  }
  return { kind, N, P0: null, done: false };
}
function challengeState(ch, A, P) {
  if (!ch) return { win: false, msg: '' };
  if (ch.kind === 'min') {
    if (A !== ch.N) return { win: false, msg: `Area ${A} — you need ${ch.N} squares.` };
    return P === minPerim(ch.N) ? { win: true, msg: `Area ${ch.N} with perimeter ${P}. Nothing with ${ch.N} squares has a shorter edge — the closer to a square, the shorter the fence.` }
      : { win: false, msg: `Area ${ch.N} ✓ · perimeter ${P}. Can you squash it to make the edge shorter?` };
  }
  if (ch.kind === 'same') {
    if (ch.P0 === null) return { win: false, msg: A === ch.N ? `Area ${ch.N} ✓ · perimeter ${P}. Press “Keep this one”, then make a different shape.` : `Area ${A} — make any shape with ${ch.N} squares first.` };
    if (A !== ch.N) return { win: false, msg: `Area ${A} — keep it at ${ch.N} squares.` };
    return P !== ch.P0 ? { win: true, msg: `Same area, ${ch.N}, but the perimeter went from ${ch.P0} to ${P}. Area and perimeter are different things!` }
      : { win: false, msg: `Area ${ch.N} ✓ but the perimeter is still ${P}. Change the shape so the edge changes.` };
  }
  if (A !== ch.N || P !== ch.P) return { win: false, msg: `Area ${A} ${A === ch.N ? '✓' : `(need ${ch.N})`} · perimeter ${P} ${P === ch.P ? '✓' : `(need ${ch.P})`}` };
  return { win: true, msg: `Area ${ch.N} and perimeter ${ch.P} — both at once.` };
}
function aState(ctx) {
  const ui = ctx.ui;
  if (!ui.a) ui.a = { on: {}, cur: [0, 0], ch: null, tab: 'grid', shape: 'rectangle', sel: 0 };
  return ui.a;
}
function gridSVG(a) {
  let s = ''; const has = (r, c) => !!a.on[r + ',' + c];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    s += `<rect x="${4 + c * U}" y="${4 + r * U}" width="${U}" height="${U}" class="${has(r, c) ? 't-shapes-on' : 't-shapes-cell'}" data-act="lib" data-arg="cell|${r},${c}"/>`;
  for (const [r, c] of cellsOf(a.on)) {
    const x = 4 + c * U, y = 4 + r * U;
    if (!has(r - 1, c)) s += line([x, y], [x + U, y], 't-shapes-edge');
    if (!has(r + 1, c)) s += line([x, y + U], [x + U, y + U], 't-shapes-edge');
    if (!has(r, c - 1)) s += line([x, y], [x, y + U], 't-shapes-edge');
    if (!has(r, c + 1)) s += line([x + U, y], [x + U, y + U], 't-shapes-edge');
  }
  s += `<rect x="${4 + a.cur[1] * U + 2}" y="${4 + a.cur[0] * U + 2}" width="${U - 4}" height="${U - 4}" rx="4" class="t-shapes-cur"/>`;
  return kit.svg(COLS * U + 8, ROWS * U + 8, s, 'A squared grid to build a shape on');
}
const FSHAPES = {
  rectangle: { dims: [['l', 'length l', 1, 12, 6], ['w', 'width w', 1, 10, 4]] },
  triangle: { dims: [['b', 'base b', 1, 12, 8], ['h', 'height h', 1, 10, 5]] },
  parallelogram: { dims: [['b', 'base b', 1, 12, 7], ['h', 'height h', 1, 8, 4]] },
  trapezium: { dims: [['a', 'top a', 1, 10, 4], ['b', 'bottom b', 1, 12, 8], ['h', 'height h', 1, 8, 4]] },
  circle: { dims: [['r', 'radius r', 1, 10, 3]] },
};
function fdims(ui, shape) { const o = {}; for (const [k, , lo, hi, d] of FSHAPES[shape].dims) o[k] = gv(ui, `f_${shape}_${k}`, d, lo, hi); return o; }
/* each flat shape's corners in units (maths y-up) — the drawing and the
   selftest both start here */
function fpoly(shape, d) {
  if (shape === 'rectangle') return [[0, 0], [d.l, 0], [d.l, d.w], [0, d.w]];
  if (shape === 'triangle') { const t = Math.round(d.b * 0.3); return [[0, 0], [d.b, 0], [t, d.h]]; }
  if (shape === 'parallelogram') { const k = Math.min(3, Math.ceil(d.h / 2)); return [[0, 0], [d.b, 0], [d.b + k, d.h], [k, d.h]]; }
  if (shape === 'trapezium') return [[0, 0], [d.b, 0], [(d.b + d.a) / 2, d.h], [(d.b - d.a) / 2, d.h]];
  return null;
}
function fcalc(shape, d) {
  if (shape === 'rectangle') return { A: d.l * d.w, work: ['A = l × w', `= ${d.l} × ${d.w}`, `= <b>${d.l * d.w}</b> cm²`], P: 2 * (d.l + d.w), pwork: `P = 2 × (l + w) = 2 × (${d.l} + ${d.w}) = <b>${2 * (d.l + d.w)}</b> cm`, why: 'Count the squares: l in each row, w rows. That is l × w.' };
  if (shape === 'triangle') return { A: (d.b * d.h) / 2, work: ['A = ½ × b × h', `= ½ × ${d.b} × ${d.h}`, `= ½ × ${d.b * d.h}`, `= <b>${num((d.b * d.h) / 2)}</b> cm²`], why: 'The dashed rectangle around it is b × h. The triangle is exactly half of it — each part outside matches a part inside.' };
  if (shape === 'parallelogram') return { A: d.b * d.h, work: ['A = b × h', `= ${d.b} × ${d.h}`, `= <b>${d.b * d.h}</b> cm²`], why: 'Cut the triangle off one end and slide it to the other: you get a rectangle b × h. Use the straight-up height, not the slanting side.' };
  if (shape === 'trapezium') return { A: ((d.a + d.b) * d.h) / 2, work: ['A = ½ × (a + b) × h', `= ½ × (${d.a} + ${d.b}) × ${d.h}`, `= ½ × ${d.a + d.b} × ${d.h}`, `= <b>${num(((d.a + d.b) * d.h) / 2)}</b> cm²`], why: 'Two copies, one turned upside down, fit together into a parallelogram with base a + b. The trapezium is half of it.' };
  return { A: Math.PI * d.r * d.r, work: ['A = π × r²', `= π × ${d.r}²`, `= <b>${d.r * d.r}π</b> cm²`, `≈ 3.14 × ${d.r * d.r} = <b>${num(3.14 * d.r * d.r)}</b> cm²`], P: 2 * Math.PI * d.r, pwork: `C = 2 × π × r = <b>${2 * d.r}π</b> ≈ <b>${num(3.14 * 2 * d.r)}</b> cm`, why: 'Cut a circle into thin slices and lay them head to tail: nearly a rectangle, r tall and half the circumference (πr) long. So A = πr × r.' };
}
function formulaSVG(shape, d) {
  if (shape === 'circle') {
    const R = 16 * d.r, W = 2 * R + 40, c = W / 2;
    let s = `<circle cx="${c}" cy="${c}" r="${R}" class="dg-fill1"/>` + line([c, c], [c + R, c], 't-shapes-arm') + `<circle cx="${c}" cy="${c}" r="3" class="t-shapes-vtx"/>` + T(f1(c + R / 2), f1(c - 8), `r = ${d.r}`, 'dg-text');
    return kit.svg(W, W, s, 'A circle with its radius');
  }
  const pts = fpoly(shape, d), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys);
  const u = Math.min(26, 280 / w, 200 / h), ox = 30 - Math.min(...xs) * u, oy = 30 + h * u;
  const S = ([x, y]) => [ox + x * u, oy - y * u];
  let s = '';
  if (shape === 'rectangle') for (let i = 0; i <= d.l; i++) for (let j = 0; j <= d.w; j++) { if (i < d.l) s += line(S([i, j]), S([i + 1, j]), 'dg-grid'); if (j < d.w) s += line(S([i, j]), S([i, j + 1]), 'dg-grid'); }
  if (shape === 'triangle') s += `<polygon points="${P([[0, 0], [d.b, 0], [d.b, d.h], [0, d.h]].map(S))}" class="t-shapes-ghost"/>`;
  s += `<polygon points="${P(pts.map(S))}" class="${shape === 'rectangle' ? 't-shapes-fill-light' : 'dg-fill2'}"/>`;
  if (shape !== 'rectangle') { const top = pts.filter((p) => p[1] === h).sort((p, q) => p[0] - q[0])[0], foot = [top[0], 0]; s += line(S(top), S(foot), 't-shapes-height') + `<rect x="${f1(S(foot)[0])}" y="${f1(S(foot)[1] - 8)}" width="8" height="8" class="t-shapes-right"/>`; s += T(f1(S(top)[0] + 6), f1(S([0, h / 2])[1] + 4), `h = ${d.h}`, 'dg-accent', 'start'); }
  const bl = shape === 'rectangle' ? `l = ${d.l}` : `b = ${d.b}`;
  s += T(f1(S([(shape === 'rectangle' ? d.l : d.b) / 2, 0])[0]), f1(S([0, 0])[1] + 20), bl, 'dg-text');
  if (shape === 'rectangle') s += T(f1(S([0, 0])[0] - 8), f1(S([0, d.w / 2])[1] + 4), `w = ${d.w}`, 'dg-text', 'end');
  if (shape === 'trapezium') s += T(f1(S([d.b / 2, h])[0]), f1(S([0, h])[1] - 10), `a = ${d.a}`, 'dg-text');
  return kit.svg(Math.max(...pts.map((p) => S(p)[0])) + 50, oy + 34, s, `A ${shape}`);
}
function viewArea(ctx) {
  const a = aState(ctx), ui = ctx.ui;
  const tabs = `<div class="seg small">${[['grid', 'Build on a grid'], ['formula', 'Formulas']].map(([t, l]) => `<button class="${a.tab === t ? 'on' : ''}" data-act="lib" data-arg="atab|${t}">${l}</button>`).join('')}</div>`;
  if (a.tab === 'formula') {
    const shape = FSHAPES[a.shape] ? a.shape : 'rectangle', d = fdims(ui, shape), c = fcalc(shape, d), dims = FSHAPES[shape].dims;
    const sel = clamp(a.sel, 0, dims.length - 1);
    const sh = `<div class="row gap t-shapes-row">${Object.keys(FSHAPES).map((k) => `<button class="btn small ${k === shape ? 'primary' : ''}" data-act="lib" data-arg="ashape|${k}">${k}</button>`).join('')}</div>`;
    const sliders = dims.map(([k, l, lo, hi], i) => `<label class="t-shapes-slider ${i === sel ? 'sel' : ''}">${l} = <b>${d[k]}</b> cm
      <input type="range" id="t-shapes-f-${shape}-${k}" data-lib-input="f_${shape}_${k}" min="${lo}" max="${hi}" value="${d[k]}" aria-label="${l}"></label>`).join('');
    return tabs + sh + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${formulaSVG(shape, d)}</div><div class="card">${sliders}
      <p class="muted">Drag a slider, or ↑ ↓ to pick one and ← → to change it.</p>
      <div class="t-shapes-formula">${c.work.join('<br>')}</div>${c.pwork ? `<p class="t-shapes-formula">${c.pwork}</p>` : ''}<p>${c.why}</p></div></div>`;
  }
  const { A, P: Pm } = areaPerim(a.on), st = challengeState(a.ch, A, Pm);
  const ch = a.ch;
  const chTxt = !ch ? '<p>Tap squares to colour them (or move with the arrows and press space). Watch the area and the perimeter.</p>'
    : ch.kind === 'min' ? `<p><b>Challenge:</b> make a shape with area <b>${ch.N}</b> and the <b>smallest</b> perimeter you can.</p>`
      : ch.kind === 'same' ? `<p><b>Challenge:</b> make two shapes with area <b>${ch.N}</b> but different perimeters.</p>${ch.P0 !== null ? `<p class="muted">Kept: area ${ch.N}, perimeter ${ch.P0}.</p>` : `<button class="btn small" data-act="lib" data-arg="akeep">Keep this one</button>`}`
        : `<p><b>Challenge:</b> make a shape with area <b>${ch.N}</b> and perimeter <b>${ch.P}</b>.</p>`;
  const bounds = cellsOf(a.on); let rectTxt = '';
  if (A) { const rs = bounds.map((x) => x[0]), cs = bounds.map((x) => x[1]), h = Math.max(...rs) - Math.min(...rs) + 1, w = Math.max(...cs) - Math.min(...cs) + 1;
    if (w * h === A) rectTxt = `<p>It is a ${w} × ${h} rectangle: area ${w} × ${h} = ${A}, perimeter 2 × (${w} + ${h}) = ${Pm}.</p>`; }
  return tabs + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${gridSVG(a)}
      <div class="row gap t-shapes-row"><button class="btn small" data-act="lib" data-arg="aclear">Clear</button></div></div>
    <div class="card"><div class="t-shapes-stats"><div><span class="kicker">Area</span><b>${A}</b><span class="muted">squares</span></div><div><span class="kicker">Perimeter</span><b>${Pm}</b><span class="muted">edges</span></div></div>
      <p class="muted">The perimeter is every edge between a coloured square and a blank one — drawn in red. Holes count too.</p>${rectTxt}
      ${chTxt}${st.msg ? `<p class="t-shapes-note ${st.win ? 'win' : ''}">${st.win ? '✓ ' : ''}${esc(st.msg)}</p>` : ''}
      <div class="row gap t-shapes-row"><button class="btn small ${ch && ch.kind === 'min' ? 'primary' : ''}" data-act="lib" data-arg="ach|min">Smallest edge</button>
      <button class="btn small ${ch && ch.kind === 'same' ? 'primary' : ''}" data-act="lib" data-arg="ach|same">Same area, new edge</button>
      <button class="btn small ${ch && ch.kind === 'exact' ? 'primary' : ''}" data-act="lib" data-arg="ach|exact">Hit both</button>
      ${ch ? '<button class="btn small ghost" data-act="lib" data-arg="ach|off">Free build</button>' : ''}</div>
      <p class="muted">Keys: arrows move, space colours a square. Challenges won: ${ctx.data.areaWins || 0}.</p></div></div>`;
}
function afterToggle(ctx) {
  const a = aState(ctx); if (!a.ch || a.ch.done) return;
  const { A, P: Pm } = areaPerim(a.on);
  if (challengeState(a.ch, A, Pm).win) { a.ch.done = true; ctx.sfx.good(); ctx.confetti(30); ctx.tick(true, 2); ctx.data.areaWins = (ctx.data.areaWins || 0) + 1; ctx.save(); }
}
function actArea(name, arg, ctx) {
  const a = aState(ctx);
  if (name === 'atab') { a.tab = arg === 'formula' ? 'formula' : 'grid'; return true; }
  if (name === 'ashape') { if (FSHAPES[arg]) { a.shape = arg; a.sel = 0; } return true; }
  if (name === 'cell') {
    const [r, c] = String(arg).split(',').map(Number); if (!(r >= 0 && r < ROWS && c >= 0 && c < COLS)) return true;
    const k = r + ',' + c; if (a.on[k]) delete a.on[k]; else a.on[k] = 1; a.cur = [r, c]; ctx.sfx.click(); afterToggle(ctx); return true;
  }
  if (name === 'aclear') { a.on = {}; return true; }
  if (name === 'ach') { a.ch = arg === 'off' ? null : newChallenge(arg, ctx.band); a.on = {}; return true; }
  if (name === 'akeep') {
    const { A, P: Pm } = areaPerim(a.on);
    if (!a.ch || a.ch.kind !== 'same') return true;
    if (A !== a.ch.N) { ctx.toast(`Make area ${a.ch.N} first.`); return true; }
    a.ch.P0 = Pm; ctx.sfx.click(); return true;
  }
  if (name === 'asel') { const n = FSHAPES[a.shape].dims.length; a.sel = mod(a.sel + (+arg || 0), n); return true; }
  if (name === 'adim') {
    const [k, , lo, hi, d] = FSHAPES[a.shape].dims[clamp(a.sel, 0, FSHAPES[a.shape].dims.length - 1)], key = `f_${a.shape}_${k}`;
    ctx.ui[key] = String(clamp(gv(ctx.ui, key, d, lo, hi) + (+arg || 0), lo, hi)); return true;
  }
  return false;
}
function keyArea(e, ctx) {
  const a = aState(ctx);
  if (a.tab === 'formula') {
    if (e.key === 'ArrowUp') return actArea('asel', '-1', ctx);
    if (e.key === 'ArrowDown') return actArea('asel', '1', ctx);
    if (e.key === 'ArrowLeft') return actArea('adim', '-1', ctx);
    if (e.key === 'ArrowRight') return actArea('adim', '1', ctx);
    return false;
  }
  const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  if (mv) { a.cur = [clamp(a.cur[0] + mv[0], 0, ROWS - 1), clamp(a.cur[1] + mv[1], 0, COLS - 1)]; return true; }
  if ((e.key === ' ' || e.key === 'Enter') && !onButton(e)) return actArea('cell', a.cur.join(','), ctx);
  return false;
}

/* ========================================================= 4. circle */

function viewCircle(ctx) {
  const ui = ctx.ui, r = gv(ui, 'cr', 5, 1, 12), d = 2 * r;
  // picture 1: the circle and its parts
  const R = 70, c = [90, 90];
  let s1 = `<circle cx="${c[0]}" cy="${c[1]}" r="${R}" class="dg-fill1"/>` + line([c[0] - R, c[1]], [c[0] + R, c[1]], 't-shapes-arm') + line(c, [c[0] + R * Math.cos(-60 * RAD), c[1] + R * Math.sin(-60 * RAD)], 't-shapes-height');
  s1 += `<circle cx="${c[0]}" cy="${c[1]}" r="3.5" class="t-shapes-vtx"/>` + T(c[0], c[1] + 20, `d = ${d}`, 'dg-text') + T(f1(c[0] + R * 0.25 - 8), f1(c[1] - R * 0.43), `r = ${r}`, 'dg-accent', 'end');
  // picture 2: the circle rolled out along a line — a bit more than three diameters
  const D = 70, W = Math.PI * D, x0 = 16, y0 = 108;
  let s2 = `<circle cx="${x0 + D / 2}" cy="${y0 - D / 2}" r="${D / 2}" class="dg-fill1"/>` + line([x0, y0 - D / 2], [x0 + D, y0 - D / 2], 't-shapes-arm');
  s2 += line([x0, y0], [x0 + W, y0], 't-shapes-roll');
  for (let i = 0; i <= 3; i++) s2 += line([x0 + i * D, y0 - 7], [x0 + i * D, y0 + 7], 'dg-line') + (i ? T(f1(x0 + (i - 0.5) * D), y0 + 22, `d`, 'dg-small') : '');
  s2 += `<rect x="${f1(x0 + 3 * D)}" y="${y0 - 5}" width="${f1(W - 3 * D)}" height="10" class="t-shapes-bit"/>` + line([x0 + W, y0 - 9], [x0 + W, y0 + 9], 'dg-line');
  s2 += T(f1(x0 + W / 2), y0 + 44, 'unrolled: 3 diameters and a little bit more', 'dg-small');
  // picture 3: slices laid head to tail
  const N = 16, rr = 72, dl = (2 * Math.PI) / N, chord = 2 * rr * Math.sin(dl / 2), bx = 14, by = 100;
  let s3 = '';
  for (let i = 0; i < N; i++) {
    const up = i % 2 === 0, ax = bx + (i * chord) / 2 + chord / 2, ay = up ? by : by - rr * Math.cos(dl / 2);
    const mid = up ? -Math.PI / 2 : Math.PI / 2, p0 = [ax + rr * Math.cos(mid - dl / 2), ay + rr * Math.sin(mid - dl / 2)], p1 = [ax + rr * Math.cos(mid + dl / 2), ay + rr * Math.sin(mid + dl / 2)];
    s3 += `<path d="M${f1(ax)},${f1(ay)} L${f1(p0[0])},${f1(p0[1])} A${rr},${rr} 0 0 1 ${f1(p1[0])},${f1(p1[1])} Z" class="${up ? 'dg-fill1' : 'dg-fill3'}"/>`;
  }
  const len = (N / 2) * chord + chord / 2;
  s3 += T(f1(bx + len / 2), by + 22, 'about half the circumference: πr', 'dg-small') + T(f1(bx + len + 8), f1(by - 18), 'r', 'dg-accent', 'start');
  const young = ctx.band === '6-7';
  return `<div class="t-shapes-cols"><div class="card t-shapes-pic">${kit.svg(180, 180, s1, 'A circle with its radius and diameter')}
      <label class="t-shapes-slider">radius r = <b>${r}</b> cm<input type="range" id="t-shapes-cr" data-lib-input="cr" min="1" max="12" value="${r}" aria-label="Radius"></label>
      <p class="muted">Drag the slider, or ← → on the page.</p></div>
    <div class="card"><table class="t-shapes-facts">
      <tr><th>Radius r</th><td>${r} cm <span class="muted">— centre to edge</span></td></tr>
      <tr><th>Diameter d</th><td>2 × r = <b>${d}</b> cm <span class="muted">— all the way across</span></td></tr>
      <tr><th>Circumference C</th><td>π × d = <b>${d}π</b> cm ≈ 3.14 × ${d} = <b>${num(3.14 * d)}</b> cm</td></tr>
      ${young ? '' : `<tr><th>Area A</th><td>π × r² = π × ${r * r} = <b>${r * r}π</b> cm² ≈ 3.14 × ${r * r} = <b>${num(3.14 * r * r)}</b> cm²</td></tr>`}
    </table><p class="muted">π (pi) is the number of diameters that fit round any circle: 3.14159… It never ends and never repeats, so we write π, or use 3.14 to get close.</p></div></div>
    <div class="t-shapes-cols"><div class="card t-shapes-pic"><p><b>Why C = π × d</b></p>${kit.svg(260, 160, s2, 'A circle rolled out flat')}
      <p>Roll a circle along a line for one turn. The track is a little more than <b>three</b> of its own diameters — π of them, every time, for every circle.</p></div>
    ${young ? '' : `<div class="card t-shapes-pic"><p><b>Why A = π × r²</b></p>${kit.svg(Math.ceil(bx + len + 30), 134, s3, 'A circle cut into slices laid head to tail')}
      <p>Cut the circle into slices and lay them head to tail. It is nearly a rectangle, <b>r</b> tall and half the circumference, <b>πr</b>, long. Thinner slices make it closer. Area = πr × r = πr².</p></div>`}</div>`;
}
function keyCircle(e, ctx) {
  const r = gv(ctx.ui, 'cr', 5, 1, 12);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { ctx.ui.cr = String(clamp(r - 1, 1, 12)); return true; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { ctx.ui.cr = String(clamp(r + 1, 1, 12)); return true; }
  return false;
}

/* ================================================== 5. solids and nets */

const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]) };
v3.norm = (a) => v3.mul(a, 1 / (v3.len(a) || 1));
function prismFrom(base, h) {
  const n = base.length, V = [...base.map(([x, y]) => [x, y, -h / 2]), ...base.map(([x, y]) => [x, y, h / 2])];
  const F = [base.map((_, i) => i).reverse(), base.map((_, i) => n + i), ...base.map((_, i) => [i, (i + 1) % n, n + (i + 1) % n, n + i])];
  return { V, F };
}
function pyramidFrom(base, h) {
  const n = base.length, V = [...base.map(([x, y]) => [x, y, -h / 3]), [0, 0, (2 * h) / 3]];
  return { V, F: [base.map((_, i) => i).reverse(), ...base.map((_, i) => [i, (i + 1) % n, n])] };
}
const ngon2 = (n, s) => { const R = s / (2 * Math.sin(Math.PI / n)); return regularPts(n, R); };
const SOLIDS = [
  { id: 'cube', name: 'Cube', make: () => prismFrom(ngon2(4, 1.6), 1.6) },
  { id: 'cuboid', name: 'Cuboid', make: (d) => prismFrom([[-d.l / 2, -d.w / 2], [d.l / 2, -d.w / 2], [d.l / 2, d.w / 2], [-d.l / 2, d.w / 2]].map(([x, y]) => [x * 0.5, y * 0.5]), d.h * 0.5) },
  { id: 'tri-prism', name: 'Triangular prism', make: () => prismFrom(ngon2(3, 1.7), 2) },
  { id: 'pent-prism', name: 'Pentagonal prism', make: () => prismFrom(ngon2(5, 1.1), 1.8) },
  { id: 'hex-prism', name: 'Hexagonal prism', make: () => prismFrom(ngon2(6, 0.95), 1.8) },
  { id: 'sq-pyramid', name: 'Square-based pyramid', make: () => pyramidFrom(ngon2(4, 1.8), 1.8) },
  { id: 'tetra', name: 'Triangular pyramid (tetrahedron)', make: () => pyramidFrom(ngon2(3, 2), 2 * Math.sqrt(2 / 3)) },
  { id: 'pent-pyramid', name: 'Pentagonal pyramid', make: () => pyramidFrom(ngon2(5, 1.2), 1.8) },
  { id: 'octa', name: 'Octahedron', make: () => ({ V: [[1.2, 0, 0], [-1.2, 0, 0], [0, 1.2, 0], [0, -1.2, 0], [0, 0, 1.2], [0, 0, -1.2]],
    F: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]] }) },
];
const solidById = Object.fromEntries(SOLIDS.map((s) => [s.id, s]));
function edgesOf(F) { const set = new Map(); for (const f of F) f.forEach((a, i) => { const b = f[(i + 1) % f.length], k = a < b ? a + '-' + b : b + '-' + a; set.set(k, (set.get(k) || 0) + 1); }); return set; }
function counts(m) { return { F: m.F.length, V: m.V.length, E: edgesOf(m.F).size }; }
const mcentre = (m) => m.V.reduce((a, p) => v3.add(a, v3.mul(p, 1 / m.V.length)), [0, 0, 0]);
function faceNormal(m, f) {
  let n = [0, 0, 0]; f.forEach((a, i) => { const p = m.V[a], q = m.V[f[(i + 1) % f.length]]; n = v3.add(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]); });
  const c = f.reduce((a, i) => v3.add(a, v3.mul(m.V[i], 1 / f.length)), [0, 0, 0]);
  if (v3.dot(n, v3.sub(c, mcentre(m))) < 0) n = v3.mul(n, -1);    // outward
  return { n: v3.norm(n), area: v3.len(n) / 2, c };
}
const surfaceArea = (m) => m.F.reduce((a, f) => a + faceNormal(m, f).area, 0);
function faceName(m, f) {
  const k = f.length, L = f.map((a, i) => v3.len(v3.sub(m.V[a], m.V[f[(i + 1) % k]])));
  const eq = L.every((x) => Math.abs(x - L[0]) < 1e-6);
  if (k === 3) return 'triangle'; if (k === 4) return eq ? 'square' : 'rectangle'; return PNAME[k];
}
function faceSummary(m) {
  const tally = {}; for (const f of m.F) { const nm = faceName(m, f); tally[nm] = (tally[nm] || 0) + 1; }
  return Object.entries(tally).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`).join(' + ');
}
function project(m, yaw, pitch = 24) {
  const cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
  const rot = ([x, y, z]) => [x * cy - y * sy, x * sy + y * cy, z];
  const view = [0, -cp, sp], up = [0, sp, cp];
  return { pt: (p) => { const q = rot(p); return [q[0], -v3.dot(q, up), v3.dot(q, view)]; }, vis: (n) => v3.dot(rot(n), view) > 1e-9 };
}
function solidSVG(m, yaw) {
  const pr = project(m, yaw), Q = m.V.map(pr.pt);
  const xs = Q.map((q) => q[0]), ys = Q.map((q) => q[1]);
  const sc = Math.min(220 / (Math.max(...xs) - Math.min(...xs) || 1), 180 / (Math.max(...ys) - Math.min(...ys) || 1));
  const S = (q) => [20 + (q[0] - Math.min(...xs)) * sc, 20 + (q[1] - Math.min(...ys)) * sc];
  const W = 40 + (Math.max(...xs) - Math.min(...xs)) * sc, H = 40 + (Math.max(...ys) - Math.min(...ys)) * sc;
  const fn = m.F.map((f) => faceNormal(m, f)), vis = fn.map((x) => pr.vis(x.n));
  let s = '';
  m.F.forEach((f, i) => { if (vis[i]) s += `<polygon points="${P(f.map((a) => S(Q[a])))}" class="t-shapes-face${(i % 3) + 1}"/>`; });
  const faceOfEdge = new Map(); m.F.forEach((f, i) => f.forEach((a, j) => { const b = f[(j + 1) % f.length], k = a < b ? a + '-' + b : b + '-' + a; (faceOfEdge.get(k) || faceOfEdge.set(k, []).get(k)).push(i); }));
  for (const [k, fs] of faceOfEdge) { const [a, b] = k.split('-').map(Number); s += line(S(Q[a]), S(Q[b]), fs.some((i) => vis[i]) ? 't-shapes-vis' : 't-shapes-hid'); }
  Q.forEach((q) => { const p = S(q); s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="3.5" class="t-shapes-vtx"/>`; });
  return kit.svg(Math.ceil(W), Math.ceil(H), s, 'A solid shape, hidden edges dashed');
}
/* Unfold a convex solid along a spanning tree of its faces: each face is laid
   flat against its parent across the edge they share. Returns 2D polygons. */
function unfold(m) {
  const F = m.F, placed = new Map(), parent = new Map(), order = [0];
  const local = (f, u, v) => {   // face f in its own plane, with u at (0,0) and v on +x
    const { n } = faceNormal(m, f), e1 = v3.norm(v3.sub(m.V[v], m.V[u])), e2 = v3.cross(n, e1);
    return (i) => { const d = v3.sub(m.V[i], m.V[u]); return [v3.dot(d, e1), v3.dot(d, e2)]; };
  };
  { const f = F[0], L = local(f, f[0], f[1]); placed.set(0, new Map(f.map((i) => [i, L(i)]))); }
  const q = [0];
  while (q.length) {
    const pi = q.shift(), pf = F[pi], pm = placed.get(pi);
    F.forEach((cf, ci) => {
      if (placed.has(ci)) return;
      const shared = pf.filter((a) => cf.includes(a)); if (shared.length !== 2) return;
      const [u, v] = shared, L = local(cf, u, v), U2 = pm.get(u), V2 = pm.get(v);
      const len = Math.hypot(V2[0] - U2[0], V2[1] - U2[1]), t = [(V2[0] - U2[0]) / len, (V2[1] - U2[1]) / len], k = [-t[1], t[0]];
      const pc = centroid(pf.map((a) => pm.get(a))), sideP = (pc[0] - U2[0]) * k[0] + (pc[1] - U2[1]) * k[1];
      const lc = centroid(cf.map((a) => L(a))), sigma = sideP * lc[1] > 0 ? -1 : 1;
      placed.set(ci, new Map(cf.map((i) => { const [a, b] = L(i); return [i, [U2[0] + a * t[0] + sigma * b * k[0], U2[1] + a * t[1] + sigma * b * k[1]]]; })));
      parent.set(ci, pi); order.push(ci); q.push(ci);
    });
  }
  return { faces: order.map((i) => ({ i, pts: F[i].map((a) => placed.get(i).get(a)) })), parent };
}
function netSVG(net) {
  const all = net.faces.flatMap((f) => f.pts), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), sc = Math.min(300 / w, 240 / h);
  const S = (p) => [14 + (p[0] - Math.min(...xs)) * sc, 14 + (Math.max(...ys) - p[1]) * sc];
  const s = net.faces.map((f, j) => `<polygon points="${P(f.pts.map(S))}" class="t-shapes-face${(j % 3) + 1}"/>`).join('');
  return kit.svg(Math.ceil(w * sc + 28), Math.ceil(h * sc + 28), s, 'The net: the solid unfolded flat');
}
function sState(ctx) {
  const ui = ctx.ui; if (!ui.s) ui.s = { id: 'cube', yaw: 30 };
  if (!solidById[ui.s.id]) ui.s.id = 'cube';
  return ui.s;
}
const cdims = (ui) => ({ l: gv(ui, 'sl', 4, 1, 8), w: gv(ui, 'sw', 3, 1, 8), h: gv(ui, 'sh', 2, 1, 8) });
function cuboidGridSVG(d) {
  const u = Math.min(22, 170 / (d.l + d.w * 0.5), 150 / (d.h + d.w * 0.35)), dx = u * 0.5, dy = u * 0.35, ox = 22, oy = 16 + d.w * dy;
  const F = (x, y) => [ox + x * u, oy + (d.h - y) * u];            // front face, x along l, y up
  const Tp = (x, z) => [ox + x * u + z * dx, oy - z * dy];          // top face, z into the page
  const Sd = (z, y) => [ox + d.l * u + z * dx, oy + (d.h - y) * u - z * dy];
  let s = `<polygon points="${P([F(0, 0), F(d.l, 0), F(d.l, d.h), F(0, d.h)])}" class="dg-fill2"/><polygon points="${P([Tp(0, 0), Tp(d.l, 0), Tp(d.l, d.w), Tp(0, d.w)])}" class="dg-fill1"/><polygon points="${P([Sd(0, 0), Sd(d.w, 0), Sd(d.w, d.h), Sd(0, d.h)])}" class="dg-fill3"/>`;
  for (let i = 1; i < d.l; i++) s += line(F(i, 0), F(i, d.h), 't-shapes-cube') + line(Tp(i, 0), Tp(i, d.w), 't-shapes-cube');
  for (let j = 1; j < d.h; j++) s += line(F(0, j), F(d.l, j), 't-shapes-cube') + line(Sd(0, j), Sd(d.w, j), 't-shapes-cube');
  for (let k = 1; k < d.w; k++) s += line(Tp(0, k), Tp(d.l, k), 't-shapes-cube') + line(Sd(k, 0), Sd(k, d.h), 't-shapes-cube');
  s += T(f1(ox + (d.l * u) / 2), f1(oy + d.h * u + 18), `l = ${d.l}`) + T(f1(ox - 6), f1(oy + (d.h * u) / 2 + 4), `h = ${d.h}`, 'dg-text', 'end') + T(f1(ox + d.l * u + (d.w * dx) / 2 + 12), f1(oy + d.h * u - (d.w * dy) / 2 + 12), `w = ${d.w}`, 'dg-text', 'start');
  return kit.svg(Math.ceil(ox + d.l * u + d.w * dx + 60), Math.ceil(oy + d.h * u + 28), s, 'A cuboid made of unit cubes');
}
function viewSolids(ctx) {
  const st = sState(ctx), sol = solidById[st.id], d = cdims(ctx.ui), m = sol.make(d), c = counts(m), young = ctx.band === '6-7';
  const pick = `<div class="t-shapes-solids">${SOLIDS.map((x) => `<button class="btn small ${x.id === st.id ? 'primary' : ''}" data-act="lib" data-arg="solid|${x.id}">${x.name}</button>`).join('')}</div>`;
  const vol = d.l * d.w * d.h, sa = 2 * (d.l * d.w + d.l * d.h + d.w * d.h);
  return pick + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${solidSVG(m, st.yaw)}
      <div class="row gap t-shapes-row"><button class="btn small" data-act="lib" data-arg="yaw|-15" aria-label="Turn left">⟲ Turn</button><button class="btn small" data-act="lib" data-arg="yaw|15" aria-label="Turn right">Turn ⟳</button></div>
      <p class="muted">Dashed edges are round the back. ← → turn it; ↑ ↓ pick another solid.</p></div>
    <div class="card"><p class="kicker">${esc(sol.name)}</p><table class="t-shapes-facts">
      <tr><th>Faces F</th><td><b>${c.F}</b> <span class="muted">— ${faceSummary(m)}</span></td></tr>
      <tr><th>Edges E</th><td><b>${c.E}</b> <span class="muted">— where two faces meet</span></td></tr>
      <tr><th>Vertices V</th><td><b>${c.V}</b> <span class="muted">— corners</span></td></tr></table>
      ${young ? '' : `<p class="t-shapes-formula">F + V − E = ${c.F} + ${c.V} − ${c.E} = <b>${c.F + c.V - c.E}</b></p>
      <p>That is <b>Euler's rule</b>: for every solid with flat faces and no holes, F + V − E is 2. Try every solid here — it never fails.</p>`}</div></div>
    <div class="t-shapes-cols"><div class="card t-shapes-pic"><p class="kicker">Its net</p>${netSVG(unfold(m))}<p>Cut along some edges and fold it flat: ${c.F} faces, all joined. Fold it back up along the shared edges and it closes into the ${esc(sol.name.toLowerCase())}.</p></div>
    <div class="card"><p class="kicker">Cuboid calculator</p>${cuboidGridSVG(d)}
      ${[['sl', 'length l', d.l], ['sw', 'width w', d.w], ['sh', 'height h', d.h]].map(([k, l, v]) => `<label class="t-shapes-slider">${l} = <b>${v}</b> cm<input type="range" id="t-shapes-${k}" data-lib-input="${k}" min="1" max="8" value="${v}" aria-label="${l}"></label>`).join('')}
      <p class="t-shapes-formula">Volume = l × w × h = ${d.l} × ${d.w} × ${d.h} = <b>${vol}</b> cm³</p>
      <p class="muted">Count the cubes: ${d.l * d.w} in each layer, ${d.h} layers.</p>
      ${young ? '' : `<p class="t-shapes-formula">Surface area = 2 × (lw + lh + wh) = 2 × (${d.l * d.w} + ${d.l * d.h} + ${d.w * d.h}) = <b>${sa}</b> cm²</p><p class="muted">Six faces in three matching pairs: top and bottom, front and back, the two ends.</p>`}</div></div>`;
}
function actSolids(name, arg, ctx) {
  const st = sState(ctx);
  if (name === 'solid') { if (solidById[arg]) st.id = arg; return true; }
  if (name === 'yaw') { st.yaw = mod(st.yaw + (+arg || 0), 360); return true; }
  if (name === 'snext') { const i = SOLIDS.findIndex((x) => x.id === st.id); st.id = SOLIDS[mod(i + (+arg || 1), SOLIDS.length)].id; return true; }
  return false;
}
function keySolids(e, ctx) {
  if (e.key === 'ArrowLeft') return actSolids('yaw', '-15', ctx);
  if (e.key === 'ArrowRight') return actSolids('yaw', '15', ctx);
  if (e.key === 'ArrowUp') return actSolids('snext', '-1', ctx);
  if (e.key === 'ArrowDown') return actSolids('snext', '1', ctx);
  return false;
}

/* ============================================ 6. moves on a grid */

const G = 6, GU = 24, GP = 16;
const gs = ([x, y]) => [GP + (x + G) * GU, GP + (G - y) * GU];
const MSHAPES = [[[0, 0], [3, 0], [1, 2]], [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]], [[0, 0], [2, 0], [2, 1], [3, 1], [1, 3], [0, 1]]];
function mapPoint(t, [x, y]) {
  if (t.kind === 'translate') return [x + t.a, y + t.b];
  if (t.kind === 'reflect') {
    if (t.line === 'x') return [2 * t.k - x, y];          // mirror x = k
    if (t.line === 'y') return [x, 2 * t.k - y];          // mirror y = k
    if (t.line === 'y=x') return [y, x];
    return [-y, -x];                                       // y = −x
  }
  const dx = x - t.a, dy = y - t.b;
  if (t.deg === 180) return [t.a - dx, t.b - dy];
  if (t.deg === 90) return [t.a + dy, t.b - dx];          // clockwise
  return [t.a - dy, t.b + dx];                             // 270 clockwise = 90 anticlockwise
}
function describe(t) {
  if (t.kind === 'translate') return `Translate by the vector (${num(t.a)}, ${num(t.b)}) — ${Math.abs(t.a)} ${t.a >= 0 ? 'right' : 'left'} and ${Math.abs(t.b)} ${t.b >= 0 ? 'up' : 'down'}.`;
  if (t.kind === 'reflect') return `Reflect in the mirror line ${t.line === 'x' ? `x = ${num(t.k)}` : t.line === 'y' ? `y = ${num(t.k)}` : t.line === 'y=x' ? 'y = x' : 'y = −x'}.`;
  const turn = t.deg === 180 ? '180°' : t.deg === 90 ? '90° clockwise' : '90° anticlockwise';
  return `Rotate ${turn} about ${t.a === 0 && t.b === 0 ? 'the origin (0, 0)' : `the point (${num(t.a)}, ${num(t.b)})`}.`;
}
function rule(t) {
  if (t.kind === 'translate') return `Add ${num(t.a)} to every x and ${num(t.b)} to every y. Every point moves the same way.`;
  if (t.kind === 'reflect') return t.line === 'y=x' ? 'Swap x and y: (x, y) → (y, x). Each point ends up the same distance from the mirror, on the other side.'
    : t.line === 'y=-x' ? 'Swap and flip both: (x, y) → (−y, −x). Each point ends up the same distance from the mirror, on the other side.'
      : 'Each point ends up the same distance from the mirror, straight across on the other side. Points on the mirror stay put.';
  if (t.a === 0 && t.b === 0) return t.deg === 180 ? '(x, y) → (−x, −y): half a turn flips both signs.' : t.deg === 90 ? '(x, y) → (y, −x) for a quarter turn clockwise.' : '(x, y) → (−y, x) for a quarter turn anticlockwise.';
  return 'Every point stays the same distance from the centre and turns through the same angle.';
}
function newMove(band, kindWanted = 'any', r = Math.random) {
  const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const kinds = band === '6-7' ? ['reflect', 'translate'] : ['reflect', 'rotate', 'translate'];
  for (let tries = 0; tries < 500; tries++) {
    const kind = kindWanted !== 'any' && kinds.includes(kindWanted) ? kindWanted : kinds[ri(0, kinds.length - 1)];
    let t;
    if (kind === 'translate') { t = { kind, a: ri(-5, 5), b: ri(-5, 5) }; if (!t.a && !t.b) continue; if (band === '6-7' && t.a && t.b) t.b = 0; }
    else if (kind === 'reflect') { const lines = band === '11-14' ? ['x', 'y', 'y=x', 'y=-x'] : ['x', 'y']; t = { kind, line: lines[ri(0, lines.length - 1)], k: band === '6-7' ? 0 : ri(-2, 2) }; }
    else t = { kind, deg: [90, 180, 270][ri(0, 2)], a: band === '11-14' ? ri(-2, 2) : 0, b: band === '11-14' ? ri(-2, 2) : 0 };
    const base = MSHAPES[ri(0, MSHAPES.length - 1)], q = ri(0, 3);
    let pts = base.map(([x, y]) => { let p = [x, y]; for (let i = 0; i < q; i++) p = [-p[1], p[0]]; return p; });
    const ox = ri(-6, 6), oy = ri(-6, 6); pts = pts.map(([x, y]) => [x + ox, y + oy]);
    const img = pts.map((p) => mapPoint(t, p)), inb = (p) => Math.abs(p[0]) <= G && Math.abs(p[1]) <= G;
    if (!pts.every(inb) || !img.every(inb)) continue;
    if (img.every((p, i) => p[0] === pts[i][0] && p[1] === pts[i][1])) continue;
    return { t, pts, img };
  }
  return { t: { kind: 'translate', a: 2, b: 1 }, pts: [[0, 0], [3, 0], [1, 2]], img: [[2, 1], [5, 1], [3, 3]] };
}
function mState(ctx) {
  const ui = ctx.ui; if (!ui.m) ui.m = { ...newMove(ctx.band), want: 'any', cur: [0, 0], shown: false, right: 0, tries: 0, last: null };
  return ui.m;
}
function movesSVG(m) {
  let s = '';
  for (let i = -G; i <= G; i++) s += line(gs([i, -G]), gs([i, G]), i === 0 ? 'dg-line' : 'dg-grid') + line(gs([-G, i]), gs([G, i]), i === 0 ? 'dg-line' : 'dg-grid');
  for (let i = -G; i <= G; i += 2) if (i) s += T(f1(gs([i, 0])[0]), f1(gs([i, 0])[1] + 14), num(i), 'dg-small') + T(f1(gs([0, i])[0] - 6), f1(gs([0, i])[1] + 4), num(i), 'dg-small', 'end');
  const t = m.t;
  if (t.kind === 'reflect') {
    const [a, b] = t.line === 'x' ? [[t.k, -G], [t.k, G]] : t.line === 'y' ? [[-G, t.k], [G, t.k]] : t.line === 'y=x' ? [[-G, -G], [G, G]] : [[-G, G], [G, -G]];
    s += line(gs(a), gs(b), 't-shapes-mirror');
  }
  if (t.kind === 'rotate') { const c = gs([t.a, t.b]); s += `<circle cx="${c[0]}" cy="${c[1]}" r="6" class="t-shapes-centre"/>`; }
  s += `<polygon points="${P(m.pts.map(gs))}" class="t-shapes-obj"/>`;
  const A = gs(m.pts[0]); s += `<circle cx="${A[0]}" cy="${A[1]}" r="5" class="t-shapes-vtx"/>` + T(f1(A[0] - 10), f1(A[1] - 8), 'A', 'dg-accent');
  if (m.shown) {
    s += `<polygon points="${P(m.img.map(gs))}" class="t-shapes-img"/>`;
    m.pts.forEach((p, i) => { s += line(gs(p), gs(m.img[i]), 't-shapes-trail'); });
    const A2 = gs(m.img[0]); s += `<circle cx="${A2[0]}" cy="${A2[1]}" r="5" class="t-shapes-vtx"/>` + T(f1(A2[0] + 12), f1(A2[1] - 8), 'A′', 'dg-accent');
  }
  const cu = gs(m.cur); s += `<circle cx="${cu[0]}" cy="${cu[1]}" r="9" class="t-shapes-pred"/>`;
  if (!m.shown) for (let x = -G; x <= G; x++) for (let y = -G; y <= G; y++) { const p = gs([x, y]); s += `<circle cx="${p[0]}" cy="${p[1]}" r="11" class="t-shapes-hit" data-act="lib" data-arg="mpt|${x},${y}"/>`; }
  return kit.svg(2 * GP + 2 * G * GU, 2 * GP + 2 * G * GU, s, 'A shape on a coordinate grid');
}
function viewMoves(ctx) {
  const m = mState(ctx), t = m.t, kinds = ctx.band === '6-7' ? ['any', 'reflect', 'translate'] : ['any', 'reflect', 'rotate', 'translate'];
  const seg = `<div class="seg small">${kinds.map((k) => `<button class="${m.want === k ? 'on' : ''}" data-act="lib" data-arg="mkind|${k}">${k === 'any' ? 'Mix' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`;
  const A = m.pts[0], A2 = m.img[0];
  const side = `<p class="kicker">Predict, then look · ${m.right} right of ${m.tries}</p><p class="t-shapes-big2">${esc(describe(t))}</p>
    <p>Where does corner <b>A (${num(A[0])}, ${num(A[1])})</b> land? Tap the grid, or move the ring with the arrows.</p>
    <p>Your guess: <b>(${num(m.cur[0])}, ${num(m.cur[1])})</b></p>
    ${m.shown ? `<p class="t-shapes-note ${m.last ? 'win' : ''}">${m.last ? '✓ Right' : 'Not this time'} — A′ is (${num(A2[0])}, ${num(A2[1])}).</p><p>${rule(t)}</p>
      <button class="btn primary" data-act="lib" data-arg="mnext">Another one</button>`
      : '<button class="btn primary" data-act="lib" data-arg="mreveal">Show me</button>'}
    <p class="muted">Keys: arrows move the ring, Enter shows, Enter again for the next.</p>`;
  return seg + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${movesSVG(m)}</div><div class="card">${side}</div></div>`;
}
function actMoves(name, arg, ctx) {
  const m = mState(ctx);
  if (name === 'mkind') { m.want = arg; Object.assign(m, newMove(ctx.band, arg), { shown: false }); return true; }
  if (name === 'mpt') { if (m.shown) return true; const [x, y] = String(arg).split(',').map(Number); if (Number.isFinite(x) && Number.isFinite(y)) m.cur = [clamp(x, -G, G), clamp(y, -G, G)]; ctx.sfx.click(); return true; }
  if (name === 'mreveal') {
    if (m.shown) return true;
    m.shown = true; m.tries++; m.last = m.cur[0] === m.img[0][0] && m.cur[1] === m.img[0][1];
    if (m.last) { m.right++; ctx.sfx.good(); ctx.tick(true, 2); ctx.data.movesRight = (ctx.data.movesRight || 0) + 1; ctx.save(); } else ctx.sfx.bad();
    return true;
  }
  if (name === 'mnext') { Object.assign(m, newMove(ctx.band, m.want), { shown: false, last: null }); return true; }
  return false;
}
function keyMoves(e, ctx) {
  const m = mState(ctx), mv = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (mv) { if (!m.shown) m.cur = [clamp(m.cur[0] + mv[0], -G, G), clamp(m.cur[1] + mv[1], -G, G)]; return true; }
  if ((e.key === 'Enter' || e.key === ' ') && !onButton(e)) return actMoves(m.shown ? 'mnext' : 'mreveal', '', ctx);
  return false;
}

/* ================================================= 7. constructions */

/* Ruler and compasses, one mark at a time. Every construction is built from
   its starting points by the same moves a child makes on paper — an arc is a
   centre and a radius, a crossing is where two circles meet, a ruler line
   joins two points — so the picture is the construction, never a drawing of
   the answer. Screen coordinates throughout (y down); geometry does not mind. */

const KW = 400, KH = 320, PXCM = 40;           // 40 px of drawing is read as 1 cm
const kv = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]], add: (a, b) => [a[0] + b[0], a[1] + b[1]], mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1], cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
};
kv.unit = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const kmid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/* where two circles cross: [], one point (touching) or two */
function circlesMeet(c1, r1, c2, r2) {
  const d = kv.dist(c1, c2); if (d < 1e-12) return [];
  const x = (d * d + r1 * r1 - r2 * r2) / (2 * d), h2 = r1 * r1 - x * x;
  if (h2 < -1e-9) return [];
  const u = kv.unit(kv.sub(c2, c1)), n = [-u[1], u[0]], base = kv.add(c1, kv.mul(u, x));
  if (h2 <= 1e-9) return [base];
  const h = Math.sqrt(h2); return [kv.add(base, kv.mul(n, h)), kv.add(base, kv.mul(n, -h))];
}
/* where line p1p2 meets line p3p4 */
function linesMeet(p1, p2, p3, p4) {
  const d1 = kv.sub(p2, p1), d2 = kv.sub(p4, p3), t = kv.cross(kv.sub(p3, p1), d2) / kv.cross(d1, d2);
  return kv.add(p1, kv.mul(d1, t));
}
/* the angle at o between o→p and o→q, 0–180° */
const angAt = (o, p, q) => { const a = kv.sub(p, o), b = kv.sub(q, o); return Math.acos(clamp(kv.dot(a, b) / (Math.hypot(...a) * Math.hypot(...b)), -1, 1)) / RAD; };
/* the part of the page a line through p (direction d) crosses: a ray from p, or both ways */
function clipLine(p, d, ray) {
  let lo = ray ? 0 : -Infinity, hi = Infinity;
  for (const [i, K] of [[0, KW], [1, KH]]) {
    if (Math.abs(d[i]) < 1e-12) continue;
    const t1 = (4 - p[i]) / d[i], t2 = (K - 4 - p[i]) / d[i];
    lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
  }
  return [kv.add(p, kv.mul(d, lo)), kv.add(p, kv.mul(d, hi))];
}
/* an arc's sweep (a0 < a1, clockwise on screen) that passes through pts, padded */
function arcSpan(c, pts, pad) {
  const an = pts.map((p) => Math.atan2(p[1] - c[1], p[0] - c[0]));
  if (an.length === 1) return [an[0] - pad, an[0] + pad];
  const d = mod(an[1] - an[0], 2 * Math.PI);
  return d <= Math.PI ? [an[0] - pad, an[0] + d + pad] : [an[1] - pad, an[1] + (2 * Math.PI - d) + pad];
}
const arcCovers = (arc, p) => mod(Math.atan2(p[1] - arc.c[1], p[0] - arc.c[0]) - arc.a0, 2 * Math.PI) <= arc.a1 - arc.a0 + 1e-9;
const kLab = (n) => n.replace('2', '′');

/* drawing primitives. A step adds exactly one stroke — a ruler line (`seg`)
   or a compass arc (`arc`) — plus the points it finds and any marks. */
const kSeg = (a, b, cls = 'rule') => ({ t: 'seg', a, b, cls });
const kArc = (N, cn, r, span, more = {}) => ({ t: 'arc', cn, c: N[cn], r, a0: span[0], a1: span[1], thru: [], ...more });
const kPt = (...ns) => ns.map((n) => ({ t: 'pt', n }));
const kRight = (at, u, v) => ({ t: 'right', at, u: kv.unit(u), v: kv.unit(v) });

function buildPerp([A, B]) {
  const ab = kv.dist(A, B), r = 0.65 * ab;
  const [P, Q] = circlesMeet(A, r, B, r).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  const M = linesMeet(P, Q, A, B), N = { A, B, P, Q, M }, e = kv.mul(kv.sub(Q, P), 0.22);
  const span = (c) => arcSpan(c, [P, Q], 0.3);
  return { N, steps: [
    { cap: 'Here is a segment, <b>AB</b>. You are going to find the line that cuts it exactly in half, at right angles — with only a ruler and compasses.', add: [kSeg(A, B, 'given'), ...kPt('A', 'B')] },
    { cap: 'Put the compass point on <b>A</b> and open it to <b>more than half</b> of AB. Draw an arc above and below the segment.', add: [kArc(N, 'A', r, span(A), { thru: ['P', 'Q'], gt: ['A', 'B', 0.5] })] },
    { cap: 'Keep the same opening. Put the compass point on <b>B</b> and draw another arc. The two arcs cross at <b>P</b> and <b>Q</b>.', add: [kArc(N, 'B', r, span(B), { thru: ['P', 'Q'], same: 1 }), ...kPt('P', 'Q')] },
    { cap: 'Line the ruler up on <b>P</b> and <b>Q</b> and draw the line. It crosses AB at <b>M</b> — the exact middle, at a right angle.', add: [kSeg(kv.sub(P, e), kv.add(Q, e)), kRight(M, kv.sub(B, A), kv.sub(P, M)), ...kPt('M')] },
  ],
  why: ['Every arc had the same opening, so <b>AP, BP, AQ and BQ are all the same length</b>.',
    'Four equal sides make a <b>rhombus</b>, and the diagonals of a rhombus cut each other in half at right angles. So M is the middle of AB, and PQ meets AB at 90°.',
    'Better still: <b>every</b> point on PQ is the same distance from A as from B. That is what the line is for.'],
  deep: 'In symbols: AP = BP and AQ = BQ, with PQ shared, so triangles APQ and BPQ are congruent (SSS). Their angles at P are equal, so triangles APM and BPM are congruent too (SAS): AM = MB, and the two angles at M are equal and add to 180°, so each is 90°.',
  meas: `AM = ${num(kv.dist(A, M) / PXCM, 1)} cm, MB = ${num(kv.dist(M, B) / PXCM, 1)} cm, and angle AMP = ${Math.round(angAt(M, A, P))}°.` };
}
function buildAngle([O, P, Q]) {
  const r1 = 0.5 * Math.min(kv.dist(O, P), kv.dist(O, Q));
  const X = kv.add(O, kv.mul(kv.unit(kv.sub(P, O)), r1)), Y = kv.add(O, kv.mul(kv.unit(kv.sub(Q, O)), r1));
  const r2 = 0.8 * kv.dist(X, Y), Z = circlesMeet(X, r2, Y, r2).sort((p, q) => kv.dist(q, O) - kv.dist(p, O))[0];
  const N = { O, P, Q, X, Y, Z }, [, far] = clipLine(O, kv.unit(kv.sub(Z, O)), true);
  const half = angAt(O, P, Z);
  return { N, steps: [
    { cap: 'Here is an angle, <b>POQ</b>, with its corner at <b>O</b>. You are going to cut it into two equal halves.', add: [kSeg(O, P, 'given'), kSeg(O, Q, 'given'), ...kPt('O', 'P', 'Q')] },
    { cap: 'Put the compass point on the corner <b>O</b> and draw an arc that crosses both arms, at <b>X</b> and <b>Y</b>.', add: [kArc(N, 'O', r1, arcSpan(O, [X, Y], 0.25), { thru: ['X', 'Y'] }), ...kPt('X', 'Y')] },
    { cap: 'Put the compass point on <b>X</b> and draw an arc inside the angle. Open it to more than half the gap from X to Y.', add: [kArc(N, 'X', r2, arcSpan(X, [Z], 0.4), { thru: ['Z'], gt: ['X', 'Y', 0.5] })] },
    { cap: 'Keep the same opening. Put the point on <b>Y</b> and draw an arc that crosses the last one, at <b>Z</b>.', add: [kArc(N, 'Y', r2, arcSpan(Y, [Z], 0.4), { thru: ['Z'], same: 2 }), ...kPt('Z')] },
    { cap: 'With the ruler, draw a line from <b>O</b> through <b>Z</b>. It cuts the angle exactly in half.', add: [kSeg(O, far)] },
  ],
  why: ['The first arc made <b>OX = OY</b>. The next two had the same opening, so <b>XZ = YZ</b>.',
    'So the triangles OXZ and OYZ have three matching sides (OZ is in both). Triangles with the same three sides are the same shape — so their angles at O are equal.',
    'That is the whole trick: two matching triangles, side by side, sharing the line you drew.'],
  deep: 'In symbols: OX = OY, XZ = YZ and OZ = OZ, so triangle OXZ ≅ triangle OYZ (SSS), and angle XOZ = angle YOZ. Z is also the same distance from both arms — every point on the bisector is.',
  meas: `Angle POQ = ${Math.round(angAt(O, P, Q))}°. Angle POZ = ${Math.round(half)}° and angle ZOQ = ${Math.round(angAt(O, Z, Q))}°.` };
}
function buildDrop([A, B, P]) {
  const u = kv.unit(kv.sub(B, A)), d = Math.abs(kv.cross(u, kv.sub(P, A))), r = 1.3 * d;
  const F0 = kv.add(A, kv.mul(u, kv.dot(kv.sub(P, A), u))), h = Math.sqrt(r * r - d * d);
  const X = kv.sub(F0, kv.mul(u, h)), Y = kv.add(F0, kv.mul(u, h));
  const s = 0.7 * kv.dist(X, Y), side = Math.sign(kv.cross(u, kv.sub(P, A)));
  const Z = circlesMeet(X, s, Y, s).find((p) => Math.sign(kv.cross(u, kv.sub(p, A))) === -side);
  const F = linesMeet(P, Z, A, B), N = { A, B, P, X, Y, Z, F }, [l0, l1] = clipLine(A, u, false);
  return { N, steps: [
    { cap: 'Here is a line and a point <b>P</b> that is not on it. You are going to draw the shortest path from P to the line — the one that meets it at right angles.', add: [kSeg(l0, l1, 'given'), ...kPt('A', 'B', 'P')] },
    { cap: 'Put the compass point on <b>P</b> and draw an arc that crosses the line twice, at <b>X</b> and <b>Y</b>.', add: [kArc(N, 'P', r, arcSpan(P, [X, Y], 0.25), { thru: ['X', 'Y'] }), ...kPt('X', 'Y')] },
    { cap: 'Put the compass point on <b>X</b> and draw an arc on the far side of the line from P. Open it more than half way to Y.', add: [kArc(N, 'X', s, arcSpan(X, [Z], 0.4), { thru: ['Z'], gt: ['X', 'Y', 0.5] })] },
    { cap: 'Keep the same opening. Put the point on <b>Y</b> and draw an arc that crosses the last one, at <b>Z</b>.', add: [kArc(N, 'Y', s, arcSpan(Y, [Z], 0.4), { thru: ['Z'], same: 2 }), ...kPt('Z')] },
    { cap: 'Line the ruler up on <b>P</b> and <b>Z</b> and draw. It meets the line at <b>F</b>, at a right angle. PF is the shortest way from P to the line.', add: [kSeg(P, Z), kRight(F, u, kv.sub(P, F)), ...kPt('F')] },
  ],
  why: ['The first arc made <b>PX = PY</b>. The next two had the same opening, so <b>ZX = ZY</b>.',
    'So P and Z are each the same distance from X as from Y. Points like that all lie on the <b>perpendicular bisector</b> of XY — the first construction on this bench.',
    'So PZ crosses the line XY at right angles. And a slanting path from P to the line is the long side of a right-angled triangle, so it is always longer than PF.'],
  deep: 'In symbols: PX = PY and ZX = ZY, so P and Z both lie on the perpendicular bisector of XY; two points fix a line, so PZ is that bisector and PF ⟂ XY. For any other point G on the line, PG² = PF² + FG² > PF² (Pythagoras).',
  meas: `Angle PFB = ${Math.round(angAt(F, P, B))}°, and PF = ${num(kv.dist(P, F) / PXCM, 1)} cm.` };
}
function buildEqui([A, B]) {
  const ab = kv.dist(A, B), C = circlesMeet(A, ab, B, ab).sort((p, q) => p[1] - q[1] || p[0] - q[0])[0], N = { A, B, C };
  return { N, steps: [
    { cap: 'Here is a segment, <b>AB</b>. You are going to build a triangle with all three sides equal to it — and with it, an angle of exactly 60°.', add: [kSeg(A, B, 'given'), ...kPt('A', 'B')] },
    { cap: 'Open the compasses to exactly the length of AB. Put the point on <b>A</b> and draw an arc above the middle of AB.', add: [kArc(N, 'A', ab, arcSpan(A, [C], 0.35), { thru: ['C'], eq: ['A', 'B'] })] },
    { cap: 'Keep that opening. Put the point on <b>B</b> and draw an arc crossing the first one, at <b>C</b>.', add: [kArc(N, 'B', ab, arcSpan(B, [C], 0.35), { thru: ['C'], same: 1, eq: ['A', 'B'] }), ...kPt('C')] },
    { cap: 'Join <b>A</b> to <b>C</b> with the ruler.', add: [kSeg(A, C)] },
    { cap: 'Join <b>B</b> to <b>C</b>. Every side is the same length, and every angle is 60°.', add: [kSeg(B, C)] },
  ],
  why: ['C is on the first arc, so <b>AC = AB</b>. It is on the second arc too, so <b>BC = BA</b>.',
    'So all three sides are equal: an <b>equilateral</b> triangle. Its three angles are equal too, and they add to 180°, so each one is 180° ÷ 3 = <b>60°</b>.',
    'Bisect one of those angles (the second construction) and you have made 30°.'],
  deep: 'This is the very first construction in Euclid\'s Elements (Book I, Proposition 1).',
  meas: `AB = ${num(ab / PXCM, 1)} cm, BC = ${num(kv.dist(B, C) / PXCM, 1)} cm, CA = ${num(kv.dist(C, A) / PXCM, 1)} cm. Angles: ${Math.round(angAt(A, B, C))}°, ${Math.round(angAt(B, C, A))}°, ${Math.round(angAt(C, A, B))}°.` };
}
function buildCopy([O, P, Q, D, R]) {
  const r = 0.5 * Math.min(kv.dist(O, P), kv.dist(O, Q));
  const X = kv.add(O, kv.mul(kv.unit(kv.sub(P, O)), r)), Y = kv.add(O, kv.mul(kv.unit(kv.sub(Q, O)), r));
  const X2 = kv.add(D, kv.mul(kv.unit(kv.sub(R, D)), r)), w = kv.dist(X, Y), turn = Math.sign(kv.cross(kv.sub(P, O), kv.sub(Q, O)));
  const Y2 = circlesMeet(D, r, X2, w).find((p) => Math.sign(kv.cross(kv.sub(R, D), kv.sub(p, D))) === turn);
  const N = { O, P, Q, D, R, X, Y, X2, Y2 }, [, far] = clipLine(D, kv.unit(kv.sub(Y2, D)), true);
  return { N, steps: [
    { cap: 'Here is an angle <b>POQ</b>, and a ray starting from a new point <b>D</b>. You are going to make the same angle at D — without a protractor.', add: [kSeg(O, P, 'given'), kSeg(O, Q, 'given'), kSeg(D, R, 'given'), ...kPt('O', 'P', 'Q', 'D', 'R')] },
    { cap: 'Put the compass point on <b>O</b> and draw an arc that crosses both arms, at <b>X</b> and <b>Y</b>.', add: [kArc(N, 'O', r, arcSpan(O, [X, Y], 0.25), { thru: ['X', 'Y'] }), ...kPt('X', 'Y')] },
    { cap: 'Keep the same opening. Put the point on <b>D</b> and draw a long arc that crosses the ray, at <b>X′</b>.', add: [kArc(N, 'D', r, arcSpan(D, [X2, Y2], 0.3), { thru: ['X2', 'Y2'], same: 1 }), ...kPt('X2')] },
    { cap: 'Now open the compasses from X to Y. Put the point on <b>X′</b> and draw an arc crossing the long one, at <b>Y′</b>.', add: [{ t: 'meas', a: X, b: Y }, kArc(N, 'X2', w, arcSpan(X2, [Y2], 0.4), { thru: ['Y2'], eq: ['X', 'Y'] }), ...kPt('Y2')] },
    { cap: 'With the ruler, draw from <b>D</b> through <b>Y′</b>. The angle at D is a copy of the angle at O.', add: [kSeg(D, far)] },
  ],
  why: ['The two big arcs had the same opening, so <b>DX′ = OX</b> and <b>DY′ = OY</b>.',
    'Then you measured the gap: <b>X′Y′ = XY</b>.',
    'So triangle X′DY′ and triangle XOY have three matching sides. Triangles with the same three sides are the same shape — so the angle at D equals the angle at O.'],
  deep: 'In symbols: DX′ = OX, DY′ = OY and X′Y′ = XY, so triangle X′DY′ ≅ triangle XOY (SSS), and angle X′DY′ = angle XOY.',
  meas: `Angle POQ = ${Math.round(angAt(O, P, Q))}°, and the copy, angle X′DY′ = ${Math.round(angAt(D, X2, Y2))}°.` };
}
const sssOk = ({ a, b, c }) => a + b > c && b + c > a && a + c > b;
/* SSS: AB = c along the bottom, the compasses set to b at A and to a at B.
   Built at scale s from origin o, so the whole thing can be fitted to the page. */
function buildSSSat(L, s, o) {
  const { a, b, c } = L, A = o, B = [o[0] + c * s, o[1]], N = { A, B }, fine = sssOk(L), u = [1, 0];
  const cm = (x) => `${x} cm`;
  const steps = [{ cap: `With the ruler, draw <b>AB</b> exactly ${cm(c)} long. It will be the side c.`, add: [kSeg(A, B, 'given'), ...kPt('A', 'B'), { t: 'txt', at: kv.add(kmid(A, B), [0, 22]), s: `c = ${cm(c)}` }] }];
  let why, fail = null;
  if (fine) {
    const C = circlesMeet(A, b * s, B, a * s).sort((p, q) => p[1] - q[1])[0]; N.C = C;
    steps.push(
      { cap: `Open the compasses to ${cm(b)}, the side b. Put the point on <b>A</b> and draw an arc: every point on it is ${cm(b)} from A.`, add: [kArc(N, 'A', b * s, arcSpan(A, [C], 0.45), { thru: ['C'], rv: b })] },
      { cap: `Open them to ${cm(a)}, the side a. Put the point on <b>B</b> and draw an arc. The arcs cross at <b>C</b>.`, add: [kArc(N, 'B', a * s, arcSpan(B, [C], 0.45), { thru: ['C'], rv: a }), ...kPt('C')] },
      { cap: `Join <b>A</b> to <b>C</b> with the ruler: ${cm(b)}.`, add: [kSeg(A, C)] },
      { cap: `Join <b>B</b> to <b>C</b>: ${cm(a)}. That is the triangle — and the only one with these three sides.`, add: [kSeg(B, C)] });
    const cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    const out = (p, q, s2) => { const m = kmid(p, q), d = kv.unit(kv.sub(m, cen)); return { t: 'txt', at: kv.add(m, kv.mul(d, 10)), s: s2, anchor: d[0] > 0.25 ? 'start' : d[0] < -0.25 ? 'end' : 'middle' }; };
    steps[3].add.push(out(A, C, `b = ${cm(b)}`)); steps[4].add.push(out(B, C, `a = ${cm(a)}`));
    why = [`C is on the first arc, so it is exactly ${cm(b)} from A. It is on the second arc, so it is exactly ${cm(a)} from B. The only places that are both are where the arcs cross.`,
      'They cross twice — above AB and below — and the two triangles are mirror images, the same shape. So three sides fix a triangle: there is only one.',
      'That is why builders brace a frame with triangles. A triangle cannot change shape without changing a side length; a square can.'];
  } else {
    // which circle is outside which decides where the two arcs come closest
    const [dirA, dirB] = c >= a + b ? [0, Math.PI] : a >= b + c ? [Math.PI, Math.PI] : [0, 0];
    const pA = kv.add(A, kv.mul([Math.cos(dirA), Math.sin(dirA)], b * s)), pB = kv.add(B, kv.mul([Math.cos(dirB), Math.sin(dirB)], a * s));
    N.gA = pA; N.gB = pB;
    const sides = [a, b, c].sort((x, y) => x - y), eq = sides[0] + sides[1] === sides[2];
    fail = `${sides[0]} + ${sides[1]} = ${sides[0] + sides[1]} cm, ${eq ? 'which is only equal to' : 'which is shorter than'} ${sides[2]} cm.`;
    steps.push(
      { cap: `Open the compasses to ${cm(b)}, the side b. Put the point on <b>A</b> and draw an arc: every point on it is ${cm(b)} from A.`, add: [kArc(N, 'A', b * s, [dirA - 0.9, dirA + 0.9], { thru: ['gA'], rv: b })] },
      { cap: `Open them to ${cm(a)}, the side a. Put the point on <b>B</b> and draw an arc. ${eq ? 'The arcs only just touch — on the line AB itself.' : 'The arcs do not meet.'}`, add: [kArc(N, 'B', a * s, [dirB - 0.9, dirB + 0.9], { thru: ['gB'], rv: a })] },
      { cap: eq ? 'The only point on both arcs lies on AB, so the “triangle” is squashed flat. There is no corner C.' : 'There is no point on both arcs, so there is nowhere to put the corner C.', add: [{ t: 'gap', a: pA, b: pB }], fail: true });
    why = [`The two shorter sides add up to ${fail}`,
      `To make a corner, the two shorter sides have to reach further than the longest side. ${eq ? 'Only equal means they lie flat along it.' : 'These cannot even reach across it.'}`,
      'In every triangle, any two sides add up to <b>more</b> than the third. It is called the <b>triangle inequality</b>.'];
  }
  return { N, steps, why, fail, unit: s,
    deep: fine ? 'In symbols: two triangles whose three sides match are congruent (SSS) — this construction is the reason that rule is true.' : 'In symbols: a triangle with sides a, b, c exists exactly when a + b > c, b + c > a and c + a > b.',
    meas: fine ? `Measured from the drawing: AB = ${num(kv.dist(A, B) / s)} cm, BC = ${num(kv.dist(B, N.C) / s)} cm, CA = ${num(kv.dist(N.C, A) / s)} cm.` : '' };
}
function buildSSS(L) {
  const probe = buildSSSat(L, 1, [0, 0]), all = Object.values(probe.N);
  for (const st of probe.steps) for (const p of st.add) if (p.t === 'arc') for (let t = p.a0; t <= p.a1; t += 0.05) all.push([p.c[0] + p.r * Math.cos(t), p.c[1] + p.r * Math.sin(t)]);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min(30, (KW - 70) / (x1 - x0 || 1), (KH - 80) / (y1 - y0 || 1));
  return buildSSSat(L, s, [KW / 2 - s * (x0 + x1) / 2, KH / 2 - 6 - s * (y0 + y1) / 2]);
}

/* the ways a moved point could spoil a picture — refused before it happens */
const inBox = (p, m) => p[0] >= m && p[0] <= KW - m && p[1] >= m && p[1] <= KH - m;
function openAngle(O, P, Q) {
  if (kv.dist(O, P) < 90 || kv.dist(O, Q) < 90) return 'Keep the arms at least a little long, so the arcs have room.';
  const t = angAt(O, P, Q); return t < 25 ? 'That angle is too thin to draw arcs inside.' : t > 155 ? 'That angle is nearly flat — keep it under 155° so the arcs meet on the page.' : '';
}
const CONS = [
  { id: 'perp', name: 'Perpendicular bisector', young: true, mv: ['A', 'B'], build: buildPerp,
    pre: [[[90, 160], [300, 145]], [[150, 250], [240, 75]], [[100, 105], [310, 200]]],
    check: ([A, B]) => (kv.dist(A, B) < 90 ? 'Keep A and B a little further apart.' : '') },
  { id: 'angle', name: 'Angle bisector', young: true, mv: ['O', 'P', 'Q'], build: buildAngle,
    pre: [[[60, 260], [350, 250], [220, 50]], [[200, 270], [370, 215], [45, 175]], [[50, 170], [360, 70], [340, 290]]],
    check: ([O, P, Q]) => openAngle(O, P, Q) },
  { id: 'sss', name: 'Triangle from three sides', young: true, build: null, pre: [{ a: 4, b: 5, c: 6 }, { a: 5, b: 5, c: 5 }, { a: 3, b: 4, c: 5 }, { a: 2, b: 3, c: 7 }, { a: 3, b: 4, c: 7 }] },
  { id: 'drop', name: 'Perpendicular from a point', young: false, mv: ['A', 'B', 'P'], build: buildDrop,
    pre: [[[40, 170], [360, 180], [180, 80]], [[40, 115], [360, 205], [250, 55]], [[60, 225], [350, 140], [140, 110]]],
    check: ([A, B, P]) => { if (kv.dist(A, B) < 90) return 'Keep A and B a little further apart.'; const d = Math.abs(kv.cross(kv.unit(kv.sub(B, A)), kv.sub(P, A))); return d < 35 ? 'P is too close to the line — move it further away.' : ''; } },
  { id: 'equi', name: 'Equilateral triangle (60°)', young: true, mv: ['A', 'B'], build: buildEqui,
    pre: [[[100, 260], [300, 260]], [[130, 290], [290, 210]], [[110, 200], [255, 290]]],
    check: ([A, B]) => (kv.dist(A, B) < 70 ? 'Keep A and B a little further apart.' : '') },
  { id: 'copy', name: 'Copy an angle', young: false, mv: ['O', 'P', 'Q', 'D', 'R'], build: buildCopy,
    pre: [[[30, 250], [190, 255], [120, 110], [215, 280], [375, 270]], [[40, 80], [185, 40], [170, 190], [215, 150], [375, 110]], [[30, 290], [175, 215], [70, 150], [215, 295], [375, 290]]],
    check: ([O, P, Q, D, R]) => openAngle(O, P, Q) || (kv.dist(D, R) < 90 ? 'Keep the new ray a little longer.' : '') },
];
const conById = Object.fromEntries(CONS.map((c) => [c.id, c]));
const conList = (band) => CONS.filter((c) => band !== '6-7' || c.young);
const CLINKS = { perp: ['perpendicular-bisector'], angle: ['angle-bisector'], sss: ['construct-triangle'], drop: ['perpendicular-bisector'], equi: ['construct-triangle', 'angle-bisector'], copy: ['angle-bisector'] };
/* a set of starting points: '' if it makes a good picture, or why not */
function conProblem(con, pts) {
  if (!pts.every((p) => inBox(p, 18))) return 'That would take a point off the page.';
  const why = con.check(pts); if (why) return why;
  const res = con.build(pts);
  if (!Object.values(res.N).every((p) => p && inBox(p, 6))) return 'That would push part of the construction off the page.';
  return '';
}
function kState(ctx) {
  const ui = ctx.ui;
  if (!ui.k) ui.k = { id: 'perp', step: 0, sel: -1, pts: {}, L: { ...CONS[2].pre[0] }, lsel: 'c', msg: '' };
  const k = ui.k; if (!conList(ctx.band).some((c) => c.id === k.id)) k.id = 'perp';
  return k;
}
const kPts = (k, con) => k.pts[con.id] || (k.pts[con.id] = con.pre[0].map((p) => [...p]));
const kBuild = (k, con) => (con.id === 'sss' ? buildSSS(k.L) : con.build(kPts(k, con)));

function conSVG(res, step, con, k) {
  let arcs = '', lines = '', marks = '', pts = '';
  const N = res.N, all = Object.values(N), cen = [all.reduce((a, p) => a + p[0], 0) / all.length, all.reduce((a, p) => a + p[1], 0) / all.length];
  res.steps.slice(0, step + 1).forEach((st, i) => {
    const now = i === step && i > 0 ? ' now' : '';
    for (const p of st.add) {
      if (p.t === 'seg') lines += line(p.a, p.b, `t-shapes-k-${p.cls}${now}`);
      else if (p.t === 'meas') marks += line(p.a, p.b, 't-shapes-k-meas');
      else if (p.t === 'arc') {
        const s = [p.c[0] + p.r * Math.cos(p.a0), p.c[1] + p.r * Math.sin(p.a0)], e = [p.c[0] + p.r * Math.cos(p.a1), p.c[1] + p.r * Math.sin(p.a1)];
        arcs += `<path d="M${f1(s[0])},${f1(s[1])} A${f1(p.r)},${f1(p.r)} 0 ${p.a1 - p.a0 > Math.PI ? 1 : 0} 1 ${f1(e[0])},${f1(e[1])}" class="t-shapes-k-arc${now}"/>`;
        if (now) marks += line(p.c, e, 't-shapes-k-rad') + `<circle cx="${f1(p.c[0])}" cy="${f1(p.c[1])}" r="5" class="t-shapes-k-piv"/><circle cx="${f1(e[0])}" cy="${f1(e[1])}" r="3.5" class="t-shapes-k-piv"/>`;
      } else if (p.t === 'right') {
        const a = kv.add(p.at, kv.mul(p.u, 11)), b = kv.add(a, kv.mul(p.v, 11)), c = kv.add(p.at, kv.mul(p.v, 11));
        marks += `<polyline points="${P([a, b, c])}" class="t-shapes-right"/>`;
      } else if (p.t === 'gap') {
        marks += kv.dist(p.a, p.b) > 1 ? line(p.a, p.b, 't-shapes-k-gap') : '';
        marks += `<circle cx="${f1(p.a[0])}" cy="${f1(p.a[1])}" r="4.5" class="t-shapes-k-miss"/><circle cx="${f1(p.b[0])}" cy="${f1(p.b[1])}" r="4.5" class="t-shapes-k-miss"/>`;
      } else if (p.t === 'txt') marks += T(f1(p.at[0]), f1(p.at[1] + 4), p.s, 't-shapes-k-len', p.anchor || 'middle');
      else if (p.t === 'pt') {
        const q = N[p.n]; let d = kv.sub(q, cen); d = Math.hypot(...d) < 1 ? [0, -1] : kv.unit(d);
        pts += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="4" class="t-shapes-vtx"/>` + T(f1(q[0] + d[0] * 15), f1(q[1] + d[1] * 15 + 5), kLab(p.n), 't-shapes-k-lab');
      }
    }
  });
  let hits = '';
  if (con.mv) con.mv.forEach((n, i) => {
    const q = N[n];
    if (k.sel === i) hits += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="11" class="t-shapes-k-sel"/>`;
    hits += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="17" class="t-shapes-hit" data-act="lib" data-arg="kpick|${i}"><title>Move ${n}</title></circle>`;
  });
  return kit.svg(KW, KH, arcs + lines + marks + pts + hits, `${con.name}: step ${step + 1} of ${res.steps.length}`);
}
function viewConstruct(ctx) {
  const k = kState(ctx), con = conById[k.id], res = kBuild(k, con), n = res.steps.length;
  k.step = clamp(k.step, 0, n - 1);
  const st = res.steps[k.step], last = k.step === n - 1, young = ctx.band === '6-7';
  const pick = `<div class="t-shapes-solids">${conList(ctx.band).map((c) => `<button class="btn small ${c.id === k.id ? 'primary' : ''}" data-act="lib" data-arg="kcon|${c.id}" aria-pressed="${c.id === k.id}">${c.name}</button>`).join('')}</div>`;
  let ctrl;
  if (con.id === 'sss') {
    const L = k.L;
    ctrl = [['a', 'BC'], ['b', 'CA'], ['c', 'AB']].map(([s, nm]) => `<div class="row gap t-shapes-row t-shapes-k-len-row ${k.lsel === s ? 'sel' : ''}"><button class="btn small" data-act="lib" data-arg="klen|${s},-1" aria-label="Shorter side ${s}">−</button>
      <button class="btn small ghost" data-act="lib" data-arg="ksel|${s}" aria-pressed="${k.lsel === s}"><b>${s}</b> = ${nm} = <b>${L[s]} cm</b></button><button class="btn small" data-act="lib" data-arg="klen|${s},1" aria-label="Longer side ${s}">+</button></div>`).join('')
      + `<div class="row gap t-shapes-row">${con.pre.map((p, i) => `<button class="chip t-shapes-k-pre" data-act="lib" data-arg="kpre|${i}">${p.a}, ${p.b}, ${p.c}</button>`).join('')}</div>
      <p class="muted">Keys: ← → step · A, B or C picks a side, ↑ ↓ change it.</p>`;
  } else {
    ctrl = `<div class="row gap t-shapes-row"><span class="muted">Move a point:</span>${con.mv.map((m, i) => `<button class="btn small ${k.sel === i ? 'primary' : ''}" data-act="lib" data-arg="kpick|${i}" aria-pressed="${k.sel === i}">${m}</button>`).join('')}</div>
      ${k.sel >= 0 ? `<div class="t-shapes-k-pad"><span></span><button class="btn small" data-act="lib" data-arg="knudge|0,-12" aria-label="Move ${con.mv[k.sel]} up">↑</button><span></span>
        <button class="btn small" data-act="lib" data-arg="knudge|-12,0" aria-label="Move ${con.mv[k.sel]} left">←</button><button class="btn small" data-act="lib" data-arg="kpick|${k.sel}" aria-label="Done moving">✓</button><button class="btn small" data-act="lib" data-arg="knudge|12,0" aria-label="Move ${con.mv[k.sel]} right">→</button>
        <span></span><button class="btn small" data-act="lib" data-arg="knudge|0,12" aria-label="Move ${con.mv[k.sel]} down">↓</button><span></span></div>` : ''}
      <div class="row gap t-shapes-row">${con.pre.map((_, i) => `<button class="chip t-shapes-k-pre" data-act="lib" data-arg="kpre|${i}">Layout ${i + 1}</button>`).join('')}</div>
      <p class="muted">${k.sel >= 0 ? `Arrows move ${con.mv[k.sel]} (Shift for bigger jumps). Esc or Enter when you are done.` : `Tap a point (or press 1–${con.mv.length}) to move it. ← → step, N another layout.`}</p>`;
  }
  const dots = res.steps.map((_, i) => `<span class="t-shapes-k-dot ${i <= k.step ? 'on' : ''}"></span>`).join('');
  const failNote = res.fail ? `<p class="t-shapes-note t-shapes-k-fail">These lengths cannot be built into a triangle: ${res.fail}</p>` : '';
  const side = `<p class="kicker">Step ${k.step + 1} of ${n} <span class="t-shapes-k-dots" aria-hidden="true">${dots}</span></p>
    <p class="t-shapes-k-cap">${st.cap}</p>
    <div class="row gap t-shapes-row"><button class="btn" data-act="lib" data-arg="kstep|-1" ${k.step ? '' : 'disabled'}>← Back</button>
      <button class="btn primary" data-act="lib" data-arg="kstep|1" ${last ? 'disabled' : ''}>Next step →</button>
      ${k.step ? '<button class="btn ghost" data-act="lib" data-arg="kgo|0">Start again</button>' : ''}</div>
    ${failNote}${k.msg ? `<p class="t-shapes-note">${esc(k.msg)}</p>` : ''}
    ${last && res.meas ? `<p class="t-shapes-formula">${res.meas}</p>` : ''}
    <p class="muted">A compass arc is every point the same distance from its centre. The dashed line shows the opening while you draw.</p>`;
  const why = last ? `<div class="card t-shapes-k-why"><p class="kicker">${res.fail ? 'Why it cannot be built' : 'Why it works'}</p>${res.why.map((w) => `<p>${w}</p>`).join('')}${young ? '' : `<p class="muted">${res.deep}</p>`}</div>` : '';
  const built = Object.keys(ctx.data.built || {}).length;
  return pick + `<div class="t-shapes-cols"><div class="card t-shapes-pic">${conSVG(res, k.step, con, k)}${ctrl}</div><div class="card">${side}${built ? `<p class="muted">Constructions finished: ${built} of ${conList(ctx.band).length}.</p>` : ''}</div></div>${why}`;
}
function actConstruct(name, arg, ctx) {
  const k = kState(ctx), con = conById[k.id];
  if (name === 'kcon') { if (conList(ctx.band).some((c) => c.id === arg)) { k.id = arg; k.step = 0; k.sel = -1; k.msg = ''; } return true; }
  if (name === 'kstep' || name === 'kgo') {
    const n = kBuild(k, con).steps.length, to = name === 'kgo' ? (+arg || 0) : k.step + (Math.sign(+arg) || 0);
    const was = k.step; k.step = clamp(to, 0, n - 1); k.msg = '';
    if (k.step !== was) ctx.sfx.click();
    const res = kBuild(k, con);
    if (k.step === n - 1 && was !== k.step && !res.fail) { ctx.data.built = { ...(ctx.data.built || {}), [con.id]: 1 }; ctx.save(); ctx.sfx.good(); }
    return true;
  }
  if (name === 'kpre') {
    const i = Math.round(+arg); if (!(i >= 0 && i < con.pre.length)) return true;
    if (con.id === 'sss') k.L = { ...con.pre[i] }; else k.pts[con.id] = con.pre[i].map((p) => [...p]);
    k.msg = ''; ctx.sfx.click(); return true;
  }
  if (name === 'kpick') { if (!con.mv) return true; const i = Math.round(+arg); k.sel = i === k.sel || !(i >= 0 && i < con.mv.length) ? -1 : i; k.msg = ''; return true; }
  if (name === 'knudge') {
    if (!con.mv) return true;
    if (k.sel < 0) { k.msg = 'Tap a point first — then move it.'; return true; }
    const [dx, dy] = String(arg).split(',').map(Number); if (!Number.isFinite(dx) || !Number.isFinite(dy)) return true;
    const pts = kPts(k, con).map((p, i) => (i === k.sel ? [p[0] + dx, p[1] + dy] : [...p]));
    const why = conProblem(con, pts);
    if (why) { k.msg = why; ctx.sfx.bad(); } else { k.pts[con.id] = pts; k.msg = ''; }
    return true;
  }
  if (name === 'ksel') { if (['a', 'b', 'c'].includes(arg)) k.lsel = arg; return true; }
  if (name === 'klen') {
    const [s, d] = String(arg).split(','); if (!['a', 'b', 'c'].includes(s)) return true;
    k.lsel = s; k.L = { ...k.L, [s]: clamp(k.L[s] + (Math.round(+d) || 0), 1, 12) }; k.msg = ''; return true;
  }
  return false;
}
function keyConstruct(e, ctx) {
  const k = kState(ctx), con = conById[k.id];
  if (con.mv && k.sel >= 0) {
    const big = e.shiftKey ? 24 : 6, mv = { ArrowUp: [0, -big], ArrowDown: [0, big], ArrowLeft: [-big, 0], ArrowRight: [big, 0] }[e.key];
    if (mv) return actConstruct('knudge', mv.join(','), ctx);
    if (e.key === 'Escape' || (e.key === 'Enter' && !onButton(e))) { k.sel = -1; k.msg = ''; return true; }
  }
  if (e.key === 'ArrowRight' || (e.key === ' ' && !onButton(e))) return actConstruct('kstep', '1', ctx);
  if (e.key === 'ArrowLeft') return actConstruct('kstep', '-1', ctx);
  if (e.key === 'Home') return actConstruct('kgo', '0', ctx);
  if (e.key === 'End') return actConstruct('kgo', '99', ctx);
  if (con.id === 'sss') {
    if (e.key === 'ArrowUp') return actConstruct('klen', `${k.lsel},1`, ctx);
    if (e.key === 'ArrowDown') return actConstruct('klen', `${k.lsel},-1`, ctx);
    const s = String(e.key).toLowerCase(); if (['a', 'b', 'c'].includes(s)) return actConstruct('ksel', s, ctx);
  } else if (/^[1-9]$/.test(e.key) && +e.key <= con.mv.length) return actConstruct('kpick', String(+e.key - 1), ctx);
  if (e.key === 'n' || e.key === 'N') { const i = (k.pre = ((k.pre || 0) + 1) % con.pre.length); return actConstruct('kpre', String(i), ctx); }
  return false;
}

/* ============================================================ the tool */

const bench = (ctx) => { const b = ctx.ui.bench; return BENCHES.some((x) => x[0] === b) ? b : ctx.band === '6-7' ? 'polygon' : 'protractor'; };
const VIEWS = { protractor: viewProtractor, polygon: viewPolygon, area: viewArea, circle: viewCircle, solids: viewSolids, moves: viewMoves, construct: viewConstruct };
const ACTS = { protractor: actProtractor, polygon: actPolygon, area: actArea, solids: actSolids, moves: actMoves, construct: actConstruct };
const KEYS = { protractor: keyProtractor, polygon: keyPolygon, area: keyArea, circle: keyCircle, solids: keySolids, moves: keyMoves, construct: keyConstruct };

export function view(ctx) {
  const b = bench(ctx);
  const seg = `<div class="seg t-shapes-seg" role="tablist">${BENCHES.map(([id, l]) => `<button role="tab" aria-selected="${id === b}" class="${id === b ? 'on' : ''}" data-act="lib" data-arg="bench|${id}">${l}</button>`).join('')}</div>`;
  const ln = b === 'construct' ? CLINKS[kState(ctx).id] : LINKS[b];
  return `<div class="t-shapes">${seg}${VIEWS[b](ctx)}${links(ln)}</div>`;
}
export function act(name, arg, ctx) {
  if (name === 'bench') { if (BENCHES.some((x) => x[0] === arg)) ctx.ui.bench = arg; return; }
  const b = bench(ctx), f = ACTS[b];
  if (f && f(name, arg, ctx)) return;
  for (const g of Object.values(ACTS)) if (g !== f && g(name, arg, ctx)) return;
}
export function key(e, ctx) { const f = KEYS[bench(ctx)]; return f ? !!f(e, ctx) : false; }

export const CSS = `
.t-shapes-seg{flex-wrap:nowrap}
.t-shapes-cols{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:760px){.t-shapes-cols{grid-template-columns:minmax(0,1fr)}}
.t-shapes-pic{text-align:center}
.t-shapes-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:8px 0}
.t-shapes-in{width:84px;padding:8px 10px;border-radius:var(--r-md);border:1.5px solid var(--line);background:var(--paper);color:var(--ink);font:700 18px var(--mono);text-align:center}
.t-shapes-in:focus{outline:none;border-color:var(--action)}
.t-shapes-big{font:800 34px var(--mono);color:var(--ink);margin:6px 0}
.t-shapes-big2{font-weight:700;font-size:var(--fs-lead);color:var(--ink)}
.t-shapes-n{font:800 18px var(--mono);min-width:80px}
.t-shapes-note{background:var(--surface2);border-radius:var(--r-md);padding:8px 12px}
.t-shapes-note.win{background:color-mix(in srgb,var(--mastered) 14%,var(--surface));color:var(--ink);border-left:4px solid var(--mastered)}
.t-shapes-facts{width:100%;border-collapse:collapse;margin-bottom:10px}
.t-shapes-facts th{text-align:left;font-weight:650;color:var(--muted);padding:6px 8px 6px 0;vertical-align:top;width:40%}
.t-shapes-facts td{padding:6px 0;border-bottom:1px solid var(--line)}
.t-shapes-formula{font-family:var(--mono);background:var(--surface2);border-radius:var(--r-md);padding:10px 12px;line-height:1.7}
.t-shapes-slider{display:block;margin:8px 0;padding:4px 8px;border-radius:var(--r-md)}
.t-shapes-slider.sel{background:var(--action-tint)}
.t-shapes-slider input{display:block;width:100%;accent-color:var(--action);min-height:30px}
.t-shapes-stats{display:flex;gap:24px;justify-content:center;margin-bottom:8px}
.t-shapes-stats div{display:flex;flex-direction:column;align-items:center}
.t-shapes-stats b{font:800 34px var(--mono);color:var(--ink)}
.t-shapes-links{margin:6px 0 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.t-shapes-link{border:0;cursor:pointer;color:var(--action)}
.t-shapes-solids{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px}
.t-shapes-yes{background:color-mix(in srgb,var(--mastered) 18%,var(--surface))}
.t-shapes-no{color:var(--muted)}
.t-shapes-wedge{fill:color-mix(in srgb,var(--fix) 22%,transparent);stroke:var(--fix);stroke-width:2}
.t-shapes-proto{fill:color-mix(in srgb,var(--action) 12%,transparent);stroke:var(--action);stroke-width:1.5}
.t-shapes-proto2{fill:none;stroke:var(--action);stroke-width:1;opacity:.5}
.t-shapes-tick{stroke:var(--action);stroke-width:.8}.t-shapes-tick.big{stroke-width:1.4}
.t-shapes-pt{font:600 9px var(--mono);fill:var(--action)}.t-shapes-pt.in{fill:var(--ink);font-size:8.5px}
.t-shapes-base{stroke:var(--action);stroke-width:1.6}
.t-shapes-arm{stroke:var(--ink);stroke-width:3;stroke-linecap:round}
.t-shapes-vtx{fill:var(--ink)}
.t-shapes-hit{fill:transparent;cursor:pointer}.t-shapes-hit:hover{fill:color-mix(in srgb,var(--action) 25%,transparent)}
.t-shapes-fan0{fill:color-mix(in srgb,var(--action) 20%,transparent);stroke:none}.t-shapes-fan1{fill:color-mix(in srgb,var(--treasure) 30%,transparent);stroke:none}
.t-shapes-diag{stroke:var(--action);stroke-width:1.5;stroke-dasharray:5 4}
.t-shapes-fanl{font:600 11px var(--mono);fill:var(--muted)}
.t-shapes-angl{font:700 11px var(--mono);fill:var(--ink)}
.t-shapes-sym{stroke:var(--fix);stroke-width:1.5;stroke-dasharray:8 5}
.t-shapes-outline{fill:none;stroke:var(--ink);stroke-width:2.5;stroke-linejoin:round}
.t-shapes-tile0{fill:color-mix(in srgb,var(--action) 25%,var(--surface));stroke:var(--ink);stroke-width:1.5}
.t-shapes-tile1{fill:color-mix(in srgb,var(--treasure) 35%,var(--surface));stroke:var(--ink);stroke-width:1.5}
.t-shapes-gap{fill:color-mix(in srgb,var(--fix) 30%,transparent);stroke:var(--fix);stroke-width:1.5}
.t-shapes-fillin{fill:none;stroke:var(--mastered);stroke-width:2;stroke-dasharray:6 4}
.t-shapes-cell{fill:var(--surface);stroke:var(--line);stroke-width:1;cursor:pointer}
.t-shapes-on{fill:color-mix(in srgb,var(--action) 45%,var(--surface));stroke:var(--surface);stroke-width:1;cursor:pointer}
.t-shapes-edge{stroke:var(--fix);stroke-width:3.5;stroke-linecap:round}
.t-shapes-cur{fill:none;stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3;pointer-events:none}
.t-shapes-ghost{fill:none;stroke:var(--muted);stroke-width:1.5;stroke-dasharray:6 4}
.t-shapes-fill-light{fill:color-mix(in srgb,var(--treasure) 25%,transparent);stroke:var(--ink);stroke-width:2}
.t-shapes-height{stroke:var(--fix);stroke-width:2;stroke-dasharray:5 4}
.t-shapes-right{fill:none;stroke:var(--fix);stroke-width:1.5}
.t-shapes-roll{stroke:var(--action);stroke-width:4;stroke-linecap:round}
.t-shapes-bit{fill:var(--fix)}
.t-shapes-face1{fill:color-mix(in srgb,var(--action) 28%,var(--surface));stroke:var(--ink);stroke-width:1.5}
.t-shapes-face2{fill:color-mix(in srgb,var(--treasure) 38%,var(--surface));stroke:var(--ink);stroke-width:1.5}
.t-shapes-face3{fill:color-mix(in srgb,var(--mastered) 28%,var(--surface));stroke:var(--ink);stroke-width:1.5}
.t-shapes-vis{stroke:var(--ink);stroke-width:2.2;stroke-linecap:round}
.t-shapes-hid{stroke:var(--muted);stroke-width:1.4;stroke-dasharray:5 4}
.t-shapes-cube{stroke:var(--ink);stroke-width:.8;opacity:.45}
.t-shapes-mirror{stroke:var(--fix);stroke-width:2.5;stroke-dasharray:9 5}
.t-shapes-centre{fill:var(--fix)}
.t-shapes-obj{fill:color-mix(in srgb,var(--action) 35%,transparent);stroke:var(--action);stroke-width:2.5;stroke-linejoin:round}
.t-shapes-img{fill:color-mix(in srgb,var(--mastered) 30%,transparent);stroke:var(--mastered);stroke-width:2.5;stroke-linejoin:round}
.t-shapes-trail{stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3}
.t-shapes-pred{fill:none;stroke:var(--fix);stroke-width:3;pointer-events:none}
.t-shapes-k-given{stroke:var(--ink);stroke-width:3;stroke-linecap:round}
.t-shapes-k-rule{stroke:var(--action);stroke-width:2.5;stroke-linecap:round}
.t-shapes-k-rule.now{stroke:var(--fix);stroke-width:3.5}
.t-shapes-k-arc{fill:none;stroke:var(--muted);stroke-width:2;stroke-linecap:round}
.t-shapes-k-arc.now{stroke:var(--fix);stroke-width:3}
.t-shapes-k-rad{stroke:var(--fix);stroke-width:1.3;stroke-dasharray:4 4;opacity:.7}
.t-shapes-k-piv{fill:var(--fix)}
.t-shapes-k-meas{stroke:var(--treasure);stroke-width:2.5;stroke-dasharray:3 3}
.t-shapes-k-gap{stroke:var(--fix);stroke-width:2;stroke-dasharray:3 4}
.t-shapes-k-miss{fill:none;stroke:var(--fix);stroke-width:2}
.t-shapes-k-lab{font:800 15px var(--ui);fill:var(--ink)}
.t-shapes-k-len{font:600 12px var(--mono);fill:var(--muted)}
.t-shapes-k-sel{fill:none;stroke:var(--action);stroke-width:3;pointer-events:none}
.t-shapes-k-cap{font-size:var(--fs-lead);color:var(--ink);min-height:4.2em}
.t-shapes-k-dots{display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle}
.t-shapes-k-dot{width:8px;height:8px;border-radius:50%;background:var(--line)}.t-shapes-k-dot.on{background:var(--action)}
.t-shapes-k-pad{display:grid;grid-template-columns:repeat(3,48px);gap:6px;justify-content:center;margin:8px auto}
.t-shapes-k-pad button{min-height:44px}
.t-shapes-k-len-row{margin:4px 0;border-radius:var(--r-md)}.t-shapes-k-len-row.sel{background:var(--action-tint)}
.t-shapes-k-pre{border:0;cursor:pointer}
.t-shapes-k-fail{border-left:4px solid var(--fix)}
.t-shapes-k-why{margin-top:16px;border-left:4px solid var(--mastered)}
`;

/* ========================================================== selftest */

export function selftest(ok, makeCtx) {
  const r = seeded('shapes-selftest'), near = (a, b, t = 1e-6) => Math.abs(a - b) < t;

  // --- the protractor: reading a drawn angle gives the angle, for every
  // angle and every way the protractor can be lined up on it
  for (let theta = 1; theta <= 359; theta += (theta < 20 ? 1 : 7)) {
    if (theta === 180) continue;
    for (const base of [0, 35, 90, 200, 305]) {
      // measured independently from the drawing: the arms' screen ends
      const e1 = pat(base, 200), e2 = pat(base + theta, 200);
      const a1 = Math.atan2(P_C - e1[1], e1[0] - P_C) / RAD, a2 = Math.atan2(P_C - e2[1], e2[0] - P_C) / RAD;
      ok(near(mod(a2 - a1, 360), theta, 1e-6), `protractor: drawn arms ${theta}° apart`);
      const small = theta > 180 ? 360 - theta : theta;
      for (const rot of [base, base + theta, base - 180, base + theta - 180]) {
        const rd = readProtractor(theta, base, mod(rot, 360));
        if (rd.ok) { ok(rd.zeroed, `protractor: zero lined up at ${rot}`); ok(rd.r === small && rd.angle === theta, `protractor: reads ${rd.angle} for ${theta}° (base ${base}, rot ${rot})`); }
      }
      let anyOk = 0;
      for (let rot = 0; rot < 360; rot += 3) { const rd = readProtractor(theta, base, rot); if (rd.ok) { anyOk++; if (rd.angle !== theta) ok(false, `protractor: gap reading wrong ${theta} ${base} ${rot}`); } }
      ok(anyOk > 0, `protractor: some turn reads ${theta}°`);
    }
  }
  ok(angleType(30)[0] === 'acute' && angleType(90)[0] === 'right' && angleType(120)[0] === 'obtuse' && angleType(180)[0] === 'straight' && angleType(250)[0] === 'reflex', 'angle names');
  for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 200; i++) { const a = newAngle(band, r); ok(a.theta > 0 && a.theta < 360 && a.theta !== 180 && (band === '11-14' || a.theta < 180), `newAngle ${band} ${a.theta}`); }

  // --- polygons
  for (let n = 3; n <= 12; n++) {
    ok(angleSum(n) === [0, 0, 0, 180, 360, 540, 720, 900, 1080, 1260, 1440, 1620, 1800][n], `angle sum n=${n}`);
    const reg = regularPts(n);
    // angles measured with the dot product, not the turning argument
    const dotAngs = reg.map((v, i) => { const p = reg[(i + n - 1) % n], q = reg[(i + 1) % n], a = [p[0] - v[0], p[1] - v[1]], b = [q[0] - v[0], q[1] - v[1]];
      return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) / RAD; });
    ok(near(dotAngs.reduce((a, b) => a + b, 0), angleSum(n), 1e-6), `regular ${n}: measured angles add to ${angleSum(n)}`);
    ok(dotAngs.every((a) => near(a, 180 - 360 / n, 1e-6)), `regular ${n}: each angle is 180 − 360/n`);
    ok(interiorAngles(reg).every((a, i) => near(a, dotAngs[i], 1e-6)), `regular ${n}: tool angles match measured`);
    ok(near((n - 2) * 180 / n + 360 / n, 180), `regular ${n}: inside + outside = 180`);
    // symmetry: count axes by trying every corner-to-corner pairing, and
    // rotations by every corner-to-corner turn — a different search from the tool's
    const brute = (pts) => {
      const c = centroid(pts), axes = new Set(); let rots = 0;
      for (let j = 0; j < pts.length; j++) {
        const a0 = Math.atan2(pts[0][1] - c[1], pts[0][0] - c[0]), aj = Math.atan2(pts[j][1] - c[1], pts[j][0] - c[0]);
        const phi = (a0 + aj) / 2;
        if (sameSet(pts.map((p) => reflectAxis(p, c, phi)), pts)) axes.add(Math.round(mod(phi / RAD, 180) * 1e4) % 1800000);
        if (sameSet(pts.map((p) => rotAbout(p, c, aj - a0)), pts)) rots++;
      }
      return { axes: axes.size, rots };
    };
    const sy = symmetry(reg), b = brute(reg);
    ok(sy.axes.length === n && b.axes === n, `regular ${n}: ${n} lines of symmetry (tool ${sy.axes.length}, brute ${b.axes})`);
    ok(sy.order === n && b.rots === n, `regular ${n}: rotational order ${n}`);
    ok(tiles(n) === [3, 4, 6].includes(n), `tiling n=${n}`);
    // tiling by placing copies round a point
    const int = 180 - 360 / n; let fits = false; for (let k = 3; k <= 6; k++) if (near(k * int, 360, 1e-9)) fits = true;
    ok(fits === tiles(n), `tiling by placing copies, n=${n}`);
    const ti = tileInfo(n); ok(near(ti.k * ti.int + ti.gap, 360) && ti.gap < ti.int, `corner gap n=${n}`);
    if (ti.fill) ok(near(180 - 360 / ti.fill, ti.gap), `gap filler n=${n}`);
    // the corner picture: each copy's first corner angle really is the inside angle
    const cp = ngonAtCorner(n, 1, 20), ia = interiorAngles(cp)[0];
    ok(near(ia, int, 1e-6), `ngonAtCorner n=${n} corner ${ia}`);
    const lens = cp.map((p, i) => Math.hypot(cp[(i + 1) % n][0] - p[0], cp[(i + 1) % n][1] - p[1]));
    ok(lens.every((l) => near(l, 1, 1e-9)), `ngonAtCorner n=${n} closes with equal sides`);
    for (let seed = 1; seed <= 8; seed++) {
      const ir = irregularPts(n, seed);
      ok(isConvexCCW(ir), `irregular ${n}/${seed} convex`);
      const sum = interiorAngles(ir).reduce((a, x) => a + x, 0);
      ok(near(sum, angleSum(n), 1e-6), `irregular ${n}/${seed}: angles add to ${angleSum(n)} (got ${sum})`);
      const s2 = symmetry(ir), b2 = brute(ir);
      ok(s2.axes.length === b2.axes && s2.order === b2.rots, `irregular ${n}/${seed}: symmetry agrees with brute force`);
      // the fan really is n − 2 triangles whose areas fill the polygon
      const area = (pts) => Math.abs(pts.reduce((a, p, i) => a + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0)) / 2;
      let fan = 0; for (let i = 1; i < n - 1; i++) fan += area([ir[0], ir[i], ir[i + 1]]);
      ok(near(fan, area(ir), 1e-9), `irregular ${n}/${seed}: fan triangles fill the shape`);
    }
  }
  // a rectangle and a kite: symmetry that is not "n"
  ok(symmetry([[0, 0], [4, 0], [4, 2], [0, 2]]).axes.length === 2 && symmetry([[0, 0], [4, 0], [4, 2], [0, 2]]).order === 2, 'rectangle: 2 lines, order 2');
  ok(symmetry([[0, -3], [1, 0], [0, 1], [-1, 0]]).axes.length === 1 && symmetry([[0, -3], [1, 0], [0, 1], [-1, 0]]).order === 1, 'kite: 1 line, order 1');

  // --- area and perimeter: the tool's count against a brute-force walk of every edge
  const bruteAP = (on) => {
    let A = 0, P = 0; const has = (rr, c) => !!on[rr + ',' + c];
    for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) if (has(rr, c)) { A++; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!has(rr + dr, c + dc)) P++; }
    return { A, P };
  };
  for (let i = 0; i < 300; i++) {
    const on = {}, p = r() * 0.8; for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) if (r() < p) on[rr + ',' + c] = 1;
    const t = areaPerim(on), b = bruteAP(on); ok(t.A === b.A && t.P === b.P, `grid: area ${t.A}/${b.A} perimeter ${t.P}/${b.P}`);
  }
  for (let w = 1; w <= COLS; w++) for (let h = 1; h <= ROWS; h++) { const on = {}; for (let rr = 0; rr < h; rr++) for (let c = 0; c < w; c++) on[rr + ',' + c] = 1; const t = areaPerim(on); ok(t.A === w * h && t.P === 2 * (w + h), `rectangle ${w}×${h}`); }
  // smallest perimeter: brute force over every polyomino up to 8 squares
  {
    let level = new Set(['0,0']);
    for (let n = 1; n <= 8; n++) {
      let best = Infinity;
      for (const sig of level) { const on = {}; sig.split(';').forEach((k) => { const [a, b] = k.split(',').map(Number); on[(a + 2) + ',' + (b + 2)] = 1; }); const b = bruteAP(on); best = Math.min(best, b.P); }
      ok(best === minPerim(n), `smallest perimeter for ${n} squares: brute ${best}, tool ${minPerim(n)}`);
      if (n === 8) break;
      const next = new Set();
      for (const sig of level) {
        const cells = sig.split(';').map((k) => k.split(',').map(Number)), has = new Set(sig.split(';'));
        for (const [a, b] of cells) for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = (a + da) + ',' + (b + db); if (has.has(k)) continue;
          const grown = [...cells, [a + da, b + db]], ma = Math.min(...grown.map((x) => x[0])), mb = Math.min(...grown.map((x) => x[1]));
          const norm = grown.map(([x, y]) => [x - ma, y - mb]).sort((p, q) => p[0] - q[0] || p[1] - q[1]).map((x) => x.join(',')).join(';');
          if (grown.every(([x, y]) => x - ma < 6 && y - mb < 6)) next.add(norm);
        }
      }
      level = next;
    }
  }
  // every challenge can be won on this grid (a near-square or a rectangle is built and checked)
  for (const band of ['6-7', '8-10', '11-14']) for (const kind of ['min', 'exact', 'same']) for (let i = 0; i < 20; i++) {
    const ch = newChallenge(kind, band, r);
    const w = kind === 'exact' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((x) => ch.N % x === 0 && 2 * (x + ch.N / x) === ch.P && ch.N / x <= ROWS) : Math.ceil(Math.sqrt(ch.N));
    const on = {}; for (let k = 0; k < ch.N; k++) on[Math.floor(k / w) + ',' + (k % w)] = 1;
    const { A, P: Pm } = areaPerim(on);
    if (kind === 'same') { ch.P0 = Pm; ok(!challengeState(ch, A, Pm).win, 'same: identical perimeter is not a win'); const on2 = {}; for (let k = 0; k < ch.N; k++) on2[Math.floor(k / 2) + ',' + (k % 2)] = 1; const t2 = areaPerim(on2); ok(challengeState(ch, t2.A, t2.P).win === (t2.P !== Pm), `same area ${ch.N}: different perimeter wins`); continue; }
    ok(w && challengeState(ch, A, Pm).win, `${kind} challenge area ${ch.N} can be won (w ${w}, P ${Pm})`);
    ok(!challengeState(ch, A + 1, Pm).win, `${kind}: wrong area never wins`);
  }
  // formula panels: the formula agrees with the drawn shape's area by the shoelace
  const shoelace = (pts) => Math.abs(pts.reduce((a, p, i) => a + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0)) / 2;
  for (const shape of ['rectangle', 'triangle', 'parallelogram', 'trapezium']) {
    const dims = FSHAPES[shape].dims;
    for (let i = 0; i < 60; i++) {
      const d = {}; for (const [k, , lo, hi] of dims) d[k] = lo + Math.floor(r() * (hi - lo + 1));
      const pts = fpoly(shape, d), c = fcalc(shape, d);
      ok(near(shoelace(pts), c.A, 1e-9), `${shape} ${JSON.stringify(d)}: formula ${c.A} = drawn ${shoelace(pts)}`);
      ok(near(Math.max(...pts.map((p) => p[1])), d.h === undefined ? d.w : d.h), `${shape}: drawn height`);
      ok(c.work.at(-1).includes(num(c.A)), `${shape}: last line shows the answer`);
      if (shape === 'rectangle') ok(c.P === pts.reduce((a, p, j) => a + Math.hypot(pts[(j + 1) % 4][0] - p[0], pts[(j + 1) % 4][1] - p[1]), 0), 'rectangle perimeter');
      const sv = formulaSVG(shape, d); ok(sv.includes('<svg') && !/NaN/.test(sv), `${shape} drawing`);
    }
  }

  // --- circle: π from polygons with many sides, and the 3.14 values
  for (let rr = 1; rr <= 12; rr++) {
    const poly = regularPts(20000, rr), per = poly.reduce((a, p, i) => a + Math.hypot(poly[(i + 1) % poly.length][0] - p[0], poly[(i + 1) % poly.length][1] - p[1]), 0);
    ok(Math.abs(per - Math.PI * 2 * rr) / (2 * Math.PI * rr) < 1e-7, `circle r=${rr}: circumference is π × d`);
    ok(Math.abs(shoelace(poly) - Math.PI * rr * rr) / (Math.PI * rr * rr) < 1e-7, `circle r=${rr}: area is π r²`);
    ok(+num(3.14 * 2 * rr) === Math.round(314 * 2 * rr) / 100 && +num(3.14 * rr * rr) === Math.round(314 * rr * rr) / 100, `circle r=${rr}: 3.14 arithmetic`);
    const c = fcalc('circle', { r: rr }); ok(near(c.A, Math.PI * rr * rr) && near(c.P, 2 * Math.PI * rr), `circle panel r=${rr}`);
  }

  // --- solids: F, E, V from the model; Euler; closed surfaces; nets
  const expect = { cube: [6, 12, 8], cuboid: [6, 12, 8], 'tri-prism': [5, 9, 6], 'pent-prism': [7, 15, 10], 'hex-prism': [8, 18, 12], 'sq-pyramid': [5, 8, 5], tetra: [4, 6, 4], 'pent-pyramid': [6, 10, 6], octa: [8, 12, 6] };
  for (const sol of SOLIDS) {
    const m = sol.make({ l: 4, w: 3, h: 2 }), c = counts(m);
    ok(c.F + c.V - c.E === 2, `${sol.id}: F + V − E = 2`);
    ok(JSON.stringify([c.F, c.E, c.V]) === JSON.stringify(expect[sol.id]), `${sol.id}: counts ${c.F},${c.E},${c.V}`);
    ok([...edgesOf(m.F).values()].every((k) => k === 2), `${sol.id}: every edge joins exactly two faces`);
    // every face is flat and every face faces outward from the centre
    for (const f of m.F) { const fn = faceNormal(m, f); ok(f.every((i) => Math.abs(v3.dot(v3.sub(m.V[i], fn.c), fn.n)) < 1e-9), `${sol.id}: flat face`); ok(v3.dot(fn.n, v3.sub(fn.c, mcentre(m))) > 0, `${sol.id}: outward`); }
    // the net: one polygon per face, each congruent to its face, joined edges meeting, no overlaps
    const net = unfold(m);
    ok(net.faces.length === c.F, `${sol.id}: net has ${c.F} faces`);
    for (const nf of net.faces) {
      const f = m.F[nf.i];
      f.forEach((a, j) => { const b = f[(j + 1) % f.length]; ok(near(v3.len(v3.sub(m.V[a], m.V[b])), Math.hypot(nf.pts[(j + 1) % f.length][0] - nf.pts[j][0], nf.pts[(j + 1) % f.length][1] - nf.pts[j][1]), 1e-9), `${sol.id}: net side length`); });
      ok(near(shoelace(nf.pts), faceNormal(m, f).area, 1e-9), `${sol.id}: net face area`);
    }
    ok(near(net.faces.reduce((a, nf) => a + shoelace(nf.pts), 0), surfaceArea(m), 1e-9), `${sol.id}: net area = surface area`);
    const inside = (pt, poly) => { let c2 = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c2 = !c2; } return c2; };
    const all = net.faces.flatMap((f) => f.pts), x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0])), y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
    let overlap = 0; for (let i = 0; i < 70; i++) for (let j = 0; j < 70; j++) { const pt = [x0 + ((i + 0.37) / 70) * (x1 - x0), y0 + ((j + 0.61) / 70) * (y1 - y0)]; if (net.faces.filter((f) => inside(pt, f.pts)).length > 1) overlap++; }
    ok(overlap === 0, `${sol.id}: net faces do not overlap (${overlap})`);
    for (const [ci, pi] of net.parent) { const cf = net.faces.find((f) => f.i === ci), pf = net.faces.find((f) => f.i === pi); const shared = m.F[ci].filter((a) => m.F[pi].includes(a));
      ok(shared.length === 2 && shared.every((a) => { const p1 = cf.pts[m.F[ci].indexOf(a)], p2 = pf.pts[m.F[pi].indexOf(a)]; return near(p1[0], p2[0], 1e-9) && near(p1[1], p2[1], 1e-9); }), `${sol.id}: net hinge edges meet`); }
    // drawing: visible faces exist from every side
    for (let yaw = 0; yaw < 360; yaw += 45) { const sv = solidSVG(m, yaw); ok(/t-shapes-face/.test(sv) && !/NaN/.test(sv), `${sol.id}: drawing at ${yaw}`); }
  }
  // the cube's net folds into a cube (the Puzzle Tower's rolling-cube test)
  { const m = solidById.cube.make(), net = unfold(m), side = 1.6;
    const c0 = centroid(net.faces[0].pts), cells = net.faces.map((f) => { const c = centroid(f.pts); return [Math.round((c0[1] - c[1]) / side), Math.round((c[0] - c0[0]) / side)]; });
    ok(new Set(cells.map((x) => x.join(','))).size === 6 && !!fold(cells), `cube net folds into a cube: ${JSON.stringify(cells)}`); }
  // cuboid volume and surface area against counting unit cubes and their exposed faces
  for (let l = 1; l <= 6; l++) for (let w = 1; w <= 5; w++) for (let h = 1; h <= 4; h++) {
    let V = 0, SA = 0; const inBox = (x, y, z) => x >= 0 && x < l && y >= 0 && y < w && z >= 0 && z < h;
    for (let x = 0; x < l; x++) for (let y = 0; y < w; y++) for (let z = 0; z < h; z++) { V++; for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (!inBox(x + a, y + b, z + c)) SA++; }
    ok(V === l * w * h && SA === 2 * (l * w + l * h + w * h), `cuboid ${l}×${w}×${h}`);
    const m = solidById.cuboid.make({ l, w, h }); ok(near(surfaceArea(m), SA * 0.25, 1e-9), `cuboid model ${l}×${w}×${h} surface`);
  }

  // --- moves: every vertex lands where the geometry says
  for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 150; i++) {
    const mv = newMove(band, 'any', r), t = mv.t;
    ok(mv.pts.every((p) => Math.abs(p[0]) <= G && Math.abs(p[1]) <= G) && mv.img.every((p) => Math.abs(p[0]) <= G && Math.abs(p[1]) <= G), 'moves: on the grid');
    mv.pts.forEach((p, j) => {
      const q = mv.img[j];
      ok(q[0] === mapPoint(t, p)[0] && q[1] === mapPoint(t, p)[1], 'moves: image computed');
      if (t.kind === 'translate') ok(q[0] - p[0] === t.a && q[1] - p[1] === t.b, 'translate: moved by the vector');
      else if (t.kind === 'reflect') {
        // the mirror line as a point and a direction; midpoint on it, segment at right angles to it
        const [o, dvec] = t.line === 'x' ? [[t.k, 0], [0, 1]] : t.line === 'y' ? [[0, t.k], [1, 0]] : t.line === 'y=x' ? [[0, 0], [1, 1]] : [[0, 0], [1, -1]];
        const mid = [(p[0] + q[0]) / 2 - o[0], (p[1] + q[1]) / 2 - o[1]];
        ok(near(mid[0] * dvec[1] - mid[1] * dvec[0], 0), 'reflect: midpoint on the mirror');
        ok(near((q[0] - p[0]) * dvec[0] + (q[1] - p[1]) * dvec[1], 0), 'reflect: crossing at right angles');
      } else {
        const a = [p[0] - t.a, p[1] - t.b], b = [q[0] - t.a, q[1] - t.b];
        ok(near(Math.hypot(...a), Math.hypot(...b)), 'rotate: same distance from the centre');
        const turn = mod(Math.round(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / RAD), 360);
        if (Math.hypot(...a) > 0) ok(turn === mod(-t.deg, 360), `rotate: turned ${t.deg} clockwise (got ${turn} anticlockwise)`);
      }
    });
    // congruent: every side keeps its length
    const sides = (pts) => pts.map((p, j) => Math.hypot(pts[(j + 1) % pts.length][0] - p[0], pts[(j + 1) % pts.length][1] - p[1]));
    ok(sides(mv.pts).every((s, j) => near(s, sides(mv.img)[j])), 'moves: same shape and size');
    ok(!describe(t).includes('undefined') && rule(t).length > 10, 'moves: described');
  }

  // --- flows on fake contexts
  for (const band of ['6-7', '8-10', '11-14']) {
    const ctx = makeCtx('shapes', band); let ticks = 0; ctx.tick = () => { ticks++; };
    const clean = (where) => { const h = view(ctx); ok(typeof h === 'string' && h.length > 200 && !/undefined|NaN|\[object Object\]/.test(h), `${band} ${where}: view clean`); return h; };
    clean('start');
    for (const [b] of BENCHES) { act('bench', b, ctx); ok(bench(ctx) === b, `bench ${b}`); clean(b); }
    // protractor: turn it onto the arm with the keys, then read it
    act('bench', 'protractor', ctx);
    const p = ctx.ui.p; p.theta = 73; p.base = 40; p.rot = 0; p.shown = false;
    for (let i = 0; i < 4; i++) key({ key: 'ArrowLeft', shiftKey: true }, ctx);
    ok(p.rot === 40, `keys turn the protractor (${p.rot})`);
    key({ key: 'Enter' }, ctx); ok(p.shown, 'Enter reads');
    const h = clean('read'); ok(h.includes('73°') && h.includes('acute'), 'reading shows 73° acute');
    act('rot', '0', ctx); ok(p.rot === 0 && !p.shown, 'tapping the rim turns it');
    ctx.ui.pread = '73'; act('pcheck', '', ctx); ok(ticks === 1 && p.shown, 'a right reading ticks');
    act('pnew', '', ctx); ctx.ui.pread = String(p.theta === 1 ? 2 : p.theta - 1); act('pcheck', '', ctx); ok(ticks === 1 && !p.shown, 'a wrong reading does not tick');
    act('pown', '', ctx); ctx.ui.pang = '135'; clean('own'); ok(p.theta === 135, 'draw my own angle');
    // estimate rounds
    act('pmode', 'estimate', ctx); clean('estimate');
    for (let round = 1; round <= 5; round++) { const e = ctx.ui.e; ctx.ui.est = String(e.theta + (round - 1) * 4); act('echeck', '', ctx); ok(e.shown && e.log.length === round, 'estimate checked'); clean(`estimate round ${round}`); if (round < 5) act('enext', '', ctx); }
    ok(ctx.ui.e.stars === 3 + 3 + 2 + 1 + 1, `estimate stars ${ctx.ui.e.stars}`);
    ok(ctx.data.estBest === 10, 'best estimate saved');
    act('enext', '', ctx); ok(ctx.ui.e.round === 1 && ctx.ui.e.stars === 0, 'play again resets');
    key({ key: 'ArrowRight', shiftKey: true }, ctx); ok(ctx.ui.est === '100', `arrow keys change the guess (${ctx.ui.est})`);
    // polygons
    act('bench', 'polygon', ctx);
    for (let n = 3; n <= 12; n++) { ctx.ui.g.n = n; for (const reg of ['1', '0']) { act('greg', reg, ctx); const hh = clean(`polygon ${n} ${reg}`); if (band !== '6-7') ok(hh.includes(`${angleSum(n)}°`), `polygon ${n}: shows the angle sum`); } }
    ctx.ui.g.n = 5; key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.g.n === 6, 'arrow adds a side');
    act('gtog', 'sym', ctx); clean('no mirrors');
    // area: build a 3 × 4 rectangle with the keys
    act('bench', 'area', ctx); act('ach', 'min', ctx); const a = ctx.ui.a; a.ch.N = 12; a.cur = [0, 0];
    for (let rr = 0; rr < 3; rr++) for (let c = 0; c < 4; c++) { a.cur = [rr, c]; key({ key: ' ' }, ctx); }
    ok(areaPerim(a.on).A === 12 && areaPerim(a.on).P === 14 && a.ch.done, 'area challenge won by keys');
    clean('area won');
    act('cell', '0,0', ctx); ok(areaPerim(a.on).A === 11, 'tap toggles a square off');
    act('ach', 'same', ctx); a.ch.N = 4; ['0,0', '0,1', '0,2', '0,3'].forEach((k) => act('cell', k, ctx)); act('akeep', '', ctx); ok(a.ch.P0 === 10, 'kept a 1×4');
    act('aclear', '', ctx); ['0,0', '0,1', '1,0', '1,1'].forEach((k) => act('cell', k, ctx)); ok(a.ch.done, 'same area, different perimeter');
    act('ach', 'exact', ctx); clean('exact');
    act('atab', 'formula', ctx);
    for (const s of Object.keys(FSHAPES)) { act('ashape', s, ctx); clean(`formula ${s}`); key({ key: 'ArrowRight' }, ctx); }
    act('ashape', 'rectangle', ctx); ctx.ui.f_rectangle_l = '6'; key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.f_rectangle_l === '7', 'arrow grows the length');
    key({ key: 'ArrowDown' }, ctx); key({ key: 'ArrowLeft' }, ctx); ok(ctx.ui.f_rectangle_w === '3', 'arrow shrinks the width');
    ok(view(ctx).includes('7 × 3') && view(ctx).includes('<b>21</b>'), 'rectangle formula fills in');
    // circle
    act('bench', 'circle', ctx); ctx.ui.cr = '7'; const hc = clean('circle'); ok(hc.includes('14π') && (band === '6-7' || hc.includes('49π')), 'circle exact values');
    key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.cr === '8', 'circle radius by key');
    // solids
    act('bench', 'solids', ctx);
    for (const s of SOLIDS) { act('solid', s.id, ctx); const hs = clean(`solid ${s.id}`); const c = counts(s.make(cdims(ctx.ui))); ok(hs.includes(`<b>${c.F}</b>`) && hs.includes(`<b>${c.E}</b>`), `${s.id} counts shown`); }
    key({ key: 'ArrowRight' }, ctx); ok(ctx.ui.s.yaw === 45, 'arrow turns the solid');
    ctx.ui.sl = '5'; ctx.ui.sw = '2'; ctx.ui.sh = '3'; ok(view(ctx).includes('<b>30</b> cm³'), 'cuboid volume shown');
    // moves: predict right by keys, then wrong by tap
    act('bench', 'moves', ctx); const m = ctx.ui.m; m.cur = [0, 0];
    const tgt = m.img[0];
    while (m.cur[0] < tgt[0]) key({ key: 'ArrowRight' }, ctx); while (m.cur[0] > tgt[0]) key({ key: 'ArrowLeft' }, ctx);
    while (m.cur[1] < tgt[1]) key({ key: 'ArrowUp' }, ctx); while (m.cur[1] > tgt[1]) key({ key: 'ArrowDown' }, ctx);
    const before = ticks; key({ key: 'Enter' }, ctx); ok(m.shown && m.last === true && ticks === before + 1, 'moves: right prediction by keys');
    clean('moves shown'); key({ key: 'Enter' }, ctx); ok(!m.shown, 'Enter again: next move');
    act('mpt', `${m.img[0][0] === 6 ? 5 : m.img[0][0] + 1},${m.img[0][1]}`, ctx); act('mreveal', '', ctx); ok(m.last === false, 'moves: wrong tap prediction');
    for (const k of ['reflect', 'translate', 'rotate']) { act('mkind', k, ctx); if (band !== '6-7' || k !== 'rotate') ok(m.t.kind === k, `moves kind ${k}`); clean(`moves ${k}`); }
    // escaping: whatever a child types is shown safely
    act('bench', 'protractor', ctx); act('pmode', 'estimate', ctx); ctx.ui.est = '<b>"x"'; ok(!view(ctx).includes('<b>"x"'), 'typed text is escaped');
  }

  // --- constructions: the geometry is TRUE, checked independently of how
  // each picture was built, over presets and hundreds of random layouts
  {
    const T9 = 1e-8, dd = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const dotU = (a, b) => { const la = Math.hypot(...a), lb = Math.hypot(...b); return (a[0] * b[0] + a[1] * b[1]) / (la * lb); };
    const angle = (o, p, q) => Math.acos(Math.max(-1, Math.min(1, dotU([p[0] - o[0], p[1] - o[1]], [q[0] - o[0], q[1] - o[1]])))) / RAD;
    const onLine = (x, a, b) => Math.abs((b[0] - a[0]) * (x[1] - a[1]) - (b[1] - a[1]) * (x[0] - a[0])) / dd(a, b) < T9;
    const svgClean = (h) => typeof h === 'string' && h.includes('<svg') && !/NaN|undefined|Infinity|\[object/.test(h);
    const truth = {
      perp: ({ A, B, P, Q, M }) => {
        ok(Math.abs(dd(M, A) - dd(M, B)) < T9, 'perp: M is equidistant from A and B');
        ok(onLine(M, A, B) && onLine(M, P, Q), 'perp: M lies on AB and on PQ');
        ok(Math.abs(dotU([Q[0] - P[0], Q[1] - P[1]], [B[0] - A[0], B[1] - A[1]])) < 1e-9, 'perp: PQ meets AB at 90°');
        ok(Math.abs(dd(P, A) - dd(P, B)) < T9 && Math.abs(dd(Q, A) - dd(Q, B)) < T9, 'perp: P and Q are each equidistant from A and B');
      },
      angle: ({ O, P, Q, Z }) => {
        const t = angle(O, P, Q), h1 = angle(O, P, Z), h2 = angle(O, Z, Q);
        ok(Math.abs(h1 - h2) < 1e-7 && Math.abs(h1 + h2 - t) < 1e-7, `angle: bisector makes equal angles with both arms (${h1}, ${h2}, of ${t})`);
        // equal angles means equal distance to both arm lines
        const dl = (x, a, b) => Math.abs((b[0] - a[0]) * (x[1] - a[1]) - (b[1] - a[1]) * (x[0] - a[0])) / dd(a, b);
        ok(Math.abs(dl(Z, O, P) - dl(Z, O, Q)) < T9, 'angle: Z is equally far from both arms');
      },
      drop: ({ A, B, P, Z, F }) => {
        ok(onLine(F, A, B), 'drop: the foot F lies on the line');
        ok(Math.abs(dotU([P[0] - F[0], P[1] - F[1]], [B[0] - A[0], B[1] - A[1]])) < 1e-9, 'drop: PF is at 90° to the line');
        const d = Math.abs((B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])) / dd(A, B);
        ok(Math.abs(dd(P, F) - d) < T9, 'drop: PF is the shortest distance to the line');
        const side = (x) => Math.sign((B[0] - A[0]) * (x[1] - A[1]) - (B[1] - A[1]) * (x[0] - A[0]));
        ok(side(Z) === -side(P), 'drop: Z is on the far side of the line');
      },
      equi: ({ A, B, C }) => {
        ok(Math.abs(dd(A, B) - dd(B, C)) < T9 && Math.abs(dd(B, C) - dd(C, A)) < T9, 'equi: three equal sides');
        ok([angle(A, B, C), angle(B, C, A), angle(C, A, B)].every((x) => Math.abs(x - 60) < 1e-7), 'equi: every angle 60°');
      },
      copy: ({ O, P, Q, D, R, X2, Y2 }) => {
        ok(Math.abs(angle(D, X2, Y2) - angle(O, P, Q)) < 1e-7, `copy: the copy is the same angle (${angle(D, X2, Y2)} vs ${angle(O, P, Q)})`);
        ok(onLine(X2, D, R) && ((X2[0] - D[0]) * (R[0] - D[0]) + (X2[1] - D[1]) * (R[1] - D[1])) > 0, 'copy: X′ is on the ray');
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        ok(Math.sign(cr(O, P, Q)) === Math.sign(cr(D, R, Y2)), 'copy: the copy turns the same way');
      },
    };
    // every step: one ruler line or one arc; every arc is what its caption says
    const stepRules = (res, where) => {
      const N = res.N, arcsByStep = {};
      res.steps.forEach((st, i) => {
        const strokes = st.add.filter((p) => p.t === 'seg' || p.t === 'arc');
        if (i === 0) ok(strokes.length >= 1, `${where}: step 0 draws the given`);
        else if (st.fail) ok(strokes.length === 0 && st.add.some((p) => p.t === 'gap'), `${where}: the failing step marks the gap`);
        else ok(strokes.length === 1, `${where}: step ${i} adds exactly one ruler line or arc (${strokes.length})`);
        ok(typeof st.cap === 'string' && st.cap.length > 20 && !/undefined|NaN/.test(st.cap), `${where}: step ${i} caption`);
        for (const p of st.add) {
          if (p.t === 'pt') ok(!!N[p.n], `${where}: point ${p.n} exists`);
          if (p.t !== 'arc') continue;
          arcsByStep[i] = p;
          ok(dd(p.c, N[p.cn]) < 1e-12, `${where}: arc centre is ${p.cn}`);
          ok(st.cap.includes(`<b>${kLab(p.cn)}</b>`), `${where}: step ${i} caption names the centre ${kLab(p.cn)}`);
          ok(p.r > 0 && p.a1 > p.a0 && p.a1 - p.a0 < 2 * Math.PI, `${where}: arc ${i} has a radius and a sweep`);
          for (const t of p.thru) { ok(Math.abs(dd(N[p.cn], N[t]) - p.r) < T9, `${where}: arc from ${p.cn} passes through ${t}`); ok(arcCovers(p, N[t]), `${where}: arc from ${p.cn} is drawn through ${t}`); }
          if (p.same !== undefined) { ok(arcsByStep[p.same] && Math.abs(arcsByStep[p.same].r - p.r) < 1e-12, `${where}: "same opening" really is`); ok(/same opening|Keep/.test(st.cap), `${where}: caption says same opening`); }
          if (p.gt) ok(p.r > p.gt[2] * dd(N[p.gt[0]], N[p.gt[1]]) + 1e-6, `${where}: arc opened more than ${p.gt[2]} of ${p.gt[0]}${p.gt[1]}`);
          if (p.eq) ok(Math.abs(p.r - dd(N[p.eq[0]], N[p.eq[1]])) < T9, `${where}: arc opened to ${p.eq[0]}${p.eq[1]}`);
          if (p.rv !== undefined) { ok(Math.abs(p.r / res.unit - p.rv) < 1e-9, `${where}: arc radius ${p.rv} cm`); ok(st.cap.includes(`${p.rv} cm`), `${where}: caption says ${p.rv} cm`); }
        }
      });
      const k0 = { sel: -1 };
      for (let i = 0; i < res.steps.length; i++) ok(svgClean(conSVG(res, i, { name: where, mv: null }, k0)), `${where}: step ${i} renders clean SVG`);
    };
    let tried = 0;
    for (const con of CONS) {
      if (con.id === 'sss') continue;
      con.pre.forEach((pts, i) => { ok(conProblem(con, pts) === '', `${con.id} layout ${i + 1} is a good picture: ${conProblem(con, pts)}`); const res = con.build(pts); truth[con.id](res.N); stepRules(res, `${con.id}/${i}`); });
      let good = 0;
      for (let t = 0; t < 4000 && good < 150; t++) {
        const pts = con.mv.map(() => [18 + r() * (KW - 36), 18 + r() * (KH - 36)]);
        if (conProblem(con, pts)) continue;
        good++; tried++;
        const res = con.build(pts); truth[con.id](res.N); stepRules(res, `${con.id}/random`);
      }
      ok(good >= 100, `${con.id}: plenty of random layouts are good (${good})`);
    }
    ok(tried >= 500, `constructions checked on ${tried} random layouts`);
    // SSS: every triple 1–12, sides measured off the drawing, message iff the inequality fails
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) for (let c = 1; c <= 12; c++) {
      const L = { a, b, c }, can = a + b > c && b + c > a && c + a > b, res = buildSSS(L), N = res.N;
      ok(!!res.fail === !can, `sss ${a},${b},${c}: cannot-be-built exactly when the inequality fails`);
      ok(Math.abs(dd(N.A, N.B) / res.unit - c) < 1e-9, `sss ${a},${b},${c}: AB = c`);
      if (can) {
        ok(Math.abs(dd(N.B, N.C) / res.unit - a) < 1e-9 && Math.abs(dd(N.C, N.A) / res.unit - b) < 1e-9, `sss ${a},${b},${c}: BC = a and CA = b`);
        const segs = res.steps.flatMap((st) => st.add.filter((p) => p.t === 'seg'));
        const lens = segs.map((p) => dd(p.a, p.b) / res.unit).sort((x, y) => x - y), want = [a, b, c].sort((x, y) => x - y);
        ok(lens.length === 3 && lens.every((x, i) => Math.abs(x - want[i]) < 1e-9), `sss ${a},${b},${c}: the three drawn sides are the chosen lengths`);
      } else {
        const arcs = res.steps.flatMap((st) => st.add.filter((p) => p.t === 'arc'));
        const meet = circlesMeet(arcs[0].c, arcs[0].r, arcs[1].c, arcs[1].r);
        ok(meet.length <= 1 && !N.C, `sss ${a},${b},${c}: the circles do not cross`);
        const flat = Math.max(a, b, c) * 2 === a + b + c;
        ok(flat === (dd(N.gA, N.gB) < 1e-9), `sss ${a},${b},${c}: arcs touch exactly when the sides are equal`);
        if (flat) ok(onLine(N.gA, N.A, N.B), `sss ${a},${b},${c}: they touch on AB`);
        else ok(dd(N.gA, N.gB) > 1e-3, `sss ${a},${b},${c}: a visible gap`);
      }
      const all = [...Object.values(N)];
      for (const st of res.steps) for (const p of st.add) if (p.t === 'arc') for (let t2 = p.a0; t2 <= p.a1; t2 += 0.1) all.push([p.c[0] + p.r * Math.cos(t2), p.c[1] + p.r * Math.sin(t2)]);
      ok(all.every((p) => inBox(p, 4)), `sss ${a},${b},${c}: fits the page`);
      if ((a * 7 + b * 3 + c) % 9 === 0 || !can) stepRules(res, `sss ${a},${b},${c}`);
    }
    // flows on a fake context, for every band: tap and keyboard
    for (const band of ['6-7', '8-10', '11-14']) {
      const ctx = makeCtx('shapes', band), V = () => view(ctx), clean = (w) => { const h = V(); ok(svgClean(h) && !/\[object Object\]/.test(h), `${band} construct ${w}: clean`); return h; };
      act('bench', 'construct', ctx); ok(bench(ctx) === 'construct', `${band}: construct bench opens`);
      const list = conList(band); ok(band === '6-7' ? list.length === 4 : list.length === 6, `${band}: ${list.length} constructions offered`);
      for (const con of list) {
        act('kcon', con.id, ctx); const k = ctx.ui.k; ok(k.id === con.id && k.step === 0, `${band}: open ${con.id}`);
        const n = kBuild(k, con).steps.length;
        for (let i = 1; i < n + 2; i++) { key({ key: 'ArrowRight' }, ctx); clean(`${con.id} step ${k.step}`); }
        ok(k.step === n - 1, `${band} ${con.id}: → reaches the last step and stops`);
        const h = V(); ok(h.includes('Why it works') || h.includes('Why it cannot be built'), `${band} ${con.id}: the why card at the end`);
        ok(con.id === 'sss' && kBuild(k, con).fail ? true : !!(ctx.data.built || {})[con.id], `${band} ${con.id}: finishing is remembered`);
        key({ key: 'ArrowLeft' }, ctx); ok(k.step === n - 2 && !V().includes('Why it works'), `${band} ${con.id}: ← goes back`);
        act('kstep', '-1', ctx); act('kstep', '1', ctx); ok(k.step === n - 2, `${band} ${con.id}: Back and Next buttons`);
        key({ key: 'Home' }, ctx); ok(k.step === 0, 'Home: first step'); act('kstep', '-1', ctx); ok(k.step === 0, 'Back at the start stays put');
        key({ key: 'End' }, ctx); ok(k.step === n - 1, 'End: last step');
        // the links: shown only for Atlas stops that exist
        for (const id of CLINKS[con.id]) ok(V().includes(`data-arg="${id}"`) === !!byId[id], `${band} ${con.id}: link to ${id} only if the stop exists`);
        if (con.id === 'sss') {
          k.L = { a: 4, b: 5, c: 6 };
          act('klen', 'c,1', ctx); ok(k.L.c === 7 && k.lsel === 'c', 'tap + makes c longer');
          key({ key: 'b' }, ctx); key({ key: 'ArrowUp' }, ctx); key({ key: 'ArrowUp' }, ctx); ok(k.L.b === 7 && k.lsel === 'b', `keys pick b and lengthen it (${k.L.b})`);
          key({ key: 'ArrowDown' }, ctx); ok(k.L.b === 6, 'down shortens');
          for (let i = 0; i < 20; i++) act('klen', 'a,-1', ctx); ok(k.L.a === 1, 'lengths stop at 1');
          for (let i = 0; i < 20; i++) act('klen', 'a,1', ctx); ok(k.L.a === 12, 'lengths stop at 12');
          for (const [L, can] of [[{ a: 3, b: 4, c: 5 }, true], [{ a: 2, b: 3, c: 7 }, false], [{ a: 3, b: 4, c: 7 }, false], [{ a: 9, b: 4, c: 5 }, false], [{ a: 5, b: 5, c: 9 }, true]]) {
            k.L = L; for (let s = 0; s < 6; s++) { k.step = s; const hh = clean(`sss ${JSON.stringify(L)}`); ok(hh.includes('cannot be built') === !can, `sss ${JSON.stringify(L)}: message ${can ? 'absent' : 'shown'} at step ${s}`); }
          }
          k.L = { a: 3, b: 4, c: 7 }; key({ key: 'End' }, ctx); ok(V().includes('only just touch') || V().includes('squashed flat'), 'sss: equality says the arcs only touch');
          con.pre.forEach((_, i) => { act('kpre', String(i), ctx); ok(JSON.stringify(k.L) === JSON.stringify(con.pre[i]), `sss preset ${i}`); clean(`sss preset ${i}`); });
          continue;
        }
        // presets by tap
        act('kpre', '1', ctx); ok(JSON.stringify(kPts(k, con)) === JSON.stringify(con.pre[1]), `${band} ${con.id}: tap a layout`);
        key({ key: 'n' }, ctx); ok(con.pre.some((pp) => JSON.stringify(pp) === JSON.stringify(kPts(k, con))), `${band} ${con.id}: N changes layout`);
        act('kpre', '0', ctx);
        // tap a point, nudge it with the pad
        act('knudge', '12,0', ctx); ok(JSON.stringify(kPts(k, con)) === JSON.stringify(con.pre[0]) && /Tap a point/.test(k.msg), `${band} ${con.id}: nudge without a point asks for one`);
        act('kpick', '0', ctx); ok(k.sel === 0, 'tap picks a point'); ok(V().includes('t-shapes-k-sel') && V().includes('t-shapes-k-pad'), 'picked point ringed, pad shown');
        const x0 = kPts(k, con)[0].slice();
        act('knudge', '0,-12', ctx); const x1 = kPts(k, con)[0];
        ok((x1[0] === x0[0] && x1[1] === x0[1] - 12) || (k.msg && x1[1] === x0[1]), `${band} ${con.id}: the pad moves the point or says why not`);
        // keyboard: arrows nudge the chosen point, Esc lets go, arrows step again
        act('kpre', '0', ctx); k.sel = -1;
        key({ key: '2' }, ctx); ok(k.sel === 1, 'key 2 picks the second point');
        const y0 = kPts(k, con)[1].slice(), stepBefore = k.step;
        key({ key: 'ArrowLeft' }, ctx); const y1 = kPts(k, con)[1];
        ok(k.step === stepBefore && ((y1[0] === y0[0] - 6 && y1[1] === y0[1]) || (k.msg && y1[0] === y0[0])), `${band} ${con.id}: ← nudges the picked point instead of stepping`);
        key({ key: 'Escape' }, ctx); ok(k.sel === -1, 'Esc lets go'); ok(key({ key: 'Escape' }, ctx) === false, 'Esc with nothing picked is left to the app');
        key({ key: 'Home' }, ctx); key({ key: 'ArrowRight' }, ctx); ok(k.step === 1, 'arrows step again');
        // shove every point hard against every edge: the picture never breaks
        for (let i = 0; i < con.mv.length; i++) {
          act('kpick', String(i), ctx); if (k.sel !== i) act('kpick', String(i), ctx);
          for (const d of ['-24,0', '0,-24', '24,0', '0,24']) for (let j = 0; j < 25; j++) key({ key: { '-24,0': 'ArrowLeft', '0,-24': 'ArrowUp', '24,0': 'ArrowRight', '0,24': 'ArrowDown' }[d], shiftKey: true }, ctx);
          ok(conProblem(con, kPts(k, con)) === '', `${band} ${con.id}: after shoving point ${i} the picture is still good`);
          for (let s = 0; s < 6; s++) { k.step = s; clean(`${con.id} shoved`); }
          truth[con.id](con.build(kPts(k, con)).N);
          key({ key: 'Escape' }, ctx);
        }
      }
      act('kcon', 'nope', ctx); ok(conList(band).some((c) => c.id === ctx.ui.k.id), 'unknown construction ignored');
      if (band === '6-7') { act('kcon', 'copy', ctx); ok(ctx.ui.k.id !== 'copy', '6-7: copying an angle is for older bands'); }
    }
  }
  for (const id of Object.values(LINKS).flat()) ok(!!byId[id], `Atlas stop ${id} exists`);
  ok(TOOL.art === 'lib-shapes' && TOOL.id === 'shapes', 'TOOL');
  ok(CSS.replace(/@media[^{]*\{/g, '').split('}').map((x) => x.split('{')[0].trim()).filter(Boolean).every((sel) => sel.split(',').every((s) => /^\.t-shapes-/.test(s.trim()))), 'every CSS class is prefixed t-shapes-');
  ok(!/#[0-9a-fA-F]{3,6}\b|rgb\(/.test(CSS), 'CSS colours come from variables');
}
