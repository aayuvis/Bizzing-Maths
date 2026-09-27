/* objectives.js — what Bizzing Maths is FOR, written so it can be measured.

   The app has one purpose, from the strategy deck: a child who is fast and
   fearless with numbers, and knows why the trick works. That breaks into six
   strands. Every objective in them is an "I can…" sentence a parent could
   watch a child do, and every one is MEASURED from the child's own record —
   none is ticked for time spent, and none is ticked by visiting a screen.

   The measure returns { pct, met, how }:
     pct  — how far along, 0..1, from real evidence
     met  — the bar is cleared (the bar is written in `bar`, in words)
     how  — where to go to work on it (a nav target)

   A field here with no measure would be a promise with nothing behind it, so
   test/objectives.mjs fails any objective whose measure is missing or moves
   nothing when the child's record changes. */

import { BANK, key, state } from './facts.js';
import { TRICKS, tricksIn } from './tricks.js';

const fluentShare = (k, pred) => {
  const fs = Object.values(BANK).flat().filter(pred);
  const n = fs.filter((f) => state(k.facts[key(f)]) === 'fluent').length;
  return fs.length ? n / fs.length : 0;
};
const worldShare = (k, wid) => {
  const ts = tricksIn(wid);
  return ts.length ? ts.filter((t) => (k.tricks[t.id] || {}).stars >= 2).length / ts.length : 0;
};
const pz = (k, id) => (k.puzzles && k.puzzles[id]) || { right: 0, tries: 0, solved: {} };
const m = (pct, bar, how) => ({ pct: Math.max(0, Math.min(1, pct)), met: pct >= 1, how, bar });

export const MISSION = {
  line: 'Fast and fearless with numbers — and knowing why the trick works.',
  body: [
    'Bizzing Maths is for children aged 6 to 14. It has one aim: that your child can work with numbers quickly, confidently and in their head — and can explain WHY each method works, not just follow it.',
    'It covers the whole of maths from 6 to 14 — number and place value, kinds of number and the primes they are built from, negative numbers, the four operations, fractions, decimals, percentages and ratio, factors and powers, shape, angles and measurement, time, money and interest, sets and algebra, data and chance — plus the mental methods and Vedic techniques that make it fast.',
    'Speed comes from facts they know by heart. Confidence comes from methods that make big sums small. Understanding comes from seeing why a method is true. Contest readiness comes from puzzles that need thinking, not just calculating.',
    'Every goal below is measured from what your child actually does in the app. Nothing is ticked for time spent.',
  ],
};

