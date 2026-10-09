/* game-level.js — the owner's level rule for every free game (games spec §1.4).

   A child CHOOSES a level, 1–5, on the game's start screen; it defaults to the last one played.
   After a round: 80% or more right OFFERS the next level (never forced), 50% or more keeps the
   level, under 50% drops it one. What "right" means is each game's own (a pop, a clean solve, a
   close placement, a solved stack) — the game hands in right/total and nothing else.
   The record is k.gameLv[game] = { lv, best: {lv: pct} } (store v14). */

export const MAX_LV = 5;

export const levelOf = (k, game) => Math.min(MAX_LV, Math.max(1, ((k && k.gameLv && k.gameLv[game]) || {}).lv || 1));

export function setLevel(k, game, lv) {
  const g = (k.gameLv || (k.gameLv = {}))[game] || (k.gameLv[game] = { lv: 1, best: {} });
  g.lv = Math.min(MAX_LV, Math.max(1, lv | 0));
  return g.lv;
}

/* The verdict after a round, applied to the record: { lv, pct, kept, dropped, offer } —
   `offer` is the next level when 80%+ was reached; the child takes it with setLevel. */
export function afterRound(k, game, right, total) {
  const lv = levelOf(k, game), pct = total > 0 ? right / total : 0;
  const g = (k.gameLv || (k.gameLv = {}))[game] || (k.gameLv[game] = { lv, best: {} });
  g.best = g.best || {};
  if (!(g.best[lv] >= pct)) g.best[lv] = Math.round(pct * 100) / 100;
  const dropped = pct < 0.5 && lv > 1;
  g.lv = dropped ? lv - 1 : lv;
  return { lv: g.lv, pct, kept: !dropped, dropped, offer: pct >= 0.8 && lv < MAX_LV ? lv + 1 : null };
}

/* What the verdict says, in words, for a finish card. */
export function verdictLine(v) {
  const p = Math.round(v.pct * 100);
  if (v.dropped) return `${p}% right — next round is Level ${v.lv}, a step easier.`;
  if (v.offer) return `${p}% right — Level ${v.offer} is open when you want it.`;
  return `${p}% right — you keep Level ${v.lv}.`;
}
