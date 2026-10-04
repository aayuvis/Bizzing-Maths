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

/* The five choices: the answer and four distinct wrong ones, sorted. */
export function choicesFor(ans, wrong, r) {
  const pool = shuffle([...new Set(wrong.map(String))].filter((w) => !same(w, ans)), r).slice(0, 4);
  if (pool.length < 4) return null;
  const all = [String(ans), ...pool];
  const keyed = all.every((v) => order(v) != null);
  return keyed ? all.sort((a, b) => order(a) - order(b)) : all.sort((a, b) => a.localeCompare(b));
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
      for (let tries = 0; tries < 6 && !choices; tries++) { q = t.make(r, band); choices = choicesFor(q.ans, q.wrong || [], r); }
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
