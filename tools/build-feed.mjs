/* tools/build-feed.mjs — My Feed's cards, cut from Bizzing Maths' own corpus (FAMILY-STANDARD §6a).

     node tools/build-feed.mjs     writes app/src/feed/index.js (what the ranking needs, no words),
                                   app/src/feed/g-L1.js … g-L10.js and g-any.js (the cards' words,
                                   one lazy group per journey level and one for level-agnostic
                                   cards), and tools/feed-manifest.json (the counts)

   Nothing here is typed for the feed. Every card names the object it was cut from (`src`) and
   app/test/feed.mjs resolves it, finds the card's words in it, and re-runs every question
   through the app's own rules: the trick, `ans` and `expr` agree, the prompt never shows its
   answer, and only the right option is right. Change a stop, story, word or formula and that
   test fails until this runs again.

   ANGLES (owner, 2 Oct 2026: "do more if possible"). One object may give several cards, each a
   different thing it already holds, each its own `kind` and `src` path:
     a stop     the trick (its idea and first reason) · its hook · each worked idea (case) and the
                case worked out step by step by the stop's own work() · each further reason · its
                algebra · its sutra · a question at each road's difficulty (gen(r, lv))
     a story    its opening · a moment (a notepad sum the story test checks) · its last word
     a word     its meaning with the corpus's example · a question: which word is that example of
     a formula  the formula · each reason it holds · its story's opening · a question (its gen())
     a stone    its first card · each further card · a question (its gen()), with its sources and,
                where the screen says it, "being checked by a second reader"
   and, with no level, the number facts (by tricky()), the rank names, the Bee's ten rivals as the
   Mock Contest describes them, the Library's tools, the games and the Puzzle Room, whose
   pattern and magic-square puzzles are proved as the room proves them.

   LEVELS are the ten journey levels (levels.js). A card about a stop sits on a level whose ROAD
   walks that stop — never one that does not. A stop walked on several roads has its angles
   dealt across them: the trick and its story where the child first meets it, the rest round
   the roads that bring it back, and a question on every road. A word, formula or stone goes to
   the least-filled road that walks one of its stops.

   DEEP LINKS (owner, 3 Oct 2026: "navigation to that specific topic, not the generic tool"): a
   card's route opens the very thing it is about — the stop on the tab and the worked idea or
   story beat it quotes, the word in the Dictionary, the card in the Formula Book, the stone on
   its journey, the fact on the facts grid, the game, the puzzle family, the level's road.
   MORE, WHERE: a second line and a place line, also cut from the corpus — the stop's idea or
   algebra, the stops that teach a word or a formula, what a land's test asks, where it lives.

   NEAR-DUPLICATES are dropped as they are cut (two cards whose words are ≥ 80% the same — the
   later one goes), and the test holds the whole set to it. */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRICKS, byId, worldOf, learnCases, correct, parseNum } from '../app/src/tricks.js';
import { evalSum } from '../app/src/stories.js';
import { STORIES } from '../app/src/story-data.js';
import { LEVELS, CONCEPT_OF } from '../app/src/levels.js';
import { RANKS, BANDS } from '../app/src/model.js';
import * as F from '../app/src/facts.js';
import { seeded } from '../app/src/rand.js';
import { patternQuestion, magicQuestion, magicSolvable, FAMILIES } from '../app/src/puzzles.js';
import { HEROES, GAMES } from '../app/src/arcade.js';
import { SHELF } from '../app/src/library/shelf.js';
import { RIVALS } from '../app/src/contest.js';
import { hash } from '../app/src/integration/bizzing-feed.js';
import * as DICT from '../app/src/library/dictionary.js';
import * as FORM from '../app/src/library/formulas.js';
import * as VED from '../app/src/library/vedic.js';
import * as CHI from '../app/src/library/chinese.js';
import { LAND_N, LAND_PASS, LAND_BONUS } from '../app/src/journey.js';
import { feedGroup } from '../app/src/feed.js';
import { cutMore } from './feed-more.mjs';

const BAND_IDS = BANDS.map((b) => b.id);
export const bandsFrom = (b) => BAND_IDS.slice(Math.max(0, BAND_IDS.indexOf(b)));
const NAME = Object.fromEntries(RIVALS.map((r) => [r.id, r.name]));
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
export const GROUPS = [...LEVELS.map((L) => `L${L.n}`), 'any', 'drill'];
/* the lazy group a card's words live in: its level's, or with no level 'any' — or 'drill' for the quick number questions (feed.js) */
export const groupOf = feedGroup;

/* ---------------------------------------------------------------- near-duplicates */
/* words and the maths signs: "3 + 4" and "4 × 3" are not the same card */
export const words = (s) => new Set(String(s || '').toLowerCase().match(/[\p{L}\p{N}]+|[+−×÷²√%<>]/gu) || []);
export const textOf = (c) => c.body || (c.play && c.play.q) || c.title;
export function similar(a, b) { let n = 0; for (const w of a) if (b.has(w)) n++; const u = a.size + b.size - n; return u ? n / u : 1; }
export const NEAR = 0.8;

/* ---------------------------------------------------------------- the roads */
export const WALKS = {};
/* the first journey level that may show a stop's algebra (audit v4, V3: "The algebra behind…" reached Level 1) */
export const ALGEBRA_FROM = 4;
for (const L of LEVELS) for (const s of L.steps) (WALKS[s.stop] = WALKS[s.stop] || []).push({ level: L.n, lv: s.lv });
export const topicsOf = (id) => { const t = byId[id]; return [`stop:${id}`, `world:${t.world}`, `concept:${CONCEPT_OF[id]}`]; };

