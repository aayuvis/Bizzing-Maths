/* model.js — the household, the child, and every rule about progress.

   State is a HOUSEHOLD, not a child: { parent, kids[], active } — Finance's
   rule, because a second child must never inherit the first one's facts,
   stars or rank. Anything child-shaped lives on the kid.

   The child record holds: a first name (never a surname, never a birthday),
   an AGE BAND (never an age), an avatar, and progress. Nothing else. */

import { TRICKS, WORLDS, byId, tricksIn } from './tricks.js';
import { dayKey } from './rand.js';
import { LEVELS } from './levels.js';
import { onRoad } from './journey.js';

/* The first journey level each stop appears in. A child on journey level L has
   every lesson of level L and every level before it open in the Atlas — a
   child placed at Level 6 must be able to go back to anything Levels 1–5 teach. */
const FIRST_LEVEL = {};
for (const L of LEVELS) for (const s of L.steps) if (!(s.stop in FIRST_LEVEL)) FIRST_LEVEL[s.stop] = L.n;
export const onJourney = (k) => !!(k.journey && k.journey.level);
export const firstLevel = (id) => FIRST_LEVEL[id];
/* Earlier levels: everything open. The child's own level: only the stations
   the road has reached — a level is walked in order. Later levels: closed. */
export function levelOpen(k, id) {
  if (!onJourney(k)) return false;
  const L = k.journey.level, f = FIRST_LEVEL[id];
  if (f < L) return true;
  const r = onRoad(k, id);
  return !!(r && r.open);
}

export const BANDS = [
  { id: '6-7', label: '6–7', blurb: 'Starting out' },
  { id: '8-10', label: '8–10', blurb: 'Tables and tricks' },
  { id: '11-14', label: '11–14', blurb: 'Contest ready' },
];
export const bandRank = (b) => BANDS.findIndex((x) => x.id === b);

/* The avatars are the family's 96 (avatars.js, through integration/bizzing-avatars.js):
   twelve packs of eight, Common · Rare · Epic · Legendary. Commons are free to every child
   from the first day; the rest are bought with Bizzing coins at the family's fixed prices
   once their world is open, and a Legendary first asks for its learning milestone. No
   draws, no chance. A new child picks a Common (onboarding shows six). */
import { CATALOGUE, PACKS, AVATAR_IDS, COMMONS, byAvatar } from './avatars.js';
export const STARTER_AVATARS = ['cubebot', 'protortle', 'hexbee', 'phasefox', 'thermobear', 'ladybird'];
export const AVATARS = AVATAR_IDS;
export const AVATAR_PACKS = PACKS.map((p) => ({ ...p, avatars: CATALOGUE.filter((a) => a.pack === p.n).map((a) => a.id) }));
export const AVATAR_NAME = Object.fromEntries(CATALOGUE.map((a) => [a.id, a.name]));
/* Files kept outside the collection: the contest rivals and story cast, Aryabhata (the
   ceremony elder), and the first picker's animals, so a child who chose one long ago still
   sees themself. av() draws anything else as the first Common. */
export const AVATAR_KEPT = ['pixel', 'koi', 'panda', 'melody', 'samurai', 'goldlegend', 'aryabhatta',
  'redpanda', 'neko', 'pengu', 'froggy', 'capy', 'ottie', 'snowfox', 'bizzy',
  // Bizzing Bee's cosmos and lab faces, out of this app's 96 (they are Bee's): a child who wears one still sees it
  'rocket', 'astro', 'comet', 'luna', 'saturn', 'supernova', 'beaker', 'atom', 'magnet', 'scopey', 'robo', 'brainiac'];
const AVATAR_FILES = new Set([...AVATARS, ...AVATAR_KEPT]);
export const avatarFile = (id) => (AVATAR_FILES.has(id) ? id : COMMONS[0]);
export { byAvatar };

/* ---------------------------------------------------------------- ranks */

