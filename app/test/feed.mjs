/* test/feed.mjs — My Feed (FAMILY-STANDARD §6a), held to the app's own rules.

   Content: the cards are today's cut of the corpus (tools/build-feed.mjs), every `src` resolves
   and the card's words are found in it, every route opens a real screen, no two cards say the
   same thing, nothing is above its band or held for review except a journey stone that says so
   exactly as its screen does, ≥ 100 cards on every journey level and ≥ 300 with no level.
   Questions: every one re-generated from its source and run through the app's three routes
   (the trick, `ans`, `expr`), its right option the only right one, and never leaking its answer.
   Ranking: a younger band never sees an older card, a child on level n sees nothing above n+1,
   climbing changes the "now" cards, what was just done moves its cards up with its why, what
   slipped comes back first, this week's cards sink, a stone waits for the one before it, and a
   session ends at twenty. Each check is watched failing on a broken copy (the `broken` block). */
import { readFileSync, existsSync } from 'node:fs';
import { cut, manifest, WALKS, bandsFrom, leaks, nearDups, workedText, GROUPS, groupOf, indexOf, NEEDS_PICTURE, ALGEBRA_FROM } from '../../tools/build-feed.mjs';
import { INDEX } from '../src/feed/index.js';
import { RIVALS } from '../src/contest.js';
import { evalSum } from '../src/stories.js';
const BODIES = {};
for (const g of GROUPS) Object.assign(BODIES, (await import(`../src/feed/g-${g}.js`)).BODY);
const ITEMS = INDEX.map((x) => ({ ...BODIES[x.id], ...x, play: BODIES[x.id].play }));
import { feedFor, order, feedCard } from '../src/integration/bizzing-feed.js';
import { session, options, markSeen, feedLevel, levelName, pay, showOpts, PER_STOP, stopOf, GENERIC_WHY } from '../src/feed.js';
import { TRICKS, byId, worldOf, learnCases, correct, parseNum } from '../src/tricks.js';
import { STORIES } from '../src/story-data.js';
import { LEVELS } from '../src/levels.js';
import { RANKS, newKid, newHousehold } from '../src/model.js';
import * as F from '../src/facts.js';
import { seeded } from '../src/rand.js';
import { patternQuestion, magicQuestion, magicSolvable, FAMILIES } from '../src/puzzles.js';
import { HEROES, GAMES } from '../src/arcade.js';
import { SHELF } from '../src/library/shelf.js';
import * as DICT from '../src/library/dictionary.js';
import * as FORM from '../src/library/formulas.js';
import * as VED from '../src/library/vedic.js';
import * as CHI from '../src/library/chinese.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.error('  ✗ ' + m); } };

/* ---------------------------------------------------------------- the family's engine, unedited */
for (const [f, here] of [['bizzing-feed.js', '../src/integration/'], ['bizzing-feed.css', '../styles/']]) {
  const theirs = '/home/user/Bizzing_Schedule/integration/' + f;
  if (existsSync(theirs)) ok(readFileSync(theirs, 'utf8') === readFileSync(new URL(here + f, import.meta.url), 'utf8'), `${f} is the family's copy, unedited`);
}

/* ---------------------------------------------------------------- content */
const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
const fresh = cut();
ok(canon(fresh) === canon(ITEMS), 'src/feed/ is today\'s cut of the corpus — run node tools/build-feed.mjs');
ok(canon(fresh.map(indexOf)) === canon(INDEX) && INDEX.every((x) => !('title' in x) && !('body' in x)), 'the index carries the ranking fields and no words');
ok(fresh.every((c) => BODIES[c.id] && groupOf(c) === GROUPS.find((g) => (g === 'any' ? c.level == null : g === 'L' + c.level))), 'every card\'s words are in its level\'s group');
const m = manifest(ITEMS);
ok(m.total >= 1300, `at least 1,300 cards (${m.total})`);
// near-duplicates: no two cards' words are ≥ 80% the same
const nd = nearDups(ITEMS);
ok(nd.length === 0, `no near-duplicates (${nd.slice(0, 3).map((p) => p.join(' ~ ')).join(', ')})`);
ok(nearDups([...ITEMS.slice(0, 50), { ...ITEMS[3], id: 'copy', body: ITEMS[3].body + ' again' }]).some(([, b]) => b === 'copy'), 'the near-duplicate check catches a card copied with one word added');
for (const L of LEVELS) ok((m.byLevel[L.n] || 0) >= 100, `Level ${L.n} has ≥ 100 cards (${m.byLevel[L.n] || 0})`);
ok(m.agnostic >= 300, `≥ 300 level-agnostic cards (${m.agnostic})`);
ok(new Set(ITEMS.map((c) => c.id)).size === ITEMS.length, 'card ids are unique');

