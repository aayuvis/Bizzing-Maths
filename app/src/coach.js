/* coach.js — the inbuilt coach: what Octo makes of today, from the child's own record.

   Bizzing Bee's coach (app3.js viewCoachDesk + coachReadiness/coachPhase/coachConsistency/
   coachTopProblems) is "answered from a HARDCODED rulebook… No model, no network, nothing
   generated." So is this one. Every sentence is a rule over the record, and every sentence
   carries the numbers it was made from (`ev`), so test/coach.mjs can recompute each one from the
   record and refuse a line that says a number it cannot show the evidence for.

   What it never does: praise it cannot point at, compare one child with another, count consecutive
   days, nag about a day off, or call time learning. Time appears as time (rule 21) and nothing here
   writes to the record. Loaded with #/coach only — never with Home (rule 30). */
import * as F from './facts.js';
import * as MD from './mistakes.js';
import * as DL from './daylog.js';
import * as J from './journey.js';
import { TRICKS, byId } from './tricks.js';
import { THEMES as TIMER_THEMES } from './timer-themes.js';

const DAY = 864e5;
const noon = (t) => { const d = new Date(t); d.setHours(12, 0, 0, 0); return d.getTime(); };

/* ---- Bee's phase, keyed off the contest day a grown-up may set (k.prefs.contest). Bee's thresholds:
   more than four weeks out is BREADTH (meet new things), two to four weeks DEPTH (fix what trips you),
   the last two weeks SIM (sit it the way the day will feel). No date, no phase: the everyday rules. */
export const PHASE_AT = { breadth: 28, depth: 14 };
export function daysTo(k, now = Date.now()) {
  const c = k.prefs && k.prefs.contest;
  if (!c || !/^\d{4}-\d\d-\d\d$/.test(c)) return null;
  return Math.round((noon(new Date(c + 'T12:00')) - noon(now)) / DAY);
}
export function phase(k, now = Date.now()) {
  const d = daysTo(k, now);
  if (d == null) return { key: 'none', d: null };
  if (d < 0) return { key: 'past', d };
  return { key: d > PHASE_AT.breadth ? 'breadth' : d > PHASE_AT.depth ? 'depth' : 'sim', d };
}

/* ---- readiness (Bee's coachReadiness): the child's own operation, by the Leitner states facts.js
   keeps, and the stops by their stars. Ready = fluent (still fast after a gap); seen = met at all. */
export function readiness(k) {
  const op = (k.prefs && k.prefs.op) || '×', t = F.tally(k.facts || {}, op);
  const seen = t.total - t.new;
  const met = TRICKS.filter((x) => ((k.tricks || {})[x.id] || {}).stars > 0).length;
  const mastered = TRICKS.filter((x) => ((k.tricks || {})[x.id] || {}).stars >= 2).length;
  return { op, opName: F.OP_NAME[op], ...t, seen, coverage: t.total ? Math.round(100 * seen / t.total) : 0, ready: t.total ? Math.round(100 * t.fluent / t.total) : 0,
    stopsMet: met, stopsMastered: mastered, stopsTotal: TRICKS.length };
}

/* ---- what keeps catching you (Bee's coachTopProblems): facts by misses, then the mistakes deck */
export function problems(k, n = 6) {
  const facts = Object.entries(k.facts || {}).map(([key, r]) => ({ key, f: F.parseKey(key), r }))
    .filter((x) => x.f && x.r && x.r.miss > 0)
    .sort((a, b) => b.r.miss - a.r.miss || (b.r.last || 0) - (a.r.last || 0))
    .slice(0, n).map((x) => ({ key: x.key, op: x.f.op, text: F.text(x.f), misses: x.r.miss, state: F.state(x.r), why: F.why(x.f) }));
  const deck = MD.all(k).filter((m) => m.misses > 0).sort((a, b) => b.misses - a.misses || b.at - a.at).slice(0, n)
    .map((m) => ({ key: m.key, text: m.q.text, misses: m.misses }));
  return { facts, deck };
}

