/* test/themes.mjs — the six themes, held to what a child needs to read.

   Parses styles/themes.css (no browser) and, for every theme × mode:
   · every colour token tokens.css defines is set, in both modes, plus the
     three faces (a theme that forgets --line-soft silently borrows another
     theme's, and nobody notices until dark mode);
   · WCAG 2 contrast: ink on tint/paper/surface/surface2 and action-ink on
     action ≥ 4.5:1; muted on paper/surface/tint and action (as link text) on
     surface ≥ 3:1;
   · the UI face in the CSS is the one themes.js advertises on the picker, and
     every face has a self-hosted @font-face with font-display: swap and a
     file that exists;
   · the motif loops in at most 60s and stops under prefers-reduced-motion;
   · a child with no theme (every child made before themes) gets Graph Paper.
   Prints the contrast table; exits non-zero on any failure. */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, themeOf, DEFAULT_THEME } from '../src/themes.js';

const HERE = resolve(import.meta.dirname, '..');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(readFileSync(resolve(HERE, 'styles/themes.css'), 'utf8'));
const tokens = strip(readFileSync(resolve(HERE, 'styles/tokens.css'), 'utf8'));
const fonts = strip(readFileSync(resolve(HERE, 'styles/fonts.css'), 'utf8'));

let fails = 0;
const fail = (m) => { fails++; console.error('  ✗ ' + m); };

/* ---- the colour tokens every theme must set: the light :root block of tokens.css that holds --ink */
const rootBlocks = [...tokens.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]);
const lightRoot = rootBlocks.find((b) => /--ink:/.test(b));
const NEED = [...lightRoot.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\()/g)].map((m) => m[1]);
if (NEED.length < 12) fail(`expected tokens.css to define the colour tokens, found ${NEED.length}`);

const decls = (body) => Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));

function themeVars(id) {
  const mine = blocks.filter((b) => b.sel.includes(`[data-theme="${id}"]`) && /--ink:/.test(b.body));
  const light = mine.find((b) => !b.sel.includes('data-mode'));
  const dark = mine.find((b) => b.sel.includes('[data-mode="dark"]'));
  if (!light || !dark) { fail(`${id}: needs a light and a dark token block`); return null; }
  const L = decls(light.body), D = decls(dark.body);
  return { light: L, dark: { ...L, ...D }, darkOwn: D };
}

/* ---- WCAG 2.x */
function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
const lum = (c) => { const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function ratio(a, b) { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); }

const PAIRS = [
  ['--ink', '--tint', 4.5], ['--ink', '--paper', 4.5], ['--ink', '--surface', 4.5], ['--ink', '--surface2', 4.5],
  ['--action-ink', '--action', 4.5],
  ['--muted', '--paper', 3.0], ['--muted', '--surface', 3.0], ['--muted', '--tint', 3.0],
  ['--action', '--surface', 3.0],
];

