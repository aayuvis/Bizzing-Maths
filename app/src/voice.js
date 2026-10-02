/* voice.js — read to me, in the family's narrator.

   Questions and instructions are read in the same recorded Indian English voice
   the rest of the Bizzing family uses (tools/voice/tts.py). The recordings ship
   with the app and play on the device; nothing is sent anywhere.

   A line is played whole when it was recorded whole (a story beat, a guide's
   sentence). A generated question is played as a chain of recorded PIECES —
   numbers, operators and the words between them (voice-text.js) — but only if
   EVERY piece has a recording. One missing piece and the whole line goes to the
   device's own voice instead: a sentence half in one voice and half in another,
   or a recording that silently skips a word, is worse than either voice alone.

   Clips are fetched one utterance at a time, when they are needed; nothing
   preloads the corpus. `onend` fires after the last clip has played, so the
   voice is the clock (a story beat moves on when its line has been SAID). */

import { normalise, keyOf } from './voice-text.js';
import { VOICE } from './voice-manifest.js';

let soundOn = true, sayRate = 1, gen = 0, playing = null;
export function setVoiceSound(v) { soundOn = !!v; if (!soundOn) hush(); }
export function setSayRate(r) { sayRate = r || 1; }

/* ---- the device voice: the fallback, unchanged from before recordings -------- */
export function canDevice() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'; }
function pickVoice() {
  const vs = speechSynthesis.getVoices() || [];
  return vs.find((v) => /en[-_]IN/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang) && /natural|neural|premium|enhanced/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}
function device(text, onend) {
  if (!canDevice() || !text) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' ').trim());
    const v = pickVoice(); if (v) u.voice = v;
    u.lang = (v && v.lang) || 'en-IN'; u.rate = sayRate; u.pitch = 1;
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/* ---- the plan: text → recorded clips, or null -------------------------------- */
const PART_GAP = 160;
export function plan(textOrParts, manifest = VOICE) {
  const parts = [].concat(textOrParts).filter((p) => p != null && String(p).trim() !== '');
  if (!parts.length) return null;
  const out = [], words = [];
  for (const part of parts) {
    const n = normalise(part);
    if (!n) return { clips: null, words: parts.join(' ') };
    words.push(n.words);
    if (out.length) out.push({ gap: PART_GAP });
    const whole = manifest[keyOf(n.words)];
    if (whole) { out.push({ ...whole, k: keyOf(n.words) }); continue; }
    for (const p of n.pieces) {
      if (p.gap !== undefined) { out.push({ gap: p.gap }); continue; }
      const c = manifest[keyOf(p.k)];
      if (!c) return { clips: null, words: words.join(' '), missing: p.k };
      out.push({ ...c, k: keyOf(p.k) });
    }
  }
  return { clips: out, words: words.join(' ') };
}
export const recorded = (textOrParts) => { const p = plan(textOrParts); return !!(p && p.clips); };

/* ---- playback ---------------------------------------------------------------- */
const blobs = new Map();
function fetchClip(f) {
  if (!blobs.has(f)) {
    blobs.set(f, fetch(`voice/${f}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then((b) => URL.createObjectURL(b))
      .catch((e) => { blobs.delete(f); throw e; }));
  }
  return blobs.get(f);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function playOne(url, d, my) {
  return new Promise((resolve, reject) => {
    if (my !== gen) return resolve(false);
    const a = new Audio(url);
    a.playbackRate = sayRate;
    playing = a;
    let done = false;
    const end = (ok) => { if (done) return; done = true; clearTimeout(guard); if (playing === a) playing = null; resolve(ok); };
    // a clip that never says it ended must not hold the whole line hostage
    const guard = setTimeout(() => end(true), ((d || 2) / sayRate) * 1000 + 1500);
    a.onended = () => end(true);
    a.onerror = () => { clearTimeout(guard); done = true; reject(new Error('clip')); };
    const p = a.play();
    if (p && p.catch) p.catch((e) => { if (!done) { clearTimeout(guard); done = true; reject(e); } });
  });
}
async function perform(clips, words, onend, my) {
  try {
    const urls = await Promise.all(clips.map((c) => (c.f ? fetchClip(c.f) : null)));
    for (let i = 0; i < clips.length; i++) {
      if (my !== gen) return;
      if (clips[i].gap !== undefined) { await wait(clips[i].gap / sayRate); continue; }
      await playOne(urls[i], clips[i].d, my);
    }
    if (my === gen && onend) onend();
  } catch (e) {
    // offline and never heard, or the browser refused to play: the device voice
    if (my === gen) device(words, onend);
  }
}

/* say(text | [parts], onend) → true if something will be said. Muted means silent. */
export function speak(textOrParts, onend) {
  hush();
  if (!soundOn) return false;
  const p = plan(textOrParts);
  if (!p) return false;
  if (!p.clips || typeof Audio === 'undefined' || typeof fetch === 'undefined') return device(p.words, onend);
  const my = gen;
  perform(p.clips, p.words, onend, my);
  return true;
}
export function hush() {
  gen++;
  if (playing) { try { playing.pause(); } catch (e) {} playing = null; }
  try { if (canDevice()) speechSynthesis.cancel(); } catch (e) {}
}
export function canSay() { return soundOn && (typeof Audio !== 'undefined' || canDevice()); }
