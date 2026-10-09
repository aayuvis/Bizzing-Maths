/* arcade.js — the Play tab's tiles, as data: one copy, read by views.js (viewArcade) and by
   tools/build-feed.mjs, so a game card in My Feed says exactly what the Play tab says. */
export const HEROES = [
  { id: 'hall', act: 'nav', arg: 'hall', kicker: 'Contest prep', title: 'The Contest Hall', blurb: 'Thirty ways into hard problems, and contest-style papers against the clock.', route: '#/hall' },
  { id: 'contest', act: 'nav', arg: 'contest', kicker: 'The main event', title: 'Mock Contest', blurb: 'You and ten rivals. One question each, every round. Miss and you sit down.', route: '#/contest' },
  { id: 'machine', act: 'nav', arg: 'machine', kicker: 'Tricks race', title: 'Beat the Machine', blurb: 'Spot the shortcut before the Long-Way Machine finishes the sum.', route: '#/machine' },
  { id: 'daily', act: 'daily', kicker: "Today's puzzle", title: 'Make the target', blurb: 'The same puzzle in every house today. Compare notes at breakfast.', route: '#/play' },
];
/* Twenty facts left the Play tab for Number Rush · Calm (games spec §4: one in, one out) — same
   drill, same pay, same due list; #/facts and Home's mix still start it. Beat the Timer is the
   owner's ninth card, drawn by timer-card.js after these. */
export const GAMES = [
  { id: 'rush', title: 'Number Rush', blurb: 'Facts fall. Type the answer to pop them before they land.', art: 'art-rush', keys: 'digits + Enter' },
  { id: 'target', title: 'Make the Target', blurb: 'Four numbers, one target, + − × ÷. Use every number.', art: 'art-target', keys: '1–4 and + − × ÷' },
  { id: 'line', title: 'Number Line', blurb: 'Where does 637 go between 0 and 1000? Estimation, the skill contests lean on.', art: 'art-line', keys: '← → and Enter' },
  { id: 'cubes', title: 'Cube Builder', blurb: 'Front, side and top: three views of a stack. Build it, with the fewest cubes you can.', art: 'art-cubes', keys: 'arrows, + − and Enter' },
];

/* Every hero card is painted, like the game tiles (owner, 9 Oct 2026): the plate full-bleed and a scrim
   darkening toward the words, on its own layer (.hero-art) so a dark page can dim the painting and
   not the words. Set inline so the url resolves against the page, not the stylesheet. */
export const heroArt = (id) => `<span class="hero-art" style="${heroStyle(id)}" aria-hidden="true"></span>`;
export const heroStyle = (id) => `background-image:linear-gradient(180deg,rgb(10 12 28 / .08) 0%,rgb(10 12 28 / .3) 38%,rgb(10 12 28 / .86) 78%),url(art/g-${id}.webp)`;
