/* test/honest.mjs — the honest-rewards week (games spec §1.1, §1.2, §2.1, §3.4), engine side.

   T1  a random masher plays 20 Mock Contests and earns only the `answer` coins for its lucky
       rights — never `contest`; a blank paper earns 0. A child who reaches round 4 (or gets 4
       right) is paid `contest` once a day; a paper half tried and 20 points above its OWN blank
       score is paid once per paper and once a day per band. The finish lines say which, in the
       spec's words.
   T2  over 1,000 papers per band each letter holds 20% ± 3% of the answers and "always X" never
       beats chance by more than 2 points a paper; the answer's rank among the five VALUES is
       balanced too (so "pick the middle one" is no strategy); a question about order stays sorted
       with its answer at a balanced position.
   §2.1 the final: once three are standing, the child's questions come from tricks they learned on
       the Atlas (fewer than three learned: the ladder, as before); each round names one live
       rival's tell and every live rival's time, without changing who gets what.
   Every check is also run against a broken twin (BROKEN …) and must fail there. */
import { newContest, playRound, championship, runOut, childQuestion, live, RIVALS, learnedPool, inFinal, tellOf, rivalGets, questionAt } from '../src/contest.js';
import { payMock, payPaper, mockMerit, paperMerit, MOCK_ROUND, PAPER_BEAT } from '../src/merit.js';
import { paper, score, BAND_IDS, BANDS, choicesFor } from '../src/papers/engine.js';
import { TRICKS, correct, byId } from '../src/tricks.js';
import { newKid } from '../src/model.js';
import { seeded } from '../src/rand.js';
import { EARN } from '../src/integration/bizzing-wallet.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
/* run a check that must FAIL on a broken twin: true when it did fail */
const breaks = (fn) => { const f0 = fails, q = console.error; console.error = () => {}; try { fn(); } finally { console.error = q; } const did = fails > f0; fails = f0; return did; };

const purse = () => { const p = { answer: 0, contest: 0, stop: 0, mastery: 0, notes: [] }; p.earn = (ev, note) => { p[ev] += EARN[ev]; p.notes.push(note); return EARN[ev]; }; return p; };

/* ---------------------------------------------------------------- T1 · the Mock Contest */

/* Play one contest the way main.js does: each right answer pays `answer` at once (cAnswer), the
   contest coins are decided at the end (cNext → payMock). `answer(q, r)` is the child. */
function playMock(k, band, seed, answer, wallet, pay = payMock, day = '2026-10-09') {
  const c = newContest(band, seed, learnedPool(k.tricks));
  const r = seeded('child:' + seed);
  let paidRights = 0, guard = 0;
  while (!c.over && guard++ < 300) {
    const you = c.field.find((f) => f.you);
    if (you.out) break;
    const champ = !!c.champ;
    if (champ) c.rq = 1;
    const q = childQuestion(c); c.rq = 0;
    const given = answer(q, r), right = given !== '' && correct(q, given);
    if (right) paidRights += wallet.earn('answer', 'a right answer in the Mock Contest') ? 1 : 0;
    if (champ) championship(c, right); else playRound(c, right);
  }
  runOut(c);
  return { c, res: pay(k, c, wallet.earn, { day, answered: paidRights }), rights: c.you.right };
}
/* the masher: any digits, or any choice — it never reads the question */
const masher = (q, r) => (q.choices ? q.choices[Math.floor(r() * q.choices.length)] : String(Math.floor(r() * 10 ** (1 + Math.floor(r() * 3)))));
const blankKid = (r) => '';
const ace = (skill) => (q, r) => (r() < skill ? String(q.ans) : q.choices ? q.choices.find((x) => x !== q.ans) : '0');

function t1Masher(pay = payMock) {
  for (const band of ['6-7', '8-10', '11-14']) {
    const k = newKid('Mash', band, 'octo'), w = purse();
    let rights = 0;
    for (let i = 0; i < 20; i++) { const g = playMock(k, band, 1000 + i, masher, w, pay); rights += g.rights; }
    ok(w.contest === 0, `T1 ${band}: a masher's 20 Mock Contests earned ${w.contest} contest coins (want 0)`);
    ok(w.answer === rights * EARN.answer, `T1 ${band}: the masher earned only its ${rights} lucky right answer(s): ${w.answer} answer coins`);
  }
  // a child who sits there and types nothing: round 1 always, no coins at all
  const k = newKid('Idle', '8-10', 'octo'), w = purse();
  for (let i = 0; i < 5; i++) playMock(k, '8-10', 50 + i, blankKid, w, pay);
  ok(w.contest + w.answer === 0, `T1: an idle child earns nothing (${w.contest + w.answer})`);
}
t1Masher();
// the old rule — `contest` for any finished contest — must fail the masher check
ok(breaks(() => t1Masher((k, c, earn) => ({ coins: earn('contest'), line: '' }))), 'BROKEN: paying contest coins for any finished contest is caught by T1');

