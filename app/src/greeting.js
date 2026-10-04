/* greeting.js — what Octo says on Home, from evidence (audit v4 B1/B5).

   The greeting names something specific and TRUE from the child's own record, in this
   order: what they did last, when it was today or yesterday; a fact that slipped and is
   due again; a medal they are close to; what they did last, further back; then one of
   the plain lines. Nothing here is invented to sound encouraging, nothing counts days
   in a row, and nothing scolds a gap — a week away reads exactly like a day away.
   Returns a line with <b> for the thing named; Home strips the tags for the bubble. */

import { parseKey, text as factText } from './facts.js';
import { medalStates } from './medals.js';
import { dayKey, seeded } from './rand.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;

export const LINES = [
  (n) => `Ready, ${n}? One stop, twenty facts and a puzzle — that is a great day.`,
  (n) => `${n}, the road has a new trick waiting for you.`,
  (n) => `Every right answer moves your rank, ${n}. Nothing else does.`,
  (n) => `Let’s make a big sum small today, ${n}.`,
];

/* "today", "yesterday", "on Tuesday" (inside a week), else "last time". */
export function whenSaid(at, now = Date.now()) {
  if (!at) return 'last time';
  const days = Math.round((new Date(dayKey(new Date(now))) - new Date(dayKey(new Date(at)))) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `on ${new Date(at).toLocaleDateString('en-GB', { weekday: 'long' })}`;
  return 'last time';
}

function lastSaid(L, n, when) {
  const what = ['stop', 'stars', 'tried', 'land'].includes(L.what) ? `“${esc(L.title || '')}”` : esc(L.title || '');   // a stop is quoted: the bubble is plain text, and a title can be a question
  const W = when === 'last time' ? 'last time' : when;
  return {
    stop: `You cracked <b>${what}</b> ${W}, ${n}. Shall we keep walking?`,
    stars: `Three stars on <b>${what}</b> ${W}, ${n} — fast and fearless.`,
    land: `You crossed <b>${what}</b> ${W}, ${n}. A new land is open.`,
    level: `Level up ${W}! You are on <b>${what}</b> now, ${n}.`,
    facts: `Twenty facts ${W}, <b>${what}</b> right. Some more today, ${n}?`,
    floor: `You cleared <b>${what}</b> of the Puzzle Tower ${W}, ${n}.`,
    tried: `You had a go at <b>${what}</b> ${W}, ${n}. It gets easier every try.`,
    paper: `You sat <b>${what}</b> ${W}, ${n}. The review shows which way in to practise.`,
  }[L.what] || null;
}

/* A fact that slipped — its last answer was a miss, or it fell back below a week's box —
   and whose gap has come round, so trying it now is the right thing to do. */
export function slippedDue(k, now = Date.now()) {
  let best = null;
  for (const [key, r] of Object.entries(k.facts || {})) {
    if (!r || !r.n || !(r.due <= now)) continue;
    if (!(r.lapsed || (r.recent || []).at(-1) === 'X')) continue;
    if (!best || (r.last || 0) > (best.r.last || 0)) best = { key, r };
  }
  const f = best && parseKey(best.key);
  return f ? { key: best.key, text: factText(f) } : null;
}

/* The unearned medal the child is closest to: at least 60% of the way, and already started. */
export function medalNear(k) {
  const near = medalStates(k).filter((m) => !m.earned && m.need > 1 && m.now > 0 && m.now / m.need >= 0.6 && m.now < m.need);
  near.sort((a, b) => b.now / b.need - a.now / a.need);
  return near[0] || null;
}

const WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function greetingLine(k, now = Date.now()) {
  const n = esc(k.name), L = k.last, when = L ? whenSaid(L.at, now) : null;
  const recent = L && (when === 'today' || when === 'yesterday') && L.what !== 'tried';
  if (recent) { const s = lastSaid(L, n, when); if (s) return s; }
  const slip = slippedDue(k, now);
  if (slip) return `<b>${esc(slip.text)}</b> slipped last time, ${n}. Its gap is up — it is ready to try again.`;
  const m = medalNear(k);
  if (m) { const left = m.need - m.now; return `${WORD[left] || left} more and the <b>${esc(m.name)}</b> medal is yours, ${n}: ${esc(m.desc.replace(/\.$/, ''))}.`; }
  if (L) { const s = lastSaid(L, n, when); if (s) return s; }
  return LINES[Math.floor(seeded('line:' + dayKey(new Date(now)) + k.id)() * LINES.length)](n);
}