/* Nine ranks, each named for a step in how people learned to count. XP comes
   only from correct answers — never from time on the app — so the rank says
   something true about the child (the Bee's band rule). */
export const RANKS = [
  { n: 'Pebble', xp: 0, why: '"Calculus" is Latin for a small stone. The first counters were pebbles.' },
  { n: 'Tally', xp: 60, why: 'Notches cut in a stick or a bone: one mark, one thing.' },
  { n: 'Bead', xp: 180, why: 'Beads on a wire let you count past your fingers.' },
  { n: 'Abacus', xp: 400, why: 'A frame of beads, still used for fast arithmetic across Asia.' },
  { n: 'Zero', xp: 750, why: 'Brahmagupta, in 628 CE, wrote down rules for calculating with zero as a number.' },
  { n: 'Algorist', xp: 1250, why: 'The word "algorithm" comes from the name of al-Khwarizmi, who wrote about calculating with Indian numerals.' },
  { n: 'Lightning', xp: 2000, why: 'Mental calculators work faster than anyone can write.' },
  { n: 'Sutra', xp: 3000, why: 'A short rule you can carry in your head and use anywhere.' },
  { n: 'Aryabhata', xp: 4500, why: 'Aryabhata wrote the Aryabhatiya, a book of mathematics and astronomy, in 499 CE, aged twenty-three.' },
];
export function rankOf(xp) {
  let i = 0; while (i < RANKS.length - 1 && xp >= RANKS[i + 1].xp) i++;
  const r = RANKS[i], next = RANKS[i + 1];
  return { i, ...r, next, pct: next ? Math.round(100 * (xp - r.xp) / (next.xp - r.xp)) : 100 };
}

/* ---------------------------------------------------------------- kids */

export function newHousehold() { return { v: 7, kids: [], active: null, parent: { pin: null, tester: false, plan: 'free' } }; }

/* Read-aloud: a choice a grown-up made wins; until one is made it follows the
   band — on for 6–7, on tap for everyone older. Decided at read time, so no
   stored child is rewritten and a band change carries it along. */
export const readOn = (k) => !!k && (k.prefs && k.prefs.read != null ? !!k.prefs.read : k.band === '6-7');

export function newKid(name, band, avatar) {
  return {
    id: 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name: String(name || '').trim().slice(0, 20) || 'Friend',
    band, avatar: COMMONS.includes(avatar) ? avatar : COMMONS[0],   // a new child starts with a Common
    xp: 0,
    facts: {},            // fact key → fluency record (facts.js)
    tricks: {},           // trick id → { stars, best, learned, runs }
    checks: {},           // world id → { best, passed }
    games: {},            // game id → { best, plays }
    contest: { best: null, runs: 0, wins: 0 },
    stories: {},          // trick id → true once the story has been read to the end
    puzzles: {},          // family id → { right, tries }; sudoku → { solved: {size: n} }
    quest: {},            // tower floor → { stars, passed }
    lib: {},              // library tool id → that tool's own record
    journey: { level: null, done: {}, finished: [], tested: null },   // journey.js: the ten levels
    medals: {},           // medal id → { at, seen } — earned from evidence, celebrated once
    weeks: {},            // week (Monday's day key) → what the child could do that week — report.js
    shop: { owned: [], worn: {}, avatars: [], worlds: [] },   // bought with Bizzing coins: frames (Extras), avatars, worlds 3–6 — the coins live in the family wallet
    mistakes: {},         // the mistakes deck: missed questions that come back after a gap (mistakes.js)
    coinNotes: {},        // ledger time → what this app paid it for, so the wallet history can say it in words
    placed: null,         // index into the stop order the child may start from
    daily: {},            // dayKey → { puzzle: bool }
    days: {},             // dayKey → { q, ok } — answers per day, for the grown-up's week
    created: Date.now(),
    prefs: { op: band === '6-7' ? '+' : '×', timer: true, read: null, targets: { answers: 20, stops: 1, puzzle: 1 } },   // read: null follows the band (readOn); targets: the grown-up's daily ring
  };
}

