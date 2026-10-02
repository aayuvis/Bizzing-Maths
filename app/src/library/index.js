/* library/index.js — the Maths Library: one module per tool, in shelf order,
   each loaded only when it is opened (dynamic import → its own chunk). Every
   tool follows docs/LIBRARY-CONTRACT.md. toolById fills as tools arrive. */
import { ORDER, SHELF } from './shelf.js';

const LOAD = {
  explorer: () => import('./explorer.js'),
  working: () => import('./working.js'),
  tables: () => import('./tables.js'),
  shapes: () => import('./shapes.js'),
  graphs: () => import('./graphs.js'),
  dictionary: () => import('./dictionary.js'),
  formulas: () => import('./formulas.js'),
  vedic: () => import('./vedic.js'),
  chinese: () => import('./chinese.js'),
};
export const isTool = (id) => id in LOAD;
export const toolById = {};
export async function loadTool(id) {
  if (!toolById[id] && LOAD[id]) toolById[id] = await LOAD[id]();
  return toolById[id];
}
export async function loadAll() { for (const id of ORDER) await loadTool(id); return ORDER.map((id) => toolById[id]); }
export { SHELF, ORDER };
