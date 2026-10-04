/* test/model.mjs — the household, the atlas frontier, band gating, placement, the Store seam. */
import { raiseLevel, pickLevel, noteRun, worldOpen, newHousehold, newKid, ROUTE, frontier, isOpen, scoreRun, RUNGS, placeFrom, rankOf, RANKS, tick, trickRec } from '../src/model.js';
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
const m = migrate({ kids: [{ id: 'x' }] }); ok(m.v === 11 && Array.isArray(m.kids[0].shop.skins) && Array.isArray(m.kids[0].shop.modes) && m.kids[0].shop.worn.skin === null && m.kids[0].papers && m.kids[0].feed && m.parent.feedOff === false && m.kids[0].shop.avatars && m.kids[0].mistakes && m.kids[0].prefs.targets && m.parent.plan === 'free' && m.kids[0].medals && m.kids[0].shop && m.kids[0].journey && m.kids[0].journey.level === null && m.kids[0].lib && m.parent && Array.isArray(m.kids) && m.kids[0].stories && m.kids[0].puzzles && m.kids[0].quest, 'v0 → v11 walks every step');
const m2 = migrate({ v: 2, kids: [{ puzzles: { nets: { right: 4 }, scales: { right: 2 } } }], parent: {} }); ok(m2.kids[0].puzzles.space.right === 4 && m2.kids[0].puzzles.balance.right === 2 && !m2.kids[0].puzzles.nets, 'v2 → v3 moves puzzle records to families');
ok(migrate({ v: 99, x: 1 }).v === 99, 'a newer save is never downgraded');
/* the PIN is never kept as itself (v10): a plain one on a device is hashed and removed */
{ const { pinOk } = await import('../src/pin.js');
  const h = migrate({ v: 9, kids: [], parent: { pin: '4821' } });
  ok(h.parent.pin === undefined && !JSON.stringify(h).includes('4821') && pinOk('4821', h.parent.pinHash) && !pinOk('4822', h.parent.pinHash), 'v9 → v10 hashes a plain PIN and keeps no copy of it');
  ok(migrate({ v: 9, kids: [], parent: { pin: null } }).parent.pinHash === null, 'no PIN stays no PIN'); }
console.log(`${fails ? 'FAIL' : 'ok'} model — frontier, band gating, placement, ranks, migration`);
// v7 keeps what a child had: the face they wear is theirs, the world they were dressed in stays open
{ const h = migrate({ v: 6, kids: [{ id: 'a', avatar: 'supernova', prefs: { theme: 'orbit' }, shop: { owned: ['gold'], worn: {} } }], parent: { pin: null } });
  ok(h.kids[0].shop.avatars.includes('supernova') && h.kids[0].shop.worlds.includes(4) && h.kids[0].shop.owned.includes('gold'), 'v6 → v7 keeps the worn face, the world and the frames'); }
// E7: three stars raise the starting level one step, never past Champion, never down, never twice for one level
{ const k = { tricks: {} };
  ok(raiseLevel(k, 'x', 1, 1, true) === 2 && k.tricks.x.lvNext === 2, 'three stars at Warm-up: next time starts at Stretch');
  ok(raiseLevel(k, 'x', 1, 1, true) === 0 && k.tricks.x.lvNext === 2, 'a second Warm-up run does not move it again');
  ok(raiseLevel(k, 'x', 2, 0.8, true) === 0 && raiseLevel(k, 'x', 2, 1, false) === 0, 'eight right, or too slow, is not three stars');
  ok(raiseLevel(k, 'x', 2, 0.9, true) === 3 && raiseLevel(k, 'x', 3, 1, true) === 0 && k.tricks.x.lvNext === 3, 'it stops at Champion'); }
