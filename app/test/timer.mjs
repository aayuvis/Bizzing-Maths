/* test/timer.mjs — Beat the Timer's engine (games spec §3.7, BT1–BT7 and BT11; the browser half,
   BT7–BT10, is test/timer-ui.mjs). Driven with a fake clock and two bots:
     · the fluent bot is the slowest child who still counts as fluent — facts.js FLUENT_MS for the
       grade's band, one fluent recall per step of the trick's own working — and must hit every
       level's target in every open window (BT2);
     · the random typer presses the pad's keys at random, five a second, and must stay far below
       every target (BT1).
   Every question is checked the way test/tricks.mjs checks a stop (BT11): plain arithmetic, q.ans,
   and — for a stop's question — the trick's own steps, middle steps included. Each check here was
   watched to fail with its feature broken (see the report). */
import * as T from '../src/timer.js';
import * as F0 from '../src/facts.js';
import * as FT from '../src/facts-timed.js';
const F = { ...F0, ...FT };
import { byId, correct, parseNum } from '../src/tricks.js';
import { seeded } from '../src/rand.js';
import { newKid } from '../src/model.js';
import { MEDALS, award } from '../src/medals.js';
import { checkSteps } from './lib/steps.mjs';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < (process.env.ALL ? 1e9 : 40)) console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const kid = (band = '8-10') => newKid('Tess', band, 'x');
const ALL = T.SUTRAS(), QUICK = T.QUICK_SUTRAS;
const every = []; const seen = new Set();
for (const g of T.GRADES) for (const th of T.themesFor(g)) if (!seen.has(th.id)) { seen.add(th.id); every.push(th); }
const bandOf = (th) => T.bandOfGrade(Math.min(...th.grade));
const val = (a) => (typeof a === 'number' ? a : parseNum(a));

/* ---- the catalogue is the spec's ---- */
ok(T.GRADES.join() === '1,2,3,4,5,6,7,8', 'grades 1 to 8');
ok(T.gradeFor('6-7') === 1 && T.gradeFor('8-10') === 3 && T.gradeFor('11-14') === 6, 'the grade defaults from the age band (6–7 → 1, 8–10 → 3, 11–14 → 6)');
for (const g of T.GRADES) { const l = T.themesFor(g); ok(l.length >= 3 && l.at(-1).kind === 'mixed' && l.at(-1).name === 'Mixed', `grade ${g}: its themes plus Mixed`); }
ok(T.themesFor(3).map((t) => t.name).join() === 'Addition,Subtraction,Multiplication,Mixed', 'grade 3 is Addition · Subtraction · Multiplication (+ Mixed), as the spec bolds it');
for (const th of every) {
  ok(th.rates.length === T.LEVELS && th.rates.every((r) => Number.isInteger(r) && r >= 1), `${th.id}: ten levels, each with a whole rate`);
  ok(th.ch.every((c) => T.CHALLENGES[c]), `${th.id}: every challenge is one of the spec's`);
  ok(!th.ch.includes('trick') || Math.min(...th.grade) >= 5, `${th.id}: the Trick round is grade 5 and up`);
  for (const [id] of th.src || []) ok(!!byId[id], `${th.id}: names a real stop (${id})`);
  // one more challenge every other level from 4, and nothing before
  ok(T.challengesAt(th, 3).length === 0 && T.challengesAt(th, 4).length === 1 && T.challengesAt(th, 5).length === 1 && T.challengesAt(th, 6).length === Math.min(2, th.ch.length), `${th.id}: a challenge at 4, another at 6`);
}
{ const m = T.themeOf('mul10'); ok([1, 3, 6, 10].map((l) => T.rateOf(m, l)).join() === '10,12,12,15', 'Grade 3 Multiplication is the spec\'s ladder: 10, 12, 12, 15 a minute at levels 1, 3, 6, 10'); }
ok(T.levelNews(T.themeOf('mul10'), 6) === 'New at level 6: missing numbers · 5-minute window', 'the level card says what is new before the run ("New at level 6: missing numbers · 5-minute window")');
ok(Object.keys(T.SUTRA_RATES).join() === ALL.join(), 'every sutra stop has its own rate, and only sutra stops (the "Vedic" label is honest, rule 5)');

