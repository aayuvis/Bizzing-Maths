/* extras-ui.mjs — the Shop's extras, a game's hash, and the game plates, in Chromium on
   the BUILT app:
     · buying a road skin spends exactly its price and changes the road on the journey
       and on a world board; xp never moves
     · a game mode is locked (it opens the Shop) until bought; once bought it plays, by
       keyboard AND by touch, and a right answer pays exactly what the standard game pays
     · every game pushes #/game/<id>: Back closes it and lands on the screen it came from;
       closing it in-game takes the entry off again
     · every word on a painted game plate meets AA in the worst case — its own surface
       over a pure black and a pure white pixel — in light and dark, with Sudoku painted too
   Every assertion here was watched to fail once (see the commit that added it). */
import { site, kidRec, household, checker, SHOTS } from './lib/site.mjs';

const { BASE, browser, close } = await site('extras', +(process.env.PORT_BASE || 5200) + 6);
const { ok, fails } = checker();
const errors = [];
const kidA = kidRec('ka', 'Ahana', '8-10', 'hexbee');
const wallet = (n) => JSON.stringify({ v: 1, kids: { ahana: { coins: n, ledger: [{ a: 'bee', t: Date.now() - 864e5, n, why: 'migrated' }] } } });

async function open(vp, tag, { dark = false, coins = 600 } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await p.addInitScript(([h, w]) => { try { if (!localStorage.getItem('bzm_household')) { localStorage.setItem('bzm_household', h); localStorage.setItem('bizzing.wallet', w); } } catch {} }, [JSON.stringify(household([kidA])), wallet(coins)]);
  await p.goto(BASE + '#/home'); await p.waitForSelector('#app main');
  const G = (fn, a) => p.evaluate(fn, a);
  return { p, ctx, G, shot: (n) => p.screenshot({ path: `${SHOTS}/extras-${tag}-${n}.png` }) };
}
const st = (G) => G(() => ({ nav: window.__bzm.R.ui.nav, hash: location.hash, game: !!(window.__bzmGames && window.__bzmGames.active()), overlay: document.querySelectorAll('.play').length, xp: window.__bzm.R.h.kids[0].xp, coins: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana.coins, shop: window.__bzm.R.h.kids[0].shop }));
const nav = async (p, G, to, sel) => { await G((a) => window.__bzm.go(a), to); if (sel) await p.waitForSelector(sel); };
const skip = async (p) => { await p.waitForSelector('.g-intro'); await p.keyboard.press('Enter'); await p.waitForSelector('.g-intro', { state: 'detached' }); };