const n = (x) => Number(typeof x === 'number' ? x : parseNum(x));
const near = (a, b) => Math.abs(n(a) - n(b)) < 1e-9;
const evalExpr = (e) => Function(`return (${e})`)();
const KNOWN_ROUTES = (() => { const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'); return JSON.parse(/export const ROUTES = (\[[^\]]+\])/.exec(src)[1].replace(/'/g, '"').replace(/\s+/g, ' ')); })();
/* a route opens a real screen — and a deep one names a real thing on it (main.js deepen()) */
const STONE = { vedic: VED.JOURNEY, chinese: CHI.JOURNEY };
export function routeOk(r) {
  const mm = /^#\/([a-z]+)(?:\/(.+))?$/.exec(r || ''); if (!mm || !KNOWN_ROUTES.includes(mm[1])) return false;
  const [, nav, arg] = mm, [a, b, c] = String(arg || '').split('|');
  if (nav === 'stop') {
    const t = byId[a]; if (!t) return false; if (!b) return true;
    if (b === 'learn') return c === undefined || +c < learnCases(t).length;
    if (b === 'story') return !!STORIES[t.id] && (c === undefined || +c < STORIES[t.id].beats.length);
    return b === 'turn' || b === 'drill';
  }
  if (nav === 'world') return !!worldOf(arg);
  if (nav === 'lib') {
    if (!SHELF.some((t) => t.id === a && t.kind === 'tool')) return false; if (!b) return true;
    const item = String(arg).slice(a.length + 1);
    if (a === 'dictionary') return !!DICT.ENTRIES.find((e) => e.word === item);
    if (a === 'formulas') return !!FORM.CARDS.find((x) => x.id === item);
    if (STONE[a]) return !!STONE[a].find((st) => st.id === item);
    return false;
  }
  if (nav === 'facts') return !arg || (F.OPS.includes(a) && (!b || !!F.BANK[a].find((f) => F.key(f) === b)));
  if (nav === 'journey') return !arg || (+arg >= 1 && +arg <= LEVELS.length);
  if (nav === 'play') return !arg || GAMES.some((g) => g.id === arg);
  if (nav === 'puzzles') return !arg || FAMILIES.some((f) => f.id === arg);
  return !arg;
}
/* and it is the SPECIFIC thing the card is about (owner, 3 Oct 2026): never the generic tool */
function specific(c) {
  const [kind] = c.src.split(':'), rest = c.src.slice(kind.length + 1), [obj, part] = rest.split('#');
  if (kind === 'stop' || kind === 'story') {
    const tab = c.route.split('|')[1];
    if (kind === 'story') { const beat = +String(part).replace(/^beat/, '') || 0; return c.route === `#/stop/${obj}|story|${part === 'open' ? 0 : beat}` ? '' : 'not the story beat'; }
    if (/^(case|worked)\d+$/.test(part)) return c.route === `#/stop/${obj}|learn|${part.replace(/\D+/, '')}` ? '' : 'not the worked idea';
    return tab === 'learn' ? '' : 'not the Learn tab';
  }
  if (kind === 'try') return c.route.endsWith('|drill') ? '' : 'not the drill';
  if (kind === 'dictionary') return c.route === `#/lib/dictionary|${obj}` ? '' : 'not the word';
  if (kind === 'formula') return c.route === `#/lib/formulas|${obj}` ? '' : 'not the formula';
  if (kind === 'journey') { const [tool, id] = obj.split('/'); return c.route === `#/lib/${tool}|${id}` ? '' : 'not the stone'; }
  if (kind === 'fact') return c.route === `#/facts/${F.parseKey(obj).op}|${obj}` ? '' : 'not the fact';
  if (kind === 'level') return c.route === `#/journey/${obj}` ? '' : 'not the level';
  if (kind === 'arcade') return GAMES.some((g) => g.id === obj) ? (c.route === `#/play/${obj}` ? '' : 'not the game') : '';
  if (kind === 'puzzles') return c.route === `#/puzzles/${obj}` ? '' : 'not the family';
  if (kind === 'pattern') return c.route === '#/puzzles/patterns' ? '' : 'not patterns';
  if (kind === 'magic') return c.route === '#/puzzles/logic' ? '' : 'not logic';
  return '';
}
/* MORE and WHERE are cut from the corpus too: a stop card's second line is the stop's idea, its
   algebra or the idea's own note; a word's or formula's names the stops that teach it */
