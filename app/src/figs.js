/* figs.js — the pictures that show WHY a trick works.

   Three kinds, each drawn from the chapter's own worked example, so the
   picture and the numbers on the page can never disagree:
     jumps — a number line with the trick's hops (make ten, count up, round)
     area  — a rectangle cut where the trick cuts it (split, ×12, squares)
     grid  — the four boxes of two-digit multiplication (vertically and
             crosswise), with the crosswise pair marked */

const W = 560;

export function fig(spec) {
  if (!spec) return '';
  if (spec.kind === 'jumps') return jumps(spec);
  if (spec.kind === 'area') return area(spec);
  if (spec.kind === 'grid') return grid(spec);
  return '';
}

function jumps({ from, jumps: js }) {
  const pts = [from]; for (const j of js) pts.push(pts.at(-1) + j);
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const pad = Math.max(1, Math.round((hi - lo) * 0.12));
  const a = lo - pad, b = hi + pad, X = (v) => 30 + ((v - a) / (b - a)) * (W - 60);
  const y = 120;
  let s = `<line x1="20" y1="${y}" x2="${W - 20}" y2="${y}" class="fg-axis"/>`;
  const step = (b - a) > 60 ? 10 : (b - a) > 24 ? 5 : 1;
  for (let v = Math.ceil(a / step) * step; v <= b; v += step) {
    const big = v % 10 === 0;
    s += `<line x1="${X(v)}" y1="${y - (big ? 9 : 5)}" x2="${X(v)}" y2="${y + (big ? 9 : 5)}" class="fg-tick${big ? ' big' : ''}"/>`;
    if (big) s += `<text x="${X(v)}" y="${y + 28}" class="fg-num">${v}</text>`;
  }
  pts.forEach((v, i) => {
    s += `<circle cx="${X(v)}" cy="${y}" r="6" class="fg-pt${i === 0 ? ' start' : i === pts.length - 1 ? ' end' : ''}"/>`;
    if (v % 10 !== 0 || i === 0 || i === pts.length - 1) s += `<text x="${X(v)}" y="${y + 28}" class="fg-num strong">${v}</text>`;
  });
  js.forEach((j, i) => {
    const x1 = X(pts[i]), x2 = X(pts[i + 1]), mid = (x1 + x2) / 2, h = Math.min(70, 26 + Math.abs(x2 - x1) * 0.35);
    const up = j > 0;
    s += `<path d="M${x1},${y - 8} Q${mid},${y - 8 - h * (up ? 1 : 0.7)} ${x2},${y - 8}" class="fg-hop${up ? '' : ' back'}" marker-end="url(#fg-arr)"/>`;
    s += `<text x="${mid}" y="${y - 14 - h * (up ? 0.55 : 0.4)}" class="fg-lab">${up ? '+' : '−'}${Math.abs(j)}</text>`;
  });
  return svg(s, 170);
}

function area({ h, parts, vparts }) {
  const total = parts.reduce((x, y) => x + y, 0);
  const H = 190, maxW = W - 80;
  const sx = maxW / total;
  const hh = vparts ? H : Math.min(H, Math.max(60, h * sx * 0.9));
  const sy = vparts ? H / vparts.reduce((x, y) => x + y, 0) : hh / h;
  let s = '', x = 50;
  const colours = ['fg-a1', 'fg-a2', 'fg-a3', 'fg-a4'];
  const rows = vparts || [h];
  let yy = 20;
  rows.forEach((rv, ri) => {
    x = 50;
    parts.forEach((p, pi) => {
      const w = p * sx, hgt = rv * sy;
      s += `<rect x="${x}" y="${yy}" width="${w}" height="${hgt}" class="${colours[(ri * 2 + pi) % 4]}" rx="3"/>`;
      if (w > 30 && hgt > 22) s += `<text x="${x + w / 2}" y="${yy + hgt / 2 + 5}" class="fg-in">${rv} × ${p}</text>`;
      if (ri === 0) s += `<text x="${x + w / 2}" y="${yy - 6}" class="fg-num">${p}</text>`;
      x += w;
    });
    s += `<text x="40" y="${yy + (rv * sy) / 2 + 5}" class="fg-num" text-anchor="end">${rv}</text>`;
    yy += rv * sy;
  });
  return svg(s, yy + 16);
}

function grid({ a, b }) {
  const [p, q] = [Math.floor(a / 10), a % 10], [r, t] = [Math.floor(b / 10), b % 10];
  const x0 = 170, y0 = 34, c = 92;
  let s = `<text x="${x0 + c / 2}" y="${y0 - 10}" class="fg-num">${p}0</text><text x="${x0 + c * 1.5}" y="${y0 - 10}" class="fg-num">${q}</text>`;
  s += `<text x="${x0 - 12}" y="${y0 + c / 2 + 5}" class="fg-num" text-anchor="end">${r}0</text><text x="${x0 - 12}" y="${y0 + c * 1.5 + 5}" class="fg-num" text-anchor="end">${t}</text>`;
  const cells = [
    [0, 0, `${p * r}00`, 'fg-a1', 'tens × tens'],
    [1, 0, `${q * r}0`, 'fg-a3', 'crosswise'],
    [0, 1, `${p * t}0`, 'fg-a3', 'crosswise'],
    [1, 1, `${q * t}`, 'fg-a2', 'units × units'],
  ];
  for (const [cx, cy, v, k] of cells) {
    s += `<rect x="${x0 + cx * c}" y="${y0 + cy * c}" width="${c - 4}" height="${c - 4}" rx="6" class="${k}"/>`;
    s += `<text x="${x0 + cx * c + c / 2 - 2}" y="${y0 + cy * c + c / 2 + 4}" class="fg-in">${v}</text>`;
  }
  s += `<text x="${x0 + c * 2 + 16}" y="${y0 + c + 2}" class="fg-note">the two amber boxes</text><text x="${x0 + c * 2 + 16}" y="${y0 + c + 20}" class="fg-note">are the crosswise step</text>`;
  return svg(s, y0 + c * 2 + 12);
}

function svg(inner, h) {
  return `<svg class="fig" viewBox="0 0 ${W} ${h}" role="img" aria-label="A picture of the trick">
    <defs><marker id="fg-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fg-arrhead"/></marker></defs>
    ${inner}</svg>`;
}
