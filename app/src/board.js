/* board.js — one painted road, drawn the way every Atlas board draws it.

   A painting as the ground, the dotted road winding across its lower band, a
   round pin per stop (✓ passed, a number when open, 🔒 when not reached), the
   child's avatar standing on the next one, the walked part of the road in gold.
   The Atlas's world boards, the level roads, and the Library's journeys all use
   this look — a journey anywhere in the app should read as the same kind of
   place. Pure: it returns a string and touches nothing. */
import { esc } from './ui.js';

export const bandY = (x, b = 80, a = 5, f = 1.2) => b + a * Math.sin((x / 100) * Math.PI * 2 * f + 0.6);

/* stops: [{ label, state: 'done' | 'open' | 'locked', act, arg, badge? }]
   here: index of the stop the avatar stands on (or -1); sel: selected index;
   img: art file name (without .webp); me: the avatar's HTML. */
export function paintedRoad({ img, stops, here = -1, sel = -1, me = '', minWidth = 980, band = [80, 5, 1.2] }) {
  const n = stops.length, xs = stops.map((_, j) => 6 + (88 * j) / Math.max(1, n - 1));
  const y = (x) => bandY(x, ...band);
  let path = ''; for (let x = 0; x <= 100; x += 2) path += `${x ? 'L' : 'M'}${x},${y(x).toFixed(2)} `;
  const walked = stops.filter((s) => s.state === 'done').length;
  const to = walked ? xs[Math.min(walked, n - 1)] : 0;
  let wpath = ''; for (let x = 0; x <= to; x += 2) wpath += `${x ? 'L' : 'M'}${x},${y(x).toFixed(2)} `;
  const at = sel >= 0 ? sel : Math.max(0, here);
  return `<div class="board-scroll" data-autoscroll="${xs[at] || 0}">
    <div class="board" style="min-width:${minWidth}px">
      <img src="art/${esc(img)}.webp" alt="" width="1920" height="815">
      <svg class="road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="${path}" class="rd-edge"/><path d="${path}" class="rd"/>${wpath ? `<path d="${wpath}" class="rd-walk"/>` : ''}
      </svg>
      ${stops.map((s, j) => `<button class="bpin${s.state === 'done' ? ' done' : ''}${s.state === 'locked' ? ' shut' : ''}${j === here ? ' cur' : ''}${j === sel ? ' sel' : ''}" style="left:${xs[j]}%;top:${y(xs[j])}%"
          data-act="${s.act}" data-arg="${esc(s.arg)}" aria-label="${esc(s.label)}${s.state === 'locked' ? ', not reached yet' : s.state === 'done' ? ', passed' : ''}">
          <span>${s.state === 'done' ? '✓' : s.state === 'locked' ? '🔒' : j + 1}</span>${s.badge || ''}${j === here && me ? `<i class="me">${me}</i>` : ''}</button>`).join('')}
    </div>
  </div>`;
}
