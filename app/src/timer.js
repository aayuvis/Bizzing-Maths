/* timer.js — Beat the Timer (games spec §3.7): a theme, a level, a window of 1, 2, 3 or 5
   minutes, and a target to hit. Then your own best to beat.

   Deliberate, measurable practice, the counterpart to Rush's arcade:
     · every question comes from facts.js (a bank fact, or a form built from one) or from a
       tricks.js stop's own generator — the sum is never written here (rules 1 and 2);
     · typed answers only; a right one scores and moves on at once, a wrong one shows the right
       answer for a second and scores nothing, and the clock never stops for either;
     · the clock is wall-clock time, paused while the page is hidden (BT8);
     · hitting the target OFFERS the next level — it never moves on its own (BT5) — and missing
       it never drops one (BT6). A best is a record, never a streak: nothing here counts days.

   The engine (questions, the run, the record) is pure and driven by test/timer.mjs with a fake
   clock and two bots; the stage below it is the DOM. The stage is an overlay like games.js's,
   so a re-render of the app under it (a toast, a coin) never costs the child a keystroke. */

import * as F0 from './facts.js';
import * as FT from './facts-timed.js';
const F = { ...F0, ...FT };
import { byId, TRICKS, correct, parseNum } from './tricks.js';
import { int, pick, rnd } from './rand.js';
import { esc, sfx, confetti } from './ui.js';
import { icon } from './icons.js';
import { keypad } from './keypad.js';
import { LEVELS, WINDOWS, FIVE_FROM, PAY_RUN, CHALLENGES, GRADES, themesFor, themeOf, rateOf, targetOf, challengesAt, levelNews,
  windowsOpen, rec, levelIn, bestKey, gradeOf, bandOfGrade, mixedId, sutrasPassed, vedicLevel, QUICK_SUTRAS } from './timer-themes.js';
export * from './timer-themes.js';
export { timerCard } from './timer-card.js';

/* ------------------------------------------------------------------ questions */

/* The sutra stops a child has passed on the Atlas (two stars: model.js nodeDone). The Vedic
   theme and the Trick round use only these — never a trick the child has not been taught. */
export const SUTRAS = () => TRICKS.filter((t) => t.sutra).map((t) => t.id);
export const earnedSutras = (k) => sutrasPassed(k);

/* The part of a fact op the timer drills: never × 0, × 1, + 0, ÷ 1 — a fact that shows its own
   answer cannot be timed (rule 3). Easiest first, by trickiness (rule 2). */
const RAMPS = {};
function rampOf(op, max = 99) {
  const key = op + max;
  return RAMPS[key] || (RAMPS[key] = F.ramp(op).filter((f) => {
    const { a, b } = f;
    if (op === '×') return Math.min(a, b) >= 2 && Math.max(a, b) <= max;
    if (op === '÷') return b >= 2 && a / b >= 2 && b <= max && a / b <= max;
    if (op === '+') return Math.min(a, b) >= 1;
    if (op === '-') return b >= 1 && a - b >= 1;
    if (op === '²') return a >= 2;
    return true;
  }));
}
/* How far up an op's ramp a level reaches; most questions come from the newest part of it. */
const REACH = [0.3, 0.45, 0.6, 0.7, 0.8, 0.9, 1, 1, 1, 1];
function rampFact(op, lv, r, max) {
  const all = rampOf(op, max), n = Math.max(4, Math.ceil(REACH[lv - 1] * all.length)), win = all.slice(0, n);
  const top = win.slice(Math.floor(win.length * 0.6));
  return r() < 0.6 && top.length ? pick(top, r) : pick(win, r);
}

/* The answer must never be on the screen as one of the numbers (rule 3). */
const shows = (q) => !q.choices && String(q.text).split(/[^0-9./]/).includes(String(q.ans));
const typedOnly = (q) => q && !q.choices && !q.input && q.ans != null && Number.isFinite(typeof q.ans === 'number' ? q.ans : parseNum(q.ans));

/* A trick stop's own question, at its own level. The working steps are what the fluent bot is
   charged for it: one fluent recall per step of the trick (tricks.js work()). */
function trickQ(id, glv, r) {
  const t = byId[id];
  for (let i = 0; i < 30; i++) {
    const q = t.gen(r, Math.min(3, Math.max(1, glv)));
    if (!typedOnly(q) || shows(q)) continue;
    return { text: q.text, expr: q.expr, ans: q.ans, frac: q.frac, simplest: q.simplest, keys: t.keys || q.keys || [], steps: t.work(q).length, src: id, raw: q };
  }
  return null;
}

