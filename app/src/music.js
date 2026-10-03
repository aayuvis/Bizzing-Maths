/* music.js — the music, composed in code for Bizzing (FAMILY-STANDARD §11; music/CREDITS.md).

   Eight loops: one per world, one for Home, and the games' three. No audio files: each loop
   is a few numbers — tempo, key, mode, a chord progression — and a melody grown from a fixed
   seed, so the same loop plays the same way every time and on every device. Every loop is
   24 bars (an A section, the A again with its tail varied, and a B section), 60–90 seconds
   long, and it wraps to bar one on the beat, so it is seamless.

   It is loaded on the child's first tap (main.js imports it lazily), never in the first
   load. It plays through audio.js's MUSIC bus: default 40%, ducked under effects and
   read-aloud, silent in Calm mode, paused whenever the page is hidden. */

import { ctx, buses, musicOn } from './audio.js';

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };

/* prog: chord degrees, one per bar (8 bars, played A A' B with B's own progression) */
export const TUNES = {
  home:      { bpm: 80,  root: 60, scale: 'major',  prog: [0, 5, 3, 4, 0, 5, 1, 4], progB: [3, 4, 2, 5, 3, 4, 1, 4], lead: 'celesta', pad: 'soft', bass: 'round', perc: null, seed: 11, penta: true },
  hills:     { bpm: 96,  root: 62, scale: 'major',  prog: [0, 4, 5, 3, 0, 4, 3, 4], progB: [5, 3, 0, 4, 5, 3, 1, 4], lead: 'pluck', pad: 'soft', bass: 'round', perc: 'shaker', seed: 23, penta: true },
  cliffs:    { bpm: 84,  root: 62, scale: 'dorian', prog: [0, 3, 0, 4, 0, 3, 6, 4], progB: [3, 6, 0, 4, 3, 6, 4, 4], lead: 'kalimba', pad: 'reed', bass: 'round', perc: null, seed: 37, penta: false },
  harbour:   { bpm: 100, bars: 32, root: 65, scale: 'major',  prog: [0, 3, 4, 0, 5, 3, 1, 4], progB: [5, 2, 3, 4, 5, 2, 1, 4], lead: 'marimba', pad: 'soft', bass: 'walk', perc: 'tick', seed: 41, penta: false },
  moon:      { bpm: 72,  root: 57, scale: 'minor',  prog: [0, 5, 2, 6, 0, 5, 3, 4], progB: [5, 6, 0, 3, 5, 6, 4, 4], lead: 'bell', pad: 'space', bass: 'round', perc: null, seed: 53, penta: true },
  courtyard: { bpm: 88,  root: 62, scale: 'mixo',   prog: [0, 0, 6, 0, 3, 0, 6, 0], progB: [3, 3, 0, 0, 6, 6, 4, 0], lead: 'santoor', pad: 'drone', bass: 'drone', perc: 'shaker', seed: 61, penta: false },
  pier:      { bpm: 112, bars: 32, root: 67, scale: 'major',  prog: [0, 5, 3, 4, 0, 5, 3, 4], progB: [3, 4, 0, 5, 3, 4, 1, 4], lead: 'chip', pad: 'none', bass: 'chipbass', perc: 'tick', seed: 73, penta: false },
  bright:    { bpm: 104, bars: 32, root: 60, scale: 'major',  prog: [0, 3, 4, 0, 0, 3, 4, 4], progB: [5, 3, 4, 0, 5, 3, 1, 4], lead: 'pluck', pad: 'none', bass: 'round', perc: 'tick', seed: 83, penta: true },
  calm:      { bpm: 84,  root: 62, scale: 'major',  prog: [0, 5, 3, 4, 0, 5, 3, 4], progB: [3, 0, 4, 5, 3, 0, 1, 4], lead: 'celesta', pad: 'soft', bass: 'round', perc: null, seed: 89, penta: true },
  sea:       { bpm: 90,  root: 57, scale: 'dorian', prog: [0, 3, 0, 4, 0, 3, 4, 4], progB: [3, 6, 0, 4, 3, 6, 4, 4], lead: 'marimba', pad: 'space', bass: 'round', perc: 'shaker', seed: 97, penta: true },
};
export const STEPS = 8;                    // eighth notes per bar
export const barsOf = (name) => TUNES[name].bars || 24;   // 24, or 32 for the quick tunes, so every loop is 60–90 s
export const loopSeconds = (name) => (60 / TUNES[name].bpm) * 4 * barsOf(name);

/* a fixed-seed generator: the melody is grown, not drawn at random each play */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const RHYTHMS = [[1, 0, 1, 0, 1, 1, 1, 0], [1, 0, 0, 1, 1, 0, 1, 0], [1, 1, 1, 0, 1, 0, 0, 0], [1, 0, 1, 1, 0, 1, 1, 0], [1, 0, 0, 0, 1, 0, 1, 1]];

