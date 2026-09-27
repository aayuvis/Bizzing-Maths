/* test/levels.mjs — the ten journeys hold their promises.

   Ten levels, one per maths age; every stop somewhere; a stop comes back only
   harder; nothing before its band; a spiral, not a list; Level 10 a real
   stretch; and every step a question the app can actually ask and mark. */
import { CONCEPTS, CONCEPT_OF, LEVELS, ageOf, matrix } from '../src/levels.js';
import { TRICKS, byId, correct, parseNum } from '../src/tricks.js';
import { seeded } from '../src/rand.js';

let fails = 0;
const bad = (m) => { fails++; if (fails < 40) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) bad(m); };

/* ---- concepts */
const cids = CONCEPTS.map((c) => c.id);
ok(CONCEPTS.length >= 10 && CONCEPTS.length <= 14, `need 10–14 concepts, have ${CONCEPTS.length}`);
ok(new Set(cids).size === cids.length, 'duplicate concept id');
for (const c of CONCEPTS) ok(c.id && c.name && c.glyph, `concept ${c.id} needs id, name and glyph`);

/* ---- every stop has exactly one concept, and nothing else does */
for (const t of TRICKS) ok(cids.includes(CONCEPT_OF[t.id]), `${t.id}: no concept (or unknown concept ${CONCEPT_OF[t.id]})`);
for (const id of Object.keys(CONCEPT_OF)) ok(byId[id], `CONCEPT_OF names ${id}, which is not a stop`);
for (const c of cids) ok(TRICKS.some((t) => CONCEPT_OF[t.id] === c), `concept ${c} has no stops`);

/* ---- the ten levels */
ok(LEVELS.length === 10, `need 10 levels, have ${LEVELS.length}`);
const AGES = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15+'];
LEVELS.forEach((l, i) => {
  ok(l.n === i + 1, `level ${i}: n should be ${i + 1}`);
  ok(l.age === AGES[i], `level ${l.n}: age should be '${AGES[i]}'`);
  ok(ageOf(l.n) === `maths age ${AGES[i]}`, `ageOf(${l.n}) is "${ageOf(l.n)}"`);
  ok(typeof l.name === 'string' && l.name.length > 3 && l.name.length <= 28, `level ${l.n}: needs a short name`);
  ok(typeof l.blurb === 'string' && l.blurb.length > 20 && /\.$/.test(l.blurb), `level ${l.n}: needs a one-sentence blurb`);
  ok(l.steps.length >= 12 && l.steps.length <= 22, `level ${l.n}: ${l.steps.length} steps, need 12–22`);
});

/* ---- steps: real stops, a real lv, no repeats, the spiral only climbs, nothing before its band */
const BAND_FLOOR = { '6-7': 1, '8-10': 3, '11-14': 6 };
const order = Object.fromEntries(TRICKS.map((t, i) => [t.id, i]));
const first = {}, lastLv = {};
let steps = 0;
for (const l of LEVELS) {
  const seen = new Set();
  const lastInWorld = {};
  for (const s of l.steps) {
    steps++;
    const t = byId[s.stop];
    ok(t, `level ${l.n}: no such stop ${s.stop}`);
    if (!t) continue;
    ok([1, 2, 3].includes(s.lv), `level ${l.n}: ${s.stop} has lv ${s.lv}`);
    ok(!seen.has(s.stop), `level ${l.n}: ${s.stop} twice in one level`); seen.add(s.stop);
    if (first[s.stop] === undefined) {
      first[s.stop] = l.n;
      ok(l.n >= BAND_FLOOR[t.band], `${s.stop} (band ${t.band}) first met in level ${l.n}, before its band`);
      ok(s.lv < 3, `${s.stop}: lv 3 on first meeting (level ${l.n}) — the stretch comes a level later`);
    } else {
      ok(s.lv >= lastLv[s.stop], `${s.stop}: lv goes down from ${lastLv[s.stop]} to ${s.lv} in level ${l.n}`);
    }
    lastLv[s.stop] = s.lv;
    // prerequisites first: inside a level, a world's stops come in the world's own teaching order
    const prev = lastInWorld[t.world];
    ok(prev === undefined || order[prev] < order[s.stop], `level ${l.n}: ${s.stop} comes after ${prev}, but ${t.world} teaches ${s.stop} first`);
    lastInWorld[t.world] = s.stop;
  }
}
const missing = TRICKS.filter((t) => first[t.id] === undefined).map((t) => t.id);
ok(!missing.length, `stops on no journey: ${missing.join(', ')}`);

