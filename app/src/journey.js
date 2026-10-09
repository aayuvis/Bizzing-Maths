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
  return k.journey || (k.journey = { level: null, done: {}, finished: [], tested: null, tests: {} });
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

/* A level is ONE road through several LANDS (one concept area each — "Fractions
   of an amount", "Below zero"). Everything on it opens strictly in order:

     land 1: station, station, … → LAND TEST → land 2: … → LAND TEST → … → LEVEL TEST

   A land test is LAND_N questions that get harder as they go (LAND_PASS right to
   pass), then LAND_BONUS optional bonus questions at almost the next level's
   difficulty, worth double. The level test is LEVEL_N mixed questions from every
   land (LEVEL_PASS to pass) and LEVEL_BONUS bonus questions. Bonus answers only
   ever add to the score — a pass is decided on the core questions alone. Passing
   the level test is the one thing that moves a child up a maths age. */
export const LAND_N = 20, LAND_PASS = 12, LAND_BONUS = 5;
export const LEVEL_N = 50, LEVEL_PASS = 30, LEVEL_BONUS = 10;

/* What a test gate says before a child goes in (the Atlas road card). One
   function, so the screen and its recording (tools/voice/clips.mjs) cannot differ. */
export const testBlurb = (lvl, n) => (lvl
  ? `${LEVEL_N} questions from every land, getting harder. ${LEVEL_PASS} right passes — and moves you up to ${ageOf(Math.min(10, n + 1))}. Then ${LEVEL_BONUS} bonus questions, double points.`
  : `${LAND_N} questions from this land, getting harder. ${LAND_PASS} right opens the road on. Then ${LAND_BONUS} bonus questions at almost the next level, double points.`);

/* A level's lands, from levels.js — or, for a level written without lands, one
   land per concept in first-appearance order. */
export function landsOf(n) {
  const L = levelOf(n);
  if (L.lands && L.lands.length) return L.lands;
  const by = new Map();
  for (const s of L.steps) { const c = CONCEPT_OF[s.stop]; if (!by.has(c)) by.set(c, []); by.get(c).push(s); }
  return [...by.entries()].map(([c, steps]) => ({ id: `l${n}-${c}`, concept: c, name: c, world: byId[steps[0].stop].world, steps }));
}
const testKey = (n, landId) => (landId ? `L${n}:${landId}` : `L${n}:level`);
export const testRec = (j, n, landId) => (j.tests || {})[testKey(n, landId)] || null;

/* The whole road of a level as one ordered list of nodes, each marked done/open. */
export function roadOf(k, n) {
  const j = rec(k), own = n === j.level, walked = n < (j.level || 0) || j.finished.includes(n), ahead = n > (j.level || 0);
  const nodes = [];
  if (own && j.recap === n) {
    const rc = recapOf(n);
    if (rc.length) nodes.push({ kind: 'land', recap: true, land: { id: `l${n}-recap`, name: `Recap of Level ${n - 1}`, world: byId[rc[0].stop].world, steps: rc } });
    rc.forEach((s) => nodes.push({ kind: 'stop', recap: true, ...s }));
  }
  for (const land of landsOf(n)) {
    nodes.push({ kind: 'land', land });
    land.steps.forEach((s) => nodes.push({ kind: 'stop', land: land.id, ...s }));
    nodes.push({ kind: 'landtest', land });
  }
  nodes.push({ kind: 'leveltest' });
  let open = true;
  for (const x of nodes) {
    if (x.kind === 'land') { x.open = !ahead && (open || walked); x.done = false; continue; }
    x.done = x.kind === 'stop' ? stepDone(j, x) : x.kind === 'landtest' ? !!(testRec(j, n, x.land.id) || {}).passed : j.finished.includes(n);
    x.open = !ahead && (walked || x.done || open);
    if (!x.done && !walked) open = false;       // everything after the first unfinished node waits
  }
  return nodes;
}

export function progress(k) {
  const j = rec(k);
  if (!j.level) return null;
  const L = levelOf(j.level), nodes = roadOf(k, j.level);
  const stops = nodes.filter((x) => x.kind === 'stop').map((x, i) => ({ ...x, i, t: byId[x.stop] }));
  const next = nodes.find((x) => x.kind !== 'land' && !x.done) || null;
  return { level: j.level, L, age: ageOf(j.level), nodes, steps: stops, done: stops.filter((s) => s.done).length, total: stops.length,
    next: next && next.kind === 'stop' ? { ...next, t: byId[next.stop] } : null, nextTest: next && next.kind !== 'stop' ? next : null,
    top: j.level === TOP, finishedTop: j.finished.includes(TOP) };
}

/* Is this stop open on the child's road? */
export function onRoad(k, stop) {
  const p = progress(k); if (!p) return null;
  const s = p.steps.find((x) => x.stop === stop);
  return s ? { open: s.open, done: s.done, n: s.i + 1 } : null;
}