/* The score: for each step of the 24-bar loop, which notes start. Pure, so a test can read it. */
export function score(name) {
  const T = TUNES[name], sc = SCALE[T.scale], r = rng(T.seed);
  const deg = (d) => T.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const chord = (d) => [deg(d), deg(d + 2), deg(d + 4)];
  const penta = T.penta ? [0, 1, 2, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
  const motif = (n) => Array.from({ length: n }, () => ({ rh: RHYTHMS[Math.floor(r() * RHYTHMS.length)], walk: Array.from({ length: 8 }, () => Math.floor(r() * 5) - 2) }));
  const A = motif(4), B = motif(4);
  const bars = [];
  const BARS = barsOf(name);
  for (let b = 0; b < BARS; b++) {
    const sec = ['A', 'A2', 'B', 'B2'][Math.floor(b / 8)];
    const inB = sec[0] === 'B';
    const progDeg = (inB ? T.progB : T.prog)[b % 8];
    const m = (inB ? B : A)[b % 4];
    const tail = sec.endsWith('2') && b % 4 === 3;              // a section again, with its cadence varied
    let at = 7 + progDeg % 7;                                       // start near the chord root, an octave up
    const notes = [];
    for (let s = 0; s < STEPS; s++) {
      if (!(tail ? RHYTHMS[(b + 2) % RHYTHMS.length] : m.rh)[s]) continue;
      at += m.walk[s];
      let d = at;
      if (s % 4 === 0) { const ct = [progDeg, progDeg + 2, progDeg + 4]; d = ct.reduce((x, y) => (Math.abs(y + 7 - at) < Math.abs(x + 7 - at) ? y : x)) + 7; }   // chord tone on the strong beats
      if (!penta.includes(((d % 7) + 7) % 7) && s % 4) d += 1;
      d = Math.max(3, Math.min(12, d)); at = d;                     // a singable range, never shrill
      notes.push({ s, m: deg(d), len: s % 4 === 0 ? 2 : 1 });
    }
    bars.push({ chord: chord(progDeg), bass: deg(progDeg) - 12, lead: notes, last: b === BARS - 1 });
  }
  return bars;
}

/* ------------------------------------------------------------------ the instruments */
let NOISE = null;
function noise(c) { if (NOISE) return NOISE; NOISE = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return NOISE; }
function env(c, out, t, a, d, v) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(out); return g; }
function osc(c, type, f, t, end, to, detune = 0) { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(to); o.start(t); o.stop(end); return o; }
function lp(c, f, to) { const x = c.createBiquadFilter(); x.type = 'lowpass'; x.frequency.value = f; x.connect(to); return x; }