/* The two-number form of a question (for a gap): a fact, or a trick question whose text is a + b. */
function asFact(q) {
  if (q.fact) return q.fact.op === '²' ? null : { ...q.fact };
  const m = /^(\d+) ([+−×]) (\d+)$/.exec(q.text || '');
  if (!m) return null;
  const op = { '+': '+', '−': '-', '×': '×' }[m[2]];
  return { op, a: +m[1], b: +m[3] };
}
function gapQ(q, r) {
  const f = asFact(q); if (!f) return null;
  const m = F.missingQ(f, r() < 0.5);
  if (!m || shows(m) || m.ans === 0) return null;
  return { ...m, fact: m.fact || null, steps: q.steps };
}

const DIGIT_OPS = { '+': 1, '-': 1, '×': 1, '÷': 1, '²': 1 };
function factQuestion(op, lv, r, max) {
  for (let i = 0; i < 40; i++) { const q = F.factQ(rampFact(op, lv, r, max)); if (!shows(q)) return q; }
  return F.factQ(rampFact(op, lv, r, max));
}

/* One question of a theme at a level, before any challenge. `up` asks one size bigger. */
function baseQ(th, lv, r, ctx, up = false) {
  const act = (th.src || []).filter(([, a, b]) => lv >= a && lv <= b);
  if (th.kind === 'fact') {
    if (act.length && r() < 0.3) { const [id, , , g] = pick(act, r); const q = trickQ(id, g + (up ? 1 : 0), r); if (q) return q; }
    const op = pick(th.ops, r), f = rampFact(op, lv, r, th.max);
    if (up) { const b = F.biggerQ(f, int(1, 4, r)); if (b && !shows(b)) return b; }
    return factQuestion(op, lv, r, th.max);
  }
  if (th.kind === 'bonds') {
    const whole = up ? pick([20, 100], r) : 10;
    for (let i = 0; i < 20; i++) {
      const part = whole === 100 ? int(1, 9, r) * 10 + (r() < 0.5 ? 0 : int(1, 9, r)) : int(1, whole - 1, r);
      // level 1–3 lean on the friendly bonds; the near-halves (4 + 6) come in as the level climbs
      if (whole === 10 && lv <= 2 && [4, 5, 6].includes(part) && r() < 0.6) continue;
      const q = F.bondQ(whole, part, r() < 0.7);
      if (!shows(q)) return q;
    }
    return F.bondQ(10, 3);
  }
  if (th.kind === 'skip') {
    const steps = lv <= 3 ? [2, 5, 10] : lv <= 6 ? [2, 5, 10, 3] : [2, 5, 10, 3, 4];
    const step = up ? pick([3, 4, 25, 50], r) : pick(steps, r);
    const start = step * int(lv <= 3 ? 0 : 2, lv <= 3 ? 6 : 15, r);
    const q = F.skipQ(step, start);
    return shows(q) ? F.skipQ(step, start + step) : q;
  }
  if (th.kind === 'double') {
    const big = up || lv >= 7;
    const n = big ? int(11, lv >= 9 ? 50 : 30, r) : int(2, lv <= 2 ? 6 : 12, r);
    return r() < 0.5 ? F.doubleQ(n) : F.halfQ(2 * n);
  }
  if (th.kind === 'trick' || th.kind === 'vedic') {
    if (th.pre && lv <= 3 && r() < 0.5) return factQuestion(pick(th.pre, r), Math.min(10, lv + 6), r);
    const src = th.kind === 'vedic' ? ctx.earned.map((id) => [id, 1, LEVELS, vedicLevel(lv)]) : act;
    for (let i = 0; i < 40 && src.length; i++) {
      const [id, , , g] = pick(src, r), q = trickQ(id, g + (up ? 1 : 0), r);
      if (!q) continue;
      if (th.cap && Math.abs(q.ans) > th.cap) continue;
      if (th.two1) { const m = /^(\d+) × (\d+)$/.exec(q.text); if (!m || !((+m[1] <= 9) !== (+m[2] <= 9)) || Math.max(+m[1], +m[2]) > (up ? 999 : 99)) continue; }
      return q;
    }
    return null;
  }
  return null;
}

/* A one-digit answer can be hit by a random key one time in ten, so from grade 3 — where the
   theme's own numbers allow it — a timed question has an answer at least two keys long (BT1). */