/* a strong child: paid once a day, in the spec's words */
{
  const k = newKid('Ace', '8-10', 'octo'), w = purse();
  const a = playMock(k, '8-10', 7, ace(0.97), w);
  const m = mockMerit(a.c);
  ok(m.round >= MOCK_ROUND && a.res.coins === EARN.contest && w.contest === EARN.contest, `T1: reaching round ${m.round} pays ${EARN.contest} contest coins (${a.res.coins})`);
  ok(new RegExp(`^You reached round ${m.round}: \\+10 contest coins$`).test(a.res.line), `T1: the finish card says "You reached round ${m.round}: +10 contest coins" (${a.res.line})`);
  const b = playMock(k, '8-10', 8, ace(0.97), w);
  ok(b.res.coins === 0 && w.contest === EARN.contest && /once a day/.test(b.res.line), `T1: the second good contest of the day pays no contest coins, and says why (${b.res.line})`);
  const c2 = playMock(k, '8-10', 9, ace(0.97), w, payMock, '2026-10-10');
  ok(c2.res.coins === EARN.contest, 'T1: the next day pays again');
  ok(k.payDay['2026-10-09'].mock === true && k.payDay['2026-10-10'].mock === true, 'T1: the once-a-day record is on the child, by day');
}
/* the wording below the bar */
{
  const k = newKid('Two', '8-10', 'octo');
  const fake = (round, right) => ({ you: { asked: round, right, round } });
  const one = payMock(k, fake(2, 1), purse().earn, { answered: 1 });
  ok(one.coins === 0 && one.line.startsWith('Round 2: 1 coin for your right answer.'), `T1: "Round 2: 1 coin for your right answer" (${one.line})`);
  const none = payMock(k, fake(1, 0), purse().earn, { answered: 0 });
  ok(none.coins === 0 && /^Round 1: no coins this time/.test(none.line), `T1: no rights says so (${none.line})`);
  const four = payMock(newKid('F', '8-10', 'octo'), { you: { asked: 5, right: 4, round: 3 } }, purse().earn);
  ok(four.coins === EARN.contest && /^You got 4 right: \+10 contest coins$/.test(four.line), `T1: four right pays even before round 4 (${four.line})`);
  ok(payMock(newKid('G', '8-10', 'octo'), fake(3, 3), purse().earn).coins === 0, 'T1: round 3 with 3 right pays no contest coins');
}

