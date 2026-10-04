/* extras-actions.js — the taps that buy and wear the Shop's extras (extras.js).
   Its own module so main.js only imports it; every purchase goes through
   Family.spend at the printed price, and nothing here touches xp. */
import { R } from './runtime.js';
import { kid } from './model.js';
import { Family, Store } from './store.js';
import { on, sfx, toast } from './ui.js';
import { buySkin, wearSkin, buyPaper, wearPaper, buyMode, modeById, skinOf, paperOf } from './extras.js';

const save = () => Store.saveHousehold(R.h);
const pay = (k) => (price, why) => Family.spend(k.name, price, why);

on('buySkin', (id) => {
  const k = kid(R.h); if (!k) return;
  if (buySkin(k, id, pay(k))) { sfx.coin(); toast('Yours — every road wears it now.'); save(); }
  else toast('Not enough coins yet — right answers earn them.');
  R.render();
});
on('wearSkin', (id) => { const k = kid(R.h); if (!k) return; if (wearSkin(k, id || null)) { save(); R.render(); } });
on('buyPaper', (id) => {
  const k = kid(R.h); if (!k) return;
  if (buyPaper(k, id, pay(k))) { sfx.coin(); toast('Yours — the next paper you sit wears it.'); save(); }
  else toast('Not enough coins yet — right answers earn them.');
  R.render();
});
on('wearPaper', (id) => { const k = kid(R.h); if (!k) return; if (wearPaper(k, id || null)) { save(); R.render(); } });
on('buyMode', (id) => {
  const k = kid(R.h); if (!k) return;
  const m = modeById[id];
  if (m && buyMode(k, id, pay(k))) { sfx.coin(); toast(`${m.name} is yours — find it under its game in Play.`); save(); }
  else toast('Not enough coins yet — right answers earn them.');
  R.render();
});

/* The skin the active child wears, on the root: styles/extras.css dresses every
   .board's road and pins from it (board.js paintedRoad, and views2's world and level
   boards), so no board has to know about skins. */
export function applySkin(k) {
  const s = skinOf(k), p = paperOf(k), el = document.documentElement;
  if (s) el.setAttribute('data-skin', s); else el.removeAttribute('data-skin');
  // and the Contest Hall paper they wear: styles/extras.css dresses .paper from it, nothing else reads it
  if (p) el.setAttribute('data-paper', p); else el.removeAttribute('data-paper');
}
