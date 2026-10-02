/* medals.js — twelve medals, every one EARNED FROM EVIDENCE (family standard §8).

   A medal is computed from the child's own record, never handed out: nothing
   arrives for opening the app, for time spent or for a run of days (no
   streaks). Each one names exactly what earned it, on the medal. The date it
   was first seen is kept on the child so it is celebrated once and only once.
   Art is the family medallion (the Hive's gold rim), painted by tools/art/gen.py.

   `have(k)` returns how far along the child is; `need` is the bar. Both are
   counts a grown-up could check by hand from the record. */

import { TRICKS } from './tricks.js';
import { OPS, tally } from './facts.js';

const stopsAt = (k, stars) => TRICKS.filter((t) => ((k.tricks[t.id] || {}).stars || 0) >= stars).length;
const fluent = (k) => OPS.reduce((a, o) => a + tally(k.facts, o).fluent, 0);
const tests = (k) => Object.entries((k.journey || {}).tests || {}).filter(([, r]) => r.passed);
const floors = (k) => Object.values(k.quest || {}).filter((q) => q.passed).length;
const finds = (k) => Object.values((k.journey || {}).finds || {}).reduce((a, f) => a + Object.values(f).filter(Boolean).length, 0);
const puzzlesRight = (k) => Object.values(k.puzzles || {}).reduce((a, p) => a + (p.right || 0), 0);

export const MEDALS = [
  { id: 'first-star', name: 'First star', desc: 'Pass your first stop.', need: 1, have: (k) => stopsAt(k, 1) },
  { id: 'first-land', name: 'Land crossed', desc: 'Pass your first land test.', need: 1, have: (k) => tests(k).filter(([key]) => !key.endsWith(':level')).length },
  { id: 'level-up', name: 'Level up', desc: 'Pass a Level test.', need: 1, have: (k) => tests(k).filter(([key]) => key.endsWith(':level')).length },
  { id: 'quick-25', name: 'Quick hands', desc: '25 facts fluent — still fast after a gap.', need: 25, have: fluent },
  { id: 'fluent-100', name: 'Hundred fluent', desc: '100 facts fluent — still fast after a gap.', need: 100, have: fluent },
  { id: 'fearless', name: 'Fast and fearless', desc: 'Three stars on ten stops.', need: 10, have: (k) => stopsAt(k, 3) },
  { id: 'tower-4', name: 'Fourth floor', desc: 'Clear four floors of the Puzzle Tower.', need: 4, have: floors },
  { id: 'tower-top', name: 'Top of the tower', desc: 'Clear all twelve floors.', need: 12, have: floors },
  { id: 'puzzler', name: 'Puzzler', desc: 'Solve 30 puzzles.', need: 30, have: puzzlesRight },
  { id: 'stories', name: 'Story keeper', desc: 'Read ten stories to the end.', need: 10, have: (k) => Object.keys(k.stories || {}).length },
  { id: 'explorer', name: 'Explorer', desc: 'Find three secrets along your road.', need: 3, have: finds },
  { id: 'contest', name: 'Contender', desc: 'Finish a mock contest.', need: 1, have: (k) => (k.contest || {}).done || 0 },
];
export const medalById = Object.fromEntries(MEDALS.map((m) => [m.id, m]));

export function medalStates(k) {
  const got = k.medals || {};
  return MEDALS.map((m) => ({ ...m, now: Math.min(m.have(k), m.need), earned: got[m.id] || null }));
}

/* Record every medal the evidence now supports. Returns the newly earned ones,
   in order, so the app can celebrate each — once. */
export function award(k, now = Date.now()) {
  k.medals = k.medals || {};
  const fresh = [];
  for (const m of medalStates(k)) if (!m.earned && m.now >= m.need) { k.medals[m.id] = { at: now }; fresh.push(m); }
  return fresh;
}

export const earnedCount = (k) => Object.keys(k.medals || {}).length;