/* ---------------------------------------------------------------- T1 · a paper */
function t1Paper(pay = payPaper) {
  for (const band of BAND_IDS) {
    const k = newKid('Blank', '8-10', 'octo'), w = purse();
    for (const no of [1, 2, 3]) {
      const p = paper(band, no), sc = score(p, []), blank = score(p, []).points;
      const r = pay(k, p, sc, blank, w.earn, { day: '2026-10-09' });
      ok(r.coins === 0, `T1 ${band} paper ${no}: a blank paper paid ${r.coins}`);
      ok(/tried at least half/.test(r.line || ''), `T1 ${band}: a blank paper gets the kind line (${r.line})`);
    }
    ok(w.contest === 0, `T1 ${band}: blank papers earned ${w.contest} contest coins`);
  }
}
t1Paper();
ok(breaks(() => t1Paper((k, p, sc, blank, earn) => ({ coins: earn('contest'), line: '' }))), 'BROKEN: paying any handed-in paper is caught by T1');
{
  const k = newKid('Sat', '8-10', 'octo'), w = purse(), day = '2026-10-09';
  const p1 = paper('g34', 1), N = p1.items.length, blank = score(p1, []).points;
  ok(blank === N && blank === score(p1, p1.items.map(() => undefined)).points, `the blank baseline is the paper's own score for an empty paper (${blank} = ${N} questions)`);
  // the masher: every question answered at random
  let lucky = 0, papers = 0;
  for (const band of BAND_IDS) for (let no = 1; no <= 60; no++) {
    const p = paper(band, no), r = seeded(`mash:${band}:${no}`);
    const sc = score(p, p.items.map((q) => q.choices[Math.floor(r() * 5)]));
    papers++; if (paperMerit(p, sc, score(p, []).points).merit) lucky++;
  }
  ok(lucky / papers < 0.06, `T1: a random masher's paper is above the bar only by rare luck (${lucky} of ${papers})`);
  // under half tried, even all right: nothing
  const few = score(p1, p1.items.map((q, i) => (i < Math.floor((N - 1) / 2) ? q.ans : undefined)));
  ok(payPaper(k, p1, few, blank, w.earn, { day }).coins === 0, 'T1: under half tried pays nothing, however right');
  // half tried but not 20 above blank: nothing, and the line says the bar
  const meh = score(p1, p1.items.map((q, i) => (i < N / 2 ? (i < 2 ? q.ans : q.choices.find((c) => c !== q.ans)) : undefined)));
  const mr = payPaper(k, p1, meh, blank, w.earn, { day });
  ok(mr.coins === 0 && new RegExp(`by ${PAPER_BEAT} or more`).test(mr.line), `T1: half tried below the bar pays nothing (${mr.line})`);
  // a good paper pays once; the same paper never again; another paper of the band waits for tomorrow; another band pays
  const good = score(p1, p1.items.map((q) => q.ans));
  const g1 = payPaper(k, p1, good, blank, w.earn, { day, label: BANDS.g34.label });
  ok(g1.coins === EARN.contest && /^\+10 contest coins: you beat a blank paper by/.test(g1.line), `T1: a good paper pays ${EARN.contest} (${g1.line})`);
  ok(payPaper(k, p1, good, blank, w.earn, { day: '2026-10-12' }).coins === 0, 'T1: the same paper never pays twice');
  const p2 = paper('g34', 2), g2 = payPaper(k, p2, score(p2, p2.items.map((q) => q.ans)), score(p2, []).points, w.earn, { day, label: BANDS.g34.label });
  ok(g2.coins === 0 && /once a day/.test(g2.line), `T1: a second good paper of the same band the same day pays nothing (${g2.line})`);
  const p3 = paper('g56', 1);
  ok(payPaper(k, p3, score(p3, p3.items.map((q) => q.ans)), score(p3, []).points, w.earn, { day }).coins === EARN.contest, 'T1: another band the same day pays');
  ok(payPaper(k, p2, score(p2, p2.items.map((q) => q.ans)), score(p2, []).points, w.earn, { day: '2026-10-10' }).coins === EARN.contest, 'T1: the next day, a new paper of the band pays');
}

/* ---------------------------------------------------------------- T2 · the paper's answer positions */
const PAPERS = +(process.env.PAPERS || 1000);
function t2(build = paper, count = PAPERS) {
  for (const band of BAND_IDS) {
    const at = [0, 0, 0, 0, 0], rank = [0, 0, 0, 0, 0]; let n = 0, ranked = 0, blank = 0; const always = [0, 0, 0, 0, 0];
    for (let i = 1; i <= count; i++) {
      const p = build(band, i <= 60 ? i : `t2-${i}`);
      blank += score(p, []).points;
      for (let L = 0; L < 5; L++) always[L] += score(p, p.items.map((q) => q.choices[L])).points;
      for (const q of p.items) {
        n++; at[q.choices.indexOf(q.ans)]++;
        const v = q.choices.map(Number);
        if (v.every(Number.isFinite)) { ranked++; rank[[...v].sort((a, b) => a - b).indexOf(+q.ans)]++; }
      }
    }
    // chance: a random pick gains pts/5 and loses ¾·pts/4… — exactly 0 on average, so chance IS the blank score
    const pct = at.map((x) => (100 * x) / n), beat = always.map((a) => (a - blank) / count);
    ok(pct.every((x) => Math.abs(x - 20) <= 3), `T2 ${band}: each letter holds 20% ± 3% of the answers (${pct.map((x) => x.toFixed(1)).join(' / ')})`);
    ok(beat.every((x) => x <= 2), `T2 ${band}: "always A…E" beats chance by ≤ 2 points a paper (${beat.map((x) => x.toFixed(2)).join(' / ')})`);
    const rk = rank.map((x) => (100 * x) / ranked);
    ok(rk.every((x) => Math.abs(x - 20) <= 4), `T2 ${band}: the answer's rank among the values is balanced — no "middle one" (${rk.map((x) => x.toFixed(1)).join(' / ')})`);
  }
}
t2();
{ // the old engine — sorted by value — must fail T2
  const sortedPaper = (band, no) => { const p = paper(band, no); return { ...p, items: p.items.map((q) => ({ ...q, choices: q.choices.slice().sort((a, b) => (Number.isFinite(+a) && Number.isFinite(+b) ? a - b : String(a).localeCompare(String(b)))) })) }; };
  ok(breaks(() => t2(sortedPaper, 200)), 'BROKEN: choices sorted by value are caught by T2');
}
/* a question about order: sorted, and the answer's position balanced */
{
  const at = [0, 0, 0, 0, 0];
  for (let i = 0; i < 2000; i++) {
    const r = seeded('ord' + i), ans = 20 + Math.floor(r() * 50), wrong = [ans - 3, ans - 1, ans + 1, ans + 2, ans + 5, ans - 7];
    const ch = choicesFor(ans, wrong, r, { pos: seeded('p' + i), order: true });
    ok(ch.join() === ch.slice().sort((a, b) => a - b).join(), 'an order question keeps its choices sorted');
    at[ch.indexOf(String(ans))]++;
  }
  ok(at.every((x) => Math.abs(x / 2000 - 0.2) <= 0.03), `an order question puts its answer at a balanced position (${at.join(' / ')})`);
}

