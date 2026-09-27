/* facts.js — the fact bank, and the one idea Bizzing Maths takes from the Bee.

   Bizzing Bee ramps on how TRICKY a spelling is, not on how rare the word is: a
   silent letter beats a long word. The same is true of number facts, and every
   workbook gets it wrong the same way — it walks the table in order, 1s to 12s,
   as if 12×12 were the hardest thing on it. It is not. 12×12 is a famous
   square that children remember. 7×8 has no pattern to lean on, sits next to
   6×8 and 7×9 which it gets confused with, and is where the errors live.

   So a fact's difficulty is scored from the features that make it tricky, and
   each feature has a NAME a child can be told ("crosses ten", "a 7 and an 8 —
   no pattern to lean on"). `tricky(f)` is the ramp key; `why(f)` is the chip.

   A fact is an ordered pair with an op: { op:'+', a:7, b:8 }. Addition and
   multiplication are stored on the sorted pair, because 7×8 and 8×7 are one
   thing to know; subtraction and division are their own facts, because 56÷8
   and 56÷7 are not. */

export const OPS = ['+', '-', '×', '÷', '²'];
export const OP_NAME = { '+': 'Adding', '-': 'Taking away', '×': 'Times tables', '÷': 'Sharing', '²': 'Squares to 20' };
export const OP_WORD = { '+': 'add', '-': 'sub', '×': 'mul', '÷': 'div', '²': 'sq' };

export const key = (f) => `${f.a}${f.op}${f.b}`;
export function parseKey(k) {
  const m = /^(\d+)([+\-×÷²])(\d+)$/.exec(k);
  return m ? { a: +m[1], op: m[2], b: +m[3] } : null;
}

export function answer(f) {
  switch (f.op) {
    case '+': return f.a + f.b;
    case '-': return f.a - f.b;
    case '×': return f.a * f.b;
    case '÷': return f.a / f.b;
    case '²': return f.a * f.a;
  }
  return NaN;
}

export const text = (f) => (f.op === '²' ? `${f.a}²` : `${f.a} ${f.op === '-' ? '−' : f.op} ${f.b}`);

/* ---------- the bank ---------- */

function build() {
  const all = { '+': [], '-': [], '×': [], '÷': [], '²': [] };
  for (let a = 0; a <= 10; a++) for (let b = a; b <= 10; b++) all['+'].push({ op: '+', a, b });
  // subtraction: every fact the addition bank implies, a − b with b ≤ 10 and result ≤ 10
  for (let a = 0; a <= 20; a++) for (let b = 0; b <= 10; b++) {
    const r = a - b; if (r >= 0 && r <= 10) all['-'].push({ op: '-', a, b });
  }
  for (let a = 0; a <= 12; a++) for (let b = a; b <= 12; b++) all['×'].push({ op: '×', a, b });
  // division: the inverse of every times fact with a divisor 1–12, never ÷0
  for (let d = 1; d <= 12; d++) for (let q = 0; q <= 12; q++) all['÷'].push({ op: '÷', a: d * q, b: d });
  // squares 1² to 20², which the parent asked every child to know by heart
  all['²'] = []; for (let a = 1; a <= 20; a++) all['²'].push({ op: '²', a, b: 2 });
  return all;
}
export const BANK = build();

/* ---------- trickiness ---------- */

/* How hard a factor is to multiply by, on its own. Measured by the thing that
   makes a table hard — whether it has a pattern — not by its size:
   0, 1 and 10 are rules, 2 is doubling, 5 is the clock, 9 has the finger
   trick and the digit-sum pattern, 11 repeats the digit up to 9. 6, 7 and 8
   have nothing, and 12 is big without being patterned. */
const H = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 2.4, 5: 1.2, 6: 3.4, 7: 4, 8: 3.8, 9: 2.6, 10: 0.3, 11: 1.6, 12: 3.2 };