{ /* ------------------------------------------------ skins */
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'desk');
  const road = () => G(() => { const r = document.querySelector('.board .rd'), b = document.querySelector('.board .bpin'); if (!r || !b) return null; const s = getComputedStyle(r), bs = getComputedStyle(b); return { stroke: s.stroke, dash: s.strokeDasharray, width: s.strokeWidth, pin: bs.borderTopColor }; });
  await nav(p, G, 'atlas', '.board .rd');
  const plain = await road();
  await G(() => window.__bzm.go('world', 'gardens')); await p.waitForSelector('.board .rd');
  const plainW = await road();
  await nav(p, G, 'shop', '.shop-tabs'); await p.click('[data-act=shopTab][data-arg=extras]'); await p.waitForSelector('.skins');
  ok(await p.locator('.sk-item').count() === 6 && await p.locator('.md-item').count() === 6, 'the Shop\'s Extras shows six road skins and six game modes');
  const printed = await p.$$eval('.sk-item [data-act=buySkin], .md-item [data-act=buyMode]', (bs) => bs.map((b) => b.textContent.trim()));
  ok(printed.length === 12 && printed.every((t) => /^\d+$/.test(t)), `every extra has its price printed on it (${printed.join(',')})`);
  await shot('shop-extras');
  const s0 = await st(G);
  await p.click('[data-act=buySkin][data-arg=gold]'); await p.waitForTimeout(200);
  const s1 = await st(G);
  ok(s0.coins - s1.coins === 65 && s1.shop.skins.includes('gold') && s1.shop.worn.skin === 'gold', `buying the Gold road spends exactly 65 and wears it (spent ${s0.coins - s1.coins})`);
  ok(s1.xp === s0.xp, 'buying a skin never moves xp');
  await nav(p, G, 'atlas', '.board .rd');
  const gold = await road();
  ok(plain && gold && gold.stroke !== plain.stroke && /243, 195, 60/.test(gold.stroke) && gold.dash !== plain.dash, `the journey's road wears the skin (${plain && plain.stroke} ${plain && plain.dash} → ${gold && gold.stroke} ${gold && gold.dash})`);
  ok(gold && gold.pin !== plain.pin, `and so do its pins (${plain && plain.pin} → ${gold && gold.pin})`);
  await shot('atlas-gold');
  await G(() => window.__bzm.go('world', 'gardens')); await p.waitForSelector('.board .rd');
  const goldW = await road();
  ok(plainW && goldW && goldW.stroke !== plainW.stroke && /243, 195, 60/.test(goldW.stroke), 'a world board wears it too');
  await shot('world-gold');
  await nav(p, G, 'shop', '.shop-tabs'); await p.click('[data-act=shopTab][data-arg=extras]'); await p.click('[data-skin-card=gold] [data-act=wearSkin]');
  await nav(p, G, 'atlas', '.board .rd');
  ok((await road()).stroke === plain.stroke, 'taking the skin off brings the plain road back');
  await G(() => location.reload()); await p.waitForSelector('#app main');
  ok((await st(G)).shop.skins.includes('gold'), 'the skin is still owned after a reload');

  /* ------------------------------------------------ modes: locked, bought, played */
  await nav(p, G, 'play', '.amodes');
  ok(await p.locator('.amodes .am-shut').count() === 6 && await p.locator('.amodes [data-act=play]').count() === 0, 'Play shows the six modes, every one locked before it is bought');
  await p.locator('.amodes').scrollIntoViewIfNeeded(); await shot('play-locked');
  await G(() => window.__bzm.fire('play', 'rush:squares')); await p.waitForTimeout(250);
  let s = await st(G);
  ok(!s.game && s.nav === 'shop', `a mode not owned opens the Shop, never the game (nav ${s.nav}, game ${s.game})`);
  await p.click('[data-act=shopTab][data-arg=extras]');
  const before = await st(G), spent = [];
  for (const [id, price] of [['rush:squares', 50], ['rush:mixed', 40], ['target:five', 50], ['target:hard', 60], ['line:fractions', 50], ['line:negatives', 40]]) {
    const c0 = (await st(G)).coins;
    await p.click(`[data-act=buyMode][data-arg="${id}"]`); await p.waitForTimeout(120);
    spent.push(c0 - (await st(G)).coins === price);
  }
  s = await st(G);
  ok(spent.every(Boolean) && s.shop.modes.length === 6 && s.xp === before.xp, `each mode costs exactly its printed price, and no xp moves (${spent})`);
  await nav(p, G, 'play', '.amodes');
  ok(await p.locator('.amodes [data-act=play]').count() === 6, 'bought: all six modes are playable from Play');
  await p.locator('.amodes').scrollIntoViewIfNeeded(); await shot('play-owned');

  // the wage: one right answer in standard Rush, then in Squares — the same xp
  const rushRight = async (arg, tap) => {
    await nav(p, G, 'play', '.amodes'); await p.click(`[data-act=play][data-arg="${arg}"]`); await skip(p);
    await p.waitForFunction(() => { const g = window.__bzmGames && window.__bzmGames.active(); return g && g.probe.answers().length > 0; }, null, { timeout: 8000 });
    const a = await G(() => window.__bzmGames.active().probe.answers()[0]), x0 = (await st(G)).xp;
    for (const ch of a) { if (tap) await p.tap(`.pad [data-k="${ch}"]`); else await p.keyboard.press(ch); }
    await p.waitForTimeout(150);
    const x1 = (await st(G)).xp, hud = await p.locator('.play-hud').innerText(), title = await p.locator('.play-t b').innerText();
    await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(150);
    return { a, d: x1 - x0, hud, title };
  };
  const std = await rushRight('rush', false), sqK = await rushRight('rush:squares', false), sqT = await rushRight('rush:squares', true), mxT = await rushRight('rush:mixed', true);
  ok(std.d === 1 && sqK.d === std.d && sqT.d === std.d && mxT.d === std.d, `a right answer in a mode pays what the standard game pays (standard ${std.d}, squares ${sqK.d}/${sqT.d}, mixed ${mxT.d})`);
  ok(/Squares/.test(sqK.title) && Number.isInteger(Math.sqrt(+sqK.a)) && Number.isInteger(Math.sqrt(+sqT.a)), `Squares: its own title, and the answers are squares (${sqK.a}, ${sqT.a})`);
  ok(/Score\s*1\b/.test(sqK.hud) && /Score\s*1\b/.test(sqT.hud) && /Score\s*1\b/.test(mxT.hud), `Rush modes score by keyboard and by tapping the pad (${JSON.stringify([sqK.hud, sqT.hud, mxT.hud])})`);

  // Make the Target modes: five cards; keys join two, taps join two more
  for (const id of ['target:five', 'target:hard']) {
    await nav(p, G, 'play', '.amodes'); await p.click(`[data-act=play][data-arg="${id}"]`);
    await p.waitForSelector('.g-intro'); const how = await p.locator('.g-card h2').innerText(); await skip(p); await p.waitForSelector('.mt-card');
    const n0 = await p.locator('.mt-card').count(), target = +(await p.locator('.mt-target b').innerText());
    await p.keyboard.press('1'); await p.keyboard.press('+'); await p.keyboard.press('2'); await p.waitForTimeout(80);
    const n1 = await p.locator('.mt-card').count();
    await p.tap('[data-t=reset]'); await p.waitForTimeout(60);   // Start again, then the same join by touch
    await p.tap('.mt-card >> nth=0'); await p.tap('.mt-op[data-o="+"]'); await p.tap('.mt-card >> nth=1'); await p.waitForTimeout(80);
    const n2 = await p.locator('.mt-card').count();
    if (id === 'target:five') ok(n0 === 5, `Five numbers serves five cards (got ${n0})`);
    else ok(n0 === 4 && target > 60, `Hard target serves a big target (${target})`);
    ok(/Five numbers|Hard target/.test(how) && n1 === n0 - 1 && n2 === n0 - 1, `${id}: its own title card; keys join two numbers, and so do taps after Start again (${n0} → ${n1}, reset → ${n2})`);
    if (id === 'target:five') await shot('target-five');
    await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(150);
  }
  // Number Line modes: arrows move and Enter places; a tap on the line moves and a tap places
  for (const id of ['line:fractions', 'line:negatives']) {
    await nav(p, G, 'play', '.amodes'); await p.click(`[data-act=play][data-arg="${id}"]`); await skip(p); await p.waitForSelector('.nl-track');
    const q = await p.locator('.nl-q b').innerText(), ends = await p.$$eval('.nl-tick', (t) => t.map((x) => x.textContent.trim()).filter(Boolean));
    const v0 = +(await p.locator('.nl-track').getAttribute('aria-valuenow'));
    await p.keyboard.press('ArrowRight'); const v1 = +(await p.locator('.nl-track').getAttribute('aria-valuenow'));
    await p.keyboard.press('Enter'); await p.waitForSelector('.nl-true');
    const x0 = (await st(G)).xp; await p.keyboard.press('Enter'); await p.waitForSelector('[data-n=place]');
    const box = await p.locator('.nl-track').boundingBox(); await p.tap('.nl-track', { position: { x: box.width * 0.2, y: box.height / 2 } });
    const v2 = +(await p.locator('.nl-track').getAttribute('aria-valuenow'));
    await p.tap('[data-n=place]'); await p.waitForSelector('.nl-true');
    if (id === 'line:fractions') ok(/^\d+\/\d+$/.test(q) && ends.join() === '0,1' && v0 === 0.5 && Math.abs(v1 - 0.51) < 1e-9 && v2 < 0.3, `Fractions: ${q} on a 0–1 line; arrows step a hundredth (${v0} → ${v1}), a tap moves it (${v2})`);
    else ok(/^−?\d+$/.test(q) && ends.join() === '−50,0,50' && v0 === 0 && v1 === 1 && v2 < -20, `Negatives: ${q} on −50…50 with nought marked; arrows (${v0} → ${v1}), a tap (${v2})`);
    ok((await st(G)).xp - x0 <= 1, `${id}: a placement pays at most the standard 1`);
    await shot(id.replace(':', '-'));
    await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(150);
  }

  /* ------------------------------------------------ a game has a hash; Back closes it */
  const games = [
    ['play', '.gtiles', () => p.click('[data-act=play][data-arg=rush]'), 'rush'],
    ['play', '.gtiles', () => p.click('[data-act=play][data-arg=target]'), 'target'],
    ['play', '.gtiles', () => p.click('[data-act=play][data-arg=line]'), 'line'],
    ['play', '.gtiles', () => p.click('.hero-t.daily-t'), 'daily'],
    ['puzzles', '[data-act=sudokuPlay]', () => p.click('[data-act=sudokuPlay] >> nth=0'), 'sudoku'],
    ['play', '.amodes', () => p.click('[data-act=play][data-arg="line:negatives"]'), 'line:negatives'],
    ['play', '.gtiles', () => p.click('[data-act=play][data-arg=cubes]'), 'cubes'],
    ['puzzles', '[data-act=cubesPlay]', () => p.click('[data-act=cubesPlay] >> nth=2'), 'cubes'],
  ];
  for (const [from, sel, openIt, id] of games) {
    await nav(p, G, 'home', '#app main'); await nav(p, G, from, sel);
    const h0 = (await st(G)).hash;
    await openIt(); await p.waitForSelector('.play');
    let s2 = await st(G);
    ok(s2.game && s2.hash === '#/game/' + id, `${id}: opening it pushes #/game/${id} (got ${s2.hash})`);
    await p.goBack(); await p.waitForTimeout(300);
    s2 = await st(G);
    ok(!s2.game && s2.overlay === 0 && s2.nav === from && s2.hash === h0, `${id}: Back closes the game and stays on ${from} (nav ${s2.nav}, hash ${s2.hash}, game ${s2.game})`);
  }
  // closed from inside (the bar's Back, then Escape): the entry comes off, so Back after it leaves the room as before
  await nav(p, G, 'home', '#app main'); await nav(p, G, 'play', '.gtiles');
  await p.click('[data-act=play][data-arg=line]'); await p.waitForSelector('.play'); await p.click('.play-x'); await p.waitForTimeout(300);
  let s3 = await st(G);
  ok(!s3.game && s3.hash === '#/play' && s3.nav === 'play', `the bar's Back closes it and the address is the room again (${s3.hash})`);
  await p.click('[data-act=play][data-arg=target]'); await skip(p); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  s3 = await st(G);
  ok(!s3.game && s3.hash === '#/play', `Escape closes it the same way (${s3.hash})`);
  await p.goBack(); await p.waitForTimeout(300);
  s3 = await st(G);
  ok(s3.nav === 'home' && !s3.game, `no closed game is left in the history: Back then leaves Play for Home (nav ${s3.nav}, ${s3.hash})`);
  // Play again keeps ONE entry: Back from the second round still lands on Play
  await nav(p, G, 'play', '.gtiles'); await p.click('[data-act=play][data-arg=line]'); await skip(p);
  await G(() => window.__bzmGames.active().probe.finish()); await p.waitForSelector('.play-end'); await p.click('[data-g=again]'); await p.waitForSelector('.g-intro');
  await p.waitForTimeout(200); await p.goBack(); await p.waitForTimeout(300);
  s3 = await st(G);
  ok(!s3.game && s3.nav === 'play' && s3.hash === '#/play', `Play again replaces the entry: one Back still lands on Play (nav ${s3.nav}, ${s3.hash})`);
  await ctx.close();
}

