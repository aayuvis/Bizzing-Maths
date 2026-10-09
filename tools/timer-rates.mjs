/* tools/timer-rates.mjs — proposes Beat the Timer's rates (src/timer-themes.js) after a generator changes.
   The slowest child who still counts as fluent (the fluent bot in timer.js) plays every level, every open
   window and every earned-sutra set that matters, 12 seeds each; the worst pace a minute, over a 1.12
   margin, is the rate. Prints JSON; it edits nothing. test/timer.mjs then holds the pasted rates to BT2.
     node tools/timer-rates.mjs app */
const A = new URL('../' + (process.argv[2] || 'app') + '/src/', import.meta.url).href;
const T = await import(A + 'timer.js');
const { seeded } = await import(A + 'rand.js');
const { newKid } = await import(A + 'model.js');
const k = newKid('Cal', '8-10', 'x');
const ALL = T.SUTRAS(), MARGIN = 1.12, SEEDS = 12;
const worst = (th, lv, sets, band) => {
  let mn = 1e9;
  for (const earned of sets) for (const mins of T.windowsOpen(lv)) for (let s = 0; s < SEEDS; s++) {
    const run = T.playFluent(th, lv, mins, { k, r: seeded(`cal${th.id}${lv}${mins}${s}${earned.join()}`), band, earned });
    mn = Math.min(mn, run.score / mins);
  }
  return mn;
};
const out = {};
for (const th of T.THEMES) {
  if (th.kind === 'vedic') continue;
  const band = T.bandOfGrade(Math.min(...th.grade));
  out[th.id] = Array.from({ length: 10 }, (_, i) => {
    const lv = i + 1, trick = T.challengesAt(th, lv).includes('trick');
    const Q = T.QUICK_SUTRAS, sets = trick ? [[], Q, ...Q.map((x) => [x])] : [[]];
    return Math.max(1, Math.floor(worst(th, lv, sets, band) / MARGIN));
  });
}
const mixed = {};
for (const g of [1, 2, 3, 4, 5, 6, 7]) {
  const th = T.themesFor(g).at(-1), band = T.bandOfGrade(g);
  mixed[th.id] = Array.from({ length: 10 }, (_, i) => Math.max(1, Math.floor(worst(th, i + 1, [[], T.QUICK_SUTRAS], band) / MARGIN)));
}
const sut = {}, V = T.THEMES.find((t) => t.kind === 'vedic');
for (const id of ALL) sut[id] = [1, 5, 9].map((lv) => Math.max(1, Math.floor(worst(V, lv, [[id]], '11-14') / MARGIN)));
console.log(JSON.stringify({ rates: out, sutras: sut, mixed }));
