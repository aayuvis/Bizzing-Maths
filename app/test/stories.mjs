/* test/stories.mjs — every stop has a story, every story's arithmetic is right,
   and every character is one of the Bee's ten. */
import { STORIES, SCENES, evalSum } from '../src/stories.js';
import { TRICKS } from '../src/tricks.js';
import { RIVALS } from '../src/contest.js';
import { existsSync } from 'node:fs';
let fails = 0, sums = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 25) console.error('  ✗ ' + m); } };
const ids = new Set(RIVALS.map((r) => r.id));
for (const t of TRICKS) ok(STORIES[t.id], `${t.id} has a story`);
for (const [id, s] of Object.entries(STORIES)) {
  ok(TRICKS.some((t) => t.id === id), `${id}: story for a stop that does not exist`);
  ok(SCENES.includes(s.scene), `${id}: unknown scene ${s.scene}`);
  ok(existsSync(new URL(`../public/art/s-${s.scene}.webp`, import.meta.url)), `${id}: scene art s-${s.scene}.webp is missing`);
  ok(s.cast.length === 2 && s.cast.every((c) => ids.has(c)), `${id}: cast must be two of the Bee's rivals`);
  ok(s.beats.length >= 5, `${id}: at least five beats`);
  let last = null;
  for (const b of s.beats) {
    ok(typeof b.say === 'string' && b.say.length > 3 && b.say.length <= 170, `${id}: beat text 4–170 chars: "${b.say}"`);
    ok(b.who === null || s.cast.includes(b.who), `${id}: ${b.who} speaks but is not in the cast`);
    if (b.add) {
      ok(typeof b.add.t === 'string', `${id}: notepad line has no sum`);
      if (b.add.v !== undefined) { sums++; const v = evalSum(b.add.t); ok(v === b.add.v, `${id}: notepad says ${b.add.t} = ${b.add.v}, arithmetic says ${v}`); last = b.add; }
    }
  }
  ok(last, `${id}: the notepad ends on a checked answer`);
  ok(s.beats.some((b) => b.who === null), `${id}: a narrator sets the scene`);
}
// prove the check bites
let bit = false; try { bit = evalSum('7 × 8') !== 54; } catch {} ok(bit, 'evalSum catches a wrong sum');
console.log(`${fails ? 'FAIL' : 'ok'} stories — ${Object.keys(STORIES).length} stories, ${sums} notepad sums checked`);
if (fails) process.exit(1);
