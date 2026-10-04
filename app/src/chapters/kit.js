/* kit.js — the drawing kit every chapter uses for its questions.

   One visual language for fraction bars, pies, clocks, shapes, angles,
   charts, Venn diagrams and number lines, coloured ONLY through the .dg-*
   classes in styles/app.css so every drawing works in light and dark. A
   drawing states a fact the question needs; it never contains the answer. */

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const svg = (w, h, inner, label = 'A diagram') =>
  `<svg class="dg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
const T = (x, y, s, cls = 'dg-text', anchor = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
export const text = T;

/* A bar cut into n equal parts, the first k shaded. */
export function fracBar(n, k, w = 300, h = 44) {
  const u = w / n; let s = '';
  for (let i = 0; i < n; i++) s += `<rect x="${2 + i * u}" y="2" width="${u}" height="${h}" class="${i < k ? 'dg-fill1' : 'dg-blank'}"/>`;
  return svg(w + 4, h + 4, s, `A bar cut into ${n} equal parts, ${k} shaded`);
}
/* A circle cut into n equal slices, k shaded. */
export function pie(n, k, r = 70) {
  const c = r + 4; let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    s += n === 1 ? `<circle cx="${c}" cy="${c}" r="${r}" class="${k ? 'dg-fill1' : 'dg-blank'}"/>`
      : `<path d="M${c},${c} L${(c + r * Math.cos(a0)).toFixed(2)},${(c + r * Math.sin(a0)).toFixed(2)} A${r},${r} 0 ${large} 1 ${(c + r * Math.cos(a1)).toFixed(2)},${(c + r * Math.sin(a1)).toFixed(2)} Z" class="${i < k ? 'dg-fill1' : 'dg-blank'}"/>`;
  }
  return svg(2 * c, 2 * c, s, `A circle cut into ${n} equal slices, ${k} shaded`);
}
/* An analogue clock. Marks only — no numerals, the child reads the hands. */
export function clock(h, m, r = 80) {
  const c = r + 6; let s = `<circle cx="${c}" cy="${c}" r="${r}" class="dg-blank"/>`;
  for (let i = 0; i < 60; i++) { const a = (i / 60) * 2 * Math.PI, big = i % 5 === 0, r1 = r - (big ? 12 : 5);
    s += `<line x1="${(c + r1 * Math.sin(a)).toFixed(1)}" y1="${(c - r1 * Math.cos(a)).toFixed(1)}" x2="${(c + (r - 2) * Math.sin(a)).toFixed(1)}" y2="${(c - (r - 2) * Math.cos(a)).toFixed(1)}" class="${big ? 'dg-line' : 'dg-thin'}"/>`; }
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * 2 * Math.PI; s += T((c + (r - 24) * Math.sin(a)).toFixed(1), (c - (r - 24) * Math.cos(a) + 5).toFixed(1), i, 'dg-small'); }
  const ha = (((h % 12) + m / 60) / 12) * 2 * Math.PI, ma = (m / 60) * 2 * Math.PI;
  s += `<line x1="${c}" y1="${c}" x2="${(c + r * 0.5 * Math.sin(ha)).toFixed(1)}" y2="${(c - r * 0.5 * Math.cos(ha)).toFixed(1)}" class="dg-hand"/>`;
  s += `<line x1="${c}" y1="${c}" x2="${(c + r * 0.8 * Math.sin(ma)).toFixed(1)}" y2="${(c - r * 0.8 * Math.cos(ma)).toFixed(1)}" class="dg-hand2"/><circle cx="${c}" cy="${c}" r="4" class="dg-dot"/>`;
  return svg(2 * c, 2 * c, s, 'A clock face');
}
/* A polygon from points [[x,y],...] with optional side labels ['6 cm', ...]
   written at each side's midpoint, pushed outward from the centre. */
export function poly(pts, labels = [], fill = 'dg-fill2', pad = 30) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
  const cx = xs.reduce((a, b) => a + b, 0) / pts.length, cy = ys.reduce((a, b) => a + b, 0) / pts.length;
  let s = `<polygon points="${pts.map((p) => `${p[0] - x0},${p[1] - y0}`).join(' ')}" class="${fill}"/>`;
  labels.forEach((l, i) => {
    if (!l) return; const a = pts[i], b = pts[(i + 1) % pts.length];
    let mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
    mx += (dx / d) * 16; my += (dy / d) * 16;
    s += T(mx - x0, my - y0 + 5, l);
  });
  return svg(w, h, s, 'A shape');
}
/* A rectangle w×h (in units) drawn at scale u, labelled with its sides. */
export const rect = (w, h, unit = 'cm', u = 18) => poly([[0, 0], [w * u, 0], [w * u, h * u], [0, h * u]], [`${w} ${unit}`, `${h} ${unit}`, '', '']);
/* An angle of `deg` degrees with an arc; label optional (e.g. '?' or '40°'). */
export function angle(deg, label = '', r = 100) {
  // drawn round a centre with room on every side, so a wide or reflex angle
  // is never clipped by the box
  const a = (deg * Math.PI) / 180, ox = r + 24, oy = r + 24, S = 2 * r + 48;
  const x2 = ox + r * Math.cos(-a), y2 = oy + r * Math.sin(-a), ar = 34;
  const large = deg > 180 ? 1 : 0;
  let s = `<line x1="${ox}" y1="${oy}" x2="${ox + r}" y2="${oy}" class="dg-line"/><line x1="${ox}" y1="${oy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="dg-line"/>`;
  s += `<path d="M${ox + ar},${oy} A${ar},${ar} 0 ${large} 0 ${(ox + ar * Math.cos(-a)).toFixed(1)},${(oy + ar * Math.sin(-a)).toFixed(1)}" class="dg-arc"/>`;
  if (label) s += T((ox + (ar + 18) * Math.cos(-a / 2)).toFixed(1), (oy + (ar + 18) * Math.sin(-a / 2) + 5).toFixed(1), label, 'dg-accent');
  return svg(S, S, s, `An angle${label ? ' marked ' + label : ''}`);
}
/* Vertical bar chart: labels[], values[], a scale step. */
export function barChart(labels, values, step = 1, title = '') {
  const max = Math.ceil(Math.max(...values) / step) * step || step, H = 150, bw = 36, gap = 18, x0 = 40, y0 = 20;
  const W = x0 + labels.length * (bw + gap) + 10; let s = '';
  for (let v = 0; v <= max; v += step) { const y = y0 + H - (v / max) * H; s += `<line x1="${x0}" y1="${y}" x2="${W - 6}" y2="${y}" class="dg-grid"/>` + T(x0 - 6, y + 4, v, 'dg-small', 'end'); }
  labels.forEach((l, i) => { const h = (values[i] / max) * H, x = x0 + 8 + i * (bw + gap);
    s += `<rect x="${x}" y="${y0 + H - h}" width="${bw}" height="${h}" rx="3" class="dg-fill${(i % 3) + 1}"/>` + T(x + bw / 2, y0 + H + 16, l, 'dg-small'); });
  if (title) s += T(W / 2, 12, title, 'dg-small');
  return svg(W, y0 + H + 26, s, title || 'A bar chart');
}
/* Where each bar of barChart() can be tapped (widgets.js 'chart'): its whole column, label included,
   measured from the same layout so a tap on a bar is always that bar. */
