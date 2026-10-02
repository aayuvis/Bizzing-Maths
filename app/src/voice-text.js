/* voice-text.js — what a line of the app SOUNDS like, as recorded pieces.

   Pure functions, no DOM: voice.js plays what these return, tools/voice/clips.mjs
   records what these return, and test/voice.mjs holds the two to each other. One
   tokeniser for all three, so a clip can never be recorded for a piece the player
   would not ask for.

   Questions are generated, so most of them cannot be recorded whole. They are
   spoken from PIECES instead: every whole number 0–100 is its own clip, a bigger
   one is built from them ("three", "hundred", "and", "forty-seven"), and the words
   between the numbers are a clip each ("what is the fewest coins you can use?").
   A fixed line — a story beat, a guide's sentence — is recorded whole and played
   whole, because a sentence read in one breath is better than one assembled.

   `normalise()` returns null for anything it cannot say honestly (a symbol it has
   no word for). The caller then hands the line to the device voice instead of
   playing a recording that quietly skips part of it. */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/* 0–100 as one word each: these are the clips every number is built from. */
export function word(n) {
  if (n === 100) return 'one hundred';
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
}
export const NUMBER_WORDS = Array.from({ length: 101 }, (_, n) => word(n));

/* A whole number as clips, British style ("one hundred and twenty-four"). Up to
   999,999,999; anything bigger returns null and goes to the device voice. */
export function numPieces(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999999999) return null;
  if (n <= 100) return [word(n)];
  const out = [], mil = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), rest = n % 1000, h = Math.floor(rest / 100), r = rest % 100;
  if (mil) out.push(...numPieces(mil), 'million');
  if (th) out.push(...numPieces(th), 'thousand');
  if (h) out.push(...(h === 1 ? ['one hundred'] : [word(h), 'hundred']));
  if (r) { if (mil || th || h) out.push('and'); out.push(word(r)); }
  return out;
}

/* The bottom of a fraction, said as a child is taught to say it: a half, three
   quarters, five sixteenths, two one hundred and eighths. As pieces. */
