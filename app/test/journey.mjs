/* test/journey.mjs — the level test places a child where they are, and a
   finished journey moves them on. The staircase is driven by simulated
   children whose ability is known, so "right level" is a fact, not a hope. */
import * as J from '../src/journey.js';
import { newKid } from '../src/model.js';
import { migrate } from '../src/store.js';
import { byId, correct } from '../src/tricks.js';
import { seeded } from '../src/rand.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; if (fails < 25) console.error('  ✗ ' + m); } };

ok(J.TOP === 10, 'ten levels');
// a child who knows everything up to level `can`, and nothing above it — from every starting band
for (const band of ['6-7', '8-10', '11-14']) for (let can = 0; can <= 10; can++) {
  const st = J.newTest(band), r = seeded(`t${band}${can}`);
  let q = J.question(st, r), asked = 1;
  while (J.answer(st, q.tlevel <= can)) { q = J.question(st, r); asked++; ok(asked < 40, `${band}/${can}: the test runs on`); if (asked > 40) break; }
  const want = Math.min(10, Math.max(1, can + 1)) ;
  ok(st.done && st.result === (can >= 10 ? 10 : want), `${band}: a child secure to level ${can} is placed at ${st.result}, want ${can >= 10 ? 10 : want}`);
  ok(asked <= 30, `${band}/${can}: ${asked} questions is too many`);
}
// a child who gets one in three wrong everywhere still lands somewhere sane, and the test always ends
for (let i = 0; i < 300; i++) {
  const r = seeded('noisy' + i), st = J.newTest(['6-7', '8-10', '11-14'][i % 3]); let q = J.question(st, r), c = 0;
  while (J.answer(st, r() < 0.66)) { q = J.question(st, r); if (++c > 60) break; }
  ok(st.done && st.result >= 1 && st.result <= 10, `noisy child ${i} ends placed (${st.result})`);
}
// every question the test can ask is a real, gradable question at its step's level
for (const L of J.LEVELS) for (let i = 0; i < 12; i++) {
  const st = { L: L.n, at: {}, used: [] }, q = J.question(st, seeded(`q${L.n}${i}`));
  ok(q.tlevel === L.n && byId[q.trick] && correct(q, String(q.ans)), `level ${L.n}: question ${q.text} grades its own answer`);
  // and a child can TYPE it: the keypad has every key the answer needs (caught "3/6" typed as "36")
  const a = String(q.ans), keys = q.keys || [];
  if (!q.choices) ok((!a.includes('/') || keys.includes('/')) && (!a.includes('.') || keys.includes('.')) && (!/^[-−]/.test(a) || keys.includes('−')), `level ${L.n}: ${q.text} needs keys the keypad does not show (${a})`);
}
// the journey: ticking steps, finishing a level, moving on
const k = newKid('Ada', '8-10', 'koi');
ok(J.progress(k) === null, 'nobody is on a journey before the test');
J.place(k, 3);
let p = J.progress(k);
ok(p.level === 3 && p.done === 0 && p.next, 'placed at level 3 with nothing done');
const first = p.steps[0];
J.passed(k, first.stop, first.lv - 1 || 0);
ok(J.progress(k).done === (first.lv === 1 ? 0 : 0), 'a drill passed EASIER than the step does not tick it');
J.passed(k, first.stop, 3);
ok(J.progress(k).steps[0].done, 'a drill passed at a harder level ticks the step');
let res;
// the road is linear: station 2 waits for station 1
const k3 = newKid('Fin', '8-10', 'koi'); J.place(k3, 1);
let p3 = J.progress(k3);
ok(p3.steps[0].open && !p3.steps[1].open && !p3.steps.at(-1).open, 'only the first station of the road is open');
J.passed(k3, p3.steps[0].stop, p3.steps[0].lv);
p3 = J.progress(k3);
ok(p3.steps[1].open && !p3.steps[2].open, 'passing station 1 opens station 2, and only that');
// lands: a land's test opens after its stations; the next land after its test
const allRight = (items) => items.map(() => ({ right: true })), coreOnly = (items, n) => items.map((q, i) => ({ right: !q.bonus && i < n }));
const walkLand = (kk, land) => { for (const s of land.steps) J.passed(kk, s.stop, s.lv); };
J.rec(k).recap = null;                 // for this part, a child who CLIMBED to Level 3 (no recap)
const lands3 = J.landsOf(3);
ok(lands3.length >= 2 && lands3.every((l) => l.steps.length >= 1), 'Level 3 is a road of lands');
walkLand(k, lands3[0]);
let pk = J.progress(k);
ok(pk.nextTest && pk.nextTest.kind === 'landtest' && pk.nextTest.land.id === lands3[0].id, 'a land passed station by station opens its land test');
ok(!pk.nodes.find((x) => x.kind === 'stop' && x.land === lands3[1].id).open, 'the next land stays shut until the land test is passed');
const li = J.landTestItems(k, lands3[0].id, seeded('land'));
ok(li.length === J.LAND_N + J.LAND_BONUS && li.filter((q) => q.bonus).length === J.LAND_BONUS, `a land test is ${J.LAND_N} questions and ${J.LAND_BONUS} bonus`);
ok(li.every((q) => lands3[0].steps.some((s) => s.stop === q.trick) && correct(q, String(q.ans))), 'every land test question comes from the land and grades its own answer');
ok(li.slice(0, J.LAND_N).every((q, i, a) => !i || q.qlv >= a[i - 1].qlv), 'the core questions get harder as they go, never easier');
ok(li.filter((q) => q.bonus).every((q) => q.qlv >= Math.max(...li.slice(0, J.LAND_N).map((x) => x.qlv))), 'bonus questions are the hardest');
let sc = J.landTestDone(k, lands3[0].id, li, coreOnly(li, J.LAND_PASS - 1));
ok(!sc.pass && !J.progress(k).nodes.find((x) => x.kind === 'stop' && x.land === lands3[1].id).open, `${J.LAND_PASS - 1} of ${J.LAND_N} does not pass; the next land stays shut`);
sc = J.landTestDone(k, lands3[0].id, li, li.map((q, i) => ({ right: q.bonus || i < J.LAND_PASS - 1 })));
ok(!sc.pass && sc.points === J.LAND_PASS - 1 + 2 * J.LAND_BONUS, 'bonus answers add double points but never turn a fail into a pass');
sc = J.landTestDone(k, lands3[0].id, li, coreOnly(li, J.LAND_PASS));
ok(sc.pass && sc.first && J.progress(k).nodes.find((x) => x.kind === 'stop' && x.land === lands3[1].id).open, `${J.LAND_PASS} of ${J.LAND_N} passes and opens the next land`);
ok(J.landTestDone(k, lands3[0].id, li, allRight(li)).stars === 3, 'every question and the bonus right: three stars');
// the level test: after every land; 50 mixed + 10 bonus; 30 passes and moves the level
for (const land of lands3) { walkLand(k, land); J.landTestDone(k, land.id, li, coreOnly(li, J.LAND_N)); }
pk = J.progress(k);
ok(pk.nextTest && pk.nextTest.kind === 'leveltest' && J.rec(k).level === 3, 'every land passed: the level test opens; the level has not moved');
const lt = J.levelTestItems(k, seeded('lvl'));
ok(lt.length === J.LEVEL_N + J.LEVEL_BONUS && lands3.every((l) => lt.some((q) => l.steps.some((s) => s.stop === q.trick))), `the level test is ${J.LEVEL_N} + ${J.LEVEL_BONUS} questions mixed from every land`);
ok(!J.levelTestDone(k, lt, coreOnly(lt, J.LEVEL_PASS - 1)).moved && J.rec(k).level === 3, `${J.LEVEL_PASS - 1} of ${J.LEVEL_N} does not move the level`);
res = J.levelTestDone(k, lt, coreOnly(lt, J.LEVEL_PASS));
ok(res.moved && res.from === 3 && res.to === 4 && J.rec(k).finished.includes(3), `${J.LEVEL_PASS} of ${J.LEVEL_N} passes: on to Level 4`);
ok(!J.levelTestDone(k, lt, allRight(lt)).moved, 'the Level 4 test cannot be taken before its road');
// earlier roads stay open; later ones are shut
ok(J.roadOf(k, 1).every((x) => x.open) && J.roadOf(k, 3).every((x) => x.open), 'a Level 4 child can walk the whole Level 1 and Level 3 roads again');
ok(J.roadOf(k, 5).every((x) => !x.open), 'the Level 5 road is shut to a Level 4 child');
// the top
J.place(k, 10); for (const x of J.roadOf(k, 10)) if (x.kind === 'stop') J.passed(k, x.stop, x.lv);
for (const land of J.landsOf(10)) J.landTestDone(k, land.id, li, coreOnly(li, J.LAND_N));
res = J.levelTestDone(k, J.levelTestItems(k, seeded('top')), coreOnly(lt, J.LEVEL_N));
ok(J.rec(k).level === 10 && J.rec(k).finished.includes(10), 'the last test finishes the last road and stays at the top');
// placed above Level 1 → a recap of the level below comes first; climbing up → no recap
const kr = newKid('Cai', '11-14', 'koi'); J.place(kr, 6);
let pr = J.progress(kr), rc = J.recapOf(6);
ok(rc.length >= 4 && pr.steps.slice(0, rc.length).every((s) => s.recap) && pr.steps.length === rc.length + J.levelOf(6).steps.length, 'placed at Level 6: the road opens with a recap of Level 5');
ok(rc.every((s) => J.levelOf(5).steps.some((x) => x.stop === s.stop && x.lv === s.lv)), 'every recap station is a real Level 5 step');
ok(new Set(rc.map((s) => s.stop)).size === rc.length, 'one recap station per idea, no repeats');
for (const x of J.roadOf(kr, 6)) if (x.kind === 'stop' && !x.recap) J.passed(kr, x.stop, x.lv);
for (const land of J.landsOf(6)) J.landTestDone(kr, land.id, li, coreOnly(li, J.LAND_N));
ok(!(J.progress(kr).nextTest && J.progress(kr).nextTest.kind === 'leveltest'), 'the level test stays shut while the recap is still to do');
for (const s of rc) J.passed(kr, s.stop, s.lv);
ok(J.levelTestDone(kr, lt, coreOnly(lt, J.LEVEL_N)).moved && J.rec(kr).level === 7, 'recap done too: the level test passes and Level 7 opens');
ok(J.progress(kr).steps.every((s) => !s.recap), 'a child who CLIMBED to Level 7 gets no recap');
const k1 = newKid('Dee', '6-7', 'koi'); J.place(k1, 1);
ok(J.progress(k1).steps.every((s) => !s.recap), 'Level 1 has nothing below it to recap');
// the Atlas follows the road: earlier levels all open; this level only as far as the road; later levels shut
const { isOpen, ROUTE, levelOpen, firstLevel } = await import('../src/model.js');
const ka = newKid('Eli', '8-10', 'koi'), ha = { parent: { tester: false }, kids: [ka], active: ka.id };
J.place(ka, 6);
const idx = (id) => ROUTE.findIndex((n) => n.id === id);
const earlier = ROUTE.filter((n) => n.kind === 'stop' && firstLevel(n.id) < 6);
ok(earlier.every((n) => isOpen(ha, ka, idx(n.id))), 'placed at Level 6: every lesson first taught in Levels 1–5 is open in the Atlas');
const road = J.progress(ka).steps, firstShut = road.find((s) => !s.open && firstLevel(s.stop) === 6);
ok(road[0].open && isOpen(ha, ka, idx(road[0].stop)), 'the first station of the road is open in the Atlas');
ok(firstShut && !isOpen(ha, ka, idx(firstShut.stop)), 'a Level 6 station the road has not reached is shut in the Atlas');
const later = ROUTE.filter((n) => n.kind === 'stop' && firstLevel(n.id) > 6);
ok(later.length && later.every((n) => !isOpen(ha, ka, idx(n.id))), 'lessons first taught after Level 6 are shut');
// the secrets: three per land, on the painting, the rival a real one — for any child id
const { bot } = await import('../src/contest.js');
for (let i = 0; i < 400; i++) {
  const kk = { ...newKid('S' + i, '8-10', 'koi'), id: 'k' + (i * 7919).toString(36) + i };
  for (const land of J.landsOf(1 + (i % 10))) {
    const ss = J.secretsOf(kk, land.id);
    ok(ss.length === 3 && new Set(ss.map((x) => x.k)).size === 3, 'three different secrets per land');
    ok(ss.every((x) => x.x >= 8 && x.x <= 92 && x.y >= 15 && x.y <= 50), `secrets sit on the painting, above the road (${ss.map((x) => x.x + ',' + x.y)})`);
    ok(bot(ss[0].rival), `the rival is one of the ten (${ss[0].rival})`);
  }
}
// a second child never inherits the first one's journey
const k2 = newKid('Ben', '6-7', 'froggy');
ok(J.progress(k2) === null && Object.keys(J.rec(k2).done).length === 0, "a second child starts with nobody's journey");
// storage: a v4 household gains an empty journey
const h4 = { v: 4, kids: [{ ...newKid('Old', '8-10', 'koi'), journey: undefined }], active: null, parent: {} };
const h5 = migrate(h4);
ok(h5.v >= 5 && h5.kids[0].journey && h5.kids[0].journey.level === null, 'v4 → v5 adds an unplaced journey');

