/* avatars.js — this app's 96 (FAMILY-STANDARD §8), through the family engine.

   Twelve packs of eight, every pack 2 Common · 3 Rare · 2 Epic · 1 Legendary, two packs to
   each of the six worlds (pack p belongs to world ⌈p/2⌉). The tiers, the prices, the shape,
   how a face is unlocked and the night glow are the family's (integration/bizzing-avatars.js
   and .css, copied verbatim); this file is only the list and what each Legendary asks for.

   Where the faces come from:
   · the eighteen painted for this app before (Shape Pals, Tool Kit, Pattern Pets), regrouped
     — the twelve faces once borrowed from Bizzing Bee's cosmos and lab packs are gone from the
     96, because no face may be in two apps' collections (owner, 2 Oct 2026);
   · Bizzing Bee's Turbo and Origami packs, handed over (racers for Number Rush, folding for
     shapes) and re-tiered to 2/3/2/1;
   · fifty painted for this app (tools/art/gen.py AVATAR2), each built from a maths object
     and none carrying a numeral.
   Every face has been looked at before shipping. No sacred figure and no real person is in
   this catalogue, so no card needs an `about` line.

   A Legendary's milestone is LEARNING: a place on the Atlas finished (every stop in it
   passed), or a medal's evidence. `milestonesOf(k)` reads it from the child's record — the
   same record the report card reads — so a Legendary can never be bought by time or luck. */

import { TRICKS, tricksIn, WORLDS } from './tricks.js';
import { OPS, tally } from './facts.js';
import { validate, stateOf, TIERS, worldOf as packWorld } from './integration/bizzing-avatars.js';

export const PACKS = [
  { n: 1, id: 'shapes', name: 'Shape Pals', blurb: 'Bodies built from solids.' },
  { n: 2, id: 'counting', name: 'Counting Critters', blurb: 'Arms, spots and berries you can count.' },
  { n: 3, id: 'tools', name: 'Tool Kit', blurb: 'Made from the geometry box.' },
  { n: 4, id: 'fractions', name: 'Fraction Feast', blurb: 'Cut into equal parts.' },
  { n: 5, id: 'origami', name: 'Origami', blurb: 'Folded from one square of paper. From Bizzing Bee.' },
  { n: 6, id: 'gears', name: 'Gear Gang', blurb: 'Cogs, springs, pulleys and balances.' },
  { n: 7, id: 'sky', name: 'Sky Counters', blurb: 'Moon phases, constellations, rings and spirals.' },
  { n: 8, id: 'measure', name: 'Measure Lab', blurb: 'Jugs, tapes, levels, light and swings.' },
  { n: 9, id: 'patterns', name: 'Pattern Pets', blurb: 'Spirals, hexagons and symmetry from nature.' },
  { n: 10, id: 'symmetry', name: 'Symmetry Friends', blurb: 'Mirror, turn and repeat.' },
  { n: 11, id: 'turbo', name: 'Turbo', blurb: 'Racers for Number Rush. From Bizzing Bee.' },
  { n: 12, id: 'pixels', name: 'Pixel Pals', blurb: 'Built square by square.' },
];

