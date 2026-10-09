/* rush.js — Number Rush's rules, with no DOM (games spec §1.3, §3.1).

   games.js draws the sky; this file decides what falls, in what order, when a typed
   number pops a bubble, and how far the sky moves in a frame — so each of those
   promises can be held by test/rush.mjs without a browser.

   - LEVELS: the owner's ladder 1–5. Level 1 is the pre-readers' level (dot patterns
     to ten and + within ten); 2–5 per the spec's table. Every pool is ordered by
     facts.js tricky() (rule 2), and none past level 1 holds a ×1, ÷1, ×0 or +0.
   - The round climbs: a window slides along the level's ramp from where this child
     is (mid-ramp for a new one) to the level's hardest.
   - The child's own due list comes first: a fact that is due or a trap in k.facts is
     served about one bubble in three — the same record Rush · Calm and the Mock
     Contest read, so practice anywhere counts everywhere.
   - decide(): a bubble pops on Enter, or without Enter only when no OTHER live bubble's
     answer starts with the typed digits. Typing "12" never pops "1" on the way.
   - stepMs(): wall-clock time, clamped to 250 ms for a returning tab — the first
     landing takes the same seconds at 60, 30 or 12 frames a second. */

import { BANK, ramp, tricky, answer, key as fkey, text as ftext, state as fstate } from './facts.js';
import { levelOf, afterRound } from './game-level.js';

export const GAME = 'rush';
export const MAX_STEP_MS = 250;
export const RAMP_SERVED = 30;        // bubbles over which the round climbs to the level's hardest
export const DUE_SHARE = 0.35;       // about one bubble in three is the child's own due fact

export const LEVELS = {
  1: { name: 'Dots and adding to 10', words: 'Level 1 · count the dots, add to ten', pace: 0.8 },
  2: { name: 'Adding and taking away to 20', words: 'Level 2 · + and − within twenty', pace: 1 },
  3: { name: 'Times and sharing to 10 × 10', words: 'Level 3 · × and ÷ to ten tens', pace: 1 },
  4: { name: 'Times and sharing to 12 × 12', words: 'Level 4 · × and ÷ to twelve twelves, and 7 × ? = 56', pace: 1.05 },
  5: { name: 'Everything, at speed', words: 'Level 5 · everything mixed, at speed', pace: 1.3 },
};
/* Where a child with no Rush record starts: the middle of their band's ladder (spec §1.3). */
export const BAND_LV = { '6-7': 1, '8-10': 3, '11-14': 4 };
export const rushLevel = (k) => (k && k.gameLv && k.gameLv[GAME] ? levelOf(k, GAME) : BAND_LV[k && k.band] || 3);

/* ------------------------------------------------------------ what falls */

const item = (f, extra = {}) => ({ fact: { op: f.op, a: f.a, b: f.b }, op: f.op, a: f.a, b: f.b, text: ftext(f), ans: answer(f), t: tricky(f), ...extra });
const byT = (x, y) => x.t - y.t || x.ans - y.ans || x.a - y.a;
const nonTrivial = (f) => f.a > 1 && f.b > 1;

/* A dot pattern: n dots, no fact record (it is counting, not a fact). Subitising gets
   harder past five, where a pattern has to be seen as two groups. */
export const dotsItem = (n) => ({ fact: null, op: 'dots', a: n, b: 0, n, text: `${n} dots`, ans: n, t: +(0.15 + n * 0.09 + (n > 5 ? 0.35 : 0)).toFixed(3) });

