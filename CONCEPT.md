# Bizzing Maths — concept

*Fast and fearless with numbers — and knowing why the trick works.* Ages 6–14.

This is product 7 of 9 in the Bizzing strategy deck (*Numbers & the World* family, beside
Finance and Business). This document maps what the deck asked for to what was built, and
records the decisions the deck left open.

## 0. The objectives

**One aim: a child who can work with numbers quickly, confidently and in their head — and can
explain WHY each method works.** It is measured, in the app, as 19 "I can…" goals in six strands
(`app/src/objectives.js`, shown on the Goals page and in the grown-ups report):

| Strand | What it means | Measured by |
|---|---|---|
| ⚡ Facts at your fingertips | + − × ÷ facts recalled, not worked out | share of facts *fluent* (right, fast, and still fast a week later) |
| 🧠 Mental methods | make ten, split, round-and-fix, double-and-halve | Atlas stops passed per world |
| 💡 Knowing why | the child does the working and can say why it is true | *Your turn* finished; Observatory passed; stories read |
| 🧭 Number sense | estimation, checking, percentages, squares | Number Line score; Harbour passed |
| 🧩 Problem solving | patterns, logic, spatial, algebra — contest thinking | Puzzle Room: patterns, sudokus, nets, scales solved |
| 🏆 Contest ready | keeping your head against a clock and rivals | Mock Contest placing |

## 1. What the deck asked for, and what shipped

| The deck said | What shipped |
|---|---|
| **Why** — mental and competition maths are the largest category adjacent to spelling in this community; abacus and Vedic programmes already hold parents' attention. | The Vedic methods are a whole world of the Atlas (the Sutra Observatory), taught honestly — see §3. |
| **What** — fact fluency, mental-maths and Vedic techniques, then a decision on competition problems. | **Facts** (+ − × ÷, 434 facts), **27 trick chapters** in 5 worlds, and a **Mock Contest**. Competition problems: §4. |
| **How** — fact drills reuse the engine almost exactly. | The Bee's engine ideas, rebuilt on Finance's architecture: trickiness-not-size ramp, Atlas with stars and a frontier, concept chapters that teach then drill, a mock contest with the Bee's own rivals. |
| **Edge** — the only mental-maths product that also teaches the reasoning, using the Bee's concept-chapter model. | Every chapter: hook → the trick as numbered steps → **why it works**, with a drawn figure and the algebra → *Your turn* (the child types every step) → a 10-question drill. A wrong drill answer shows the trick worked on *that exact question*. |
| **Build** — a fact-fluency bank and a Vedic chapter set. | `facts.js` and `tricks.js`. |
| **Build** — numeric input and working-out capture, which the word engine never needed. | One keypad (touch) + keyboard across drills, games, contest and PIN. *Your turn* captures the working step by step, not just the answer. |
| Ages 6–14 · $149/yr (Maths · English · Finance line). | Three age bands (6–7, 8–10, 11–14) that set where the road starts, which facts come first, how long the contest timer runs and how big the game numbers are. Pricing is not built — §5. |

## 2. The engine, and what each piece is for

- **Trickiness, not size** (the Bee's founding idea). 7 × 8 has no pattern, sits beside 6 × 8
  and 7 × 9, and is where errors live; 12 × 12 is a famous square. The fact ramp is ordered by
  `tricky()`, and every fact carries a named reason (`why()`): "crosses ten", "the famous
  hard ones — no pattern to lean on", "a square — worth knowing by heart".
- **Fluent means remembered across a gap.** Leitner boxes at 0/1/3/7/21/60 days; a fact
  climbs only when right, fast (5s / 3.5s / 3s by age band) and due. A miss drops one box and
  is reported to the grown-up as a lapse.
- **A first session discovers.** A child with nothing recorded gets twenty facts sampled
  across the whole table rather than the bottom twenty, so session two starts in the right
  place.
- **The Atlas** — five worlds, 27 stops, a checkpoint per world. Three stars per stop, each
  meaning something: ★ you did the working yourself, ★★ 70% on the drill (opens the next
  stop), ★★★ 90% at a good pace — fast *and* fearless. Stops meant for a younger band stay
  open to wander, but the road never waits on them.
- **Find my start** — twelve rungs, stops at two misses in a row, writes a ceiling that is
  never shown as a score (Finance's placement rule).
- **The Mock Contest** — the Bee's mock spelling bee, with numbers, and the *same ten rivals*
  (Pip, Nova, Rafi, Suki, Dax, Mira, Theo, Ines, Kwame, Vesper) with the same ages, faces and
  nerve. Round one eliminates nobody; an all-miss round replays; the final two play
  championship rules. The question ladder is built only from the fact bank and the trick
  generators — the contest invents no maths of its own.
- **The Arcade** — Number Rush (the child's own facts, falling), Make the Target (four
  numbers, one target; every puzzle is solved before it is served), Number Line (estimation).
  Plus **Today's puzzle**, the same in every house.

## 3. The Vedic question, answered honestly

The sutras were published by Bharati Krishna Tirtha in *Vedic Mathematics* (1965). He said
they came from the Vedas; scholars have not found them in any Vedic text (S. G. Dani,
*Frontline*, 1993). The Observatory says exactly this on its own page, and then teaches the
methods properly — because they *are* quick, they *are* clever, and each works for a reason
a child can check. That reason is the product.

This is the Bizzing India badge rule applied to maths: a thing told as a story is never
presented as history.

## 4. The open decision: competition problems

The deck: *"An honest decision on competition maths — it is the demand, and it is the part that
does not reuse anything."*

**Decision taken for v1: build the contest *format* now, not a problem bank.** The Mock
Contest gives the pressure, the rivals and the ladder (mental arithmetic up to vertically-and-
crosswise and percentages), using only generated questions whose answers are machine-checked.
Kangaroo/MOEMS/AMC-style *reasoning* problems need authored problems with worked solutions,
each verified by a person — that is a content programme (like the Bee's 31k trivia bank), and
it should not be generated and shipped unverified.

**Recommended next step:** a `problems/` bank authored in the Bee's trivia pipeline shape
(author → merge with schema and answer checks → shard by level), 50 problems per level,
each with a worked solution a parent can read. It rides the existing contest and Atlas.

## 5. Not built yet (and why)

- **Payments / entitlements.** Family rule: server-authoritative, parent-only, behind the PIN.
  No server exists yet, so nothing is gated — everything is free in this build.
- **Accounts and sync.** The `Store` seam is in place so it is one file when it comes.
- **Recorded narration.** Read-aloud uses the device voice (en-IN first). The Bee's TTS
  pipeline could voice every chapter.
- **Fractions, decimals, negatives.** The ladder stops at whole numbers and percentages.
  Fractions are the obvious sixth world.

## 6. Where it sits in the house

Gate 3 in the deck's roadmap, alongside Buzz, Speak, English, Finance and AI. It shares the
avatar collection with the Bee (one collection across the house is the deck's own mechanism)
and links to its three siblings from every page footer.
