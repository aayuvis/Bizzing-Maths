/* strategy.js — The Strategy School: ten ways into a problem you have never
   seen before (docs/CHAPTER-CONTRACT.md, docs/PAPER-CONTRACT.md).

   A contest-style problem is not hard because the arithmetic is big. It is
   hard because it does not say which sum to do. Each stop here is one way in
   — undo it from the end, guess and improve, make a table, find the rule,
   draw the bars, pretend they are all the same, keep the gap, try a smaller
   one, close the gap, ride the cycle — and the drill is word problems built
   so there is exactly ONE answer. The working (`work`) is the strategy; the
   check (`expr`) gets there another way, usually by trying every number. */

import { int, pick } from '../rand.js';
import { svg, text } from './kit.js';

export const WORLD = {
  id: 'strategy', name: 'The Strategy School', short: 'Strategy', band: '8-10', track: 'contest',
  blurb: 'Ten ways into a problem you have never met — the tools contest problems are built to need.',
  tint: '#E8F0FB', ink: '#1F3B6B', glyph: '🧠',
};

/* ------------------------------------------------------------ helpers */

/* The test's leaked-answer rule, applied before a question leaves gen().
   The working is held to the same rule: a step's label never shows the answer
   (a gap of 12 that closes by 1 a week, a bar that equals the extra), so the
   child types the answer rather than copying it off the step above. */
