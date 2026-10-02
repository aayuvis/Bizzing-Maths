/* test/papers-bank.mjs — the young bands' problem bank (g12, g34) held to
   docs/PAPER-CONTRACT.md. Every generated problem is re-solved by its own
   independent solver; a slip in make() is an exit code, not a wrong answer
   shown to a child. Never loosen a check here to make a template pass. */
import { TEMPLATES } from '../src/papers/bank-young.js';
import { seeded } from '../src/rand.js';

const N = Number(process.env.PAPER_N || 300);
let fails = 0; const seen = new Map();
const ok = (c, m) => { if (!c) { fails++; const n = (seen.get(m) || 0) + 1; seen.set(m, n); if (n <= 2 && fails < 60) console.error('  ✗ ' + m); } };

// the thirty strategy stops, copied from the contract (nth-term renamed find-the-rule)
const STRATEGIES = new Set([
  'work-backwards', 'guess-check-improve', 'make-a-table', 'find-the-rule', 'bar-model',
  'heads-and-legs', 'age-problems', 'simpler-case', 'meeting-and-overtaking', 'units-digit-cycles',
  'parity', 'pigeonhole', 'worst-case', 'truth-tellers', 'list-systematically', 'invariants',
  'calendar-days', 'digit-puzzles', 'remainder-puzzles', 'missing-digit-divisibility',
  'count-triangles', 'count-rectangles', 'grid-paths', 'handshakes', 'overlapping-groups',
  'area-cut-and-move', 'staircase-perimeter', 'painted-cubes', 'angle-chasing', 'dice-faces',
]);
ok(STRATEGIES.size === 30, 'thirty strategy ids');
const TOPICS = new Set(['number', 'counting', 'geometry', 'logic', 'patterns', 'measure']);
const BANDS = ['g12', 'g34'];
const LIMIT = { g12: 100, g34: 1000 };
const MIN_PER_TIER = 14, MIN_TOPICS = 5;

const hasNum = (s, n) => new RegExp(`(^|[^0-9.])${String(n).replace('.', '\\.')}(?![0-9]|\\.[0-9])`).test(s);
const figWords = (f) => [...f.matchAll(/>([^<]+)</g)].map((m) => m[1]).concat([...f.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])).join(' | ');
const sentences = (s) => s.split(/[.!?](?:\s|$)/).map((x) => x.trim()).filter(Boolean).length;
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isAns = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && /^\d+(\.\d{1,2})?$/.test(String(v))) || (typeof v === 'string' && v.length > 0 && v.length <= 24);

// ---- shape of every template
const ids = new Set();
for (const t of TEMPLATES) {
  ok(typeof t.id === 'string' && !ids.has(t.id), `unique id ${t.id}`); ids.add(t.id);
  ok(Array.isArray(t.bands) && t.bands.length && t.bands.every((b) => BANDS.includes(b)), `${t.id}: bands are g12/g34`);
  ok([3, 4, 5].includes(t.tier), `${t.id}: tier is 3, 4 or 5`);
  ok(TOPICS.has(t.topic), `${t.id}: topic ${t.topic} is known`);
  ok(STRATEGIES.has(t.strategy), `${t.id}: strategy ${t.strategy} is one of the thirty`);
  ok(typeof t.make === 'function' && typeof t.solve === 'function', `${t.id}: make and solve`);
}