/* [id, name, tier] per pack, in the order a card row shows them */
const C = 'common', Ra = 'rare', E = 'epic', L = 'legendary';
const ROWS = {
  1: [['cubebot', 'Cube Bot', C], ['orbowl', 'Orb Owl', C], ['pyrafox', 'Pyramid Fox', Ra], ['cylicat', 'Cylinder Cat', Ra], ['torupup', 'Donut Pup', Ra], ['conicorn', 'Cone-icorn', E], ['octachick', 'Octahedron Chick', E], ['dodecadrake', 'Dodeca Dragon', L]],
  2: [['octo', 'Octo', C], ['ladybird', 'Spotty Ladybird', C], ['starfish', 'Five-arm Starfish', Ra], ['peapod', 'Pea-pod Pup', Ra], ['eggchick', 'Egg-tray Chick', Ra], ['dalmatian', 'Dotty Dalmatian', E], ['berrybear', 'Berry Bear', E], ['cubellama', 'Cube Llama', L]],
  3: [['protortle', 'Protractor Turtle', C], ['rulraffe', 'Ruler Giraffe', C], ['pencilbird', 'Pencil Bird', Ra], ['abacuhog', 'Abacus Hedgehog', Ra], ['chalkbun', 'Chalk Bunny', Ra], ['compacrab', 'Compass Crab', E], ['sharpowl', 'Sharpener Owl', E], ['setsquin', 'Set-square Penguin', L]],
  4: [['pizzapanda', 'Pizza Panda', C], ['piepig', 'Pie Piglet', C], ['orangeotter', 'Orange Otter', Ra], ['sandhippo', 'Sandwich Hippo', Ra], ['pancakepeng', 'Pancake Penguin', Ra], ['chocobear', 'Choco Bear', E], ['cakecat', 'Cake Cat', E], ['melonwhale', 'Melon Whale', L]],
  5: [['paperplane', 'Paper Plane', C], ['cranefold', 'Crane', C], ['hopfold', 'Hop Frog', Ra], ['fanfold', 'Fan Dancer', Ra], ['lotusfold', 'Lotus', Ra], ['kabuto', 'Kabuto', E], ['flutterfold', 'Flutter', E], ['goldencrane', 'Golden Crane', L]],
  6: [['coggoat', 'Cog Goat', C], ['windmouse', 'Windmill Mouse', C], ['pulleyparrot', 'Pulley Parrot', Ra], ['springroo', 'Spring Roo', Ra], ['boltbeetle', 'Bolt Beetle', Ra], ['spannerwalrus', 'Spanner Walrus', E], ['scalebadger', 'Balance Badger', E], ['hourhamster', 'Hourglass Hamster', L]],
  7: [['phasefox', 'Moon-phase Fox', C], ['rocketrabbit', 'Rocket Rabbit', C], ['meteorpup', 'Meteor Pup', Ra], ['stardeer', 'Constellation Deer', Ra], ['slothsat', 'Satellite Sloth', Ra], ['moonrover', 'Moon Rover', E], ['ringturtle', 'Ringed Turtle', E], ['galaxysnail', 'Galaxy Snail', L]],
  8: [['thermobear', 'Thermometer Bear', C], ['jugmouse', 'Measuring-jug Mouse', C], ['prismcat', 'Prism Cat', Ra], ['tapesnail', 'Tape-measure Snail', Ra], ['levellizard', 'Spirit-level Lizard', Ra], ['magnifly', 'Magnifying Firefly', E], ['pendulumpanda', 'Pendulum Panda', E], ['fractaldragon', 'Fractal Dragon', L]],
  9: [['hexbee', 'Honeycomb Bee', C], ['nautilus', 'Spiral Snail', C], ['tessgecko', 'Tiling Gecko', Ra], ['flakefox', 'Snowflake Fox', Ra], ['pineporc', 'Pinecone Porcupine', Ra], ['mandalamoth', 'Mandala Moth', E], ['peacock', 'Spiral Peacock', E], ['sunlion', 'Sunflower Lion', L]],
  10: [['mirrorfly', 'Mirror Butterfly', C], ['pinpup', 'Pinwheel Pup', C], ['kitekitten', 'Kite Kitten', Ra], ['toptapir', 'Spinning-top Tapir', Ra], ['lanternlemur', 'Lantern Lemur', Ra], ['kaleidokoala', 'Kaleido Koala', E], ['rangolirabbit', 'Rangoli Rabbit', E], ['kolamturtle', 'Kolam Tortoise', L]],
  11: [['rally', 'Rally', C], ['turbo', 'Turbo', C], ['crash', 'Crash', Ra], ['rainbow', 'Rainbow Cart', Ra], ['champ', 'Champ', Ra], ['nitro', 'Nitro', E], ['mech', 'Mech', E], ['titan', 'Titan', L]],
  12: [['pixelkitty', 'Pixel Kitty', C], ['blockfrog', 'Block Frog', C], ['bitbunny', 'Bit Bunny', Ra], ['tetrosnake', 'Tetro Snake', Ra], ['mazemole', 'Maze Mole', Ra], ['voxelbear', 'Voxel Bear', E], ['joyjelly', 'Joystick Jelly', E], ['glitchgecko', 'Glitch Gecko', L]],
};