const adds = (max, min = 1) => BANK['+'].filter((f) => f.a >= min && f.b >= min && f.a + f.b <= max).map((f) => item(f));
const subs = () => BANK['-'].filter((f) => f.b >= 1 && f.a - f.b >= 1).map((f) => item(f));
const times = (top) => BANK['×'].filter((f) => nonTrivial(f) && f.b <= top).map((f) => item(f));
const shares = (top) => BANK['÷'].filter((f) => f.b >= 2 && f.b <= top && f.a / f.b >= 2 && f.a / f.b <= top).map((f) => item(f));
/* 7 × ? = 56: the missing factor IS the division fact 56 ÷ 7, and is recorded as it. */
const missing = (top) => BANK['×'].filter((f) => nonTrivial(f) && f.b <= top).flatMap((f) => {
  const p = f.a * f.b;
  const one = { ...item({ op: '÷', a: p, b: f.a }), text: `${f.a} × ? = ${p}`, missing: true };
  return f.a === f.b ? [one] : [one, { ...item({ op: '÷', a: p, b: f.b }), text: `${f.b} × ? = ${p}`, missing: true }];
});

export function levelPool(lv) {
  let p;
  if (lv <= 1) p = [...Array.from({ length: 10 }, (_, i) => dotsItem(i + 1)), ...adds(10)];
  else if (lv === 2) p = [...adds(20), ...subs()];
  else if (lv === 3) p = [...times(10), ...shares(10)];
  else if (lv === 4) p = [...times(12), ...shares(12), ...missing(12)];
  else p = [...adds(20, 2), ...subs().filter((x) => x.b >= 2), ...times(12), ...shares(12), ...missing(12)];
  return p.sort(byT);
}

/* Squares (a paid mode): the squares bank to the band's top, by tricky(). */
export function squaresPool(band) {
  const top = band === '6-7' ? 10 : band === '8-10' ? 12 : 20;
  return ramp('²').filter((f) => f.a >= 2 && f.a <= top).map((f) => item(f)).sort(byT);
}
/* Why a square is what it is, from the one before it: n² = (n−1)² + 2n − 1. */
export function squareWhy(n) {
  const m = n - 1;
  return `${n}² = ${m}² + 2 × ${n} − 1 = ${m * m} + ${2 * n - 1}`;
}

/* Inverse (a paid mode): a FAMILY arrives together — 7 × 8, 8 × 7, 56 ÷ 7, 56 ÷ 8 — so the
   mode practises fact families. Young children get the + and − families to ten. */
export function families(band) {
  const out = [];
  if (band === '6-7') {
    for (const f of BANK['+']) if (f.a >= 1 && f.b >= 1 && f.a + f.b <= 10) {
      const s = f.a + f.b, id = `${f.a}+${f.b}`;
      const m = [item(f), item({ op: '-', a: s, b: f.a })];
      if (f.a !== f.b) m.push({ ...item(f), text: `${f.b} + ${f.a}` }, item({ op: '-', a: s, b: f.b }));
      out.push({ id, t: tricky(f), members: m.map((x) => ({ ...x, fam: id })) });
    }
  } else {
    const top = band === '8-10' ? 10 : 12;
    for (const f of BANK['×']) if (nonTrivial(f) && f.b <= top) {
      const p = f.a * f.b, id = `${f.a}×${f.b}`;
      const m = [item(f), item({ op: '÷', a: p, b: f.a })];
      if (f.a !== f.b) m.push({ ...item(f), text: `${f.b} × ${f.a}` }, item({ op: '÷', a: p, b: f.b }));
      out.push({ id, t: tricky(f), members: m.map((x) => ({ ...x, fam: id })) });
    }
  }
  return out.sort((x, y) => x.t - y.t || x.id.localeCompare(y.id));
}

/* Everything a round might serve, flat (the extras test and the finish card read it). */
export function rushPool(kid, mode = null, lv = null) {
  if (mode === 'squares') return squaresPool(kid.band);
  if (mode === 'mixed') return families(kid.band).flatMap((f) => f.members);
  return levelPool(lv || rushLevel(kid));
}

/* ------------------------------------------------------------ the climb */

/* Where on the level's ramp this child starts: a new child at mid-ramp for their band
   (the bottom only for the pre-readers' level), a child with a record at the share of the
   pool already quick or fluent — never past 60%, so a round always has somewhere to climb. */
