/* themes.js — the six WORLDS (FAMILY-STANDARD §7): a complete dress for the app.

   A world is a painted place with its own palette, one display face for its hero and
   headings, three layers of ambient life (the plate drifting behind a nearer plane,
   particles of the place, and one idle traveller), a separately painted NIGHT, a music
   loop and two avatar packs (packs 2n−1 and 2n belong to world n). The chrome around it is
   the family's: Hanken Grotesk, Fraunces and Sono, in every world.

   A world belongs to the CHILD (k.prefs.theme), so two children on one tablet keep their
   own; light/dark is the device's. Worlds 1–2 are open to everyone. Worlds 3–6 open with the
   family plan, or one at a time for 240 Bizzing coins (the family engine decides; this file
   only asks it). The ids are the old theme ids, so every saved child keeps their world.

   The colours and motif live in styles/themes.css, keyed by data-theme on <html>. This file
   is the list, and the one place that decides what an unknown or missing value means. */

import { worldOpen as engineWorldOpen, WORLD_PRICE } from './integration/bizzing-avatars.js';

export const THEMES = [
  { id: 'graph', n: 1, name: 'Patchwork Hills', blurb: 'Fields squared like graph paper; kites over a river that curves like a plotted line.',
    display: 'Baloo 2', idle: 'kite', particles: 'petal', tune: 'hills' },
  { id: 'chalk', n: 2, name: 'Chalk Cliffs', blurb: 'A schoolhouse on a green cliff; chalk dust on the sea wind.',
    display: 'Kalam', idle: 'plane', particles: 'dust', tune: 'cliffs' },
  { id: 'blueprint', n: 3, name: 'Inventor’s Harbour', blurb: 'An airship half-built in its frame; gears, pulleys and plans.',
    display: 'Space Grotesk', idle: 'gear', particles: 'spark', tune: 'harbour' },
  { id: 'orbit', n: 4, name: 'Moon Garden', blurb: 'Glass domes on a little planet; a ringed giant in the sky.',
    display: 'Orbitron', idle: 'comet', particles: 'star', tune: 'moon' },
  { id: 'rangoli', n: 5, name: 'Rangoli Courtyard', blurb: 'A courtyard of carved balconies; rangoli in eight-fold symmetry.',
    display: 'Yatra One', idle: 'kite', particles: 'petal', tune: 'courtyard' },
  { id: 'arcade', n: 6, name: 'Funfair Pier', blurb: 'A ferris wheel and a roller coaster on a seaside pier.',
    display: 'Pixelify Sans', idle: 'car', particles: 'bulb', tune: 'pier' },
];
export const byTheme = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME = 'graph';
export { WORLD_PRICE };
const IDS = new Set(THEMES.map((t) => t.id));

/* the plates: day and a painted night, each at 1920 for wide screens and 960 for phones */
export const plate = (id, night = false, small = false) => `art/world-${id}-${night ? 'night' : 'day'}${small ? '-s' : ''}.webp`;

/* Is world n open to this child? (the family engine's rule: 1–2 free; plan or bought) */
export function worldIsOpen(h, k, n) {
  return engineWorldOpen(n, { plan: (h && h.parent && h.parent.plan) || 'free', worlds: ((k && k.shop) || {}).worlds || [] });
}

/* A child from before worlds existed has no prefs.theme: they get the default. A world
   that is no longer open to them (a grown-up turned the plan off) falls back to it too. */
export function themeOf(k, h = null) {
  const t = k && k.prefs && k.prefs.theme;
  if (!IDS.has(t)) return DEFAULT_THEME;
  if (h && !worldIsOpen(h, k, byTheme[t].n)) return DEFAULT_THEME;
  return t;
}
export const isTheme = (id) => IDS.has(id);

/* Put a world on the page. Cheap to call on every render. */
export function applyTheme(id) {
  const el = document.documentElement;
  if (el.getAttribute('data-theme') === id) return;
  el.setAttribute('data-theme', id);
  syncThemeColor();
}

/* the browser's own chrome (a phone's status bar) follows the page */
export function syncThemeColor() {
  const m = document.querySelector('meta[name="theme-color"]');
  if (!m) return;
  const c = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  if (c) m.setAttribute('content', c);
}
