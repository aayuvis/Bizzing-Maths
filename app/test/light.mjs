/* test/light.mjs — the chapters' data on the first screen, their code on first need (vite-light.mjs).
   A light chapter must be the SAME stops as the real one: every data field equal, every function a
   stub that says so, and once loadEngine() copies the real chapter on, nothing different at all.
   And src/chapters/full.js must bring every chapter tricks.js lightens — one left out would be a
   stop whose code never arrives. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { lightSource, lightChapters } from '../vite-light.mjs';
import { CHAPTERS, engineReady, loadEngine } from '../src/tricks.js';
import { FULL } from '../src/chapters/full.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const HERE = resolve(import.meta.dirname, '..');

// full.js brings exactly the chapters tricks.js imports, in its order
ok(FULL.length === CHAPTERS.length && FULL.every((m, i) => m === CHAPTERS[i]), `full.js holds every chapter tricks.js imports, in order (${FULL.length} of ${CHAPTERS.length})`);
const src = readFileSync(resolve(HERE, 'src/tricks.js'), 'utf8');
const named = [...src.matchAll(/from '\.\/chapters\/([a-z]+)\.js'/g)].map((m) => m[1]);
const plugin = lightChapters(HERE), tj = resolve(HERE, 'src/tricks.js');
ok(named.length === CHAPTERS.length && named.every((n) => plugin.resolveId(`./chapters/${n}.js`, tj) === '\0light-chapter:' + n), 'the build lightens every chapter tricks.js imports');
ok(plugin.resolveId('./chapters/full.js', tj) === null && plugin.resolveId('./chapters/carnival.js', resolve(HERE, 'src/library/shapes.js')) === null, 'and nothing else: full.js and a Library tool get the real chapter');
ok(engineReady() && await loadEngine() === undefined, 'in node the chapters are whole, so the engine is ready at once');

let stops = 0, stubs = 0;
for (const [i, real] of CHAPTERS.entries()) {
  const name = named[i];
  const light = await import('data:text/javascript;base64,' + Buffer.from(lightSource(real, name)).toString('base64'));
  ok(light.LIGHT === true, `${name}: marked light`);
  ok(isDeepStrictEqual(light.WORLD, real.WORLD), `${name}: the WORLD is the same`);
  ok(light.TRICKS.length === real.TRICKS.length, `${name}: the same number of stops`);
  for (const [j, t] of real.TRICKS.entries()) {
    const l = light.TRICKS[j]; stops++;
    ok(l && l.id === t.id && isDeepStrictEqual(Object.keys(l).sort(), Object.keys(t).sort()), `${t.id}: the same fields`);
    for (const [k, v] of Object.entries(t)) {
      if (typeof v === 'function') {
        stubs++; let threw = null; try { l[k](); } catch (e) { threw = e.message; }
        ok(typeof l[k] === 'function' && /has not loaded yet/.test(threw || ''), `${t.id}.${k}: a stub that says the code has not loaded (got ${threw})`);
      } else ok(isDeepStrictEqual(l[k], v), `${t.id}.${k}: the data is the chapter's own`);
    }
    // what loadEngine does: copy the real stop onto the light object
    Object.assign(l, t);
    ok(Object.entries(t).every(([k, v]) => l[k] === v) && Object.keys(l).length === Object.keys(t).length, `${t.id}: after the code arrives it is the real stop, field for field`);
  }
}
// a chapter whose data would not survive the trip is refused at build, never shipped different
for (const [bad, why] of [[{ id: 'x', n: NaN }, 'NaN'], [{ id: 'x', a: [1, undefined] }, 'undefined in an array'], [{ id: 'x', d: new Date(0) }, 'a Date'], [{ id: 'x', get g() { return 1; } }, 'a getter']]) {
  let threw = false; try { lightSource({ WORLD: { id: 'w' }, TRICKS: [bad] }, 'bad'); } catch { threw = true; }
  ok(threw, `the light build refuses ${why}`);
}
console.log(`${fails ? 'FAIL' : 'ok'} light — ${CHAPTERS.length} chapters, ${stops} stops, ${stubs} functions held back until first need`);
if (fails) process.exit(1);