/* A question a card may ask, with text alone: a prompt that points at a picture is left to its screen. */
export const NEEDS_PICTURE = /\bthis\b|\bthese\b|clock show|shaded|graph shows|Votes for|Each ★|highlighted|marked angle|scatter graph|☐|on the suanpan|goes in the square/i;
export const leaks = (text, ans) => String(ans).length > 1 && plain(text).split(/[^0-9./]/).map((x) => x.replace(/^\.+|\.+$/g, '')).includes(String(ans));
export const asQ = (text) => `${text}${/[?.]$/.test(text) ? '' : ' = ?'}`;

/* ---------------------------------------------------------------- wrong options (audit v4, V7/E11)
   A wrong option is a slip a child really makes, never a number nobody would write. The old cut
   put the right answer in the MIDDLE of its three options in 61% of cards (facts 86%, formulas
   98%) and a magic square's was always the smallest, so "pick the middle one" scored without
   any maths. Now:
     candidates   the working's own values (a step is the classic slip), the same sum with one
                  sign changed (a wrong operation), a place slip (× 10, ÷ 10), two digits swapped,
                  a slip in one column (± 10, ± 100), and, last, near misses at varied distances;
     plausible    never 0, never negative, never under a tenth of the answer when the answer is
                  positive (53² is never offered as 3 or 300; √25 never as 0), never the same
                  value as the answer written another way;
     rank         how many options sit below the answer is drawn from the card's own seed, so
                  the answer is the smallest, the middle or the largest equally often.
   The display slot is a separate matter, balanced across each kind at the end of the cut. */
const dpOf = (x) => { const s = String(x); return s.includes('.') ? s.split('.')[1].length : 0; };
const natural = (v) => String(+Number(v).toFixed(6));
/* an answer's shape: whole, decimal (to its places) or a fraction a/b */
function shape(ans) {
  const s = String(ans).replace(/[−–]/g, '-');
  if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return { frac: [a, b], want: a / b }; }
  const want = typeof ans === 'number' ? ans : parseNum(s);
  return { want, int: Number.isInteger(want) && !s.includes('.'), dp: dpOf(s) };
}
export function plausible(v, want) {
  if (!Number.isFinite(v) || Math.abs(v - want) < 1e-9) return false;
  if (want > 0) return v > 0 && v >= want / 10 - 1e-9 && v <= Math.max(want * 10, want + 20) + 1e-9;
  return true;
}
/* the same plain sum with one operation changed: + ↔ −, × → + (only a short sum of one or two
   operations, never a function: in 2×2×2×2×2×2×2 a "wrong operation" is not a slip anyone makes) */
export function opSlips(expr) {
  const e = String(expr || '');
  if (!/^[\d\s.+\-*/()]+$/.test(e) || e.includes('**') || (e.match(/[\d)]\s*[+\-*/]/g) || []).length > 2) return [];
  const out = [], swap = { '+': ['-'], '-': ['+'], '*': ['+'] };
  for (let i = 1; i < e.length; i++) {
    const c = e[i]; if (!swap[c] || !/[\d)]/.test(e.slice(0, i).trimEnd().at(-1) || '')) continue;
    for (const to of swap[c]) { try { const v = Function(`return (${e.slice(0, i)}${to}${e.slice(i + 1)})`)(); if (Number.isFinite(v)) out.push(v); } catch { /* not a sum */ } }
  }
  return out;
}
/* place, digit and column slips of a positive whole or decimal answer */
export function numberSlips(want, sh) {
  const out = [];
  const s = sh.int ? String(Math.abs(want)) : Math.abs(want).toFixed(sh.dp), sign = want < 0 ? -1 : 1;
  if (!sh.int || Math.abs(want) >= 20) out.push(want * 10, want / 10);                 // a place slip (7 + 9 is never offered as 160)
  const ds = s.replace('.', ''), at = s.indexOf('.');
  for (let i = 0; i + 1 < ds.length; i++) if (ds[i] !== ds[i + 1] && !(i === 0 && (ds[0] === '0' || ds[1] === '0'))) {
    const sw = ds.slice(0, i) + ds[i + 1] + ds[i] + ds.slice(i + 2);                 // two digits swapped
    out.push(sign * Number(at < 0 ? sw : sw.slice(0, at) + '.' + sw.slice(at)));
  }
  const u = sh.int ? 1 : 10 ** -sh.dp;
  for (const k of [10, 100]) if (Math.abs(want) >= k * u) out.push(want + k * u, want - k * u);   // one column out
  return out;
}
export const nearMisses = (want, u) => [1, 2, 3, 4, 5, 6].flatMap((d) => [want + d * u, want - d * u]);

/* choose n wrong options from candidates [{s, tier}] so that the answer's rank is drawn from the seed */
export function pick(ans, cands, n, seedKey, { check = () => true, keep = plausible } = {}) {
  const sh = shape(ans), want = sh.want, r = seeded(`wrong:${seedKey}`), seen = new Set();
  const ok = [];
  for (const c of cands) {
    const v = parseNum(c.s);
    if (!Number.isFinite(v) || !keep(v, want) || seen.has(c.s) || ok.some((o) => Math.abs(o.v - v) < 1e-9) || !check(c.s)) continue;
    seen.add(c.s); ok.push({ ...c, v, j: r() });
  }
  const side = (f) => ok.filter(f).sort((a, b) => a.tier - b.tier || a.j - b.j);
  const lo = side((c) => c.v < want), hi = side((c) => c.v > want);
  let below = Math.floor(r() * (n + 1));
  below = Math.min(below, lo.length); below = Math.max(below, n - hi.length);
  if (below < 0 || below > lo.length) return null;
  return [...lo.slice(0, below), ...hi.slice(0, n - below)].map((c) => c.s);
}