/* Each Legendary's learning milestone. `world:<id>` = every stop in that Atlas place passed. */
const MILESTONE = {
  dodecadrake: 'world:shapecity', cubellama: 'world:gardens', setsquin: 'world:workshop', melonwhale: 'world:bakery',
  goldencrane: 'medal:tower-4', hourhamster: 'world:clocktower', galaxysnail: 'world:observatory', fractaldragon: 'medal:fluent-100',
  sunlion: 'world:mine', kolamturtle: 'world:palace', titan: 'medal:fearless', glitchgecko: 'medal:tower-top',
};
const MEDAL_LABEL = { 'tower-4': 'clear four floors of the Puzzle Tower', 'tower-top': 'clear all twelve floors of the Puzzle Tower',
  'fluent-100': 'get a hundred facts fluent', fearless: 'earn three stars on ten stops' };
const placeName = (wid) => { const w = WORLDS.find((x) => x.id === wid); return w ? w.name.replace(/^The /, 'the ') : wid; };
function milestoneOf(id) {
  const m = MILESTONE[id]; if (!m) return undefined;
  const [kind, x] = m.split(':');
  return { id: m, label: kind === 'world' ? `finish ${placeName(x)}` : MEDAL_LABEL[x] };
}

export const CATALOGUE = Object.entries(ROWS).flatMap(([p, row]) => row.map(([id, name, tier]) => ({
  id, name, pack: +p, tier, art: `avatars/${id}.webp`, ...(tier === 'legendary' ? { milestone: milestoneOf(id) } : {}),
})));
export const byAvatar = Object.fromEntries(CATALOGUE.map((a) => [a.id, a]));
export const AVATAR_IDS = CATALOGUE.map((a) => a.id);
export const COMMONS = CATALOGUE.filter((a) => a.tier === 'common').map((a) => a.id);
export const isCommon = (id) => !!byAvatar[id] && byAvatar[id].tier === 'common';
export const problems = () => validate(CATALOGUE);
export { TIERS };

/* The milestones this child has reached, read from their own record. */
const finished = (k, wid) => { const ts = tricksIn(wid); return ts.length > 0 && ts.every((t) => ((k.tricks || {})[t.id] || {}).stars >= 1); };
const fluentN = (k) => OPS.reduce((a, o) => a + tally(k.facts || {}, o).fluent, 0);
const floors = (k) => Object.values(k.quest || {}).filter((q) => q.passed).length;
const starred3 = (k) => TRICKS.filter((t) => ((k.tricks || {})[t.id] || {}).stars >= 3).length;
export function milestonesOf(k) {
  const out = new Set();
  for (const m of Object.values(MILESTONE)) {
    const [kind, x] = m.split(':');
    const met = kind === 'world' ? finished(k, x)
      : x === 'tower-4' ? floors(k) >= 4 : x === 'tower-top' ? floors(k) >= 12 : x === 'fluent-100' ? fluentN(k) >= 100 : x === 'fearless' ? starred3(k) >= 10 : false;
    if (met) out.add(m);
  }
  return out;
}

/* Everything the engine needs to say what a card says, for this child in this household. */
export function avatarCtx(h, k) {
  const shop = (k && k.shop) || {};
  return { owned: new Set([...COMMONS, ...(shop.avatars || [])]), worlds: new Set(shop.worlds || []), plan: (h && h.parent && h.parent.plan) || 'free',
    milestones: k ? milestonesOf(k) : new Set(), who: k ? k.name : '' };
}
export const ownsAvatar = (h, k, id) => !!byAvatar[id] && stateOf(byAvatar[id], avatarCtx(h, k)).state === 'owned';
export const worldOfAvatar = (id) => (byAvatar[id] ? packWorld(byAvatar[id]) : 1);
export const packOf = (id) => PACKS[(byAvatar[id] || { pack: 1 }).pack - 1];
