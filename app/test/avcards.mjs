// avcards.mjs — Bizzing Bee's avatar cards for this app's 96 (avatar-cards.js):
// every card has a power and lore and draws without undefined or NaN; the stats are a fixed game
// (deterministic, 28–99, Legendaries above Commons); the ranking is 1..96 with no gaps and no ties,
// and 1..8 inside each pack; and the history a card tells is read from the record, never invented.
import { CATALOGUE, PACKS, byAvatar } from '../src/avatars.js';
import { WORDS, STATS, statsOf, cardOf, cardHTML, historyOf, day } from '../src/avatar-cards.js';
import { newKid } from '../src/model.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };

ok(Object.keys(WORDS).length === 96 && CATALOGUE.every((a) => WORDS[a.id]), `a power and lore for each of the 96 (got ${Object.keys(WORDS).length}, missing ${CATALOGUE.filter((a) => !WORDS[a.id]).map((a) => a.id).join(',')})`);
ok(Object.keys(WORDS).every((id) => byAvatar[id]), `no words for a face that is not in the catalogue (${Object.keys(WORDS).filter((id) => !byAvatar[id]).join(',')})`);
for (const a of CATALOGUE) {
  const [power, lore] = WORDS[a.id] || [];
  ok(power && / — /.test(power) && power.length <= 90, `${a.id}: a one-line power, "Name — what it does" (${power})`);
  ok(lore && lore.length >= 20 && lore.length <= 130, `${a.id}: a short line of lore (${lore && lore.length})`);
  // no numerals on a card: a figure in a power or a lore line could teach something untrue
  ok(!/\d/.test(power + lore), `${a.id}: no numerals in its power or lore`);
  const html = cardHTML(a.id, { owned: true, history: ['In your collection'] }), locked = cardHTML(a.id, { owned: false, earn: 'First: x' });
  ok(!/undefined|NaN|\[object/.test(html) && !/undefined|NaN|\[object/.test(locked), `${a.id}: its card draws with no undefined or NaN`);
  ok(html.includes(`>${a.name.replace(/&/g, '&amp;')}<`) && html.includes(cardOf(a.id).tierLabel) && (html.match(/class="avc-stat"/g) || []).length === 4, `${a.id}: the card shows its name, tier and four stats`);
}
// no real person, nothing sacred in the fiction
const DENY = /\b(god|goddess|deity|lord|krishna|shiva|rama|ganesha|buddha|allah|jesus|guru|temple|holy|sacred|prayer|newton|einstein|aryabhata)\b/i;
ok(!Object.values(WORDS).flat().some((t) => DENY.test(t)), `no deity, sacred word or real person in the words (${Object.values(WORDS).flat().filter((t) => DENY.test(t)).join(' | ')})`);

/* stats */
const s1 = CATALOGUE.map((a) => statsOf(a.id, a.tier)), s2 = CATALOGUE.map((a) => statsOf(a.id, a.tier));
ok(JSON.stringify(s1) === JSON.stringify(s2), 'stats are deterministic');
ok(s1.every((s) => STATS.every(([k]) => Number.isInteger(s[k]) && s[k] >= 28 && s[k] <= 99)), 'every stat is a whole number in 28–99');
const mean = (t) => { const v = CATALOGUE.filter((a) => a.tier === t).flatMap((a) => Object.values(statsOf(a.id, a.tier))); return v.reduce((x, y) => x + y, 0) / v.length; };
ok(mean('legendary') > mean('epic') && mean('epic') > mean('rare') && mean('rare') > mean('common'), `tiers rank by their average stats (L ${mean('legendary').toFixed(1)}, E ${mean('epic').toFixed(1)}, R ${mean('rare').toFixed(1)}, C ${mean('common').toFixed(1)})`);
ok(new Set(s1.map((s) => JSON.stringify(s))).size > 90, 'the stats differ from face to face');

/* ranking */
const ranks = CATALOGUE.map((a) => cardOf(a.id).rank).sort((x, y) => x - y);
ok(ranks.every((r, i) => r === i + 1), 'overall ranks are 1..96, unique and complete');
for (const p of PACKS) {
  const inPack = CATALOGUE.filter((a) => a.pack === p.n).map((a) => cardOf(a.id));
  ok(inPack.map((c) => c.rankInPack).sort((x, y) => x - y).join() === '1,2,3,4,5,6,7,8', `${p.name}: ranks 1..8 inside the pack`);
  ok(inPack.find((c) => c.rankInPack === 1).tier === 'legendary', `${p.name}: its Legendary ranks first`);
}
const order = ['legendary', 'epic', 'rare', 'common'];
const byRank = CATALOGUE.map((a) => cardOf(a.id)).sort((x, y) => x.rank - y.rank);
ok(byRank.every((c, i) => !i || order.indexOf(byRank[i - 1].tier) <= order.indexOf(c.tier)), 'the ranking runs by tier, Legendary first');
ok(byRank.every((c, i) => !i || byRank[i - 1].tier !== c.tier || byAvatar[byRank[i - 1].id].pack <= byAvatar[c.id].pack), 'then by pack order');
ok(cardOf('pyrafox').ranking === 'Rare · #4 of 8 in Shape Pals · #37 of 96', `the ranking line reads plainly (${cardOf('pyrafox').ranking})`);

/* history: from the record only */
const T = Date.UTC(2026, 9, 3, 12), LATER = Date.UTC(2026, 9, 4, 12);
ok(day(T) === '3 Oct 2026', `dates are said in words (${day(T)})`);
const k = newKid('Mira', '8-10', 'cubebot'); k.created = T;
ok(k.starter === 'cubebot', 'a new child keeps the face picked on the first day');
ok(historyOf('cubebot', k).join() === 'Picked when you started, on 3 Oct 2026', `a starter: picked when you started (${historyOf('cubebot', k)})`);
ok(historyOf('orbowl', k).join() === 'Free for every child, from the first day', `another Common is free from the first day, with no date (${historyOf('orbowl', k)})`);
const ledger = [{ a: 'maths', t: T - 864e5, n: 300, why: 'answer' }, { a: 'bee', t: T - 3600e3, n: -120, why: 'avatar:pyrafox' }, { a: 'maths', t: LATER, n: -120, why: 'avatar:pyrafox' }];
ok(historyOf('pyrafox', k, ledger).join() === 'Bought for 120 coins on 4 Oct 2026', `a bought face says what it cost and when, from this app's ledger line only (${historyOf('pyrafox', k, ledger)})`);
// a Legendary: the milestone it asked for, and its day where the record keeps one
const m = newKid('Asha', '8-10', 'ladybird'); m.quest = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, { passed: true, stars: 3 }])); m.medals = { 'tower-top': { at: T } };
const led2 = [{ a: 'maths', t: LATER, n: -500, why: 'avatar:glitchgecko' }];
ok(historyOf('glitchgecko', m, led2).join(' | ') === 'First it asked you to clear all twelve floors of the Puzzle Tower — you did, on 3 Oct 2026 | Bought for 500 coins on 4 Oct 2026', `a Legendary says its milestone and its day (${historyOf('glitchgecko', m, led2).join(' | ')})`);
const noDay = { ...m, medals: {} };
ok(historyOf('glitchgecko', noDay, []).join() === 'First it asked you to clear all twelve floors of the Puzzle Tower — you did', `a milestone with no day on record says no day (${historyOf('glitchgecko', noDay, [])})`);
// nothing on record: say so, and invent nothing
const old = { name: 'Ravi', avatar: 'pyrafox', shop: { avatars: ['pyrafox'] }, tricks: {}, quest: {}, facts: {}, medals: {}, created: T };
const none = historyOf('pyrafox', old, ledger.filter((l) => l.a === 'bee'));
ok(none.join() === 'In your collection' && !/\d/.test(none.join()), `no record: "In your collection" and no date (${none})`);
ok(!historyOf('cubebot', { ...old, starter: undefined }).some((l) => /started|\d/.test(l)), 'a child from before starters were kept is never told which face they picked');

console.log(fails ? `FAIL avcards — ${fails}` : 'ok avcards — 96 cards with power and lore, fixed stats, a 1..96 ranking, history from the record');
if (fails) process.exit(1);
