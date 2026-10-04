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
const st = (G) => G(() => ({ nav: window.__bzm.R.ui.nav, hash: location.hash, game: !!window.__bzmGames.active(), overlay: document.querySelectorAll('.play').length, xp: window.__bzm.R.h.kids[0].xp, coins: JSON.parse(localStorage.getItem('bizzing.wallet')).kids.ahana.coins, shop: window.__bzm.R.h.kids[0].shop }));
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
    await p.waitForFunction(() => { const g = window.__bzmGames.active(); return g && g.probe.answers().length > 0; }, null, { timeout: 8000 });
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

/* ------------------------------------------------ Cube Builder, played to the end on a phone:
   puzzle 1 by KEYBOARD (arrows and digits), puzzle 2 by TOUCH (taps on squares and the height
   pad, and the up button), puzzle 3 checked too early (the wrong view wobbles) and then shown.
   The finish card, the best score in k.games.cubes, the wage per solved puzzle, 44px targets,
   reduced motion, and Back closing the game. */
for (const dark of [false, true]) {
  const tag = dark ? 'dark' : 'light';
  const { p, ctx, G, shot } = await open({ width: 390, height: 844 }, 'cubes-phone-' + tag, { dark });
  if (dark) await G(() => { document.documentElement.setAttribute('data-mode', 'dark'); });
  const probe = (k) => G((k) => { const g = window.__bzmGames.active(); return g && g.probe[k](); }, k);
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
  ok(/Best 6/.test(await p.locator('.gtile[data-arg=cubes]').innerText()), `${tag}: the Play tile shows the best score`);
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
console.log(`${fails() ? 'FAIL' : 'ok'} extras-ui — skins dress every road, modes locked then played by keys and taps at the standard wage, Back closes a game, plates painted and AA`);
if (fails()) process.exit(1);
