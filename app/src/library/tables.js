/* tables.js — the Times Table Explorer (docs/LIBRARY-CONTRACT.md).

   The parent's spec: the table STARTS at 5 × 5; when that is mastered it grows
   to 10 × 10, then 15 × 15, then 20 × 20. And a Squares Trainer lives inside it.

   The facts are the app's own records — key `${a}×${b}` with a ≤ b — so 7 × 8
   practised here counts on the Facts screen, in the Goals and everywhere else.

   Mastery rule (said on screen in these words): a table is yours when at least
   9 in every 10 of its facts are "quick" or "fluent" — right, and fast, the last
   time you met them. Integer arithmetic (good × 10 ≥ total × 9), so 90% passes
   and 89.9% does not. The level only ever moves one step, and only on facts the
   child has actually answered: an 11–14 child starts at 5 × 5 too, but one run
   of it (all fifteen facts) is enough to show it and open the 10 × 10. */
import * as F from '../facts.js';

export const TOOL = {
  id: 'tables', name: 'Times Table Explorer', art: 'lib-tables',
  blurb: 'Start with the 5 × 5 square, master it, and watch it grow to 20 × 20 — with a squares trainer inside.',
};

export const LEVELS = [5, 10, 15, 20];
export const PASS_TENTHS = 9;                 // 9 in every 10
const RUN = 20;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mul = (a, b) => ({ op: '×', a: Math.min(a, b), b: Math.max(a, b) });

/* ---------- the maths ---------- */

/* Every fact of an n × n table, once each (a ≤ b). */
export function levelFacts(n) {
  const out = [];
  for (let a = 1; a <= n; a++) for (let b = a; b <= n; b++) out.push({ op: '×', a, b });
  return out;
}
/* The facts that count: times one is left out. "1 × 13" shows its own
   answer in the question, so a drill of it records nothing, and a rule is not a
   fact to learn — the 1s row is free, and the screen says so. */
export const poolFacts = (n) => levelFacts(n).filter((f) => f.a >= 2);
export const meets = (good, total) => total > 0 && good * 10 >= total * PASS_TENTHS;
export const needFor = (total) => Math.ceil((total * PASS_TENTHS) / 10);
const GOOD = new Set(['quick', 'fluent']);

export function tallyLevel(facts, n) {
  const t = { new: 0, learning: 0, quick: 0, fluent: 0, trap: 0, total: 0 };
  for (const f of poolFacts(n)) { t[F.state(facts[F.key(f)])]++; t.total++; }
  t.good = t.quick + t.fluent;
  t.need = needFor(t.total);
  t.mastered = meets(t.good, t.total);
  return t;
}
export function tallySquares(facts, n) {
  let good = 0;
  for (let a = 2; a <= n; a++) if (GOOD.has(F.state(facts[F.key({ op: '²', a, b: 2 })]))) good++;
  return { good, total: n - 1 };
}

/* facts.js tricky() only knows factors up to 12. Beyond it: 13, 17 and 19
   have nothing to lean on, 14, 16 and 18 are doubles of friendlier tables,
   15 is ten-and-a-half, 20 is double-then-ten. */
const H = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 2.4, 5: 1.2, 6: 3.4, 7: 4, 8: 3.8, 9: 2.6, 10: 0.3, 11: 1.6, 12: 3.2,
  13: 4.3, 14: 3.5, 15: 2.2, 16: 3.7, 17: 4.7, 18: 3.9, 19: 4.5, 20: 1.1 };
export function trickyX(f) {
  const lo = Math.min(f.a, f.b), hi = Math.max(f.a, f.b);
  if (hi <= 12) return F.tricky({ op: '×', a: lo, b: hi });
  if (lo <= 1) return 0.2 + hi * 0.01;
  if (lo === 10) return 0.7 + hi * 0.01;                   // shift one place
  if (lo === hi) return +((H[lo] * 2 + 0.8) * 0.78).toFixed(3);
  if (hi === 20) return +(1 + H[lo] * 0.5).toFixed(3);     // times two, then times ten
  return +(H[lo] + H[hi] + 0.8).toFixed(3);                // big answers carry one more step
}

/* The chip. Never contains the answer (selftest checks every fact to 20). */
export function whyX(f) {
  const lo = Math.min(f.a, f.b), hi = Math.max(f.a, f.b);
  if (hi <= 12) return F.why({ op: '×', a: lo, b: hi });
  if (lo === 1) return 'times one changes nothing';
  if (lo === hi) return 'a square — worth knowing by heart';
  if (lo === 10) return 'times ten: shift one place';
  if (hi === 20) return 'times twenty: double it, then times ten';
  if (lo === 2) return 'times two is doubling';
  if (lo === 5) return 'times five is half of times ten';
  if (lo === 11) return 'times eleven: times ten, plus one more lot';
  if (hi === 15 && lo <= 12) return 'times fifteen: times ten, plus half of that again';
  if (lo === 9) return 'times nine: times ten, take one lot away';
  if (lo === 4) return 'times four: double, then double again';
  return `split ${hi} into 10 + ${hi - 10}: two friendlier facts`;
}

export function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/* Pattern lenses: which cells light up. */
export const LENSES = [
  { id: 'mult', name: 'Multiples of…', say: (n) => `Every multiple of ${n} lights up. Look: they make stripes, one in every ${n} squares along a row.` },
  { id: 'sq', name: 'Square numbers', say: () => 'A number times itself sits on the diagonal — a line of squares from corner to corner.' },
  { id: 'nine', name: 'The 9s pattern', say: () => 'In the 9s, the tens digit goes up by one while the ones digit goes down by one — and up to 9 × 10 the digits add up to 9.' },
  { id: 'odd', name: 'Odd and even', say: () => 'Odd answers light up. They only happen where an odd row meets an odd column — any even number in a times fact makes the answer even.' },
  { id: 'prime', name: 'Primes never appear inside', say: () => 'Prime numbers light up — and they are only ever in the 1s row and column. Inside the table every answer has two factors bigger than 1, so it can never be prime.' },
  { id: 'sym', name: 'It’s symmetric', say: (n, c) => `${c.a} × ${c.b} and ${c.b} × ${c.a} are mirror images across the diagonal — the same answer, so the same fact to learn.` },
];
export function inLens(lens, a, b, arg = {}) {
  const p = a * b;
  switch (lens) {
    case 'mult': return p % (arg.n || 3) === 0;
    case 'sq': return a === b;
    case 'nine': return a === 9 || b === 9;
    case 'odd': return p % 2 === 1;
    case 'prime': return isPrime(p);
    case 'sym': { const c = arg.cur || { a: 7, b: 8 }; return (a === c.a && b === c.b) || (a === c.b && b === c.a); }
  }
  return false;
}

/* (10 + b)² = 100 + 20b + b² — the teen-square picture's three parts. */
export function sqSplit(n) {
  const b = n - 10;
  return { b, hundred: 100, strips: 20 * b, corner: b * b, total: 100 + 20 * b + b * b };
}

/* ---------- building runs ---------- */

function shuffle(a, r) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
function spread(list) {
  // no fact twice in a row: take the next one that differs; if only a twin of
  // the last is left, tuck it in earlier between two different facts
  const rest = list.slice(), out = [];
  while (rest.length) {
    const j = rest.findIndex((g) => !out.length || F.key(g) !== F.key(out.at(-1)));
    if (j >= 0) { out.push(rest.splice(j, 1)[0]); continue; }
    const g = rest.shift(), k = F.key(g);
    const pos = out.findIndex((h, i) => F.key(h) !== k && (i === 0 || F.key(out[i - 1]) !== k));
    out.splice(pos < 0 ? 0 : pos, 0, g);
  }
  return out;
}
function mulItem(f, r) {
  const flip = f.a !== f.b && r() < 0.4;
  const x = flip ? f.b : f.a, y = flip ? f.a : f.b;
  return { text: `${x} × ${y}`, ans: f.a * f.b, expr: `${x}*${y}`, fact: { op: '×', a: f.a, b: f.b }, why: whyX(f) };
}

