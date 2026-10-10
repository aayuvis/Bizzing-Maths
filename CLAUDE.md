# CLAUDE.md — Bizzing Maths

Read this first, then [CONCEPT.md](CONCEPT.md), then [app/README.md](app/README.md).

## What this is

**Bizzing Maths** — a drill-and-reason web app for kids **6–14**: fact fluency, mental maths,
and the Vedic methods, each taught with *why it works*. Fourth app in the Bizzing family, after
[Bizzing Bee](https://github.com/aayuvis/Bizzing-Bee) (spelling), [Bizzing India](https://github.com/aayuvis/bizzingindia.com)
(culture & Hindi) and [Bizzing Finance](https://github.com/aayuvis/bizzingfinance) (money).
The strategy deck's promise for it, verbatim: *a child who is fast and fearless with numbers,
and knows why the trick works.*

**Live:** <https://aayuvis.github.io/Bizzing-Maths/> — served from the root of `gh-pages`.

## Working style (the user's pace)

Inherited from Bizzing Bee, India and Finance, and it holds here:

- **Work autonomously.** Move through the whole request list without stopping to confirm
  routine steps. Stop only for a real fork, a destructive or outward-facing action, or
  missing information you genuinely can't infer.
- **Multitask.** Background long jobs; make independent edits and searches in parallel.
- **Bias to action, then verify.** Verify headlessly (`npm test`, `npm run check`) rather
  than asking the user to check.
- **Batch and ship.** Group related edits into one commit with a clear message.
- **Keep reasoning tight.**

## Hard rules

### Maths (the ones specific to this app)

1. **The trick and the arithmetic must agree, every time.** Every chapter in `src/tricks.js`
   carries `work(q)` (the trick as steps), `q.ans`, and `q.expr` (plain arithmetic).
   `test/tricks.mjs` runs ~57,000 generated questions through all three. A trick that is
   wrong one time in a thousand teaches a child that maths is unreliable. **Never loosen that
   test to make a chapter pass** — fix the generator.
   **Every MIDDLE step is checked too** (owner, 3 Oct 2026): each step but the last carries `x`, its
   value as plain arithmetic on the question's own numbers, and `test/lib/steps.mjs` evaluates it
   against `v` — for every stop and every Vedic and Chinese journey stone. `x` is a second route,
   never a copy of the trick's running variable; a bare number is refused.
2. **Difficulty is trickiness, not size.** The Bee's founding idea, for numbers: 7 × 8 is
   harder than 12 × 12. `facts.js` `tricky()` is the ramp key and `why()` names the reason.
   Any new "hardest first" selection uses `tricky()`, never the size of the answer.
3. **Hints stay as they are** (owner, 4 Oct 2026): one step for the 6–7 band, never the answer.
   **Never leak the answer** — not in a prompt, not in a hint chip, not in a trick step's
   label. Both test suites check it; it caught `144 ÷ 12 → "what times 12?"` and the halves
   `28 − 14`. Right answers are accepted the moment they are typed; wrong ones wait for Enter,
   so a child is never told "wrong" halfway through typing 56.
4. **Fluent needs a gap.** A fact climbs a Leitner box only when it is right, fast, *and due*.
   Five fast answers in one sitting are repetition, not memory. A miss drops ONE box and is
   reported as a lapse — never hidden, never a reset to zero.
5. **The "Vedic" label is honest.** The sutras come from Bharati Krishna Tirtha's 1965 book,
   not from any Vedic text scholars have found. The Observatory says so, with sources, and
   every sutra stop shows the algebra that makes it work. Never present them as ancient
   scripture, and never present them as less than they are.
6. **Never write history from memory.** The rank names carry one-line facts (Brahmagupta 628 CE,
   al-Khwarizmi, Aryabhata 499 CE). They are established; anything new needs a source, the
   same rule Bizzing India and Finance keep.
7. **Rank moves only with right answers**, never time on the app — the Bee's band rule. A rank
   that grows with minutes played would lie about the child.
8. **Every puzzle is proved before it is shown** (`src/puzzles.js`, `test/puzzles.mjs`). Cube
   nets by FOLDING — the rig reproduces the known result, 11 nets among 35 hexominoes — sudokus
   by a solver that finds exactly one answer, balance scales by trying every weight, Cube Builder's
   views by a solver that finds every stack they allow and the one stack with the fewest cubes, checked against a plain
   brute force (`src/cubes.js`, `test/games.mjs`). A puzzle with two answers, or none, is a bug the
   child pays for.
9. **Every goal is measured from evidence** (`src/objectives.js`). "I can…" sentences in six
   strands; none is ticked for time spent or for visiting a screen. A goal for an older band
   shows as *coming later*, never as a failure. `test/objectives.mjs` proves each one moves.
10. **Worlds open by age band or by the place before them** (`model.js` `worldOpen`, `NEEDS`);
    stops open in order inside a world. Eighteen worlds cannot be one road — a six-year-old
    must reach Time and Money without first passing the Sutra Observatory.
11. **Answers can be whole, decimal, negative or fractions** (`parseNum`), each with the keys it
    needs on the keypad (`keys: ['.', '−', '/']`). A non-whole answer on a stop not marked
    `decimals` or `frac` fails the test — so a rounding slip cannot quietly become a "decimal".
12. **The story notepad is checked.** Every sum a character writes in `src/stories.js` is
    evaluated by `test/stories.mjs`. Stories star the Bee's same ten rivals and are labelled
    as stories.
13. **The Times Table Explorer grows only on mastery**: 5 → 10 → 15 → 20, one step at a time,
    when 9 in 10 of the level's facts are quick or fluent. The ×1 facts are drawn but not counted
    (they show their own answer, so they cannot be drilled) — a decision the owner confirmed.
14. **The journeys cite their history.** Every Vedic and Chinese stone carries `sources` and
    `needsReview: true` until a second reader has checked it; the screen says so.

15. **The thing itself comes first.** Every screen's core — the map, the board, the question,
    the tool — starts in the top third of a 1000×560 laptop window and a phone, and no page
    scrolls sideways. `test/fold.mjs` measures it from the live DOM (`npm run check`). A title,
    a subtitle and a summary card are not content; put explanations below the thing they explain.

### The family layer ([FAMILY-STANDARD](https://github.com/aayuvis/Bizzing_Schedule/blob/claude/amazing-knuth-4aemgz/docs/family/FAMILY-STANDARD.md))

16. **The chrome IS Bizzing Bee's** — `src/integration/bizzing-shell.js` + `styles/bizzing-shell.css`, copied
    byte for byte from Bizzing_Schedule: the bar (⬡ ☰ Octo+wordmark … search | coins theme 🔒 avatar ▾), the tab
    row (Home · Atlas · Library · Puzzles · Play · My Feed), the phone tab bar and the ☰ drawer in the family order, around
    EVERY screen (`views.js shell()`, wired once by `bindShell` in main.js). This app passes words, mascot, tabs
    and `--bz-*` colours only — never geometry. ⬡ hides only inside a timed contest question (`inRun`).
17. **Home IS Bee's three rows** (`home()`): greeting · daily ring (with "Your level") · number of the hour; the
    next stop (the ONE filled button, `#/continue`) · a second journey (the mistakes deck when something is due,
    else the Puzzle Tower); trick of the hour · a fact from the story of numbers; the footer. Nothing else on Home.
    `test/lib/shell-check.mjs` measures it against Bee at 1280×800 and 390×844, light and dark, and must return [].
18. **Bizzing coins only through `Family.earn`/`Family.spend`, avatars and worlds only through
    `Family.buyAvatar`/`Family.buyWorld`** (store.js wraps the family's own `src/integration/` files — copy them
    from Bizzing_Schedule, never edit them here; `test/avatars.mjs` compares them byte for byte). Standard events
    only; coins never touch xp. The 96 avatars are `avatars.js` (12 packs × 8, 2/3/2/1, `validate()` = []), every
    Legendary asks for a learning milestone first. A face may also be in a sibling's 96 (owner, 3 Oct 2026: the faces shared with Bee stay). Worlds 1–2 are free; 3–6 open with the family plan or 240 coins.
    The Extras are frames, road skins and bonus game modes (`extras.js`; bought once, at the printed price, never
    random). **Bonus modes stay paid** (owner, 3 Oct 2026): each is a new way to play a skill the Atlas already
    teaches free — never sell the teaching itself. Contest-paper SKINS are Extras too; a paid rival rematch is not
    (owner, 4 Oct 2026). **The daily challenge** pays a small fixed bonus once a day through a standard event
    (owner, 4 Oct 2026) — never a streak, never a nag, and a missed day costs nothing.
    The wallet history says every line in words (`k.coinNotes`).
19. **Medals come from evidence** (`medals.js`), each celebrated once (`seen`). Never for time or days.
20. **`?demo` and `?demo=try` never touch storage** — store.js has no `localStorage` in demo mode,
    and `Family.*` are no-ops. The sample is built by driving the engine (`demo.js`), never typed.
21. **The Hive's feed is written by the drop-in only** (`Family.track`, `Family.milestone`); the
    report card (`report.js`) reads it for TIME and never counts minutes as learning.

22. **Six worlds (§7)** — `themes.js` + `.wstage` in `styles/shell.css`: a painted day plate AND a separately
    painted night (`art/world-<id>-{day,night}[-s].webp`), three ambient layers, paused when hidden, frozen under
    reduced motion. One display face per world; the chrome is Hanken Grotesk, Fraunces and Sono everywhere,
    ≤ 250 KB of fonts before first paint (`test/themes.mjs`).
23. **No emoji in a control** (§9): every UI icon is SVG from `icons.js` (Bee's duotone set, extended);
    `glyph()` draws a data file's emoji as its icon. `test/standard.mjs` counts emoji in controls on every screen.
24. **Music is composed in code** (`music.js`, `music/CREDITS.md`): a loop per world, Home and the games,
    lazy-loaded on the first tap, ducked under effects and read-aloud, off in Calm mode. No new narration.
25. **Octo is the mascot** (`public/mascot/`, six poses): logo, icon, finishes, empty and error states — and,
    as Bee's Bizzy is, **a free Common avatar** (Counting Critters, `avatars/octo.webp`, the default face).
    The hello card shows the child's own face, one picture, never a face badged on Octo (owner, 5 Oct 2026). Aryabhata stays the ceremony elder. **The logo is ALL of Octo** (`octo-logo.webp`, made by
    `tools/art/process.py --logo` from the waving pose), never a crop — `test/standard.mjs` measures the
    logo's edges and fails on a flat cut.
    The avatar ▾ menu is Bee's: every child (✓ on the one playing) · My page — avatar, badges, collection ·
    Settings · + Add a child (grown-ups).

27. **The Contest Hall** ([docs/PAPER-CONTRACT.md](docs/PAPER-CONTRACT.md)): thirty strategy stops in three worlds
    (`track: 'contest'`) and contest-style papers — 60 fixed per grade band and unlimited fresh — every problem
    proved by an independent `solve()`. The strategies are also the **Contest thinking** land on every level
    from 4 (a seventh land; levels may run to 32 steps). The hall and its banks load on their own route.

28. **The deep methods of two traditions** (owner, 3 Oct 2026): the **Sutra Ladder** (`chapters/ladder.js`, 12 stops:
    straight division, duplexes, roots, cube roots, osculators, sutra equations, quadratics, pick-the-sutra) and the
    **Counting Court** (`chapters/court.js`, 11 stops: suanpan with complements, red and black rods, fangcheng, excess and
    deficit, out-in areas, Liu Hui, Sunzi multipliers, the Sea Island, the Hundred Fowls). Each is a concept with its own
    land on every road from Level 5 (Level 3–4 fold their first steps into a nearby land), placed by difficulty: a stop
    enters at lv 1 where its band allows and climbs to lv 3 by Level 10. That is why a level may now hold 9 lands and 42
    steps, and why no other topic gave up a revisit to make room. Every history line is cited and `needsReview: true`.
    `papers/methods.js` links a contest template to a Ladder or Court stop only when that method solves the SAME problem.

26. **My Feed ends, and nothing in it is typed** (FAMILY-STANDARD §6a; the LAST tab, after Play). `tools/build-feed.mjs`
    cuts every card from the corpus — each with a `src` that resolves and words found in it — into `app/src/feed/`
    (an index with no words, then one lazy group per journey level and one level-agnostic group; #/feed loads only the
    groups its session needs). Every card question is re-run through the app's own rules (trick, `ans` and `expr`
    agree; the prompt never shows its answer); no two cards' words are ≥ 80% the same. The family's engine
    (`integration/bizzing-feed.js`, never edited) ranks on the device by journey level, what was just done and what
    slipped; about twenty, then a finished card. Only a right answer pays, once, as `answer`. A grown-up can switch
    it off behind the PIN. Change the corpus → rerun `node tools/build-feed.mjs`.
    **Every card links to its THING, not the room** (owner, 3 Oct 2026): the stop on its tab and the worked idea
    or story beat it quotes, the word, the formula card, the stone, the fact, the game, the puzzle family, the
    level's road (main.js `deepen()`; a tool opens an item with `openItem()` or its `act('open')`). Each card
    also carries `where` and `more`, cut from the corpus like its words. `test/feed.mjs` fails a generic link. `test/feed.mjs` and
    `test/feed-ui.mjs` hold it.
    **Doubled** (owner, 10 Oct 2026): `tools/feed-more.mjs` cuts a second set AFTER the first, so no first-cut card changes —
    fresh contest-style problems proved by their template's `solve()` (never a fixed paper's), Beat the Machine's "which
    trick fits", a land's curious question, Explorer divisibility, missing-number and Beat the Timer forms (`#/timer/<theme>`),
    balance scales, word meanings, goals, medals, and more of each stop's questions and working. `test/lib/feed-more.mjs`
    proves each; nothing a card SHOWS (title, body, more, where, cta) may carry its answer. The quick number questions
    live in their own lazy group, `drill`; floor: 9,114 cards.

