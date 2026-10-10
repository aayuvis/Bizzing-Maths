# The chapter contract

Every world of the Number Atlas outside the first island is one file in `app/src/chapters/<world>.js`.
It exports `WORLD` and `TRICKS`, which `src/tricks.js` picks up; its `STORIES` live beside it in
`app/src/chapters/stories/<world>.js`, gathered by `src/story-data.js` — a chunk of their own that loads on
first need, never on first paint (the 400 KB first-load budget). Read `app/src/tricks.js` (the first 27 stops) before writing one: they are the house style.

**The first screen carries a chapter's data, not its code** (audit v4 R2, `app/vite-light.mjs`). In the
browser build tricks.js sees each chapter as its `WORLD` and `TRICKS` with every function replaced by a
stub; the real chapter arrives with the first stop opened (`loadEngine()`, `src/chapters/full.js`).
So a stop's data fields must survive JSON exactly — no `undefined`, `NaN`, getters, `Date`s or class
instances — or the build stops and says which field. A new chapter is added to `full.js` as well as to
tricks.js; `test/light.mjs` fails one that is in one and not the other.

The two tests that decide whether a chapter ships:

```bash
cd app && node test/tricks.mjs && node test/stories.mjs
```

**Never loosen a test to make a chapter pass.** Fix the generator, the steps or the story.

## WORLD

```js
export const WORLD = {
  id: 'bakery', name: 'The Fraction Bakery', short: 'Bakery',
  band: '8-10',                      // the YOUNGEST band any stop in this world is for
  blurb: 'One sentence a child reads on the map.',
  tint: '#FFF1DC', ink: '#8A4B00',   // a pale page tint and a dark ink that reads on it (≥ 4.5:1)
  glyph: '🥧',                       // one emoji for the pin
};
```

## TRICKS — one object per stop (6 to 10 per world)

A stop teaches ONE idea. Its fields, all required unless marked:

| field | what |
|---|---|
| `id` | unique across the whole app, kebab-case (`fraction-of-amount`) |
| `world` | the WORLD id |
| `band` | `'6-7'`, `'8-10'` or `'11-14'` — who the stop is for. Order stops youngest-first inside a world. |
| `title` | short, friendly (`Fractions of an amount`) |
| `hook` | a question the child cannot yet do easily (`3/4 of 20 — without drawing twenty things?`) |
| `idea` | the method in ONE sentence |
| `why` | array of **2–3 paragraphs**: why it is true, in plain words a 9-year-old can follow. This is the product. |
| `alg` | the general rule as a line of algebra or a formula (`(a/b) of n = (n ÷ b) × a`) |
| `ex` | the example the Learn tab teaches from — the argument object for `q()` |
| `q(args)` | builds a question from arguments. Returns `{ text, expr, ans, ...args }` (see below). Pure. |
| `gen(r, lv)` | returns `this.q({...})` with random arguments from `r` (a 0..1 generator — use `int(lo, hi, r)` and `pick(arr, r)` from `../rand.js`). Three levels: 1 easy, 2 medium, 3 stretch. |
| `work(q)` | the method as STEPS: `[{ t: 'what to do', v: value, x: 'plain arithmetic' }, ...]`. The child types each `v` on the "Your turn" tab. The LAST step's `v` is the answer. 2–5 steps. **Every step but the last carries `x`**: its value as a JS expression on the question's own numbers (`` `${a}*${b}` ``, `` `${n}%9` ``, `` `${a}>${b}?'Yes':'No'` ``), written from the step's plain meaning — a second route, never the trick's running variable. `test/lib/steps.mjs` evaluates it against `v`. |
| `draw(q)` *(optional, strongly wanted for shape, measure, fraction, data and set worlds)* | returns an SVG string built with `./kit.js` — the picture the question is about. Must not reveal the answer. |
| `geo(q)` + `explain` *(optional, for area, perimeter, volume, angle and solid stops)* | `geo(q)` returns a spec for `src/geo3d.js` built from the question's own numbers (or `null` for a question it has no picture for); `explain` is imported from geo3d.js and set on the stop as is. The explainer must measure the same answer from its geometry and show every number of `work(q)` — `test/geo3d.mjs` checks both, and that its ask mode shows nothing the question does not. Add the stop to that test's `WIRED` list. |
| `fig(q)` *(optional)* | existing figure kinds for the Learn tab: `{kind:'jumps',from,jumps}`, `{kind:'area',h,parts}`, `{kind:'grid',a,b}` |
| `keys` *(optional)* | extra keypad keys the answers need: any of `'.'`, `'−'`, `'/'` |
| `decimals` *(optional)* | `true` if answers or steps may be non-whole numbers |
| `sutra` *(optional)* | only for real Vedic sutras — don't add new ones |
| `sources` *(optional)* | array of citations if the stop states ANY historical fact (a date, a person, an origin). Never write history from memory; if unsure, leave the history out. |

