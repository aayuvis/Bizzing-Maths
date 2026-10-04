/* court.js — The Counting Court: the methods of traditional Chinese
   mathematics, done rather than read (docs/CHAPTER-CONTRACT.md).

   The Library's Chinese Maths Journey (library/chinese.js) shows the rods, the
   suanpan and the Nine Chapters' kinds of problem. This world makes the child
   WORK them: push beads with the five and ten complements, lay partial
   products on the counting board, add red and black rods by the rule of
   signs, clear a fangcheng array column by column, run the excess-and-deficit
   rule, build the Sunzi multipliers, cut and move an area, survey an island
   with two poles, double a polygon's sides towards the circle, and pin down
   one answer from a hundred-fowls family.

   HISTORY RULE (CLAUDE.md rule 6): a stop that says anything about a book, a
   person or a date carries `sources` — the same editions chinese.js cites,
   plus one named edition for the Sea Island manual — and `needsReview: true`.
   Nothing here says who was "first", and no quotation is given: the rules are
   told in plain words. The stories are modern and fictional.

   Every drill is checked three ways: the method's own steps (`work`), `ans`,
   and `expr`, which gets there by a different road — usually by trying every
   number, or by the algebra the method replaces. */

import { int, pick, shuffle } from '../rand.js';
import { svg, text } from './kit.js';

export const WORLD = {
  id: 'court', name: 'The Counting Court', short: 'Court', band: '8-10',
  blurb: 'Rods, beads and the counting board: do the methods of the Chinese mathematical books with your own hands.',
  tint: '#F6EBDD', ink: '#7A2418', glyph: '🧮',
};

/* ------------------------------------------------------------ sources (as chinese.js cites them) */

const NINE = 'Shen Kangshen, John N. Crossley and Anthony W.-C. Lun, The Nine Chapters on the Mathematical Art: Companion and Commentary (Oxford University Press, 1999).';
const MARTZLOFF = 'Jean-Claude Martzloff, A History of Chinese Mathematics (Springer, 1997).';
const NEEDHAM = 'Joseph Needham, with the collaboration of Wang Ling, Science and Civilisation in China, Vol. 3: Mathematics and the Sciences of the Heavens and the Earth (Cambridge University Press, 1959).';
const LAM = 'Lam Lay Yong and Ang Tian Se, Fleeting Footsteps: Tracing the Conception of Arithmetic and Algebra in Ancient China (World Scientific, 1992; revised edition 2004).';
const SWETZ = 'Frank J. Swetz, The Sea Island Mathematical Manual: Surveying and Mathematics in Ancient China (Pennsylvania State University Press, 1992).';

/* ------------------------------------------------------------ helpers */

/* The test's leaked-answer rule, applied before a question leaves gen(), and
   held to the working too: a step's label never shows the answer. */
const shows = (str, a) => String(str).split(/[^0-9./]/).map((w) => w.replace(/\.$/, '')).includes(a);
const leaks = (t, q) => { const a = String(q.ans); return !q.choices && a.length > 1 && (shows(q.text, a) || t.work(q).some((s) => shows(s.t, a))); };
function fresh(t, make) { let q; for (let i = 0; i < 500; i++) { q = make(); if (q && !leaks(t, q)) return q; } return q; }
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const r2 = (x) => Math.round(x * 100) / 100;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const PLACE = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
const digit = (n, p) => Math.floor(n / 10 ** p) % 10;
const bags = (n) => `${n} bag${n === 1 ? '' : 's'}`;
const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const lots = (n) => `${n} lot${n === 1 ? '' : 's'}`;

/* Drawings colour themselves inline from the app's CSS variables, the way
   library/chinese.js does, so they read in light and dark. */
const ST = {
  rod: 'stroke:var(--treasure-deep);stroke-width:4.5;stroke-linecap:round', hole: 'fill:none;stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 4',
  board: 'fill:var(--surface2);stroke:var(--line)', frame: 'fill:var(--treasure-deep)', inner: 'fill:var(--surface2)', wire: 'stroke:var(--muted);stroke-width:3',
  beam: 'fill:var(--treasure-deep)', sel: 'fill:var(--action-tint)', bead: 'fill:var(--surface);stroke:var(--ink);stroke-width:1.5', beadOn: 'fill:var(--fix);stroke:var(--ink);stroke-width:1.5',
  cut: 'stroke:var(--fix);stroke-width:2.5;stroke-dasharray:7 5;fill:none', move: 'stroke:var(--action);stroke-width:2.5;fill:none',
};
/* Red and black rods are drawn on a pale wooden board whose colours do not
   change with the theme: black rods on a dark page would vanish. */
const RB = { wood: 'fill:#EEDDBB;stroke:#8A6A3A;stroke-width:2', red: 'stroke:#C62828;stroke-width:4.5;stroke-linecap:round', black: 'stroke:#1A1A1A;stroke-width:4.5;stroke-linecap:round', ink: 'fill:#3B2A12;font:700 14px var(--ui)' };

/* Rod numerals, as the Library's journey draws them: units upright, tens flat,
   taking turns; 1–5 that many rods, 6–9 a crossing rod for five and the rest. */
function rodCells(n) {
  return String(n).split('').map(Number).map((d, i, a) => {
    const p = a.length - 1 - i, form = p % 2 === 0 ? 'upright' : 'flat';
    return d === 0 ? { p, form, empty: true } : { p, form, five: d > 5 ? 1 : 0, ones: d > 5 ? d - 5 : d };
  });
}
function rodCell(c, x, y, st = ST.rod) {
  if (c.empty) return `<rect x="${x + 4}" y="${y + 4}" width="32" height="52" rx="4" style="${ST.hole}"/>`;
  let s = '';
  if (c.form === 'upright') {
    const top = c.five ? y + 20 : y + 6;
    for (let k = 0; k < c.ones; k++) { const xx = x + 20 + (k - (c.ones - 1) / 2) * 7; s += `<line x1="${xx}" y1="${top}" x2="${xx}" y2="${y + 56}" style="${st}"/>`; }
    if (c.five) s += `<line x1="${x + 4}" y1="${y + 12}" x2="${x + 36}" y2="${y + 12}" style="${st}"/>`;
  } else {
    for (let k = 0; k < c.ones; k++) { const yy = y + 54 - k * 8; s += `<line x1="${x + 5}" y1="${yy}" x2="${x + 35}" y2="${yy}" style="${st}"/>`; }
    if (c.five) s += `<line x1="${x + 20}" y1="${y + 4}" x2="${x + 20}" y2="${y + 54 - (c.ones - 1) * 8 - 6}" style="${st}"/>`;
  }
  return s;
}
const rodGroup = (n, x, y, st) => rodCells(n).map((c, i) => rodCell(c, x + i * 44, y, st)).join('');

/* The suanpan: two beads above the beam (5 each), five below (1 each). */
const ROD_COUNT = 5;
const abEncode = (n) => { const d = String(n).padStart(ROD_COUNT, '0').split('').map(Number); return { h: d.map((x) => (x >= 5 ? 1 : 0)), e: d.map((x) => x % 5) }; };
/* The number on the beads, read back bead by bead — the independent route for `expr`. */
const abExpr = (n) => { const ab = abEncode(n); return ab.h.map((h, i) => `(5*${h}+${ab.e[i]})*${10 ** (ROD_COUNT - 1 - i)}`).join('+'); };
function bead(x, y, on) {
  return `<path d="M${x - 20},${y + 8} Q${x - 18},${y} ${x - 8},${y} L${x + 8},${y} Q${x + 18},${y} ${x + 20},${y + 8} Q${x + 18},${y + 16} ${x + 8},${y + 16} L${x - 8},${y + 16} Q${x - 18},${y + 16} ${x - 20},${y + 8} Z" style="${on ? ST.beadOn : ST.bead}"/>`;
}
function abSvg(n, sel = ROD_COUNT - 1, label = 'A number on a suanpan') {
  const ab = abEncode(n), W = ROD_COUNT * 50 + 20, H = 250, beam = 74;
  let s = `<rect x="4" y="4" width="${W - 8}" height="${H - 28}" rx="10" style="${ST.frame}"/><rect x="12" y="12" width="${W - 24}" height="${H - 44}" rx="4" style="${ST.inner}"/>`;
  for (let i = 0; i < ROD_COUNT; i++) {
    const x = 35 + i * 50;
    if (i === sel) s += `<rect x="${x - 22}" y="12" width="44" height="${H - 44}" rx="6" style="${ST.sel}"/>`;
    s += `<line x1="${x}" y1="12" x2="${x}" y2="${H - 32}" style="${ST.wire}"/>`;
    for (let j = 0; j < 2; j++) { const on = j < ab.h[i]; s += bead(x, on ? beam - 4 - 16 * (j + 1) : 14 + 16 * (1 - j), on); }
    for (let j = 0; j < 5; j++) { const on = j < ab.e[i]; s += bead(x, on ? beam + 5 + 16 * j : H - 34 - 16 * (5 - j), on); }
    s += text(x, H - 6, ['', '1000s', '100s', '10s', '1s'][i], 'dg-small');
  }
  s += `<rect x="12" y="${beam - 3}" width="${W - 24}" height="6" style="${ST.beam}"/>`;
  return svg(W, H, s, label);
}

/* The counting board for multiplying: top row, a middle row that grows, bottom row. */
function boardSvg(a, b) {
  const la = String(a).length, lb = String(b).length, lp = String(a * b).length, cols = Math.max(la + lb, lp), W = cols * 44 + 90, H = 230;
  const right = (len) => 76 + (cols - len) * 44;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" style="${ST.board}"/>`;
  for (let k = 0; k <= cols; k++) s += `<line x1="${74 + k * 44}" y1="6" x2="${74 + k * 44}" y2="${H - 6}" class="dg-grid"/>`;
  s += text(38, 42, 'top', 'dg-small') + text(38, 118, 'middle', 'dg-small') + text(38, 194, 'bottom', 'dg-small');
  s += rodGroup(a, right(la), 8) + text(right(lp) + (lp * 44) / 2, 124, '?', 'dg-accent') + rodGroup(b, right(lb), 160);
  return svg(W, H, s, `The counting board: ${a} on top, ${b} below, the answer to grow in the middle`);
}

