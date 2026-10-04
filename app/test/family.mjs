/* family.mjs — the family layer: Bizzing coins, medals from evidence, the
   shop's fixed prices and the sample household. Run with a fake localStorage
   so the family's own drop-ins (bizzing-wallet.js, bizzing-activity.js) run
   exactly as they do in the browser. */
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = globalThis; globalThis.document = { visibilityState: 'visible' };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};

const { Family, Store } = await import('../src/store.js');
const { newKid, tick } = await import('../src/model.js');
const { MEDALS, award, medalStates } = await import('../src/medals.js');
const { FRAMES, buy, worn } = await import('../src/shop.js');
const { sampleHousehold } = await import('../src/demo.js');
const { TRICKS } = await import('../src/tricks.js');
const F = await import('../src/facts.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗', m); } };

/* coins: standard events at standard amounts, capped, and never a rank */
ok(JSON.stringify(Family.EARN) === JSON.stringify({ answer: 1, stop: 5, contest: 10, mastery: 20 }), 'the standard amounts are the family\'s');
const a = newKid('Mira', '8-10', 'cubebot');
ok(Family.earn('Mira', 'answer') === 1 && Family.earn('Mira', 'stop') === 5 && Family.earn('Mira', 'mastery') === 20 && Family.earn('Mira', 'contest') === 10, 'each standard event pays its amount');
ok(Family.earn('Mira', 'login') === 0 && Family.earn('Mira', 'streak') === 0 && Family.earn('Mira', 'minutes') === 0, 'nothing pays for logins, streaks or time');
for (let i = 0; i < 200; i++) Family.earn('Mira', 'answer');
ok(Family.balance('Mira') === 100, `the daily cap holds at 100 (got ${Family.balance('Mira')})`);
ok(a.xp === 0, 'coins never move rank: earning touched no xp');
const w = JSON.parse(mem['bizzing.wallet']);
ok(w.kids.mira.ledger.every((x) => x.a === 'maths' && ['answer', 'stop', 'contest', 'mastery'].includes(x.why)), 'every ledger line is maths and a standard event');

/* the shop: fixed prices, cosmetics only, never random */
const before = Family.balance('Mira');
ok(buy(a, 'gold', (p, why) => Family.spend('Mira', p, why)) && Family.balance('Mira') === before - FRAMES.find((f) => f.id === 'gold').price, 'a frame costs exactly its printed price');
ok(worn(a) === 'gold' && a.xp === 0, 'buying a frame changes the face, not the rank');
ok(!buy(a, 'gold', (p, why) => Family.spend('Mira', p, why)), 'a frame is bought once');
ok(!buy(a, 'galaxy', (p, why) => Family.spend('Mira', p, why)) || Family.balance('Mira') >= 0, 'no buying on credit');
ok(FRAMES.every((f) => Number.isInteger(f.price) && f.price > 0), 'every price is a printed whole number');

/* medals: from evidence, each once */
const b = newKid('Ravi', '6-7', 'hexbee');
ok(award(b).length === 0, 'a new child has earned nothing');
for (let i = 0; i < 40; i++) tick(b, true);
ok(award(b).length === 0, 'time and right answers alone earn no medal');
b.tricks.nosuchstop = { stars: 3 };
ok(award(b).length === 0, 'a record for a stop that does not exist earns nothing');
b.tricks[TRICKS[0].id] = { stars: 2 };
const t1 = award(b).map((m) => m.id);
ok(t1.length === 1 && t1[0] === 'first-star', `passing a stop earns First star, and only that (got ${t1})`);
ok(award(b).length === 0, 'a medal is awarded once');
for (const m of MEDALS) ok(m.desc && m.need > 0 && typeof m.have === 'function', `${m.id} says what earns it`);

/* demo: the sample is believable and comes from the engine */
const keysBefore = Object.keys(mem).sort().join();
const h = sampleHousehold(), s = h.kids[0];
ok(s.sample && s.name === 'Asha' && Object.keys(s.days).length >= 6, 'the sample has weeks of play');
ok(F.tally(s.facts, '×').fluent > 0 && s.journey.level === 3 && Object.keys(s.journey.done).length > 0, 'the sample has fluent facts and a road walked');
ok(Object.keys(s.medals).length > 0 && Object.values(s.medals).every((m) => m.seen), 'the sample has medals, already celebrated');
ok(Object.keys(mem).sort().join() === keysBefore, 'building the sample wrote nothing to storage');
/* the sample's wallet and today's ring (audit A5): earned from its own evidence, at standard amounts, under the cap */
{ const { EARN, DAILY_CAP } = await import('../src/integration/bizzing-wallet.js'), { dayKey } = await import('../src/rand.js');
  const walletOk = (k) => { const L = k.sampleWallet || [], per = {};
    for (const x of L) per[new Date(x.t).toDateString()] = (per[new Date(x.t).toDateString()] || 0) + x.n;
    const ans = L.filter((x) => x.why === 'answer').reduce((a, x) => a + x.n, 0), right = Object.values(k.days).reduce((a, d) => a + d.ok, 0);
    return L.length > 0 && L.every((x) => x.why in EARN && x.n > 0 && (x.why !== 'stop' || x.n === EARN.stop))
      && Object.values(per).every((n) => n <= DAILY_CAP) && ans <= right * EARN.answer
      && L.filter((x) => x.why === 'stop').length === Object.keys(k.journey.done).length; };
  ok(walletOk(s), 'the sample wallet is earned from its own answers and stops, at standard amounts, under the daily cap');
  ok(!walletOk({ ...s, sampleWallet: [...s.sampleWallet, { a: 'maths', t: Date.now(), n: 50, why: 'gift' }] }), 'BROKEN: a gifted line is caught');
  const td = dayKey();
  ok(s.days[td] && s.days[td].ok > 0 && s.dayStops[td] >= 1 && s.daily[td] && s.daily[td].puzzle === false, 'today\'s ring is part-way round in the sample');
}

/* the guide is Octo, the mascot — never one of the ten rival children (owner, 3 Oct 2026) */
const { GUIDE } = await import('../src/lines.js');
const { RIVALS } = await import('../src/contest.js');
ok(/\bOcto\b/.test(GUIDE.nameFirst), 'the guide introduces itself as Octo');
for (const [k, line] of Object.entries(GUIDE)) ok(!RIVALS.some((r) => new RegExp(`\\b${r.name}\\b`).test(line)), `guide line ${k} names no rival (${line})`);
ok(!/twenty-five|thirty faces/.test(Object.values(GUIDE).join(' ')), 'the guide does not count faces that no longer exist');

/* the browser tab shows Octo alone, no background square — Bizzing Bee's tab look (owner, 4 Oct 2026) */
{ const { readFileSync } = await import('node:fs');
  const tabOk = (html, svg) => /<link rel="icon" href="favicon\.svg"/.test(html) && !/<rect\b/.test(svg) && !/<g stroke="#4E74E2"/.test(svg) && /<circle/.test(svg);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), fav = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8'), app = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
  ok(tabOk(html, fav), 'the tab icon is Octo with no background square');
  ok(!tabOk(html.replace('favicon.svg', 'icon.svg'), app), 'BROKEN: the square app icon in the tab is caught'); }
console.log(`${fails ? 'FAIL' : 'ok'} family — coins at standard amounts, fixed prices, medals from evidence, the sample`);
if (fails) process.exit(1);
