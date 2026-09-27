/* test/ui.mjs — drive the BUILT app in a real browser, the way a child would.
   Serves build/ under /Bizzing-Maths/ (the GitHub Pages sub-path), then walks:
   onboarding → placement skip → Atlas → a stop's three tabs → a drill → facts →
   the contest → all three games by keyboard → the grown-ups PIN. Any page
   error fails it. Screenshots land in $SHOTS (default: build/../.shots). */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const HERE = resolve(import.meta.dirname, '..');
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');
const SITE = resolve(HERE, '.site');
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = 8000 + Math.floor(Math.random() * 900);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
const errors = [];
async function run(vp, tag) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('response', (r) => { if (r.status() === 404) errors.push(`${tag} 404: ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`); });
  const shot = (n) => page.screenshot({ path: `${SHOTS}/${tag}-${n}.png`, fullPage: false });
  const R = () => page.evaluate(() => { const r = window.__bzm.R; return { nav: r.ui.nav, run: r.run && { kind: r.run.kind, i: r.run.i, n: r.run.items.length, over: r.run.over, fb: r.run.fb, q: r.run.items[r.run.i] } }; });
  const nav = (k) => page.click(vp.width < 760 ? `.tb[data-arg=${k}]` : `.tab[data-arg=${k}]`);
  const typeAns = async (ans) => { for (const ch of String(ans)) await page.keyboard.press(ch); };

  await page.goto(`http://127.0.0.1:${port}/Bizzing-Maths/`);
  await page.waitForSelector('.welcome');
  await shot('01-welcome');
  ok(await page.locator('[data-act=createKid]').isDisabled(), 'create is disabled until name and age');
  await page.fill('#kname', 'Ahana');
  await page.click('[data-act=draftBand][data-arg="8-10"]');
  // the avatar picker: five labelled packs of six, all offered, keyboard and touch
  ok(await page.locator('.av-pack').count() === 5 && await page.locator('.av-pick').count() === 30, 'the picker shows five packs of six');
  await page.locator('.av-packs').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  await page.locator('.av-packs').screenshot({ path: `${SHOTS}/${tag}-01b-avatars.png` });
  await page.focus('.av-pick[tabindex="0"]');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  ok(await page.evaluate(() => window.__bzm.R.ui.draft.avatar) === 'astro', 'arrow keys + Enter choose a face (right, down → Star Crew\'s second)');
  await page.click('[data-act=draftAv][data-arg="hexbee"]');
  ok(await page.evaluate(() => window.__bzm.R.ui.draft.avatar) === 'hexbee', 'a tap chooses a face');
  await page.click('[data-act=createKid]');
  await page.waitForSelector('[data-act=startLevelTest]');
  await shot('02a-start');
  // the level test: a child secure up to Level 3 and lost above it must be placed at Level 4
  await page.click('[data-act=startLevelTest]');
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => { const r = window.__bzm.R.run; const q = r && r.items[r.i]; return r && { over: r.over, fb: r.fb, q: q && { ans: q.ans, choices: q.choices, L: q.tlevel } }; });
    if (!s || s.over) break;
    if (s.fb) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); continue; }
    const know = s.q.L <= 3;
    if (s.q.choices) { const idx = s.q.choices.indexOf(s.q.ans); await page.keyboard.press(String(know ? idx + 1 : ((idx + 1) % s.q.choices.length) + 1)); }
    else { await typeAns(know ? String(s.q.ans).replace('−', '-') : '98765'); if (!know) await page.keyboard.press('Enter'); }
    if (i === 1) await shot('02b-leveltest');
    await page.waitForTimeout(know ? 800 : 300);
  }
  await page.waitForTimeout(600);
  ok((await R()).run && (await R()).run.over, 'the level test finishes');
  ok(await page.evaluate(() => window.__bzm.R.h.kids[0].journey.level) === 4, 'a child secure to Level 3 is placed on Level 4');
  await shot('02-placed');
  ok(!/of \d+ right/.test(await page.locator('.end-card').innerText()), 'finding a level is never scored');
  await page.click('[data-act=endRun]');
  await page.waitForSelector('.jsteps');
  ok(await page.evaluate(() => document.querySelector('.jprog .meter').getBoundingClientRect().height) > 4, 'the journey progress bar is drawn');
  await page.waitForTimeout(200); await shot('02c-journey');
  ok(await page.locator('.jsteps li').count() >= 12 && await page.locator('.jl').count() === 10, 'the journey page shows ten levels and this level\'s steps');
  // the first journey step opens its stop with the journey's drill level chosen
  await page.click('.jsteps li.next button'); await page.waitForSelector('.stop-page');
  ok(await page.evaluate(() => !!window.__bzm.R.ui.jstep), 'a journey step opens as a journey step');
  // the road is linear: the second station is locked; the Atlas opens on the road, with level badges
  await page.evaluate(() => window.__bzm.go('atlas')); await page.waitForSelector('.jroad');
  ok(await page.locator('.jroad li.shut').count() > 5 && await page.locator('.jcheck').count() === 1, 'the Atlas opens on My road: stations locked beyond the next, a level check at the end');
  await page.click('.jroad li.shut button', { force: true }); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__bzm.R.ui.nav) === 'atlas', 'a locked station does not open');
  await shot('02d-road');
  await page.evaluate(() => window.__bzm.fire('atlasView', 'islands')); await page.waitForSelector('.map-board');
  ok(await page.locator('.mp-road').count() >= 1, 'the island map says how many road stations each place holds');
  await page.evaluate(() => window.__bzm.fire('openWorld', 'market')); await page.waitForSelector('.board');
  ok(await page.locator('.bpin .lvb').count() >= 3, 'world boards carry a level badge on each stop');
  await shot('02e-badges');
  await page.evaluate(() => window.__bzm.go('atlas'));
  await page.waitForSelector('.map-board');
  await page.waitForTimeout(400);
  await shot('03-atlas');
  ok(await page.locator('.map-pin.shut').count() > 0, 'some places are not reached yet');
  // travel to the market, pick "times-nine" on the board, tap again to go in
  await page.click('.map-pin[data-arg=market]');
  await page.waitForSelector('.board');
  await page.waitForTimeout(400);
  await shot('03b-world');
  await page.click('.bpin[data-arg="times-nine"]'); await page.click('.bpin[data-arg="times-nine"]');
  await page.waitForSelector('.story');
  // the story: walk every beat by keyboard; the notepad fills
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await shot('03c-story');
  ok(await page.locator('.notepad p').count() >= 2, 'the story notepad fills as it goes');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  ok(await page.evaluate(() => !!window.__bzm.R.h.kids[0].stories['times-nine']), 'reading to the end marks the story read');
  await page.click('.st-ctl [data-act=stopTab][data-arg=learn]');
  await page.waitForSelector('.learn');
  await page.click('[data-act=watch]'); await page.click('[data-act=watch]');
  await shot('04-learn');
  await page.click('[data-act=stopTab][data-arg=turn]');
  await page.click('[data-act=startGuided]');
  // type every step of both guided questions
  for (let q = 0; q < 2; q++) {
    for (let s = 0; s < 8; s++) {
      const g = await page.evaluate(() => { const r = window.__bzm.R.run; return r && r.kind === 'guided' ? { si: r.si, n: r.steps.length, v: r.steps[r.si] && r.steps[r.si].v } : null; });
      if (!g || g.si >= g.n) break;
      if (s === 0 && q === 0) await shot('05-turn');
      await typeAns(g.v); await page.waitForTimeout(60);
    }
    await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  }
  const star1 = await page.evaluate(() => { const r = window.__bzm.R; return r.h.kids[0].tricks['times-nine'].stars; });
  ok(star1 >= 1, 'Your turn earns the first star');
  // drill: all right
  await page.click('[data-act=startDrill]');
  for (let i = 0; i < 10; i++) { const s = await R(); await typeAns(s.run.q.ans); await page.waitForTimeout(520); if (i === 3) await shot('06-drill'); }
  await page.waitForTimeout(500);
  ok((await R()).run.over, 'drill finishes');
  await shot('07-drill-end');
  const st = await page.evaluate(() => window.__bzm.R.h.kids[0].tricks['times-nine'].stars);
  ok(st >= 2, `drill passes the stop (${st} stars)`);
  // a wrong answer holds and shows the working
  await page.click('[data-act=endRun]');
  await page.click('[data-act=startDrill]');
  await typeAns('1'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await page.locator('.fb-work .steps li').count() >= 2, 'a wrong drill answer shows the trick on that question');
  await shot('08-wrong');
  ok((await R()).run.fb && !(await R()).run.fb.right, 'wrong answer holds');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  ok((await R()).run.i === 1, 'Enter moves on after a wrong answer');
  await page.keyboard.press('Escape');
  // facts
  await page.evaluate(() => window.__bzm.go('facts'));
  await page.waitForSelector('.fgrid');
  await page.click('[data-act=startFacts]');
  for (let i = 0; i < 20; i++) { const s = await R(); if (!s.run || s.run.over) break; await typeAns(s.run.q.ans); await page.waitForTimeout(480); }
  await page.waitForTimeout(400);
  ok((await R()).run.over, 'twenty facts finish');
  await page.click('[data-act=endRun]'); await page.waitForSelector('.fgrid');
  await page.click('.fc.learning, .fc.quick, .fc.new >> nth=0');
  await shot('09-facts');
  // stop pages for a sutra with a figure
  await page.evaluate(() => { window.__bzm.R.h.parent.tester = true; window.__bzm.render(); });
  await page.evaluate(() => window.__bzm.fire('openStop', 'square-five')); await page.click('.seg [data-arg=learn]'); await page.click('[data-act=watchAll]');
  await shot('10-sutra');
  await page.evaluate(() => window.__bzm.fire('openStop', 'crosswise')); await page.click('.seg [data-arg=learn]'); await page.click('[data-act=watchAll]');
  await page.evaluate(() => document.querySelector('.why').scrollIntoView());
  await shot('11-crosswise');
  // the Far Isles: a new world, a stop with a drawing, a drill with the extra keys
  await page.evaluate(() => { window.__bzm.R.h.parent.tester = true; window.__bzm.go('atlas'); });
  await page.click('[data-act=isle][data-arg="2"]'); await page.waitForTimeout(400);
  await shot('26-far-isles');
  await page.click('[data-act=isle][data-arg="3"]'); await page.waitForTimeout(400);
  await shot('26b-outer-isles');
  ok(await page.locator('.map-pin').count() === 4, 'the Outer Isles map shows its four places');
  for (const [wid, sid] of [['clocktower', 'read-the-clock'], ['bakery', 'fraction-of-amount'], ['shapecity', 'kinds-of-angle'], ['palace', 'teen-squares'], ['setisland', 'venn-count'], ['dock', 'add-decimals'], ['carnival', 'bar-compare'], ['quarry', 'prime-stones'], ['mine', 'subtract-negative'], ['coinstreet', 'fewest-coins'], ['coinstreet', 'interest-compound'], ['lighthouse', 'tan-height'], ['lighthouse', 'scatter-correlation'], ['lighthouse', 'tree-diagram'], ['lighthouse', 'expected-frequency'], ['shapecity', 'construct-triangle']]) {
    await page.evaluate((w) => window.__bzm.fire('openWorld', w), wid); await page.waitForSelector('.board');
    if (wid === 'clocktower' || wid === 'mine' || wid === 'lighthouse') { await page.waitForTimeout(300); await shot(`27-world-${wid}`); }
    await page.evaluate((s2) => window.__bzm.fire('openStop', s2), sid); await page.click('.seg [data-arg=learn]'); await page.click('[data-act=watchAll]');
    await shot(`28-learn-${sid}`);
    await page.click('.seg [data-arg=drill]'); await page.click('[data-act=level][data-arg="2"]'); await page.click('[data-act=startDrill]');
    for (let i = 0; i < 10; i++) {
      const st = await R(); if (!st.run || st.run.over) break;
      if (i === 1) await shot(`29-drill-${sid}`);
      if (st.run.q.choices) await page.keyboard.press(String(st.run.q.choices.indexOf(st.run.q.ans) + 1)); else await typeAns(String(st.run.q.ans).replace('−', '-'));
      await page.waitForTimeout(80);
      const st2 = await R(); if (st2.run && st2.run.fb && !st2.run.over) { if (!st2.run.fb.right) { ok(false, `${sid}: typed its own answer ${st.run.q.ans} and was marked wrong`); } if (st2.run.fb) await page.keyboard.press('Enter'); }
      await page.waitForTimeout(560);
    }
    await page.waitForTimeout(300);
    ok((await R()).run && (await R()).run.over, `${sid}: drill finishes`);
    ok(await page.evaluate((s2) => (window.__bzm.R.h.kids[0].tricks[s2] || {}).stars >= 2, sid), `${sid}: typing every answer passes the stop`);
    await page.click('[data-act=endRun]');
  }
  // Learn walks every idea in a stop: Kinds of triangle has six, stepped through by → alone
  await page.evaluate(() => { window.__bzm.fire('openStop', 'kinds-of-triangle'); window.__bzm.fire('stopTab', 'learn'); });
  await page.waitForSelector('.case-chip');
  ok(await page.locator('.case-chip').count() === 6, 'Kinds of triangle shows six ideas to click through');
  // every tab in a tab row sits inside the screen — on a phone the row wraps instead of hiding one
  ok(await page.evaluate(() => [...document.querySelectorAll('.seg button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5; })), 'every stop tab is on screen');
  await shot('28b-cases-1');
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight');
  ok(await page.evaluate(() => window.__bzm.R.ui.lcase) === 5, '→ walks every idea to the last one');
  ok(/obtuse/i.test(await page.locator('.learn').innerText()), 'the last idea is shown: obtuse-angled');
  await shot('28c-cases-6');
  await page.evaluate(() => { window.__bzm.R.h.parent.tester = false; });
  // stories shelf + a sutra story
  await page.evaluate(() => window.__bzm.go('stories')); await page.waitForSelector('.shelf');
  await shot('11b-shelf');
  await page.evaluate(() => window.__bzm.fire('openStory', 'nikhilam-100'));
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(350); await shot('11c-story2');
  // the puzzle room: nets, patterns, scales by keyboard; a sudoku by hints
  await nav('puzzles'); await page.waitForSelector('.tower-board');
  await page.waitForTimeout(300); await shot('22-tower');
  const answerAll = async (tag) => {
    for (let i = 0; i < 6; i++) {
      const s = await R(); if (!s.run || s.run.over) break;
      if (s.run.q.choices) await page.keyboard.press(String(s.run.q.choices.indexOf(s.run.q.ans) + 1)); else await typeAns(s.run.q.ans);
      await page.waitForTimeout(120);
      if (tag && i < 6) await shot(`23-${tag}-${s.run.q.kind}`);
      await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    }
    await page.waitForTimeout(200);
  };
  await page.click('.fpin[data-arg="1"]'); await page.click('[data-act=climb][data-arg="1"]');
  await answerAll('floor');
  ok((await R()).run.over, 'floor 1 finishes');
  ok(await page.evaluate(() => !!(window.__bzm.R.h.kids[0].quest[1] || {}).passed), 'six right clears floor 1');
  await shot('23-floor-end');
  await page.click('[data-act=endRun]'); await nav('puzzles');
  await page.click('[data-act=practise][data-arg="space:2"]');
  await answerAll(''); await page.click('[data-act=endRun]'); await nav('puzzles');
  const pzr = await page.evaluate(() => window.__bzm.R.h.kids[0].puzzles);
  ok(pzr.space && pzr.space.right >= 6, 'Shapes & Space answers are recorded under their family');
  await page.click('[data-act=sudokuPlay][data-arg="1"]'); await page.waitForSelector('.sdk');
  await shot('24-sudoku');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('1');
  for (let i = 0; i < 90 && await page.locator('.sdk').count() && !(await page.locator('.play-end').count()); i++) { await page.keyboard.press('h'); await page.waitForTimeout(15); }
  await page.waitForSelector('.play-end', { timeout: 5000 });
  ok(true, 'sudoku solves'); await page.keyboard.press('Escape');
  // goals
  await page.evaluate(() => window.__bzm.go('goals')); await page.waitForSelector('.strands');
  await shot('25-goals');
  ok(await page.locator('.goals li').count() >= 15, 'the goals page lists every goal');
  // the Library: the shelf, every tool opens clean, and three real flows
  await nav('library'); await page.waitForSelector('.lib-grid');
  await page.waitForTimeout(300); await shot('30-library');
  ok(await page.locator('.lib-tile').count() >= 11, 'the Library shelf shows every tool');
  for (const id of ['explorer', 'working', 'tables', 'shapes', 'graphs', 'dictionary', 'formulas', 'vedic', 'chinese']) {
    await page.evaluate((t) => window.__bzm.fire('openTool', t), id);
    await page.waitForSelector(`.t-${id}`); await page.waitForTimeout(200);
    await shot(`31-lib-${id}`);
  }
  // Shape Studio's Construct bench: a triangle from three sides, stepped through by keyboard
  await page.evaluate(() => { window.__bzm.fire('openTool', 'shapes'); window.__bzm.fire('lib', 'bench|construct'); window.__bzm.fire('lib', 'kcon|sss'); });
  await page.waitForSelector('.t-shapes'); for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  ok(await page.evaluate(() => [...document.querySelectorAll('.t-shapes-seg button')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5; })), 'every Shape Studio tab is on screen');
  await page.waitForTimeout(200); await shot('31b-construct');
  ok(/why it/i.test(await page.locator('.t-shapes').innerText()), 'a construction steps through to its reason');
  await page.evaluate(() => window.__bzm.fire('openTool', 'explorer')); await page.waitForSelector('#t-explorer-n');
  await page.fill('#t-explorer-n', '360'); await page.press('#t-explorer-n', 'Enter'); await page.waitForTimeout(250);
  ok(/2³ × 3² × 5/.test(await page.locator('.t-explorer').innerText()), 'Number Explorer factorises 360');
  await shot('32-explorer-360');
  await page.evaluate(() => window.__bzm.fire('openTool', 'working')); await page.waitForSelector('#t-working-q');
  await page.fill('#t-working-q', '23 × 47'); await page.press('#t-working-q', 'Enter'); await page.waitForTimeout(250);
  ok(/1,?081/.test(await page.locator('.t-working').innerText()), 'Show Me the Working works 23 × 47');
  await shot('33-working');
  await page.evaluate(() => { window.__bzm.fire('openTool', 'tables'); window.__bzm.fire('lib', 'practise|'); });
  await page.waitForTimeout(200);
  for (let i = 0; i < 20; i++) { const s = await R(); if (!s.run || s.run.over) break; await typeAns(s.run.q.ans); await page.waitForTimeout(520); if (i === 2) await shot('34-tables-drill'); }
  await page.waitForTimeout(400); await shot('35-tables-end');
  ok(await page.evaluate(() => ((window.__bzm.R.h.kids[0].lib.tables || {}).level || 0) >= 10), 'a perfect 5 × 5 run opens the 10 × 10');
  // contest
  await page.evaluate(() => window.__bzm.go('contest')); await page.waitForSelector('.rivals');
  await shot('12-lobby');
  await page.click('[data-act=startContest]');
  for (let r = 0; r < 60; r++) {
    const ph = await page.evaluate(() => { const C = window.__bzm.R.contest; return C && { ph: C.phase, a: C.q && C.q.ans, ch: C.q && C.q.choices }; });
    if (!ph || ph.ph === 'end') break;
    if (ph.ph === 'ask' || ph.ph === 'champ') { if (r === 2) await shot('13-contest-q'); if (ph.ch) await page.keyboard.press(ph.ch.indexOf(ph.a) === 0 ? '1' : '2'); else await typeAns(ph.a); }
    else { if (r === 3) await shot('14-contest-round'); await page.keyboard.press('Enter'); }
    await page.waitForTimeout(90);
  }
  const end = await page.evaluate(() => window.__bzm.R.contest && window.__bzm.R.contest.phase);
  ok(end === 'end', 'a contest answered perfectly runs to the end');
  await shot('15-contest-end');
  // games by keyboard
  await nav('arcade'); await page.waitForSelector('.gtiles');
  await shot('16-arcade');
  await page.click('[data-act=play][data-arg=rush]'); await page.waitForTimeout(2600);
  await shot('17-rush');
  const bub = await page.evaluate(() => 1); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(!(await page.locator('.play').count()), 'Escape closes Number Rush');
  await page.click('[data-act=play][data-arg=target]'); await page.waitForSelector('.mt-card');
  await page.keyboard.press('1'); await page.keyboard.press('+');
  await shot('18-target');
  await page.keyboard.press('s'); await page.waitForTimeout(200);
  ok(/=/.test(await page.locator('.mt-msg').innerText()), 'Show me reveals a solution');
  await page.keyboard.press('Escape');
  await page.click('[data-act=play][data-arg=line]'); await page.waitForSelector('.nl-track');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  ok(await page.locator('.nl-true').count() === 1, 'Number Line places by keyboard');
  await shot('19-line');
  await page.keyboard.press('Escape');
  // Change avatar on the child's own page
  await page.click('.who[data-arg=me]'); await page.waitForSelector('[data-act=avEdit]');
  await page.click('[data-act=avEdit]'); await page.waitForSelector('.me-av .av-pick');
  await page.click('[data-act=setAv][data-arg="protortle"]');
  ok(await page.evaluate(() => window.__bzm.R.h.kids[0].avatar) === 'protortle', 'Change avatar sets the child\'s face');
  await page.waitForTimeout(400); await shot('19b-change-avatar');
  await page.click('[data-act=avEdit]');
  ok(await page.locator('.me-av .av-pick').count() === 0, 'Done closes the picker');
  // home + grown-ups
  await nav('home'); await page.waitForSelector('.home2');
  await shot('20-home');
  await page.click('.tool[data-arg=grownups]');
  for (const k of '1234') await page.keyboard.press(k);
  await page.waitForSelector('.report');
  await shot('21-grownups');
  ok(await page.locator('.report').count() === 1, 'PIN opens the grown-ups page');
  await themes(page, vp, tag, shot);
  await page.close();
}

/* The six themes: the active child's theme goes on <html>, the UI face
   changes to that theme's, Home and the Atlas render in each with no page
   error. Desktop is checked in light mode, the phone in dark. */
const THEME_UI = { graph: 'Nunito', chalk: 'Atkinson Hyperlegible Next', blueprint: 'Archivo', orbit: 'Exo 2', rangoli: 'Mukta', arcade: 'Lexend' };
async function themes(page, vp, tag, shot) {
  const dark = vp.width < 760;
  await page.evaluate((d) => document.documentElement.setAttribute('data-mode', d ? 'dark' : 'light'), dark);
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'graph', 'a child who never chose gets Graph Paper');
  const faces = new Set();
  for (const [id, face] of Object.entries(THEME_UI)) {
    await page.evaluate((t) => { const r = window.__bzm.R; r.h.kids.find((k) => k.id === r.h.active).prefs.theme = t; window.__bzm.go('home'); }, id);
    await page.waitForSelector('.home2'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350);
    ok(await page.evaluate(() => document.documentElement.dataset.theme) === id, `theme ${id} is on <html>`);
    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    ok(ff.replace(/["']/g, '').startsWith(face), `theme ${id}: the UI face is ${face} (got ${ff})`);
    ok(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), face), `theme ${id}: ${face} actually loaded`);
    faces.add(ff);
    ok(await page.evaluate(() => { const m = document.querySelector('.motif'); return !!m && m.textContent === '' && getComputedStyle(m).position === 'fixed' && getComputedStyle(m).pointerEvents === 'none'; }), `theme ${id}: the motif is a fixed, silent, untouchable layer`);
    await shot(`40-theme-${id}-home`);
    await page.evaluate(() => window.__bzm.go('atlas')); await page.waitForSelector('.map-board'); await page.waitForTimeout(350);
    await shot(`40-theme-${id}-atlas`);
  }
  ok(faces.size === 6, 'six themes, six different UI faces');
  // switching child switches theme: a second child with their own
  const first = await page.evaluate(() => window.__bzm.R.h.active);
  await page.evaluate(() => { const h = window.__bzm.R.h; const c = JSON.parse(JSON.stringify(h.kids.find((k) => k.id === h.active))); c.id = 'theme-twin'; c.name = 'Twin'; c.prefs.theme = 'rangoli'; h.kids.push(c); });
  await page.evaluate(() => window.__bzm.fire('switchKid', 'theme-twin')); await page.waitForSelector('.home2');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'rangoli', 'switching child puts on that child\'s theme');
  await page.evaluate((id) => window.__bzm.fire('switchKid', id), first); await page.waitForSelector('.home2');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'arcade', 'switching back restores the first child\'s theme');
  await page.evaluate(() => { const h = window.__bzm.R.h; h.kids = h.kids.filter((k) => k.id !== 'theme-twin'); });
  // the picker: reachable from Home, keyboard and tap
  await page.click('.theme-chip'); await page.waitForSelector('.theme-card');
  ok(await page.locator('.theme-card').count() === 6, 'the picker shows six themes');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'theme-arcade', 'the Home chip lands on the chosen theme');
  await page.keyboard.press('ArrowRight');   // wraps round to the first
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'graph', 'an arrow key chooses the next theme, instantly');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'rangoli', 'arrows go both ways (graph ← arcade ← rangoli)');
  await page.click('.theme-card[data-arg=chalk]');
  ok(await page.evaluate(() => window.__bzm.R.h.kids.find((k) => k.id === window.__bzm.R.h.active).prefs.theme) === 'chalk', 'a tap chooses a theme, saved on the child');
  await page.locator('#themes').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  await shot('41-theme-picker');
  await page.click('.theme-card[data-arg=graph]');
}
try {
  await run({ width: 1280, height: 860 }, 'desk');
  await run({ width: 390, height: 844 }, 'phone');
} finally { await browser.close(); srv.kill(); }
for (const e of errors) { fails++; console.error('  ✗ ' + e); }
console.log(`${fails ? 'FAIL' : 'ok'} ui — desktop and phone walked end to end`);
process.exit(fails ? 1 : 0);
