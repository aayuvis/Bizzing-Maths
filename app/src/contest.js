/* contest.js — the Mock Contest. Bizzing Bee's mock bee, with numbers.

   The rivals are the SAME TEN CHILDREN as the Bee's mock bee — same names,
   same ages, same faces, same nerve. A child who has sat beside Suki at the
   spelling bee meets her again here, still unshakeable. That is the family's
   first rule for anything across the house: nothing is invented twice. What
   changes is what each is good at, because maths has different specialities
   than spelling: Rafi still takes everything apart before he answers — here
   it is numbers instead of Latin roots.

   The round does the killing, not the bot: whether a rival gets a question is
   BASE + spec + (lvl − hardness)·SPREAD − press·(1 − nerve)·PRESS, clamped.
   Rules, from the Bee:
     - round one eliminates nobody;
     - a round everybody misses runs again;
     - the final two play championship rules: when one misses, the other must
       get theirs AND one more to win, or both play on;
     - past SUDDEN_AT rounds the questions stop getting harder and every
       rival's nerve starts to go, so a contest always ends. */

import { TRICKS, byId, WORLDS } from './tricks.js';
import { BANK, ramp, answer, text as factText } from './facts.js';
import { shuffle, pick, int, seeded } from './rand.js';

export const RIVALS = [
  { id: 'pixel', name: 'Pip', age: 8, lvl: .18, nerve: .74, spec: 'facts', pace: 620, note: 'Eight, and answers at a sprint. Brilliant or gone.', tell: 'starts before the question finishes' },
  { id: 'koi', name: 'Nova', age: 9, lvl: .24, nerve: .70, spec: 'facts', pace: 1150, note: 'Steady. Her tables are solid and she knows it.', tell: 'says the question back, always' },
  { id: 'beaker', name: 'Rafi', age: 10, lvl: .32, nerve: .58, spec: 'split', pace: 1300, note: 'Takes every number apart before he answers.', tell: 'writes on his palm with one finger' },
  { id: 'panda', name: 'Suki', age: 11, lvl: .38, nerve: .93, spec: null, pace: 1400, note: 'Unshakeable. The lights do nothing to her.', tell: 'breathes out, then answers' },
  { id: 'comet', name: 'Dax', age: 11, lvl: .42, nerve: .34, spec: null, pace: 700, note: 'Fastest here in round one. Watch him in round six.', tell: 'rocks on his heels' },
  { id: 'astro', name: 'Mira', age: 12, lvl: .44, nerve: .66, spec: 'squares', pace: 1250, note: 'Knows every square to 30 by heart.', tell: 'looks at the ceiling, as if it is written there' },
  { id: 'scopey', name: 'Theo', age: 12, lvl: .43, nerve: .80, spec: null, pace: 2100, note: 'Checks every answer with the nines before he says it.', tell: 'counts on his fingers under the desk — to check, not to add' },
  { id: 'melody', name: 'Ines', age: 13, lvl: .52, nerve: .72, spec: 'percent', pace: 1200, note: 'Percentages and fractions hold no surprises for her.', tell: 'mouths the numbers before she answers' },
  { id: 'samurai', name: 'Kwame', age: 14, lvl: .62, nerve: .78, spec: 'vedic', pace: 1100, note: 'Near a hundred, nobody is quicker.', tell: 'hands behind his back, dead still' },
  { id: 'goldlegend', name: 'Vesper', age: 15, lvl: .72, nerve: .95, spec: null, pace: 900, note: 'Won this last year. Has not looked at anyone since.', tell: 'does not ask for anything' },
];

const BASE = 0.84, SPREAD = 1.5, PRESS = 0.55, SPEC = 0.10;
export const SUDDEN_AT = 14;
const WORLD_TRACK = Object.fromEntries(WORLDS.map((w) => [w.id, w.track || 'atlas']));

/* Where the field starts, by the child's age band: the same rivals, facing
   questions pitched to the child in front of them. */