/* wrong options for a question: from its working, its plain sum, then the shape of its answer */
export function wrongs(q, steps, n = 2, seedKey = `${q.text}|${q.ans}`, extra = []) {
  const sh = shape(q.ans), want = sh.want;
  if (!Number.isFinite(want)) return null;
  const cands = [], fmt = (v) => (sh.int ? String(Math.round(v)) : sh.frac ? null : Number.isInteger(v) ? String(v) : Number(v).toFixed(Math.max(1, sh.dp)));
  const add = (v, tier) => { if (typeof v === 'string') cands.push({ s: v, tier }); else if (Number.isFinite(v) && (!sh.int || Number.isInteger(v))) { const s = sh.frac ? null : fmt(v); if (s != null) cands.push({ s, tier }); } };
  for (const v of extra) add(v, 0);
  for (const s of steps) if (typeof s.v === 'number' || /^-?[\d.]+(\/\d+)?$/.test(String(s.v))) add(String(s.v), 0);
  for (const v of opSlips(q.expr)) add(v, 0);
  if (sh.frac) {
    const [a, b] = sh.frac;
    for (const x of [`${b}/${a}`, `${a + 1}/${b}`, `${a}/${b + 1}`, `${a - 1}/${b}`, `${a}/${b - 1}`, `${a + 2}/${b}`, `${a}/${b + 2}`]) if (/^-?\d+\/[1-9]\d*$/.test(x)) add(x, 1);
  } else {
    if (want < 0) add(-want, 0);                                                      // the sign slip
    for (const v of numberSlips(want, sh)) add(sh.int || Number.isInteger(v) ? v : natural(v), 1);
    for (const v of nearMisses(want, sh.int ? 1 : 10 ** -Math.max(1, sh.dp))) add(v, 2);
  }
  const check = (c) => !correct(q, c) && c !== String(q.ans);
  return pick(q.ans, cands, n, seedKey, { check });
}

/* one question from a generator — a stop's, a stone's — seeded, text-only, never leaking */
export function askFrom(t, seedKey, lv, from = 0, tries = 40) {
  for (let i = from; i < from + tries; i++) {
    const q = t.gen(seeded(`${seedKey}#${i}`), lv);
    if (!q || q.text == null || NEEDS_PICTURE.test(q.text) || (!t.echo && leaks(q.text, q.ans))) continue;
    if (q.choices) {
      const rest = q.choices.filter((c) => c !== q.ans), numeric = [q.ans, ...rest].every((c) => Number.isFinite(parseNum(c)));
      const w = numeric && rest.length > 2 ? pick(q.ans, rest.map((s) => ({ s: String(s), tier: 0 })), 2, `${seedKey}#${i}`, { keep: (v, want) => Math.abs(v - want) > 1e-9 }) : rest.slice(0, 2);
      if (!w || w.length < 1) continue; return { q, i, opts: [q.ans, ...w] };
    }
    const w = wrongs(q, t.work ? t.work(q) : [], 2, `${seedKey}#${i}`); if (!w) continue;
    return { q, i, opts: [String(q.ans), ...w] };
  }
  return null;
}
export const tryQuestion = (id, level, lv) => askFrom(byId[id], `feed:${id}@${level}`, lv);
/* the stop's own worked example, said as its steps */
export const workedText = (t, q) => `${q.text}: ${t.work(q).map((s) => `${s.t} → ${s.v}`).join(' · ')}`;

