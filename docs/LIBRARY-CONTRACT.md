# The Library contract

Every Library tool is one file, `app/src/library/<id>.js`, registered in `app/src/library/index.js`.
The host (`main.js` `libCtx`, `views2.js` `viewTool`) draws the page head and back button and passes
the tool a context. The tool draws everything below it.

Test: `cd app && node test/library.mjs` (plus `npm test` for the whole app). **Never loosen a test.**

## Exports

```js
export const TOOL = { id: 'explorer', name: 'Number Explorer', blurb: 'One line for the tile.', art: 'lib-explorer' };
export function view(ctx) { return '<div>…</div>'; }        // required: HTML string, from ctx only
export function act(name, arg, ctx) { … }                    // required: handle a button (host re-renders after)
export function key(e, ctx) { return false; }                // optional: keyboard; return true if handled
export function done(run, ctx) { return { stars, lines, buttons }; } // optional: summary after a drill you started
export const CSS = `.t-explorer-… { … }`;                    // optional: styles, every class prefixed t-<id>-
export function selftest(ok, makeCtx) { … }                  // required: prove your maths (see below)
export const JOURNEY = [ … ];                                 // journeys only (see below)
export const CARDS = [ … ];                                   // formula book only (see below)
```

## The context `ctx`

| field | what |
|---|---|
| `ctx.ui` | this screen's state (an object you own; survives re-renders, not reloads) |
| `ctx.data` | the child's saved record for this tool (an object you own; call `ctx.save()` after changing it) |
| `ctx.kid` | the child (read `band`: `'6-7'`, `'8-10'`, `'11-14'`; `facts`; `tricks` for Atlas stars) — read only, except via the helpers |
| `ctx.band` | the child's age band |
| `ctx.save()` | persist `ctx.data` |
| `ctx.render()` | re-render now (after an async step) — normally the host re-renders after `act`/`key` |
| `ctx.toast(msg)`, `ctx.sfx.good()`/`.bad()`/`.click()`/`.level()`, `ctx.confetti(n)`, `ctx.say(text)` | feedback |
| `ctx.keypad(keys)` | the app's on-screen keypad HTML (keys: extra `'.'`, `'−'`, `'/'`) — only inside a drill |
| `ctx.F` | the facts module (`key`, `text`, `answer`, `tricky`, `why`, `state`, `blank`, `record`, `session`, `STATE_LABEL`) |
| `ctx.record(fact, right, ms)` | record a fact answer into the child's fluency record (shared with the rest of the app) |
| `ctx.tick(right, xp)` | a right answer moves the child's rank (xp 1–5). Only for right answers the child produced. |
| `ctx.startRun(title, items, extra)` | start a drill in the app's runner. Items are questions `{ text, ans, expr?, choices?, keys?, frac?, html?, why?, explain?, fact? }`. A `fact: {op, a, b}` is recorded to fluency automatically. When it ends, your `done(run, ctx)` is called (`run.results[i].right`, `run.items`, and any `extra` you passed, e.g. `extra.level`). |
| `ctx.openStop(stopId)` | open an Atlas stop (ids from `import { TRICKS } from '../tricks.js'`) |
| `ctx.go(nav, arg)` | navigate (`'lib', '<toolId>'` to another tool) |

## Buttons, inputs, keys

- A button: `<button class="btn" data-act="lib" data-arg="name|arg">` → `act('name', 'arg', ctx)`.
- A text input: `<input id="t-explorer-n" data-lib-input="n" value="${esc(ctx.ui.n || '')}">` → `ctx.ui.n` is
  set and the page re-renders ~90 ms later; the host restores focus and caret by `id`, so give every
  input a stable, unique id. Inputs must also accept Enter via `key()` if it means something.
- **Every interaction must work by touch AND by keyboard** (the family's hard rule). Buttons are
  keyboard-reachable already; anything drag-based (protractor, graph points) needs arrow keys too.
- Use the app's shared classes where they fit: `card`, `btn`, `btn primary`, `btn small`, `seg` (a
  row of toggle buttons; `.on` marks the chosen one), `chip`, `kicker`, `muted`, `row gap`, `two`.
  Colours only from CSS variables (`--ink`, `--muted`, `--surface`, `--surface2`, `--line`, `--action`,
  `--action-tint`, `--treasure`, `--mastered`, `--fix`, `--medium`) so light and dark both work.
- Drawings: `import * as kit from '../chapters/kit.js'` (svg, text, fracBar, pie, clock, poly, rect,
  angle, barChart, venn, numberLine, grid, coords, dots, cuboid) or your own SVG with `dg-*` classes.
- Escape any text you did not write (user input) — use your own `esc()`.

## selftest(ok, makeCtx)

`ok(condition, message)`. `makeCtx(id, band)` gives a fresh fake context whose `startRun` pushes to
`ctx.runs`. Prove the maths the tool shows is TRUE, independently of how the tool computed it: e.g. every
factor pair multiplies back to the number; a worked method's last line equals `eval` of the expression;
a point the grapher plots satisfies y = mx + c; a level unlocks exactly at the threshold and not before.
Call `act` and `view` on a fake ctx to test the flows. Aim for dozens to hundreds of assertions.

## JOURNEY (Vedic and Chinese tools)

```js
export const JOURNEY = [
  { id: 'rod-numerals', title: 'Counting with rods', cards: ['paragraph', 'paragraph', …],
    sources: ['A real, checkable citation'],       // REQUIRED if the step states any historical fact
    gen(r, lv) { … return { text, expr, ans, choices?, keys?, frac? } },   // optional try-it questions
    work(q) { return [{ t, v }, …] },                                       // optional steps, last v = ans
  },
];
```
The harness checks every generated question three ways (answer, `expr`, last step) at three levels, and
that no prompt shows its answer. **Never write history from memory** (a family rule): every date,
person or origin claim is cited in `sources`, dates are given as the sources give them ("usually dated
to…"), and anything uncertain is left out. Present each tradition from the inside, with respect, and
never rank traditions against each other.

## CARDS (Formula Book)

```js
export const CARDS = [{ id: 'area-rectangle', title: 'Area of a rectangle', formula: 'A = l × w',
  topic: 'Measurement', picture(ctx) { return kit.rect(6, 4) }, why: ['…'], example: '…', stops: ['area-rectangles'],
  story: { title, scene, cast: ['koi', 'beaker'], beats: [{ who: null, say, add: { t, v } }, …] } }];
```
Story rules are the Atlas's (docs/CHAPTER-CONTRACT.md): two of the Bee's ten rivals (`pixel koi beaker
panda comet astro scopey melody samurai goldlegend`), 4–7 beats, first beat the narrator, every
`add: {t, v}` must evaluate (`+ − × ÷ ( ) . , x% of y`). `stops` must be real Atlas stop ids.

## Voice

British spelling, plain and warm, short sentences, second person to the child. Nothing leaks an answer
in a practice question. No generated lettering in images (there are none here — drawings are SVG).