### The question object

```js
{ text: '3/4 of 20', expr: '20/4*3', ans: 15 }
```

- `text` — what the child sees. Use `×` `÷` `−` (real minus) and `²` `³`. **It must never contain the answer.**
- `ans` — one of:
  - **a number** (whole, decimal, or negative). Decimals need `decimals: true` and `keys: ['.']`; negatives need `keys: ['−']`.
  - **a fraction string** `'3/4'`, with `frac: true` on the question and `keys: ['/']`. Add `simplest: true` if only the simplest form counts (e.g. "simplify 6/8"). Mixed numbers: ask for an improper fraction or a whole-number part.
  - **a choice**: `choices: ['Yes', 'No']` or `['acute', 'right', 'obtuse']` (2–4 options) with `ans` one of them. Use choices for names (shapes, angle types, likely/unlikely), comparisons (`>`, `<`, `=`), and anything not typeable. Keep the answer's position random (shuffle), and keep options plausible.
- `expr` — the answer computed a DIFFERENT way, as a JavaScript expression evaluated with `Function('return (' + expr + ')')`. For a number or fraction answer it must evaluate to the same number (`'3/4'` ⇔ `0.75`). For a choice it must evaluate to the choice string (`"a%b===0?'Yes':'No'"`). This is the independent check — never just paste `ans` into it.
- `say` *(optional)* — how to read it aloud if `text` reads badly (`'three quarters of twenty'`).
- `input` *(optional, set by `gen()` on SOME questions)* — answer by building instead of typing (`src/widgets.js`).
  The answer is still the value above, judged by `correct()`; the widget only builds it.
  - `'fracbar'` — cut a bar into equal parts (up to 12) and shade some. Hands in `'k/n'`, or with
    `bar: { give: 'k', lockN }` the shaded count over given parts, or `bar: { give: 'n', lockK }` the parts
    for given shading.
  - `'blocks'` — hundreds, tens and ones, 0–9 of each: a whole number 0–999.
  - `'chart'` — tap a bar, row or dot. Needs `choices` (in chart order) and the stop's `hits(q)`, measured
    from the same layout as `draw(q)`: `{ w, h, hits: [{ label, x, y, w, h }] }`.
  - `how` — one short line the widget shows ("Tap the bar."). Keep it out of `text`: the same question is
    typed everywhere else (contest, feed).
  `test/widgets.mjs` fails a widget question that cannot build its answer, starts on it, or taps the wrong bar.
  Show it in Learn by putting `input` on one case's `ex`.
- Time answers: ask for minutes (`ans: 45`), or use choices (`'3:45'`). Money: whole units or decimals with `decimals:true`.

## One worked example per idea — `cases` (every stop is audited)

Learn used to teach from ONE example (`ex`), so a stop that teaches three ideas — equilateral,
isosceles AND scalene — only ever explained one. Now every stop declares its audit:

- **One idea** (the method is the same for every question the drill can ask): `oneIdea: true`.
- **Several ideas**: `cases` — one worked example per idea, which Learn clicks through in order
  ("3 ideas in this stop · 1 of 3"), each with its own picture, steps and answer — and `caseKey`.