const START = { '6-7': 0.0, '8-10': 0.18, '11-14': 0.34 };
const STEP = 0.045;

/* The question ladder, by hardness 0..1. Every rung is either a fact from the
   fact bank or a question from a trick's own generator — the contest invents
   no maths of its own. */
const LADDER = [
  { h: 0.00, tag: 'facts', f: (r) => factAt('+', 0.0, 0.45, r) },
  { h: 0.08, tag: 'facts', f: (r) => factAt(pick(['+', '-'], r), 0.35, 0.8, r) },
  { h: 0.16, tag: 'facts', f: (r) => factAt('×', 0.0, 0.4, r) },
  { h: 0.24, tag: 'facts', f: (r) => factAt(pick(['×', '-'], r), 0.4, 0.8, r) },
  { h: 0.32, tag: 'facts', f: (r) => factAt(pick(['×', '÷'], r), 0.7, 1.0, r) },
  { h: 0.40, tag: 'split', f: (r) => trickQ(pick(['tens-then-ones', 'times-twelve', 'times-nine'], r), 2, r) },
  { h: 0.48, tag: 'split', f: (r) => trickQ(pick(['times-eleven', 'round-add', 'round-sub'], r), 2, r) },
  { h: 0.56, tag: 'split', f: (r) => trickQ(pick(['split-multiply', 'times-25', 'halve-double'], r), 2, r) },
  { h: 0.64, tag: 'squares', f: (r) => trickQ(pick(['square-five', 'square-up'], r), 2, r) },
  { h: 0.72, tag: 'vedic', f: (r) => trickQ(pick(['nikhilam-100', 'all-from-nine', 'above-100'], r), 2, r) },
  { h: 0.80, tag: 'percent', f: (r) => trickQ(pick(['percent-swap', 'diff-squares'], r), 2, r) },
  { h: 0.88, tag: 'vedic', f: (r) => trickQ(pick(['crosswise', 'square-near-100', 'nikhilam-100'], r), 3, r) },
  { h: 0.96, tag: 'squares', f: (r) => trickQ(pick(['square-five', 'diff-squares', 'percent-swap', 'crosswise'], r), 3, r) },
];

function factAt(op, lo, hi, r) {
  const list = ramp(op).filter((f) => f.b !== 0 && f.a !== 0);
  const f = list[Math.floor((lo + r() * (hi - lo)) * (list.length - 1))];
  // times and adding are stored sorted; ask them either way round
  const g = (op === '×' || op === '+') && r() < 0.5 ? { ...f, a: f.b, b: f.a } : f;
  return { text: factText(g), ans: answer(g) };
}
function trickQ(id, lv, r) {
  const t = byId[id]; const q = t.gen(r, lv);
  return { text: q.text, say: q.say, ans: q.ans, choices: q.choices, frac: q.frac, simplest: q.simplest, keys: q.keys || t.keys, trick: id };
}

export function questionAt(h, r = Math.random) {
  let rung = LADDER[0];
  for (const x of LADDER) if (x.h <= h + 1e-9) rung = x;
  const q = rung.f(r);
  return { ...q, h: rung.h, tag: rung.tag };
}

/* Seconds the child gets. More for a harder rung; more for a younger child. */
export function timeFor(band, h) {
  const base = { '6-7': 14, '8-10': 11, '11-14': 9 }[band] || 11;
  return Math.round(base * (1 + h * 1.4));
}

export function rivalGets(bot, q, round, start, r = Math.random) {
  const press = Math.min(1, round / 10);
  const tired = Math.max(0, round - SUDDEN_AT) * 0.05;
  const spec = bot.spec && bot.spec === q.tag ? SPEC : 0;
  const lvl = bot.lvl + start;
  const wobble = (r() - 0.5) * 0.08;
  const p = Math.min(0.97, Math.max(0.04, BASE + spec + (lvl - q.h) * SPREAD - press * (1 - bot.nerve) * PRESS - tired + wobble));
  return r() < p;
}

