/* test/lib/site.mjs — one way for the browser checks to serve the BUILT app at its
   GitHub Pages sub-path and drive it in Chromium. Each check passes its own port from
   this agent's range (5200–5219) so parallel checks never collide. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
export const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
export const HERE = resolve(import.meta.dirname, '..', '..');
export const SHOTS = process.env.SHOTS || resolve(HERE, '.shots');

export async function site(name, port) {
  const SITE = resolve(HERE, '.site-' + name);
  rmSync(SITE, { recursive: true, force: true }); mkdirSync(SITE, { recursive: true }); mkdirSync(SHOTS, { recursive: true });
  symlinkSync(resolve(HERE, 'build'), resolve(SITE, 'Bizzing-Maths'));
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
  await served(port);
  const browser = throttled(await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined }));
  return { BASE: `http://127.0.0.1:${port}/Bizzing-Maths/`, browser, close: async () => { await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true }); } };
}

/* a child written the way the app writes it (schema 6 — the app migrates it forward) */
export function kidRec(id, name, band, avatar, extra = {}) {
  return { id, name, band, avatar, xp: 0, facts: {}, tricks: {}, checks: {}, games: {}, contest: { best: null, runs: 0, wins: 0 }, stories: {}, puzzles: {}, quest: {}, lib: {},
    journey: { level: 1, done: {}, finished: [], tested: null }, medals: {}, shop: { owned: [], worn: {} }, placed: null, daily: {}, days: {}, created: Date.now(), prefs: { op: '×', timer: false, read: false }, ...extra };
}
export const household = (kids, parent = {}) => ({ v: 6, kids, active: kids[0].id, parent: { pin: '1234', tester: false, ...parent } });

/* Wait for the app, never the clock. `until` is true once `fn` holds in the page (false if it never
   does, so the assertion after it reports the failure). `ready` waits until the screen asked for is
   actually drawn: no "Opening…" placeholder (the stops' code, a Library tool, the Contest Hall still
   arriving), the tool on screen, fonts loaded and transitions finished. */
export const until = async (p, fn, arg, timeout = 30000) => { try { await p.waitForFunction(fn, arg, { timeout, polling: 25 }); return true; } catch { return false; } };
export async function ready(p) {
  await until(p, () => !!window.__bzm && ![...document.querySelectorAll('main .center-card .muted, .engine-wait')].some((e) => /^Opening/.test(e.textContent.trim()))
    && (window.__bzm.R.ui.nav !== 'lib' || !!document.querySelector('.t-' + window.__bzm.R.ui.arg)));
  await p.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await until(p, () => document.getAnimations().every((a) => a.playState !== 'running' || (a.effect && a.effect.getTiming().iterations === Infinity)), null, 5000);
}

export function checker() {
  let fails = 0;
  const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
  return { ok, fails: () => fails };
}

/* THROTTLE=4 slows every page's CPU by that factor (CDP Emulation.setCPUThrottlingRate),
   to prove a check waits on the app's state rather than on the clock. Off by default. */
export function throttled(browser, rate = +(process.env.THROTTLE || 0)) {
  if (!(rate > 1)) return browser;
  const slow = async (p) => { const s = await p.context().newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate }); return p; };
  const newPage = browser.newPage.bind(browser), newContext = browser.newContext.bind(browser);
  browser.newPage = async (o) => slow(await newPage(o));
  browser.newContext = async (o) => { const c = await newContext(o); const np = c.newPage.bind(c); c.newPage = async () => slow(await np()); return c; };
  return browser;
}

/* serve a directory and resolve once the port answers — never a fixed sleep */
export async function served(port, tries = 600, host = '127.0.0.1') {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`http://${host}:${port}/`); if (r.status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`the test server on ${port} never answered`);
}
