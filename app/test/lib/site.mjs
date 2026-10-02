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
  await new Promise((r) => setTimeout(r, 700));
  const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined });
  return { BASE: `http://127.0.0.1:${port}/Bizzing-Maths/`, browser, close: async () => { await browser.close(); srv.kill(); rmSync(SITE, { recursive: true, force: true }); } };
}

/* a child written the way the app writes it (schema 6 — the app migrates it forward) */
export function kidRec(id, name, band, avatar, extra = {}) {
  return { id, name, band, avatar, xp: 0, facts: {}, tricks: {}, checks: {}, games: {}, contest: { best: null, runs: 0, wins: 0 }, stories: {}, puzzles: {}, quest: {}, lib: {},
    journey: { level: 1, done: {}, finished: [], tested: null }, medals: {}, shop: { owned: [], worn: {} }, placed: null, daily: {}, days: {}, created: Date.now(), prefs: { op: '×', timer: false, read: false }, ...extra };
}
export const household = (kids, parent = {}) => ({ v: 6, kids, active: kids[0].id, parent: { pin: '1234', tester: false, ...parent } });

export function checker() {
  let fails = 0;
  const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
  return { ok, fails: () => fails };
}
