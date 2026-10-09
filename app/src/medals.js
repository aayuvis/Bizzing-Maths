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
// Beat the Timer (timer.js): targets hit, the highest level reached in a theme, the biggest gain on a best
const tm = (k) => k.timer || {};
const puzzlesRight = (k) => Object.values(k.puzzles || {}).reduce((a, p) => a + (p.right || 0), 0);

export const MEDALS = [
  { id: 'first-star', name: 'First star', desc: 'Pass your first stop.', did: 'You passed your first stop.', need: 1, have: (k) => stopsAt(k, 1) },
  { id: 'first-land', name: 'Land crossed', desc: 'Pass your first land test.', did: 'You passed your first land test.', need: 1, have: (k) => tests(k).filter(([key]) => !key.endsWith(':level')).length },
  { id: 'level-up', name: 'Level up', desc: 'Pass a Level test.', did: 'You passed a Level test.', need: 1, have: (k) => tests(k).filter(([key]) => key.endsWith(':level')).length },
  { id: 'quick-25', name: 'Quick hands', desc: '25 facts fluent — still fast after a gap.', did: 'Twenty-five facts are fluent — still fast after a gap.', need: 25, have: fluent },
  { id: 'fluent-100', name: 'Hundred fluent', desc: '100 facts fluent — still fast after a gap.', did: 'A hundred facts are fluent — still fast after a gap.', need: 100, have: fluent },
  { id: 'fearless', name: 'Fast and fearless', desc: 'Three stars on ten stops.', did: 'Three stars on ten stops.', need: 10, have: (k) => stopsAt(k, 3) },
  { id: 'tower-4', name: 'Fourth floor', desc: 'Clear four floors of the Puzzle Tower.', did: 'Four floors of the Puzzle Tower, cleared.', need: 4, have: floors },
  { id: 'tower-top', name: 'Top of the tower', desc: 'Clear all twelve floors.', did: 'All twelve floors of the Puzzle Tower, cleared.', need: 12, have: floors },
  { id: 'puzzler', name: 'Puzzler', desc: 'Solve 30 puzzles.', did: 'Thirty puzzles solved.', need: 30, have: puzzlesRight },
  { id: 'stories', name: 'Story keeper', desc: 'Read ten stories to the end.', did: 'Ten stories read to the end.', need: 10, have: (k) => Object.keys(k.stories || {}).length },
  { id: 'explorer', name: 'Explorer', desc: 'Find three secrets along your road.', did: 'Three secrets found along your road.', need: 3, have: finds },
  { id: 'paper', name: 'Paper sat', desc: 'Finish a contest-style paper.', did: 'You finished a contest-style paper.', need: 1, have: (k) => ((k.papers || {}).log || []).length },
  { id: 'paper-half', name: 'Half marks', desc: 'Score half the points on a contest-style paper.', did: 'Half the points on a contest-style paper.', need: 1, have: (k) => (((k.papers || {}).log || []).some((x) => x.points * 2 >= x.max) ? 1 : 0) },
  { id: 'timer-first', name: 'On the clock', desc: 'Hit a Beat the Timer target.', did: 'You hit your first Beat the Timer target.', need: 1, have: (k) => Object.keys(tm(k).hit || {}).length },
  { id: 'timer-five', name: 'Level five', desc: 'Reach level 5 in a Beat the Timer theme.', did: 'Level 5 in a Beat the Timer theme.', need: 5, have: (k) => Math.max(1, ...Object.values(tm(k).lv || {})) },
  { id: 'timer-beat', name: 'Five better', desc: 'Beat your own best by 5 in Beat the Timer.', did: 'You beat your own best by five.', need: 5, have: (k) => tm(k).beat || 0 },
  { id: 'contest', name: 'Contender', desc: 'Finish a mock contest.', did: 'You finished a mock contest.', need: 1, have: (k) => (k.contest || {}).done || 0 },
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