/* ---- the record's numbers, gathered once: every line and the action read from here */
export function gather(k, now = Date.now()) {
  const facts = Object.values(k.facts || {});
  const today = DL.metrics(k, DL.daysAgo(now, 0));
  // answers on record: the day counts keep ninety days, the fact records keep for ever — whichever is more
  const answersEver = Math.max(Object.values(k.days || {}).reduce((a, d) => a + (d.q || 0), 0), facts.reduce((a, r) => a + (r.n || 0), 0));
  let q7 = 0, ok7 = 0;
  for (let i = 0; i < 7; i++) { const d = (k.days || {})[DL.daysAgo(now, i)] || {}; q7 += d.q || 0; ok7 += d.ok || 0; }
  const rd = readiness(k), p = J.progress(k), ph = phase(k, now);
  const traps = Object.keys(k.facts || {}).filter((x) => F.parseKey(x) && F.state(k.facts[x]) === 'trap');
  const dueAll = F.dueList(k.facts || {}, now);
  const weak = TRICKS.find((t) => { const r = (k.tricks || {})[t.id]; return r && r.stars === 1 && (r.runs || 0) > 0; }) || null;
  return {
    now, today, answersEver,
    traps: traps.length, trapEx: traps.length ? F.text(F.parseKey(traps.slice().sort((a, b) => (k.facts[b].last || 0) - (k.facts[a].last || 0))[0])) : null,
    due: dueAll.length - traps.length, dueAll: dueAll.length,
    fluent: facts.filter((r) => F.state(r) === 'fluent').length,
    lapsed: facts.filter((r) => r.lapsed).length,
    mistakes: MD.count(k, now),
    acc7: q7 >= 10 ? Math.round(100 * ok7 / q7) : null, q7,
    days14: DL.daysWithMaths(k, now, 14),
    rd, level: p ? p.level : null, next: p && p.next ? { id: p.next.stop, title: p.next.t.title } : null,
    testNext: !!(p && !p.next && p.nextTest && !p.finishedTop),
    phase: ph, weak: weak ? { id: weak.id, title: weak.title } : null,
    top: problems(k, 1).facts[0] || null,
  };
}

const s = (n, one, many) => (n === 1 ? one : many);

/* ---- Octo's notes: each line is a rule, its words and the numbers it stands on. Most useful first. */
export function lines(k, g = gather(k)) {
  const L = [], add = (id, text, ev) => L.push({ id, text, ev });
  const t = g.today, pracMin = Math.floor(t.prac / 60);
  if (!g.answersEver) {
    add('start', 'We have not done any maths together yet, so there is nothing for me to read. Your first stop is the place to start.', { answersEver: 0 });
    return L;
  }
  if (g.phase.key === 'past') add('phase', 'Your contest day has passed. A grown-up can set the next one on their page.', { phase: 'past', days: g.phase.d });
  else if (g.phase.key !== 'none') {
    const d = g.phase.d, when = `${d} ${s(d, 'day', 'days')} to your contest day`;
    add('phase', g.phase.key === 'breadth' ? `${when}. That is plenty of time: meet new stops now, and the papers come later.`
      : g.phase.key === 'depth' ? `${when}. This is the time to fix what trips you, more than to meet new things.`
        : `${when}. Sit papers against the clock, so the day itself feels familiar.`, { phase: g.phase.key, days: d });
  }
  if (t.all) add('today', `All three rings are closed today: ${t.right} right ${s(t.right, 'answer', 'answers')} and ${pracMin} ${s(pracMin, 'minute', 'minutes')} with a question up. Anything more is a bonus.`, { right: t.right, pracMin, all: true });
  else if (t.right || pracMin) add('today', `Today so far: ${t.right} right ${s(t.right, 'answer', 'answers')} of your ${t.t.right}, and ${pracMin} ${s(pracMin, 'minute', 'minutes')} with a question up.`, { right: t.right, target: t.t.right, pracMin });
  else add('today', 'No maths yet today. A day off costs nothing — here is what I would pick when you start.', { right: 0, pracMin: 0 });
  if (g.mistakes.due) add('mistakes', `${g.mistakes.due} ${s(g.mistakes.due, 'mistake from your deck is', 'mistakes from your deck are')} ready to try again: enough time has passed to show whether ${s(g.mistakes.due, 'it', 'they')} stuck.`, { mistakesDue: g.mistakes.due });
  if (g.traps) add('traps', `${g.traps} ${s(g.traps, 'fact is', 'facts are')} tripping you right now, like ${g.trapEx}. A miss moves a fact back one box — it is never a fault.`, { traps: g.traps, fact: g.trapEx });
  if (g.top && g.top.misses >= 2) add('top', `${g.top.text} has caught you ${g.top.misses} times. A way in: ${g.top.why}.`, { fact: g.top.text, misses: g.top.misses, why: g.top.why });
  if (g.due > 0) add('due', `${g.due} ${s(g.due, 'fact has', 'facts have')} come due. A gap has passed, so answering ${s(g.due, 'it', 'them')} now shows what stuck.`, { due: g.due });
  if (g.lapsed) add('lapsed', `${g.lapsed} ${s(g.lapsed, 'fact has', 'facts have')} slipped since ${s(g.lapsed, 'it was', 'they were')} fluent. That is normal, and ${s(g.lapsed, 'it comes', 'they come')} back quickly.`, { lapsed: g.lapsed });
  if (g.fluent) add('fluent', `${g.fluent} ${s(g.fluent, 'fact is', 'facts are')} fluent: still fast after a gap of days.`, { fluent: g.fluent });
  if (g.rd.stopsMastered) add('stops', `You have mastered ${g.rd.stopsMastered} ${s(g.rd.stopsMastered, 'stop', 'stops')}${g.level ? ` and you are on Level ${g.level}` : ''}.`, g.level ? { stopsMastered: g.rd.stopsMastered, level: g.level } : { stopsMastered: g.rd.stopsMastered });
  return L;
}