29. **The landing is Bee's shape, with REAL screenshots** (owner, 4 Oct 2026): `viewWelcome` + `src/landing.js` (lazy).
    Screenshots are captured from the built app by `tools/shots.mjs` — re-run it when a pictured screen changes —
    and load as they scroll near. Every number on the page is counted from the code (`data-n`, re-counted by
    `test/family-ui.mjs`). No testimonials (none exist; never invent one) and no prices until the owner sets them.
    The browser tab shows `public/favicon.svg`, Octo with no background square; the installed app icon keeps its square.
30. **The chapters load data-first** (audit v4 R2): the browser build gives `tricks.js` each chapter's data only
    (`vite-light.mjs`); the code arrives in one chunk (`chapters/full.js`) with the first stop. A new chapter goes
    in BOTH `full.js` and `tricks.js`; `test/light.mjs` holds them equal. Initial JS budget: `test/family-ui.mjs`.

### Art

- **Painted plates, composited characters.** `tools/art/gen.py` paints places only — no
  people, no lettering, no digits (a model letters well and counts badly, and this is a maths
  app). Characters are the Bee's avatars, placed by the app. The Atlas ROAD is SVG drawn by
  `views2.js` over the painting, so a pin never depends on where a model put a path.
- **Two prompt traps, both paid for:** naming the place ("THE TIMES MARKET") gets it lettered
  on a sign; asking for "a calmer middle band" gets a literal translucent rectangle. Name
  neither. Look at every plate before it ships (`tools/art/raw/`, gitignored), then run
  `tools/art/process.py` → `app/public/art/*.webp`.
