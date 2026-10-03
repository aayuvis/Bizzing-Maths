/* arcade.js — the Play tab's tiles, as data: one copy, read by views.js (viewArcade) and by
   tools/build-feed.mjs, so a game card in My Feed says exactly what the Play tab says. */
export const HEROES = [
  { id: 'hall', act: 'nav', arg: 'hall', kicker: 'Contest prep', title: 'The Contest Hall', blurb: 'Thirty ways into hard problems, and contest-style papers against the clock.', route: '#/hall' },
  { id: 'contest', act: 'nav', arg: 'contest', kicker: 'The main event', title: 'Mock Contest', blurb: 'You and ten rivals. One question each, every round. Miss and you sit down.', route: '#/contest' },
  { id: 'facts', act: 'startFacts', kicker: '5 minutes', title: 'Twenty facts', blurb: 'Picked for you: your traps first, then what is due, then a few new ones.', route: '#/facts' },
  { id: 'daily', act: 'daily', kicker: "Today's puzzle", title: 'Make the target', blurb: 'The same puzzle in every house today. Compare notes at breakfast.', route: '#/play' },
];
export const GAMES = [
  { id: 'rush', title: 'Number Rush', blurb: 'Facts fall. Type the answer to pop them before they land.', art: 'art-rush', keys: 'digits + Enter' },
  { id: 'target', title: 'Make the Target', blurb: 'Four numbers, one target, + − × ÷. Use every number.', art: 'art-target', keys: '1–4 and + − × ÷' },
  { id: 'line', title: 'Number Line', blurb: 'Where does 637 go between 0 and 1000? Estimation, the skill contests lean on.', art: 'art-line', keys: '← → and Enter' },
];
