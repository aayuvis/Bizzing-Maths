/* timer-card.js — Beat the Timer's card for the Play tab, on its own so the Play tab can draw it
   without loading the game or its catalogue. The lead wires it into viewArcade at merge. */
import { icon } from './icons.js';
import { esc } from './ui.js';

/* The Play tab's card, for the lead to drop in (games spec §4): one line and the timer icon. */
export function timerCard(k) {
  const any = k && k.timer && Object.keys(k.timer.best || {}).length;
  return `<button class="gtile tmr-card" data-act="nav" data-arg="timer">
    <span class="gart art-timer" style="background-image:url(art/g-timer.webp)" aria-hidden="true"></span>
    <span class="gtxt"><b>Beat the Timer</b><span>Pick a theme and 1, 2 or 3 minutes. Hit the target, then beat your best.</span>${any ? `<span class="gbest">${icon('trophy', 14)} Your bests are waiting</span>` : ''}<span class="gmeta">${esc('digits, Enter and S to skip')}</span></span></button>`;
}
