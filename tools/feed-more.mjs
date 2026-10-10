/* tools/feed-more.mjs — the second cut of My Feed (owner, 10 Oct 2026: "look for additional content and
   double the feed cards"). Called by tools/build-feed.mjs AFTER its own cut, so every card that cut makes
   is made exactly as before; a card here that says what an earlier one says is the one dropped.

   The same rules as the first cut (rule 26): nothing is typed for the feed. Every card names the object
   it came from (`src`, resolved by app/test/lib/feed-more.mjs), its words are that object's words, its
   question is re-run through the app's own rules, and its link opens the very thing it is about.

     paper      a contest-style problem from the Contest Hall's banks (papers/bank-*.js), FRESHLY made
                from its template under a feed seed — never one of a fixed paper's problems — proved by
                the template's own solve() to have exactly the stated answer; the way in is its strategy
                stop, which the card names and links to (docs/PAPER-CONTRACT.md: "contest-style", always)
     machine    Beat the Machine's question: which trick card fits this sum — or "Straight: no trick
                fits" for a decoy built to tempt one card and proved to fit none (machine.js); the words
                after are the game's own explain()
     try        more of a stop's own questions at each road's difficulty (its gen, the next seeds)
     moment     every other notepad sum of a story that the story test checks
     missing    a fact with a gap, the Beat the Timer form ? × 8 = 56 (facts-timed.js missingQ)
     timer      Beat the Timer's own question forms for a theme: number bonds, skip counting, doubles
                and halves, two-step (facts-timed.js), linked to that theme
     explorer   which of three numbers divides n exactly — decided by the Number Explorer's own
                divisibility tests (explorer.js tests()), each with its one-line reason
     medal      what evidence earns each medal (medals.js), linked to the Medals tab
     formula-try / stone-try   more questions from a formula's or a stone's own gen

   Looked at and NOT cut, with the reason (the report says so too): the avatar cards' lore (it is
   collecting, not learning — the engine ranks on learning signals); Cube Builder and the cube nets
   (their questions are pictures — a text card would be a different, unproved question); sudoku (a
   grid, not a line of text); the Sutra Ladder, the Counting Court and the journey stones' history
   (already cut: they are stops and stones the first cut walks). */
import { byId, worldOf, correct, parseNum } from '../app/src/tricks.js';
import { STORIES } from '../app/src/story-data.js';
import { evalSum } from '../app/src/stories.js';
import { RIVALS } from '../app/src/contest.js';
import { BANDS as KID_BANDS } from '../app/src/model.js';
import * as F from '../app/src/facts.js';
import * as FT from '../app/src/facts-timed.js';
import { seeded, shuffle } from '../app/src/rand.js';
import { ALL as TEMPLATES, paper } from '../app/src/papers/engine.js';
import { BANDS as PAPER_BANDS, BAND_IDS as PAPER_BAND_IDS, FIXED } from '../app/src/papers/bands.js';
import * as M from '../app/src/machine.js';
import { HEROES } from '../app/src/arcade.js';
import * as TT from '../app/src/timer-themes.js';
import * as EX from '../app/src/library/explorer.js';
import * as FORM from '../app/src/library/formulas.js';
import * as VED from '../app/src/library/vedic.js';
import * as CHI from '../app/src/library/chinese.js';
import { MEDALS } from '../app/src/medals.js';
import { LEVELS } from '../app/src/levels.js';
import { SECRET_KINDS } from '../app/src/journey.js';
import { STRANDS } from '../app/src/objectives.js';
import { WALKS, bandsFrom, topicsOf, askFrom, asQ, pick, wrongs, nearMisses, numberSlips, leaks, NEEDS_PICTURE, workedText, patternCard, magicCard } from './build-feed.mjs';
import { scalesQuestion, solveScales } from '../app/src/puzzles.js';
import * as DICT from '../app/src/library/dictionary.js';
import { hash } from '../app/src/integration/bizzing-feed.js';

const BAND_IDS = KID_BANDS.map((b) => b.id);
const NAME = Object.fromEntries(RIVALS.map((r) => [r.id, r.name]));
export const older = (a, b) => BAND_IDS[Math.max(BAND_IDS.indexOf(a), BAND_IDS.indexOf(b))];
const walksOf = (id) => (WALKS[id] || []).slice().sort((a, b) => a.level - b.level);
const stopWhere = (t, level) => `${worldOf(t.world).name} · Level ${level}`;

/* ---------------------------------------------------------------- how many of each */
export const MORE = { tryPerWalk: 6, workedPerWalk: 4, paperPerBand: 20, paperWay: 1, machineTricks: 8, machineDecoys: 5, explorerPerWalk: 16, formulaTry: 5, stoneTry: 5, twoStep: 2,
  patterns: 100, magic: 25, balance: 25 };