export const longAnswers = (th) => !th.short;
/* by VALUE: 4/4 is typed as 1 */
const oneKey = (q) => { const v = typeof q.ans === 'number' ? q.ans : parseNum(q.ans); return Number.isInteger(v) && v >= 0 && v <= 9; };
export { oneKey };
export function question(th, lv, r, ctx = {}) {
  let q = null;
  for (let i = 0; i < 30; i++) { q = question1(th, lv, r, ctx); if (!longAnswers(th) || !oneKey(q) || q.tag === 'bonus') return q; }
  return q;
}
/* The next question of a run: the theme's own, then whichever challenge of the level comes up. */
function question1(th, lv, r, ctx) {
  const on = challengesAt(th, lv), ch = (c) => on.includes(c);
  const earned = ctx.earned || [];
  // the Bonus round: the last 20 seconds ask the child's own due facts, worth 2
  if (ch('bonus') && ctx.left != null && ctx.left <= 20000 && ctx.due && ctx.due.length) {
    const q = F.factQ(pick(ctx.due, r));
    if (!shows(q)) return { ...q, pts: 2, tag: 'bonus' };
  }
  // the Trick round (grade 5 and up): a question where a passed sutra is the quick way
  const quick = earned.filter((id) => QUICK_SUTRAS.includes(id));
  if (ch('trick') && quick.length && th.kind !== 'vedic' && r() < 0.25) {
    const q = trickQ(pick(quick, r), 1, r); if (q) return { ...q, pts: 1, tag: 'trick' };
  }
  let th2 = th;
  if (th.kind === 'mixed') th2 = themeOf(pick(th.of.filter((id) => id !== 'vedic' || earned.length), r));
  const up = ch('bigger') && r() < 0.3;
  let q = null;
  if (ch('mixed') && th2.sib && r() < 0.35) q = factQuestion(pick(th2.sib, r), lv, r);
  if (!q) q = baseQ(th2, lv, r, { ...ctx, earned }, up);
  if (!q) q = factQuestion('+', lv, r);
  if (ch('missing') && r() < 0.3) { const g = gapQ(q, r); if (g) q = g; }
  else if (ch('twostep') && q.fact && q.fact.op !== '²' && r() < 0.3) {
    const c = int(2, 9, r), plus = F.answer(q.fact) < c || r() < 0.6;
    const t = F.twoStepQ(q.fact, c, plus); if (!shows(t)) q = t;
  }
  return { keys: [], ...q, pts: 1, tag: q.tag || null };
}

