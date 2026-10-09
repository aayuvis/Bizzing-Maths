/* test/machine.mjs — Beat the Machine's engine (games spec §2.3, acceptance M1–M5; M6 is the
   browser's, test/machine-ui.mjs). Every check here was watched to fail with its feature broken.

   M1  a random card-picker — who even types the right answer at once whenever its card is right —
       wins no more than 15% of heats at level 1; a perfect player wins them all.
   M2  10,000 decoys: each fails the precondition of the card it tempts, no card in the pool fits
       it (so Straight is honestly right on any rail), and its answer is plain arithmetic.
   M3  the trick test, extended to the machine: over every level's sums, decoys included, the
       stop's own q() rebuilt from the sum for EVERY card that fits gives the same answer, its
       work(q) ends on it, every middle step's x agrees (test/lib/steps.mjs), the machine's tape
       ends on it, and the slate the child sees before answering never shows it (rule 3).
   M4  only earned cards (2 stars or more) are ever on the rail; fewer than three earned, no match.
   M5  the honest label is on exactly the cards whose stop carries a sutra, word for word.
   Plus: the level table (decoy share, speed), the opponents' strengths, pay and the gap rule. */
import * as M from '../src/machine.js';
import { byId } from '../src/tricks.js';
import { seeded } from '../src/rand.js';
import { earnedIds, machineCard } from '../src/machine-card.js';
import { checkSteps } from './lib/steps.mjs';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; if (fails < 40) console.error('  ✗ ' + m); } };
const plainOf = (q) => Function(`return (${q.expr})`)();
const nums = (html) => (String(html).replace(/<[^>]*>/g, ' ').match(/\d+/g) || []).map(Number);

/* every card is a real stop */
for (const id of M.CARD_IDS) ok(byId[id] && M.CARDS[id], `${id}: a card must be a real stop with a precondition`);

/* ---------------- M1: a random picker cannot win by luck */
{
  const r = seeded('m1'), heats = 3000; let won = 0, perfect = 0;
  for (let h = 0; h < heats / M.HEATS; h++) {
    const m = M.newMatch(M.CARD_IDS, 1, 0, r), p = M.newMatch(M.CARD_IDS, 1, 0, r);
    m.sums.forEach((q, i) => { const pickId = m.rail[Math.floor(r() * m.rail.length)]; M.judge(m, i, pickId, true, true); });
    p.sums.forEach((q, i) => M.judge(p, i, M.rightCards(q, p.rail)[0], true, true));
    won += M.summary(m).won; perfect += M.summary(p).won;
  }
  ok(won / heats <= 0.15, `M1: a random card-picker wins ${(100 * won / heats).toFixed(1)}% of level-1 heats (must be ≤ 15%)`);
  ok(perfect === heats, `M1: a perfect player wins every heat (${perfect}/${heats})`);
  if (process.env.V) console.log(`  M1: random ${(100 * won / heats).toFixed(1)}% · perfect ${perfect}/${heats}`);
}

/* ---------------- M2: 10,000 decoys, each proved */
{
  const r = seeded('m2'); let d = 0;
  for (let i = 0; i < 10000; i++) {
    const tempt = M.CARD_IDS[i % M.CARD_IDS.length], q = M.decoy(tempt, r); d++;
    ok(q.decoy && q.tempt === tempt, `M2: decoy ${q.text} is labelled with what it tempts`);
    ok(!M.holds(tempt, q), `M2: decoy ${q.text} FITS the card it tempts (${tempt})`);
    ok(typeof M.whyNot(tempt, q) === 'string' && M.whyNot(tempt, q).length > 10, `M2: decoy ${q.text} has no "why not" for ${tempt}`);
    ok(M.fits(q).length === 0, `M2: decoy ${q.text} fits ${M.fits(q).join(', ')} — Straight would not be right`);
    ok(M.rightCards(q, [...M.CARD_IDS, M.STRAIGHT]).join() === M.STRAIGHT, `M2: Straight is the right card for ${q.text}`);
    ok(plainOf(q) === q.ans && M.tape(q).at(-1).v === q.ans, `M2: ${q.text}: the Straight answer ${q.ans} is plain arithmetic and the tape agrees`);
  }
  ok(d === 10000, 'M2: ten thousand decoys');
}

