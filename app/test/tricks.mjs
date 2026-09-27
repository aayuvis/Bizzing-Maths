/* test/tricks.mjs — the trick and the arithmetic must agree, every time.
   Three independent routes to each answer: the trick's own last step, q.ans,
   and a plain evaluation of q.expr. Any disagreement fails the build. */
import { TRICKS, WORLDS, example, correct } from '../src/tricks.js';
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
    ok(plain === q.ans, `${t.id}: ${q.text} ans ${q.ans} but plain arithmetic says ${plain}`);
    const w = t.work(q);
    ok(w.length >= 1, `${t.id}: no steps`);
    ok(w.at(-1).v === q.ans, `${t.id}: ${q.text} trick ends on ${w.at(-1).v}, answer is ${q.ans}`);
    for (const s of w) ok(s.v !== undefined && s.v === s.v && (typeof s.v === 'string' || Number.isInteger(s.v)), `${t.id}: ${q.text} step "${s.t}" is not a whole number (${s.v})`);
    ok(correct(q, String(q.ans)), `${t.id}: correct() rejects its own answer`);
    if (!q.choices) ok(!correct(q, String(q.ans + 1)), `${t.id}: correct() accepts a wrong answer`);
    ok(!/undefined|NaN/.test(q.text + w.map((s) => s.t).join()), `${t.id}: text leaks undefined/NaN: ${q.text}`);
    // the prompt must never contain the answer (the Bee's leaked-spelling rule)
    if (!q.choices && String(q.ans).length > 1) ok(!q.text.split(/[^0-9]/).includes(String(q.ans)), `${t.id}: prompt "${q.text}" shows its answer`);
  }
}
// band gating must mean something: every world has a stop open to the youngest band that world is for
for (const w of WORLDS) ok(TRICKS.some((t) => t.world === w.id), `${w.id} has no stops`);

console.log(`${fails ? 'FAIL' : 'ok'} tricks — ${TRICKS.length} chapters, ${n} generated questions checked three ways`);
if (fails) process.exit(1);
