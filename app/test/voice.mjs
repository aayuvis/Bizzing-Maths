/* test/voice.mjs — read-aloud, held to what a child would notice.

   Read-aloud is the device's own voice (the owner's choice: no recordings to
   ship or keep). What this checks is the WORDS it is given:
   1. maths is said the way a child is taught it — fractions as fractions,
      symbols as words, numbers in full;
   2. every question a 6–8-year-old can be asked on journey levels 1–3 (a fresh
      sample from the generators, plus the whole facts bank), the reply to a
      wrong answer, and every fixed line (guide, hooks, stories, test gates)
      turns into words with no maths symbol left for a voice to stumble
      on — proved by breaking it: with "times" left as × it must fail;
   3. speak() hands those words to the device voice, and says nothing when muted. */
import { normalise, numPieces, NUMBER_WORDS } from '../src/voice-text.js';
import { youngQuestions, youngLines, askSay, feedbackParts } from './young.mjs';

let fails = 0;
const fail = (m) => { fails++; if (fails <= 25) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) fail(m); };

/* ---- 1. the words ---- */
ok(NUMBER_WORDS.length === 101 && NUMBER_WORDS[47] === 'forty-seven' && NUMBER_WORDS[100] === 'one hundred', 'number words 0–100');
ok(numPieces(347).join(' ') === 'three hundred and forty-seven', '347');
ok(numPieces(2548).join(' ') === 'two thousand five hundred and forty-eight', '2548');
ok(numPieces(1005).join(' ') === 'one thousand and five', '1005');
ok(normalise('1/4 = ?/16').words === 'one quarter equals how many sixteenths', 'fractions are said as fractions');
ok(normalise('7 × 8').words === 'seven times eight', 'symbols are said as words');
ok(normalise('11:30').words === 'eleven thirty' && normalise('6:00').words === "six o'clock", 'clock times');
ok(normalise('a sign ¤ here') === null, 'a symbol with no word is reported, never skipped silently');

/* ---- 2. everything a young child hears is speakable ---- */
const LEFT = /[×÷=+−*/^√%<>≤≥]/;   // a device voice reads digits well and maths symbols badly ("slash", or nothing)
const clean = (w) => w != null && !w.split(/\s+/).map((t) => t.replace(/^["'(“‘]+|[.,!?;:"')”’…]+$/g, '')).some((t) => LEFT.test(t.replace(/^[a-z]+(-[a-z]+)+$/i, '')));
function unspeakable(words = (t) => { const n = normalise(t); return n ? n.words : t; }) {
  const bad = [];
  const qs = youngQuestions(40, process.env.VOICE_SEED === 'random' ? 'voice-test:' + Date.now() : 'voice-test');
  for (const q of qs) {
    if (!clean(words(askSay(q)))) bad.push(`${q.from}: "${askSay(q)}" → "${words(askSay(q))}"`);
    if (q.ans != null) { const f = feedbackParts(q).map(words); if (!f.every(clean)) bad.push(`${q.from} reply: "${feedbackParts(q).join(' ')}"`); }
  }
  for (const l of youngLines()) if (!clean(words(l.text))) bad.push(`line (${l.from}): "${l.text}"`);
  return { bad, n: qs.length };
}
const cov = unspeakable();
for (const b of cov.bad.slice(0, 15)) fail('not speakable as words — ' + b);
if (cov.bad.length > 15) fail(`…and ${cov.bad.length - 15} more`);
// proof by breaking: a tokeniser that forgets the word for 7 must be caught
const brk = unspeakable((t) => { const n = normalise(t); return n ? n.words.replace(/\btimes\b/g, '×') : t; });
ok(brk.bad.length > 0, 'the check fails when "times" is left as ×');

/* ---- 3. speak() uses the device voice, and is silent when muted ---- */
const said = [];
globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
globalThis.speechSynthesis = { getVoices: () => [{ lang: 'en-IN', name: 'x' }], speak: (u) => said.push(u.text), cancel: () => {} };
const V = await import('../src/voice.js');
ok(V.speak('3/4 + 1/4') && said.at(-1) === 'three quarters plus one quarter', `speak() gives the device voice words (got "${said.at(-1)}")`);
V.setVoiceSound(false); const n0 = said.length;
ok(!V.speak('7 × 8') && said.length === n0, 'muted means silent');

if (fails) { console.error(`voice: ${fails} failure(s)`); process.exit(1); }
console.log(`ok voice — device voice; ${cov.n} young questions, their replies and every fixed line said as words (leaving × unsaid fails ${brk.bad.length})`);