/* The keys a question's answer needs (. − /), so the pad has them and the bots can use them. */
export function keysFor(q) {
  const k = new Set(q.keys || []);
  const v = typeof q.ans === 'number' ? q.ans : parseNum(q.ans);
  if (v < 0) k.add('−');
  if (typeof q.ans === 'number' && !Number.isInteger(q.ans)) k.add('.');
  if (q.frac || /\//.test(String(q.ans))) k.add('/');
  return [...k].filter((x) => ['.', '−', '/'].includes(x));
}

/* --------------------------------------------------------------------- the run */

export const REVEAL_MS = 1000;      // a wrong answer shows the right one for a second (it teaches)
export const PRECISION_MS = 2000;   // …or two, at a level with Precision: guessing costs
export const BONUS_MS = 20000;
export const MAX_IN = 9;

/* `now` is any millisecond clock; the run's own clock (`t`) only moves while it is not paused. */
export function newRun({ th, lv, mins, k, r = rnd, now = 0, due = [], earned = [] }) {
  const run = { th, id: th.id, lv, mins, dur: mins * 60000, t: 0, last: now, paused: false, r, k, due, earned,
    score: 0, right: 0, wrong: 0, skips: 0, paid: 0, q: null, qAt: 0, input: '', lock: null, log: [], over: false,
    met: [], missed: [], precision: challengesAt(th, lv).includes('precision') };
  next(run);
  return run;
}
const left = (run) => Math.max(0, run.dur - run.t);
function next(run) {
  run.q = question(run.th, run.lv, run.r, { left: left(run), due: run.due, earned: run.earned });
  run.qAt = run.t; run.input = ''; run.lock = null;
}
/* Move the clock to `now`. Returns the events that happened (a lock lifting, the end). */
export function advance(run, now) {
  if (!run.paused && !run.over) { run.t += Math.max(0, now - run.last); }
  run.last = now;
  if (run.over) return [];
  if (run.t >= run.dur) { run.t = run.dur; run.over = true; run.lock = null; return [{ type: 'end' }]; }
  if (run.lock && run.t >= run.lock.until) { next(run); return [{ type: 'next' }]; }
  return [];
}
export function pause(run, now) { advance(run, now); run.paused = true; }
export function resume(run, now) { run.last = now; run.paused = false; }

/* One key: a digit, . − /, ⌫, ✓ (Enter) or S (skip). Returns events for the stage. */
export function press(run, key, now) {
  const ev = advance(run, now);
  if (run.over || run.paused || run.lock) return ev;
  const q = run.q;
  // a skip scores nothing and costs nothing on the score — but, like a miss, it shows the answer for a second (it teaches)
  if (key === 'S') { run.skips++; run.missed.push({ text: q.text, ans: q.ans, skipped: true }); run.lock = { until: run.t + REVEAL_MS, ans: q.ans, given: '', skip: true }; return [...ev, { type: 'skip', q }]; }
  if (key === '⌫') { run.input = run.input.slice(0, -1); return [...ev, { type: 'input' }]; }
  if (key === '✓') { if (run.input === '') return ev; return [...ev, judge(run, false)]; }
  if ((/^\d$/.test(key) || keysFor(q).includes(key)) && run.input.length < MAX_IN) {
    run.input += key;
    // a right answer is taken the moment it is typed; a wrong one waits for Enter (rule 3)
    if (correct(q, run.input)) return [...ev, judge(run, true)];
    return [...ev, { type: 'input' }];
  }
  return ev;
}
function judge(run, right) {
  const q = run.q, ms = run.t - run.qAt;
  if (!right) right = correct(q, run.input);
  if (right) {
    run.score += q.pts; run.right++;
    for (let i = 0; i < q.pts; i++) run.log.push(Math.round(run.t / 100));
    const pay = run.paid < PAY_RUN; if (pay) run.paid++;
    run.met.push({ text: q.text, ans: q.ans });
    const e = { type: 'right', q, ms, pay };
    next(run);
    return e;
  }
  run.wrong++; run.missed.push({ text: q.text, ans: q.ans, given: run.input });
  run.lock = { until: run.t + (run.precision ? PRECISION_MS : REVEAL_MS), ans: q.ans, given: run.input };
  return { type: 'wrong', q, ms };
}

/* The ghost: where your best run was at this moment (its points, in tenths of a second). */
export const ghostAt = (log, t) => (log ? log.filter((x) => x * 100 <= t).length : 0);

/* The end of a run, written to the record. Never moves the level (that is the child's choice,
   levelUp below), never drops it, and counts no days. */
export function finish(k, run) {
  const T = rec(k), key = bestKey(run.id, run.lv, run.mins), target = targetOf(run.th, run.lv, run.mins, run.earned);
  const prev = T.best[key], hit = run.score >= target;
  const beat = prev != null && run.score > prev;
  if (prev == null || run.score > prev) {
    T.best[key] = run.score;
    const g = T.ghost || (T.ghost = {}); g[key] = run.log.slice(0, 400);
  }
  if (beat) T.beat = Math.max(T.beat || 0, run.score - prev);
  const hk = `${run.id}·${run.lv}`, firstHit = hit && !T.hit[hk];
  if (hit) T.hit[hk] = true;
  const cur = levelIn(k, run.id);
  return { score: run.score, target, hit, prev: prev == null ? null : prev, beat, by: beat ? run.score - prev : 0, firstHit,
    offer: hit && run.lv === cur && cur < LEVELS ? cur + 1 : null, toGo: Math.max(0, target - run.score), right: run.right, wrong: run.wrong, skips: run.skips };
}
/* The child chose Level up after hitting the target — the only way a level moves. */
export function levelUp(k, id, from) {
  const T = rec(k); if (levelIn(k, id) !== from || from >= LEVELS || !T.hit[`${id}·${from}`]) return levelIn(k, id);
  T.lv[id] = from + 1; return from + 1;
}
export function verdict(res) {
  if (res.hit) return `${res.score} of ${res.target} — target hit!`;
  return `${res.score} of ${res.target}, ${res.toGo} to go.`;
}

/* The child's due list: their traps and what is due for review, any op (the Bonus round). */
export function dueList(k, now = Date.now()) {
  const out = [];
  for (const [key, r] of Object.entries(k.facts || {})) {
    const f = F.parseKey(key); if (!f || !r || !r.n) continue;
    if ((F.state(r) === 'trap' || r.due <= now) && F.tricky(f) > 0.45) out.push(f);
  }
  return out;
}

/* --------------------------------------------------------------------- bots (tests) */

/* The fluent bot: the slowest child who still counts as fluent (facts.js FLUENT_MS for the
   grade's band), one fluent recall per step, every answer right. */
export function fluentMs(q, band) { return (F.FLUENT_MS[band] || 3500) * (q.steps || 1); }
export function playFluent(th, lv, mins, { k, r, band, due = [], earned = [] }) {
  const run = newRun({ th, lv, mins, k, r, now: 0, due, earned }); let now = 0;
  while (!run.over) {
    now += fluentMs(run.q, band);
    const ans = String(run.q.ans).replace('-', '−');
    let fired = false;
    for (const ch of ans) { const e = press(run, ch, now); if (e.some((x) => x.type === 'right' || x.type === 'end')) { fired = true; break; } }
    if (!fired && !run.over) press(run, '✓', now);
  }
  return run;
}
/* The random typer: presses the pad's keys at random — digits, the question's . − / keys,
   Delete, Enter and Skip — at five a second, as a child mashing the pad would. */
export function playRandom(th, lv, mins, { k, r, earned = [] }) {
  const run = newRun({ th, lv, mins, k, r, now: 0, earned }); let now = 0;
  while (!run.over) {
    now += 200;
    const keys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '✓', 'S', ...keysFor(run.q)];
    press(run, pick(keys, r), now);
    advance(run, now);
  }
  return run;
}