function moreOk(c) {
  const [kind] = c.src.split(':'), rest = c.src.slice(kind.length + 1), [obj, part] = rest.split('#');
  const st = (kind === 'stop' || kind === 'story') ? byId[obj] : null;
  if (st) {
    if (!c.more || !(c.more.endsWith(st.idea) || c.more.endsWith(st.alg) || learnCases(st).some((x) => x.note && c.more.endsWith(x.note)))) return 'more is not the stop\'s';
    return c.where === `${worldOf(st.world).name} · Level ${c.level}` ? '' : 'where';
  }
  if ((kind === 'dictionary' && part === 'def') || (kind === 'formula' && !part)) {
    const stops = (kind === 'dictionary' ? DICT.ENTRIES.find((e) => e.word === obj).stops : FORM.CARDS.find((x) => x.id === obj).stops).filter((x) => byId[x]);
    if (!stops.length) return c.more ? 'more with no stops' : '';
    return c.more === `Taught at: ${stops.slice(0, 4).map((x) => byId[x].title).join(' · ')}.` && c.where === worldOf(byId[stops[0]].world).name ? '' : 'taught-at';
  }
  if (kind === 'rank') { const r = RANKS.find((x) => x.n === obj); return c.more && c.more.startsWith(`Reached at ${r.xp} right answers`) ? '' : 'rank more'; }
  return '';
}
/* a play's own rules, shared by every kind */
function playOk(c) {
  const p = c.play; if (!p) return '';
  if (!Array.isArray(p.opts) || p.opts.length < 2 || new Set(p.opts.map(String)).size !== p.opts.length) return 'options are not distinct';
  if (order(c.id, p.opts.length).length !== p.opts.length) return 'order()';
  if (leaks(`${c.title} ${c.body || ''} ${p.q}`, p.opts[0])) return `the answer ${p.opts[0]} is on the card before it is given`;
  return '';
}
/* resolve: the object a card came from, and the card's words in it. Returns '' or what is wrong. */
export function resolve(c) {
  const [kind, rest] = [c.src.split(':')[0], c.src.slice(c.src.indexOf(':') + 1)];
  if (kind === 'level') { const L = LEVELS[+rest - 1]; return L && c.level === L.n && c.title.includes(L.name) && c.body === L.blurb ? '' : 'level'; }
  if (kind === 'land') { const L = LEVELS[c.level - 1], ld = L && L.lands.find((x) => x.id === rest); return ld && c.title === `${ld.name} — in ${worldOf(ld.world).name}` && ld.steps.every((x) => c.body.includes(byId[x.stop].title)) && c.body.startsWith(`${ld.steps.length} stops`) ? '' : 'land'; }
  if (kind === 'stop') {
    const [id, part] = rest.split('#'), t = byId[id]; if (!t) return 'no such stop';
    if (!(WALKS[id] || []).some((w) => w.level === c.level)) return `Level ${c.level}'s road does not walk ${id}`;
    if (part === 'idea') return c.body === `${t.idea} ${t.why[0]}` && c.title === t.title ? '' : 'idea';
    if (part === 'alg') return c.body === t.alg ? '' : 'alg';
    if (part === 'hook') return c.body === t.hook ? '' : 'hook';
    if (part === 'sutra') return t.sutra && c.title === t.sutra.sa && c.body.includes(t.sutra.en) ? '' : 'sutra';
    if (part.startsWith('worked')) {
      const q = learnCases(t)[+part.slice(6)].q, plain = evalExpr(q.expr), last = t.work(q).at(-1).v;
      if (c.body !== workedText(t, q)) return 'worked is not the stop\'s own work()';
      return (q.choices ? plain === q.ans && last === q.ans : near(plain, q.ans) && near(last, q.ans)) ? '' : `worked: three routes disagree on ${q.text}`;
    }
    if (part.startsWith('why')) return c.body === t.why[+part.slice(3)] ? '' : 'why';
    if (part.startsWith('case')) { const cs = learnCases(t)[+part.slice(4)]; return cs && c.body === cs.note && c.title.endsWith(cs.label) ? '' : 'case'; }
    return 'stop part';
  }
  if (kind === 'story') {
    const [id, part] = rest.split('#'), s = STORIES[id]; if (!s) return 'no story';
    if (!(WALKS[id] || []).some((w) => w.level === c.level)) return 'story off its road';
    if (part.startsWith('beat')) {
      const b = s.beats[+part.slice(4)]; if (!b || !c.body.includes(b.say)) return 'beat words';
      if (c.kind === 'moment') return b.add && b.add.v !== undefined && c.body.endsWith(`${b.add.t} = ${b.add.v}`) && near(evalSum(b.add.t), b.add.v) ? '' : 'moment sum';
      return c.kind === 'moral' && b === s.beats.at(-1) ? '' : 'moral';
    }
    return c.title === s.title && c.body.startsWith(s.beats.find((b) => b.who === null).say) && c.badge && c.badge.label === 'A story' ? '' : 'story words';
  }
  if (kind === 'try') {
    const mm = /^([a-z0-9-]+)@(\d+)\/(\d)#(\d+)$/.exec(rest); if (!mm) return 'try src';
    const [, id, L, lv, i] = mm, t = byId[id];
    if (!t || +L !== c.level || !(WALKS[id] || []).some((w) => w.level === +L && w.lv === +lv)) return 'try is not a step on this road';
    const q = t.gen(seeded(`feed:${id}@${L}#${i}`), +lv);
    if (!c.play.q.startsWith(q.text)) return 'the question is not the generator\'s';
    // three routes: ans, plain arithmetic, the trick's last step
    const plain = evalExpr(q.expr), last = t.work(q).at(-1).v;
    if (q.choices ? plain !== q.ans || last !== q.ans : !(near(plain, q.ans) && near(last, q.ans))) return `three routes disagree on ${q.text}`;
    if (String(c.play.opts[0]) !== String(q.ans) || !correct(q, c.play.opts[0])) return 'the right option is not the answer';
    if (c.play.opts.slice(1).some((o) => correct(q, String(o)))) return 'a wrong option is also right';
    if (!t.echo && leaks(q.text, q.ans)) return 'the prompt shows its answer';
    return '';
  }
  if (kind === 'dictionary') {
    const [w, part] = rest.split('#'), e = DICT.entry(w); if (!e) return 'no word';
    if (c.level && !e.stops.some((s) => (WALKS[s] || []).some((x) => x.level === c.level))) return 'word off its road';
    if (part === 'def') return c.title === e.word && c.body.includes(e.def) && c.body.includes(e.ex) ? '' : 'word';
    // which word is this example of: only the word itself can be right — the others are other topics' words, not in the example
    const others = c.play.opts.slice(1).map((o) => DICT.entry(o));
    if (c.play.opts[0] !== e.word || !c.play.q.includes(e.ex) || others.some((o) => !o || o.topic === e.topic)) return 'wordq options';
    return c.play.opts.some((o) => e.ex.toLowerCase().includes(o.toLowerCase())) ? 'the example names an option' : '';
  }
  if (kind === 'formula') {
    const [fid, part] = rest.split('#'), f = FORM.byId[fid]; if (!f) return 'no formula';
    if (c.level && !f.stops.some((s) => (WALKS[s] || []).some((w) => w.level === c.level))) return 'formula off its road';
    if (part && part.startsWith('why')) return c.body === f.why[+part.slice(3)] ? '' : 'formula why';
    if (part === 'story') return c.title === f.story.title && c.body.startsWith(f.story.beats.find((b) => b.who === null).say) ? '' : 'formula story';
    if (part && part.startsWith('gen')) {
      const q = f.gen(seeded(`feed:formula:${fid}#${part.slice(3)}`));
      if (!c.play.q.startsWith(q.text) || c.play.opts[0] !== String(q.ans) || !near(evalExpr(q.expr), q.ans)) return 'formula question: ans and expr disagree';
      return c.play.opts.slice(1).some((o) => near(o, q.ans)) ? 'a wrong option is right' : leaks(q.text, q.ans) ? 'leaks' : '';
    }
    if (!c.body.includes(f.formula) || !c.body.includes(f.caption)) return 'formula words';
    if (c.level && !f.stops.some((s) => (WALKS[s] || []).some((w) => w.level === c.level))) return 'formula off its road';
    if (c.play) { const ex = f.example; if (!(near(c.play.opts[0], ex.ans) && near(evalExpr(ex.expr), ex.ans) && near(f.f(...ex.args), ex.ans))) return `formula ${f.id}: three routes disagree`; if (c.play.opts.slice(1).some((o) => near(o, ex.ans))) return 'a wrong option is right'; }
    return '';
  }
  if (kind === 'journey') {
    const [path, part] = rest.split('#'), [tool, id] = path.split('/'), J = tool === 'vedic' ? VED.JOURNEY : tool === 'chinese' ? CHI.JOURNEY : null, st = J && J.find((x) => x.id === id);
    if (!st || !st.sources || !st.sources.length) return 'stone without sources';
    if (!st.sources.every((s) => c.source.includes(s))) return 'stone sources';
    if (part.startsWith('gen')) {
      const q = st.gen(seeded(`feed:${tool}:${st.id}#${part.slice(3)}`), 2);
      if (NEEDS_PICTURE.test(q.text) || !c.play.q.startsWith(q.text) || String(c.play.opts[0]) !== String(q.ans)) return 'stone question is not the stone\'s';
      if (q.choices) { if (!q.choices.includes(q.ans) || c.play.opts.slice(1).includes(q.ans)) return 'stone choices'; }
      else { const last = st.work(q).at(-1).v; if (!(near(evalExpr(q.expr), q.ans) && near(last, q.ans))) return `stone: three routes disagree on ${q.text}`; if (c.play.opts.slice(1).some((o) => correct(q, String(o)))) return 'a wrong option is right'; }
    } else if (c.body !== st.cards[+part]) return 'stone words';
    // the screen says "being checked by a second reader" on a needsReview stone; so does the card
    if (!!st.needsReview !== /being checked by a second reader/.test(c.source) || !!st.needsReview !== !!(c.badge && c.badge.id === 'review')) return 'needsReview not said as the screen says it';
    return '';
  }
  if (kind === 'fact') {
    const f = F.parseKey(rest); if (!f) return 'fact key';
    if (c.play.q !== `${F.text(f)} = ?` || String(F.answer(f)) !== c.play.opts[0] || c.play.after !== F.why(f)) return 'fact words';
    if (c.play.opts.slice(1).some((o) => +o === F.answer(f))) return 'a wrong option is right';
    return F.tricky(f) > 0.45 ? '' : 'a trivial fact';
  }
  if (kind === 'rival') { const r = RIVALS.find((x) => x.id === rest); return r && c.body.includes(r.note) && c.body.includes(r.tell) && c.title.startsWith(r.name) ? '' : 'rival'; }
  if (kind === 'rank') { const r = RANKS.find((x) => x.n === rest); return r && c.body === r.why ? '' : 'rank'; }
  if (kind === 'shelf') { const t = SHELF.find((x) => x.id === rest); return t && c.title === t.name && c.body === t.blurb ? '' : 'shelf'; }
  if (kind === 'arcade') { const g = [...HEROES, ...GAMES].find((x) => x.id === rest); return g && c.title === g.title && c.body === g.blurb ? '' : 'arcade'; }
  if (kind === 'puzzles') { const f = FAMILIES.find((x) => x.id === rest); return f && c.body === f.blurb ? '' : 'family'; }
  if (kind === 'pattern') {
    const [lv, i] = rest.split(':').map(Number), q = patternQuestion(lv, seeded(`feed:pattern:${lv}:${i}`));
    const terms = q.text.replace(', …', '').split(', ').map(Number);
    if (c.play.q !== q.text || c.play.opts[0] !== String(q.ans) || c.play.after !== q.explain) return 'pattern is not the generator\'s';
    if (terms.includes(q.ans) && q.rule !== 'fib') return 'pattern shows its answer';
    return c.play.opts.slice(1).includes(String(q.ans)) ? 'a wrong option is right' : '';
  }
  if (kind === 'magic') {
    const [lv, i] = rest.split(':').map(Number), q = magicQuestion(lv, seeded(`feed:magic:${lv}:${i}`));
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    if (!magicSolvable(q) || !lines.every((l) => l.reduce((s, j) => s + q.grid[j], 0) === q.sum)) return 'magic square not proved';
    return c.play.q === q.text && c.play.opts[0] === String(q.ans) ? '' : 'magic is not the generator\'s';
  }
  return 'unknown src';
}

