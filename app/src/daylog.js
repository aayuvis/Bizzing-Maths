/* daylog.js — the daily goal, in Bizzing Bee's three measures (app3.js targets/dayLog/todayMetrics):

     App time        seconds the app was on screen and in use today (the tab visible, someone there)
     Practise time   seconds of that with a question up — a run, a game, Beat the Timer, the Machine,
                     a contest question, a paper
     Right answers   Bee's "Word count": every right answer anywhere today. Maths already counts it,
                     once, in tick() (model.js) — k.days[day].ok — so it is read, never counted twice.

   The grown-up sets the three targets behind the PIN; until they do, the age band's defaults hold.
   Time is stored in SECONDS per day (k.dayLog), targets in minutes, ninety days kept.

   Rule 21: time is TIME. Nothing here writes xp, stars, facts, medals, goals or coins, and nothing
   that decides any of those reads this file (test/coach.mjs proves it). Nothing here counts consecutive days either: a day off is simply a day with no numbers, and it costs nothing. Light: Home reads it. */
import { dayKey } from './rand.js';

export const TICK_MS = 5000;              // the clock's step; each step adds the time actually elapsed
export const IDLE_MS = 5 * 60 * 1000;     // no touch or key for five minutes: nobody is there, the clock stops
export const KEEP_DAYS = 90;
/* the day `i` days before `now`, by the calendar (never by 24-hour steps, which a clock change breaks) */
export const daysAgo = (now, i) => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return dayKey(d); };

/* Bee's defaults are 30 min, 15 min and 10 words. A maths answer is quicker than a spelled word, and a
   six-year-old's sitting is shorter than a teenager's, so the defaults follow the age band. */
export const TARGET_DEF = {
  '6-7': { app: 15, prac: 10, right: 10 },
  '8-10': { app: 20, prac: 10, right: 20 },
  '11-14': { app: 30, prac: 15, right: 30 },
};
export const CHOICES = { app: [10, 15, 20, 30, 45], prac: [5, 10, 15, 20, 30], right: [10, 20, 30, 50] };
export const LABEL = { app: 'App time', prac: 'Practise time', right: 'Right answers' };
/* Bee's ring colours, so the same ring means the same thing in every Bizzing app */
export const RING_COL = { app: ['#E8458C', '#FF8FC0'], prac: ['#2FA35C', '#6FD48F'], right: ['#3D7DF0', '#8FB6FF'] };

export function targets(k) {
  const d = TARGET_DEF[k.band] || TARGET_DEF['8-10'], t = (k.prefs && k.prefs.targets) || {};
  const pick = (key) => (CHOICES[key].includes(t[key]) ? t[key] : d[key]);
  return { app: pick('app'), prac: pick('prac'), right: pick('right') };
}

/* today's (or a day's) time record, made on first use */
export function dayRec(k, d = dayKey()) {
  const log = k.dayLog || (k.dayLog = {});
  const r = log[d] || (log[d] = { app: 0, prac: 0 });
  return r;
}

/* The clock's one write: `secs` of the app in use, `practising` when a question was up. */
export function addTime(k, secs, practising, at = new Date()) {
  if (!k || !(secs > 0)) return;
  const r = dayRec(k, dayKey(at));
  r.app = Math.round((r.app + secs) * 10) / 10;
  if (practising) r.prac = Math.round((r.prac + secs) * 10) / 10;
  const keys = Object.keys(k.dayLog).sort();
  while (keys.length > KEEP_DAYS) delete k.dayLog[keys.shift()];
}

/* One day's three numbers against the targets: p* are fractions of each target (may pass 1). */
export function metrics(k, d = dayKey()) {
  const r = (k.dayLog || {})[d] || { app: 0, prac: 0 }, t = targets(k);
  const right = ((k.days || {})[d] || {}).ok || 0;
  const m = { day: d, app: r.app || 0, prac: r.prac || 0, right, t,
    p: { app: (r.app || 0) / (t.app * 60), prac: (r.prac || 0) / (t.prac * 60), right: right / t.right } };
  m.all = m.p.app >= 1 && m.p.prac >= 1 && m.p.right >= 1;
  return m;
}

/* the seven days ending today, oldest first — the grown-ups' week */
export function week(k, now = Date.now()) {
  const out = [];
  for (let i = 6; i >= 0; i--) out.push(metrics(k, daysAgo(now, i)));
  return out;
}

/* How many of the last `n` days had any maths in them — a count, never a run of days (Bee's
   coachConsistency). The order of the days is deliberately thrown away. */
export function daysWithMaths(k, now = Date.now(), n = 14) {
  let c = 0;
  for (let i = 0; i < n; i++) {
    const d = daysAgo(now, i), q = ((k.days || {})[d] || {}).q || 0, a = ((k.dayLog || {})[d] || {}).app || 0;
    if (q > 0 || a >= 60) c++;
  }
  return c;
}

/* Bee's fmtMins: whole minutes, then hours and minutes */
export function fmtMins(sec) {
  const m = Math.floor(Math.max(0, Math.round(sec || 0)) / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