/* --------------------------------------------------------------------- the setup screen */

/* #/timer: grade, theme, level, window — then Start. `ui` is R.ui.tmr (per screen, not saved). */
export function viewTimer(k, ui) {
  const g = ui.grade || gradeOf(k), list = themesFor(g), earned = earnedSutras(k);
  const locked = (th) => th.kind === 'vedic' && !earned.length;
  let th = themeOf(ui.theme); if (!th || !th.grade.includes(g) && th.id !== mixedId(g)) th = list.find((x) => !locked(x));
  const cur = levelIn(k, th.id), lv = Math.min(cur, ui.lv || cur);
  const opens = windowsOpen(lv), mins = opens.includes(ui.mins) ? ui.mins : 2;
  const T = rec(k), best = T.best[bestKey(th.id, lv, mins)], target = targetOf(th, lv, mins, earned);
  const chs = challengesAt(th, lv), news = levelNews(th, lv);
  ui.grade = g; ui.theme = th.id; ui.lv = lv; ui.mins = mins;
  const chip = (arg, label, on, extra = '') => `<button class="chip-btn tmr-chip${on ? ' on' : ''}" data-act="tmr" data-arg="${arg}" aria-pressed="${on}"${extra}>${label}</button>`;
  return `<section class="tmr-setup">
    <header class="phead"><button class="back" data-act="nav" data-arg="play" aria-label="Back to Play"><span aria-hidden="true">←</span> Play</button><div class="phead-t"><h1>Beat the Timer</h1><p>Hit the target, then beat your best.</p></div><div class="phead-r"></div></header>
    <div class="card tmr-pick">
      <p class="kicker">Grade</p>
      <div class="tmr-row" role="group" aria-label="Grade">${GRADES.map((n) => chip(`grade|${n}`, String(n), n === g, ` aria-label="Grade ${n}"`)).join('')}</div>
      <p class="kicker">Theme</p>
      <div class="tmr-themes" role="group" aria-label="Theme">${list.map((x) => {
        const l = levelIn(k, x.id), lk = locked(x);
        return `<button class="tmr-theme${x.id === th.id ? ' on' : ''}" data-act="tmr" data-arg="theme|${x.id}" aria-pressed="${x.id === th.id}"${lk ? ' disabled' : ''}>
          <b>${esc(x.name)}</b><span class="muted small">${lk ? 'Pass a sutra stop in the Sutra Observatory to open it' : `${x.sub ? esc(x.sub) + ' · ' : ''}Level ${l}`}</span></button>`;
      }).join('')}</div>
      <div class="tmr-two">
        <div><p class="kicker">Level</p>
          <div class="tmr-row tmr-lv"><button class="chip-btn tmr-chip" data-act="tmr" data-arg="lv|${lv - 1}" aria-label="Level down"${lv <= 1 ? ' disabled' : ''}>${icon('arrowLeft', 18)}</button>
            <b class="tmr-lvn" data-lv="${lv}">Level ${lv}<small> of ${LEVELS}</small></b>
            <button class="chip-btn tmr-chip" data-act="tmr" data-arg="lv|${lv + 1}" aria-label="Level up to your level"${lv >= cur ? ' disabled' : ''}>${icon('arrowRight', 18)}</button></div>
          <p class="muted small">${lv < cur ? `Your level is ${cur}. Playing an easier one is fine — it keeps its own best.` : 'Your level. Hit its target to choose the next one.'}</p></div>
        <div><p class="kicker">Time</p>
          <div class="tmr-row" role="group" aria-label="Time">${WINDOWS.map((m) => chip(`mins|${m}`, `${m} min`, m === mins, opens.includes(m) ? '' : ` disabled title="Opens at level ${FIVE_FROM}"`)).join('')}</div>
          ${opens.includes(5) ? '' : `<p class="muted small">5 minutes opens at level ${FIVE_FROM}.</p>`}</div>
      </div>
    </div>
    <div class="card tmr-card-lv" data-target="${target}">
      <p class="kicker">${esc(th.name)} · Level ${lv} · ${mins} minute${mins === 1 ? '' : 's'}</p>
      <p class="tmr-target"><b>Target ${target}</b> <span class="muted">— ${rateOf(th, lv, earned)} a minute</span></p>
      ${news ? `<p class="tmr-news">${icon('sparkle', 16)} ${esc(news)}</p>` : ''}
      ${chs.length ? `<ul class="tmr-chs">${chs.map((c) => `<li><b>${esc(CHALLENGES[c].name)}</b> — ${esc(CHALLENGES[c].line)}</li>`).join('')}</ul>` : '<p class="muted small">No challenges yet — they join one at a time from level 4.</p>'}
      <p class="tmr-best">${best != null ? `${icon('trophy', 16)} Your best here: <b data-best="${best}">${best}</b>` : 'No best here yet — your first run sets it.'}</p>
      <button class="btn primary tmr-go" data-act="tmr" data-arg="start">${icon('play', 18)} Start</button>
      <p class="muted small">Type each answer. A right one moves on at once; a wrong one shows the answer for a moment. S skips, for nothing. Keys: digits, Enter, Delete, S.</p>
    </div>
  </section>`;
}