const bad = (c) => resolve(c) || playOk(c) || (routeOk(c.route) ? '' : `route ${c.route}`) || (specific(c) ? `route ${c.route}: ${specific(c)}` : '') || moreOk(c);
for (const c of ITEMS) { const e = bad(c); ok(!e, `${c.id} (${c.src}): ${e}`); }
// distinct: no two cards share src + kind + text
const sig = (c) => [c.src, c.kind, c.title, c.body, c.play && c.play.q].join('|');
ok(new Set(ITEMS.map(sig)).size === ITEMS.length && new Set(ITEMS.map((c) => c.kind + '|' + c.title + '|' + c.body + '|' + (c.play ? c.play.q : ''))).size === ITEMS.length, 'no two cards say the same thing');
// held: needsReview only on a stone that says so; never above its band
ok(ITEMS.every((c) => !c.needsReview && (!c.badge || c.badge.id !== 'review' || c.kind.startsWith('stone'))), 'nothing held for review, except a stone that says so as its screen does');
for (const c of ITEMS) {
  const stop = c.key && c.key.startsWith('stop:') ? byId[c.key.slice(5)] : null;
  if (stop) ok(c.bands.every((b) => bandsFrom(stop.band).includes(b)), `${c.id}: open to a band younger than its stop's`);
  if (c.kind === 'formula') ok(c.bands.every((b) => bandsFrom(FORM.byId[c.src.slice(8)].band).includes(b)), `${c.id}: younger than its formula`);
  ok(c.level == null || (Number.isInteger(c.level) && c.level >= 1 && c.level <= 10), `${c.id}: a journey level`);
}

