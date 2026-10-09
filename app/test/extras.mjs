/* extras.mjs — the Shop's road skins and bonus game modes (src/extras.js), held to
   rule 18: fixed printed prices, paid through Family.spend at exactly that price,
   owned for good, nothing random, xp untouched; and every mode is a real, solved,
   learning game with its own how-to, locked until it is bought.
   Run with a fake localStorage so the family wallet runs as in the browser. */
import { readFileSync } from 'node:fs';
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = globalThis; globalThis.document = { visibilityState: 'visible' };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};

const { Family, Store, migrate, SCHEMA } = await import('../src/store.js');
const { newKid, newHousehold } = await import('../src/model.js');
const X = await import('../src/extras.js');
const G = await import('../src/games.js');
const { seeded } = await import('../src/rand.js');
const F = await import('../src/facts.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 30) console.log('  ✗', m); } else if (process.env.V) console.log('  ✓', m); };

/* prices: printed whole numbers, every item named, ids unique */
ok(X.SKINS.length === 6 && X.MODES.length === 6, `six skins and six modes (got ${X.SKINS.length}, ${X.MODES.length})`);
for (const it of [...X.SKINS, ...X.MODES]) ok(Number.isInteger(it.price) && it.price > 0 && it.name && it.blurb, `${it.id}: a printed whole-number price, a name and a line`);
ok(new Set([...X.SKINS, ...X.MODES].map((x) => x.id)).size === 12, 'ids are unique');
for (const g of ['rush', 'target', 'line']) ok(X.modesFor(g).length === 2, `${g} has two modes`);

/* nothing random anywhere in the shop's logic */
const src = readFileSync(new URL('../src/extras.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/Math\.random|seeded|shuffle|pick\(/.test(src), 'extras.js has no randomness');

/* buying: exactly the price, through the family wallet, once, never on credit, never xp */
const k = newKid('Tara', '8-10', 'cubebot');
const spend = (p, why) => Family.spend('Tara', p, why);
for (let i = 0; i < 100; i++) Family.earn('Tara', 'answer');
const start = Family.balance('Tara');
ok(start === 100, `earned 100 to spend (got ${start})`);
ok(!X.ownsMode(k, 'rush:squares') && !X.ownsSkin(k, 'gold'), 'a new child owns no skin and no mode');
const sq = X.modeById['rush:squares'];
ok(X.buyMode(k, 'rush:squares', spend) && Family.balance('Tara') === start - sq.price, `a mode costs exactly its printed price (${sq.price})`);
ok(X.ownsMode(k, 'rush:squares') && k.xp === 0, 'bought: owned, and no xp moved');
const bal1 = Family.balance('Tara');
ok(!X.buyMode(k, 'rush:squares', spend) && Family.balance('Tara') === bal1, 'a mode is bought once — a second tap spends nothing');
const st = X.skinById.stones;
ok(X.buySkin(k, 'stones', spend) && Family.balance('Tara') === bal1 - st.price && X.skinOf(k) === 'stones', `a skin costs exactly its printed price (${st.price}) and is worn at once`);
const bal2 = Family.balance('Tara');
ok(bal2 < X.skinById.starlight.price && !X.buySkin(k, 'starlight', spend) && Family.balance('Tara') === bal2 && !X.ownsSkin(k, 'starlight'), 'not enough coins: nothing is spent and nothing is owned');
ok(!X.buySkin(k, 'nosuch', spend) && !X.buyMode(k, 'rush:nosuch', spend) && Family.balance('Tara') === bal2, 'an unknown item costs nothing');
ok(!X.wearSkin(k, 'gold') && X.skinOf(k) === 'stones', 'a skin not owned cannot be worn');
ok(X.wearSkin(k, null) && X.skinOf(k) === null && X.wearSkin(k, 'stones') && X.skinOf(k) === 'stones', 'an owned skin comes off and goes back on');
ok(k.xp === 0, 'coins never touch xp');
const led = JSON.parse(mem['bizzing.wallet']).kids.tara.ledger.filter((x) => x.n < 0);
ok(led.length === 2 && led[0].why === 'mode:rush:squares' && led[0].n === -sq.price && led[1].why === 'skin:stones' && led[1].n === -st.price, `the ledger says what was bought, at its price (${JSON.stringify(led)})`);
ok(X.ledgerWords('skin:stones') === 'bought the Stepping stones road' && X.ledgerWords('mode:rush:squares') === 'bought Squares mode', 'the wallet history says it in words');

/* the same purchase in two households is the same purchase: nothing random */
{ const a = newKid('Ira', '6-7', 'cubebot'), b = newKid('Ira', '6-7', 'cubebot'); const pay = () => true;
  X.buySkin(a, 'gold', pay); X.buySkin(b, 'gold', pay); X.buyMode(a, 'line:negatives', pay); X.buyMode(b, 'line:negatives', pay);
  ok(JSON.stringify(a.shop) === JSON.stringify(b.shop), 'two identical purchases leave identical records'); }

/* owning persists: saved, reloaded, migrated */
{ const h = newHousehold(); h.kids.push(k); h.active = k.id; h.v = SCHEMA;
  Store.saveNow(h); const back = Store.loadHousehold().kids.find((x) => x.id === k.id);
  ok(X.ownsMode(back, 'rush:squares') && X.ownsSkin(back, 'stones') && X.skinOf(back) === 'stones', 'what was bought is still owned after a reload'); }
ok(SCHEMA === 14, `the store is at v14 (got ${SCHEMA})`);
{ const old = migrate({ v: 10, kids: [{ id: 'a', shop: { owned: ['gold'], worn: { frame: 'gold' }, avatars: ['cubebot'], worlds: [3] } }], parent: {} });
  const s = old.kids[0].shop;
  ok(old.v === SCHEMA && Array.isArray(s.skins) && !s.skins.length && Array.isArray(s.modes) && !s.modes.length && s.worn.skin === null, 'v10 → v11 adds empty skins and modes and the plain road');
  ok(s.owned[0] === 'gold' && s.worn.frame === 'gold' && s.worlds[0] === 3 && s.avatars[0] === 'cubebot', 'v10 → v11 takes nothing away'); }
{ const old = migrate({ v: 11, kids: [{ id: 'a', shop: { owned: ['gold'], worn: { frame: 'gold', skin: 'rails' }, avatars: ['cubebot'], worlds: [3], skins: ['rails'], modes: ['rush:mixed'] } }], parent: {} });
  const s = old.kids[0].shop;
  ok(old.v === SCHEMA && Array.isArray(s.paperSkins) && !s.paperSkins.length && s.worn.paper === null, 'v11 → v12 adds no paper skins and the plain paper');
  ok(s.skins[0] === 'rails' && s.worn.skin === 'rails' && s.modes[0] === 'rush:mixed' && s.owned[0] === 'gold' && s.worn.frame === 'gold', 'v11 → v12 takes nothing away'); }
{ const nk = newKid('N', '8-10', 'cubebot'), h = migrate(JSON.parse(JSON.stringify({ ...newHousehold(), kids: [nk] })));
  ok(newHousehold().v === SCHEMA && JSON.stringify(h.kids[0].shop) === JSON.stringify(nk.shop), 'a new household is born at the current schema, and migrating it changes nothing'); }

/* ---- paper skins (audit v4 K6): bought once at the printed price, worn, taken off, never xp */
ok(X.PAPERS.length >= 4 && X.PAPERS.length <= 5, `four or five paper skins (got ${X.PAPERS.length})`);
for (const it of X.PAPERS) ok(Number.isInteger(it.price) && it.price >= 25 && it.price <= 60 && it.name && it.blurb, `${it.id}: a printed price in line with the road skins (25–60), a name and a line`);
ok(new Set(X.PAPERS.map((x) => x.id)).size === X.PAPERS.length, 'paper ids are unique');
{ const t = newKid('Pia', '8-10', 'cubebot'), spendP = (p, why) => Family.spend('Pia', p, why);
  for (let i = 0; i < 100; i++) Family.earn('Pia', 'answer');
  const b0 = Family.balance('Pia'), ex = X.paperById.exam, gr = X.paperById.graph;
  ok(!X.ownsPaper(t, 'exam') && X.paperOf(t) === null, 'a new child owns no paper skin and sits the plain paper');
  ok(X.buyPaper(t, 'exam', spendP) && Family.balance('Pia') === b0 - ex.price && X.paperOf(t) === 'exam', `a paper skin costs exactly its printed price (${ex.price}) and is worn at once`);
  const b1 = Family.balance('Pia');
  ok(!X.buyPaper(t, 'exam', spendP) && Family.balance('Pia') === b1, 'a paper skin is bought once — a second tap spends nothing');
  ok(!X.buyPaper(t, 'nosuch', spendP) && Family.balance('Pia') === b1, 'an unknown paper costs nothing');
  ok(!X.wearPaper(t, 'graph') && X.paperOf(t) === 'exam', 'a paper not owned cannot be worn');
  ok(X.wearPaper(t, null) && X.paperOf(t) === null && X.wearPaper(t, 'exam') && X.paperOf(t) === 'exam', 'an owned paper comes off (the plain paper is back) and goes back on');
  ok(X.buyPaper(t, 'graph', spendP) && Family.balance('Pia') === b1 - gr.price && X.paperOf(t) === 'graph' && X.ownsPaper(t, 'exam'), 'a second paper is worn at once, and the first is still owned');
  while (Family.balance('Pia') >= X.paperById.night.price) Family.spend('Pia', 1, 'test');
  const b2 = Family.balance('Pia');
  ok(!X.buyPaper(t, 'night', spendP) && Family.balance('Pia') === b2 && !X.ownsPaper(t, 'night'), 'not enough coins: nothing is spent and nothing is owned');
  ok(t.xp === 0, 'paper skins never touch xp');
  const led = JSON.parse(mem['bizzing.wallet']).kids.pia.ledger.filter((x) => x.n < 0 && x.why.startsWith('paper:'));
  ok(led.length === 2 && led[0].why === 'paper:exam' && led[0].n === -ex.price && led[1].why === 'paper:graph', `the ledger says which paper was bought, at its price (${JSON.stringify(led)})`);
  ok(X.ledgerWords('paper:exam') === 'bought the Exam Hall paper', 'the wallet history says it in words');
  ok(X.skinOf(t) === null && !(t.shop.skins || []).length, 'a paper skin is not a road skin: the road is untouched');
  const h = newHousehold(); h.kids.push(t); h.active = t.id; Store.saveNow(h);
  const back = Store.loadHousehold().kids.find((x) => x.id === t.id);
  ok(X.ownsPaper(back, 'exam') && X.ownsPaper(back, 'graph') && X.paperOf(back) === 'graph', 'paper skins are still owned, and still worn, after a reload'); }

/* a paper skin is only paint: nothing that builds, times or marks a paper reads it */
for (const f of ['../src/papers/engine.js', '../src/hall.js']) {
  const code = readFileSync(new URL(f, import.meta.url), 'utf8');
  ok(!/extras|paperOf|data-paper|worn/.test(code), `${f.slice(7)} never reads a paper skin`);
}
{ const ms = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8'), body = ms.slice(ms.indexOf('function sitPaper('), ms.indexOf("on('hallPick'"));
  ok(body.length > 200 && !/paperOf|extras|worn|data-paper/.test(body), 'main.js sits, times and scores a paper without reading a skin'); }
{ const css = readFileSync(new URL('../styles/extras.css', import.meta.url), 'utf8');
  for (const p of X.PAPERS) ok(new RegExp(`\\[data-paper=${p.id}\\] \\.paper`).test(css) && new RegExp(`\\.pp-prev\\[data-pp=${p.id}\\]`).test(css), `${p.id}: drawn by extras.css on the paper and in the Shop's preview`);
  ok(!/\[data-paper[^\]]*\][^{]*\.(pc|pn|pq-choices)\b[^{]*\{[^}]*(display|order|visibility)/.test(css), 'no skin hides, reorders or removes a choice or a question'); }

/* modes are locked until bought: play() goes to the Shop for a mode not owned */
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
ok(/if \(mode && !ownsMode\(k, arg\)\) return go\('shop'\);/.test(main), 'main.js play(): a mode not owned opens the Shop, not the game');
/* and it pays what its game pays: the SAME callbacks, the mode only passed through */
const play = main.slice(main.indexOf('function play(arg'), main.indexOf('\n}\n', main.indexOf('function play(arg')));
/* the wage is decided in ONE place (model.js payout/WAGE): each game hands payout() its own
   arg, mode and all, and payout reads the table by the game's name — so a mode cannot pay
   differently, and the standard amounts are the ones the games always paid */
const { WAGE, payout } = await import('../src/model.js');
for (const [id, fn, pay, xp] of [['rush', 'numberRush', 'payout(k, arg, right)', 1], ['target', 'makeTarget', 'payout(k, arg, true)', 5], ['line', 'numberLine', 'payout(k, arg, right)', 1]]) {
  const line = play.split('\n').find((l) => l.includes(`G.${fn}(`)) || '';
  ok(line.includes('{ mode, ') && line.includes(pay) && (line.match(/payout\(/g) || []).length === 1 && !/\btick\(/.test(line), `${id}: one call, through payout (${pay}), mode passed through`);
  ok(WAGE[id] === xp, `${id}: the standard wage is still ${xp} xp (WAGE has ${WAGE[id]})`);
  for (const m of X.modesFor(id)) { const a = newKid('W', '8-10', 'cubebot'), b = newKid('W', '8-10', 'cubebot'); payout(a, id, true); payout(b, m.id, true); ok(a.xp === xp && b.xp === a.xp, `${m.id} pays what ${id} pays (${b.xp} vs ${a.xp})`); }
}

/* every mode is a real game with its own how-to */
for (const m of X.MODES) {
  const h = G.HOWTO[m.id];
  ok(h && h.practises && h.steps.length === 3 && h.steps.every(([ic, t]) => ic && t.length > 10 && t.length < 70), `${m.id}: a title card with three how-to steps`);
}

/* Number Rush: mixed is the Inverse mix (games spec §3.1) — whole fact families, the + − ones for
   the youngest and the × ÷ ones after; squares only squares; right answers right */
for (const band of ['6-7', '8-10', '11-14']) {
  const kid = newKid('Q', band, 'cubebot');
  const mixed = G.rushPool(kid, 'mixed'), squares = G.rushPool(kid, 'squares'), std = G.rushPool(kid, null);
  const ops = band === '6-7' ? ['+', '-'] : ['×', '÷'], famOf = {};
  for (const f of mixed) (famOf[f.fam] = famOf[f.fam] || []).push(f);
  ok(ops.every((o) => mixed.some((f) => f.op === o)) && Object.values(famOf).every((m) => ops.every((o) => m.some((f) => f.op === o))), `${band} mixed (Inverse): every family brings ${ops.join(' and ')} together`);
  ok(squares.length >= 9 && squares.every((f) => f.op === '²' && F.answer(f) === f.a * f.a && f.fact && F.key(f.fact) === `${f.a}²2`), `${band} squares: every bubble is n², a real fact in the squares bank`);
  ok(Math.max(...squares.map((f) => f.a)) === (band === '6-7' ? 10 : band === '8-10' ? 12 : 20), `${band} squares reach the band's top`);
  ok(std.every((f) => f.op !== '²'), `${band} the standard game is unchanged by the modes`);
  ok([...mixed, ...squares].every((f) => Number.isInteger(F.answer(f)) && F.answer(f) >= 0), `${band}: every answer a whole number a child can type`);
}

/* Make the Target: five numbers, every number used; hard targets out of reach of + and − alone */
const evalSol = (s) => Function(`return ${s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')}`)();
const ADD = { '+': (a, b) => a + b, '−': (a, b) => (a >= b ? a - b : null) };
for (const band of ['6-7', '8-10', '11-14']) for (let i = 0; i < 120; i++) {
  const five = G.makePuzzle(band, seeded('five' + band + i), 'five');
  ok(five.nums.length === (band === '6-7' ? 4 : 5) && evalSol(five.sol) === five.target, `${band} five: ${five.nums} → ${five.target} by ${five.sol}`);
  ok(five.sol.match(/\d+/g).map(Number).sort((a, b) => a - b).join() === five.nums.slice().sort((a, b) => a - b).join(), `${band} five: the solution uses every number once (${five.sol})`);
  const hard = G.makePuzzle(band, seeded('hard' + band + i), 'hard');
  const [lo, hi] = band === '6-7' ? [21, 60] : band === '8-10' ? [61, 200] : [151, 600];
  ok(hard.target >= lo && hard.target <= hi && evalSol(hard.sol) === hard.target, `${band} hard: ${hard.nums} → ${hard.target} in ${lo}–${hi}`);
  ok(G.solve(hard.nums, hard.target, ADD) === null && /[×÷]/.test(hard.sol), `${band} hard: + and − alone cannot make ${hard.target} from ${hard.nums}`);
}
ok(G.makePuzzle('8-10', seeded('x'), null).nums.length === 4, 'the standard puzzle is unchanged by the modes');

/* Number Line: fractions are proper fractions on 0–1 (never ½); negatives straddle nought */
for (const band of ['6-7', '8-10', '11-14']) {
  const fr = G.lineSpec(band, 'fractions'), ng = G.lineSpec(band, 'negatives'), sd = G.lineSpec(band, null);
  const r = seeded('line' + band); let negs = 0;
  for (let i = 0; i < 300; i++) {
    const a = fr.pick(r), [n, d] = a.label.split('/').map(Number);
    ok(fr.lo === 0 && fr.hi === 1 && a.v > 0 && a.v < 1 && Math.abs(a.v - n / d) < 1e-12 && a.v !== 0.5, `${band} fractions: ${a.label} sits on 0–1 at ${a.v}`);
    const b = ng.pick(r); if (b.v < 0) negs++;
    ok(b.v > ng.lo && b.v < ng.hi && b.v !== 0 && Number.isInteger(b.v) && (b.v < 0 ? b.label === `−${-b.v}` : b.label === String(b.v)), `${band} negatives: ${b.label} on ${ng.lo}–${ng.hi}`);
  }
  ok(ng.lo < 0 && ng.hi === -ng.lo && negs > 60, `${band} negatives: nought in the middle and plenty below it (${negs}/300)`);
  ok(sd.lo === 0 && sd.hi === (band === '6-7' ? 20 : band === '8-10' ? 100 : 1000), `${band} the standard line is unchanged`);
}

console.log(`${fails ? 'FAIL' : 'ok'} extras — 6 road skins, ${X.PAPERS.length} paper skins and 6 game modes at printed prices, bought once through the wallet, xp untouched, every mode solved and taught`);
if (fails) process.exit(1);