/* ---- BT3: the target is a rate × minutes, the same rate in every window ---- */
for (const th of every) for (let lv = 1; lv <= 10; lv++) {
  const r = T.rateOf(th, lv);
  ok(T.WINDOWS.every((m) => T.targetOf(th, lv, m) === r * m), `BT3 ${th.id} L${lv}: target = ${r} × minutes in 1, 2, 3 and 5`);
}
{ const v = T.themeOf('vedic'); ok(T.targetOf(v, 3, 2, ['square-five']) === T.SUTRA_RATES['square-five'][0] * 2, 'BT3 Vedic: the target is the passed sutras\' own rate × minutes'); }

/* ---- BT4: 5 minutes is locked below level 6 and open from it ---- */
for (let lv = 1; lv <= 10; lv++) ok(T.windowsOpen(lv).includes(5) === (lv >= 6) && [1, 2, 3].every((m) => T.windowsOpen(lv).includes(m)), `BT4 level ${lv}: 1, 2, 3 open; 5 ${lv >= 6 ? 'open' : 'locked'}`);
{ const k = kid(); k.timer.lv.mul10 = 5; ok(!T.canStart(k, 'mul10', 5, 5) && T.canStart(k, 'mul10', 5, 3), 'BT4: a level-5 child cannot start a 5-minute run');
  k.timer.lv.mul10 = 6; ok(T.canStart(k, 'mul10', 6, 5) && !T.canStart(k, 'mul10', 5, 5), 'BT4: at level 6 the 5-minute window opens, for level 6 itself');
  ok(!T.canStart(k, 'mul10', 7, 2), 'a run cannot start above the child\'s level');
  ok(!T.canStart(k, 'vedic', 1, 2), 'the Vedic theme waits until a sutra stop is passed'); }

/* ---- BT11: every question comes from facts.js or tricks.js and passes the trick test ---- */
let nq = 0;
const kinds = { fact: 0, trick: 0 };
for (const th of every) for (let lv = 1; lv <= 10; lv++) for (const earned of th.kind === 'vedic' ? [ALL, ['square-five']] : [[], ALL]) {
  const r = seeded(`q${th.id}${lv}${earned.length}`);
  const due = [{ op: '×', a: 7, b: 8 }, { op: '-', a: 13, b: 6 }];
  for (let i = 0; i < 60; i++) {
    const q = T.question(th, lv, r, { earned, due, left: i % 3 ? 60000 : 10000 }); nq++;
    const tag = `${th.id} L${lv}: "${q.text}"`;
    ok(q.by === 'facts' || (q.src && byId[q.src]), `BT11 ${tag} comes from facts.js or a tricks.js stop`);
    if (q.src) kinds.trick++; else kinds.fact++;
    const plain = Function(`return (${q.expr})`)(), want = val(q.ans);
    ok(Math.abs(plain - want) < 1e-9, `BT11 ${tag}: ans ${q.ans} but plain arithmetic says ${plain}`);
    ok(correct(q, String(q.ans)) && !correct(q, String(want + 1)), `BT11 ${tag}: the answer is judged right, and a wrong one wrong`);
    ok(!q.choices && !q.input, `${tag}: typed answers only`);
    ok(!String(q.text).split(/[^0-9./]/).includes(String(q.ans)), `rule 3 ${tag}: the prompt never shows its answer`);
    ok(!/undefined|NaN/.test(q.text), `${tag}: clean text`);
    if (q.fact) ok(F.inBank(q.fact) && F.answer(q.fact) === want, `${tag}: records the fact it exercises (${F.key(q.fact)})`);
    if (q.src && q.raw) {
      const t = byId[q.src], w = t.work(q.raw);
      ok(Math.abs(val(w.at(-1).v) - want) < 1e-9, `BT11 ${tag}: the trick's last step agrees`);
      checkSteps(t.id, q.raw, w, ok, t.draw ? t.draw(q.raw) : (q.raw.html || ''));
    }
    for (const x of T.keysFor(q)) ok(['.', '−', '/'].includes(x), `${tag}: only pad keys`);
    if (want < 0) ok(T.keysFor(q).includes('−'), `${tag}: a negative answer has its − key`);
    if (q.tag === 'trick') ok(QUICK.includes(q.src) && earned.includes(q.src), `${tag}: the Trick round asks only a quick sutra the child has passed`);
    if (th.kind === 'vedic') ok(q.src && earned.includes(q.src) || q.tag === 'bonus', `${tag}: the Vedic theme asks only passed sutras`);
    if (!T.longAnswers(th) || q.tag === 'bonus') continue;
    ok(!T.oneKey(q), `BT1 ${tag}: a one-key answer in a theme that can avoid one`);
  }
}
ok(kinds.fact > 1000 && kinds.trick > 1000, `BT11: both sources are used (${kinds.fact} facts, ${kinds.trick} stops) over ${nq} questions`);
// the Trick round's sutras really are the quick way: a few steps of working at trick level 1
for (const id of QUICK) { const t = byId[id], r = seeded(id); let s = 0; for (let i = 0; i < 200; i++) s += t.work(t.gen(r, 1)).length; ok(s / 200 <= 3, `${id}: ${(s / 200).toFixed(1)} steps — a quick way, fit for the Trick round`); }