- **`MAP_PINS` in views2.js are measured against `atlas.webp`.** Regenerate the map, re-measure.
- The Gemini key lives at `/root/.gkey` (mode 600, `GKEY_FILE` overrides). Never in the repo.

### Product & code (inherited from the family, non-negotiable)

- **Every game needs BOTH keyboard AND touch controls.** The keypad and the keyboard feed the
  same function (`padKey` in `main.js`).
- **A wrong answer holds until dismissed; a right one auto-advances.** (Bee UX log.)
- **Child data is minimal by construction**: first name, an *age band* (6–7 / 8–10 / 11–14),
  an avatar. Never a birthdate, surname, email, photo or location. Nothing is transmitted:
  no accounts, no analytics, no third-party scripts. The privacy page says so and it must
  stay true — update it FIRST if that ever changes.
- **No ads, no streak pressure, no loot.** A day with no play costs nothing.
- **All storage behind the `Store` seam** (`src/store.js`). Versioned: add a `vN_to_vN+1`
  step, never edit an old one.
- **State is a household**, not a child. A second child never inherits the first's facts,
  stars or rank (`test/model.mjs` checks it).
- **Tester mode opens gates; it never rewrites the child.**
- **Offline-first.** `sw.js` is Finance's: hashed assets cache-first, everything else
  network-first.
