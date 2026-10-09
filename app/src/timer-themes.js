/* timer-themes.js — Beat the Timer's catalogue, as DATA (games spec §3.7).

   Light on purpose: the grown-ups' page (a LIGHT screen, rule 30) and the Play tab's card read
   the themes, levels and targets from here without downloading the game. The questions
   themselves come from facts.js and tricks.js generators, wired up in timer.js — a theme names
   them (fact ops, or trick stops with the trick level to ask at), and never writes a sum itself.

   A theme has ten levels. Its target is a RATE × MINUTES, so a 1, 2, 3 or 5-minute window is
   equally fair (BT3). The rates are calibrated by test/timer.mjs: the slowest child who still
   counts as fluent (facts.js FLUENT_MS for the grade's band, one fluent step per step of the
   trick's own working) hits every level comfortably, and a random typer never comes close.
   A challenge is added every other level from 4 (4, 6, 8, 10), announced on the level card. */


export const LEVELS = 10;
export const WINDOWS = [1, 2, 3, 5];
export const FIVE_FROM = 6;              // the 5-minute window opens at level 6 of a theme (BT4)
export const PAY_RUN = 10;               // `answer` coins a run may pay, at most
export const windowsOpen = (lv) => WINDOWS.filter((m) => m < 5 || lv >= FIVE_FROM);

/* A grade is a curriculum setting, not personal data: it defaults from the age band, the child
   moves it any time, and it is never reported as the child's grade. */
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
export const gradeFor = (band) => ({ '6-7': 1, '8-10': 3, '11-14': 6 }[band] || 3);
export const bandOfGrade = (g) => (g <= 1 ? '6-7' : g <= 5 ? '8-10' : '11-14');   // grade 2 is seven going on eight

/* The challenges (spec table). `fact` ones are built from a facts.js fact; the rest work on any theme. */
export const CHALLENGES = {
  missing: { name: 'Missing numbers', line: 'some sums have a gap: ? × 6 = 42' },
  twostep: { name: 'Two-step', line: 'two steps in one: (6 × 7) + 8' },
  bigger: { name: 'Bigger numbers', line: 'one more digit' },
  mixed: { name: 'Mixed operations', line: 'the other operation joins in' },
  precision: { name: 'Precision', line: 'a wrong answer freezes the clock-face for 2 seconds — guessing costs' },
  bonus: { name: 'Bonus round', line: 'the last 20 seconds ask your own due facts, worth 2 each' },
  trick: { name: 'Trick round', line: 'some questions where a Vedic trick you have passed is the quick way' },
};
const CH_AT = [4, 6, 8, 10];

/* Rates (a minute), level 1 → 10, pasted from tools/timer-rates.mjs. A fact theme's rate is also capped by
   the spec's own Multiplication ladder, 10 10 12 12 12 12 13 14 14 15 (grades 1–2: 8 8 9 9 9 9 10 10 10 10),
   so a fact target never asks more than the spec does even where the fluent bot could give more. */

