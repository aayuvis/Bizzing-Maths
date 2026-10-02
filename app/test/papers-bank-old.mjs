/* test/papers-bank-old.mjs — the older bands' problem bank (g56, g78), held to
   every rule in docs/PAPER-CONTRACT.md. Never loosen it to make a template pass:
   fix the template. */
import { TEMPLATES } from '../src/papers/bank-old.js';
import { seeded } from '../src/rand.js';

const STRATEGIES = new Set([
  'work-backwards', 'guess-check-improve', 'make-a-table', 'find-the-rule', 'bar-model',
  'heads-and-legs', 'age-problems', 'simpler-case', 'meeting-and-overtaking', 'units-digit-cycles',
  'parity', 'pigeonhole', 'worst-case', 'truth-tellers', 'list-systematically', 'invariants',
  'calendar-days', 'digit-puzzles', 'remainder-puzzles', 'missing-digit-divisibility',
  'count-triangles', 'count-rectangles', 'grid-paths', 'handshakes', 'overlapping-groups',
  'area-cut-and-move', 'staircase-perimeter', 'painted-cubes', 'angle-chasing', 'dice-faces',
]);
const TOPICS = new Set(['number', 'counting', 'geometry', 'logic', 'patterns', 'measure']);
const BANDS = ['g56', 'g78'];
const REPS = Number(process.env.REPS || 300);

let fails = 0; const seen = new Map();
const ok = (c, m) => { if (!c) { fails++; const k = m.split(':')[0] + ' ' + (m.split(':')[1] || '').trim().split(' ')[0]; seen.set(k, (seen.get(k) || 0) + 1); if (seen.get(k) <= 3) console.error('  ✗ ' + m); } };

