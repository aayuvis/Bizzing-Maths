/* challenge.js — today's challenge (audit v4 B4, owner approved 4 Oct 2026).

   One short named set a day — "Monday's Medley" — the SAME for every child of an age
   band on that date: the name, the order and the questions all come from one seed,
   dayKey() + band. Its questions are drawn only from stops the child has OPENED (the
   road they have reached, or a stop they have worked on); a brand-new child, who has
   opened fewer than three, gets the Level 1–2 stops every child starts from. Never a
   stop they have not reached. Two children of a band who have reached the same stops
   get the same ten questions, so the set can be compared over breakfast.

   Finishing it — every question answered, at any score — pays a small FIXED bonus once
   a day: the family's standard 'stop' event (5 coins) through Family.earn, under the
   family's daily cap, with a coin note so the wallet history says it in words. Right
   answers pay their usual coin on top, as in any practice. Coins never touch xp.

   No streak. Nothing here counts days, nothing is lost for a day missed, and nothing
   asks a child to come back: a missed day costs nothing. */

import { byId, worldOf, dress } from './tricks.js';
import { LEVELS } from './levels.js';
import * as J from './journey.js';
import { seeded, shuffle, dayKey } from './rand.js';

export const N = 10;                       // questions in a challenge
export const BONUS_EVENT = 'stop';         // a standard family event: 5 coins
export const NOTE = 'today’s challenge';  // the wallet history: "finished today's challenge — …"

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NAMES = [(d) => `${d}’s Ten`, (d) => `The ${d} Medley`, (d) => `${d}’s Mixed Bag`, (d) => `The ${d} Relay`, (d) => `${d}’s Round-up`, (d) => `The ${d} Gauntlet`];

/* the weekday of a day key, read as the local date it names */
const weekday = (day) => { const [y, m, d] = day.split('-').map(Number); return DAYS[new Date(y, m - 1, d).getDay()]; };
export function challengeName(day, band) {
  const r = seeded(`challenge-name:${day}:${band}`);
  return NAMES[Math.floor(r() * NAMES.length)](weekday(day));
}

/* A stop on the Contest Hall's own track is a strategy, not a fact; it never comes into the mix. */
const usable = (id) => { const t = byId[id]; return !!(t && t.gen && (worldOf(t.world) || {}).track !== 'contest'); };

/* Every stop this child has opened, with the hardest level they have reached it at,
   in the road's order. Levels below the child's own are all open (a child placed at
   Level 6 may go back to anything Levels 1–5 teach); on their own level only what the
   road has reached; plus any stop worked on anywhere (a star, or a drill passed). */
export function openedStops(k) {
  const at = new Map();
  const add = (id, lv) => { if (usable(id)) at.set(id, Math.max(at.get(id) || 0, Math.min(3, Math.max(1, lv || 1)))); };
  const j = k.journey || {};
  if (j.level) {
    for (const L of LEVELS) if (L.n < j.level) for (const s of L.steps) add(s.stop, s.lv);
    const p = J.progress(k);
    if (p) for (const s of p.steps) if (s.open) add(s.stop, s.lv);
  }
  for (const [id, r] of Object.entries(k.tricks || {})) if (r && r.stars > 0) add(id, r.lvNext || 1);
  for (const key of Object.keys(j.done || {})) { const [id, lv] = key.split('@'); add(id, +lv); }
  return [...at.entries()].map(([stop, lv]) => ({ stop, lv }));
}
/* Where every child starts: the stops of Levels 1 and 2, at the level each is met there. */
export function starterStops() {
  const at = new Map();
  for (const L of LEVELS.slice(0, 2)) for (const s of L.steps) if (usable(s.stop) && !at.has(s.stop)) at.set(s.stop, s.lv);
  return [...at.entries()].map(([stop, lv]) => ({ stop, lv }));
}
/* The stops today's challenge may draw from: opened ones, or the starter stops for a brand-new child. */
export function poolOf(k) {
  const o = openedStops(k);
  if (o.length >= 3) return { kind: 'opened', stops: o };
  const have = new Set(o.map((s) => s.stop));
  return { kind: 'start', stops: [...o, ...starterStops().filter((s) => !have.has(s.stop))] };
}

/* Today's challenge for this child: same day + band + opened stops → the same set, always.
   The pool is sorted before the seed touches it, so the order a record was written in
   cannot change the questions. */
export function challengeOf(k, day = dayKey()) {
  const band = k.band, pool = poolOf(k);
  const stops = pool.stops.slice().sort((a, b) => (a.stop < b.stop ? -1 : a.stop > b.stop ? 1 : a.lv - b.lv));
  const r = seeded(`challenge:${day}:${band}`);
  const deal = shuffle(stops, r), items = [], seen = new Set();
  for (let i = 0; items.length < N && i < N * 6; i++) {
    const s = deal[items.length % deal.length], t = byId[s.stop];
    const item = dress(t, t.gen(r, s.lv));
    if (seen.has(item.text) && i < N * 5) continue;          // no question twice in one set
    seen.add(item.text);
    items.push({ ...item, trick: s.stop, qlv: s.lv });
  }
  return { day, band, name: challengeName(day, band), pool: pool.kind, items };
}

/* ---- the record: k.daily[day].challenge = { right, n, paid } — written once the set is finished. */
export const doneToday = (k, day = dayKey()) => ((k.daily || {})[day] || {}).challenge || null;

/* Finish a set. `earn(event, note)` is the app's family earn, bound to the child; it returns the
   coins actually paid (0 under the cap). Pays only when every question was answered, and only
   the first finish of the day. Returns the coins this finish paid. */
export function finish(k, ch, results, earn, day = ch.day) {
  if (!ch || !Array.isArray(results) || results.length < ch.items.length) return 0;
  const right = results.filter((x) => x && x.right).length;
  const d = (k.daily || (k.daily = {}))[day] || (k.daily[day] = {});
  const was = d.challenge;
  d.challenge = { right: Math.max(right, (was && was.right) || 0), n: ch.items.length, paid: !!(was && was.paid) };
  if (was && was.paid) return 0;
  d.challenge.paid = true;                                   // once a day, even when the cap pays nothing
  return earn(BONUS_EVENT, `${NOTE} — ${ch.name}`) || 0;
}
