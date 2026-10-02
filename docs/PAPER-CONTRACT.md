# The Contest Hall contract

The Contest Hall is the app's contest-preparation track: three **strategy worlds** (thirty stops
that each teach one way into a non-routine problem) and the **paper simulator** (contest-style
papers, multiple choice A–E, three sections worth 3, 4 and 5 points). It is labelled
"contest-style" everywhere — never the name of a real competition, whose papers and names are
not ours to use. Every problem is GENERATED and PROVED, like every puzzle in the app.

## The thirty strategy stops (fixed ids — the problem bank tags against these)

Each is an ordinary Atlas stop and follows [CHAPTER-CONTRACT.md](CHAPTER-CONTRACT.md) to the
letter (q / gen / work / expr / cases or oneIdea / why / story). Worlds carry `track: 'contest'`.

**`strategy` — The Strategy School** (ways in that work on almost anything)
`work-backwards` · `guess-check-improve` · `make-a-table` · `find-the-rule` · `bar-model` ·
`heads-and-legs` · `age-problems` · `simpler-case` · `meeting-and-overtaking` · `units-digit-cycles`

**`logic` — The Logic Labyrinth** (reasoning about what MUST be true)
`parity` · `pigeonhole` · `worst-case` · `truth-tellers` · `list-systematically` · `invariants` ·
`calendar-days` · `digit-puzzles` · `remainder-puzzles` · `missing-digit-divisibility`

**`figures` — The Figure Fair** (counting and shapes that need a second look)
`count-triangles` · `count-rectangles` · `grid-paths` · `handshakes` · `overlapping-groups` ·
`area-cut-and-move` · `staircase-perimeter` · `painted-cubes` · `angle-chasing` · `dice-faces`

## A problem template (app/src/papers/bank-*.js)

```js
export const TEMPLATES = [
  {
    id: 'legs-on-the-farm',                 // unique across every bank
    bands: ['g34', 'g56'],                  // g12 (grades 1–2), g34, g56, g78
    tier: 4,                                // 3 = the warm-up section, 4 = middle, 5 = the hardest
    topic: 'number',                        // number · counting · geometry · logic · patterns · measure
    strategy: 'heads-and-legs',             // one of the thirty stop ids above: where the review sends a miss
    make(r, band) {                         // r: a 0..1 generator (use int/pick from ../rand.js)
      // choose parameters so the problem has EXACTLY one answer
      return {
        text: 'A farm has hens and goats: 10 heads and 28 legs. How many goats?',
        ans: 4,                             // a number (whole, or a short decimal) or a short string
        wrong: [6, 5, 3, 14, 8],            // ≥ 4 PLAUSIBLE wrong answers, ideally from real mistakes
        why: 'If all 10 were hens there would be 20 legs; each goat adds 2 more, and 8 more legs is 4 goats.',
        fig: undefined,                     // optional SVG (use ../chapters/kit.js); never shows the answer
        params: { heads: 10, legs: 28 },
      };
    },
    solve(params) {                         // an INDEPENDENT method — brute force wherever possible
      const out = [];
      for (let g = 0; g <= params.heads; g++) if (2 * (params.heads - g) + 4 * g === params.legs) out.push(g);
      return out;                           // every answer that satisfies the problem
    },
  },
];
```

**Rules the bank test enforces (`test/papers.mjs`, never loosen it):**

- `solve(params)` returns exactly `[ans]` — one answer, and it is the stated one — on every one of
  ~300 generated problems per template per band. `solve` must not reuse `make`'s arithmetic: enumerate,
  simulate, or count, so a slip in `make` is caught rather than copied.
- at least four distinct `wrong` values, none equal to `ans`; the engine picks four and shows the
  five choices sorted (numbers ascending), so position never leaks the answer;
- `text` never contains the answer as a separate number, unless the template sets `echo: true`
  with a comment saying why;
- `why` is one to three sentences a child of that band can follow;
- `fig` is clean SVG (no `undefined`, no `NaN`) and does not contain the answer;
- numbers are sized for the band (g12 answers under 100, mostly under 30; g34 under 1,000);
- `strategy` is one of the thirty ids; `tier` is 3, 4 or 5; `bands` are from g12 g34 g56 g78.

**Coverage each band must reach** (the test checks it): at least 12 templates at each tier, from
at least four topics, so a 30-question paper never repeats a template.

## The papers (app/src/papers/engine.js)

| band | questions | sections | time |
|---|---|---|---|
| g12 (grades 1–2) | 18 | 6 × 3 pts, 6 × 4 pts, 6 × 5 pts | 60 min |
| g34 (grades 3–4) | 24 | 8 × 3, 8 × 4, 8 × 5 | 75 min |
| g56 (grades 5–6) | 30 | 10 × 3, 10 × 4, 10 × 5 | 75 min |
| g78 (grades 7–8) | 30 | 10 × 3, 10 × 4, 10 × 5 | 75 min |

Scoring is the contest style: you start with as many points as there are questions; a right answer
adds its points, a wrong answer loses a quarter of them, a blank costs nothing — so a child learns
that a guess has a price. Papers 1–60 in each band are FIXED (seeded by band and number, the same in
every house); "a fresh paper" is unlimited. After a paper, every miss is reviewed with its worked
solution and a link to the strategy stop that teaches the way in.