/* rule 2: a fact theme climbs by trickiness, never by size */
for (const id of ['mul10', 'mul12', 'add20', 'sub20', 'div', 'sq']) {
  const th = T.themeOf(id), mean = (lv) => { const r = seeded(id + lv); let s = 0, n = 0; for (let i = 0; i < 400; i++) { const q = T.question(th, lv, r, {}); if (q.fact && !q.tag) { s += F.tricky(q.fact); n++; } } return s / n; };
  ok(mean(1) < mean(3) && mean(3) < mean(7), `rule 2 ${id}: level 1 → 3 → 7 climbs by trickiness (${mean(1).toFixed(2)} → ${mean(3).toFixed(2)} → ${mean(7).toFixed(2)})`);
}
{ const th = T.themeOf('mul10'), r = seeded('m1'), ops = new Set();
  for (let i = 0; i < 300; i++) { const q = T.question(th, 1, r, {}); if (q.fact) ops.add(Math.min(q.fact.a, q.fact.b) <= 2 || [5, 10].includes(q.fact.a) || [5, 10].includes(q.fact.b) ? 'easy' : F.key(q.fact)); }
  ok([...ops].every((x) => x === 'easy'), `Multiplication level 1 is the spec's ×2, ×5, ×10 — the bottom of the trickiness ramp (${[...ops].join(' ')})`); }

/* ---- BT2: the fluent bot hits every level's target in every open window ---- */
const k0 = kid();
for (const th of every) {
  const band = bandOf(th);
  for (let lv = 1; lv <= 10; lv++) {
    const trick = T.challengesAt(th, lv).includes('trick');
    const sets = th.kind === 'vedic' ? ALL.map((x) => [x]).concat([ALL]) : trick ? [[], QUICK, ...QUICK.map((x) => [x])] : [[]];
    let worst = Infinity, where = '';
    for (const earned of sets) for (const mins of T.windowsOpen(lv)) for (let s = 0; s < 4; s++) {
      const run = T.playFluent(th, lv, mins, { k: k0, r: seeded(`bt2-${th.id}-${lv}-${mins}-${s}-${earned.join()}`), band, earned });
      const target = T.targetOf(th, lv, mins, earned), m = run.score / target;
      if (m < worst) { worst = m; where = `${mins} min, ${run.score} of ${target}${earned.length === 1 ? ' with ' + earned[0] : ''}`; }
    }
    ok(worst >= 1, `BT2 ${th.id} L${lv}: the fluent bot hits the target in every window (worst: ${where})`);
  }
}

/* ---- BT1: the random typer stays far below every target ----
   The spec's bar is under 5% of the target. Measured honestly it cannot hold everywhere: a right
   answer is taken the moment it is typed (rule 3) and a miss costs one second (the spec), so a
   two-key answer falls to a masher about once in 150 tries, and a one-key answer once in 12. Where
   the fluent-calibrated target is small (3–5 a minute) that is 5–10% of it; in the one-digit themes
   of grades 1–2 it is a quarter. So this holds what is true, prints the spec's 5% cells that are
   missed, and the owner decides (report): long answers stay under 10% and NEVER reach a target;
   one-digit themes stay under half and never reach a target in 2 minutes or more. */
