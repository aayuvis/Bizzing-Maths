/* avatar-cards.js — Bizzing Bee's avatar card deck, for this app's 96 (FAMILY-STANDARD §8).

   Loaded only when the deck opens (main.js `avDeck`), never on Home's first paint.

   A card is the face, its tier word in the family colour, its pack, where it RANKS (by tier,
   then by pack order: the twelve Legendaries first), a one-line power, four stats, a line of
   lore — and how it came to this child. That last part is read from the child's real record
   and never written for them:
     · the face they picked when they started (`k.starter`, kept from the day the child was made);
     · a Common is free to every child from the first day — the family's rule, not a date;
     · a purchase is the family wallet's own ledger line, `avatar:<id>`, from THIS app;
     · a Legendary's learning milestone, and the day it was met where the record keeps one
       (a medal's `at`; finishing a place keeps no day, so none is said);
     · with nothing on record: "In your collection", and no date.
   The power and lore are gentle fiction about the maths object each face is built from — no
   real person, nothing sacred, and no figure that could teach a child something untrue.

   The stats are a game, not a measurement of the child: a tier base plus a spread hashed
   from the id (Bee's A()), so a card says the same thing on every device, every day. */

import { CATALOGUE, PACKS, byAvatar, milestonesOf, TIERS } from './avatars.js';
import { icon } from './icons.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* [power, lore] for every one of the 96 */
export const WORDS = {
  // Shape Pals
  cubebot: ['Six Sides Steady — turns any shape around in its head, never flustered', 'Stack it, roll it, flip it: every face of Cube Bot is a square, and every one is ready.'],
  orbowl: ['Round Watch — sees a problem from every side at once', 'A sphere has no corners to bump, so Orb Owl rolls wherever the question goes.'],
  pyrafox: ['Point Finder — goes straight to the tip of a tricky problem', 'Pyramid Fox climbs from a wide base to a single point, one layer at a time.'],
  cylicat: ['Smooth Roll — keeps going in a straight line until the answer arrives', 'Two flat circles and one curved side: Cylinder Cat can stand tall or roll away.'],
  torupup: ['Ring Round — finds the way back to where a pattern began', 'Donut Pup has a hole right through the middle, and is still one shape.'],
  conicorn: ['Sharp Focus — narrows a big question down to one small point', 'From a round base to a single tip, Cone-icorn always knows where it is heading.'],
  octachick: ['Steady Landing — sits balanced on whichever triangle it lands on', 'Two square pyramids joined base to base make the shape Octahedron Chick hatched from.'],
  dodecadrake: ['Pentagon Fire — sees the pattern in a ball of flat faces', 'Twelve pentagons fold into one roundish dragon, and every corner looks the same.'],
  // Counting Critters
  ladybird: ['Spot Count — sees how many in a small group without pointing', 'Spotty Ladybird never counts its spots one by one; it sees them in little groups.'],
  beadpillar: ['Bead Slide — moves along a line one bead at a time, never skipping', 'Each part of Bead Caterpillar is a bead on a counting string.'],
  starfish: ['Five-arm Reach — lends a hand on every side', 'Five-arm Starfish can count to five on itself, and start again.'],
  peapod: ['Pod Pairs — puts things in twos before you can blink', 'Pea-pod Pup shares every pod fairly, pea by pea.'],
  eggchick: ['Row and Column — sees a full tray as rows of the same size', 'Egg-tray Chick knows a tray is just equal rows, side by side.'],
  dalmatian: ['Dot Dash — lines spots up so they are quick to count', 'Dotty Dalmatian knows scattered spots are hard to count, so it puts them in rows.'],
  berrybear: ['Fair Share — splits a pile so every friend gets the same', 'Berry Bear will not eat a berry until the basket is shared out evenly.'],
  cubellama: ['Block Builder — builds tall towers of tens without a wobble', 'Cube Llama carries its cubes in neat stacks, so it always knows how many.'],
  // Tool Kit
  protortle: ['Angle Eye — tells a sharp corner from a wide one at a glance', 'Protractor Turtle wears a half-circle shell marked all the way round.'],
  rulraffe: ['Straight Edge — draws a line that never wanders', 'Ruler Giraffe measures from the zero mark, never from the end of the wood.'],
  pencilbird: ['Show the Working — writes every step so nothing gets lost', 'Pencil Bird says a sum is only half done until the working is on the page.'],
  abacuhog: ['Bead Push — slides beads to carry without a fuss', 'Abacus Hedgehog keeps its beads on rods, and each rod is worth more than the one to its right.'],
  chalkbun: ['Clean Slate — rubs out a mistake and tries again, smiling', 'Chalk Bunny knows a smudge on the board is just a step on the way.'],
  compacrab: ['Perfect Circle — keeps every point the same distance from the middle', 'Compass Crab plants one leg and swings the other all the way round.'],
  sharpowl: ['Fine Point — sharpens a fuzzy idea until it is clear', 'Sharpener Owl turns and turns until the answer has a good point.'],
  setsquin: ['Right Angle — finds the square corner in any shape', 'Set-square Penguin checks every corner of the room and knows which ones are square.'],
  // Fraction Feast
  pizzapanda: ['Equal Slices — cuts every pizza so the pieces match', 'Pizza Panda knows that more slices of the same pizza means smaller slices.'],
  piepig: ['Half and Half — splits anything right down the middle', 'Pie Piglet says two halves make a whole pie, and that is the best kind.'],
  orangeotter: ['Segment Sense — counts the parts that make a whole', 'Orange Otter peels first and counts the segments before sharing.'],
  sandhippo: ['Corner Cut — turns a square into two matching triangles with one slice', 'Sandwich Hippo cuts from corner to corner and gets two equal halves every time.'],
  pancakepeng: ['Stack Count — keeps track of a tall pile, layer by layer', 'Pancake Penguin flips one, adds one, and always knows how high the stack is.'],
  chocobear: ['Grid Share — breaks a bar along its lines to share it', 'Choco Bear snaps the bar into equal squares, so nobody gets a crumb less.'],
  cakecat: ['Fair Cut — slices a round cake into equal wedges', 'Cake Cat cuts through the very middle every time, so every wedge is the same.'],
  melonwhale: ['Whole Again — puts the parts back together into one', 'Melon Whale can tell you which slices make the whole melon again.'],
  // Origami
  paperplane: ['Glide Path — folds a problem flat and sends it flying', 'Paper Plane starts as a plain sheet; every crease makes it surer of the way.'],
  cranefold: ['Patient Fold — takes one careful step, then the next', 'Crane is folded from one square of paper, with no cuts and no glue.'],
  hopfold: ['Spring Jump — leaps along the number line and lands where it planned', 'Hop Frog jumps forward a little each time, and never loses count of its hops.'],
  fanfold: ['Pleat Pattern — repeats a fold until a pattern appears', 'Fan Dancer folds up, folds down, again and again, until the fan opens.'],
  lotusfold: ['Opening Petals — unfolds a hard question layer by layer', 'Lotus is folded corners to centre, over and over, until it blooms.'],
  kabuto: ['Steady Guard — keeps calm and checks the answer twice', 'Kabuto is a folded helmet; folds that match on both sides keep it strong.'],
  flutterfold: ['Mirror Wings — sees that one side matches the other', 'Flutter folds one wing, then the other exactly the same, along one line.'],
  goldencrane: ['Golden Fold — turns a flat square into something that flies', 'Golden Crane is the fold every folder hopes to make one day.'],
  // Gear Gang
  coggoat: ['Mesh Turn — turns the next gear the other way', 'Cog Goat knows that when two gears touch, they spin in opposite directions.'],
  windmouse: ['Steady Spin — counts every turn of the sails', 'Windmill Mouse waits for a gust, then keeps the sails turning round and round.'],
  pulleyparrot: ['Lift Easy — shares a heavy load across more ropes', 'Pulley Parrot lifts heavy things by sharing the weight between the strands of rope.'],
  springroo: ['Bounce Back — returns to the start after every stretch', 'Spring Roo stretches far and always springs back to where it began.'],
  boltbeetle: ['Tight Fit — fixes each step in place before the next', 'Bolt Beetle turns and turns until everything holds.'],
  spannerwalrus: ['Right Size — picks the tool that fits the problem', 'Spanner Walrus carries one of every size and knows which one fits.'],
  scalebadger: ['Even Keel — keeps both sides of the balance level', 'Balance Badger knows that whatever you do to one side, you do to the other.'],
  hourhamster: ['Sand Clock — knows how long a minute feels', 'Hourglass Hamster turns the glass when the last grain falls, and time starts again.'],
  // Sky Counters
  phasefox: ['Moon Count — tracks the moon from thin to full and back', 'Moon-phase Fox watches the moon grow and shrink in the same order, again and again.'],
  rocketrabbit: ['Countdown Launch — counts backwards, then blasts off', 'Rocket Rabbit counts down, never up, before lift-off.'],
  meteorpup: ['Quick Streak — races across a question in a flash', 'Meteor Pup is a bright streak across the night, gone before you can blink.'],
  stardeer: ['Join the Dots — sees a shape in a scatter of stars', 'Constellation Deer is made of stars joined by lines nobody drew.'],
  slothsat: ['Slow Orbit — goes round and round, never in a hurry, never lost', 'Satellite Sloth circles at its own pace and keeps an eye on everything below.'],
  moonrover: ['Careful Rover — checks each step before rolling on', 'Moon Rover drives slowly, because on the moon there is nobody to ask the way.'],
  ringturtle: ['Ring Path — follows a circle back to where it started', 'Ringed Turtle wears rings like a planet, and keeps them perfectly round.'],
  galaxysnail: ['Spiral Arm — sees the big pattern in a swirl of stars', 'Galaxy Snail carries a whole spiral of stars on its back, and never hurries.'],
  // Measure Lab
  thermobear: ['Warm or Cold — reads up and down a scale without a slip', 'Thermometer Bear knows a scale can go below zero and still keep counting.'],
  jugmouse: ['Fill Line — reads the scale at eye level, every time', 'Measuring-jug Mouse bends down to read the water line straight on.'],
  prismcat: ['Light Split — breaks one thing into its parts', 'Prism Cat lets white light in, and a rainbow comes out the other side.'],
  tapesnail: ['Long Reach — measures all the way, then winds it back', 'Tape-measure Snail starts at zero, not at one, and never forgets it.'],
  levellizard: ['Bubble Level — knows when something is perfectly flat', 'Spirit-level Lizard watches the bubble: when it sits in the middle, the shelf is level.'],
  magnifly: ['Close Look — spots the tiny detail everyone else missed', 'Magnifying Firefly makes small things look big, but never changes their size.'],
  pendulumpanda: ['Steady Swing — keeps the same beat back and forth', 'Pendulum Panda swings to a beat you can count along to.'],
  fractaldragon: ['Endless Pattern — sees the shape inside the shape inside the shape', 'Look closer at Fractal Dragon and every part is a smaller dragon.'],
  // Pattern Pets
  hexbee: ['Honeycomb Fit — packs shapes together with no gaps', 'Honeycomb Bee builds with hexagons because they fit together with no gaps at all.'],
  nautilus: ['Spiral Grow — grows a little more with every turn', 'Spiral Snail adds a bigger room each time round, and keeps the same shape.'],
  tessgecko: ['Tile Trick — covers a floor with one shape, again and again', 'Tiling Gecko fits each tile to the next so the pattern never breaks.'],
  flakefox: ['Matching Arms — makes every arm match the others', 'Snowflake Fox knows a snowflake grows its arms alike, all the way round.'],
  pineporc: ['Spiral Spotter — finds the spirals hiding in a pinecone', 'Pinecone Porcupine sees spirals running both ways across every cone.'],
  mandalamoth: ['Round Repeat — turns a pattern around its centre', 'Mandala Moth draws one part and turns it, again and again, round the middle.'],
  peacock: ['Fan Out — opens a pattern where every eye has its place', 'Spiral Peacock spreads its tail, and the eyes sit in curving rows.'],
  sunlion: ['Sunflower Spiral — packs seeds so none are wasted', 'Sunflower Lion’s seeds sit in spirals that curl both ways from the middle.'],
  // Symmetry Friends
  mirrorfly: ['Mirror Line — sees one half and knows the other', 'Fold Mirror Butterfly down the middle and the two wings match.'],
  pinpup: ['Quarter Turn — spins and looks the same again', 'Pinwheel Pup turns in the wind and lands looking just as it started.'],
  kitekitten: ['Fold Line — finds the line that splits a kite into matching halves', 'Kite Kitten has one line of symmetry, from the top point to the tail.'],
  toptapir: ['Steady Spin — stays balanced on one point while it turns', 'Spinning-top Tapir stays upright for as long as it keeps spinning.'],
  lanternlemur: ['Glow Round — lights the same pattern on every side', 'Lantern Lemur’s paper lantern repeats its pattern all the way round.'],
  kaleidokoala: ['Many Mirrors — turns one small picture into a whole pattern', 'Kaleido Koala looks through mirrors that copy every bead into a star.'],
  rangolirabbit: ['Dot Grid — grows a pattern from a grid of dots', 'Rangoli Rabbit draws like the rangoli floor art of India: dots first, then lines that match on every side.'],
  kolamturtle: ['Unbroken Line — loops round every dot without lifting the hand', 'Kolam Tortoise draws like the kolam artists of South India: one line looping round a grid of dots.'],
  // Turbo
  rally: ['Steady Lap — keeps a good pace from start to finish', 'Rally knows that steady laps beat one fast one.'],
  turbo: ['Quick Start — gets going the moment the question appears', 'Turbo answers fast, but looks at the road ahead first.'],
  crash: ['Bounce Back — learns from a spin-out and races on', 'Crash has bumped every wall on the track, and remembers each one.'],
  rainbow: ['Colour Lanes — keeps every lane in order', 'Rainbow Cart drives its colours in the same order, every lap.'],
  champ: ['Podium Calm — stays cool on the last lap', 'Champ wins by not panicking, not by going fastest.'],
  nitro: ['Burst Boost — saves its speed for the long straight', 'Nitro waits for the straight before it uses its boost.'],
  mech: ['Pit Stop — fixes a mistake fast and gets back on track', 'Mech carries a toolbox and knows every part of the cart.'],
  titan: ['Fearless Finish — takes the hardest corner without slowing down', 'Titan earned its place by being fast and fearless at once.'],
  // Pixel Pals
  pixelkitty: ['Square by Square — builds a picture one square at a time', 'Pixel Kitty is drawn on a grid, and every square counts.'],
  blockfrog: ['Grid Hop — jumps from square to square, never off the grid', 'Block Frog moves along rows and columns, like a point on a map.'],
  bitbunny: ['On or Off — answers yes or no in a flash', 'Bit Bunny is built from the smallest piece of a computer’s memory: on, or off.'],
  tetrosnake: ['Shape Slot — turns a piece until it fits', 'Tetro Snake is four squares joined edge to edge, and it can turn any way.'],
  mazemole: ['Way Finder — tries one path, then the next, until it is out', 'Maze Mole remembers every dead end, so it never tries one twice.'],
  voxelbear: ['Cube Stack — builds across, up and back all at once', 'Voxel Bear is made of tiny cubes, stacked in every direction.'],
  joyjelly: ['Quick Tap — presses the right button at just the right time', 'Joystick Jelly wobbles everywhere except at the controls.'],
  glitchgecko: ['Bug Hunt — spots the one square that is out of place', 'Glitch Gecko finds the mistake in the picture, and fixes it.'],
};

