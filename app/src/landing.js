/* landing.js — the first-visit landing below the hero, in Bizzing Bee's shape: the promise
   strip, "this is the actual app", the games and puzzles, why it works, collect, how it
   compares, the ladder, and questions parents ask. The hero (views.js viewWelcome) renders
   at once; this module is a lazy chunk, so Home never pays for it and neither does the
   landing's first paint.

   Two rules hold the whole page honest, and test/family-ui.mjs measures both:
     · every number on it is counted from the code (FACTS, below) and drawn inside
       data-n="<key>" so the test can recount it independently — nothing is typed;
     · every picture is a real screen of this app, captured by tools/shots.mjs from the
       sample child at ?demo, and loaded only when it scrolls near (data-lsrc).
   There are no testimonials (there are none, and none are invented) and no prices (there
   are none; that is the owner's decision to make). */
import { esc } from './ui.js';
import { icon } from './icons.js';
import { TRICKS, WORLDS, checkedPerStop } from './tricks.js';
import { LEVELS } from './levels.js';
import { ORDER as TOOLS } from './library/shelf.js';
import { GAMES } from './arcade.js';
import { FAMILIES, FLOORS } from './puzzles.js';
import { CATALOGUE, PACKS, TIERS } from './avatars.js';
import { BAND_IDS, FIXED } from './papers/bands.js';
import { RIVALS } from './contest.js';
import { BANDS } from './model.js';
import { total as FEED_CARDS } from '../../tools/feed-manifest.json';

const contestWorlds = new Set(WORLDS.filter((w) => w.track === 'contest').map((w) => w.id));
export const FACTS = {
  stops: TRICKS.length,
  worlds: WORLDS.length,
  levels: LEVELS.length,
  tools: TOOLS.length,
  games: GAMES.length,
  families: FAMILIES.length,
  floors: FLOORS,
  papers: BAND_IDS.length * FIXED,
  bands: BAND_IDS.length,
  fixed: FIXED,
  strategies: TRICKS.filter((t) => contestWorlds.has(t.world)).length,
  avatars: CATALOGUE.length,
  packs: PACKS.length,
  commons: CATALOGUE.filter((a) => a.tier === 'common').length,
  feed: FEED_CARDS,
  perStop: checkedPerStop(),
  checked: TRICKS.length * checkedPerStop(),
  rivals: RIVALS.length,
  ageBands: BANDS.length,
  ageMin: parseInt(BANDS[0].id, 10),
  ageMax: parseInt(BANDS[BANDS.length - 1].id.split('-').pop(), 10),
};
/* an example typed into a sentence (7 × 8), not a count: marked so the test can tell them apart */
const eg = (t) => `<span data-eg>${t}</span>`;
const fmt = (n) => Number(n).toLocaleString('en-GB');
/* a counted number, marked so the test can recount it */
export const N = (key) => `<b data-n="${key}">${fmt(FACTS[key])}</b>`;

/* The screens, captured by tools/shots.mjs (one id per file in public/art/shots/). */
export const SHOTS = ['home', 'atlas', 'world', 'learn', 'turn', 'drill', 'library', 'tower', 'game', 'hall', 'paper', 'ladder', 'feed', 'collection'];
const shot = (id, alt, cls = '') =>
  `<img class="land-shot${cls ? ' ' + cls : ''}" data-lsrc="art/shots/${id}.jpg" alt="${esc(alt)} — a screen from Bizzing Maths" width="1200" height="834" loading="lazy" decoding="async">`;

function section(id, kicker, title, lead, body, alt = false) {
  return `<section class="land-sec${alt ? ' alt' : ''}" id="land-${id}" aria-labelledby="land-${id}-h">
    <div class="land-in">
      <p class="land-kick">${kicker}</p>
      <h2 class="land-h" id="land-${id}-h">${title}</h2>
      ${lead ? `<p class="land-lead">${lead}</p>` : ''}
      ${body}
    </div></section>`;
}

