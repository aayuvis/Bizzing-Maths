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

   NEAR-DUPLICATES are dropped as they are cut (two cards whose words are ≥ 80% the same — the
   later one goes), and the test holds the whole set to it. */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRICKS, byId, worldOf, learnCases, correct, parseNum } from '../app/src/tricks.js';
import { STORIES, evalSum } from '../app/src/stories.js';
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

const BAND_IDS = BANDS.map((b) => b.id);
export const bandsFrom = (b) => BAND_IDS.slice(Math.max(0, BAND_IDS.indexOf(b)));
const NAME = Object.fromEntries(RIVALS.map((r) => [r.id, r.name]));
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
export const GROUPS = [...LEVELS.map((L) => `L${L.n}`), 'any'];
export const groupOf = (c) => (c.level == null ? 'any' : `L${c.level}`);

/* ---------------------------------------------------------------- near-duplicates */
/* words and the maths signs: "3 + 4" and "4 × 3" are not the same card */
export const words = (s) => new Set(String(s || '').toLowerCase().match(/[\p{L}\p{N}]+|[+−×÷²√%<>]/gu) || []);
export const textOf = (c) => c.body || (c.play && c.play.q) || c.title;
export function similar(a, b) { let n = 0; for (const w of a) if (b.has(w)) n++; const u = a.size + b.size - n; return u ? n / u : 1; }
export const NEAR = 0.8;

/* ---------------------------------------------------------------- the roads */
export const WALKS = {};
for (const L of LEVELS) for (const s of L.steps) (WALKS[s.stop] = WALKS[s.stop] || []).push({ level: L.n, lv: s.lv });
const topicsOf = (id) => { const t = byId[id]; return [`stop:${id}`, `world:${t.world}`, `concept:${CONCEPT_OF[id]}`]; };

/* A question a card may ask, with text alone: a prompt that points at a picture is left to its screen. */
export const NEEDS_PICTURE = /\bthis\b|\bthese\b|clock show|shaded|graph shows|Votes for|Each ★|highlighted|marked angle|scatter graph|☐|on the suanpan|goes in the square/i;
export const leaks = (text, ans) => String(ans).length > 1 && plain(text).split(/[^0-9./]/).map((x) => x.replace(/^\.+|\.+$/g, '')).includes(String(ans));
const asQ = (text) => `${text}${/[?.]$/.test(text) ? '' : ' = ?'}`;

/* wrong options from the working itself (a step's value is the classic slip), then near misses */
export function wrongs(q, steps, n = 2) {
  const out = [], seen = new Set();
  const isFrac = typeof q.ans === 'string' && /\//.test(q.ans);
  const want = typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
  const dp = (x) => { const s = String(x); return s.includes('.') ? s.split('.')[1].length : 0; };
  const fmt = (v) => (Number.isInteger(want) ? String(Math.round(v)) : Number(v).toFixed(Math.max(1, dp(want))));
  const cand = [];
  for (const s of steps) if (typeof s.v === 'number' || /^-?[\d.]+(\/\d+)?$/.test(String(s.v))) cand.push(String(s.v));
  if (isFrac) {
    const [a, b] = q.ans.split('/').map(Number);
    cand.push(`${b}/${a}`, `${a + 1}/${b}`, `${a}/${b + 1}`, `${Math.max(1, a - 1)}/${b}`);
  } else {
    const d = Number.isInteger(want) ? 1 : 10 ** -Math.max(1, dp(want));
    for (const v of [want + d, want - d, want + 10 * d, want - 10 * d, want * 2, want + 2 * d]) cand.push(fmt(v));
  }
  for (const c of cand) {
    if (out.length >= n) break;
    const v = parseNum(c);
    if (!Number.isFinite(v) || seen.has(c) || correct(q, c) || (want >= 0 && v < 0) || c === String(q.ans)) continue;
    seen.add(c); out.push(c);
  }
  return out.length === n ? out : null;
}