/* Twenty: traps first (up to 8), then facts not yet met (easiest first, up to
   10), then known facts trickiest-first; a small table is filled with repeats
   of its hardest unknowns. Ordered trickiest-last, with a little jitter. */
export function practiseItems(facts, n, r = Math.random) {
  const pool = poolFacts(n);
  const st = (f) => F.state(facts[F.key(f)]);
  const traps = shuffle(pool.filter((f) => st(f) === 'trap'), r).slice(0, 8);
  const unmet = pool.filter((f) => st(f) === 'new' || st(f) === 'learning').sort((x, y) => trickyX(x) - trickyX(y));
  const known = shuffle(pool.filter((f) => GOOD.has(st(f))), r).sort((x, y) => trickyX(y) - trickyX(x));
  const out = []; const used = new Set();
  const take = (f) => { if (out.length < RUN && !used.has(F.key(f))) { used.add(F.key(f)); out.push(f); } };
  traps.forEach(take);
  unmet.slice(0, 10).forEach(take);
  known.forEach(take);
  unmet.forEach(take);
  // a table smaller than twenty facts: repeat the hardest not-yet-good ones
  const again = [...traps, ...unmet.slice().reverse(), ...pool.slice().sort((x, y) => trickyX(y) - trickyX(x))];
  for (let i = 0; out.length < RUN && again.length; i++) out.push(again[i % again.length]);
  const ordered = out.map((f) => ({ f, s: trickyX(f) + r() * 0.8 })).sort((x, y) => x.s - y.s).map((x) => x.f);
  return spread(ordered).map((f) => mulItem(f, r));
}

/* Ten, spread evenly along the table's ramp — a snapshot, not a lesson. */
export function checkItems(n, r = Math.random) {
  const pool = poolFacts(n).sort((x, y) => trickyX(x) - trickyX(y));
  const out = []; const used = new Set();
  for (let i = 0; i < 10; i++) {
    let j = Math.min(pool.length - 1, Math.floor(((i + r()) / 10) * pool.length));
    while (used.has(j)) j = (j + 1) % pool.length;
    used.add(j); out.push(pool[j]);
  }
  return out.map((f) => mulItem(f, r));
}

export function squareItems(facts, n, r = Math.random) {
  const list = [];
  for (let a = 2; a <= n; a++) list.push({ op: '²', a, b: 2 });   // 1² would show its answer
  const trap = (f) => (F.state(facts[F.key(f)]) === 'trap' ? 1 : 0);
  return list.map((f) => ({ f, s: F.tricky(f) + trap(f) + r() * 0.6 })).sort((x, y) => x.s - y.s)
    .map(({ f }) => ({ text: `${f.a}²`, ans: f.a * f.a, expr: `${f.a}*${f.a}`, fact: { op: '²', a: f.a, b: 2 }, why: F.why(f) }));
}

/* ---------- the record ---------- */

function data(ctx) {
  const d = ctx.data;
  if (!LEVELS.includes(d.level)) d.level = 5;
  d.levels = d.levels || {};
  d.sq = d.sq || { runs: 0, best: 0 };
  return d;
}
const facts = (ctx) => ctx.kid.facts || (ctx.kid.facts = {});
const nextLevel = (n) => LEVELS[LEVELS.indexOf(n) + 1] || null;
const showSize = (ctx) => { const d = data(ctx); const s = +ctx.ui.size; return LEVELS.includes(s) && s <= d.level ? s : d.level; };

/* Open the next table if — and only if — this one is mastered. One step. */
export function grow(ctx) {
  const d = data(ctx), L = d.level, nx = nextLevel(L);
  const t = tallyLevel(facts(ctx), L);
  if (!nx || !t.mastered) return false;
  const lv = d.levels[L] || (d.levels[L] = { runs: 0, best: 0 });
  lv.mastered = lv.mastered || Date.now();
  d.level = nx; ctx.ui.size = nx;
  ctx.save();
  ctx.confetti(90); ctx.sfx.level();
  ctx.toast(`The ${nx} × ${nx} table is open!`);
  return nx;
}

/* ---------- view ---------- */

const STATES = ['new', 'learning', 'quick', 'fluent', 'trap'];
const tab = (ctx) => (['explore', 'practise', 'squares'].includes(ctx.ui.tab) ? ctx.ui.tab : 'explore');

function ladder(ctx) {
  const d = data(ctx), L = d.level, t = tallyLevel(facts(ctx), L), nx = nextLevel(L);
  const pct = Math.round((t.good / t.total) * 100);
  const steps = LEVELS.map((n) => {
    const cls = n < L ? 'done' : n === L ? 'now' : 'locked';
    return `<li class="t-tables-step ${cls}"><b class="mono">${n} × ${n}</b><span>${cls === 'done' ? 'Mastered' : cls === 'now' ? 'Now' : 'Locked'}</span></li>`;
  }).join('<li class="t-tables-arrow" aria-hidden="true">→</li>');
  const young = ctx.band === '11-14' && L === 5 && !t.mastered;
  return `<div class="card t-tables-head">
    <ol class="t-tables-ladder" aria-label="Your tables">${steps}</ol>
    <div class="t-tables-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t.total}" aria-valuenow="${t.good}" aria-label="Facts quick or fluent"><i style="width:${pct}%"></i><em style="left:90%" aria-hidden="true"></em></div>
    <p class="t-tables-count"><b>${t.good} of ${t.total}</b> facts in your ${L} × ${L} are quick or fluent.
      ${t.mastered ? (nx ? '<b>That is enough to grow!</b>' : '<b>The whole 20 × 20 is yours.</b>') : nx ? `${t.need} opens the ${nx} × ${nx}.` : `${t.need} masters it.`}</p>
    <p class="muted small">The rule: a table is yours when at least 9 in every 10 of its facts are <i>quick</i> or <i>fluent</i> — right, and fast, the last time you met them. The 1s are free — times one changes nothing — so they are not counted.</p>
    ${young ? '<p class="small">You probably know these already. One practice run covers all ten that count — show them, and the 10 × 10 opens straight away.</p>' : ''}
    ${t.mastered && nx ? `<button class="btn primary big" data-act="lib" data-arg="grow">Grow my table to ${nx} × ${nx}</button>` : ''}
  </div>`;
}

function dots(rows, cols, max = 260) {
  const u = Math.min(22, Math.floor(max / Math.max(rows, cols)));
  const w = cols * u, h = rows * u;
  let c = '';
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) c += `<circle cx="${j * u + u / 2}" cy="${i * u + u / 2}" r="${u * 0.34}"/>`;
  return `<svg class="t-tables-dots" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${rows} rows of ${cols} dots">${c}</svg>`;
}
/* A rectangle of area a × b; the longer side is split at 10 when it is over 10. */
function area(a, b) {
  const rows = Math.min(a, b), cols = Math.max(a, b), u = Math.min(16, Math.floor(300 / cols));
  const w = cols * u, h = rows * u;
  let g = '';
  for (let i = 1; i < cols; i++) g += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${h}"/>`;
  for (let i = 1; i < rows; i++) g += `<line x1="0" y1="${i * u}" x2="${w}" y2="${i * u}"/>`;
  const split = cols > 10 ? `<rect class="t-tables-part2" x="${10 * u}" y="0" width="${(cols - 10) * u}" height="${h}"/><line class="t-tables-cut" x1="${10 * u}" y1="-4" x2="${10 * u}" y2="${h + 4}"/>` : '';
  const labels = cols > 10
    ? `<text x="${5 * u}" y="${h + 16}">${rows} × 10 = ${rows * 10}</text><text x="${10 * u + ((cols - 10) * u) / 2}" y="${h + 16}">${rows} × ${cols - 10} = ${rows * (cols - 10)}</text>`
    : `<text x="${w / 2}" y="${h + 16}">${rows} by ${cols}</text>`;
  return `<svg class="t-tables-area" viewBox="-2 -6 ${w + 4} ${h + 26}" width="${w + 4}" height="${h + 26}" role="img" aria-label="a rectangle ${rows} by ${cols}"><rect class="t-tables-part1" x="0" y="0" width="${w}" height="${h}"/>${split}<g class="t-tables-lines">${g}</g>${labels}</svg>`;
}

