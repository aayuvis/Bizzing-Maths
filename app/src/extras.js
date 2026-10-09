/* extras.js — more for Bizzing coins to buy: road skins, paper skins and bonus game modes.

   The same rules as the frames in shop.js (family standard §1, CLAUDE.md rule 18):
   coins are spent only through Family.spend, at FIXED prices printed on the card;
   nothing is random, nothing is a pack, and coins never touch xp.

   SKINS change how every painted road looks — the path and its pins — and
   nothing else: never where a stop is, whether it is open, or what it holds.

   PAPERS (paper skins, audit v4 K6, owner approved: paper skins ONLY) change how the Contest
   Hall's paper looks while it is sat — the paper's colour and texture, its header band and the
   clock — and nothing else. They are worn on the root (extras-actions.js applySkin →
   :root[data-paper]) and drawn by styles/extras.css alone: the questions, the scoring and the
   timer are built by papers/engine.js and main.js, which never read a skin.

   MODES are new ways to play an Arcade game. Each is still a learning game (the
   score is the decision: a right answer, a close estimate, a target made — never
   luck), and each pays exactly what its game already pays: main.js play() hands a
   mode the SAME onTick/onSolve as the standard game. No lesson is behind a price:
   squares, mixed facts, fractions and negatives are all taught free on the Atlas;
   a mode is a new costume for practising them, bought once and kept. */

export const SKINS = [
  { id: 'stones', name: 'Stepping stones', price: 25, blurb: 'Flat grey stones across the painting.' },
  { id: 'chalk', name: 'Chalk dots', price: 30, blurb: 'A dotted chalk line and slate pins.' },
  { id: 'rangoli', name: 'Rangoli dots', price: 40, blurb: 'Powder dots in pink and saffron, a teal trail.' },
  { id: 'rails', name: 'Railway', price: 50, blurb: 'Sleepers and rails, and station pins.' },
  { id: 'gold', name: 'Gold road', price: 65, blurb: 'A solid gold road with gold-rimmed pins.' },
  { id: 'starlight', name: 'Starlight', price: 80, blurb: 'A glowing trail of stars.' },
];

export const PAPERS = [
  { id: 'exam', name: 'Exam Hall', price: 25, blurb: 'Ruled cream paper, a navy header and a red margin.' },
  { id: 'chalk', name: 'Chalkboard', price: 35, blurb: 'Chalk on a green board in a wooden frame.' },
  { id: 'blueprint', name: 'Blueprint', price: 40, blurb: 'White lines on an engineer\'s blue grid.' },
  { id: 'night', name: 'Night Desk', price: 50, blurb: 'A dark desk under a warm lamp, an amber clock.' },
  { id: 'graph', name: 'Graph Paper', price: 60, blurb: 'Green squared paper and a green header.' },
];

/* A mode is `<game>:<mode>`. `how` is its own three-second how-to (games.js HOWTO). */
export const MODES = [
  { id: 'rush:mixed', game: 'rush', name: 'Inverse', price: 40, blurb: 'Fact families fall together: 7 × 8, 8 × 7, 56 ÷ 7, 56 ÷ 8.' },
  { id: 'rush:squares', game: 'rush', name: 'Squares', price: 50, blurb: 'Square numbers only: 7², 9², 12² — a number times itself.' },
  { id: 'target:five', game: 'target', name: 'Five numbers', price: 50, blurb: 'Five numbers to join instead of four.' },
  { id: 'target:hard', game: 'target', name: 'Hard target', price: 60, blurb: 'Bigger targets that need × or ÷ to reach.' },
  { id: 'line:fractions', game: 'line', name: 'Fractions', price: 50, blurb: 'Place ½, ¾, ⅝ … between 0 and 1.' },
  { id: 'line:negatives', game: 'line', name: 'Negatives', price: 40, blurb: 'A line with nought in the middle.' },
];
export const skinById = Object.fromEntries(SKINS.map((s) => [s.id, s]));
export const paperById = Object.fromEntries(PAPERS.map((p) => [p.id, p]));
export const modeById = Object.fromEntries(MODES.map((m) => [m.id, m]));
export const modesFor = (game) => MODES.filter((m) => m.game === game);

const shop = (k) => (k && k.shop) || {};
export const ownsSkin = (k, id) => (shop(k).skins || []).includes(id);
export const ownsMode = (k, id) => (shop(k).modes || []).includes(id);
export const skinOf = (k) => { const s = (shop(k).worn || {}).skin; return s && ownsSkin(k, s) ? s : null; };
export const ownsPaper = (k, id) => (shop(k).paperSkins || []).includes(id);
export const paperOf = (k) => { const s = (shop(k).worn || {}).paper; return s && ownsPaper(k, s) ? s : null; };

/* Buy at the printed price. `spend(price, why)` is Family.spend bound to the child and
   returns false when there are not enough coins; then nothing changes here either. */
function take(k, list, item, why, spend) {
  if (!Number.isInteger(item.price) || item.price <= 0) return false;
  if (!spend(item.price, why)) return false;
  k.shop = k.shop || { owned: [], worn: {} };
  (k.shop[list] || (k.shop[list] = [])).push(item.id);
  return true;
}
export function buySkin(k, id, spend) {
  const s = skinById[id];
  if (!s || ownsSkin(k, id)) return false;
  if (!take(k, 'skins', s, 'skin:' + id, spend)) return false;
  (k.shop.worn || (k.shop.worn = {})).skin = id;
  return true;
}
export function wearSkin(k, id) {
  if (id && !ownsSkin(k, id)) return false;
  (k.shop.worn || (k.shop.worn = {})).skin = id || null;
  return true;
}
export function buyPaper(k, id, spend) {
  const p = paperById[id];
  if (!p || ownsPaper(k, id)) return false;
  if (!take(k, 'paperSkins', p, 'paper:' + id, spend)) return false;
  (k.shop.worn || (k.shop.worn = {})).paper = id;
  return true;
}
export function wearPaper(k, id) {
  if (id && !ownsPaper(k, id)) return false;
  (k.shop.worn || (k.shop.worn = {})).paper = id || null;
  return true;
}
export function buyMode(k, id, spend) {
  const m = modeById[id];
  if (!m || ownsMode(k, id)) return false;
  return take(k, 'modes', m, 'mode:' + id, spend);
}

/* the wallet history's words for a purchase line (views3.js why()) */
export function ledgerWords(w) {
  if (w.startsWith('skin:')) { const s = skinById[w.slice(5)]; return s ? `bought the ${s.name} road` : 'bought a road skin'; }
  if (w.startsWith('paper:')) { const p = paperById[w.slice(6)]; return p ? `bought the ${p.name} paper` : 'bought a paper skin'; }
  if (w.startsWith('mode:')) { const m = modeById[w.slice(5)]; return m ? `bought ${m.name} mode` : 'bought a game mode'; }
  return null;
}