/* src entries for a trick theme: [stop id, first theme level, last theme level, trick level] */
export const THEMES = [
  /* Grade 1 */
  { id: 'add20', short: true, grade: [1], name: 'Addition within 20', kind: 'fact', ops: ['+'], rates: [8, 8, 9, 5, 7, 6, 7, 7, 5, 5], ch: ['twostep', 'missing', 'precision', 'bonus'], sib: ['-'] },
  { id: 'sub20', short: true, grade: [1], name: 'Subtraction within 20', kind: 'fact', ops: ['-'], rates: [8, 8, 9, 9, 9, 6, 7, 7, 7, 7], ch: ['missing', 'twostep', 'precision', 'mixed'], sib: ['+'] },
  { id: 'bonds10', short: true, grade: [1], name: 'Number bonds to 10', kind: 'bonds', rates: [8, 8, 9, 8, 8, 8, 8, 9, 8, 8], ch: ['bigger', 'precision', 'mixed', 'bonus'], sib: ['+'] },
  /* Grade 2 */
  { id: 'add100', grade: [2], name: 'Addition to 100', kind: 'trick', rates: [7, 7, 6, 5, 5, 5, 4, 4, 4, 4], ch: ['missing', 'precision', 'bigger', 'bonus'],
    pre: ['+'], src: [['make-ten', 1, 4, 2], ['near-doubles', 1, 6, 2], ['plus-nine', 2, 10, 2], ['tens-then-ones', 3, 10, 2], ['round-add', 4, 10, 1], ['column-add', 5, 10, 1], ['make-ten', 5, 10, 3]], cap: 100 },
  { id: 'sub100', grade: [2], name: 'Subtraction to 100', kind: 'trick', rates: [5, 5, 4, 4, 4, 4, 5, 4, 4, 4], ch: ['missing', 'precision', 'bigger', 'bonus'],
    src: [['count-up', 1, 10, 3], ['round-sub', 1, 10, 1], ['column-sub', 3, 10, 1]], cap: 100 },
  { id: 'skip', grade: [2], name: 'Skip counting (2s, 5s, 10s)', kind: 'skip', rates: [8, 8, 9, 9, 9, 9, 10, 10, 10, 10], ch: ['missing', 'bigger', 'precision', 'bonus'] },
  { id: 'dbl', short: true, grade: [2], name: 'Doubles and halves', kind: 'double', rates: [8, 8, 9, 9, 9, 9, 9, 9, 9, 9], ch: ['bigger', 'missing', 'precision', 'bonus'] },
  /* Grade 3 */
  { id: 'add3', grade: [3], name: 'Addition', sub: '3-digit', kind: 'trick', rates: [4, 5, 5, 4, 3, 3, 4, 4, 2, 3], ch: ['missing', 'precision', 'bigger', 'bonus'],
    src: [['column-add', 1, 4, 1], ['round-add', 1, 5, 2], ['plus-nine', 3, 10, 3], ['column-add', 4, 10, 2], ['round-add', 6, 10, 3]] },
  { id: 'sub3', grade: [3], name: 'Subtraction', sub: '3-digit', kind: 'trick', rates: [4, 5, 5, 3, 3, 3, 3, 2, 3, 3], ch: ['missing', 'precision', 'bigger', 'bonus'],
    src: [['column-sub', 1, 4, 1], ['round-sub', 1, 5, 2], ['count-up', 2, 6, 3], ['all-from-nine', 4, 10, 1], ['column-sub', 5, 10, 2], ['round-sub', 6, 10, 3]] },
  { id: 'mul10', grade: [3], name: 'Multiplication', sub: 'to 10 × 10', kind: 'fact', ops: ['×'], max: 10, rates: [10, 10, 12, 12, 12, 12, 13, 14, 14, 15], ch: ['bonus', 'missing', 'precision', 'mixed'], sib: ['÷'] },
  /* Grade 4 */
  { id: 'mul12', grade: [4], name: 'Multiplication', sub: 'to 12 × 12', kind: 'fact', ops: ['×'], rates: [10, 10, 12, 12, 12, 8, 9, 10, 10, 10], ch: ['missing', 'twostep', 'precision', 'mixed'], sib: ['÷'] },
  { id: 'div', grade: [4], name: 'Division', sub: 'facts and remainders', kind: 'fact', ops: ['÷'], rates: [10, 10, 12, 12, 8, 5, 6, 8, 6, 8], ch: ['missing', 'bonus', 'precision', 'mixed'], sib: ['×'],
    src: [['short-division', 5, 10, 1]] },
  { id: 'addsub', grade: [4], name: 'Multi-digit adding and taking away', kind: 'trick', rates: [3, 3, 4, 3, 3, 2, 2, 2, 3, 2], ch: ['precision', 'missing', 'bigger', 'bonus'],
    src: [['column-add', 1, 6, 2], ['column-sub', 1, 6, 2], ['round-add', 2, 10, 3], ['round-sub', 2, 10, 3], ['column-add', 6, 10, 3], ['column-sub', 6, 10, 3]] },
  /* Grade 5 */
  { id: 'frac', grade: [5], name: 'Fractions', sub: 'equivalent, and adding like bottoms', kind: 'trick', rates: [7, 7, 3, 3, 4, 3, 3, 3, 3, 4], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['equivalent-fractions', 1, 6, 1], ['add-same-bottom', 1, 6, 1], ['fraction-of-amount', 2, 10, 2], ['simplify-fractions', 3, 10, 2], ['equivalent-fractions', 5, 10, 2], ['add-same-bottom', 5, 10, 2]] },
  { id: 'dec', grade: [5], name: 'Decimals', sub: 'add, take away, × and ÷ by 10', kind: 'trick', rates: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['add-decimals', 1, 10, 1], ['times-ten-decimals', 1, 6, 1], ['decimal-places', 1, 4, 1], ['add-decimals', 5, 10, 2], ['times-ten-decimals', 5, 10, 2]] },
  { id: 'mul21', grade: [5], name: 'Multiply 2-digit by 1-digit', kind: 'trick', rates: [5, 5, 4, 4, 4, 4, 4, 4, 4, 4], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['times-five', 1, 4, 1], ['double-double', 1, 6, 1], ['times-nine', 2, 8, 1], ['split-multiply', 1, 10, 1], ['split-multiply', 4, 10, 2], ['times-twelve', 3, 10, 1]], two1: true },
  /* Grade 6 */
  { id: 'int', grade: [6], name: 'Integers', sub: 'negative numbers', kind: 'trick', rates: [3, 3, 4, 4, 4, 4, 4, 4, 4, 4], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['add-negative', 1, 10, 1], ['subtract-negative', 1, 10, 1], ['multiply-signs', 3, 10, 1], ['divide-signs', 3, 10, 1], ['ups-and-downs', 5, 10, 1], ['add-negative', 6, 10, 2], ['subtract-negative', 6, 10, 2]] },
  { id: 'pct', grade: [6], name: 'Percentages of amounts', kind: 'trick', rates: [8, 8, 8, 6, 6, 4, 5, 4, 4, 5], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['percent-of-amount', 1, 10, 1], ['percent-swap', 2, 10, 1], ['percent-change', 4, 10, 1], ['percent-of-amount', 6, 10, 2]] },
  { id: 'sq', grade: [6], name: 'Squares and square roots', kind: 'fact', ops: ['²'], rates: [10, 10, 11, 6, 5, 6, 5, 5, 5, 5], ch: ['trick', 'missing', 'precision', 'mixed'],
    src: [['root-of-square', 3, 10, 1], ['teen-squares', 5, 10, 1]] },
  /* Grades 7–8 */
  { id: 'ops', grade: [7, 8], name: 'Order of operations', kind: 'trick', rates: [8, 8, 8, 6, 6, 5, 5, 4, 4, 4], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['order-of-operations', 1, 6, 1], ['order-of-operations', 4, 10, 2]] },
  { id: 'ratio', grade: [7, 8], name: 'Ratio and proportion', kind: 'trick', rates: [6, 6, 6, 5, 5, 5, 5, 5, 5, 5], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['ratio-share', 1, 10, 1], ['unitary-method', 1, 10, 1], ['ratio-share', 6, 10, 2]] },
  { id: 'pow', grade: [7, 8], name: 'Powers', kind: 'trick', rates: [4, 4, 5, 4, 4, 3, 3, 3, 3, 3], ch: ['trick', 'precision', 'bigger', 'bonus'],
    src: [['square-dots', 1, 4, 1], ['powers-index', 1, 10, 1], ['cube-and-root', 2, 10, 1], ['index-laws', 4, 10, 1], ['powers-index', 6, 10, 2]] },
  { id: 'vedic', grade: [7, 8], name: 'Vedic tricks', sub: 'the sutras you have passed', kind: 'vedic', rates: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], ch: ['precision', 'bigger', 'bonus'] },
];
export const themeById = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/* Mixed: every theme of the grade, a question from each in turn. Its rate is the harmonic mean,
   which is what an equal share of each theme's questions costs. */