/* ------------------------------------------------ today's challenge (audit v4 B4): a card on Play, a fixed bonus once a day */
for (const [vp, tag] of [[{ width: 1280, height: 800 }, 'chal-desk'], [{ width: 390, height: 844 }, 'chal-phone']]) {
  const { p, ctx, G, shot } = await open(vp, tag);
  await nav(p, G, 'play', '.chal');
  const card = await p.locator('.chal').innerText();
  const name = await G(() => window.__bzm.R.ui && document.querySelector('.chal-t b').textContent);
  ok(/Today’s challenge/i.test(card) && name && /Finish it for 5 coins, once today/.test(card), `${tag}: the Play tab names today's challenge and its fixed bonus (${name})`);
  const order = await G(() => { const y = (s) => document.querySelector(s).getBoundingClientRect().top; return [y('.hero-tiles'), y('.chal'), y('.gtiles')]; });
  ok(order[0] < order[1] && order[1] < order[2], `${tag}: the card sits at the top of the games, under the heroes (${order})`);
  ok(!/streak|in a row|tomorrow|come back/i.test(card), `${tag}: the card asks nobody back (${card.replace(/\s+/g, ' ')})`);
  await p.locator('.chal').scrollIntoViewIfNeeded(); await shot('card');
  if (tag === 'chal-phone') { await ctx.close(); continue; }
  // play it through: right answers by keyboard, one in three wrong — a finish at any score pays
  const s0 = await st(G);
  await p.click('.chal [data-act=challenge]'); await p.waitForSelector('#ans, .choice-row, #widget');   // a day's set may open on a built answer (widgets.js)
  const run = await G(() => ({ kind: window.__bzm.R.run.kind, title: window.__bzm.R.run.title, n: window.__bzm.R.run.items.length }));
  ok(run.kind === 'challenge' && run.title === name && run.n === 10, `the card starts the named set of ten (${JSON.stringify(run)})`);
  let rights = 0;
  for (let i = 0; i < run.n; i++) {
    const q = await G(() => { const r = window.__bzm.R.run; return { i: r.i, ans: String(r.items[r.i].ans), ch: r.items[r.i].choices || null, w: !!document.getElementById('widget') }; });
    if (i % 3 === 1) { await G((c) => window.__bzm.fire('choose', c), q.ch ? q.ch.find((c) => c !== q.ans) : '99999'); await p.waitForTimeout(80); await G(() => window.__bzm.fire('nextQ')); }
    else { rights++; if (q.ch || q.w) await G((c) => window.__bzm.fire('choose', c), q.ans); else for (const c of q.ans) await p.keyboard.press(c); await p.waitForFunction((n) => !window.__bzm.R.run || window.__bzm.R.run.i > n || window.__bzm.R.run.over, q.i, { timeout: 4000 }); }
    await p.waitForTimeout(60);
  }
  await p.waitForFunction(() => window.__bzm.R.run && window.__bzm.R.run.over, null, { timeout: 4000 });
  const s1 = await st(G), end = await p.locator('main').innerText();
  ok(s1.coins - s0.coins === rights + 5, `finished at ${rights} of 10: a coin a right answer and the 5-coin bonus (got ${s1.coins - s0.coins})`);
  ok(/5 coins for finishing today’s challenge/.test(end) && !/tomorrow|streak|come back/i.test(end), `the finish says what it paid, and asks nobody back (${end.replace(/\s+/g, ' ').slice(0, 300)})`);
  ok(s1.xp - s0.xp === rights * 2, `xp moves only for right answers, as any practice (${s1.xp - s0.xp})`);
  await shot('finished');
  await G(() => window.__bzm.fire('wallet')); await p.waitForSelector('.sheet.wallet');
  const wal = await p.locator('.sheet.wallet').innerText();
  ok(wal.includes('finished today’s challenge') && wal.includes(name), `the wallet history says it in words (${wal.split('\n').find((l) => /challenge/.test(l))})`);
  await shot('wallet');
  await G(() => window.__bzm.fire('wallet'));
  // again the same day: practice, no second bonus
  await nav(p, G, 'play', '.chal.done');
  ok(/Finished today · \d+ of 10 right · bonus paid/.test(await p.locator('.chal').innerText()), 'the card says it is done today, with its score');
  await p.locator('.chal').scrollIntoViewIfNeeded(); await shot('card-done');
  const s2 = await st(G);
  await p.click('.chal [data-act=challenge]'); await p.waitForSelector('#ans, .choice-row, #widget');
  for (let i = 0; i < 10; i++) { await G(() => window.__bzm.fire('choose', 'nope')); await p.waitForTimeout(40); await G(() => window.__bzm.fire('nextQ')); await p.waitForTimeout(40); }
  await p.waitForFunction(() => window.__bzm.R.run && window.__bzm.R.run.over, null, { timeout: 4000 });
  const s3 = await st(G);
  ok(s3.coins === s2.coins && /already in your wallet/.test(await p.locator('main').innerText()), `a second finish the same day pays nothing more (${s3.coins - s2.coins})`);
  await ctx.close();
}