/* A fangcheng array: one column of rod numerals per condition, read right to left. */
function arraySvg(cols, rows) {
  const width = Math.max(...cols.flat().map((v) => String(v).length), 2), colW = width * 44 + 12, n = cols.length;
  const W = n * colW + 110, H = rows.length * 72 + 34;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" style="${ST.board}"/>`;
  rows.forEach((l, r) => { s += text(48, 50 + r * 72, l, 'dg-small'); if (r < rows.length - 1) s += `<line x1="92" y1="${14 + (r + 1) * 72}" x2="${W - 8}" y2="${14 + (r + 1) * 72}" class="dg-grid"/>`; });
  const names = n === 2 ? ['left', 'right'] : ['left', 'middle', 'right'];
  [...cols].reverse().forEach((col, j) => {   // the first condition is the RIGHT column
    const x = 96 + j * colW;
    col.forEach((v, r) => { s += rodGroup(v, x + colW - String(v).length * 44 - 6, 18 + r * 72); });
    s += text(x + colW / 2, H - 8, names[j], 'dg-small');
  });
  return svg(W, H, s, 'A fangcheng array: each condition is a column of rod numerals');
}

/* Red and black rod numbers on the wooden board, with the sum between them. */
function rbSvg(a, ca, op, b, cb) {
  const wa = String(a).length * 44, wb = String(b).length * 44, W = wa + wb + 120, H = 112;
  let s = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="10" style="${RB.wood}"/>`;
  s += rodGroup(a, 22, 14, RB[ca]) + `<text x="${22 + wa + 38}" y="58" style="${RB.ink};font-size:26px" text-anchor="middle">${op === 'add' ? '+' : '−'}</text>` + rodGroup(b, 22 + wa + 76, 14, RB[cb]);
  s += `<text x="${22 + wa / 2}" y="96" style="${RB.ink}" text-anchor="middle">${ca}</text><text x="${22 + wa + 76 + wb / 2}" y="96" style="${RB.ink}" text-anchor="middle">${cb}</text>`;
  return svg(W, H, s, `${ca} rods ${op === 'add' ? 'add' : 'take away'} ${cb} rods`);
}

/* ================================================================ suanpan: the complements */

const isFive = (u, d) => u < 5 && d < 5 && u + d >= 5;

/* ================================================================ out and in */

/* Where a cut piece lands: a dashed outline, so the picture shows the move, not the answer. */
const ghost = (pts) => `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" class="dg-fill3" style="fill-opacity:.45;stroke-dasharray:6 4"/>`;
function outInSvg(q) {
  const { kind } = q, M = 'm';
  const u = Math.min(22, 300 / Math.max(q.a || q.b || 1, q.h * 1.4)), x0 = 30, H = q.h * u, y0 = 26, yb = y0 + H, ym = y0 + H / 2;
  let s = '', W = 0;
  const lab = (x, y, t, cls = 'dg-text', anchor = 'middle') => text(x.toFixed(1), y.toFixed(1), t, cls, anchor);
  if (kind === 'parallelogram') {
    const b = q.b * u, off = Math.min(q.h * u * 0.6, b * 0.45);
    s += `<polygon points="${x0},${yb} ${x0 + b},${yb} ${x0 + b + off},${y0} ${x0 + off},${y0}" class="dg-fill2"/>`;
    s += `<line x1="${x0 + off}" y1="${y0}" x2="${x0 + off}" y2="${yb}" style="${ST.cut}"/>`;
    s += ghost([[x0 + b, yb], [x0 + b + off, yb], [x0 + b + off, y0]]);
    s += lab(x0 + b / 2, yb + 22, `base ${q.b} ${M}`) + lab(x0 + off + 6, ym + 5, `height ${q.h} ${M}`, 'dg-small', 'start');
    W = x0 + b + off + 30;
  } else if (kind === 'triangle') {
    const b = q.b * u, ax = x0 + b * 0.45;
    s += `<polygon points="${x0},${yb} ${x0 + b},${yb} ${ax},${y0}" class="dg-fill2"/>`;
    const lx = x0 + (ax - x0) / 2, rx = ax + (x0 + b - ax) / 2;
    s += `<line x1="${lx}" y1="${ym}" x2="${rx}" y2="${ym}" style="${ST.cut}"/><line x1="${ax}" y1="${y0}" x2="${ax}" y2="${ym}" style="${ST.cut}"/>`;
    s += `<line x1="${ax}" y1="${ym}" x2="${ax}" y2="${yb}" class="dg-thin"/>`;
    // each top piece turns half a turn about its end of the cut, down into a corner
    s += ghost([[lx, ym], [2 * lx - ax, ym], [2 * lx - ax, yb]]) + ghost([[rx, ym], [2 * rx - ax, ym], [2 * rx - ax, yb]]);
    s += lab(x0 + b / 2, yb + 22, `base ${q.b} ${M}`) + lab(ax + 6, (ym + yb) / 2 + 5, `height ${q.h} ${M}`, 'dg-small', 'start');
    W = x0 + b + 60;
  } else {
    const a = q.a * u, c = q.c * u, off = (a - c) / 2;
    s += `<polygon points="${x0},${yb} ${x0 + a},${yb} ${x0 + off + c},${y0} ${x0 + off},${y0}" class="dg-fill2"/>`;
    s += `<line x1="${x0 + off / 2}" y1="${ym}" x2="${x0 + a - off / 2}" y2="${ym}" style="${ST.cut}"/>`;
    // the top half turned half a turn about the right end of the cut: it lands beside the bottom half
    const cx = x0 + a - off / 2, rot = ([x, y]) => [2 * cx - x, 2 * ym - y];
    s += ghost([[x0 + off / 2, ym], [cx, ym], [x0 + off + c, y0], [x0 + off, y0]].map(rot));
    s += lab(x0 + a / 2, yb + 22, `${q.a} ${M}`) + lab(x0 + off + c / 2, y0 - 8, kind === 'missing' ? '? m' : `${q.c} ${M}`, kind === 'missing' ? 'dg-accent' : 'dg-text');
    s += lab(x0 - 6, ym + 5, `${q.h} ${M}`, 'dg-small', 'end');
    if (kind === 'missing') s += lab(x0 + a / 2, (ym + yb) / 2 + 6, `area ${q.A} m²`, 'dg-small');
    W = x0 + a + c + off + 30;
  }
  return svg(W, yb + 32, s, 'A shape with a cut marked, and where the piece moves');
}

/* ================================================================ excess and deficit */

const ITEMS = ['present', 'football', 'cake', 'board game', 'kite', 'plant', 'picnic hamper'];
function edSvg(q) {
  const big = Math.max(q.x * q.n, q.y * q.n, q.p), u = 300 / big, x0 = 96, rh = 30;
  const rows = [{ name: 'the cost', w: q.p * u, t: '?' }];
  if (q.kind === 'same' && q.form === 'excess') rows.push({ name: `${q.x} each`, w: q.x * q.n * u, extra: `${q.a} over` }, { name: `${q.y} each`, w: q.y * q.n * u, extra: `${q.b} over` });
  else if (q.kind === 'same') rows.push({ name: `${q.x} each`, w: q.x * q.n * u, short: `${q.a} short` }, { name: `${q.y} each`, w: q.y * q.n * u, short: `${q.b} short` });
  else rows.push({ name: `${q.x} each`, w: q.x * q.n * u, extra: `${q.a} over` }, { name: `${q.y} each`, w: q.y * q.n * u, short: `${q.b} short` });
  let s = `<line x1="${x0 + q.p * u}" y1="2" x2="${x0 + q.p * u}" y2="${rows.length * (rh + 12) + 4}" class="dg-grid"/>`;
  rows.forEach((r, i) => {
    const y = 6 + i * (rh + 12);
    s += text(x0 - 8, y + 20, r.name, 'dg-small', 'end') + `<rect x="${x0}" y="${y}" width="${r.w.toFixed(1)}" height="${rh}" rx="4" class="${i ? 'dg-fill1' : 'dg-fill2'}"/>`;
    if (r.t) s += text(x0 + r.w / 2, y + 21, r.t, 'dg-accent');
    if (r.extra) s += text(x0 + r.w + 8, y + 20, r.extra, 'dg-small', 'start');
    if (r.short) s += text(x0 + Math.max(r.w, q.p * u) + 8, y + 20, r.short, 'dg-small', 'start');
  });
  return svg(x0 + 300 + 100, rows.length * (rh + 12) + 8, s, 'The cost, and what two ways of paying collect');
}

/* ================================================================ fangcheng */

const GRAIN = ['rice', 'lentils', 'flour'];
/* Clear the array the board's way and return every number the working needs. */
function clear2(cols, ask) {
  const [[a1, b1, c1], [a2, b2, c2]] = cols;
  if (ask === 'low') return { m: a1, k: a2, tot1: a1 * c2, coef: a1 * b2 - a2 * b1, rest: a1 * c2 - a2 * c1 };
  return { m: b1, k: b2, tot1: b1 * c2, coef: b1 * a2 - b2 * a1, rest: b1 * c2 - b2 * c1 };
}
function clear3(cols) {
  const [[a1, b1, c1, d1], [a2, b2, c2, d2], [a3, b3, c3, d3]] = cols;
  const B2 = a1 * b2 - a2 * b1, C2 = a1 * c2 - a2 * c1, D2 = a1 * d2 - a2 * d1;
  const B3 = a1 * b3 - a3 * b1, C3 = a1 * c3 - a3 * c1, D3 = a1 * d3 - a3 * d1;
  return { B2, B3, C: B2 * C3 - B3 * C2, D: B2 * D3 - B3 * D2 };
}

/* ================================================================ the Sunzi multipliers */

/* The method itself: a multiplier for each divisor, the weighted sum, then
   take away the product. `expr` checks it by trying every number instead. */
function sunzi(m, n, a, b) {
  let M1 = n; while (M1 % m !== 1) M1 += n;
  let M2 = m; while (M2 % n !== 1) M2 += m;
  const S = a * M1 + b * M2; return { M1, M2, S, x: S % (m * n) };
}

/* ================================================================ the sea island */

function islandSvg(q) {
  const P = 40, Hs = 150, hp = 40, g = 210, x1 = 300, x2 = 440, eye = (xp) => (xp - (P * hp) / Hs) / (1 - hp / Hs);
  const e1 = eye(x1), e2 = eye(x2), W = e2 + 40;
  let s = `<line x1="4" y1="${g}" x2="${W - 4}" y2="${g}" class="dg-line"/>`;
  s += `<path d="M${P - 34},${g} Q${P - 20},${g - 70} ${P},${g - Hs} Q${P + 22},${g - 80} ${P + 60},${g} Z" class="dg-fill3"/>`;
  s += `<line x1="${e1}" y1="${g}" x2="${P}" y2="${g - Hs}" class="dg-thin" style="stroke-dasharray:5 4"/><line x1="${e2}" y1="${g}" x2="${P}" y2="${g - Hs}" class="dg-thin" style="stroke-dasharray:5 4"/>`;
  for (const x of [x1, x2]) s += `<line x1="${x}" y1="${g}" x2="${x}" y2="${g - hp}" class="dg-hand"/>`;
  for (const x of [e1, e2]) s += `<circle cx="${x}" cy="${g}" r="5" class="dg-dot"/>`;
  s += text(x1 - 6, g - hp / 2 + 4, `${q.h} m`, 'dg-small', 'end') + text(x2 - 6, g - hp / 2 + 4, `${q.h} m`, 'dg-small', 'end');
  s += `<line x1="${x1}" y1="${g + 14}" x2="${x2}" y2="${g + 14}" class="dg-thin"/>` + text((x1 + x2) / 2, g + 30, `${q.d} m apart`, 'dg-small');
  s += text((x1 + e1) / 2 + 4, g - 8, `${q.s1} m`, 'dg-small') + text((x2 + e2) / 2 + 4, g - 8, `${q.s2} m`, 'dg-small');
  if (q.kind === 'height') s += `<line x1="${P}" y1="${g}" x2="${P}" y2="${g - Hs}" class="dg-thin"/>` + text(P + 10, g - Hs / 2, '?', 'dg-accent', 'start');
  else s += `<line x1="${P}" y1="${g + 14}" x2="${x1}" y2="${g + 14}" class="dg-thin"/>` + text((P + x1) / 2, g + 30, '?', 'dg-accent');
  return svg(W, g + 40, s, 'An island peak, two equal poles, and two sight lines along the ground to the peak');
}

/* ================================================================ Liu Hui's polygons */

/* For the doubling question: the drawn working rounds to 2 places at each
   step; only radii where that lands on the true 12-gon side are asked. */
const doubleWork = (r) => { const half = r / 2, ap = r2(Math.sqrt(r * r - half * half)), gap = r2(r - ap); return { half, ap, gap, side: r2(Math.sqrt(half * half + gap * gap)) }; };
const DOUBLE_R = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 40, 50].filter((r) => doubleWork(r).side === r2(2 * r * Math.sin(Math.PI / 12)));
/* For the estimate: a side given to 4 places (radius 1) or 3 places (radius 10). */
const sideOf = (n, r) => (r === 1 ? r4(2 * Math.sin(Math.PI / n)) : Math.round(2 * r * Math.sin(Math.PI / n) * 1e3) / 1e3);
const estOf = (n, r) => r2(r4(n * sideOf(n, r)) / (2 * r));
const ESTS = [12, 24, 48, 96].flatMap((n) => [1, 10].map((r) => ({ n, r }))).filter(({ n, r }) => estOf(n, r) === r2(n * Math.sin(Math.PI / n)));
const APPROX = [['22/7', 22 / 7], ['355/113', 355 / 113], ['3', 3], ['3.14', 3.14], ['25/8', 25 / 8], ['19/6', 19 / 6], ['157/50', 157 / 50], ['47/15', 47 / 15]];
const PI4 = r4(Math.PI);
function polySvg(n, r, mark) {
  const R = 110, c = R + 20; let s = `<circle cx="${c}" cy="${c}" r="${R}" class="dg-blank"/>`;
  const pt = (k, m) => [c + R * Math.cos((2 * Math.PI * k) / m - Math.PI / 2), c + R * Math.sin((2 * Math.PI * k) / m - Math.PI / 2)];
  const shown = Math.min(n, 48);
  s += `<polygon points="${Array.from({ length: shown }, (_, k) => pt(k, shown).map((v) => v.toFixed(1)).join(',')).join(' ')}" class="dg-fill1" style="fill-opacity:.55"/>`;
  if (mark === 'double') {
    const [ax, ay] = pt(0, 6), [bx, by] = pt(1, 6), mx = (ax + bx) / 2, my = (ay + by) / 2, [tx, ty] = pt(1, 12);
    s += `<line x1="${c}" y1="${c}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" class="dg-thin"/><polygon points="${ax.toFixed(1)},${ay.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}" class="dg-fill2"/>`;
    s += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" style="${ST.cut}"/>` + text(((ax + tx) / 2 + 4).toFixed(1), ((ay + ty) / 2 - 6).toFixed(1), '?', 'dg-accent', 'start');
    s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3" class="dg-dot"/>`;
  }
  s += `<line x1="${c}" y1="${c}" x2="${c + R}" y2="${c}" class="dg-line"/><circle cx="${c}" cy="${c}" r="3.5" class="dg-dot"/>` + text(c + R / 2, c + 18, `r = ${r}`, 'dg-small');
  return svg(2 * c, 2 * c, s, `A circle with a regular ${n}-sided shape inside it`);
}

