/* library/shelf.js — what the Library shows BEFORE a tool is opened: its name,
   its blurb, its painting. Each tool module reads its own TOOL from here, so
   there is one copy; the shelf renders without downloading any tool (the
   tools are ~200 KB gzipped and load on the route that needs them — the
   family's first-load budget, standard §11). */
export const ORDER = ['explorer', 'working', 'tables', 'shapes', 'graphs', 'dictionary', 'formulas', 'vedic', 'chinese'];
export const META = {
  explorer: {
    id: 'explorer', name: 'Number Explorer',
    blurb: 'Type any number and read its page — factors, primes, squares, Roman numerals and its neighbours.',
    art: 'lib-explorer',
  },
  working: {
    id: 'working', name: 'Show Me the Working',
    blurb: 'Type a sum and see it worked out step by step — two or three ways, side by side.',
    art: 'lib-working',
  },
  tables: {
    id: 'tables', name: 'Times Table Explorer', art: 'lib-tables',
    blurb: 'Start with the 5 × 5 square, master it, and watch it grow to 20 × 20 — with a squares trainer inside.',
  },
  shapes: {
    id: 'shapes', name: 'Shape Studio',
    blurb: 'Measure angles with a protractor, build shapes on a grid, fold solids flat and move shapes about — and see why every rule is true.',
    art: 'lib-shapes',
  },
  graphs: {
    id: 'graphs', name: 'Graphing',
    blurb: 'Plot points, draw straight lines and curves, find where they cross — and read speed and conversions off real graphs.',
    art: 'lib-graphs',
  },
  dictionary: {
    id: 'dictionary', name: 'Maths Dictionary', art: 'lib-dictionary',
    blurb: 'Every maths word from 6 to 14 — what it means, an example with real numbers, and where the Atlas teaches it.',
  },
  formulas: {
    id: 'formulas', name: 'Formula Book', art: 'lib-formulas',
    blurb: 'Formula cards to collect — each with the picture that proves it, a story that uses it, and a quiz to keep it.',
  },
  vedic: {
    id: 'vedic', name: 'Vedic Maths Journey',
    blurb: 'Walk the stepping stones of the sutras — each method, and the algebra that makes it work.',
    art: 'lib-vedic',
  },
  chinese: {
    id: 'chinese', name: 'Chinese Maths Journey',
    blurb: 'Counting rods, the suanpan, the Lo Shu and the Nine Chapters — a path of stepping stones.',
    art: 'lib-chinese',
  },
};

/* The shelf: tools first, then the two links into existing screens. */
export const SHELF = [
  ...ORDER.map((id) => ({ ...META[id], kind: 'tool' })),
  { id: 'facts', name: 'Number Facts', blurb: 'Adding, taking away and sharing facts — twenty a day, trickiest last.', art: 'lib-facts', kind: 'nav', nav: 'facts' },
  { id: 'stories', name: 'Story Shelf', blurb: 'Every Atlas stop starts as a story. All of them, on one shelf.', art: 'lib-stories', kind: 'nav', nav: 'stories' },
];
