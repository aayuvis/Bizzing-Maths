/* papers/engine.js — the contest-style paper simulator (docs/PAPER-CONTRACT.md).

   A paper is assembled from the problem banks: three sections, worth 3, 4 and
   5 points, each drawn from that tier's templates for the band without ever
   repeating a template. Papers 1–60 of a band are FIXED — seeded by band and
   number, so "Paper 12" is the same paper in every house and can be sat again
   — and a fresh paper is unlimited.

   Every problem was proved by its template (solve(params) finds exactly the
   stated answer); the engine only adds the choices: four of the template's
   wrong answers beside the right one, sorted, so the letter never leaks it.

   Scoring is the contest style: start with as many points as there are
   questions; a right answer adds its points; a wrong one loses a quarter of
   them; a blank costs nothing. A guess has a price, and the review says so. */

import { TEMPLATES as YOUNG } from './bank-young.js';
import { TEMPLATES as OLD } from './bank-old.js';
import { seeded, shuffle } from '../rand.js';
import { BANDS, BAND_IDS, FIXED } from './bands.js';

export const ALL = [...YOUNG, ...OLD];
export { BANDS, BAND_IDS, FIXED };
export const TIERS = [3, 4, 5];
export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/* The band a child sits by default: from the journey level if they are on one,
   else from their age band. They can always choose another. */
export function bandFor(k) {
  const lv = k && k.journey && k.journey.level;
  if (lv) return lv <= 2 ? 'g12' : lv <= 4 ? 'g34' : lv <= 6 ? 'g56' : 'g78';
  return { '6-7': 'g12', '8-10': 'g34', '11-14': 'g56' }[k && k.band] || 'g34';
}

const same = (a, b) => String(a) === String(b);
const num = (v) => typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v));
const fracVal = (v) => { const m = /^(-?\d+)\/(\d+)$/.exec(String(v)); return m ? +m[1] / +m[2] : null; };
const order = (v) => (num(v) ? +v : fracVal(v));

/* The five choices (games spec §1.2). Sorting by value used to leak: the template's wrong
   answers cluster round the answer, so it sat at B, C or D 88% of the time and "always C"
   beat chance by 17 points. Now:
   - the four wrong answers are picked so the answer's RANK among the five values is drawn
     evenly from 0..4 where the template's wrong answers allow it (some below, some above),
     and, within that, the spreads on the two sides are matched as closely as the pool allows
     — so neither "the middle value" nor "the odd one out" finds it;
   - then the five POSITIONS are a seeded shuffle, so each letter holds a fifth of the answers;
   - a question about order (`order: true` on the problem) keeps its choices sorted, and the
     answer's balanced rank IS its position.
   `r` is the paper's stream and is consumed exactly as before (one shuffle of the wrong
   answers), so every fixed paper keeps the same problems; `pos` is a separate seeded stream
   for the rank and the positions. */
export function choicesFor(ans, wrong, r, { pos = null, order: sorted = false } = {}) {
  const pool = shuffle([...new Set(wrong.map(String))].filter((w) => !same(w, ans)), r);
  if (pool.length < 4) return null;
  const pr = pos || seeded(`pos:${ans}:${pool.join('|')}`);
  const a = String(ans), keyed = order(a) != null && pool.every((v) => order(v) != null);
  const four = keyed ? balanced(a, pool, pr) : pool.slice(0, 4);
  const all = [a, ...four];
  if (sorted && keyed) return all.sort((x, y) => order(x) - order(y));
  return shuffle(all, pr);
}