/* ---------------------------------------------------------------- the cut */
export function cut() {
  const items = [], perLevel = {};
  const add = (c) => {
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
    items.push(c); if (c.level != null) perLevel[c.level] = (perLevel[c.level] || 0) + 1;
    return c;
  };

  /* the road itself: each level and each land */
  for (const L of LEVELS) {
    add({ id: `level-${L.n}`, kind: 'level', level: L.n, bands: BAND_IDS, topics: [`level:${L.n}`], src: `level:${L.n}`,
      title: `Level ${L.n} · ${L.name}`, body: L.blurb, more: `Its lands: ${L.lands.map((d) => d.name).join(' · ')}.`, where: `Level ${L.n} · ${L.age === '15+' ? 'age 15 and over' : 'maths age ' + L.age}`, route: `#/journey/${L.n}`, cta: 'See the road' });
    for (const ld of L.lands) {
      const w = worldOf(ld.world);
      add({ id: `land-${ld.id}`, kind: 'land', level: L.n, bands: BAND_IDS, topics: [`world:${ld.world}`, `concept:${ld.concept}`], src: `land:${ld.id}`,
        title: `${ld.name} — in ${w.name}`, body: `${ld.steps.length} stops on this stretch of the road: ${ld.steps.map((x) => byId[x.stop].title).join(' · ')}.`, art: `art/w-${ld.world}.webp`, more: `At its end, a ${LAND_N}-question test: ${LAND_PASS} right passes, and ${LAND_BONUS} bonus questions count double.`, where: `${w.name} · Level ${L.n}`, route: `#/world/${ld.world}`, cta: `Visit ${w.short}` });
    }
  }

  /* each stop's angles, dealt across the roads that walk it */
  for (const t of TRICKS) {
    const walks = (WALKS[t.id] || []).slice().sort((a, b) => a.level - b.level);
    if (!walks.length) continue;
    const bands = bandsFrom(t.band), topics = topicsOf(t.id), route = `#/stop/${t.id}`;
    const A = [];
    // its second line is the algebra only where the child first meets it at Level 4 or later; before that, the first worked idea's own note
    const note = learnCases(t).find((c) => c.note), young = walks[0].level < ALGEBRA_FROM;
    A.push({ kind: 'trick', src: `stop:${t.id}#idea`, title: t.title, body: `${t.idea} ${t.why[0]}`, more: young ? (note ? `For example: ${note.note}` : `The trick: ${t.idea}`) : `In algebra: ${t.alg}`, go: 'learn', cta: 'Learn the trick', first: true });
    const s = STORIES[t.id];
    if (s) {
      const open = s.beats.find((b) => b.who === null);
      A.push({ kind: 'story', src: `story:${t.id}#open`, badge: { id: 'story', label: 'A story' }, title: s.title,
        body: `${open.say} — with ${s.cast.map((c) => NAME[c]).join(' and ')}.`, more: `The trick inside: ${t.idea}`, go: 'story|0', art: `art/s-${s.scene}.webp`, cta: 'Read the story', first: true });
    }
    A.push({ kind: 'hook', src: `stop:${t.id}#hook`, title: `Can you? — ${t.title}`, body: t.hook, more: `The way in: ${t.idea}`, go: 'learn', cta: 'Find out how' });
    learnCases(t).forEach((c, i) => {
      if (c.label && c.note) A.push({ kind: 'idea', src: `stop:${t.id}#case${i}`, title: `${t.title}: ${c.label}`, body: c.note, more: `The method: ${t.idea}`, go: `learn|${i}`, cta: 'See it worked' });
      if (!t.draw || !NEEDS_PICTURE.test(c.q.text)) A.push({ kind: 'worked', src: `stop:${t.id}#worked${i}`, title: `Worked out — ${t.title}${c.label ? ': ' + c.label : ''}`, body: workedText(t, c.q), more: c.note ? `What is special here: ${c.note}` : `The method: ${t.idea}`, go: `learn|${i}`, cta: 'Watch it step by step' });
    });
    t.why.slice(1).forEach((p, i) => A.push({ kind: 'why', src: `stop:${t.id}#why${i + 1}`, title: `Why “${t.title}” works`, body: p, more: `The trick: ${t.idea}`, go: 'learn', cta: 'See why' }));
    A.push({ kind: 'algebra', src: `stop:${t.id}#alg`, title: `The algebra behind “${t.title}”`, body: t.alg, more: `In words: ${t.idea}`, go: 'learn', cta: 'See why' });
    if (t.sutra) A.push({ kind: 'sutra', src: `stop:${t.id}#sutra`, title: t.sutra.sa, body: `“${t.sutra.en}” — the sutra behind ${t.title}.`, more: `What it does: ${t.idea}`, go: 'learn', cta: 'Open the stop' });
    if (s) {
      const sums = s.beats.filter((b) => b.add && b.add.v !== undefined);
      const mid = sums[Math.floor((sums.length - 1) / 2)];
      if (mid && sums.length > 1) A.push({ kind: 'moment', src: `story:${t.id}#beat${s.beats.indexOf(mid)}`, badge: { id: 'story', label: 'A story' }, title: `${s.title} — on the notepad`,
        body: `${mid.who ? NAME[mid.who] + ': ' : ''}${mid.say} ${mid.add.t} = ${mid.add.v}`, more: `The trick in the story: ${t.idea}`, go: `story|${s.beats.indexOf(mid)}`, cta: 'Read the story' });
      const last = s.beats.at(-1);
      if (last.who) A.push({ kind: 'moral', src: `story:${t.id}#beat${s.beats.length - 1}`, badge: { id: 'story', label: 'A story' }, title: `${NAME[last.who]}, in “${s.title}”`, body: last.say, more: `The trick in the story: ${t.idea}`, go: `story|${s.beats.length - 1}`, cta: 'Read the story' });
    }
    /* the algebra waits for Level 4 (audit v4, V3): a road of Levels 1–3 deals the rest and never the algebra */
    const deal = walks.map(() => []), late = walks.map((wk, wi) => (wk.level >= ALGEBRA_FROM ? wi : -1)).filter((wi) => wi >= 0);
    let r = walks.length > 1 ? 1 : 0;
    for (const f of A.filter((x) => x.kind !== 'algebra')) { if (f.first) deal[0].push(f); else { deal[r].push(f); r = (r + 1) % walks.length; } }
    const alg = A.find((x) => x.kind === 'algebra');
    if (late.length) deal[late.reduce((a, b) => (deal[b].length < deal[a].length ? b : a))].push(alg);
    walks.forEach((wk, wi) => {
      for (const f of deal[wi]) {
        const { first, go, ...card } = f; void first;
        add({ id: `${f.kind}-${t.id}-${f.src.split('#')[1]}`, ...card, where: `${worldOf(t.world).name} · Level ${wk.level}`, level: wk.level, bands, topics, key: `stop:${t.id}`, route: `${route}|${go}` });
      }
      const tq = tryQuestion(t.id, wk.level, wk.lv);
      if (tq) add({ id: `try-${t.id}-L${wk.level}`, kind: 'try', level: wk.level, bands, topics, key: `stop:${t.id}`, src: `try:${t.id}@${wk.level}/${wk.lv}#${tq.i}`,
        title: `${t.title} — your turn`, where: `${worldOf(t.world).name} · Level ${wk.level}`, route: `${route}|drill`, cta: 'Practise this stop',
        play: { q: tq.q.choices ? tq.q.text : asQ(tq.q.text), opts: tq.opts, after: t.idea } });
    });
  }

  /* words, formulas and sutra stones: to the least-filled road that walks one of their stops */
  const place = (stops) => {
    const lv = [...new Set((stops || []).flatMap((s) => (WALKS[s] || []).map((x) => x.level)))];
    return lv.length ? lv.sort((a, b) => (perLevel[a] || 0) - (perLevel[b] || 0) || a - b)[0] : null;
  };
  const bandOfStops = (stops) => { const bs = (stops || []).filter((s) => byId[s]).map((s) => BAND_IDS.indexOf(byId[s].band)); return bs.length ? BAND_IDS[Math.min(...bs)] : null; };
  const levelBand = (level, stops) => bandOfStops((stops || []).filter((s) => (WALKS[s] || []).some((x) => x.level === level))) || bandOfStops(stops);
  const agnostic = [];
  /* where a word or a formula is taught: the stops, by name, and the world of the first */
  const taughtIn = (stops) => (stops.length ? { more: `Taught at: ${stops.slice(0, 4).map((x) => byId[x].title).join(' · ')}.`, where: worldOf(byId[stops[0]].world).name } : {});
  const put = (card, level) => { if (level == null) { delete card.level; agnostic.push(card); } else add({ ...card, level }); };

  for (const e of DICT.ENTRIES) {
    const stops = e.stops.filter((s) => byId[s]), level = place(stops), slug = DICT.norm(e.word).replace(/\s+/g, '-');
    const bands = level == null ? BAND_IDS : bandsFrom(levelBand(level, stops)), topics = stops.length ? stops.flatMap(topicsOf) : ['tool:dictionary'];
    put({ id: `word-${slug}`, kind: 'word', src: `dictionary:${e.word}#def`, title: e.word, body: `${e.def} For example: ${e.ex}`, ...taughtIn(stops), route: `#/lib/dictionary|${e.word}`, cta: `${e.word} in the Dictionary`,
      source: e.sources ? e.sources.join(' ') : undefined, bands, topics }, level);
    // which word is this example of? the wrong options come from OTHER topics, so only one can be right
    const others = DICT.ENTRIES.filter((x) => x.topic !== e.topic && !x.see.includes(e.word) && !e.see.includes(x.word));
    const pick = [0, 1].map((j) => others[hash(`${e.word}:${j}`) % others.length]);
    const opts = [e.word, ...new Set(pick.map((x) => x.word))];
    const ex = e.ex.toLowerCase();
    if (opts.length === 3 && !opts.some((o) => ex.includes(o.toLowerCase())) && !e.alias.some((a) => ex.includes(a.toLowerCase())))
      put({ id: `wordq-${slug}`, kind: 'wordq', src: `dictionary:${e.word}#ex`, title: 'Which maths word?', route: `#/lib/dictionary|${e.word}`, cta: 'Look it up', bands, topics,
        play: { q: `Which word is this an example of? “${e.ex}”`, opts, after: `${e.word}: ${e.def}` } }, level);
  }
  for (const c of FORM.CARDS) {
    const stops = c.stops.filter((s) => byId[s]), level = place(stops), bands = bandsFrom(c.band), topics = stops.flatMap(topicsOf), route = `#/lib/formulas|${c.id}`, cta = `${c.title} in the Formula Book`;
    const ex = c.example, card = { id: `formula-${c.id}`, kind: 'formula', src: `formula:${c.id}`, title: c.title, body: `${c.formula}. ${c.caption}`, ...taughtIn(stops), route, cta, bands, topics };
    const w = wrongs({ ans: ex.ans, expr: ex.expr }, [], 2, `formula:${c.id}`);
    if (w && !leaks(`${c.title}: ${ex.q} ${card.body}`, ex.ans)) card.play = { q: `${c.title}: ${ex.q}`, opts: [String(ex.ans), ...w], after: ex.lines.join(' · ') };
    put(card, level);
    c.why.forEach((p, i) => put({ id: `formula-why-${c.id}-${i}`, kind: 'formula-why', src: `formula:${c.id}#why${i}`, title: `Why ${c.formula}`, body: p, more: `The card: ${c.title} — ${c.caption}`, route, cta, bands, topics }, place(stops)));
    if (c.story) { const o = c.story.beats.find((b) => b.who === null);
      put({ id: `formula-story-${c.id}`, kind: 'formula-story', src: `formula:${c.id}#story`, badge: { id: 'story', label: 'A story' }, title: c.story.title,
        body: `${o.say} — with ${c.story.cast.map((x) => NAME[x]).join(' and ')}.`, art: `art/s-${c.story.scene}.webp`, route, cta, bands, topics }, place(stops)); }
    for (let i = 0; i < 40; i++) {
      const q = c.gen(seeded(`feed:formula:${c.id}#${i}`)); if (leaks(q.text, q.ans)) continue;
      const w2 = wrongs(q, [], 2, `formula:${c.id}#${i}`); if (!w2) continue;
      put({ id: `formula-try-${c.id}`, kind: 'formula-try', src: `formula:${c.id}#gen${i}`, title: `${c.title} — your turn`, route, cta, bands, topics,
        play: { q: asQ(q.text), opts: [String(q.ans), ...w2], after: c.formula } }, place(stops));
      break;
    }
  }
  for (const [tool, J] of [['vedic', VED.JOURNEY], ['chinese', CHI.JOURNEY]]) J.forEach((st, i) => {
    if (!st.sources || !st.sources.length) return;                    // only a stone that cites its sources
    const stops = [st.stop, ...(st.see || [])].filter((s) => s && byId[s]);
    const at = () => (tool === 'vedic' ? place(stops) : null);
    const base = { src: `journey:${tool}/${st.id}`, key: `stone:${tool}:${i}`, badge: st.needsReview ? { id: 'review', label: 'Being checked' } : undefined,
      source: `${st.needsReview ? 'Sources, being checked by a second reader: ' : 'Sources: '}${st.sources.join(' ')}`,
      route: `#/lib/${tool}|${st.id}`, cta: `Stone ${i + 1}: ${st.title}`, where: `${tool === 'vedic' ? 'The Vedic' : 'The Chinese'} Maths Journey · stone ${i + 1} of ${J.length}`,
      bands: stops.length ? bandsFrom(bandOfStops(stops)) : BAND_IDS, topics: [`tool:${tool}`, ...stops.flatMap(topicsOf)], stone: { tool, i, prev: i ? J[i - 1].id : null } };
    const title = `${st.title}${st.sutra ? ` — ${st.sutra.sa}` : ''}`;
    st.cards.forEach((p, j) => put({ ...base, id: `stone-${tool}-${st.id}${j ? '-' + j : ''}`, kind: j ? 'stone-step' : 'stone', src: `${base.src}#${j}`, title: j ? `${st.title} (${j + 1} of ${st.cards.length})` : title, body: p }, at()));
    if (st.gen) {
      // never a question whose answer the card already shows — in its place line ("stone 12 of 14") or its link
      let qq = askFrom(st, `feed:${tool}:${st.id}`, 2);
      while (qq && leaks(`${base.where} ${base.cta} ${st.title}`, qq.q.ans)) qq = askFrom(st, `feed:${tool}:${st.id}`, 2, qq.i + 1);
      if (qq) put({ ...base, id: `stone-try-${tool}-${st.id}`, kind: 'stone-try', src: `${base.src}#gen${qq.i}`, title: `${st.title} — try it`,
        play: { q: qq.q.choices ? qq.q.text : asQ(qq.q.text), opts: qq.opts.map(String), after: st.kicker } }, at());
    }
  });

  /* number facts: every fact worth drilling, trickiest first (facts.js tricky(); × 0, × 1, + 0 and a fact that shows its own answer are left out) */
  const factBands = (f) => {
    if (f.op === '+' || f.op === '-') return ['6-7', '8-10'];
    if (f.op === '²') return ['8-10', '11-14'];
    const [a, b] = f.op === '÷' ? [f.b, f.a / f.b] : [f.a, f.b];
    return [2, 5, 10].includes(Math.min(a, b)) || [2, 5, 10].includes(Math.max(a, b)) ? BAND_IDS : ['8-10', '11-14'];
  };
  const facts = F.OPS.flatMap((op) => F.BANK[op]).filter((f) => F.tricky(f) > 0.45).sort((x, y) => F.tricky(y) - F.tricky(x) || F.key(x).localeCompare(F.key(y)));
  for (const f of facts) {
    const ans = F.answer(f);
    /* the slips this fact invites: a neighbouring row or column of the table, the wrong operation, then the shape of the number */
    const { a, b } = f, slips = f.op === '×' ? [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b] : f.op === '÷' ? [ans + 1, ans - 1, a / (b + 1), a / (b - 1)]
      : f.op === '²' ? [a * (a + 1), a * (a - 1), (a + 1) ** 2, (a - 1) ** 2] : f.op === '+' ? [ans + 1, ans - 1, Math.abs(a - b)] : [ans + 1, ans - 1, a + b];
    const wrongOp = f.op === '×' ? [a + b] : f.op === '²' ? [2 * a] : f.op === '+' ? [ans + 10, ans - 10] : f.op === '-' ? [ans + 10] : [];
    const cands = [...slips.filter(Number.isInteger).map((v) => ({ s: String(v), tier: 0 })), ...wrongOp.map((v) => ({ s: String(v), tier: 1 })),
      ...numberSlips(ans, { int: true, dp: 0 }).filter(Number.isInteger).map((v) => ({ s: String(v), tier: 1 })), ...nearMisses(ans, 1).map((v) => ({ s: String(v), tier: 2 }))];
    const w = pick(ans, cands, 2, `fact:${F.key(f)}`), opts = w ? [String(ans), ...w] : [];
    if (opts.length < 3 || leaks(F.text(f), ans)) continue;
    agnostic.push({ id: `fact-${F.OP_WORD[f.op]}-${f.a}-${f.b}`, kind: 'fact', key: `fact:${F.key(f)}`, src: `fact:${F.key(f)}`, bands: factBands(f), topics: ['facts', `op:${f.op}`],
      title: F.OP_NAME[f.op], route: `#/facts/${f.op}|${F.key(f)}`, cta: `${F.text(f)} on the facts grid`, play: { q: `${F.text(f)} = ?`, opts, after: F.why(f) } });
  }
  RANKS.forEach((r, i) => agnostic.push({ id: `rank-${r.n.toLowerCase()}`, kind: 'rank', src: `rank:${r.n}`, bands: BAND_IDS, topics: [`rank:${r.n}`],
    title: `The ${r.n} rank`, body: r.why, more: `Reached at ${r.xp} right answers — right answers are the only thing that moves a rank.`, route: '#/me', cta: 'My page', key: `rank:${i}` }));
  for (const r of RIVALS) agnostic.push({ id: `rival-${r.id}`, kind: 'rival', src: `rival:${r.id}`, bands: BAND_IDS, topics: ['game:contest'],
    title: `${r.name}, ${r.age} — one of your ten rivals`, body: `${r.note} Watch for it: ${r.tell}.`, art: `avatars/${r.id}.webp`, route: '#/contest', cta: 'Mock contest' });
  for (const t of SHELF) agnostic.push({ id: `tool-${t.id}`, kind: 'tool', src: `shelf:${t.id}`, bands: BAND_IDS, topics: [`tool:${t.id}`],
    title: t.name, body: t.blurb, art: `art/${t.art}.webp`, route: t.kind === 'nav' ? `#/${t.nav}` : `#/lib/${t.id}`, cta: 'Open it' });
  for (const g of HEROES) agnostic.push({ id: `game-${g.id}`, kind: 'game', src: `arcade:${g.id}`, bands: BAND_IDS, topics: [`game:${g.id}`], title: g.title, body: g.blurb, route: g.route, cta: 'Play' });
  for (const g of GAMES) agnostic.push({ id: `game-${g.id}`, kind: 'game', src: `arcade:${g.id}`, bands: BAND_IDS, topics: [`game:${g.id}`], title: g.title, body: g.blurb, more: `Keys: ${g.keys}`, art: `art/g-${g.id}.webp`, route: `#/play/${g.id}`, cta: `Play ${g.title}` });
  for (const f of FAMILIES) agnostic.push({ id: `puzzle-${f.id}`, kind: 'puzzle', src: `puzzles:${f.id}`, bands: BAND_IDS, topics: ['puzzles', `puzzle:${f.id}`], title: f.name, body: f.blurb, route: `#/puzzles/${f.id}`, cta: `Six ${f.name} puzzles` });
  const seenP = new Set();
  for (const lv of [1, 2, 3]) for (let i = 0, n = 0; n < 40 && i < 400; i++) { const c = patternCard(lv, i, seenP); if (c) { agnostic.push(c); n++; } }
  for (const lv of [1, 2, 3]) for (let i = 0, n = 0; n < 10 && i < 300; i++) { const c = magicCard(lv, i); if (c) { agnostic.push(c); n++; } }
  for (const c of agnostic) add(c);
  /* MORE (owner, 10 Oct 2026: "look for additional content and double the feed cards"): tools/feed-more.mjs, after
     everything above, so every card above is cut exactly as before and a new card that says the same thing is the one dropped */
  for (const c of cutMore(items)) add(c);
  const drop = new Set(nearDups(items, true).map(([, b]) => b));
  return showSlots(items.filter((c) => !drop.has(c.id)));
}

