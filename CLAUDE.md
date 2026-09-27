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
2. **Difficulty is trickiness, not size.** The Bee's founding idea, for numbers: 7 × 8 is
   harder than 12 × 12. `facts.js` `tricky()` is the ramp key and `why()` names the reason.
   Any new "hardest first" selection uses `tricky()`, never the size of the answer.
3. **Never leak the answer** — not in a prompt, not in a hint chip, not in a trick step's
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
| `app/src/tricks.js` | The 27 concept chapters in 5 worlds: hook, idea, `work()` steps, why, algebra, generator, figure. |
| `app/src/facts.js` | The fact bank (+ − × ÷), `tricky()`, `why()`, Leitner fluency, the 20-question session builder. |
| `app/src/model.js` | Household, child, ranks, the Atlas route and frontier, stars, placement. |
| `app/src/contest.js` | The Mock Contest — the Bee's same ten rivals, the Bee's elimination rules. |
| `app/src/games.js` | Number Rush, Make the Target (with a solver), Number Line; the shared keypad. |
| `app/src/figs.js` | The pictures of *why*: number-line jumps, area splits, the crosswise grid. |
| `app/src/views.js` · `main.js` | Every screen as `state → string`; routing, the runner, keys, `data-act`. |
| `app/src/store.js` | The seam. |

## Verify

```bash
cd app && npm install
npm test          # engine: tricks ×3 routes, facts, contest, puzzles, model
npm run build && npm run check   # drives the built app in Chromium, desktop + phone
```

## Ship

`cd app && ./deploy.sh` — runs the tests, builds, replaces `gh-pages` wholesale, refuses to
publish if the staged file count differs from the build. Commit the source to the working
branch first.

## Commit trailer

```
Co-Authored-By: Claude <noreply@anthropic.com>
```