export function tricky(f) {
  const { a, b } = f;
  switch (f.op) {
    case '×': {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (lo === 0 || lo === 1) return 0.2 + hi * 0.01;
      if (lo === 10 || hi === 10) return 0.6 + lo * 0.02;
      let s = H[lo] + H[hi];
      if (lo === hi) s *= 0.78;                              // squares are remembered
      if (hi === 11 && lo <= 9) s = 1.4 + lo * 0.05;         // 11 × a digit repeats it
      if (hi === 12 && lo === 12) s = 5;                      // famous, but still big
      return +s.toFixed(3);
    }
    case '÷': {
      const q = a / b;
      if (b === 1 || q === 0 || q === 1) return 0.4;
      return +(tricky({ op: '×', a: b, b: q }) + 0.8).toFixed(3);   // recall runs through the times fact
    }
    case '+': {
      const lo = Math.min(a, b), hi = Math.max(a, b), s = a + b;
      if (lo === 0) return 0.1 + hi * 0.01;
      if (lo <= 2) return 0.5 + lo * 0.1 + hi * 0.01;
      let t = 1 + lo * 0.15;
      if (s > 10) t += 2.2;                                   // bridging ten is the hard step
      if (lo >= 6) t += 0.9;
      if (lo === hi) t -= 1.4;                                // doubles are remembered
      else if (hi - lo === 1) t -= 0.5;                       // near doubles lean on them
      if (s === 10) t -= 0.6;                                 // number bonds to ten
      if (hi === 10) t = 0.9;
      return +Math.max(0.3, t).toFixed(3);
    }
    case '²': {
      // 1²–10² are the times table's diagonal; 11²–19² need (10 + b)²;
      // 15² has the ends-in-5 trick, 20² is 2 × 2 and two noughts
      if (a <= 10) return +(0.3 + (a >= 6 && a <= 9 ? 1.4 : 0) + a * 0.08).toFixed(3);
      if (a === 20) return 0.9;
      if (a === 15) return 1.8;
      return +(2 + (a - 10) * 0.28 - (a <= 12 ? 0.6 : 0)).toFixed(3);
    }
    case '-': {
      const r = a - b;
      if (b === 0 || r === 0) return 0.2;
      if (b <= 2) return 0.6 + b * 0.1;
      let t = 1.3 + b * 0.15;
      if (a > 10 && r < 10) t += 2.6;                         // crossing back over ten
      if (b >= 6) t += 0.8;
      if (b === r) t -= 1.2;                                  // halves: 16 − 8
      if (a === 10) t -= 0.5;                                 // bonds to ten
      if (b === 10) t = 0.8;
      return +Math.max(0.3, t).toFixed(3);
    }
  }
  return 1;
}

/* The chip on a fact: WHY it is tricky, or what to lean on. Never contains the
   answer — that would be the Bee's leaked-spelling bug in another subject. */
export function why(f) {
  const { a, b } = f;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  switch (f.op) {
    case '×':
      if (lo === 0) return 'anything times zero is zero';
      if (lo === 1) return 'times one changes nothing';
      if (hi === 10) return 'times ten: shift one place';
      if (lo === hi) return 'a square — worth knowing by heart';
      if (lo === 2 || hi === 2) return 'times two is doubling';
      if (lo === 5 || hi === 5) return 'times five is half of times ten';
      if (lo === 9 || hi === 9) return 'times nine: times ten, take one lot away';
      if (hi === 11 && lo <= 9) return 'eleven times a digit repeats it';
      if (lo === 4 || hi === 4) return 'times four: double, then double again';
      if ([6, 7, 8].includes(lo) && [6, 7, 8].includes(hi)) return 'the famous hard ones — no pattern to lean on';
      if (hi === 12) return 'times twelve: times ten plus times two';
      return 'split one number to make it friendlier';
    case '÷':
      if (b === 1) return 'sharing by one changes nothing';
      if (a === 0) return 'nothing shared is still nothing';
      // for a square the divisor IS the answer, so the hint must not name it
      if (a === b * b) return 'a square — what number times itself?';
      return `think: what times ${b}?`;
    case '+':
      if (lo === 0) return 'adding zero changes nothing';
      if (lo === hi) return 'a double';
      if (hi - lo === 1) return 'a near double — double the smaller, one more';
      if (a + b === 10) return 'a bond to ten';
      if (hi === 9) return 'adding nine: add ten, take one away';
      if (a + b > 10) return 'crosses ten — make ten first';
      return 'count on from the bigger number';
    case '²':
      if (a <= 10) return `a square: ${a} times itself`;
      if (a === 20) return 'two twos, then two noughts';
      if (a === 15) return 'ends in 5: front digit times the next one up, then 25';
      return `split it: (10 + ${a - 10})² — a hundred, plus twenty ${a - 10}s, plus ${a - 10}²`;
    case '-':
      if (b === 0) return 'taking nothing leaves it the same';
      if (b === a - b) return 'a half — undo a double';
      if (a > 10 && a - b < 10) return 'crosses back over ten — go down to ten first';
      if (b >= 6) return 'count up from the smaller number instead';
      return 'think of the adding fact';
  }
  return '';
}