/* the pack's noun and the tier's adjective make each card's title */
const NOUN = { shapes: 'solid-shape pal', counting: 'counting critter', tools: 'geometry-box friend', fractions: 'equal-parts feaster', origami: 'paper folder',
  gears: 'machine mover', sky: 'sky counter', measure: 'measure maker', patterns: 'nature-pattern pet', symmetry: 'mirror friend', turbo: 'Number Rush racer', pixels: 'grid builder' };
const ADJ = { common: 'Trusty', rare: 'Clever', epic: 'Brilliant', legendary: 'Legendary' };

/* ---- the ranking: by tier (Legendary first), then pack order, then the pack's own row order */
const TIER_ORDER = ['legendary', 'epic', 'rare', 'common'];
const ORDERED = CATALOGUE.map((a, i) => ({ a, i })).sort((x, y) => TIER_ORDER.indexOf(x.a.tier) - TIER_ORDER.indexOf(y.a.tier) || x.a.pack - y.a.pack || x.i - y.i).map((x) => x.a);
const RANK = Object.fromEntries(ORDERED.map((a, i) => [a.id, i + 1]));
const RANK_IN_PACK = {};
for (const p of PACKS) ORDERED.filter((a) => a.pack === p.n).forEach((a, i) => { RANK_IN_PACK[a.id] = i + 1; });