/* Beat the Timer's theme for an operation (timer-themes.js), at the child's band */
export const TIMER_FOR = (op, band) => ({ '+': 'add20', '-': 'sub20', '×': band === '6-7' ? 'mul10' : 'mul12', '÷': 'div', '²': 'sq' }[op] || 'mul12');

/* ---- ONE next action (Bee's "Beat it →"): the first rule that holds wins, and the button goes to
   the exact thing — never a room. */
export function action(k, g = gather(k)) {
  const A = (id, label, href, why, ev) => ({ id, label, href, why, ev });
  if (!g.answersEver) return A('start', 'Start my road', '#/continue', 'The first stop finds where your road starts.', { answersEver: 0 });
  if (g.phase.key === 'sim') return A('hall', 'Sit a contest paper', '#/hall', `${g.phase.d} ${s(g.phase.d, 'day', 'days')} to go: a paper against the clock.`, { phase: 'sim', days: g.phase.d });
  if (g.mistakes.due) return A('mistakes', `Try ${g.mistakes.due} ${s(g.mistakes.due, 'mistake', 'mistakes')} again`, '#/mistakes', `${s(g.mistakes.due, 'It has had its', 'They have had their')} gap — this is when trying again counts.`, { mistakesDue: g.mistakes.due });
  if (g.traps || g.dueAll >= 3) return A('calm', 'Rush · Calm on your due facts', '#/play/rush:calm', `${g.dueAll} ${s(g.dueAll, 'fact is', 'facts are')} due or tripping you. Calm has no clock.`, { dueAll: g.dueAll });
  if (g.weak && g.phase.key !== 'breadth') return A('drill', `Practise ${g.weak.title} again`, `#/stop/${encodeURIComponent(g.weak.id + '|drill')}`, `One star so far on ${g.weak.title}: two stars means mastered.`, { stop: g.weak.title, stars: 1 });
  if (g.rd.total && g.rd.fluent / g.rd.total >= 0.6) {
    const id = TIMER_FOR(g.rd.op, k.band), th = TIMER_THEMES.find((x) => x.id === id);
    return A('timer', `Beat the Timer: ${th.name}`, `#/timer/${id}`, `${g.rd.fluent} of the ${g.rd.total} facts in ${g.rd.opName} are fluent — race them.`, { fluent: g.rd.fluent, total: g.rd.total, op: g.rd.opName });
  }
  if (g.next) return A('next', `Next stop: ${g.next.title}`, '#/continue', `Your road goes on with ${g.next.title}.`, { stop: g.next.title });
  if (g.level == null) return A('place', 'Find where my road starts', '#/continue', 'A few questions find the level your road starts at.', { level: null });
  if (g.testNext) return A('test', 'Take the next test', '#/continue', 'Every stop before it is walked: the test is the next step on your road.', { level: g.level });
  return A('road', 'See my road', '#/atlas', 'Every stop on this road is walked.', { level: g.level });
}

/* Everything the coach screen shows, in one object (coach-view.js draws it; the test reads it). */
export function read(k, now = Date.now()) {
  const g = gather(k, now);
  return { g, lines: lines(k, g), action: action(k, g), problems: problems(k), readiness: g.rd };
}
