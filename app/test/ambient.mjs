/* test/ambient.mjs — every place is alive, and the life obeys the device (audit v4 D10, N10).

   Parses styles/app.css (no browser; test/atlas-ui.mjs checks the same in Chromium):
   · every world in tricks.js has its own .amb-<id> rule with an animation whose
     @keyframes exist, and not every one of its motes is hidden;
   · the world board draws that layer (views2.js ambLayer, class "amb amb-<id>");
   · the ambient layers pause when the page is hidden (data-hidden on <html>) and
     their animation is `none` under BOTH prefers-reduced-motion and Settings' own
     reduced-motion switch (data-motion="reduced") — rule 22;
   · the route transition is ≤ 200 ms, starts visible (opacity ≥ .5, so the core is
     painted on the first frame) and is `none` under both kinds of reduced motion.
   Exits non-zero on any failure. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WORLDS } from '../src/tricks.js';

const HERE = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(HERE, 'styles/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const views2 = readFileSync(resolve(HERE, 'src/views2.js'), 'utf8');
let fails = 0;
const fail = (m) => { fails++; console.error('  ✗ ' + m); };

// flat rules (selector → body), and the ones inside each @media block, kept apart
const media = [];
const flat = css.replace(/@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g, (_, q, body) => { media.push({ q: q.trim(), body }); return ''; });
const rules = (txt) => [...txt.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const R = rules(flat.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, ''));
const KEYFRAMES = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
const selHas = (sel, re) => sel.split(',').some((s) => re.test(s.trim()));

for (const w of WORLDS) {
  const mine = R.filter((r) => selHas(r.sel, new RegExp(`^\\.amb-${w.id} i$`)));
  const anim = mine.map((r) => (r.body.match(/(?:^|;)\s*animation\s*:\s*([^;]+)/) || [])[1]).find(Boolean);
  if (!anim) { fail(`${w.id}: no ".amb-${w.id} i" rule with an animation — the place has no ambient life`); continue; }
  const name = anim.trim().split(/\s+/)[0];
  if (!KEYFRAMES.has(name)) fail(`${w.id}: animation "${name}" has no @keyframes`);
  if (R.some((r) => selHas(r.sel, new RegExp(`^\\.amb-${w.id} i(:nth-child\\(n\\+1\\))?$`)) && /display\s*:\s*none/.test(r.body))) fail(`${w.id}: every mote is hidden`);
}
if (!/class="amb amb-\$\{id\}"/.test(views2) || !/\$\{ambLayer\(w\.id\)\}/.test(views2)) fail('the world board does not draw ambLayer(w.id) as "amb amb-<id>"');

// hidden → paused
if (!R.some((r) => /:root\[data-hidden\]/.test(r.sel) && /\.amb/.test(r.sel) && /animation-play-state\s*:\s*paused/.test(r.body))) fail('the ambient layers do not pause when the page is hidden');
// reduced → none, both ways
const noneIn = (list, selRe) => list.some((r) => selRe.test(r.sel) && /animation\s*:\s*none/.test(r.body));
const reducedMedia = media.filter((m) => /prefers-reduced-motion\s*:\s*reduce/.test(m.q)).flatMap((m) => rules(m.body));
if (!noneIn(reducedMedia, /\.amb\b[^,]*\bi\b|:is\([^)]*\.amb[^)]*\)\s+i/)) fail('prefers-reduced-motion does not set animation: none on the ambient motes');
if (!noneIn(R.filter((r) => /data-motion="reduced"/.test(r.sel)), /\.amb/)) fail('Settings\' reduced motion (data-motion) does not set animation: none on the ambient motes');

// the route transition
const ri = R.find((r) => r.sel === '.route-in');
const dur = ri && (ri.body.match(/animation\s*:\s*[\w-]+\s+([\d.]+)(m?s)/) || []);
if (!ri || !dur[1]) fail('no .route-in transition'); else {
  const ms = +dur[1] * (dur[2] === 's' ? 1000 : 1);
  if (ms > 200) fail(`.route-in lasts ${ms} ms (≤ 200)`);
  const from = (css.match(/@keyframes route-in\s*\{\s*from\s*\{([^}]*)\}/) || [])[1] || '';
  const op = +((from.match(/opacity\s*:\s*([\d.]+)/) || [])[1] ?? 0);
  if (op < 0.5) fail(`.route-in starts at opacity ${op}: the core would not be painted on the first frame`);
  if (/transform|translate/.test(from)) fail('.route-in moves boxes: what a check measures would shift mid-transition');
}
if (!noneIn(reducedMedia, /\.route-in/)) fail('prefers-reduced-motion does not stop the route transition');
if (!noneIn(R.filter((r) => /data-motion="reduced"/.test(r.sel)), /\.route-in/)) fail('Settings\' reduced motion does not stop the route transition');

console.log(`${fails ? 'FAIL' : 'ok'} ambient — ${WORLDS.length} places each with one loop; paused when hidden, none under reduced motion; route fade ≤ 200 ms`);
if (fails) process.exit(1);