/* ---- the stats: Bee's A() — a tier base plus a spread hashed from the id, kept in 28–99 */
export const STATS = [['speed', 'Speed'], ['accuracy', 'Accuracy'], ['logic', 'Logic'], ['pattern', 'Pattern sense']];
const BASE = { common: { base: 52, spread: 16 }, rare: { base: 62, spread: 18 }, epic: { base: 72, spread: 18 }, legendary: { base: 84, spread: 14 } };
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const frac = (x) => { const v = Math.sin(x) * 1e4; return v - Math.floor(v); };
export function statsOf(id, tier) {
  const b = BASE[tier] || BASE.common, out = {};
  STATS.forEach(([k], i) => { out[k] = Math.max(28, Math.min(99, b.base + Math.round((frac((fnv(id + ':' + k) % 1e5) + i) * 2 - 1) * b.spread))); });
  return out;
}

/* ---- dates said in words, the same on every device (no locale guessing) */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const day = (t) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const real = (t) => Number.isFinite(t) && t > 0;

/* How this face came to this child, from the record only. `ledger` is the family wallet's
   ledger for the child (Family.ledger), `app` this app's id: Bee sells faces with the same ids
   (the Turbo and Origami packs came from it), so only this app's lines count. */
export function historyOf(id, k, ledger = [], app = 'maths') {
  const a = byAvatar[id]; if (!a || !k) return [];
  const out = [];
  if (k.starter === id) out.push(real(k.created) ? `Picked when you started, on ${day(k.created)}` : 'Picked when you started');
  else if (a.tier === 'common') out.push('Free for every child, from the first day');
  if (a.milestone) {
    const [kind, x] = a.milestone.id.split(':');
    if (milestonesOf(k).has(a.milestone.id)) {
      const at = kind === 'medal' && k.medals && k.medals[x] && k.medals[x].at;
      out.push(`First it asked you to ${a.milestone.label} — you did${real(at) ? `, on ${day(at)}` : ''}`);
    }
  }
  const bought = (ledger || []).filter((l) => l && l.a === app && l.n < 0 && l.why === `avatar:${id}`).sort((p, q) => p.t - q.t)[0];
  if (bought) out.push(`Bought for ${-bought.n} coins${real(bought.t) ? ` on ${day(bought.t)}` : ''}`);
  if (!out.length) out.push('In your collection');
  return out;
}