/* calibrated like the rest (tools/timer-rates.mjs): a mix can be slower than its parts' average */
export const MIX_RATES = {'mix1': [9, 9, 9, 9, 9, 9, 9, 8, 8, 6], 'mix2': [7, 6, 7, 5, 6, 5, 6, 5, 5, 5], 'mix3': [5, 5, 5, 4, 3, 4, 4, 2, 3, 3], 'mix4': [4, 5, 5, 4, 5, 3, 4, 4, 3, 4], 'mix5': [4, 4, 4, 4, 3, 4, 4, 3, 3, 3], 'mix6': [6, 7, 6, 6, 6, 5, 5, 4, 5, 5], 'mix7': [5, 6, 5, 6, 5, 4, 4, 4, 4, 4]};
export const mixedId = (grade) => 'mix' + (grade === 8 ? 7 : grade);
export function themesFor(grade) {
  const own = THEMES.filter((t) => t.grade.includes(grade));
  const ids = own.map((t) => t.id);
  const id = mixedId(grade), cal = MIX_RATES[id];
  const rates = Array.from({ length: LEVELS }, (_, i) => Math.max(1, Math.min(cal ? cal[i] : 99, Math.floor(ids.length / ids.reduce((s, x) => s + 1 / themeById[x].rates[i], 0)))));
  const mix = { id, grade: [grade], name: 'Mixed', sub: 'all of them', kind: 'mixed', of: ids, rates, short: own.some((t) => t.short) && own.every((t) => t.short || t.kind === 'skip'), ch: ['precision', 'bonus', 'bigger', 'twostep'] };
  return [...own, mix];
}
export function themeOf(id) {
  if (themeById[id]) return themeById[id];
  const m = /^mix(\d)$/.exec(id || ''); return m ? themesFor(+m[1]).at(-1) : null;
}