/* ================================================================ the hundred fowls */

/* Every answer, by the method's own fact: for each rooster count the hens are
   fixed by (kp − 1)R + (kq − 1)H = (k − 1)N, and the chicks fill the rest. */
function fowlSolutions(p, q, k, N) {
  const out = [];
  for (let R = 1; R < N; R++) {
    const top = (k - 1) * N - (k * p - 1) * R; if (top <= 0) break;
    if (top % (k * q - 1)) continue;
    const H = top / (k * q - 1), Z = N - R - H;
    if (H >= 1 && Z >= 1 && Z % k === 0 && p * R + q * H + Z / k === N) out.push([R, H, Z]);
  }
  return out;
}
function tagsSvg(p, q, k) {
  const tags = [['rooster', `${p} coins`], ['hen', `${q} coins`], [`${k} chicks`, '1 coin']];
  let s = ''; tags.forEach(([a, b], i) => { const x = 6 + i * 124; s += `<rect x="${x}" y="6" width="112" height="58" rx="10" class="dg-fill${i + 1}"/>` + text(x + 56, 30, a, 'dg-text') + text(x + 56, 52, b, 'dg-small'); });
  return svg(380, 70, s, 'Three price tags');
}

/* ================================================================ the stops */

export const TRICKS = [
  /* ---------------------------------------------------------------- 1. suanpan: adding */
  {
    id: 'suanpan-add', world: 'court', band: '8-10', title: 'Adding on the suanpan',
    hook: 'The units rod shows 6. You need to add 7 — but there are not seven beads left to push. Now what?',
    idea: 'When a rod runs out of beads, add with a partner: to add 7, carry 1 to the next rod and take 3 away; to add 4 below the beam, bring down the five and take 1 away.',
    why: [
      'A suanpan rod holds one digit: an upper bead worth 5 and lower beads worth 1 each. Adding 7 to a rod that shows 6 would need 13 on one rod, and a rod cannot hold that. But 7 is the same as 10 take away 3. So push one bead onto the next rod to the left (that is the 10) and take 3 beads off this rod. The rod now shows 3, and one more ten is on the board: 6 + 7 = 13.',
      'The same trick works with five. To add 4 to a rod showing 3, there are only four lower beads in all and three are already up. But 4 is 5 take away 1. So bring the five-bead down to the beam and push one lower bead away: the rod shows 7.',
      'These partners — 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5 for ten; 1 and 4, 2 and 3 for five — are called complements. An abacus user never adds big digits at all: every sum becomes "push some beads, take some away". When the next rod is already full at 9, the carry runs on to the rod after it, the same as a carry in a column sum.',
    ],
    alg: 'add d = add 10, take away (10 − d)  ·  add d = add 5, take away (5 − d)',
    ex: { kind: 'ten', n: 46, d: 7 },
    caseKey: 'kind',
    cases: [
      { label: 'The five-bead partner', note: 'Not enough lower beads: bring the five down, take its partner away.', ex: { kind: 'five', n: 23, d: 4 } },
      { label: 'The ten partner', note: 'The rod would pass 9: carry 1 to the left, take the partner away.', ex: { kind: 'ten', n: 46, d: 7 } },
      { label: 'Which beads go?', note: 'Say the partner before you move a bead: that is the whole method.', ex: { kind: 'which', n: 8, d: 6 } },
      { label: 'A carry that runs on', note: 'When the tens rod is full at 9, it clears and the carry goes one rod further.', ex: { kind: 'ripple', n: 296, d: 8 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? pick(['five', 'ten', 'ten'], r) : lv === 2 ? pick(['five', 'ten', 'which', 'ripple'], r) : pick(['ten', 'which', 'ripple', 'ripple'], r);
        const top = lv === 1 ? 9 : lv === 2 ? 99 : 999;   // what sits above the units rod
        for (let i = 0; i < 400; i++) {
          const d = int(1, 9, r), u = int(0, 9, r);
          if (kind === 'five' && !isFive(u, d)) continue;
          if (kind !== 'five' && u + d < 10) continue;
          let above = int(0, top, r);
          if (kind === 'ripple') { if (lv === 1) continue; above = Math.floor(int(0, top, r) / 10) * 10 + 9; if (digit(above, 1) === 9) continue; }
          else if (kind !== 'five' && digit(above, 0) === 9) continue;
          return this.q({ kind, n: above * 10 + u, d });
        }
        return null;
      });
    },
    q({ kind, n, d }) {
      const u = n % 10;
      if (kind === 'which') return { kind, n, d, u, text: `The units rod of a suanpan shows ${u}. To add ${d}, you push one bead onto the tens rod and take some beads away from the units rod. How many beads do you take away?`, expr: `${u}-((${u}+${d})%10)`, ans: 10 - d };
      return { kind, n, d, u, text: `The suanpan shows ${n}. Add ${d} with the beads. What does it show now?`, expr: `(${abExpr(n)})+${d}`, ans: n + d };
    },
    work({ kind, n, d, u }) {
      if (kind === 'which') return [{ t: `Is ${u} + ${d} ten or more?`, v: 'Yes', choices: ['Yes', 'No'], x: `${n}%10+${d}>=10?'Yes':'No'` }, { t: `${d} and what make ten?`, v: 10 - d }];
      const s = [{ t: 'Read the units rod', v: u, x: `${n}%10` }];
      if (kind === 'five') {
        s.push({ t: `Not enough lower beads for ${d}. Bring the five down: how many lower beads come away?`, v: 5 - d, x: `5-${d}` }, { t: 'The units rod now shows', v: u + d, x: `(${n}+${d})%10` });
        if (n >= 10) s.push({ t: 'Read the whole suanpan', v: n + d });
        return s;
      }
      s.push({ t: `${d} and what make ten?`, v: 10 - d, x: `10-${d}` }, { t: 'Take that many off the units rod: it shows', v: u + d - 10, x: `(${n}+${d})%10` });
      if (kind === 'ten') s.push({ t: `Carry 1: the tens rod goes from ${digit(n, 1)} to`, v: digit(n, 1) + 1, x: `Math.floor((${n}+${d})/10)%10` });
      else s.push({ t: 'The tens rod is full at 9: it clears, and the carry goes on. The hundreds rod shows', v: digit(n, 2) + 1, x: `Math.floor((${n}+${d})/100)%10` });
      s.push({ t: 'Read the whole suanpan', v: n + d });
      return s;
    },
    draw(q) { return abSvg(q.kind === 'which' ? q.u : q.n, ROD_COUNT - 1, q.kind === 'which' ? 'The units rod of a suanpan' : 'The number on the suanpan before you add'); },
  },

  /* ---------------------------------------------------------------- 2. suanpan: taking away */
  {
    id: 'suanpan-take', world: 'court', band: '8-10', title: 'Taking away on the suanpan',
    hook: 'The rod shows 3 and you must take away 8. There are not eight beads to take. What do you do?',
    idea: 'Take away with the same partners, the other way round: to take 8, borrow 1 from the next rod and add 2; to take 4 across the five, add 1 and lift the five away.',
    why: [
      'Taking away 8 from a rod that shows 3 cannot be done on that rod. So borrow: take one bead off the next rod to the left. That bead is worth ten here. Ten take away 8 is 2, so instead of taking 8 off you ADD 2 to this rod. Taking a ten off and putting 2 on is the same as taking 8 off.',
      'Across the five it is the mirror of adding. To take 4 from a rod showing 6 (the five-bead and one lower bead), there are not four lower beads up. But 4 is 5 take away 1. So push one lower bead up, then lift the five-bead away: 6 − 4 = 2.',
      'If the rod you want to borrow from is empty, borrow from the rod beyond it. That rod gives one bead, which becomes ten on the empty rod; you use one of those tens, so the empty rod shows 9. It is exactly the borrowing of a column subtraction, done with your fingers.',
    ],
    alg: 'take d = take 10, add (10 − d)  ·  take d = take 5, add (5 − d)',
    ex: { kind: 'ten', n: 43, d: 8 },
    caseKey: 'kind',
    cases: [
      { label: 'Across the five-bead', note: 'Not enough lower beads to take: add the partner, then lift the five away.', ex: { kind: 'five', n: 36, d: 4 } },
      { label: 'Borrow a ten', note: 'Take 1 off the next rod, then add the partner to this one.', ex: { kind: 'ten', n: 43, d: 8 } },
      { label: 'Which beads come on?', note: 'Name the partner first: borrowing 10 to take d means adding 10 − d.', ex: { kind: 'which', n: 52, d: 7 } },
      { label: 'Borrow past an empty rod', note: 'The empty rod borrows from the next one and is left showing 9.', ex: { kind: 'ripple', n: 405, d: 7 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? pick(['five', 'ten', 'ten'], r) : lv === 2 ? pick(['five', 'ten', 'which', 'ripple'], r) : pick(['ten', 'which', 'ripple', 'ripple'], r);
        const top = lv === 1 ? 9 : lv === 2 ? 99 : 999;
        for (let i = 0; i < 400; i++) {
          const d = int(1, 9, r), u = int(0, 9, r);
          if (kind === 'five' && !(u >= 5 && d < 5 && u - d < 5)) continue;
          if (kind !== 'five' && u >= d) continue;
          let above = int(kind === 'five' ? 0 : 1, top, r);
          if (kind === 'ripple') { if (lv === 1 || top < 99) continue; above = Math.max(1, Math.floor(above / 10)) * 10; }
          else if (kind !== 'five' && digit(above, 0) === 0) continue;
          return this.q({ kind, n: above * 10 + u, d });
        }
        return null;
      });
    },
    q({ kind, n, d }) {
      const u = n % 10;
      if (kind === 'which') return { kind, n, d, u, text: `The units rod of a suanpan shows ${u}. To take away ${d}, you take one bead off the tens rod and put some beads onto the units rod. How many beads do you put on?`, expr: `((${u}-${d}+10)%10)-${u}`, ans: 10 - d };
      return { kind, n, d, u, text: `The suanpan shows ${n}. Take away ${d} with the beads. What does it show now?`, expr: `(${abExpr(n)})-${d}`, ans: n - d };
    },
    work({ kind, n, d, u }) {
      if (kind === 'which') return [{ t: `Is ${u} smaller than ${d}?`, v: 'Yes', choices: ['Yes', 'No'], x: `${n}%10<${d}?'Yes':'No'` }, { t: `${d} and what make ten?`, v: 10 - d }];
      const s = [{ t: 'Read the units rod', v: u, x: `${n}%10` }];
      if (kind === 'five') {
        s.push({ t: `Not enough lower beads to take ${d}. Push up how many lower beads, then lift the five away?`, v: 5 - d, x: `5-${d}` }, { t: 'The units rod now shows', v: u - d, x: `(${n}-${d})%10` });
        if (n >= 10) s.push({ t: 'Read the whole suanpan', v: n - d });
        return s;
      }
      if (kind === 'ten') s.push({ t: `Borrow 1: the tens rod goes from ${digit(n, 1)} to`, v: digit(n, 1) - 1, x: `Math.floor((${n}-${d})/10)%10` });
      else s.push({ t: `The tens rod is empty: borrow from the hundreds (${digit(n, 2)} becomes ${digit(n, 2) - 1}). The tens rod now shows`, v: 9, x: `Math.floor((${n}-${d})/10)%10` });
      s.push({ t: `${d} and what make ten? Put that many on the units rod`, v: 10 - d, x: `10-${d}` }, { t: 'The units rod now shows', v: u + 10 - d, x: `(${n}-${d})%10` }, { t: 'Read the whole suanpan', v: n - d });
      return s;
    },
    draw(q) { return abSvg(q.kind === 'which' ? q.u : q.n, ROD_COUNT - 1, q.kind === 'which' ? 'The units rod of a suanpan' : 'The number on the suanpan before you take away'); },
  },

  /* ---------------------------------------------------------------- 3. the counting board */
  {
    id: 'board-multiply', world: 'court', band: '8-10', title: 'Multiplying on the counting board',
    hook: '234 × 6 — without a times table for 234?',
    idea: 'Put one number on top and one below; take the top digits one at a time from the left, lay each product in the middle row in its own place, and the middle row adds up to the answer.',
    why: [
      'The counting board has three rows. One number goes on top, the other at the bottom, and the answer grows in the middle. You start with the top number\'s biggest digit. In 234 × 6, the 2 is really 2 hundreds, so it makes 200 × 6 = 1200, laid in the middle under the hundreds.',
      'Then the next digit: 3 tens make 30 × 6 = 180, added into the middle row. Then 4 units make 24, added in. The middle row now holds 1200 + 180 + 24. Every product sits in the place its digit came from, so they add up without any muddle.',
      'Why it must be right: 234 is 200 + 30 + 4, and multiplying a sum means multiplying each part and adding the results. The board is just a tidy place to keep those parts lined up — the same reason the long multiplication on paper works.',
    ],
    alg: '(100a + 10b + c) × m = 100a·m + 10b·m + c·m',
    ex: { a: 234, b: 6 },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(this, () => {
        if (lv === 1) return this.q({ a: int(12, 98, r), b: int(3, 9, r) });
        if (lv === 2) return r() < 0.5 ? this.q({ a: int(102, 899, r), b: int(3, 9, r) }) : this.q({ a: int(12, 59, r), b: int(12, 39, r) });
        return this.q({ a: int(112, 699, r), b: int(12, 49, r) });
      });
    },
    q({ a, b }) {
      // the independent route: the digits of a, each times b, weighted by place
      const ex = String(a).split('').reverse().map((d, p) => `${d}*${10 ** p}*${b}`).join('+');
      return { a, b, text: `Use the counting board: ${a} × ${b}`, expr: ex, ans: a * b };
    },
    work({ a, b }) {
      const ds = String(a).split('').map(Number), L = ds.length, s = [];
      ds.forEach((d, i) => { const p = L - 1 - i; if (d) s.push({ t: `${d} ${PLACE[p]}: ${d * 10 ** p} × ${b}, laid in the middle`, v: d * 10 ** p * b, x: `Math.floor(${a}/${10 ** p})%10*${10 ** p}*${b}` }); });
      s.push({ t: 'Add up the middle row', v: a * b });
      return s;
    },
    draw(q) { return boardSvg(q.a, q.b); },
  },

  /* ---------------------------------------------------------------- 4. out and in */
  {
    id: 'out-in', world: 'court', band: '8-10', title: 'Cut it, move it: out and in',
    hook: 'A garden bed is 12 m along the bottom, 6 m along the top and 4 m high. Its area — without a formula?',
    idea: 'Cut the shape, move the piece, and make a rectangle: what goes out of one place comes in at another, so the area never changes.',
    why: [
      'Area is how much flat space a shape covers. If you cut a shape into pieces and slide or turn the pieces into a new place, nothing is added and nothing is lost — so the new shape has exactly the same area. Writers on the Nine Chapters call this the out-in principle: what goes out here comes in there.',
      'So the trick is to cut a shape you cannot measure into pieces that make one you can. A slanted parallelogram: cut the triangle off one end and slide it to the other — a rectangle, base times height. A triangle: cut across at half its height and swing the two top pieces down into the corners — a rectangle as wide as the base and half as tall.',
      'A trapezium (two parallel sides): cut across at half its height, and turn the top half round so it sits beside the bottom half. Now its two parallel sides lie end to end, the shape is half as tall, and it can be squared off: the area is (top + bottom) × half the height. Run it backwards and you can find a missing side from the area.',
    ],
    alg: 'trapezium = (a + c) × h ÷ 2  ·  triangle = b × (h ÷ 2)  ·  parallelogram = b × h',
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: { kind: 'trapezium', a: 12, c: 6, h: 4 },
    caseKey: 'kind',
    cases: [
      { label: 'Slide a parallelogram', note: 'Cut the end triangle off and slide it across: a rectangle, base by height.', ex: { kind: 'parallelogram', b: 9, h: 5 } },
      { label: 'Fold a triangle down', note: 'Cut at half the height and swing the two top pieces into the corners.', ex: { kind: 'triangle', b: 10, h: 6 } },
      { label: 'Turn a trapezium round', note: 'Cut at half the height and turn the top half beside the bottom: top and bottom add.', ex: { kind: 'trapezium', a: 12, c: 6, h: 4 } },
      { label: 'Run it backwards', note: 'Double the area, divide by the height: the two parallel sides together.', ex: { kind: 'missing', a: 11, c: 5, h: 6 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? pick(['parallelogram', 'triangle'], r) : lv === 2 ? pick(['triangle', 'trapezium', 'trapezium'], r) : pick(['trapezium', 'missing', 'missing'], r);
        const top = lv === 1 ? 12 : lv === 2 ? 20 : 30;
        if (kind === 'parallelogram') return this.q({ kind, b: int(3, top, r), h: int(2, Math.min(top, 12), r) });
        if (kind === 'triangle') return this.q({ kind, b: int(3, top, r), h: 2 * int(1, Math.min(top, 12) / 2, r) });
        const c = int(2, top - 2, r), a = int(c + 2, top + 4, r), h = 2 * int(1, lv === 3 ? 9 : 6, r);
        return this.q({ kind, a, c, h });
      });
    },
    q({ kind, a, b, c, h }) {
      if (kind === 'parallelogram') return { kind, b, h, text: `A garden bed is a slanted parallelogram with a base of ${b} m and a height of ${h} m. What is its area in m²?`, expr: `${b}*${h}`, ans: b * h };
      if (kind === 'triangle') return { kind, b, h, text: `A triangular flower bed has a base of ${b} m and a height of ${h} m. What is its area in m²?`, expr: `${b}*${h}-${b}*${h}/2`, ans: (b * h) / 2 };
      if (kind === 'trapezium') return { kind, a, c, h, text: `A garden bed is a trapezium: its parallel sides are ${a} m and ${c} m, and it is ${h} m high. What is its area in m²?`, expr: `${c}*${h}+(${a}-${c})*${h}/2`, ans: ((a + c) * h) / 2 };
      const A = ((a + c) * h) / 2;
      return { kind, a, c, h, A, text: `A trapezium-shaped bed has an area of ${A} m². It is ${h} m high and one of its parallel sides is ${a} m. How long is the other parallel side, in m?`, expr: `[...Array(400).keys()].find((x)=>(${a}+x)*${h}===2*${A})`, ans: c };
    },
    work({ kind, a, b, c, h, A }) {
      if (kind === 'parallelogram') return [{ t: 'Slide the end triangle across: the rectangle is as tall as the height', v: h, x: String.raw`(()=>{const p=SVG.match(/points="([^"]+)"/)[1].split(' ').map((q)=>q.split(',').map(Number)),l=SVG.match(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)"/);return Math.round((l[2]-l[1])/(p[1][0]-p[0][0])*H.n(TEXT,1)*1e6)/1e6})()` }, { t: 'and as wide as the base. Area = width × height', v: b * h }];
      if (kind === 'triangle') return [{ t: 'Cut across at half the height: the rectangle is this tall', v: h / 2, x: `${h}/2` }, { t: 'The pieces fill the corners, so it is as wide as the base. Area', v: (b * h) / 2 }];
      if (kind === 'trapezium') return [{ t: 'Turn the top half round beside the bottom: the two parallel sides end to end', v: a + c, x: `${a}+${c}` }, { t: 'It is now half as tall', v: h / 2, x: `${h}/2` }, { t: 'Area = length × height', v: ((a + c) * h) / 2 }];
      return [{ t: 'Double the area', v: 2 * A, x: `${A}+${A}` }, { t: `Divide by the height, ${h}: the two parallel sides together`, v: a + c, x: `2*${A}/${h}` }, { t: `Take away the side you know, ${a}`, v: c }];
    },
    draw(q) { return outInSvg(q); },
  },

  /* ---------------------------------------------------------------- 5. red and black rods */
  {
    id: 'red-black-rods', world: 'court', band: '8-10', title: 'Red and black rods',
    hook: 'Red 7 take away red 12. There are not 12 red rods to take — so is the answer red or black, and how big?',
    idea: 'Same colours add when you add and take apart when you take away; different colours take apart when you add and add when you take away — and the colour tells you the sign.',
    why: [
      'On the counting board a number can be a gain or a debt. In the Nine Chapters\' commentary tradition, as the sources describe it, red rods count as positive and black rods as negative. (Careful: a bank statement uses red for owing — the board is the other way round.) The eighth chapter of the Nine Chapters gives rules for adding and taking away such numbers, and the rules are about colours, not about a number line.',
      'Adding: two piles of the same colour just join, so add their sizes and keep the colour. A red rod and a black rod cancel — a gain and an equal debt make nothing — so with different colours, take the smaller size from the bigger; what survives has the colour of the bigger pile.',
      'Taking away: from a pile, take rods of the same colour off it; if you must take more than there is, the shortfall shows up in the other colour. Taking away a black (a debt) is the same as being given a red (a gain), so with different colours the sizes add and the answer keeps the first number\'s colour. Every rule is "count the rods, then decide the colour".',
    ],
    alg: '(+a) − (−b) = a + b  ·  (+a) + (−b) = ±|a − b|  ·  (−a) − (−b) = b − a',
    keys: ['−'],
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: { op: 'sub', a: 7, ca: 'red', b: 12, cb: 'red' },
    caseKey: 'kind',
    cases: [
      { label: 'Add, same colours', note: 'The piles join: add the sizes and keep the colour.', ex: { op: 'add', a: 8, ca: 'black', b: 5, cb: 'black' } },
      { label: 'Add, different colours', note: 'Red and black cancel: the bigger pile wins by the difference.', ex: { op: 'add', a: 6, ca: 'red', b: 9, cb: 'black' } },
      { label: 'Take, same colours', note: 'Take the rods off the pile; the rest keeps its colour.', ex: { op: 'sub', a: 15, ca: 'black', b: 6, cb: 'black' } },
      { label: 'Take more than is there', note: 'The shortfall appears in the other colour.', ex: { op: 'sub', a: 7, ca: 'red', b: 12, cb: 'red' } },
      { label: 'Take, different colours', note: 'Taking a debt away is a gain: sizes add, first colour stays.', ex: { op: 'sub', a: 9, ca: 'red', b: 4, cb: 'black' } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const top = lv === 1 ? 9 : lv === 2 ? 30 : 99;
        for (let i = 0; i < 200; i++) {
          const op = lv === 1 && r() < 0.6 ? 'add' : pick(['add', 'sub'], r);
          const a = int(1, top, r), b = int(1, top, r), ca = pick(['red', 'black'], r), cb = pick(['red', 'black'], r);
          if (a === b) continue;   // a pile that cancels to nothing leaves nothing to colour
          return this.q({ op, a, ca, b, cb });
        }
        return null;
      });
    },
    q({ op, a, ca, b, cb }) {
      const sa = ca === 'red' ? a : -a, sb = cb === 'red' ? b : -b, ans = op === 'add' ? sa + sb : sa - sb;
      const kind = op === 'add' ? (ca === cb ? 'add-same' : 'add-diff') : ca !== cb ? 'sub-diff' : a > b ? 'sub-same' : 'sub-flip';
      return { op, a, ca, b, cb, kind,
        text: `On the counting board: ${ca} ${a} ${op === 'add' ? 'add' : 'take away'} ${cb} ${b}. Red rods count as positive and black as negative. What is the answer?`,
        expr: `(('${ca}'==='red'?1:-1)*${a})${op === 'add' ? '+' : '-'}(('${cb}'==='red'?1:-1)*${b})`, ans };
    },
    work({ op, a, ca, b, cb, kind }) {
      const sa = ca === 'red' ? a : -a, sb = cb === 'red' ? b : -b, ans = op === 'add' ? sa + sb : sa - sb;
      const other = (c) => (c === 'red' ? 'black' : 'red');
      // the size, the second route: the signed sum on a number line, without its sign
      const size = `Math.abs((('${ca}'==='red'?1:-1)*${a})${op === 'add' ? '+' : '-'}(('${cb}'==='red'?1:-1)*${b}))`;
      const s = [{ t: 'Same colour or different?', v: ca === cb ? 'Same' : 'Different', choices: ['Same', 'Different'], x: `'${ca}'==='${cb}'?'Same':'Different'` }];
      if (kind === 'add-same') s.push({ t: 'Same colours, adding: the piles join. How many rods?', v: a + b, x: size }, { t: `They stay ${ca}, so the answer is`, v: ans });
      if (kind === 'add-diff') s.push({ t: 'Different colours, adding: red and black cancel. Take the smaller size from the bigger', v: Math.abs(a - b), x: size }, { t: `The ${a > b ? ca : cb} pile was bigger, so the answer is`, v: ans });
      if (kind === 'sub-same') s.push({ t: `Same colours, taking away: take ${b} rods off the ${a}`, v: a - b, x: size }, { t: `What is left is still ${ca}, so the answer is`, v: ans });
      if (kind === 'sub-flip') s.push({ t: `Same colours, but ${b} is more than ${a}: how many short?`, v: b - a, x: size }, { t: `The shortfall shows in the other colour, ${other(ca)}, so the answer is`, v: ans });
      if (kind === 'sub-diff') s.push({ t: `Different colours, taking away: taking ${cb} away is like being given ${other(cb)}. Add the sizes`, v: a + b, x: size }, { t: `The answer keeps the first colour, ${ca}`, v: ans });
      return s;
    },
    draw(q) { return rbSvg(q.a, q.ca, q.op, q.b, q.cb); },
  },

  /* ---------------------------------------------------------------- 6. excess and deficit */
  {
    id: 'excess-deficit', world: 'court', band: '11-14', title: 'Too many, too few',
    hook: 'Pay 8 each and there are 3 coins too many; pay 7 each and you are 4 short. How many friends?',
    idea: 'The gap between the two ways of paying, divided by the difference in what each person pays, is the number of people.',
    why: [
      'The seventh chapter of the Nine Chapters is about problems of this shape, called excess and deficit: a group pays one amount each and has some over, or another amount each and is some short. Two guesses at the price, one too big and one too small, pin the answer down.',
      'Think about what changes between the two ways of paying. Paying 8 each collects 3 more than the price; paying 7 each collects 4 less. So the two collections are 3 + 4 = 7 coins apart. But going from 7 each to 8 each adds exactly 1 coin per person. To make a gap of 7 coins there must be 7 people.',
      'If both ways leave coins over (or both leave you short), the two collections are the DIFFERENCE of the two gaps apart, not the sum — so subtract instead of adding. Once you know how many people, the price is easy: everyone pays the first amount, less what was over.',
    ],
    alg: 'people = (excess + deficit) ÷ (x − y)  ·  price = x × people − excess',
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: { kind: 'people', n: 7, p: 53, x: 8, y: 7, item: 'present' },
    caseKey: 'kind',
    cases: [
      { label: 'How many people?', note: 'Over plus short is the gap; divide by how much more each pays.', ex: { kind: 'people', n: 7, p: 53, x: 8, y: 7, item: 'present' } },
      { label: 'What does it cost?', note: 'Find the people first, then everyone pays and you give back the extra.', ex: { kind: 'price', n: 6, p: 50, x: 9, y: 7, item: 'football' } },
      { label: 'Over both times', note: 'Both collections overshoot (or both fall short): the gap is the difference.', ex: { kind: 'same', n: 5, p: 31, x: 9, y: 7, item: 'kite' } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? 'people' : lv === 2 ? pick(['people', 'price'], r) : pick(['price', 'same', 'same'], r);
        for (let i = 0; i < 300; i++) {
          const n = int(3, lv === 1 ? 9 : lv === 2 ? 15 : 24, r), x = int(3, lv === 1 ? 10 : 20, r), y = int(2, x - 1, r);
          let p;
          if (kind === 'same') p = r() < 0.5 ? int(1, y * n - 1, r) : int(x * n + 1, x * n + 30, r);
          else p = int(y * n + 1, x * n - 1, r);
          if (p < 2 || p === x * n || p === y * n) continue;
          return this.q({ kind, n, p, x, y, item: pick(ITEMS, r) });
        }
        return null;
      });
    },
    q({ kind, n, p, x, y, item }) {
      const a = Math.abs(x * n - p), b = Math.abs(p - y * n), form = kind !== 'same' ? 'mixed' : x * n > p ? 'excess' : 'deficit';
      const coins = (g) => `${g} coin${g === 1 ? '' : 's'}`;
      const say = (amt, gap, over, still) => `if each pays ${amt} coins, ${over ? `there ${gap === 1 ? 'is' : 'are'}${still ? ' still' : ''} ${coins(gap)} too many` : `they are${still ? ' still' : ''} ${coins(gap)} short`}`;
      const first = say(x, a, form !== 'deficit', false), second = say(y, b, form === 'excess', kind === 'same');
      const lead = `Some friends club together to buy a ${item}. ${first[0].toUpperCase() + first.slice(1)}; ${second}.`;
      const find = `[...Array(1000).keys()].find((k)=>k>0&&${x}*k-(${x * n - p})===${y}*k-(${y * n - p}))`;
      return { kind, n, p, x, y, item, a, b, form,
        text: `${lead} ${kind === 'price' ? `What does the ${item} cost, in coins?` : 'How many friends are there?'}`,
        expr: kind === 'price' ? `${x}*${find}-(${x * n - p})` : find, ans: kind === 'price' ? p : n };
    },
    work({ kind, n, p, x, y, a, b, form }) {
      const s = kind === 'same'
        ? [{ t: `${form === 'excess' ? 'Over' : 'Short'} both times: the two collections differ by ${Math.max(a, b)} − ${Math.min(a, b)}`, v: Math.abs(a - b), x: `(${x}-${y})*${n}` }]
        : [{ t: 'Too many plus too few: how far apart are the two collections?', v: a + b, x: `(${x}-${y})*${n}` }];
      s.push({ t: `Each friend pays ${x} − ${y} more the first way`, v: x - y, x: `(${x}*${n}-${y}*${n})/${n}` }, { t: 'Divide: the number of friends', v: n, x: `${kind === 'same' ? `Math.abs(${a}-${b})` : `(${a}+${b})`}/(${x}-${y})` });
      if (kind === 'price') s.push({ t: `Everyone pays ${x}; give back the ${a} too many`, v: p });
      return s;
    },
    draw(q) { return edSvg(q); },
  },

  /* ---------------------------------------------------------------- 7. fangcheng */
  {
    id: 'fangcheng', world: 'court', band: '11-14', title: 'Fangcheng: clearing the columns',
    hook: 'Two shopping lists, two totals, two prices nobody told you — the board finds both without a single guess.',
    idea: 'Write each fact as a column; multiply one column and take another away from it again and again until a place is empty — then one unknown is left alone.',
    why: [
      'The eighth chapter of the Nine Chapters, Fangcheng, sets out each fact as a column of rods on the board — the first fact on the right — and solves for several unknowns at once by working on whole columns.',
      'A column is a true fact: "3 rice and 2 lentils make 29 kg". Multiply every number in it by 3 and it is still true. Take one true column away from another and what is left is true too. So multiply the left column by the right column\'s top number, then take the right column away from it that many times: the top place empties, and the left column now talks about lentils alone.',
      'With three unknowns you do it twice: clear the top place of the middle and left columns using the right column, then clear the middle place of the left column using the middle column. What is left is one kind of bag and a number of kilograms — divide. The same column moves, done with letters, are how equations are solved today.',
    ],
    alg: 'a₁x + b₁y = c₁, a₂x + b₂y = c₂  ⇒  (a₁b₂ − a₂b₁)·y = a₁c₂ − a₂c₁',
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: { cols: [[3, 2, 29], [2, 3, 26]], ask: 'low' },
    caseKey: ['size', 'ask'],
    cases: [
      { label: 'Two columns: the low row', note: 'Clear the top place of the left column; lentils are left alone.', ex: { cols: [[3, 2, 29], [2, 3, 26]], ask: 'low' } },
      { label: 'Two columns: the top row', note: 'Clear the low place instead; the rice is left alone.', ex: { cols: [[2, 3, 27], [4, 1, 19]], ask: 'top' } },
      { label: 'Three columns', note: 'Clear the top places with the right column, then the middle place with the middle column.', ex: { cols: [[1, 1, 1, 12], [2, 3, 1, 22], [1, 2, 3, 25]], ask: 'low' } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const three = lv === 3 && r() < 0.6;
        for (let i = 0; i < 2000; i++) {
          if (three) {
            const sol = [int(1, 9, r), int(1, 9, r), int(1, 9, r)], cols = [0, 1, 2].map(() => { const c = [int(1, 4, r), int(1, 4, r), int(1, 4, r)]; return [...c, c[0] * sol[0] + c[1] * sol[1] + c[2] * sol[2]]; });
            const k = clear3(cols);
            if (k.B2 <= 0 || k.B3 <= 0 || k.C <= 0 || k.D > 3000) continue;
            return this.q({ cols, ask: 'low' });
          }
          const hi = lv === 1 ? 4 : 6, ask = pick(['low', 'top'], r), sol = [int(2, lv === 1 ? 9 : 15, r), int(2, lv === 1 ? 9 : 15, r)];
          const cols = [0, 1].map(() => { const c = [int(1, hi, r), int(1, hi, r)]; return [...c, c[0] * sol[0] + c[1] * sol[1]]; });
          if (clear2(cols, ask).coef <= 0) continue;
          return this.q({ cols, ask });
        }
        return null;
      });
    },
    q({ cols, ask }) {
      const size = cols.length;
      if (size === 2) {
        const [[a1, b1, c1], [a2, b2, c2]] = cols, k = clear2(cols, ask), det = a1 * b2 - a2 * b1;
        const ans = k.rest / k.coef;
        return { cols, ask, size,
          text: `On the counting board, the right column says ${bags(a1)} of rice and ${bags(b1)} of lentils weigh ${c1} kg. The left column says ${bags(a2)} of rice and ${bags(b2)} of lentils weigh ${c2} kg. How many kg is one bag of ${ask === 'low' ? 'lentils' : 'rice'}?`,
          expr: ask === 'low' ? `(${a1}*${c2}-${a2}*${c1})/(${det})` : `(${c1}*${b2}-${c2}*${b1})/(${det})`, ans };
      }
      const [[a1, b1, c1, d1], [a2, b2, c2, d2], [a3, b3, c3, d3]] = cols, k = clear3(cols);
      const eq = (a, b, c, d) => `${a}*x+${b}*y+${c}*z===${d}`;
      return { cols, ask, size,
        text: `Three columns on the board. Right: ${a1} rice, ${b1} lentils, ${c1} flour weigh ${d1} kg. Middle: ${a2} rice, ${b2} lentils, ${c2} flour weigh ${d2} kg. Left: ${a3} rice, ${b3} lentils, ${c3} flour weigh ${d3} kg. How many kg is one bag of flour?`,
        expr: `(()=>{for(let x=1;x<=40;x++)for(let y=1;y<=40;y++)for(let z=1;z<=40;z++)if(${eq(a1, b1, c1, d1)}&&${eq(a2, b2, c2, d2)}&&${eq(a3, b3, c3, d3)})return z;})()`, ans: k.D / k.C };
    },
    work({ cols, ask }) {
      if (cols.length === 2) {
        const k = clear2(cols, ask), pl = ask === 'low' ? 'top' : 'low', keep = ask === 'low' ? 'lentils' : 'rice';
        const [[a1, b1, c1], [a2, b2, c2]] = cols, [m, j, mk, jk] = ask === 'low' ? [a1, a2, b2, b1] : [b1, b2, a2, a1];
        return [
          { t: `Multiply the whole left column by ${k.m}, the right column's ${pl} number. Its kg become`, v: k.tot1, x: `${c2}*${m}` },
          { t: `Take the right column away ${times(k.k)}: the ${pl} place empties. How many bags of ${keep} are left?`, v: k.coef, x: `${mk}*${m}-${jk}*${j}` },
          { t: '…and how many kg?', v: k.rest, x: `${c2}*${m}-${c1}*${j}` },
          { t: `Divide: one bag of ${keep}`, v: k.rest / k.coef },
        ];
      }
      const k = clear3(cols), [[a1, b1, c1, d1], [a2, b2, c2, d2], [a3, b3, c3, d3]] = cols;
      const B2 = `(${b2}*${a1}-${b1}*${a2})`, B3 = `(${b3}*${a1}-${b1}*${a3})`, C2 = `(${c2}*${a1}-${c1}*${a2})`, C3 = `(${c3}*${a1}-${c1}*${a3})`, D2 = `(${d2}*${a1}-${d1}*${a2})`, D3 = `(${d3}*${a1}-${d1}*${a3})`;
      return [
        { t: `Middle column × ${a1}, take the right column away ${times(a2)}: the top place empties. Its lentils number is now`, v: k.B2, x: B2 },
        { t: `Left column × ${a1}, take the right column away ${times(a3)}. Its lentils number is now`, v: k.B3, x: B3 },
        { t: 'Now clear the lentils from the left column using the middle column. Its flour number is now', v: k.C, x: `${C3}*${B2}-${C2}*${B3}` },
        { t: '…and its kg', v: k.D, x: `${D3}*${B2}-${D2}*${B3}` },
        { t: 'Divide: one bag of flour', v: k.D / k.C },
      ];
    },
    draw(q) { return arraySvg(q.cols, q.cols.length === 2 ? ['rice', 'lentils', 'kg'] : ['rice', 'lentils', 'flour', 'kg']); },
  },

  /* ---------------------------------------------------------------- 8. the Sunzi multipliers */
  {
    id: 'sunzi-multipliers', world: 'court', band: '11-14', title: 'Remainders by multipliers',
    hook: 'A number leaves 2 when divided by 3 and 4 when divided by 7. Find it — without trying every number.',
    idea: 'Build one multiplier for each divisor — a number that leaves 1 by that divisor and nothing by the other — then take each remainder lots of its multiplier, add, and take away the product as often as you can.',
    why: [
      'The Sunzi suanjing asks for a number that leaves 2 by threes, 3 by fives and 2 by sevens, and its rule uses 70 for threes, 21 for fives and 15 for sevens. Look at 70: it is a multiple of 5 and of 7, and it leaves exactly 1 when divided by 3. That is the whole secret, and it works for any divisors that share no factor.',
      'Take divisors 3 and 7. Find a multiple of 7 that leaves 1 by 3: 7 leaves 1, so the first multiplier is 7. Find a multiple of 3 that leaves 1 by 7: 3, 6, 9, 12, 15 — 15 leaves 1, so the second is 15. Now 2 × 7 leaves 2 by threes and nothing by sevens; 4 × 15 leaves 4 by sevens and nothing by threes. Their sum, 14 + 60 = 74, leaves both remainders at once.',
      'Taking away 21 (that is 3 × 7) changes neither remainder, so take it away as often as you can: 74 − 63 = 11. Because 3 and 7 share no factor, the pattern of remainders only repeats every 21 numbers, so 11 is the one smallest answer. Today this is called the Chinese remainder theorem.',
    ],
    alg: 'x ≡ a (mod m), x ≡ b (mod n): x = a·M₁ + b·M₂ − k·mn, where M₁ ≡ 1 (mod m), n | M₁ and M₂ ≡ 1 (mod n), m | M₂',
    sources: [LAM, MARTZLOFF, NEEDHAM], needsReview: true,
    ex: { m: 3, n: 7, a: 2, b: 4 },
    oneIdea: true,
    gen(r, lv = 1) {
      const pool = lv === 1 ? [2, 3, 4, 5] : lv === 2 ? [2, 3, 4, 5, 6, 7, 8, 9] : [3, 4, 5, 7, 8, 9, 10, 11, 12, 13];
      return fresh(this, () => {
        for (let i = 0; i < 200; i++) {
          const m = pick(pool, r), n = pick(pool, r);
          if (m === n || gcd(m, n) !== 1) continue;
          const a = int(1, m - 1, r), b = int(1, n - 1, r);
          if (a === b) continue;   // the same leftover twice is answered by the leftover itself — no method needed
          return this.q({ m, n, a, b });
        }
        return null;
      });
    },
    q({ m, n, a, b }) {
      return { m, n, a, b, text: `A number leaves ${a} when divided by ${m}, and ${b} when divided by ${n}. What is the smallest such number?`,
        expr: `[...Array(${m * n + 1}).keys()].find((x)=>x>0&&x%${m}===${a}&&x%${n}===${b})`, ans: sunzi(m, n, a, b).x };
    },
    work({ m, n, a, b }) {
      const k = sunzi(m, n, a, b);
      // the second route: search the multiples one by one
      const M1 = `[...Array(${m}).keys()].map((i)=>(i+1)*${n}).find((v)=>v%${m}===1)`, M2 = `[...Array(${n}).keys()].map((i)=>(i+1)*${m}).find((v)=>v%${n}===1)`;
      return [
        { t: `The smallest multiple of ${n} that leaves 1 when divided by ${m}`, v: k.M1, x: M1 },
        { t: `The smallest multiple of ${m} that leaves 1 when divided by ${n}`, v: k.M2, x: M2 },
        { t: `${lots(a)} of the first, plus ${lots(b)} of the second`, v: k.S, x: `${a}*${M1}+${b}*${M2}` },
        { t: `Take away ${m * n} as many times as you can`, v: k.x },
      ];
    },
    draw({ m, n, a, b }) {
      const box = (x, t1, t2) => `<rect x="${x}" y="6" width="150" height="58" rx="10" class="dg-fill2"/>` + text(x + 75, 30, t1, 'dg-text') + text(x + 75, 52, t2, 'dg-small');
      return svg(320, 70, box(4, `÷ ${m}`, `leaves ${a}`) + box(166, `÷ ${n}`, `leaves ${b}`), 'Two remainder clues');
    },
  },

  /* ---------------------------------------------------------------- 9. the sea island */
  {
    id: 'sea-island', world: 'court', band: '11-14', title: 'The sea island survey',
    hook: 'You cannot reach the island, and you cannot climb its peak. Two poles and some pacing can still tell you how tall it is.',
    idea: 'Set up two equal poles in line with the peak; the difference between how far back you must lie to sight the peak over each pole gives the height and the distance by similar triangles.',
    why: [
      'The Sea Island Mathematical Manual, which the sources attribute to Liu Hui, is named after its first problem: measuring an island peak from the shore with two poles. Here is the idea in plain numbers.',
      'Lie on the ground behind a pole so the pole\'s top just lines up with the peak. The little triangle — pole height up, your distance back along the ground — has the same shape as the big triangle from your eye to the peak. So the peak is as many times taller than the pole as its distance from your eye is longer than your distance from the pole.',
      'Do it again from a second pole further back. Moving the pole back by d made you go back further by (s₂ − s₁) more than d. Working the two similar-triangle facts together, the height of the peak ABOVE the pole top is the pole height × d ÷ (s₂ − s₁); add the pole itself. And the distance from the first pole to the peak is s₁ × d ÷ (s₂ − s₁). No one had to cross the water.',
    ],
    alg: 'H = h·d ÷ (s₂ − s₁) + h  ·  D = s₁·d ÷ (s₂ − s₁)',
    sources: [SWETZ, MARTZLOFF, NEEDHAM], needsReview: true,
    ex: { kind: 'height', h: 5, d: 60, s1: 6, s2: 9 },
    caseKey: 'kind',
    cases: [
      { label: 'How tall is the peak?', note: 'The gap fits into the pole distance some number of times: that many poles, plus one.', ex: { kind: 'height', h: 5, d: 60, s1: 6, s2: 9 } },
      { label: 'How far away is it?', note: 'The same number of times the first back-step.', ex: { kind: 'distance', h: 4, d: 80, s1: 7, s2: 11 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? 'height' : pick(['height', 'distance'], r);
        const g = int(1, lv === 1 ? 4 : 8, r), k = int(lv === 1 ? 5 : 8, lv === 1 ? 20 : lv === 2 ? 40 : 90, r), s1 = int(3, lv === 1 ? 9 : 20, r);
        return this.q({ kind, h: int(2, lv === 1 ? 6 : 12, r), d: g * k, s1, s2: s1 + g });
      });
    },
    q({ kind, h, d, s1, s2 }) {
      const k = d / (s2 - s1), lead = `Two poles, each ${h} m tall, stand ${d} m apart in a straight line with an island peak. Lying ${s1} m behind the nearer pole, you see the peak just over its top; behind the further pole you must lie ${s2} m back.`;
      return kind === 'height'
        ? { kind, h, d, s1, s2, text: `${lead} How tall is the peak, in m?`, expr: `${h}*(${d}+${s2}-${s1})/(${s2}-${s1})`, ans: h + h * k }
        : { kind, h, d, s1, s2, text: `${lead} How far is the nearer pole from the peak, in m?`, expr: `${s1}*(${h}*(${d}+${s2}-${s1})/(${s2}-${s1})-${h})/${h}`, ans: s1 * k };
    },
    work({ kind, h, d, s1, s2 }) {
      const g = s2 - s1, k = d / g;
      const s = [{ t: 'How much further back did you lie the second time?', v: g, x: `${s2}-${s1}` }, { t: `How many times does that fit into the ${d} m between the poles?`, v: k, x: `${d}/(${s2}-${s1})` }];
      if (kind === 'height') s.push({ t: 'Times the pole height: the peak above the pole tops', v: h * k, x: `${h}*(${d}+${s2}-${s1})/(${s2}-${s1})-${h}` }, { t: 'Add the pole itself', v: h + h * k });
      else s.push({ t: `Times the first back-step, ${s1} m`, v: s1 * k });
      return s;
    },
    draw(q) { return islandSvg(q); },
  },

  /* ---------------------------------------------------------------- 10. Liu Hui's polygons */
  {
    id: 'liu-hui', world: 'court', band: '11-14', title: 'Liu Hui\'s polygons',
    hook: 'A hexagon inside a circle says π is about 3. How do you squeeze it closer?',
    idea: 'Fit a regular polygon inside the circle, double its number of sides again and again with Pythagoras, and its perimeter creeps up on the circle\'s.',
    why: [
      'In his commentary on the Nine Chapters (usually dated to 263 CE), Liu Hui found the circle\'s measure by fitting a regular polygon inside it, starting from a hexagon, and doubling the number of sides again and again. This stop does that work yourself.',
      'A regular hexagon inside a circle is six equal triangles meeting at the centre. Each has two radii for sides and a 60° angle between them, so it is equilateral: every side of the hexagon equals the radius. The perimeter is 6 radii, and perimeter ÷ diameter = 6r ÷ 2r = 3. That is the first, rough value of π.',
      'To double the sides, put a new corner on the circle halfway between two old ones. Pythagoras gives the distance from the centre to the middle of an old side; the radius minus that is a small gap; and Pythagoras again, with half an old side and the gap, gives the new side. Every doubling hugs the circle more tightly — 12 sides give about 3.11, 24 about 3.13, 96 about 3.14 — always a little under π, never over.',
    ],
    alg: 's₂ₙ = √((sₙ/2)² + (r − √(r² − (sₙ/2)²))²)  ·  π ≈ n·sₙ ÷ 2r',
    keys: ['.'], decimals: true,
    sources: [NINE, MARTZLOFF], needsReview: true,
    ex: { kind: 'double', r: 10 },
    caseKey: 'kind',
    cases: [
      { label: 'The hexagon', note: 'Six equilateral triangles: every side is a radius.', ex: { kind: 'hexagon', r: 7 } },
      { label: 'Double the sides', note: 'Pythagoras twice: half a side and the gap make the new side.', ex: { kind: 'double', r: 10 } },
      { label: 'Read off π', note: 'Perimeter ÷ diameter: the more sides, the closer to π.', ex: { kind: 'estimate', n: 24, r: 1 } },
      { label: 'Which is closer?', note: 'Write both as decimals and compare with 3.1416.', ex: { kind: 'closer', A: '22/7', B: '355/113', order: 0 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const kind = lv === 1 ? pick(['hexagon', 'hexagon', 'estimate'], r) : lv === 2 ? pick(['hexagon', 'double', 'estimate'], r) : pick(['double', 'estimate', 'closer'], r);
        if (kind === 'hexagon') return this.q({ kind, r: int(2, lv === 1 ? 12 : 40, r) });
        if (kind === 'double') return this.q({ kind, r: pick(DOUBLE_R, r) });
        if (kind === 'estimate') { const e = pick(ESTS, r); return this.q({ kind, n: e.n, r: e.r }); }
        for (let i = 0; i < 100; i++) {
          const [A, B] = shuffle(APPROX.slice(), r).slice(0, 2);
          const dA = Math.abs(r4(A[1]) - PI4), dB = Math.abs(r4(B[1]) - PI4);
          if (Math.abs(dA - dB) < 2e-4 || (dA < dB) !== (Math.abs(A[1] - Math.PI) < Math.abs(B[1] - Math.PI))) continue;
          return this.q({ kind, A: A[0], B: B[0], order: int(0, 1, r) });
        }
        return null;
      });
    },
    q({ kind, r, n, A, B, order }) {
      if (kind === 'hexagon') return { kind, r, text: `A regular hexagon fits exactly inside a circle of radius ${r} cm. What is the perimeter of the hexagon, in cm?`, expr: `6*2*${r}*Math.sin(Math.PI/6)`, ans: 6 * r };
      if (kind === 'double') return { kind, r, text: `A regular hexagon fits inside a circle of radius ${r} cm. Put a new corner on the circle halfway between each pair of corners to make a regular 12-sided shape. How long is each of its sides, to 2 decimal places?`, expr: `Math.round(2*${r}*Math.sin(Math.PI/12)*100)/100`, ans: doubleWork(r).side };
      if (kind === 'estimate') return { kind, n, r, s: sideOf(n, r), text: `A regular ${n}-sided shape fits inside a circle of radius ${r}. Each side is ${sideOf(n, r)} long. Perimeter ÷ diameter gives a value for π. What is it, to 2 decimal places?`, expr: `Math.round(${n}*Math.sin(Math.PI/${n})*100)/100`, ans: estOf(n, r) };
      const val = (f) => APPROX.find((x) => x[0] === f)[1], choices = order ? [B, A] : [A, B];
      return { kind, A, B, order, choices, text: `Which is closer to π: ${A} or ${B}?`, expr: `Math.abs((${A})-Math.PI)<Math.abs((${B})-Math.PI)?'${A}':'${B}'`, ans: Math.abs(val(A) - PI4) < Math.abs(val(B) - PI4) ? A : B };
    },
    work(q) {
      if (q.kind === 'hexagon') return [{ t: 'The angle at the centre of each of the six triangles, 360° ÷ 6', v: 60, x: "H.fact('full-turn')/SVG.match(/<polygon points=\"([^\"]+)\"/)[1].split(' ').length" }, { t: 'Each triangle is equilateral, so one side of the hexagon is', v: q.r, x: `2*${q.r}*Math.sin(Math.PI/6)` }, { t: 'Six sides', v: 6 * q.r }];
      if (q.kind === 'double') {
        const w = doubleWork(q.r);
        const ap = `Math.round(${q.r}*Math.sqrt(3)/2*100)/100`;   // the apothem of a hexagon is r√3/2
        return [{ t: 'Half a side of the hexagon', v: w.half, x: `${q.r}/2` }, { t: 'Centre to the middle of that side: √(r² − half²), to 2 places', v: w.ap, x: ap }, { t: 'The gap from there out to the circle: r minus that', v: w.gap, x: `${q.r}-${ap}` }, { t: 'New side: √(half² + gap²), to 2 places', v: w.side }];
      }
      if (q.kind === 'estimate') return [{ t: `Perimeter: ${q.n} × ${q.s}`, v: r4(q.n * q.s), x: `${q.n}*${q.s}` }, { t: `Divide by the diameter, ${2 * q.r}, and round to 2 places`, v: estOf(q.n, q.r) }];
      const val = (f) => APPROX.find((x) => x[0] === f)[1];
      return [{ t: `${q.A} as a decimal, to 4 places`, v: r4(val(q.A)), x: `Math.round((${q.A})*1e4)/1e4` }, { t: `${q.B} as a decimal, to 4 places`, v: r4(val(q.B)), x: `Math.round((${q.B})*1e4)/1e4` }, { t: 'π is 3.1416 to 4 places. Which is closer?', v: q.ans, choices: q.choices }];
    },
    draw(q) {
      if (q.kind === 'closer') return polySvg(96, 1, '');
      if (q.kind === 'estimate') return polySvg(q.n, q.r, '');
      return polySvg(6, q.r, q.kind === 'double' ? 'double' : '');
    },
  },

  /* ---------------------------------------------------------------- 11. the hundred fowls */
  {
    id: 'hundred-fowls', world: 'court', band: '11-14', title: 'The hundred fowls',
    hook: 'Roosters 5 coins, hens 3, chicks 3 for a coin: 100 birds for 100 coins. There is more than one way — so which one do they mean?',
    idea: 'Fold the two facts (birds and coins) into one that leaves out the chicks; its answers come in a family that steps along evenly, and a stated rule picks out exactly one.',
    why: [
      'The Zhang Qiujian suanjing (Zhang Qiujian\'s Mathematical Manual) has a problem of this kind: buy a hundred fowls with a hundred coins, roosters, hens and chicks at different prices. It has more than one answer, and that is the interesting part.',
      'There are three unknowns but only two facts: the number of birds and the number of coins. Multiply the coin fact by the chicks-per-coin, so every chick costs exactly 1, then take away the bird fact: the chicks disappear, and you are left with one fact about roosters and hens only — for 5, 3 and "3 for 1", 14 for each rooster and 8 for each hen make 200.',
      'That one fact has a whole family of answers. Each time you add a few roosters, the hens must drop by a fixed amount to keep the total — for 14 and 8 that is 4 more roosters for 7 fewer hens. So the answers step along evenly, and a rule like "as many roosters as possible" picks out exactly one. Then hens, then chicks, follow.',
    ],
    alg: 'R + H + Z = N, pR + qH + Z/k = N  ⇒  (kp − 1)R + (kq − 1)H = (k − 1)N',
    sources: [MARTZLOFF, NEEDHAM, LAM], needsReview: true,
    ex: { p: 5, q: 3, k: 3, N: 100, want: 'most', ask: 'hens' },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(this, () => {
        for (let i = 0; i < 400; i++) {
          const p = int(3, 8, r), q = int(2, p - 1, r), k = int(2, lv === 1 ? 3 : 5, r), N = int(lv === 1 ? 20 : 40, lv === 1 ? 60 : lv === 2 ? 100 : 150, r);
          const sols = fowlSolutions(p, q, k, N);
          if (sols.length < 2 || sols.length > 8) continue;   // a family, but a short one
          return this.q({ p, q, k, N, want: pick(['most', 'fewest'], r), ask: lv === 1 ? 'roosters' : pick(['hens', 'chicks'], r) });
        }
        return null;
      });
    },
    q({ p, q, k, N, want, ask }) {
      const sols = fowlSolutions(p, q, k, N), pickd = sols.reduce((b, s) => ((want === 'most' ? s[0] > b[0] : s[0] < b[0]) ? s : b));
      // exactly one answer, by the stated rule: no other solution has the chosen rooster count
      if (sols.filter((s) => s[0] === pickd[0]).length !== 1) throw new Error('hundred-fowls: the rule does not pin one answer');
      const idx = { roosters: 0, hens: 1, chicks: 2 }[ask];
      return { p, q, k, N, want, ask, sol: pickd,
        text: `At a farm sale a rooster costs ${p} coins, a hen ${q} coins, and chicks are sold ${k} for 1 coin. Buy exactly ${N} birds for exactly ${N} coins, with at least one of each and as ${want === 'most' ? 'many' : 'few'} roosters as possible. How many ${ask}?`,
        expr: `(()=>{let b=null;for(let r=1;r<${N};r++)for(let h=1;r+h<${N};h++){const z=${N}-r-h;if(z%${k}===0&&${p}*r+${q}*h+z/${k}===${N}&&(b===null||r${want === 'most' ? '>' : '<'}b[0]))b=[r,h,z];}return b[${idx}];})()`,
        ans: pickd[idx] };
    },
    work({ p, q, k, N, want, ask, sol }) {
      // the second route: try every rooster and hen count, as the stated rule picks
      const bf = (i) => `(()=>{let b=null;for(let r=1;r<${N};r++)for(let h=1;r+h<${N};h++){const z=${N}-r-h;if(z%${k}===0&&${p}*r+${q}*h+z/${k}===${N}&&(b===null||r${want === 'most' ? '>' : '<'}b[0]))b=[r,h,z];}return b[${i}];})()`;
      const [R, H, Z] = sol, s = [
        { t: `Multiply the coins by ${k} and take away the birds: ${k * p - 1} for each rooster and ${k * q - 1} for each hen make`, v: (k - 1) * N, x: `${k}*${N}-${N}` },
        { t: `Roosters can only change in steps of ${k * q - 1} ÷ ${gcd(k * p - 1, k * q - 1)} to keep the hens whole. Step size`, v: (k * q - 1) / gcd(k * p - 1, k * q - 1), x: `[...Array(${k}*${q}).keys()].map((i)=>i+1).find((t)=>(${k}*${p}-1)*t%(${k}*${q}-1)===0)` },
        { t: `The ${want === 'most' ? 'most' : 'fewest'} roosters on that ladder that leave at least one hen and some chicks`, v: R, x: bf(0) },
      ];
      if (ask === 'roosters') return s;
      s.push({ t: `Hens: what the roosters leave, ÷ ${k * q - 1}`, v: H, x: bf(1) });
      if (ask === 'chicks') s.push({ t: `Chicks: ${N} birds, less the roosters and hens`, v: Z, x: bf(2) });
      return s;
    },
    draw(q) { return tagsSvg(q.p, q.q, q.k); },
  },
];

/* ================================================================ stories — one per stop */