/* ---------------------------------------------------------------- the Contest Hall */
/* a problem the feed may show with words alone: its picture is never needed */
export const PAPER_PICTURE = /picture|as shown|are shown|marked \?|in the figure|diagram|this net|the grid below|shaded/i;
/* the age a paper band is for (papers/bands.js: g12 ages 6–8, g34 8–10, g56 10–12, g78 12–14) */
export const PAPER_AGE = { g12: '6-7', g34: '8-10', g56: '11-14', g78: '11-14' };
export const paperSeed = (tid, band, i) => `feed:paper:${tid}/${band}#${i}`;
/* every problem of every FIXED paper (1–60 in each band): the feed never shows one of them */
let FIXED_TEXTS = null;
export function fixedTexts() {
  if (FIXED_TEXTS) return FIXED_TEXTS;
  FIXED_TEXTS = new Set();
  for (const b of PAPER_BAND_IDS) for (let no = 1; no <= FIXED; no++) for (const it of paper(b, no).items) FIXED_TEXTS.add(it.text);
  return FIXED_TEXTS;
}
const sameVal = (a, b) => String(a) === String(b) || (Number.isFinite(parseNum(String(a))) && Math.abs(parseNum(String(a)) - parseNum(String(b))) < 1e-9);
/* solve() is the template's own, independent proof: exactly one answer, and it is the stated one */
export const proved = (t, q) => { const s = t.solve(q.params); return Array.isArray(s) && s.length === 1 && sameVal(s[0], q.ans); };
export const paperOk = (t, q) => q && !q.fig && !PAPER_PICTURE.test(q.text) && !NEEDS_PICTURE.test(q.text) && !leaks(q.text, q.ans) && proved(t, q) && !fixedTexts().has(q.text);
/* two wrong options from the template's own wrong answers (real mistakes), then — for a whole-number
   answer, which solve() proved is the ONLY one — near misses, as the paper engine does */