/* ---------------- M3: trick, ans, expr — and the tape, and the slate — agree on every sum */
{
  const r = seeded('m3'); let sums = 0, decoys = 0, routes = 0;
  for (let lv = 1; lv <= 5; lv++) for (let g = 0; g < 120; g++) {
    const m = M.newMatch(M.CARD_IDS, lv, g % 3, r);
    ok(m.sums.length === M.SUMS && new Set(m.sums.map((q) => q.text)).size === M.SUMS, `M3: L${lv} match has ${M.SUMS} different sums`);
    for (const q of m.sums) {
      sums++; if (q.decoy) decoys++;
      ok(plainOf(q) === q.ans, `M3: ${q.text}: ans ${q.ans} but plain arithmetic says ${plainOf(q)}`);
      const tp = M.tape(q);
      ok(tp.at(-1).v === q.ans && tp.slice(0, -1).every((l) => l.v === undefined), `M3: ${q.text}: the tape ends on ${tp.at(-1).v}, not ${q.ans}`);
      ok(!tp.slice(0, -1).some((l) => nums(l.t).includes(q.ans)), `M3: ${q.text}: the tape prints the answer before its last line`);
      if (!q.decoy) ok(M.holds(q.src, q), `M3: ${q.text} was made by ${q.src}'s own gen but its card does not fit`);
      for (const id of M.fits(q)) {
        const t = byId[id], tq = t.q(M.CARDS[id].norm(q)), w = t.work(tq); routes++;
        ok(tq.ans === q.ans && plainOf(tq) === q.ans, `M3: ${id} on ${q.text}: the stop's own q() says ${tq.ans}`);
        ok(w.at(-1).v === q.ans, `M3: ${id} on ${q.text}: work(q) ends on ${w.at(-1).v}, not ${q.ans}`);
        checkSteps(id, tq, w, ok);
        const s = M.slateParts(q, id);
        ok(!nums(s.fig).includes(q.ans) && !s.steps.some((x) => nums(x).includes(q.ans)), `M3: ${id} on ${q.text}: the slate shows the answer ${q.ans} before it is typed`);
      }
      for (const id of m.rail) if (id !== M.STRAIGHT && !M.holds(id, q)) ok(M.explain(id, q, m.rail).length > 20, `M3: ${q.text}: no explanation for a wrong pick of ${id}`);
    }
  }
  ok(decoys > 0 && routes > sums - decoys, `M3: decoys and every fitting card were checked (${sums} sums, ${decoys} decoys, ${routes} trick routes)`);
  if (process.env.V) console.log(`  M3: ${sums} sums, ${decoys} decoys, ${routes} trick routes`);
}

/* ---------------- the machine's long way, on its own */
{
  const r = seeded('tape');
  for (let i = 0; i < 6000; i++) {
    const op = ['+', '−', '×', '²'][i % 4], a = 1 + Math.floor(r() * 999), b = 1 + Math.floor(r() * (op === '−' ? a : 999));
    const q = M.plain(op, a, b);
    ok(M.tape(q).at(-1).v === plainOf(q), `tape: ${q.text} reads ${M.tape(q).at(-1).v}, plain arithmetic ${plainOf(q)}`);
  }
}

/* ---------------- M4: only earned cards */
{
  const r = seeded('m4');
  const kid = (stars) => ({ tricks: Object.fromEntries(Object.entries(stars).map(([id, s]) => [id, { stars: s }])) });
  ok(earnedIds(kid({ 'round-add': 2, 'times-eleven': 3, 'square-five': 1, 'make-ten': 3 })).join() === 'round-add,times-eleven', 'M4: earned means 2 stars or more, and only pool stops');
  for (let i = 0; i < 400; i++) {
    const own = M.CARD_IDS.filter(() => r() < 0.5);
    for (let lv = 1; lv <= 5; lv++) {
      if (own.length < M.MIN_EARNED) { let threw = false; try { M.newMatch(own, lv, 0, r); } catch { threw = true; } ok(threw, `M4: a match started with only ${own.length} earned`); continue; }
      const m = M.newMatch(own, lv, 0, r);
      ok(m.rail.at(-1) === M.STRAIGHT && m.rail.slice(0, -1).every((id) => own.includes(id)), `M4: L${lv} rail ${m.rail.join()} offers an unearned card (earned ${own.join()})`);
      ok(m.rail.length - 1 === Math.min(own.length, M.LEVELS[lv - 1].cards) && m.rail.length <= 8, `M4: L${lv} has ${m.rail.length - 1} cards in play`);
      ok(m.sums.every((q) => (q.decoy ? m.rail.includes(q.tempt) : m.rail.includes(q.src))), `M4: L${lv}: a sum comes from, or tempts, a card not on the rail`);
    }
  }
  ok(/Earn 3 more tricks/.test(machineCard(kid({}))) && /Beat the Machine/.test(machineCard(kid({}))) && !/\p{Extended_Pictographic}/u.test(machineCard(kid({}))), 'M4: the hero card says how many to earn, with no emoji');
}

