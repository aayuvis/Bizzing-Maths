/* test/widgets.mjs — the new ways to answer (audit v4 E4) can always give the answer, and never give it away.

   For every question a stop's drill or Learn can ask with q.input set:
   - the widget can BUILD a value correct() accepts (searched over every state the widget can reach) —
     a fraction bar that cannot be cut into enough parts, or blocks that cannot reach the number, fail here;
   - its first state is NOT the answer, and its first picture shows nothing the prompt does not
     (the leak rule, for a widget);
   - a tap-the-chart question has one target per choice, each over its own bar, row or dot, inside the
     chart and not overlapping another.
   Then each check is proved by breaking it. */
import { TRICKS, learnCases, dress, correct } from '../src/tricks.js';
import { seeded } from '../src/rand.js';
import * as W from '../src/widgets.js';

let fails = 0, n = 0;
const bad = (m) => { fails++; if (fails < 30) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) bad(m); };

const visible = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]*>/g, ' ');
const said = (s, v) => new RegExp(`(^|[^0-9/])${String(v).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^0-9/]|$)`).test(s);

/* every problem with one widget question, as messages (empty = fine) */
function problems(t, q) {
  const out = [];
  if (!W.KINDS.includes(q.input)) return [`unknown input ${q.input}`];
  dress(t, q);
  let built = null;
  for (const s of W.states(q)) if (correct(q, W.value(q, s))) { built = s; break; }
  if (!built) out.push(`the ${q.input} cannot build ${q.ans}`);
  const w0 = W.init(q), v0 = W.value(q, w0);
  if (correct(q, v0)) out.push(`the ${q.input} starts on the answer (${v0})`);
  const html = W.view(q, w0);
  if (/class="[^"]*\b(right|wrong)\b/.test(html)) out.push('the first picture marks an answer');
  if (q.input !== 'chart' && said(visible(html), q.ans) && !said(q.text, q.ans)) out.push(`the first picture shows the answer ${q.ans}`);
  if (q.input === 'fracbar') {
    const b = q.bar || {};
    if ((html.match(/aria-pressed="true"/g) || []).length !== (b.lockK || 0)) out.push('the bar starts with parts shaded that the question did not give');
    if ((b.lockN || 1) > W.FRAC_MAX) out.push('the bar is cut into more parts than it allows');
  }
  if (q.input === 'chart') {
    const H = q.hits;
    if (!H || !q.choices) return [...out, 'a chart question needs choices and places to tap'];
    if (H.hits.length !== q.choices.length) out.push(`${H.hits.length} places to tap for ${q.choices.length} choices`);
    H.hits.forEach((r, i) => {
      if (r.label !== q.choices[i]) out.push(`tap ${i} is labelled ${r.label}, the choice is ${q.choices[i]}`);
      if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > H.w + 0.5 || r.y + r.h > H.h + 0.5) out.push(`tap ${i} (${r.label}) is outside the chart`);
      H.hits.forEach((o, j) => { if (j > i && r.x < o.x + o.w - 0.01 && o.x < r.x + r.w - 0.01 && r.y < o.y + o.h - 0.01 && o.y < r.y + r.h - 0.01) out.push(`taps ${i} and ${j} overlap`); });
      // over its own mark: the label printed on the chart, or (a line graph) its own dot
      const inR = (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      const lab = [...q.html.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].find((m) => m[3] === q.choices[i]);
      const dot = [...q.html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)][i];
      const at = lab ? [+lab[1], +lab[2]] : dot ? [+dot[1], +dot[2]] : null;
      if (!at || !inR(...at)) out.push(`tap ${i} (${r.label}) is not over its own bar, row or dot`);
    });
  }
  return out;
}

const uses = { fracbar: new Set(), blocks: new Set(), chart: new Set() }, learn = { fracbar: 0, blocks: 0, chart: 0 };
for (const t of TRICKS) {
  const r = seeded('widgets:' + t.id);
  const qs = learnCases(t).map((c) => c.q);
  qs.forEach((q) => { if (q.input) learn[q.input]++; });
  for (const lv of [1, 2, 3]) for (let i = 0; i < 400; i++) qs.push(t.gen(r, lv));
  for (const q of qs) {
    if (!q.input) continue;
    n++; uses[q.input] && uses[q.input].add(t.id);
    for (const p of problems(t, q)) bad(`${t.id}: ${q.text} — ${p}`);
  }
}
for (const k of W.KINDS) {
  ok(uses[k].size >= 2 && uses[k].size <= 3, `${k}: used by ${uses[k].size} stops (${[...uses[k]]}), the brief is 2–3`);
  ok(learn[k] >= 1, `${k}: no Learn case shows it`);
}

