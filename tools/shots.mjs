/* tools/shots.mjs — the landing page's screenshots, captured from the BUILT app.

     cd app && npm run build && node ../tools/shots.mjs            every shot
     node ../tools/shots.mjs --only home,atlas                       just those

   Every picture on the landing is a real screen of this app, driven here through the
   sample child at ?demo (demo.js — made by driving the engine, held in memory, nothing
   saved). Nothing is mocked up and nothing is painted over: the only change is that the
   "Sample" banner is hidden, because the landing's caption already says whose screen it is.
   Change the app and run this again; test/family-ui.mjs checks every file the landing
   names exists.

   Output: app/public/art/shots/<id>.jpg — 1200 px wide, JPEG, quality stepped down until
   the file is ≤ 150 KB (the landing lazy-loads them, so none counts toward first paint). */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');

const APP = resolve(import.meta.dirname, '../app');
const OUT = resolve(APP, 'public/art/shots');
const SITE = resolve(APP, '.site-shots');
if (!existsSync(resolve(APP, 'build/index.html'))) { console.error('build the app first: cd app && npm run build'); process.exit(1); }
rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(OUT, { recursive: true });
symlinkSync(resolve(APP, 'build'), resolve(SITE, 'Bizzing-Maths'));
const port = +(process.env.PORT_BASE || 5200) + 9;
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const BASE = `http://127.0.0.1:${port}/Bizzing-Maths/`;
const W = 1200, H = 834, MAX = 150 * 1024;

const fire = (p, act, arg) => p.evaluate(([a, g]) => window.__bzm.fire(a, g), [act, arg]);
const go = (p, hash) => p.evaluate((h) => { location.hash = h; }, hash);

/* id → how to reach it. Each step uses the app's own actions (window.__bzm.fire), the
   same ones a tap dispatches. `wait` is a selector that proves the screen is there. */
const SHOTS = [
  ['home', async (p) => {}, '.home2'],
  ['atlas', async (p) => { await fire(p, 'atlasView', 'islands'); }, '.map-board'],
  ['world', async (p) => { await fire(p, 'openWorld', 'market'); }, '.board'],
  ['learn', async (p) => { await fire(p, 'openStop', 'square-five'); await fire(p, 'stopTab', 'learn'); await fire(p, 'watchAll'); }, '.stop-page'],
  ['turn', async (p) => { await fire(p, 'openStop', 'square-five'); await fire(p, 'startGuided', 'square-five'); }, '.stop-page'],
  ['drill', async (p) => { await fire(p, 'openStop', 'square-five'); await fire(p, 'startDrill', 'square-five'); await p.waitForTimeout(300); await p.keyboard.press('2'); }, '.stop-page, main'],
  ['library', async (p) => { await fire(p, 'openTool', 'tables'); }, '.t-tables'],
  ['tower', async (p) => { await go(p, '#/puzzles'); }, 'main'],
  ['game', async (p) => { await fire(p, 'play', 'target'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(900); }, 'main'],
  ['hall', async (p) => { await go(p, '#/hall'); }, '.hall'],
  ['paper', async (p) => { await go(p, '#/hall'); await p.waitForSelector('.hall'); await fire(p, 'pband', 'g34'); await fire(p, 'paperStart', 'g34|2'); }, '.pq-choices'],
  ['ladder', async (p) => { await fire(p, 'openWorld', 'ladder'); }, '.board'],
  ['feed', async (p) => { await go(p, '#/feed'); }, 'main'],
  ['collection', async (p) => { await go(p, '#/collection'); }, 'main'],
];

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
if (!only) console.log(`shots: capturing ALL ${SHOTS.length} screens into ${OUT}`);
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
let fails = 0;
for (const [id, reach, wait] of SHOTS) {
  if (only && !only.includes(id)) continue;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  try {
    await p.goto(BASE + '?demo'); await p.waitForSelector('.home2');
    await p.addStyleTag({ content: '.demo-bar{display:none!important}' });
    await reach(p);
    await p.waitForSelector(wait, { timeout: 8000 });
    await p.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {}); await p.waitForTimeout(700);
    // every picture on the screen has arrived (lazy ones below the window never will, so only those in it)
    await p.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 4000)), Promise.all([...document.images]
      .filter((i) => !i.complete && i.getBoundingClientRect().top < innerHeight).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))]));
    let q = 82, buf;
    do { buf = await p.screenshot({ type: 'jpeg', quality: q }); q -= 6; } while (buf.length > MAX && q > 30);
    writeFileSync(resolve(OUT, id + '.jpg'), buf);
    console.log(`  ${id}.jpg  ${Math.round(buf.length / 1024)} KB  (q${q + 6})${errs.length ? '  page errors: ' + errs.join(' | ') : ''}`);
    if (errs.length) fails++;
  } catch (e) { fails++; console.error(`  ✗ ${id}: ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true });
if (fails) process.exit(1);