export function paperOpts(t, q, key) {
  const ans = String(q.ans), want = parseNum(ans), proof = t.solve(q.params).map(String);
  const notRight = (c) => !proof.includes(String(c)) && !sameVal(c, ans);
  const ws = [...new Set((q.wrong || []).map(String))].filter(notRight);
  if (Number.isFinite(want) && ws.every((w) => Number.isFinite(parseNum(w)))) {
    const cands = [...ws.map((s) => ({ s, tier: 0 })), ...(/^\d+$/.test(ans) ? nearMisses(want, 1).map((v) => ({ s: String(v), tier: 2 })) : [])];
    const w = pick(ans, cands, 2, key, { check: notRight });
    return w && w.length === 2 ? [ans, ...w] : null;
  }
  const w = shuffle(ws.slice(), seeded(`wrong:${key}`)).slice(0, 2);
  return w.length === 2 ? [ans, ...w] : null;
}
function papers() {
  const out = [];
  for (const t of TEMPLATES) {
    const st = byId[t.strategy], walks = walksOf(t.strategy);
    if (!st || !walks.length) continue;
    for (const band of t.bands) {
      const wk = PAPER_AGE[band] === '11-14' ? walks.at(-1) : walks[0];
      const seen = new Set();
      for (let i = 0, n = 0; n < MORE.paperPerBand && i < 60; i++) {
        const q = t.make(seeded(paperSeed(t.id, band, i)), band);
        if (!paperOk(t, q) || seen.has(q.text)) continue;
        const key = `paper:${t.id}/${band}#${i}`, opts = paperOpts(t, q, key); if (!opts) continue;
        seen.add(q.text); n++;
        out.push({ id: `paper-${t.id}-${band}-${i}`, kind: 'paper', level: wk.level, bands: bandsFrom(older(st.band, PAPER_AGE[band])), topics: [...topicsOf(st.id), 'hall'], key: `stop:${st.id}`,
          src: key, badge: { id: 'contest', label: 'Contest-style' }, title: `${PAPER_BANDS[band].label} · a ${t.tier}-point question`,
          where: stopWhere(st, wk.level), more: `The way in: ${st.title} — ${st.idea}`, route: `#/stop/${st.id}|learn`, cta: 'Learn the way in',
          play: { q: q.text, opts, after: q.why } });
      }
      // the way in, worked: a further fresh problem with the template's own solution
      for (let i = 100, n = 0; n < MORE.paperWay && i < 160; i++) {
        const q = t.make(seeded(paperSeed(t.id, band, i)), band);
        if (!paperOk(t, q) || seen.has(q.text) || !q.why) continue;
        seen.add(q.text); n++;
        out.push({ id: `paperway-${t.id}-${band}-${i}`, kind: 'paper-way', level: wk.level, bands: bandsFrom(older(st.band, PAPER_AGE[band])), topics: [...topicsOf(st.id), 'hall'], key: `stop:${st.id}`,
          src: `paper:${t.id}/${band}#${i}`, badge: { id: 'contest', label: 'Contest-style' }, title: `The way in: ${st.title}`, body: `${q.text} ${q.why}`,
          where: stopWhere(st, wk.level), more: `The way in: ${st.title} — ${st.idea}`, route: `#/stop/${st.id}|learn`, cta: 'Learn the way in' });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Beat the Machine */
/* the machine level a road's step is like (machine.js genLv runs the other way: 1–2 → 1, 3 → 2, 4 → 3) */
export const machineLv = (lv) => (lv <= 1 ? 1 : lv === 2 ? 3 : 4);
export const machineSeed = (id, level, i) => `feed:machine:${id}@${level}#${i}`;
export const machineQ = (id, level, lv, i, decoy) => (decoy ? M.decoy(id, seeded(machineSeed(id, level, 'd' + i))) : M.trickSum(id, machineLv(lv), seeded(machineSeed(id, level, i))));
/* the right card and two wrong ones: a card whose precondition FAILS, or Straight when a card fits */
export function machineOpts(q, right, key) {
  const r = seeded(`wrong:${key}`), no = shuffle(M.CARD_IDS.filter((id) => !M.holds(id, q)), r);
  const w = right === M.STRAIGHT ? [q.tempt, ...no.filter((id) => id !== q.tempt).slice(0, 1)] : [r() < 0.5 ? M.STRAIGHT : no[1], no[0]];
  return [right, ...w].map(M.cardName);
}
function machine() {
  const out = [], blurb = HEROES.find((h) => h.id === 'machine').blurb;
  for (const id of M.CARD_IDS) {
    const t = byId[id];
    for (const wk of walksOf(id)) {
      const seen = new Set();
      for (const decoy of [false, true]) for (let i = 0; i < (decoy ? MORE.machineDecoys : MORE.machineTricks); i++) {
        const q = machineQ(id, wk.level, wk.lv, i, decoy); if (seen.has(q.text)) continue; seen.add(q.text);
        const right = decoy ? M.STRAIGHT : id, src = `machine:${id}@${wk.level}/${wk.lv}#${decoy ? 'd' : ''}${i}`;
        out.push({ id: `machine-${id}-L${wk.level}-${decoy ? 'd' : ''}${i}`, kind: 'machine', level: wk.level, bands: bandsFrom(t.band), topics: [...topicsOf(id), 'game:machine'], key: `stop:${id}`,
          src, title: 'Beat the Machine', where: `Beat the Machine · Level ${wk.level}`, more: blurb, route: `#/stop/${id}|learn`, cta: decoy ? 'When does that trick work?' : 'Learn the trick',
          play: { q: `Which trick fits ${q.text}?`, opts: machineOpts(q, right, src), after: decoy ? M.explain(id, q, M.CARD_IDS) : M.explain(M.STRAIGHT, q, [id]) } });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- a stop's: more questions, more notepad sums */
function stops(items) {
  const out = [], have = new Set(items.map((c) => c.id));
  for (const c of items.filter((x) => x.kind === 'try')) {
    const [, id, L, lv, i] = /^try:([a-z0-9-]+)@(\d+)\/(\d)#(\d+)$/.exec(c.src), t = byId[id], seen = new Set([c.play.q]);
    let from = +i + 1;
    for (let j = 2; j <= MORE.tryPerWalk; j++) {
      const tq = askFrom(t, `feed:${id}@${L}`, +lv, from); if (!tq) break;
      from = tq.i + 1;
      const q = tq.q.choices ? tq.q.text : asQ(tq.q.text);
      if (seen.has(q)) { j--; if (from > 400) break; continue; }
      seen.add(q);
      out.push({ ...c, id: `${c.id}-${j}`, src: `try:${id}@${L}/${lv}#${tq.i}`, play: { q, opts: tq.opts, after: t.idea } });
    }
  }
  // a fresh question at each road's difficulty, worked by the stop's own work() — never a picture's
  for (const t of Object.values(byId)) for (const wk of walksOf(t.id)) {
    if (!t.work) continue;
    const seen = new Set();
    for (let i = 0, n = 0; n < MORE.workedPerWalk && i < 40; i++) {
      const q = t.gen(seeded(workSeed(t.id, wk.level, i)), wk.lv);
      if (!q || q.text == null || q.choices || NEEDS_PICTURE.test(q.text) || seen.has(q.text) || !workOk(t, q)) continue;
      seen.add(q.text); n++;
      out.push({ id: `worked-${t.id}-L${wk.level}-${i}`, kind: 'worked', src: `work:${t.id}@${wk.level}/${wk.lv}#${i}`, title: `Worked out — ${t.title}`, body: workedText(t, q),
        more: `The method: ${t.idea}`, where: stopWhere(t, wk.level), level: wk.level, bands: bandsFrom(t.band), topics: topicsOf(t.id), key: `stop:${t.id}`, route: `#/stop/${t.id}|learn`, cta: 'Learn the trick' });
    }
  }
  // every notepad sum of a story the first cut did not take, dealt round the roads that walk its stop
  for (const [id, s] of Object.entries(STORIES)) {
    const t = byId[id], walks = walksOf(id); if (!t || !walks.length) continue;
    const beats = s.beats.map((b, i) => ({ b, i })).filter(({ b, i }) => b.add && b.add.v !== undefined && i < s.beats.length - 1 && !have.has(`moment-${id}-beat${i}`) && Math.abs(evalSum(b.add.t) - b.add.v) < 1e-9);
    beats.forEach(({ b, i }, n) => {
      const wk = walks[(n + 1) % walks.length];
      out.push({ id: `moment-${id}-beat${i}`, kind: 'moment', src: `story:${id}#beat${i}`, badge: { id: 'story', label: 'A story' }, title: `${s.title} — on the notepad`,
        body: `${b.who ? NAME[b.who] + ': ' : ''}${b.say} ${b.add.t} = ${b.add.v}`, more: `The trick in the story: ${t.idea}`, where: stopWhere(t, wk.level), level: wk.level,
        bands: bandsFrom(t.band), topics: topicsOf(id), key: `stop:${id}`, route: `#/stop/${id}|story|${i}`, cta: 'Read the story' });
    });
  }
  return out;
}

export const workSeed = (id, level, i) => `feed:work:${id}@${level}#${i}`;
const evalExpr = (e) => Function(`return (${e})`)();
/* three routes agree: the answer, the plain arithmetic and the trick's own last step */
export function workOk(t, q) {
  try { const plain = evalExpr(q.expr), last = t.work(q).at(-1).v, a = typeof q.ans === 'number' ? q.ans : parseNum(q.ans), l = typeof last === 'number' ? last : parseNum(last);
    return Number.isFinite(a) && Math.abs(plain - a) < 1e-9 && Math.abs(l - a) < 1e-9; } catch { return false; }
}

/* ---------------------------------------------------------------- the Number Explorer */
const DIVS = [2, 3, 4, 5, 6, 8, 9, 10, 11];
export const EXPLORER_STOPS = [...new Set(EX.tests(1).map((x) => x.stop))];
export const explorerSeed = (stop, level, i) => `feed:explorer:${stop}@${level}#${i}`;
/* n and three divisors, exactly one of which passes the Explorer's own test — the one the stop teaches */
export function explorerQ(stop, level, lv, i) {
  const r = seeded(explorerSeed(stop, level, i)), digits = lv + 2, want = Math.floor(r() * 3);
  for (let k = 0; k < 200; k++) {
    const n = 10 ** (digits - 1) + Math.floor(r() * 9 * 10 ** (digits - 1));
    const T = EX.tests(n), pass = T.filter((x) => x.pass && x.stop === stop && x.d !== 10 && x.d !== 2);
    if (!pass.length) continue;
    const right = pass[Math.floor(r() * pass.length)], fail = T.filter((x) => !x.pass);
    if (fail.length < 2) continue;
    // the slip the stop guards against first: its own other test, failing (3 passes, 9 does not; 4 passes, 8 does not)
    const own = fail.filter((x) => x.stop === stop), rest = shuffle(fail.filter((x) => x.stop !== stop), r);
    const decoys = [...shuffle(own, r), ...rest];
    const lo = decoys.filter((x) => x.d < right.d), hi = decoys.filter((x) => x.d > right.d);
    // the right one's place among the three is drawn first, and n is drawn again until the decoys allow it
    if (lo.length < want || hi.length < 2 - want) continue;
    const two = [...lo.slice(0, want), ...hi.slice(0, 2 - want)];
    return { n, right, two };
  }
  return null;
}
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const explorerAfter = (n, xs) => xs.map((x) => `÷${x.d}: ${x.pass ? 'Yes' : 'No'} — ${x.why}.`).join(' ');
function explorer() {
  const out = [];
  for (const stop of EXPLORER_STOPS) {
    const t = byId[stop]; if (!t) continue;
    for (const wk of walksOf(stop)) for (let i = 0; i < MORE.explorerPerWalk; i++) {
      const e = explorerQ(stop, wk.level, wk.lv, i); if (!e || leaks(`${group(e.n)} ${t.idea}`, e.right.d)) continue;
      out.push({ id: `explorer-${stop}-L${wk.level}-${i}`, kind: 'explorer', level: wk.level, bands: bandsFrom(t.band), topics: [...topicsOf(stop), 'tool:explorer'], key: `stop:${stop}`,
        src: `explorer:${stop}@${wk.level}/${wk.lv}#${i}`, title: `The Number Explorer · ${group(e.n)}`, where: stopWhere(t, wk.level), more: `The test: ${t.idea}`,
        route: `#/lib/explorer|${e.n}`, cta: `${group(e.n)} in the Number Explorer`,
        play: { q: `Which of these divides ${group(e.n)} exactly?`, opts: [e.right, ...e.two].map((x) => String(x.d)), after: explorerAfter(e.n, [e.right, ...e.two]) } });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- facts: the missing number */
/* a gap is harder than the fact: a fact a little easier than the fact cards' bar still makes a fair one */
export const MISSING_FROM = 0.3;
export const missingOf = (f, side) => FT.missingQ(f, side === 'L');
function factOpts(q, f, key) {
  const ans = q.ans, n = F.answer(f), { a, b } = f;
  const slips = f.op === '×' ? [ans + 1, ans - 1, n - (ans === a ? b : a), n / (ans + 1), n / (ans - 1)] : f.op === '÷' ? [a + b, a - b, n * (b + 1), n * (b - 1)]
    : f.op === '²' ? [ans + 1, ans - 1, n / 2] : f.op === '+' ? [ans + 1, ans - 1, n + (ans === a ? b : a)] : [ans + 1, ans - 1, a + n];
  const cands = [...slips.filter(Number.isInteger).map((v) => ({ s: String(v), tier: 0 })), ...numberSlips(ans, { int: true, dp: 0 }).filter(Number.isInteger).map((v) => ({ s: String(v), tier: 1 })), ...nearMisses(ans, 1).map((v) => ({ s: String(v), tier: 2 }))];
  const w = pick(ans, cands, 2, key, { check: (c) => !correct(q, c) && +c !== ans });
  return w ? [String(ans), ...w] : null;
}
export const FACT_BANDS = (f) => {
  if (f.op === '+' || f.op === '-') return ['6-7', '8-10'];
  if (f.op === '²') return ['8-10', '11-14'];
  const [a, b] = f.op === '÷' ? [f.b, f.a / f.b] : [f.a, f.b];
  return [2, 5, 10].includes(Math.min(a, b)) || [2, 5, 10].includes(Math.max(a, b)) ? BAND_IDS : ['8-10', '11-14'];
};
function missing() {
  const out = [];
  const facts = F.OPS.flatMap((op) => F.BANK[op]).filter((f) => F.tricky(f) > MISSING_FROM).sort((x, y) => F.tricky(y) - F.tricky(x) || F.key(x).localeCompare(F.key(y)));
  // never a gap that any number fills (0 × ? = 0)
  for (const f of facts.filter((x) => !((x.op === '×' || x.op === '÷') && (x.a === 0 || x.b === 0)))) for (const side of f.op === '×' && f.a !== f.b ? ['L', 'R'] : ['L']) {
    const q = missingOf(f, side); if (!q || leaks(q.text, q.ans)) continue;
    const key = `missing:${F.key(f)}|${side}`, opts = factOpts(q, f, key); if (!opts) continue;
    // no key and no fact named on the card: the fact underneath IS the answer (7 × 8 for ? × 8 = 56)
    out.push({ id: `missing-${F.OP_WORD[f.op]}-${f.a}-${f.b}-${side}`, kind: 'missing', src: key, bands: FACT_BANDS(f), topics: ['drill', `op:${f.op}`],   // not 'facts': a medal or "twenty facts" signal names fact cards, and these record no fact
      title: `${TT.CHALLENGES.missing.name} · ${F.OP_NAME[f.op]}`, where: `The facts grid · ${F.OP_NAME[f.op]}`, route: `#/facts/${f.op}|${F.key(f)}`, cta: 'Open the facts grid',
      play: { q: q.text, opts, after: F.why(f) } });
  }
  return out;
}

/* ---------------------------------------------------------------- Beat the Timer */
/* a timed form, rebuilt from its src: 'bond:10:3' · 'skip:5:20' · 'double:14' · 'half:28' · 'twostep:7×8:6:+' */
export function timerQ(form) {
  const [k, x, y, z] = form.split(':');
  if (k === 'bond') return FT.bondQ(+x, +y, true);
  if (k === 'skip') return FT.skipQ(+x, +y, z == null ? 3 : +z);
  if (k === 'double') return FT.doubleQ(+x);
  if (k === 'half') return FT.halfQ(+x);
  if (k === 'twostep') return FT.twoStepQ(F.parseKey(x), +y, z === '+');
  return null;
}
export const pretty = (e) => String(e).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/([+−×÷])/g, ' $1 ').replace(/\s+/g, ' ').trim();
export const timerAfter = (q) => (q.fact ? F.why(q.fact) : `The sum underneath: ${pretty(q.expr)} = ${q.ans}`);
function timerForms() {
  const out = [], th = TT.themeById;
  const add = (theme, form, ch) => out.push({ theme, form, ch });
  for (let p = 1; p <= 9; p++) add('bonds10', `bond:10:${p}`);
  for (let p = 1; p <= 19; p++) if (p !== 10) add('bonds10', `bond:20:${p}`, 'bigger');
  for (let tn = 1; tn <= 9; tn++) for (const o of [0, 4, 7]) add('bonds10', `bond:100:${tn * 10 + o}`, 'bigger');
  for (const step of [2, 5, 10, 3, 4]) for (let k = 0; k <= 15; k += step === 10 ? 1 : 2) add('skip', `skip:${step}:${step * k}`);
  for (const step of [25, 50]) for (let k = 1; k <= 9; k++) add('skip', `skip:${step}:${step * k}`, 'bigger');
  // the Missing numbers challenge on the skip theme: the gap inside the count
  for (const step of [2, 5, 10, 3, 4]) for (let k = 1; k <= 15; k += 2) add('skip', `skip:${step}:${step * k}:${1 + (k % 2 === 1 ? (k >> 1) % 2 : 0)}`, 'missing');
  for (let n = 2; n <= 50; n++) { add('dbl', `double:${n}`, n > 12 ? 'bigger' : null); add('dbl', `half:${2 * n}`, n > 12 ? 'bigger' : null); }
  // two steps in one: a theme that has the challenge, its own operation's trickiest facts, a seeded second number
  for (const id of TT.THEMES.filter((x) => x.kind === 'fact' && x.ch.includes('twostep')).map((x) => x.id)) {
    const op = th[id].ops[0], facts = F.BANK[op].filter((f) => F.tricky(f) > 0.45).sort((x, y) => F.tricky(y) - F.tricky(x) || F.key(x).localeCompare(F.key(y)));
    facts.forEach((f) => {
      for (let j = 0; j < MORE.twoStep; j++) {
        const r = seeded(`feed:timer:${id}:${F.key(f)}#${j}`), c = 2 + Math.floor(r() * 8), plus = F.answer(f) < c || r() < 0.6;
        add(id, `twostep:${F.key(f)}:${c}:${plus ? '+' : '-'}`, 'twostep');
      }
    });
  }
  return out;
}
function timer() {
  const out = [];
  for (const { theme, form, ch } of timerForms()) {
    const th = TT.themeById[theme], q = timerQ(form);
    if (!q || leaks(q.text, q.ans) || !Number.isInteger(q.ans)) continue;
    const key = `timer:${theme}/${form}`, w = wrongs({ text: q.text, ans: q.ans, expr: q.expr }, [], 2, key); if (!w) continue;
    out.push({ id: `timer-${theme}-${form.replace(/[:×÷+−²]/g, (c) => ({ ':': '-', '×': 'x', '÷': 'd', '+': 'p', '−': 'm', '²': 'sq' }[c]))}`, kind: 'timer', src: key,
      bands: bandsFrom(TT.bandOfGrade(th.grade[0])), topics: ['drill', 'game:timer', `timer:${theme}`],
      title: `Beat the Timer · ${th.name}${ch ? ' · ' + TT.CHALLENGES[ch].name : ''}`, where: `Beat the Timer · Grade ${th.grade.join('–')}`, more: ch ? `${TT.CHALLENGES[ch].name}: ${TT.CHALLENGES[ch].line}` : undefined,
      route: `#/timer/${theme}`, cta: 'Play it in Beat the Timer', play: { q: q.text.includes('?') ? q.text : asQ(q.text), opts: [String(q.ans), ...w], after: timerAfter(q) } });
  }
  return out;
}

/* ---------------------------------------------------------------- medals */
function medals() {
  return MEDALS.map((m) => ({ id: `medal-${m.id}`, kind: 'medal', src: `medal:${m.id}`, bands: BAND_IDS, topics: ['medals'], title: `The ${m.name} medal`, body: m.desc,
    more: `When it is yours, it says: “${m.did}”`, where: 'The Collection · Medals', route: '#/collection/medals', cta: 'See the medals' }));
}

/* ---------------------------------------------------------------- more from a formula's and a stone's gen */
function gens(items) {
  const out = [];
  for (const c of items.filter((x) => x.kind === 'formula-try')) {
    const fid = c.src.slice(8).split('#')[0], f = FORM.byId[fid], seen = new Set([c.play.q]);
    let i = +c.src.split('#gen')[1] + 1;
    for (let j = 2; j <= MORE.formulaTry && i < 80; i++) {
      const q = f.gen(seeded(`feed:formula:${fid}#${i}`)); if (leaks(q.text, q.ans) || seen.has(asQ(q.text))) continue;
      const w = wrongs(q, [], 2, `formula:${fid}#${i}`); if (!w) continue;
      seen.add(asQ(q.text));
      out.push({ ...c, id: `${c.id}-${j}`, src: `formula:${fid}#gen${i}`, play: { q: asQ(q.text), opts: [String(q.ans), ...w], after: f.formula } }); j++;
    }
  }
  for (const c of items.filter((x) => x.kind === 'stone-try')) {
    const [tool, sid] = c.src.slice(8).split('#')[0].split('/'), st = (tool === 'vedic' ? VED.JOURNEY : CHI.JOURNEY).find((x) => x.id === sid), seen = new Set([c.play.q]);
    let from = +c.src.split('#gen')[1] + 1;
    for (let j = 2; j <= MORE.stoneTry; j++) {
      const qq = askFrom(st, `feed:${tool}:${st.id}`, 2, from); if (!qq) break;
      from = qq.i + 1;
      const q = qq.q.choices ? qq.q.text : asQ(qq.q.text);
      if (seen.has(q)) { j--; if (from > 200) break; continue; }
      seen.add(q);
      out.push({ ...c, id: `${c.id}-${j}`, src: `journey:${tool}/${st.id}#gen${qq.i}`, play: { q, opts: qq.opts.map(String), after: st.kicker } });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- the Puzzle Room: more of each, and the balance scales */
export const SHAPE_OF = ['▲', '●', '■'];
/* the scales as a line of text: "▲ ▲ ● = 14  ·  ▲ ● ● = 13" (the room draws the same pans) */
export const scalesText = (q) => q.eqs.map((e) => `${e.counts.flatMap((c, j) => Array(c).fill(SHAPE_OF[j])).join(' ')} = ${e.total}`).join('  ·  ');
export const balanceSeed = (lv, i) => `feed:balance:${lv}:${i}`;
function puzzles(items) {
  const out = [], have = new Set(items.map((c) => c.id)), seenP = new Set(items.filter((c) => c.kind === 'pattern').map((c) => c.play.q));
  for (const lv of [1, 2, 3]) {
    let n = items.filter((c) => c.kind === 'pattern' && c.src.startsWith(`pattern:${lv}:`)).length;
    for (let i = 0; n < MORE.patterns && i < 2000; i++) { if (have.has(`pattern-${lv}-${i}`)) continue; const c = patternCard(lv, i, seenP); if (c) { out.push(c); n++; } }
    let m = items.filter((c) => c.kind === 'magic' && c.src.startsWith(`magic:${lv}:`)).length;
    for (let i = 0; m < MORE.magic && i < 1500; i++) { if (have.has(`magic-${lv}-${i}`)) continue; const c = magicCard(lv, i); if (c) { out.push(c); m++; } }
    const seenB = new Set();
    for (let i = 0, b = 0; b < MORE.balance && i < 400; i++) {
      const q = scalesQuestion(lv, seeded(balanceSeed(lv, i))), body = scalesText(q), sols = solveScales(q.eqs, q.eqs[0].counts.length);
      if (seenB.has(body) || sols.length < 1 || new Set(sols.map((x) => x[q.ask])).size !== 1 || leaks(body, q.ans)) continue;
      const w = pick(q.ans, [...sols[0].filter((v, j) => j !== q.ask).map((v) => ({ s: String(v), tier: 0 })), ...nearMisses(q.ans, 1).map((v) => ({ s: String(v), tier: 2 }))], 2, `balance:${lv}:${i}`, { check: (c) => +c !== q.ans });
      if (!w) continue;
      seenB.add(body); b++;
      out.push({ id: `balance-${lv}-${i}`, kind: 'balance', src: `balance:${lv}:${i}`, bands: bandsFrom(BAND_IDS[lv - 1]), topics: ['puzzles', 'puzzle:balance'], title: 'Hidden weights on the scales', body,
        route: '#/puzzles/balance', cta: 'More balance puzzles', play: { q: q.text, opts: [String(q.ans), ...w], after: q.explain } });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- a formula's story, on the notepad */
function formulaBeats(items) {
  const out = [];
  for (const f of FORM.CARDS) {
    if (!f.story) continue;
    const base = items.find((c) => c.id === `formula-${f.id}`); if (!base) continue;
    f.story.beats.forEach((b, i) => {
      if (!b.add || b.add.v === undefined || Math.abs(evalSum(b.add.t) - b.add.v) > 1e-9) return;
      const c = { id: `formula-moment-${f.id}-${i}`, kind: 'formula-moment', src: `formula:${f.id}#beat${i}`, badge: { id: 'story', label: 'A story' }, title: `${f.story.title} — on the notepad`,
        body: `${b.who ? NAME[b.who] + ': ' : ''}${b.say} ${b.add.t} = ${b.add.v}`, more: `The formula: ${f.formula}`, where: base.where, route: base.route, cta: 'Open it in the Formula Book', bands: base.bands, topics: base.topics };
      if (base.level != null) c.level = base.level;
      out.push(c);
    });
  }
  return out;
}

/* ---------------------------------------------------------------- a word's meaning: which one is it? */
export const MEAN_MAX = 110;
export function meaningOpts(e) {
  const others = DICT.ENTRIES.filter((x) => x.topic !== e.topic && x.def.length <= MEAN_MAX && !x.see.includes(e.word) && !e.see.includes(x.word) && x.word !== e.word);
  const picked = [];
  for (let j = 0; picked.length < 2 && j < 12; j++) { const x = others[hash(`mean:${e.word}:${j}`) % others.length]; if (!picked.includes(x)) picked.push(x); }
  return [e, ...picked];
}
function meanings(items) {
  const out = [];
  for (const e of DICT.ENTRIES) {
    if (e.def.length > MEAN_MAX) continue;
    const base = items.find((c) => c.id === `word-${DICT.norm(e.word).replace(/\s+/g, '-')}`); if (!base) continue;
    const xs = meaningOpts(e), low = (s) => s.toLowerCase();
    if (xs.length < 3 || xs.some((x) => low(x.def).includes(low(e.word)) || e.alias.some((a) => low(x.def).includes(low(a))))) continue;
    const c = { id: `wordmean-${DICT.norm(e.word).replace(/\s+/g, '-')}`, kind: 'wordmean', src: `dictionary:${e.word}#mean`, title: 'What does it mean?', route: base.route, cta: 'Look it up', bands: base.bands, topics: base.topics,
      where: base.where, more: base.more, play: { q: `What does “${e.word}” mean?`, opts: xs.map((x) => x.def), after: `For example: ${e.ex}` } };
    if (base.level != null) c.level = base.level;
    out.push(c);
  }
  return out;
}

/* ---------------------------------------------------------------- a land's curious question (journey.js secrets) */
/* "One question a notch harder than this land. Get it right and it tells you why." — a step's own gen,
   one level up (as secretItems asks it), with the stop's idea as its why */
export const curiousSeed = (land, stop, i) => `feed:curious:${land}:${stop}#${i}`;
export const WISP = SECRET_KINDS.find((x) => x.k === 'wisp');
function curious() {
  const out = [];
  for (const L of LEVELS) for (const land of L.lands) for (const s of land.steps) {
    const t = byId[s.stop], lv = Math.min(3, s.lv + 1);
    const tq = askFrom(t, `feed:curious:${land.id}:${s.stop}`, lv); if (!tq) continue;
    out.push({ id: `curious-${land.id}-${s.stop}`, kind: 'curious', level: L.n, bands: bandsFrom(t.band), topics: topicsOf(t.id), key: `stop:${t.id}`,
      src: `curious:${land.id}/${s.stop}@${L.n}/${lv}#${tq.i}`, badge: { id: 'wisp', label: WISP.name }, title: `${land.name} — ${t.title}`, where: `${land.name} · Level ${L.n}`, more: WISP.blurb,
      route: `#/stop/${t.id}|drill`, cta: 'Practise this stop', play: { q: tq.q.choices ? tq.q.text : asQ(tq.q.text), opts: tq.opts, after: t.idea } });
  }
  return out;
}

/* ---------------------------------------------------------------- the goals (objectives.js): "I can…", and how it is measured */
function goals() {
  return STRANDS.flatMap((st) => st.goals.map((g) => ({ id: `goal-${st.id}-${g.id}`, kind: 'goal', src: `goal:${st.id}/${g.id}`, bands: bandsFrom(g.band || BAND_IDS[0]), topics: ['goals', `strand:${st.id}`],
    title: `${st.glyph} ${st.name}`, body: g.can, more: `Measured from what you do: ${g.bar}.`, where: 'My goals', route: '#/goals', cta: 'See my goals' })));
}

/* everything a card SHOWS before it is answered: none of it may carry the answer */
export const shown = (c) => [c.title, c.body, c.play && c.play.q, c.more, c.where, c.cta, c.badge && c.badge.label].filter(Boolean).join(' ');
export const showsAnswer = (c) => !!c.play && leaks(shown(c), c.play.opts[0]);
export function cutMore(items) {
  return [...stops(items), ...papers(), ...machine(), ...explorer(), ...gens(items), ...formulaBeats(items), ...meanings(items), ...puzzles(items), ...curious(), ...goals(), ...medals(), ...missing(), ...timer()].filter((c) => !showsAnswer(c));
}
