/* test/objectives.mjs — every goal is measured, and its measure moves with real evidence. */
import { STRANDS, goalsFor, summary } from '../src/objectives.js';
import { newKid, trickRec } from '../src/model.js';
import { BANK, key, record, blank } from '../src/facts.js';
import { TRICKS } from '../src/tricks.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } };
const a = newKid('A', '11-14');
const before = Object.fromEntries(goalsFor(a).flatMap((s) => s.goals).map((g) => [g.id, g.pct]));
ok(Object.values(before).every((p) => p === 0), 'a new child has met nothing');
// fill the record with evidence of everything
const t0 = Date.UTC(2026, 0, 1);
for (const f of Object.values(BANK).flat()) { const r = blank(); for (const d of [0, 1, 3, 7]) record(r, true, 500, '11-14', t0 + d * 864e5 + 1); a.facts[key(f)] = r; }
for (const t of TRICKS) { const r = trickRec(a, t.id); r.learned = true; r.stars = 3; a.stories[t.id] = true; }
a.games.line = { best: 70 }; a.puzzles = { patterns: { right: 25 }, space: { right: 20 }, balance: { right: 20 }, sudoku: { solved: { 9: 6 } } };
a.quest = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, { passed: true, stars: 3 }]));
a.contest = { best: 1, wins: 1, runs: 1 };
const after = goalsFor(a).flatMap((s) => s.goals);
for (const g of after) ok(g.met, `${g.id} is met once the evidence is there (pct ${g.pct})`);
ok(summary(a).met === summary(a).total, 'summary counts them');
// a younger child sees older goals as "later", never as failures
const y = newKid('Y', '6-7'); const later = goalsFor(y).flatMap((s) => s.goals).filter((g) => g.later);
ok(later.length > 0 && later.every((g) => g.status === 'later'), 'older goals wait for a younger child');
ok(STRANDS.every((s) => s.goals.every((g) => typeof g.measure === 'function' && g.can.startsWith('I '))), 'every goal is an "I…" sentence with a measure');
console.log(`${fails ? 'FAIL' : 'ok'} objectives — ${after.length} goals in ${STRANDS.length} strands, each moved by evidence`);
if (fails) process.exit(1);
