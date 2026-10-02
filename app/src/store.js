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

import { trackActivity, trackMilestone } from './integration/bizzing-activity.js';
import * as W from './integration/bizzing-wallet.js';
import * as A from './integration/bizzing-avatars.js';

const KEY = 'bzm_household';
const DEV = 'bzm_device';
export const SCHEMA = 7;

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
  // v6: the family layer. Medals earned from evidence, and the cosmetics bought
  // with Bizzing coins. Maths had no currency of its own, so there is nothing
  // to convert: the coins themselves live in the family wallet, not here.
  // weeks: one snapshot of what the child can do per week, for the report's trend.
  5: (h) => { h.v = 6; for (const k of h.kids) { k.medals = k.medals || {}; k.shop = k.shop || { owned: [], worn: {} }; k.weeks = k.weeks || {}; } return h; },
  // v7: the family's 96 avatars and six worlds (standard v2 §7–§8). Nothing a child had is
  // taken away: the face they wear is theirs whatever its tier now is, and the world they
  // were dressed in stays open to them. The mistakes deck and the coin notes start empty;
  // the daily ring keeps its old goals as the grown-up's targets.
  6: (h) => {
    h.v = 7; h.parent = h.parent || {}; if (!h.parent.plan) h.parent.plan = 'free';
    const ORDER = ['graph', 'chalk', 'blueprint', 'orbit', 'rangoli', 'arcade'];
    for (const k of h.kids) {
      const shop = k.shop || (k.shop = { owned: [], worn: {} });
      shop.owned = shop.owned || []; shop.worn = shop.worn || {};
      shop.avatars = shop.avatars || []; if (k.avatar && !shop.avatars.includes(k.avatar)) shop.avatars.push(k.avatar);
      shop.worlds = shop.worlds || [];
      const n = ORDER.indexOf((k.prefs || {}).theme) + 1; if (n > 2 && !shop.worlds.includes(n)) shop.worlds.push(n);
      k.mistakes = k.mistakes || {}; k.coinNotes = k.coinNotes || {};
      k.prefs = k.prefs || {}; k.prefs.targets = k.prefs.targets || { answers: 20, stops: 1, puzzle: 1 };
    }
    return h;
  },
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

/* Demo mode (family standard §14): ?demo runs on a sample child held in memory
   only. It never reads or writes the real household, the device prefs or the
   family's shared keys — `ls` is simply absent, so every path below falls
   through to `mem`. Decided once, at load, before anything is read. */
export const DEMO = typeof location !== 'undefined' && /[?&]demo\b/.test(location.search);
const ls = DEMO ? null : (() => { try { const k = '__bzm'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { return null; } })();
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

/* ---- the family's shared keys --------------------------------------------
   bizzing.activity (minutes and milestones, read by the Hive) and
   bizzing.wallet (Bizzing coins, one wallet per child across every app) are
   written by the family's own drop-ins, copied verbatim from Bizzing_Schedule's
   integration/ folder so the rules (standard amounts, daily cap, no network)
   are the family's, not ours. They live behind this seam like everything else:
   no other module imports them, and in demo mode none of them run. */
export const APP_ID = 'maths';
export const Family = {
  track(getName) { return DEMO ? () => {} : trackActivity(APP_ID, getName); },
  milestone(who, ev, label) { if (!DEMO && who) trackMilestone(APP_ID, who, ev, label); },
  earn(who, event, now = Date.now()) { return DEMO || !who ? 0 : W.earn(APP_ID, who, event, now); },
  spend(who, price, why, now = Date.now()) { return DEMO || !who ? false : W.spend(APP_ID, who, price, why, now); },
  /* avatars and worlds are bought only through the family engine, which pays through the wallet */
  buyAvatar(who, av, ctx) { return DEMO || !who ? false : A.buy(APP_ID, who, av, ctx); },
  buyWorld(who, n, ctx) { return DEMO || !who ? false : A.buyWorld(APP_ID, who, n, ctx); },
  balance(who) { return DEMO || !who ? 0 : W.balance(who); },
  ledger(who) { return DEMO || !who ? [] : W.ledger(who); },
  /* READ the activity feed (for the report card's minutes). This app writes it
     only through the drop-in; here it is parsed, never changed. */
  feed() { if (DEMO || !ls) return []; try { const o = JSON.parse(ls.getItem('bizzing.activity') || 'null'); return o && Array.isArray(o.s) ? o.s : []; } catch { return []; } },
  EARN: W.EARN,
};