/* a Puzzle Room pattern, as the room makes it (seeded), with the slips a child makes as its wrong options */
export function patternCard(lv, i, seenP = new Set()) {
  const q = patternQuestion(lv, seeded(`feed:pattern:${lv}:${i}`));
  if (seenP.has(q.text)) return null; seenP.add(q.text);
  /* the slips: carry on by the last gap as if it were adding, one term too far, the first gap again, then near misses */
  const t = q.text.replace(', …', '').split(', ').map(Number);
  const cands = [...[2 * t[4] - t[3], q.ans + (q.ans - t[4]), t[4] + (t[1] - t[0])].map((v) => ({ s: String(v), tier: 0 })), ...nearMisses(q.ans, 1).map((v) => ({ s: String(v), tier: 2 }))];
  const w = pick(q.ans, cands, 2, `pattern:${lv}:${i}`, { check: (c) => !t.includes(+c) }); if (!w) return null;
  const opts = [String(q.ans), ...w];
  return { id: `pattern-${lv}-${i}`, kind: 'pattern', src: `pattern:${lv}:${i}`, bands: bandsFrom(BAND_IDS[lv - 1]), topics: ['puzzles', 'puzzle:patterns'],
    title: 'What comes next?', route: '#/puzzles/patterns', cta: 'More pattern puzzles', play: { q: q.text, opts, after: q.explain } };
}
/* a magic square, proved solvable as the room proves it, written as its three rows */
export function magicCard(lv, i) {
  const q = magicQuestion(lv, seeded(`feed:magic:${lv}:${i}`)); if (!magicSolvable(q)) return null;
  const rows = [0, 3, 6].map((j) => q.grid.slice(j, j + 3).map((v, x) => (j + x === q.blanks[0] ? '?' : q.blanks.includes(j + x) ? '·' : v)).join('  ')).join('  /  ');
  if (leaks(rows + q.text, q.ans)) return null;
  /* the slips: the number for another blank (the wrong square), one step of the square's own spacing out, then near misses */
  const step = lv === 3 ? Math.min(...q.grid.map((v, x) => Math.abs(v - q.grid[(x + 1) % 9])).filter((v) => v > 0)) : 1;
  const w = pick(q.ans, [...q.blanks.slice(1).map((x) => ({ s: String(q.grid[x]), tier: 0 })), ...[q.ans + step, q.ans - step, q.ans + 2 * step, q.ans - 2 * step].map((v) => ({ s: String(v), tier: 1 })),
    ...nearMisses(q.ans, 1).map((v) => ({ s: String(v), tier: 2 }))], 2, `magic:${lv}:${i}`); if (!w) return null;
  return { id: `magic-${lv}-${i}`, kind: 'magic', src: `magic:${lv}:${i}`, bands: bandsFrom(BAND_IDS[lv - 1]), topics: ['puzzles', 'puzzle:logic'],
    title: 'A magic square', body: rows, route: '#/puzzles/logic', cta: 'More logic puzzles', play: { q: q.text, opts: [String(q.ans), ...w], after: q.explain } };
}

