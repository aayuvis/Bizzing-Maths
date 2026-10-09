/* rush.mjs — Number Rush's rules (games spec §1.3, §3.1), engine side:
     T3  a bubble pops on Enter, or without Enter only when no other bubble's answer starts with
         the typed digits — typing "12" never pops "1"
     T4  the sky moves by wall-clock time, clamped to 250 ms: the first landing takes the same
         game time at 60 and at 12 frames a second (the browser half is in rush-ui.mjs)
     T5  the level rule, Rush's part: 40% of the bubbles served drops a level, 60% keeps it
     T10 one fact record: a miss in Rush is due in Calm's session and in the Mock Contest's pool
   plus the ladder (every level ordered by tricky(), no ×1/÷1 past level 1, a new child starts
   mid-ramp for their band), Squares by tricky() with its why, and Inverse's whole families.
   Every check here was watched to fail with its feature removed (see the commit). */
import { readFileSync } from 'node:fs';
import * as RU from '../src/rush.js';
import * as F from '../src/facts.js';
import { newContest, childQuestion, questionAt, hardness } from '../src/contest.js';
import { setLevel, levelOf } from '../src/game-level.js';
import { newKid } from '../src/model.js';
import { seeded } from '../src/rand.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };

/* ---------------------------------------------------------------- T3: the prefix */
ok(RU.decide('1', [1, 12]) === 'wait', 'T3: with 1 and 12 up, typing "1" pops nothing yet');
ok(RU.decide('12', [1, 12]) === 'pop', 'T3: typing "12" pops 12');
ok(RU.decide('1', [1, 12], true) === 'pop', 'T3: "1" then Enter pops 1');
ok(RU.decide('1', [1, 5]) === 'pop', 'T3: with no other answer starting "1", "1" pops at once');
ok(RU.decide('7', [1, 12], true) === 'wrong' && RU.decide('7', [1, 12]) === 'wait', 'T3: a number no bubble has waits, and is wrong on Enter');
ok(RU.decide('', [1, 12], true) === 'wait', 'T3: Enter on nothing typed does nothing');
ok(RU.decide('5', [56, 5, 54]) === 'wait' && RU.decide('56', [56, 5, 54]) === 'pop', 'T3: 5 waits while 56 and 54 are up');
{ // every set of answers: no pop without Enter while another live answer shares the typed start
  const r = seeded('prefix'); let n = 0, bad = 0;
  for (let i = 0; i < 4000; i++) {
    const live = Array.from({ length: 1 + Math.floor(r() * 5) }, () => Math.floor(r() * 150));
    const a = String(live[Math.floor(r() * live.length)]);
    for (let j = 1; j <= a.length; j++) {
      const t = a.slice(0, j), d = RU.decide(t, live);
      const shared = live.some((x) => String(x) !== t && String(x).startsWith(t));
      if (d === 'pop' && (shared || !live.map(String).includes(t))) bad++;
      if (d !== 'pop' && !shared && live.map(String).includes(t)) bad++;
      n++;
    }
  }
  ok(bad === 0, `T3: ${n} typed prefixes over random skies — pops exactly when unambiguous (${bad} wrong)`);
}
ok(RU.aimedAt('54', [{ ans: 56, y: 10 }, { ans: 12, y: 300 }]).ans === 56, 'a wrong Enter is aimed at the bubble sharing the longest start');
ok(RU.aimedAt('9', [{ ans: 56, y: 10 }, { ans: 12, y: 300 }]).ans === 12, 'and with none shared, at the lowest bubble');