/* A setup choice. Returns true when the screen should redraw. */
export function choose(k, ui, arg) {
  const [what, v] = String(arg).split('|');
  if (what === 'grade') { const g = +v; if (GRADES.includes(g)) { ui.grade = g; rec(k).grade = g; ui.theme = null; ui.lv = null; } return true; }
  if (what === 'theme') { ui.theme = v; ui.lv = null; return true; }
  if (what === 'lv') { ui.lv = Math.max(1, +v); return true; }
  if (what === 'mins') { ui.mins = +v; return true; }
  return false;
}

/* --------------------------------------------------------------------- the stage */

let cur = null;                     // the run on the stage, with its DOM and loop
export const active = () => cur;
/* For the headless checks only (as games.js's __bzmGames): the run on the stage. Never read by the app. */
if (typeof window !== 'undefined') window.__bzmTimer = { active, ghostAt };
const stillMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced';
const clockNow = () => performance.now();
const fmt = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const shown = (v) => String(v).replace(/^-/, '−');

/* ctx: { k, save, earn(ev, note), record(fact, right, ms), medals(), render(), calm() } */
/* A run may start only at a level the child has reached, in a window open at that level (BT4). */
export function canStart(k, id, lv, mins) {
  const th = themeOf(id);
  return !!th && lv >= 1 && lv <= levelIn(k, id) && windowsOpen(lv).includes(mins) && !(th.kind === 'vedic' && !earnedSutras(k).length);
}
export function start(ctx, ui) {
  if (cur) quit();
  const k = ctx.k, th = themeOf(ui.theme), lv = ui.lv, mins = ui.mins;
  if (!canStart(k, ui.theme, lv, mins)) return;
  const run = newRun({ th, lv, mins, k, now: clockNow(), due: dueList(k), earned: earnedSutras(k) });
  const T = rec(k), ghost = (T.ghost || {})[bestKey(th.id, lv, mins)] || null;
  const el = document.createElement('div');
  el.className = 'play tmr-stage';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Beat the Timer');
  document.body.appendChild(el);
  document.documentElement.classList.add('playing', 'tmr-run');
  cur = { ctx, ui, run, el, ghost, best: T.best[bestKey(th.id, lv, mins)], raf: 0, lastTick: null, res: null, card: null };
  draw();
  loop();
  return cur;
}

function draw() {
  const { run, el, ghost, best } = cur, th = run.th, target = targetOf(th, run.lv, run.mins, run.earned);
  const R = 30, C = 2 * Math.PI * R;
  el.innerHTML = `
    <div class="play-bar">
      <button class="play-x" data-t="close" aria-label="Back — stop the run (Escape)">${icon('back', 20)}<span>Back</span></button>
      <div class="play-t"><b>${esc(th.name)}</b><span>Level ${run.lv} · ${run.mins} min · target ${target}</span></div>
    </div>
    <div class="play-body tmr-body">
      <div class="tmr-top">
        <div class="tmr-ring" aria-hidden="true"><svg viewBox="0 0 72 72" width="72" height="72"><circle class="tr-bg" cx="36" cy="36" r="${R}"/><circle class="tr-fg" cx="36" cy="36" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg><b class="tr-t">${fmt(run.dur)}</b></div>
        <div class="tmr-bar" role="meter" aria-label="Score towards the target" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="0">
          <div class="tb-track"><i class="tb-fill"></i>${ghost ? '<i class="tb-ghost" title="Your best, at this moment"></i>' : ''}<i class="tb-line"></i></div>
          <div class="tb-nums"><b class="tb-score" data-score="0">0</b><span class="muted">target ${target}${best != null ? ` · best ${best}` : ''}</span></div>
        </div>
      </div>
      <div class="tmr-q" aria-live="polite"><p class="tq-tag"></p><p class="tq-text"></p><p class="tq-ans" id="tmr-ans"><span class="caret"></span></p><p class="tq-note"></p></div>
      <div class="tmr-pad"></div>
    </div>`;
  el.querySelector('[data-t=close]').addEventListener('click', () => quit());
  el.querySelector('.tmr-pad').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { e.preventDefault(); key(b.dataset.k); } });
  showQ();
}