/* Facts of one op, easiest first — the order a child meets them in. Ties are
   broken by size, so the ramp is stable. */
export function ramp(op) {
  return BANK[op].slice().sort((x, y) => tricky(x) - tricky(y) || answer(x) - answer(y) || x.a - y.a);
}

/* ---------- fluency ---------- */

/* Fluent means correct AND fast enough that it was recalled rather than
   worked out. The line moves with the age band, because a six-year-old's
   fingers are slower on a keypad than their memory is. */
export const FLUENT_MS = { '6-7': 5000, '8-10': 3500, '11-14': 3000 };

/* Leitner boxes, in days. A fact climbs one box per fluent answer that arrives
   when it is due (or later), and a miss drops it ONE box, not to the floor —
   Finance's mastery model, applied here: a lapse is reported, not punished. */
export const BOXES = [0, 1, 3, 7, 21, 60];
export const MASTERED_BOX = 3;   // reached the 7-day box: remembered across a week
const DAY = 86400000;

export function blank() { return { n: 0, ok: 0, box: 0, due: 0, last: 0, miss: 0, recent: [] }; }

/* Record one answer. `ms` is time from the question appearing to the answer.
   Returns the updated record (mutates `r`). */
export function record(r, right, ms, band, now = Date.now()) {
  r.n++; r.last = now;
  const fast = right && ms <= (FLUENT_MS[band] || 3500);
  r.recent = [...(r.recent || []), right ? (fast ? 'F' : 'S') : 'X'].slice(-4);
  if (right) {
    r.ok++;
    // only climb when the fact was actually due — a fact answered twice in one
    // sitting has not been remembered across a gap, it has been repeated
    if (fast && now >= r.due) r.box = Math.min(BOXES.length - 1, r.box + 1);
  } else {
    r.miss++;
    r.box = Math.max(0, r.box - 1);
    r.lapsed = r.box < MASTERED_BOX && (r.peak || 0) >= MASTERED_BOX;
  }
  r.peak = Math.max(r.peak || 0, r.box);
  r.due = now + BOXES[r.box] * DAY;
  return r;
}

export function state(r) {
  if (!r || !r.n) return 'new';
  const rc = r.recent || [];
  const lastTwo = rc.slice(-2);
  if (lastTwo.includes('X')) return 'trap';
  if (r.box >= MASTERED_BOX) return 'fluent';
  if (rc.at(-1) === 'F') return 'quick';
  return 'learning';
}

export const STATE_LABEL = { new: 'Not met yet', learning: 'Learning', quick: 'Getting quick', fluent: 'Fluent', trap: 'A trap' };

/* ---------- building a session ---------- */

/* A session is 20 questions:
     1. traps first-ish, because they are what the child asked to fix;
     2. anything due for review;
     3. up to NEW_PER new facts off the ramp — fewer if today is going badly;
     4. the rest filled from facts the child already knows, for rhythm.
   Then interleaved so two new facts never sit side by side. Never all-new:
   a drill of nothing but unknowns is a test, and a child walks away from it. */
export const SESSION = 20;
export const NEW_PER = 4;