/* Four wrong answers with the answer at a balanced rank and the two sides' spreads matched. */
function balanced(a, pool, pr) {
  const v = order(a), below = pool.filter((w) => order(w) < v), above = pool.filter((w) => order(w) > v);
  const want = Math.floor(pr() * 5);
  // a whole-number answer whose template has too few wrong answers on the side the rank needs gets
  // near misses there (never below 0): solve() proved the answer is the ONLY one, so any other whole
  // number is wrong — and a near miss is the most tempting kind of wrong
  if (/^\d+$/.test(a)) {
    const have = new Set(pool);
    for (let d = 1; below.length < want && v - d >= 0 && d <= 12; d++) if (!have.has(String(v - d))) below.push(String(v - d));
    for (let d = 1; above.length < 4 - want && d <= 12; d++) if (!have.has(String(v + d))) above.push(String(v + d));
  }
  const lo = Math.max(0, 4 - above.length), hi = Math.min(4, below.length);
  const t = Math.min(hi, Math.max(lo, want));
  // the nearest on each side first, then the template's own preference order (real mistakes first)
  const near = (side) => side.slice().sort((x, y) => Math.abs(order(x) - v) - Math.abs(order(y) - v));
  const b = near(below), u = near(above);
  let best = null;
  // every way of taking t from below and 4 − t from above among the nearest few: matched spreads win
  const pickN = (arr, n) => { const out = []; const go = (i, acc) => { if (acc.length === n) return out.push(acc); for (let j = i; j < Math.min(arr.length, 6); j++) go(j + 1, [...acc, arr[j]]); }; go(0, []); return out; };
  for (const L of pickN(b, t)) for (const U of pickN(u, 4 - t)) {
    const sl = L.length ? Math.max(...L.map((x) => v - order(x))) : 0, su = U.length ? Math.max(...U.map((x) => order(x) - v)) : 0;
    const cost = L.length && U.length ? Math.abs(Math.log((sl + 1e-9) / (su + 1e-9))) : 0;
    const tie = pr();
    if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && tie < best.tie)) best = { cost, tie, set: [...L, ...U] };
  }
  return best ? best.set : pool.slice(0, 4);
}

/* Assemble a paper. `no` is 1..FIXED for a fixed paper, or any string for a fresh one. */
export function paper(band, no, pool = ALL) {
  const B = BANDS[band]; if (!B) throw new Error('no band ' + band);
  const r = seeded(`paper:${band}:${no}`);
  const items = [];
  for (const tier of TIERS) {
    const ts = shuffle(pool.filter((t) => t.tier === tier && t.bands.includes(band)), r);
    let taken = 0;
    for (const t of ts) {
      if (taken === B.per) break;
      let q = null, choices = null;
      const pos = seeded(`pos:${band}:${no}:${items.length}`);
      for (let tries = 0; tries < 6 && !choices; tries++) { q = t.make(r, band); choices = choicesFor(q.ans, q.wrong || [], r, { pos, order: !!q.order }); }
      if (!choices) continue;
      items.push({ tid: t.id, tier, pts: tier, topic: t.topic, strategy: t.strategy, text: q.text, fig: q.fig || '', why: q.why || '', ans: String(q.ans), choices, params: q.params });
      taken++;
    }
  }
  return { band, no, items, mins: B.mins };
}

/* Score answers (index → choice string, or undefined for a blank). */
export function score(p, answers) {
  const n = p.items.length;
  const out = { points: n, max: n + p.items.reduce((a, q) => a + q.pts, 0), right: 0, wrong: 0, blank: 0, tiers: {}, missed: [] };
  p.items.forEach((q, i) => {
    const t = out.tiers[q.tier] || (out.tiers[q.tier] = { right: 0, wrong: 0, blank: 0, n: 0 });
    t.n++;
    const a = answers[i];
    if (a == null) { out.blank++; t.blank++; out.missed.push({ i, q, given: null }); }
    else if (same(a, q.ans)) { out.right++; t.right++; out.points += q.pts; }
    else { out.wrong++; t.wrong++; out.points -= q.pts / 4; out.missed.push({ i, q, given: a }); }
  });
  out.pct = Math.round(100 * out.points / out.max);
  return out;
}

/* The strategies a paper's misses point to, most-missed first: where to practise. */
export function practiseNext(sc) {
  const m = {};
  for (const x of sc.missed) m[x.q.strategy] = (m[x.q.strategy] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
}

/* The child's record of a sitting: best points per fixed paper, and the last few. */
export function record(k, p, sc, now = Date.now()) {
  const P = k.papers || (k.papers = { best: {}, log: [] });
  const key = `${p.band}:${p.no}`;
  if (typeof p.no === 'number') P.best[key] = Math.max(P.best[key] ?? -Infinity, sc.points);
  P.log.push({ band: p.band, no: p.no, at: now, points: sc.points, max: sc.max, right: sc.right, wrong: sc.wrong, blank: sc.blank });
  if (P.log.length > 50) P.log.splice(0, P.log.length - 50);
  return P;
}
export const sat = (k) => ((k.papers || {}).log || []).length;
export const bestPct = (k, band) => Math.max(0, ...((k.papers || {}).log || []).filter((x) => !band || x.band === band).map((x) => Math.round(100 * x.points / x.max)));