- **Never** put a real model identifier in commits, PRs, code, or any pushed artefact.

## The shape of it

| file | owns |
|---|---|
| `app/src/tricks.js` | The first island's 27 stops, plus the aggregator: `ORDER` (the road), `WORLDS`, `TRICKS`, answer parsing (`parseNum`, `correct`, `stepRight`). |
| `app/src/chapters/*.js` | One world per file — `WORLD`, `TRICKS`, `STORIES` — to [docs/CHAPTER-CONTRACT.md](docs/CHAPTER-CONTRACT.md). `kit.js` is the shared drawing kit (fraction bars, pies, clocks, shapes, angles, charts, Venn, coordinates). |
| `app/src/facts.js` | The fact bank (+ − × ÷), `tricky()`, `why()`, Leitner fluency, the 20-question session builder. |
| `app/src/model.js` | Household, child, ranks, the Atlas route and frontier, stars, placement. |
| `app/src/contest.js` | The Mock Contest — the Bee's same ten rivals, the Bee's elimination rules. |
| `app/src/games.js` | Number Rush, Make the Target (with a solver), Number Line, Cube Builder; the shared keypad. Every game is paid through `payout()` (model.js `WAGE`): one place decides what play is worth. |
| `app/src/cubes.js` | Cube Builder's puzzles: views measured from a stack, every fitting stack and the fewest cubes found by search. |
| `app/src/figs.js` | The pictures of *why*: number-line jumps, area splits, the crosswise grid. |
| `app/src/views.js` · `main.js` | Every screen as `state → string`; routing, the runner, keys, `data-act`. |
| `app/src/stories.js` | A story per stop, starring the Bee's rivals, with a checked notepad. |
| `app/src/puzzles.js` | The Puzzle Room: cube nets (folding rig), sudoku (unique), patterns, balance scales. |
| `app/src/objectives.js` | The mission and 19 measured goals in 6 strands. |
| `app/src/views2.js` | The painted Atlas map and world boards, the story stage, shelf, Puzzle Room, Goals. |
| `app/src/library/*.js` | The Library: nine tools (Number Explorer, Show Me the Working, Times Table Explorer, Shape Studio, Graphing, Dictionary, Formula Book, Vedic and Chinese journeys), one file each, to [docs/LIBRARY-CONTRACT.md](docs/LIBRARY-CONTRACT.md). Each proves its own maths in `selftest`; `test/library.mjs` runs them. |
| `app/src/store.js` | The seam (schema v4; `k.lib` holds each tool's record). |

## Verify

```bash
cd app && npm install
npm test          # engine: tricks ×3 routes, facts, contest, puzzles, model
npm run build && npm run check   # drives the built app in Chromium, desktop + phone
```

## Ship

Every push comes from ONE chat, on `claude/magical-ptolemy-a97qe0` (owner, 3 Oct 2026) — a second
session deploying its own copy once overwrote a day of work on the live site. Run `npm test` and
`npm run check`, commit, push, then `cd app && ./deploy.sh`: it builds and replaces `gh-pages`
wholesale in seconds (`--test` re-runs the suite first) and refuses to publish if the staged file
count differs from the build.

## Commit trailer

```
Co-Authored-By: Claude <noreply@anthropic.com>
```
