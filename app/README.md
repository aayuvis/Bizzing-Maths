# app/ — Bizzing Maths

Vanilla ES modules + Vite, `state → render()` returning a string, clicks dispatched by
`[data-act]` — the Bizzing Bee idiom, on Bizzing Finance's architecture.

```bash
npm install
npm run dev        # Vite on :5173
npm test           # tricks (3 routes × ~57k questions), facts, contest, puzzles, model
npm run build      # -> build/, relative base, drops onto any static host
npm run check      # drives build/ under /Bizzing-Maths/ in Chromium, desktop + phone
./deploy.sh        # test + build + publish gh-pages
```

## Module map

| file | what it owns |
|---|---|
| `src/tricks.js` | `WORLDS` (5) and `TRICKS` (27). Each chapter: `hook`, `idea`, `work(q)` steps, `why`, `alg`, `gen(r, lv)`, `q()`, optional `sutra`, `fig`. `drill()`, `correct()`. |
| `src/facts.js` | `BANK` (434 facts), `tricky()`, `why()`, `ramp()`, Leitner `record()`/`state()`, `session()` (discovery for a new child, then traps → due → ≤4 new → known). |
| `src/model.js` | Household/kid shape, `RANKS`, `ROUTE`, `frontier()` (skips nodes optional for the child's band or placement), `isOpen()`, `scoreRun()` stars, `RUNGS` + `placeFrom()`. |
| `src/contest.js` | `RIVALS` (the Bee's ten), the hardness ladder, `playRound()`, `championship()`, `runOut()`. |
| `src/games.js` | Overlay frame on a painted plate (`public/art/g-*.webp`), the Family Standard §10 kit (title card + 3-second how-to, pop particles, wobble, a display-only combo meter, a finish screen naming what was practised), shared `keypad()`, `numberRush`, `makeTarget` (+ `solve`, `makePuzzle`), `numberLine`, `sudoku`. Styles in `styles/games.css`. |
| `src/figs.js` | SVG figures: `jumps`, `area`, `grid`. |
| `src/views.js` | Every screen. |
| `src/main.js` | Boot, hash routing, the question runner, guided steps, contest driver, keys, all actions. |
| `src/store.js` | The seam: household + device buckets, versioned `migrate()`, backup/restore. |
| `src/ui.js` | From Finance: `esc`, dispatch, WebAudio `sfx`, `toast`, `confetti`; `say`/`hush` re-exported from voice.js. |
| `src/voice.js` | Read-aloud in the device's own voice (en-IN first), given words from voice-text.js so maths is said, not spelled. Silent when muted. |
| `src/voice-text.js` | The tokeniser: text → words a child is taught ("three quarters", "seven times eight", numbers in full, clock times, units). |
| `src/lines.js` | The fixed sentences a child hears (Nova's onboarding lines, the wrong-answer reply). |
| `sw.js` | From Finance: hashed assets cache-first, the rest network-first. |
| `public/avatars/` | 21 of Bizzing Bee's painted avatars (192px): the child's picker, Aryabhata, and the ten rivals. |

## Narration

Read-aloud is the device's own voice — the owner's choice, so there are no clips to record, ship
or keep. It is on by itself for a 6–7 child (`model.js readOn`: a grown-up's choice wins; until one
is made it follows the band), and a 🔊 on every question (or `R`) for everyone. `voice-text.js`
turns the maths into words first, and `test/voice.mjs` (in `npm test`) samples every stop on
journey levels 1–3 plus the whole facts bank and the fixed lines (`test/young.mjs`) and fails if
any of them would hand the voice a maths symbol.
