/* ui.js — the small vocabulary every view speaks. Taken from Bizzing Finance.
   Rendering is `state -> render()` returning a string; clicks dispatch by
   [data-act]. Inherited from Bizzing Bee because the team is fluent in it. */

import { setVoiceSound } from './voice.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function cls(...a) { return a.filter(Boolean).join(' '); }

/* ---- action dispatch ---------------------------------------------------- */
const acts = Object.create(null);
export function on(name, fn) { acts[name] = fn; }
/* An action may need code that is not here yet (the stops' code: tricks.js loadEngine). The
   gate holds every action until it is, IN ORDER, and returns the promise so a caller that
   waits — the headless checks — sees the action done. An action that only moves between
   screens or changes a setting is `safe` and never waits: a screen that needs the code waits
   for it itself (main.js screen()). Set once by main.js. */
let gate = null, queue = null;
export function gateActions(g) { gate = g; }
export function fire(name, arg, ev) {
  const fn = acts[name];
  if (!fn) { console.warn('no action:', name); return; }
  // once anything is waiting, everything after it waits behind it too: taps happen in the order they were made
  if (gate && (queue || (!gate.safe.has(name) && !gate.ready()))) {
    const need = () => (gate.safe.has(name) || gate.ready() ? null : gate.wait().then(() => true, (e) => { gate.failed(e); return false; }));
    const p = (queue || Promise.resolve()).then(need).then((ok) => (ok === false ? undefined : fn(arg, ev)))
      .catch((e) => { if (typeof reportError === 'function') reportError(e); else setTimeout(() => { throw e; }); });
    queue = p; p.then(() => { if (queue === p) queue = null; });
    return p;
  }
  return fn(arg, ev);
}
export function bindRoot(root) {
  const go = (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const act = el.getAttribute('data-act');
    if (act === 'noop') { ev.stopPropagation(); return; }
    ev.preventDefault();
    fire(act, el.getAttribute('data-arg'), ev);
  };
  root.addEventListener('click', go);
  root.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest('[data-act]');
    if (el && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') { go(ev); }
  });
}

/* ---- sound: small WebAudio effects, no assets --------------------------- */
/* Every effect goes through audio.js's EFFECTS bus (one volume slider, Calm mode softer)
   and ducks the music for a moment, so a chime is never fighting the tune. The family's
   six (standard §11): right · wrong · finish · medal · coin · unlock — plus the games'
   small action sounds. All soft and short. */
import * as AU from './audio.js';
let soundOn = true;
export function setSound(v) { soundOn = !!v; AU.configure({ sound: soundOn }); setVoiceSound(soundOn); music.refresh(); }
function tone(freq, dur, type, vol, delay) {
  if (!soundOn || !AU.effectsOn()) return;
  const c = AU.ctx(); if (!c) return;
  const t = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime((vol == null ? 0.14 : vol) * 2.2, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.buses().sfx);
  o.start(t); o.stop(t + dur + 0.02);
  AU.duck(Math.max(500, (dur + (delay || 0)) * 1000 + 250));
}
export const sfx = {
  click() { tone(520, 0.07, 'triangle', 0.06); },
  coin() { tone(880, 0.09, 'triangle', 0.11); tone(1320, 0.13, 'triangle', 0.09, 0.06); },
  good() { tone(660, 0.1, 'sine', 0.12); tone(990, 0.16, 'sine', 0.1, 0.08); },
  bad() { tone(247, 0.14, 'triangle', 0.08); tone(196, 0.2, 'triangle', 0.07, 0.08); },   // "not this time": low and soft, never a buzzer
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.11, i * 0.09)); },
  finish() { [587, 740, 880].forEach((f, i) => tone(f, 0.2, 'sine', 0.1, i * 0.08)); tone(1175, 0.5, 'sine', 0.08, 0.26); },
  medal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, i * 0.11)); tone(392, 0.9, 'triangle', 0.06); },
  unlock() { tone(440, 0.08, 'triangle', 0.08); tone(660, 0.08, 'triangle', 0.08, 0.07); tone(880, 0.35, 'sine', 0.1, 0.14); },
  bell() { [784, 1175].forEach((f, i) => tone(f, 0.8, 'sine', 0.1, i * 0.14)); },
  /* the games' vocabulary: one small sound per action (the Duolingo rule) */
  pop() { tone(740, 0.06, 'sine', 0.1); tone(1480, 0.08, 'triangle', 0.05, 0.03); },
  // each consecutive right answer climbs a pentatonic step, capped so it never shrieks
  combo(n) { const st = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][Math.min(9, Math.max(0, n - 1))]; tone(523 * Math.pow(2, st / 12), 0.12, 'triangle', 0.08, 0.05); },
  drop() { tone(330, 0.12, 'sine', 0.08); tone(247, 0.16, 'sine', 0.06, 0.06); },
  place() { tone(392, 0.06, 'triangle', 0.08); },
  fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, 'triangle', 0.1, i * 0.11)); },
};