const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
function ordinal(w) {
  const last = w.split(/[- ]/).pop(), head = w.slice(0, w.length - last.length);
  return head + (ORD[last] || (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th'));
}
export function denominator(d, plural) {
  if (d === 2) return [plural ? 'halves' : 'half'];
  if (d === 4) return [plural ? 'quarters' : 'quarter'];
  const ps = Number.isInteger(d) && d >= 3 ? numPieces(d) : null;
  if (!ps) return null;
  return [...ps.slice(0, -1), ordinal(ps.at(-1)) + (plural ? 's' : '')];
}

const UNITS = { kg: 'kilograms', km: 'kilometres', cm: 'centimetres', mm: 'millimetres', ml: 'millilitres', g: 'grams', m: 'metres', l: 'litres' };
const UNIT1 = { kg: 'kilogram', km: 'kilometre', cm: 'centimetre', mm: 'millimetre', ml: 'millilitre', g: 'gram', m: 'metre', l: 'litre' };

/* The maths symbols, as views.js spoken() says them, plus the few a question can
   still carry when it has its own `say`. Applied whatever the caller did first. */
function symbols(t) {
  return String(t)
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ').replace(/\+/g, ' plus ')
    .replace(/(\d)-(?=[A-Za-z])/g, '$1 ')                       // a 1-coin, a 175-minute film
    .replace(/(\d+)\s*°/g, (_, d) => `${d} ${d === '1' ? 'degree' : 'degrees'}`)
    .replace(/(\d+)²/g, '$1 squared').replace(/%/g, ' percent').replace(/=/g, ' equals ').replace(/★/g, ' star ')
    .replace(/(^|\s)<(\s|$)/g, '$1 less than $2').replace(/(^|\s)>(\s|$)/g, '$1 greater than $2')
    // a unit after a number, or after "how many": 5 kg → five kilograms
    .replace(/(\d)\s*(kg|km|cm|mm|ml|g|m|l)\b/g, (_, d, u) => `${d} ${d === '1' ? UNIT1[u] : UNITS[u]}`)
    .replace(/\b(how many|in) (kg|km|cm|mm|ml|g|m|l)\b/gi, (_, h, u) => `${h} ${UNITS[u]}`);
}

const TOKEN = /(\d{1,2}):(\d{2})(?!\d)|(\d+|\?)\/(\d+|\?)|(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?|([A-Za-z][A-Za-z'-]*)|([.?!;:,—–…()])|(["‘’])|(\S)/g;
const GAP = { '(': 70, ')': 70, ',': 70, ';': 120, ':': 120, '—': 120, '–': 120, '…': 150, '.': 180, '?': 180, '!': 180 };
const ROMAN = /^[IVXLCDM]$/, ROMANS = /^[IVXLCDM]{2,}$/;

/* text → { pieces: [{ k: 'text' } | { gap: ms }], words: 'what the device should say' } | null */
export function normalise(text) {
  const s = symbols(text);
  const pieces = [];
  let run = [];
  const flush = (end = '') => {
    if (run.length) pieces.push({ k: run.join(' ') + end });
    run = [];
  };
  const num = (ps) => { flush(); for (const p of ps) pieces.push({ k: p, num: true }); };
  const toks = [...s.matchAll(TOKEN)];
  for (let i = 0; i < toks.length; i++) {
    const m = toks[i];
    if (m[1] !== undefined) {                                   // a clock time
      const h = +m[1], mm = +m[2];
      if (h > 24 || mm > 59) return null;
      num([word(h), ...(mm === 0 ? ["o'clock"] : mm < 10 ? ['oh', word(mm)] : [word(mm)])]);
    } else if (m[3] !== undefined) {                            // a fraction: 3/4 · ?/16 · 6/?
      if (m[3] === '?' && m[4] === '?') return null;
      const d = +m[4], a = m[3] === '?' ? null : +m[3];
      if (m[4] === '?') { const t = numPieces(a); if (!t) return null; num([...t, 'over', 'what']); continue; }
      if (a === null) { const w = denominator(d, true); if (!w) return null; num(['how many', ...w]); continue; }
      const t = numPieces(a), w = denominator(d, a !== 1);
      if (!t || !w) return null;
      num([...t, ...w]);
    } else if (m[5] !== undefined) {                            // a number (2,548 · 0.75)
      const a = numPieces(+m[5].replace(/,/g, '')); if (!a) return null;
      const dec = m[6] !== undefined ? ['point', ...m[6].split('').map((c) => word(+c))] : [];
      num([...a, ...dec]);
    } else if (m[7] !== undefined) {                            // a word
      // X V I I I — a Roman numeral spelled out letter by letter
      const roman = ROMAN.test(m[7]) && [toks[i - 1], toks[i + 1]].some((x) => x && x[7] && ROMAN.test(x[7]));
      if (roman) { num([m[7]]); continue; }
      // XIV as an answer: said as its letters, which is how the question spells it too
      if (ROMANS.test(m[7])) { num(m[7].split('')); continue; }
      run.push(m[7]);
    } else if (m[8] !== undefined) {                            // punctuation: a pause
      const c = m[8];
      // a lone ? in a sum ("2000 + ? + 40") is the unknown, said "what"
      if (c === '?' && (m.index === 0 || /\s/.test(s[m.index - 1])) && i + 1 < toks.length) { run.push('what'); continue; }
      flush('.?!'.includes(c) ? c : '');
      if (pieces.length && pieces.at(-1).gap === undefined) pieces.push({ gap: GAP[c] || 100 });
      else if (pieces.length) pieces.at(-1).gap = Math.max(pieces.at(-1).gap, GAP[c] || 100);
    } else if (m[9] !== undefined) {                            // quotes, brackets: nothing to say
      continue;
    } else return null;                                         // a symbol with no word
  }
  flush();
  while (pieces.length && pieces.at(-1).gap !== undefined) pieces.pop();
  while (pieces.length && pieces[0].gap !== undefined) pieces.shift();
  if (!pieces.length) return null;
  const words = pieces.reduce((acc, p) => {
    if (p.gap !== undefined) return acc.replace(/[^.?!]$/, '$&,');
    return acc ? `${acc} ${p.k}` : p.k;
  }, '');
  // a question that ends on a number still ends on a question mark, for the device voice
  const last = toks.filter((m) => m[8]).at(-1);
  const end = last && toks.at(-1) === last && '.?!'.includes(last[8]) && !/[.?!]$/.test(words) ? last[8] : '';
  return { pieces, words: words + end };
}

/* The one key a recording is filed under: FNV-1a of the lower-cased text. Cheap,
   synchronous, the same in the browser and in node. */
export function keyOf(text) {
  let h = 0x811c9dc5;
  const s = String(text).toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, '0');
}

/* What the narrator is asked to read for a whole line: the line as written,
   which she reads more naturally than our spelled-out words — unless it holds a
   fraction, a time or a maths sign, which a voice may read its own way (an Indian
   English voice can say 1/4 as "one by four"). Then the spelled-out words. */
export function lineText(text) {
  const n = normalise(text);
  if (!n) return null;
  return /\d\s*[/:]\s*\d|[×÷−+=<>²%°★]/.test(text) ? n.words : String(text).replace(/\s+/g, ' ').trim();
}
