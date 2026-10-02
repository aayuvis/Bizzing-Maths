/* cert.js — certificates (FAMILY-STANDARD §13, FIX-MATHS T9).

   One for every place on the Atlas finished (every stop in it passed) and every Level test
   passed. It shows the child's FIRST NAME, their avatar, Octo, and what was mastered — no
   surname, no age, no school, no date of birth (there is none to show). It is drawn on this
   device into a PNG and saved from the grown-ups area only; nothing is uploaded or shared by
   the app. The cobalt graph border is drawn here, so no generated lettering is ever on it. */

import { WORLDS, tricksIn } from './tricks.js';

export function certsFor(k) {
  const out = [];
  for (const w of WORLDS) {
    const ts = tricksIn(w.id);
    if (ts.length && ts.every((t) => ((k.tricks || {})[t.id] || {}).stars >= 1)) out.push({ id: 'world:' + w.id, title: w.name, line: `finished ${w.name.replace(/^The /, 'the ')}`, sub: `${ts.length} stops, every one passed` });
  }
  for (const [key, r] of Object.entries((k.journey || {}).tests || {})) {
    const m = /^(\d+):level$/.exec(key);
    if (m && r && r.passed) out.push({ id: 'level:' + m[1], title: `Level ${m[1]}`, line: `passed the Level ${m[1]} test`, sub: 'every land on the road crossed, then the summit' });
  }
  return out;
}

const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/* Draw it and hand it to the browser as a download. Returns the data URL (for the check). */
export async function makeCert(k, id, { download = true } = {}) {
  const c = certsFor(k).find((x) => x.id === id); if (!c) return null;
  const W = 1600, H = 1131, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  try { await Promise.all(['800 64px Fraunces', '600 30px "Hanken Grotesk"'].map((f) => document.fonts.load(f))); } catch (e) {}
  // the cobalt graph border
  g.fillStyle = '#1F42B8'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(160,190,255,.35)'; g.lineWidth = 2;
  for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#FFFCF5'; roundRect(g, 60, 60, W - 120, H - 120, 36); g.fill();
  g.strokeStyle = '#F0B429'; g.lineWidth = 8; roundRect(g, 84, 84, W - 168, H - 168, 26); g.stroke();
  const [av, oc] = await Promise.all([img(`avatars/${k.avatar}.webp`), img('mascot/octo-cheer.webp')]);
  if (av) g.drawImage(av, 170, 330, 300, 300);
  if (oc) g.drawImage(oc, W - 470, 330, 300, 300);
  g.textAlign = 'center'; g.fillStyle = '#3A2A5C';
  g.font = '800 46px Fraunces, Georgia, serif'; g.fillText('Bizzing Maths', W / 2, 210);
  g.font = '600 30px "Hanken Grotesk", system-ui, sans-serif'; g.fillStyle = '#5C6582'; g.fillText('This is to say that', W / 2, 330);
  g.fillStyle = '#1B2238'; g.font = '800 104px Fraunces, Georgia, serif'; g.fillText(k.name, W / 2, 470);
  g.font = '600 40px "Hanken Grotesk", system-ui, sans-serif'; g.fillStyle = '#1F42B8'; g.fillText(c.line, W / 2, 560);
  g.font = '500 28px "Hanken Grotesk", system-ui, sans-serif'; g.fillStyle = '#5C6582'; g.fillText(c.sub, W / 2, 612);
  g.font = '600 26px "Hanken Grotesk", system-ui, sans-serif'; g.fillText(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, 900);
  g.fillText('Fast and fearless with numbers — and knowing why the trick works.', W / 2, 950);
  const url = cv.toDataURL('image/png');
  if (download) { const a = document.createElement('a'); a.href = url; a.download = `bizzing-maths-${k.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.replace(':', '-')}.png`; document.body.appendChild(a); a.click(); a.remove(); }
  return url;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
