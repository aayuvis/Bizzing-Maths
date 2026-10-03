/* test/young.mjs — what a 6–8-year-old hears, asked of the app itself, for
   test/voice.mjs. The questions are drawn from the very generators a child of
   6–8 meets (every stop on journey levels 1–3, at every drill level, plus the
   whole facts bank); the fixed lines are read from the modules that put them on
   screen (lines.js, stories, stop hooks, journey test gates). Nothing here is a
   hand-copied list. (It began as the recording list; read-aloud is now the
   device voice, and this is what keeps its WORDS honest.) */

import { LEVELS } from '../src/levels.js';
import { byId, drill } from '../src/tricks.js';
import { BANK, text as factText, answer as factAnswer } from '../src/facts.js';
import { STORIES } from '../src/story-data.js';
import { testBlurb } from '../src/journey.js';
import { spoken } from '../src/views.js';
import { GUIDE, guideSay, FEEDBACK } from '../src/lines.js';
import { normalise, keyOf, lineText, denominator, NUMBER_WORDS } from '../src/voice-text.js';
import { seeded } from '../src/rand.js';

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