/* Vedic tricks: the rate is each passed sutra's own (a minute, at trick level 1, 2, 3), averaged
   harmonically over the ones the child has passed — a fair target whatever their set is. */
export const SUTRA_RATES = {'square-five': [8, 8, 8], 'nikhilam-10': [2, 2, 2], 'nikhilam-100': [2, 2, 2], 'above-100': [2, 2, 2], 'all-from-nine': [3, 3, 2], 'crosswise': [3, 3, 3], 'square-near-100': [3, 3, 3], 'nine-division': [5, 5, 5], 'base-division': [3, 3, 3], 'ekadhika-decimals': [4, 3, 2], 'flag-division': [3, 2, 2], 'duplex': [6, 3, 3], 'root-by-sight': [5, 5, 5], 'cube-root-sight': [5, 5, 5], 'osculator': [5, 5, 5], 'root-long': [2, 2, 2], 'sutra-equations': [5, 5, 5], 'quadratic-split': [5, 5, 5]};
/* The Trick round (grade 5 and up) asks only sutras that really are the quick way — a few steps
   where the long way has many (test/timer.mjs holds each to that) — and only once passed. */
export const QUICK_SUTRAS = ['square-five', 'root-by-sight', 'cube-root-sight', 'duplex'];
export const vedicLevel = (lv) => (lv <= 4 ? 1 : lv <= 8 ? 2 : 3);
const clampLv = (lv) => Math.min(LEVELS, Math.max(1, lv));
export function rateOf(th, lv, earned = null) {
  const L = clampLv(lv);
  if (th.kind === 'vedic' && earned && earned.length) {
    const rs = earned.map((id) => (SUTRA_RATES[id] || [])[vedicLevel(L) - 1]).filter(Boolean);
    if (rs.length) return Math.max(1, Math.floor(rs.length / rs.reduce((s, x) => s + 1 / x, 0)));
  }
  return th.rates[L - 1];
}
export const targetOf = (th, lv, mins, earned = null) => rateOf(th, lv, earned) * mins;
/* the sutra stops passed (two stars, model.js nodeDone), read from the record alone */
export const sutrasPassed = (k) => Object.keys(SUTRA_RATES).filter((id) => (((k && k.tricks) || {})[id] || {}).stars >= 2);
/* The challenges in play at a level: one more every other level from 4. */
export const challengesAt = (th, lv) => th.ch.filter((c, i) => lv >= CH_AT[i]);
export const newAt = (th, lv) => { const i = CH_AT.indexOf(lv); return i >= 0 ? th.ch[i] : null; };

/* The level card, said before the run: what is new at this level (BT: "announced before"). */
export function levelNews(th, lv) {
  const out = []; const c = newAt(th, lv);
  if (c) out.push(CHALLENGES[c].name.toLowerCase());
  if (lv === FIVE_FROM) out.push('5-minute window');
  return out.length ? `New at level ${lv}: ${out.join(' · ')}` : '';
}

/* ---------- the record: k.timer (store v14) ---------- */
export function rec(k) {
  const t = k.timer || (k.timer = { grade: null, lv: {}, best: {}, hit: {} });
  t.lv = t.lv || {}; t.best = t.best || {}; t.hit = t.hit || {};
  return t;
}
export const levelIn = (k, id) => Math.min(LEVELS, Math.max(1, rec(k).lv[id] || 1));
export const bestKey = (id, lv, mins) => `${id}·${lv}·${mins}`;
export const gradeOf = (k) => rec(k).grade || gradeFor(k.band);

/* For parents, in words: theme · level · best · target per window. Time spent is never a score. */
export function parentLines(k) {
  const t = (k && k.timer) || {}; const lvs = t.lv || {}, best = t.best || {};
  const ids = [...new Set([...Object.keys(lvs), ...Object.keys(best).map((x) => x.split('·')[0])])];
  return ids.map((id) => {
    const th = themeOf(id); if (!th) return null;
    const lv = Math.max(1, lvs[id] || 1);
    const per = WINDOWS.map((m) => ({ m, b: best[bestKey(id, lv, m)] })).filter((x) => x.b != null)
      .map((x) => `best ${x.b} in ${x.m} minute${x.m === 1 ? '' : 's'} (target ${targetOf(th, lv, x.m, sutrasPassed(k))})`);
    const name = th.kind === 'mixed' ? `Mixed, Grade ${th.grade[0]}` : th.name;
    return `${name}: Level ${lv}${per.length ? ', ' + per.join(', ') : ', no run at this level yet'}.`;
  }).filter(Boolean);
}
