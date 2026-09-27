/* test/contest.mjs — a contest always ends, the rules hold, and every child gets a place. */
import { newContest, playRound, championship, runOut, childQuestion, live, RIVALS, questionAt, rivalGets } from '../src/contest.js';
import { seeded } from '../src/rand.js';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 20) console.error('  ✗ ' + m); } };

ok(RIVALS.length === 10, 'ten rivals, as in the Bee');
const bee = ['Pip','Nova','Rafi','Suki','Dax','Mira','Theo','Ines','Kwame','Vesper'];
ok(RIVALS.map((b) => b.name).join() === bee.join(), 'same rivals as the Bee, same order');

for (const band of ['6-7', '8-10', '11-14']) {
  for (let s = 0; s < 300; s++) {
    const r = seeded('child' + s + band);
    const skill = r();                        // a child who is right `skill` of the time
    const c = newContest(band, s * 7 + 1);
    let rounds = 0;
    while (!c.over && rounds++ < 300) {
      const you = c.field.find((f) => f.you);
      if (you.out) { runOut(c); break; }
      const q = childQuestion(c);
      ok(q && q.text && q.ans !== undefined, 'every question has text and an answer');
      const e = playRound(c, r() < skill);
      if (e.round === 1) ok(e.out.length === 0, 'round one eliminates nobody');
      if (c.champ) championship(c, r() < skill);
    }
    ok(c.over, `${band}/${s}: contest ended`);
    ok(c.winner, 'there is a winner');
    ok(live(c).length === 0 || live(c).length === 1, 'at most one left standing');
    const you = c.field.find((f) => f.you);
    ok(Number.isInteger(you.place) && you.place >= 1 && you.place <= 11, `child has a place (${you.place})`);
    ok(c.field.filter((f) => f.place === 1).length === 1, 'exactly one champion');
  }
}
// the ladder: harder rungs are harder for a mid rival
const mid = RIVALS[4]; let easy = 0, hard = 0;
for (let i = 0; i < 4000; i++) { const r = seeded(i); easy += rivalGets(mid, questionAt(0.1, r), 3, 0.18, r); hard += rivalGets(mid, questionAt(0.9, r), 3, 0.18, r); }
ok(easy > hard * 1.5, `hardness bites (easy ${easy}, hard ${hard})`);

console.log(`${fails ? 'FAIL' : 'ok'} contest — 900 contests played to the end`);
if (fails) process.exit(1);
