// avatars.mjs — the family's 96 (FAMILY-STANDARD §8): validate() from the shared engine returns [],
// every face has a file, packs pair two to each world, every Legendary names a LEARNING milestone,
// nobody real or sacred is in the collection, and buying goes only through the engine at fixed prices.
import { existsSync, statSync, readFileSync } from 'node:fs';
import { CATALOGUE, PACKS, COMMONS, milestonesOf, avatarCtx } from '../src/avatars.js';
import { validate, stateOf, sacredSafe, worldOf, TIERS } from '../src/integration/bizzing-avatars.js';
import { AVATAR_KEPT, avatarFile, newKid } from '../src/model.js';
import { RIVALS } from '../src/contest.js';
import { TRICKS, tricksIn } from '../src/tricks.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
const file = (id) => new URL(`../public/avatars/${id}.webp`, import.meta.url);

const err = validate(CATALOGUE);
ok(err.length === 0, `validate(catalogue) returns [] (got ${err.slice(0, 4).join('; ')})`);
ok(validate(CATALOGUE.map((a, i) => (i ? a : { ...a, tier: 'rare' }))).length > 0 && validate(CATALOGUE.slice(1)).length > 0, 'validate() is watched failing: a re-tiered face or a missing one is caught');
ok(sacredSafe(CATALOGUE, []).length === 0 && !CATALOGUE.some((a) => a.real || a.sacred), 'no real person or sacred figure in the collection');
// the engine is the family's, byte for byte
for (const [f, here] of [['bizzing-avatars.js', '../src/integration/'], ['bizzing-wallet.js', '../src/integration/'], ['bizzing-activity.js', '../src/integration/'],
  ['bizzing-shell.js', '../src/integration/'], ['bizzing-shell.css', '../styles/'], ['bizzing-feed.js', '../src/integration/'], ['bizzing-feed.css', '../styles/'], ['bizzing-avatars.css', '../styles/'], ['shell-check.mjs', './lib/']]) {
  const theirs = '/home/user/Bizzing_Schedule/integration/' + f;
  if (existsSync(theirs)) ok(readFileSync(theirs, 'utf8') === readFileSync(new URL(here + f, import.meta.url), 'utf8'), `${f} is the family's copy, unedited`);
}
ok(PACKS.length === 12 && new Set(PACKS.map((p) => p.id)).size === 12, 'twelve packs');
for (let w = 1; w <= 6; w++) ok(CATALOGUE.filter((a) => worldOf(a) === w).length === 16, `world ${w} holds two packs`);
const DENY = ['newton', 'mlk', 'gutenberg', 'nightingale', 'curie', 'gandhi', 'aryabhatta', 'buddha', 'einstein', 'thor', 'zeus', 'odin', 'krishna', 'shiva', 'ganesha', 'durga', 'saraswati', 'hanuman', 'lakshmi', 'rama'];
for (const a of CATALOGUE) {
  ok(existsSync(file(a.id)) && statSync(file(a.id)).size > 2000, `${a.id}: has a file`);
  ok(!DENY.includes(a.id), `${a.id}: a real person or a deity`);
  if (a.tier === 'legendary') ok(/^(world:[a-z]+|medal:[a-z0-9-]+)$/.test(a.milestone.id) && /^(finish |clear |get |earn )/.test(a.milestone.label), `${a.id}: a learning milestone in words (${a.milestone.label})`);
}
// A face may also be in a sibling's 96 (owner, 3 Oct 2026: "keep shared avatars, no harm"), so
// the old cross-app overlap check is gone. Each app's own 96 is still checked above.
// a Legendary's milestone is read from the record: finishing the Deep Mine opens the Sunflower Lion's
const k = newKid('Asha', '8-10');
ok(!milestonesOf(k).has('world:mine'), 'nobody has finished the Deep Mine on day one');
for (const t of tricksIn('mine')) k.tricks[t.id] = { stars: 1 };
ok(milestonesOf(k).has('world:mine'), 'every Deep Mine stop passed is the milestone');
const lion = CATALOGUE.find((a) => a.id === 'sunlion');
ok(lion.milestone.label === 'finish the Deep Mine', 'the Sunflower Lion asks to finish the Deep Mine');
const h = { parent: { plan: 'free' } }, k2 = newKid('Ravi', '8-10');
ok(stateOf(lion, avatarCtx(h, k2)).say === 'Opens with its world', 'a shut world says so');
ok(stateOf(lion, avatarCtx({ parent: { plan: 'family' } }, k2)).say === 'First: finish the Deep Mine', 'then it names the learning first');
ok(stateOf(lion, avatarCtx({ parent: { plan: 'family' } }, k)).state === 'buy' && TIERS.legendary.price === 500, 'then 500 coins');
// commons are free to every child; a new child starts on one
ok(COMMONS.length === 24 && COMMONS.every((id) => stateOf(CATALOGUE.find((a) => a.id === id), avatarCtx(h, k2)).state === 'owned'), 'the 24 Commons are free to everyone');
ok(COMMONS.includes(newKid('A', '8-10').avatar) && newKid('A', '8-10', 'supernova').avatar === 'octo' && newKid('A', '8-10').avatar === 'octo' && COMMONS.includes('octo'), 'a new child starts on a Common — Octo unless they pick another — never a bought face');
// rivals, cast and old faces still draw
for (const id of [...RIVALS.map((b) => b.id), ...AVATAR_KEPT]) ok(existsSync(file(id)), `${id}: kept file present`);
ok(avatarFile('zeus') === 'octo', 'an unknown id falls back to Octo');
void TRICKS;
if (fails) { console.error(`avatars: ${fails} failure(s)`); process.exit(1); }
console.log(`avatars: ok — validate() = [], 96 in 12 packs of 8, two packs a world, every Legendary a learning milestone`);