/* ---------------------------------------------------------------- ranking */
const NOW = Date.UTC(2026, 9, 2, 12);
const H = () => ({ ...newHousehold(), parent: { pin: null, tester: false, plan: 'free', feedOff: false } });
const child = (band, level) => { const k = newKid('Asha', band); k.journey.level = level; return k; };
const byIdF = Object.fromEntries(ITEMS.map((c) => [c.id, c]));
const youngest = (band) => ['6-7', '8-10', '11-14'].indexOf(band);
for (const band of ['6-7', '8-10', '11-14']) for (let L = 1; L <= 10; L++) for (const d of [0, 3]) {
  const k = child(band, L), list = session(H(), k, ITEMS, NOW + d * 864e5);
  ok(list.length > 0 && list.length <= 20, `${band} L${L}: a session ends at twenty (${list.length})`);
  ok(list.every((x) => byIdF[x.id].bands.includes(band)), `${band} L${L}: a card above the band`);
  ok(list.every((x) => byIdF[x.id].level == null || byIdF[x.id].level <= L + 1), `${band} L${L}: a card above level ${L + 1}`);
  ok(list.filter((x) => x.tier === 'next').length <= 2 && list.filter((x) => x.tier === 'any').length <= 5 && list.filter((x) => x.tier === 'review').length <= 5, `${band} L${L}: tiers within their caps`);
  ok(list.filter((x) => byIdF[x.id].play).length <= 5, `${band} L${L}: at most five questions`);
  ok(list.every((x, i) => i < 2 || !(list[i - 1].kind === x.kind && list[i - 2].kind === x.kind)), `${band} L${L}: three of a kind in a row`);
  if (youngest(band) === 0) ok(list.every((x) => !byIdF[x.id].bands || byIdF[x.id].bands.includes('6-7')), 'the youngest band never sees older cards');
}
{ // a level's name is the app's own
  ok(levelName(3) === 'Level 3 · The Column Road', `levelName(3) is the app's (${levelName(3)})`);
  ok(feedLevel(newKid('A', '11-14')) === 6 && feedLevel(child('6-7', 4)) === 4, 'the level is the journey\'s, or the band\'s start before the level test');
}
{ // moving up a level changes the "now" cards
  const a = session(H(), child('8-10', 3), ITEMS, NOW).filter((x) => x.tier === 'now').map((x) => x.id);
  const b = session(H(), child('8-10', 4), ITEMS, NOW).filter((x) => x.tier === 'now').map((x) => x.id);
  ok(a.length >= 10 && b.length >= 10 && a.every((id) => byIdF[id].level === 3) && b.every((id) => byIdF[id].level === 4) && !a.some((id) => b.includes(id)), 'climbing a level changes the now cards');
  // the next level is a peek: when today's level runs short it fills at most two, each named the app's way
  const thin = ITEMS.filter((c) => (c.level === 4 && c.kind === 'level') || c.level === 5 || c.level === 6);
  const o = options(H(), child('8-10', 4), thin, NOW), peeks = feedFor(o).filter((x) => x.tier === 'next');
  ok(peeks.length === 2 && peeks.every((x) => byIdF[x.id].level === 5 && /^Coming up on Level 5 · /.test(x.why)) && !feedFor(o).some((x) => byIdF[x.id].level === 6), `a peek at the next level: two at most, "Coming up on Level 5 · …", nothing from Level 6 (${peeks.length})`);
}
{ // a recent activity moves its related cards up, with its why
  const k = child('8-10', 3), id = LEVELS[2].steps.at(-1).stop, t = byId[id];
  const about = (x) => byIdF[x.id].topics.includes(`stop:${id}`);
  const before = session(H(), k, ITEMS, NOW).filter(about).length;
  k.last = { what: 'stop', title: t.title, at: NOW - 6e4 };
  const after = session(H(), k, ITEMS, NOW), mine = after.filter(about);
  ok(mine.length >= before + 2 && mine.every((x) => x.why === `Because you just passed ${t.title}`) && after.findIndex(about) < 4, `passing ${id} moves its cards up with its why (${before} → ${mine.length})`);
}
{ // a slipped fact comes back first, after its gap — not before
  const FC = ITEMS.find((c) => c.kind === 'fact' && c.bands.includes('8-10') && c.key.includes('×')), key = FC.key.slice(5), k = child('8-10', 3), r = F.blank();
  F.record(r, true, 1000, '8-10', NOW - 40 * 864e5); F.record(r, true, 1000, '8-10', NOW - 30 * 864e5); F.record(r, true, 1000, '8-10', NOW - 20 * 864e5); F.record(r, false, 9000, '8-10', NOW - 2 * 864e5);
  k.facts[key] = r;
  const early = session(H(), k, ITEMS, r.due - 3600e3), late = session(H(), k, ITEMS, r.due + 3600e3);
  ok(!early.some((x) => x.id === FC.id && /slipped/.test(x.why)), 'a slipped fact waits for its gap');
  ok(late[0] && late[0].id === FC.id && /slipped/.test(late[0].why), `a slipped fact comes back first once its gap is over (first: ${late[0] && late[0].id})`);
}
{ // a mistake from a stop brings that stop's cards back
  const k = child('8-10', 3);
  k.mistakes = { x: { q: { trick: 'column-sub', text: '912 − 437', ans: 475 }, box: 0, due: NOW - 1, at: NOW - 864e5, misses: 1 } };
  const s = session(H(), k, ITEMS, NOW);
  ok(s.slice(0, 3).some((x) => byIdF[x.id].key === 'stop:column-sub' && /mistake from/.test(x.why)), 'a mistake whose gap is over brings its stop back first');
}
{ // this week's cards sink, and a session is not the same one again
  const k = child('8-10', 5), a = session(H(), k, ITEMS, NOW).map((x) => x.id);
  markSeen(k, a, NOW);
  const b = session(H(), k, ITEMS, NOW + 864e5).map((x) => x.id);
  ok(b.filter((id) => a.includes(id)).length <= 4, `this week's cards sink (${b.filter((id) => a.includes(id)).length} again)`);
}
{ // a stone waits for the stone before it, as in the tool
  const k = child('11-14', 8), h = H();
  const o = options(h, k, ITEMS, NOW), st2 = ITEMS.find((c) => c.id === 'stone-vedic-ekadhika');
  ok(!o.unlocked(st2), 'a stone is shut until the one before it is walked');
  k.lib = { vedic: { passed: { origin: true } } };
  ok(options(h, k, ITEMS, NOW).unlocked(st2), 'and opens when it is');
}
{ // a right answer pays once
  const k = child('8-10', 3);
  const id = ITEMS.find((c) => c.kind === 'fact').id;
  ok(pay(k, id, NOW) === true && pay(k, id, NOW) === false, 'a card pays once');
  ok(options(H(), k, ITEMS, NOW).skip(byIdF[id]), 'and a question answered right does not come back');
}

