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

import { pinHash } from './pin.js';
import { trackActivity, trackMilestone } from './integration/bizzing-activity.js';
import * as W from './integration/bizzing-wallet.js';
import * as A from './integration/bizzing-avatars.js';

const KEY = 'bzm_household';
const DEV = 'bzm_device';
export const SCHEMA = 15;

/* The family layer v2 (standard §7–§8), as a function: written with || throughout, so
   running it twice changes nothing — step 8 runs it again for the households an
   earlier Contest Hall build had already moved to v7 without it. */
function familyV2(h) {
  h.parent = h.parent || {}; if (!h.parent.plan) h.parent.plan = 'free';
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
}

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
  6: (h) => { h.v = 7; familyV2(h); return h; },
  // v8: My Feed (standard §6a). What a child saw this week and which card questions have paid,
  // per child; the grown-up's switch is the household's. Nothing a child had changes.
  7: (h) => {
    h.v = 8; h.parent = h.parent || {}; if (h.parent.feedOff == null) h.parent.feedOff = false;
    for (const k of h.kids) k.feed = k.feed || { seen: {}, paid: {} };
    return h;
  },
  // v9: the Contest Hall — papers sat (best per fixed paper, the last fifty) and one paper in
  // progress. A household a Contest Hall build had already numbered v7 skipped the family v2
  // step above, so it is run again here; it only fills what is missing.
  8: (h) => {
    h.v = 9; familyV2(h);
    h.parent = h.parent || {}; if (h.parent.feedOff == null) h.parent.feedOff = false;
    for (const k of h.kids) { k.feed = k.feed || { seen: {}, paid: {} }; k.papers = k.papers || { best: {}, log: [] }; k.paperDraft = k.paperDraft || null; }
    return h;
  },
  // v10: the grown-ups' PIN is kept as a salted hash, never as itself (owner, 3 Oct 2026).
  // A PIN already on this device is hashed here and the plain copy removed.
  9: (h) => {
    h.v = 10; h.parent = h.parent || {};
    if (h.parent.pin != null && !h.parent.pinHash) h.parent.pinHash = pinHash(String(h.parent.pin));
    delete h.parent.pin; if (h.parent.pinHash === undefined) h.parent.pinHash = null;
    return h;
  },
  // v11: more for coins to buy (extras.js) — road skins and bonus game modes, owned per child,
  // and the skin a child is wearing. Everyone starts with none and the road they had.
  10: (h) => {
    h.v = 11;
    for (const k of h.kids) {
      const shop = k.shop || (k.shop = { owned: [], worn: {} });
      shop.worn = shop.worn || {}; shop.skins = shop.skins || []; shop.modes = shop.modes || [];
      if (shop.worn.skin === undefined) shop.worn.skin = null;
    }
    return h;
  },
  // v12: paper skins for the Contest Hall (extras.js PAPERS), owned per child, and the one being
  // worn. Everyone starts with none and the plain paper.
  11: (h) => {
    h.v = 12;
    for (const k of h.kids) {
      const shop = k.shop || (k.shop = { owned: [], worn: {} });
      shop.worn = shop.worn || {}; shop.paperSkins = shop.paperSkins || [];
      if (shop.worn.paper === undefined) shop.worn.paper = null;
    }
    return h;
  },
  // v13: Octo joins the 96 as a free Common (owner, 5 Oct 2026), in Bead Caterpillar's place in
  // Counting Critters. A child who wore, picked or kept the caterpillar now has Octo there.
  12: (h) => {
    h.v = 13;
    const swap = (id) => (id === 'beadpillar' ? 'octo' : id);
    for (const k of h.kids) {
      k.avatar = swap(k.avatar); if (k.starter) k.starter = swap(k.starter);
      if (k.shop && Array.isArray(k.shop.avatars)) k.shop.avatars = [...new Set(k.shop.avatars.map(swap))];
    }
    return h;
  },
  // v14: the games spec (9 Oct 2026). A level per free game (game-level.js), Beat the Timer's
  // ladder and bests (timer.js), Beat the Machine's record (machine.js), and the once-a-day
  // contest pay on merit. Everyone starts at level 1 with no bests; nothing they had changes.
  13: (h) => {
    h.v = 14;
    for (const k of h.kids) {
      k.gameLv = k.gameLv || {};
      k.timer = k.timer || { grade: null, lv: {}, best: {}, hit: {} };
      k.machine = k.machine || { lv: 1, foe: 0, heats: 0, won: 0, seen: {} };
      k.payDay = k.payDay || {};
    }
    return h;
  },
  // v15: Bizzing Bee's daily goal and coach (owner, 10 Oct 2026). The ring measures app time, practise
  // time and right answers (daylog.js); time is kept per day in k.dayLog, in seconds. The grown-up's old
  // targets were right answers, stops and today's puzzle: right answers carry over when they chose a
  // number other than the old default of 20, every other target follows the age band until they choose.
  // The contest day (the coach's phase, Bee's "Bee day") starts unset. Nothing a child had changes.
  14: (h) => {
    h.v = 15;
    for (const k of h.kids) {
      k.dayLog = k.dayLog || {};
      k.prefs = k.prefs || {};
      const t = k.prefs.targets || {};
      if (!('app' in t)) k.prefs.targets = { app: null, prac: null, right: t.answers && t.answers !== 20 ? t.answers : null };
      if (k.prefs.contest === undefined) k.prefs.contest = null;
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
  /* A record walked forward is written back AT ONCE (audit v4 Q1): migrated once, not on every
     load until some tap happens to save it — and a newer build's record is left as it is. */
  loadHousehold() {
    const raw = read(KEY); if (!raw || typeof raw !== 'object') return null;
    const from = 'v' in raw ? raw.v : 0, h = migrate(raw);
    if (h && h.v !== from) this.saveNow(h);
    return h;
  },
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
/* ?demo shows the sample's wallet (audit A5): a ledger the sample built from its own evidence,
   held here in memory. It only reads — earning and spending stay no-ops in demo mode. */
let demoLedger = [];
export const Family = {
  showDemo(ledger) { if (DEMO) demoLedger = Array.isArray(ledger) ? ledger.slice() : []; },
  track(getName) { return DEMO ? () => {} : trackActivity(APP_ID, getName); },
  milestone(who, ev, label) { if (!DEMO && who) trackMilestone(APP_ID, who, ev, label); },
  earn(who, event, now = Date.now()) { return DEMO || !who ? 0 : W.earn(APP_ID, who, event, now); },
  spend(who, price, why, now = Date.now()) { return DEMO || !who ? false : W.spend(APP_ID, who, price, why, now); },
  /* avatars and worlds are bought only through the family engine, which pays through the wallet */
  buyAvatar(who, av, ctx) { return DEMO || !who ? false : A.buy(APP_ID, who, av, ctx); },
  buyWorld(who, n, ctx) { return DEMO || !who ? false : A.buyWorld(APP_ID, who, n, ctx); },
  balance(who) { return DEMO ? demoLedger.reduce((a, x) => a + x.n, 0) : !who ? 0 : W.balance(who); },
  ledger(who) { return DEMO ? demoLedger.slice() : !who ? [] : W.ledger(who); },
  /* READ the activity feed (for the report card's minutes). This app writes it
     only through the drop-in; here it is parsed, never changed. */
  feed() { if (DEMO || !ls) return []; try { const o = JSON.parse(ls.getItem('bizzing.activity') || 'null'); return o && Array.isArray(o.s) ? o.s : []; } catch { return []; } },
  EARN: W.EARN,
};
