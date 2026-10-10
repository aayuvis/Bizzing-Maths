/* test/coach.mjs — Bizzing Bee's daily goal and its coach, engine side (daylog.js, coach.js).

     · the three measures — app time, practise time, right answers — come out of a scripted record
       exactly; the targets follow the age band until a grown-up picks, and only from the choices
     · TIME IS TIME (rule 21): hours on the app move no rank, medal, goal, mastery measure or coin,
       and no module that decides those reads the time record at all
     · every line the coach says carries its evidence, every number in it is in that evidence, and
       the evidence is recomputed here from the record by a second route
     · the ONE next action is a link to a real thing — a route the app has, a stop, a Beat the Timer
       theme, Rush · Calm — and every rule that picks one is reached by some record
     · no streak words, no comparing children, no praise without evidence; days with maths are a
       count, so the same days in any order give the same number
   Every check is also run against a broken twin (BROKEN …) and must fail there. */
import { readFileSync, readdirSync } from 'node:fs';
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };

const { Family } = await import('../src/store.js');
const { newKid, rankOf } = await import('../src/model.js');
const F = await import('../src/facts.js');
const MD = await import('../src/mistakes.js');
const DL = await import('../src/daylog.js');
const C = await import('../src/coach.js');
const { award } = await import('../src/medals.js');
const { summary } = await import('../src/objectives.js');
const { measures } = await import('../src/report.js');
const { TRICKS, byId } = await import('../src/tricks.js');
const { THEMES } = await import('../src/timer-themes.js');
const { GAMES } = await import('../src/arcade.js');
const { dayKey } = await import('../src/rand.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.error('  ✗ ' + m); } else if (process.env.V) console.log('  ✓ ' + m); };
const breaks = (fn) => { const f0 = fails, q = console.error; console.error = () => {}; try { fn(); } finally { console.error = q; } const did = fails > f0; fails = f0; return did; };
const src = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

const DAY = 864e5, NOW = new Date('2026-10-10T15:00:00').getTime(), TODAY = dayKey(new Date(NOW));
const at = (dDays, h = 15) => { const d = new Date(NOW); d.setDate(d.getDate() + dDays); d.setHours(h, 0, 0, 0); return d.getTime(); };
const keyDay = (dDays) => dayKey(new Date(at(dDays)));

/* ---------------------------------------------------------------- scripted records */
const fk = (op, a, b) => F.key({ op, a, b });
/* answers driven through the Leitner engine itself (facts.js record), on the days they happened */
function answer(k, op, a, b, right, fast, when) {
  const key = fk(op, a, b), r = k.facts[key] || (k.facts[key] = F.blank());
  F.record(r, right, fast ? 1000 : 9000, k.band, when);
  const d = dayKey(new Date(when)), day = k.days[d] || (k.days[d] = { q: 0, ok: 0 });
  day.q++; if (right) { day.ok++; k.xp++; }
}
/* fluent: fast and right each time it came due — 1, then 3, then 7 days */
const fluentFrom = (k, op, a, b, startDay) => { answer(k, op, a, b, true, true, at(startDay)); answer(k, op, a, b, true, true, at(startDay + 1)); answer(k, op, a, b, true, true, at(startDay + 4)); };
function mid() {
  const k = newKid('Asha', '8-10', 'octo'); k.prefs.op = '×'; k.journey.level = 3;
  for (const d of [-13, -9, -6, -3]) { answer(k, '×', 2, 3, true, true, at(d, 10)); }
  fluentFrom(k, '×', 6, 7, -6);                      // fluent, not due (box 3 from day −2, due day +5)
  fluentFrom(k, '×', 4, 9, -12);                     // fluent and due again today
  answer(k, '×', 3, 4, true, true, at(-3));          // box 1, due since day −2
  for (const d of [-2, -1, 0]) answer(k, '×', 7, 8, false, false, at(d, 9));   // a trap, missed three times
  answer(k, '×', 6, 8, false, false, at(-1)); answer(k, '×', 6, 8, true, false, at(0, 10));   // missed once, then right: a trap still
  for (let i = 0; i < 9; i++) answer(k, '×', 5, 5, true, true, at(0, 11));   // today's other right answers
  MD.add(k, { text: '45 + 38', ans: 83, trick: 'make-ten' }, at(-2), 'drill');   // due since yesterday
  MD.add(k, { text: '120 ÷ 8', ans: 15, trick: 'x' }, at(0, 9), 'drill');         // not due until tomorrow
  k.tricks['make-ten'] = { stars: 2, best: 9, learned: true, runs: 3 };
  k.tricks['near-doubles'] = { stars: 1, best: 6, learned: true, runs: 2 };
  DL.addTime(k, 1500, false, new Date(at(0, 12))); DL.addTime(k, 420, true, new Date(at(0, 12)));
  DL.addTime(k, 900, true, new Date(at(-3, 12)));
  return k;
}
const clone = (k) => structuredClone(k);
const fresh = () => newKid('Ravi', '6-7', 'octo');
function noMistakesDue(k) { for (const m of Object.values(k.mistakes)) m.due = at(3); return k; }
function calmOnly(k) { k.facts = {}; k.days = {}; k.mistakes = {}; k.tricks = {}; return k; }
const make = {
  fresh: () => fresh(),
  mid: () => mid(),
  traps: () => noMistakesDue(mid()),
  drill: () => { const k = calmOnly(mid()); fluentFrom(k, '×', 6, 7, -6); k.tricks['near-doubles'] = { stars: 1, best: 6, learned: true, runs: 2 }; return k; },
  timer: () => { const k = calmOnly(mid()); k.prefs.op = '²'; for (let a = 1; a <= 13; a++) fluentFrom(k, '²', a, 2, -6); return k; },
  next: () => { const k = calmOnly(mid()); fluentFrom(k, '×', 6, 7, -6); return k; },
  sim: () => { const k = mid(); k.prefs.contest = keyDay(7); return k; },
  depth: () => { const k = noMistakesDue(mid()); k.prefs.contest = keyDay(20); return k; },
  breadth: () => { const k = calmOnly(mid()); fluentFrom(k, '×', 6, 7, -6); k.tricks['near-doubles'] = { stars: 1, runs: 2 }; k.prefs.contest = keyDay(40); return k; },
  past: () => { const k = mid(); k.prefs.contest = keyDay(-3); return k; },
  closed: () => { const k = mid(); DL.addTime(k, 3600, true, new Date(at(0, 13))); for (let i = 0; i < 12; i++) answer(k, '+', 2, 2, true, true, at(0, 14)); return k; },
  young: () => { const k = fresh(); answer(k, '+', 3, 4, true, true, at(0)); return k; },
};
const variants = Object.fromEntries(Object.entries(make).map(([n, f]) => [n, f()]));

/* ---------------------------------------------------------------- 1 · the three measures */
{
  const k = mid(), m = DL.metrics(k, TODAY);
  ok(m.app === 1500 + 420 && m.prac === 420, `app and practise time are the seconds recorded today (${m.app}, ${m.prac})`);
  ok(m.right === k.days[TODAY].ok && m.right === 10, `right answers are today's right answers, counted once (${m.right})`);
  ok(m.t.app === 20 && m.t.prac === 10 && m.t.right === 20, `8–10 defaults: 20 min, 10 min, 20 right (${JSON.stringify(m.t)})`);
  ok(m.p.prac === 420 / 600 && m.p.right === 0.5 && !m.all, 'each ring is its own fraction of its own target');
  const y = DL.targets(fresh()), o = DL.targets(newKid('Mei', '11-14', 'octo'));
  ok(y.app === 15 && y.prac === 10 && y.right === 10 && o.app === 30 && o.prac === 15 && o.right === 30, 'the defaults follow the age band');
  const g = mid(); g.prefs.targets = { app: 45, prac: 7, right: 50 };
  const t = DL.targets(g); ok(t.app === 45 && t.right === 50 && t.prac === 10, `a grown-up's choice holds; a number not on offer falls back to the band (${JSON.stringify(t)})`);
  const w = DL.week(k, NOW); ok(w.length === 7 && w[6].day === TODAY && w[3].day === keyDay(-3) && w[3].prac === 900, 'the week is seven calendar days ending today, from the same record');
  const old = mid(); for (let i = 0; i < 120; i++) DL.addTime(old, 60, false, new Date(at(-i)));
  ok(Object.keys(old.dayLog).length === DL.KEEP_DAYS, `ninety days of time are kept, never more (${Object.keys(old.dayLog).length})`);
  ok(DL.fmtMins(0) === '0m' && DL.fmtMins(419) === '6m' && DL.fmtMins(3720) === '1h 2m', 'minutes are shown as Bee shows them');
  // days with maths is a count, so the same days in a different order are the same number — and a gap resets nothing
  const a = fresh(), b = fresh();
  for (const d of [0, -1, -2, -7, -9]) a.days[keyDay(d)] = { q: 3, ok: 2 };
  for (const d of [0, -4, -6, -7, -13]) b.days[keyDay(d)] = { q: 3, ok: 2 };
  ok(DL.daysWithMaths(a, NOW) === 5 && DL.daysWithMaths(b, NOW) === 5, 'five days with maths is five, whichever five');
  ok(breaks(() => { const brokenCount = (k2) => { let n = 0, best = 0; for (let i = 0; i < 14; i++) { if ((k2.days[DL.daysAgo(NOW, i)] || {}).q) n++; else { best = Math.max(best, n); n = 0; } } return Math.max(best, n); };
    ok(brokenCount(a) === brokenCount(b), 'twin'); }), 'BROKEN: a count of days in a run is caught (the two children differ)');
}

/* ---------------------------------------------------------------- 2 · time is TIME (rule 21) */
function learningOf(k) {
  const c = clone(k); const medals = award(c, NOW).map((x) => x.id).sort();
  return JSON.stringify({ xp: k.xp, rank: rankOf(k.xp).i, medals, goals: summary(k), measures: measures(k), facts: k.facts, tricks: k.tricks, coins: Family.balance(k.name) });
}
function timeMovesNothing(addTime) {
  for (const [name, k0] of Object.entries(variants)) {
    const k = clone(k0), before = learningOf(k);
    for (let d = 0; d < 30; d++) addTime(k, 6 * 3600, d % 2 === 0, new Date(at(-d)));
    ok(learningOf(k) === before, `${name}: 30 days of hours on the app move no rank, medal, goal, mastery or coin`);
    ok(DL.metrics(k, TODAY).app >= 6 * 3600, `${name}: …while the time itself is recorded`);
  }
}
timeMovesNothing(DL.addTime);
ok(breaks(() => timeMovesNothing((k, s, p, when) => { DL.addTime(k, s, p, when); k.xp += Math.floor(s / 600); })), 'BROKEN: time that pays xp is caught');
ok(breaks(() => timeMovesNothing((k, s, p, when) => { DL.addTime(k, s, p, when); Family.earn(k.name, 'answer', when.getTime()); })), 'BROKEN: time that pays coins is caught');
{ // and no module that decides rank, medals, goals, mastery, coins or the coach's choice of stop reads the time record
  const readers = readdirSync(new URL('../src/', import.meta.url), { recursive: true }).filter((f) => /\.js$/.test(f) && /dayLog/.test(src('../src/' + f)));
  const allowed = ['daylog.js', 'store.js', 'model.js'];
  ok(readers.every((f) => allowed.includes(f)), `only daylog.js (and the store's migration, the new child's empty record) touch k.dayLog (got ${readers.join(', ')})`);
  ok((src('../src/model.js').match(/dayLog/g) || []).length === 1, 'model.js only creates an empty dayLog for a new child');
  for (const f of ['medals.js', 'objectives.js', 'merit.js', 'report.js', 'journey.js', 'facts.js']) ok(!/daylog|metrics\(|addTime/.test(src('../src/' + f)), `${f} never reads the daily goal's time`);
}

/* ---------------------------------------------------------------- 3 · every line carries its evidence */
const noon = (t) => { const d = new Date(t); d.setHours(12, 0, 0, 0); return d.getTime(); };
const isTrap = (r) => !!(r && r.n && (r.recent || []).slice(-2).includes('X'));
/* the record's numbers by a second route — never through coach.js */
function truth(k) {
  const fs = Object.entries(k.facts).filter(([key]) => F.parseKey(key));
  const traps = fs.filter(([, r]) => isTrap(r)), due = fs.filter(([, r]) => r.n && !isTrap(r) && r.due <= NOW);
  const t = k.prefs.targets || {}, def = DL.TARGET_DEF[k.band];
  const c = k.prefs.contest, days = c ? Math.round((noon(new Date(c + 'T12:00')) - noon(NOW)) / DAY) : null;
  return {
    answersEver: Math.max(Object.values(k.days).reduce((a, d) => a + d.q, 0), fs.reduce((a, [, r]) => a + r.n, 0)),
    right: (k.days[TODAY] || {}).ok || 0,
    target: DL.CHOICES.right.includes(t.right) ? t.right : def.right,
    pracMin: Math.floor((((k.dayLog || {})[TODAY] || {}).prac || 0) / 60),
    mistakesDue: Object.values(k.mistakes).filter((m) => m.due <= NOW).length,
    traps: traps.length, trapTexts: traps.map(([key]) => F.text(F.parseKey(key))),
    due: due.length, dueAll: traps.length + due.length,
    lapsed: fs.filter(([, r]) => r.lapsed).length,
    fluent: fs.filter(([, r]) => r.box >= F.MASTERED_BOX && !isTrap(r)).length,
    stopsMastered: Object.values(k.tricks).filter((r) => r.stars >= 2).length,
    level: k.journey.level, days, phase: days == null ? 'none' : days < 0 ? 'past' : days > 28 ? 'breadth' : days > 14 ? 'depth' : 'sim',
    total: F.BANK[k.prefs.op].length, op: F.OP_NAME[k.prefs.op],
    missesOf: (text) => { const e = fs.find(([key]) => F.text(F.parseKey(key)) === text); return e ? e[1].miss : null; },
  };
}
/* problems with one line, or [] — the numbers it says, and the evidence it carries */
function lineProblems(k, l) {
  const T = truth(k), out = [], ev = l.ev || {};
  if (!l.ev || typeof l.ev !== 'object') return ['no evidence'];
  let words = l.text; for (const v of Object.values(ev)) if (typeof v === 'string') words = words.split(v).join(' ');
  const nums = Object.values(ev).filter((v) => typeof v === 'number');
  for (const n of (words.match(/\d+/g) || []).map(Number)) if (!nums.includes(n)) out.push(`says ${n}, which is not in its evidence ${JSON.stringify(ev)}`);
  for (const [key, v] of Object.entries(ev)) {
    const want = key === 'fact' ? null : key === 'misses' ? T.missesOf(ev.fact) : key === 'why' ? F.why(F.parseKey(fk(...(() => { const m = /^(\d+) (.) (\d+)$/.exec(ev.fact.replace('−', '-')); return [m[2], +m[1], +m[3]]; })()))) : key === 'all' ? DL.metrics(k, TODAY).all : key === 'stop' || key === 'stars' ? v : T[key];
    if (key === 'fact') { if (!(l.id === 'traps' ? T.trapTexts.includes(v) : T.missesOf(v) != null)) out.push(`names ${v}, which the record does not back`); continue; }
    if (want === undefined) { out.push(`evidence ${key} has no second route`); continue; }
    if (want !== v) out.push(`evidence ${key}=${JSON.stringify(v)}, the record says ${JSON.stringify(want)}`);
  }
  return out;
}
const WORDS_NEVER = /streak|in a row|don[’']?t break|come back tomorrow|consecutive|other (children|kids)|everyone else|than most|average|amazing|awesome|superstar|genius|well done|great job|you rock/i;
const reached = new Set(), lineIds = new Set();
for (const [name, k] of Object.entries(variants)) {
  const r = C.read(k, NOW);
  ok(r.lines.length >= 1, `${name}: the coach has something to say`);
  for (const l of [...r.lines, { id: 'action', text: `${r.action.label}. ${r.action.why}`, ev: r.action.ev }]) {
    lineIds.add(l.id);
    const pr = lineProblems(k, l);
    ok(!pr.length, `${name} · ${l.id}: "${l.text}" — ${pr.join('; ')}`);
    ok(!WORDS_NEVER.test(l.text), `${name} · ${l.id}: no streak, comparison or empty praise in "${l.text}"`);
  }
  reached.add(r.action.id);
}
ok(['start', 'phase', 'today', 'mistakes', 'traps', 'top', 'due', 'fluent', 'stops'].every((x) => lineIds.has(x)), `every rule's line is reached by some record (${[...lineIds].join(', ')})`);
ok(variants.fresh && C.read(variants.fresh, NOW).lines.length === 1 && C.read(variants.fresh, NOW).lines[0].id === 'start', 'a child with nothing on record hears one line, and it says so plainly');
{ const k = variants.mid, l = C.read(k, NOW).lines.find((x) => x.id === 'traps');
  ok(breaks(() => ok(!lineProblems(k, { ...l, text: l.text.replace(/^\d+/, (n) => String(+n + 1)) }).length, 'twin')), 'BROKEN: a line that says a number it has no evidence for is caught');
  ok(breaks(() => ok(!lineProblems(k, { ...l, text: l.text.replace(/^\d+/, '99'), ev: { ...l.ev, traps: 99 } }).length, 'twin')), 'BROKEN: evidence the record does not back is caught');
  ok(breaks(() => ok(!lineProblems(k, { ...l, ev: { ...l.ev, fact: '9 × 9' }, text: l.text.replace(l.ev.fact, '9 × 9') }).length, 'twin')), 'BROKEN: a fact the child never missed is caught');
  ok(breaks(() => ok(!WORDS_NEVER.test('Keep your streak going — come back tomorrow!'), 'twin')), 'BROKEN: a streak line is caught'); }
// and the coach's own words, anywhere in its source, never reach for a streak
for (const f of ['coach.js', 'coach-view.js', 'daylog.js']) ok(!/streak|in\s+a\s+row|don[’']?t\s+break|come\s+back\s+tomorrow/i.test(src('../src/' + f)), `${f}: no streak words anywhere`);

/* ---------------------------------------------------------------- 4 · the ONE action goes to a real thing */
const ROUTES = /export const ROUTES = \[([^\]]+)\]/.exec(src('../src/main.js'))[1].match(/'([a-z]+)'/g).map((x) => x.slice(1, -1));
function resolves(href) {
  const m = /^#\/([a-z]+)(?:\/(.+))?$/.exec(href); if (!m) return 'not an app link';
  const [nav, arg] = [m[1], m[2] ? decodeURIComponent(m[2]) : null];
  if (!ROUTES.includes(nav)) return `no route ${nav}`;
  if (nav === 'stop') { const [id, tab] = arg.split('|'); return byId[id] && ['learn', 'story', 'turn', 'drill'].includes(tab) ? '' : `no stop ${arg}`; }
  if (nav === 'timer') return THEMES.some((t) => t.id === arg) ? '' : `no timer theme ${arg}`;
  if (nav === 'play') return arg === 'rush:calm' && GAMES.some((g) => g.id === 'rush') && /arg === 'rush:calm'\) \{ fire\('startCalm'\)/.test(src('../src/main.js')) ? '' : `no game ${arg}`;
  if (nav === 'facts') return F.OPS.includes(arg.split('|')[0]) ? '' : `no facts ${arg}`;
  return arg == null ? '' : `${nav} takes no argument here (${arg})`;
}
const WANT = { start: '#/continue', hall: '#/hall', mistakes: '#/mistakes', calm: '#/play/rush:calm', next: '#/continue', place: '#/continue', test: '#/continue', road: '#/atlas' };
for (const [name, k] of Object.entries(variants)) {
  const a = C.read(k, NOW).action, bad = resolves(a.href);
  ok(!bad, `${name}: "${a.label}" → ${a.href} resolves (${bad})`);
  if (WANT[a.id]) ok(a.href === WANT[a.id], `${name}: ${a.id} goes to ${WANT[a.id]} (got ${a.href})`);
}
ok(['start', 'hall', 'mistakes', 'calm', 'drill', 'timer', 'next', 'place'].every((x) => reached.has(x)), `every next-action rule is reached by some record (${[...reached].join(', ')})`);
ok(C.read(variants.mid, NOW).action.id === 'mistakes' && C.read(variants.traps, NOW).action.id === 'calm' && C.read(variants.sim, NOW).action.id === 'hall', 'the rules are in order: the contest close, then mistakes due, then facts due');
ok(C.read(variants.young, NOW).action.id === 'place', 'a child not yet placed on a road is sent to find their level, never told the road is walked');
ok(C.read(variants.breadth, NOW).action.id !== 'drill' && C.read(variants.drill, NOW).action.id === 'drill', 'in the breadth weeks the coach sends you onward, not back');
{ const a = C.read(variants.drill, NOW).action; ok(a.href === `#/stop/${encodeURIComponent('near-doubles|drill')}`, `the drill is the stop with one star (${a.href})`); }
{ const a = C.read(variants.timer, NOW).action; ok(a.href === '#/timer/sq', `squares fluent → Beat the Timer on squares (${a.href})`); }
for (const op of F.OPS) for (const band of ['6-7', '8-10', '11-14']) ok(!resolves('#/timer/' + C.TIMER_FOR(op, band)), `Beat the Timer has a theme for ${op} at ${band}`);
ok(breaks(() => ok(!resolves('#/stop/' + encodeURIComponent('no-such-stop|drill')), 'twin')), 'BROKEN: a stop that does not exist is caught');
ok(breaks(() => ok(!resolves('#/timer/nope'), 'twin')), 'BROKEN: a timer theme that does not exist is caught');
ok(breaks(() => ok(!resolves('#/somewhere'), 'twin')), 'BROKEN: a route the app does not have is caught');

/* ---------------------------------------------------------------- 5 · the phase, Bee's thresholds */
ok(C.phase(variants.sim, NOW).key === 'sim' && C.phase(variants.depth, NOW).key === 'depth' && C.phase(variants.breadth, NOW).key === 'breadth' && C.phase(variants.past, NOW).key === 'past' && C.phase(variants.mid, NOW).key === 'none', 'no date, no phase; then breadth > 28 days, depth > 14, sim, past');
ok(C.daysTo(variants.sim, NOW) === 7, 'seven days to a contest day a week away');

/* ---------------------------------------------------------------- 6 · the coach writes nothing */
for (const [name, f] of Object.entries(make)) { const k = f(), before = JSON.stringify(k); C.read(k, NOW); ok(JSON.stringify(k) === before, `${name}: reading the coach changes nothing in the record`); }

if (fails) { console.error(`coach: ${fails} failure(s)`); process.exit(1); }
console.log(`ok coach — the three measures, time moves nothing (${Object.keys(variants).length} records × 30 days), every line's evidence recomputed, ${reached.size} next-action rules all resolving, no streak words`);
