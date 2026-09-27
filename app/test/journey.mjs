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
for (const s of p.steps) res = J.passed(k, s.stop, s.lv);
ok(res.finished && res.from === 3 && res.to === 4 && J.rec(k).level === 4, 'finishing every step moves the child to the next level');
ok(J.rec(k).finished.includes(3), 'the finished level is remembered');
J.place(k, 10); for (const s of J.levelOf(10).steps) res = J.passed(k, s.stop, s.lv);
ok(res.finished && J.rec(k).level === 10, 'the last journey finishes and stays at the top');
// a second child never inherits the first one's journey
const k2 = newKid('Ben', '6-7', 'froggy');
ok(J.progress(k2) === null && Object.keys(J.rec(k2).done).length === 0, "a second child starts with nobody's journey");
// storage: a v4 household gains an empty journey
const h4 = { v: 4, kids: [{ ...newKid('Old', '8-10', 'koi'), journey: undefined }], active: null, parent: {} };
const h5 = migrate(h4);
ok(h5.v >= 5 && h5.kids[0].journey && h5.kids[0].journey.level === null, 'v4 → v5 adds an unplaced journey');

console.log(`${fails ? 'FAIL' : 'ok'} journey — the staircase places ${3 * 11} known children exactly, ${n} checks`);
if (fails) process.exit(1);