// the answer as a number of its own (or a word of its own) — written independently of the bank
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
function echo(hay, ans) {
  if (typeof ans === 'number') {
    const forms = [String(ans), ans.toLocaleString('en-US')];
    return forms.some((f) => new RegExp(`(^|[^\\d.,/])${reEsc(f)}(?!\\d|[.,/]\\d)`).test(hay));
  }
  return new RegExp(`(^|[^\\w/])${reEsc(ans)}(?![\\w/])`).test(hay);
}
const figWords = (f) => [...f.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' | ') + ' | ' + ((f.match(/aria-label="([^"]*)"/) || [])[1] || '');
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b);
const sentences = (s) => s.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9("'])/).filter(Boolean).length;

// ---- shape of every template
const ids = new Set();
for (const t of TEMPLATES) {
  ok(!ids.has(t.id), `unique id: ${t.id}`); ids.add(t.id);
  ok(STRATEGIES.has(t.strategy), `strategy is one of the thirty: ${t.id} → ${t.strategy}`);
  ok([3, 4, 5].includes(t.tier), `tier 3/4/5: ${t.id}`);
  ok(TOPICS.has(t.topic), `topic: ${t.id} → ${t.topic}`);
  ok(Array.isArray(t.bands) && t.bands.length && t.bands.every((b) => BANDS.includes(b)), `bands in this bank are g56/g78: ${t.id}`);
  ok(typeof t.make === 'function' && typeof t.solve === 'function', `make and solve: ${t.id}`);
}

// ---- every template, ~300 problems per band
const t0 = Date.now();
for (const t of TEMPLATES) for (const band of t.bands) {
  const texts = new Set();
  for (let i = 0; i < REPS; i++) {
    const seed = `${t.id}|${band}|${i}`; let q;
    try { q = t.make(seeded(seed), band); } catch (e) { ok(false, `make throws: ${t.id} ${band} — ${e.message}`); break; }
    const tag = `${t.id} ${band} #${i}`;
    // deterministic: fixed papers are the same in every house
    const q2 = t.make(seeded(seed), band);
    ok(q2.text === q.text && same(q2.ans, q.ans), `deterministic from its seed: ${tag}`);
    texts.add(q.text + (q.fig || '') + JSON.stringify(q.params));
    // the answer
    ok((typeof q.ans === 'number' && Number.isFinite(q.ans)) || (typeof q.ans === 'string' && q.ans.length > 0 && q.ans.length <= 20), `answer is a number or a short string: ${tag} → ${q.ans}`);
    if (typeof q.ans === 'number') ok(Math.abs(q.ans * 100 - Math.round(q.ans * 100)) < 1e-9 && Math.abs(q.ans) < 1e6, `numeric answer is whole or a short decimal: ${tag} → ${q.ans}`);
    // proved: an independent solve finds exactly the stated answer
    let sol; try { sol = t.solve(JSON.parse(JSON.stringify(q.params))); } catch (e) { sol = ['THROW ' + e.message]; }
    ok(Array.isArray(sol) && sol.length === 1 && same(sol[0], q.ans), `solve(params) is exactly [ans]: ${tag} → [${sol}] vs ${q.ans} — ${q.text.slice(0, 120)}`);
    // the wrong answers
    const w = q.wrong || [];
    ok(new Set(w.map(String)).size === w.length, `wrong answers distinct: ${tag} → ${w}`);
    ok(w.length >= 4, `at least four wrong answers: ${tag} → ${w}`);
    ok(!w.some((x) => same(x, q.ans) || String(x) === String(q.ans)), `no wrong answer equals the answer: ${tag}`);
    ok(w.every((x) => typeof x === typeof q.ans), `wrong answers are the answer's type: ${tag}`);
    if (typeof q.ans === 'number') ok(w.every((x) => Number.isFinite(x)), `wrong answers are finite numbers: ${tag} → ${w}`);
    // the words
    ok(typeof q.text === 'string' && !/undefined|NaN|\[object/.test(q.text), `clean text: ${tag} → ${q.text}`);
    if (!t.echo) ok(!echo(q.text, q.ans), `text does not echo the answer: ${tag} → ${q.ans} in "${q.text}"`);
    ok(typeof q.why === 'string' && !/undefined|NaN|\[object/.test(q.why), `clean why: ${tag}`);
    const n = sentences(q.why || ''); ok(n >= 1 && n <= 3, `why is one to three sentences: ${tag} → ${n}: ${q.why}`);
    // the picture
    if (q.fig !== undefined) {
      ok(typeof q.fig === 'string' && q.fig.startsWith('<svg') && q.fig.endsWith('</svg>'), `fig is one SVG: ${tag}`);
      ok(!/undefined|NaN|Infinity/.test(q.fig), `fig is clean: ${tag}`);
      if (!t.figEcho) ok(!echo(figWords(q.fig), q.ans), `fig does not show the answer: ${tag} → ${q.ans}`);
    }
    ok(q.params && typeof q.params === 'object' && JSON.stringify(JSON.parse(JSON.stringify(q.params))) === JSON.stringify(q.params), `params survive JSON: ${tag}`);
  }
  ok(texts.size >= Math.min(4, REPS), `variety: ${t.id} ${band} makes ${texts.size} different problems`);
}

// ---- coverage: a 30-question paper (10 per section) never repeats a template
const cover = [];
for (const band of BANDS) for (const tier of [3, 4, 5]) {
  const ts = TEMPLATES.filter((t) => t.tier === tier && t.bands.includes(band)), topics = new Set(ts.map((t) => t.topic));
  ok(ts.length >= 14, `coverage: ${band} tier ${tier} has ${ts.length} templates (need 14)`);
  ok(topics.size >= 5, `coverage: ${band} tier ${tier} spans ${topics.size} topics (need 5)`);
  cover.push(`${band} t${tier}: ${ts.length} templates / ${topics.size} topics`);
}
const strategiesUsed = new Set(TEMPLATES.map((t) => t.strategy));
console.log(`  ${TEMPLATES.length} templates, ${strategiesUsed.size}/30 strategies; ${cover.join(' · ')} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log(`${fails ? 'FAIL' : 'ok'} papers-bank-old — every problem proved by an independent solve, clean, no echo, covered`);
if (fails) { console.error(`  ${fails} failures`); process.exit(1); }