/* ------------------------------------------------ paper skins (audit v4 K6): bought, worn, persisted, taken off; the paper unchanged */
const dismiss = async (p) => { for (let i = 0; i < 6 && await p.locator('.cel .btn').count(); i++) { await p.click('.cel .btn'); await p.waitForTimeout(200); } };
const sitPaper = async (p, G, wrongEvery = 3) => {
  await nav(p, G, 'hall', '.paper-grid'); await p.click('[data-act=pband][data-arg=g34]');
  await p.click('[data-act=paperStart][data-arg="g34|2"]'); await p.waitForSelector('.pq-choices');
  const t0 = Date.now();
  const info = await G(() => { const P = window.__bzm.R.paper; return { mins: P.p.mins, left: P.endsAt - Date.now(), items: P.p.items.map((q) => [q.text, q.ans, q.choices.join('|'), q.pts]) }; });
  const look = await G(() => { const g = (s, k) => getComputedStyle(document.querySelector(s))[k]; return { desk: g('.paper', 'backgroundColor'), band: g('.paper-bar', 'backgroundColor'), q: g('.paper-q', 'backgroundColor'), tex: g('.paper-q', 'backgroundImage'), time: g('#ptime', 'boxShadow'), ink: g('.pq-text', 'color') }; });
  return { info, look, t0, finish: async () => {
    await G((w) => { const P = window.__bzm.R.paper; P.p.items.forEach((q, j) => { window.__bzm.fire('paperGo', String(j)); window.__bzm.fire('paperPick', j % w ? q.ans : q.choices.find((c) => c !== q.ans)); }); }, wrongEvery);
    await p.waitForTimeout(450); await G(() => { window.__bzm.fire('paperFinish'); window.__bzm.fire('paperFinish'); }); await p.waitForSelector('.pe-score');
    const sc = await G(() => window.__bzm.R.paper.sc);
    await dismiss(p);   // a medal's ceremony (a first paper) is not what is under test here
    return sc;
  } };
};
{
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'paper');
  // the plain paper first: what it looks like, and what the same answers score
  const plain = await sitPaper(p, G); await shot('paper-plain'); const scPlain = await plain.finish();
  await nav(p, G, 'shop', '.shop-tabs'); await p.click('[data-act=shopTab][data-arg=extras]'); await p.waitForSelector('.papers-sk');
  ok(await p.locator('[data-paper-card]').count() === 5 && await p.locator('.sk-item').count() === 6, 'the Extras tab has a Paper skins section of five, beside the six road skins');
  const printed = await p.$$eval('[data-paper-card] [data-act=buyPaper]', (bs) => bs.map((b) => +b.textContent.trim()));
  ok(printed.length === 5 && printed.every((n) => Number.isInteger(n) && n >= 25 && n <= 60), `every paper skin has its price printed on it (${printed})`);
  await p.locator('.papers-sk').scrollIntoViewIfNeeded(); await shot('shop-papers');
  const s0 = await st(G);
  await p.click('[data-act=buyPaper][data-arg=exam]'); await p.waitForTimeout(200);
  const s1 = await st(G);
  ok(s0.coins - s1.coins === 25 && s1.shop.paperSkins.includes('exam') && s1.shop.worn.paper === 'exam' && s1.xp === s0.xp, `buying Exam Hall spends exactly 25, wears it, and moves no xp (spent ${s0.coins - s1.coins})`);
  ok(await G(() => document.documentElement.getAttribute('data-paper')) === 'exam', 'the root wears the paper skin');
  const exam = await sitPaper(p, G);
  ok(exam.look.desk !== plain.look.desk && exam.look.band !== plain.look.band && exam.look.q !== plain.look.q && /gradient/.test(exam.look.tex) && exam.look.time !== plain.look.time,
    `worn: the paper, its header band, its texture and the clock all change (${JSON.stringify(plain.look)} → ${JSON.stringify(exam.look)})`);
  ok(JSON.stringify(exam.info.items) === JSON.stringify(plain.info.items) && exam.info.mins === plain.info.mins && Math.abs(exam.info.left - plain.info.left) < 5000,
    `the same paper: the same questions, choices, marks and time (${exam.info.mins} min)`);
  await shot('paper-exam');
  const scExam = await exam.finish();
  ok(JSON.stringify(scExam) === JSON.stringify(scPlain), `the same answers score exactly the same on the skin (${scPlain.points} = ${scExam.points})`);
  // persists across a reload, still worn
  await G(() => location.reload()); await p.waitForSelector('#app main'); await p.waitForTimeout(300); await dismiss(p);
  const s2 = await st(G);
  ok(s2.shop.paperSkins.includes('exam') && s2.shop.worn.paper === 'exam' && await G(() => document.documentElement.getAttribute('data-paper')) === 'exam', 'after a reload the skin is still owned and still worn');
  // take it off: the plain paper is back, exactly
  await nav(p, G, 'shop', '.shop-tabs'); await p.click('[data-act=shopTab][data-arg=extras]'); await p.click('[data-paper-card=exam] [data-act=wearPaper]'); await p.waitForTimeout(150);
  ok((await st(G)).shop.worn.paper === null && await G(() => document.documentElement.getAttribute('data-paper')) === null, 'taking it off clears it');
  const off = await sitPaper(p, G);
  ok(JSON.stringify(off.look) === JSON.stringify(plain.look), `and the paper looks exactly as it did before (${JSON.stringify(off.look)})`);
  const scOff = await off.finish();
  ok(JSON.stringify(scOff) === JSON.stringify(scPlain), 'and scores the same');
  await ctx.close();
}
/* every word on every paper skin — and on the Shop's previews — is AA, in light and dark */
const worstIn = ([sel, hidden]) => {
  const rgba = (c) => { const m = c.match(/[\d.]+(e-?\d+)?/g).map(Number), k = /^color\(srgb/.test(c) ? 255 : 1; if (/^color\(/.test(c) && !/^color\(srgb /.test(c)) throw new Error('unparsed colour ' + c); return [m[0] * k, m[1] * k, m[2] * k, m.length > 3 ? m[3] : 1]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const out = [];
  for (const box of document.querySelectorAll(sel)) for (const el of box.querySelectorAll('*')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !el.offsetParent || el.closest('svg') || (!hidden && el.closest('[aria-hidden=true]'))) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0 || (el.closest('button') && el.closest('button').disabled)) continue;
    const layers = []; for (let a = el; a; a = a.parentElement) { const b = rgba(getComputedStyle(a).backgroundColor); if (b[3] > 0) layers.unshift(b); if (b[3] >= 1) break; }
    let min = 99;
    for (const px of [[0, 0, 0, 1], [255, 255, 255, 1]]) { let bg = px; for (const l of layers) bg = over(l, bg); min = Math.min(min, cr(over(rgba(cs.color), bg), bg)); }
    const size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    out.push({ t: el.textContent.trim().slice(0, 24), min: +min.toFixed(2), need: big ? 3 : 4.5 });
  }
  return out;
};
for (const dark of [false, true]) {
  const tag = dark ? 'dark' : 'light';
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, 'pp-' + tag, { dark });
  if (dark) await G(() => { document.documentElement.setAttribute('data-mode', 'dark'); });
  const ids = await G(() => { const k = window.__bzm.R.h.kids[0]; k.shop.paperSkins = ['exam', 'chalk', 'blueprint', 'night', 'graph']; return k.shop.paperSkins; });
  await nav(p, G, 'shop', '.shop-tabs'); await p.click('[data-act=shopTab][data-arg=extras]'); await p.waitForSelector('.papers-sk');
  const prev = (await G(worstIn, ['.pp-prev', true])), prevBad = prev.filter((x) => x.min < x.need);
  ok(prev.length >= 20 && !prevBad.length, `${tag}: every word on the Shop's paper previews is AA (${prev.length} checked; failing ${JSON.stringify(prevBad.slice(0, 4))})`);
  await p.locator('.papers-sk').scrollIntoViewIfNeeded(); await shot('shop-papers');
  for (const id of [null, ...ids]) {
    await G((x) => { const k = window.__bzm.R.h.kids[0]; k.shop.worn.paper = x; window.__bzm.render(); }, id);
    await nav(p, G, 'hall', '.paper-grid'); await p.click('[data-act=pband][data-arg=g56]');
    await p.click('[data-act=paperStart][data-arg="g56|3"]'); await p.waitForSelector('.pq-choices');
    await G(() => { const P = window.__bzm.R.paper; window.__bzm.fire('paperPick', P.p.items[0].choices[1]); window.__bzm.fire('paperGo', '0'); });
    await p.waitForTimeout(450);
    const rows = await G(worstIn, ['.paper', false]), bad = rows.filter((x) => x.min < x.need);
    ok(rows.length >= 12 && !bad.length, `${id || 'plain'} ${tag}: every word on the paper is AA over any pixel (${rows.length} checked; failing ${JSON.stringify(bad.slice(0, 4))})`);
    if (id && (await G(() => document.documentElement.getAttribute('data-paper'))) !== id) ok(false, `${id} ${tag}: worn on the root`);
    if (['chalk', 'night', 'exam', 'graph'].includes(id)) await shot('paper-' + id);
    await G(() => window.__bzm.fire('paperQuit')); await p.waitForTimeout(100);
    await G(() => { const k = window.__bzm.R.h.kids[0]; k.paperDraft = null; });
  }
  await ctx.close();
}
/* ------------------------------------------------ Cube Builder, played to the end on a phone:
   puzzle 1 by KEYBOARD (arrows and digits), puzzle 2 by TOUCH (taps on squares and the height
   pad, and the up button), puzzle 3 checked too early (the wrong view wobbles) and then shown.
   The finish card, the best score in k.games.cubes, the wage per solved puzzle, 44px targets,
   reduced motion, and Back closing the game. */
for (const dark of [false, true]) {
  const tag = dark ? 'dark' : 'light';
  const { p, ctx, G, shot } = await open({ width: 390, height: 844 }, 'cubes-phone-' + tag, { dark });
  if (dark) await G(() => { document.documentElement.setAttribute('data-mode', 'dark'); });
  const probe = (k) => G((k) => { const g = window.__bzmGames && window.__bzmGames.active(); return g && g.probe[k](); }, k);
  const kidNow = () => G(() => ({ xp: window.__bzm.R.h.kids[0].xp, games: window.__bzm.R.h.kids[0].games }));
  await nav(p, G, 'play', '.gtiles');
  ok(await p.locator('.gtile[data-arg=cubes]').count() === 1, `${tag}: Cube Builder has a tile on Play`);
  const x0 = (await kidNow()).xp;
  await p.tap('.gtile[data-arg=cubes]'); await p.waitForSelector('.g-intro');
  const how = await p.$$eval('.g-how li', (l) => l.length);
  ok(how === 3 && /Cube Builder/.test(await p.locator('.g-card h2').innerText()), `${tag}: a title card with a three-step how-to (${how})`);
  if (!dark) await shot('intro');
  await skip(p); await p.waitForSelector('.cb-grid');
  ok((await probe('level')) === 2, `${tag}: an 8–10 plays level 2`);
  // 44px targets on a phone: the squares, the height pad, up and down, the tools and Back
  // measured at rest: a square's 'born' swell (cubes, 0.3 s) is a transform, and getBoundingClientRect sees it
  await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || (x.effect && x.effect.getTiming().iterations === Infinity)), null, { timeout: 5000 }).catch(() => {});
  const small = await G(() => [...document.querySelectorAll('.play .cb-cell, .play .cb-ctl button, .play .mt-tools button, .play .play-x, .play .play-m')].map((b) => { const r = b.getBoundingClientRect(); return [b.className, Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
  ok(small.length === 0, `${tag}: every Cube Builder control is at least 44px on a phone (${JSON.stringify(small.slice(0, 4))})`);
  const wide = await G(() => document.querySelector('.play-body').scrollWidth - document.querySelector('.play-body').clientWidth);
  ok(wide <= 0, `${tag}: nothing scrolls sideways on a phone (${wide}px)`);
  await shot('play');

  // puzzle 1 by KEYBOARD: arrows to each square, a digit for its height
  const ans1 = await probe('answer'), n = 3;
  let sel = 4;
  for (let i = 0; i < ans1.length; i++) {
    if (!ans1[i]) continue;
    const [r, c, r0, c0] = [Math.floor(i / n), i % n, Math.floor(sel / n), sel % n];
    for (let k = 0; k < Math.abs(r - r0); k++) await p.keyboard.press(r > r0 ? 'ArrowDown' : 'ArrowUp');
    for (let k = 0; k < Math.abs(c - c0); k++) await p.keyboard.press(c > c0 ? 'ArrowRight' : 'ArrowLeft');
    sel = i;
    if (ans1[i] > 1) { await p.keyboard.press('+'); await p.keyboard.press(String(ans1[i])); } else await p.keyboard.press('1');
  }
  await p.waitForTimeout(150);
  const m1 = await p.locator('.cb-msg').innerText(), b1 = await probe('build');
  ok(b1.join() === ans1.join() && /fewest/.test(m1) && await p.locator('.cb-view.match').count() === 3, `${tag}: puzzle 1 built by keyboard matches all three views, with the fewest (${m1})`);
  await p.waitForFunction(() => /Puzzle\s*2/.test(document.querySelector('.play-hud').textContent), null, { timeout: 4000 });

  // puzzle 2 by TOUCH: tap a square, then the height pad (or the up button for a tower of one)
  const ans2 = await probe('answer');
  for (let i = 0; i < ans2.length; i++) {
    if (!ans2[i]) continue;
    await p.tap(`.cb-cell[data-i="${i}"]`);
    if (ans2[i] === 1) await p.tap('[data-a=up]'); else await p.tap(`[data-a=set][data-v="${ans2[i]}"]`);
  }
  await p.waitForTimeout(150);
  ok((await probe('build')).join() === ans2.join() && /fewest/.test(await p.locator('.cb-msg').innerText()), `${tag}: puzzle 2 built by touch, solved with the fewest`);
  await p.waitForFunction(() => /Puzzle\s*3/.test(document.querySelector('.play-hud').textContent), null, { timeout: 4000 });
  ok((await kidNow()).xp - x0 === 10, `${tag}: two solved puzzles paid the standard wage twice (${(await kidNow()).xp - x0} xp)`);

  // puzzle 3: a check before the views match wobbles the wrong view; then Show me
  await p.keyboard.press('1'); const j0 = await G(() => +document.querySelector('.play').dataset.juice);
  await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  const wob = await p.locator('.cb-view.gwob').count(), j1 = await G(() => +document.querySelector('.play').dataset.juice);
  ok(wob === 1 && j1 > j0 && /does not match/.test(await p.locator('.cb-msg').innerText()), `${tag}: Enter before the views match wobbles the view that is wrong (${wob})`);
  // reduced motion: a raised tower does not bounce
  await G(() => document.documentElement.setAttribute('data-motion', 'reduced'));
  await p.keyboard.press('2'); await p.waitForTimeout(30);
  const anim = await G(() => { const b = document.querySelector('.cb-cell.born'); return b ? getComputedStyle(b).animationName : 'no born'; });
  ok(anim === 'none', `${tag}: under reduced motion a raised tower does not bounce (${anim})`);
  await G(() => document.documentElement.removeAttribute('data-motion'));
  const xs = (await kidNow()).xp;
  await p.keyboard.press('s'); await p.waitForTimeout(100);
  ok((await probe('build')).join() === (await probe('answer')).join() && (await kidNow()).xp === xs, `${tag}: Show me builds the fewest stack, and pays nothing`);
  await p.waitForSelector('.play-end', { timeout: 5000 });
  const end = await p.locator('.play-end').innerText(), rec = (await kidNow()).games.cubes;
  ok(/6 of 9 stars/.test(end) && /front, side and top/.test(end) && await p.locator('.play-end .stars .on').count() === 2, `${tag}: the finish card: 6 of 9, two stars, and what was practised (${end.slice(0, 80).replace(/\n/g, ' ')})`);
  ok(rec && rec.best === 6 && rec.plays === 1, `${tag}: the best score is saved in k.games.cubes (${JSON.stringify(rec)})`);
  await shot('end');
  ok((await st(G)).hash === '#/game/cubes', `${tag}: the game has its own hash`);
  await p.goBack(); await p.waitForTimeout(300);
  const s4 = await st(G);
  ok(!s4.game && s4.overlay === 0 && s4.nav === 'play', `${tag}: Back closes Cube Builder and lands on Play (nav ${s4.nav}, ${s4.hash})`);
  ok(/Best:? 6/.test(await p.locator('.gtile[data-arg=cubes]').innerText())   /* the house wording is "Best: 6" (audit v4 G2) */, `${tag}: the Play tile shows the best score`);
  // the Puzzle Tower offers it too, at all three levels, and search finds it
  await nav(p, G, 'puzzles', '[data-act=cubesPlay]');
  ok(await p.locator('[data-act=cubesPlay]').count() === 3, `${tag}: the Puzzle Tower offers Cube Builder at three levels`);
  await p.tap('[data-act=cubesPlay] >> nth=0'); await skip(p); await p.waitForSelector('.cb-grid');
  ok((await probe('level')) === 1, `${tag}: and a level chosen there is the level played`);
  await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(150);
  await ctx.close();
}

/* ------------------------------------------------ the plates: painted, and the words on them AA */
const worst = () => {
  // computed colours come back as rgb()/rgba() (0–255) or, from color-mix, as color(srgb r g b / a) (0–1)
  const rgba = (c) => { const m = c.match(/[\d.]+(e-?\d+)?/g).map(Number), k = /^color\(srgb/.test(c) ? 255 : 1; if (/^color\(/.test(c) && !/^color\(srgb /.test(c)) throw new Error('unparsed colour ' + c); return [m[0] * k, m[1] * k, m[2] * k, m.length > 3 ? m[3] : 1]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const play = document.querySelector('.play'), out = [];
  for (const el of play.querySelectorAll('*')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !el.offsetParent || el.closest('canvas,[aria-hidden=true]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const layers = []; for (let a = el; a && a !== play; a = a.parentElement) { const b = rgba(getComputedStyle(a).backgroundColor); if (b[3] > 0) layers.unshift(b); }
    let min = 99;
    for (const px of [[0, 0, 0, 1], [255, 255, 255, 1]]) { let bg = px; for (const l of layers) bg = over(l, bg); min = Math.min(min, cr(over(rgba(cs.color), bg), bg)); }
    const size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    out.push({ t: el.textContent.trim().slice(0, 24), min: +min.toFixed(2), need: big ? 3 : 4.5 });
  }
  return out;
};
for (const dark of [false, true]) {
  const tag = dark ? 'dark' : 'light';
  const { p, ctx, G, shot } = await open({ width: 1280, height: 800 }, tag, { dark });
  if (dark) await G(() => { document.documentElement.setAttribute('data-mode', 'dark'); });
  for (const [what, openIt, ready] of [
    ['rush', async () => { await nav(p, G, 'play', '.gtiles'); await p.click('[data-act=play][data-arg=rush]'); }, '.rush-in'],
    ['target', async () => { await nav(p, G, 'play', '.gtiles'); await p.click('[data-act=play][data-arg=target]'); }, '.mt-card'],
    ['line', async () => { await nav(p, G, 'play', '.gtiles'); await p.click('[data-act=play][data-arg=line]'); }, '.nl-track'],
    ['sudoku', async () => { await nav(p, G, 'puzzles', '[data-act=sudokuPlay]'); await p.click('[data-act=sudokuPlay] >> nth=0'); }, '.sdk'],
    ['cubes', async () => { await nav(p, G, 'play', '.gtiles'); await p.click('[data-act=play][data-arg=cubes]'); }, '.cb-grid'],
  ]) {
    await openIt(); await p.waitForSelector('.g-intro');
    const introBad = (await G(worst)).filter((x) => x.min < x.need);
    await skip(p); await p.waitForSelector(ready); await p.waitForTimeout(250);
    const bg = await G(() => getComputedStyle(document.querySelector('.play')).backgroundImage);
    ok(new RegExp(`art/g-${what}\\.webp`).test(bg), `${what}: the game is played on its painted plate (${bg.slice(0, 80)})`);
    const veil = await G(() => { const v = getComputedStyle(document.querySelector('.play')).getPropertyValue('--veil'); const m = v.match(/(\d+)%/); return m ? +m[1] : null; });
    ok(veil !== null && veil <= 10, `${what} ${tag}: the veil over the painting is thin (${veil}%)`);
    const rows = await G(worst), bad = [...introBad, ...rows.filter((x) => x.min < x.need)];
    ok(rows.length >= 3 && bad.length === 0, `${what} ${tag}: every word on the plate is AA over any pixel (${rows.length} checked; failing ${JSON.stringify(bad.slice(0, 4))})`);
    await shot(`plate-${what}`);
    await G(() => window.__bzmGames.active().quit()); await p.waitForTimeout(150);
  }
  await ctx.close();
}

ok(!errors.length, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await close();
console.log(`${fails() ? 'FAIL' : 'ok'} extras-ui — skins dress every road, today's challenge pays its bonus once, paper skins dress the paper and change no mark, modes locked then played by keys and taps at the standard wage, Back closes a game, plates painted and AA`);
if (fails()) process.exit(1);
