/* test/geo3d.mjs — the geometry explainers say what the stop says, and never say it too soon.

   For every stop that carries an explainer (`geo(q)` + `explain`), on its Learn cases and on
   generated questions at every level:

   1 · AGREEMENT (rule 1). The explainer measures its own answer from its own geometry — cells
       counted, cubes placed, pieces' areas by the shoelace rule, a rolled track measured in
       diameters, angles measured at the corners — and that number must equal q.ans. Every
       number of the stop's working, work(q), must be shown somewhere in the animation (a
       caption or a label), and every number it shows must be one the question gave, one the
       working reaches, or one the model counted — no stray number a child could copy.
   2 · NO LEAK (rule 3). In 'ask' mode — Learn before the steps are shown — every frame, whole
       and half-way, shows only numbers the question already shows (its text and its picture)
       or a fixed fact (180°, 4 sides…), and never the answer unless the question gives it.
   3 · Clean frames: no NaN, no undefined, at every quarter step; a finite sequence (it ends).
   4 · The Formula Book's moving cards measure the card's own worked example.
   The answers are measured, not read back: break a model (say, count one cube too many) and
   check 1 fails; show the total in ask mode and check 2 fails — both were watched to. */
import { TRICKS, byId, learnCases, parseNum } from '../src/tricks.js';
import { model, frame, words, html, KINDS } from '../src/geo3d.js';
import { CARDS } from '../src/library/formulas.js';
import { seeded } from '../src/rand.js';