// A6 (audit v4): the placement is explained with one real question from the child's own test
{ const st = J.newTest('8-10'), r = seeded('a6'), items = [], results = [];
  let q = J.question(st, r); items.push(q);
  for (;;) { const right = q.tlevel <= 4; results.push({ right }); if (!J.answer(st, right)) break; q = J.question(st, r); items.push(q); }
  const why = J.placedBecause(items, results, st.result);
  ok(st.result === 5 && why && items.some((x, i) => results[i].right && String(x.text) === why.text && String(x.ans) === why.ans), `the example is a question from the test, answered right (${why && why.text})`);
  const short = items.filter((x, i) => results[i].right && String(x.text).length <= 40);
  ok(why && why.level === (short.length ? Math.max(...short.map((x) => x.tlevel)) : 4) && (!short.length || why.text.length <= 40), 'it is the hardest level they got right that reads in a sentence');
  ok(J.placedBecause(items, results.map(() => ({ right: false })), 1) === null, 'nothing right: no example is made up'); }
// L4 (audit v4): a level-up scene is owed for a level CLIMBED to, from the record, and shown once
{ const k = newKid('U', '8-10'); J.place(k, 5);
  ok(J.upsToSee(k).length === 0, 'a child PLACED at Level 5 climbed nothing, so no scene');
  const old = newKid('O', '6-7'); Object.assign(J.rec(old), { level: 3, finished: [1, 2] });
  ok(J.upsToSee(old).length === 0 && J.rec(old).seenUp.join() === '2,3', 'climbs already in an old record count as seen — no parade');
  const j = J.rec(old); j.finished.push(3); j.level = 4;
  ok(J.upsToSee(old).join() === '4', 'finishing Level 3 owes the Level 4 scene');
  ok(J.upsToSee(old).join() === '4', '…until it is shown (reading it does not mark it seen)');
  J.sawUp(old, 4); ok(J.upsToSee(old).length === 0, 'shown once, never again');
  const top = newKid('T', '11-14'); Object.assign(J.rec(top), { level: 10, finished: [9], seenUp: [] });
  ok(J.upsToSee(top).join() === '10', 'Level 10 is owed its scene'); top.journey.finished.push(10);
  ok(J.upsToSee(top).join() === '10', 'finishing Level 10 opens no Level 11');
  // the real path: a level test passed by a record that has never been read for scenes
  const w = newKid('W', '6-7'); J.place(w, 2); const jw = J.rec(w); jw.tests = {};
  for (const x of J.progress(w).nodes) { if (x.kind === 'stop') jw.done[`${x.stop}@${x.lv}`] = true; if (x.kind === 'landtest') jw.tests[`L2:${x.land.id}`] = { passed: true, best: 20, stars: 2 }; }
  const its = J.levelTestItems(w), sc = J.levelTestDone(w, its, its.map(() => ({ right: true })));
  ok(sc.moved && sc.to === 3 && J.upsToSee(w).join() === '3', 'passing the Level 2 test owes the Level 3 scene, even on a record never read before');
  const u = J.upScene(4); ok(u.name === J.levelOf(4).name && u.world === J.landsOf(4)[0].world, 'the scene shows the level\'s name and its first land\'s plate'); }
/* the placement sentence reads as English for every kind of question (a compare box once came out "45,059 ☐ 45,059 = =") */
{ const { saidRight } = await import('../src/journey.js');
  const cases = [[{ text: '45,059 ☐ 45,059', ans: '=' }, '45,059 = 45,059'], [{ text: 'What is 7 × 8?', ans: 56 }, 'What is 7 × 8? 56'], [{ text: '5 × 4', ans: 20 }, '5 × 4 = 20']];
  for (const [q, want] of cases) { const got = saidRight(q); if (got !== want) { fails++; console.error(`  ✗ placement reads "${got}", want "${want}"`); } } }

console.log(`${fails ? 'FAIL' : 'ok'} journey — the staircase places ${3 * 11} known children exactly, ${n} checks`);
if (fails) process.exit(1);
