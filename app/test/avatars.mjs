// avatars.mjs — the picker is five packs of six, every face has a file, and no
// real person or deity is ever in it (the Bee's rule, which this app keeps).
import { existsSync, statSync } from 'node:fs';
import { AVATAR_PACKS, AVATARS, AVATAR_NAME, AVATAR_KEPT, avatarFile, newKid } from '../src/model.js';
import { RIVALS } from '../src/contest.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
const file = (id) => new URL(`../public/avatars/${id}.webp`, import.meta.url);

// Bizzing Bee's people and gods (avatars.js: World Changers, Spelling
// Champions, European Gods, Indian Gods and the retired Gods pack). None of
// them may ever be offered in this picker.
const DENY = [
  'newton', 'mlk', 'gutenberg', 'nightingale', 'qinshihuang', 'curie', 'gandhi', 'aryabhatta', 'buddha', 'einstein',
  'neuhauser', 'pbell', 'lucas', 'brobinson', 'stover', 'bolden',
  'thor', 'poseidon', 'ra', 'athena', 'hades', 'anubis', 'freya', 'loki', 'apollo', 'isis', 'hanuman', 'lakshmi',
  'amaterasu', 'zeus', 'rama', 'odin', 'krishna', 'shiva', 'ganesha', 'durga', 'saraswati',
];

ok(AVATAR_PACKS.length === 5, `exactly 5 packs (got ${AVATAR_PACKS.length})`);
for (const p of AVATAR_PACKS) {
  ok(p.avatars.length === 6, `${p.id}: 6 avatars (got ${p.avatars.length})`);
  ok(p.id && p.name && p.blurb, `${p.id}: has id, name and blurb`);
  ok(!('price' in p) && !('rarity' in p) && !('locked' in p), `${p.id}: no price, rarity or lock — all free`);
}
ok(new Set(AVATAR_PACKS.map((p) => p.id)).size === 5, 'pack ids unique');
ok(AVATARS.length === 30 && new Set(AVATARS).size === 30, `30 unique avatar ids (got ${new Set(AVATARS).size} of ${AVATARS.length})`);
ok(JSON.stringify(AVATARS) === JSON.stringify(AVATAR_PACKS.flatMap((p) => p.avatars)), 'AVATARS is the packs, in order');

for (const id of AVATARS) {
  ok(existsSync(file(id)) && statSync(file(id)).size > 2000, `${id}: has a file in public/avatars/`);
  ok(AVATAR_NAME[id], `${id}: has a name`);
  ok(!DENY.includes(id), `${id}: is a real person or a deity`);
}
// the rivals and story cast, and the kept faces, still draw
for (const id of [...RIVALS.map((b) => b.id), ...AVATAR_KEPT]) ok(existsSync(file(id)), `${id}: kept file present`);
ok(RIVALS.length === 10, 'ten contest rivals');

// fallback: an id from nowhere draws as the first face; a kept one draws as itself
ok(avatarFile('panda') === 'panda', 'an old picker face still draws as itself');
ok(avatarFile('zeus') === AVATARS[0] && avatarFile(undefined) === AVATARS[0], 'an unknown id falls back to the first face');

// newKid defaults to a valid face, and never takes one from outside the picker
ok(AVATARS.includes(newKid('A', '8-10').avatar), 'newKid defaults to a picker face');
ok(newKid('A', '8-10', 'hexbee').avatar === 'hexbee', 'newKid keeps a chosen face');
ok(newKid('A', '8-10', 'shiva').avatar === AVATARS[0], 'newKid refuses a face outside the picker');

if (fails) { console.error(`avatars: ${fails} failure(s)`); process.exit(1); }
console.log(`avatars: ok — ${AVATAR_PACKS.length} packs × 6, ${AVATARS.length} faces, all with files, none on the denylist`);
