/* tools/voice/clips.mjs — the list of clips to record, asked of the app itself.

   node tools/voice/clips.mjs            → JSON [{ k, text, kind, from }] on stdout
   import { clipList, youngQuestions }   → the same, for test/voice.mjs

   Nothing here is a hand-copied list. The questions are drawn from the very
   generators a child of 6–8 meets (every stop on journey levels 1–3, at every
   drill level, plus the whole facts bank), and run through the same tokeniser
   the player uses (app/src/voice-text.js), so the pieces recorded are exactly
   the pieces the player will ask for. The fixed lines are read from the modules
   that put them on screen (lines.js, stories, stop hooks, journey test gates).

   A question type that changes its wording changes this list; tts.py records
   what is new and test/voice.mjs fails until it has. */

import { LEVELS } from '../../app/src/levels.js';
import { byId, drill } from '../../app/src/tricks.js';
import { BANK, text as factText, answer as factAnswer } from '../../app/src/facts.js';
import { STORIES } from '../../app/src/stories.js';
import { testBlurb } from '../../app/src/journey.js';
import { spoken } from '../../app/src/views.js';
import { GUIDE, guideSay, FEEDBACK } from '../../app/src/lines.js';
import { normalise, keyOf, lineText, denominator, NUMBER_WORDS } from '../../app/src/voice-text.js';
import { seeded } from '../../app/src/rand.js';

/* The young road: journey levels 1–3 (maths age 6–8). */
export const YOUNG_LEVELS = LEVELS.slice(0, 3);
export const youngStops = () => [...new Set(YOUNG_LEVELS.flatMap((l) => l.steps.map((s) => s.stop)))];

/* Everything the runner says for one question: the question as main.js ask()
   says it, then the wrong-answer reply as parts (main.js speakFeedback). */
export const askSay = (q) => q.say || spoken(q.text);
export const feedbackParts = (q, late = false) => [late ? FEEDBACK.late : FEEDBACK.wrong, FEEDBACK.itIs, String(q.ans)];

/* Questions a 6–8-year-old can be asked: every young stop at drill levels 1–3
   (tests draw a stop one level up, so all three), and every fact in the bank. */
export function youngQuestions(perStep = 120, seed = 'voice') {
  const r = seeded(seed), out = [];
  for (const id of youngStops()) for (const lv of [1, 2, 3]) out.push(...drill(byId[id], perStep, lv, r).map((q) => ({ ...q, from: `${id}@${lv}` })));
  for (const f of Object.values(BANK).flat()) { const t = factText(f); out.push({ text: t, say: spoken(t), ans: factAnswer(f), from: 'facts' }); }
  return out;
}

/* Fixed lines a young child meets, recorded whole. */
export function youngLines() {
  const L = [];
  for (const k of Object.keys(GUIDE)) if (k !== 'bandHi' && k !== 'bandAsk') L.push({ text: guideSay(k), from: `guide:${k}` });
  L.push({ text: guideSay('band'), from: 'guide:band' });
  for (const id of youngStops()) {
    L.push({ text: byId[id].hook, from: `hook:${id}` });
    for (const [i, b] of ((STORIES[id] && STORIES[id].beats) || []).entries()) L.push({ text: b.say, from: `story:${id}:${i}` });
  }
  for (const lv of YOUNG_LEVELS) L.push({ text: testBlurb(true, lv.n), from: `test:level${lv.n}` });
  L.push({ text: testBlurb(false), from: 'test:land' });
  return L;
}

/* The base vocabulary: whatever voice-text.js composes numbers, times and
   fractions from. Asked of the tokeniser rather than listed. */
function baseVocab() {
  const probe = ['999999', '2,548', '0.5', '−4', '11:00', '2:05', '1/2', '2/3', '3/4', '4/5', '5/6', '6/7', '7/8', '8/9', '9/10', '10/11', '11/12',
    '1/3', '1/4', '1/5', '1/6', '1/7', '1/8', '1/9', '1/10', '1/11', '1/12', '1/20', '?/4', 'MDCLXVI'];
  const out = new Set(NUMBER_WORDS);
  for (const p of probe) for (const x of normalise(p).pieces) if (x.k) out.add(x.k);
  // every bottom a young drill can reach: "how many ninetieths" is a long tail no
  // sample is sure to hit, so the whole set to a hundred is recorded
  for (let d = 2; d <= 100; d++) { out.add(denominator(d, true).at(-1)); if (d <= 20) out.add(denominator(d, false).at(-1)); }
  return [...out];
}

export function clipList({ perStep = 500 } = {}) {
  const clips = new Map(), problems = [];
  // `say` is what the player looks the clip up by; `text` is what the narrator reads.
  // A bare capital letter ("X") comes back from the synthesiser as 200 OK and
  // silence; "X." is read. So a Roman numeral's letters are sent with a stop.
  const add = (say, kind, from, text = /^[IVXLCDM]$/.test(say) ? say + '.' : say) => {
    const k = keyOf(say), had = clips.get(k);
    if (had && had.say.toLowerCase() !== say.toLowerCase()) problems.push(`key collision ${k}: "${had.say}" / "${say}"`);
    if (!had) clips.set(k, { k, say, text, kind, from });
  };
  for (const w of baseVocab()) add(w, 'number', 'voice-text');
  const pieces = (t, from) => {
    const n = normalise(t);
    if (!n) { problems.push(`cannot say (${from}): ${t}`); return; }
    if (n.pieces.length === 1 && !n.pieces[0].num) return add(n.pieces[0].k, 'piece', from);
    for (const p of n.pieces) if (p.k && !p.num) add(p.k, 'piece', from);
    for (const p of n.pieces) if (p.k && p.num) add(p.k, 'number', from);
  };
  for (const q of youngQuestions(perStep)) {
    pieces(askSay(q), q.from);
    if (q.ans != null) for (const part of feedbackParts(q)) pieces(part, q.from);
  }
  for (const part of feedbackParts({ ans: 0 }, true)) pieces(part, 'feedback');
  for (const l of youngLines()) {
    const n = normalise(l.text);
    if (!n) { problems.push(`cannot say (${l.from}): ${l.text}`); continue; }
    add(n.words, 'line', l.from, lineText(l.text));
  }
  return { clips: [...clips.values()], problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { clips, problems } = clipList();
  for (const p of problems) console.error('!!', p);
  process.stdout.write(JSON.stringify(clips));
}