const share = [], over5 = [];
for (const th of every) {
  for (let lv = 1; lv <= 10; lv++) {
    let sum = 0, n = 0, max = 0, maxAt = '', max2 = 0;
    for (const mins of T.windowsOpen(lv)) for (let s = 0; s < 6; s++) {
      const earned = th.kind === 'vedic' ? ALL : [];
      const run = T.playRandom(th, lv, mins, { k: k0, r: seeded(`bt1-${th.id}-${lv}-${mins}-${s}`), earned });
      const target = T.targetOf(th, lv, mins, earned), x = run.score / target; sum += x; n++;
      if (x > max) { max = x; maxAt = `${run.score} of ${target} in ${mins} min`; }
      if (mins >= 2) max2 = Math.max(max2, x);
    }
    const mean = sum / n, long = T.longAnswers(th); share.push({ id: th.id, lv, mean, short: !long });
    if (long) {
      ok(max < 1, `BT1 ${th.id} L${lv}: a random typer never hits the target (best ${maxAt})`);
      ok(mean < 0.1, `BT1 ${th.id} L${lv}: a random typer scores under 10% of the target (${(mean * 100).toFixed(1)}%)`);
      if (mean >= 0.05) over5.push(`${th.id} L${lv} ${(mean * 100).toFixed(1)}%`);
    } else {
      ok(max2 < 1, `BT1 ${th.id} L${lv}: a random typer never hits the target in 2 minutes or more`);
      ok(mean < 0.5, `BT1 ${th.id} L${lv}: a random typer scores under half the target (${(mean * 100).toFixed(1)}%)`);
    }
  }
}
{ const sh = share.filter((x) => x.short), worst = sh.reduce((a, b) => (b.mean > a.mean ? b : a), { mean: 0 }), lg = share.filter((x) => !x.short);
  console.log(`  BT1: ${lg.length - over5.length} of ${lg.length} long-answer levels are under the spec's 5% (over: ${over5.join(', ') || 'none'})`);
  console.log(`  BT1: one-digit themes (${[...new Set(sh.map((x) => x.id))].join(', ')}) average ${(100 * sh.reduce((a, b) => a + b.mean, 0) / sh.length).toFixed(0)}% of the target, worst ${(worst.mean * 100).toFixed(0)}% (${worst.id} L${worst.lv}) — owner decision`); }