export const STRANDS = [
  { id: 'facts', name: 'Facts at your fingertips', glyph: '⚡',
    why: 'Every method in maths leans on facts you do not have to work out. Fluent means right, quick, and still quick a week later.',
    goals: [
      { id: 'add10', can: 'I can add any two numbers up to 10 without counting.', bar: '80% of adding facts fluent',
        measure: (k) => m(fluentShare(k, (f) => f.op === '+') / 0.8, '', 'facts:+') },
      { id: 'sub20', can: 'I can take away within 20 without counting back.', bar: '80% of taking-away facts fluent',
        measure: (k) => m(fluentShare(k, (f) => f.op === '-') / 0.8, '', 'facts:-') },
      { id: 'tab10', can: 'I know my times tables up to 10 × 10.', bar: '80% of those facts fluent', band: '8-10',
        measure: (k) => m(fluentShare(k, (f) => f.op === '×' && f.a <= 10 && f.b <= 10) / 0.8, '', 'facts:×') },
      { id: 'tab12', can: 'I know all my times tables, up to 12 × 12.', bar: '80% of times facts fluent', band: '8-10',
        measure: (k) => m(fluentShare(k, (f) => f.op === '×') / 0.8, '', 'facts:×') },
      { id: 'div', can: 'I can use my times tables backwards to divide.', bar: '70% of sharing facts fluent', band: '8-10',
        measure: (k) => m(fluentShare(k, (f) => f.op === '÷') / 0.7, '', 'facts:÷') },
      { id: 'sq20', can: 'I know the squares of every number up to 20 by heart.', bar: '80% of squares 1² to 20² fluent', band: '8-10',
        measure: (k) => m(fluentShare(k, (f) => f.op === '²') / 0.8, '', 'facts:²') },
      { id: 'grid20', can: 'I have grown my times table all the way to 20 × 20.', bar: 'the 15 × 15 table mastered in the Times Table Explorer', band: '11-14',
        measure: (k) => m(((((k.lib || {}).tables || {}).level || 5) - 5) / 15, '', 'lib:tables') },
    ] },
  { id: 'methods', name: 'Mental methods', glyph: '🧠',
    why: 'Big sums done in your head by making them small: make ten, split, round and fix, double and halve.',
    goals: [
      { id: 'gardens', can: 'I can add and take away in my head using tens.', bar: 'every Ten Gardens stop passed',
        measure: (k) => m(worldShare(k, 'gardens'), '', 'world:gardens') },
      { id: 'market', can: 'I have a shortcut for every hard times table.', bar: 'every Times Market stop passed',
        measure: (k) => m(worldShare(k, 'market'), '', 'world:market') },
      { id: 'workshop', can: 'I can multiply two-digit numbers in my head by splitting, rounding and halving.', bar: 'every Mental Workshop stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'workshop'), '', 'world:workshop') },
    ] },
  { id: 'number', name: 'The number system', glyph: '📚',
    why: 'How numbers are written, ordered and built from factors — the ground everything stands on.',
    goals: [
      { id: 'library', can: 'I understand place value, negative numbers and the written methods.', bar: 'every Number Library stop passed',
        measure: (k) => m(worldShare(k, 'library'), '', 'world:library') },
      { id: 'forest', can: 'I can find factors, multiples, primes, HCF and LCM.', bar: 'every Factor Forest stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'forest'), '', 'world:forest') },
      { id: 'palace', can: 'I know my squares and powers, and why (a + b)² = a² + 2ab + b².', bar: 'every Square Palace stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'palace'), '', 'world:palace') },
      { id: 'quarry', can: 'I know the kinds of number, and that every number is built from primes in one way only.', bar: 'every Prime Quarry stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'quarry'), '', 'world:quarry') },
      { id: 'mine', can: 'I can add, take away, multiply and divide with negative numbers.', bar: 'every Deep Mine stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'mine'), '', 'world:mine') },
    ] },
  { id: 'parts', name: 'Fractions, decimals & percentages', glyph: '🥧',
    why: 'Parts of a whole, in three languages that say the same thing — and ratio, which compares them.',
    goals: [
      { id: 'bakery', can: 'I can find, compare, add, multiply and divide fractions.', bar: 'every Fraction Bakery stop passed',
        measure: (k) => m(worldShare(k, 'bakery'), '', 'world:bakery') },
      { id: 'dock', can: 'I can work with decimals, percentages and ratio.', bar: 'every Decimal Dock stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'dock'), '', 'world:dock') },
    ] },
  { id: 'money', name: 'Money sense', glyph: '🪙',
    why: 'Budgets, best buys, discounts, profit and interest — the arithmetic of money, in coins that are only ever pretend.',
    goals: [
      { id: 'coinstreet', can: 'I can budget, find the best buy, and work out discounts, profit and interest.', bar: 'every Coin Street stop passed',
        measure: (k) => m(worldShare(k, 'coinstreet'), '', 'world:coinstreet') },
    ] },
  { id: 'shape', name: 'Shape, space & measure', glyph: '📐',
    why: 'Shapes and their angles, time and money, and measuring — perimeter, area and volume.',
    goals: [
      { id: 'shapecity', can: 'I can name shapes, work out angles and use symmetry and coordinates.', bar: 'every Shape City stop passed',
        measure: (k) => m(worldShare(k, 'shapecity'), '', 'world:shapecity') },
      { id: 'clocktower', can: 'I can tell the time, handle money, convert units and find perimeter, area and volume.', bar: 'every Clock Tower stop passed',
        measure: (k) => m(worldShare(k, 'clocktower'), '', 'world:clocktower') },
    ] },
  { id: 'algebra', name: 'Algebra, sets & data', glyph: '⭕',
    why: 'Letters for numbers, sets and Venn diagrams, and reading what data and chance are saying.',
    goals: [
      { id: 'setisland', can: 'I can use sets and Venn diagrams, and solve equations.', bar: 'every Set Island stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'setisland'), '', 'world:setisland') },
      { id: 'carnival', can: 'I can read charts, find averages, work out chances and solve multi-step problems.', bar: 'every Data Carnival stop passed',
        measure: (k) => m(worldShare(k, 'carnival'), '', 'world:carnival') },
    ] },
  { id: 'why', name: 'Knowing why', glyph: '💡',
    why: 'A trick without its reason is a party piece. Each stop shows the reason as a picture and as algebra, and the child does the working themselves.',
    goals: [
      { id: 'working', can: 'I can do the working of a trick myself, step by step.', bar: 'Your turn finished on 20 stops',
        measure: (k) => m(TRICKS.filter((t) => (k.tricks[t.id] || {}).learned).length / 20, '', 'atlas') },
      { id: 'vedic', can: 'I can use the Vedic methods and say why each one works.', bar: 'every Sutra Observatory stop passed', band: '8-10',
        measure: (k) => m(worldShare(k, 'observatory'), '', 'world:observatory') },
      { id: 'stories', can: 'I have met every trick in a story first.', bar: 'every story on the shelf read',
        measure: (k) => m(Object.keys(k.stories || {}).length / TRICKS.length, '', 'stories') },
    ] },
  { id: 'sense', name: 'Number sense', glyph: '🧭',
    why: 'Knowing roughly how big an answer should be — and catching your own mistakes.',
    goals: [
      { id: 'estimate', can: 'I can place a number on a number line by eye.', bar: '60 points in a round of Number Line',
        measure: (k) => m(((k.games.line || {}).best || 0) / 60, '', 'arcade') },
      { id: 'harbour', can: 'I can check an answer with digit sums, and use percentages and squares.', bar: 'every Number Harbour stop passed', band: '11-14',
        measure: (k) => m(worldShare(k, 'harbour'), '', 'world:harbour') },
    ] },
  { id: 'puzzles', name: 'Problem solving', glyph: '🧩',
    why: 'Contest maths is mostly thinking: finding the rule, seeing the shape, holding two facts at once.',
    goals: [
      { id: 'patterns', can: 'I can find the rule in a number pattern.', bar: '20 patterns solved',
        measure: (k) => m(pz(k, 'patterns').right / 20, '', 'puzzles:patterns') },
      { id: 'logic', can: 'I can solve a sudoku by logic, without guessing.', bar: '5 sudokus solved',
        measure: (k) => m(Object.values(pz(k, 'sudoku').solved || {}).reduce((a, b) => a + b, 0) / 5, '', 'puzzles:sudoku') },
      { id: 'spatial', can: 'I can picture shapes in my head — folding nets, stacking cubes, mirrors and turns.', bar: '15 Shapes & Space puzzles right',
        measure: (k) => m(pz(k, 'space').right / 15, '', 'puzzles:space') },
      { id: 'algebra', can: 'I can find a hidden number from clues that balance.', bar: '15 balance puzzles right', band: '8-10',
        measure: (k) => m(pz(k, 'balance').right / 15, '', 'puzzles:balance') },
      { id: 'tower', can: 'I can climb the Puzzle Tower, where every kind of puzzle is mixed.', bar: 'all twelve floors cleared',
        measure: (k) => m(Object.values(k.quest || {}).filter((x) => x.passed).length / 12, '', 'puzzles') },
    ] },
  { id: 'contest', name: 'Contest ready', glyph: '🏆',
    why: 'Keeping your head when the clock is running and others are answering too.',
    goals: [
      { id: 'podium', can: 'I can finish in the top three of a mock contest.', bar: 'a top-three finish',
        measure: (k) => m(k.contest.best ? (k.contest.best <= 3 ? 1 : (11 - k.contest.best) / 8) : 0, '', 'contest') },
      { id: 'win', can: 'I can win a mock contest.', bar: 'one win',
        measure: (k) => m(k.contest.wins ? 1 : 0, '', 'contest') },
    ] },
];

const RANK = { '6-7': 0, '8-10': 1, '11-14': 2 };

/* The goals that apply to this child: a goal marked for an older band shows
   as "coming later" for a younger one, never as a failure. */
export function goalsFor(k) {
  return STRANDS.map((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      const r = g.measure(k);
      const later = g.band && RANK[k.band] < RANK[g.band];
      return { ...g, ...r, bar: g.bar, later, status: later ? 'later' : r.met ? 'met' : r.pct > 0 ? 'going' : 'new' };
    }),
  }));
}

export function summary(k) {
  const all = goalsFor(k).flatMap((s) => s.goals).filter((g) => !g.later);
  return { met: all.filter((g) => g.met).length, total: all.length, going: all.filter((g) => g.status === 'going').length };
}

export const STATUS = { met: 'Got it', going: 'On the way', new: 'Not started', later: 'Coming later' };
