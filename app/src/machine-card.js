/* machine-card.js — the small, always-loaded part of Beat the Machine (games spec §2.3): which
   Atlas stops are its trick cards, which of them a child has EARNED (2 stars or more on the
   Atlas: k.tricks[id].stars), and the Play tab's hero card. Everything else — the engine, the
   stage — is machine.js / machine-view.js, loaded on #/machine (rule 30).

   The cards are real stops, by id. A card is never invented for the game: its sums come from
   the stop's own gen, its figure from the stop's own fig and work(q), its algebra from alg. */
import { icon } from './icons.js';
import { heroArt } from './arcade.js';

/* the pool, in the order a child usually meets them on the road */
export const CARD_IDS = ['round-add', 'round-sub', 'times-eleven', 'halve-double', 'square-five', 'nikhilam-100',
  'above-100', 'crosswise', 'square-near-100', 'diff-squares'];
export const STRAIGHT = 'straight';
export const EARN_STARS = 2;
export const MIN_EARNED = 3;

export const earnedIds = (k) => CARD_IDS.filter((id) => ((k && k.tricks && k.tricks[id]) || {}).stars >= EARN_STARS);

/* The Play tab's hero card (the lead wires it into HEROES; this module draws it). */
export function machineCard(k) {
  const n = earnedIds(k).length;
  const line = n >= MIN_EARNED ? 'Spot the shortcut before the Long-Way Machine finishes the sum.'
    : `Earn ${MIN_EARNED - n} more trick${MIN_EARNED - n === 1 ? '' : 's'} on the Atlas to race the Long-Way Machine.`;
  return `<button class="card hero-t machine-t painted" data-act="nav" data-arg="machine">${heroArt('machine')}<span class="hero-ic" aria-hidden="true">${icon('gear', 52)}</span><span class="kicker">Tricks race</span><b>Beat the Machine</b><span>${line}</span></button>`;
}