```js
caseKey: 'ans',            // or a question field ('mode', 'kind'), or an array of them
cases: [
  { label: 'Equilateral', note: 'All three sides the same — so all three angles are 60°.',
    ex: { mode: 'sides', s: [6, 6, 6], opts: [...] } },          // ex is the argument object for q()
  ...
],
```

- `label` ≤ 28 characters; `note` is ONE or two sentences saying what is special about this idea
  (the `why` paragraphs still carry the reasoning for the whole stop).
- `caseSig(q)` = the values of `caseKey` on a question. **The test fails if the drill can generate a
  question whose signature no case shows** — so a drill can never ask about an idea Learn skipped —
  and if two cases show the same signature. If the idea that differs is not already a field on the
  question object, add one in `q()` (e.g. `side: 'below'`) and use it as the key.
- Cosmetic variety (the item bought, the colour on a spinner, the names in a Venn diagram) is NOT an
  idea — do not key on it. A different method, a different kind of answer, a different rule, a
  different direction (up/down, × / ÷), a different question about the same picture — those are ideas.
- Order cases in teaching order, simplest first. The first case is the one Learn opens on.

### Rules the tests enforce

- the last step equals the answer; every step value is typeable (whole number, or decimal if `decimals`, or a fraction string, or a choice);
- `expr`, `ans` and the trick's last step agree on ~2,100 generated questions per stop (700 at each level);
- the prompt never contains the answer as a separate number (set `echo: true` on a stop ONLY if the answer legitimately repeats a given, e.g. "round 5 to the nearest 10");
- `draw()` returns clean SVG (no `undefined`, no `NaN`);
- at least 6 stops per world; `why` has at least two paragraphs.

## STORIES — one per stop, keyed by the stop id

```js
export const STORIES = {
  'fraction-of-amount': { title: 'Sharing the laddoos', scene: 'bakery', cast: ['koi', 'beaker'], beats: [
    { who: null, say: 'Narration sets the scene with the real numbers.', add: { t: '3/4 of 20' } },
    { who: 'koi', say: 'A character line (≤ 170 characters).' },
    { who: 'beaker', say: 'Another, with working on the notepad.', add: { t: '20 ÷ 4', v: 5 } },
    ...
    { who: 'koi', say: 'The closing line lands the idea.', add: { t: '3/4 of 20', v: 15 } },
  ] },
};
```

- 5–8 beats. The first is the narrator (`who: null`). Every `who` is one of the two in `cast`.
- `cast`: two of the Bee's ten rivals — the same children across the whole house. Pick the one whose
  character fits the idea:
  `pixel` Pip (8, quick, impulsive) · `koi` Nova (9, steady, knows her tables) · `beaker` Rafi (10, takes
  numbers apart) · `panda` Suki (11, calm, unshakeable) · `comet` Dax (11, fast then flustered) ·
  `astro` Mira (12, squares and shapes) · `scopey` Theo (12, checks everything) · `melody` Ines (13,
  percentages, fractions, money) · `samurai` Kwame (14, near a hundred, algebra) · `goldlegend` Vesper
  (15, says little, always right).
- `scene`: one of `garden festival bus library cricket market hall train kitchen fair pond night stadium
  harbour shop room bakery clock city forest palace carnival beach`.
- **The notepad is checked**: every `add: { t, v }` must evaluate — `t` may use digits, `+ − × ÷ ( )`,
  `.`, `,` in thousands, `x% of y`, and `/` as division (`'3/4 of 20'` is NOT evaluable — write it
  `'20 ÷ 4 × 3'`, or leave `v` off for a line that only states the question). The last checked line must be
  the story's answer.
- Ordinary life, various places and families, nobody a stereotype. Stories are fiction and are labelled as
  stories by the app. No real people, no history.

## Voice

British spelling (colour, maths, centre), plain and warm, second person to the child in `hook`/`idea`,
short sentences. The `why` is the heart: say *why* the method must work, often with a picture in words
("imagine the rectangle cut at 10…"), then the algebra line in `alg` for the curious.
