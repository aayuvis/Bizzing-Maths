/* bizzing-activity.js — the drop-in every Bizzing app includes so that Bizzing
   Schedule can count its minutes without the child typing anything.

   USE (one line, after the app knows which child is playing):
       import { trackActivity } from './bizzing-activity.js';
       trackActivity('bee', () => currentChild()?.name);

   WHAT IT RECORDS — and nothing else:
       { a: 'bee', d: '2026-09-27', t: 1020, m: 18, who: 'Anaya' }
     app id, local date, start minute, ACTIVE minutes, the child's first name.
   It lives in localStorage['bizzing.activity'] on this device. Every Bizzing app
   is served from aayuvis.github.io, so Schedule reads the same key. It is never
   sent anywhere: no network call exists in this file.

   WHAT COUNTS AS ACTIVE: the tab is visible AND the child touched, clicked, typed
   or scrolled in the last two minutes. A game left open on the table does not
   rack up time — Schedule would otherwise tell a parent a child practised for
   three hours when they watched TV beside it.

   Sessions older than 120 days, and anything past 4,000 entries, are trimmed.
   Spec: docs/02-activity-contract.md. */

const KEY = 'bizzing.activity';
const IDLE = 2 * 60 * 1000, TICK = 15 * 1000, GAP = 5 * 60 * 1000, KEEP_DAYS = 120, MAX = 4000;
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && Array.isArray(o.s) ? o : { v: 1, s: [] }; } catch { return { v: 1, s: [] }; }
}
function store(o) {
  const cutoff = ymd(new Date(Date.now() - KEEP_DAYS * 864e5));
  o.s = o.s.filter((x) => x.d >= cutoff).slice(-MAX);
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {}
}

export function trackActivity(app, getName = () => null) {
  if (typeof window === 'undefined' || !/^(bee|maths|geography|india|finance)$/.test(app)) return () => {};
  let lastInput = Date.now(), activeMs = 0, lastTick = Date.now(), session = null, lastActive = 0;
  const poke = () => { lastInput = Date.now(); };
  const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
  EVENTS.forEach((e) => addEventListener(e, poke, { passive: true, capture: true }));

  const tick = () => {
    const now = Date.now(), dt = now - lastTick;
    lastTick = now;
    if (document.visibilityState !== 'visible' || now - lastInput > IDLE || dt > TICK * 3) return;
    activeMs += dt;
    if (activeMs < 60000) return;          // write whole minutes only
    activeMs -= 60000;
    const o = load(), d = new Date(), who = (getName() || '').trim() || undefined;
    // continue the session if it is the same app, child and day, and < 5 min since last active
    if (!session || now - lastActive > GAP || session.d !== ymd(d) || session.who !== who) {
      session = { a: app, d: ymd(d), t: d.getHours() * 60 + d.getMinutes(), m: 0, ...(who ? { who } : {}) };
      o.s.push(session);
    } else {
      const i = o.s.findIndex((x) => x.a === session.a && x.d === session.d && x.t === session.t && x.who === session.who);
      if (i >= 0) session = o.s[i]; else o.s.push(session);
    }
    session.m += 1;
    lastActive = now;
    store(o);
  };
  const timer = setInterval(tick, TICK);
  return () => { clearInterval(timer); EVENTS.forEach((e) => removeEventListener(e, poke, { capture: true })); };
}

/* A milestone — a band, world, stop or mastery reached — for Hive goals and the
   grown-ups' report. m is 0 so it never counts as minutes. */
export function trackMilestone(app, who, ev, label) {
  if (typeof window === 'undefined' || !/^(bee|maths|geography|india|finance)$/.test(app)) return;
  if (!/^(band|world|stop|mastery)$/.test(ev)) return;
  const d = new Date(), o = load();
  o.s.push({ a: app, d: ymd(d), t: d.getHours() * 60 + d.getMinutes(), m: 0, ev, label: String(label).slice(0, 80), ...(who ? { who: who.trim() } : {}) });
  store(o);
}