/* ---- music: composed in code (music.js), loaded on first use ------------ */
/* `music.start(name)` names a loop: a world's, 'home', or a game's ('bright', 'calm',
   'sea'). The composer is imported the first time it is wanted — never in the first
   load — and the browser lets it sound only after the child's first tap anyway. */
let M = null, want = null, loading = null;
function load() { return M ? Promise.resolve(M) : (loading || (loading = import('./music.js').then((m) => (M = m)))); }
export const music = {
  start(name) { want = name; load().then((m) => { if (want === name) m.start(name); }); },
  stop() { want = null; if (M) M.stop(); },
  refresh() { if (M) M.refresh(); else if (want && AU.musicOn()) music.start(want); },
  playing() { return M ? !!M.playing() : false; },
  wanted: () => want,
};

/* ---- transient chrome --------------------------------------------------- */
let toastT = null;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach((n) => n.remove());
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg; d.setAttribute('role', 'status');
  document.body.appendChild(d);
  clearTimeout(toastT);
  toastT = setTimeout(() => d.remove(), 2400);
}
const CONF = ['#F0B429', '#2D5BD8', '#178A4C', '#E0673A', '#8A5BD6', '#2E7FA8'];
export function confetti(n) {
  // no confetti under reduced motion or in Calm mode (standard §5)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced' || document.documentElement.hasAttribute('data-calm')) return;
  const wrap = document.createElement('div');
  wrap.className = 'conf'; wrap.setAttribute('aria-hidden', 'true');
  let html = '';
  for (let i = 0; i < (n || 40); i++) {
    const dur = (2.4 + (i % 6) * 0.35).toFixed(2);
    html += `<i style="left:${(i * 37) % 100}%;background:${CONF[i % 6]};animation-duration:${dur}s;animation-delay:${((i * 0.13) % 1.2).toFixed(2)}s"></i>`;
  }
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4200);
}
/* Confetti celebrates what just happened; it never falls over the next question. A run, a
   contest or a game clears whatever is still in the air before its first question shows. */
export function clearConfetti() { document.querySelectorAll('.conf').forEach((n) => n.remove()); }

/* ---- number helpers used all over the UI -------------------------------- */
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function sum(a) { return a.reduce((x, y) => x + y, 0); }

/* Small counts read better as words in a sentence a child reads aloud —
   "all three done", not "all 3 done". Above twelve the digit is clearer. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve'];
export function nWord(n) { return WORDS[n] !== undefined ? WORDS[n] : String(n); }


/* ── read to me ───────────────────────────────────────────────────────────
   Questions can be read aloud for a child who reads slower than they
   calculate — a six-year-old should not lose a fact to the word "sixty".
   voice.js reads it in the device's own voice, with the maths said as words
   ("three quarters", not "three slash four"). The signatures are the ones every
   caller already uses: say(text, onend) and hush(). */
export { speak as say, hush, canSay, setSayRate } from './voice.js';