// E7 (audit v4): the drill opens at a level picked from recent accuracy
{ const R = (lv, pct, fast = true) => ({ lv, pct, fast });
  ok(pickLevel([]) === 1, 'no runs yet: Warm-up');
  ok(pickLevel([R(1, 0.9), R(1, 1)]) === 2, 'two runs at 90%+ and fast: one up');
  ok(pickLevel([R(1, 1)]) === 1, 'one good run alone is not "the last two"');
  ok(pickLevel([R(2, 1, false), R(2, 1)]) === 2, 'two good runs, one of them slow: stays');
  ok(pickLevel([R(2, 0.95), R(2, 0.8)]) === 2, 'the last run at 80%: stays');
  ok(pickLevel([R(2, 1), R(2, 0.5)]) === 1, 'the last run under 60%: one down');
  ok(pickLevel([R(1, 0.2), R(1, 0.1)]) === 1, 'never below Warm-up');
  ok(pickLevel([R(3, 1), R(3, 1)]) === 3, 'never above Champion');
  ok(pickLevel([R(1, 0.5), R(3, 0.6)]) === 3, 'exactly 60% is not under 60%');
  const k = { tricks: {} };
  noteRun(k, 'y', 2, 0.95, true); ok(k.tricks.y.lvNext === 3, 'three stars still raise the start (raiseLevel holds)');
  noteRun(k, 'y', 3, 0.5, true); ok(k.tricks.y.lvNext === 2, 'a run under 60% brings it back one');
  noteRun(k, 'y', 2, 0.7, true); ok(k.tricks.y.lvNext === 2, 'a middling run keeps it');
  for (let i = 0; i < 6; i++) noteRun(k, 'y', 1, 0.1, false);
  ok(k.tricks.y.lvNext === 1 && k.tricks.y.recent.length === 4, 'it never goes below 1 and keeps only a few runs');
  ok(k.tricks.y.recent.every((x) => !('xp' in x)) && k.xp === undefined, 'picking a level touches no rank'); }
// B1/B5 (audit v4): Octo's greeting names something true from the child's own record
{ const { greetingLine, LINES } = await import('../src/greeting.js');
  const now = new Date(2026, 9, 4, 10).getTime(), DAY = 86400000;
  const g = newKid('Mira', '8-10');
  const plain = LINES.map((f) => f('Mira'));
  ok(plain.includes(greetingLine(g, now)), 'a new child gets one of the plain lines');
  g.last = { what: 'stop', title: 'Near a hundred', at: now - DAY };
  ok(/You cracked <b>“Near a hundred”<\/b> yesterday, Mira/.test(greetingLine(g, now)), 'a stop passed yesterday is named, with when: ' + greetingLine(g, now));
  g.last.at = now - 3 * 3600e3; ok(/Near a hundred”<\/b> today/.test(greetingLine(g, now)), 'today is said as today');
  // older than yesterday: a fact that slipped and is due comes first
  g.last.at = now - 9 * DAY;
  g.facts['7×8'] = { n: 4, ok: 3, box: 0, due: now - 1000, last: now - 2 * DAY, miss: 1, recent: ['F', 'F', 'F', 'X'], lapsed: true };
  ok(/<b>7 × 8<\/b> slipped/.test(greetingLine(g, now)) && !/56/.test(greetingLine(g, now)), 'a slipped fact that is due is named, never its answer');
  g.last.at = now - DAY; ok(/Near a hundred”<\/b> yesterday/.test(greetingLine(g, now)), 'yesterday’s stop comes before an older slip'); g.last.at = now - 9 * DAY;
  g.facts['7×8'].due = now + DAY; ok(!/7 × 8/.test(greetingLine(g, now)), 'a slipped fact that is not due yet is not');
  // a medal close by (8 of 10 three-star stops)
  for (const t of TRICKS.slice(0, 8)) g.tricks[t.id] = { stars: 3 };
  ok(/Two more and the <b>Fast and fearless<\/b> medal is yours/.test(greetingLine(g, now)), 'a medal that is near is named: ' + greetingLine(g, now));
  g.medals = { fearless: { at: now } }; ok(!/Fast and fearless/.test(greetingLine(g, now)), 'an earned medal is not "near"');
  ok(/You cracked <b>“Near a hundred”<\/b> last time/.test(greetingLine(g, now)), 'with nothing nearer, the last thing done, further back');
  const h2 = newKid('Kai', '6-7'); h2.last = { what: 'tried', title: 'Make ten first', at: now - DAY };
  ok(/had a go at <b>“Make ten first”<\/b> yesterday/.test(greetingLine(h2, now)), 'a try is said kindly'); }
if (fails) process.exit(1);
