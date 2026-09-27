/* test/facts.mjs — the ramp is by trickiness, not size; fluency needs a gap; sessions behave. */
import { BANK, ramp, tricky, why, answer, text, key, record, blank, state, session, MASTERED_BOX, tally } from '../src/facts.js';
import { seeded } from '../src/rand.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 20) console.error('  ✗ ' + m); } };

ok(BANK['×'].length === 91 && BANK['+'].length === 66, 'bank sizes (sorted pairs)');
for (const op of Object.keys(BANK)) for (const f of BANK[op]) {
  ok(Number.isInteger(answer(f)) && answer(f) >= 0, `${text(f)} has a whole answer`);
  const w = why(f); ok(w && w.length > 4, `${text(f)} has a why`);
  if (answer(f) > 9) ok(!w.includes(String(answer(f))), `why for ${text(f)} leaks the answer: ${w}`);
}
const T = (a, b) => tricky({ op: '×', a, b });
// the Bee's rule, for numbers: difficulty is trickiness, not size
ok(T(7, 8) > T(12, 12), '7×8 trickier than 12×12');
ok(T(6, 8) > T(10, 12), '6×8 trickier than 10×12');
ok(T(7, 8) > T(9, 9) && T(7, 7) > T(5, 5), 'the 6-7-8 block sits above squares of friendly numbers');
ok(T(1, 12) < T(2, 3), 'anything × 1 is easy however big');
ok(tricky({ op: '+', a: 7, b: 8 }) > tricky({ op: '+', a: 5, b: 5 }), 'crossing ten beats a double');
ok(tricky({ op: '-', a: 13, b: 8 }) > tricky({ op: '-', a: 9, b: 4 }), 'crossing back over ten is harder');
const r = ramp('×'); ok(r.findIndex((f) => f.a === 7 && f.b === 8) > r.findIndex((f) => f.a === 12 && f.b === 12), 'ramp puts 7×8 after 12×12');

// fluency needs a gap: five fast answers in one sitting do not make a fact fluent
const now = Date.UTC(2026, 0, 1);
let rec = blank(); for (let i = 0; i < 5; i++) record(rec, true, 800, '8-10', now + i * 1000);
ok(state(rec) !== 'fluent', 'no fluency inside one sitting');
rec = blank(); let t = now;
for (const d of [0, 1, 3, 7]) { t = now + d * 86400000 + 10; record(rec, true, 800, '8-10', t); }
ok(rec.box >= MASTERED_BOX && state(rec) === 'fluent', `fluent after answers spaced across a week (box ${rec.box})`);
record(rec, false, 800, '8-10', t + 86400000 * 30);
ok(rec.box === MASTERED_BOX - 1 && rec.lapsed && state(rec) === 'trap', 'a miss drops one box, marks a lapse, and makes it a trap');
rec = blank(); record(rec, true, 9000, '8-10', now);
ok(rec.box === 0, 'slow-and-right does not climb');

// sessions: a new child gets 20, with at most four new, never two new side by side
const d = session({}, '×', { r: seeded(1) });
ok(d.length >= 18 && d.every((f) => f.discover), 'a new child gets a discovery session');
ok(!d.some((f) => f.a <= 1), 'discovery for 8+ skips × 0 and × 1');
ok(Math.max(...d.map(tricky)) > 5, 'discovery reaches the hard end of the table');
// a child with a dozen facts behind them gets the real session
const seen = {}; ramp('×').slice(10, 40).forEach((f) => { seen[key(f)] = record(blank(), true, 900, '8-10', now); });
const s = session(seen, '×', { r: seeded(1), now: now + 86400000 * 2 });
ok(s.length === 20 && !s.some((f) => f.discover), `20 in a real session (${s.length})`);
ok(s.filter((f) => f.fresh).length <= 4, 'at most four new');
ok(s.every((f, i) => !(f.fresh && s[i + 1] && s[i + 1].fresh)), 'no two new facts adjacent');
ok(s.every((f) => BANK['×'].some((g) => key(g) === key(f))), 'facts come from the bank');
// traps come first-ish and "only traps" means only traps
const facts = {}; const trapF = { op: '×', a: 7, b: 8 }; facts[key(trapF)] = record(blank(), false, 2000, '8-10', now);
ok(session(facts, '×', { only: 'traps' }).length === 1, 'my traps = just the traps');
ok(session(facts, '×', { r: seeded(2) }).some((f) => key(f) === key(trapF)), 'a trap is in the next session');
ok(tally({}, 'mix').total === Object.values(BANK).reduce((a, b) => a + b.length, 0), 'tally covers the bank');
console.log(`${fails ? 'FAIL' : 'ok'} facts — trickiness ramp, spaced fluency, sessions`);
if (fails) process.exit(1);
