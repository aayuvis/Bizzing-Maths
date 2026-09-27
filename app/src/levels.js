/* levels.js — the ten journeys, by maths age.

   The Atlas is a map of places; a LEVEL is a road through them for one maths
   age. Level n is maths age n + 5: Level 1 is age 6, Level 10 is 15 and over.
   The placement test finds a child's maths age and puts them on that level's
   journey; finishing a journey opens the next one.

   A step is a stop at a difficulty (`lv` 1 easy, 2 medium, 3 stretch — the
   same `gen(r, lv)` the drills use). A stop may come back in a later level at
   a higher lv — that is the spiral — but never lower, never twice in one
   level, and never at lv 3 the first time a child meets it.

   Where a topic sits is placed by where children typically meet it across the
   English, US and Indian school curricula, never earlier than the stop's own
   band. test/levels.mjs holds every rule here to account. */
import { byId } from './tricks.js';

/* The child-facing list of what maths is made of. */
export const CONCEPTS = [
  { id: 'number', name: 'Number & place value', glyph: '🔢' },
  { id: 'addsub', name: 'Adding & taking away', glyph: '➕' },
  { id: 'muldiv', name: 'Times & sharing', glyph: '✖️' },
  { id: 'fractions', name: 'Fractions', glyph: '🥧' },
  { id: 'decimals', name: 'Decimals, per cents & ratio', glyph: '💯' },
  { id: 'money', name: 'Money', glyph: '🪙' },
  { id: 'measure', name: 'Time & measures', glyph: '⏰' },
  { id: 'shape', name: 'Shapes, angles & triangles', glyph: '📐' },
  { id: 'data', name: 'Data & chance', glyph: '📊' },
  { id: 'factors', name: 'Factors & primes', glyph: '🌲' },
  { id: 'powers', name: 'Squares & powers', glyph: '🏰' },
  { id: 'negatives', name: 'Negative numbers', glyph: '🌡️' },
  { id: 'algebra', name: 'Algebra & patterns', glyph: '🔤' },
  { id: 'sets', name: 'Sets & logic', glyph: '🧩' },
];

const C = (concept, ids) => Object.fromEntries(ids.trim().split(/\s+/).map((id) => [id, concept]));

/* Every stop in the Atlas, to exactly one concept. */
export const CONCEPT_OF = {
  ...C('number', `place-value compare-big round-nearest roman-numerals order-of-operations
    number-families odd-even-rules number-types`),
  ...C('addsub', `make-ten near-doubles plus-nine count-up tens-then-ones column-add column-sub
    round-add round-sub all-from-nine`),
  ...C('muldiv', `double-double times-five times-nine times-twelve times-eleven long-multiply
    short-division split-multiply times-25 halve-double nikhilam-10 nikhilam-100 above-100 crosswise
    multi-step-problems`),
  ...C('fractions', `fraction-parts fraction-of-amount equivalent-fractions simplify-fractions
    compare-fractions add-same-bottom mixed-numbers add-different-bottoms multiply-fractions divide-fractions`),
  ...C('decimals', `decimal-places times-ten-decimals add-decimals round-decimals fraction-decimal-percent
    percent-of-amount unitary-method percent-change ratio-share speed-distance-time ending-decimals percent-swap`),
  ...C('money', `giving-change fewest-coins money-left saving-goal best-buy fraction-off profit-and-loss
    interest-simple interest-compound bill-split cost-of-borrowing`),
  ...C('measure', `read-the-clock how-long twenty-four-hour metric-units perimeter area-rectangles
    compound-area area-triangles volume-cuboid`),
  ...C('shape', `sides-and-corners lines-of-symmetry kinds-of-triangle four-sided-shapes faces-edges-vertices
    kinds-of-angle coordinates-and-moves angles-on-a-line angles-in-a-shape round-the-circle construct-triangle
    perpendicular-bisector angle-bisector pythagoras-side trig-sides tan-height sin-cos-side special-angles bearings`),
  ...C('data', `pictogram-total bar-compare chance-words line-graph-read mean-fair-share median-mode data-range
    chance-fraction list-outcomes scatter-correlation best-fit-estimate tree-diagram expected-frequency`),
  ...C('factors', `factor-pairs multiples divisible-2-5-10 divisible-4-8 divisible-6-11 prime-or-not factor-tree
    hcf lcm prime-stones sieve-root coprime factor-count-stones digit-root divisible-3`),
  ...C('powers', `square-five square-near-100 square-dots odd-staircase teen-squares square-endings root-of-square
    powers-index cube-and-root square-minus square-near-50 either-side index-laws diff-squares square-up rational-roots`),
  ...C('negatives', `negative-numbers compare-integers lift-moves integer-gap add-negative subtract-negative
    ups-and-downs multiply-signs divide-signs negative-squares`),
  ...C('algebra', `substitute like-terms solve-balance nth-term line-graph inequalities think-of-a-number`),
  ...C('sets', `set-member set-count union-meet venn-count subset-count who-has-which`),
};

