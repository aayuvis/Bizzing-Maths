/* levels.js — the ten journeys, by maths age.

   The Atlas is a map of places; a LEVEL is a road through them for one maths
   age. Level n is maths age n + 5: Level 1 is age 6, Level 10 is 15 and over.
   The placement test finds a child's maths age and puts them on that level's
   journey; finishing a journey opens the next one.

   A level is one straight road made of LANDS, four to seven of them (from Level 4
   the seventh is the Contest Hall's: one strategy world, the ways into a hard problem). A land is
   one concept area of that level (fractions, below zero, chance…) shown as one
   Atlas world, three to six stops long, with a test at its end; the level
   ends in a mixed test drawn from all its lands. `steps` is the whole road,
   the lands laid end to end.

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
  { id: 'contest', name: 'Contest thinking', glyph: '🏆' },
  // the deep methods of two traditions, each a land on the roads it suits (owner, 3 Oct 2026)
  { id: 'vedic', name: 'The Vedic methods', glyph: '🪜' },
  { id: 'chinese', name: 'The Chinese counting board', glyph: '🧮' },
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
    chance-fraction list-outcomes factorials arrange-all permutations combinations scatter-correlation best-fit-estimate
    tree-diagram expected-frequency`),
  ...C('factors', `factor-pairs multiples divisible-2-5-10 divisible-4-8 divisible-6-11 prime-or-not factor-tree
    hcf lcm prime-stones sieve-root coprime factor-count-stones digit-root divisible-3`),
  ...C('powers', `square-five square-near-100 square-dots odd-staircase teen-squares square-endings root-of-square
    powers-index cube-and-root square-minus square-near-50 either-side index-laws diff-squares square-up rational-roots`),
  ...C('negatives', `negative-numbers compare-integers lift-moves integer-gap add-negative subtract-negative
    ups-and-downs multiply-signs divide-signs negative-squares`),
  ...C('algebra', `substitute like-terms solve-balance nth-term line-graph inequalities think-of-a-number`),
  ...C('sets', `set-member set-count union-meet venn-count subset-count who-has-which`),
  // the Contest Hall's thirty strategies: a land on every road from Level 4, and the hall's own track
  ...C('contest', `work-backwards guess-check-improve make-a-table find-the-rule bar-model heads-and-legs age-problems
    simpler-case meeting-and-overtaking units-digit-cycles parity worst-case pigeonhole calendar-days
    missing-digit-divisibility list-systematically truth-tellers digit-puzzles remainder-puzzles invariants
    count-triangles count-rectangles handshakes grid-paths overlapping-groups staircase-perimeter area-cut-and-move
    dice-faces angle-chasing painted-cubes`),
  // the Counting Court: the suanpan, the rods and the Nine Chapters' methods
  ...C('chinese', `suanpan-add suanpan-take board-multiply out-in red-black-rods excess-deficit fangcheng
    sunzi-multipliers sea-island liu-hui hundred-fowls`),
};

/* 'make-ten 1, near-doubles 2' → [{ stop: 'make-ten', lv: 1 }, { stop: 'near-doubles', lv: 2 }] */
const S = (list) => list.trim().split(/\s*,\s*/).map((p) => { const [stop, lv] = p.split(/\s+/); return { stop, lv: Number(lv) }; });

/* Which concept areas lean on which. Inside a level, a land comes after the
   lands its concept needs — money after adding, algebra after negatives. */
export const NEEDS = {
  number: [], addsub: ['number'], muldiv: ['addsub'], fractions: ['muldiv'], decimals: ['fractions'],
  money: ['addsub', 'decimals'], measure: ['addsub'], shape: [], data: ['number'], factors: ['muldiv'],
  powers: ['muldiv'], negatives: ['addsub'], algebra: ['negatives'], sets: [],
  contest: ['addsub', 'muldiv'],   // contest thinking leans on the arithmetic, so it comes last on a road
  vedic: ['muldiv'], chinese: ['addsub'],
};

/* A LAND is one concept area of one level: one straight stretch of the road,
   painted as one Atlas world, with a 20-question test at its end. Its steps
   are mostly its own concept; a stray stop joins the nearest related land. */
const land = (n, concept, world, name, steps) => ({ id: `l${n}-${concept}`, concept, name, world, steps: S(steps) });
const level = (n, age, name, blurb, lands) => ({ n, age, name, blurb, lands, steps: lands.flatMap((l) => l.steps) });