// ---- every generated problem
const small = { n: 0, under30: 0 };
let generated = 0;
for (const t of TEMPLATES) for (const band of t.bands) {
  const texts = new Set();
  for (let i = 0; i < N; i++) {
    let p;
    try { p = t.make(seeded(`${t.id}|${band}|${i}`), band); } catch (e) { ok(false, `${t.id}/${band}: make threw ${e.message}`); continue; }
    generated++;
    const tag = `${t.id}/${band}`;
    ok(isAns(p.ans), `${tag}: answer is a short number or string (${p.ans})`);
    // proved: the independent solver finds exactly the stated answer
    let sol; try { sol = t.solve(JSON.parse(JSON.stringify(p.params))); } catch (e) { sol = 'threw ' + e.message; }
    ok(deepEq(sol, [p.ans]), `${tag}: solve(params) = ${JSON.stringify(sol)} but ans = ${JSON.stringify(p.ans)} — "${p.text}"`);
    // wrongs: at least four, distinct, never the answer, same kind as the answer
    const w = Array.isArray(p.wrong) ? p.wrong : [];
    ok(new Set(w).size === w.length && w.length >= 4, `${tag}: ≥ 4 distinct wrongs (${JSON.stringify(w)})`);
    ok(!w.includes(p.ans), `${tag}: a wrong equals the answer`);
    ok(w.every((v) => typeof v === typeof p.ans && (typeof v !== 'number' || (Number.isFinite(v) && v >= 0))), `${tag}: wrongs are the answer's kind (${JSON.stringify(w)})`);
    // band sizing
    if (typeof p.ans === 'number') {
      ok(p.ans < LIMIT[band], `${tag}: answer ${p.ans} is sized for ${band}`);
      if (band === 'g12') { small.n++; if (p.ans < 30) small.under30++; }
    }
    // no echo, no broken text
    ok(typeof p.text === 'string' && !/undefined|NaN|\[object/.test(p.text), `${tag}: clean text "${p.text}"`);
    if (typeof p.ans === 'number' && !t.echo) ok(!hasNum(p.text, p.ans), `${tag}: text echoes the answer ${p.ans} — "${p.text}"`);
    const ns = typeof p.why === 'string' ? sentences(p.why) : 0;
    ok(ns >= 1 && ns <= 3 && !/undefined|NaN/.test(p.why), `${tag}: why is 1–3 sentences (${ns}) "${p.why}"`);
    if (p.fig !== undefined) {
      ok(typeof p.fig === 'string' && p.fig.startsWith('<svg') && p.fig.endsWith('</svg>'), `${tag}: fig is an svg`);
      ok(!/undefined|NaN|Infinity/.test(p.fig), `${tag}: fig is clean`);
      const words = figWords(p.fig);
      ok(typeof p.ans === 'number' ? !hasNum(words, p.ans) : !words.includes(p.ans), `${tag}: fig shows the answer ${p.ans}`);
    }
    texts.add(p.text + '|' + (p.fig || '') + '|' + p.ans);
    // deterministic from the seed: two sibling papers are the same paper
    if (i < 5) ok(deepEq(t.make(seeded(`${t.id}|${band}|${i}`), band), p), `${tag}: same seed, same problem`);
  }
  // a template that keeps setting the same problem is a question, not a template
  ok(texts.size >= Math.min(4, N), `${t.id}/${band}: only ${texts.size} distinct problems in ${N}`);
}
ok(small.under30 >= 0.6 * small.n, `g12 answers mostly under 30 (${small.under30}/${small.n})`);

// ---- coverage: a paper never repeats a template, every section mixes topics
const cover = [];
for (const band of BANDS) for (const tier of [3, 4, 5]) {
  const ts = TEMPLATES.filter((t) => t.tier === tier && t.bands.includes(band)), topics = new Set(ts.map((t) => t.topic));
  cover.push(`${band} t${tier}: ${ts.length} templates / ${topics.size} topics`);
  ok(ts.length >= MIN_PER_TIER, `${band} tier ${tier}: ${ts.length} templates, need ${MIN_PER_TIER}`);
  ok(topics.size >= MIN_TOPICS, `${band} tier ${tier}: ${topics.size} topics, need ${MIN_TOPICS}`);
}

console.log(`${fails ? 'FAIL' : 'ok'} papers-bank (young) — ${TEMPLATES.length} templates, ${generated} problems re-solved; ${cover.join(' · ')}`);
if (fails) { console.error(`  ${fails} failures`); process.exit(1); }
