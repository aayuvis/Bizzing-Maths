/* report.js — the grown-ups' report card in the family format (standard §7):
   TIME · PROGRESS · MASTERY, per child, so the Hive can lay every app's card
   side by side. One plain object, computed — never stored, never sent.

     time      active minutes, from the family activity feed (bizzing.activity,
               written by the drop-in, which counts only minutes with a touch)
     progress  steps along the path: the level road, its lands, its stations
     mastery   what the child can now do, from evidence: fluent facts (still
               fast after a gap), stops mastered, goals met per strand

   Weekly trend lines come from k.weeks — one snapshot per week, taken as the
   child plays — and from the feed and k.days, which already carry dates.
   Usage never stands in for learning: minutes are TIME, and only TIME. */

import { TRICKS } from './tricks.js';
import { OPS, tally, state as fstate } from './facts.js';
import { goalsFor, summary } from './objectives.js';
import * as J from './journey.js';
import { dayKey } from './rand.js';

const DAY = 864e5;
/* Monday of the week `t` is in, as a day key — the Hive's week. */
export function weekOf(t) { const d = new Date(t); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); }

/* The evidence that can be counted right now — snapshotted weekly for the trend. */
export function measures(k) {
  const p = J.progress(k), j = J.rec(k), sm = summary(k);
  const passed = Object.entries(j.tests || {}).filter(([, r]) => r.passed).map(([key]) => key);
  return {
    fluent: OPS.reduce((a, o) => a + tally(k.facts, o).fluent, 0),
    mastered: TRICKS.filter((t) => ((k.tricks[t.id] || {}).stars || 0) >= 2).length,
    goals: sm.met,
    stations: p ? p.done : 0,
    level: p ? p.level : null,
    lands: passed.filter((x) => !x.endsWith(':level')).length,
    levels: passed.filter((x) => x.endsWith(':level')).length,
  };
}

/* Keep this week's snapshot current; twelve weeks are kept, never more. */
export function snapshot(k, now = Date.now()) {
  k.weeks = k.weeks || {};
  k.weeks[weekOf(now)] = measures(k);
  const keys = Object.keys(k.weeks).sort();
  while (keys.length > 12) delete k.weeks[keys.shift()];
}

export function reportCard(k, feed = [], now = Date.now()) {
  const mine = feed.filter((x) => x.a === 'maths' && !x.ev && (x.who || '').toLowerCase() === k.name.toLowerCase());
  const thisWk = weekOf(now);
  const weeks = [];
  for (let i = 5; i >= 0; i--) {
    const wk = weekOf(now - i * 7 * DAY), end = weekOf(now - (i - 1) * 7 * DAY);
    const inWk = (d) => d >= wk && (i === 0 || d < end);
    const days = Object.entries(k.days || {}).filter(([d]) => inWk(d));
    weeks.push({
      wk, minutes: mine.filter((x) => inWk(x.d)).reduce((a, x) => a + x.m, 0),
      tried: days.reduce((a, [, v]) => a + v.q, 0), right: days.reduce((a, [, v]) => a + v.ok, 0),
      ...((k.weeks || {})[wk] || {}),
    });
  }
  const now7 = weeks.at(-1);
  // when in the day the minutes fall: morning before 12, afternoon to 5, evening after
  const when = { morning: 0, afternoon: 0, evening: 0 };
  for (const x of mine.filter((x) => x.d >= weekOf(now - 3 * 7 * DAY))) when[x.t < 720 ? 'morning' : x.t < 1020 ? 'afternoon' : 'evening'] += x.m;
  const m = measures(k), p = J.progress(k);
  const strands = goalsFor(k).map((s) => { const gs = s.goals.filter((g) => !g.later); return { name: s.name, glyph: s.glyph, met: gs.filter((g) => g.met).length, total: gs.length, started: gs.some((g) => g.seen) }; });
  const facts = Object.values(k.facts || {});
  return {
    v: 1, app: 'maths', who: k.name, band: k.band, at: now,
    time: { week: now7.minutes, days: new Set(mine.filter((x) => x.d >= thisWk).map((x) => x.d)).size, when },
    progress: { level: m.level, stations: m.stations, total: p ? p.total : 0, lands: m.lands, levels: m.levels, label: p ? `Level ${p.level} · ${p.L.name} · stop ${Math.min(p.done + 1, p.total)} of ${p.total}` : 'Not on a road yet' },
    mastery: { fluent: m.fluent, mastered: m.mastered, goals: m.goals, goalsTotal: summary(k).total, strands, traps: facts.filter((r) => fstate(r) === 'trap').length, lapsed: facts.filter((r) => r.lapsed).length },
    weeks,
  };
}
