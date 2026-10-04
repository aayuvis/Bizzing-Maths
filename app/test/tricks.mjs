/* test/tricks.mjs — the trick and the arithmetic must agree, every time.
   Three independent routes to each answer: the trick's own last step, q.ans,
   and a plain evaluation of q.expr. Any disagreement fails the build. */
import { TRICKS, WORLDS, example, correct, parseNum, learnCases, caseSig } from '../src/tricks.js';
import { seeded } from '../src/rand.js';
import { checkSteps, constReport, weakness, H } from './lib/steps.mjs';
// STEPS_ONLY=world,world limits the middle-step check while a world is being given its x (never in CI)
const STEPS_ONLY = process.env.STEPS_ONLY ? process.env.STEPS_ONLY.split(',') : null;

let fails = 0, n = 0;
const bad = (m) => { fails++; if (fails < 30) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) bad(m); };

const ids = new Set();
for (const t of TRICKS) {
  ok(!ids.has(t.id), `duplicate id ${t.id}`); ids.add(t.id);
  ok(WORLDS.some((w) => w.id === t.world), `${t.id}: unknown world ${t.world}`);
  for (const f of ['title', 'hook', 'idea', 'alg']) ok(typeof t[f] === 'string' && t[f].length > 3, `${t.id}: missing ${f}`);
  ok(Array.isArray(t.why) && t.why.length >= 2, `${t.id}: why needs at least two paragraphs`);
  ok(['6-7', '8-10', '11-14'].includes(t.band), `${t.id}: bad band`);
  const r = seeded(t.id);
  const lc = learnCases(t), qs = lc.map((c) => c.q);
  // every stop has been audited: several ideas → a worked case for each; one idea → says so
  ok(t.oneIdea === true || (t.cases && t.cases.length >= 2 && t.caseKey), `${t.id}: not audited — give it cases + caseKey, or oneIdea: true`);
  if (t.cases) ok(t.cases.every((c) => c.label && c.label.length <= 28 && c.ex && c.note), `${t.id}: every case needs a short label, a note and an ex`);
  const shownSigs = new Set(lc.map((c) => caseSig(t, c.q)));
  if (t.cases) ok(shownSigs.size === lc.length, `${t.id}: two Learn cases show the same idea (${[...shownSigs].join(', ')})`);
  const gens = [];
  for (const lv of [1, 2, 3]) for (let i = 0; i < 700; i++) { const g = t.gen(r, lv); gens.push(g); qs.push(g); }
  if (t.caseKey) for (const g of gens) { const sig = caseSig(t, g); if (!shownSigs.has(sig)) { ok(false, `${t.id}: the drill asks about "${sig}" but Learn never shows it`); break; } }
  for (const q of qs) {
    n++;
    const plain = Function(`return (${q.expr})`)();
    // three routes: a fraction answer ("3/4") is compared by value, a decimal to 1e-9
    const want = q.choices ? q.ans : typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
    ok(q.choices ? plain === q.ans : Math.abs(plain - want) < 1e-9, `${t.id}: ${q.text} ans ${q.ans} but plain arithmetic says ${plain}`);
    ok(q.choices || Number.isFinite(want), `${t.id}: ${q.text} answer ${q.ans} is not a number`);
    ok(q.choices || typeof q.ans === 'number' || q.frac, `${t.id}: a text answer must be a fraction question (q.frac) or a choice`);
    ok(!q.choices || q.choices.includes(q.ans), `${t.id}: the answer is not among the choices`);
    if (!Number.isInteger(want) && !q.choices) ok(t.decimals || q.frac, `${t.id}: ${q.text} has a non-whole answer but the chapter is not marked decimals or frac`);
    if (typeof want === 'number' && want < 0) ok((t.keys || q.keys || []).includes('−'), `${t.id}: negative answer but no − key`);
    if (!Number.isInteger(want) && !q.choices && !q.frac) ok((t.keys || q.keys || []).includes('.'), `${t.id}: decimal answer but no . key`);
    if (q.frac) ok((t.keys || q.keys || []).includes('/'), `${t.id}: fraction answer but no / key`);
    const w = t.work(q);
    ok(w.length >= 1, `${t.id}: no steps`);
    const last = w.at(-1).v;
    ok(q.choices ? last === q.ans : Math.abs((typeof last === 'number' ? last : parseNum(last)) - want) < 1e-9, `${t.id}: ${q.text} trick ends on ${last}, answer is ${q.ans}`);
    if (!STEPS_ONLY || STEPS_ONLY.includes(t.world)) checkSteps(t.id, q, w, ok, t.draw ? t.draw(q) : (q.html || ''));
    for (const s of w) {
      const ok1 = s.choices ? s.choices.includes(s.v) : typeof s.v === 'string' ? Number.isFinite(parseNum(s.v)) : Number.isFinite(s.v) && (t.decimals || Number.isInteger(s.v));
      ok(s.v !== undefined && ok1, `${t.id}: ${q.text} step "${s.t}" has a value a child cannot type (${s.v})`);
    }
    ok(correct(q, String(q.ans)), `${t.id}: correct() rejects its own answer`);
    if (!q.choices) ok(!correct(q, String(want + 1)), `${t.id}: correct() accepts a wrong answer`);
    if (t.draw) { const h = t.draw(q); ok(typeof h === 'string' && h.includes('<svg') && !/undefined|NaN/.test(h), `${t.id}: draw() gives a clean SVG`); }
    ok(!/undefined|NaN/.test(q.text + w.map((s) => s.t).join()), `${t.id}: text leaks undefined/NaN: ${q.text}`);
    // the prompt must never contain the answer (the Bee's leaked-spelling rule)
    if (!q.choices && String(q.ans).length > 1 && !t.echo) ok(!q.text.split(/[^0-9./]/).includes(String(q.ans)), `${t.id}: prompt "${q.text}" shows its answer`);
  }
}
// proof by breaking it: the middle-step check catches a step one off, a bare-number x and a missing x, and passes a true one
{ const seen = []; const probe = (w) => { let c = 0; checkSteps('probe', { text: '6 × 7 + 1' }, w, (cond) => { if (!cond) c++; }); seen.push(c); };
  probe([{ t: '6 × 7', v: 43, x: '6*7' }, { t: 'add 1', v: 43 }]);
  probe([{ t: '6 × 7', v: 42, x: '42' }, { t: 'add 1', v: 43 }]);
  probe([{ t: '6 × 7', v: 42 }, { t: 'add 1', v: 43 }]);
  probe([{ t: 'Which is bigger?', v: 'A', x: "6*7>40?'A':'B'", choices: ['A', 'B'] }, { t: 'add 1', v: 43 }]);
  probe([{ t: '6 × 7', v: 42, x: '6*7' }, { t: 'add 1', v: 43 }]);
  ok(seen.join() === '1,1,1,0,0', `the middle-step check itself is broken (${seen})`); }