function explain(ctx, c) {
  const f = mul(c.a, c.b), p = c.a * c.b, st = F.state(facts(ctx)[F.key(f)]);
  const pic = c.a <= 12 && c.b <= 12 ? dots(c.a, c.b) : area(c.a, c.b);
  return `<div class="t-tables-explain" aria-live="polite">
    <div class="t-tables-pic">${pic}</div>
    <div>
      <p class="t-tables-sum mono"><b>${c.a} × ${c.b} = ${p}</b></p>
      <p class="small">${c.a} rows of ${c.b}${c.a !== c.b ? ` — and turned round it is ${c.b} rows of ${c.a}: the same ${p}, the same fact` : ''}.</p>
      <p><span class="why-chip">${esc(whyX(f))}</span></p>
      <p class="small"><i class="t-tables-lg t-tables-${st}"></i> ${F.STATE_LABEL[st]}</p>
    </div>
  </div>`;
}

function viewExplore(ctx) {
  const d = data(ctx), n = showSize(ctx), ui = ctx.ui, fx = facts(ctx);
  const lens = LENSES.find((l) => l.id === ui.lens) || null;
  const mn = Math.min(Math.max(2, +ui.mult || 3), n);
  const cur = ui.cur && ui.cur.a <= n && ui.cur.b <= n ? ui.cur : null;
  const symCur = cur && cur.a !== cur.b ? cur : n >= 8 ? { a: 7, b: 8 } : { a: 3, b: 4 };
  const arg = { n: mn, cur: symCur };
  const sizes = LEVELS.filter((s) => s <= d.level);
  let cells = `<div class="t-tables-h t-tables-corner">×</div>`;
  for (let b = 1; b <= n; b++) cells += `<div class="t-tables-h${cur && cur.b === b ? ' on' : ''}">${b}</div>`;
  for (let a = 1; a <= n; a++) {
    cells += `<div class="t-tables-h${cur && cur.a === a ? ' on' : ''}">${a}</div>`;
    for (let b = 1; b <= n; b++) {
      const p = a * b, st = F.state(fx[F.key(mul(a, b))]);
      const cls = [`t-tables-c`, `t-tables-${st}`];
      if (lens) cls.push(inLens(lens.id, a, b, arg) ? 't-tables-hit' : 't-tables-dim');
      if (a === 1 || b === 1) cls.push('t-tables-free');
      if (cur && (cur.a === a || cur.b === b)) cls.push('t-tables-rc');
      if (cur && cur.a === a && cur.b === b) cls.push('t-tables-sel');
      cells += `<button class="${cls.join(' ')}" data-act="lib" data-arg="cell|${a}|${b}" data-a="${a}" data-b="${b}" aria-label="${a} times ${b} is ${p}, ${F.STATE_LABEL[st]}">${p}</button>`;
    }
  }
  const t = tallyLevel(fx, n);
  return `<div class="card">
    <p class="t-tables-purpose"><b>Explore</b> is for looking: tap a square to see its fact as a picture, and switch on a pattern to see why the table is not as big as it looks.</p>
    ${sizes.length > 1 ? `<div class="seg" role="group" aria-label="Table size">${sizes.map((s) => `<button class="${s === n ? 'on' : ''}" aria-pressed="${s === n}" data-act="lib" data-arg="size|${s}">${s} × ${s}</button>`).join('')}</div>` : ''}
    <div class="t-tables-lenses" role="group" aria-label="Pattern lenses (keys 1 to 6; 0 turns them off)">
      ${LENSES.map((l, i) => `<button class="${lens === l ? 'on' : ''}" aria-pressed="${lens === l}" data-act="lib" data-arg="lens|${l.id}"><b class="t-tables-k">${i + 1}</b> ${l.name}</button>`).join('')}
    </div>
    ${lens && lens.id === 'mult' ? `<div class="row gap t-tables-mult"><span>Multiples of</span><button class="btn small" data-act="lib" data-arg="mult|${mn - 1}" aria-label="smaller" ${mn <= 2 ? 'disabled' : ''}>−</button><b class="mono">${mn}</b><button class="btn small" data-act="lib" data-arg="mult|${mn + 1}" aria-label="bigger" ${mn >= n ? 'disabled' : ''}>+</button></div>` : ''}
    ${lens ? `<p class="t-tables-lensay">${esc(lens.say(mn, symCur))}</p>` : ''}
    <div class="t-tables-gwrap t-tables-w${n}"><div class="t-tables-grid t-tables-g${n}" role="grid" aria-label="${n} by ${n} times table" style="--n:${n + 1}">${cells}</div></div>
    <p class="t-tables-legend">${STATES.map((s) => `<span><i class="t-tables-lg t-tables-${s}"></i>${F.STATE_LABEL[s]} <b>${t[s]}</b></span>`).join('')}<span><i class="t-tables-lg t-tables-freelg"></i>Times one: free</span></p>
    ${cur ? explain(ctx, cur) : '<p class="muted small">Tap a square — or use the arrow keys and press Enter — to see the fact as a picture. Keys 1–6 switch on a pattern.</p>'}
  </div>`;
}

function viewPractise(ctx) {
  const d = data(ctx), L = d.level, fx = facts(ctx), t = tallyLevel(fx, L), lv = d.levels[L];
  return `<div class="card">
    <p class="t-tables-purpose"><b>Practise</b> is for learning: twenty facts from your ${L} × ${L}, picked for you — your traps first, then facts you have not met, the trickiest last.</p>
    <div class="row gap wrap">
      <button class="btn primary big" data-act="lib" data-arg="practise">Start twenty</button>
      ${t.trap ? `<button class="btn big" data-act="lib" data-arg="traps">Just my traps (${t.trap})</button>` : ''}
    </div>
    <div class="t-tables-tiles">${['fluent', 'quick', 'learning', 'trap', 'new'].map((s) => `<div class="t-tables-tile t-tables-${s}"><b>${t[s]}</b><span>${F.STATE_LABEL[s]}</span></div>`).join('')}</div>
    <p class="muted small">Quick means right and fast last time. Fluent means still quick after a week. ${lv && lv.runs ? `You have practised this table ${lv.runs} time${lv.runs > 1 ? 's' : ''}.` : ''}</p>
  </div>
  <div class="card t-tables-parent">
    <p class="kicker">For a grown-up</p>
    <p><b>Quick check</b> is ten mixed facts from the ${L} × ${L}, spread from easy to hard — a two-minute snapshot of where things are. It counts like any practice.</p>
    <button class="btn" data-act="lib" data-arg="check">Quick check (10)</button>
    ${lv && lv.check ? `<p class="small muted">Last quick check: ${lv.check.right} of ${lv.check.n}.</p>` : ''}
  </div>`;
}

const SQ_STOPS = [['teen-squares', 'Every square to 20'], ['odd-staircase', 'The odd-number staircase'], ['square-five', 'Squaring numbers that end in 5']];

function staircase(n, sel) {
  const u = Math.max(3, Math.floor(620 / ((n * (n + 1)) / 2 + n)));
  let x = 0, g = '';
  const H = n * u;
  for (let k = 1; k <= n; k++) {
    const s = k * u;
    g += `<g class="${k === sel ? 't-tables-on' : ''}"><rect x="${x}" y="${H - s}" width="${s}" height="${s}" fill="url(#t-tables-dotp)" class="t-tables-sqr"/>`
      + (k > 1 ? `<path class="t-tables-gnomon" d="M${x + s - u} ${H - s}h${u}v${s}h${-s}v${-u}h${s - u}z"/>` : '') + '</g>';
    x += s + u;
  }
  return `<svg class="t-tables-stairs" viewBox="0 -2 ${x} ${H + 4}" role="img" aria-label="A staircase of dot squares from 1 by 1 to ${n} by ${n}">
    <defs><pattern id="t-tables-dotp" width="${u}" height="${u}" patternUnits="userSpaceOnUse"><circle cx="${u / 2}" cy="${u / 2}" r="${u * 0.32}"/></pattern></defs>${g}</svg>`;
}