export const kid = (h) => h.kids.find((k) => k.id === h.active) || null;

/* Every answered question lands here once. XP only for right answers. */
export function tick(k, right, xp = 1) {
  const d = dayKey();
  const day = k.days[d] || (k.days[d] = { q: 0, ok: 0 });
  day.q++; if (right) { day.ok++; k.xp += xp; }
  // keep ninety days; the week view only reads seven
  const keys = Object.keys(k.days).sort();
  while (keys.length > 90) delete k.days[keys.shift()];
}

/* ---------------------------------------------------------------- the atlas */

/* The route: every world's stops in order, then that world's checkpoint. */
export const ROUTE = WORLDS.flatMap((w) => [
  ...tricksIn(w.id).map((t) => ({ kind: 'stop', id: t.id, world: w.id })),
  { kind: 'check', id: 'check:' + w.id, world: w.id },
]);

export const trickRec = (k, id) => k.tricks[id] || (k.tricks[id] = { stars: 0, best: 0, learned: false, runs: 0 });

export function nodeDone(k, node) {
  if (node.kind === 'check') return !!(k.checks[node.world] && k.checks[node.world].passed);
  const r = k.tricks[node.id]; return !!(r && r.stars >= 2);
}

/* A node's age band: a stop's own, a checkpoint's world's. */
export const nodeBand = (n) => (n.kind === 'stop' ? byId[n.id].band : WORLDS.find((w) => w.id === n.world).band);

/* Optional for THIS child: placement put them past it, or it is meant for a
   younger band. Optional nodes stay open to wander, but the road does not
   wait on them — an eight-year-old's "next stop" is never Make ten first. */
export const optional = (k, n, i) => (k.placed != null && i < k.placed) || bandRank(nodeBand(n)) < bandRank(k.band);

/* ---- gating: worlds open by age band, or when the place before them is done.

   Eighteen worlds cannot be one road: a six-year-old would stand behind the
   Mental Workshop and never reach Time and Money. So a WORLD opens when its
   age band is at or below the child's, or when its prerequisite world's
   checkpoint is passed (or placement put the child past it). Inside a world
   the stops still open one at a time, in order — a world teaches in order. */
export const NEEDS = {
  workshop: 'market', forest: 'market', observatory: 'workshop', palace: 'market',
  dock: 'bakery', setisland: 'forest', harbour: 'observatory',
  quarry: 'forest', mine: 'library', lighthouse: 'palace',
};
const firstIndex = (wid) => ROUTE.findIndex((n) => n.world === wid);

export function worldOpen(h, k, wid) {
  if (h.parent.tester) return true;
  const w = WORLDS.find((x) => x.id === wid); if (!w) return false;
  if (firstIndex(wid) === 0 || bandRank(w.band) <= bandRank(k.band)) return true;
  if (k.placed != null && firstIndex(wid) <= k.placed) return true;
  if (onJourney(k)) return ROUTE.some((n) => n.world === wid && (nodeDone(k, n) || (n.kind === 'stop' && levelOpen(k, n.id))));
  const need = NEEDS[wid];
  return !!(need && k.checks[need] && k.checks[need].passed) || ROUTE.some((n) => n.world === wid && nodeDone(k, n));
}

/* The next thing to do: the first node, in road order, in an open world,
   that is neither passed nor optional for this child. */
export function frontier(k, h = null) {
  const hh = h || { parent: {} };
  const i = ROUTE.findIndex((n, j) => !nodeDone(k, n) && !optional(k, n, j) && worldOpen(hh, k, n.world));
  return i < 0 ? ROUTE.length : i;
}

/* A node is open if it is passed, optional for this child (a younger band's
   stop, or placement put them past it), or it is the first unpassed stop of
   an open world. Tester mode opens everything — and changes nothing else. */
