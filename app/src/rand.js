/* rand.js — every random choice in the app goes through here.

   Two kinds. `rnd` is ordinary Math.random, for drills where variety is the
   point. `seeded(key)` is deterministic from a string, for anything that must
   be the SAME in every house — today's puzzle, a contest field, the option
   order of a card — because a puzzle two siblings compare over breakfast
   cannot be different puzzles. */

export const rnd = Math.random;

export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* mulberry32 — small, fast, good enough for games; not for anything secret. */
export function seeded(key) {
  let a = typeof key === 'number' ? key >>> 0 : hash(String(key));
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const int = (lo, hi, r = rnd) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (arr, r = rnd) => arr[Math.floor(r() * arr.length)];
export function shuffle(arr, r = rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* The local calendar day, as the child lives it — not UTC, or "today's"
   puzzle would change at teatime in California. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