const shows = (str, a) => str.split(/[^0-9./]/).map((w) => w.replace(/\.$/, '')).includes(a);
const leaks = (t, q) => { const a = String(q.ans); return !q.choices && a.length > 1 && (shows(q.text, a) || t.work(q).some((s) => shows(s.t, a))); };
function fresh(t, make) { let q; for (let i = 0; i < 400; i++) { q = make(); if (q && !leaks(t, q)) return q; } return q; }
const list = (a) => a.length < 2 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and then ${a.at(-1)}`;
const NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Ela', 'Femi', 'Gita', 'Hugo', 'Jai', 'Kofi', 'Lena', 'Maya', 'Omar', 'Priya', 'Sami', 'Tara', 'Yusuf', 'Zoe'];
const two = (r) => { const a = pick(NAMES, r); let b = pick(NAMES, r); while (b === a) b = pick(NAMES, r); return [a, b]; };
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => [...String(n)].map((d) => SUP[d]).join('');
/* A round first guess near n, never n itself — a guess that is right first time teaches nothing. */
const roundGuess = (n) => { const g = Math.round(n / 5) * 5; return g === n || g < 1 ? n + 2 : g; };

/* A flow of boxes: start → step → step → end. */
function flow(boxes, label) {
  const w = 64, g = 26; let s = '';
  boxes.forEach((b, i) => {
    const X = 4 + i * (w + g), end = i === 0 || i === boxes.length - 1;
    s += `<rect x="${X}" y="8" width="${w}" height="44" rx="${end ? 22 : 6}" class="${end ? 'dg-fill2' : 'dg-fill1'}"/>` + text(X + w / 2, 36, b, end ? 'dg-text' : 'dg-small');
    if (i < boxes.length - 1) s += `<line x1="${X + w + 4}" y1="30" x2="${X + w + g - 6}" y2="30" class="dg-line"/><path d="M${X + w + g - 10},25 L${X + w + g - 4},30 L${X + w + g - 10},35" class="dg-line"/>`;
  });
  return svg(8 + boxes.length * (w + g) - g, 60, s, label);
}
/* A table: a header row, then rows of cells (strings or numbers). */
function table(head, rows, label) {
  const cw = 96, rh = 30; let s = '';
  head.forEach((h, j) => { s += `<rect x="${4 + j * cw}" y="4" width="${cw}" height="${rh}" class="dg-fill1"/>` + text(4 + j * cw + cw / 2, 24, h, 'dg-small'); });
  rows.forEach((row, i) => row.forEach((c, j) => {
    s += `<rect x="${4 + j * cw}" y="${4 + (i + 1) * rh}" width="${cw}" height="${rh}" class="${c === '?' ? 'dg-fill2' : 'dg-blank'}"/>` + text(4 + j * cw + cw / 2, 24 + (i + 1) * rh, c, 'dg-text');
  }));
  return svg(head.length * cw + 8, (rows.length + 1) * rh + 8, s, label);
}
/* Bar model rows: each row a name and parts [{w, t, cls}], then a brace on the right. */
function bars(rows, brace, label, foot = '') {
  const x0 = 70, rh = 40; let s = '', W = 0;
  rows.forEach((row, i) => {
    let x = x0; const y = 8 + i * (rh + 10);
    s += text(x0 - 8, y + 26, row.name, 'dg-text', 'end');
    for (const p of row.parts) { s += `<rect x="${x}" y="${y}" width="${p.w}" height="${rh}" rx="4" class="${p.cls || 'dg-fill1'}"/>` + (p.t ? text(x + p.w / 2, y + 26, p.t, 'dg-text') : ''); x += p.w; }
    W = Math.max(W, x);
  });
  const H = 8 + rows.length * (rh + 10);
  if (brace) s += `<path d="M${W + 8},8 Q${W + 18},8 ${W + 18},20 L${W + 18},${H / 2 - 6} L${W + 26},${H / 2} L${W + 18},${H / 2 + 6} L${W + 18},${H - 20} Q${W + 18},${H - 10} ${W + 8},${H - 10}" class="dg-line" fill="none"/>` + text(W + 32, H / 2 + 5, brace, 'dg-text', 'start');
  if (foot) s += text(x0, H + 16, foot, 'dg-small', 'start');
  return svg(W + (brace ? 150 : 20), H + (foot ? 24 : 4), s, label);
}

/* ================================================================ 1. work backwards */

const EV = {
  give: { say: (n) => `gave ${n} away`, box: (n) => `− ${n}`, go: (x, n) => x - n, js: (n) => `-${n}`, undo: (v, n) => v + n, how: (n) => `Undo giving ${n} away: add them back` },
  get: { say: (n) => `got ${n} more`, box: (n) => `+ ${n}`, go: (x, n) => x + n, js: (n) => `+${n}`, undo: (v, n) => v - n, how: (n) => `Undo getting ${n}: take them off` },
  half: { say: () => 'gave half of them to a friend', box: () => '÷ 2', go: (x) => x / 2, js: () => '/2', undo: (v) => v * 2, how: () => 'Undo giving half away: double' },
  double: { say: () => 'won a game that doubled them', box: () => '× 2', go: (x) => x * 2, js: () => '*2', undo: (v) => v / 2, how: () => 'Undo the doubling: halve' },
  halfplus: { say: (n) => `gave half of them away and then ${n} more`, box: (n) => `÷2 −${n}`, go: (x, n) => x / 2 - n, js: (n) => `/2-${n}`, undo: (v, n) => (v + n) * 2, how: (n) => `Undo “half, then ${n} more”: add the ${n} back, then double` },
};
const THINGS = ['stickers', 'marbles', 'cards', 'shells', 'beads'];
const runEv = (x, evs) => evs.reduce((v, [k, n]) => EV[k].go(v, n), x);

/* ================================================================ 6. heads and legs */

const CREATURES = [
  { lo: 'hens', hi: 'goats', a: 2, b: 4, whole: 'heads', part: 'legs', one: 'goat', where: 'A farm has hens and goats' },
  { lo: 'bicycles', hi: 'cars', a: 2, b: 4, whole: 'vehicles', part: 'wheels', one: 'car', where: 'A car park holds bicycles and cars' },
  { lo: 'beetles', hi: 'spiders', a: 6, b: 8, whole: 'creatures', part: 'legs', one: 'spider', where: 'A bug box holds beetles (6 legs each) and spiders (8 legs each)' },
];

/* ================================================================ 10. cycles */

const lastDigitCycle = (a) => { const c = []; let d = a % 10; while (!c.includes(d)) { c.push(d); d = (d * a) % 10; } return c; };
const POWJS = (a, n) => `((a,n)=>{let d=1;for(let i=0;i<n;i++)d=(d*a)%10;return d;})(${a},${n})`;

/* ================================================================ the stops */

export const TRICKS = [
  /* ---------------------------------------------------------------- work backwards */
  {
    id: 'work-backwards', world: 'strategy', band: '8-10', title: 'Work backwards',
    hook: 'Tara gave away half her stickers and then 3 more, and has 9 left. How many did she start with?',
    idea: 'When you know how a story ENDS, start there and undo each thing that happened, last one first.',
    why: [
      'The story runs forwards: start → give some away → get some → end. You know the end but not the start. So walk the story the other way: the last thing that happened is the first thing you undo.',
      'Every event has an opposite that cancels it. Giving 7 away is undone by adding 7 back. Halving is undone by doubling. "Half, then 3 more" is two things, so undo the 3 first (it happened last), then double.',
      'It is like getting dressed: socks on before shoes, so shoes come off first. When you get to the start, check by running the story forwards — you should land exactly on the ending you were given.',
    ],
    alg: 'if x → f → g → end, then x = f⁻¹(g⁻¹(end))',
    ex: { name: 'Tara', thing: 'stickers', x: 24, evs: [['halfplus', 3]] },
    caseKey: 'kind',
    cases: [
      { label: 'Gave some, got some', note: 'Only adding and taking away: undo each one with its opposite, from the end.',
        ex: { name: 'Kofi', thing: 'marbles', x: 15, evs: [['give', 7], ['get', 12]] } },
      { label: 'Halves and doubles', note: 'A half is undone by doubling, a double by halving — still last thing first.',
        ex: { name: 'Lena', thing: 'cards', x: 18, evs: [['give', 4], ['half'], ['get', 5]] } },
      { label: 'Half, and then some more', note: 'Two things in one: undo the "more" first, because it happened last, then double.',
        ex: { name: 'Tara', thing: 'stickers', x: 24, evs: [['halfplus', 3]] } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        for (let k = 0; k < 400; k++) {
          const x = int(lv === 1 ? 5 : 6, lv === 1 ? 30 : lv === 2 ? 40 : 80, r), evs = [];
          const len = lv === 1 ? 2 : lv === 2 ? 3 : int(3, 4, r);
          const kinds = lv === 1 ? Array(len).fill(0).map(() => pick(['give', 'get'], r))
            : lv === 2 ? Array(len).fill(0).map(() => pick(['give', 'get', 'half', 'double'], r))
            : Array(len).fill(0).map(() => pick(['give', 'get', 'half', 'double', 'halfplus'], r));
          if (lv === 2 && !kinds.some((k2) => k2 === 'half' || k2 === 'double')) kinds[int(0, len - 1, r)] = pick(['half', 'double'], r);
          if (lv === 3 && !kinds.includes('halfplus')) kinds[int(0, len - 1, r)] = 'halfplus';
          let v = x, okk = true;
          for (const kd of kinds) {
            const n = kd === 'half' || kd === 'double' ? undefined : int(2, lv === 1 ? 12 : 20, r);
            if ((kd === 'half' || kd === 'halfplus') && v % 2) { okk = false; break; }
            const nv = EV[kd].go(v, n);
            if (nv < 1 || nv > 400) { okk = false; break; }
            evs.push(n === undefined ? [kd] : [kd, n]); v = nv;
          }
          if (okk) return this.q({ name: pick(NAMES, r), thing: pick(THINGS, r), x, evs });
        }
        return null;
      });
    },
    q({ name, thing, x, evs }) {
      const end = runEv(x, evs);
      const kind = evs.some(([k]) => k === 'halfplus') ? 'halfplus' : evs.some(([k]) => k === 'half' || k === 'double') ? 'times' : 'add';
      const js = evs.reduce((e, [k, n]) => `(${e}${EV[k].js(n)})`, 'x');
      return { name, thing, x, evs, kind,
        text: `${name} had some ${thing}. Then ${name} ${list(evs.map(([k, n]) => EV[k].say(n)))}. That left ${end}. How many ${thing} did ${name} have at the start?`,
        expr: `[...Array(5000).keys()].find((x)=>${js}===${end})`, ans: x };
    },
    work({ x, evs }) {
      let v = runEv(x, evs); const s = [];
      for (const [k, n] of [...evs].reverse()) { const nv = EV[k].undo(v, n); s.push({ t: `${EV[k].how(n)}: from ${v}`, v: nv }); v = nv; }
      return s;
    },
    draw({ x, evs }) { return flow(['?', ...evs.map(([k, n]) => EV[k].box(n)), String(runEv(x, evs))], 'What happened, in order, from an unknown start to the end'); },
  },

  /* ---------------------------------------------------------------- guess, check, improve */
  {
    id: 'guess-check-improve', world: 'strategy', band: '8-10', title: 'Guess, check, improve',
    hook: 'Two numbers next to each other multiply to make 506. What do they add up to?',
    idea: 'Make a sensible guess, check it, and let "too big" or "too small" tell you which way to move.',
    why: [
      'Some problems are hard to work out forwards but easy to CHECK. If someone says "is it 20?", you can multiply and see. So guess — and every wrong guess still tells you something: too big means go down, too small means go up.',
      'A good guess saves steps. Two numbers next to each other multiply to a little more than a square, so 20 × 21 = 420 is a nearby, easy first try. 506 is bigger, so go up — and 22 × 23 = 506 lands it.',
      'When two numbers have a fixed total, their product is biggest when they are equal and shrinks as they spread apart (try 5 × 5, 4 × 6, 3 × 7 — 25, 24, 21). So if a product is too big, move the numbers further apart. Guessing is not cheating; improving the guess is the method.',
    ],
    alg: 'guess g → check f(g) → too big: go down · too small: go up',
    ex: { kind: 'consec', n: 22 },
    caseKey: 'kind',
    cases: [
      { label: 'Two numbers in a row', note: 'Their product is just above a square, so start near the square root and step up or down.',
        ex: { kind: 'consec', n: 22 } },
      { label: 'A total and a product', note: 'Start with an even split; if the product is too big, spread the two numbers further apart.',
        ex: { kind: 'sumprod', a: 4, b: 11 } },
      { label: 'Three in a row', note: 'Three numbers in a row multiply to about the middle one cubed — guess with a round number, then improve.',
        ex: { kind: 'three', n: 13 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        if (lv === 1) return this.q({ kind: 'consec', n: int(4, 14, r) });
        if (lv === 2) { if (r() < 0.5) return this.q({ kind: 'consec', n: int(12, 40, r) }); const a = int(2, 9, r); return this.q({ kind: 'sumprod', a, b: int(a + 2, 16, r) }); }
        if (r() < 0.5) return this.q({ kind: 'three', n: int(3, 24, r) });
        const a = int(3, 20, r); return this.q({ kind: 'sumprod', a, b: int(a + 3, 32, r) });
      });
    },
    q({ kind, n, a, b }) {
      if (kind === 'consec') return { kind, n, text: `Two whole numbers next to each other on the number line multiply to make ${n * (n + 1)}. What do they add up to?`,
        expr: `2*Math.floor(Math.sqrt(${n * (n + 1)}))+1`, ans: 2 * n + 1 };
      if (kind === 'sumprod') return { kind, a, b, text: `Two whole numbers add up to ${a + b} and multiply to make ${a * b}. What is the bigger number?`,
        expr: `(${a + b}+Math.sqrt(${a + b}*${a + b}-4*${a * b}))/2`, ans: b };
      const P = n * (n + 1) * (n + 2);
      return { kind, n, text: `Three whole numbers in a row multiply to make ${P}. What do they add up to?`,
        expr: `[...Array(200).keys()].find((k)=>k*(k+1)*(k+2)===${P})*3+3`, ans: 3 * n + 3 };
    },
    work({ kind, n, a, b }) {
      if (kind === 'consec') { const g = roundGuess(n);
        return [{ t: `Guess: ${g} × ${g + 1}`, v: g * (g + 1) }, { t: `Too ${g < n ? 'small, so go up' : 'big, so go down'}. Which smaller number works?`, v: n }, { t: `Add them: ${n} + ${n + 1}`, v: 2 * n + 1 }]; }
      if (kind === 'sumprod') { const S = a + b, h = Math.floor(S / 2);
        return [{ t: `Guess an even split: ${h} × ${S - h}`, v: h * (S - h) }, { t: 'Too big — spread them apart. Which smaller number works?', v: a }, { t: `The bigger one: ${S} − ${a}`, v: b }]; }
      const g = roundGuess(n);
      return [{ t: `Guess: ${g} × ${g + 1} × ${g + 2}`, v: g * (g + 1) * (g + 2) }, { t: `Too ${g < n ? 'small, so go up' : 'big, so go down'}. Which smallest number works?`, v: n }, { t: `Add them: ${n} + ${n + 1} + ${n + 2}`, v: 3 * n + 3 }];
    },
  },

  /* ---------------------------------------------------------------- make a table */
  {
    id: 'make-a-table', world: 'strategy', band: '8-10', title: 'Make a table',
    hook: 'Rafi has 30 and saves 4 a week. Ines has 6 and saves 10 a week. When do they have the same?',
    idea: 'Put the numbers in a table, one row at a time, and watch the pattern in the rows — it shows you the answer.',
    why: [
      'A story with things changing week by week is hard to hold in your head. A table holds it for you: one row for each week, one column for each person. You only ever work out the next row from the one above.',
      'After a row or two, look at what changes. Rafi is 24 ahead at the start; every week Ines gains 10 and Rafi gains 4, so the gap shrinks by 6. You do not need fifty rows — 24 ÷ 6 = 4 weeks.',
      'Tables also stop you missing anything when you count ways. Buying pencils and rulers to spend exactly 40? Write one row for each number of rulers and see which rows work. A tidy list cannot skip a case.',
    ],
    alg: 'gap ÷ (change in the gap each row) = rows needed',
    ex: { kind: 'catchup', A: 'Rafi', B: 'Ines', a: 30, p: 4, b: 6, q: 10 },
    caseKey: 'kind',
    cases: [
      { label: 'When are they equal?', note: 'Fill two rows, see how much the gap shrinks each week, and divide.',
        ex: { kind: 'catchup', A: 'Rafi', B: 'Ines', a: 30, p: 4, b: 6, q: 10 } },
      { label: 'When does a total pass?', note: 'Keep a running total in its own column, and stop on the first row that reaches it.',
        ex: { kind: 'total', A: 'Maya', s: 5, d: 3, T: 60 } },
      { label: 'Counting the ways', note: 'One row for each number of rulers; keep the rows that leave the right money for pencils.',
        ex: { kind: 'ways', A: 'Omar', p: 3, q: 5, T: 52 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const [A, B] = two(r);
        const catchup = (wl, wh, pl, ph) => { const w = int(wl, wh, r), p = int(pl, ph, r), q = p + int(1, lv === 1 ? 4 : 7, r), b = int(0, lv === 1 ? 10 : 30, r); return this.q({ kind: 'catchup', A, B, a: b + w * (q - p), p, b, q }); };
        if (lv === 1) return catchup(2, 6, 1, 5);
        if (lv === 2 && r() < 0.5) return catchup(3, 12, 2, 9);
        if (lv === 2 || r() < 0.4) {
          const s = int(lv === 2 ? 2 : 5, lv === 2 ? 8 : 15, r), d = int(1, lv === 2 ? 4 : 7, r), k = int(4, lv === 2 ? 7 : 9, r);
          const tot = (m) => m * s + (d * m * (m - 1)) / 2;
          return this.q({ kind: 'total', A, s, d, T: int(tot(k - 1) + 1, tot(k), r) });
        }
        for (let i = 0; i < 200; i++) {
          const [p, q] = pick([[2, 5], [3, 5], [4, 5], [2, 7], [3, 7], [4, 7], [3, 8], [5, 8]], r), T = int(30, 120, r);
          const ys = []; for (let y = 1; q * y < T; y++) if ((T - q * y) % p === 0) ys.push(y);
          if (ys.length >= 2) return this.q({ kind: 'ways', A, p, q, T });
        }
        return null;
      });
    },
    q(o) {
      const { kind, A } = o;
      if (kind === 'catchup') { const { B, a, p, b, q } = o;
        return { ...o, text: `${A} has ${a} coins in a money box and adds ${p} every week. ${B} has ${b} and adds ${q} every week. After how many weeks will they have the same amount?`,
          expr: `[...Array(500).keys()].find((k)=>${a}+${p}*k===${b}+${q}*k)`, ans: (a - b) / (q - p) }; }
      if (kind === 'total') { const { s, d, T } = o;
        let k = 0, tot = 0; while (tot < T) { k++; tot += s + (k - 1) * d; }
        return { ...o, text: `On day 1, ${A} reads ${s} pages. Every day after that, ${A} reads ${d} more pages than the day before. On which day does the total number of pages read first reach ${T}?`,
          expr: `[...Array(100).keys()].find((m)=>m>0&&m*${s}+${d}*m*(m-1)/2>=${T})`, ans: k }; }
      const { p, q, T } = o; let c = 0; for (let y = 1; q * y < T; y++) if ((T - q * y) % p === 0) c++;
      return { ...o, text: `Pencils cost ${p} coins each and rulers cost ${q} coins each. ${A} spends exactly ${T} coins and buys at least one of each. How many different ways could ${A} do it?`,
        expr: `(()=>{let n=0;for(let x=1;x<=${T};x++)for(let y=1;y<=${T};y++)if(${p}*x+${q}*y===${T})n++;return n;})()`, ans: c };
    },
    work(o) {
      const { kind, A } = o;
      if (kind === 'catchup') { const { B, a, p, b, q } = o;
        return [{ t: `After 1 week, ${A} has`, v: a + p }, { t: `After 1 week, ${B} has`, v: b + q }, { t: `The gap started at ${a - b}. Each week it closes by`, v: q - p }, { t: `Weeks to close a gap of ${a - b}`, v: (a - b) / (q - p) }]; }
      if (kind === 'total') { const { s, d, T } = o; const k = this.q(o).ans;
        return [{ t: 'Total for days 1, 2 and 3', v: 3 * s + 3 * d }, { t: `Keep the table going. How many pages are read on the day the total reaches ${T}?`, v: s + (k - 1) * d }, { t: 'Which day is that?', v: k }]; }
      const { p, q, T } = o; const ys = []; for (let y = 1; q * y < T; y++) if ((T - q * y) % p === 0) ys.push(y);
      return [{ t: `Fewest rulers that leave a multiple of ${p} coins`, v: ys[0] }, { t: 'Most rulers that still leave money for a pencil', v: ys.at(-1) }, { t: `The rulers that work go up ${p} at a time. How many ways?`, v: ys.length }];
    },
    draw(o) {
      const { kind, A } = o;
      if (kind === 'catchup') { const { B, a, p, b, q } = o;
        return table(['Week', A, B], [[0, a, b], [1, a + p, b + q], ['…', '…', '…'], ['?', '', '']], `A table of weeks with ${A}'s and ${B}'s coins`); }
      if (kind === 'total') { const { s, d } = o;
        return table(['Day', 'Pages', 'Total'], [[1, s, s], [2, s + d, 2 * s + d], ['…', '…', '…'], ['?', '', '']], 'A table of days, pages read and the running total'); }
      const { q, T } = o;
      return table(['Rulers', 'Cost', 'Left'], [[1, q, T - q], [2, 2 * q, T - 2 * q], ['…', '…', '…']], 'A table of how many rulers and the money left for pencils');
    },
  },

  /* ---------------------------------------------------------------- nth term
     PAPER-CONTRACT names this strategy `nth-term`, but that id already belongs
     to Set Island's 11–14 stop (the algebra of Tₙ = a + (n − 1)d). This is the
     8–10 way in to the same idea — find the step, step back to shape 0 — so it
     carries its own id; the problem bank should tag `find-the-rule`. */
  {
    id: 'find-the-rule', world: 'strategy', band: '8-10', title: 'Find the rule',
    hook: 'Shape 1 uses 4 matchsticks, shape 2 uses 7, shape 3 uses 10. How many does shape 25 use?',
    idea: 'Find what is added each time, step back to "shape 0", and then shape n is shape 0 plus n lots of the step.',
    why: [
      'You could build all 25 shapes — but the pattern tells you a shortcut. Each new square in the row adds 3 more sticks, so the numbers go up by 3 every time: 4, 7, 10, 13…',
      'Now step backwards once, to an imaginary "shape 0": 4 − 3 = 1 stick. Every shape is that 1 stick plus some 3s — shape 1 has one 3, shape 2 has two, so shape 25 has twenty-five: 1 + 25 × 3 = 76.',
      'The same rule runs backwards. Which shape uses 61 sticks? Take off the shape-0 part: 61 − 1 = 60. That is 60 ÷ 3 = 20 lots of 3, so it is shape 20.',
    ],
    alg: 'shape n = (shape 1 − d) + n × d',
    ex: { kind: 'term', thing: 'matchsticks', a: 4, d: 3, n: 25 },
    caseKey: 'kind',
    cases: [
      { label: 'How many in shape n?', note: 'Shape 0 plus n lots of the step — no need to build the ones in between.',
        ex: { kind: 'term', thing: 'matchsticks', a: 4, d: 3, n: 25 } },
      { label: 'Which shape uses this many?', note: 'Run the rule backwards: take off shape 0, then see how many steps are left.',
        ex: { kind: 'which', thing: 'matchsticks', a: 4, d: 3, n: 20 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const thing = pick(['matchsticks', 'counters', 'tiles'], r);
        const d = int(2, lv === 1 ? 5 : lv === 2 ? 7 : 9, r), a = d + int(1, lv === 1 ? 4 : 8, r);
        if (lv === 1) return this.q({ kind: 'term', thing, a, d, n: int(5, 12, r) });
        if (lv === 2) return r() < 0.5 ? this.q({ kind: 'term', thing, a, d, n: int(10, 30, r) }) : this.q({ kind: 'which', thing, a, d, n: int(6, 20, r) });
        return r() < 0.5 ? this.q({ kind: 'term', thing, a, d, n: int(40, 100, r) }) : this.q({ kind: 'which', thing, a, d, n: int(20, 80, r) });
      });
    },
    q({ kind, thing, a, d, n }) {
      const head = `A pattern of ${thing}: shape 1 uses ${a}, shape 2 uses ${a + d} and shape 3 uses ${a + 2 * d}.`, T = a + (n - 1) * d;
      if (kind === 'term') return { kind, thing, a, d, n, text: `${head} If the pattern carries on, how many ${thing} does shape ${n} use?`,
        expr: `[...Array(${n - 1})].reduce((s)=>s+${d},${a})`, ans: T };
      return { kind, thing, a, d, n, text: `${head} If the pattern carries on, which shape uses exactly ${T}?`,
        expr: `[...Array(1000).keys()].find((k)=>k>0&&${a}+(k-1)*${d}===${T})`, ans: n };
    },
    work({ kind, a, d, n }) {
      const z = a - d, T = a + (n - 1) * d, s = [{ t: 'How many more each time?', v: d }, { t: 'Step back one: how many in "shape 0"?', v: z }];
      if (kind === 'term') return [...s, { t: `${n} lots of ${d}: ${n} × ${d}`, v: n * d }, { t: `Add shape 0: ${n * d} + ${z}`, v: T }];
      return [...s, { t: `Take off shape 0: ${T} − ${z}`, v: T - z }, { t: `How many lots of ${d}?`, v: n }];
    },
    draw({ a, d }) {
      const u = 11; let s = '', W = 0;
      for (let k = 1; k <= 3; k++) {
        const y = 12 + (k - 1) * 30, total = a + (k - 1) * d;
        s += text(4, y + 5, `Shape ${k}`, 'dg-small', 'start');
        for (let i = 0; i < total; i++) {
          const grp = i < a - d ? -1 : Math.floor((i - (a - d)) / d), x = 70 + i * u + Math.max(0, grp) * 4;
          s += `<circle cx="${x}" cy="${y}" r="4.5" class="${grp < 0 ? 'dg-fill2' : grp % 2 ? 'dg-fill3' : 'dg-dot'}"/>`; W = Math.max(W, x);
        }
      }
      return svg(W + 14, 100, s, 'The first three shapes of the pattern, as rows of dots');
    },
  },

  /* ---------------------------------------------------------------- bar model */
  {
    id: 'bar-model', world: 'strategy', band: '8-10', title: 'Draw the bars',
    hook: 'Suki and Pip have 52 shells. Pip has 14 more than Suki. How many has Pip — without guessing?',
    idea: 'Draw each amount as a bar, make the bars the same size, and the total shares out into equal bars.',
    why: [
      'Draw Suki\'s shells as a bar. Pip\'s bar is the same length plus an extra piece of 14. Both bars together are 52. Now cut off the extra piece: 52 − 14 = 38 is two EQUAL bars, so one bar is 19.',
      '"Three times as many" is three equal bars against one. Together that is four equal bars, so share the total by 4. The bars turn a puzzle in words into a sharing sum.',
      'When one person gives some to another and they end up equal, look at the gap. If Asha has 3 bars and Ben 1, the gap is 2 bars. Giving 10 away makes Asha 10 smaller AND Ben 10 bigger, so it closes a gap of 20 — and 2 bars = 20 means one bar is 10.',
    ],
    alg: 'bigger = (total + difference) ÷ 2 · one bar = total ÷ number of bars',
    ex: { kind: 'sumdiff', A: 'Pip', B: 'Suki', a: 19, D: 14, thing: 'shells' },
    caseKey: 'kind',
    cases: [
      { label: 'A total and a difference', note: 'Cut the extra piece off, and what is left is two equal bars.',
        ex: { kind: 'sumdiff', A: 'Pip', B: 'Suki', a: 19, D: 14, thing: 'shells' } },
      { label: 'Times as many', note: 'Draw the bigger amount as several copies of the smaller bar, then count the bars.',
        ex: { kind: 'times', A: 'Femi', B: 'Gita', x: 12, k: 3, thing: 'stamps' } },
      { label: 'Give some, then equal', note: 'Giving closes the gap from BOTH ends, so it closes twice the amount given.',
        ex: { kind: 'transfer', A: 'Asha', B: 'Ben', x: 10, k: 3, thing: 'cards' } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const [A, B] = two(r), thing = pick(['shells', 'stamps', 'cards', 'beads', 'conkers'], r);
        if (lv === 1) return r() < 0.5 ? this.q({ kind: 'sumdiff', A, B, a: int(3, 25, r), D: int(2, 15, r), thing }) : this.q({ kind: 'times', A, B, x: int(2, 12, r), k: int(2, 3, r), thing });
        if (lv === 2) return r() < 0.5 ? this.q({ kind: 'sumdiff', A, B, a: int(10, 120, r), D: int(5, 60, r), thing }) : this.q({ kind: 'times', A, B, x: int(5, 40, r), k: int(2, 6, r), thing });
        const k = int(2, 5, r); let x = int(2, 30, r); if (((k - 1) * x) % 2) x++;
        return this.q({ kind: 'transfer', A, B, x, k, thing });
      });
    },
    q(o) {
      const { kind, A, B, thing } = o;
      if (kind === 'sumdiff') { const { a, D } = o, S = 2 * a + D;
        return { ...o, text: `${A} and ${B} have ${S} ${thing} altogether. ${A} has ${D} more than ${B}. How many does ${A} have?`, expr: `(${S}+${D})/2`, ans: a + D }; }
      if (kind === 'times') { const { x, k } = o, T = (k + 1) * x;
        return { ...o, text: `${A} has ${k} times as many ${thing} as ${B}. Together they have ${T}. How many does ${A} have?`, expr: `${T}-${T}/(${k}+1)`, ans: k * x }; }
      const { x, k } = o, g = ((k - 1) * x) / 2;
      return { ...o, text: `${A} has ${k} times as many ${thing} as ${B}. When ${A} gives ${B} ${g} ${thing}, they have the same number. How many ${thing} did ${A} have at the start?`,
        expr: `[...Array(3000).keys()].find((n)=>n%${k}===0&&n-${g}===n/${k}+${g})`, ans: k * x };
    },
    work(o) {
      const { kind, A } = o;
      if (kind === 'sumdiff') { const { a, D } = o, S = 2 * a + D;
        return [{ t: `Cut off the extra: ${S} − ${D}`, v: S - D }, { t: `Two equal bars: ${S - D} ÷ 2`, v: a }, { t: `${A} is one bar and the extra: ${a} + ${D}`, v: a + D }]; }
      if (kind === 'times') { const { x, k } = o, T = (k + 1) * x;
        return [{ t: `How many equal bars? ${k} + 1`, v: k + 1 }, { t: `One bar: ${T} ÷ ${k + 1}`, v: x }, { t: `${A} has ${k} bars: ${k} × ${x}`, v: k * x }]; }
      const { x, k } = o, g = ((k - 1) * x) / 2;
      return [{ t: `How many bars is the gap? ${k} − 1`, v: k - 1 }, { t: `Giving ${g} closes the gap from both ends: ${g} + ${g}`, v: 2 * g }, { t: `One bar: ${2 * g} ÷ ${k - 1}`, v: x }, { t: `${A} started with ${k} bars: ${k} × ${x}`, v: k * x }];
    },
    draw(o) {
      const { kind, A, B } = o, u = 48;
      if (kind === 'sumdiff') return bars([{ name: A, parts: [{ w: u * 2 }, { w: 44, t: o.D, cls: 'dg-fill2' }] }, { name: B, parts: [{ w: u * 2 }] }], `${2 * o.a + o.D} in all`, `Two bars, ${A}'s longer by an extra piece`);
      const unit = o.k > 4 ? 36 : u, row = (n) => Array.from({ length: n }, () => ({ w: unit }));
      if (kind === 'times') return bars([{ name: A, parts: row(o.k) }, { name: B, parts: row(1) }], `${(o.k + 1) * o.x} in all`, `${A}'s bar is ${o.k} copies of ${B}'s`);
      return bars([{ name: A, parts: row(o.k) }, { name: B, parts: row(1) }], '', `${A}'s bar is ${o.k} copies of ${B}'s`, `${A} gives ${B} ${((o.k - 1) * o.x) / 2}, and then they are equal`);
    },
  },

  /* ---------------------------------------------------------------- heads and legs */
  {
    id: 'heads-and-legs', world: 'strategy', band: '8-10', title: 'Pretend they are all the same',
    hook: 'A farm has hens and goats: 12 heads and 34 legs. How many goats?',
    idea: 'Pretend everything is the cheaper kind, see how far short you fall, and each swap to the other kind makes up the difference.',
    why: [
      'Imagine all 12 animals were hens. That is 12 × 2 = 24 legs. But there are 34 — so 10 legs are not explained yet. Something must be a goat.',
      'Swapping one hen for a goat keeps the heads the same and adds 2 legs (a goat has 4, a hen 2). To find 10 more legs you need 10 ÷ 2 = 5 swaps. So there are 5 goats — and 7 hens. Check: 7 × 2 + 5 × 4 = 34.',
      'The same trick works for coins (pretend they are all the small coin) and for quiz scores (pretend every answer was right — each wrong one costs the points you did not win AND the points you lost). Pretend, measure the gap, and divide by what one swap is worth.',
    ],
    alg: 'big kind = (total − count × small) ÷ (big − small)',
    ex: { kind: 'legs', c: 0, H: 12, y: 5 },
    caseKey: 'kind',
    cases: [
      { label: 'Heads and legs', note: 'Pretend they are all the kind with fewer legs; each swap adds the difference in legs.',
        ex: { kind: 'legs', c: 0, H: 12, y: 5 } },
      { label: 'Two kinds of coin', note: 'Pretend they are all the smaller coin; each swap adds the difference in value.',
        ex: { kind: 'coins', A: 'Jai', lo: 2, hi: 5, H: 15, y: 6 } },
      { label: 'Points won and lost', note: 'Pretend every answer was right; each wrong answer costs the points not won AND the points lost.',
        ex: { kind: 'penalty', A: 'Zoe', n: 20, a: 5, b: 2, w: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        if (lv === 1) { const H = int(5, 14, r); return this.q({ kind: 'legs', c: int(0, 1, r), H, y: int(1, H - 1, r) }); }
        if (lv === 2) {
          if (r() < 0.5) { const H = int(10, 40, r); return this.q({ kind: 'legs', c: int(0, 2, r), H, y: int(1, H - 1, r) }); }
          const [lo, hi] = pick([[2, 5], [1, 2], [5, 10], [2, 10], [1, 5]], r), H = int(8, 30, r);
          return this.q({ kind: 'coins', A: pick(NAMES, r), lo, hi, H, y: int(1, H - 1, r) });
        }
        if (r() < 0.3) { const H = int(20, 60, r); return this.q({ kind: 'legs', c: 2, H, y: int(1, H - 1, r) }); }
        const n = pick([10, 15, 20, 25, 30], r), a = int(3, 6, r), b = int(1, a - 1, r);
        for (let i = 0; i < 50; i++) { const w = int(1, n - 1, r); if (a * (n - w) - b * w > 0) return this.q({ kind: 'penalty', A: pick(NAMES, r), n, a, b, w }); }
        return null;
      });
    },
    q(o) {
      if (o.kind === 'legs') { const C = CREATURES[o.c], L = C.a * (o.H - o.y) + C.b * o.y;
        return { ...o, text: `${C.where}: ${o.H} ${C.whole} and ${L} ${C.part} altogether. How many ${C.hi} are there?`,
          expr: `[...Array(${o.H + 1}).keys()].find((y)=>${C.a}*(${o.H}-y)+${C.b}*y===${L})`, ans: o.y }; }
      if (o.kind === 'coins') { const V = o.lo * (o.H - o.y) + o.hi * o.y;
        return { ...o, text: `${o.A}'s jar has ${o.H} coins. Some are ${o.lo}s and the rest are ${o.hi}s, and together they make ${V}. How many ${o.hi}s are there?`,
          expr: `[...Array(${o.H + 1}).keys()].find((y)=>${o.lo}*(${o.H}-y)+${o.hi}*y===${V})`, ans: o.y }; }
      const { n, a, b, w } = o, s = a * (n - w) - b * w;
      return { ...o, text: `A quiz has ${n} questions. A right answer scores ${a} points and a wrong answer loses ${b}. ${o.A} answered every question and scored ${s}. How many did ${o.A} get right?`,
        expr: `[...Array(${n + 1}).keys()].find((k)=>${a}*k-${b}*(${n}-k)===${s})`, ans: n - w };
    },
    work(o) {
      if (o.kind === 'penalty') { const { n, a, b, w } = o, s = a * (n - w) - b * w;
        return [{ t: `If all ${n} were right: ${n} × ${a}`, v: n * a }, { t: `Points short: ${n * a} − ${s}`, v: n * a - s }, { t: `Each wrong answer costs ${a} + ${b}`, v: a + b }, { t: `Wrong answers: ${n * a - s} ÷ ${a + b}`, v: w }, { t: `Right answers: ${n} − ${w}`, v: n - w }]; }
      const [lo, hi, small, one, part] = o.kind === 'legs' ? [CREATURES[o.c].a, CREATURES[o.c].b, CREATURES[o.c].lo, CREATURES[o.c].one, ' ' + CREATURES[o.c].part] : [o.lo, o.hi, `${o.lo}s`, `${o.hi}`, ''];
      const tot = lo * (o.H - o.y) + hi * o.y, extra = tot - o.H * lo;
      return [{ t: `If all ${o.H} were ${small}: ${o.H} × ${lo}`, v: o.H * lo }, { t: `Still to explain: ${tot} − ${o.H * lo}`, v: extra }, { t: `Each swap to a ${one} adds ${hi} − ${lo}${part}`, v: hi - lo }, { t: `Swaps: ${extra} ÷ ${hi - lo}`, v: o.y }];
    },
  },

  /* ---------------------------------------------------------------- age problems */
  {
    id: 'age-problems', world: 'strategy', band: '8-10', title: 'The gap never changes',
    hook: 'Dax is 11 and his uncle is 37. In how many years will his uncle be exactly twice as old?',
    idea: 'Two people always stay the same number of years apart — so pin the question to the gap, which never moves.',
    why: [
      'Every birthday, both people get one year older. So the GAP between their ages never changes: if Dax is 26 years younger than his uncle today, he will be 26 years younger for ever.',
      'When the uncle is twice Dax\'s age, his age is Dax\'s age plus Dax\'s age again. That second "Dax\'s age" is the gap! So Dax will be 26, which is 26 − 11 = 15 years from now. For "three times as old", the gap is TWO lots of the younger age, so halve it.',
      'Totals are different: they DO change, by 2 every year, because two people each get a year older. Whatever the question, ask first: what stays the same, and what changes by how much?',
    ],
    alg: 'older = k × younger ⇒ younger = gap ÷ (k − 1)',
    ex: { kind: 'times', A: 'Dax', rel: 'uncle', c: 11, M: 37, k: 2 },
    caseKey: 'kind',
    cases: [
      { label: 'When will the total be…?', note: 'The total of two ages grows by 2 every year — one year each.',
        ex: { kind: 'sum', A: 'Maya', B: 'Hugo', a: 7, b: 10, T: 31 } },
      { label: 'When will one be k times…?', note: 'The gap stays fixed; when one is k times the other, the gap is (k − 1) lots of the younger age.',
        ex: { kind: 'times', A: 'Dax', rel: 'uncle', c: 11, M: 37, k: 2 } },
      { label: 'How long ago was it?', note: 'Same gap, other direction: find how old the younger one was then, and count back to it.',
        ex: { kind: 'ago', A: 'Priya', rel: 'gran', c: 12, M: 68, k: 8 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const [A, B] = two(r);
        if (lv === 1 || (lv === 2 && r() < 0.35)) { const a = int(3, 12, r), b = int(3, 14, r), y = int(2, lv === 1 ? 10 : 25, r); return this.q({ kind: 'sum', A, B, a, b, T: a + b + 2 * y }); }
        const kind = lv === 2 ? 'times' : pick(['times', 'ago'], r), k = lv === 2 ? 2 : int(3, 6, r);
        for (let i = 0; i < 300; i++) {
          const c = int(2, 15, r), M = int(20, 80, r), G = M - c;
          if (G % (k - 1)) continue;
          const then = G / (k - 1);
          // ages a real family has: nobody over 90 when the moment comes, and a relation who fits the gap
          if (kind === 'times' ? then > c && M + then - c <= 90 : then >= 1 && then < c)
            return this.q({ kind, A, rel: pick(G >= 45 ? ['gran', 'grandad'] : G >= 20 ? ['aunt', 'uncle', 'mum', 'dad'] : ['big sister', 'big brother', 'cousin'], r), c, M, k });
        }
        return null;
      });
    },
    q(o) {
      if (o.kind === 'sum') { const { A, B, a, b, T } = o;
        return { ...o, text: `${A} is ${a} and ${B} is ${b}. In how many years will their ages add up to ${T}?`, expr: `[...Array(200).keys()].find((y)=>${a}+y+${b}+y===${T})`, ans: (T - a - b) / 2 }; }
      const { A, rel, c, M, k } = o, twice = k === 2 ? 'twice' : `${k} times`;
      if (o.kind === 'times') return { ...o, text: `${A} is ${c} and ${A}'s ${rel} is ${M}. In how many years will ${A}'s ${rel} be exactly ${twice} as old as ${A}?`,
        expr: `[...Array(200).keys()].find((y)=>${M}+y===${k}*(${c}+y))`, ans: (M - c) / (k - 1) - c };
      return { ...o, text: `${A} is ${c} and ${A}'s ${rel} is ${M}. How many years ago was ${A}'s ${rel} exactly ${twice} as old as ${A}?`,
        expr: `[...Array(${c}).keys()].find((y)=>${M}-y===${k}*(${c}-y))`, ans: c - (M - c) / (k - 1) };
    },
    work(o) {
      if (o.kind === 'sum') { const { a, b, T } = o;
        return [{ t: `Their ages add up to ${a} + ${b} now`, v: a + b }, { t: `Still to go: ${T} − ${a + b}`, v: T - a - b }, { t: 'Each year, the total grows by', v: 2 }, { t: `Years: ${T - a - b} ÷ 2`, v: (T - a - b) / 2 }]; }
      const { A, c, M, k } = o, G = M - c, then = G / (k - 1);
      return [{ t: `The gap: ${M} − ${c}`, v: G }, { t: k === 2 ? `It never changes. When it is twice, ${A}'s age equals the gap. So ${A} is then` : `It never changes. At ${k} times, the gap is ${k - 1} lots of ${A}'s age. So ${A} is then ${G} ÷ ${k - 1}`, v: then },
        o.kind === 'times' ? { t: `Years from now: ${then} − ${c}`, v: then - c } : { t: `Years ago: ${c} − ${then}`, v: c - then }];
    },
  },

  /* ---------------------------------------------------------------- simpler case */
  {
    id: 'simpler-case', world: 'strategy', band: '8-10', title: 'Try a smaller one first',
    hook: 'A 60-metre fence has a post every 5 metres, at both ends too. Is it 12 posts? Try a tiny fence first.',
    idea: 'When a problem is too big to picture, solve a tiny version you CAN draw, spot the rule, then use it on the big one.',
    why: [
      'A 60-metre fence is too long to draw, so draw a 10-metre one with a post every 5 metres. Count: post, gap, post, gap, post — 3 posts but only 2 gaps. The posts are always one more than the gaps. So the real fence has 60 ÷ 5 = 12 gaps and 13 posts.',
      'The tiny case catches the trap that the quick answer falls into. Cutting a log into 3 pieces takes only 2 cuts, so pieces are one more than cuts. Round a pond, though, the last gap joins back to the first post, so trees and gaps are equal. Drawing a tiny ring shows it.',
      'Some big counts are built from small ones. To count the digits on pages 1 to 120, do pages 1–9 (one digit each), then 10–99 (two each), then 100–120 (three each). Each small part is easy; the trick is cutting the problem where the rule changes.',
    ],
    alg: 'posts in a line = gaps + 1 · posts in a ring = gaps · pieces = cuts + 1',
    ex: { kind: 'posts', L: 60, g: 5 },
    caseKey: 'kind',
    cases: [
      { label: 'Posts along a line', note: 'A tiny fence shows it: posts are one more than the gaps.',
        ex: { kind: 'posts', L: 60, g: 5 } },
      { label: 'Cuts and pieces', note: 'Two cuts make three pieces — the cuts are one fewer than the pieces.',
        ex: { kind: 'cuts', n: 6, t: 4 } },
      { label: 'All the way round', note: 'In a ring the last gap meets the first post, so trees and gaps are equal.',
        ex: { kind: 'ring', P: 120, g: 8 } },
      { label: 'Digits on the pages', note: 'Split where the rule changes: one-digit pages, two-digit pages, three-digit pages.',
        ex: { kind: 'digits', N: 120 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        if (lv === 1) return r() < 0.5 ? (() => { const g = pick([2, 3, 4, 5, 10], r); return this.q({ kind: 'posts', L: g * int(3, 12, r), g }); })() : this.q({ kind: 'cuts', n: int(3, 8, r), t: int(2, 9, r) });
        if (lv === 2) {
          const k = pick(['posts', 'ring', 'cuts', 'digits'], r), g = pick([3, 4, 5, 6, 8, 10, 12, 15], r);
          if (k === 'posts') return this.q({ kind: 'posts', L: g * int(8, 30, r), g });
          if (k === 'ring') return this.q({ kind: 'ring', P: g * int(6, 30, r), g });
          if (k === 'cuts') return this.q({ kind: 'cuts', n: int(6, 15, r), t: int(3, 12, r) });
          return this.q({ kind: 'digits', N: int(15, 99, r) });
        }
        if (r() < 0.6) return this.q({ kind: 'digits', N: int(100, 999, r) });
        const g = pick([4, 5, 6, 8, 12, 15, 25], r);
        return r() < 0.5 ? this.q({ kind: 'posts', L: g * int(20, 60, r), g }) : this.q({ kind: 'ring', P: g * int(20, 60, r), g });
      });
    },
    q(o) {
      if (o.kind === 'posts') return { ...o, text: `A straight fence is ${o.L} metres long. There is a post every ${o.g} metres, with a post at each end. How many posts are there?`,
        expr: `(()=>{let n=0;for(let m=0;m<=${o.L};m+=${o.g})n++;return n;})()`, ans: o.L / o.g + 1 };
      if (o.kind === 'cuts') return { ...o, text: `It takes ${o.t} minutes to saw a log in two. How many minutes does it take to saw a log the same size into ${o.n} pieces?`,
        expr: `(()=>{let p=1,m=0;while(p<${o.n}){p++;m+=${o.t};}return m;})()`, ans: (o.n - 1) * o.t };
      if (o.kind === 'ring') return { ...o, text: `The path all the way round a pond is ${o.P} metres long. Trees are planted along it, ${o.g} metres apart, all the way round. How many trees are there?`,
        expr: `(()=>{let n=0;for(let m=0;m<${o.P};m+=${o.g})n++;return n;})()`, ans: o.P / o.g };
      return { ...o, text: `The pages of a book are numbered from 1 to ${o.N}. How many digits are printed altogether?`,
        expr: `Array.from({length:${o.N}},(_,i)=>String(i+1).length).reduce((a,b)=>a+b,0)`, ans: o.N < 100 ? 9 + 2 * (o.N - 9) : 189 + 3 * (o.N - 99) };
    },
    work(o) {
      if (o.kind === 'posts') return [{ t: `Tiny fence first: ${2 * o.g} metres. How many posts?`, v: 3 }, { t: `So posts = gaps + 1. Gaps in the real fence: ${o.L} ÷ ${o.g}`, v: o.L / o.g }, { t: `Posts: ${o.L / o.g} + 1`, v: o.L / o.g + 1 }];
      if (o.kind === 'cuts') return [{ t: 'Tiny case first: how many cuts make 3 pieces?', v: 2 }, { t: `So cuts = pieces − 1. Cuts for ${o.n} pieces`, v: o.n - 1 }, { t: `Minutes: ${o.n - 1} × ${o.t}`, v: (o.n - 1) * o.t }];
      if (o.kind === 'ring') return [{ t: 'Tiny ring first: 3 gaps round a circle. How many trees?', v: 3 }, { t: `In a ring, trees = gaps. Gaps: ${o.P} ÷ ${o.g}`, v: o.P / o.g }];
      if (o.N < 100) return [{ t: 'Pages 1 to 9: one digit each', v: 9 }, { t: `Pages 10 to ${o.N}: ${o.N - 9} pages × 2`, v: 2 * (o.N - 9) }, { t: `Add: 9 + ${2 * (o.N - 9)}`, v: 9 + 2 * (o.N - 9) }];
      return [{ t: 'Pages 1 to 9: one digit each', v: 9 }, { t: 'Pages 10 to 99: 90 pages × 2', v: 180 }, { t: `Pages 100 to ${o.N}: ${o.N - 99} pages × 3`, v: 3 * (o.N - 99) }, { t: `Add: 9 + 180 + ${3 * (o.N - 99)}`, v: 189 + 3 * (o.N - 99) }];
    },
    draw(o) {
      if (o.kind === 'posts') { let s = `<line x1="20" y1="44" x2="220" y2="44" class="dg-line"/>`;
        [20, 120, 220].forEach((x) => { s += `<rect x="${x - 5}" y="18" width="10" height="40" rx="2" class="dg-fill2"/>`; });
        s += text(70, 76, `${o.g} m`, 'dg-small') + text(170, 76, `${o.g} m`, 'dg-small');
        return svg(240, 84, s, 'A tiny fence: three posts and two gaps'); }
      if (o.kind === 'ring') { let s = `<circle cx="70" cy="70" r="50" class="dg-blank"/>`;
        for (let i = 0; i < 3; i++) { const a = (i / 3) * 2 * Math.PI - Math.PI / 2; s += `<circle cx="${(70 + 50 * Math.cos(a)).toFixed(1)}" cy="${(70 + 50 * Math.sin(a)).toFixed(1)}" r="9" class="dg-fill3"/>`; }
        return svg(140, 140, s, 'A tiny ring: three trees and three gaps'); }
      if (o.kind === 'cuts') { let s = '';
        [[10, 70], [86, 70], [162, 70]].forEach(([x, w], i) => { s += `<rect x="${x}" y="16" width="${w}" height="36" rx="${i === 1 ? 2 : 10}" class="dg-fill2"/>`; });
        s += `<line x1="83" y1="6" x2="83" y2="62" class="dg-hand2"/><line x1="159" y1="6" x2="159" y2="62" class="dg-hand2"/>`;
        return svg(244, 68, s, 'A tiny case: a log in three pieces, with two cuts'); }
      const g = [['1 – 9', '1 digit'], ['10 – 99', '2 digits']]; if (o.N >= 100) g.push([`100 – ${o.N}`, '3 digits']);
      let s = ''; g.forEach(([a, b], i) => { s += `<rect x="${4 + i * 112}" y="4" width="104" height="52" rx="8" class="dg-fill${i + 1}"/>` + text(56 + i * 112, 26, a, 'dg-text') + text(56 + i * 112, 46, b, 'dg-small'); });
      return svg(8 + g.length * 112, 60, s, 'The pages cut where the number of digits changes');
    },
  },

  /* ---------------------------------------------------------------- meeting and overtaking */
  {
    id: 'meeting-and-overtaking', world: 'strategy', band: '8-10', title: 'Closing the gap',
    hook: 'Nova and Suki are 900 m apart and walk towards each other at 70 and 80 metres a minute. When do they meet?',
    idea: 'Watch the GAP, not the people: find how much it shrinks each minute, and divide.',
    why: [
      'Two people walking towards each other both eat up the gap between them. In one minute Nova covers 70 m and Suki 80 m, so the gap shrinks by 70 + 80 = 150 m. A 900 m gap takes 900 ÷ 150 = 6 minutes to close.',
      'When one chases the other in the same direction, the faster one gains only the DIFFERENCE in speeds each minute. If Bea walks 60 m a minute and Cal cycles 200, Cal closes the gap by 140 m every minute.',
      'Once you know WHEN they meet, WHERE is easy: it is how far one of them has gone by then. Always check: the two distances should add up to the whole gap (meeting) or be equal (catching up).',
    ],
    alg: 'meet: time = gap ÷ (sum of speeds) · catch: time = head start ÷ (difference of speeds)',
    ex: { kind: 'meet', A: 'Nova', B: 'Suki', p: 70, q: 80, t: 6 },
    caseKey: 'kind',
    cases: [
      { label: 'Towards each other: when?', note: 'Both shrink the gap, so add the speeds.',
        ex: { kind: 'meet', A: 'Nova', B: 'Suki', p: 70, q: 80, t: 6 } },
      { label: 'Towards each other: where?', note: 'Find when first, then how far one of them has walked by then.',
        ex: { kind: 'where', A: 'Chen', B: 'Ela', p: 60, q: 90, t: 4 } },
      { label: 'Catching up: when?', note: 'Same direction, so only the difference in speeds closes the gap.',
        ex: { kind: 'catch', A: 'Bea', B: 'Cal', p: 60, q: 200, h: 7 } },
      { label: 'Catching up: where?', note: 'Find when the chaser catches up, then how far the chaser has gone.',
        ex: { kind: 'catchwhere', A: 'Sami', B: 'Yusuf', p: 50, q: 150, h: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(this, () => {
        const [A, B] = two(r);
        const meet = (kind) => { const p = 10 * int(3, 9, r), q = 10 * int(3, 9, r); return this.q({ kind, A, B, p, q, t: int(2, lv === 1 ? 6 : 15, r) }); };
        const chase = (kind) => { for (let i = 0; i < 300; i++) { const p = 10 * int(4, 8, r), q = 10 * int(9, 25, r), h = int(2, 12, r); if ((p * h) % (q - p) === 0) return this.q({ kind, A, B, p, q, h }); } return null; };
        if (lv === 1) return meet('meet');
        if (lv === 2) return r() < 0.5 ? meet('meet') : chase('catch');
        return r() < 0.5 ? meet('where') : chase('catchwhere');
      });
    },
    q(o) {
      const { kind, A, B, p, q } = o;
      if (kind === 'meet' || kind === 'where') { const d = (p + q) * o.t;
        const head = `${A} and ${B} are ${d} metres apart and walk towards each other. ${A} walks ${p} metres a minute and ${B} walks ${q} metres a minute.`;
        if (kind === 'meet') return { ...o, text: `${head} After how many minutes do they meet?`, expr: `[...Array(1000).keys()].find((m)=>${p}*m+${q}*m>=${d})`, ans: o.t };
        return { ...o, text: `${head} How many metres from ${A}'s starting point do they meet?`, expr: `(()=>{let a=0,b=${d};while(a<b){a+=${p};b-=${q};}return a;})()`, ans: p * o.t }; }
      const { h } = o, t = (p * h) / (q - p);
      const head = `${A} sets off along a path, walking ${p} metres a minute. ${h} minutes later ${B} sets off from the same place, cycling ${q} metres a minute.`;
      if (kind === 'catch') return { ...o, text: `${head} How many minutes after ${B} sets off does ${B} catch up with ${A}?`, expr: `[...Array(1000).keys()].find((m)=>m>0&&${q}*m===${p}*(m+${h}))`, ans: t };
      return { ...o, text: `${head} How many metres from the start does ${B} catch up with ${A}?`, expr: `(()=>{let a=${p * h},b=0;while(b<a){a+=${p};b+=${q};}return b;})()`, ans: q * t };
    },
    work(o) {
      const { kind, A, B, p, q } = o;
      if (kind === 'meet' || kind === 'where') { const d = (p + q) * o.t, s = [{ t: `Each minute the gap shrinks by ${p} + ${q}`, v: p + q }, { t: `Minutes: ${d} ÷ ${p + q}`, v: o.t }];
        return kind === 'meet' ? s : [...s, { t: `${A} walks ${o.t} × ${p}`, v: p * o.t }]; }
      const { h } = o, t = (p * h) / (q - p), s = [{ t: `${A}'s head start: ${h} × ${p}`, v: p * h }, { t: `Each minute ${B} gains ${q} − ${p}`, v: q - p }, { t: `Minutes to catch up: ${p * h} ÷ ${q - p}`, v: t }];
      return kind === 'catch' ? s : [...s, { t: `${B} cycles ${t} × ${q}`, v: q * t }];
    },
    draw(o) {
      const { kind, A, B, p, q } = o; let s = '';
      const arrow = (x, dir, y) => `<line x1="${x}" y1="${y}" x2="${x + dir * 40}" y2="${y}" class="dg-line"/><path d="M${x + dir * 34},${y - 5} L${x + dir * 40},${y} L${x + dir * 34},${y + 5}" class="dg-line"/>`;
      if (kind === 'meet' || kind === 'where') {
        s += `<line x1="30" y1="60" x2="330" y2="60" class="dg-line"/><circle cx="30" cy="60" r="9" class="dg-fill1"/><circle cx="330" cy="60" r="9" class="dg-fill3"/>`;
        s += arrow(46, 1, 40) + arrow(314, -1, 40) + text(30, 24, `${A}: ${p} m/min`, 'dg-small', 'start') + text(330, 24, `${B}: ${q} m/min`, 'dg-small', 'end') + text(180, 86, `${(p + q) * o.t} m apart`, 'dg-text');
        return svg(360, 96, s, `${A} and ${B} walking towards each other`);
      }
      s += `<line x1="30" y1="60" x2="330" y2="60" class="dg-line"/><circle cx="30" cy="60" r="9" class="dg-fill3"/><circle cx="110" cy="60" r="9" class="dg-fill1"/>`;
      s += arrow(126, 1, 40) + arrow(46, 1, 40) + text(110, 24, `${A}: ${p} m/min`, 'dg-small', 'start') + text(20, 86, `${B}: ${q} m/min, ${o.h} min later`, 'dg-small', 'start');
      return svg(360, 96, s, `${B} chasing ${A} along the same path`);
    },
  },

  /* ---------------------------------------------------------------- units digit cycles */
  {
    id: 'units-digit-cycles', world: 'strategy', band: '8-10', title: 'Ride the cycle',
    hook: '7 multiplied by itself 50 times is a huge number. What is its last digit — without working it out?',
    idea: 'Last digits go round in a cycle. Find how long the cycle is, then see where your number lands in it.',
    why: [
      'The last digit of a product depends only on the last digits you multiply. So for powers of 7, only the 7 matters each time: 7, then 7 × 7 = 49 (ends 9), then 9 × 7 = 63 (ends 3), then 3 × 7 = 21 (ends 1), then 1 × 7 = 7 again. The last digits go 7, 9, 3, 1 and round again, for ever.',
      'A cycle of 4 means powers 4, 8, 12, … all land on the last place, 1. To find where power 50 lands, divide by 4: 50 = 12 × 4 + 2, so it lands on the second place, 9. A remainder of 0 means the very end of the cycle.',
      'Any repeating pattern works the same way — a necklace of beads, a row of digits that repeats. Find the block that repeats, count how long it is, and use the remainder to jump straight to the place you need. For a sum, find each last digit separately, add them, and keep only the last digit.',
    ],
    alg: 'nth item of a cycle of length L = item number (n ÷ L remainder), 0 meaning L',
    ex: { kind: 'power', a: 7, n: 50 },
    caseKey: 'kind',
    cases: [
      { label: 'A repeating pattern', note: 'Find the block that repeats, then the remainder tells you the place in the block.',
        ex: { kind: 'pattern', cyc: [3, 8, 1, 6], n: 50 } },
      { label: 'The last digit of a power', note: 'The last digits of the powers repeat, so it is a pattern too — find its cycle first.',
        ex: { kind: 'power', a: 7, n: 50 } },
      { label: 'The last digit of a sum', note: 'Find each last digit with its own cycle, add, and keep only the last digit.',
        ex: { kind: 'sum', a: 3, n: 2026, b: 2, m: 31 } },
    ],
    gen(r, lv = 1) {
      if (lv === 1) { const L = int(3, 5, r), cyc = []; while (cyc.length < L) { const d = int(0, 9, r); if (!cyc.includes(d)) cyc.push(d); } return this.q({ kind: 'pattern', cyc, n: int(12, 99, r) }); }
      if (lv === 2) return this.q({ kind: 'power', a: pick([2, 3, 4, 7, 8, 9], r), n: int(10, 100, r) });
      if (r() < 0.3) return this.q({ kind: 'power', a: pick([12, 13, 17, 18, 22, 23, 27, 33], r), n: int(100, 2030, r) });
      const a = pick([2, 3, 7, 8], r); let b = pick([2, 3, 4, 7, 8, 9], r); while (b === a) b = pick([2, 3, 4, 7, 8, 9], r);
      return this.q({ kind: 'sum', a, n: int(20, 2030, r), b, m: int(10, 99, r) });
    },
    q(o) {
      if (o.kind === 'pattern') { const { cyc, n } = o, L = cyc.length, block = cyc.join(', ');
        return { ...o, text: `A row of digits repeats the same block for ever: ${block}, ${block}, ${block}, … What is digit number ${n} in the row?`,
          expr: `+('${cyc.join('')}'.repeat(${Math.ceil(n / L) + 1})[${n - 1}])`, ans: cyc[(n - 1) % L] }; }
      const ld = (a, n) => { const c = lastDigitCycle(a); return c[(n - 1) % c.length]; };
      if (o.kind === 'power') return { ...o, text: `${o.a}${sup(o.n)} means ${o.n} lots of ${o.a} multiplied together. What is its last digit?`, say: `${o.a} to the power ${o.n} means ${o.n} lots of ${o.a} multiplied together. What is its last digit?`,
        expr: POWJS(o.a, o.n), ans: ld(o.a, o.n) };
      return { ...o, text: `What is the last digit of ${o.a}${sup(o.n)} + ${o.b}${sup(o.m)}?`, say: `What is the last digit of ${o.a} to the power ${o.n}, plus ${o.b} to the power ${o.m}?`,
        expr: `(${POWJS(o.a, o.n)}+${POWJS(o.b, o.m)})%10`, ans: (ld(o.a, o.n) + ld(o.b, o.m)) % 10 };
    },
    work(o) {
      const place = (L, n) => ((n - 1) % L) + 1;
      if (o.kind === 'pattern') { const L = o.cyc.length;
        return [{ t: 'How long is the block that repeats?', v: L }, { t: `Place in the block: the remainder of ${o.n} ÷ ${L} (0 means the end)`, v: place(L, o.n) }, { t: 'So the digit is', v: o.cyc[(o.n - 1) % L] }]; }
      if (o.kind === 'power') { const c = lastDigitCycle(o.a), L = c.length;
        return [{ t: `Last digits of ${o.a}, ${o.a}², ${o.a}³, ${o.a}⁴, … repeat every`, v: L }, { t: `Place in the cycle: the remainder of ${o.n} ÷ ${L} (0 means the end)`, v: place(L, o.n) }, { t: 'So the last digit is', v: c[(o.n - 1) % L] }]; }
      const c1 = lastDigitCycle(o.a), c2 = lastDigitCycle(o.b), d1 = c1[(o.n - 1) % c1.length], d2 = c2[(o.m - 1) % c2.length];
      return [{ t: `Last digit of ${o.a}${sup(o.n)} (its cycle is ${c1.length} long)`, v: d1 }, { t: `Last digit of ${o.b}${sup(o.m)} (its cycle is ${c2.length} long)`, v: d2 }, { t: `${d1} + ${d2}, keeping only the last digit`, v: (d1 + d2) % 10 }];
    },
  },
];

/* ================================================================ stories */