/* the keys and the taps build the same thing: a sequence of actions reaches the answer */
{
  const q = { input: 'fracbar', ans: '3/4', frac: true }, w = W.init(q);
  for (let i = 0; i < 3; i++) W.act(q, w, 'n+');
  for (let i = 0; i < 3; i++) W.act(q, w, 'k+');
  ok(correct(q, W.value(q, w)), `→ → → ↑ ↑ ↑ builds 3/4 (built ${W.value(q, w)})`);
  W.act(q, w, 'toggle', 1); ok(W.value(q, w) === '2/4', 'tapping a shaded part clears it');
  W.act(q, w, 'paint', [3, true]); ok(W.value(q, w) === '3/4' && w.on.join() === '0,2,3', 'dragging paints the part it passes');
  W.act(q, w, 'n-'); ok(W.value(q, w) === '2/3' && !w.on.includes(3), 'fewer parts drops the shading on the part that went');
  const b = { input: 'blocks', ans: 340 }, wb = W.init(b);
  for (let i = 0; i < 3; i++) W.act(b, wb, 'h+');
  for (let i = 0; i < 4; i++) W.act(b, wb, 't+');
  ok(correct(b, W.value(b, wb)), `three hundreds and four tens build 340 (built ${W.value(b, wb)})`);
  for (let i = 0; i < 12; i++) W.act(b, wb, 'o+'); ok(wb.o === 9, 'a column holds one digit');
  W.mirror(b, wb, '207'); ok(wb.h === 2 && wb.t === 0 && wb.o === 7, 'typed digits shift into the columns');
  const c = { input: 'chart', choices: ['A', 'B', 'C'], ans: 'C' }, wc = W.init(c);
  W.act(c, wc, 'cur', -1); ok(W.value(c, wc) === 'C', '← from nothing lands on the last bar');
  W.act(c, wc, 'cur', 1); ok(W.value(c, wc) === 'A', '→ wraps round');
}

/* proof by breaking it: each rule catches the fault it is there for */
{
  const t = { id: 'probe' };
  const fails1 = (q) => problems(t, q).length > 0;
  ok(fails1({ input: 'fracbar', ans: '13/14', frac: true, text: 'probe' }), 'a fraction the bar cannot be cut into is caught');
  ok(fails1({ input: 'blocks', ans: 1200, text: 'probe' }), 'a number the blocks cannot reach is caught');
  ok(fails1({ input: 'fracbar', ans: 0, bar: { give: 'k', lockN: 4 }, text: 'probe' }), 'a bar that starts on its answer is caught');
  ok(fails1({ input: 'fracbar', ans: 6, bar: { give: 'k', lockN: 13 }, text: 'probe' }), 'a bar with too many parts is caught');
  ok(fails1({ input: 'chart', ans: 'B', choices: ['A', 'B'], text: 'probe', html: '<svg><text x="10" y="10">A</text><text x="30" y="10">B</text></svg>', hits: { w: 40, h: 20, hits: [{ label: 'A', x: 0, y: 0, w: 22, h: 20 }, { label: 'B', x: 20, y: 0, w: 20, h: 20 }] } }), 'overlapping taps are caught');
  ok(fails1({ input: 'chart', ans: 'B', choices: ['A', 'B'], text: 'probe', html: '<svg><text x="30" y="10">A</text><text x="10" y="10">B</text></svg>', hits: { w: 40, h: 20, hits: [{ label: 'A', x: 0, y: 0, w: 20, h: 20 }, { label: 'B', x: 20, y: 0, w: 20, h: 20 }] } }), 'a tap over the wrong bar is caught');
  ok(!fails1({ input: 'chart', ans: 'B', choices: ['A', 'B'], text: 'probe', html: '<svg><text x="10" y="10">A</text><text x="30" y="10">B</text></svg>', hits: { w: 40, h: 20, hits: [{ label: 'A', x: 0, y: 0, w: 20, h: 20 }, { label: 'B', x: 20, y: 0, w: 20, h: 20 }] } }), 'a true chart passes');
  ok(fails1({ input: 'blocks', ans: 300, text: 'probe' }) === false, 'a true blocks question passes');
}

console.log(`${fails ? 'FAIL' : 'ok'} widgets — ${n} questions answered by building: ${W.KINDS.map((k) => `${k} in ${[...uses[k]].join(', ')}`).join('; ')}`);
if (fails) process.exit(1);
