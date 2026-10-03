/* bizzing-avatars.js — the one avatar engine every Bizzing app uses (FAMILY-STANDARD §8).

   Each app keeps its OWN 96 avatars (12 packs × 8, drawn for its subject). What is shared is
   the engine: the four tiers, their prices and colours, the shape of a pack, how a face is
   unlocked, and the night glow (bizzing-avatars.css). A child who learns how avatars work in
   one app already knows how they work in all five.

     import { validate, stateOf, buy } from './bizzing-avatars.js';
     test:   validate(CATALOGUE)                       // [] or a list of what is wrong
     card:   stateOf(av, { owned, worlds, plan, milestones })  // what the card says and does
     button: buy('maths', 'Anaya', av, ctx)            // pays through bizzing-wallet.js
     world:  buyWorld('maths', 'Anaya', 3, ctx)        // 240 coins opens world 3 and packs 5–6

   A catalogue entry: { id, name, pack: 1..12, tier: 'common'|'rare'|'epic'|'legendary',
   art, world?: n, milestone?: { id, label } } — `milestone` is required on every legendary;
   `world` defaults to the pairing below, and an app whose worlds hold packs differently
   sets it on every avatar of the pack.
   Ownership stays in the app's own Store; this file never writes it.

   Rules this file enforces (an app cannot override them):
   • 12 packs of 8, every pack shaped 2 common · 3 rare · 2 epic · 1 legendary.
   • Fixed prices: common 0 · rare 120 · epic 250 · legendary 500 coins. No sale prices.
   • Commons are free to every child on every plan, from the first day.
   • Every app has at least six worlds, and two packs belong to each: packs 1–2 to world 1,
     3–4 to world 2, … 11–12 to world 6. A pack opens when its world is open.
   • Worlds 1 and 2 are open to everyone. Worlds 3–6 open with the family plan, or one at a
     time for 240 coins — something worth saving for. The card says so in plain words and
     never shows a price in real money or a button to a payment form.
   • A legendary needs its named learning milestone first, then the coins.
   • Nothing random: no packs drawn blind, no chance, no duplicates, no trading.
   • Sacred figures and real people may be collectibles (owner, 2 Oct 2026). A catalogue marks them
     `sacred: true` / `real: true` so a test can keep them honest: a real person's card carries a
     one-line `about`, and a sacred figure is never in a pack named for villains. */

import { spend, balance } from './bizzing-wallet.js';

export const TIERS = {
  common:    { label: 'Common',    price: 0,   colour: '#7B8794' },
  rare:      { label: 'Rare',      price: 120, colour: '#3D7DF0' },
  epic:      { label: 'Epic',      price: 250, colour: '#B14FC4' },
  legendary: { label: 'Legendary', price: 500, colour: '#F0B429' },
};
export const PACKS = 12;
export const PER_PACK = 8;
export const SHAPE = { common: 2, rare: 3, epic: 2, legendary: 1 };
export const FREE_WORLDS = 2;
export const WORLD_PRICE = 240;
export const worldOf = (av) => (Number.isInteger(av.world) ? av.world : Math.ceil(av.pack / 2));
const has = (x, id) => (x instanceof Set ? x.has(id) : Array.isArray(x) && x.includes(id));
export const worldOpen = (n, ctx = {}) => n <= FREE_WORLDS || ctx.plan === 'family' || has(ctx.worlds, n);

export function validate(cat) {
  const err = [];
  if (!Array.isArray(cat)) return ['catalogue is not a list'];
  if (cat.length !== PACKS * PER_PACK) err.push(`${cat.length} avatars, need ${PACKS * PER_PACK}`);
  const ids = new Set();
  for (const a of cat) {
    if (!a || !a.id) { err.push('an avatar has no id'); continue; }
    if (ids.has(a.id)) err.push(`${a.id}: duplicate id`);
    ids.add(a.id);
    if (!(a.tier in TIERS)) err.push(`${a.id}: unknown tier ${a.tier}`);
    if (!Number.isInteger(a.pack) || a.pack < 1 || a.pack > PACKS) err.push(`${a.id}: pack ${a.pack} out of 1–${PACKS}`);
    if (!a.name) err.push(`${a.id}: no name`);
    if (!a.art) err.push(`${a.id}: no art`);
    if (a.real && !a.about) err.push(`${a.id}: a real person needs a one-line about`);
    if ('price' in a && a.price !== TIERS[a.tier]?.price) err.push(`${a.id}: price ${a.price} is not the ${a.tier} price`);
    if ('world' in a && !(Number.isInteger(a.world) && a.world >= 1)) err.push(`${a.id}: world ${a.world} is not a world number`);
    if (a.tier === 'legendary' && !(a.milestone && a.milestone.id && a.milestone.label)) err.push(`${a.id}: a legendary must name its milestone`);
  }
  for (let p = 1; p <= PACKS; p++) {
    const inPack = cat.filter((a) => a && a.pack === p);
    if (inPack.length !== PER_PACK) err.push(`pack ${p}: ${inPack.length} avatars, need ${PER_PACK}`);
    for (const [t, n] of Object.entries(SHAPE)) {
      const got = inPack.filter((a) => a.tier === t).length;
      if (got !== n) err.push(`pack ${p}: ${got} ${t}, need ${n}`);
    }
  }
  return err;
}

/* What the card shows. ctx = { owned: ids, worlds: world numbers bought, plan: 'free'|'family', milestones: ids, who } */
export function stateOf(av, ctx = {}) {
  const t = TIERS[av.tier];
  const base = { tier: av.tier, label: t.label, colour: t.colour, price: t.price };
  if (av.tier === 'common' || has(ctx.owned, av.id)) return { ...base, state: 'owned', say: av.tier === 'common' ? 'Free for everyone' : 'Yours' };
  if (!worldOpen(worldOf(av), ctx)) return { ...base, state: 'world', world: worldOf(av), say: 'Opens with its world' };
  if (av.tier === 'legendary' && !has(ctx.milestones, av.milestone.id)) return { ...base, state: 'milestone', say: `First: ${av.milestone.label}` };
  const short = ctx.who ? Math.max(0, t.price - balance(ctx.who)) : 0;
  return { ...base, state: 'buy', say: short ? `${t.price} coins · ${short} more to go` : `${t.price} coins`, short };
}

/* Pays through the family wallet. Returns true if paid; the app then records ownership. */
export function buy(app, who, av, ctx = {}, now = Date.now()) {
  const s = stateOf(av, { ...ctx, who });
  if (s.state !== 'buy' || s.short) return false;
  return spend(app, who, s.price, `avatar:${av.id}`, now);
}

/* Opens world n (3–6) for 240 coins. Returns true if paid; the app records the world as open. */
export function buyWorld(app, who, n, ctx = {}, now = Date.now()) {
  if (!Number.isInteger(n) || n < 1 || worldOpen(n, ctx)) return false;
  return spend(app, who, WORLD_PRICE, `world:${n}`, now);
}

/* A sacred figure is never drawn as a villain: call with the ids of any villain packs. */
export function sacredSafe(cat, villainPacks = []) {
  return cat.filter((a) => a.sacred && villainPacks.includes(a.pack)).map((a) => `${a.id}: a sacred figure in a villain pack`);
}