export function barHits(labels) {
  const H = 150, bw = 36, gap = 18, x0 = 40, y0 = 20, W = x0 + labels.length * (bw + gap) + 10;
  return { w: W, h: y0 + H + 26, hits: labels.map((l, i) => ({ label: l, x: x0 + 8 + i * (bw + gap) - gap / 2, y: y0, w: bw + gap, h: H + 26 })) };
}
/* Pictogram rows: labels[], counts[], each symbol worth `per`. Half symbols allowed. */
/* rowH spaces the rows out (a row you tap needs room — pictoHits), and cols is how many symbols wide. */
export function pictogram(labels, counts, per = 2, sym = '●', rowH = 30, cols = 12) {
  let s = '', y = 26;
  labels.forEach((l, i) => { s += T(8, y, l, 'dg-text', 'start'); const full = Math.floor(counts[i] / per), half = counts[i] % per ? 1 : 0;
    for (let j = 0; j < full + half; j++) s += `<text x="${100 + j * 26}" y="${y}" class="dg-sym${j === full ? ' half' : ''}">${sym}</text>`; y += rowH; });
  s += T(8, y + 6, `${sym} = ${per}`, 'dg-small', 'start');
  return svg(100 + cols * 26, y + 16, s, 'A pictogram');
}
/* Where each row of pictogram() can be tapped: the whole row, its name included. */
export function pictoHits(labels, rowH = 30, cols = 12) {
  return { w: 100 + cols * 26, h: 26 + labels.length * rowH + 16, hits: labels.map((l, i) => { const top = 26 + i * rowH - rowH * 0.7, y = Math.max(0, top); return { label: l, x: 0, y, w: 100 + cols * 26, h: rowH - (y - top) }; }) };
}
/* A two-set Venn diagram with counts in each region (use '' to leave blank, '?' to ask). */
export function venn(la, lb, onlyA, both, onlyB, outside = null) {
  let s = `<rect x="4" y="4" width="352" height="200" rx="10" class="dg-blank"/>`;
  s += `<circle cx="135" cy="110" r="78" class="dg-seta"/><circle cx="225" cy="110" r="78" class="dg-setb"/>`;
  s += T(95, 30, la, 'dg-text') + T(265, 30, lb, 'dg-text');
  s += T(105, 116, onlyA, 'dg-big') + T(180, 116, both, 'dg-big') + T(255, 116, onlyB, 'dg-big');
  if (outside !== null) s += T(330, 190, outside, 'dg-big');
  return svg(360, 208, s, 'A Venn diagram');
}
/* A number line from a to b with ticks every `step`; marks: {value: label}. */
export function numberLine(a, b, step, marks = {}) {
  const W = 360, x = (v) => 20 + ((v - a) / (b - a)) * (W - 40); let s = `<line x1="14" y1="40" x2="${W - 14}" y2="40" class="dg-line"/>`;
  for (let v = a; v <= b + 1e-9; v += step) s += `<line x1="${x(v)}" y1="33" x2="${x(v)}" y2="47" class="dg-line"/>` + T(x(v), 66, +v.toFixed(4), 'dg-small');
  for (const [v, l] of Object.entries(marks)) s += `<circle cx="${x(+v)}" cy="40" r="6" class="dg-dot"/>` + T(x(+v), 24, l, 'dg-accent');
  return svg(W, 76, s, 'A number line');
}
/* A grid of cols×rows unit squares; shaded: Set of "r,c". */
export function grid(cols, rows, shaded = new Set(), u = 24) {
  let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<rect x="${2 + c * u}" y="${2 + r * u}" width="${u}" height="${u}" class="${shaded.has(r + ',' + c) ? 'dg-fill1' : 'dg-blank'}"/>`;
  return svg(cols * u + 4, rows * u + 4, s, `A ${cols} by ${rows} grid`);
}
/* Coordinate grid 0..n with points {label: [x,y]}. */
export function coords(n, points = {}, u = 26) {
  const P = (x, y) => [30 + x * u, 10 + (n - y) * u]; let s = '';
  for (let i = 0; i <= n; i++) { const [xa, ya] = P(i, 0), [xb, yb] = P(0, i);
    s += `<line x1="${xa}" y1="${P(0, 0)[1]}" x2="${xa}" y2="${P(0, n)[1]}" class="dg-grid"/><line x1="${P(0, 0)[0]}" y1="${yb}" x2="${P(n, 0)[0]}" y2="${yb}" class="dg-grid"/>`;
    s += T(xa, ya + 16, i, 'dg-small') + T(xb - 12, yb + 4, i, 'dg-small', 'end'); }
  s += `<line x1="${P(0, 0)[0]}" y1="${P(0, 0)[1]}" x2="${P(n, 0)[0]}" y2="${P(0, 0)[1]}" class="dg-line"/><line x1="${P(0, 0)[0]}" y1="${P(0, 0)[1]}" x2="${P(0, 0)[0]}" y2="${P(0, n)[1]}" class="dg-line"/>`;
  for (const [l, [x, y]] of Object.entries(points)) { const [px, py] = P(x, y); s += `<circle cx="${px}" cy="${py}" r="6" class="dg-dot"/>` + T(px + 12, py - 8, l, 'dg-accent', 'start'); }
  return svg(P(n, 0)[0] + 20, P(0, 0)[1] + 24, s, 'A coordinate grid');
}
/* Dots in a square (or rows×cols array) — for square numbers and arrays. */
export function dots(rows, cols, hi = null, u = 16) {
  let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<circle cx="${10 + c * u}" cy="${10 + r * u}" r="5.5" class="${hi && hi(r, c) ? 'dg-dot' : 'dg-dot2'}"/>`;
  return svg(cols * u + 4, rows * u + 4, s, `${rows} rows of ${cols} dots`);
}
/* A cuboid w×h×d drawn in cabinet projection, labelled. */
export function cuboid(w, h, d, unit = 'cm', u = 22) {
  const dx = d * u * 0.5, dy = d * u * 0.35, W = w * u, H = h * u, ox = 20, oy = 20 + dy;
  const f = [[ox, oy], [ox + W, oy], [ox + W, oy + H], [ox, oy + H]];
  let s = `<polygon points="${f.map((p) => p.join(',')).join(' ')}" class="dg-fill2"/>`;
  s += `<polygon points="${ox},${oy} ${ox + dx},${oy - dy} ${ox + W + dx},${oy - dy} ${ox + W},${oy}" class="dg-fill1"/>`;
  s += `<polygon points="${ox + W},${oy} ${ox + W + dx},${oy - dy} ${ox + W + dx},${oy + H - dy} ${ox + W},${oy + H}" class="dg-fill3"/>`;
  s += T(ox + W / 2, oy + H + 18, `${w} ${unit}`) + T(ox - 8, oy + H / 2 + 4, `${h} ${unit}`, 'dg-text', 'end') + T(ox + W + dx / 2 + 14, oy + H - dy / 2 + 8, `${d} ${unit}`, 'dg-text', 'start');
  return svg(ox + W + dx + 70, oy + H + 28, s, 'A cuboid');
}
