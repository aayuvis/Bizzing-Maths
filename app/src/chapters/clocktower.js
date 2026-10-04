/* clocktower.js — The Clock Tower: time, money, measures, perimeter, area
   and volume. The contract is docs/CHAPTER-CONTRACT.md.

   Money is counted in plain "coins" so no family's currency is assumed.
   Every `expr` reaches the answer by a different road from the steps —
   minutes from midnight for time, the whole-rectangle-minus-the-corner for
   an L-shape, the corner coordinates for an area — so a slip in one route
   cannot hide behind the same slip in the other. */

import { int, pick, shuffle } from '../rand.js';
import { clock, grid, cuboid, svg, text } from './kit.js';

export const WORLD = {
  id: 'clocktower', name: 'The Clock Tower', short: 'Clock Tower', band: '6-7',
  blurb: 'Clocks, coins, metres and litres — measuring the world, and why the rules for area work.',
  tint: '#F5EEE2', ink: '#5A3510', glyph: '🕰️',
};

/* ------------------------------------------------------------ helpers */

const nums = (s) => s.split(/[^0-9./]/);
const leaks = (q) => !q.choices && String(q.ans).length > 1 && nums(q.text).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 80; i++) { q = make(); if (!leaks(q)) return q; } return q; }
function options(ans, pool, r, n = 4) {
  const rest = shuffle([...new Set(pool)].filter((p) => p !== ans), r).slice(0, n - 1);
  return shuffle([ans, ...rest], r);
}
const pad = (n) => String(n).padStart(2, '0');
const fmt = (h, m) => `${h}:${pad(m)}`;
const h12 = (H) => H % 12 || 12;
const R3 = (x) => Math.round(x * 1000) / 1000;

/* Two clock faces side by side: from → to. */
function twoClocks(H1, m1, H2, m2) {
  const a = clock(H1, m1, 62), b = clock(H2, m2, 62);
  return svg(320, 136, `<g>${a}</g><g transform="translate(184,0)">${b}</g>` + text(160, 72, '→', 'dg-big'), 'Two clocks: the start and the end');
}
/* A polygon whose side labels sit just outside each side, anchored away from it. */
function shape(pts, labels, fill = 'dg-fill2', padX = 56, padY = 30) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - padX, y0 = Math.min(...ys) - padY, w = Math.max(...xs) - x0 + padX, h = Math.max(...ys) - y0 + padY;
  const area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0), sg = Math.sign(area) || 1;
  let s = `<polygon points="${pts.map((p) => `${R3(p[0] - x0)},${R3(p[1] - y0)}`).join(' ')}" class="${fill}"/>`;
  labels.forEach((l, i) => {
    if (!l) return; const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey) || 1;
    const nx = (ey / len) * sg, ny = (-ex / len) * sg;
    const anchor = nx > 0.45 ? 'start' : nx < -0.45 ? 'end' : 'middle', dy = ny > 0.45 ? 15 : ny < -0.45 ? -5 : 5;
    s += text(R3((a[0] + b[0]) / 2 + nx * 9 - x0), R3((a[1] + b[1]) / 2 + ny * 9 - y0 + dy), l, 'dg-text', anchor);
  });
  return svg(R3(w), R3(h), s, 'A shape with its measurements');
}
/* kit.cuboid, given room on the left for its height label. */
function box(l, h, w) {
  const inner = cuboid(l, h, w, 'cm', Math.min(22, Math.floor(170 / Math.max(l, h, w))));
  const [, W, H] = inner.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return svg(R3(+W + 50), R3(+H), `<g transform="translate(50,0)">${body}</g>`, 'A box');
}
/* An L-shape: full width W and height H, with the top-right corner cut away,
   leaving a column w1 wide on the left and a strip h1 tall along the bottom. */
function lPoints(W, H, w1, h1, u) { return [[0, 0], [w1 * u, 0], [w1 * u, (H - h1) * u], [W * u, (H - h1) * u], [W * u, H * u], [0, H * u]]; }
const lLabels = (W, H, w1, h1) => [`${w1} cm`, '', '', `${h1} cm`, `${W} cm`, `${H} cm`];
/* Area by the corner coordinates (the shoelace sum), written as plain arithmetic. */
function shoelace(pts) {
  const t = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return `${p[0]}*${q[1]}-${q[0]}*${p[1]}`; });
  return `Math.abs(${t.join('+')})/2`;
}
/* A flat shape in whole units with a dashed height line and labels. */
function measured(pts, u, labels, heightLine) {
  const ox = 56, oy = 20, X = (x) => R3(ox + x * u), Y = (y) => R3(oy + y * u);
  const P = pts.map(([x, y]) => [X(x), Y(y)]);
  const W = Math.max(...P.map((p) => p[0])) + 70, H = Math.max(...P.map((p) => p[1])) + 34;
  let s = `<polygon points="${P.map((p) => p.join(',')).join(' ')}" class="dg-fill2"/>`;
  if (heightLine) { const [x, y0, y1] = heightLine; s += `<line x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y1)}" class="dg-line" stroke-dasharray="6 5"/>`; }
  for (const [x, y, l, cls, anchor] of labels) s += text(X(x), Y(y), l, cls || 'dg-text', anchor || 'middle');
  return svg(W, H, s, 'A shape with its measurements');
}

/* ------------------------------------------------------------ stops */

const ITEMS = ['pencil', 'apple', 'notebook', 'ball', 'comic', 'kite', 'mango', 'badge'];
const UNITS = {
  'm-cm': { big: 'm', small: 'cm', f: 100 }, 'cm-mm': { big: 'cm', small: 'mm', f: 10 }, 'km-m': { big: 'km', small: 'm', f: 1000 },
  'kg-g': { big: 'kg', small: 'g', f: 1000 }, 'l-ml': { big: 'l', small: 'ml', f: 1000 },
};

