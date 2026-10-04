/* test/library.mjs — every Library tool renders cleanly and proves its own maths.
   A tool's selftest(ok, makeCtx) asserts what only it knows (factors multiply
   back, a worked method ends on the true answer, a plotted point lies on its
   line…). Journeys and formula cards are held to the Atlas rules: every
   question checked three ways, every story sum evaluated. */
import { loadAll, ORDER } from '../src/library/index.js';
import { META } from '../src/library/shelf.js';
const TOOLS = await loadAll();
import { parseNum, correct } from '../src/tricks.js';
import { evalSum } from '../src/stories.js';
import { RIVALS } from '../src/contest.js';
import { newKid } from '../src/model.js';
import { seeded } from '../src/rand.js';
import { checkSteps, constReport } from './lib/steps.mjs';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.error('  ✗ ' + m); } };
const esc = (s) => String(s);
export function makeCtx(id, band = '8-10') {
  const kid = newKid('Test', band); kid.lib = {};
  const runs = [];
  const ctx = { id, kid, band, ui: {}, data: (kid.lib[id] = {}), save() {}, render() {}, toast() {}, sfx: new Proxy({}, { get: () => () => {} }), confetti() {}, say() {},
    keypad: (k = []) => `<div class="pad">${k.join('')}</div>`, F: null, tick() {}, record() {}, startRun: (title, items, extra) => runs.push({ title, items, extra }), go() {}, openStop() {}, runs };
  return ctx;
}
const clean = (h, where) => ok(typeof h === 'string' && h.length > 40 && !/undefined|NaN|\[object Object\]/.test(h), `${where}: view renders cleanly`);
const rivals = new Set(RIVALS.map((r) => r.id));

for (const tool of TOOLS) {
  const T = tool.TOOL, id = T.id;
  for (const f of ['id', 'name', 'blurb', 'art']) ok(T[f], `${id}: TOOL.${f}`);
  ok(T.blurb !== 'Coming soon.', `${id}: still a placeholder`);
  for (const band of ['6-7', '8-10', '11-14']) { const c = makeCtx(id, band); clean(tool.view(c), `${id} (${band})`); }
  if (tool.selftest) { const before = fails; tool.selftest(ok, makeCtx); ok(true, ''); if (fails > before) console.error(`  ↳ in ${id}.selftest`); }
  // journeys: every step's questions checked three ways
  for (const st of tool.JOURNEY || []) {
    ok(st.id && st.title && Array.isArray(st.cards) && st.cards.length >= 1, `${id}/${st.id}: step needs title and cards`);
    if (st.sources) ok(st.sources.length >= 1, `${id}/${st.id}: empty sources`);
    if (!st.gen) continue;
    const r = seeded(id + st.id);
    for (const lv of [1, 2, 3]) for (let i = 0; i < 300; i++) {
      const q = st.gen(r, lv);
      const plain = Function(`return (${q.expr})`)();
      const want = q.choices ? q.ans : typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
      ok(q.choices ? plain === q.ans : Math.abs(plain - want) < 1e-9, `${id}/${st.id}: ${q.text} ans ${q.ans}, plain says ${plain}`);
      ok(correct(q, String(q.ans)), `${id}/${st.id}: rejects its own answer`);
      // every MIDDLE step a child types carries its own plain arithmetic, checked like the Atlas's (test/lib/steps.mjs)
      if (st.work) checkSteps(`${id}/${st.id}`, q, st.work(q), ok, q.html || (st.fig ? st.fig(q, {}) : ''));
      if (st.work) { const w = st.work(q); const last = w.at(-1).v; ok(q.choices ? last === q.ans : Math.abs((typeof last === 'number' ? last : parseNum(last)) - want) < 1e-9, `${id}/${st.id}: steps end on ${last}, answer ${q.ans}`); }
      if (!q.choices && String(q.ans).length > 1) ok(!q.text.split(/[^0-9./]/).includes(String(q.ans)), `${id}/${st.id}: prompt shows its answer: ${q.text}`);
    }
  }
  // formula cards: stories checked like the Atlas's
  for (const card of tool.CARDS || []) {
    if (!card.story) continue;
    ok(card.story.cast.every((c) => rivals.has(c)), `${id}/${card.id}: cast must be the Bee's rivals`);
    for (const b of card.story.beats) if (b.add && b.add.v !== undefined) ok(Math.abs(evalSum(b.add.t) - b.add.v) < 1e-9, `${id}/${card.id}: notepad ${b.add.t} ≠ ${b.add.v}`);
  }
}
constReport(ok);   // no journey step is a fact typed by hand
console.log(`${fails ? 'FAIL' : 'ok'} library — ${TOOLS.length} tools render and prove their maths`);
if (fails) process.exit(1);
