/* papers/methods.js — another way in (owner, 3 Oct 2026).

   A paper's review sends every miss to its contest strategy. Where a method from the
   Sutra Ladder or the Counting Court cracks the SAME problem — not merely a cousin of
   it — the review also offers that stop: hens and rabbits are a two-unknown array on
   the counting board, eggs left over in boxes are a Sunzi remainder problem, two
   numbers with a known sum and product are a quadratic split.

   Keyed by template id, so the link is exact. test/papers.mjs holds every key to a real
   template and every value to a Ladder or Court stop. */
export const METHOD_OF = {
  'yc-hens-and-rabbits': 'fangcheng',          // two unknowns: heads and legs as a 2×2 array
  'old-wheels': 'fangcheng',                   // bicycles and tricycles, the same array
  'yc-sum-and-difference': 'sutra-equations',  // x + y and x − y: add the two, then subtract
  'old-egg-remainders': 'sunzi-multipliers',   // left over in fours and in threes
  'old-crt-above': 'sunzi-multipliers',        // three remainders at once
  'yc-half-squares-area': 'out-in',            // move the half squares to make whole ones
  'old-grid-area': 'out-in',                   // a triangle is half its rectangle, by cutting and moving
  'old-cut-corners': 'out-in',                 // what is left when the corners are cut off
  'old-rect-point': 'out-in',                  // the two shaded triangles make half the rectangle
  'yc-ways-to-pay': 'hundred-fowls',           // count every whole answer of one equation, in order
  'old-sum-product': 'quadratic-split',        // known sum and product: x² − sx + p = 0
};