/* ---------------------------------------------------------------- broken on purpose: each check bites */
const first = (kind) => ITEMS.find((c) => c.kind === kind);
const broken = [
  ['a src that resolves to nothing', { ...first('trick'), src: 'stop:no-such-stop#idea' }],
  ['words not in the source', { ...first('word'), body: 'A thing nobody wrote.' }],
  ['a stop on a road that does not walk it', { ...first('trick'), level: 10 }],
  ['a try whose right option is wrong', { ...first('try'), play: { ...first('try').play, opts: ['999999', ...first('try').play.opts.slice(1)] } }],
  ['an answer shown on the card', ((c) => ({ ...c, body: `It is ${c.play.opts[0]}.` }))(ITEMS.find((c) => c.kind === 'fact' && c.play.opts[0].length > 1))],
  ['a worked example that is not the stop\'s working', { ...first('worked'), body: first('worked').body.replace(/→ (\d+)/, (x, d) => `→ ${+d + 1}`) }],
  ['a notepad moment that adds up wrong', { ...first('moment'), body: first('moment').body.replace(/= ([\d.]+)$/, (x, d) => `= ${+d + 1}`) }],
  ['a word question whose wrong option shares its topic', { ...first('wordq'), play: { ...first('wordq').play, opts: [first('wordq').play.opts[0], ...DICT.ENTRIES.filter((e) => e.topic === DICT.entry(first('wordq').play.opts[0]).topic && e.word !== first('wordq').play.opts[0]).slice(0, 2).map((e) => e.word)] } }],
  ['a stone that hides needsReview', { ...first('stone'), source: first('stone').source.replace('being checked by a second reader', 'checked'), badge: undefined }],
  ['a route to no screen', { ...first('formula'), route: '#/nowhere' }],
  // deep links (owner, 3 Oct 2026): each of these goes to the generic room, not the thing — caught
  ['a word that opens the Dictionary, not the word', { ...first('word'), route: '#/lib/dictionary' }],
  ['a formula that opens the Formula Book, not the formula', { ...first('formula'), route: '#/lib/formulas' }],
  ['a stone that opens the journey, not the stone', { ...first('stone'), route: '#/lib/vedic' }],
  ['a worked idea that opens the stop, not the idea', { ...first('worked'), route: first('worked').route.replace(/\|learn\|\d+$/, '') }],
  ['a story moment that opens the story at its start', { ...first('moment'), route: first('moment').route.replace(/\|story\|\d+$/, '|story|0') }],
  ['a fact that opens the facts page, not the fact', { ...ITEMS.find((c) => c.kind === 'fact'), route: '#/facts' }],
  ['a game that opens the Play room, not the game', { ...ITEMS.find((c) => c.src.startsWith('arcade:') && GAMES.some((g) => c.src === 'arcade:' + g.id)), route: '#/play' }],
  ['a link to a word that does not exist', { ...first('word'), route: '#/lib/dictionary|nonsenseword' }],
  ['a stop card whose second line is not the stop\'s', { ...first('hook'), more: 'The way in: something nobody wrote.' }],
  ['a stop card placed in the wrong world', { ...first('trick'), where: 'Nowhere · Level 1' }],
  ['a pattern whose answer is wrong', { ...ITEMS.find((c) => c.src.startsWith('pattern:')), play: { ...ITEMS.find((c) => c.src.startsWith('pattern:')).play, opts: ['1', '2', '3'] } }],
];
for (const [what, c] of broken) ok(!!bad(c), `the check catches ${what}`);
{ const L = 3, items = ITEMS.map((c) => (c.id === 'level-10' ? c : c)); const leak = feedFor({ items: [...items, { ...first('trick'), id: 'x-far', level: 9 }], level: L, band: '8-10', now: NOW });
  ok(!leak.some((x) => x.id === 'x-far'), 'the engine drops a card two levels up'); }

/* ---------------------------------------------------------------- audit v4: the options, the algebra, one stop, the why */
/* V7/E11 — the VALUE of the right option. Among numeric questions, where the answer sits among its
   options (smallest … largest) is near uniform: each rank at most 1.5× its fair share overall, and in
   no kind with 15 or more such cards is the answer the middle one, or the smallest, or the largest, in
   more than half. (The old cut: middle in 61%, facts 86%, formulas 98%; a magic square's always smallest.) */
const numeric = (c) => c.play && c.play.opts.every((o) => Number.isFinite(parseNum(String(o))));
function rankFaults(items) {
  const out = [], all = {}, kinds = {};
  for (const c of items.filter(numeric)) {
    const v = c.play.opts.map((o) => parseNum(String(o))), n = v.length, r = v.filter((x) => x < v[0]).length;
    (all[n] ||= Array(n).fill(0))[r]++;
    const kk = (kinds[`${c.kind}/${n}`] ||= Array(n).fill(0)); kk[r]++;
  }
  for (const [n, cs] of Object.entries(all)) { const tot = cs.reduce((a, b) => a + b, 0); if (tot >= 30) cs.forEach((x, r) => { if (x > 1.5 * tot / n) out.push(`${n} options: the answer is rank ${r} in ${x} of ${tot}`); }); }
  for (const [k, cs] of Object.entries(kinds)) { const tot = cs.reduce((a, b) => a + b, 0), n = cs.length; if (tot >= 15 && n >= 3) cs.forEach((x, r) => { if (x > tot / 2) out.push(`${k}: the answer is ${r === 0 ? 'the smallest' : r === n - 1 ? 'the largest' : 'the middle'} in ${x} of ${tot}`); }); }
  return out;
}
/* plausibility: when the answer is positive, no wrong option is 0, negative, or under a tenth of it;
   and none has the answer's value written another way */