/* A drill passed at `lv` on `stop` (70% or more). It never moves a level. */
export function passed(k, stop, lv) {
  const j = rec(k), key = `${stop}@${lv}`, was = !!j.done[key];
  j.done[key] = true;
  if (!j.level) return { ticked: false };
  const ticked = !was && stepsOf(j, j.level).some((s) => s.stop === stop && s.lv <= lv);
  const p = progress(k);
  return { ticked, next: p.next, nextTest: p.nextTest };
}

/* ------------------------------------------------------------- the tests */

/* Questions that get harder as they go: the ramp climbs from warm-up to the
   difficulty each step has on this road; bonus questions sit one notch above
   (almost the next level). Steps are dealt round-robin so every stop is asked. */
function ramp(steps, n, bonus, r) {
  const deal = steps.map((s) => [r(), s]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const core = [], extra = [];
  for (let i = 0; i < n; i++) {
    const s = deal[i % deal.length], stage = i / Math.max(1, n - 1);
    const lv = Math.max(1, Math.min(s.lv, 1 + Math.floor(stage * 3)));
    core.push({ s, lv });
  }
  core.sort((a, b) => a.lv - b.lv);                        // easiest first, hardest last
  for (let i = 0; i < bonus; i++) { const s = deal[(i * 3 + 1) % deal.length]; extra.push({ s, lv: Math.min(3, s.lv + 1), bonus: true }); }
  return [...core, ...extra].map(({ s, lv, bonus: b }) => { const t = byId[s.stop]; return { ...dress(t, t.gen(r, lv)), trick: s.stop, qlv: lv, bonus: !!b }; });
}

export function landTestItems(k, landId, r = Math.random) {
  const land = landsOf(rec(k).level).find((l) => l.id === landId);
  return ramp(land.steps, LAND_N, LAND_BONUS, r);
}
export function levelTestItems(k, r = Math.random) {
  const lands = landsOf(rec(k).level);
  const all = lands.flatMap((l) => l.steps);
  return ramp(all, LEVEL_N, LEVEL_BONUS, r);
}

/* Score a finished test. results[i].right for each item; core decides the pass,
   bonus doubles. Stars: one for the pass, two for a strong core, three for a
   strong core AND most of the bonus. */
export function score(items, results, kind) {
  const N = kind === 'level' ? LEVEL_N : LAND_N, PASS = kind === 'level' ? LEVEL_PASS : LAND_PASS;
  let core = 0, bonus = 0, bonusAsked = 0;
  items.forEach((q, i) => { const ok = results[i] && results[i].right; if (q.bonus) { if (results[i]) bonusAsked++; if (ok) bonus++; } else if (ok) core++; });
  const B = kind === 'level' ? LEVEL_BONUS : LAND_BONUS;
  const pass = core >= PASS;
  const stars = !pass ? 0 : core >= N * 0.9 && bonus >= Math.ceil(B * 0.6) ? 3 : core >= N * 0.8 ? 2 : 1;
  return { core, N, pass, PASS, bonus, B, bonusAsked, points: core + 2 * bonus, max: N + 2 * B, stars };
}

/* Record a land test. Returns the score and whether it opened the next part of the road. */
export function landTestDone(k, landId, items, results) {
  const j = rec(k), sc = score(items, results, 'land');
  j.tests = j.tests || {};
  const key = testKey(j.level, landId), was = j.tests[key] || { best: 0, passed: false, stars: 0 };
  j.tests[key] = { best: Math.max(was.best, sc.points), passed: was.passed || sc.pass, stars: Math.max(was.stars, sc.stars) };
  return { ...sc, first: sc.pass && !was.passed };
}

/* Record the level test; a pass finishes the level and opens the next road. */
export function levelTestDone(k, items, results) {
  const j = rec(k), p = progress(k), sc = score(items, results, 'level');
  j.tests = j.tests || {};
  const key = testKey(j.level), was = j.tests[key] || { best: 0, passed: false, stars: 0 };
  const from = j.level, ready = p && p.nextTest && p.nextTest.kind === 'leveltest';
  if (!ready) return { ...sc, moved: false, from, to: from };
  j.tests[key] = { best: Math.max(was.best, sc.points), passed: was.passed || sc.pass, stars: Math.max(was.stars, sc.stars) };
  if (!sc.pass) return { ...sc, moved: false, from, to: from };
  upsToSee(k);                             // the scenes already owed are counted before this one is added
  if (!j.finished.includes(from)) j.finished.push(from);
  if (j.level < TOP) j.level++;
  j.recap = null;                          // they climbed here: the level below is fresh
  return { ...sc, moved: j.level !== from, from, to: j.level };
}

/* The level-up scene (audit v4 L4) is owed for every level a child CLIMBED to — the level after
   one they finished by passing its test — and is shown once: `seenUp` lists the ones shown. A
   child placed by the level test climbed nothing, so they are owed nothing. The first time a
   record is read, the climbs it already holds count as seen: nobody sits through a parade. */
const climbed = (j) => (j.finished || []).map((f) => f + 1).filter((n) => n <= TOP && n <= (j.level || 0));
export function upsToSee(k) {
  const j = rec(k);
  if (!Array.isArray(j.seenUp)) j.seenUp = climbed(j);
  return climbed(j).filter((n) => !j.seenUp.includes(n));
}
export function sawUp(k, n) { const j = rec(k); upsToSee(k); if (!j.seenUp.includes(n)) j.seenUp.push(n); }
/* What the scene shows: the new level's name and age, and the painted plate of its first land. */
export function upScene(n) {
  const L = levelOf(n), first = landsOf(n)[0];
  return { n, name: L.name, age: ageOf(n), world: first ? first.world : 'gardens', land: first ? first.name : '' };
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

/* Why the test placed a child where it did (audit v4 A6): one REAL question from their own
   test that they got right — one short enough to fit in a sentence, from the hardest level at or
   below where they landed. Null when they got none right. */
export function placedBecause(items, results, level) {
  const got = items.map((q, i) => ({ q, ok: results[i] && results[i].right })).filter((x) => x.ok && x.q.tlevel && x.q.tlevel <= level);
  if (!got.length) return null;
  // a question short enough to read inside a sentence first; then the hardest; then the shortest
  const long = (q) => (String(q.text).length > 40 ? 1 : 0);
  const q = got.map((x) => x.q).sort((a, b) => long(a) - long(b) || b.tlevel - a.tlevel || String(a.text).length - String(b.text).length)[0];
  return { text: String(q.text), ans: String(q.ans), level: q.tlevel, said: saidRight(q) };
}
/* How the right answer reads inside "because you got … right": a box in the question is filled with the
   answer ("45,059 ☐ 45,059" → "45,059 = 45,059"), a question that asks takes it after ("What is 7 × 8? 56"),
   a short sum takes "= answer", and a long question stands alone rather than run on. */
export function saidRight(q) {
  const t = String(q.text).trim(), a = String(q.ans);
  if (/[☐□]/.test(t)) return t.replace(/[☐□]/, a);
  if (/\?$/.test(t)) return `${t} ${a}`;
  return t.length > 22 ? t : `${t} = ${a}`;
}

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

/* ------------------------------------------------------------- secrets on the map */

/* Every land hides three things to stumble on — the Bee's Expedition, without its
   coins (this app has one rule about rewards: right answers only, no loot):
     💡 a curiosity  — one question a notch harder than the land, with its reason
     🎭 a rival      — one of the Bee's ten children, best of three on this land
     🧩 a chest      — a puzzle from the Puzzle Tower
   They sit VISIBLY on the painting (the Bee's play-tested rule: no fog), in spots
   SEEDED per child and land, so a map reads as authored and a sibling's differs.
   Finding all three, with the land test passed, earns the land's emblem. */
export const SECRET_KINDS = [
  { k: 'wisp', glyph: '💡', name: 'A curious question', blurb: 'One question a notch harder than this land. Get it right and it tells you why.' },
  { k: 'duel', glyph: '🎭', name: 'A rival waits', blurb: 'Best of three on this land’s maths. Win two and the clearing is yours.' },
  { k: 'chest', glyph: '🧩', name: 'A puzzle chest', blurb: 'A puzzle from the Tower. Solve it and the chest opens.' },
];
const RIVALS = ['pixel', 'koi', 'beaker', 'panda', 'comet', 'astro', 'scopey', 'melody', 'samurai', 'goldlegend'];
function hash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function secretsOf(k, landId) {
  const h = hash(`${k.id}|${landId}`), f = ((rec(k).finds || {})[landId]) || {};
  const xs = [18 + (h % 20), 44 + ((h >>> 5) % 16), 70 + ((h >>> 9) % 18)];
  const order = [0, 1, 2].sort((a, b) => ((h >>> (a * 3)) & 7) - ((h >>> (b * 3)) & 7));
  return order.map((ki, i) => ({ ...SECRET_KINDS[ki], x: xs[i], y: 20 + ((h >>> (i * 4 + 2)) % 26), found: !!f[SECRET_KINDS[ki].k],
    rival: RIVALS[(h >>> 13) % RIVALS.length] }));
}
export function secretItems(k, landId, kind, r = Math.random) {
  const land = findLand(k, landId);
  const pick = () => land.steps[Math.floor(r() * land.steps.length)];
  const q = (s, lv) => { const t = byId[s.stop]; return { ...dress(t, t.gen(r, lv)), trick: s.stop }; };
  if (kind === 'wisp') { const s = pick(); return [{ ...q(s, Math.min(3, s.lv + 1)), why: byId[s.stop].idea }]; }
  if (kind === 'duel') return [0, 1, 2].map(() => { const s = pick(); return { ...q(s, s.lv), lv: s.lv }; });   // lv: how hard, for the rival (duel.js)
  return null;   // the chest is a puzzle: main.js asks puzzles.js
}
function findLand(k, landId) { for (const L of LEVELS) for (const l of landsOf(L.n)) if (l.id === landId) return l; return null; }
export function secretFound(k, landId, kind) {
  const j = rec(k); j.finds = j.finds || {};
  const f = j.finds[landId] = j.finds[landId] || {};
  const first = !f[kind]; f[kind] = true;
  return first;
}
export const emblem = (k, n, landId) => SECRET_KINDS.every((s) => ((rec(k).finds || {})[landId] || {})[s.k]) && !!(testRec(rec(k), n, landId) || {}).passed;