function teenPicture(n) {
  const s = sqSplit(n), u = 12, big = 10 * u, sm = s.b * u, W = big + sm;
  return `<svg class="t-tables-teen" viewBox="-2 -2 ${W + 4} ${W + 4}" width="${W + 4}" height="${W + 4}" role="img" aria-label="(10 + ${s.b}) squared split into a hundred, two strips and a small square">
    <rect class="t-tables-p100" x="0" y="0" width="${big}" height="${big}"/><text x="${big / 2}" y="${big / 2 + 5}">100</text>
    <rect class="t-tables-pstrip" x="${big}" y="0" width="${sm}" height="${big}"/><rect class="t-tables-pstrip" x="0" y="${big}" width="${big}" height="${sm}"/>
    <text x="${big / 2}" y="${big + sm / 2 + 4}">10 × ${s.b}</text>
    <rect class="t-tables-pcorner" x="${big}" y="${big}" width="${sm}" height="${sm}"/>
  </svg>`;
}

function viewSquares(ctx) {
  const d = data(ctx), L = d.level, fx = facts(ctx);
  const sel = Math.min(L, Math.max(1, +ctx.ui.sq || Math.min(L, 12)));
  const sq = tallySquares(fx, L);
  const R = 30, C = 2 * Math.PI * R, frac = sq.good / sq.total;
  const ring = `<svg class="t-tables-ring" viewBox="0 0 80 80" width="96" height="96" role="img" aria-label="${sq.good} of ${sq.total} squares quick or fluent"><circle class="t-tables-ring0" cx="40" cy="40" r="${R}"/><circle class="t-tables-ring1" cx="40" cy="40" r="${R}" stroke-dasharray="${(frac * C).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 40 40)"/><text x="40" y="45">${sq.good}/${sq.total}</text></svg>`;
  let card;
  const st = F.state(fx[F.key({ op: '²', a: sel, b: 2 })]);
  if (sel > 10 && sel < 20) {
    const s = sqSplit(sel);
    card = `<div class="t-tables-sqcard">${teenPicture(sel)}<div>
      <p class="t-tables-sum mono"><b>${sel}² = ${sel} × ${sel} = ${s.total}</b></p>
      <p>Split ${sel} into 10 + ${s.b}. The square breaks into a hundred, two strips of 10 × ${s.b}, and a little ${s.b} × ${s.b} corner:</p>
      <p class="mono t-tables-split">(10 + ${s.b})² = ${s.hundred} + ${s.strips} + ${s.corner} = ${s.total}</p>
      ${sel === 15 ? '<p class="small">Ends in 5? Front digit times the next one up (1 × 2 = 2), then write 25.</p>' : ''}
      <p class="small"><i class="t-tables-lg t-tables-${st}"></i> ${F.STATE_LABEL[st]}</p></div></div>`;
  } else {
    card = `<div class="t-tables-sqcard"><div class="t-tables-pic">${sel <= 12 ? dots(sel, sel, 200) : area(sel, sel)}</div><div>
      <p class="t-tables-sum mono"><b>${sel}² = ${sel} × ${sel} = ${sel * sel}</b></p>
      ${sel > 1 ? `<p>Each step of the staircase adds the next odd number: ${(sel - 1) * (sel - 1)} + ${2 * sel - 1} = ${sel * sel}.</p>` : '<p>One dot: the smallest square.</p>'}
      ${sel === 20 ? '<p class="small">20² is 2 × 2 with two noughts on the end.</p>' : ''}
      <p class="small"><i class="t-tables-lg t-tables-${st}"></i> ${F.STATE_LABEL[st]}</p></div></div>`;
  }
  const chips = [];
  for (let a = 1; a <= L; a++) {
    const s2 = F.state(fx[F.key({ op: '²', a, b: 2 })]);
    chips.push(`<button class="t-tables-sqchip t-tables-${s2}${a === sel ? ' on' : ''}" aria-pressed="${a === sel}" data-act="lib" data-arg="sq|${a}" aria-label="${a} squared, ${F.STATE_LABEL[s2]}">${a}²</button>`);
  }
  return `<div class="card">
    <p class="t-tables-purpose"><b>Squares</b> is for the numbers times themselves — learn every one up to ${L}² by heart, because they turn up everywhere.</p>
    <div class="row gap wrap t-tables-sqtop">${ring}<div><p><b>${sq.good} of ${sq.total}</b> squares are quick or fluent.</p>
      <button class="btn primary big" data-act="lib" data-arg="squares">Practise the squares (${L - 1})</button></div></div>
    ${staircase(L, sel)}
    <p class="muted small">Each new step is the one before plus an L-shaped border — and those borders are 1, 3, 5, 7… the odd numbers.</p>
    <div class="t-tables-sqchips" role="group" aria-label="Pick a square (left and right arrows)">${chips.join('')}</div>
    ${card}
    <p class="kicker">In the Atlas</p>
    <div class="row gap wrap">${SQ_STOPS.map(([id, t]) => `<button class="btn small" data-act="openStop" data-arg="${id}">${esc(t)}</button>`).join('')}</div>
  </div>`;
}

export function view(ctx) {
  data(ctx);
  const tb = tab(ctx);
  const tabs = [['explore', 'Explore'], ['practise', 'Practise'], ['squares', 'Squares trainer']];
  return `<div class="t-tables">
    ${ladder(ctx)}
    <div class="seg t-tables-tabs" role="tablist" aria-label="Mode">${tabs.map(([id, name]) => `<button role="tab" aria-selected="${tb === id}" class="${tb === id ? 'on' : ''}" data-act="lib" data-arg="tab|${id}">${name}</button>`).join('')}</div>
    ${tb === 'explore' ? viewExplore(ctx) : tb === 'practise' ? viewPractise(ctx) : viewSquares(ctx)}
  </div>`;
}

/* ---------- actions ---------- */

export function act(name, arg, ctx) {
  const d = data(ctx), ui = ctx.ui, L = d.level;
  switch (name) {
    case 'tab': ui.tab = arg; ctx.sfx.click(); return;
    case 'size': { const s = +arg; if (LEVELS.includes(s) && s <= L) { ui.size = s; ui.cur = ui.cur && ui.cur.a <= s && ui.cur.b <= s ? ui.cur : null; } return; }
    case 'lens': ui.lens = ui.lens === arg ? null : arg; return;
    case 'mult': ui.mult = Math.min(showSize(ctx), Math.max(2, +arg || 3)); return;
    case 'cell': { const [a, b] = arg.split('|').map(Number); if (a >= 1 && b >= 1) ui.cur = { a, b }; ctx.sfx.click(); return; }
    case 'sq': ui.sq = Math.min(L, Math.max(1, +arg || 1)); return;
    case 'grow': grow(ctx); return;
    case 'practise': ctx.startRun(`The ${L} × ${L} table`, practiseItems(facts(ctx), L), { mode: 'practise', level: L }); return;
    case 'traps': {
      const t = poolFacts(L).filter((f) => F.state(facts(ctx)[F.key(f)]) === 'trap');
      if (t.length) ctx.startRun('My traps', t.sort((x, y) => trickyX(x) - trickyX(y)).map((f) => mulItem(f, Math.random)), { mode: 'practise', level: L });
      return;
    }
    case 'check': ctx.startRun(`Quick check: ${L} × ${L}`, checkItems(L), { mode: 'check', level: L }); return;
    case 'squares': ctx.startRun(`Squares to ${L}²`, squareItems(facts(ctx), L), { mode: 'squares', level: L }); return;
  }
}