export function startAt(kid, pool, lv) {
  const facts = (kid && kid.facts) || {};
  const met = pool.filter((x) => x.fact && facts[fkey(x.fact)] && facts[fkey(x.fact)].n);
  if (met.length < 6) return lv <= 1 ? 0 : 0.4;
  const known = pool.filter((x) => x.fact && ['quick', 'fluent'].includes(fstate(facts[fkey(x.fact)]))).length;
  return Math.min(0.6, known / pool.length);
}
/* The window the next bubble is picked from, as indices into the ramp: it slides from the
   start to the hardest as bubbles are served. */
export function windowAt(n, start, served) {
  const p = start + (1 - start) * Math.min(1, served / RAMP_SERVED);
  const w = Math.max(6, Math.round(n * 0.3));
  const hi = Math.min(n, Math.max(w, Math.round(p * n)));
  return [Math.max(0, hi - w), hi];
}
/* The child's own due facts inside this pool: traps first, then the most overdue. */
export function dueIn(kid, pool, now = Date.now()) {
  const facts = (kid && kid.facts) || {};
  const rec = (x) => x.fact && facts[fkey(x.fact)];
  const due = pool.filter((x) => { const r = rec(x); return r && r.n && (fstate(r) === 'trap' || r.due <= now); });
  return due.sort((x, y) => (fstate(rec(y)) === 'trap') - (fstate(rec(x)) === 'trap') || rec(x).due - rec(y).due);
}
/* The next bubble. `served` is how many have left the sky; `recent` the keys just served
   (never the same sum twice in a row). r is the random source. */
export function nextItem(pool, { start = 0, served = 0, due = [], recent = [], r = Math.random } = {}) {
  const fresh = (x) => !recent.includes(x.text);
  const d = due.filter(fresh);
  if (d.length && r() < DUE_SHARE) return d[0];
  const [lo, hi] = windowAt(pool.length, start, served);
  const win = pool.slice(lo, hi).filter(fresh);
  const from = win.length ? win : pool.slice(lo, hi);
  return from[Math.floor(r() * from.length)];
}
/* Inverse mode: the next family, climbing the same way. */
export function nextFamily(fams, { served = 0, recent = [], r = Math.random } = {}) {
  const [lo, hi] = windowAt(fams.length, 0.15, served);
  const win = fams.slice(lo, hi).filter((f) => !recent.includes(f.id));
  const from = win.length ? win : fams.slice(lo, hi);
  return from[Math.floor(r() * from.length)];
}

/* ------------------------------------------------------------ the keys */

/* What the typed digits do. `live` is the answers in the sky (as strings or numbers), lowest
   bubble first or not — the caller picks which bubble of a matching answer goes.
   Returns 'pop' (an answer matches and may go now), 'wait' (keep typing), or 'wrong'
   (Enter, and no bubble has this answer). */
export function decide(input, live, enter = false) {
  if (!input) return 'wait';
  const ans = live.map(String);
  const hit = ans.includes(input);
  if (enter) return hit ? 'pop' : 'wrong';
  if (!hit) return 'wait';
  return ans.some((a) => a !== input && a.startsWith(input)) ? 'wait' : 'pop';
}
/* Which bubble a wrong Enter was aimed at: the one whose answer shares the longest start
   with what was typed, the lowest of those. Its sum then flashes with its answer. */
export function aimedAt(input, bubbles) {
  let best = null, bl = -1;
  for (const b of bubbles) {
    const a = String(b.ans); let l = 0;
    while (l < a.length && l < input.length && a[l] === input[l]) l++;
    if (l > bl || (l === bl && b.y > best.y)) { best = b; bl = l; }
  }
  return best;
}

/* ------------------------------------------------------------ the clock */

/* How much game time a frame is worth: the real time since the last one, never more than
   MAX_STEP_MS (a tab that comes back does not drop a minute of bubbles at once). */
export const stepMs = (last, now) => Math.max(0, Math.min(MAX_STEP_MS, now - last));

/* ------------------------------------------------------------ the level rule */

/* After a standard round: right = bubbles popped, total = bubbles served. */
export const rushVerdict = (k, pops, served) => afterRound(k, GAME, pops, served);