/* WHERE the right option is shown (audit v4, V7): the family's card writes the options in an order
   taken from the card id, and ids that look alike (fact-times-7-8, fact-times-7-9) skewed the
   right one towards the first slot. So each kind's question cards are ordered by a hash of their
   id and dealt the slots in turn — every slot within one card of every other, per kind and per
   number of options — and the rest of each card's options shuffled from its id. feed.js
   showOpts() lays the buttons out in this order; test/feed.mjs reads the slot off the card as
   rendered. */
export function showSlots(items) {
  const groups = {};
  for (const c of items) if (c.play) (groups[`${c.kind}/${c.play.opts.length}`] ||= []).push(c);
  for (const g of Object.values(groups)) {
    g.sort((a, b) => hash(`slot:${a.id}`) - hash(`slot:${b.id}`) || (a.id < b.id ? -1 : 1));
    g.forEach((c, i) => {
      const n = c.play.opts.length, r = seeded(`show:${c.id}`), rest = [...Array(n).keys()].slice(1);
      for (let j = rest.length - 1; j > 0; j--) { const x = Math.floor(r() * (j + 1)); [rest[j], rest[x]] = [rest[x], rest[j]]; }
      rest.splice(i % n, 0, 0);
      c.play = { ...c.play, show: rest };
    });
  }
  return items;
}