/* ---------------------------------------------------------------- a contest */

export function newContest(band, seed = Date.now(), learned = []) {
  const r = seeded(seed);
  const field = shuffle([{ id: 'you', you: true }, ...RIVALS.map((b) => ({ id: b.id }))], r).map((c, i) => ({ ...c, n: i + 1, out: 0 }));
  return {
    band, seed, round: 1, start: START[band] ?? 0.18, field,
    log: [], place: null, over: false, champ: null, winner: null,
    q: null, rq: 0,
    learned: learned.slice(),             // the child's Atlas tricks, for the final (finalPool)
    you: { asked: 0, right: 0, round: 0 },   // what the child did — the pay rule reads it (merit.js)
  };
}

/* THE FINAL (games spec §2.1). Once three or fewer are standing, the child's questions come
   from the tricks THEY have learned on the Atlas (stars ≥ 1, or the record's learned flag),
   so a contest rehearses their own learning. Only tricks whose questions the contest can
   ask — plain text with no picture, a whole answer typed on the digit pad, or choices — and never the
   Contest Hall's strategy stops. Fewer than three such tricks: the ladder, as before. */
export const FINAL_AT = 3, FINAL_MIN = 3;
const askable = (q) => q && !q.html && !q.puzzle && !q.fig && !q.kind && !q.input && !q.choiceHtml && typeof q.text === 'string'
  && (Array.isArray(q.choices) ? q.choices.length > 1 : /^\d+$/.test(String(q.ans)));
export function learnedPool(tricks = {}) {
  return TRICKS.filter((t) => { const x = tricks[t.id]; return x && (x.stars >= 1 || x.learned) && t.gen && !t.draw; })   // a trick drawn as a picture needs the runner, not a contest card
    .filter((t) => { const w = t.world && WORLD_TRACK[t.world]; return w !== 'contest'; })
    .filter((t) => { try { const r = seeded('askable:' + t.id); for (let i = 0; i < 6; i++) if (askable(t.gen(r, 2))) return true; } catch (e) {} return false; })
    .map((t) => t.id);
}
export const inFinal = (c) => c.learned.length >= FINAL_MIN && live(c).length <= FINAL_AT && live(c).some((x) => x.you);
function finalQuestion(c, r) {
  for (let i = 0; i < 12; i++) {
    const id = pick(c.learned, r), t = byId[id]; if (!t || t.draw) continue;
    const q = t.gen(r, 2);
    if (askable(q)) return { text: q.text, say: q.say, ans: q.ans, choices: q.choices, frac: q.frac, simplest: q.simplest, keys: q.keys || t.keys, trick: id, h: hardness(c), tag: 'final', final: true };
  }
  return null;
}

export const live = (c) => c.field.filter((x) => !x.out);
export const bot = (id) => RIVALS.find((b) => b.id === id);

export function hardness(c) {
  const r = Math.min(c.round, SUDDEN_AT);
  return Math.min(0.96, c.start + (r - 1) * STEP);
}

/* The child's question for this round. Seeded per round so a reload does not
   hand them a new one. */
export function childQuestion(c) {
  const r = seeded(`${c.seed}:${c.round}:${c.rq}`);
  return (inFinal(c) && finalQuestion(c, r)) || questionAt(hardness(c), r);
}

/* A rival's moment, for the screen (games spec §2.1): how long they took this round and
   whether they got it — the same draw the round itself made, so the screen never disagrees
   with the result. Time is their pace, slower on a harder rung and as the nerve goes. */
export function rivalTime(b, round, h, r) {
  const press = Math.min(1, round / 10) * (1 - b.nerve);
  return Math.round((b.pace * (1 + h * 1.6) * (1 + press * 0.8) * (0.8 + r() * 0.4)) / 100) / 10;
}
/* One rival's tell for this round: a live rival, the same in every house for the same round. */
export function tellOf(c) {
  const ids = live(c).filter((x) => !x.you).map((x) => x.id);
  if (!ids.length) return null;
  const b = bot(pick(ids, seeded(`${c.seed}:tell:${c.round}`)));
  return { id: b.id, name: b.name, tell: b.tell };
}

