/* views2.js — the painted surfaces: the Atlas as a map you travel, each world
   as a painting with a road across it, the story stage, the Puzzle Room and
   the Goals page.

   The Bee's Atlas rules, kept here:
   · An act is a painting with a road across it, never a checklist. The ROAD
     is drawn here, as SVG, over the painting — the painting only leaves room
     for it — so a pin can never land somewhere a model happened not to paint
     a path (the family's rule: structural truths live in the rig).
   · No fog, no dimming over the art. A region you have not reached shows it
     on the PIN, not by greying the painting.
   · Never show the length of the road: no "0/27" over a map.
   · Ambient motion belongs to the place, and disappears under reduced motion. */

import { R } from './runtime.js';
import { esc, cls } from './ui.js';
import { TRICKS, WORLDS, byId, worldOf, tricksIn } from './tricks.js';
import { kid, ROUTE, isOpen, frontier, nodeDone, worldOpen, onJourney, firstLevel } from './model.js';
import { STORIES } from './stories.js';
import { FAMILIES, FLOORS, isBoss, FLOOR_PASS, floorLevel, bandLevel, sudokuSize } from './puzzles.js';
import { MISSION, goalsFor, summary, STATUS } from './objectives.js';
import { av, starRow, starsInline, pageHead, sayBtn, trickOfDay, numberOfDay } from './views.js';
import { octo, octoState } from './views3.js';
import { bot } from './contest.js';
import * as J from './journey.js';
import { CONCEPTS, CONCEPT_OF } from './levels.js';
import { icon, glyph } from './icons.js';

const back = (act, label = 'Back', arg = '') =>
  `<button class="back" data-act="${act}"${arg ? ` data-arg="${esc(arg)}"` : ''}><span aria-hidden="true">←</span> ${esc(label)}</button>`;

/* ------------------------------------------------------------- the map */

/* Where each world sits on the painted island, MEASURED against atlas.webp in
   its own 0–100 space (x and y). Regenerating the map means re-measuring. */
export const MAP_PINS = {
  gardens: { x: 20, y: 66 }, market: { x: 31, y: 42 }, workshop: { x: 51, y: 50 },
  observatory: { x: 63, y: 25 }, harbour: { x: 83, y: 34 }, ladder: { x: 67, y: 66 },
  court: { x: 47, y: 78 },   // the open grass by the south shore, clear of the Ladder and its label
};
/* The Far Isles — measured against atlas2.webp the same way. */
export const MAP2_PINS = {
  library: { x: 27, y: 20 }, clocktower: { x: 45, y: 17 }, bakery: { x: 62, y: 19 }, shapecity: { x: 80, y: 30 },
  forest: { x: 83, y: 56 }, palace: { x: 63, y: 74 }, dock: { x: 44, y: 71 }, setisland: { x: 28, y: 74 }, carnival: { x: 16, y: 43 },
};
/* The Outer Isles — measured against atlas3.webp the same way. */
export const MAP3_PINS = { quarry: { x: 24, y: 30 }, mine: { x: 75, y: 31 }, lighthouse: { x: 25, y: 73 }, coinstreet: { x: 76, y: 72 } };
const ISLANDS = [
  { n: 1, name: 'Number Island', blurb: 'Mental methods and the Vedic sutras — where the Atlas began.', img: 'atlas', pins: MAP_PINS, w: 1920, h: 1072 },
  { n: 2, name: 'The Far Isles', blurb: 'Place value, time and money, fractions, shapes, factors, squares, decimals, sets and data.', img: 'atlas2', pins: MAP2_PINS, w: 1920, h: 1072 },
  { n: 3, name: 'The Outer Isles', blurb: 'Kinds of number and the primes they are built from, numbers below zero, money — and the Lighthouse, for trigonometry, bearings, scatter graphs and chance.', img: 'atlas3', pins: MAP3_PINS, w: 1920, h: 1072 },
];

/* A stop's level badge. On a journey: "L2 · 5" for station 5 of the child's
   road (✓ once passed), a plain "L1" for an earlier level, a locked "L6" for a
   later one. Every place a stop is drawn in the Atlas carries one. */
function lvBadge(k, id) {
  const f = firstLevel(id); if (!f) return '';
  const tester = R.h.parent.tester;   // tester mode opens gates: no lock is drawn on anything it opened
  if (!onJourney(k)) return `<b class="lvb">L${f}</b>`;
  const L = k.journey.level, r = J.onRoad(k, id);
  if (r) return `<b class="lvb road${r.done ? ' ok' : ''}" title="Stop ${r.n} on your Level ${L} road">L${L} · ${r.done ? icon('check', 12) : r.n}</b>`;
  return f < L || tester ? `<b class="lvb past" title="From Level ${f}">L${f}</b>` : `<b class="lvb later" title="Opens on the Level ${f} road">${icon('lock', 12, 'ico lk')} L${f}</b>`;
}
/* The Atlas has two views for a child on a journey: their road, and the islands. */
export const atlasSeg = (k, on) => onJourney(k) ? `<div class="seg atlas-seg" role="tablist" aria-label="Atlas view">
    <button role="tab" aria-selected="${on === 'road'}" class="${on === 'road' ? 'on' : ''}" data-act="atlasView" data-arg="road">${icon('compass', 18)} My road</button>
    <button role="tab" aria-selected="${on === 'islands'}" class="${on === 'islands' ? 'on' : ''}" data-act="atlasView" data-arg="islands">${icon('map', 18)} Explore the islands</button></div>` : '';

