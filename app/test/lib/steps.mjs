/* test/lib/steps.mjs — every MIDDLE step is checked, not just the last (owner, 3 Oct 2026).

   The last step is held to q.ans and q.expr already. A middle step is what the child types on
   "Your turn" before it, and until now nothing checked it: an off-by-one there passed every test.
   So every step but the last carries `x` — the step's value as plain arithmetic on the question's
   own numbers (a JS expression, like q.expr) — and this evaluates it against `v`.

   - a number step: x evaluates to the same number (1e-9);
   - a fraction step ('3/4'): x evaluates to the fraction's value;
   - a choice or word step: x evaluates to the same string;
   - x must be arithmetic, not a copy of the value: a bare number is refused.
   x is written from the QUESTION's numbers by the step's plain meaning ("6 × 7" → `6*7`, "the remainder
   of 625 ÷ 9" → `625%9`), never from the trick's own running variables — it is the second route. */
import { parseNum } from '../../src/tricks.js';

const isWord = (v) => typeof v === 'string' && !Number.isFinite(parseNum(v));
export function checkSteps(id, q, w, ok) {
  w.slice(0, -1).forEach((s, i) => {
    const where = `${id}: ${q.text} — step ${i + 1} "${s.t}"`;
    if (s.x === undefined || s.x === null || s.x === '') return ok(false, `${where} has no x (its plain arithmetic)`);
    const x = String(s.x).trim();
    ok(!/^-?\d+(\.\d+)?$/.test(x) && !/^'[^']*'$|^"[^"]*"$/.test(x), `${where}: x is a bare value (${x}) — write the arithmetic that makes it`);
    let got;
    try { got = Function(`return (${x})`)(); } catch (e) { return ok(false, `${where}: x does not evaluate (${x}: ${e.message})`); }
    if (s.choices || isWord(s.v)) return ok(got === s.v, `${where}: x says ${JSON.stringify(got)}, the step says ${JSON.stringify(s.v)}`);
    const want = typeof s.v === 'number' ? s.v : parseNum(s.v), g = typeof got === 'number' ? got : parseNum(String(got));
    ok(Number.isFinite(g) && Math.abs(g - want) < 1e-9, `${where}: x (${x}) says ${got}, the step says ${s.v}`);
  });
}
