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
import { medalStates } from './medals.js';

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
  for (const m of nearMedals(k)) if (m.topic) out.push({ topic: m.topic, w: 6, why: m.why });   // a medal within reach brings its cards up (a level-agnostic card needs 6 to meet a card of today's level)
  return out;
}

/* when, in the child's own days: "today", "yesterday", "3 days ago" */
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const daysAgo = (then, now = Date.now()) => {
  const n = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
};
/* a question short enough to quote in a why line; a long one is named by its stop */
const quotable = (text) => text && String(text).length <= 24 && !/\n/.test(text);

/* what slipped, each with its why said as it happened (audit v4, V5): "You slipped on 7 × 8 yesterday".
   A fact's slip is dated only when its LAST answer was the miss (r.last is then the miss's time);
   a mistake's `at` is when it was put in the deck — the miss itself. */
export function due(k, now = Date.now()) {
  const d = {};
  for (const [key, r] of Object.entries(k.facts || {})) if (r && r.n && r.due <= now && (r.lapsed || F.state(r) === 'trap')) {
    const f = F.parseKey(key), name = f ? F.text(f) : key;
    d[`fact:${key}`] = (r.recent || []).at(-1) === 'X' && r.last ? `You slipped on ${name} ${daysAgo(r.last, now)}` : `You slipped on ${name} — its gap is over`;
  }
  for (const m of MD.all(k)) if (m.due <= now && m.q && m.q.trick && byId[m.q.trick]) {
    const t = byId[m.q.trick], what = quotable(m.q.text) ? m.q.text : `a ${t.title} question`;
    d[`stop:${m.q.trick}`] = d[`stop:${m.q.trick}`] || `You slipped on ${what} ${daysAgo(m.at, now)} — a mistake from ${t.title}, ready again`;
  }
  return d;
}

/* a medal within reach, and the cards that lead to it (audit v4, V5): "Two more to the Quick hands medal".
   Only a medal counted in several (need ≥ 3) and at most three short; each names the topic or kind of
   card whose link goes where the medal is earned. True by construction: `now` and `need` are medals.js's. */
const NUM = ['', 'One', 'Two', 'Three'];
const MEDAL_CARDS = { 'quick-25': (it) => it.kind === 'fact', 'fluent-100': (it) => it.kind === 'fact', puzzler: (it) => ['pattern', 'magic', 'puzzle'].includes(it.kind),
  'tower-4': (it) => it.kind === 'puzzle', 'tower-top': (it) => it.kind === 'puzzle', stories: (it) => it.kind === 'story' };
const MEDAL_TOPIC = { 'quick-25': 'facts', 'fluent-100': 'facts', puzzler: 'puzzles', 'tower-4': 'puzzles', 'tower-top': 'puzzles' };
export function nearMedals(k) {
  return medalStates(k).filter((m) => !m.earned && MEDAL_CARDS[m.id] && m.need >= 3 && m.need - m.now >= 1 && m.need - m.now <= 3)
    .map((m) => ({ id: m.id, left: m.need - m.now, fits: MEDAL_CARDS[m.id], topic: MEDAL_TOPIC[m.id], why: `${NUM[m.need - m.now]} more to the ${m.name} medal` }));
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

/* ONE STOP IS NOT A SESSION (audit v4, V4: 7 of a Level 1 session's 20 cards were one stop).
   The engine ranks and picks; a stop past PER_STOP has its lowest-placed extra cards set aside and
   the engine asked again, so the gap fills from the next-ranked cards under all the engine's own
   rules (kinds, tiers, questions). Each pass sets more aside, so it ends. */
export const PER_STOP = 4;
export const stopOf = (it) => (it && it.key && it.key.startsWith('stop:') ? it.key : null);
export function capStops(o, per = PER_STOP) {
  const byId = Object.fromEntries(o.items.map((it) => [it.id, it])), aside = new Set(), skip = o.skip;
  const opts = { ...o, skip: (it) => aside.has(it.id) || (!!skip && skip(it)) };
  for (let pass = 0; pass < 50; pass++) {
    const out = feedFor(opts), n = {};
    let over = false;
    for (const x of out) { const s = stopOf(byId[x.id]); if (!s) continue; n[s] = (n[s] || 0) + 1; if (n[s] > per) { aside.add(x.id); over = true; } }
    if (!over) return out;
  }
  return feedFor(opts).filter((x, i, out) => { const s = stopOf(byId[x.id]); return !s || out.slice(0, i).filter((y) => stopOf(byId[y.id]) === s).length < per; });
}

/* WHY, NAMED (audit v4, V5). The engine's own lines are true but some are generic: "For Level 5 · …"
   (no signal fitted the card) and "You are in <world>". Where the app knows more, it says it —
   the stop or the word's stop on the child's road, a fact by name, a medal within reach — and
   leaves every other line as the engine wrote it. Never edits the engine: it rewrites its output. */
/* a word or a formula is taught at the stops its Dictionary or Formula Book entry names */
const TAUGHT = /^(word|wordq|formula|formula-why|formula-story|formula-try)$/;
export const GENERIC_WHY = /^(For Level \d+|You are in |To keep: from Level \d+|Coming up on Level \d+)/;
export function nameWhy(x, it, k, medals, level) {
  if (!it || !GENERIC_WHY.test(x.why)) return x.why;
  const m = medals.find((md) => md.fits(it));
  if (m) return m.why;
  const at = it.level != null ? it.level : null;
  const stop = stopOf(it) ? byId[it.key.slice(5)] : null;
  const taught = !stop && TAUGHT.test(it.kind || '') && (it.topics || []).map((t) => (t.startsWith('stop:') ? byId[t.slice(5)] : null)).find(Boolean);
  const t = stop || taught;
  if (it.kind === 'fact' && it.key) { const f = F.parseKey(it.key.slice(5)); if (f) return `Worth knowing by heart: ${F.text(f)}`; }
  if (!t) return x.why;
  const what = stop ? t.title : `Taught at ${t.title}`;
  if (/^You are in /.test(x.why)) return `${what} — ${x.why.replace(/^You are in /, 'in ')}, where you are`;
  const where = at == null ? '' : at === level ? ` — on your Level ${at} road` : at < level ? ` — from Level ${at}, to keep` : ` — coming up on Level ${at}`;
  return `${what}${where}`;
}

export function session(h, k, items, now = Date.now()) {
  const o = options(h, k, items, now), byId2 = Object.fromEntries(items.map((it) => [it.id, it])), medals = nearMedals(k);
  return capStops(o).map((x) => ({ ...x, why: nameWhy(x, byId2[x.id], k, medals, o.level) }));
}

/* the order the buttons are shown in (tools/build-feed.mjs showSlots): the family's card writes them in
   its own order; this lays them out as the card's play.show says, keeping every button as it was */
export function showOpts(html, show) {
  if (!html || !Array.isArray(show)) return html;
  return html.replace(/(<div class="bzf-opts"[^>]*>)((?:<button class="bzf-opt[^"]*"[^>]*>[^<]*<\/button>)+)/, (all, open, btns) => {
    const bs = btns.match(/<button class="bzf-opt[^"]*"[^>]*>[^<]*<\/button>/g), by = {};
    for (const b of bs) by[/data-o="(\d+)"/.exec(b)[1]] = b;
    if (bs.length !== show.length || show.some((i) => !by[i])) return all;
    return open + show.map((i) => by[i]).join('');
  });
}

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
