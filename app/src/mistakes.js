/* mistakes.js — the mistakes deck (FAMILY-STANDARD §12, FIX-MATHS F3).

   Every question a child misses in practice or a test goes into their deck, with the
   working that explains it. It comes back AFTER A GAP — tomorrow, then three days later,
   then a week — the Leitner rule facts.js already keeps ("fluent needs a gap"). Right on
   the day it is due moves it on a step; right three times, each after its gap, and it
   leaves the deck as learned. A miss puts it back to tomorrow — one step, never hidden.
   Nothing here is ever a punishment: the deck is "worth another look", not a list of faults.

   Placement and the level test are never added: finding where to start is not a mistake. */

export const GAPS = [1, 3, 7];              // days until it comes back, by box
export const CAP = 80;                      // the deck keeps the most recent eighty
const DAY = 864e5;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dueAt = (now, days) => startOfDay(now) + days * DAY;
export const NOT_A_MISTAKE = ['place', 'leveltest', 'mistakes'];

export const keyOf = (q) => `${q.trick || (q.fact ? 'fact' : q.puzzle ? 'pz' : 'q')}|${q.text}|${q.ans}`;

/* only what the runner needs to ask it again, and what the review needs to explain it */
const FIELDS = ['text', 'ans', 'choices', 'keys', 'frac', 'why', 'explain', 'trick', 'fact', 'expr', 'kind', 'say', 'choiceHtml', 'decimals', 'tol', 'unit', 'simplest', 'input', 'bar', 'hits', 'how'];
export function slim(q) {
  const o = {};
  for (const f of FIELDS) if (q[f] != null) o[f] = q[f];
  if (q.html && q.html.length <= 6000) o.html = q.html;
  if (q.puzzle) o.puzzle = q.puzzle;
  return o;
}
/* a question whose picture was too big to keep is not added: it would not make sense without it */
export const keepable = (q) => !(q.html && q.html.length > 6000) && q.text != null && q.ans != null;

export function add(k, q, now = Date.now(), from = '') {
  if (!keepable(q)) return false;
  const d = k.mistakes || (k.mistakes = {}), key = keyOf(q), was = d[key];
  d[key] = { q: slim(q), box: 0, due: dueAt(now, GAPS[0]), at: now, misses: (was ? was.misses : 0) + 1, from: from || (was && was.from) || '' };
  const keys = Object.keys(d);
  if (keys.length > CAP) keys.sort((a, b) => d[a].at - d[b].at).slice(0, keys.length - CAP).forEach((x) => delete d[x]);
  return true;
}

export const all = (k) => Object.entries(k.mistakes || {}).map(([key, m]) => ({ key, ...m })).sort((a, b) => a.due - b.due || b.at - a.at);
export const due = (k, now = Date.now()) => all(k).filter((m) => m.due <= now);
export const count = (k, now = Date.now()) => ({ total: Object.keys(k.mistakes || {}).length, due: due(k, now).length });

/* the deck's review: right moves it on (or out, as learned); wrong puts it back to tomorrow */
export function answer(k, key, right, now = Date.now()) {
  const d = k.mistakes || {}, m = d[key]; if (!m) return null;
  if (!right) { m.box = 0; m.due = dueAt(now, GAPS[0]); m.misses++; return 'again'; }
  if (m.due > now) return 'early';                       // right before its gap is practice, not evidence
  m.box++;
  if (m.box >= GAPS.length) { delete d[key]; k.mistakesLearned = (k.mistakesLearned || 0) + 1; return 'learned'; }
  m.due = dueAt(now, GAPS[m.box]); return 'moved';
}