export const TRICKS = [
  {
    id: 'read-the-clock', world: 'clocktower', band: '6-7', title: 'Reading the clock',
    hook: 'The long hand points at the 9 and the short hand is nearly at the 4. What time is it?',
    idea: 'Read the long hand first for the minutes (each number is 5 minutes), then the short hand for the hour it has most recently passed.',
    why: [
      'The long hand goes all the way round once every hour, and there are 60 minutes in an hour. The clock has 12 numbers, so each number is 60 ÷ 12 = 5 minutes along: the 3 means 15 minutes past, the 6 means 30, the 9 means 45.',
      'The short hand goes round once every 12 hours, so it creeps slowly from one number to the next as the hour passes. At 3:45 it is three-quarters of the way from the 3 to the 4 — it has not reached the 4 yet, so the hour is still 3.',
      'That is why you read the long hand first. Once you know it is 45 minutes past, you know the short hand must be most of the way to the next number, and you name the number it has just left behind. And to say how long until the next o\'clock, take the minutes past away from 60: at 3:45 there are 15 minutes to go.',
    ],
    alg: 'minutes = 5 × (number the long hand points to)',
    ex: { h: 3, m: 45, ask: 'time', opts: ['9:15', '3:45', '4:45', '3:15'] },
    caseKey: 'ask',
    cases: [
      { label: 'What time is it?', note: 'Long hand first for the minutes, counting in fives. Then name the hour the short hand has just left — not the one it is heading for.',
        ex: { h: 3, m: 45, ask: 'time', opts: ['9:15', '3:45', '4:45', '3:15'] } },
      { label: 'Minutes to the next hour', note: 'A full turn of the long hand is 60 minutes, so the minutes still to go are 60 take away the minutes already past.',
        ex: { h: 7, m: 40, ask: 'to', opts: null } },
    ],
    gen(r, lv = 1) {
      const h = int(1, 12, r);
      if (lv === 3 && r() < 0.6) return this.q({ h, m: int(1, 59, r), ask: 'to', opts: null });
      const m = lv === 1 ? pick([0, 30, 0, 30, 15, 45], r) : int(0, 11, r) * 5;
      const pool = [fmt(h % 12 + 1, m), fmt(h === 1 ? 12 : h - 1, m), fmt(h, (m + 30) % 60)];
      if (m > 0) pool.push(fmt(m / 5, (h * 5) % 60));
      return this.q({ h, m, ask: 'time', opts: options(fmt(h, m), pool, r) });
    },
    q({ h, m, ask, opts }) {
      const ha = ((h % 12) + m / 60) * 30, ma = m * 6;   // where the hands point, in degrees
      if (ask === 'to') return { h, m, ask, opts, text: 'How many minutes is it until the next o\'clock?', expr: `60-Math.round(${ma}/6)`, ans: 60 - m };
      return { h, m, ask, opts, text: 'What time does the clock show?', choices: opts, ans: fmt(h, m),
        expr: `(Math.floor(${ha}/30)||12)+':'+String(Math.round(${ma}/6)).padStart(2,'0')` };
    },
    work({ h, m, ask, opts }) {
      const ha = ((h % 12) + m / 60) * 30, ma = m * 6;   // the hands' angles, as q() draws them: the x read the clock face
      if (ask === 'to') return [{ t: 'The long hand: how many minutes past the hour?', v: m, x: `${ma}/6` }, { t: `An hour is 60 minutes: 60 − ${m}`, v: 60 - m }];
      return [
        { t: 'The long hand: how many minutes past the hour?', v: m, x: `${ma}/6` },
        { t: 'The short hand: which hour has it reached or just passed?', v: h, x: `Math.floor(${ha}/30)||12` },
        { t: 'So the time is', v: fmt(h, m), choices: opts },
      ];
    },
    draw({ h, m }) { return clock(h, m); },
  },
  {
    id: 'giving-change', world: 'clocktower', band: '6-7', title: 'Giving change',
    hook: 'Something costs 37 coins and you pay with 50. How much comes back?',
    idea: 'Count UP from the price to what you paid — to the next ten first, then on. The jumps are the change.',
    why: [
      'Change is the gap between the price and what you handed over. A gap can be measured from either end, and counting up from the price is how shopkeepers have always done it: 37… 40… 50, and they hand you coins as they count.',
      'Jumping to the next ten first makes every jump easy. 37 up to 40 is 3, then 40 up to 50 is 10. 3 + 10 = 13. You never have to "borrow" the way you would in 50 − 37 written out.',
      'If you buy several of the same thing, find the total first — price times how many — then count up from the total.',
    ],
    alg: 'change = paid − price = (next ten − price) + (paid − next ten)',
    ex: { qty: 1, price: 37, pay: 50, item: 'comic' },
    caseKey: 'many',
    cases: [
      { label: 'Buying one thing', note: 'Count up from the price: to the next ten first, then on to what you paid. The jumps added together are the change.',
        ex: { qty: 1, price: 37, pay: 50, item: 'comic' } },
      { label: 'Buying several', note: 'Find the total first — the price times how many — and only then count up from the total to what you paid.',
        ex: { qty: 4, price: 18, pay: 100, item: 'kite' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const item = pick(ITEMS, r);
        if (lv === 1) return this.q({ qty: 1, price: int(1, 9, r), pay: 10, item });
        if (lv === 2) { const price = int(11, 95, r); return this.q({ qty: 1, price, pay: price < 50 ? pick([50, 100], r) : 100, item }); }
        const qty = int(2, 5, r), price = int(12, 45, r), tot = qty * price;
        return this.q({ qty, price, pay: [50, 100, 200, 500].find((p) => p > tot), item });
      });
    },
    q({ qty, price, pay, item }) {
      const text = qty === 1 ? `A ${item} costs ${price} coins. You pay with ${pay} coins. How many coins do you get back?`
        : `You buy ${qty} ${item}s at ${price} coins each and pay with ${pay} coins. How many coins do you get back?`;
      return { qty, price, pay, item, many: qty > 1 ? 'several' : 'one', text, expr: `${pay}-${qty}*${price}`, ans: pay - qty * price };
    },
    work({ qty, price, pay }) {
      const tot = qty * price, s = [];
      if (qty > 1) s.push({ t: `The total: ${qty} × ${price}`, v: tot, x: `${qty}*${price}` });
      const nt = Math.ceil(tot / 10) * 10;
      if (nt > tot) s.push({ t: `${tot} up to ${nt}`, v: nt - tot, x: `10-${qty}*${price}%10` });
      if (pay > nt) s.push({ t: `${nt} up to ${pay}`, v: pay - nt, x: `${pay}-${qty}*${price}-(10-${qty}*${price}%10)%10` });
      s.push({ t: 'Add the jumps: your change', v: pay - tot });
      return s;
    },
  },
  {
    id: 'how-long', world: 'clocktower', band: '8-10', title: 'How long is it?',
    hook: 'The film starts at 2:40 and ends at 4:15. How many minutes long is it?',
    idea: 'Jump to the next o\'clock, then whole hours, then the minutes left over — and add the jumps.',
    why: [
      'Time does not work in tens. An hour is 60 minutes, so 4:15 − 2:40 written as 415 − 240 gives 175, which is wrong. The clock rolls over at 60, not at 100. (When both times are inside the same hour, nothing rolls over, and you can simply take the minutes away.)',
      'O\'clock is to time what a round ten is to numbers: the easy place to jump to. From 2:40 to 3:00 is 20 minutes. From 3:00 to 4:00 is a whole hour, 60 minutes. From 4:00 to 4:15 is 15 minutes.',
      'The film fills every one of those jumps and nothing else, so its length is the jumps added up: 20 + 60 + 15 = 95 minutes.',
    ],
    alg: 'time = (60 − start minutes) + 60 × whole hours + end minutes',
    ex: { H: 2, m1: 40, E: 4, m2: 15 },
    caseKey: 'span',
    cases: [
      { label: 'Inside one hour', note: 'Both times are in the same hour, so no o\'clock is crossed: take the start minutes from the end minutes.',
        ex: { H: 3, m1: 10, E: 3, m2: 45 } },
      { label: 'Across one o\'clock', note: 'The end has fewer minutes than the start, so you cannot just take away. Jump to the o\'clock, then on to the end.',
        ex: { H: 2, m1: 40, E: 3, m2: 15 } },
      { label: 'Across several hours', note: 'Jump to the next o\'clock, then count whole hours as 60 minutes each, then the minutes left over.',
        ex: { H: 2, m1: 40, E: 4, m2: 15 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const H = int(1, 12, r), a = int(0, 8, r); return this.q({ H, m1: a * 5, E: H, m2: int(a + 1, 11, r) * 5 }); }
        if (lv === 2) { const H = int(1, 11, r), a = int(2, 11, r); return this.q({ H, m1: a * 5, E: H + 1, m2: int(1, a - 1, r) * 5 }); }
        const H = int(1, 9, r); return this.q({ H, m1: int(1, 11, r) * 5, E: int(H + 2, Math.min(12, H + 4), r), m2: int(0, 11, r) * 5 });
      });
    },
    q({ H, m1, E, m2 }) {
      return { H, m1, E, m2, span: E === H ? 'same' : E - H === 1 ? 'next' : 'hours', text: `How many minutes is it from ${fmt(h12(H), m1)} to ${fmt(h12(E), m2)}?`, expr: `(${E}*60+${m2})-(${H}*60+${m1})`, ans: (E - H) * 60 + m2 - m1 };
    },
    work({ H, m1, E, m2 }) {
      const D = (E - H) * 60 + m2 - m1;
      if (E === H) return [{ t: 'Minutes past the hour at the start', v: m1, x: `(${H}*60+${m1})%60` }, { t: 'Minutes past the hour at the end', v: m2, x: `(${E}*60+${m2})%60` }, { t: `${m2} − ${m1}`, v: D }];
      const s = []; let base = H;
      if (m1 > 0) { base = H + 1; s.push({ t: `${fmt(h12(H), m1)} up to ${h12(base)}:00`, v: 60 - m1, x: `60-(${H}*60+${m1})%60` }); }
      const k = E - base;
      if (k > 0) s.push({ t: `${h12(base)}:00 up to ${h12(E)}:00 — ${k === 1 ? 'one hour' : 'whole hours'} in minutes`, v: 60 * k, x: `${E}*60-Math.ceil((${H}*60+${m1})/60)*60` });
      if (m2 > 0) s.push({ t: `${h12(E)}:00 up to ${fmt(h12(E), m2)}`, v: m2, x: `(${E}*60+${m2})%60` });
      s.push({ t: 'Add the jumps', v: D });
      return s;
    },
    draw({ H, m1, E, m2 }) { return twoClocks(H, m1, E, m2); },
  },
  {
    id: 'twenty-four-hour', world: 'clocktower', band: '8-10', title: 'The 24-hour clock',
    hook: 'A train timetable says 19:45. Is that before or after your tea?',
    idea: 'After midday, add 12 to the hour to get the 24-hour time; take 12 away to get back. Midnight is 00.',
    why: [
      'A day has 24 hours but an ordinary clock face only shows 12, so every time happens twice — 7:45 in the morning and 7:45 in the evening. Writing am or pm says which. The 24-hour clock does it with the number itself: it simply keeps counting past 12 instead of starting again.',
      'So the afternoon hours carry on 13, 14, 15… 1 pm is 13:00 because it is 12 hours plus 1. That is why you add 12 to any pm hour — and take 12 away to go back. Morning hours need nothing added: 9:15 am is 09:15, with a 0 in front so every time has two digits for the hour.',
      'The two odd ones are the twelves. Midday is 12:00 in both. Midnight starts a new day, so the count starts again from nothing: 12:30 am is 00:30.',
    ],
    alg: 'pm: H = h + 12 (except 12 pm = 12) · am: H = h (except 12 am = 00)',
    ex: { H: 19, m: 45, dir: 'to24', opts: ['17:45', '19:45', '07:45', '21:45'] },
    caseKey: 'part',
    cases: [
      { label: 'pm into 24-hour', note: 'After midday the 24-hour clock keeps counting past 12, so add 12 to the hour.',
        ex: { H: 19, m: 45, dir: 'to24', opts: ['17:45', '19:45', '07:45', '21:45'] } },
      { label: 'am into 24-hour', note: 'Before midday nothing is added — the hour stays, with a 0 in front if it is a single digit.',
        ex: { H: 9, m: 15, dir: 'to24', opts: ['21:15', '09:15', '07:15', '11:15'] } },
      { label: '24-hour into pm', note: 'An hour of 13 or more is in the afternoon or evening: take 12 away and write pm.',
        ex: { H: 16, m: 30, dir: 'to12', opts: ['4:30 am', '2:30 pm', '4:30 pm', '6:30 pm'] } },
      { label: '24-hour into am', note: 'An hour from 01 to 11 is the morning: the hour stays as it is, and you write am.',
        ex: { H: 8, m: 20, dir: 'to12', opts: ['8:20 pm', '8:20 am', '6:20 am', '10:20 am'] } },
      { label: 'Midday: 12', note: 'Midday is the odd one: 12 in both clocks, and it is already pm — nothing is added or taken away.',
        ex: { H: 12, m: 30, dir: 'to12', opts: ['12:30 am', '10:30 am', '2:30 pm', '12:30 pm'] } },
      { label: 'Midnight: 00', note: 'Midnight starts a new day, so the 24-hour count starts again from 00. 12:30 at night is 00:30.',
        ex: { H: 0, m: 30, dir: 'to24', opts: ['12:30', '00:30', '24:30', '02:30'] } },
    ],
    gen(r, lv = 1) {
      const m = lv === 3 ? int(0, 59, r) : int(0, 11, r) * 5;
      const H = lv === 1 ? int(13, 22, r) : lv === 2 ? pick([int(1, 11, r), int(13, 23, r)], r) : pick([0, 12, int(0, 23, r)], r);
      const dir = lv === 1 ? 'to24' : pick(['to24', 'to12'], r);
      const t24 = (x) => `${pad((x + 24) % 24)}:${pad(m)}`, t12 = (x) => `${h12((x + 24) % 24)}:${pad(m)} ${(x + 24) % 24 < 12 ? 'am' : 'pm'}`;
      const f = dir === 'to24' ? t24 : t12;
      return this.q({ H, m, dir, opts: options(f(H), [f(H + 12), f(H - 2), f(H + 2), dir === 'to24' ? `${pad(h12(H))}:${pad(m)}` : f(H - 10)], r) });
    },
    q({ H, m, dir, opts }) {
      const pm = H >= 12 ? 1 : 0, h = h12(H);
      const part = H === 0 ? 'midnight' : H === 12 ? 'midday' : `${dir}-${pm ? 'pm' : 'am'}`;
      if (dir === 'to24') return { H, m, dir, opts, part, text: `Write ${h}:${pad(m)} ${pm ? 'pm' : 'am'} in the 24-hour clock.`, choices: opts, ans: `${pad(H)}:${pad(m)}`,
        expr: `String(${h}%12+${pm}*12).padStart(2,'0')+':${pad(m)}'` };
      return { H, m, dir, opts, part, text: `Write ${pad(H)}:${pad(m)} in the 12-hour clock, with am or pm.`, choices: opts, ans: `${h}:${pad(m)} ${pm ? 'pm' : 'am'}`,
        expr: `((${H}+11)%12+1)+':${pad(m)} '+(${H}>=12?'pm':'am')` };
    },
    work({ H, m, dir, opts }) {
      const h = h12(H), pm = H >= 12, yn = ['Yes', 'No'];
      if (dir === 'to24') return [
        { t: 'Is it after midday (pm)?', v: pm ? 'Yes' : 'No', choices: yn, x: `${H}*60+${m}>=12*60?'Yes':'No'` },
        { t: H === 12 ? 'Midday stays 12' : H === 0 ? '12 at night starts the day again: the hour is' : pm ? `${h} + 12` : 'Before midday the hour stays', v: H, x: "H.n(TEXT,1)%12+(/pm/.test(TEXT)?12:0)" },
        { t: 'So it is', v: `${pad(H)}:${pad(m)}`, choices: opts },
      ];
      return [
        { t: 'Is the hour 12 or more (pm)?', v: pm ? 'Yes' : 'No', choices: yn, x: `${H}>=12?'Yes':'No'` },
        { t: H > 12 ? `${H} − 12` : H === 0 ? 'Hour 00 is 12 at night: the hour is' : 'The hour stays', v: h, x: '(H.n(TEXT,1)+11)%12+1' },
        { t: 'So it is', v: `${h}:${pad(m)} ${pm ? 'pm' : 'am'}`, choices: opts },
      ];
    },
  },
  {
    id: 'metric-units', world: 'clocktower', band: '8-10', title: 'Metres, grams and litres',
    hook: '3 m 45 cm of ribbon — how many centimetres is that?',
    idea: 'Know how many small units make one big one (10, 100 or 1000), then multiply to go down or divide to go up.',
    why: [
      'The metric units are built from their names. Kilo- means a thousand: a kilometre is 1000 metres, a kilogram 1000 grams. Centi- means a hundredth: 100 centimetres make a metre. Milli- means a thousandth: 1000 millilitres make a litre, and 10 millimetres make a centimetre.',
      'Going from a big unit to a small one, every big one breaks into that many small ones, so you multiply: 3 m is three lots of 100 cm, 300 cm. Going the other way, you are sharing small ones into groups, so you divide: 450 cm is 450 ÷ 100 = 4.5 m.',
      'Because every step is a 10, 100 or 1000, multiplying and dividing only slides the digits along — which is exactly why the whole world\'s scientists use these units.',
    ],
    alg: 'big → small: × f · small → big: ÷ f (f = 10, 100 or 1000)',
    decimals: true, keys: ['.'],
    ex: { kind: 'mixed', u: 'm-cm', x: 3, y: 45 },
    caseKey: 'form',
    cases: [
      { label: 'Big unit to small', note: 'Every big unit breaks into 10, 100 or 1000 small ones, so going down you multiply.',
        ex: { kind: 'down', u: 'kg-g', x: 4, y: 0 } },
      { label: 'Two units at once', note: 'Change the big units into small ones first, then add on the small ones that were already there.',
        ex: { kind: 'mixed', u: 'm-cm', x: 3, y: 45 } },
      { label: 'A decimal, big to small', note: '2.5 litres is two and a half lots of 1000 ml, so it still multiplies — and × 1000 slides the digits three places.',
        ex: { kind: 'down', u: 'l-ml', x: 2.5, y: 0 } },
      { label: 'Small unit to big', note: 'Going up you are grouping small units into big ones, so you divide — and the answer can be a decimal.',
        ex: { kind: 'up', u: 'm-cm', x: 450, y: 0 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'down', u: pick(['m-cm', 'cm-mm', 'kg-g', 'l-ml'], r), x: int(2, 9, r), y: 0 });
        if (lv === 2) {
          const u = pick(['m-cm', 'kg-g', 'l-ml', 'km-m'], r), f = UNITS[u].f;
          return r() < 0.6 ? this.q({ kind: 'mixed', u, x: int(1, 9, r), y: int(1, f - 1, r) }) : this.q({ kind: 'down', u, x: int(2, 20, r), y: 0 });
        }
        const u = pick(['m-cm', 'cm-mm', 'km-m', 'kg-g', 'l-ml'], r), f = UNITS[u].f;
        if (r() < 0.5) { let n; do { n = int(f + 1, f * 9, r); } while (n % f === 0); if (f === 1000 && r() < 0.7) n = Math.round(n / 50) * 50; if (n % f === 0) n += f / 2; return this.q({ kind: 'up', u, x: n, y: 0 }); }
        const tenths = int(11, 95, r); if (tenths % 10 === 0) return this.q({ kind: 'down', u, x: 2.5, y: 0 });
        return this.q({ kind: 'down', u, x: tenths / 10, y: 0 });
      });
    },
    q({ kind, u, x, y }) {
      const { big, small, f } = UNITS[u], form = kind === 'down' && !Number.isInteger(x) ? 'down-decimal' : kind;
      if (kind === 'up') return { kind, u, x, y, form, text: `How many ${big} is ${x} ${small}?`, expr: `${x}/${f}`, ans: x / f };
      if (kind === 'mixed') return { kind, u, x, y, form, text: `How many ${small} is ${x} ${big} ${y} ${small}?`, expr: `${x}*${f}+${y}`, ans: x * f + y };
      return { kind, u, x, y, form, text: `How many ${small} is ${x} ${big}?`, expr: `${x}*${f}`, ans: R3(x * f) };
    },
    work({ kind, u, x, y }) {
      const { big, small, f } = UNITS[u], s = [{ t: `How many ${small} make 1 ${big}?`, v: f, x: `H.fact('per','${small}','${big}')` }];
      if (kind === 'up') s.push({ t: `${x} ÷ ${f}`, v: x / f });
      else if (kind === 'mixed') s.push({ t: `${x} × ${f}`, v: x * f, x: `${x}*${f}` }, { t: `Add the ${y} ${small}`, v: x * f + y });
      else s.push({ t: `${x} × ${f}`, v: R3(x * f) });
      return s;
    },
  },
  {
    id: 'perimeter', world: 'clocktower', band: '8-10', title: 'Perimeter',
    hook: 'A garden is 8 m by 5 m. How much fence goes all the way round?',
    idea: 'Perimeter is the distance all the way round: add every side. A rectangle has two of each side, so double (length + width).',
    why: [
      'Imagine walking round the edge. You walk the length, then the width, then the length again, then the width again — so the perimeter is two lengths and two widths: 2 × (length + width). A square has four sides all the same, so its perimeter is just 4 × the side.',
      'An L-shape looks harder, but it is not. Push the two sides of the cut-out corner outwards and they line up exactly with the missing corner of a full rectangle. The steps up and across still add up to the full height and the full width.',
      'So an L-shape (with square corners) has the same perimeter as the rectangle around it: 2 × (full width + full height). Find the missing sides by taking away, add all six, and the rule will agree with you.',
    ],
    alg: 'rectangle: P = 2(l + w) · L-shape: P = 2(W + H)',
    ex: { kind: 'rect', W: 8, H: 5, w1: 0, h1: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'A rectangle', note: 'Two lengths and two widths. Add one of each, then double it.',
        ex: { kind: 'rect', W: 8, H: 5, w1: 0, h1: 0 } },
      { label: 'A square', note: 'Only one side is given, because all four are the same. Four of them make the way round.',
        ex: { kind: 'square', W: 6, H: 6, w1: 0, h1: 0 } },
      { label: 'An L-shape', note: 'Find the two unlabelled sides by taking away. The steps add up to the full width and height, so the answer matches the rectangle around it.',
        ex: { kind: 'L', W: 8, H: 6, w1: 3, h1: 2 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const W = int(2, 10, r); let H = int(2, 10, r); if (H === W) H++; return this.q({ kind: 'rect', W, H, w1: 0, h1: 0 }); }
        if (lv === 2) { if (r() < 0.4) { const s = int(3, 15, r); return this.q({ kind: 'square', W: s, H: s, w1: 0, h1: 0 }); } return this.q({ kind: 'rect', W: int(6, 25, r), H: int(3, 18, r), w1: 0, h1: 0 }); }
        const W = int(6, 12, r), H = int(5, 10, r); return this.q({ kind: 'L', W, H, w1: int(2, W - 2, r), h1: int(2, H - 2, r) });
      });
    },
    q({ kind, W, H, w1, h1 }) {
      if (kind === 'L') return { kind, W, H, w1, h1, text: 'What is the perimeter of this L-shape, in cm? Two of its sides are not labelled.', expr: `2*(${W}+${H})`, ans: w1 + (H - h1) + (W - w1) + h1 + W + H };
      if (kind === 'square') return { kind, W, H, w1, h1, text: `A square has sides of ${W} cm. What is its perimeter, in cm?`, expr: `${W}+${W}+${W}+${W}`, ans: 4 * W };
      return { kind, W, H, w1, h1, text: `A rectangle is ${W} cm long and ${H} cm wide. What is its perimeter, in cm?`, expr: `${W}+${H}+${W}+${H}`, ans: 2 * (W + H) };
    },
    work({ kind, W, H, w1, h1 }) {
      if (kind === 'L') return [{ t: 'The missing across side', v: W - w1, x: `${W}-${w1}` }, { t: 'The missing up-and-down side', v: H - h1, x: `${H}-${h1}` }, { t: 'Add all six sides', v: 2 * (W + H) }];
      if (kind === 'square') return [{ t: 'A square has four equal sides', v: 4, x: `[${W},${W},${W},${W}].length` }, { t: `4 × ${W}`, v: 4 * W }];
      return [{ t: `One length and one width: ${W} + ${H}`, v: W + H, x: `${W}+${H}` }, { t: 'Two of each: double it', v: 2 * (W + H) }];
    },
    draw({ kind, W, H, w1, h1 }) {
      if (kind === 'L') return shape(lPoints(W, H, w1, h1, 18), lLabels(W, H, w1, h1));
      const u = Math.min(18, Math.floor(220 / Math.max(W, H)));
      return shape([[0, 0], [W * u, 0], [W * u, H * u], [0, H * u]], [`${W} cm`, `${H} cm`, '', '']);
    },
  },
  {
    id: 'area-rectangles', world: 'clocktower', band: '8-10', title: 'Area of a rectangle',
    hook: 'A rug is 7 squares long and 6 squares wide. How many squares does it cover — without counting them all?',
    idea: 'Area is how many unit squares cover a shape. A rectangle is rows of equal squares, so area = length × width.',
    why: [
      'Area measures how much surface a shape covers, and we measure it in squares: a square 1 cm on each side is 1 square centimetre, written 1 cm².',
      'Lay the squares in a rectangle and they make neat rows. Every row has the same number of squares — the length — and there are as many rows as the width. Equal rows are exactly what multiplying counts: 6 rows of 7 is 6 × 7 = 42.',
      'That also works backwards. If you know the area and one side, the other side is how many equal rows fit: area ÷ the side you know.',
    ],
    alg: 'A = l × w · w = A ÷ l',
    ex: { lv: 2, W: 7, H: 6 },
    caseKey: 'lv',
    cases: [
      { label: 'Counting shaded squares', note: 'No need to count one by one: count the squares in one row, count the rows, and multiply.',
        ex: { lv: 1, W: 4, H: 3, cols: 7, rows: 5, c0: 1, r0: 1 } },
      { label: 'Length × width', note: 'The length is how many squares fit in a row and the width is how many rows, so the area is the two multiplied.',
        ex: { lv: 2, W: 7, H: 6 } },
      { label: 'Finding a missing side', note: 'Now the area is given and a side is missing. Undo the multiplying: divide the area by the side you know.',
        ex: { lv: 3, W: 7, H: 6 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) { const cols = int(6, 9, r), rows = int(4, 6, r), W = int(2, cols - 1, r), H = int(2, rows - 1, r); return this.q({ lv, W, H, cols, rows, c0: int(0, cols - W, r), r0: int(0, rows - H, r) }); }
        if (lv === 2) return this.q({ lv, W: int(2, 12, r), H: int(2, 12, r) });
        return this.q({ lv, W: int(3, 12, r), H: int(2, 12, r) });
      });
    },
    q({ lv, W, H, cols, rows, c0, r0 }) {
      if (lv === 1) return { lv, W, H, cols, rows, c0, r0, text: 'How many squares are shaded?', expr: Array(H).fill(W).join('+'), ans: W * H };
      if (lv === 3) return { lv, W, H, text: `A rectangle has an area of ${W * H} cm² and a length of ${W} cm. How wide is it, in cm?`, expr: `${W * H}/${W}`, ans: H };
      return { lv, W, H, text: `A rectangle is ${W} cm long and ${H} cm wide. What is its area, in cm²?`, expr: Array(H).fill(W).join('+'), ans: W * H };
    },
    work({ lv, W, H, c0 = 0, r0 = 0 }) {
      if (lv === 3) return [{ t: 'The area', v: W * H, x: `${W}*${H}` }, { t: `Rows of ${W}: ${W * H} ÷ ${W}`, v: H }];
      // lv 1 counts the shaded squares drawn (distinct columns, distinct rows); lv 2 reads the sides printed
      const shaded = (k) => `new Set([...SVG.matchAll(/<rect x="([\\d.]+)" y="([\\d.]+)"[^>]*class="dg-fill1"/g)].map((m)=>m[${k}])).size`;
      return [{ t: 'Squares in one row', v: W, x: lv === 1 ? shaded(1) : 'H.n(TEXT,1)' }, { t: 'Number of rows', v: H, x: lv === 1 ? shaded(2) : 'H.n(TEXT,2)' }, { t: `${W} × ${H}`, v: W * H }];
    },
    draw({ lv, W, H, cols, rows, c0, r0 }) {
      if (lv === 1) { const s = new Set(); for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) s.add(`${r0 + i},${c0 + j}`); return grid(cols, rows, s); }
      const u = Math.min(18, Math.floor(200 / Math.max(W, H)));
      return shape([[0, 0], [W * u, 0], [W * u, H * u], [0, H * u]], [`${W} cm`, lv === 3 ? '?' : `${H} cm`, '', '']);
    },
  },
  {
    id: 'compound-area', world: 'clocktower', band: '8-10', title: 'Area of an L-shape',
    hook: 'A room is shaped like an L. How much carpet does it need?',
    idea: 'Cut the L into two rectangles, find each area, and add them.',
    why: [
      'Area does not change when you cut a shape up: the same floor is covered, just in two pieces. So an L-shape can be split with one straight line into two rectangles, and each rectangle is length × width.',
      'The only work is finding the sides of each piece. The height of the upper piece is the full height take away the bottom strip, because the two heights stack to make the whole side.',
      'There is a second road to the same answer: the L is the full rectangle around it with one corner missing. Full rectangle minus the missing corner must give the same number — which is a good way to check.',
    ],
    alg: 'A = W × h₁ + w₁ × (H − h₁) = W × H − (W − w₁)(H − h₁)',
    ex: { W: 8, H: 7, w1: 3, h1: 3 },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const lo = lv === 1 ? 4 : lv === 2 ? 6 : 8, hi = lv === 1 ? 7 : lv === 2 ? 10 : 14;
        const W = int(lo, hi, r), H = int(lo, hi, r);
        return this.q({ W, H, w1: int(2, W - 2, r), h1: int(2, H - 2, r) });
      });
    },
    q({ W, H, w1, h1 }) {
      return { W, H, w1, h1, text: 'What is the area of this L-shape, in cm²?', expr: `${W}*${H}-(${W}-${w1})*(${H}-${h1})`, ans: W * h1 + w1 * (H - h1) };
    },
    work({ W, H, w1, h1 }) {
      return [
        { t: `The bottom strip: ${W} × ${h1}`, v: W * h1, x: `${W}*${h1}` },
        { t: `The height of the part above it: ${H} − ${h1}`, v: H - h1, x: `${H}-${h1}` },
        { t: `The part above: ${w1} × ${H - h1}`, v: w1 * (H - h1), x: `${w1}*(${H}-${h1})` },
        { t: 'Add the two pieces', v: W * h1 + w1 * (H - h1) },
      ];
    },
    draw({ W, H, w1, h1 }) { const u = Math.min(18, Math.floor(220 / Math.max(W, H))); return shape(lPoints(W, H, w1, h1, u), lLabels(W, H, w1, h1), 'dg-fill3'); },
  },
  {
    id: 'area-triangles', world: 'clocktower', band: '11-14', title: 'Triangles and parallelograms',
    hook: 'A parallelogram leans over. Its base is 9 cm and it stands 4 cm tall. What is its area?',
    idea: 'A parallelogram is base × height. A triangle is half of that: ½ × base × height. Always the straight-up height, never the slope.',
    why: [
      'Cut the triangle off one sloping end of a parallelogram and slide it to the other end. It fits exactly, and now you have a rectangle — the same base, the same height, and not a scrap of area gained or lost. So a parallelogram\'s area is base × height, just like the rectangle it became.',
      'Now draw a triangle and a copy of it turned upside down. Put the two together along a sloping side and they make a parallelogram with the same base and height. The triangle is exactly half of it: ½ × base × height.',
      'That is why the sloping side never matters. A leaning shape and an upright one with the same base and straight-up height cover the same area — like a stack of coins pushed sideways.',
    ],
    alg: 'parallelogram: A = b × h · triangle: A = ½ × b × h',
    ex: { kind: 'para', b: 9, h: 4, o: 3, sl: 5 },
    caseKey: ['kind', 'slope'],
    cases: [
      { label: 'A parallelogram', note: 'Slide the sloping end across and it becomes a rectangle, so its area is base × the straight-up height.',
        ex: { kind: 'para', b: 9, h: 4, o: 3, sl: 0 } },
      { label: 'Ignore the slope', note: 'The sloping side is given too, but it is a trap: only the straight-up height tells you how tall the shape stands.',
        ex: { kind: 'para', b: 7, h: 4, o: 3, sl: 5 } },
      { label: 'A right-angled triangle', note: 'The upright side IS the height. The triangle is half of a rectangle, so halve base × height.',
        ex: { kind: 'right', b: 6, h: 4, o: 0, sl: 0 } },
      { label: 'Any triangle', note: 'The height is the dashed line from the top straight down to the base. Two copies make a parallelogram, so halve base × height.',
        ex: { kind: 'tri', b: 10, h: 6, o: 3, sl: 0 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ kind: 'para', b: int(4, 12, r), h: int(3, 10, r), o: int(2, 4, r), sl: 0 });
        if (lv === 2) { const b = int(3, 12, r); let h = int(2, 12, r); if ((b * h) % 2) h++; return this.q({ kind: 'right', b, h, o: 0, sl: 0 }); }
        if (r() < 0.5) { const [o, h, sl] = pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [9, 12, 15], [12, 5, 13]], r); return this.q({ kind: 'para', b: int(o + 2, o + 8, r), h, o, sl }); }
        const b = int(4, 14, r); let h = int(3, 12, r); if ((b * h) % 2) h++;
        return this.q({ kind: 'tri', b, h, o: int(1, b - 1, r), sl: 0 });
      });
    },
    q({ kind, b, h, o, sl }) {
      const pts = kind === 'para' ? [[0, h], [b, h], [b + o, 0], [o, 0]] : kind === 'right' ? [[0, h], [b, h], [0, 0]] : [[0, h], [b, h], [o, 0]];
      const name = kind === 'para' ? 'parallelogram' : kind === 'right' ? 'right-angled triangle' : 'triangle';
      return { kind, b, h, o, sl, slope: sl ? 'given' : 'none', text: `A ${name} has a base of ${b} cm and a height of ${h} cm${sl ? ` (its sloping side is ${sl} cm)` : ''}. What is its area, in cm²?`,
        expr: shoelace(pts), ans: kind === 'para' ? b * h : (b * h) / 2 };
    },
    work({ kind, b, h, o = 0 }) {
      if (kind === 'para') return [{ t: 'Slide the end triangle across: a rectangle this wide', v: b, x: `${b + o}-${o}` }, { t: 'and this tall (straight up, not the slope)', v: h, x: 'H.n(TEXT,2)' }, { t: `${b} × ${h}`, v: b * h }];
      return [{ t: `The parallelogram (or rectangle) it is half of: ${b} × ${h}`, v: b * h, x: `${b}*${h}` }, { t: 'The triangle is half of that', v: (b * h) / 2 }];
    },
    draw({ kind, b, h, o, sl }) {
      const u = Math.min(20, Math.floor(200 / Math.max(b + o, h))), under = h + 22 / u;
      if (kind === 'right') return measured([[0, h], [b, h], [0, 0]], u, [[b / 2, under, `${b} cm`], [-6 / u, h / 2, `${h} cm`, 'dg-accent', 'end']], null);
      const up = [o + 6 / u, h / 2 + 5 / u, `${h} cm`, 'dg-accent', 'start'];
      if (kind === 'tri') return measured([[0, h], [b, h], [o, 0]], u, [[b / 2, under, `${b} cm`], up], [o, 0, h]);
      const labels = [[b / 2, under, `${b} cm`], up];
      if (sl) labels.push([b + o / 2 + 8 / u, h / 2, `${sl} cm`, 'dg-text', 'start']);
      return measured([[0, h], [b, h], [b + o, 0], [o, 0]], u, labels, [o, 0, h]);
    },
  },
  {
    id: 'volume-cuboid', world: 'clocktower', band: '11-14', title: 'Volume and surface area',
    hook: 'A box is 5 cm long, 3 cm wide and 4 cm tall. How many 1 cm cubes fill it?',
    idea: 'Volume = length × width × height: one layer of cubes, times the number of layers. Surface area adds the six faces, which come in three matching pairs.',
    why: [
      'Fill the bottom of the box with 1 cm cubes. They make a rectangle, so the bottom layer holds length × width cubes — 5 × 3 = 15. Every layer above is the same, and there are as many layers as the box is tall: 15 × 4 = 60 cm³.',
      'Surface area is the wrapping paper, not the filling. A box has six flat faces, and opposite faces are the same size: front and back, top and bottom, left and right. So you find three areas and double each one.',
      'Volume counts cubes (cm³, three lengths multiplied) and surface area counts squares (cm², two lengths multiplied). That is why a box can hold a lot but need little paper, or the other way round.',
    ],
    alg: 'V = l × w × h · SA = 2(lw + lh + wh)',
    ex: { ask: 'vol', l: 5, w: 3, h: 4 },
    caseKey: 'ask',
    cases: [
      { label: 'Volume', note: 'Count the cubes in the bottom layer, then multiply by the number of layers. The answer is in cm³.',
        ex: { ask: 'vol', l: 5, w: 3, h: 4 } },
      { label: 'Surface area', note: 'Now you want the wrapping, not the filling: three different faces, each appearing twice. The answer is in cm².',
        ex: { ask: 'sa', l: 5, w: 3, h: 4 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        if (lv === 1) return this.q({ ask: 'vol', l: int(2, 5, r), w: int(2, 5, r), h: int(2, 5, r) });
        if (lv === 2) return this.q({ ask: 'vol', l: int(3, 12, r), w: int(2, 10, r), h: int(2, 10, r) });
        return this.q({ ask: 'sa', l: int(2, 9, r), w: int(2, 9, r), h: int(2, 9, r) });
      });
    },
    q({ ask, l, w, h }) {
      const box = `A box is ${l} cm long, ${w} cm wide and ${h} cm tall.`;
      if (ask === 'sa') return { ask, l, w, h, text: `${box} What is its total surface area, in cm²?`, expr: `${l}*${w}+${l}*${w}+${l}*${h}+${l}*${h}+${w}*${h}+${w}*${h}`, ans: 2 * (l * w + l * h + w * h) };
      return { ask, l, w, h, text: `${box} What is its volume, in cm³?`, expr: `${h}*${w}*${l}`, ans: l * w * h };
    },
    work({ ask, l, w, h }) {
      if (ask === 'sa') return [
        { t: `Front and back: 2 × ${l} × ${h}`, v: 2 * l * h, x: `${l}*${h}+${l}*${h}` },
        { t: `Top and bottom: 2 × ${l} × ${w}`, v: 2 * l * w, x: `${l}*${w}+${l}*${w}` },
        { t: `The two ends: 2 × ${w} × ${h}`, v: 2 * w * h, x: `${w}*${h}+${w}*${h}` },
        { t: 'Add the six faces', v: 2 * (l * w + l * h + w * h) },
      ];
      return [{ t: `Cubes in the bottom layer: ${l} × ${w}`, v: l * w, x: `${l}*${w}` }, { t: 'Number of layers', v: h, x: 'H.n(TEXT,3)' }, { t: `${l * w} × ${h}`, v: l * w * h }];
    },
    draw({ l, w, h }) { return box(l, h, w); },
  },
];

/* ------------------------------------------------------------ stories */

