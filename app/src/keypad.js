/* keypad.js — the on-screen number pad, shared by the drill runner and the games. It is its own module so
   the runner can draw it without downloading games.js, which loads when a game opens (audit v4 R2). */
export function keypad(keys = []) {
  const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  const name = { '⌫': 'Delete', '✓': 'Enter', '.': 'Point', '−': 'Minus', '/': 'Fraction bar' };
  const extra = (Array.isArray(keys) ? keys : []).filter((x) => ['.', '−', '/'].includes(x));
  return `<div class="pad" role="group" aria-label="Number pad">${extra.length ? `<div class="pad-x">${extra.map((x) => `<button class="pk alt" data-k="${x}" aria-label="${name[x]}">${x}</button>`).join('')}</div>` : ''}${k.map((x) =>
    `<button class="pk${x === '✓' ? ' go' : x === '⌫' ? ' del' : ''}" data-k="${x}" aria-label="${name[x] || x}">${x}</button>`).join('')}</div>`;
}