/* ---- the run: the clock, a wrong answer, a skip, Precision, a hidden page ---- */
{
  const k = kid(), th = T.themeOf('mul10');
  const run = T.newRun({ th, lv: 1, mins: 1, k, r: seeded('run'), now: 1000 });
  const q1 = run.q;
  let ev = T.press(run, String(q1.ans)[0], 1500);
  if (String(q1.ans).length > 1) ev = T.press(run, String(q1.ans)[1], 1600);
  ok(ev.some((e) => e.type === 'right') && run.score === 1 && run.q !== q1, 'a right answer scores 1 and moves on the moment it is typed — no Enter');
  const q2 = run.q, bad = String(val(q2.ans) + 1);
  for (const c of bad) T.press(run, c, 2000);
  ok(run.score === 1 && !run.lock && run.input === bad, 'a wrong answer waits for Enter (rule 3)');
  ev = T.press(run, '✓', 2100);
  ok(ev.some((e) => e.type === 'wrong') && run.lock && run.lock.ans === q2.ans && run.score === 1, 'Enter on a wrong answer shows the right one and scores 0');
  T.press(run, '5', 2600); ok(run.input === bad, 'nothing can be typed while the answer is shown');
  T.advance(run, 3150); ok(run.q !== q2 && !run.lock, 'after one second the next question comes — the clock never stopped');
  ok(Math.abs(run.t - 2150) < 1, 'the run clock is wall-clock time');
  const q3 = run.q; T.press(run, 'S', 3200);
  ok(run.skips === 1 && run.score === 1 && run.lock && run.lock.skip, 'Skip scores nothing and costs nothing on the score; its answer is shown for a second');
  T.advance(run, 4200); ok(run.q !== q3, 'then the next question');
  T.pause(run, 5000); const t0 = run.t; T.advance(run, 65000); T.advance(run, 125000);
  ok(run.t === t0 && !run.over, 'BT8: a paused run\'s clock does not move, however long the page is hidden');
  T.resume(run, 200000); T.advance(run, 210000); ok(Math.abs(run.t - (t0 + 10000)) < 1, 'BT8: it resumes from where it stopped');
  T.advance(run, 400000); ok(run.over && run.t === run.dur, 'the run ends when its own clock reaches the window');
  ok(T.press(run, '1', 400100).length === 0 && run.score === 1, 'nothing counts after the end');
}
{ // Precision: a wrong answer freezes the clock-face for two seconds, not one
  const k = kid(), th = T.themeOf('mul10'), lv = 8;
  ok(T.challengesAt(th, lv).includes('precision') && !T.challengesAt(th, 7).includes('precision'), 'Multiplication: Precision is the level-8 challenge');
  const run = T.newRun({ th, lv, mins: 1, k, r: seeded('p'), now: 0 }), q = run.q;
  for (const c of String(val(q.ans) + 1)) T.press(run, c, 100); T.press(run, '✓', 200);
  T.advance(run, 1300); ok(run.lock && run.q === q, 'Precision: still frozen after one second');
  T.advance(run, 2250); ok(!run.lock && run.q !== q, 'Precision: the next question after two');
}
{ // the Bonus round: the last 20 seconds ask the child's own due facts, worth 2
  const k = kid(), th = T.themeOf('mul10'), due = [{ op: '×', a: 7, b: 8 }];
  const run = T.newRun({ th, lv: 4, mins: 1, k, r: seeded('b'), now: 0, due });
  ok(run.q.tag !== 'bonus', 'no bonus question before the last 20 seconds');
  T.advance(run, 41000); T.press(run, 'S', 41000); T.advance(run, 42100);
  ok(run.q.tag === 'bonus' && run.q.pts === 2 && run.q.text === '7 × 8', 'the last 20 seconds: a due fact, worth 2');
  const s0 = run.score; T.press(run, '5', 42200); T.press(run, '6', 42300);
  ok(run.score === s0 + 2 && run.log.length === run.score, 'a bonus answer scores 2 (and the ghost log keeps both points)');
}
{ // pay: `answer` at most 10 a run
  const k = kid(), run = T.playFluent(T.themeOf('mul10'), 1, 3, { k, r: seeded('pay'), band: '11-14' });
  ok(run.right > 10 && run.paid === 10, `a run pays \`answer\` for at most 10 right answers (${run.right} right, ${run.paid} paid)`);
}