/* ---------------------------------------------------------------- T4: the clock */
ok(RU.stepMs(1000, 1016) === 16 && RU.stepMs(0, 5000) === RU.MAX_STEP_MS && RU.MAX_STEP_MS === 250, 'T4: a frame is worth its real time, clamped to 250 ms');
ok(RU.stepMs(100, 50) === 0, 'T4: time never runs backwards');
{ // the loop's own arithmetic, at two frame rates: game time to fall the same 500 px
  const land = (fps) => { let t = 0, last = 0, y = 0; while (y < 500) { t += 1000 / fps; y += 0.05 * RU.stepMs(last, t); last = t; } return t; };
  const a = land(60), b = land(12);
  ok(Math.abs(a - b) / a < 0.05, `T4: the first landing at 60 fps (${a.toFixed(0)} ms) and at 12 fps (${b.toFixed(0)} ms) within 5%`);
  const capped = (fps) => { let t = 0, last = 0, y = 0; while (y < 500) { t += 1000 / fps; y += 0.05 * Math.min(34, t - last); last = t; } return t; };
  ok(Math.abs(capped(60) - capped(12)) / capped(60) > 0.5, 'T4: (the old 34 ms cap really did slow the sky at 12 fps — this check can fail)');
}
const src = readFileSync(new URL('../src/games.js', import.meta.url), 'utf8');
const rushSrc = src.slice(src.indexOf('export function numberRush('), src.indexOf('/* ======================================================= MAKE THE TARGET */'));
ok(/RU\.stepMs\(last, now\)/.test(rushSrc) && !/Math\.min\(34/.test(rushSrc), 'T4: the Rush loop takes its frame time from stepMs, and the 34 ms cap is gone');
ok(/RU\.decide\(input/.test(rushSrc) && !/String\(b\.ans\) === input\)\.sort\(\(a, b\) => b\.y - a\.y\)\[0\];\n\s*if \(hit\) \{ popIt/.test(rushSrc), 'T3: the Rush keys go through decide()');
ok(/document\.hidden/.test(rushSrc) && /visibilitychange/.test(rushSrc), 'T9: the Rush loop stops its clock while the tab is hidden');

/* ---------------------------------------------------------------- the ladder */
const trivial = (x) => (x.op === '×' && (x.a <= 1 || x.b <= 1)) || (x.op === '÷' && (x.b <= 1 || x.a / x.b <= 1)) || (x.op === '+' && (x.a === 0 || x.b === 0)) || (x.op === '-' && x.b === 0);
for (const lv of [1, 2, 3, 4, 5]) {
  const p = RU.levelPool(lv);
  ok(p.length >= 30, `level ${lv}: a real pool (${p.length})`);
  ok(p.every((x, i) => !i || p[i - 1].t <= x.t), `level ${lv}: ordered by tricky(), easiest first`);
  ok(p.every((x) => Number.isInteger(x.ans) && x.ans >= 0), `level ${lv}: every answer a whole number a child can type`);
  ok(p.every((x) => !x.fact || (F.answer(x.fact) === x.ans && F.BANK[x.fact.op].some((b) => F.key(b) === F.key(x.fact)))), `level ${lv}: every sum is a real fact from the bank, and its answer is the fact's`);
  if (lv > 1) ok(!p.some(trivial), `level ${lv}: no ×1, ÷1, ×0 or +0`);
  ok(RU.LEVELS[lv].words.startsWith(`Level ${lv} · `), `level ${lv} says what it is: "${RU.LEVELS[lv].words}"`);
}
{ const p1 = RU.levelPool(1), dots = p1.filter((x) => x.op === 'dots');
  ok(dots.length === 10 && dots.map((x) => x.ans).join() === '1,2,3,4,5,6,7,8,9,10' && dots.every((x) => x.fact === null), 'level 1: dot patterns one to ten, recorded as no fact');
  ok(p1.filter((x) => x.op !== 'dots').every((x) => x.op === '+' && x.ans <= 10), 'level 1: the rest is + within ten');
  ok(RU.levelPool(2).every((x) => ['+', '-'].includes(x.op) && x.a <= 20), 'level 2: + and − within twenty');
  ok(RU.levelPool(3).every((x) => ['×', '÷'].includes(x.op) && (x.op === '×' ? x.b <= 10 : x.b <= 10 && x.a / x.b <= 10)), 'level 3: × and ÷ to 10 × 10');
  const p4 = RU.levelPool(4), miss = p4.filter((x) => x.missing);
  ok(p4.some((x) => x.op === '×' && x.b === 12) && miss.length > 50, `level 4: to 12 × 12, with missing numbers (${miss.length})`);
  ok(miss.every((x) => { const m = /^(\d+) × \? = (\d+)$/.exec(x.text); return m && +m[1] * x.ans === +m[2] && x.fact.op === '÷' && x.fact.a === +m[2] && x.fact.b === +m[1]; }), 'level 4: every "7 × ? = 56" is right, and is recorded as its division fact');
  ok(['+', '-', '×', '÷'].every((o) => RU.levelPool(5).some((x) => x.op === o)) && RU.LEVELS[5].pace > RU.LEVELS[4].pace, 'level 5: everything mixed, and faster');
}
{ // a new child: the band's level, and mid-ramp inside it — never at ×1 and ÷1 (§1.3)
  for (const [band, lv] of [['6-7', 1], ['8-10', 3], ['11-14', 4]]) ok(RU.rushLevel(newKid('N', band, 'cubebot')) === lv, `a new ${band} child starts at level ${lv}`);
  const k = newKid('N', '8-10', 'cubebot'), p = RU.levelPool(3), s = RU.startAt(k, p, 3);
  ok(s >= 0.3 && s <= 0.5, `a new 8–10 child starts mid-ramp (${s})`);
  const first = Array.from({ length: 12 }, (_, i) => RU.nextItem(p, { start: s, served: i, r: seeded('n' + i) }));
  const lo = RU.windowAt(p.length, s, 0)[0];
  ok(lo > 0 && first.every((x) => !trivial(x)), `its first bubbles skip the bottom of the ramp (from index ${lo}) and are never ×1 or ÷1: ${first.slice(0, 5).map((x) => x.text).join(', ')}`);
  ok(RU.windowAt(p.length, 0, 0)[0] === 0 && RU.startAt(newKid('N', '6-7', 'cubebot'), RU.levelPool(1), 1) === 0, 'the pre-readers\' level starts at its very bottom');
  // the round climbs to the level's hardest
  const ws = [0, 5, 10, 20, 30, 60].map((n) => RU.windowAt(p.length, s, n));
  ok(ws.every((w, i) => !i || (w[0] >= ws[i - 1][0] && w[1] >= ws[i - 1][1])) && ws.at(-1)[1] === p.length, `the round climbs, easy → the level's hardest (${ws.map((w) => w.join('–')).join(' · ')})`);
  ok(ws.at(-1)[1] === ws[4][1], `it reaches the top after ${RU.RAMP_SERVED} bubbles and stays there`);
}

/* ---------------------------------------------------------------- the paid modes */
for (const band of ['6-7', '8-10', '11-14']) {
  const sq = RU.squaresPool(band);
  ok(sq.every((x, i) => !i || F.tricky(sq[i - 1].fact) <= F.tricky(x.fact)), `${band} Squares: ordered by tricky(), not by size (${sq.slice(0, 4).map((x) => x.a).join(', ')}…)`);
  const fams = RU.families(band);
  ok(fams.length >= 20 && fams.every((f) => f.members.length === 2 || f.members.length === 4), `${band} Inverse: ${fams.length} fact families, each whole`);
  ok(fams.every((f) => { const m = f.members, tot = Math.max(...m.map((x) => x.op === '×' || x.op === '+' ? x.ans : 0)); return m.every((x) => x.fam === f.id && x.fact && F.answer(x.fact) === x.ans) && m.filter((x) => x.op === '÷' || x.op === '-').every((x) => x.a === tot); }), `${band} Inverse: every member a real fact, and the inverses undo the family's own product or sum`);
  ok(band === '6-7' ? fams.every((f) => f.members.every((x) => ['+', '-'].includes(x.op))) : fams.every((f) => f.members.every((x) => ['×', '÷'].includes(x.op)) && f.members.every((x) => !trivial(x))), `${band} Inverse: ${band === '6-7' ? '+ and − families' : '× and ÷ families, never ×1'}`);
  const k = newKid('Q', band, 'cubebot');
  const pool = RU.rushPool(k, 'mixed');
  ok(new Set(pool.map((x) => x.fam)).size === fams.length, `${band}: rushPool('mixed') is the families, member by member`);
}
for (let n = 2; n <= 20; n++) {
  const m = /^(\d+)² = (\d+)² \+ 2 × (\d+) − 1 = (\d+) \+ (\d+)$/.exec(RU.squareWhy(n));
  ok(m && +m[1] === n && +m[2] === n - 1 && +m[3] === n && +m[4] === (n - 1) ** 2 && +m[4] + +m[5] === n * n, `Squares' why for ${n}: ${RU.squareWhy(n)} (it adds up to ${n}²)`);
}

/* ---------------------------------------------------------------- T5: the level rule */
{ const k = newKid('L', '8-10', 'cubebot');
  setLevel(k, 'rush', 3); RU.rushVerdict(k, 2, 5);
  ok(levelOf(k, 'rush') === 2 && RU.rushLevel(k) === 2, 'T5: 2 popped of 5 served (40%) drops Rush a level');
  setLevel(k, 'rush', 3); const v = RU.rushVerdict(k, 6, 10);
  ok(levelOf(k, 'rush') === 3 && v.kept && !v.offer, 'T5: 6 of 10 (60%) keeps it');
  setLevel(k, 'rush', 3); ok(RU.rushVerdict(k, 8, 10).offer === 4 && levelOf(k, 'rush') === 3, 'T5: 80% offers level 4 and never forces it');
  ok(/finish\(\) \{[^]*RU\.rushVerdict\(kid, score, Math\.max\(served, score\)\)/.test(rushSrc), 'T5: a standard round hands in pops out of bubbles served');
  ok(/verdictLine\(v\)/.test(rushSrc), 'T5: the finish card says the verdict in words'); }

/* ---------------------------------------------------------------- T10: one fact record */
{ const k = newKid('T', '8-10', 'cubebot'), now = Date.now();
  // a little history so the drill is past its discovery session
  for (const f of F.ramp('×').slice(20, 40)) F.record(k.facts[F.key(f)] = F.blank(), true, 1500, k.band, now - 9 * 864e5);
  const miss = { op: '×', a: 7, b: 8 };
  // Rush records a landing exactly as main.js's onTick does
  F.record(k.facts[F.key(miss)] || (k.facts[F.key(miss)] = F.blank()), false, 0, k.band, now);
  ok(F.dueList(k.facts, now + 1)[0] === '7×8', `T10: a miss in Rush heads the due list (${F.dueList(k.facts, now + 1).slice(0, 3)})`);
  const s = F.session(k.facts, '×', { band: k.band, now: now + 1, r: seeded('t10') });
  ok(s.some((f) => F.key(f) === '7×8'), 'T10: …and Rush · Calm (the Twenty facts session) serves it');
  const p = RU.levelPool(3), d = RU.dueIn(k, p, now + 1);
  ok(d.length && F.key(d[0].fact) === '7×8' && F.key(RU.nextItem(p, { due: d, r: () => 0 }).fact) === '7×8', 'T10: …and the next Rush round serves it before its ramp');
  // the Mock Contest's fact rungs ask it before a random fact; its hardness climb is untouched
  let withDue = 0, without = 0, twice = 0;
  for (let i = 0; i < 300; i++) {
    const a = newContest('8-10', 'c' + i, { due: F.dueList(k.facts, now + 1) }), b = newContest('8-10', 'c' + i);
    let seen = 0;
    for (let rd = 1; rd <= 8; rd++) {
      a.round = rd; b.round = rd;
      const qa = childQuestion(a), qb = childQuestion(b);
      if (qa.h !== qb.h || hardness(a) !== hardness(b)) fails++, console.error('  ✗ T10: the due list moved the contest\'s climb');
      if (/^(7 × 8|8 × 7)$/.test(qa.text)) { seen++; ok(qa.fact && F.key(qa.fact) === '7×8' && qa.ans === 56, 'the contest question carries its fact'); }
      if (/^(7 × 8|8 × 7)$/.test(qb.text)) without++;
      ok(JSON.stringify(childQuestion(a)) === JSON.stringify(qa), 'asking the same round again gives the same question');
    }
    if (seen) withDue++; if (seen > 1) twice++;
  }
  ok(withDue >= 120 && withDue > without * 4, `T10: …and the next Mock Contest's fact pool asks it (${withDue} of 300 contests with the due list, ${without} without)`);
  ok(twice === 0, 'T10: a due fact is asked at most once a contest');
  // the rivals' questions never read the child's record
  ok(questionAt(0.3, seeded('x')).h === questionAt(0.3, seeded('x'), null).h, 'the rivals face the same ladder');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  ok(/newContest\(k\.band, Date\.now\(\), \{ due: F\.dueList\(k\.facts\)[,\s}]/.test(main), 'T10: main.js opens a Mock Contest with the child\'s due list');
  ok(/if \(C\.q\.fact\) F\.record\(/.test(main), 'T10: a Mock Contest fact is written back to the same record');
  ok(/G\.numberRush\(k, \{[^\n]*F\.record\(k\.facts\[F\.key\(fact\)\]/.test(main), 'T10: Rush writes the same record');
  // Calm IS the Twenty facts run: the same builder, the same run kind, so the same submit(), record and pay
  const fr = main.slice(main.indexOf('function factsRun('), main.indexOf("on('startCalm'"));
  ok(/F\.session\(k\.facts, op/.test(fr) && /startRun\('facts', calm \?/.test(fr) && /on\('startFacts', \(op\) => factsRun\(op\)\)/.test(main) && /on\('startCalm', \(\) => \{[^\n]*factsRun\(d \? d\.op : [^\n]*, true\)/.test(main), 'Calm and Twenty facts are one run: factsRun(op, calm) → startRun(\'facts\')');
  ok(/const PRACTICE = \[[^\]]*'facts'/.test(main) && /tick\(k, right, run\.kind === 'facts' \? 1 : 2\)/.test(main), 'so Calm pays exactly what Twenty facts pays: answer 1 per right, through the same tick');
  ok(/if \(arg === 'rush:calm'\) return fire\('startCalm'\)/.test(main), '#/game/rush:calm opens Calm, free, before any mode lock');
}

// T10 under load: a child with sixty older traps still meets today's Rush miss in the contest's 40
{ const facts = {}, t = Date.now(), bank = F.ramp('×');
  for (const f of bank.slice(0, 60)) F.record(facts[F.key(f)] = F.blank(), false, 4000, '8-10', t - 5 * 864e5);
  const fresh = F.key(bank[70]); F.record(facts[fresh] = F.blank(), false, 4000, '8-10', t);
  ok(newContest('8-10', 1, { due: F.dueList(facts, t) }).due.includes(fresh), 'T10: the freshest miss leads the due list, so the contest\'s capped pool always holds it'); }

console.log(`${fails ? 'FAIL' : 'ok'} rush — the prefix, the wall clock, five levels by tricky(), the level rule, Squares and Inverse, one fact record`);
process.exit(fails ? 1 : 0);
