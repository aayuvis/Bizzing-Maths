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
export function fire(name, arg, ev) {
  const fn = acts[name];
  if (fn) fn(arg, ev);
  else console.warn('no action:', name);
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

/* ---- sound: tiny WebAudio blips, no assets ------------------------------ */
let AC = null, soundOn = true;
export function setSound(v) { soundOn = !!v; setVoiceSound(soundOn); if (!soundOn) music.stop(false); else if (musicWanted) music.start(musicWanted); }
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur, type, vol, delay) {
  const c = ac(); if (!c || !soundOn) return;
  const t = c.currentTime + (delay || 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol == null ? 0.14 : vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  click() { tone(520, 0.07, 'triangle', 0.06); },
  coin() { tone(880, 0.09, 'triangle', 0.11); tone(1320, 0.13, 'triangle', 0.09, 0.06); },
  good() { tone(660, 0.1, 'sine', 0.12); tone(990, 0.16, 'sine', 0.1, 0.08); },
  bad() { tone(220, 0.16, 'sawtooth', 0.07); tone(170, 0.2, 'sawtooth', 0.06, 0.08); },
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.11, i * 0.09)); },
  bell() { [784, 1175].forEach((f, i) => tone(f, 0.8, 'sine', 0.1, i * 0.14)); },
  /* the Arcade's vocabulary: one small sound per action (the Duolingo rule) */
  pop() { tone(740, 0.06, 'sine', 0.1); tone(1480, 0.08, 'triangle', 0.05, 0.03); },
  // each consecutive right answer climbs a pentatonic step, capped so it never shrieks
  combo(n) { const st = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][Math.min(9, Math.max(0, n - 1))]; tone(523 * Math.pow(2, st / 12), 0.12, 'triangle', 0.08, 0.05); },
  drop() { tone(330, 0.12, 'sine', 0.08); tone(247, 0.16, 'sine', 0.06, 0.06); },
  place() { tone(392, 0.06, 'triangle', 0.08); },
  fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, 'triangle', 0.1, i * 0.11)); },
};

/* ---- a music loop: synthesised, no assets ------------------------------- */
/* A soft pentatonic loop for the games — a bass note and a four-note figure on
   a gentle sine, scheduled a beat ahead. It follows the sound toggle, it stops
   when the game closes, and it stops whenever the page is hidden: a phone in a
   pocket must not keep playing. `music.start(style)` names one of the loops;
   document.documentElement[data-music] says whether it is playing, for the
   headless checks and nothing else. */
const LOOPS = {
  bright: { bpm: 104, bass: [131, 131, 175, 196], notes: [523, 659, 784, 659, 587, 784, 880, 784] },
  calm:   { bpm: 84,  bass: [147, 165, 131, 147], notes: [587, 698, 880, 698, 659, 784, 988, 784] },
  sea:    { bpm: 90,  bass: [110, 131, 147, 131], notes: [440, 523, 659, 784, 659, 523, 587, 523] },
};
let musicWanted = null, musicTimer = 0, musicStep = 0, musicNext = 0, musicBus = null;
function musicMark(on) { try { document.documentElement.dataset.music = on ? 'on' : 'off'; } catch (e) {} }
export const music = {
  start(style = 'bright') {
    musicWanted = LOOPS[style] ? style : 'bright';
    if (!soundOn || musicTimer || (typeof document !== 'undefined' && document.hidden)) return;
    const c = ac(); if (!c) return;
    musicBus = c.createGain(); musicBus.gain.value = 0.0001; musicBus.connect(c.destination);
    musicBus.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);   // fade in, never a jolt
    musicStep = 0; musicNext = c.currentTime + 0.1;
    const L = LOOPS[musicWanted], beat = 60 / L.bpm / 2;
    const voice = (f, t, d, v, type) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + d + 0.05);
    };
    const tick = () => {
      while (musicNext < c.currentTime + 0.4) {
        const i = musicStep % L.notes.length;
        voice(L.notes[i], musicNext, beat * 1.6, 0.022, 'sine');
        if (i % 4 === 0) voice(L.bass[(musicStep / 4 | 0) % L.bass.length], musicNext, beat * 3.6, 0.03, 'triangle');
        musicNext += beat; musicStep++;
      }
    };
    tick(); musicTimer = setInterval(tick, 120);
    musicMark(true);
  },
  /* `forget` false keeps the wish, so a hidden page resumes when it comes back */
  stop(forget = true) {
    if (forget) musicWanted = null;
    clearInterval(musicTimer); musicTimer = 0;
    if (musicBus) { const b = musicBus; musicBus = null; try { b.gain.cancelScheduledValues(0); b.gain.setValueAtTime(0.0001, AC.currentTime); setTimeout(() => b.disconnect(), 200); } catch (e) {} }
    musicMark(false);
  },
  playing() { return !!musicTimer; },
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.stop(false);
  else if (musicWanted) music.start(musicWanted);
});

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
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced') return;
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
