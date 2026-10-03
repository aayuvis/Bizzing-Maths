/* feed.js — My Feed for Bizzing Maths (FAMILY-STANDARD §6a). The engine and the card are the
   family's (integration/bizzing-feed.js, unedited); this file only says what THIS app knows
   about the child, and keeps what the feed remembers behind the Store seam (k.feed).

   What it passes the engine, all of it read on the device, nothing sent anywhere:
     level     the child's journey level (journey.js) — or, before the level test, the level
               their band starts on — named the app's way: "Level 3 · The Column Road";
     signals   where they are (the next stop on their road and its world), what they just did
               (k.last: a stop passed, twenty facts, a tower floor), their rank, the Library
               tools they have opened — each with its why in plain words;
     due       what slipped and whose gap is over: Leitner lapses and traps (facts.js) and the
               mistakes deck (mistakes.js);
     unlocked  a journey stone opens when the one before it is walked, as in the tool;
     skip      a story already read to the end, a question already answered right;
     extra     the level-fit rule: a card about the very stop the road is waiting on.

   It ends: the engine's twenty, then feedEnd() pointing at Continue. Scrolling earns nothing;
   a right answer to a card's question pays once, through the wallet's `answer`. Pure: no DOM. */
import { feedFor } from './integration/bizzing-feed.js';
import * as J from './journey.js';
import { LEVELS } from './levels.js';
import { byId, worldOf } from './tricks.js';
import { rankOf } from './model.js';
import * as F from './facts.js';
import * as MD from './mistakes.js';
import { META } from './library/shelf.js';

export const DAY = 864e5;
export const dayNo = (now = Date.now()) => Math.floor(now / DAY);
export const feedLevel = (k) => (k.journey && k.journey.level) || J.startLevel(k.band);
export const levelName = (n) => (LEVELS[n - 1] ? `Level ${n} · ${LEVELS[n - 1].name}` : `Level ${n}`);
export const rec = (k) => { const f = k.feed || (k.feed = {}); f.seen = f.seen || {}; f.paid = f.paid || {}; return f; };

const byTitle = (title) => Object.values(byId).find((t) => t.title === title);

export function signals(k, now = Date.now()) {
  const out = [];
  const p = J.progress(k);
  if (p && p.next) {
    const t = p.next.t, w = worldOf(t.world);
    out.push({ topic: `stop:${t.id}`, w: 6, why: `Your next stop: ${t.title}` });
    out.push({ topic: `world:${t.world}`, w: 3, why: `You are in ${w.name}` });
  }
  const L = k.last;
  if (L && now - L.at < 3 * DAY) {
    const t = byTitle(L.title);
    if (t && ['stop', 'stars', 'tried'].includes(L.what)) {
      out.push({ topic: `stop:${t.id}`, w: 5, why: L.what === 'tried' ? `Because you had a go at ${t.title}` : `Because you just passed ${t.title}` });
      out.push({ topic: `world:${t.world}`, w: 2.5, why: `Because you were in ${worldOf(t.world).name}` });
    }
    if (L.what === 'facts') out.push({ topic: 'facts', w: 4, why: 'Because you just did twenty facts' });
    if (L.what === 'floor') out.push({ topic: 'puzzles', w: 4, why: `Because you cleared ${L.title} of the Puzzle Tower` });
  }
  out.push({ topic: `rank:${rankOf(k.xp || 0).n}`, w: 5, why: `You are a ${rankOf(k.xp || 0).n} now` });
  for (const id of Object.keys(k.lib || {})) if (META[id] && Object.keys(k.lib[id] || {}).length) out.push({ topic: `tool:${id}`, w: 2, why: `Because you opened the ${META[id].name}` });
  return out;
}

export function due(k, now = Date.now()) {
  const d = {};
  for (const [key, r] of Object.entries(k.facts || {})) if (r && r.n && r.due <= now && (r.lapsed || F.state(r) === 'trap')) d[`fact:${key}`] = 'A fact that slipped — its gap is over';
  for (const m of MD.all(k)) if (m.due <= now && m.q && m.q.trick && byId[m.q.trick]) d[`stop:${m.q.trick}`] = d[`stop:${m.q.trick}`] || `A mistake from ${byId[m.q.trick].title} is ready again`;
  return d;
}

/* everything the engine needs for this child, now */
export function options(h, k, items, now = Date.now()) {
  const f = rec(k), p = J.progress(k), nextStop = p && p.next ? p.next.stop : null, slipped = due(k, now);
  return {
    items, now, band: k.band, level: feedLevel(k), levelName,
    signals: signals(k, now), due: slipped, seen: f.seen,
    unlocked: (it) => !it.stone || !!h.parent.tester || !it.stone.prev || !!((((k.lib || {})[it.stone.tool] || {}).passed || {})[it.stone.prev]),
    skip: (it) => (it.kind === 'story' && it.key && !!(k.stories || {})[it.key.slice(5)]) || (!!it.play && !!f.paid[it.id]),
    // the level-fit rule: what slipped comes back FIRST (its gap is over), then the stop the road waits on
    extra: (it) => (it.key && slipped[it.key] ? { s: 10, why: slipped[it.key] } : nextStop && it.key === `stop:${nextStop}` ? { s: 3, why: `Your next stop: ${byId[nextStop].title}` } : null),
  };
}

export const session = (h, k, items, now = Date.now()) => feedFor(options(h, k, items, now));

/* this week's cards sink: what a session showed is marked seen today; a fortnight is all it keeps */
export function markSeen(k, ids, now = Date.now()) {
  const f = rec(k), today = dayNo(now);
  for (const id of ids) f.seen[id] = today;
  for (const [id, d] of Object.entries(f.seen)) if (today - d > 14) delete f.seen[id];
}

/* a right answer pays once per card; returns true the first time */
export function pay(k, id, now = Date.now()) {
  const f = rec(k); if (f.paid[id]) return false;
  f.paid[id] = dayNo(now); return true;
}
