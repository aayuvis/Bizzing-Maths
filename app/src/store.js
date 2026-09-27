/* store.js — THE SEAM. The only module that touches storage.

   Bizzing Bee's commercialisation plan called this the "Phase 1 linchpin":
   free if done on day one, expensive for ever after. Finance did it on day
   one; so does this. Everything persistent goes through Store, so the day a
   server arrives it is one file that changes, not forty.

   Two buckets:
     household — the children, their progress, the grown-up's settings. This
                 is what would sync one day.
     device    — this screen's preferences (sound, look). Never syncs.

   Versioned: SCHEMA goes up by one, and a vN_to_vN+1 step is ADDED below.
   Never edit an old step — a device that skipped a release still has to walk
   every step in order. */

const KEY = 'bzm_household';
const DEV = 'bzm_device';
export const SCHEMA = 5;

const STEPS = {
  // v0 is "no version field at all": anything from a pre-release build
  0: (h) => { h.v = 1; h.kids = h.kids || []; h.parent = h.parent || { pin: null }; return h; },
  // v2: stories read and puzzles solved, per child
  1: (h) => { h.v = 2; for (const k of h.kids) { k.stories = k.stories || {}; k.puzzles = k.puzzles || {}; } return h; },
  // v3: the Puzzle Tower. Puzzle records move from rooms to families (cube nets
  // is one kind of Shapes & Space puzzle, balance scales are Balance).
  2: (h) => {
    h.v = 3;
    for (const k of h.kids) {
      k.quest = k.quest || {};
      const p = k.puzzles || (k.puzzles = {});
      if (p.nets) { p.space = p.nets; delete p.nets; }
      if (p.scales) { p.balance = p.scales; delete p.scales; }
    }
    return h;
  },
  // v4: the Library. Each tool keeps its own record on the child (Times Table
  // Explorer levels, journeys walked, formula cards collected).
  3: (h) => { h.v = 4; for (const k of h.kids) k.lib = k.lib || {}; return h; },
  // v5: the ten-level journeys. Nobody is placed until they take the level test.
  4: (h) => { h.v = 5; for (const k of h.kids) k.journey = k.journey || { level: null, done: {}, finished: [], tested: null }; return h; },
};

export function migrate(h) {
  if (!h || typeof h !== 'object') return null;
  if (!('v' in h)) h.v = 0;
  if (h.v > SCHEMA) return h;     // written by a newer build: leave it be, never downgrade
  while (h.v < SCHEMA) {
    const step = STEPS[h.v];
    if (!step) throw new Error(`no migration from v${h.v}`);
    h = step(h);
  }
  return h;
}

const ls = (() => { try { const k = '__bzm'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { return null; } })();
const mem = {};

function read(k) {
  try { const raw = ls ? ls.getItem(k) : mem[k]; return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(k, v) {
  const raw = JSON.stringify(v);
  try { if (ls) ls.setItem(k, raw); else mem[k] = raw; return true; } catch { return false; }
}

let timer = null, pending = null;

export const Store = {
  available: !!ls,
  loadHousehold() { return migrate(read(KEY)); },
  /* debounced: save() runs on nearly every tap */
  saveHousehold(h) {
    pending = h;
    clearTimeout(timer);
    timer = setTimeout(() => { write(KEY, pending); pending = null; }, 150);
  },
  saveNow(h) { clearTimeout(timer); pending = null; return write(KEY, h); },
  flush() { if (pending) this.saveNow(pending); },
  loadDevice(k, fb) { const d = read(DEV) || {}; return k in d ? d[k] : fb; },
  saveDevice(k, v) { const d = read(DEV) || {}; d[k] = v; write(DEV, d); },
  wipe() { try { if (ls) { ls.removeItem(KEY); ls.removeItem(DEV); } } catch {} for (const k in mem) delete mem[k]; },
  exportBlob(h) { return JSON.stringify({ app: 'bizzing-maths', schema: SCHEMA, at: new Date().toISOString(), household: h }, null, 1); },
  importBlob(text) {
    const o = JSON.parse(text);
    if (!o || o.app !== 'bizzing-maths' || !o.household) throw new Error('That file is not a Bizzing Maths backup.');
    return migrate(o.household);
  },
};

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => Store.flush());