export function key(e, ctx) {
  const tb = tab(ctx), ui = ctx.ui, k = e.key;
  if (tb === 'explore') {
    const n = showSize(ctx);
    const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
    if (mv) {
      const c = ui.cur || { a: 1, b: 1 };
      ui.cur = ui.cur ? { a: Math.min(n, Math.max(1, c.a + mv[0])), b: Math.min(n, Math.max(1, c.b + mv[1])) } : c;
      return true;
    }
    if (k === 'Enter' || k === ' ') { ui.cur = ui.cur || { a: 1, b: 1 }; return true; }
    if (/^[1-6]$/.test(k)) { act('lens', LENSES[+k - 1].id, ctx); return true; }
    if (k === '0' || k === 'Escape') { if (!ui.lens && !ui.cur) return false; ui.lens = null; if (k === 'Escape') ui.cur = null; return true; }
    if ((k === '+' || k === '=' || k === '-') && ui.lens === 'mult') { act('mult', (+ui.mult || 3) + (k === '-' ? -1 : 1), ctx); return true; }
  }
  if (tb === 'squares' && (k === 'ArrowLeft' || k === 'ArrowRight')) {
    const L = data(ctx).level, cur = +ui.sq || Math.min(L, 12);
    ui.sq = Math.min(L, Math.max(1, cur + (k === 'ArrowLeft' ? -1 : 1)));
    return true;
  }
  return false;
}

/* ---------- after a run ---------- */

export function done(run, ctx) {
  const d = data(ctx), fx = facts(ctx), L = run.level || d.level;
  const n = run.results.length, right = run.results.filter((r) => r.right).length;
  const stars = n ? (right / n >= 0.95 ? 3 : right / n >= 0.8 ? 2 : right / n >= 0.5 ? 1 : 0) : 0;
  const lines = [];   // the run screen already says how many were right
  const back = '<button class="btn primary" data-act="openTool" data-arg="tables">Back to the Times Table Explorer</button>';
  if (run.mode === 'squares') {
    const sq = tallySquares(fx, L);
    d.sq.runs++; d.sq.best = Math.max(d.sq.best, right);
    lines.push(`${sq.good} of your ${sq.total} squares are quick or fluent now.`);
    ctx.save();
    return { stars, lines, buttons: [back] };
  }
  const lv = d.levels[L] || (d.levels[L] = { runs: 0, best: 0 });
  lv.runs++; lv.best = Math.max(lv.best, right);
  if (run.mode === 'check') lv.check = { right, n };
  const t = tallyLevel(fx, L), nx = nextLevel(L);
  const quickNow = run.items.filter((q, i, a) => q.fact && a.findIndex((x) => F.key(x.fact) === F.key(q.fact)) === i && GOOD.has(F.state(fx[F.key(q.fact)]))).length;
  lines.push(`${quickNow} of the facts in this run are quick or fluent now.`);
  lines.push(`${t.good} of the ${t.total} facts in your ${L} × ${L} are quick or fluent.`);
  if (t.mastered && d.level === L && nx) {
    grow(ctx);
    lines.push(`<b>You have mastered the ${L} × ${L}!</b> The ${nx} × ${nx} is open — ${poolFacts(nx).length - t.total} new facts have joined.`);
  } else if (t.mastered) lines.push(nx ? `<b>The ${L} × ${L} is mastered.</b>` : '<b>The whole 20 × 20 is mastered. Every fact.</b>');
  else lines.push(`${t.need - t.good} more to go — ${t.need} of ${t.total} opens the ${nx ? `${nx} × ${nx}` : 'last badge'}.`);
  ctx.save();
  return { stars, lines, buttons: [back] };
}

/* ---------- styles ---------- */

export const CSS = `
.t-tables .t-tables-head{display:flex;flex-direction:column;gap:8px}
.t-tables-ladder{display:flex;align-items:center;gap:6px;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.t-tables-step{display:flex;flex-direction:column;align-items:center;padding:6px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface2);min-width:74px}
.t-tables-step span{font-size:.72rem;color:var(--muted)}
.t-tables-step.done{background:color-mix(in srgb,var(--mastered) 22%,var(--surface));border-color:var(--mastered)}
.t-tables-step.now{background:var(--action-tint);border-color:var(--action);box-shadow:0 0 0 2px var(--action-tint)}
.t-tables-step.locked{opacity:.55}
.t-tables-arrow{color:var(--muted)}
.t-tables-bar{position:relative;height:14px;border-radius:7px;background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line);overflow:visible}
.t-tables-bar i{display:block;height:100%;border-radius:7px;background:var(--mastered);transition:width .4s}
.t-tables-bar em{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink)}
.t-tables-count{margin:0}
.t-tables-tabs{margin:12px 0}
.t-tables-purpose{margin:0 0 10px;font-size:1.02rem}
.t-tables-lenses{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.t-tables-lenses button{font:inherit;font-weight:650;font-size:.9rem;padding:7px 12px;min-height:38px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.t-tables-lenses button.on{background:var(--action);color:var(--action-ink);border-color:transparent}
.t-tables-k{display:inline-block;min-width:1.2em;font-size:.72rem;opacity:.7}
.t-tables-mult{margin:6px 0}
.t-tables-lensay{background:var(--action-tint);border-radius:10px;padding:8px 12px;margin:6px 0}
.t-tables-gwrap{container-type:inline-size;max-width:680px;margin:10px auto}
.t-tables-w5{max-width:400px}
.t-tables-w10{max-width:560px}
.t-tables-grid{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:2px}
.t-tables-h{display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted);font-size:calc(100cqw / var(--n) * .36);aspect-ratio:1}
.t-tables-h.on{color:var(--action-ink);background:var(--action);border-radius:4px}
.t-tables-c{aspect-ratio:1;border-radius:4px;border:2px solid transparent;padding:0;cursor:pointer;color:var(--ink);font:inherit;font-variant-numeric:tabular-nums;font-size:calc(100cqw / var(--n) * .34);line-height:1;transition:opacity .15s}
.t-tables-g5 .t-tables-c,.t-tables-g5 .t-tables-h{font-size:min(calc(100cqw / var(--n) * .34),1.3rem)}
.t-tables-new{background:var(--surface2);box-shadow:inset 0 0 0 1px var(--line)}
.t-tables-learning{background:color-mix(in srgb,var(--medium) 32%,var(--surface))}
.t-tables-quick{background:color-mix(in srgb,var(--action) 30%,var(--surface))}
.t-tables-fluent{background:color-mix(in srgb,var(--mastered) 45%,var(--surface))}
.t-tables-trap{background:color-mix(in srgb,var(--fix) 42%,var(--surface))}
.t-tables-c.t-tables-free,.t-tables-freelg{background:color-mix(in srgb,var(--mastered) 14%,var(--surface));box-shadow:inset 0 0 0 1px var(--line)}
.t-tables-c.t-tables-rc{border-color:color-mix(in srgb,var(--action) 55%,transparent)}
.t-tables-c.t-tables-hit{font-weight:800;box-shadow:inset 0 0 0 2px var(--ink)}
.t-tables-c.t-tables-dim{opacity:.28}
.t-tables-g15 .t-tables-c,.t-tables-g20 .t-tables-c{border-width:1px;border-radius:3px}
.t-tables-g15 .t-tables-c.t-tables-hit,.t-tables-g20 .t-tables-c.t-tables-hit{box-shadow:inset 0 0 0 1px var(--ink)}
.t-tables-c.t-tables-sel{background:var(--action);color:var(--action-ink);border-color:var(--ink);opacity:1}
.t-tables-c:focus-visible{outline:3px solid var(--ink);outline-offset:1px}
.t-tables-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.85rem;color:var(--muted)}
.t-tables-legend span{display:inline-flex;align-items:center;gap:5px}
.t-tables-lg{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px}
.t-tables-explain,.t-tables-sqcard{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:10px;padding:12px;border-radius:12px;background:var(--surface2)}
.t-tables-pic{max-width:100%;overflow:auto}
.t-tables-pic svg,.t-tables-sqcard svg{max-width:100%;height:auto}
.t-tables-sum{font-size:1.5rem;margin:0 0 6px}
.t-tables-dots circle{fill:var(--action)}
.t-tables-area .t-tables-part1{fill:var(--action-tint);stroke:var(--action);stroke-width:1.5}
.t-tables-area .t-tables-part2{fill:color-mix(in srgb,var(--treasure) 35%,var(--surface))}
.t-tables-area .t-tables-lines line{stroke:var(--line);stroke-width:.6}
.t-tables-area .t-tables-cut{stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3}
.t-tables-area text,.t-tables-teen text,.t-tables-ring text{fill:var(--ink);font-size:11px;text-anchor:middle;font-weight:700}
.t-tables-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:12px 0}
.t-tables-tile{border-radius:12px;padding:10px;text-align:center;display:flex;flex-direction:column}
.t-tables-tile b{font-size:1.6rem}
.t-tables-tile span{font-size:.8rem}
.t-tables-parent{border-style:dashed}
.t-tables-sqtop{align-items:center}
.t-tables-ring0{fill:none;stroke:var(--surface2);stroke-width:9}
.t-tables-ring1{fill:none;stroke:var(--mastered);stroke-width:9;stroke-linecap:round}
.t-tables-ring text{font-size:14px}
.t-tables-stairs{width:100%;height:auto;max-height:220px;margin:10px 0}
.t-tables-stairs .t-tables-sqr{stroke:var(--line);stroke-width:.5}
.t-tables-stairs pattern circle{fill:var(--action)}
.t-tables-stairs .t-tables-gnomon{fill:color-mix(in srgb,var(--treasure) 40%,transparent)}
.t-tables-stairs .t-tables-on .t-tables-sqr{stroke:var(--ink);stroke-width:2}
.t-tables-sqchips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.t-tables-sqchip{min-width:48px;min-height:40px;border-radius:10px;border:2px solid transparent;font:inherit;font-weight:700;cursor:pointer;color:var(--ink)}
.t-tables-sqchip.on{border-color:var(--ink)}
.t-tables-teen .t-tables-p100{fill:var(--action-tint);stroke:var(--action)}
.t-tables-teen .t-tables-pstrip{fill:color-mix(in srgb,var(--treasure) 35%,var(--surface));stroke:var(--treasure)}
.t-tables-teen .t-tables-pcorner{fill:color-mix(in srgb,var(--mastered) 40%,var(--surface));stroke:var(--mastered)}
.t-tables-split{font-size:1.1rem;font-weight:700}
@media (max-width:520px){.t-tables-step{min-width:60px;padding:4px 8px}.t-tables-sum{font-size:1.25rem}}
`;