/* ---------------------------------------------------------------- §2.1 · tells, times and the final */
{
  // the round's results do not depend on the times or tells drawn for the screen: replay without them
  for (let s = 0; s < 40; s++) {
    const c = newContest('8-10', 500 + s), r = seeded('x' + s);
    while (!c.over) {
      if (c.field.find((f) => f.you).out) { runOut(c); break; }
      const t = tellOf(c);
      ok(t && live(c).some((x) => x.id === t.id) && RIVALS.find((b) => b.id === t.id).tell === t.tell, 'a round names a live rival and their tell from contest.js');
      const e = playRound(c, r() < 0.8);
      const rivals = Object.keys(e.res).filter((id) => id !== 'you');
      ok(rivals.every((id) => e.times[id] > 0 && e.times[id] < 30), `every live rival has a time this round (${JSON.stringify(e.times)})`);
      if (c.champ) championship(c, r() < 0.8);
    }
  }
  // the same seeds give the same outcomes as the rule itself (rivalGets on the round's own stream)
  const c = newContest('8-10', 77); const e = playRound(c, true);
  const rr = seeded(`77:r1:0`); const want = {}; for (const x of c.field) if (!x.you && e.res[x.id] !== undefined) want[x.id] = rivalGets(RIVALS.find((b) => b.id === x.id), questionAt(e.h, rr), 1, c.start, rr);
  ok(Object.keys(want).every((id) => want[id] === e.res[id]), 'the times are a separate stream: who gets what is unchanged');

  // the final, from the child's own Atlas
  const k = newKid('Fin', '11-14', 'octo');
  const learned = ['times-eleven', 'square-five', 'nikhilam-100', 'diff-squares'];
  for (const id of learned) k.tricks[id] = { stars: 1 };
  k.tricks['tens-then-ones'] = { stars: 0, learned: true };
  k.tricks['times-nine'] = { stars: 0 };                           // opened, never learned: not in the pool
  const pool = learnedPool(k.tricks);
  ok([...learned, 'tens-then-ones'].every((id) => pool.includes(id)) && !pool.includes('times-nine'), `learned = stars ≥ 1 or the learned flag (${pool.join(', ')})`);
  ok(!learnedPool(Object.fromEntries(TRICKS.map((t) => [t.id, { stars: 3 }]))).some((id) => byId[id].draw || ['strategy', 'logic', 'figures'].includes(byId[id].world)), 'the final never draws a picture question or a Contest Hall strategy stop');
  let finals = 0, before = 0;
  for (let s = 0; s < 200; s++) {
    const c = newContest('11-14', 9000 + s, pool), r = seeded('f' + s);
    while (!c.over && !c.field.find((f) => f.you).out) {
      const q = childQuestion(c);
      if (inFinal(c)) { finals++; ok(q.final && pool.includes(q.trick) && (q.choices || /^\d+$/.test(String(q.ans))), `a final question comes from a learned trick (${q.trick})`); }
      else { before++; ok(!q.final, 'before the final, the ladder'); }
      playRound(c, r() < 0.93);
      if (c.champ) championship(c, r() < 0.93);
    }
  }
  ok(finals > 50 && before > 50, `finals were reached and played (${finals} final questions, ${before} before)`);
  // fewer than three learned: the ladder, as before
  const thin = learnedPool({ 'times-eleven': { stars: 2 }, 'square-five': { stars: 1 } });
  let leaks = 0;
  for (let s = 0; s < 100; s++) { const c = newContest('11-14', 300 + s, thin), r = seeded('t' + s); while (!c.over && !c.field.find((f) => f.you).out) { if (childQuestion(c).final) leaks++; playRound(c, r() < 0.93); if (c.champ) championship(c, true); } }
  ok(leaks === 0, `under three learned tricks the final falls back to the ladder (${leaks})`);
}

if (fails) { console.error(`honest: ${fails} failure(s)`); process.exit(1); }
console.log(`ok honest — T1 (masher, blank paper, pay on merit once a day), T2 (${PAPERS} papers × ${BAND_IDS.length} bands: letters, always-X, value rank, order questions), the final and the tells`);
