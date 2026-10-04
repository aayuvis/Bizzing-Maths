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
const port = +(process.env.PORT_BASE || 5200) + 1;   // PORT_BASE moves every check into another agent's range
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
  // a land, level or medal ceremony sits over the screen until the child taps "Brilliant!" — as a child would, tap it
  const click0 = page.click.bind(page);
  page.click = async (sel, o) => { for (let i = 0; i < 6 && sel !== '.cel .btn' && await page.locator('.cel .btn').count(); i++) await click0('.cel .btn'); return click0(sel, o); };
  const R = () => page.evaluate(() => { const r = window.__bzm.R; return { nav: r.ui.nav, run: r.run && { kind: r.run.kind, i: r.run.i, n: r.run.items.length, over: r.run.over, fb: r.run.fb, q: r.run.items[r.run.i] } }; });
  const nav = (k) => page.click(vp.width <= 720 ? `[data-bz=tabbar] a[href="#/${k}"]` : `[data-bz=tab][href="#/${k}"]`);
  const typeAns = async (ans) => { for (const ch of String(ans)) await page.keyboard.press(ch); };

  await page.goto(`http://127.0.0.1:${port}/Bizzing-Maths/`);
  // onboarding, one question per screen (Bizzing Finance's): landing → name → age → five faces → two worlds
  await page.waitForSelector('.ob-land');
  await shot('01-welcome');
  ok(await page.locator('.ob-land [data-act=obStart]').count() === 1, 'a first visit opens on the landing page');
  await page.click('[data-act=obStart]'); await page.waitForSelector('#kname');
  ok(await page.locator('.ob-dots i').count() === 4, 'four steps, shown as dots');
  await page.click('[data-act=obNext]'); await page.waitForTimeout(150);
  ok(await page.locator('#kname').count() === 1, 'no name, no next step');
  await page.fill('#kname', 'Ahana'); await page.press('#kname', 'Enter');
  await page.waitForSelector('.ob-opt'); await shot('01a-age');
  await page.click('[data-act=draftBand][data-arg="8-10"]');
  await page.waitForSelector('.ob-face');
  ok(await page.locator('.ob-face').count() === 6, 'a new child picks from six free faces, not ninety-six');
  await shot('01b-faces');
  await page.click('[data-act=draftAv][data-arg="hexbee"]');
  await page.waitForSelector('.ob-world');
  ok(await page.locator('.ob-world').count() === 2, 'and from two worlds');
  await shot('01c-worlds');
  await page.click('[data-act=obTheme][data-arg="graph"]');
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
  await page.waitForSelector('.lboard');
  ok(await page.evaluate(() => document.querySelector('.road-bar .meter').getBoundingClientRect().height) > 4, 'the road progress bar is drawn');
  await page.locator('.board-scroll').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await shot('02c-journey');
  ok(await page.locator('.land-tag').count() >= 4 && await page.locator('.jl').count() === 10, 'the Atlas is this level\'s road across its lands\' paintings, with the ten-level ladder');
  ok(await page.locator('.bgate:not(.summit)').count() >= 4 && await page.locator('.bgate.summit').count() === 1, 'every land ends at a gate, and the road at the summit');
  ok(await page.locator('.secret').count() === 0, 'a placed child\'s recap land has no secrets; they wait on the lands the road reaches');
  await page.evaluate(() => { window.__bzm.R.h.kids[0].journey.recap = null; window.__bzm.render(); });   // from here: a child who climbed to Level 4
  ok(await page.locator('.secret').count() >= 3, 'the open land hides secrets to find');
  ok(await page.locator('.bpin.shut').count() > 5, 'the road is linear: everything beyond the next station is shut');
  const shutI = await page.locator('.bpin.shut').first().getAttribute('data-arg');
  await page.evaluate((i) => { window.__bzm.fire('roadPick', i); window.__bzm.fire('roadPick', i); }, shutI); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__bzm.R.ui.nav) === 'atlas', 'a shut station does not open');
  // earlier levels stay open to walk again; later ones are shut
  await page.evaluate(() => window.__bzm.fire('jlv', '2')); await page.waitForSelector('.lboard');
  ok(await page.locator('.bpin.shut').count() === 0 && await page.locator('.bpin').count() > 10, 'the Level 2 road is fully open to a Level 4 child');
  await page.locator('.board-scroll').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await shot('02d-road-l2');
  await page.evaluate(() => window.__bzm.fire('jlv', '6')); await page.waitForSelector('.lboard');
  ok(await page.locator('.bpin:not(.shut)').count() === 0, 'the Level 6 road is shut to a Level 4 child');
  await page.evaluate(() => { window.__bzm.R.ui.rpick = null; window.__bzm.fire('jlv', '4'); });
  // a secret: the rival's best of three
  await page.evaluate(() => { const b = document.querySelector('.secret[data-arg^=duel]'); window.__bzm.fire('secret', b.dataset.arg); });
  ok(await page.evaluate(() => window.__bzm.R.run && window.__bzm.R.run.items.length === 3), 'a rival challenges you to a best of three');
  await page.evaluate(() => { window.__bzm.R.run = null; window.__bzm.go('atlas'); }); await page.waitForSelector('.lboard');
  // a land test, taken for real: its stations marked passed, 20 answers, the bonus skipped → the next land opens
  const land = await page.evaluate(() => { const k = window.__bzm.R.h.kids[0], j = k.journey; j.recap = null;
    const L = { 4: 1 }; const lands = window.__bzm.J.landsOf(j.level); for (const s of lands[0].steps) j.done[`${s.stop}@${s.lv}`] = true; window.__bzm.render(); return lands[0].id; });
  await page.evaluate((id) => window.__bzm.fire('startLandTest', id), land);
  for (let i = 0; i < 20; i++) {
    const q = await page.evaluate(() => { const r = window.__bzm.R.run; const q = r.items[r.i]; return { ans: q.ans, choices: q.choices, fb: !!r.fb }; });
    if (q.fb) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); i--; continue; }
    if (q.choices) await page.keyboard.press(String(q.choices.indexOf(q.ans) + 1)); else await typeAns(String(q.ans).replace('−', '-'));
    await page.waitForTimeout(720);
  }
  ok(await page.locator('.bonus-bar').count() === 1, 'after 20 questions the optional bonus begins, marked ×2');
  await shot('02f-bonus');
  await page.click('[data-act=skipBonus]'); await page.waitForTimeout(300);
  ok(/20 of 20 right/.test(await page.locator('.end-card').innerText()), 'the land test scores the 20 core questions');
  ok(await page.evaluate((id) => { const j = window.__bzm.R.h.kids[0].journey; return Object.entries(j.tests || {}).some(([key, v]) => key.endsWith(id) && v.passed); }, land), 'the land test is recorded as passed');
  await shot('02g-landtest-end');
  await page.click('[data-act=endRun]'); await page.waitForSelector('.lboard');
  // the next station opens its stop as a journey step
  await page.evaluate(() => { const i = document.querySelector('.bpin.cur').dataset.arg; window.__bzm.fire('roadPick', i); window.__bzm.fire('roadPick', i); }); await page.waitForSelector('.stop-page');
  ok(await page.evaluate(() => !!window.__bzm.R.ui.jstep), 'the next station opens as a journey step');
  await page.evaluate(() => window.__bzm.fire('atlasView', 'islands')); await page.waitForSelector('.map-board');
  ok(await page.locator('.mp-road').count() >= 1, 'the island map says how many road stations each place holds');
  await page.evaluate(() => window.__bzm.fire('openWorld', 'market')); await page.waitForSelector('.board');
  ok(await page.locator('.bpin .lvb').count() >= 3, 'world boards carry a level badge on each stop');
  await shot('02e-badges');
  await page.evaluate(() => window.__bzm.go('atlas'));
  await page.waitForSelector('.map-board');
  await page.waitForTimeout(400);
  await shot('03-atlas');
  await page.evaluate(() => window.__bzm.fire('isle', '3')); await page.waitForTimeout(250);
  ok(await page.locator('.map-pin.shut').count() > 0, 'places first taught at later levels are not reached yet');
  await page.evaluate(() => window.__bzm.fire('isle', '1')); await page.waitForTimeout(250);
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
  await page.click('[data-act=sudokuPlay][data-arg="1"]'); await page.waitForSelector('.g-intro');
  ok(/Sudoku/.test(await page.locator('.g-card h2').innerText()), 'sudoku opens on its title card');
  await page.keyboard.press('Enter'); await page.waitForSelector('.sdk');
  await shot('24-sudoku');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('1');
  for (let i = 0; i < 90 && await page.locator('.sdk').count() && !(await page.locator('.play-end').count()); i++) { await page.keyboard.press('h'); await page.waitForTimeout(15); }
  await page.waitForSelector('.play-end', { timeout: 5000 });
  ok(/Logic/.test(await page.locator('.g-practised').innerText()), 'the sudoku finish names the skill practised');
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
  // the Library journeys wear the Atlas board: painting, dotted road, pins; tap to see, tap again to walk
  for (const [tool, n] of [['vedic', 13], ['chinese', 12]]) {
    await page.evaluate((t) => window.__bzm.fire('openTool', t), tool); await page.waitForSelector(`.t-${tool} .board`);
    ok(await page.locator(`.t-${tool} .board img[src*="art/j-${tool}"]`).count() === 1 && await page.locator(`.t-${tool} .bpin`).count() === n, `${tool}: a painted board with ${n} stones on the road`);
    ok(await page.locator(`.t-${tool} .bpin.shut`).count() === n - 1, `${tool}: only the first stone is open`);
    await page.locator(`.t-${tool} .board-scroll`).scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await shot(`31c-journey-${tool}`);
  }
  await page.click('.t-chinese .bpin >> nth=0'); await page.click('.t-chinese .bpin >> nth=0'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__bzm.R.ui.nav) === 'lib' && !(await page.locator('.t-chinese .board').count()), 'tapping the first stone twice walks onto it');
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
  // games: Family Standard §10 — a title card and a 3-second how-to, motion on
  // every answer, sound (the music loop), a finish screen naming what was
  // practised; keyboard AND touch.
  await nav('play'); await page.waitForSelector('.gtiles');
  await shot('16-arcade');
  ok(await page.evaluate(() => { const t = [...document.querySelectorAll('.gtile .gart')]; return t.length === 4 && t.every((e) => /g-(rush|target|line|cubes)\.webp/.test(e.style.backgroundImage)); }), 'every Arcade tile (four) is painted, not a CSS circle');
  const G = (fn) => page.evaluate(fn);
  const juice = () => G(() => +document.querySelector('.play').dataset.juice);
  const combo = () => G(() => +(document.querySelector('.gcombo').dataset.n || 0));
  const music = () => G(() => document.documentElement.dataset.music);
  const intro = async (name) => {
    await page.waitForSelector('.g-intro');
    ok((await page.locator('.g-card h2').innerText()).includes(name), `${name}: a title card`);
    ok(await page.locator('.g-how li').count() === 3 && /Practises/i.test(await page.locator('.g-card .kicker').innerText()), `${name}: a three-step how-to saying what it practises`);
  };
  // Number Rush — the how-to starts the game by itself after three seconds
  await page.click('[data-act=play][data-arg=rush]'); await intro('Number Rush');
  await page.waitForTimeout(1800); await shot('17a-rush-intro');
  await page.waitForSelector('.rush-stage', { timeout: 4500 });
  ok(await music() === 'on', 'Rush: the music loop plays');
  await page.waitForFunction(() => { const g = window.__bzmGames.active(); return g && g.probe.answers().length > 0; }, null, { timeout: 8000 });
  const ans = await G(() => window.__bzmGames.active().probe.answers()[0]);
  const j0 = await juice();
  for (const ch of ans) await page.keyboard.press(ch);
  ok(await page.locator('.rush-stage .gpop').count() >= 1, 'Rush: a right answer pops particles where the bubble was');
  ok(await combo() === 1 && await juice() > j0, 'Rush: a right answer moves the combo meter');
  await page.waitForTimeout(250); await shot('17-rush');
  // a wrong answer: digits whose every prefix pops nothing, then Enter
  const live = await G(() => window.__bzmGames.active().probe.answers());
  let wrong = 1000; while (live.some((a) => String(wrong).startsWith(a))) wrong++;
  for (const ch of String(wrong)) await page.keyboard.press(ch);
  await page.keyboard.press('Enter');
  ok(await combo() === 0 && await page.locator('.rush-in.gwob').count() === 1, 'Rush: a wrong answer wobbles the answer and resets the combo');
  await G(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok(await music() === 'off', 'the music stops when the page is hidden');
  await G(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  ok(await music() === 'on', 'and comes back with it');
  await G(() => window.__bzm.fire('sound'));
  ok(await music() === 'off', 'the music stops when the sound is switched off');
  await G(() => window.__bzm.fire('sound'));
  ok(await music() === 'on', 'and comes back with the sound');
  await page.keyboard.press('m');
  ok(await music() === 'off' && await page.locator('.play-m[aria-pressed=false]').count() === 1, 'M (or the ♪ button) turns the music off');
  await page.click('.play-m');
  ok(await music() === 'on', 'and a tap on ♪ turns it back on');
  await G(() => window.__bzmGames.active().probe.finish()); await page.waitForSelector('.play-end');
  ok(/at speed/.test(await page.locator('.g-practised').innerText()), 'Rush: the finish screen names the facts practised');
  ok(await page.locator('.g-facts.ok li').count() >= 1, 'Rush: and lists the facts popped');
  ok(await music() === 'off', 'the music stops on the finish screen');
  await page.waitForTimeout(400); await shot('17b-rush-end');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(!(await page.locator('.play').count()), 'Escape closes Number Rush');
  // Make the Target — skipped by a key, played through by keyboard
  await page.click('[data-act=play][data-arg=target]'); await intro('Make the Target');
  await page.keyboard.press('Enter'); await page.waitForSelector('.mt-card');
  const vals = () => page.$$eval('.mt-card b', (bs) => bs.map((b) => +b.textContent));
  let v = await vals();
  const lo = v.indexOf(Math.min(...v)), hi = v.indexOf(Math.max(...v));
  if (v[lo] < v[hi]) {
    const j1 = await juice();
    await page.keyboard.press(String(lo + 1)); await page.keyboard.press('-'); await page.keyboard.press(String(hi + 1));
    ok(await juice() > j1 && await page.locator('.mt-cards.gwob').count() === 1, 'Target: a move that goes below nought wobbles the cards');
  }
  await shot('18-target');
  // find a solution the game's own way (whole numbers, never below nought) and play it by keyboard
  const tgt = +(await page.locator('.mt-target b').innerText());
  const OPS = { '+': (a, b) => a + b, '-': (a, b) => (a >= b ? a - b : null), '*': (a, b) => a * b, '/': (a, b) => (b && a % b === 0 ? a / b : null) };
  const find = (xs) => {
    if (xs.length === 1) return xs[0] === tgt ? [] : null;
    for (let i = 0; i < xs.length; i++) for (let k = 0; k < xs.length; k++) {
      if (i === k) continue;
      for (const [o, fn] of Object.entries(OPS)) {
        const r = fn(xs[i], xs[k]); if (r == null) continue;
        const s = find([r, ...xs.filter((_, x) => x !== i && x !== k)]);
        if (s) return [[xs[i], o, xs[k]], ...s];
      }
    }
    return null;
  };
  const plan = find(await vals());
  ok(!!plan, 'Target: the puzzle has a solution the test can find');
  for (const [a, o, b] of plan || []) {
    v = await vals();
    const sel = await page.$$eval('.mt-card', (cs) => cs.findIndex((c) => c.classList.contains('on')));
    const ia = sel >= 0 && v[sel] === a ? sel : v.indexOf(a);
    if (sel >= 0 && sel !== ia) await page.keyboard.press(String(sel + 1));   // drop a stale pick
    if (sel !== ia) await page.keyboard.press(String(ia + 1));
    const ib = v.findIndex((x, i) => x === b && i !== ia);
    await page.keyboard.press(o); await page.keyboard.press(String(ib + 1));
  }
  ok(await page.locator('.mt-target.won').count() === 1, `Target: playing the sum by keyboard makes ${tgt}`);
  ok(await page.locator('.mt .gpop').count() >= 1 && await combo() === 1, 'Target: a solved puzzle pops at the target and moves the combo');
  await page.waitForTimeout(250); await shot('18b-target-won');
  await page.waitForTimeout(1200);
  await page.keyboard.press('s'); await page.waitForTimeout(200);
  ok(/=/.test(await page.locator('.mt-msg').innerText()), 'Show me reveals a solution');
  ok(await combo() === 0, 'Target: Show me resets the combo');
  await G(() => window.__bzmGames.active().probe.finish()); await page.waitForSelector('.play-end');
  const tp = await page.locator('.g-practised').innerText();
  ok(/Joining numbers/.test(tp) && tp.includes(`= ${tgt}`), 'Target: the finish screen names the skill and the sums made');
  await page.keyboard.press('Escape');
  // Number Line — skipped by a TAP on the card, placed by keyboard
  await page.click('[data-act=play][data-arg=line]'); await intro('Number Line');
  await page.click('.g-how'); await page.waitForSelector('.nl-track');
  for (let r = 0; r < 8; r++) {
    const t = +(await page.locator('.nl-q b').innerText());
    const j2 = await juice();
    if (r === 0) for (let i = 0; i < Math.abs(t - 50); i++) await page.keyboard.press(t > 50 ? 'ArrowRight' : 'ArrowLeft');
    if (r === 1) for (let i = 0; i < 6; i++) await page.keyboard.press(t > 50 ? 'Shift+ArrowLeft' : 'Shift+ArrowRight');
    await page.keyboard.press('Enter'); await page.waitForTimeout(60);
    ok(await juice() > j2, `Number Line: round ${r + 1} moves something`);
    if (r === 0) {
      ok(await page.locator('.nl-true').count() === 1, 'Number Line places by keyboard');
      ok(await page.locator('.nl-track .gpop').count() >= 1 && await combo() === 1, 'Number Line: bang on pops at the number and moves the combo');
      await page.waitForTimeout(200); await shot('19-line');
    }
    if (r === 1) ok(await page.locator('.nl-mark.gwob').count() === 1 && await combo() === 0, 'Number Line: a far miss wobbles the marker and resets the combo');
    await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  }
  await page.waitForSelector('.play-end');
  ok(/Estimating/.test(await page.locator('.g-practised').innerText()) && await page.locator('.g-facts li').count() === 8, 'Number Line: the finish names the skill and all eight numbers placed');
  await page.waitForTimeout(400); await shot('19b-line-end');
  await page.click('.play-end [data-g=done]'); await page.waitForTimeout(100);
  ok(!(await page.locator('.play').count()) && await music() === 'off', 'a tap on Back leaves the game and the music stops');
  // Change avatar in the Collection (avatar ▾ → My page — avatar, badges, collection → the collection)
  await page.click('[data-bz=kid]'); await page.click('.kid-menu [data-arg=me]'); await page.click('[data-act=nav][data-arg=collection]'); await page.waitForSelector('.avgrid');
  ok(await page.locator('.pack').count() === 12 && await page.locator('.bz-av').count() === 96, 'all ninety-six faces, twelve packs of eight, in the Collection');
  await page.click('.bz-av[data-id=protortle] [data-act=setAv]');
  ok(await page.evaluate(() => window.__bzm.R.h.kids[0].avatar) === 'protortle', 'Wear sets the child\'s face');
  await page.waitForTimeout(400); await shot('19b-change-avatar');
  await page.click('.bz-av[data-id=pyrafox]').catch(() => {});
  ok(await page.locator('.bz-av[data-id=pyrafox] [data-act=setAv]').count() === 0, 'a face not yet earned has no Wear button');
  // home + grown-ups
  await nav('home'); await page.waitForSelector('.home2');
  await shot('20-home');
  await page.click('[data-bz=lock]');
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
const THEME_DISPLAY = { graph: 'Baloo 2', chalk: 'Kalam', blueprint: 'Space Grotesk', orbit: 'Orbitron', rangoli: 'Yatra One', arcade: 'Pixelify Sans' };
async function themes(page, vp, tag, shot) {
  const dark = vp.width < 760;
  await page.evaluate((d) => document.documentElement.setAttribute('data-mode', d ? 'dark' : 'light'), dark);
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'graph', 'a child who never chose gets Patchwork Hills (graph)');
  await page.evaluate(() => { window.__bzm.R.h.parent.plan = 'family'; });   // the plan opens worlds 3–6
  const faces = new Set();
  for (const [id, face] of Object.entries(THEME_DISPLAY)) {
    await page.evaluate((t) => { const r = window.__bzm.R; r.h.kids.find((k) => k.id === r.h.active).prefs.theme = t; window.__bzm.go('home'); }, id);
    await page.waitForSelector('.home2'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350);
    ok(await page.evaluate(() => document.documentElement.dataset.theme) === id, `world ${id} is on <html>`);
    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    ok(ff.replace(/["']/g, '').startsWith('Hanken Grotesk'), `world ${id}: the body is the family's Hanken Grotesk (got ${ff})`);
    const hf = await page.evaluate(() => getComputedStyle(document.querySelector('[data-bz=hour] h3')).fontFamily);
    ok(hf.replace(/["']/g, '').startsWith(face), `world ${id}: its display face is ${face} (got ${hf})`);
    ok(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), face), `world ${id}: ${face} actually loaded`);
    faces.add(hf);
    ok(await page.evaluate(() => { const m = document.querySelector('.motif'); return !!m && m.textContent === '' && getComputedStyle(m).position === 'fixed' && getComputedStyle(m).pointerEvents === 'none'; }), `world ${id}: the motif is a fixed, silent, untouchable layer`);
    await shot(`40-theme-${id}-home`);
    await page.evaluate(() => window.__bzm.go('atlas')); await page.waitForSelector('.board-scroll, .map-board'); await page.waitForTimeout(350);
    await shot(`40-theme-${id}-atlas`);
  }
  ok(faces.size === 6, 'six worlds, six display faces');
  // switching child switches world
  const first = await page.evaluate(() => window.__bzm.R.h.active);
  await page.evaluate(() => { const h = window.__bzm.R.h; const c = JSON.parse(JSON.stringify(h.kids.find((k) => k.id === h.active))); c.id = 'theme-twin'; c.name = 'Twin'; c.prefs.theme = 'rangoli'; h.kids.push(c); });
  await page.evaluate(() => window.__bzm.fire('switchKid', 'theme-twin')); await page.waitForSelector('.home2');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'rangoli', 'switching child puts on that child\'s world');
  await page.evaluate((id) => window.__bzm.fire('switchKid', id), first); await page.waitForSelector('.home2');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'arcade', 'switching back restores the first child\'s world');
  await page.evaluate(() => { const h = window.__bzm.R.h; h.kids = h.kids.filter((k) => k.id !== 'theme-twin'); });
  // the picker: Settings → Look, keyboard and tap
  await page.evaluate(() => window.__bzm.fire('themes')); await page.waitForSelector('.theme-card');
  ok(await page.locator('.theme-card').count() === 6, 'the picker shows six worlds');
  await page.focus('.theme-card[aria-checked=true]');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'theme-arcade', 'the picker focuses the chosen world');
  await page.keyboard.press('ArrowRight');   // wraps round to the first
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'graph', 'an arrow key chooses the next world, instantly');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  ok(await page.evaluate(() => document.documentElement.dataset.theme) === 'rangoli', 'arrows go both ways (graph ← arcade ← rangoli)');
  await page.click('.theme-card[data-arg=chalk]');
  ok(await page.evaluate(() => window.__bzm.R.h.kids.find((k) => k.id === window.__bzm.R.h.active).prefs.theme) === 'chalk', 'a tap chooses a world, saved on the child');
  await page.waitForTimeout(400); await shot('41-theme-picker');
  await page.click('.theme-card[data-arg=graph]');
}
try {
  await run({ width: 1280, height: 860 }, 'desk');
  await run({ width: 390, height: 844 }, 'phone');
} finally { await browser.close(); srv.kill(); }
for (const e of errors) { fails++; console.error('  ✗ ' + e); }
console.log(`${fails ? 'FAIL' : 'ok'} ui — desktop and phone walked end to end`);
process.exit(fails ? 1 : 0);