export function session(facts, op, { n = SESSION, now = Date.now(), r = Math.random, only, band = '8-10' } = {}) {
  const ops = op === 'mix' ? OPS : [op];
  const pool = ops.flatMap((o) => ramp(o));
  const rec = (f) => facts[key(f)];
  /* A child with almost nothing recorded gets a DISCOVERY session: twenty
     facts sampled evenly across the whole ramp, not the bottom twenty. The
     bottom of the × ramp is 1 × 1 … 1 × 9 — a first session made of those
     tells us nothing and bores an eight-year-old in a minute. Sampling finds
     what they already know, so the next session starts in the right place.
     Trivial facts (× 0, × 1, + 0) are left out of the sample for 8+. */
  const seenN = pool.filter((f) => rec(f) && rec(f).n).length;
  if (!only && seenN < 12) {
    const src = pool.filter((f) => band === '6-7' || tricky(f) > 0.45);
    const out = pool.filter((f) => state(rec(f)) === 'trap');    // anything already tripping them comes along
    for (let i = 0; out.length < n && i < n && src.length; i++) out.push(src[Math.min(src.length - 1, Math.floor(((i + r()) / n) * src.length))]);
    return shuffleIn(out.filter((f, i, a) => a.findIndex((g) => key(g) === key(f)) === i), r).map((f) => ({ ...f, discover: true }));
  }
  if (only === 'traps') {
    const t = pool.filter((f) => state(rec(f)) === 'trap');
    return interleave(t.length ? t : [], r).slice(0, n);
  }
  const traps = pool.filter((f) => state(rec(f)) === 'trap');
  const due = pool.filter((f) => { const x = rec(f); return x && x.n && x.due <= now && state(x) !== 'trap'; });
  const seen = pool.filter((f) => { const x = rec(f); return x && x.n; });
  // recent accuracy decides how many new facts today can take
  const recentMiss = seen.reduce((m, f) => m + ((rec(f).recent || []).slice(-1)[0] === 'X' ? 1 : 0), 0);
  const newCap = recentMiss > 4 ? 1 : recentMiss > 2 ? 2 : NEW_PER;
  // new facts come off the ramp in order, one op at a time for "mix"
  const fresh = [];
  for (const o of ops) {
    const next = ramp(o).filter((f) => !rec(f) || !rec(f).n);
    fresh.push(...next.slice(0, Math.ceil(newCap / ops.length)));
  }
  const out = []; const used = new Set();
  const take = (f) => { const k = key(f); if (!used.has(k) && out.length < n) { used.add(k); out.push(f); } };
  shuffleIn(traps, r).slice(0, 6).forEach(take);
  due.sort((x, y) => rec(x).due - rec(y).due).slice(0, 8).forEach(take);
  fresh.slice(0, newCap).forEach((f) => take({ ...f, fresh: true }));
  // fill: known facts, weighted toward the trickier end of what is known
  const known = shuffleIn(seen.filter((f) => !used.has(key(f))), r).sort((x, y) => tricky(y) - tricky(x));
  known.slice(0, n).forEach(take);
  // a brand-new child has nothing known yet: fill from the easy end of the ramp
  for (const f of pool) { if (out.length >= n) break; take(f); }
  return interleave(out, r);
}

function shuffleIn(a, r) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

/* Spread the fresh facts out: no two new ones adjacent. */
function interleave(list, r) {
  const fresh = list.filter((f) => f.fresh), rest = shuffleIn(list.filter((f) => !f.fresh), r);
  if (!fresh.length) return rest;
  const gap = Math.max(2, Math.floor(rest.length / (fresh.length + 1)));
  const out = rest.slice();
  fresh.forEach((f, i) => out.splice(Math.min(out.length, (i + 1) * gap + i), 0, f));
  return out;
}

/* ---------- summaries ---------- */

export function tally(facts, op) {
  const ops = op === 'mix' ? OPS : [op];
  const t = { new: 0, learning: 0, quick: 0, fluent: 0, trap: 0, total: 0 };
  for (const o of ops) for (const f of BANK[o]) { t[state(facts[key(f)])]++; t.total++; }
  return t;
}

/* The grid: rows × cols for the times table (and the addition square). */
export function grid(facts, op) {
  const n = op === '×' ? 12 : 10;
  const rows = [];
  for (let a = 1; a <= n; a++) {
    const row = [];
    for (let b = 1; b <= n; b++) {
      const f = { op, a: Math.min(a, b), b: Math.max(a, b) };
      row.push({ a, b, k: key(f), st: state(facts[key(f)]) });
    }
    rows.push(row);
  }
  return rows;
}