/* Everything a card says, as data */
export function cardOf(id) {
  const a = byAvatar[id]; if (!a) return null;
  const pack = PACKS[a.pack - 1], t = TIERS[a.tier], [power, lore] = WORDS[id] || ['', ''];
  const stats = statsOf(id, a.tier);
  return { id, name: a.name, art: a.art, tier: a.tier, tierLabel: t.label, colour: t.colour, pack: pack.name, packId: pack.id,
    title: `${ADJ[a.tier]} ${NOUN[pack.id]}`, power, lore, stats, rank: RANK[id], rankInPack: RANK_IN_PACK[id], of: CATALOGUE.length,
    ranking: `${t.label} · #${RANK_IN_PACK[id]} of 8 in ${pack.name} · #${RANK[id]} of ${CATALOGUE.length}` };
}

/* The card. `history` is the list from historyOf (owned); a locked card is a silhouette that
   says how it is earned (`earn`, the engine's own words) instead. */
export function cardHTML(id, { owned = true, history = [], earn = '' } = {}) {
  const c = cardOf(id); if (!c) return '';
  const [pw, ...rest] = c.power.split(' — ');
  return `<article class="avc avc-${c.tier}${owned ? '' : ' locked'}" style="--rc:${c.colour}" aria-labelledby="avc-h-${c.id}" data-id="${c.id}">
    <div class="avc-top"><span class="avc-tier">${esc(c.tierLabel)}</span><span class="avc-pack"><i></i>${esc(c.pack)}</span></div>
    <div class="avc-art"><img src="${esc(c.art)}" alt="${owned ? esc(c.name) : ''}" width="168" height="168" decoding="async"></div>
    <h2 class="avc-name" id="avc-h-${c.id}" tabindex="-1">${owned ? esc(c.name) : `${esc(c.name)} <span class="avc-locked">not yours yet</span>`}</h2>
    <p class="avc-title">${esc(c.title)}</p>
    <p class="avc-rank">${c.ranking.split(' · ').map((x) => `<span>${esc(x)}</span>`).join(' · ')}</p>
    <p class="avc-power"><b>${esc(pw)}</b>${rest.length ? ` — ${esc(rest.join(' — '))}` : ''}</p>
    <div class="avc-stats">${STATS.map(([k, n]) => `<div class="avc-stat"><span>${n}</span><span class="avc-bar" role="img" aria-label="${n} ${c.stats[k]} of 99"><i style="width:${c.stats[k]}%"></i></span><b>${c.stats[k]}</b></div>`).join('')}</div>
    <p class="avc-lore">${esc(c.lore)}</p>
    <div class="avc-hist"><span class="avc-hh">${owned ? 'How it came to you' : 'How to earn it'}</span>
      <ul>${(owned ? history : [earn || 'Its card in the Collection says how']).map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
  </article>`;
}