/* Pairs of cards whose words are ≥ 80% the same (Jaccard), found by prefix filtering: rare
   words first, and two sets that alike must share a word among each one's rarest few.
   dropping=true: a card found alike is not kept, so it is never compared again (the cut). */
export function nearDups(items, dropping = false) {
  const sets = items.map((c) => [...words(textOf(c))]), freq = new Map();
  for (const s of sets) for (const w of s) freq.set(w, (freq.get(w) || 0) + 1);
  const ord = sets.map((s) => s.sort((a, b) => freq.get(a) - freq.get(b) || (a < b ? -1 : 1)));
  const index = new Map(), out = [], full = sets.map((s) => new Set(s));
  ord.forEach((s, i) => {
    if (!s.length) return;
    const p = s.length - Math.ceil(NEAR * s.length) + 1, cand = new Set();
    for (const w of s.slice(0, p)) for (const j of index.get(w) || []) cand.add(j);
    let dup = false;
    for (const j of cand) if (similar(full[i], full[j]) >= NEAR) { out.push([items[j].id, items[i].id]); dup = true; if (dropping) break; }
    if (dup && dropping) return;
    for (const w of s.slice(0, p)) { if (!index.has(w)) index.set(w, []); index.get(w).push(i); }
  });
  return out;
}

export function manifest(items) {
  const byKind = {}, byLevel = {}; let agnostic = 0;
  for (const c of items) { byKind[c.kind] = (byKind[c.kind] || 0) + 1; if (c.level == null) agnostic++; else byLevel[c.level] = (byLevel[c.level] || 0) + 1; }
  return { total: items.length, agnostic, byLevel, byKind };
}

