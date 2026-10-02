/* shop.js — what Bizzing coins buy here: avatar frames, at printed prices.

   Family standard §1: coins are earned only for learning (the family wallet
   enforces the amounts and the daily cap), spent only at FIXED prices, on
   cosmetics only. Nothing here is random, nothing is a pack, and no lesson,
   world or level is ever for sale. A frame changes how your face looks on
   your page and in the top bar — never your rank, your road or a score. */

export const FRAMES = [
  { id: 'graph', name: 'Graph paper', price: 20 },
  { id: 'chalk', name: 'Chalk line', price: 30 },
  { id: 'gold', name: 'Gold ring', price: 45 },
  { id: 'rainbow', name: 'Rainbow', price: 60 },
  { id: 'stars', name: 'Star ring', price: 80 },
  { id: 'galaxy', name: 'Galaxy', price: 120 },
];
export const frameById = Object.fromEntries(FRAMES.map((f) => [f.id, f]));
export const owns = (k, id) => ((k.shop || {}).owned || []).includes(id);
export const worn = (k) => { const f = ((k.shop || {}).worn || {}).frame; return f && owns(k, f) ? f : null; };

/* Buy at the printed price through the family wallet. `spend` is Family.spend
   bound to the child; it returns false when there are not enough coins. */
export function buy(k, id, spend) {
  const f = frameById[id];
  if (!f || owns(k, id)) return false;
  if (!spend(f.price, 'frame:' + id)) return false;
  k.shop = k.shop || { owned: [], worn: {} };
  k.shop.owned.push(id); k.shop.worn.frame = id;
  return true;
}
