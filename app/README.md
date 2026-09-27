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
| `src/games.js` | Overlay frame, shared `keypad()`, `numberRush`, `makeTarget` (+ `solve`, `makePuzzle`), `numberLine`. |
| `src/figs.js` | SVG figures: `jumps`, `area`, `grid`. |
| `src/views.js` | Every screen. |
| `src/main.js` | Boot, hash routing, the question runner, guided steps, contest driver, keys, all actions. |
| `src/store.js` | The seam: household + device buckets, versioned `migrate()`, backup/restore. |
| `src/ui.js` | From Finance: `esc`, dispatch, WebAudio `sfx`, `toast`, `confetti`, device `say`. |
| `sw.js` | From Finance: hashed assets cache-first, the rest network-first. |
| `public/avatars/` | 21 of Bizzing Bee's painted avatars (192px): the child's picker, Aryabhata, and the ten rivals. |
