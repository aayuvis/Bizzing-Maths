/* cubes.js — Cube Builder's puzzles and the solver that proves them (CLAUDE.md rule 8).

   A puzzle is three views of a stack of cubes on a square grid:
     · FRONT — for each column (left to right), the tallest stack in it, seen from the front;
     · SIDE  — for each row, the tallest stack in it, seen from the RIGHT (so the front row is
               drawn on the left of the side view, the back row on the right);
     · TOP   — which squares have any cubes at all.
   The child builds a stack by raising and lowering columns; it is solved when all three views
   of what they built match. A stack is stored as heights h[r * n + c], row 0 at the BACK.

   Nothing here is typed by hand except a stack per puzzle (BANK): the views are measured from
   it, and `solve()` searches EVERY stack the views allow, so the test can prove each puzzle has
   a solution, how many there are, and the fewest cubes any of them needs. test/games.mjs runs
   a second, plain brute force (every height in every square) and the two must agree.

   Difficulty is trickiness, not size (rule 2): the grid is 3 × 3 at every level, and what
   climbs is how much the views leave open — how many stacks fit them, and how far the fewest
   is below the most.
     1 "One way"      — the views allow exactly one stack. Read them and build it.
     2 "Many ways"    — 3 to 40 stacks fit; any one solves it, and the FEWEST cubes is a third
                        star. Exactly one stack is the fewest, so "Show me" has one answer.
     3 "Hidden cubes" — 50 or more stacks fit, towers up to 4 high, and the fewest is at least six
                        cubes below the most: most of what the views show could be hidden. */

export function viewsOf(h, n) {
  const front = Array.from({ length: n }, (_, c) => Math.max(...Array.from({ length: n }, (_, r) => h[r * n + c])));
  const side = Array.from({ length: n }, (_, r) => Math.max(...h.slice(r * n, r * n + n)));
  const top = h.map((v) => (v > 0 ? 1 : 0));
  return { n, front, side, top };
}
export const sameViews = (a, b) => a.n === b.n && a.front.join() === b.front.join() && a.side.join() === b.side.join() && a.top.join() === b.top.join();
export const count = (h) => h.reduce((s, v) => s + v, 0);

/* Every stack the views allow, by depth-first search. A square the top view leaves empty holds
   nothing; a square it fills holds 1 … min(its column's front height, its row's side height) —
   anything taller would show in a view. A row is checked as soon as it is complete, every column
   at the end. Returns how many stacks fit, the fewest and most cubes, and every fewest stack. */
export function solve(v, cap = 1e6) {
  const { n, front, side, top } = v;
  const h = new Array(n * n).fill(0);
  let ways = 0, min = Infinity, max = -Infinity, mins = [];
  (function go(i, sum) {
    if (ways >= cap) return;
    if (i === n * n) {
      for (let c = 0; c < n; c++) { let m = 0; for (let r = 0; r < n; r++) m = Math.max(m, h[r * n + c]); if (m !== front[c]) return; }
      ways++; max = Math.max(max, sum);
      if (sum < min) { min = sum; mins = [h.slice()]; } else if (sum === min) mins.push(h.slice());
      return;
    }
    const r = Math.floor(i / n), c = i % n;
    const hi = top[i] ? Math.min(front[c], side[r]) : 0, lo = top[i] ? 1 : 0;
    for (let x = lo; x <= hi; x++) {
      h[i] = x;
      if (c === n - 1 && Math.max(...h.slice(r * n, r * n + n)) !== side[r]) continue;
      go(i + 1, sum + x);
    }
    h[i] = 0;
  })(0, 0);
  return ways ? { ways, min, max, mins } : { ways: 0, min: null, max: null, mins: [] };
}