/* ---- a spiral, not a list */
const span = Object.fromEntries(cids.map((c) => [c, new Set()]));
for (const l of LEVELS) {
  const here = new Set(l.steps.map((s) => CONCEPT_OF[s.stop]));
  ok(here.size >= 4, `level ${l.n} touches only ${here.size} concepts`);
  for (const c of here) span[c] && span[c].add(l.n);
}
for (const c of cids) ok(span[c].size >= 2, `concept ${c} is in only ${span[c].size} level(s)`);
const spiral = cids.filter((c) => span[c].size >= 5);
ok(spiral.length >= 6, `only ${spiral.length} concepts span 5+ levels (need 6)`);

/* ---- Level 10 is the stretch */
const top = LEVELS[9];
const lv3 = top.steps.filter((s) => s.lv === 3).length;
ok(lv3 >= top.steps.length * 0.75, `level 10: only ${lv3} of ${top.steps.length} steps at lv 3`);
for (const id of ['tan-height', 'sin-cos-side', 'special-angles', 'pythagoras-side', 'index-laws', 'rational-roots',
  'inequalities', 'interest-compound', 'nth-term', 'solve-balance']) {
  ok(top.steps.some((s) => s.stop === id && s.lv === 3), `level 10 lacks ${id} at lv 3`);
}
const topConcepts = new Set(top.steps.filter((s) => first[s.stop] < 10).map((s) => CONCEPT_OF[s.stop]));
ok(topConcepts.size >= 8, `level 10 revisits only ${topConcepts.size} concepts at lv 3`);

/* ---- every step can be asked and marked: 20 questions each, three routes agree */
let qn = 0;
for (const l of LEVELS) for (const s of l.steps) {
  const t = byId[s.stop]; if (!t) continue;
  const r = seeded(`${l.n}:${s.stop}`);
  for (let i = 0; i < 20; i++) {
    let q;
    try { q = t.gen(r, s.lv); } catch (e) { ok(false, `level ${l.n}: ${s.stop} gen(lv ${s.lv}) throws ${e.message}`); break; }
    qn++;
    const plain = Function(`return (${q.expr})`)();
    const want = q.choices ? q.ans : typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
    ok(q.choices ? plain === q.ans : Math.abs(plain - want) < 1e-9, `${s.stop} lv ${s.lv}: ${q.text} ans ${q.ans}, arithmetic says ${plain}`);
    const last = t.work(q).at(-1).v;
    ok(q.choices ? last === q.ans : Math.abs((typeof last === 'number' ? last : parseNum(last)) - want) < 1e-9, `${s.stop} lv ${s.lv}: ${q.text} trick ends on ${last}, answer ${q.ans}`);
    ok(correct(q, String(q.ans)), `${s.stop} lv ${s.lv}: correct() rejects its own answer`);
    if (!q.choices) ok(!correct(q, String(want + 1)), `${s.stop} lv ${s.lv}: correct() accepts a wrong answer`);
    ok(!/undefined|NaN/.test(q.text), `${s.stop} lv ${s.lv}: text leaks undefined/NaN`);
  }
}

/* ---- the map the lead draws holds every step, once, in the right cell */
const m = matrix();
ok(m.concepts.length === CONCEPTS.length && m.levels.length === 10, 'matrix(): wrong shape');
let cellSteps = 0;
for (const c of cids) for (const l of LEVELS) {
  const cell = m.cells[c] && m.cells[c][l.n];
  ok(Array.isArray(cell), `matrix(): no cell ${c}/${l.n}`);
  if (!cell) continue;
  cellSteps += cell.length;
  for (const x of cell) ok(CONCEPT_OF[x.stop] === c && x.title === byId[x.stop].title && l.steps.some((s) => s.stop === x.stop && s.lv === x.lv), `matrix(): ${x.stop} misfiled in ${c}/${l.n}`);
}
ok(cellSteps === steps, `matrix(): ${cellSteps} cells entries for ${steps} steps`);

const stops = Object.keys(first).length;
console.log(fails
  ? `FAIL levels — ${fails} problem(s)`
  : `ok levels — 10 levels, ${steps} steps, ${stops} stops, ${spiral.length} concepts spiral across ≥5 levels (${qn} questions checked)`);
if (fails) process.exit(1);