let fails = 0, checked = 0;
const seen = new Map();
const bad = (m) => { fails++; const k = m.replace(/\d+/g, '#').slice(0, 70); seen.set(k, (seen.get(k) || 0) + 1); if (seen.get(k) <= 2 && fails < 200) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) bad(m); };
const nums = (s) => (String(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);
const near = (a, b) => Math.abs(a - b) < 1e-6;
const has = (set, v) => set.some((x) => near(x, v));
/* facts every child already holds, which a picture may say before the answer: a straight line, a
   turn, a cube's 8 corners and 12 edges, π to two places, the 2 in "two of each", a step's number */
const FACTS = [0, 1, 2, 3, 4, 6, 8, 12, 60, 90, 180, 360, 0.14, 3.14];

/* the stops that must carry an explainer, and the question kinds that rightly have none */
const WIRED = ['perimeter', 'area-rectangles', 'compound-area', 'area-triangles', 'volume-cuboid', 'faces-edges-vertices', 'angles-on-a-line',
  'angles-in-a-shape', 'round-the-circle', 'staircase-perimeter', 'area-cut-and-move', 'painted-cubes', 'out-in', 'liu-hui', 'pythagoras-side', 'cube-and-root'];
const NONE = { 'liu-hui': (q) => q.kind === 'closer', 'cube-and-root': (q) => q.kind === 'root' };

for (const id of WIRED) ok(byId[id] && typeof byId[id].geo === 'function' && typeof byId[id].explain === 'function', `${id}: carries geo(q) and explain`);
ok(TRICKS.filter((t) => t.geo).length === WIRED.length, `every stop with an explainer is in this test (${TRICKS.filter((t) => t.geo).map((t) => t.id).filter((x) => !WIRED.includes(x)).join(', ')})`);

function givens(t, q) {
  const pic = t.draw ? [...t.draw(q).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ') : '';
  return [...nums(q.text), ...nums(pic)];
}
function audit(t, q, where) {
  const sp = t.geo(q);
  if (!sp) { ok(NONE[t.id] && NONE[t.id](q), `${t.id} ${where}: no explainer for "${q.text}"`); return; }
  ok(KINDS[sp.kind], `${t.id}: unknown explainer kind ${sp.kind}`);
  checked++;
  const M = model(sp, 'full'), want = typeof q.ans === 'number' ? q.ans : parseNum(q.ans), n = M.steps.length - 1;
  // 1 · agreement: the measured answer, the working, and nothing stray
  ok(near(M.answer, want), `${t.id} ${where}: the explainer measures ${M.answer}, the question's answer is ${q.ans} — "${q.text}"`);
  const shown = []; for (let i = 0; i <= n; i++) for (const w of words(sp, i, 'full')) shown.push(...nums(w));
  const work = t.work(q).map((s) => s.v).filter((v) => typeof v === 'number');
  for (const v of work) ok(has(shown, v), `${t.id} ${where}: the working's ${v} is never shown — "${q.text}" (shows ${[...new Set(shown)].join(' ')})`);
  ok(has(shown, want), `${t.id} ${where}: the answer ${want} is never shown in full mode`);
  const allowed = [...givens(t, q), ...work, want, ...(M.counted || []), ...FACTS];
  const stray = [...new Set(shown)].filter((v) => !has(allowed, v));
  ok(!stray.length, `${t.id} ${where}: shows numbers that are neither given, worked, nor counted: ${stray.join(', ')} — "${q.text}"`);
  // 2 · no leak in ask mode, whole and half-way frames, and in the markup it first draws
  const g = givens(t, q), canEcho = has(g, want);
  for (let t2 = 0; t2 <= n; t2 += 0.5) {
    const f = frame(sp, t2, 'ask'), said = [f.cap, ...[...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])].flatMap(nums);
    const extra = said.filter((v) => !has([...g, ...FACTS], v));
    ok(!extra.length, `${t.id} ${where}: ask mode at t=${t2} shows ${extra.join(', ')}, which the question does not — "${q.text}"`);
    if (!canEcho) ok(!has(said, want), `${t.id} ${where}: ask mode at t=${t2} shows the answer ${want}`);
  }
  const mk = html(sp, { mode: 'ask' });
  if (!canEcho) ok(!new RegExp(`(^|[^\\d.])${String(want).replace('.', '\\.')}(?![\\d]|\\.\\d)`).test(mk.replace(/<span class="g3-pos[^<]*<\/span>/, '').replace(/<[^>]*>/g, ' ').replace(/data-g3spec="[^"]*"/g, '')), `${t.id} ${where}: the ask-mode markup says the answer ${want}`);
  // 3 · clean frames, a sequence that ends
  for (let t2 = 0; t2 <= n; t2 += 0.25) { const f = frame(sp, t2, 'full', { yaw: 0.3 }); if (/NaN|undefined|Infinity/.test(f.svg + f.cap)) { bad(`${t.id} ${where}: a broken frame at t=${t2}`); break; } }
  ok(n >= 2 && n <= 20 && (!M.ms || M.ms.every((x) => x > 0 && x < 5000)), `${t.id} ${where}: a sequence of ${n + 1} steps with sane timings`);
  ok(/<button[^>]*data-g3b="play"[^>]*aria-label="Play"/.test(mk) && (mk.match(/<button/g) || []).length >= 4, `${t.id}: the explainer has its named controls`);
}

for (const id of WIRED) {
  const t = byId[id], r = seeded('geo3d:' + id);
  learnCases(t).forEach((c, i) => audit(t, c.q, `case ${i + 1}`));
  for (const lv of [1, 2, 3]) for (let k = 0; k < 80; k++) audit(t, t.gen(r, lv), `lv${lv}`);
}

/* 4 · the Formula Book's cards: each moving picture is the card's own worked example */
let cards = 0;
for (const c of CARDS) {
  if (!c.geo) continue;
  cards++;
  const sp = c.geo(...c.example.args), M = model(sp, 'full'), n = M.steps.length - 1;
  ok(near(M.answer, c.example.ans) && near(M.answer, c.f(...c.example.args)), `card ${c.id}: the picture measures ${M.answer}, the card says ${c.example.ans}`);
  const shown = []; for (let i = 0; i <= n; i++) for (const w of words(sp, i, 'full')) shown.push(...nums(w));
  ok(has(shown, c.example.ans), `card ${c.id}: the answer ${c.example.ans} is shown`);
  for (let t2 = 0; t2 <= n; t2 += 0.25) if (/NaN|undefined/.test(frame(sp, t2).svg)) { bad(`card ${c.id}: a broken frame at ${t2}`); break; }
}
ok(cards >= 12, `the Formula Book's area and volume cards move (${cards})`);

if (fails) { console.error(`geo3d: ${fails} failure(s)`); process.exit(1); }
console.log(`ok geo3d — ${checked} explainers on ${WIRED.length} stops measured against q.ans and work(q), each frame checked for leaks in ask mode; ${cards} Formula Book cards`);