/* ---------------------------------------------------------------- the promises */
export const PROMISES = (privacy) => [
  ['shield', 'Nothing leaves this device', `<span class="land-privacy">${esc(privacy)}</span>`],
  ['heart', 'No ads, no streaks, no loot', 'A day off costs nothing. Rank moves only with right answers — never with minutes on the app.'],
  ['bulb', 'Every trick has its reason', 'A picture, the algebra, and the child doing the working themselves.'],
  ['check', 'Every step is checked', `${N('perStop')} generated questions a stop, each worked three ways that must agree.`],
];
function promises(privacy) {
  return `<div class="land-promises">${PROMISES(privacy).map(([ic, h, p]) => `<div class="land-prom">
      <span class="land-ic">${icon(ic, 18)}</span>
      <span><b>${h}</b><span>${p}</span></span></div>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- the actual app */
const SHOWCASE = [
  ['learn', 'Every trick, with the reason it works', 'Each stop shows the trick worked out step by step, then why it works — a picture you can see and the algebra underneath. The sutra stops say plainly where the sutra comes from.'],
  ['turn', 'Then the child does the working', 'Your turn asks for every step of the trick, not just the answer, so the method becomes theirs. Get a step wrong twice and it shows you, then carries on.'],
  ['atlas', 'A painted Atlas, one road a level', () => `${N('worlds')} places on the map, and ${N('levels')} levels, each one road through them. Every stop is a place with a story, not a box on a progress bar.`],
  ['home', 'Home says one thing: what is next', 'A greeting, today’s ring, and one Continue button. A day off costs nothing — the ring does not shame, and nothing expires.'],
  ['library', () => `A Library of ${N('tools')} tools`, 'A Times Table Explorer that grows only as the child masters it, a Number Explorer, Show Me the Working, Shape Studio, Graphing, a Dictionary, a Formula Book and two journeys through the Vedic and Chinese methods — each with its sources.'],
  ['feed', 'My Feed — about twenty cards, and then it ends', () => `${N('feed')} cards cut from the app’s own stops, stories, words and formulas, each linking to the thing it came from. It ends on purpose; nothing scrolls forever.`],
];
const val = (x) => (typeof x === 'function' ? x() : x);
function showcase() {
  const rows = SHOWCASE.map(([id, h, p], i) => `<div class="land-row${i % 2 ? ' flip' : ''}">
      <div class="land-row-t"><h3>${val(h)}</h3><p>${val(p)}</p></div>
      <figure class="land-frame">${shot(id, String(val(h)).replace(/<[^>]+>/g, ''))}</figure>
    </div>`).join('');
  return section('app', 'This is the actual app', 'Not a mock-up. This is what your child opens.',
    'Every picture on this page is a real screen, captured from the sample child you can open yourself.', rows);
}

/* ---------------------------------------------------------------- games and puzzles */
const GALLERY = [
  ['game', 'Make the Target', 'Four numbers, one target, + − × ÷. Use every number.'],
  ['drill', 'Drills that wait for Enter', () => `A right answer is taken the moment it is typed; a wrong one waits, so nobody is told “wrong” halfway through typing ${eg('56')}.`],
  ['tower', 'The Puzzle Tower', () => `${N('floors')} floors across ${N('families')} families of puzzle — every one proved to have exactly one answer before it is shown.`],
  ['hall', 'The Contest Hall', () => `${N('strategies')} strategy stops for problems nobody has met before.`],
  ['paper', 'Contest-style papers', () => `${N('papers')} fixed papers — ${N('fixed')} in each of ${N('bands')} grade bands — and fresh ones without end. Every problem is solved by its own checker.`],
  ['ladder', 'The Sutra Ladder', 'The deep Vedic methods, each with the algebra that makes it work, and every history line cited.'],
  ['world', 'A world board', 'Stops walked in order through a painted place, with the stop you are on always in view.'],
];
function gallery() {
  const cards = GALLERY.map(([id, h, p]) => `<figure class="land-card">
      <span class="land-card-i">${shot(id, h, 'cover')}</span>
      <figcaption><b>${esc(h)}</b><span>${val(p)}</span></figcaption></figure>`).join('');
  const strip = [['stops', 'stops, each with a story'], ['worlds', 'places on the Atlas'], ['levels', 'levels'], ['tools', 'Library tools'],
    ['games', 'arcade games'], ['papers', 'contest papers'], ['avatars', 'faces to collect'], ['feed', 'feed cards']]
    .map(([k, l]) => `<span class="land-fact">${N(k)}<span>${l}</span></span>`).join('');
  return section('play', 'Games and puzzles', 'Fast, and fearless.',
    `${N('games')} arcade games, a puzzle tower and a contest hall — and under every one of them, the same arithmetic the lessons teach.`,
    `<div class="land-cards">${cards}</div><div class="land-facts" role="list" aria-label="Counted from the app">${strip}</div>`, true);
}

/* ---------------------------------------------------------------- why it works */
function why(vedic) {
  const cards = [
    ['bulb', 'Every trick shows why', () => `All ${N('stops')} stops carry at least two reasons and the algebra underneath — the trick is never just a rule to memorise.`],
    ['check', 'Every step is checked', () => `The trick’s own steps, the answer, and plain arithmetic must agree on ${N('perStop')} generated questions a stop — ${N('checked')} in all, every time the test suite runs. A trick wrong one time in a thousand would teach a child that maths is unreliable.`],
    ['book', 'Stories with the same rivals', () => `A story for every stop, starring the same ${N('rivals')} rivals the Mock Contest uses. Every sum a character writes on the notepad is checked too.`],
    ['compass', 'The Vedic label is honest', () => `<span data-code="vedic">${esc(vedic)}</span>`],
  ].map(([ic, h, p]) => `<div class="land-why"><span class="land-ic">${icon(ic, 18)}</span><b>${h}</b><p>${val(p)}</p></div>`).join('');
  return section('why', 'Why it works', 'Fluent needs a gap. Difficulty is trickiness, not size.',
    `A fact counts as fluent only when it is right, fast and due again after a gap — five fast answers in one sitting are repetition, not memory. And ${eg('7 × 8')} comes before ${eg('12 × 12')}, because it is harder.`,
    `<div class="land-whys">${cards}</div>`);
}

/* ---------------------------------------------------------------- collect */
function collect(face) {
  const faces = PACKS.flatMap((p) => CATALOGUE.filter((a) => a.pack === p.n).slice(0, 2))
    .map((a) => `<span class="land-face" title="${esc(a.name)}">${face(a.id, a.name)}</span>`).join('');
  return section('collect', 'Collect · earn · never buy', `${N('avatars')} faces. Not one sold for real money.`,
    `${N('commons')} are free for everyone. The rest are bought with Bizzing coins — earned only by right answers and passed stops, at the price printed on the card — and the rarest each ask for a learning milestone first. There are no packs and no odds; nothing is left to chance. Coins never change a child’s rank.`,
    `<div class="land-faces">${faces}</div>
     <p class="land-tiers">${Object.values(TIERS).map((x) => `<span><i style="background:${x.colour}"></i>${esc(x.label)}</span>`).join('')}</p>
     <figure class="land-frame land-coll">${shot('collection', 'The Collection: every card says how it is earned')}</figure>`);
}

/* ---------------------------------------------------------------- compare */
const COMPARE = [
  ['Why a trick works', 'A rule to memorise', 'Every stop: the reasons, a picture and the algebra'],
  ['Is the method checked?', 'The answers, if anything', () => `Every step of every trick, against plain arithmetic, on ${N('perStop')} questions a stop`],
  ['What makes it harder', 'Bigger numbers', () => `Trickiness — ${eg('7 × 8')} before ${eg('12 × 12')}`],
  ['“Vedic maths”', 'Often sold as ancient scripture', 'Labelled honestly, with its sources'],
  ['Fluent means', 'Fast in one sitting', 'Right, fast and due again after a gap'],
  ['Ads and tracking', 'Common', 'None. Nothing leaves this device'],
  ['Accounts', 'The child signs in with an email', 'None. A first name and an age band, kept on this device'],
  ['Streaks', 'A streak to protect', 'None. A day off costs nothing'],
  ['What coins buy', 'Boosts, shortcuts, random boxes', 'Faces, frames, road skins and bonus game modes, at a printed price — never a lesson, never by chance'],
  ['What a grown-up sees', 'Minutes played', 'What was learned, from evidence, behind a PIN'],
];
function compare() {
  const rows = COMPARE.map(([a, b, c]) => `<tr><th scope="row">${a}</th><td>${b}</td><td class="us">${val(c)}</td></tr>`).join('');
  return section('compare', 'How it compares', 'What a maths app usually gives you, and what this does.',
    'No names — this is the category, not a rival. Every line in the right-hand column is true of the app you are looking at.',
    `<div class="land-table"><table><thead><tr><th scope="col">What matters</th><th scope="col">A typical maths app</th><th scope="col" class="us">Bizzing Maths</th></tr></thead><tbody>${rows}</tbody></table></div>`, true);
}

/* ---------------------------------------------------------------- the ladder */
function ladder() {
  const cards = LEVELS.map((l) => `<div class="land-lv" data-code="level">
      <span class="land-lv-n">Level ${l.n}<i>maths age ${esc(l.age)}</i></span>
      <b>${esc(l.name)}</b><span>${esc(l.blurb)}</span></div>`).join('');
  return section('ladder', 'One ladder', `${N('levels')} levels, one road each.`,
    'A child starts where “Find my level” places them — a few questions that move up when they are right and down when they are not, until they find a maths age. It is not a score.',
    `<div class="land-lvs">${cards}</div>`);
}

/* ---------------------------------------------------------------- questions */
function faq(privacy, vedic) {
  const ages = BANDS.map((b) => b.label).join(', ');
  const Q = [
    ['What is Bizzing Maths?', 'A maths app for children that teaches fact fluency, mental maths and the Vedic and Chinese methods — each trick with the reason it works, and the child doing the working.'],
    ['What ages is it for?', `Ages ${N('ageMin')} to ${N('ageMax')}, in ${N('ageBands')} age bands (<span data-code="bands">${esc(ages)}</span>). The levels run from maths age <span data-code="level">${esc(LEVELS[0].age)}</span> to <span data-code="level">${esc(LEVELS[LEVELS.length - 1].age)}</span>, so a child can be placed ahead of or behind their age.`],
    ['Do we need an account?', 'No. A grown-up adds a child with a first name, an age band and a face. Nothing to sign in to, and no email.'],
    ['What does it keep about my child?', `A first name, an age band, the chosen avatar and progress, in this browser on this device, and two small shared notes for the Bizzing family that stay on this device too. <span class="land-privacy">${esc(privacy)}</span>`],
    ['Is “Vedic maths” really from the Vedas?', `<span data-code="vedic">${esc(vedic)}</span>`],
    ['Can two children share one device?', 'Yes. Each child has their own record — facts, stops, coins and level — and one never inherits the other’s.'],
    ['What do grown-ups see?', 'A report card of what each child has learned, measured from what they did — not minutes played — behind a PIN on the Grown-ups page. The PIN is a deterrent, and the page says so.'],
  ];
  return section('faq', 'Questions parents ask', 'Everything you might want to know first.', '',
    `<div class="land-faq">${Q.map(([q, a]) => `<div><h3>${q}</h3><p>${a}</p></div>`).join('')}</div>`, true);
}

/* Everything below the hero. `privacy` is the privacy page's own sentence (views.js
   PRIVACY_LINE), so the two cannot drift; `face` draws an avatar. */
export function landingRest({ privacy, face }) {
  const obs = WORLDS.find((w) => w.id === 'observatory');
  // the Sutra Observatory's own words (tricks.js), said where the landing says them
  const said = obs && obs.intro ? obs.intro.body : ['', ''];
  const vedic = said.slice(0, 2).join(' ').replace('in this part of the Atlas', 'in the Atlas');
  const honest = `The honest name: ${said[1].split('the honest name is: ')[1] || ''} The Observatory says so, with its sources, and every sutra stop shows the algebra that makes it work.`;
  return `<div class="land-rest">${promises(privacy)}${showcase()}${gallery()}${why(honest)}${collect(face)}${compare()}${ladder()}${faq(privacy, vedic)}</div>`;
}

/* Bizzing Bee's lazy shots: a screenshot is fetched only when it scrolls within reach. */
let io = null;
export function wire(root) {
  const imgs = root.querySelectorAll('img[data-lsrc]'); if (!imgs.length) return;
  const load = (i) => { i.src = i.getAttribute('data-lsrc'); i.removeAttribute('data-lsrc'); };
  if (!('IntersectionObserver' in window)) { imgs.forEach(load); return; }
  if (io) io.disconnect();
  io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } }), { rootMargin: '400px 0px' });
  imgs.forEach((i) => io.observe(i));
}