export const LEVELS = {
  1: { n: 3, hmax: 3, name: 'One way', blurb: 'The three views fit exactly one stack.' },
  2: { n: 3, hmax: 3, name: 'Many ways', blurb: 'Several stacks fit. The fewest cubes earns the third star.' },
  3: { n: 3, hmax: 4, name: 'Hidden cubes', blurb: 'Dozens of stacks fit. The fewest hides the most.' },
};
/* the promise each level makes, checked by test/games.mjs against the solver */
export function levelHolds(lv, s) {
  if (!s.ways) return false;
  if (lv === 1) return s.ways === 1;
  if (lv === 2) return s.ways >= 3 && s.ways <= 40 && s.max - s.min >= 2 && s.mins.length === 1;
  return s.ways >= 50 && s.max - s.min >= 6 && s.mins.length === 1;
}
export const bandLevel = (band) => (band === '6-7' ? 1 : band === '8-10' ? 2 : 3);

/* The bank: one FEWEST stack per puzzle, row 0 at the back. The views are measured from it;
   the test proves the views fit it, that it is the fewest (and, from level 2, the only fewest),
   and that the level's promise holds. Found by a search over random stacks (seeded), kept
   when the solver said the level's promise held; twelve per level. */
export const BANK = {
  1: [
    [1, 0, 0, 3, 0, 0, 3, 2, 1],
    [1, 2, 1, 0, 3, 1, 0, 0, 1],
    [0, 3, 1, 0, 0, 1, 2, 3, 1],
    [1, 0, 2, 1, 2, 3, 0, 0, 3],
    [3, 3, 3, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 3, 3, 3, 0, 0, 2],
    [1, 1, 3, 1, 0, 2, 0, 1, 2],
    [0, 1, 0, 3, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 3, 1, 2, 3],
    [0, 2, 0, 2, 3, 2, 0, 1, 0],
    [0, 2, 0, 2, 0, 0, 3, 3, 3],
    [1, 0, 0, 0, 0, 1, 3, 2, 2],
  ],
  2: [
    [1, 2, 3, 0, 0, 1, 2, 0, 1],
    [2, 1, 0, 1, 0, 2, 1, 3, 1],
    [1, 3, 1, 1, 0, 3, 3, 0, 0],
    [2, 0, 0, 0, 1, 3, 1, 2, 1],
    [1, 3, 1, 2, 0, 0, 0, 1, 2],
    [2, 0, 1, 1, 1, 3, 1, 1, 3],
    [3, 1, 1, 1, 2, 1, 1, 0, 0],
    [1, 0, 0, 1, 3, 1, 0, 1, 2],
    [2, 1, 1, 1, 3, 3, 1, 1, 1],
    [1, 3, 1, 0, 1, 1, 0, 1, 2],
    [1, 1, 2, 0, 1, 1, 3, 3, 1],
    [3, 1, 1, 0, 3, 1, 0, 1, 2],
  ],
  3: [
    [1, 4, 1, 1, 0, 4, 3, 1, 1],
    [1, 0, 2, 1, 4, 1, 3, 1, 0],
    [3, 1, 1, 1, 4, 1, 1, 0, 4],
    [4, 1, 0, 1, 3, 0, 1, 1, 4],
    [4, 0, 0, 1, 4, 0, 1, 1, 4],
    [1, 1, 4, 0, 3, 1, 3, 1, 1],
    [1, 1, 3, 2, 1, 1, 1, 4, 1],
    [0, 4, 1, 2, 1, 1, 1, 1, 3],
    [0, 1, 3, 1, 4, 1, 3, 1, 1],
    [1, 4, 1, 1, 1, 2, 3, 1, 0],
    [1, 4, 1, 3, 1, 1, 0, 0, 3],
    [4, 1, 1, 0, 0, 4, 1, 3, 1],
  ],
};

export function cubePuzzle(lv, i) {
  const L = LEVELS[lv], list = BANK[lv], h = list[((i % list.length) + list.length) % list.length];
  return { lv, n: L.n, hmax: L.hmax, answer: h.slice(), views: viewsOf(h, L.n), min: count(h) };
}
