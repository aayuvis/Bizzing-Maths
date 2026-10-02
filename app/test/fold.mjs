/* test/fold.mjs — the core of every screen is above the fold.

   A child should open a screen and see the thing itself — the map, the board,
   the question, the tool — not a title, a subtitle and a summary card about it.
   For each screen this names its CORE element and measures, at a laptop window
   and a phone, how far down it starts and how much of it shows before any
   scrolling. Measured from the live DOM of the built app; a failure is an exit
   code. Run after `npm run build`. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const HERE = resolve(import.meta.dirname, '..'), SITE = resolve(HERE, '.site-fold');
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true });
symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = 5203;
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');

// [name, how to get there, core selector]
const SCREENS = [
  // Home IS Bizzing Bee's home (integration/bizzing-shell.js, measured by shell-check.mjs): the owner asked
  // for Bee's exact three rows (2 Oct 2026), so Home's rule is CLAUDE.md 17's on a phone — Continue wholly
  // above the fold at 390×844 — and on the 1000×560 laptop Bee's own geometry is the rule, not this file's
  ['home', (b) => b.go('home'), '[data-bz=next]', '[data-bz=continue]', { start: 0.62, laptop: 'bee' }],
  ['atlas road', (b) => b.go('atlas'), '.board-scroll', '.lboard .bpin.cur'],
  ['atlas islands', (b) => b.fire('atlasView', 'islands'), '.map-board'],
  ['world board', (b) => b.fire('openWorld', 'market'), '.board-scroll'],
  ['stop · learn', (b) => { b.fire('openStop', 'kinds-of-triangle'); b.fire('stopTab', 'learn'); }, '.learn .hook', '.learn .hook svg'],
  ['stop · drill', (b) => b.fire('stopTab', 'drill'), '.stop-page .center-card'],
  ['a drill question', (b) => b.fire('startDrill', 'kinds-of-triangle'), '.qcard'],
  ['library', (b) => { b.R.run = null; b.go('library'); }, '.lib-grid'],
  ['tool · explorer', (b) => b.fire('openTool', 'explorer'), '#t-explorer-n'],
  ['tool · working', (b) => b.fire('openTool', 'working'), '#t-working-q'],
  ['tool · tables', (b) => b.fire('openTool', 'tables'), '.t-tables .board-scroll', '.t-tables .bpin.cur'],
  ['tool · shapes', (b) => b.fire('openTool', 'shapes'), '.t-shapes svg'],
  ['tool · graphs', (b) => b.fire('openTool', 'graphs'), '.t-graphs svg'],
  ['tool · dictionary', (b) => b.fire('openTool', 'dictionary'), '#t-dictionary-q'],
  ['tool · formulas', (b) => b.fire('openTool', 'formulas'), '.t-formulas button[data-arg^="open|"], .t-formulas [data-arg^="card|"]'],
  ['tool · vedic', (b) => b.fire('openTool', 'vedic'), '.t-vedic .board-scroll', '.t-vedic .bpin.cur'],
  ['tool · chinese', (b) => b.fire('openTool', 'chinese'), '.t-chinese .board-scroll', '.t-chinese .bpin.cur'],
  ['puzzles', (b) => b.go('puzzles'), '.tower-board'],
  ['play', (b) => b.go('play'), '.hero-tiles'],
  ['goals', (b) => b.go('goals'), '.strands'],
  ['story shelf', (b) => b.go('stories'), '.shelf'],
  // the games: the title card, then the play itself (the how-to skipped by its own button)
  ['game · title card', (b) => b.fire('play', 'rush'), '.g-card', '.g-card [data-g=go]'],
  ['game · rush', () => document.querySelector('.g-intro [data-g=go]').click(), '.rush-stage', '.rush-in'],
  ['game · target', (b) => { document.querySelector('.play-x').click(); b.fire('play', 'target'); document.querySelector('.g-intro [data-g=go]').click(); }, '.mt-target', '.mt-ops'],
  ['game · line', (b) => { document.querySelector('.play-x').click(); b.fire('play', 'line'); document.querySelector('.g-intro [data-g=go]').click(); }, '.nl-track', '.nl-track'],
];
// the core must START in the top 35% of what the window shows under the top bar,
// and at least 45% of the window (or the whole core, if smaller) must be core
const START = 0.35, SHOW = 0.45;
let fails = 0; const rows = [];
const browser = await chromium.launch();
for (const [vp, tag] of [[{ width: 1000, height: 560 }, 'laptop'], [{ width: 390, height: 844 }, 'phone']]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`http://127.0.0.1:${port}/Bizzing-Maths/`);
  await page.click('[data-act=obStart]'); await page.waitForSelector('#kname');
  await page.fill('#kname', 'Fold'); await page.press('#kname', 'Enter'); await page.click('[data-act=draftBand][data-arg="8-10"]');
  await page.click('[data-act=draftAv][data-arg="hexbee"]'); await page.click('[data-act=obTheme][data-arg="graph"]');
  await page.waitForSelector('[data-act=startLevel1]'); await page.click('[data-act=startLevel1]');
  await page.evaluate(() => { window.__bzm.R.h.parent.tester = true; });
  for (const [name, go, sel, see, rule = {}] of SCREENS) {
    await page.evaluate(`(${go.toString()})(window.__bzm)`); await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate((sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      // the chrome is the top bar AND, on a wide window, the family's tab row directly under it (standard v2 §4)
      // the chrome is Bee's sticky header — the family bar AND its tab row (standard v2 §3–§4)
      const top = document.querySelector('[data-bz=header]'); const bar = top ? top.getBoundingClientRect().bottom : 0;
      const nav = document.querySelector('[data-bz=tabbar]'); const bottom = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight;
      const r = el.getBoundingClientRect(), view = bottom - bar;
      return { start: (r.top - bar) / view, shown: Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, bar)) / Math.min(view, r.height), view };
    }, sel);
    // and anything named in `see` must be wholly in view, and the page must not scroll sideways
    const vis = see ? await page.evaluate((see) => { const el = document.querySelector(see); if (!el) return false; const r = el.getBoundingClientRect(), nav = document.querySelector('[data-bz=tabbar]'); const bottom = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight; return r.top >= 0 && r.bottom <= bottom && r.left >= 0 && r.right <= innerWidth; }, see) : true;
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const ok = (tag === 'laptop' && rule.laptop === 'bee' && !wide) || (m && m.start <= (rule.start || START) && m.shown >= SHOW && vis && !wide);
    if (!ok) fails++;
    rows.push(`${ok ? 'ok' : '✗ '} ${tag.padEnd(7)} ${name.padEnd(18)} ${m ? `starts ${Math.round(m.start * 100)}% down, ${Math.round(m.shown * 100)}% of it visible${see && !vis ? ` · ${see} not fully in view` : ''}${wide ? ' · the page scrolls sideways' : ''}` : 'core element not found: ' + sel}`);
    if (!ok) await page.screenshot({ path: `${SHOTS}/fold-${tag}-${name.replace(/[^a-z]+/g, '-')}.png` });
  }
  await page.close();
}
await browser.close(); srv.kill();
console.log(rows.join('\n'));
console.log(`${fails ? 'FAIL' : 'ok'} fold — ${SCREENS.length} screens × 2 windows, the core content above the fold`);
if (fails) process.exit(1);
