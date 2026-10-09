/* facts-timed.js — the facts.js question forms Beat the Timer asks (timer.js), kept beside the bank
   in their own file so they load with the game and not with Home (the first-load budget, rule 30).
   They are facts.js in every way that matters: built only from the bank's facts and its answer(),
   and checked the same way (test/timer.mjs evaluates every expr against its ans). */
import { BANK, answer, text } from './facts.js';
/* ---------- question forms for timed practice (Beat the Timer, timer.js) ----------

   Every question Beat the Timer asks is a facts.js fact, a form BUILT from one here, or a
   tricks.js stop's own generator (rule 1). Each form carries `expr` (plain arithmetic, the second
   route test/timer.mjs evaluates), `ans`, and `steps` — how many fluent recalls it takes, which is
   what the fluent bot is charged for it. `fact` is the one fact the answer exercises, so a timed
   answer lands in the same fact record every other drill keeps (spec §3.1); a form that is two
   things at once (two steps, a bigger number) records nothing rather than the wrong thing. */
const JS_OP = { '+': '+', '-': '-', '×': '*', '÷': '/' };
const MINUS = '−';
export const factExpr = (f) => (f.op === '²' ? `${f.a}*${f.a}` : `${f.a}${JS_OP[f.op]}${f.b}`);
/* a fact the bank holds (addition and multiplication on the sorted pair), or null */
export function inBank(f) {
  const g = f.op === '+' || f.op === '×' ? { op: f.op, a: Math.min(f.a, f.b), b: Math.max(f.a, f.b) } : f;
  return (BANK[g.op] || []).some((x) => x.a === g.a && x.b === g.b) ? g : null;
}

export function factQ(f) { return { by: 'facts', text: text(f), expr: factExpr(f), ans: answer(f), steps: 1, fact: f }; }

/* A gap where a number was: ? × 7 = 56 is the division fact 56 ÷ 7, 9 + ? = 15 is 15 − 9. */
export function missingQ(f, left = true) {
  const { a, b } = f, n = answer(f);
  switch (f.op) {
    case '×': return left ? { by: 'facts', text: `? × ${b} = ${n}`, expr: `${n}/${b}`, ans: a, steps: 1, fact: inBank({ op: '÷', a: n, b }) }
      : { by: 'facts', text: `${a} × ? = ${n}`, expr: `${n}/${a}`, ans: b, steps: 1, fact: inBank({ op: '÷', a: n, b: a }) };
    case '+': return left ? { by: 'facts', text: `${a} + ? = ${n}`, expr: `${n}-${a}`, ans: b, steps: 1, fact: inBank({ op: '-', a: n, b: a }) }
      : { by: 'facts', text: `? + ${b} = ${n}`, expr: `${n}-${b}`, ans: a, steps: 1, fact: inBank({ op: '-', a: n, b }) };
    case '-': return { by: 'facts', text: `${a} ${MINUS} ? = ${n}`, expr: `${a}-${n}`, ans: b, steps: 1, fact: inBank({ op: '-', a, b: n }) };
    case '÷': return { by: 'facts', text: `? ÷ ${b} = ${n}`, expr: `${n}*${b}`, ans: a, steps: 1, fact: inBank({ op: '×', a: b, b: n }) };
    case '²': return { by: 'facts', text: `?² = ${n}`, expr: `Math.sqrt(${n})`, ans: a, steps: 1, fact: null };
  }
  return null;
}

/* Two steps in one: (6 × 7) + 8. The bracket is done first, as written. */
export function twoStepQ(f, c, plus = true) {
  const n = answer(f), m = plus ? n + c : n - c;
  return { by: 'facts', text: `(${text(f)}) ${plus ? '+' : MINUS} ${c}`, expr: `(${factExpr(f)})${plus ? '+' : '-'}${c}`, ans: m, steps: 2, fact: null };
}

/* One more digit: 70 × 8, 340 ÷ 4, 37 + 8, 16² → 160². The fact underneath is the same one. */
export function biggerQ(f, tens = 1) {
  const { a, b } = f;
  switch (f.op) {
    case '×': return { by: 'facts', text: `${a * 10} × ${b}`, expr: `${a * 10}*${b}`, ans: a * 10 * b, steps: 1.5, fact: null };
    case '÷': return { by: 'facts', text: `${a * 10} ÷ ${b}`, expr: `${a * 10}/${b}`, ans: (a * 10) / b, steps: 1.5, fact: null };
    case '+': return { by: 'facts', text: `${10 * tens + a} + ${b}`, expr: `${10 * tens + a}+${b}`, ans: 10 * tens + a + b, steps: 1.5, fact: null };
    case '-': return { by: 'facts', text: `${10 * tens + a} ${MINUS} ${b}`, expr: `${10 * tens + a}-${b}`, ans: 10 * tens + a - b, steps: 1.5, fact: null };
    case '²': return { by: 'facts', text: `${a * 10}²`, expr: `${a * 10}*${a * 10}`, ans: a * a * 100, steps: 1.5, fact: null };
  }
  return null;
}

/* Number bonds: the part that makes the whole. 3 + ? = 10 is the fact 10 − 3. */
export function bondQ(whole, part, left = true) {
  const f = whole <= 20 && part <= 10 && whole - part <= 10 ? inBank({ op: '-', a: whole, b: part }) : null;
  return left ? { by: 'facts', text: `${part} + ? = ${whole}`, expr: `${whole}-${part}`, ans: whole - part, steps: whole > 20 ? 1.5 : 1, fact: f }
    : { by: 'facts', text: `? + ${part} = ${whole}`, expr: `${whole}-${part}`, ans: whole - part, steps: whole > 20 ? 1.5 : 1, fact: f };
}

/* Skip counting: four terms of a count in steps, one of them a gap (the next one, unless `gap`). */
export function skipQ(step, start, gap = 3) {
  const seq = [0, 1, 2, 3].map((i) => start + i * step);
  const shown = seq.map((v, i) => (i === gap ? '?' : String(v)));
  const expr = gap === 0 ? `${seq[1]}-${step}` : `${seq[gap - 1]}+${step}`;
  return { by: 'facts', text: shown.join(', '), expr, ans: seq[gap], steps: 1, fact: null };
}

/* Doubles and halves, said as a child says them. Inside the bank they are its facts. */
export function doubleQ(n) { return { by: 'facts', text: `Double ${n}`, expr: `${n}+${n}`, ans: 2 * n, steps: n > 12 ? 1.5 : 1, fact: n <= 10 ? inBank({ op: '+', a: n, b: n }) : null }; }
export function halfQ(n) { return { by: 'facts', text: `Half of ${n}`, expr: `${n}/2`, ans: n / 2, steps: n > 24 ? 1.5 : 1, fact: n <= 24 ? inBank({ op: '÷', a: n, b: 2 }) : null }; }
export function doubleMissingQ(n) { return { by: 'facts', text: `Double ? = ${2 * n}`, expr: `${2 * n}/2`, ans: n, steps: 1, fact: n <= 12 ? inBank({ op: '÷', a: 2 * n, b: 2 }) : null }; }