function implausible(items) {
  const out = [];
  for (const c of items.filter(numeric)) {
    const [a, ...w] = c.play.opts.map((o) => parseNum(String(o)));
    for (const x of w) if (Math.abs(x - a) < 1e-9 || (a > 0 && (x <= 0 || x < a / 10 - 1e-9))) out.push(`${c.id}: ${c.play.q} offers ${x} for ${a}`);
  }
  return out;
}
/* the display SLOT, read off the card as it is rendered (the family's card, then showOpts) */
const slotOf = (c) => { const h = showOpts(feedCard(c, { why: '' }, {}), c.play.show), os = [...h.matchAll(/data-o="(\d+)"/g)].map((x) => +x[1]); return os.length === c.play.opts.length && new Set(os).size === os.length ? os.indexOf(0) : -1; };
function slotFaults(items) {
  const out = [], kinds = {}, all = {};
  for (const c of items.filter((x) => x.play)) {
    const s = slotOf(c), n = c.play.opts.length; if (s < 0) { out.push(`${c.id}: a button lost in the layout`); continue; }
    (kinds[`${c.kind}/${n}`] ||= Array(n).fill(0))[s]++; (all[n] ||= Array(n).fill(0))[s]++;
  }
  for (const [k, cs] of Object.entries(kinds)) if (Math.max(...cs) - Math.min(...cs) > 1) out.push(`${k}: the right option by slot ${cs.join('/')}`);
  for (const [n, cs] of Object.entries(all)) { const tot = cs.reduce((a, b) => a + b, 0); cs.forEach((x, i) => { if (x > 1.5 * tot / n) out.push(`${n} options: slot ${i} holds ${x} of ${tot}`); }); }
  return out;
}
{
  const rf = rankFaults(ITEMS), pf = implausible(ITEMS), sf = slotFaults(ITEMS);
  ok(!rf.length, `the right option's value is not given away by its rank (${rf.slice(0, 4).join('; ')})`);
  ok(!pf.length, `every wrong option is plausible (${pf.length}: ${pf.slice(0, 3).join('; ')})`);
  ok(!sf.length, `the right option's slot is even, per kind (${sf.slice(0, 4).join('; ')})`);
  // and as a child meets them: the slots shown across many sessions
  const seen = [0, 0, 0];
  for (const band of ['6-7', '8-10', '11-14']) for (let L = 1; L <= 10; L++) for (let d = 0; d < 5; d++)
    for (const x of session(H(), child(band, L), ITEMS, NOW + d * 864e5)) { const c = byIdF[x.id]; if (c.play && c.play.opts.length === 3) seen[slotOf(c)]++; }
  const tot = seen.reduce((a, b) => a + b, 0);
  ok(seen.every((x) => x <= 1.5 * tot / 3 && x >= tot / 3 / 1.5), `the slots shown in sessions are even (${seen.join('/')})`);
  // each check bites: the old shapes fail it
  const middle = ITEMS.map((c) => (numeric(c) && c.play.opts.length === 3 ? { ...c, play: { ...c.play, opts: [c.play.opts[0], String(parseNum(c.play.opts[0]) - 1), String(parseNum(c.play.opts[0]) + 1)] } } : c));
  ok(rankFaults(middle).length > 0, 'the rank check catches the answer always in the middle');
  const smallest = ITEMS.map((c) => (c.kind === 'magic' ? { ...c, play: { ...c.play, opts: [c.play.opts[0], String(+c.play.opts[0] + 1), String(+c.play.opts[0] + 2)] } } : c));
  ok(rankFaults(smallest).some((f) => /^magic/.test(f)), 'the rank check catches a magic square whose answer is always the smallest');
  const sq = ITEMS.find((c) => c.kind === 'try' && numeric(c) && +c.play.opts[0] > 100);
  ok(implausible([{ ...sq, play: { ...sq.play, opts: [sq.play.opts[0], '3', '0'] } }]).length === 2, 'the plausibility check catches 0 and a tenth-too-small option');
  ok(slotFaults(ITEMS.map((c) => (c.play ? { ...c, play: { ...c.play, show: undefined } } : c))).length > 0, 'the slot check catches the family card\'s own order (no show)');
  ok(slotFaults(ITEMS.map((c) => (c.play ? { ...c, play: { ...c.play, show: [...Array(c.play.opts.length).keys()] } } : c))).length > 0, 'the slot check catches the right option always first');
}

/* V3 — the algebra waits for Level 4: no card on Levels 1–3 is a stop's algebra or says it */
const algebraic = (c) => c.kind === 'algebra' || /algebra behind/i.test(c.title || '') || /^In algebra:/.test(c.more || '');
const earlyAlg = (items) => items.filter((c) => c.level != null && c.level < ALGEBRA_FROM && algebraic(c)).map((c) => c.id);
ok(!earlyAlg(ITEMS).length, `no algebra on Levels 1–${ALGEBRA_FROM - 1} (${earlyAlg(ITEMS).slice(0, 4).join(', ')})`);
ok(ITEMS.some((c) => c.kind === 'algebra' && c.level >= ALGEBRA_FROM), 'and the algebra is still there from Level 4');
ok(earlyAlg([{ ...first('algebra'), level: 2 }]).length === 1 && earlyAlg([{ ...first('trick'), level: 1, more: 'In algebra: x' }]).length === 1, 'the algebra check catches an algebra card, and a trick saying its algebra, on Level 1–3');

/* V4 — one stop is not a session: at most PER_STOP cards about one stop, at every level, band and day,
   after a stop was just passed (its cards move up), and with a mistake due; the gap fills from the next */