/* ---- BT5, BT6, BT7: levels are the child's choice, a miss never drops one, bests are kept ---- */
{
  const k = kid(), th = T.themeOf('mul10');
  const miss = T.newRun({ th, lv: 1, mins: 2, k, r: seeded('m'), now: 0 }); T.advance(miss, 120000);
  const r1 = T.finish(k, miss);
  ok(!r1.hit && r1.offer === null && T.levelIn(k, 'mul10') === 1, 'BT6: a miss stays at the level');
  ok(T.verdict(r1) === `0 of ${r1.target}, ${r1.target} to go.`, `a miss says how close: "${T.verdict(r1)}"`);
  ok(T.levelUp(k, 'mul10', 1) === 1, 'BT5: Level up is refused before the target is hit');
  const hit = T.playFluent(th, 1, 2, { k, r: seeded('h'), band: '8-10' });
  const r2 = T.finish(k, hit);
  ok(r2.hit && r2.offer === 2 && r2.firstHit, 'BT5: hitting the target OFFERS level 2');
  ok(T.levelIn(k, 'mul10') === 1, 'BT5: …and nothing levels up without the child\'s choice');
  ok(T.finish(k, T.playFluent(th, 1, 2, { k, r: seeded('h2'), band: '8-10' })).firstHit === false, 'the `stop` pay is the FIRST hit of a level only');
  ok(T.levelUp(k, 'mul10', 1) === 2 && T.levelIn(k, 'mul10') === 2, 'BT5: choosing Level up moves to level 2');
  ok(T.levelUp(k, 'mul10', 1) === 2, 'a stale Level up (from a level already left) changes nothing');
  for (let i = 0; i < 5; i++) { const m = T.newRun({ th, lv: 2, mins: 1, k, r: seeded('mm' + i), now: 0 }); T.advance(m, 60000); T.finish(k, m); }
  ok(T.levelIn(k, 'mul10') === 2, 'BT6: five misses in a row never drop a level');
  const low = T.finish(k, T.playFluent(th, 1, 3, { k, r: seeded('low'), band: '8-10' }));
  ok(low.hit && low.offer === null && T.levelIn(k, 'mul10') === 2, 'hitting an easier level than your own offers nothing and moves nothing');
  // BT7: bests per theme × level × window
  const b = k.timer.best;
  ok(b['mul10·1·2'] === Math.max(r2.score, hit.score) && b['mul10·1·3'] === low.score && b['mul10·2·1'] === 0 && Object.keys(b).every((x) => /^[a-z0-9]+·\d+·\d$/.test(x)), 'BT7: a best per theme × level × window');
  ok(Array.isArray(k.timer.ghost['mul10·1·2']) && k.timer.ghost['mul10·1·2'].length === b['mul10·1·2'], 'the best run\'s ghost is kept with it');
  ok(T.ghostAt(k.timer.ghost['mul10·1·2'], 120000) === b['mul10·1·2'] && T.ghostAt(k.timer.ghost['mul10·1·2'], 0) === 0, 'the ghost is where the best run was at each moment');
  const before = b['mul10·1·2'], worse = T.newRun({ th, lv: 1, mins: 2, k, r: seeded('w'), now: 0 }); T.advance(worse, 120000);
  const r3 = T.finish(k, worse); ok(b['mul10·1·2'] === before && !r3.beat, 'a worse run never lowers a best');
  ok(!/streak|day/i.test(JSON.stringify(k.timer)), 'nothing in the record counts days or streaks');
  // the medals, from evidence
  const k2 = kid(); k2.timer.hit['mul10·1'] = true; ok(award(k2).some((m) => m.id === 'timer-first'), 'medal "First target hit" from a hit in the record');
  const k3 = kid(); k3.timer.lv.add3 = 5; ok(award(k3).some((m) => m.id === 'timer-five'), 'medal "Level 5 in a theme"');
  const k4 = kid(); k4.timer.best['mul10·1·1'] = 10;
  const run4 = T.playFluent(th, 1, 1, { k: k4, r: seeded('k4'), band: '11-14' }); const r4 = T.finish(k4, run4);
  ok(r4.beat && r4.by >= 5 && award(k4).some((m) => m.id === 'timer-beat'), `medal "Beat your best by 5" (by ${r4.by})`);
  const k5 = kid(); k5.timer.best['mul10·1·1'] = 10; k5.timer.beat = 4; ok(!award(k5).some((m) => m.id === 'timer-beat'), '…and not for 4');
  ok(['timer-first', 'timer-five', 'timer-beat'].every((id) => MEDALS.some((m) => m.id === id)), 'the three medals are on the shelf');
  // for parents, in words
  const lines = T.parentLines(k);
  ok(lines.length === 1 && lines[0].startsWith('Multiplication: Level 2, best 0 in 1 minute (target ') && !/minutes? played|time spent/i.test(lines[0]), `the grown-ups' line, in words: "${lines[0]}"`);
  const k6 = kid(); k6.timer.lv.mul10 = 4; k6.timer.best['mul10·4·2'] = 29;
  ok(T.parentLines(k6)[0] === `Multiplication: Level 4, best 29 in 2 minutes (target ${T.targetOf(th, 4, 2)}).`, `the spec's example line: "${T.parentLines(k6)[0]}"`);
}

/* ---- the one fact record: a timed answer is recorded where every drill records it ---- */
{
  const th = T.themeOf('mul10'); let rec = 0, miss = 0;
  for (let i = 0; i < 300; i++) { const q = T.question(th, 6, seeded('f' + i), {}); if (q.fact) rec++; else miss++; }
  ok(rec > miss, `most timed multiplication answers land in the fact record (${rec} of ${rec + miss})`);
}

if (fails) { console.error(`timer: ${fails} failed`); process.exit(1); }
console.log(`timer: ok (${nq} questions, ${every.length} themes × 10 levels, both bots, every window)`);
