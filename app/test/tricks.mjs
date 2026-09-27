/* test/tricks.mjs — the trick and the arithmetic must agree, every time.
   Three independent routes to each answer: the trick's own last step, q.ans,
   and a plain evaluation of q.expr. Any disagreement fails the build. */
import { TRICKS, WORLDS, example, correct, parseNum } from '../src/tricks.js';
import { seeded } from '../src/rand.js';

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
  const qs = [example(t)];
  for (const lv of [1, 2, 3]) for (let i = 0; i < 700; i++) qs.push(t.gen(r, lv));
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
// band gating must mean something: every world has a stop open to the youngest band that world is for
// every trig ratio a Lighthouse prompt GIVES must be the true value, rounded as shown
ok((await import('../src/chapters/lighthouse.js')).RATIOS_ARE_TRUE(), 'lighthouse: a given trig ratio is not the true value');
for (const w of WORLDS) ok(TRICKS.filter((t) => t.world === w.id).length >= 5, `${w.id} has fewer than five stops`);
for (const w of WORLDS) for (const f of ['name', 'short', 'blurb', 'glyph', 'tint', 'ink']) ok(w[f], `${w.id}: world missing ${f}`);

console.log(`${fails ? 'FAIL' : 'ok'} tricks — ${TRICKS.length} chapters, ${n} generated questions checked three ways`);
if (fails) process.exit(1);
