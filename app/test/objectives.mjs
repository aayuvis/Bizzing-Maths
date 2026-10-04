/* test/objectives.mjs — every goal is measured, and its measure moves with real evidence. */
import { STRANDS, goalsFor, summary, evidence } from '../src/objectives.js';
import { reportCard } from '../src/report.js';
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
a.papers = { best: {}, log: [{ band: 'g56', no: 1, points: 80, max: 150 }] };
a.lib = { tables: { level: 20 } };
const after = goalsFor(a).flatMap((s) => s.goals);
for (const g of after) ok(g.met, `${g.id} is met once the evidence is there (pct ${g.pct})`);
ok(summary(a).met === summary(a).total, 'summary counts them');
// a younger child sees older goals as "later", never as failures
const y = newKid('Y', '6-7'); const later = goalsFor(y).flatMap((s) => s.goals).filter((g) => g.later);
ok(later.length > 0 && later.every((g) => g.status === 'later'), 'older goals wait for a younger child');
ok(STRANDS.every((s) => s.goals.every((g) => typeof g.measure === 'function' && g.can.startsWith('I '))), 'every goal is an "I…" sentence with a measure');
// audit v4 Q2: no evidence is "not started yet", never 0%; a 0% needs evidence of none right
const fresh = newKid('F', '11-14');
for (const s of STRANDS) for (const g of s.goals) { let r; try { r = evidence(fresh, g.measure(fresh).how); } catch (e) { r = e.message; } ok(r === false, `${g.id}: a new child has no evidence for it (got ${r})`); }
ok(goalsFor(fresh).every((s) => s.goals.every((g) => !g.seen)), 'a new child has started no goal');
ok(reportCard(fresh).mastery.strands.every((s) => !s.started), 'the report card says every strand of a new child is not started yet');
ok(after.every((g) => g.seen), 'a child with evidence of everything has started every goal');
ok(reportCard(a).mastery.strands.every((s) => s.started), 'and the report card says every strand of theirs is started');
// evidence of NONE right is a real zero: one adding fact answered wrong
const z = newKid('Z', '8-10'); { const f = BANK['+'] ? BANK['+'][0] : Object.values(BANK).flat().find((x) => x.op === '+'); const r = blank(); record(r, false, 4000, '8-10', t0); z.facts[key(f)] = r; }
const zg = goalsFor(z).flatMap((s) => s.goals), add10 = zg.find((g) => g.id === 'add10');
ok(add10.seen && add10.pct === 0 && add10.status === 'new', `a wrong adding fact is a real 0% (seen ${add10.seen}, pct ${add10.pct})`);
ok(zg.filter((g) => g.seen).map((g) => g.id).join() === 'add10', `and starts nothing else (got ${zg.filter((g) => g.seen).map((g) => g.id)})`);
const zs = reportCard(z).mastery.strands;
ok(zs.filter((s) => s.started).map((s) => s.name).join() === 'Facts at your fingertips' && zs.find((s) => s.started).met === 0, 'the report card starts only the facts strand, at a real 0');
// a stop opened but never answered is not evidence; a drill run is
const o = newKid('O', '8-10'); trickRec(o, 'times-nine');
ok(!goalsFor(o).flatMap((s) => s.goals).some((g) => g.seen), 'opening a stop (an empty record) starts nothing');
trickRec(o, 'times-nine').runs = 1;
ok(goalsFor(o).flatMap((s) => s.goals).find((g) => g.id === 'market').seen, 'a drill run on a Times Market stop starts that goal');
console.log(`${fails ? 'FAIL' : 'ok'} objectives — ${after.length} goals in ${STRANDS.length} strands, each moved by evidence`);
if (fails) process.exit(1);