/* ------------------------------------------------------------------ the deck (Bee's openAvDeck)

   ONE big card at a time with ghosts stacked behind; ‹ › (44px), ←/→ and a swipe flip through
   the child's OWNED faces; it opens on the one being worn, says "3 / 12 owned", and "Wear this
   avatar" (or "Wearing" on the worn one). Close, Escape or a tap outside closes it. Focus is
   held inside while it is open and goes back to whatever opened it.

   o = { ids, start, worn: () => id, history: (id) => lines, wear: (id) => void, celebrate: () => void,
         trigger, locked?: { id, earn } } — a `locked` peek shows one silhouette card and no deck. */
let open = null;
export const isOpen = () => !!open;
export function closeDeck() { if (open) open.close(); }

export function openDeck(o) {
  closeDeck();
  const ids = o.locked ? [o.locked.id] : o.ids.slice();
  let i = Math.max(0, ids.indexOf(o.start)); if (!ids.length) return null;
  const ov = document.createElement('div');
  ov.className = 'avd-ov';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', o.locked ? 'Avatar card' : 'Your avatar cards');
  const trigger = o.trigger || document.activeElement;
  let dir = 0;

  function draw(focus) {
    const id = ids[i], many = ids.length > 1, wearing = !o.locked && o.worn() === id;
    const card = o.locked ? cardHTML(id, { owned: false, earn: o.locked.earn }) : cardHTML(id, { owned: true, history: o.history(id) });
    ov.innerHTML = `<div class="avd-stage">
        ${many ? '<div class="avd-ghost g3" aria-hidden="true"></div><div class="avd-ghost g2" aria-hidden="true"></div><div class="avd-ghost g1" aria-hidden="true"></div>' : ''}
        <div class="avd-live${dir ? (dir > 0 ? ' from-r' : ' from-l') : ''}">${card}</div>
        ${many ? `<button class="avd-nav avd-prev" data-avd="prev" aria-label="Previous card">${icon('back', 24)}</button><button class="avd-nav avd-next" data-avd="next" aria-label="Next card">${icon('next', 24)}</button>` : ''}
      </div>
      <div class="avd-bar">
        ${!o.locked ? `<span class="avd-count" aria-live="polite">${i + 1} / ${ids.length} owned</span>` : ''}
        ${o.locked ? '' : wearing ? `<span class="avd-worn">${icon('check', 18)} Wearing</span>` : '<button class="avd-wear" data-avd="wear">Wear this avatar</button>'}
        <button class="avd-x" data-avd="close">Close</button>
      </div>`;
    const t = focus && ov.querySelector(`[data-avd="${focus}"]`);
    (t || ov.querySelector('.avc-name')).focus({ preventScroll: true });
  }
  const flip = (d) => { if (ids.length < 2) return; dir = d; i = (i + d + ids.length) % ids.length; draw(d > 0 ? 'next' : 'prev'); };
  function close() {
    document.removeEventListener('keydown', key, true);
    ov.remove(); open = null;
    if (trigger && trigger.isConnected && trigger.focus) trigger.focus({ preventScroll: true });
    else if (o.refocus) { const t = o.refocus(); if (t) t.focus({ preventScroll: true }); }
  }
  function key(e) {
    if (e.key === 'ArrowLeft') flip(-1);
    else if (e.key === 'ArrowRight') flip(1);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') {   // focus stays inside while the deck is open
      const f = [...ov.querySelectorAll('button, [tabindex="0"]')].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || !ov.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !ov.contains(at))) { e.preventDefault(); first.focus(); }
      e.stopPropagation(); return;
    } else return;
    e.preventDefault(); e.stopPropagation();
  }
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-avd]');
    if (b) {
      const a = b.getAttribute('data-avd');
      if (a === 'prev') flip(-1);
      else if (a === 'next') flip(1);
      else if (a === 'close') close();
      else if (a === 'wear') { o.wear(ids[i]); if (o.celebrate) o.celebrate(); dir = 0; draw(); }
      return;
    }
    if (e.target === ov || e.target.classList.contains('avd-stage')) close();
  });
  let x0 = null, y0 = null;
  ov.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  ov.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) flip(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', key, true);
  document.body.appendChild(ov);
  draw();
  open = { close, el: ov };
  return ov;
}