/* 'make-ten 1, near-doubles 2' → [{ stop: 'make-ten', lv: 1 }, { stop: 'near-doubles', lv: 2 }] */
const S = (list) => list.trim().split(/\s*,\s*/).map((p) => { const [stop, lv] = p.split(/\s+/); return { stop, lv: Number(lv) }; });

export const LEVELS = [
  { n: 1, age: '6', name: 'The Counting Garden',
    blurb: 'Adding and taking away within twenty, what a digit is worth, halves and quarters, coins, the clock, flat shapes and first charts.',
    steps: S(`make-ten 1, near-doubles 1, plus-nine 1, count-up 1, tens-then-ones 1, place-value 1, compare-big 1,
      read-the-clock 1, fraction-parts 1, fewest-coins 1, money-left 1, sides-and-corners 1, lines-of-symmetry 1,
      pictogram-total 1, bar-compare 1`) },
  { n: 2, age: '7', name: 'Tens and Tables',
    blurb: 'Bigger sums in columns, rounding to ten, the two, five and ten times tables, fractions of an amount, change, and the language of chance.',
    steps: S(`make-ten 2, plus-nine 2, tens-then-ones 2, place-value 2, round-nearest 1, column-add 1, column-sub 1,
      double-double 1, times-five 1, read-the-clock 2, fraction-parts 2, fraction-of-amount 1, giving-change 1,
      fewest-coins 2, money-left 2, sides-and-corners 2, lines-of-symmetry 2, pictogram-total 2, bar-compare 2, chance-words 1`) },
  { n: 3, age: '8', name: 'The Column Road',
    blurb: 'Three-digit column sums and mental shortcuts, the nine and twelve times tables, equivalent fractions, time, length and perimeter, and kinds of angle.',
    steps: S(`column-add 2, column-sub 2, round-add 1, round-sub 1, roman-numerals 1, times-nine 1, times-twelve 1,
      split-multiply 1, nikhilam-10 1, giving-change 2, how-long 1, metric-units 1, perimeter 1, fraction-parts 3,
      equivalent-fractions 1, compare-fractions 1, add-same-bottom 1, faces-edges-vertices 1, kinds-of-angle 1,
      multiples 1, odd-even-rules 1, bar-compare 3`) },
  { n: 4, age: '9', name: 'Tables to Twelve',
    blurb: 'All the tables to twelve with their shortcuts, short division, below zero, tenths and hundredths, mixed numbers, area, and naming triangles and quadrilaterals.',
    steps: S(`times-twelve 2, times-eleven 1, times-25 1, halve-double 1, all-from-nine 1, negative-numbers 1,
      short-division 1, twenty-four-hour 1, area-rectangles 1, fraction-of-amount 2, simplify-fractions 1,
      mixed-numbers 1, money-left 3, saving-goal 1, kinds-of-triangle 1, four-sided-shapes 1, coordinates-and-moves 1,
      factor-pairs 1, divisible-2-5-10 1, decimal-places 1, times-ten-decimals 1, line-graph-read 1`) },
  { n: 5, age: '10', name: 'Point and Per Cent',
    blurb: 'Long multiplication, which sum comes first, primes, squares and cubes, decimals and percentages, sales and profit, angles on a line, and the mean.',
    steps: S(`long-multiply 1, order-of-operations 1, compound-area 1, equivalent-fractions 2, compare-fractions 2,
      best-buy 1, fraction-off 1, profit-and-loss 1, angles-on-a-line 1, divisible-4-8 1, prime-or-not 1,
      square-five 1, square-dots 1, powers-index 1, add-decimals 1, round-decimals 1, fraction-decimal-percent 1,
      percent-of-amount 1, mean-fair-share 1, data-range 1, think-of-a-number 1, multi-step-problems 1`) },
  { n: 6, age: '11', name: 'Below Zero',
    blurb: 'Adding and taking away negative numbers, prime factors, HCF and LCM, fractions with different bottoms, area of triangles, angles in a shape, and first letters for numbers.',
    steps: S(`area-triangles 1, add-different-bottoms 1, multiply-fractions 1, angles-in-a-shape 1, compare-integers 1,
      lift-moves 1, integer-gap 1, add-negative 1, subtract-negative 1, ups-and-downs 1, divisible-6-11 1,
      factor-tree 1, hcf 1, lcm 1, prime-stones 1, teen-squares 1, root-of-square 1, percent-of-amount 2,
      unitary-method 1, substitute 1, median-mode 1, who-has-which 1`) },
  { n: 7, age: '12', name: 'Letters and Ratios',
    blurb: 'Multiplying and dividing negatives, dividing fractions, ratio, percentage change and speed, circles and volume, sets, chance as a fraction, and solving an equation.',
    steps: S(`volume-cuboid 1, divide-fractions 1, interest-simple 1, bill-split 1, round-the-circle 1,
      construct-triangle 1, multiply-signs 1, divide-signs 1, negative-squares 1, number-types 2, sieve-root 2,
      square-endings 2, cube-and-root 1, percent-change 1, ratio-share 1, speed-distance-time 1, set-member 1,
      set-count 1, like-terms 1, solve-balance 1, chance-fraction 1, list-outcomes 1`) },
  { n: 8, age: '13', name: 'Powers and Proofs',
    blurb: 'Pythagoras, the index laws, squares near fifty and a hundred, counting factors, Venn diagrams, straight-line graphs, the nth term, constructions and compound interest.',
    steps: S(`interest-compound 1, perpendicular-bisector 1, angle-bisector 1, pythagoras-side 1, nikhilam-100 2,
      above-100 2, crosswise 1, number-families 2, coprime 1, factor-count-stones 1, odd-staircase 2, square-near-50 1,
      either-side 1, index-laws 1, union-meet 2, venn-count 2, nth-term 1, line-graph 1, digit-root 1, divisible-3 1,
      diff-squares 1, square-up 1`) },
  { n: 9, age: '14', name: 'The Lighthouse',
    blurb: 'Trigonometry and bearings, inequalities, irrational roots and decimals that never end, scatter graphs, tree diagrams and expected frequency.',
    steps: S(`cost-of-borrowing 1, pythagoras-side 2, trig-sides 1, tan-height 1, sin-cos-side 1, special-angles 1,
      bearings 1, ending-decimals 1, rational-roots 1, square-minus 1, square-near-100 1, index-laws 2, subset-count 1,
      solve-balance 2, line-graph 2, percent-swap 1, chance-fraction 2, scatter-correlation 1,
      best-fit-estimate 1, tree-diagram 1, expected-frequency 1, inequalities 1`) },
  { n: 10, age: '15+', name: 'The Stretch',
    blurb: 'Every strand at its hardest: trigonometry, standard form, rational roots, inequalities, compound interest, sequences, equations and probability, with no stabilisers.',
    steps: S(`negative-squares 3, divide-fractions 3, cube-and-root 3, factor-count-stones 3, substitute 3, percent-change 3,
      ratio-share 3, interest-compound 3, round-the-circle 3, index-laws 3, rational-roots 3, solve-balance 3,
      nth-term 3, line-graph 3, pythagoras-side 3, tan-height 3, sin-cos-side 3, special-angles 3, bearings 3,
      tree-diagram 3, expected-frequency 3, inequalities 3`) },
];

/* 'maths age 6' … 'maths age 15+' */
export const ageOf = (n) => `maths age ${n >= 10 ? '15+' : n + 5}`;

/* The levels × concepts map: cells[conceptId][n] = [{ stop, title, lv }], in journey order. */
export function matrix() {
  const cells = Object.fromEntries(CONCEPTS.map((c) => [c.id, Object.fromEntries(LEVELS.map((l) => [l.n, []]))]));
  for (const l of LEVELS) for (const s of l.steps) {
    const c = CONCEPT_OF[s.stop];
    if (cells[c]) cells[c][l.n].push({ stop: s.stop, title: byId[s.stop] ? byId[s.stop].title : s.stop, lv: s.lv });
  }
  return { concepts: CONCEPTS, levels: LEVELS.map(({ n, age, name, blurb }) => ({ n, age, name, blurb, label: ageOf(n) })), cells };
}
