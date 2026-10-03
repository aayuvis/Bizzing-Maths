/* test/model.mjs — the household, the atlas frontier, band gating, placement, the Store seam. */
import { worldOpen, newHousehold, newKid, ROUTE, frontier, isOpen, scoreRun, RUNGS, placeFrom, rankOf, RANKS, tick, trickRec } from '../src/model.js';
import { TRICKS, byId } from '../src/tricks.js';
import { migrate } from '../src/store.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 20) console.error('  ✗ ' + m); } };

const h = newHousehold(), a = newKid('Ahana', '8-10'), b = newKid('Kabir', '6-7');
h.kids.push(a, b); h.active = a.id;
ok(ROUTE.filter((n) => n.kind === 'stop').length === TRICKS.length, 'every trick is on the route');
ok(frontier(b) === 0 && isOpen(h, b, 0) && !isOpen(h, b, 1), 'a new 6–7 starts at stop one with stop two shut');
// band gating has an effect: an 8–10 child may wander stops meant for 6–7
const i67 = ROUTE.findIndex((n) => n.kind === 'stop' && byId[n.id].band === '6-7' && ROUTE.indexOf(n) > 0);
ok(isOpen(h, a, i67) && !isOpen(h, b, i67), 'younger-band stops open for an older child only');
const i1114 = ROUTE.findIndex((n) => n.kind === 'stop' && byId[n.id].band === '11-14');
ok(!isOpen(h, a, i1114), 'an 11–14 stop is shut for an 8–10 who has not walked there');
h.parent.tester = true; ok(isOpen(h, a, ROUTE.length - 1), 'tester opens everything'); h.parent.tester = false;
// passing stop one moves the frontier, and only the child who passed it
const s1 = ROUTE[0].id;
trickRec(b, s1).learned = true;
ok(scoreRun(b, s1, 6, 10, true).stars === 1, '60% is not a pass');
ok(scoreRun(b, s1, 7, 10, false).stars === 2 && frontier(b) === 1, '70% passes and moves the frontier');
ok(scoreRun(b, s1, 10, 10, false).stars === 2, 'no third star when slow');
ok(scoreRun(b, s1, 9, 10, true).stars === 3, 'third star: 90% in time');
const fa = frontier(a); scoreRun(b, ROUTE[1].id, 10, 10, true); ok(frontier(a) === fa, "a sibling's progress is not shared");
ok(byId[ROUTE[frontier(a)].id] && byId[ROUTE[frontier(a)].id].band === '8-10', "an 8–10 child's next stop is an 8–10 stop, not Make ten first");
const c = newKid('Old', '11-14'); ok(ROUTE[frontier(c)].kind === 'stop' && byId[ROUTE[frontier(c)].id].band === '11-14', 'an 11–14 starts at the first 11–14 stop');
// per-world gating: a 6–7 child reaches Time and Money at once, but not the Workshop
{
  const kid67 = newKid('Y', '6-7'); const hh = { parent: {} };
  ok(worldOpen(hh, kid67, 'clocktower') && worldOpen(hh, kid67, 'carnival'), '6–7 worlds are open to a 6–7 child from day one');
  ok(!worldOpen(hh, kid67, 'workshop'), 'an 8–10 world waits for a 6–7 child');
  kid67.checks.market = { passed: true, best: 90 };
  ok(worldOpen(hh, kid67, 'workshop'), '…until the place before it (the Market) is passed');
  const ci = ROUTE.findIndex((n) => n.world === 'clocktower');
  ok(isOpen(hh, kid67, ci) && !isOpen(hh, kid67, ci + 1), 'inside a world, stops open one at a time');
}
// placement
ok(placeFrom(0) === null && placeFrom(3) === null, 'passing only the Gardens rungs starts at the beginning');
const p = placeFrom(9); ok(p != null && ROUTE[p].world === byId[RUNGS[8].at].world && ROUTE[p - 1].kind === 'check', 'placement opens a world from its first stop');
for (const r of RUNGS) ok(byId[r.at], `rung points at a real stop: ${r.at}`);
for (const r of RUNGS) ok(Function(`return ${r.q.text.replace(/×/g, '*').replace(/−/g, '-').replace(/(\d+)% of (\d+)/, '$1*$2/100')}`)() === r.q.ans, `rung answer: ${r.q.text}`);
// ranks
ok(rankOf(0).n === 'Pebble' && rankOf(RANKS.at(-1).xp).n === 'Aryabhata', 'rank ends');
tick(a, false); ok(a.xp === 0, 'a wrong answer earns nothing'); tick(a, true, 2); ok(a.xp === 2, 'a right one does');
// store migration
const m = migrate({ kids: [{ id: 'x' }] }); ok(m.v === 8 && m.kids[0].feed && m.parent.feedOff === false && m.kids[0].shop.avatars && m.kids[0].mistakes && m.kids[0].prefs.targets && m.parent.plan === 'free' && m.kids[0].medals && m.kids[0].shop && m.kids[0].journey && m.kids[0].journey.level === null && m.kids[0].lib && m.parent && Array.isArray(m.kids) && m.kids[0].stories && m.kids[0].puzzles && m.kids[0].quest, 'v0 → v8 walks every step');
const m2 = migrate({ v: 2, kids: [{ puzzles: { nets: { right: 4 }, scales: { right: 2 } } }], parent: {} }); ok(m2.kids[0].puzzles.space.right === 4 && m2.kids[0].puzzles.balance.right === 2 && !m2.kids[0].puzzles.nets, 'v2 → v3 moves puzzle records to families');
ok(migrate({ v: 99, x: 1 }).v === 99, 'a newer save is never downgraded');
console.log(`${fails ? 'FAIL' : 'ok'} model — frontier, band gating, placement, ranks, migration`);
// v7 keeps what a child had: the face they wear is theirs, the world they were dressed in stays open
{ const h = migrate({ v: 6, kids: [{ id: 'a', avatar: 'supernova', prefs: { theme: 'orbit' }, shop: { owned: ['gold'], worn: {} } }], parent: { pin: null } });
  ok(h.kids[0].shop.avatars.includes('supernova') && h.kids[0].shop.worlds.includes(4) && h.kids[0].shop.owned.includes('gold'), 'v6 → v7 keeps the worn face, the world and the frames'); }
if (fails) process.exit(1);
