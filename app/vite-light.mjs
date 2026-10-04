/* vite-light.mjs — the chapters' DATA on the first screen, their CODE on first need (audit v4 R2).

   Home needs every stop's title, world, band and idea — the Continue card, the trick of the
   hour, the level road's progress — but none of their code: no generator, no working, no
   drawing. Those were 60% of the first-load JavaScript. So in the browser build, tricks.js's
   import of each `./chapters/<world>.js` is answered by a light module made here, at build
   time, FROM THAT CHAPTER ITSELF: every data field exactly as the chapter has it, and every
   function as a stub that throws if it is called before the code arrives. tricks.js
   `loadEngine()` then imports the real chapters (src/chapters/full.js) and copies them onto
   the same objects, so every reference anyone holds becomes the whole stop.

   Nothing is typed twice, so nothing can drift; and the build refuses a chapter whose data
   would not survive the trip (an undefined, a NaN, a getter, a class) rather than ship a
   stop that is quietly different before and after its code loads. Node — the tests — never
   goes through here and imports the chapters whole. */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PREFIX = '\0light-chapter:';

/* The same value after a JSON round trip, functions set aside — or the path where it is not. */
function lossy(v, path) {
  if (typeof v === 'function') return null;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0) ? null : path;
  if (typeof v !== 'object') return path;                       // undefined, bigint, symbol
  const proto = Object.getPrototypeOf(v);
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) { if (!(i in v) || v[i] === undefined || typeof v[i] === 'function') return `${path}[${i}]`; const r = lossy(v[i], `${path}[${i}]`); if (r) return r; }
    return null;
  }
  if (proto !== Object.prototype && proto !== null) return path;  // a Date, a Map, a class
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
    if (d.get || d.set) return `${path}.${k}`;
    if (d.value === undefined) return `${path}.${k}`;
    const r = lossy(d.value, `${path}.${k}`); if (r) return r;
  }
  return null;
}

/* The light module's source for one chapter module (its WORLD and TRICKS). */
export function lightSource(mod, name = '?') {
  const fns = (o, where) => {
    const data = {}, stubs = [];
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(o))) {
      if (d.get || d.set) throw new Error(`${name}: ${where}.${k} is a getter — a light chapter cannot carry it`);
      if (typeof d.value === 'function') stubs.push(k);
      else { const r = lossy(d.value, `${where}.${k}`); if (r) throw new Error(`${name}: ${r} would not survive the light build`); data[k] = d.value; }
    }
    const json = JSON.stringify(data);
    return stubs.length ? `Object.assign(${json}, {${stubs.map((k) => `${JSON.stringify(k)}: S(${JSON.stringify(where)}, ${JSON.stringify(k)})`).join(', ')}})` : json;
  };
  const extra = Object.keys(mod).filter((k) => !['WORLD', 'TRICKS'].includes(k));
  return `/* light chapter: ${name} (made by vite-light.mjs from src/chapters/${name}.js) */
const S = (who, k) => function () { throw new Error(who + '.' + k + ': the stop\\'s code has not loaded yet (tricks.js loadEngine)'); };
export const LIGHT = true;
export const WORLD = ${fns(mod.WORLD, 'WORLD')};
export const TRICKS = [
${mod.TRICKS.map((t) => '  ' + fns(t, t.id)).join(',\n')}
];
${extra.length ? `/* not carried: ${extra.join(', ')} — tricks.js reads only WORLD and TRICKS */` : ''}
`;
}

export function lightChapters(root) {
  const CH = resolve(root, 'src/chapters');
  const TRICKS_JS = resolve(root, 'src/tricks.js');
  return {
    name: 'light-chapters', apply: 'build', enforce: 'pre',
    resolveId(src, importer) {
      if (!importer || resolve(importer) !== TRICKS_JS) return null;
      const m = /^\.\/chapters\/([a-z]+)\.js$/.exec(src);
      return m && m[1] !== 'full' ? PREFIX + m[1] : null;   // full.js is the code itself, loaded on need
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const name = id.slice(PREFIX.length), file = resolve(CH, name + '.js');
      this.addWatchFile(file);
      const mod = await import(pathToFileURL(file).href + '?light=' + Date.now());
      return lightSource(mod, name);
    },
  };
}
