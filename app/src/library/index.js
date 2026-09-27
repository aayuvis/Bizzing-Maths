/* library/index.js — the Maths Library: one module per tool, in shelf order.
   Every tool follows docs/LIBRARY-CONTRACT.md. The Fact Trainer and the Story
   Shelf are the app's own screens and are listed here as links, not modules. */
import * as explorer from './explorer.js';
import * as working from './working.js';
import * as tables from './tables.js';
import * as shapes from './shapes.js';
import * as graphs from './graphs.js';
import * as dictionary from './dictionary.js';
import * as formulas from './formulas.js';
import * as vedic from './vedic.js';
import * as chinese from './chinese.js';

export const TOOLS = [explorer, working, tables, shapes, graphs, dictionary, formulas, vedic, chinese];
export const toolById = Object.fromEntries(TOOLS.map((t) => [t.TOOL.id, t]));

/* The shelf: tools first, then the two links into existing screens. */
export const SHELF = [
  ...TOOLS.map((t) => ({ ...t.TOOL, kind: 'tool' })),
  { id: 'facts', name: 'Number Facts', blurb: 'Adding, taking away and sharing facts — twenty a day, trickiest last.', art: 'lib-facts', kind: 'nav', nav: 'facts' },
  { id: 'stories', name: 'Story Shelf', blurb: 'Every Atlas stop starts as a story. All of them, on one shelf.', art: 'lib-stories', kind: 'nav', nav: 'stories' },
];
