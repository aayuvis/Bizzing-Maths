/* The level rule (games spec §1.4): 80%+ offers the next, 50%+ keeps, under 50% drops one.
   Each line was watched to fail with the rule broken. */
import { levelOf, setLevel, afterRound, verdictLine, MAX_LV } from '../src/game-level.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  ✗ ' + m); } };
const k = {};
ok(levelOf(k, 'rush') === 1, 'a new child starts at level 1');
setLevel(k, 'rush', 3);
let v = afterRound(k, 'rush', 6, 10); ok(v.lv === 3 && v.kept && !v.offer, '60% keeps the level');
v = afterRound(k, 'rush', 4, 10); ok(v.lv === 2 && v.dropped, '40% drops one level');
v = afterRound(k, 'rush', 8, 10); ok(v.lv === 2 && v.offer === 3, '80% offers the next — never forces it');
v = afterRound(k, 'rush', 5, 10); ok(v.lv === 2 && v.kept, 'exactly 50% keeps');
setLevel(k, 'rush', 1); v = afterRound(k, 'rush', 0, 10); ok(v.lv === 1, 'level 1 never drops below 1');
setLevel(k, 'rush', 9); ok(levelOf(k, 'rush') === MAX_LV, 'levels stop at 5');
v = afterRound(k, 'rush', 10, 10); ok(v.offer === null, 'no offer past level 5');
ok(levelOf(k, 'line') === 1 && levelOf(k, 'rush') === 5, 'each game keeps its own level');
ok(/keep Level 2/.test(verdictLine({ pct: .6, lv: 2, kept: true })) && /easier/.test(verdictLine({ pct: .3, lv: 1, dropped: true })), 'the verdict is said in words');
console.log(bad ? `FAIL game-level — ${bad}` : 'ok game-level — 80% offers, 50% keeps, under 50% drops one, per game');
process.exit(bad ? 1 : 0);
