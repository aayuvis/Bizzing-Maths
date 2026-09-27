/* journey.js — the ten levels a child climbs, and the test that finds their place.

   LEVELS (levels.js) are ten journeys, maths age 6 to 15+. Each is an ordered
   path of steps; a step is an Atlas stop at a drill level (1 warm-up, 2 stretch,
   3 champion), so one stop can come back, harder, in a later journey — the
   spiral. A step is done when that stop's drill is passed at that level or a
   harder one, anywhere in the app. When every step of the child's level is
   done, they move up to the next.

   The level test is a staircase: three questions at a level; two right and it
   climbs, fewer and it steps down, and it stops where a pass sits under a miss.
   The level they settle at is their working level — "maths age 9" means they
   are secure below age 9 and learning at it. Like placement, it is a ceiling,
   never a score: it is shown once, to place them, and never in a report. */

import { LEVELS, ageOf, CONCEPT_OF } from './levels.js';
import { byId, dress } from './tricks.js';

export const TOP = LEVELS.length;
export const PER_LEVEL = 3, PASS_AT = 2;
export const levelOf = (n) => LEVELS[n - 1];
export const stepKey = (s) => `${s.stop}@${s.lv}`;

export function rec(k) {
  return k.journey || (k.journey = { level: null, done: {}, finished: [], tested: null });
}

/* Where the test starts: a guess from the age band, so nobody sits through
   questions years below or above them. */
export const startLevel = (band) => ({ '6-7': 1, '8-10': 3, '11-14': 6 }[band] || 1);

/* A step is done if the stop has been passed at this level or a harder one. */
export const stepDone = (j, s) => [1, 2, 3].some((lv) => lv >= s.lv && j.done[`${s.stop}@${lv}`]);

/* A child PLACED above Level 1 never walked the level below, so their journey
   opens with a recap of it: one step per concept that level taught — the last
   (hardest) step of each — before the level's own. A child who climbed here
   by finishing the level below has just done it, and gets no recap. */
export function recapOf(n) {
  if (n <= 1) return [];
  const seen = new Map();
  for (const s of levelOf(n - 1).steps) seen.set(CONCEPT_OF[s.stop], s);   // last step of each concept wins
  return [...seen.values()].map((s) => ({ ...s, recap: true }));
}
export const stepsOf = (j, n) => [...(j.recap === n ? recapOf(n) : []), ...levelOf(n).steps];

/* A level is ONE road. Its stations open strictly in order — station n+1 opens
   when station n is passed — and after the last station comes the LEVEL CHECK:
   CHECK_N mixed questions from the whole level, CHECK_PASS right to pass. Passing
   the check is the moment a child moves up a maths age; nothing else moves them. */
export const CHECK_N = 12, CHECK_PASS = 10;

export function progress(k) {
  const j = rec(k);
  if (!j.level) return null;
  const L = levelOf(j.level), raw = stepsOf(j, j.level);
  const steps = []; let open = true;
  raw.forEach((s, i) => {
    const done = stepDone(j, s);
    steps.push({ ...s, i, done, open: done || open, t: byId[s.stop] });
    if (!done) open = false;                 // everything after the first unpassed station waits
  });
  const done = steps.filter((s) => s.done).length, next = steps.find((s) => !s.done) || null;
  return { level: j.level, L, age: ageOf(j.level), steps, done, total: steps.length, next,
    checkOpen: !next, top: j.level === TOP, finishedTop: j.finished.includes(TOP) };
}

/* Is this stop open on the child's road? (Stops of earlier levels are always
   open — see model.levelOpen; this is about the current level's order.) */
export function onRoad(k, stop) {
  const p = progress(k); if (!p) return null;
  const s = p.steps.find((x) => x.stop === stop);
  return s ? { open: s.open, done: s.done, n: s.i + 1 } : null;
}

/* A drill passed at `lv` on `stop` (70% or more): records it, and says whether
   it ticked a station of the child's road. It never moves a level — the check does. */
export function passed(k, stop, lv) {
  const j = rec(k), key = `${stop}@${lv}`, was = !!j.done[key];
  j.done[key] = true;
  if (!j.level) return { ticked: false, checkOpen: false };
  const ticked = !was && stepsOf(j, j.level).some((s) => s.stop === stop && s.lv <= lv);
  const p = progress(k);
  return { ticked, checkOpen: p.checkOpen, next: p.next };
}

/* The level check: CHECK_N questions, spread across the level's stations (each
   at its own drill level), never the same stop twice in a row. */
export function checkItems(k, r = Math.random) {
  const j = rec(k), steps = levelOf(j.level).steps, out = [];
  const order = steps.map((s) => [r(), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  for (let i = 0; out.length < CHECK_N; i++) {
    const s = order[i % order.length], t = byId[s.stop];
    out.push({ ...dress(t, t.gen(r, s.lv)), trick: s.stop });
  }
  return out;
}

/* The check is passed: the level is finished and the next road opens. */
export function checkPassed(k, right) {
  const j = rec(k), p = progress(k);
  if (!p || !p.checkOpen || right < CHECK_PASS) return { moved: false };
  const from = j.level;
  if (!j.finished.includes(from)) j.finished.push(from);
  if (j.level < TOP) j.level++;
  j.recap = null;                          // they climbed here: the level below is fresh
  return { moved: j.level !== from, from, to: j.level };
}

/* ------------------------------------------------------------- the level test */

export function newTest(band) {
  return { L: startLevel(band), at: {}, used: [], done: false, result: null };
}

/* One question at level L: a random step of that journey, at its own drill
   level, never the same stop twice in one test. */
export function question(st, r = Math.random) {
  const steps = levelOf(st.L).steps.filter((s) => !st.used.includes(s.stop));
  const pool = steps.length ? steps : levelOf(st.L).steps;
  const s = pool[Math.floor(r() * pool.length)];
  st.used.push(s.stop);
  const q = dress(byId[s.stop], byId[s.stop].gen(r, s.lv));
  return { ...q, trick: s.stop, tlevel: st.L };
}

/* Record an answer; returns true while the test wants another question. */
export function answer(st, right) {
  const a = st.at[st.L] || (st.at[st.L] = { asked: 0, right: 0 });
  a.asked++; if (right) a.right++;
  const wrongs = a.asked - a.right;
  const decided = a.right >= PASS_AT ? 'pass' : wrongs > PER_LEVEL - PASS_AT ? 'fail' : null;
  if (!decided) return true;
  a.pass = decided === 'pass';
  const up = st.L + 1, down = st.L - 1;
  if (a.pass) {
    if (st.L === TOP) return finish(st, TOP);
    if (st.at[up]) return finish(st, up);                 // passed here, missed above: working at `up`
    st.L = up; return true;
  }
  if (st.L === 1) return finish(st, 1);
  if (st.at[down] && st.at[down].pass) return finish(st, st.L);
  st.L = down; return true;
}
function finish(st, level) { st.done = true; st.result = level; return false; }

/* Put the child on the journey the test found. Steps they have already passed
   elsewhere in the app stay passed. */
export function place(k, level) {
  const j = rec(k);
  j.level = Math.max(1, Math.min(TOP, level));
  j.recap = j.level > 1 ? j.level : null;   // placed, not climbed: recap the level below first
  j.tested = { level: j.level, at: Date.now() };
  return j.level;
}

export { LEVELS, ageOf };
