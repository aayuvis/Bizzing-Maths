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
// every station passed: the check opens, but only the check moves the level
for (const s of p.steps) res = J.passed(k, s.stop, s.lv);
ok(res.checkOpen && J.rec(k).level === 3, 'all stations passed: the level check opens, the level has not moved');
const items = J.checkItems(k, seeded('chk'));
ok(items.length === J.CHECK_N && items.every((q) => J.levelOf(3).steps.some((s) => s.stop === q.trick) && correct(q, String(q.ans))), 'the level check asks gradable questions from this level only');
ok(!J.checkPassed(k, J.CHECK_PASS - 1).moved && J.rec(k).level === 3, `${J.CHECK_PASS - 1} of ${J.CHECK_N} does not pass the check`);
res = J.checkPassed(k, J.CHECK_PASS);
ok(res.moved && res.from === 3 && res.to === 4 && J.rec(k).level === 4 && J.rec(k).finished.includes(3), `${J.CHECK_PASS} of ${J.CHECK_N} passes: on to Level 4`);
ok(!J.checkPassed(k, J.CHECK_N).moved, 'the Level 4 check cannot be passed before its stations');
J.place(k, 10); for (const s of J.stepsOf(J.rec(k), 10)) J.passed(k, s.stop, s.lv);
res = J.checkPassed(k, J.CHECK_N);
ok(J.rec(k).level === 10 && J.rec(k).finished.includes(10), 'the last check finishes the last road and stays at the top');
// placed above Level 1 → a recap of the level below comes first; climbing up → no recap
const kr = newKid('Cai', '11-14', 'koi'); J.place(kr, 6);
let pr = J.progress(kr), rc = J.recapOf(6);
ok(rc.length >= 4 && pr.steps.slice(0, rc.length).every((s) => s.recap) && pr.steps.length === rc.length + J.levelOf(6).steps.length, 'placed at Level 6: the road opens with a recap of Level 5');
ok(rc.every((s) => J.levelOf(5).steps.some((x) => x.stop === s.stop && x.lv === s.lv)), 'every recap station is a real Level 5 step');
ok(new Set(rc.map((s) => s.stop)).size === rc.length, 'one recap station per idea, no repeats');
for (const s of J.levelOf(6).steps) res = J.passed(kr, s.stop, s.lv);
ok(!res.checkOpen, 'the check stays shut while the recap is still to do');
for (const s of rc) res = J.passed(kr, s.stop, s.lv);
ok(res.checkOpen && J.checkPassed(kr, J.CHECK_N).moved && J.rec(kr).level === 7, 'recap done too: the check passes and Level 7 opens');
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
// a second child never inherits the first one's journey
const k2 = newKid('Ben', '6-7', 'froggy');
ok(J.progress(k2) === null && Object.keys(J.rec(k2).done).length === 0, "a second child starts with nobody's journey");
// storage: a v4 household gains an empty journey
const h4 = { v: 4, kids: [{ ...newKid('Old', '8-10', 'koi'), journey: undefined }], active: null, parent: {} };
const h5 = migrate(h4);
ok(h5.v >= 5 && h5.kids[0].journey && h5.kids[0].journey.level === null, 'v4 → v5 adds an unplaced journey');

console.log(`${fails ? 'FAIL' : 'ok'} journey — the staircase places ${3 * 11} known children exactly, ${n} checks`);
if (fails) process.exit(1);