/* one question from a generator — a stop's, a stone's — seeded, text-only, never leaking */
export function askFrom(t, seedKey, lv) {
  for (let i = 0; i < 40; i++) {
    const q = t.gen(seeded(`${seedKey}#${i}`), lv);
    if (!q || q.text == null || NEEDS_PICTURE.test(q.text) || (!t.echo && leaks(q.text, q.ans))) continue;
    if (q.choices) { const w = q.choices.filter((c) => c !== q.ans).slice(0, 2); if (w.length < 1) continue; return { q, i, opts: [q.ans, ...w] }; }
    const w = wrongs(q, t.work ? t.work(q) : []); if (!w) continue;
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
      title: `Level ${L.n} · ${L.name}`, body: L.blurb, route: '#/atlas', cta: 'See the road' });
    for (const ld of L.lands) {
      const w = worldOf(ld.world);
      add({ id: `land-${ld.id}`, kind: 'land', level: L.n, bands: BAND_IDS, topics: [`world:${ld.world}`, `concept:${ld.concept}`], src: `land:${ld.id}`,
        title: `${ld.name} — in ${w.name}`, body: `${ld.steps.length} stops on this stretch of the road: ${ld.steps.map((x) => byId[x.stop].title).join(' · ')}.`, art: `art/w-${ld.world}.webp`, route: `#/world/${ld.world}`, cta: `Visit ${w.short}` });
    }
  }

  /* each stop's angles, dealt across the roads that walk it */
  for (const t of TRICKS) {
    const walks = (WALKS[t.id] || []).slice().sort((a, b) => a.level - b.level);
    if (!walks.length) continue;
    const bands = bandsFrom(t.band), topics = topicsOf(t.id), route = `#/stop/${t.id}`;
    const A = [];
    A.push({ kind: 'trick', src: `stop:${t.id}#idea`, title: t.title, body: `${t.idea} ${t.why[0]}`, cta: 'Learn the trick', first: true });
    const s = STORIES[t.id];
    if (s) {
      const open = s.beats.find((b) => b.who === null);
      A.push({ kind: 'story', src: `story:${t.id}#open`, badge: { id: 'story', label: 'A story' }, title: s.title,
        body: `${open.say} — with ${s.cast.map((c) => NAME[c]).join(' and ')}.`, art: `art/s-${s.scene}.webp`, cta: 'Read the story', first: true });
    }
    A.push({ kind: 'hook', src: `stop:${t.id}#hook`, title: `Can you? — ${t.title}`, body: t.hook, cta: 'Find out how' });
    learnCases(t).forEach((c, i) => {
      if (c.label && c.note) A.push({ kind: 'idea', src: `stop:${t.id}#case${i}`, title: `${t.title}: ${c.label}`, body: c.note, cta: 'See it worked' });
      if (!t.draw || !NEEDS_PICTURE.test(c.q.text)) A.push({ kind: 'worked', src: `stop:${t.id}#worked${i}`, title: `Worked out — ${t.title}${c.label ? ': ' + c.label : ''}`, body: workedText(t, c.q), cta: 'Watch it step by step' });
    });
    t.why.slice(1).forEach((p, i) => A.push({ kind: 'why', src: `stop:${t.id}#why${i + 1}`, title: `Why “${t.title}” works`, body: p, cta: 'See why' }));
    A.push({ kind: 'algebra', src: `stop:${t.id}#alg`, title: `The algebra behind “${t.title}”`, body: t.alg, cta: 'See why' });
    if (t.sutra) A.push({ kind: 'sutra', src: `stop:${t.id}#sutra`, title: t.sutra.sa, body: `“${t.sutra.en}” — the sutra behind ${t.title}.`, cta: 'Open the stop' });
    if (s) {
      const sums = s.beats.filter((b) => b.add && b.add.v !== undefined);
      const mid = sums[Math.floor((sums.length - 1) / 2)];
      if (mid && sums.length > 1) A.push({ kind: 'moment', src: `story:${t.id}#beat${s.beats.indexOf(mid)}`, badge: { id: 'story', label: 'A story' }, title: `${s.title} — on the notepad`,
        body: `${mid.who ? NAME[mid.who] + ': ' : ''}${mid.say} ${mid.add.t} = ${mid.add.v}`, cta: 'Read the story' });
      const last = s.beats.at(-1);
      if (last.who) A.push({ kind: 'moral', src: `story:${t.id}#beat${s.beats.length - 1}`, badge: { id: 'story', label: 'A story' }, title: `${NAME[last.who]}, in “${s.title}”`, body: last.say, cta: 'Read the story' });
    }
    const deal = walks.map(() => []);
    let r = walks.length > 1 ? 1 : 0;
    for (const f of A) { if (f.first) deal[0].push(f); else { deal[r].push(f); r = (r + 1) % walks.length; } }
    walks.forEach((wk, wi) => {
      for (const f of deal[wi]) {
        const { first, ...card } = f; void first;
        add({ id: `${f.kind}-${t.id}-${f.src.split('#')[1]}`, ...card, level: wk.level, bands, topics, key: `stop:${t.id}`, route });
      }
      const tq = tryQuestion(t.id, wk.level, wk.lv);
      if (tq) add({ id: `try-${t.id}-L${wk.level}`, kind: 'try', level: wk.level, bands, topics, key: `stop:${t.id}`, src: `try:${t.id}@${wk.level}/${wk.lv}#${tq.i}`,
        title: `${t.title} — your turn`, route, cta: 'Practise this stop',
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
  const put = (card, level) => { if (level == null) { delete card.level; agnostic.push(card); } else add({ ...card, level }); };

  for (const e of DICT.ENTRIES) {
    const stops = e.stops.filter((s) => byId[s]), level = place(stops), slug = DICT.norm(e.word).replace(/\s+/g, '-');
    const bands = level == null ? BAND_IDS : bandsFrom(levelBand(level, stops)), topics = stops.length ? stops.flatMap(topicsOf) : ['tool:dictionary'];
    put({ id: `word-${slug}`, kind: 'word', src: `dictionary:${e.word}#def`, title: e.word, body: `${e.def} For example: ${e.ex}`, route: '#/lib/dictionary', cta: 'Open the Dictionary',
      source: e.sources ? e.sources.join(' ') : undefined, bands, topics }, level);
    // which word is this example of? the wrong options come from OTHER topics, so only one can be right
    const others = DICT.ENTRIES.filter((x) => x.topic !== e.topic && !x.see.includes(e.word) && !e.see.includes(x.word));
    const pick = [0, 1].map((j) => others[hash(`${e.word}:${j}`) % others.length]);
    const opts = [e.word, ...new Set(pick.map((x) => x.word))];
    const ex = e.ex.toLowerCase();
    if (opts.length === 3 && !opts.some((o) => ex.includes(o.toLowerCase())) && !e.alias.some((a) => ex.includes(a.toLowerCase())))
      put({ id: `wordq-${slug}`, kind: 'wordq', src: `dictionary:${e.word}#ex`, title: 'Which maths word?', route: '#/lib/dictionary', cta: 'Open the Dictionary', bands, topics,
        play: { q: `Which word is this an example of? “${e.ex}”`, opts, after: `${e.word}: ${e.def}` } }, level);
  }
  for (const c of FORM.CARDS) {
    const stops = c.stops.filter((s) => byId[s]), level = place(stops), bands = bandsFrom(c.band), topics = stops.flatMap(topicsOf), route = '#/lib/formulas', cta = 'Open the Formula Book';
    const ex = c.example, card = { id: `formula-${c.id}`, kind: 'formula', src: `formula:${c.id}`, title: c.title, body: `${c.formula}. ${c.caption}`, route, cta, bands, topics };
    const w = wrongs({ ans: ex.ans }, []);
    if (w && !leaks(`${c.title}: ${ex.q} ${card.body}`, ex.ans)) card.play = { q: `${c.title}: ${ex.q}`, opts: [String(ex.ans), ...w], after: ex.lines.join(' · ') };
    put(card, level);
    c.why.forEach((p, i) => put({ id: `formula-why-${c.id}-${i}`, kind: 'formula-why', src: `formula:${c.id}#why${i}`, title: `Why ${c.formula}`, body: p, route, cta, bands, topics }, place(stops)));
    if (c.story) { const o = c.story.beats.find((b) => b.who === null);
      put({ id: `formula-story-${c.id}`, kind: 'formula-story', src: `formula:${c.id}#story`, badge: { id: 'story', label: 'A story' }, title: c.story.title,
        body: `${o.say} — with ${c.story.cast.map((x) => NAME[x]).join(' and ')}.`, art: `art/s-${c.story.scene}.webp`, route, cta, bands, topics }, place(stops)); }
    for (let i = 0; i < 40; i++) {
      const q = c.gen(seeded(`feed:formula:${c.id}#${i}`)); if (leaks(q.text, q.ans)) continue;
      const w2 = wrongs(q, []); if (!w2) continue;
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
      route: `#/lib/${tool}`, cta: `Walk the ${tool === 'vedic' ? 'Vedic' : 'Chinese'} Maths Journey`,
      bands: stops.length ? bandsFrom(bandOfStops(stops)) : BAND_IDS, topics: [`tool:${tool}`, ...stops.flatMap(topicsOf)], stone: { tool, i, prev: i ? J[i - 1].id : null } };
    const title = `${st.title}${st.sutra ? ` — ${st.sutra.sa}` : ''}`;
    st.cards.forEach((p, j) => put({ ...base, id: `stone-${tool}-${st.id}${j ? '-' + j : ''}`, kind: j ? 'stone-step' : 'stone', src: `${base.src}#${j}`, title: j ? `${st.title} (${j + 1} of ${st.cards.length})` : title, body: p }, at()));
    if (st.gen) {
      const qq = askFrom(st, `feed:${tool}:${st.id}`, 2);
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
    const near = f.op === '×' ? [f.a * (f.b + 1), (f.a + 1) * f.b, f.a * (f.b - 1)] : f.op === '÷' ? [ans + 1, ans - 1, ans + 2] : f.op === '²' ? [f.a * (f.a + 1), f.a * (f.a - 1), ans + 10] : [ans + 1, ans - 1, ans + 10];
    const opts = [String(ans), ...[...new Set(near)].filter((v) => v >= 0 && v !== ans).slice(0, 2).map(String)];
    if (opts.length < 3 || leaks(F.text(f), ans)) continue;
    agnostic.push({ id: `fact-${F.OP_WORD[f.op]}-${f.a}-${f.b}`, kind: 'fact', key: `fact:${F.key(f)}`, src: `fact:${F.key(f)}`, bands: factBands(f), topics: ['facts', `op:${f.op}`],
      title: F.OP_NAME[f.op], route: '#/facts', cta: 'Twenty facts', play: { q: `${F.text(f)} = ?`, opts, after: F.why(f) } });
  }
  RANKS.forEach((r, i) => agnostic.push({ id: `rank-${r.n.toLowerCase()}`, kind: 'rank', src: `rank:${r.n}`, bands: BAND_IDS, topics: [`rank:${r.n}`],
    title: `The ${r.n} rank`, body: r.why, route: '#/me', cta: 'My page', key: `rank:${i}` }));
  for (const r of RIVALS) agnostic.push({ id: `rival-${r.id}`, kind: 'rival', src: `rival:${r.id}`, bands: BAND_IDS, topics: ['game:contest'],
    title: `${r.name}, ${r.age} — one of your ten rivals`, body: `${r.note} Watch for it: ${r.tell}.`, art: `avatars/${r.id}.webp`, route: '#/contest', cta: 'Mock contest' });
  for (const t of SHELF) agnostic.push({ id: `tool-${t.id}`, kind: 'tool', src: `shelf:${t.id}`, bands: BAND_IDS, topics: [`tool:${t.id}`],
    title: t.name, body: t.blurb, art: `art/${t.art}.webp`, route: t.kind === 'nav' ? `#/${t.nav}` : `#/lib/${t.id}`, cta: 'Open it' });
  for (const g of HEROES) agnostic.push({ id: `game-${g.id}`, kind: 'game', src: `arcade:${g.id}`, bands: BAND_IDS, topics: [`game:${g.id}`], title: g.title, body: g.blurb, route: g.route, cta: 'Play' });
  for (const g of GAMES) agnostic.push({ id: `game-${g.id}`, kind: 'game', src: `arcade:${g.id}`, bands: BAND_IDS, topics: [`game:${g.id}`], title: g.title, body: g.blurb, art: `art/g-${g.id}.webp`, route: '#/play', cta: 'Play' });
  for (const f of FAMILIES) agnostic.push({ id: `puzzle-${f.id}`, kind: 'puzzle', src: `puzzles:${f.id}`, bands: BAND_IDS, topics: ['puzzles', `puzzle:${f.id}`], title: f.name, body: f.blurb, route: '#/puzzles', cta: 'Climb the tower' });
  const seenP = new Set();
  for (const lv of [1, 2, 3]) for (let i = 0, n = 0; n < 40 && i < 400; i++) {
    const q = patternQuestion(lv, seeded(`feed:pattern:${lv}:${i}`));
    if (seenP.has(q.text)) continue; seenP.add(q.text);
    const d = q.ans - Number(q.text.split(', ')[4]);
    const opts = [String(q.ans), ...[...new Set([q.ans + 1, q.ans + d + 1, q.ans - 1])].filter((v) => v >= 0 && v !== q.ans).slice(0, 2).map(String)];
    agnostic.push({ id: `pattern-${lv}-${i}`, kind: 'pattern', src: `pattern:${lv}:${i}`, bands: bandsFrom(BAND_IDS[lv - 1]), topics: ['puzzles', 'puzzle:patterns'],
      title: 'What comes next?', route: '#/puzzles', cta: 'More puzzles', play: { q: q.text, opts, after: q.explain } }); n++;
  }
  for (const lv of [1, 2, 3]) for (let i = 0, n = 0; n < 10 && i < 300; i++) {
    const q = magicQuestion(lv, seeded(`feed:magic:${lv}:${i}`)); if (!magicSolvable(q)) continue;
    const rows = [0, 3, 6].map((j) => q.grid.slice(j, j + 3).map((v, x) => (j + x === q.blanks[0] ? '?' : q.blanks.includes(j + x) ? '·' : v)).join('  ')).join('  /  ');
    if (leaks(rows + q.text, q.ans)) continue;
    agnostic.push({ id: `magic-${lv}-${i}`, kind: 'magic', src: `magic:${lv}:${i}`, bands: bandsFrom(BAND_IDS[lv - 1]), topics: ['puzzles', 'puzzle:logic'],
      title: 'A magic square', body: rows, route: '#/puzzles', cta: 'More puzzles', play: { q: q.text, opts: [String(q.ans), String(q.ans + 1), String(q.ans + 2)], after: q.explain } }); n++;
  }
  for (const c of agnostic) add(c);
  const drop = new Set(nearDups(items, true).map(([, b]) => b));
  return items.filter((c) => !drop.has(c.id));
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = cut(), m = manifest(items);
  const dir = new URL('../app/src/feed/', import.meta.url);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const head = (what) => `/* ${what} — GENERATED by tools/build-feed.mjs from the corpus. Never edit by hand; rerun it. */\n`;
  writeFileSync(new URL('index.js', dir), `${head(`feed/index.js: the ${m.total} cards' ranking fields, no words (${m.total - m.agnostic} on the ten levels, ${m.agnostic} level-agnostic)`)}export const INDEX = ${JSON.stringify(items.map(indexOf))};\n`);
  for (const g of GROUPS) {
    const body = Object.fromEntries(items.filter((c) => groupOf(c) === g).map((c) => { const { bands, topics, key, stone, ...rest } = c; void bands; void topics; void key; void stone; return [c.id, rest]; }));
    writeFileSync(new URL(`g-${g}.js`, dir), `${head(`feed/g-${g}.js: the words of ${Object.keys(body).length} cards`)}export const BODY = ${JSON.stringify(body)};\n`);
  }
  writeFileSync(new URL('./feed-manifest.json', import.meta.url), JSON.stringify(m, null, 1) + '\n');
  console.log(JSON.stringify(m));
}