/* ---------- selftest ---------- */

export function selftest(ok, makeCtx) {
  const fast = () => F.record(F.blank(), true, 400, '8-10');
  const slowRight = () => F.record(F.blank(), true, 20000, '8-10');
  const trapRec = () => F.record(F.record(F.blank(), true, 400, '8-10'), false, 400, '8-10');
  ok(F.state(fast()) === 'quick' && F.state(trapRec()) === 'trap' && F.state(slowRight()) === 'learning', 'tables: record fixtures have the states they claim');
  const mk = (band = '8-10', level = 5) => { const c = makeCtx('tables', band); c.F = F; c.data.level = level; return c; };
  const fill = (c, list, rec) => list.forEach((f) => { c.kid.facts[F.key(f)] = rec(); });
  const nums = (s) => String(s).split(/[^0-9]+/).filter(Boolean);

  // --- the pool
  const want = { 5: 15, 10: 55, 15: 120, 20: 210 }, counts = { 5: 10, 10: 45, 15: 105, 20: 190 };
  for (const L of LEVELS) {
    const P = levelFacts(L);
    ok(P.length === want[L], `tables: ${L} × ${L} has ${want[L]} facts, got ${P.length}`);
    ok(poolFacts(L).length === counts[L] && poolFacts(L).every((f) => f.a >= 2) && P.filter((f) => f.a === 1).length === L, `tables: ${L} counts ${counts[L]} facts (the 1s are free)`);
    ok(P.every((f) => f.a >= 1 && f.a <= f.b && f.b <= L && /^\d+×\d+$/.test(F.key(f))), `tables: ${L} pool in shared key format`);
    ok(new Set(P.map(F.key)).size === P.length, `tables: ${L} pool has no duplicates`);
  }

  // --- the threshold: exactly 90% and not 89%
  ok(meets(90, 100) && !meets(89, 100) && meets(9, 10) && !meets(8, 10), 'tables: meets() is 90%, not 89%');
  for (const L of LEVELS) {
    const P = poolFacts(L), need = Math.ceil(P.length * 0.9);
    ok(needFor(P.length) === need, `tables: need for ${L} is ${need}`);
    for (const g of [need - 1, need]) {
      const c = mk('8-10', L);
      fill(c, P.slice(0, g), fast);
      const t = tallyLevel(c.kid.facts, L);
      ok(t.good === g && t.mastered === (g >= need), `tables: ${L} with ${g}/${P.length} quick → mastered ${t.mastered}`);
      ok(t.mastered === (g / P.length >= 0.9), `tables: ${L} with ${g}/${P.length} (${((100 * g) / P.length).toFixed(1)}%) agrees with the 90% rule`);
      const h = view(c);
      ok(h.includes('data-arg="grow"') === (t.mastered && L < 20), `tables: grow button at ${L} with ${g} good`);
      act('grow', '', c);
      const nx = LEVELS[LEVELS.indexOf(L) + 1];
      ok(c.data.level === (t.mastered && nx ? nx : L), `tables: grow at ${L} with ${g} good → level ${c.data.level}`);
    }
  }
  // 20 × 20: 171 of 190 is exactly 90%; 170 is 89.5%. 5 × 5: 9 of 10 is exactly 90%.
  { const c = mk('8-10', 20), P = poolFacts(20);
    fill(c, P.slice(0, 170), fast); ok(!tallyLevel(c.kid.facts, 20).mastered, 'tables: 170/190 (89%) is not mastered');
    fill(c, P.slice(170, 171), fast); ok(tallyLevel(c.kid.facts, 20).mastered, 'tables: 171/190 (exactly 90%) is mastered');
    fill(c, levelFacts(20).filter((f) => f.a === 1), fast); ok(tallyLevel(c.kid.facts, 20).good === 171, 'tables: the 1s never count'); }
  { const c = mk('8-10', 5), P = poolFacts(5);
    fill(c, P.slice(0, 8), fast); act('grow', '', c); ok(c.data.level === 5, 'tables: 8/10 does not open 10 × 10');
    fill(c, P.slice(8, 9), fast); act('grow', '', c); ok(c.data.level === 10, 'tables: 9/10 (exactly 90%) opens 10 × 10'); }
  // fluent counts, trap and learning do not
  { const c = mk(), P = poolFacts(5);
    fill(c, P.slice(0, 7), fast); fill(c, P.slice(7, 9), () => { const r = fast(); r.box = F.MASTERED_BOX; return r; });
    ok(tallyLevel(c.kid.facts, 5).fluent === 2 && tallyLevel(c.kid.facts, 5).mastered, 'tables: fluent counts toward mastery');
    fill(c, P.slice(7, 8), trapRec); ok(!tallyLevel(c.kid.facts, 5).mastered, 'tables: a trap does not count');
    fill(c, P.slice(7, 8), slowRight); ok(!tallyLevel(c.kid.facts, 5).mastered, 'tables: slow-but-right does not count'); }
  // grow never skips: even with every fact to 20 known, one step at a time
  { const c = mk('11-14', 5); fill(c, levelFacts(20), fast);
    act('grow', '', c); ok(c.data.level === 10, 'tables: grow moves one step');
    act('grow', '', c); act('grow', '', c); act('grow', '', c); ok(c.data.level === 20, 'tables: tops out at 20'); }
  { const c = mk('11-14'); c.data = {}; c.data.level = undefined; view(c); ok(c.data.level === 5, 'tables: an 11–14 child starts at 5 × 5 until it is shown'); }

  // --- practice runs
  let flipped = 0, total = 0;
  const scen = [['new', () => {}], ['half', (c, P) => fill(c, P.filter((_, i) => i % 2), fast)], ['traps', (c, P) => { fill(c, P, fast); fill(c, P.slice(-3), trapRec); }]];
  for (const L of LEVELS) for (const [nm, setup] of scen) for (let rep = 0; rep < 4; rep++) {
    const c = mk('8-10', L), P = poolFacts(L); setup(c, P);
    const keys = new Set(P.map(F.key));
    act('practise', '', c);
    const run = c.runs.at(-1);
    ok(run && run.items.length === 20 && run.extra.level === L && run.extra.mode === 'practise', `tables: ${L}/${nm} practice is a 20-question run`);
    for (const q of run.items) {
      total++;
      const [x, y] = nums(q.text).map(Number);
      ok(q.fact.op === '×' && q.fact.a <= q.fact.b && keys.has(F.key(q.fact)), `tables: ${L}/${nm} ${q.text} is a fact of this level`);
      ok(x * y === q.ans && F.answer(q.fact) === q.ans && q.fact.a * q.fact.b === q.ans, `tables: ${q.text} answer ${q.ans}`);
      ok(Math.min(x, y) === q.fact.a && Math.max(x, y) === q.fact.b, `tables: ${q.text} text matches its fact`);
      if (x !== q.fact.a) flipped++;
      ok(!nums(q.text).includes(String(q.ans)), `tables: ${q.text} shows its answer`);
      ok(typeof q.why === 'string' && !nums(q.why).includes(String(q.ans)), `tables: chip for ${q.text} leaks its answer: ${q.why}`);
      ok(Function(`return ${q.expr}`)() === q.ans, `tables: expr of ${q.text}`);
    }
    for (let i = 1; i < run.items.length; i++) ok(F.key(run.items[i].fact) !== F.key(run.items[i - 1].fact), `tables: ${L}/${nm} repeats a fact back to back`);
    const tk = run.items.map((q) => trickyX(q.fact)), avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    ok(avg(tk.slice(-5)) >= avg(tk.slice(0, 5)), `tables: ${L}/${nm} trickiest last`);
    if (nm === 'traps') ok(P.slice(-3).every((f) => run.items.some((q) => F.key(q.fact) === F.key(f))), `tables: ${L} traps are in the run`);
    if (L === 5 && nm === 'new') ok(P.every((f) => run.items.some((q) => F.key(q.fact) === F.key(f))), 'tables: a first 5 × 5 run covers every fact that counts');
    // recorded as the runner does, into the shared record
    for (const q of run.items) { const k = F.key(q.fact); F.record(c.kid.facts[k] || (c.kid.facts[k] = F.blank()), true, 300, '8-10'); }
    ok(Object.keys(c.kid.facts).every((k) => { const p = F.parseKey(k); return p && p.op === '×' && p.a <= p.b; }), `tables: ${L}/${nm} recorded keys are shared-format`);
  }
  ok(flipped > 0 && flipped < total, `tables: some facts shown the other way round (${flipped}/${total})`);
  { const c = mk(); fill(c, [{ op: '×', a: 7, b: 8 }], fast); ok(c.kid.facts['7×8'] && !c.kid.facts['8×7'], 'tables: 7 × 8 lives at key 7×8'); }

  // --- trickiness beyond 12, and the chips
  const T = (a, b) => trickyX({ op: '×', a, b });
  ok(T(7, 8) === F.tricky({ op: '×', a: 7, b: 8 }), 'tables: trickyX agrees with facts.js to 12');
  for (const m of [3, 6, 7, 8]) { ok(T(m, 13) > T(m, 15) && T(m, 17) > T(m, 15) && T(m, 19) > T(m, 15) && T(m, 17) > T(m, 20) && T(m, 15) > T(m, 20), `tables: 13/17/19 harder than 15 and 20 (×${m})`); }
  for (let d = 2; d <= 9; d++) ok(T(d, 11) < T(7, 8), `tables: 11 × ${d} is easy`);
  for (let a = 1; a <= 20; a++) for (let b = a; b <= 20; b++) {
    const w = whyX({ op: '×', a, b });
    ok(w && !nums(w).includes(String(a * b)), `tables: chip for ${a} × ${b} names its answer: ${w}`);
    ok(Number.isFinite(T(a, b)) && T(a, b) === T(b, a), `tables: trickyX ${a}×${b}`);
  }

  // --- quick check
  for (const L of LEVELS) {
    const c = mk('8-10', L); act('check', '', c); const run = c.runs.at(-1), keys = new Set(poolFacts(L).map(F.key));
    ok(run.items.length === 10 && new Set(run.items.map((q) => F.key(q.fact))).size === 10 && run.items.every((q) => keys.has(F.key(q.fact)) && q.ans === q.fact.a * q.fact.b), `tables: quick check at ${L} is ten distinct facts of the level`);
  }

  // --- explore: every product at 20, lenses, cursor, colour
  const isP = (n) => { if (n < 2) return false; for (let d = 2; d < n; d++) if (n % d === 0) return false; return true; };
  const cellsOf = (h) => [...h.matchAll(/<button class="([^"]*)" data-act="lib" data-arg="cell\|(\d+)\|(\d+)" data-a="(\d+)" data-b="(\d+)"[^>]*>(\d+)<\/button>/g)]
    .map((m) => ({ cls: m[1].split(' '), a: +m[4], b: +m[5], p: +m[6], aa: +m[2], bb: +m[3] }));
  { const c = mk('11-14', 20);
    for (const L of LEVELS) { act('size', L, c); const cs = cellsOf(view(c)); ok(cs.length === L * L, `tables: explore at ${L} shows ${L * L} cells, got ${cs.length}`); }
    act('size', 20, c);
    const cs = cellsOf(view(c));
    ok(cs.length === 400 && cs.every((x) => x.p === x.a * x.b && x.a === x.aa && x.b === x.bb), 'tables: every product at 20 × 20 equals a × b');
    for (const x of cs) if (x.p !== x.a * x.b) ok(false, `tables: cell ${x.a},${x.b} shows ${x.p}`);
    const lensCheck = (id, rule, arg = '') => {
      c.ui.lens = null; act('lens', id, c); if (arg) act('mult', arg, c);
      const v = cellsOf(view(c));
      let bad = 0; for (const x of v) if (x.cls.includes('t-tables-hit') !== rule(x.a, x.b) || x.cls.includes('t-tables-dim') === rule(x.a, x.b)) bad++;
      ok(bad === 0 && v.length === 400, `tables: lens ${id}${arg ? ' ' + arg : ''} lights ${bad} wrong cells`);
      return v;
    };
    for (const m of [2, 3, 7, 12, 19]) lensCheck('mult', (a, b) => (a * b) % m === 0, String(m));
    lensCheck('sq', (a, b) => a === b);
    lensCheck('nine', (a, b) => a === 9 || b === 9);
    lensCheck('odd', (a, b) => a % 2 === 1 && b % 2 === 1);
    const pv = lensCheck('prime', (a, b) => isP(a * b));
    ok(pv.filter((x) => x.cls.includes('t-tables-hit')).every((x) => x.a === 1 || x.b === 1), 'tables: primes only in the 1s row and column');
    ok(pv.filter((x) => x.a > 1 && x.b > 1).every((x) => !isP(x.p)), 'tables: no prime in the interior');
    ok(pv.filter((x) => x.cls.includes('t-tables-hit')).length === 2 * 8 && isP(19), 'tables: 8 primes to 20, each in row and column 1');
    lensCheck('sym', (a, b) => (a === 7 && b === 8) || (a === 8 && b === 7));
    act('cell', '4|13', c);
    lensCheck('sym', (a, b) => (a === 4 && b === 13) || (a === 13 && b === 4));
    act('lens', 'sym', c); ok(!c.ui.lens, 'tables: a lens toggles off');
    const v = cellsOf(view(c));
    ok(v.every((x) => x.cls.includes('t-tables-rc') === (x.a === 4 || x.b === 13)), 'tables: row and column light up');
    ok(v.filter((x) => x.cls.includes('t-tables-sel')).length === 1, 'tables: one selected cell');
    ok(view(c).includes('4 × 13 = 52'), 'tables: explain card shows the fact');
    // keys
    key({ key: 'ArrowRight' }, c); key({ key: 'ArrowDown' }, c); ok(c.ui.cur.a === 5 && c.ui.cur.b === 14, 'tables: arrows move the cursor');
    c.ui.cur = { a: 20, b: 20 }; key({ key: 'ArrowRight' }, c); key({ key: 'ArrowDown' }, c); ok(c.ui.cur.a === 20 && c.ui.cur.b === 20, 'tables: cursor stays on the grid');
    c.ui.cur = null; ok(key({ key: 'Enter' }, c) && c.ui.cur.a === 1, 'tables: Enter explains a cell');
    for (let i = 1; i <= 6; i++) { key({ key: String(i) }, c); ok(c.ui.lens === LENSES[i - 1].id, `tables: key ${i} picks ${LENSES[i - 1].id}`); key({ key: '0' }, c); ok(!c.ui.lens, 'tables: 0 clears the lens'); }
    // fluency colour, both orientations
    c.kid.facts['7×8'] = trapRec(); c.kid.facts['3×13'] = fast();
    const w = cellsOf(view(c));
    ok(w.filter((x) => (x.a === 7 && x.b === 8) || (x.a === 8 && x.b === 7)).every((x) => x.cls.includes('t-tables-trap')), 'tables: 7 × 8 and 8 × 7 are coloured as the one trap');
    ok(w.filter((x) => (x.a === 3 && x.b === 13) || (x.a === 13 && x.b === 3)).every((x) => x.cls.includes('t-tables-quick')), 'tables: 3 × 13 coloured quick');
    ok(w.filter((x) => x.cls.includes('t-tables-new')).length === 400 - 4, 'tables: the rest are new');
    // sizes above the unlocked level are refused
    const d = mk('8-10', 10); act('size', '20', d); ok(cellsOf(view(d)).length === 100, 'tables: cannot view a locked size');
  }

  // --- squares
  for (let b = 1; b <= 9; b++) { const s = sqSplit(10 + b); ok(s.hundred + s.strips + s.corner === (10 + b) ** 2 && s.total === (10 + b) ** 2, `tables: (10 + ${b})² split`); }
  const sqKeys = new Set(F.BANK['²'].map(F.key));
  for (const L of LEVELS) {
    const c = mk('8-10', L); c.ui.tab = 'squares';
    act('squares', '', c); const run = c.runs.at(-1);
    ok(run.items.length === L - 1 && run.extra.mode === 'squares', `tables: squares run to ${L}²`);
    ok(new Set(run.items.map((q) => q.fact.a)).size === L - 1 && run.items.every((q) => q.fact.a >= 2 && q.fact.a <= L), `tables: squares 2..${L} each once`);
    for (const q of run.items) {
      ok(q.text === `${q.fact.a}²` && q.ans === q.fact.a * q.fact.a && F.answer(q.fact) === q.ans && q.fact.op === '²' && q.fact.b === 2 && sqKeys.has(F.key(q.fact)), `tables: square item ${q.text} = ${q.ans}`);
      ok(!nums(q.text).includes(String(q.ans)), `tables: ${q.text} shows its answer`);
      if (q.ans >= 10) ok(!nums(q.why).includes(String(q.ans)), `tables: ${q.text} chip leaks its answer`);
    }
    for (let a = 1; a <= L; a++) {
      act('sq', a, c); const h = view(c);
      ok(h.includes(`${a}² = ${a} × ${a} = ${a * a}`), `tables: square card ${a}²`);
      if (a > 10 && a < 20) { const s = sqSplit(a); ok(h.includes(`(10 + ${a - 10})² = 100 + ${20 * (a - 10)} + ${(a - 10) ** 2} = ${a * a}`), `tables: teen picture for ${a}²`); }
      else if (a > 1) ok(h.includes(`${(a - 1) ** 2} + ${2 * a - 1} = ${a * a}`), `tables: staircase step for ${a}²`);
    }
    ok(['teen-squares', 'odd-staircase', 'square-five'].every((id) => view(c).includes(`data-act="openStop" data-arg="${id}"`)), 'tables: squares links the Atlas stops');
    key({ key: 'ArrowLeft' }, c); ok(c.ui.sq === L - 1, 'tables: arrow picks a square');
    c.kid.facts['3²2'] = fast(); ok(tallySquares(c.kid.facts, L).good === 1, 'tables: squares ring counts quick squares');
  }

  // --- done()
  { const c = mk('8-10', 5), P = poolFacts(5);
    fill(c, P.slice(0, 8), fast);
    act('practise', '', c); let run = { ...c.runs.at(-1).extra, items: c.runs.at(-1).items, results: c.runs.at(-1).items.map((_, i) => ({ right: i % 4 !== 0, ms: 500 })) };
    let r = done(run, c);
    ok(r.stars === 1 && !r.lines.some((l) => /undefined|NaN/.test(l)), `tables: done scores 15 of 20 as one star (${r.stars})`);
    ok(r.lines.some((l) => l.includes('8 of the 10 facts')) && r.lines.some((l) => l.includes('1 more to go')) && c.data.level === 5, 'tables: done at 8/10 reports not mastered');
    ok(c.data.levels[5].runs === 1, 'tables: runs stored per level');
    const qn = new Set(run.items.map((q) => F.key(q.fact))); const expect = [...qn].filter((k) => ['quick', 'fluent'].includes(F.state(c.kid.facts[k]))).length;
    ok(r.lines.some((l) => l.startsWith(`${expect} of the facts in this run`)), 'tables: done reports how many are quick now');
    fill(c, P.slice(8, 9), fast);
    r = done({ ...run, results: run.items.map(() => ({ right: true, ms: 400 })) }, c);
    ok(r.stars === 3 && c.data.level === 10 && r.lines.some((l) => l.includes('mastered the 5 × 5') && l.includes('35 new facts')), 'tables: done at 9/10 unlocks 10 × 10 with 35 new facts');
    ok(c.data.levels[5].mastered, 'tables: mastery stamped on the level');
    ok(r.buttons.every((b) => b.includes('openTool')), 'tables: done buttons work from the run screen');
    r = done({ mode: 'check', level: 10, items: checkItems(10), results: Array(10).fill({ right: true, ms: 1 }) }, c);
    ok(c.data.levels[10].check.right === 10 && c.data.level === 10, 'tables: quick check stored, no unlock without mastery');
    r = done({ mode: 'squares', level: 10, items: squareItems({}, 10), results: Array(10).fill({ right: false, ms: 1 }) }, c);
    ok(r.stars === 0 && c.data.sq.runs === 1 && r.lines.some((l) => l.includes('of your 9 squares')), 'tables: squares done reports');
  }

  // --- every tab renders, every band and level
  const bad = /undefined|NaN|\[object Object\]/;
  for (const band of ['6-7', '8-10', '11-14']) for (const L of LEVELS) for (const tb of ['explore', 'practise', 'squares']) {
    const c = mk(band, L); act('tab', tb, c); act('cell', '3|4', c); act('lens', 'mult', c);
    const h = view(c); ok(!bad.test(h) && h.includes('The rule:'), `tables: ${band}/${L}/${tb} renders cleanly`);
  }
}
