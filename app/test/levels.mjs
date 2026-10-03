/* test/levels.mjs — the ten journeys hold their promises.

   Ten levels, one per maths age; each a road of four to six lands, a land one
   concept area long enough for a 20-question test; every stop somewhere; a
   stop comes back only harder; nothing before its band; prerequisites first;
   a spiral of lands, not a list; Level 10 a real stretch; and every step a
   question the app can actually ask and mark. */
import { existsSync } from 'node:fs';
import { CONCEPTS, CONCEPT_OF, LEVELS, NEEDS, ageOf, landsOf, matrix } from '../src/levels.js';
import { TRICKS, WORLDS, byId, correct, parseNum } from '../src/tricks.js';
import { seeded } from '../src/rand.js';

let fails = 0;
const bad = (m) => { fails++; if (fails < 40) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) bad(m); };

/* ---- concepts */
const cids = CONCEPTS.map((c) => c.id);
ok(CONCEPTS.length >= 10 && CONCEPTS.length <= 15, `need 10–15 concepts, have ${CONCEPTS.length}`);   // 15th: Contest thinking (owner, 3 Oct 2026)
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
  ok(l.steps.length >= 16 && l.steps.length <= 32, `level ${l.n}: ${l.steps.length} steps, need 16–32`);
});

/* ---- the Contest Hall's thirty strategies are on the hall's road AND on the journeys, as
   the Contest thinking land of every level from 4 (owner, 3 Oct 2026) */
const HALLT = TRICKS.filter((t) => (WORLDS.find((w) => w.id === t.world) || {}).track === 'contest');
ok(HALLT.length === 30 && HALLT.every((t) => CONCEPT_OF[t.id] === 'contest'), `the thirty contest-track stops are the Contest thinking concept (${HALLT.length})`);
ok(LEVELS.filter((l) => l.n >= 4).every((l) => l.lands.some((d) => d.concept === 'contest')), 'every level from 4 has a Contest thinking land');

/* ---- lands: each level a road of 4–7 lands (the seventh, from Level 4, the Contest Hall's), each land one concept area with a testable spread */
const wids = WORLDS.map((w) => w.id);
const landIds = new Set();
ok(landsOf(0).length === 0 && landsOf(11).length === 0, 'landsOf(): a level that does not exist has no lands');
for (const l of LEVELS) {
  ok(Array.isArray(l.lands) && landsOf(l.n) === l.lands, `level ${l.n}: landsOf(${l.n}) is not its lands`);
  if (!Array.isArray(l.lands)) continue;
  ok(l.lands.length >= 4 && l.lands.length <= 7, `level ${l.n}: ${l.lands.length} lands, need 4–7`);
  const flat = l.lands.flatMap((d) => d.steps);
  ok(flat.length === l.steps.length && flat.every((s, i) => s.stop === l.steps[i].stop && s.lv === l.steps[i].lv), `level ${l.n}: steps is not its lands laid end to end`);
  l.lands.forEach((d, i) => {
    ok(typeof d.id === 'string' && !landIds.has(d.id), `level ${l.n}: land id ${d.id} missing or repeated`); landIds.add(d.id);
    ok(cids.includes(d.concept), `${d.id}: unknown concept ${d.concept}`);
    ok(typeof d.name === 'string' && d.name.length > 3 && d.name.length <= 30, `${d.id}: needs a short child-facing name (≤ 30), has "${d.name}"`);
    ok(wids.includes(d.world), `${d.id}: world ${d.world} is not an Atlas world`);
    ok(existsSync(new URL(`../public/art/w-${d.world}.webp`, import.meta.url)), `${d.id}: world ${d.world} has no painting`);
    ok(d.steps.length >= 3 && d.steps.length <= 6, `${d.id}: ${d.steps.length} steps, need 3–6 for a 20-question land test`);
    ok(new Set(d.steps.map((s) => s.stop)).size >= 3, `${d.id}: fewer than 3 distinct stops — too thin for a land test`);
    const own = d.steps.filter((s) => CONCEPT_OF[s.stop] === d.concept).length;
    ok(own * 2 >= d.steps.length, `${d.id}: only ${own} of ${d.steps.length} steps are ${d.concept} — the land is not that concept`);
    if (i > 0) ok(l.lands[i - 1].concept !== d.concept, `level ${l.n}: ${l.lands[i - 1].id} and ${d.id} are the same concept back to back`);
    // prerequisites first: no land comes before a later land its concept needs
    for (const e of l.lands.slice(i + 1)) ok(!(NEEDS[d.concept] || []).includes(e.concept), `level ${l.n}: ${d.id} needs ${e.concept}, which comes later (${e.id})`);
  });
}
for (const c of cids) ok(Array.isArray(NEEDS[c]) && NEEDS[c].every((x) => cids.includes(x) && x !== c), `NEEDS.${c} missing or names an unknown concept`);

/* ---- steps: real stops, a real lv, no repeats, the spiral only climbs, nothing before its band */
const BAND_FLOOR = { '6-7': 1, '8-10': 3, '11-14': 6 };
const order = Object.fromEntries(TRICKS.map((t, i) => [t.id, i]));
const first = {}, lastLv = {};
let steps = 0;
for (const l of LEVELS) {
  const seen = new Set();
  for (const d of l.lands || []) { const lastInWorld = {}; for (const s of d.steps) {
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
    // prerequisites first: inside a land, a world's stops come in the world's own teaching order
    const prev = lastInWorld[t.world];
    ok(prev === undefined || order[prev] < order[s.stop], `${d.id}: ${s.stop} comes after ${prev}, but ${t.world} teaches ${s.stop} first`);
    lastInWorld[t.world] = s.stop;
  } }
}
const missing = TRICKS.filter((t) => first[t.id] === undefined).map((t) => t.id);
ok(!missing.length, `stops on no journey: ${missing.join(', ')}`);
ok(steps === LEVELS.reduce((a, l) => a + l.steps.length, 0), 'a step sits in no land');

/* ---- a spiral, not a list: concepts come back as lands */
const span = Object.fromEntries(cids.map((c) => [c, new Set()]));
for (const l of LEVELS) {
  const here = new Set(l.steps.map((s) => CONCEPT_OF[s.stop]));
  ok(here.size >= 4, `level ${l.n} touches only ${here.size} concepts`);
  for (const d of l.lands || []) span[d.concept] && span[d.concept].add(l.n);
}
for (const c of cids) ok(span[c].size >= 2, `concept ${c} is a land in only ${span[c].size} level(s)`);
const spiral = cids.filter((c) => span[c].size >= 5);
ok(spiral.length >= 6, `only ${spiral.length} concepts are lands in 5+ levels (need 6)`);

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
  : `ok levels — 10 levels, ${landIds.size} lands, ${steps} steps, ${stops} stops, ${spiral.length} concepts spiral across ≥5 levels (${qn} questions checked)`);
if (fails) process.exit(1);