export const LEVELS = [
  level(1, '6', 'The Counting Garden',
    'Adding and taking away within twenty, what a digit is worth, halves and quarters, coins, the clock, flat shapes and first charts.', [
      land(1, 'number', 'library', 'Tens and ones', 'place-value 1, compare-big 1, tens-then-ones 1'),
      land(1, 'addsub', 'gardens', 'Number bonds to ten', 'make-ten 1, near-doubles 1, plus-nine 1, count-up 1'),
      land(1, 'money', 'coinstreet', 'Coins and the clock', 'fewest-coins 1, money-left 1, read-the-clock 1'),
      land(1, 'shape', 'shapecity', 'Shapes and halves', 'sides-and-corners 1, lines-of-symmetry 1, fraction-parts 1'),
      land(1, 'data', 'carnival', 'Pictures and bars', 'pictogram-total 1, bar-compare 1, chance-words 1'),
    ]),
  level(2, '7', 'Tens and Tables',
    'Bigger sums in columns, rounding to ten, the two, five and ten times tables, fractions of an amount, change, and the language of chance.', [
      land(2, 'number', 'library', 'Rounding to ten', 'place-value 2, compare-big 2, round-nearest 1'),
      land(2, 'addsub', 'gardens', 'Column sums', 'make-ten 2, near-doubles 2, plus-nine 2, tens-then-ones 2, column-add 1, column-sub 1'),
      land(2, 'muldiv', 'market', 'Doubles, fives and halves', 'double-double 1, times-five 1, fraction-of-amount 1'),
      land(2, 'shape', 'shapecity', 'Shapes and fair halves', 'sides-and-corners 2, lines-of-symmetry 2, fraction-parts 2'),
      land(2, 'money', 'coinstreet', 'Change and the clock', 'fewest-coins 2, money-left 2, read-the-clock 2, giving-change 1'),
      land(2, 'data', 'carnival', 'Charts and chance', 'pictogram-total 2, bar-compare 2, chance-words 2'),
    ]),
  level(3, '8', 'The Column Road',
    'Three-digit column sums and mental shortcuts, the nine and twelve times tables, equivalent fractions, time, length and perimeter, and kinds of angle.', [
      land(3, 'addsub', 'workshop', 'Adding in your head', 'column-add 2, column-sub 2, round-add 1, round-sub 1, suanpan-add 1'),
      land(3, 'muldiv', 'market', 'Nines and twelves', 'times-nine 1, times-twelve 1, split-multiply 1, nikhilam-10 1'),
      land(3, 'factors', 'forest', 'Odds, evens and multiples', 'odd-even-rules 1, multiples 1, divisible-2-5-10 1'),
      land(3, 'fractions', 'bakery', 'Equal fractions', 'fraction-parts 3, equivalent-fractions 1, compare-fractions 1, add-same-bottom 1'),
      land(3, 'measure', 'clocktower', 'Clocks, coins and measuring', 'giving-change 2, how-long 1, metric-units 1, perimeter 1, roman-numerals 1'),
      land(3, 'shape', 'shapecity', 'Solids and angles', 'lines-of-symmetry 3, faces-edges-vertices 1, kinds-of-angle 1'),
    ]),
  level(4, '9', 'Tables to Twelve',
    'All the tables to twelve with their shortcuts, short division, factor pairs, tenths and hundredths, mixed numbers, area, and naming triangles and quadrilaterals.', [
      land(4, 'muldiv', 'market', 'Mental maths shortcuts', 'times-twelve 2, times-eleven 1, times-25 1, halve-double 1, all-from-nine 1, short-division 1'),
      land(4, 'factors', 'forest', 'Factor pairs', 'factor-pairs 1, multiples 2, divisible-2-5-10 2'),
      land(4, 'fractions', 'bakery', 'Fractions and tenths', 'fraction-of-amount 2, simplify-fractions 1, mixed-numbers 1, decimal-places 1, times-ten-decimals 1'),
      land(4, 'money', 'coinstreet', 'Spending, saving and time', 'giving-change 3, twenty-four-hour 1, money-left 3, saving-goal 1'),
      land(4, 'shape', 'shapecity', 'Shapes, grids and area', 'kinds-of-triangle 1, four-sided-shapes 1, coordinates-and-moves 1, area-rectangles 1'),
      land(4, 'data', 'carnival', 'Reading graphs', 'pictogram-total 3, bar-compare 3, line-graph-read 1'),
      land(4, 'chinese', 'court', 'Beads and the five', 'suanpan-add 2, suanpan-take 1, out-in 1'),
      land(4, 'contest', 'strategy', 'Ways into a problem', 'work-backwards 1, guess-check-improve 1, make-a-table 1, bar-model 1, units-digit-cycles 1'),
    ]),
  level(5, '10', 'Point and Per Cent',
    'Long multiplication, which sum comes first, primes, squares and cubes, decimals and percentages, sales and profit, area and angles on a line, and the mean.', [
      land(5, 'muldiv', 'library', 'Long sums, in order', 'long-multiply 1, order-of-operations 1, multi-step-problems 1'),
      land(5, 'powers', 'palace', 'Tests, primes and powers', 'divisible-4-8 1, prime-or-not 1, square-five 1, square-dots 1, powers-index 1'),
      land(5, 'decimals', 'dock', 'Fractions, decimals, per cents', 'equivalent-fractions 2, compare-fractions 2, add-decimals 1, round-decimals 1, fraction-decimal-percent 1, percent-of-amount 1'),
      land(5, 'money', 'coinstreet', 'Sales and profit', 'best-buy 1, fraction-off 1, profit-and-loss 1'),
      land(5, 'measure', 'clocktower', 'Area and angles', 'perimeter 2, area-rectangles 2, compound-area 1, angles-on-a-line 1'),
      land(5, 'data', 'carnival', 'Averages and working back', 'mean-fair-share 1, data-range 1, think-of-a-number 1'),
      land(5, 'chinese', 'court', 'Borrowing beads and rods', 'suanpan-take 2, board-multiply 1, red-black-rods 1'),
      land(5, 'contest', 'figures', 'Counting with care', 'count-triangles 1, count-rectangles 1, handshakes 1, staircase-perimeter 1'),
    ]),
  level(6, '11', 'Below Zero',
    'Adding and taking away negative numbers, prime factors, HCF and LCM, square roots, all four sums with fractions, area of triangles, angles in a shape, and the middle of a list.', [
      land(6, 'negatives', 'mine', 'Below zero', 'negative-numbers 1, compare-integers 1, lift-moves 1, integer-gap 1, add-negative 1, subtract-negative 1'),
      land(6, 'factors', 'forest', 'Prime factors, HCF and LCM', 'divisible-6-11 1, factor-tree 1, hcf 1, lcm 1, prime-stones 1'),
      land(6, 'powers', 'palace', 'Squares and roots', 'square-dots 2, teen-squares 1, root-of-square 1'),
      land(6, 'fractions', 'bakery', 'Fractions with any bottom', 'mixed-numbers 2, add-different-bottoms 1, multiply-fractions 1, divide-fractions 1'),
      land(6, 'shape', 'shapecity', 'Angles and triangles', 'angles-on-a-line 2, angles-in-a-shape 1, area-triangles 1'),
      land(6, 'data', 'carnival', 'Mean, median and mode', 'mean-fair-share 2, median-mode 1, data-range 2'),
      land(6, 'chinese', 'court', 'Red rods and black', 'board-multiply 2, out-in 2, red-black-rods 2, excess-deficit 1'),
      land(6, 'contest', 'logic', 'What must be true', 'parity 1, worst-case 1, pigeonhole 1, calendar-days 1'),
    ]),
  level(7, '12', 'Letters and Ratios',
    'Multiplying and dividing negatives, kinds of number, ratio, percentage change and speed, first letters for numbers, circles and volume, chance as a fraction, and factorials and arrangements.', [
      land(7, 'negatives', 'mine', 'Signs that multiply', 'ups-and-downs 1, multiply-signs 1, divide-signs 1, negative-squares 1'),
      land(7, 'factors', 'quarry', 'Kinds of number', 'number-types 2, prime-stones 2, sieve-root 2, cube-and-root 1'),
      land(7, 'decimals', 'dock', 'Percentages, ratio and rates', 'percent-of-amount 2, unitary-method 1, percent-change 1, ratio-share 1, speed-distance-time 1, interest-simple 1'),
      land(7, 'algebra', 'setisland', 'Letters for numbers', 'think-of-a-number 2, substitute 1, like-terms 1, solve-balance 1'),
      land(7, 'shape', 'shapecity', 'Circles, triangles and solids', 'round-the-circle 1, construct-triangle 1, volume-cuboid 1'),
      land(7, 'data', 'carnival', 'Chance and arrangements', 'chance-fraction 1, list-outcomes 1, factorials 1, arrange-all 1'),
      land(7, 'chinese', 'court', 'The board solves for two', 'excess-deficit 2, fangcheng 1, sunzi-multipliers 1, sea-island 1'),
      land(7, 'contest', 'strategy', 'Clever ways round', 'work-backwards 2, find-the-rule 1, heads-and-legs 1, age-problems 1, simpler-case 1, meeting-and-overtaking 1'),
    ]),
  level(8, '13', 'Powers and Proofs',
    'Vedic multiplying, digit roots and counting factors, the index laws, sets and Venn diagrams, constructions and Pythagoras, and permutations and combinations.', [
      land(8, 'muldiv', 'observatory', 'Vedic multiplying', 'nikhilam-10 2, nikhilam-100 2, above-100 2, crosswise 1'),
      land(8, 'factors', 'quarry', 'Kinds of number and factors', 'number-families 2, coprime 1, factor-count-stones 1, digit-root 1, divisible-3 1'),
      land(8, 'powers', 'palace', 'Index laws and squares', 'odd-staircase 2, square-near-50 1, index-laws 1, diff-squares 1'),
      land(8, 'sets', 'setisland', 'Sets and Venn diagrams', 'set-member 1, set-count 1, union-meet 1, venn-count 1, subset-count 1, who-has-which 1'),
      land(8, 'shape', 'shapecity', 'Constructions and Pythagoras', 'perpendicular-bisector 1, angle-bisector 1, pythagoras-side 1'),
      land(8, 'data', 'carnival', 'Orders and choices', 'arrange-all 2, permutations 1, combinations 1'),
      land(8, 'chinese', 'court', 'Remainders, circles and fowls', 'fangcheng 2, sunzi-multipliers 2, liu-hui 1, hundred-fowls 1'),
      land(8, 'contest', 'figures', 'Shapes that need a second look', 'grid-paths 2, overlapping-groups 2, area-cut-and-move 2, dice-faces 2, angle-chasing 2, painted-cubes 2'),
    ]),
  level(9, '14', 'The Lighthouse',
    'Roots that never end, decimals that recur, loans and compound interest, sequences, straight-line graphs and inequalities, trigonometry and bearings, scatter graphs and tree diagrams.', [
      land(9, 'powers', 'palace', 'Roots that never end', 'square-endings 2, square-minus 1, either-side 1, square-near-100 1, rational-roots 1, square-up 1'),
      land(9, 'decimals', 'dock', 'Decimals that never end', 'ratio-share 2, ending-decimals 1, percent-swap 1'),
      land(9, 'money', 'coinstreet', 'Bills, loans and interest', 'interest-simple 2, interest-compound 1, bill-split 1, cost-of-borrowing 1'),
      land(9, 'algebra', 'setisland', 'Sequences and inequalities', 'like-terms 2, nth-term 1, line-graph 1, inequalities 1'),
      land(9, 'shape', 'lighthouse', 'Trigonometry and bearings', 'trig-sides 1, tan-height 1, sin-cos-side 1, special-angles 1, bearings 1'),
      land(9, 'data', 'carnival', 'Scatter graphs and trees', 'scatter-correlation 1, best-fit-estimate 1, tree-diagram 1, expected-frequency 1'),
      land(9, 'chinese', 'court', 'Three unknowns and a far peak', 'fangcheng 3, sea-island 2, liu-hui 2, hundred-fowls 2'),
      land(9, 'contest', 'logic', 'Proof by reasoning', 'missing-digit-divisibility 2, list-systematically 2, truth-tellers 2, digit-puzzles 2, remainder-puzzles 2, invariants 2'),
    ]),
  level(10, '15+', 'The Stretch',
    'Every strand at its hardest: powers and roots, per cents and compound interest, equations, sequences and inequalities, sets, Pythagoras and trigonometry, and counting and probability, with no stabilisers.', [
      land(10, 'powers', 'palace', 'Powers, roots and factors', 'negative-squares 3, index-laws 3, factor-count-stones 3, rational-roots 3'),
      land(10, 'decimals', 'dock', 'Fractions, ratio and growth', 'divide-fractions 3, percent-change 3, ratio-share 3, interest-compound 3'),
      land(10, 'algebra', 'setisland', 'Equations and sequences', 'substitute 3, solve-balance 3, nth-term 3, line-graph 3, inequalities 3'),
      land(10, 'sets', 'setisland', 'Sets and logic', 'union-meet 3, venn-count 3, subset-count 3'),
      land(10, 'shape', 'lighthouse', 'Circles and triangles', 'round-the-circle 3, pythagoras-side 3, tan-height 3, sin-cos-side 3, special-angles 3, bearings 3'),
      land(10, 'data', 'carnival', 'Counting and chance', 'permutations 3, combinations 3, tree-diagram 3, expected-frequency 3'),
      land(10, 'chinese', 'court', 'The board at full stretch', 'sunzi-multipliers 3, sea-island 3, liu-hui 3, hundred-fowls 3'),
      land(10, 'contest', 'strategy', 'Contest stretch', 'heads-and-legs 3, age-problems 3, simpler-case 3, meeting-and-overtaking 3, units-digit-cycles 3'),
    ]),
];

/* The lands of Level n, in road order. */
export const landsOf = (n) => (LEVELS[n - 1] ? LEVELS[n - 1].lands : []);

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