export function viewAtlasMap() {
  const h = R.h, k = kid(h), f = frontier(k, h);
  const here = ROUTE[f] ? ROUTE[f].world : WORLDS.at(-1).id;
  const stars = TRICKS.reduce((s, t) => s + ((k.tricks[t.id] || {}).stars || 0), 0);
  const jp = onJourney(k) ? J.progress(k) : null, roadWorld = jp && jp.next ? jp.next.t.world : null;
  const isle0 = R.ui.isle || (WORLDS.find((w) => w.id === (roadWorld || here)) || {}).island || 1;
  const isle = ISLANDS[isle0 - 1] ? isle0 : 1;   // a Contest Hall world has no island map
  const I = ISLANDS[isle - 1];
  const worlds = WORLDS.filter((w) => w.island === isle);
  return `<section>
    ${pageHead('The Number Atlas', '', '', `<button class="btn small" data-act="nav" data-arg="stories">${icon('book', 18)} Stories</button><span class="chip gold">${icon('star', 16)} ${stars}</span>`)}
    <div class="atlas-bar">${atlasSeg(k, 'islands')}
    <div class="seg isle-seg" role="tablist" aria-label="Island">${ISLANDS.map((x) => `<button role="tab" aria-selected="${x.n === isle}" class="${x.n === isle ? 'on' : ''}" data-act="isle" data-arg="${x.n}">${esc(x.name)}</button>`).join('')}</div></div>
    <div class="map-board">
      <img src="art/${I.img}.webp" alt="A painted map of ${esc(I.name)}." width="${I.w}" height="${I.h}">
      <div class="map-amb" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i style="--i:${i}"></i>`).join('')}</div>
      ${worlds.map((w) => {
        const open = worldOpen(h, k, w.id);
        const done = ROUTE.filter((n) => n.world === w.id).every((n) => nodeDone(k, n));
        const p = I.pins[w.id];
        const onroad = onJourney(k) ? ROUTE.filter((n) => n.world === w.id && n.kind === 'stop' && J.onRoad(k, n.id) && !J.onRoad(k, n.id).done).length : 0;
        return `<button class="map-pin${open ? '' : ' shut'}${here === w.id ? ' here' : ''}${done ? ' done' : ''}" style="left:${p.x}%;top:${p.y}%;--wi:${w.ink};--wt:${w.tint}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" aria-label="${esc(w.name)}${open ? '' : ', not reached yet'}">
          <span class="mp-g">${glyph(w.glyph, 22)}</span><span class="mp-t"><b>${esc(isle === 2 ? w.short : w.name)}</b>${onroad ? `<i class="mp-road">${onroad} on your Level ${k.journey.level} road</i>` : here === w.id && !onJourney(k) ? '<i>You are here</i>' : done ? '<i>Done ✓</i>' : open ? '' : '<i>Not reached yet</i>'}</span></button>`;
      }).join('')}
    </div>
    <div class="world-list">
      ${worlds.map((w) => {
        const ts = tricksIn(w.id); const s2 = ts.reduce((a, t) => a + ((k.tricks[t.id] || {}).stars || 0), 0);
        const open = worldOpen(h, k, w.id);
        return `<button class="wl${open ? '' : ' shut'}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" style="--wt:${w.tint};--wi:${w.ink}">
          <img src="art/w-${w.id}.webp" alt="" loading="lazy" width="1920" height="815">
          <span class="wl-t"><span class="kicker">${glyph(w.glyph, 16)} ${ts.length} stops · from age ${esc(w.band.split('-')[0])}</span><b>${esc(w.name)}</b><span>${esc(w.blurb)}</span><span class="wl-s">${starRow(Math.round(s2 / Math.max(1, ts.length)))} ${open ? '' : '· not reached yet'}</span></span></button>`;
      }).join('')}
    </div>
      <p class="muted center-t">${esc(I.blurb)}</p>
  </section>`;
}

/* ------------------------------------------------------------- a world */

/* The road across a board: a gentle wave, in the board's own 0–100 space. */
const ROAD = { gardens: [72, 7, 1.3], market: [78, 5, 1.1], workshop: [80, 5, 1.6], observatory: [72, 6, 1.2], harbour: [82, 4, 1.4],
  library: [80, 4, 1.2], clocktower: [80, 5, 1.4], bakery: [80, 4, 1.1], shapecity: [82, 4, 1.5], forest: [78, 5, 1.2],
  palace: [80, 5, 1.3], dock: [80, 4, 1.2], setisland: [82, 4, 1.1], carnival: [80, 5, 1.4],
  quarry: [80, 4, 1.2], mine: [80, 4, 1.3], coinstreet: [82, 4, 1.2], lighthouse: [80, 5, 1.2], court: [84, 4, 1.2] };
function roadY(wid, x) { const [b, a, f] = ROAD[wid] || [78, 5, 1.3]; return b + a * Math.sin((x / 100) * Math.PI * 2 * f + 0.6); }

export function viewWorld(wid) {
  const w = worldOf(wid), h = R.h, k = kid(h), f = frontier(k, h);
  const nodes = ROUTE.map((n, i) => ({ n, i })).filter((x) => x.n.world === wid);
  const xs = nodes.map((_, j) => 7 + (86 * j) / Math.max(1, nodes.length - 1));
  let path = ''; for (let x = 0; x <= 100; x += 2) path += `${x ? 'L' : 'M'}${x},${roadY(wid, x).toFixed(2)} `;
  const walked = nodes.filter((x) => nodeDone(k, x.n)).length;
  const walkX = walked ? xs[Math.min(walked, nodes.length - 1)] : 0;
  let wpath = ''; for (let x = 0; x <= walkX; x += 2) wpath += `${x ? 'L' : 'M'}${x},${roadY(wid, x).toFixed(2)} `;
  const sel = R.ui.pick && nodes.find((x) => x.n.id === R.ui.pick) ? R.ui.pick : (nodes.find((x) => x.i === f) || nodes.find((x) => !nodeDone(k, x.n)) || nodes[0]).n.id;
  const selNode = nodes.find((x) => x.n.id === sel);
  return `<section class="world-page" style="--wt:${w.tint};--wi:${w.ink}">
    ${pageHead(`${glyph(w.glyph, 26)} ${esc(w.name)}`, esc(w.blurb), (w.track === 'contest' ? back('nav', 'Contest Hall', 'hall') : back('nav', 'Map', 'atlas')), w.intro ? `<button class="btn small" data-act="worldIntro" data-arg="${w.id}">${esc(w.intro.title)}</button>` : '')}
    <div class="board-scroll" data-autoscroll="${xs[nodes.indexOf(selNode)]}">
      <div class="board w-${w.id}">
        <img src="art/w-${w.id}.webp" alt="" width="1920" height="815">
        <div class="amb amb-${w.id}" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="octo-gate${walked ? '' : ' first'}" style="top:${Math.min(78, roadY(wid, 2) + 4)}%">${octo(walked === nodes.length ? 'cheer' : 'wave', 64, '', '')}${walked ? '' : `<p class="og-say">Welcome to ${esc(w.name)}! Tap the first pin.</p>`}</div>
        <svg class="road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="${path}" class="rd-edge"/><path d="${path}" class="rd"/>${wpath ? `<path d="${wpath}" class="rd-walk"/>` : ''}
        </svg>
        ${nodes.map(({ n, i }, j) => {
          const open = isOpen(h, k, i), done = nodeDone(k, n), cur = i === f;
          const t = n.kind === 'stop' ? byId[n.id] : null;
          const st = t ? ((k.tricks[t.id] || {}).stars || 0) : 0;
          return `<button class="bpin${cls(done && ' done', cur && ' cur', !open && ' shut', n.kind === 'check' && ' chk', sel === n.id && ' sel')}" style="left:${xs[j]}%;top:${roadY(wid, xs[j])}%"
            data-act="pickStop" data-arg="${n.id}" aria-label="${t ? esc(t.title) : 'Checkpoint'}${open ? '' : ', locked'}">
            <span>${n.kind === 'check' ? icon(done ? 'medal' : 'flag', 18) : open ? j + 1 : icon('lock', 16)}</span>${t && st ? `<em>${starsInline(st)}</em>` : ''}${t ? lvBadge(k, t.id) : ''}${cur ? `<i class="me">${av(k.avatar, 34, '')}</i>` : ''}</button>`;
        }).join('')}
      </div>
    </div>
    ${pickCard(selNode, h, k, w)}
    <ol class="rail">${nodes.map(({ n, i }, j) => {
      const open = isOpen(h, k, i), done = nodeDone(k, n), cur = i === f;
      const t = n.kind === 'stop' ? byId[n.id] : null;
      return `<li class="${cls('stop', done && 'done', cur && 'cur', !open && 'shut', !t && 'check')}"><button data-act="pickStop" data-arg="${n.id}" ${open ? '' : 'aria-disabled="true"'}>
        <span class="pin">${t ? (open ? j + 1 : icon('lock', 16)) : icon(done ? 'medal' : 'flag', 18)}</span><span class="st">${t ? esc(t.title) : 'Checkpoint'} ${t ? lvBadge(k, t.id) : ''}</span>
        <span class="ss">${t ? starRow((k.tricks[t.id] || {}).stars || 0) : done ? 'Passed' : 'Mixed round'}</span></button></li>`;
    }).join('')}</ol>
  </section>`;
}

function pickCard(x, h, k, w) {
  if (!x) return '';
  const open = isOpen(h, k, x.i);
  if (x.n.kind === 'check') {
    return `<div class="card pick"><div><p class="kicker">Checkpoint</p><h2>Prove the ${esc(w.short)}</h2><p>Twelve questions from every stop in this place. Pass it to open the next part of the map.</p></div>
      ${open ? `<button class="btn primary big" data-act="openCheck" data-arg="${w.id}">Take the checkpoint</button>` : '<p class="muted">Pass the stops before it first.</p>'}</div>`;
  }
  const t = byId[x.n.id], s = STORIES[t.id], r = k.tricks[t.id] || {};
  return `<div class="card pick">
    ${s ? `<div class="pick-cast">${s.cast.map((c) => av(c, 64, bot(c).name)).join('')}</div>` : ''}
    <div class="pick-t"><p class="kicker">Stop ${ROUTE.filter((n) => n.world === w.id).findIndex((n) => n.id === t.id) + 1}${t.sutra ? ` · ${esc(t.sutra.sa)}` : ''}</p>
      <h2>${esc(t.title)}</h2><p class="pick-hook">${esc(t.hook)}</p>${starRow(r.stars || 0)}</div>
    ${open ? `<button class="btn primary big" data-act="openStop" data-arg="${t.id}">${r.stars ? 'Go back in' : 'Start here'}</button>` : '<p class="muted">Pass the stop before this one to open it.</p>'}
  </div>`;
}

/* ------------------------------------------------------------- the story */

export function storyTab(t) {
  const s = STORIES[t.id]; if (!s) return '';
  const i = Math.min(R.ui.beat || 0, s.beats.length - 1), b = s.beats[i];
  const lines = s.beats.slice(0, i + 1).filter((x) => x.add).map((x) => x.add);
  const last = i === s.beats.length - 1;
  const side = b.who ? (s.cast.indexOf(b.who) === 0 ? 'l' : 'r') : 'n';
  return `<div class="story" data-act="beatNext" role="group" aria-label="A story: ${esc(s.title)}">
    <img class="st-bg" src="art/s-${s.scene}.webp" alt="" width="1280" height="720">
    <div class="st-top"><span class="badge-story">${icon('book', 16)} A story</span><b>${esc(s.title)}</b></div>
    <div class="st-cast">${s.cast.map((c, ci) => `<figure class="${cls('actor', ci ? 'r' : 'l', b.who === c && 'talk', b.who && b.who !== c && 'quiet')}">${av(c, 150, bot(c).name)}<figcaption>${esc(bot(c).name)}</figcaption></figure>`).join('')}</div>
    <div class="bubble ${side}" aria-live="polite">${b.who ? `<b>${esc(bot(b.who).name)}</b>` : ''}${esc(b.say)}</div>
    ${lines.length ? `<div class="notepad" aria-label="Notepad">${lines.map((l, li) => `<p class="${li === lines.length - 1 && b.add ? 'new' : ''}"><span class="mono">${esc(l.t)}</span><b class="mono">= ${l.v !== undefined ? esc(l.v) : '?'}</b></p>`).join('')}</div>` : ''}
  </div>
  <div class="st-ctl">
    <button class="btn" data-act="beatBack" ${i ? '' : 'disabled'} aria-label="Back a line" aria-keyshortcuts="ArrowLeft">${icon('back', 18)} Back</button>
    <span class="st-dots">${s.beats.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
    ${last ? `<button class="btn primary" data-act="stopTab" data-arg="learn">Now learn the trick →</button>` : `<button class="btn primary" data-act="beatNext" aria-keyshortcuts="ArrowRight">Next ${icon('next', 18)}</button>`}
    <button class="tog-read${R.ui.storyRead ? ' on' : ''}" data-act="storyRead" aria-pressed="${!!R.ui.storyRead}">${icon('speaker', 18)} Read it to me</button>
  </div>`;
}

export function viewStories() {
  const k = kid(R.h);
  return `<section>
    ${pageHead('The Story Shelf', 'A story for every trick.', back('nav', 'Map', 'atlas'))}
    ${WORLDS.map((w) => `<h2 class="sec-h">${glyph(w.glyph, 22)} ${esc(w.name)}</h2><div class="shelf">${tricksIn(w.id).map((t) => {
      const s = STORIES[t.id]; const read = k.stories && k.stories[t.id];
      return `<button class="book" data-act="openStory" data-arg="${t.id}">
        <span class="bk-art" style="background-image:url(art/s-${s.scene}.webp)">${s.cast.map((c) => av(c, 56, '')).join('')}</span>
        <span class="bk-t"><b>${esc(s.title)}</b><span>${esc(t.title)}</span>${read ? `<i>${icon('check', 14)} Read</i>` : ''}</span></button>`;
    }).join('')}</div>`).join('')}
  </section>`;
}

/* ------------------------------------------------------------- the puzzle tower */

/* One game, twelve floors. Every floor mixes the five families — a contest
   paper does not hand you six cube nets in a row — and every fourth floor is
   guarded by a sudoku. Floor pins sit on the painted tower, MEASURED against
   q-tower.webp in its own 0–100 space. */
export const TOWER_Y = [84, 79, 74, 69, 64, 59, 54, 49, 44, 39, 34, 27];
export const towerOpen = (k, f, tester) => tester || f === 1 || !!((k.quest || {})[f - 1] || {}).passed;

export function viewTower() {
  const k = kid(R.h), q = k.quest || {}, tester = R.h.parent.tester;
  const top = Array.from({ length: FLOORS }, (_, i) => i + 1).filter((f) => towerOpen(k, f, tester)).pop();
  const sel = R.ui.floor && towerOpen(k, R.ui.floor, tester) ? R.ui.floor : top;
  const fam = (id) => FAMILIES.find((f) => f.id === id);
  const passed = Object.values(q).filter((x) => x.passed).length;
  return `<section>
    ${pageHead('The Puzzle Tower', 'Twelve floors of thinking puzzles — the kind contests are made of. Clear a floor to open the stairs to the next.', '', `<span class="chip gold">${icon('flag', 16)} ${passed} floor${passed === 1 ? '' : 's'} cleared</span>`)}
    <div class="tower-wrap">
      <div class="tower-board">
        <img src="art/q-tower.webp" alt="A tall storybook tower of twelve floors on a green hill." width="1920" height="1072">
        ${Array.from({ length: FLOORS }, (_, i) => {
          const f = i + 1, open = towerOpen(k, f, tester), r = q[f] || {};
          return `<button class="fpin${open ? '' : ' shut'}${r.passed ? ' done' : ''}${f === sel ? ' sel' : ''}${isBoss(f) ? ' boss' : ''}" style="--y:${TOWER_Y[i]};--x:${i % 2 ? 57.5 : 42.5}" data-act="${open ? 'pickFloor' : 'shutFloor'}" data-arg="${f}" aria-label="Floor ${f}${isBoss(f) ? ', sudoku' : ''}${open ? '' : ', locked'}">
            ${isBoss(f) ? icon('hash', 18) : open ? f : icon('lock', 16)}${r.stars ? `<em>${starsInline(r.stars)}</em>` : ''}</button>`;
        }).join('')}
      </div>
      <div class="card floor-card">
        <p class="kicker">Floor ${sel} of ${FLOORS} · ${['', 'Easy', 'Medium', 'Hard'][floorLevel(sel, k.band)]}</p>
        ${isBoss(sel)
          ? `<h2>The sudoku door</h2><p>Every fourth floor is guarded by a sudoku — ${sudokuSize(k.band, floorLevel(sel, k.band))} × ${sudokuSize(k.band, floorLevel(sel, k.band))}. Solve it with two hints or fewer to open the stairs.</p>`
          : `<h2>Six puzzles, all kinds</h2><p>One from each family and one more. Get ${FLOOR_PASS} of 6 right to open the stairs; all 6 for three stars.</p>
             <div class="fam-row">${FAMILIES.map((f) => `<span class="fam-chip" title="${esc(f.blurb)}">${glyph(f.glyph, 16)} ${esc(f.name)}</span>`).join('')}</div>`}
        ${(q[sel] || {}).stars ? `<p>${starRow(q[sel].stars)} ${q[sel].passed ? 'Cleared' : ''}</p>` : ''}
        <button class="btn primary big" data-act="climb" data-arg="${sel}">${(q[sel] || {}).passed ? 'Play this floor again' : `Climb to floor ${sel}`}</button>
      </div>
    </div>
    <h2 class="sec-h">Practise one family</h2>
    <p class="muted">Warm up on one kind before the tower mixes them.</p>
    <div class="families">${FAMILIES.map((f) => {
      const rec = (k.puzzles && k.puzzles[f.id]) || { right: 0 };
      return `<div class="pz-card pz-${f.id}"><span class="pz-g" aria-hidden="true">${glyph(f.glyph, 30)}</span>
        <div><h3>${esc(f.name)}</h3><p>${esc(f.blurb)}</p><p class="muted small">${rec.right ? `${rec.right} right so far` : 'Not tried yet'}</p></div>
        <div class="seg small">${[1, 2, 3].map((l) => `<button class="${l === bandLevel(k.band) ? 'on' : ''}" data-act="practise" data-arg="${f.id}:${l}">${['', 'Easy', 'Medium', 'Hard'][l]}</button>`).join('')}</div></div>`;
    }).join('')}
      <div class="pz-card pz-logic"><span class="pz-g" aria-hidden="true">${icon('puzzle', 30)}</span><div><h3>Sudoku on its own</h3><p>Every row, column and box holds each number once. Pure logic, no guessing.</p></div>
        <div class="seg small">${[1, 2, 3].map((l) => `<button class="${l === bandLevel(k.band) ? 'on' : ''}" data-act="sudokuPlay" data-arg="${l}">${['', 'Easy', 'Medium', 'Hard'][l]} <span class="mono">${sudokuSize(k.band, l)}×${sudokuSize(k.band, l)}</span></button>`).join('')}</div></div>
    </div>
    <p class="muted small center-t">Keys: <kbd>1</kbd>–<kbd>4</kbd> to choose · digits and <kbd>Enter</kbd> to answer · in sudoku, arrows to move and digits to fill.</p>
  </section>`;
}

/* ------------------------------------------------------------- goals */

export function viewGoals() {
  const k = kid(R.h), gs = goalsFor(k), sm = summary(k);
  return `<section>
    ${pageHead('What you’re learning', esc(MISSION.line), '', `<span class="chip gold">${sm.met} of ${sm.total} goals</span>`)}
    <div class="strands">${gs.map((s) => `<div class="card strand">
      <h2>${glyph(s.glyph, 24)} ${esc(s.name)}</h2><p class="muted">${esc(s.why)}</p>
      <ul class="goals">${s.goals.map((g) => `<li class="g-${g.status}">
        <span class="g-st">${g.status === 'met' ? icon('check', 16) : g.status === 'later' ? '·' : ''}</span>
        <div><b>${esc(g.can)}</b><span class="muted small">${g.later ? 'For older children — it will open as you grow.' : `Goal: ${esc(g.bar)}`}</span>
          ${g.later ? '' : `<span class="bar"><i style="width:${Math.round(g.pct * 100)}%"></i></span>`}</div>
        <span class="g-lab">${STATUS[g.status]}</span>
        ${!g.later && !g.met ? `<button class="btn small" data-act="goalGo" data-arg="${g.how}">Work on it</button>` : ''}
      </li>`).join('')}</ul></div>`).join('')}</div>
      <div class="card mission">${MISSION.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="mission-n"><b>${sm.met}</b> of <b>${sm.total}</b> goals reached${sm.going ? ` · ${sm.going} on the way` : ''}</p></div>
  </section>`;
}

export function goalsReport(c) {
  const gs = goalsFor(c), sm = summary(c);
  return `<div class="rep-goals"><p class="kicker">Goals — ${sm.met} of ${sm.total} reached</p>
    ${gs.map((s) => `<p class="rg"><b>${glyph(s.glyph, 16)} ${esc(s.name)}</b> ${s.goals.filter((g) => !g.later).map((g) => `<span class="rg-${g.status}" title="${esc(g.can)}">${g.status === 'met' ? icon('check', 14) : Math.round(g.pct * 100) + '%'} ${esc(g.can.replace(/^I can |^I know |^I have /, '').replace(/\.$/, ''))}</span>`).join('')}</p>`).join('')}</div>`;
}

/* ------------------------------------------------------------- the library */

/* The Bee's Library, for maths: painted tiles, four across, each a tool. */
export function viewLibrary(shelf) {
  return `<section>
    ${pageHead('The Maths Library', 'Tools to explore numbers, see the working, draw shapes and graphs, and look anything up.')}
    <div class="lib-grid">${shelf.map((t) => `<button class="lib-tile" data-act="openTool" data-arg="${t.id}">
      <span class="lib-art" style="background-image:url(art/${t.art}.webp)"></span>
      <span class="lib-t"><b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></span></button>`).join('')}</div>
    <div class="lib-today">
      <div class="card trick-day"><span class="kick gold">Trick of the day</span>${av('aryabhatta', 56, 'Aryabhata')}<div>${trickOfDay(kid(R.h))}</div></div>
      <div class="card nod-day"><span class="kick gold">Number of the day</span>${(() => { const n = numberOfDay(); return `<b class="nod-n mono">${n.n}</b><ul>${n.facts.map((f) => `<li>${f}</li>`).join('')}</ul>`; })()}</div>
    </div>
  </section>`;
}

export function viewTool(tool, ctx) {
  const T = tool.TOOL;
  let body;
  try { body = tool.view(ctx); } catch (e) { console.error(e); body = octoState('oops', 'Oops — this tool tripped over itself. Going back and opening it again usually fixes it.', '<button class="btn" data-act="nav" data-arg="library">Back to the Library</button>'); }
  return `<section class="tool-page tool-${T.id}">
    ${tool.CSS ? `<style>${tool.CSS}</style>` : ''}
    ${pageHead(esc(T.name), '', back('nav', 'Library', 'library'))}
    ${body}
  </section>`;
}

/* ------------------------------------------------------------- the journey */

/* Ten levels, maths age 6 to 15+. The child's own level is a path of steps;
   any other level can be looked at (and any step opened), but only the child's
   own level moves them on. */
const LVNAME = ['', 'Warm-up', 'Stretch', 'Champion'];
const conceptOf = (id) => CONCEPTS.find((c) => c.id === CONCEPT_OF[id]) || { name: '', glyph: '' };

/* The Atlas for a child on a journey: ONE ROAD PER LEVEL, painted like the
   rest of the Atlas. A level is a panorama of its lands — each land is its
   world's own painting — with one road winding across all of them: stations,
   a gate (the land test) at the end of every land, and the summit (the level
   test) at the end of the road. Each land hides three secrets to stumble on.
   The ladder switches between the ten roads: earlier ones stay open to walk
   again, later ones are shown shut. */
const PANEL = 100;                                  // each land is 100 units wide in the board's own space
const bandY = (x) => 78 + 6 * Math.sin((x / PANEL) * Math.PI * 2 * 0.9 + 0.6);

function levelBoard(k, show, mine, nodes) {
  const tester = R.h.parent.tester;
  // lands (with their nodes); the summit rides at the end of the last land
  const lands = []; let summit = null;
  for (const x of nodes) { if (x.kind === 'land') lands.push({ land: x.land, recap: x.recap, open: x.open, nodes: [] }); else if (x.kind === 'leveltest') summit = x; else lands.at(-1).nodes.push(x); }
  const W = lands.length * PANEL, placed = [];
  lands.forEach((L, li) => {
    const n = L.nodes.length + (li === lands.length - 1 ? 1 : 0), x0 = li * PANEL + 9, x1 = li * PANEL + 93;
    L.nodes.forEach((x, j) => placed.push({ x, li, px: x0 + ((x1 - x0) * j) / Math.max(1, n - 1) }));
    if (li === lands.length - 1 && summit) placed.push({ x: summit, li, px: x1 });
  });
  let path = ''; for (let x = 0; x <= W; x += 2) path += `${x ? 'L' : 'M'}${x},${bandY(x).toFixed(2)} `;
  const firstOpen = placed.findIndex((p) => !p.x.done);
  const walkTo = firstOpen < 0 ? W : placed[firstOpen].px;
  let wpath = ''; for (let x = 0; x <= walkTo; x += 2) wpath += `${x ? 'L' : 'M'}${x},${bandY(x).toFixed(2)} `;
  const sel = R.ui.rpick != null && placed[R.ui.rpick] ? R.ui.rpick : Math.max(0, firstOpen);
  const pct = (px) => (100 * px) / W;
  let sn = 0;
  const pins = placed.map((p, i) => {
    const x = p.x, open = x.open || tester, cur = mine && i === firstOpen, left = pct(p.px), top = bandY(p.px);
    if (x.kind === 'stop') {
      sn++;
      const t = byId[x.stop], st = (k.tricks[t.id] || {}).stars || 0;
      return `<button class="bpin${cls(x.done && ' done', cur && ' cur', !open && ' shut', sel === i && ' sel', x.recap && ' recap')}" style="left:${left}%;top:${top}%" data-act="roadPick" data-arg="${i}" aria-label="${esc(t.title)}${open ? '' : ', not reached yet'}">
        <span>${x.done ? icon('check', 16) : open ? `<b class="sn">${sn}</b>` : icon('lock', 16)}</span><i class="rn-lv lv${x.lv}"></i>${st ? `<em>${starsInline(st)}</em>` : ''}${cur ? `<i class="me">${av(k.avatar, 34, '')}</i>` : ''}</button>`;
    }
    const lvl = x.kind === 'leveltest';
    return `<button class="bgate${cls(lvl && ' summit', x.done && ' done', cur && ' cur', !open && ' shut', sel === i && ' sel')}" style="left:${left}%;top:${top - 9}%" data-act="roadPick" data-arg="${i}" aria-label="${lvl ? `Level ${show} test` : `${esc(x.land.name)} test`}${open ? '' : ', not reached yet'}">
      <img src="art/${lvl ? 'summit' : 'gate'}.webp" alt="" width="96" height="96">${x.done ? `<b class="bg-ok">${icon('check', 16)}</b>` : ''}${cur ? `<i class="me">${av(k.avatar, 34, '')}</i>` : ''}</button>`;
  }).join('');
  const panels = lands.map((L, li) => {
    const done = L.nodes.filter((x) => x.kind === 'stop' && x.done).length, all = L.nodes.filter((x) => x.kind === 'stop').length;
    const em = !L.recap && J.emblem(k, show, L.land.id);
    const secrets = L.recap || !(L.open || tester) ? '' : J.secretsOf(k, L.land.id).map((s) => s.found ? '' :
      `<button class="secret" style="left:${pct(li * PANEL + s.x)}%;top:${s.y}%" data-act="secret" data-arg="${s.k}|${L.land.id}" aria-label="${esc(s.name)}" title="${esc(s.name)}">${glyph(s.glyph, 24)}</button>`).join('');
    return `<img class="panel" src="art/w-${L.land.world}.webp" alt="" style="left:${pct(li * PANEL)}%;width:${100 / lands.length}%">
      <div class="land-tag${L.open || tester ? '' : ' shut'}" style="left:calc(${pct(li * PANEL)}% + 12px)"><b>${L.recap ? icon('retry', 14) : li + 1 - (lands[0].recap ? 1 : 0)}</b><span>${esc(L.land.name)}<small>${done}/${all} stops${em ? ' · fully explored' : ''}</small></span></div>${secrets}`;
  }).join('');
  return { html: `<div class="board-scroll" data-autoscroll="${pct(placed[sel] ? placed[sel].px : 0)}">
      <div class="board lboard" style="min-width:calc(${lands.length} * var(--land-w, 980px));aspect-ratio:${lands.length * 1920}/815">
        ${panels}
        <svg class="road" viewBox="0 0 ${W} 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="${path}" class="rd-edge"/><path d="${path}" class="rd"/>${wpath ? `<path d="${wpath}" class="rd-walk"/>` : ''}
        </svg>
        ${pins}
      </div></div>`, placed, sel };
}

function roadCard(p, k, show, mine) {
  if (!p) return '';
  const x = p.x, open = x.open || R.h.parent.tester;
  if (x.kind === 'stop') {
    const t = byId[x.stop], s = STORIES[t.id], w = worldOf(t.world), r = k.tricks[t.id] || {};
    return `<div class="card pick">
      ${s ? `<div class="pick-cast">${s.cast.map((c) => av(c, 64, bot(c).name)).join('')}</div>` : ''}
      <div class="pick-t"><p class="kicker">${x.recap ? 'Recap · ' : ''}${glyph(w.glyph, 16)} ${esc(w.short)} · ${LVNAME[x.lv]}</p>
        <h2>${esc(t.title)}</h2><p class="pick-hook">${esc(t.hook)}${sayBtn(t.hook)}</p>${starRow(r.stars || 0)}</div>
      ${open ? `<button class="btn primary big" data-act="openStep" data-arg="${x.stop}|${x.lv}">${x.done ? 'Go back in' : 'Start here'}</button>` : '<p class="muted">Pass everything before it on the road to open it.</p>'}
    </div>`;
  }
  const lvl = x.kind === 'leveltest', rec = lvl ? J.testRec(J.rec(k), show) : J.testRec(J.rec(k), show, x.land.id);
  return `<div class="card pick">
    <img class="pick-art" src="art/${lvl ? 'summit' : 'gate'}.webp" alt="" width="88" height="88">
    <div class="pick-t"><p class="kicker">${lvl ? 'The summit' : 'The gate'}</p>
      <h2>${lvl ? `Level ${show} test` : `${esc(x.land.name)} test`}</h2>
      <p class="pick-hook">${esc(J.testBlurb(lvl, show))}${sayBtn(J.testBlurb(lvl, show))}</p>
      ${rec && rec.passed ? `<p class="gold-line">Passed ${starsInline(rec.stars || 1)} · best ${rec.best} points</p>` : ''}</div>
    ${open ? `<button class="btn primary big" data-act="${lvl ? 'startLevelExam' : 'startLandTest'}" data-arg="${lvl ? '' : x.land.id}">${rec && rec.passed ? 'Take it again' : 'Take the test'}</button>` : '<p class="muted">Pass every stop before it first.</p>'}
  </div>`;
}

export function viewJourney() {
  const k = kid(R.h), j = J.rec(k), p = J.progress(k);
  if (!p) return `<section class="narrow">${pageHead('The Atlas', 'Ten levels, from maths age 6 to 15+')}
    <div class="card center-card"><p class="kicker">Not placed yet</p><h2>Find your level first</h2>
      <p>A few questions move up when you get them and down when you don't, until they find your maths age. Then your road starts there.</p>
      <div class="row gap center"><button class="btn primary big" data-act="startLevelTest">Find my level</button><button class="btn" data-act="startLevel1">Start at Level 1</button></div></div></section>`;
  const show = R.ui.jlv && R.ui.jlv !== p.level ? R.ui.jlv : p.level, mine = show === p.level, L = J.levelOf(show);
  const nodes = mine ? p.nodes : J.roadOf(k, show);
  const stops = nodes.filter((x) => x.kind === 'stop'), done = stops.filter((x) => x.done).length;
  const ladder = J.LEVELS.map((x) => {
    const st = j.finished.includes(x.n) ? 'fin' : x.n === p.level ? 'now' : x.n < p.level ? 'past' : 'ahead';
    return `<button class="jl ${st}${x.n === show ? ' sel' : ''}" data-act="jlv" data-arg="${x.n}" aria-label="Level ${x.n}, ${esc(J.ageOf(x.n))}" title="Level ${x.n} · ${esc(J.ageOf(x.n))}"><b>${x.n}</b>${st === 'fin' ? `<i>${icon('check', 12)}</i>` : st === 'ahead' ? `<i>${icon('lock', 12)}</i>` : ''}</button>`;
  }).join('');
  const b = levelBoard(k, show, mine, nodes);
  return `<section class="journey-page">
    <div class="road-bar">
      <div class="jladder" role="tablist" aria-label="The ten levels">${ladder}</div>
      <p class="rb-t"><b>Level ${show} · ${esc(L.name)}</b> <span class="muted">${esc(J.ageOf(show))}${mine ? '' : show < p.level ? ' · walked, open to revisit' : ' · ahead of you'}</span></p>
      <span class="rb-p"><b class="mono">${done}/${stops.length}</b><span class="meter"><i style="width:${Math.round(100 * done / Math.max(1, stops.length))}%"></i></span></span>
      <button class="btn small" data-act="atlasView" data-arg="islands" title="All 18 places on the islands" aria-label="All 18 places on the islands">${icon('map', 20)}</button>
    </div>
    ${b.html}
    ${roadCard(b.placed[b.sel], k, show, mine)}
    ${!mine ? `<p class="muted center">${show < p.level ? `The whole Level ${show} road is open — walk any stop again.` : `This road opens when you pass the Level ${show - 1} test.`} <button class="btn small" data-act="jlv" data-arg="${p.level}">Back to my Level ${p.level} road</button></p>` : ''}
    <p class="muted small center">${esc(L.blurb)} Tap a stop to see it, tap again to go in. Every land hides three secrets.</p>
  </section>`;
}