const LEAD = {
  celesta: (c, out, f, t, d) => { const g = env(c, out, t, 0.005, 0.9 * d + 0.4, 0.09); osc(c, 'sine', f, t, t + d + 0.5, g); const h = env(c, out, t, 0.004, 0.25, 0.025); osc(c, 'sine', f * 4, t, t + 0.3, h); },
  pluck:   (c, out, f, t, d) => { const g = env(c, lp(c, 2600, out), t, 0.004, 0.5 * d + 0.25, 0.1); osc(c, 'triangle', f, t, t + d + 0.3, g); },
  kalimba: (c, out, f, t, d) => { const g = env(c, out, t, 0.003, 0.7, 0.1); const o = osc(c, 'sine', f * 1.02, t, t + 0.8, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.03); const h = env(c, out, t, 0.002, 0.12, 0.03); osc(c, 'sine', f * 5.4, t, t + 0.15, h); },
  marimba: (c, out, f, t) => { const g = env(c, out, t, 0.003, 0.35, 0.1); osc(c, 'sine', f, t, t + 0.4, g); const h = env(c, out, t, 0.002, 0.1, 0.04); osc(c, 'triangle', f * 4, t, t + 0.12, h); },
  bell:    (c, out, f, t, d) => { const g = env(c, out, t, 0.006, 1.6 + d, 0.07); osc(c, 'sine', f, t, t + d + 1.7, g); const h = env(c, out, t, 0.004, 0.9, 0.025); osc(c, 'sine', f * 2.76, t, t + 1, h); },
  santoor: (c, out, f, t) => { const g = env(c, lp(c, 2200, out), t, 0.002, 0.45, 0.07); osc(c, 'sawtooth', f, t, t + 0.5, g, -6); osc(c, 'sawtooth', f, t, t + 0.5, g, 6); },
  chip:    (c, out, f, t, d) => { const g = env(c, lp(c, 2400, out), t, 0.004, 0.22 * d + 0.08, 0.045); osc(c, 'square', f, t, t + d * 0.3 + 0.12, g); },
};
const PAD = {
  none: null,
  soft:  (c, out, ch, t, d) => { for (const m of ch) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.3); g.connect(lp(c, 900, out)); osc(c, 'sawtooth', hz(m), t, t + d + 0.4, g, -7); osc(c, 'sawtooth', hz(m), t, t + d + 0.4, g, 7); } },
  reed:  (c, out, ch, t, d) => { for (const m of ch) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.016, t + 0.25); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.2); g.connect(lp(c, 1300, out)); osc(c, 'square', hz(m), t, t + d + 0.3, g); } },
  space: (c, out, ch, t, d) => { for (const m of ch) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02, t + 1.2); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.8); g.connect(lp(c, 700, out)); osc(c, 'triangle', hz(m), t, t + d + 0.9, g, 5); } },
  drone: (c, out, ch, t, d) => { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.4); g.connect(lp(c, 800, out)); osc(c, 'sawtooth', hz(ch[0] - 12), t, t + d + 0.5, g); osc(c, 'sawtooth', hz(ch[0] - 5), t, t + d + 0.5, g); },
};
const BASS = {
  round:    (c, out, m, t, beat) => { for (const k of [0, 2]) { const g = env(c, out, t + k * beat, 0.01, beat * 1.6, 0.07); osc(c, 'triangle', hz(m), t + k * beat, t + k * beat + beat * 1.8, g); } },
  walk:     (c, out, m, t, beat) => { [0, 4, 7, 4].forEach((iv, k) => { const g = env(c, out, t + k * beat, 0.01, beat * 0.8, 0.06); osc(c, 'triangle', hz(m + iv), t + k * beat, t + k * beat + beat, g); }); },
  drone:    () => {},
  chipbass: (c, out, m, t, beat) => { for (let k = 0; k < 4; k++) { const g = env(c, lp(c, 900, out), t + k * beat, 0.005, beat * 0.5, 0.05); osc(c, 'square', hz(m + (k % 2 ? 12 : 0)), t + k * beat, t + k * beat + beat * 0.6, g); } },
};
function perc(c, out, kind, t, beat) {
  if (!kind) return;
  for (let k = 0; k < 8; k++) {
    if (kind === 'tick' && k % 2) continue;
    const s = c.createBufferSource(); s.buffer = noise(c);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'tick' ? 6000 : 4500;
    const g = env(c, out, t + k * beat / 2, 0.002, kind === 'tick' ? 0.03 : 0.06, k % 2 ? 0.012 : 0.02);
    s.connect(hp); hp.connect(g); s.start(t + k * beat / 2); s.stop(t + k * beat / 2 + 0.1);
  }
}

/* ------------------------------------------------------------------ the player */
let now = null;      // { name, bars, bar, next, timer, out }
function mark() { try { const d = document.documentElement.dataset; d.music = now ? 'on' : 'off'; d.tune = now ? now.name : ''; } catch (e) {} }

export function start(name) {
  if (!TUNES[name]) name = 'home';
  if (now && now.name === name) return;
  stop();
  if (!musicOn() || (typeof document !== 'undefined' && document.hidden)) { wanted = name; return; }
  const c = ctx(); if (!c) return;
  wanted = name;
  const out = c.createGain(); out.gain.setValueAtTime(0.0001, c.currentTime); out.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.5); out.connect(buses().music);
  const T = TUNES[name], beat = 60 / T.bpm, bars = score(name), BARS = bars.length;
  now = { name, bars, bar: 0, next: c.currentTime + 0.15, out };
  const tick = () => {
    while (now && now.next < c.currentTime + 0.7) {
      const b = bars[now.bar], t = now.next;
      if (PAD[T.pad]) PAD[T.pad](c, now.out, b.chord, t, beat * 4);
      BASS[T.bass](c, now.out, b.bass, t, beat);
      perc(c, now.out, T.perc, t, beat);
      for (const n of b.lead) LEAD[T.lead](c, now.out, hz(n.m), t + n.s * beat / 2, n.len * beat / 2);
      now.next += beat * 4; now.bar = (now.bar + 1) % BARS;          // bar 24 wraps to bar 1 on the beat
    }
  };
  tick(); now.timer = setInterval(tick, 100);
  mark();
}
let wanted = null;
export function stop(forget = true) {
  if (forget) wanted = null;
  if (!now) return mark();
  const n = now; now = null; clearInterval(n.timer);
  try { const c = ctx(); n.out.gain.cancelScheduledValues(c.currentTime); n.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.25); setTimeout(() => n.out.disconnect(), 1500); } catch (e) {}
  mark();
}
export const playing = () => (now ? now.name : null);
/* the settings changed (mute, Music switch, Calm): follow them */
export function refresh() { if (!musicOn()) { const w = wanted || (now && now.name); stop(); wanted = w; } else if (wanted && !now) start(wanted); }

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.hidden) { const w = wanted || (now && now.name); stop(); wanted = w; }
  else if (wanted) start(wanted);
});