export function isOpen(h, k, i) {
  if (h.parent.tester) return true;
  const node = ROUTE[i]; if (!node) return false;
  if (nodeDone(k, node)) return true;
  // a child on a journey walks the road: the Atlas opens exactly what the road has reached
  if (onJourney(k)) return node.kind === 'stop' ? levelOpen(k, node.id) : ROUTE.every((n) => n.world !== node.world || n.kind !== 'stop' || nodeDone(k, n));
  if (!worldOpen(h, k, node.world)) return false;
  if (optional(k, node, i)) return true;
  const first = ROUTE.findIndex((n, j) => n.world === node.world && !nodeDone(k, n) && !optional(k, n, j));
  return first === i;
}

/* Stars, three per stop, and each one says what it is for:
     ★   worked through the trick with your own steps ("Your turn")
     ★★  the drill at 70% or better — this is what opens the next stop
     ★★★ the drill at 90% or better, inside the time — fast AND fearless */
export const PASS = 0.7, ACE = 0.9;
export function scoreRun(k, id, right, total, inTime) {
  const r = trickRec(k, id);
  const pct = total ? right / total : 0;
  r.runs++; r.best = Math.max(r.best, Math.round(pct * 100));
  let s = r.learned ? 1 : 0;
  if (pct >= PASS) s = Math.max(s, 2);
  if (pct >= ACE && inTime) s = 3;
  const before = r.stars;
  r.stars = Math.max(r.stars, s);
  return { pct, stars: r.stars, gained: r.stars - before };
}

export const CHECK_PASS = 0.8;

/* The world a checkpoint's questions come from. */
export const checkTricks = (wid) => tricksIn(wid);

export function atlasSummary(k) {
  const f = frontier(k);
  const node = ROUTE[f];
  return {
    at: f, allDone: f >= ROUTE.length,
    node, world: node ? WORLDS.find((w) => w.id === node.world) : WORLDS.at(-1),
    trick: node && node.kind === 'stop' ? byId[node.id] : null,
    stars: TRICKS.reduce((s, t) => s + ((k.tricks[t.id] || {}).stars || 0), 0),
    maxStars: TRICKS.length * 3,
  };
}

/* ---------------------------------------------------------------- placement */

/* "Find my start" — twelve rungs up the route, stopping after two misses in a
   row. Like Finance's placement it writes a CEILING, never a score: it is
   never shown as a number, never in a report. It only decides which stops are
   open on day one. Each rung names the first route index it proves. */
export const RUNGS = [
  { q: { text: '7 + 5', ans: 12 }, at: 'make-ten' },
  { q: { text: '14 − 8', ans: 6 }, at: 'count-up' },
  { q: { text: '36 + 47', ans: 83 }, at: 'tens-then-ones' },
  { q: { text: '6 × 7', ans: 42 }, at: 'double-double' },
  { q: { text: '9 × 8', ans: 72 }, at: 'times-nine' },
  { q: { text: '7 × 12', ans: 84 }, at: 'times-twelve' },
  { q: { text: '83 − 29', ans: 54 }, at: 'round-sub' },
  { q: { text: '7 × 46', ans: 322 }, at: 'split-multiply' },
  { q: { text: '1000 − 357', ans: 643 }, at: 'all-from-nine' },
  { q: { text: '35 × 35', ans: 1225 }, at: 'square-five' },
  { q: { text: '48 × 52', ans: 2496 }, at: 'diff-squares' },
  { q: { text: '8% of 50', ans: 4 }, at: 'percent-swap' },
];

/* Where passing up to rung `n` (exclusive) lets a child start: the world that
   contains the last rung passed, from its FIRST stop — placement never skips a
   child into the middle of a world, because a world teaches in order. */
export function placeFrom(passedUpTo) {
  if (passedUpTo <= 0) return null;
  const last = RUNGS[passedUpTo - 1].at;
  const w = byId[last].world;
  const wi = WORLDS.findIndex((x) => x.id === w);
  // open every earlier world whole; this world opens at its first stop
  const firstOfWorld = ROUTE.findIndex((n) => n.world === w);
  return wi === 0 ? null : firstOfWorld;
}