// …and the weak shapes are caught, while honest arithmetic, a TEXT read and a fact are not
ok(['7-0', '(5)-0', '9*1', '6*4/6', 'Math.sqrt(8*8)', '1/(1/4)', "['heads','tails'].length"].every((x) => weakness(x))
  && ['7-3', 'Math.floor(1234/1)%10', '6*4', 'H.n(TEXT,2)', "H.fact('straight-angle')"].every((x) => !weakness(x)), 'the weak-shape rule is broken');
ok(H.n('In 674, what is the 6 worth?', 2) === 6 && H.n('−3 + 5', 1) === -3 && H.count('<circle/><circle/><rect/>', /<circle/) === 2, 'H cannot read what the child sees');
constReport(ok);   // a step that is the same typed constant on every question is a fact typed by hand
// band gating must mean something: every world has a stop open to the youngest band that world is for
// every trig ratio a Lighthouse prompt GIVES must be the true value, rounded as shown
ok((await import('../src/chapters/lighthouse.js')).RATIOS_ARE_TRUE(), 'lighthouse: a given trig ratio is not the true value');
for (const w of WORLDS) ok(TRICKS.filter((t) => t.world === w.id).length >= 5, `${w.id} has fewer than five stops`);
for (const w of WORLDS) for (const f of ['name', 'short', 'blurb', 'glyph', 'tint', 'ink']) ok(w[f], `${w.id}: world missing ${f}`);

console.log(`${fails ? 'FAIL' : 'ok'} tricks — ${TRICKS.length} chapters, ${n} generated questions checked three ways`);
if (fails) process.exit(1);