function showQ() {
  const { run, el } = cur, q = run.q;
  el.querySelector('.tq-text').textContent = q.text;
  el.querySelector('.tq-tag').textContent = q.tag === 'bonus' ? 'Double points — one of your own due facts' : q.tag === 'trick' ? `Trick round: ${byId[q.src] ? byId[q.src].title : ''}` : '';
  el.querySelector('.tmr-q').classList.toggle('bonus', q.tag === 'bonus');
  el.querySelector('.tmr-q').classList.remove('wrong');
  patch();
  el.querySelector('.tmr-pad').innerHTML = keypad(keysFor(q)) + `<button class="btn tmr-skip" data-k="S" aria-label="Skip (S)">Skip <small>S</small></button>`;
}
function patch() {
  const a = cur.el.querySelector('#tmr-ans'); if (!a) return;
  a.innerHTML = cur.run.input ? esc(cur.run.input) : '<span class="caret"></span>';
}

/* Every frame: the ring, the clock, the score bar and the ghost, from the run's own clock. */
function loop() {
  if (!cur || cur.res) return;
  const evs = advance(cur.run, clockNow());
  handle(evs);
  if (!cur || cur.res) return;
  const { run, el, ghost } = cur, rest = run.dur - run.t, target = targetOf(run.th, run.lv, run.mins, run.earned);
  const fg = el.querySelector('.tr-fg'), C = 2 * Math.PI * 30;
  fg.setAttribute('stroke-dashoffset', (C * (1 - rest / run.dur)).toFixed(1));
  el.querySelector('.tr-t').textContent = fmt(rest);
  const scale = Math.max(target, run.score, cur.best || 0) * 1.12 || 1;
  el.querySelector('.tb-fill').style.width = `${Math.min(100, 100 * run.score / scale)}%`;
  el.querySelector('.tb-line').style.left = `${100 * target / scale}%`;
  if (ghost) { const gs = ghostAt(ghost, run.t); const gEl = el.querySelector('.tb-ghost'); gEl.style.left = `${Math.min(100, 100 * gs / scale)}%`; gEl.classList.toggle('passed', run.score > gs && run.score > 0); }
  // the last ten seconds: a soft tick and a pulse — both silenced by Calm mode, the ring stays
  const quiet = cur.ctx.calm();
  const sec = Math.ceil(rest / 1000);
  el.querySelector('.tmr-ring').classList.toggle('pulse', rest <= 10000 && !quiet && !stillMotion());
  if (rest <= 10000 && !quiet && sec !== cur.lastTick && !run.paused) { cur.lastTick = sec; sfx.click(); }
  cur.raf = requestAnimationFrame(loop);
}

function handle(evs) {
  for (const e of evs) {
    if (e.type === 'end') return end();
    if (e.type === 'next') showQ();
    if (e.type === 'input') patch();
    if (e.type === 'skip') showQ();
    if (e.type === 'right') {
      const { ctx } = cur;
      if (e.q.fact) ctx.record(e.q.fact, true, e.ms);
      if (e.pay) ctx.earn('answer', `a right answer in Beat the Timer`);
      ctx.save(); sfx.good();
      const sc = cur.el.querySelector('.tb-score'); sc.textContent = String(cur.run.score); sc.dataset.score = String(cur.run.score);
      cur.el.querySelector('.tmr-bar').setAttribute('aria-valuenow', String(cur.run.score));
      const note = cur.el.querySelector('.tq-note');
      note.textContent = e.q.tag === 'trick' && byId[e.q.src] ? `That was ${byId[e.q.src].title}: ${byId[e.q.src].idea}` : '';
      showQ();
    }
    if (e.type === 'wrong') {
      const { ctx } = cur;
      if (e.q.fact) ctx.record(e.q.fact, false, e.ms);
      ctx.save(); sfx.bad();
      const box = cur.el.querySelector('.tmr-q'); box.classList.add('wrong');
      cur.el.querySelector('#tmr-ans').innerHTML = `<span class="tq-right">${esc(shown(e.q.ans))}</span>`;
      cur.el.querySelector('.tq-note').textContent = cur.run.precision ? 'Not this time — the clock-face freezes for two seconds.' : 'Not this time — that is the answer.';
    }
  }
}