/* ---------------- M5: the honest label */
{
  ok(M.VEDIC_LABEL === "From Bharati Krishna Tirtha's book (1965). Scholars have not found these in the Vedas themselves; the maths is real, and here is why it works.", 'M5: the label is the spec\'s sentence, word for word');
  for (const id of M.CARD_IDS) {
    ok(M.isVedic(id) === !!byId[id].sutra, `M5: ${id} is labelled Vedic exactly when its stop carries a sutra`);
    ok(M.algebra(id).label === (byId[id].sutra ? M.VEDIC_LABEL : ''), `M5: ${id}'s after-heat algebra carries the label iff Vedic`);
    ok(M.algebra(id).alg === byId[id].alg && (M.algebra(id).fig || M.algebra(id).steps.length), `M5: ${id}'s algebra is its stop's, with a figure or worked steps`);
  }
  ok(M.CARD_IDS.filter(M.isVedic).length >= 4 && M.CARD_IDS.some((id) => !M.isVedic(id)), 'M5: some cards are Vedic and some are plain tricks');
}

/* ---------------- the level table */
{
  const r = seeded('lv');
  for (let lv = 1; lv <= 5; lv++) {
    const L = M.LEVELS[lv - 1], m = M.newMatch(M.CARD_IDS, lv, 0, r), share = m.sums.filter((q) => q.decoy).length / M.SUMS;
    ok(Math.abs(share - L.decoy) <= 0.5 / M.SUMS + 1e-9 + 0.02, `level ${lv}: ${Math.round(share * 100)}% decoys, the table says ${Math.round(L.decoy * 100)}%`);
    if (lv > 1) ok(L.stepMs <= M.LEVELS[lv - 2].stepMs && L.cards >= M.LEVELS[lv - 2].cards, `level ${lv}: the machine never slows and the cards never shrink as the level climbs`);
  }
  ok(M.LEVELS[0].stepMs > M.LEVELS[2].stepMs && M.LEVELS[2].stepMs > M.LEVELS[3].stepMs, 'slow, medium, fast');
}

/* ---------------- the opponents: each has a weakness to exploit */
{
  const add = M.plain('+', 47, 38), mul = M.plain('×', 34, 21), sq = M.plain('²', 96);
  ok(M.lineMs(add, 3, 1) < M.lineMs(add, 3, 0) && M.lineMs(mul, 3, 1) > M.lineMs(mul, 3, 0), 'the Abacus Twins are fast at + and slow at ×');
  ok(M.lineMs(mul, 3, 2) < M.lineMs(mul, 3, 0) && M.lineMs(sq, 3, 2) > M.lineMs(sq, 3, 0), 'Professor Logarithm is fast at × and slow at squares near 100');
  ok(M.FOES.length === 3 && /invented/.test(M.INVENTED), 'three opponents, labelled as invented');
}

/* ---------------- pay and the gap rule */
{
  const m = M.newMatch(M.CARD_IDS, 3, 0, seeded('pay'));
  m.sums.forEach((q, i) => M.judge(m, i, M.rightCards(q, m.rail)[0], i % 5 !== 0, true));   // 16 of 20 right: every heat 3 of 4
  const s = M.summary(m);
  ok(s.won === 5 && s.right === 16 && s.sweep, `a clean sweep at level 3 with 80% pays contest (${JSON.stringify(s)})`);
  const lo = { ...m, lv: 2, results: m.results }; ok(!M.summary(lo).sweep, 'a sweep at level 2 does not pay contest');
  const k = { payDay: {} };
  ok(M.payContest(k, s, 'd1') && !M.payContest({ payDay: { machine: 'd1' } }, s, 'd1') && M.payContest({ payDay: { machine: 'd0' } }, s, 'd1'), 'contest pays once a day');
  ok(M.payHeat(true, 9) === 1 && M.payHeat(true, 10) === 0 && M.payHeat(false, 0) === 0, 'answer coins: one per heat won, ten a session');
  // a lucky card with a wrong answer is not a beaten sum
  const m2 = M.newMatch(M.CARD_IDS, 1, 0, seeded('luck'));
  ok(!M.judge(m2, 0, M.rightCards(m2.sums[0], m2.rail)[0], false, true).beat && !M.judge(m2, 1, M.rightCards(m2.sums[1], m2.rail)[0], true, false).beat, 'a right card needs a right answer, before the tape ends');
  const kk = {};
  ok(M.noteSeen(kk, 'crosswise', 'd1') === false && M.noteSeen(kk, 'crosswise', 'd1') === false && M.noteSeen(kk, 'crosswise', 'd2') === true && kk.machine.seen.crosswise.right === 1, 'rule 4: a recognition counts only on a later day');
}

console.log(fails ? `machine: ${fails} of ${n} checks FAILED` : `machine: ${n} checks passed — M1–M5, the tape, the levels, the opponents, pay`);
process.exit(fails ? 1 : 0);
