/* icons.js — draw the family icon set (paths in icon-paths.js). See the note there. */
import { PATHS } from './icon-paths.js';

export const ICON_NAMES = Object.keys(PATHS);

/* One inline SVG. `cls` adds classes (e.g. 'ico' for the 24px chrome size). */
export function icon(name, size = 24, cls = 'ico') {
  const p = PATHS[name] || PATHS.tile;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}

/* The emoji a data file uses as a picture, and the icon drawn in its place. */
export const GLYPH = {
  '🌱': 'sprout', '🧺': 'basket', '🛠': 'tools', '🛠️': 'tools', '🔭': 'telescope', '🪜': 'ladder', '⚓': 'anchor', '📚': 'book', '📖': 'book',
  '🕰': 'clock', '🕰️': 'clock', '⏰': 'clock', '🥧': 'pie', '🔺': 'triangle', '🌳': 'tree', '🌲': 'tree', '👑': 'crown',
  '🛳': 'ship', '🛳️': 'ship', '⭕': 'circle', '🎪': 'tent', '🪨': 'rock', '⛏': 'pick', '⛏️': 'pick', '🗼': 'lighthouse',
  '🪙': 'coin', '⚡': 'bolt', '🧠': 'brain', '📐': 'ruler', '💡': 'bulb', '🧭': 'compass', '🧩': 'puzzle', '🏆': 'trophy',
  '🔒': 'lock', '🔊': 'speaker', '🏅': 'medal', '🗺': 'map', '🗺️': 'map', '⚑': 'flag', '🏁': 'flag', '⛳': 'flag',
  '🔢': 'hash', '🎭': 'mask', '🧊': 'cube', '🌀': 'spiral', '⚖': 'scales', '⚖️': 'scales', '🔍': 'search', '🎯': 'target',
  '🏰': 'castle', '🌡': 'thermo', '🌡️': 'thermo', '🔤': 'letters', '➕': 'plusOp', '✖': 'timesOp', '✖️': 'timesOp',
  '💯': 'hundred', '📊': 'chart', '🎲': 'dice', '✨': 'sparkle', '📍': 'pin', '⬡': 'hex', '♥': 'heart', '♪': 'music',
  '★': 'star', '✓': 'check', '✕': 'x', '✗': 'x', '🔄': 'retry', '↺': 'retry', '#': 'hash',
};
export function glyph(g, size = 24, cls = 'ico glyph') {
  const k = String(g || '').trim();
  return icon(GLYPH[k] || GLYPH[k.replace(/️/g, '')] || 'sparkle', size, cls);
}

/* The family's emoji test (standard §9): the browser check counts these inside controls. */
export const EMOJI = /\p{Extended_Pictographic}/u;