/* what the ranking needs, without a word of the card: the first load of #/feed */
export const indexOf = (c) => {
  const x = { id: c.id, kind: c.kind, bands: c.bands, topics: c.topics };
  if (c.level != null) x.level = c.level;
  if (c.key) x.key = c.key;
  if (c.play) x.play = 1;
  if (c.stone) x.stone = c.stone;
  return x;
};

/* The index is the first thing #/feed downloads, and ten thousand cards repeat a few hundred sets
   of topics and bands. So it is written as tables and rows, and the module unpacks itself into
   exactly the objects indexOf() made: [id, kind, bands, topics, level, key, play, stone] by number. */
export function packIndex(rows) {
  const tab = (f) => { const all = [], at = new Map(); return { all, of: (v) => { const k = JSON.stringify(v); if (!at.has(k)) { at.set(k, all.length); all.push(v); } return at.get(k); } }; };
  const K = tab(), B = tab(), T = tab();
  const packed = rows.map((x) => [x.id, K.of(x.kind), B.of(x.bands), T.of(x.topics), x.level ?? null, x.key ?? null, x.play ? 1 : 0, x.stone ?? null]);
  return `const K = ${JSON.stringify(K.all)}, B = ${JSON.stringify(B.all)}, T = ${JSON.stringify(T.all)};
const ROWS = ${JSON.stringify(packed)};
export const INDEX = ROWS.map(([id, k, b, t, level, key, play, stone]) => {
  const x = { id, kind: K[k], bands: B[b], topics: T[t] };
  if (level != null) x.level = level;
  if (key != null) x.key = key;
  if (play) x.play = 1;
  if (stone != null) x.stone = stone;
  return x;
});
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = cut(), m = manifest(items);
  const dir = new URL('../app/src/feed/', import.meta.url);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const head = (what) => `/* ${what} — GENERATED by tools/build-feed.mjs from the corpus. Never edit by hand; rerun it. */\n`;
  writeFileSync(new URL('index.js', dir), `${head(`feed/index.js: the ${m.total} cards' ranking fields, no words (${m.total - m.agnostic} on the ten levels, ${m.agnostic} level-agnostic)`)}${packIndex(items.map(indexOf))}`);
  for (const g of GROUPS) {
    const body = Object.fromEntries(items.filter((c) => groupOf(c) === g).map((c) => { const { bands, topics, key, stone, ...rest } = c; void bands; void topics; void key; void stone; return [c.id, rest]; }));
    writeFileSync(new URL(`g-${g}.js`, dir), `${head(`feed/g-${g}.js: the words of ${Object.keys(body).length} cards`)}export const BODY = ${JSON.stringify(body)};\n`);
  }
  writeFileSync(new URL('./feed-manifest.json', import.meta.url), JSON.stringify(m, null, 1) + '\n');
  console.log(JSON.stringify(m));
}
