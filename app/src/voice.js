/* voice.js — read to me, in the device's own voice.

   Read-aloud uses the speech voice built into the child's device (an Indian
   English voice when there is one), on the device: nothing is downloaded and
   nothing is sent. The owner chose this over shipping recordings — a few
   hundred clips per app is weight and upkeep a device voice does not need.

   What this file adds to the bare device voice is the WORDS: voice-text.js
   turns maths into speech the way a child is taught it — "3/4" is "three
   quarters", 347 is "three hundred and forty-seven", 7 × 8 is "seven times
   eight" — so the voice never reads a slash or a times sign as a symbol. A line
   with a symbol it has no word for is read as written rather than skipped.
   `onend` fires when the line has been SAID, so the voice is the clock. */

import { normalise } from './voice-text.js';
import { duck } from './audio.js';

let soundOn = true, sayRate = 1;
export function setVoiceSound(v) { soundOn = !!v; if (!soundOn) hush(); }
export function setSayRate(r) { sayRate = r || 1; }

export function canDevice() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'; }
function pickVoice() {
  const vs = speechSynthesis.getVoices() || [];
  return vs.find((v) => /en[-_]IN/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang) && /natural|neural|premium|enhanced/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}

/* The words a line is spoken as. Parts are joined with a short pause (a comma). */
export function words(textOrParts) {
  const parts = [].concat(textOrParts).filter((p) => p != null && String(p).trim() !== '');
  if (!parts.length) return null;
  return parts.map((p) => { const n = normalise(p); return n ? n.words : String(p); }).join(', ');
}

/* speak(text | [parts], onend) → true if something will be said. Muted means silent. */
export function speak(textOrParts, onend) {
  hush();
  const w = words(textOrParts);
  if (!soundOn || !w || !canDevice()) return false;
  try {
    const u = new SpeechSynthesisUtterance(w.replace(/\s+/g, ' ').trim());
    const v = pickVoice(); if (v) u.voice = v;
    u.lang = (v && v.lang) || 'en-IN'; u.rate = sayRate; u.pitch = 1;
    duck(60000, 0.25);                                   // the music steps back while the voice speaks
    u.onend = () => { duck(10); if (onend) onend(); };
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
export function hush() { try { if (canDevice()) speechSynthesis.cancel(); } catch (e) {} }
export function canSay() { return soundOn && canDevice(); }