export function key(k) {
  if (!cur) return;
  if (cur.res) return;
  handle(press(cur.run, k, clockNow()));
}

/* Keys while the stage is up (main.js routes them here). */
export function onKey(e) {
  if (!cur) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.key === 'Escape') { quit(); return true; }
  if (cur.res) {
    // Enter takes the choice that has the focus, or the first one — never a button under the stage
    if (e.key === 'Enter' || e.key === ' ') { const a = document.activeElement, b = a && cur.el.contains(a) && a.matches('button') ? a : cur.el.querySelector('.tmr-fin .btn.primary'); if (b) { b.click(); return true; } }
    return false;
  }
  if (/^\d$/.test(e.key)) { key(e.key); return true; }
  const alt = { '.': '.', '-': '−', '/': '/' }[e.key]; if (alt) { key(alt); return true; }
  if (e.key === 'Backspace' || e.key === 'Delete') { key('⌫'); return true; }
  if (e.key === 'Enter') { key('✓'); return true; }
  if (e.key === 's' || e.key === 'S') { key('S'); return true; }
  return false;
}

/* The page hidden: the clock stops where it is, and starts again from there (BT8). */
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (!cur || cur.res) return;
  if (document.hidden) pause(cur.run, clockNow()); else resume(cur.run, clockNow());
});

function end() {
  cancelAnimationFrame(cur.raf);
  const { ctx, run, el } = cur, k = ctx.k, res = cur.res = finish(k, run);
  if (res.firstHit) ctx.earn('stop', `${run.th.name}: level ${run.lv} target hit`);
  ctx.save(); ctx.medals();
  if (res.hit) { sfx.finish(); if (!stillMotion()) confetti(60); }
  const prac = run.met.slice(-6).map((x) => `<li><span class="mono">${esc(x.text)}</span> = <b>${esc(shown(x.ans))}</b></li>`).join('');
  const miss = run.missed.slice(-8).map((x) => `<li><span class="mono">${esc(x.text)}</span> = <b>${esc(shown(x.ans))}</b>${x.skipped ? ' <span class="muted small">skipped</span>' : ''}</li>`).join('');
  el.querySelector('.play-body').innerHTML = `<div class="tmr-fin" data-hit="${res.hit}" data-score="${res.score}">
    <p class="kicker">${esc(run.th.name)} · Level ${run.lv} · ${run.mins} min</p>
    <h2 class="tf-v">${esc(verdict(res))}</h2>
    <p class="tf-best">${res.beat ? `${icon('trophy', 18)} A new best — ${res.by} more than your old ${res.prev}. You overtook your ghost.` : res.prev == null ? 'Your first best here.' : `Your best here is ${Math.max(res.prev, res.score)}.`}</p>
    ${res.firstHit ? `<p class="tf-pay">${icon('coin', 16)} The first time this level's target was hit: 5 coins.</p>` : ''}
    ${res.offer ? `<p class="tf-offer">You hit the target. Level ${res.offer} is yours if you want it — or stay and beat your best.</p>
      <div class="row gap tf-choose"><button class="btn primary" data-t="up">Level up to ${res.offer}</button><button class="btn" data-t="stay">Stay at Level ${run.lv}</button></div>`
      : `<div class="row gap tf-choose"><button class="btn primary" data-t="again">Play again</button><button class="btn" data-t="done">Done</button></div>`}
    ${miss ? `<div class="tf-list"><p class="kicker">Worth another look</p><ul>${miss}</ul></div>` : ''}
    ${prac ? `<div class="tf-list"><p class="kicker">What you practised</p><ul>${prac}</ul></div>` : ''}
  </div>`;
  el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.t, ui = cur.ui;
    if (t === 'up') { ui.lv = levelUp(k, run.id, run.lv); ctx.save(); quit(); return; }
    if (t === 'stay') { ui.lv = run.lv; quit(); return; }
    if (t === 'again') { start(ctx, ui); return; }
    quit();
  }));
  const b = el.querySelector('.tf-choose .btn'); if (b) b.focus();
}

export function quit(silent = false) {
  if (!cur) return;
  cancelAnimationFrame(cur.raf);
  const { ctx } = cur;
  cur.el.remove(); cur = null;
  document.documentElement.classList.remove('playing', 'tmr-run');
  if (!silent) ctx.render();
}