const table = [];
const COLOUR = NEED.filter((n) => n !== '--dot'); // --dot is an rgba wash, not a readable colour
for (const t of THEMES) {
  const v = themeVars(t.id); if (!v) continue;
  for (const f of ['--display', '--ui', '--mono']) if (!v.light[f]) fail(`${t.id}: sets no ${f}`);
  for (const n of NEED) {
    if (!v.light[n]) fail(`${t.id} light: does not set ${n}`);
    if (COLOUR.includes(n) && !v.darkOwn[n]) fail(`${t.id} dark: does not set ${n} (it would show the light value in dark mode)`);
  }
  for (const [mode, vars] of [['light', v.light], ['dark', v.dark]]) {
    const row = { theme: t.id, mode };
    for (const [fg, bg, min] of PAIRS) {
      const a = rgb(vars[fg] || ''), b = rgb(vars[bg] || '');
      if (!a || !b) { fail(`${t.id} ${mode}: ${fg} / ${bg} must be #hex to be checked (got ${vars[fg]} / ${vars[bg]})`); continue; }
      const r = ratio(a, b);
      row[`${fg.slice(2)}/${bg.slice(2)}`] = r.toFixed(2);
      if (r < min) fail(`${t.id} ${mode}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
    }
    table.push(row);
  }
  // the face the picker names is the face the page uses
  const first = (s) => (s || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  if (first(v.light['--ui']) !== t.ui) fail(`${t.id}: --ui is ${first(v.light['--ui'])}, the picker says ${t.ui}`);
  if (first(v.light['--display']) !== t.display) fail(`${t.id}: --display is ${first(v.light['--display'])}, the picker says ${t.display}`);
  if (first(v.light['--mono']) !== t.mono) fail(`${t.id}: --mono is ${first(v.light['--mono'])}, the picker says ${t.mono}`);
  for (const face of [t.display, t.ui, t.mono]) {
    const faces = [...fonts.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]).filter((b) => new RegExp(`font-family:\\s*'${face}'`).test(b));
    if (!faces.length) fail(`${t.id}: no self-hosted @font-face for ${face}`);
    for (const b of faces) {
      if (!/font-display:\s*swap/.test(b)) fail(`${face}: @font-face without font-display: swap`);
      const u = /url\(([^)]+)\)/.exec(b); if (!u || !existsSync(resolve(HERE, 'styles', u[1]))) fail(`${face}: file ${u && u[1]} is missing`);
    }
  }
  // the motif exists for this theme
  if (!new RegExp(`:root\\[data-theme="${t.id}"\\] \\.motif`).test(css)) fail(`${t.id}: has no motif`);
}
if (THEMES.length !== 6) fail(`there are ${THEMES.length} themes; the owner asked for six`);
if (new Set(THEMES.map((t) => t.ui)).size !== THEMES.length) fail('two themes share a UI face — each should read differently');

/* ---- the Claude-ish serif is not the default any more, and nothing loads from Google */
if (/Fraunces/.test(tokens)) fail('tokens.css still defaults to Fraunces');
for (const f of ['styles/fonts.css', 'styles/themes.css', 'styles/tokens.css', 'styles/app.css', 'index.html'])
  if (/fonts\.(googleapis|gstatic)\.com/.test(strip(readFileSync(resolve(HERE, f), 'utf8')).replace(/<!--[\s\S]*?-->/g, ''))) fail(`${f} loads from Google at runtime`);
for (const b of [...fonts.matchAll(/@font-face\s*\{([^}]*)\}/g)]) if (!/font-display:\s*swap/.test(b[1])) fail('an @font-face without font-display: swap');

/* ---- font weight: the whole shelf, all six themes */
const dir = resolve(HERE, 'styles/fonts');
const bytes = readdirSync(dir).filter((f) => f.endsWith('.woff2')).reduce((a, f) => a + statSync(resolve(dir, f)).size, 0);
if (bytes > 950_000) fail(`fonts are ${Math.round(bytes / 1024)} KB; the budget is ~900 KB`);

/* ---- motion: ≤ 60s loops, no drawn text, and a still picture for reduced motion */
for (const m of css.matchAll(/(?:animation(?:-duration)?|--t)\s*:[^;]*?(\d+(?:\.\d+)?)s\b/g)) if (+m[1] > 60) fail(`a motif loop of ${m[1]}s is longer than 60s`);
if (/<text\b/.test(css)) fail('a motif draws text; motifs are shapes only');
if (!/prefers-reduced-motion:\s*reduce[\s\S]*\.motif[^{]*\{[^}]*animation:\s*none/.test(css)) fail('the motif does not stop under prefers-reduced-motion');

/* ---- whose theme */
if (themeOf({ prefs: {} }) !== 'graph' || DEFAULT_THEME !== 'graph') fail('a child without a theme must get Graph Paper');
if (themeOf({ prefs: { op: '×', timer: true, read: false } }) !== 'graph') fail('an old child (prefs from before themes) must get Graph Paper');
if (themeOf({ prefs: { theme: 'nonsense' } }) !== 'graph') fail('an unknown theme must fall back to Graph Paper');
if (themeOf(null) !== 'graph') fail('no child must mean Graph Paper');
if (themeOf({ prefs: { theme: 'orbit' } }) !== 'orbit') fail('a chosen theme must stick');

console.table(table);
console.log(`themes: ${THEMES.length} themes × 2 modes, ${table.length * PAIRS.length} contrast pairs, fonts ${Math.round(bytes / 1024)} KB — ${fails ? fails + ' FAILED' : 'all pass'}`);
process.exit(fails ? 1 : 0);
