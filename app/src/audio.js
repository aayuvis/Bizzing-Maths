/* audio.js — one AudioContext and the family's sound settings (FAMILY-STANDARD §5, §11).

   Two buses under one master: EFFECTS (right · wrong · finish · medal · coin · unlock) and
   MUSIC. One volume slider sets the master (default 40%). Music ducks under every effect and
   under read-aloud, so a chime or a spoken question is never fighting the tune. Calm mode
   turns the music off and softens the effects. Everything follows the one-tap mute in ☰.

   Settings live on the DEVICE (Store.saveDevice): sound (the mute), sfx, music, volume,
   calm. main.js reads them at boot and calls configure(); this file never touches storage. */

export const S = { sound: true, sfx: true, music: true, volume: 0.4, calm: false };
let AC = null, master = null, sfxBus = null, musicBus = null;

export function ctx() {
  if (AC === false) return null;
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; return null; }
    master = AC.createGain(); master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.connect(master);
    musicBus = AC.createGain(); musicBus.connect(master);
    apply();
  }
  if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}
export const buses = () => (ctx() ? { master, sfx: sfxBus, music: musicBus } : null);

/* music sits under the effects: at full slider it is half as loud as a chime */
const MUSIC_LEVEL = 0.5;
function apply() {
  if (!AC) return;
  const t = AC.currentTime;
  master.gain.setTargetAtTime(S.sound ? S.volume : 0, t, 0.05);
  sfxBus.gain.setTargetAtTime(S.sfx ? (S.calm ? 0.55 : 1) : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(S.music && !S.calm ? MUSIC_LEVEL : 0, t, 0.2);
}
export function configure(o) { Object.assign(S, o || {}); apply(); try { document.documentElement.toggleAttribute('data-calm', !!S.calm); } catch (e) {} }
export const effectsOn = () => S.sound && S.sfx;
export const musicOn = () => S.sound && S.music && !S.calm;

/* Duck the music for `ms`, then bring it back over half a second. */
let duckT = 0;
export function duck(ms = 700, depth = 0.3) {
  if (!AC || !musicOn()) return;
  const t = AC.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(MUSIC_LEVEL * depth, t, 0.04);
  clearTimeout(duckT);
  duckT = setTimeout(() => { if (AC && musicOn()) musicBus.gain.setTargetAtTime(MUSIC_LEVEL, AC.currentTime, 0.25); }, ms);
}