/* Resolve a whole round. `youRight` is the child's result, or null if the
   child is already out (the rest of the contest is then simulated through). */
export function playRound(c, youRight) {
  const r = seeded(`${c.seed}:r${c.round}:${c.rq}`);
  const h = hardness(c);
  const res = {}, times = {};
  const tr = seeded(`${c.seed}:t${c.round}:${c.rq}`);   // a separate stream: the times never change who gets what
  for (const x of live(c)) {
    if (x.you) res[x.id] = !!youRight;
    else { res[x.id] = rivalGets(bot(x.id), questionAt(h, r), c.round, c.start, r); times[x.id] = rivalTime(bot(x.id), c.round, h, tr); }
  }
  if (youRight != null && 'you' in res) { c.you.asked++; c.you.right += youRight ? 1 : 0; c.you.round = c.round; }
  const ids = Object.keys(res);
  const missed = ids.filter((id) => !res[id]);
  const entry = { round: c.round, h, res, times, out: [] };

  if (c.round === 1) {
    entry.note = 'Round one — nobody sits down in round one.';
  } else if (missed.length === ids.length) {
    entry.note = 'Everybody missed, so the round is played again.';
  } else if (ids.length === 2 && missed.length === 1) {
    // championship rules: the survivor must take one more
    const other = ids.find((id) => res[id]);
    const extra = other === 'you' ? null : rivalGets(bot(other), questionAt(h, r), c.round, c.start, r);
    entry.champ = { id: other, needs: true, extra };
    if (other === 'you') {
      c.champ = { missed: missed[0] };     // the UI asks the child the championship question
    } else if (extra) {
      out(c, missed[0], entry); c.winner = other;
    } else {
      entry.note = `${bot(other).name} missed the championship question — both play on.`;
    }
  } else {
    // everyone who sits down in the same round shares the same place
    const place = ids.length - missed.length + 1;
    missed.forEach((id) => out(c, id, entry, place));
  }
  c.log.push(entry);
  c.round++; c.rq = 0;
  finish(c);
  return entry;
}

/* The child's own championship question, when they are the survivor. */
export function championship(c, right) {
  const missed = c.champ && c.champ.missed;
  c.champ = null;
  if (right != null) { c.you.asked++; c.you.right += right ? 1 : 0; }
  if (right) { out(c, missed, c.log.at(-1)); c.winner = 'you'; }
  else c.log.at(-1).note = 'You missed the championship question — both play on.';
  finish(c);
}

function out(c, id, entry, place) {
  const x = c.field.find((f) => f.id === id);
  if (!x || x.out) return;
  x.place = place ?? live(c).length;
  x.out = c.round;
  entry.out.push(id);
}

function finish(c) {
  const l = live(c);
  if (l.length === 1) { c.winner = l[0].id; }
  if (c.winner) {
    const w = c.field.find((f) => f.id === c.winner);
    w.place = 1; c.field.forEach((f) => { if (f.id !== c.winner && !f.out) { f.out = c.round; f.place = 2; } });
    c.over = true;
  }
  const you = c.field.find((f) => f.you);
  if (you.out || c.over) c.place = you.place;
}

/* Once the child is out, run the rest to the end so the result card can say
   who won — rivals only, fast, and guaranteed to stop. */
export function runOut(c) {
  let guard = 0;
  while (!c.over && guard++ < 400) {
    if (c.champ) { championship(c, null); continue; }
    playRound(c, null);
  }
  if (!c.over) {                                     // cannot happen; belt and braces
    const l = live(c); c.winner = l[0].id; finish(c);
  }
  return c;
}