const perStop = (list) => { const n = {}; for (const x of list) { const s = stopOf(byIdF[x.id]); if (s) n[s] = (n[s] || 0) + 1; } return Math.max(0, ...Object.values(n)); };
{
  let worst = 0, uncapped = 0, short = '';
  for (const band of ['6-7', '8-10', '11-14']) for (let L = 1; L <= 10; L++) for (const d of [0, 1, 2, 5]) for (const what of ['', 'passed', 'mistake']) {
    const k = child(band, L), now = NOW + d * 864e5, st = LEVELS[L - 1].steps[d % LEVELS[L - 1].steps.length].stop;
    if (what === 'passed') k.last = { what: 'stop', title: byId[st].title, at: now - 6e4 };
    if (what === 'mistake') k.mistakes = { x: { q: { trick: st, text: 'a question', ans: 1 }, box: 0, due: now - 1, at: now - 864e5, misses: 1 } };
    const list = session(H(), k, ITEMS, now), raw = feedFor(options(H(), k, ITEMS, now));
    worst = Math.max(worst, perStop(list)); uncapped = Math.max(uncapped, perStop(raw));
    if (list.length < raw.length) short = `${band} L${L} ${what}: ${list.length} < ${raw.length}`;
  }
  ok(worst <= PER_STOP, `one stop has at most ${PER_STOP} cards in a session (worst ${worst})`);
  ok(!short, `a capped session fills from the next-ranked cards (${short})`);
  ok(uncapped > PER_STOP, `and the engine alone would have given one stop ${uncapped} — the cap is doing something`);
}

/* V5 — the why names its reason: a card about a stop names the stop, a fact card names the fact, a
   word or formula names a stop that teaches it, a slip names what slipped and when, a near medal is
   named with how many are left. A generic line is left only on a card with nothing to name. */
function whyFaults(list) {
  const out = [];
  for (const x of list) {
    const c = byIdF[x.id], stop = stopOf(c) && byId[c.key.slice(5)];
    if (/ more to the .+ medal$/.test(x.why)) continue;
    if (stop && !x.why.includes(stop.title)) out.push(`${x.id}: "${x.why}" does not name ${stop.title}`);
    else if (c.kind === 'fact' && !x.why.includes(F.text(F.parseKey(c.key.slice(5))))) out.push(`${x.id}: "${x.why}" does not name its fact`);
    else if (/^(word|wordq|formula)/.test(c.kind) && c.topics.some((t) => t.startsWith('stop:')) && !c.topics.some((t) => t.startsWith('stop:') && x.why.includes(byId[t.slice(5)].title))) out.push(`${x.id}: "${x.why}" names no stop that teaches it`);
  }
  return out;
}
{
  const faults = [];
  for (const band of ['6-7', '8-10', '11-14']) for (let L = 1; L <= 10; L++) faults.push(...whyFaults(session(H(), child(band, L), ITEMS, NOW)));
  ok(!faults.length, `every why names its reason when it has one (${faults.length}: ${faults.slice(0, 3).join('; ')})`);
  const raw = whyFaults(feedFor(options(H(), child('8-10', 5), ITEMS, NOW)));
  ok(raw.length > 0 && raw.some((f) => /For Level 5/.test(f)), `the why check catches the engine's generic "For Level 5" (${raw.length})`);
  // a mistake says what slipped and when
  const k = child('8-10', 3);
  k.mistakes = { x: { q: { trick: 'column-sub', text: '912 − 437', ans: 475 }, box: 0, due: NOW - 1, at: NOW - 864e5, misses: 1 } };
  const s = session(H(), k, ITEMS, NOW).filter((x) => byIdF[x.id].key === 'stop:column-sub');
  ok(s.length && s.every((x) => x.why.startsWith('You slipped on 912 − 437 yesterday')), `a mistake's why: "You slipped on 912 − 437 yesterday" (${s[0] && s[0].why})`);
  // a fact that slipped says which, and when
  const FC = ITEMS.find((c) => c.kind === 'fact' && c.bands.includes('8-10') && c.key.includes('×')), key = FC.key.slice(5), k2 = child('8-10', 3), r = F.blank();
  F.record(r, true, 1000, '8-10', NOW - 40 * 864e5); F.record(r, true, 1000, '8-10', NOW - 30 * 864e5); F.record(r, true, 1000, '8-10', NOW - 20 * 864e5); F.record(r, false, 9000, '8-10', NOW - 2 * 864e5);
  k2.facts[key] = r;
  const fx = session(H(), k2, ITEMS, r.due + 3600e3).find((x) => x.id === FC.id);
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }, ago = Math.round((sod(r.due + 3600e3) - sod(r.last)) / 864e5);
  ok(fx && fx.why === `You slipped on ${F.text(F.parseKey(key))} ${ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago + ' days ago'}`, `a slipped fact's why names it and when (${fx && fx.why})`);
  // a medal within reach says so, and only when it is true
  const k3 = child('8-10', 3); let n3 = 0;
  for (const f of F.BANK['×']) { if (n3 >= 23) break; const rr = F.blank(); rr.n = 4; rr.box = F.MASTERED_BOX; rr.peak = F.MASTERED_BOX; rr.due = NOW + 864e5; rr.recent = ['F', 'F']; k3.facts[F.key(f)] = rr; n3++; }
  const fluentNow = F.OPS.reduce((a, o) => a + F.tally(k3.facts, o).fluent, 0);
  const medalWhys = session(H(), k3, ITEMS, NOW).filter((x) => / more to the Quick hands medal$/.test(x.why));
  ok(fluentNow === 23 && medalWhys.length > 0 && medalWhys.every((x) => x.why === 'Two more to the Quick hands medal' && byIdF[x.id].kind === 'fact'), `two facts short of Quick hands: "Two more to the Quick hands medal" on fact cards (${fluentNow} fluent; ${medalWhys.length})`);
  ok(!session(H(), child('8-10', 3), ITEMS, NOW).some((x) => / medal$/.test(x.why)), 'and no medal line when none is near');
  ok(session(H(), child('8-10', 5), ITEMS, NOW).filter((x) => GENERIC_WHY.test(x.why)).every((x) => !stopOf(byIdF[x.id]) && byIdF[x.id].kind !== 'fact'), 'a generic line is left only where there is nothing to name');
}

const lv = Object.entries(m.byLevel).map(([k, v]) => `L${k} ${v}`).join(', ');
if (fails) { console.error(`feed: ${fails} failure(s)`); process.exit(1); }
console.log(`ok feed — ${m.total} cards (${lv}; ${m.agnostic} with no level), every src resolves, every question checked three ways and leak-free, ranking holds`);
console.log('   by kind: ' + Object.entries(m.byKind).map(([k, v]) => `${k} ${v}`).join(', '));
