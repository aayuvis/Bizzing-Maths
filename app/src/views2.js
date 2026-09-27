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
import { kid, ROUTE, isOpen, frontier, nodeDone, worldOpen } from './model.js';
import { STORIES } from './stories.js';
import { FAMILIES, FLOORS, isBoss, FLOOR_PASS, floorLevel, bandLevel, sudokuSize } from './puzzles.js';
import { MISSION, goalsFor, summary, STATUS } from './objectives.js';
import { av, starRow, pageHead } from './views.js';
import { bot } from './contest.js';
import * as J from './journey.js';
import { CONCEPTS, CONCEPT_OF } from './levels.js';

const back = (act, label = 'Back', arg = '') =>
  `<button class="back" data-act="${act}"${arg ? ` data-arg="${esc(arg)}"` : ''}><span aria-hidden="true">←</span> ${esc(label)}</button>`;

/* ------------------------------------------------------------- the map */

/* Where each world sits on the painted island, MEASURED against atlas.webp in
   its own 0–100 space (x and y). Regenerating the map means re-measuring. */
export const MAP_PINS = {
  gardens: { x: 20, y: 66 }, market: { x: 31, y: 42 }, workshop: { x: 51, y: 50 },
  observatory: { x: 63, y: 25 }, harbour: { x: 83, y: 34 },
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

export function viewAtlasMap() {
  const h = R.h, k = kid(h), f = frontier(k, h);
  const here = ROUTE[f] ? ROUTE[f].world : WORLDS.at(-1).id;
  const stars = TRICKS.reduce((s, t) => s + ((k.tricks[t.id] || {}).stars || 0), 0);
  const isle = R.ui.isle || (WORLDS.find((w) => w.id === here) || {}).island || 1;
  const I = ISLANDS[isle - 1];
  const worlds = WORLDS.filter((w) => w.island === isle);
  return `<section>
    ${pageHead('The Number Atlas', 'Eighteen places on three islands, each with its own tricks. Tap a place to travel there.', '', `<button class="btn small" data-act="nav" data-arg="stories">📖 Story shelf</button><span class="chip gold">★ ${stars}</span>`)}
    <div class="seg isle-seg" role="tablist" aria-label="Island">${ISLANDS.map((x) => `<button role="tab" aria-selected="${x.n === isle}" class="${x.n === isle ? 'on' : ''}" data-act="isle" data-arg="${x.n}">${esc(x.name)}</button>`).join('')}</div>
    <p class="muted center-t">${esc(I.blurb)}</p>
    <div class="map-board">
      <img src="art/${I.img}.webp" alt="A painted map of ${esc(I.name)}." width="${I.w}" height="${I.h}">
      <div class="map-amb" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i style="--i:${i}"></i>`).join('')}</div>
      ${worlds.map((w) => {
        const open = worldOpen(h, k, w.id);
        const done = ROUTE.filter((n) => n.world === w.id).every((n) => nodeDone(k, n));
        const p = I.pins[w.id];
        return `<button class="map-pin${open ? '' : ' shut'}${here === w.id ? ' here' : ''}${done ? ' done' : ''}" style="left:${p.x}%;top:${p.y}%;--wi:${w.ink};--wt:${w.tint}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" aria-label="${esc(w.name)}${open ? '' : ', not reached yet'}">
          <span class="mp-g">${w.glyph}</span><span class="mp-t"><b>${esc(isle === 2 ? w.short : w.name)}</b>${here === w.id ? '<i>You are here</i>' : done ? '<i>Done ✓</i>' : open ? '' : '<i>Not reached yet</i>'}</span></button>`;
      }).join('')}
    </div>
    <div class="world-list">
      ${worlds.map((w) => {
        const ts = tricksIn(w.id); const s2 = ts.reduce((a, t) => a + ((k.tricks[t.id] || {}).stars || 0), 0);
        const open = worldOpen(h, k, w.id);
        return `<button class="wl${open ? '' : ' shut'}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" style="--wt:${w.tint};--wi:${w.ink}">
          <img src="art/w-${w.id}.webp" alt="" loading="lazy" width="1920" height="815">
          <span class="wl-t"><span class="kicker">${w.glyph} ${ts.length} stops · from age ${esc(w.band.split('-')[0])}</span><b>${esc(w.name)}</b><span>${esc(w.blurb)}</span><span class="wl-s">${starRow(Math.round(s2 / Math.max(1, ts.length)))} ${open ? '' : '· not reached yet'}</span></span></button>`;
      }).join('')}
    </div>
  </section>`;
}

/* ------------------------------------------------------------- a world */

/* The road across a board: a gentle wave, in the board's own 0–100 space. */
const ROAD = { gardens: [72, 7, 1.3], market: [78, 5, 1.1], workshop: [80, 5, 1.6], observatory: [72, 6, 1.2], harbour: [82, 4, 1.4],
  library: [80, 4, 1.2], clocktower: [80, 5, 1.4], bakery: [80, 4, 1.1], shapecity: [82, 4, 1.5], forest: [78, 5, 1.2],
  palace: [80, 5, 1.3], dock: [80, 4, 1.2], setisland: [82, 4, 1.1], carnival: [80, 5, 1.4],
  quarry: [80, 4, 1.2], mine: [80, 4, 1.3], coinstreet: [82, 4, 1.2], lighthouse: [80, 5, 1.2] };
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
    ${pageHead(`${w.glyph} ${esc(w.name)}`, esc(w.blurb), back('nav', 'Map', 'atlas'), w.intro ? `<button class="btn small" data-act="worldIntro" data-arg="${w.id}">${esc(w.intro.title)}</button>` : '')}
    <div class="board-scroll" data-autoscroll="${xs[nodes.indexOf(selNode)]}">
      <div class="board w-${w.id}">
        <img src="art/w-${w.id}.webp" alt="" width="1920" height="815">
        <div class="amb amb-${w.id}" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <svg class="road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="${path}" class="rd-edge"/><path d="${path}" class="rd"/>${wpath ? `<path d="${wpath}" class="rd-walk"/>` : ''}
        </svg>
        ${nodes.map(({ n, i }, j) => {
          const open = isOpen(h, k, i), done = nodeDone(k, n), cur = i === f;
          const t = n.kind === 'stop' ? byId[n.id] : null;
          const st = t ? ((k.tricks[t.id] || {}).stars || 0) : 0;
          return `<button class="bpin${cls(done && ' done', cur && ' cur', !open && ' shut', n.kind === 'check' && ' chk', sel === n.id && ' sel')}" style="left:${xs[j]}%;top:${roadY(wid, xs[j])}%"
            data-act="pickStop" data-arg="${n.id}" aria-label="${t ? esc(t.title) : 'Checkpoint'}${open ? '' : ', locked'}">
            <span>${n.kind === 'check' ? (done ? '🏅' : '⚑') : open ? j + 1 : '🔒'}</span>${t && st ? `<em>${'★'.repeat(st)}</em>` : ''}${cur ? `<i class="me">${av(k.avatar, 34, '')}</i>` : ''}</button>`;
        }).join('')}
      </div>
    </div>
    ${pickCard(selNode, h, k, w)}
    <ol class="rail">${nodes.map(({ n, i }, j) => {
      const open = isOpen(h, k, i), done = nodeDone(k, n), cur = i === f;
      const t = n.kind === 'stop' ? byId[n.id] : null;
      return `<li class="${cls('stop', done && 'done', cur && 'cur', !open && 'shut', !t && 'check')}"><button data-act="pickStop" data-arg="${n.id}" ${open ? '' : 'aria-disabled="true"'}>
        <span class="pin">${t ? (open ? j + 1 : '🔒') : (done ? '🏅' : '⚑')}</span><span class="st">${t ? esc(t.title) : 'Checkpoint'}</span>
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
    <div class="st-top"><span class="badge-story">📖 A story</span><b>${esc(s.title)}</b></div>
    <div class="st-cast">${s.cast.map((c, ci) => `<figure class="${cls('actor', ci ? 'r' : 'l', b.who === c && 'talk', b.who && b.who !== c && 'quiet')}">${av(c, 150, bot(c).name)}<figcaption>${esc(bot(c).name)}</figcaption></figure>`).join('')}</div>
    <div class="bubble ${side}" aria-live="polite">${b.who ? `<b>${esc(bot(b.who).name)}</b>` : ''}${esc(b.say)}</div>
    ${lines.length ? `<div class="notepad" aria-label="Notepad">${lines.map((l, li) => `<p class="${li === lines.length - 1 && b.add ? 'new' : ''}"><span class="mono">${esc(l.t)}</span><b class="mono">= ${l.v !== undefined ? esc(l.v) : '?'}</b></p>`).join('')}</div>` : ''}
  </div>
  <div class="st-ctl">
    <button class="btn" data-act="beatBack" ${i ? '' : 'disabled'} aria-label="Back a line">← <kbd>←</kbd></button>
    <span class="st-dots">${s.beats.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
    ${last ? `<button class="btn primary" data-act="stopTab" data-arg="learn">Now learn the trick →</button>` : `<button class="btn primary" data-act="beatNext">Next <kbd>→</kbd></button>`}
    <button class="tog-read${R.ui.storyRead ? ' on' : ''}" data-act="storyRead" aria-pressed="${!!R.ui.storyRead}">🔊 Read it to me</button>
  </div>`;
}

export function viewStories() {
  const k = kid(R.h);
  return `<section>
    ${pageHead('The Story Shelf', 'Every trick starts as a story. The same ten children from the Bizzing Bee, solving ordinary problems in their heads.', back('nav', 'Map', 'atlas'))}
    ${WORLDS.map((w) => `<h2 class="sec-h">${w.glyph} ${esc(w.name)}</h2><div class="shelf">${tricksIn(w.id).map((t) => {
      const s = STORIES[t.id]; const read = k.stories && k.stories[t.id];
      return `<button class="book" data-act="openStory" data-arg="${t.id}">
        <span class="bk-art" style="background-image:url(art/s-${s.scene}.webp)">${s.cast.map((c) => av(c, 56, '')).join('')}</span>
        <span class="bk-t"><b>${esc(s.title)}</b><span>${esc(t.title)}</span>${read ? '<i>Read ✓</i>' : ''}</span></button>`;
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
    ${pageHead('The Puzzle Tower', 'Twelve floors of thinking puzzles — the kind contests are made of. Clear a floor to open the stairs to the next.', '', `<span class="chip gold">🏁 ${passed} floor${passed === 1 ? '' : 's'} cleared</span>`)}
    <div class="tower-wrap">
      <div class="tower-board">
        <img src="art/q-tower.webp" alt="A tall storybook tower of twelve floors on a green hill." width="1920" height="1072">
        ${Array.from({ length: FLOORS }, (_, i) => {
          const f = i + 1, open = towerOpen(k, f, tester), r = q[f] || {};
          return `<button class="fpin${open ? '' : ' shut'}${r.passed ? ' done' : ''}${f === sel ? ' sel' : ''}${isBoss(f) ? ' boss' : ''}" style="top:${TOWER_Y[i]}%;left:${i % 2 ? 57.5 : 42.5}%" data-act="${open ? 'pickFloor' : 'shutFloor'}" data-arg="${f}" aria-label="Floor ${f}${isBoss(f) ? ', sudoku' : ''}${open ? '' : ', locked'}">
            ${isBoss(f) ? '🔢' : open ? f : '🔒'}${r.stars ? `<em>${'★'.repeat(r.stars)}</em>` : ''}</button>`;
        }).join('')}
      </div>
      <div class="card floor-card">
        <p class="kicker">Floor ${sel} of ${FLOORS} · ${['', 'Easy', 'Medium', 'Hard'][floorLevel(sel, k.band)]}</p>
        ${isBoss(sel)
          ? `<h2>The sudoku door</h2><p>Every fourth floor is guarded by a sudoku — ${sudokuSize(k.band, floorLevel(sel, k.band))} × ${sudokuSize(k.band, floorLevel(sel, k.band))}. Solve it with two hints or fewer to open the stairs.</p>`
          : `<h2>Six puzzles, all kinds</h2><p>One from each family and one more. Get ${FLOOR_PASS} of 6 right to open the stairs; all 6 for three stars.</p>
             <div class="fam-row">${FAMILIES.map((f) => `<span class="fam-chip" title="${esc(f.blurb)}">${f.glyph} ${esc(f.name)}</span>`).join('')}</div>`}
        ${(q[sel] || {}).stars ? `<p>${starRow(q[sel].stars)} ${q[sel].passed ? 'Cleared' : ''}</p>` : ''}
        <button class="btn primary big" data-act="climb" data-arg="${sel}">${(q[sel] || {}).passed ? 'Play this floor again' : `Climb to floor ${sel}`}</button>
      </div>
    </div>
    <h2 class="sec-h">Practise one family</h2>
    <p class="muted">Warm up on one kind before the tower mixes them.</p>
    <div class="families">${FAMILIES.map((f) => {
      const rec = (k.puzzles && k.puzzles[f.id]) || { right: 0 };
      return `<div class="pz-card pz-${f.id}"><span class="pz-g" aria-hidden="true">${f.glyph}</span>
        <div><h3>${esc(f.name)}</h3><p>${esc(f.blurb)}</p><p class="muted small">${rec.right ? `${rec.right} right so far` : 'Not tried yet'}</p></div>
        <div class="seg small">${[1, 2, 3].map((l) => `<button class="${l === bandLevel(k.band) ? 'on' : ''}" data-act="practise" data-arg="${f.id}:${l}">${['', 'Easy', 'Medium', 'Hard'][l]}</button>`).join('')}</div></div>`;
    }).join('')}
      <div class="pz-card pz-logic"><span class="pz-g" aria-hidden="true">🧩</span><div><h3>Sudoku on its own</h3><p>Every row, column and box holds each number once. Pure logic, no guessing.</p></div>
        <div class="seg small">${[1, 2, 3].map((l) => `<button class="${l === bandLevel(k.band) ? 'on' : ''}" data-act="sudokuPlay" data-arg="${l}">${['', 'Easy', 'Medium', 'Hard'][l]} <span class="mono">${sudokuSize(k.band, l)}×${sudokuSize(k.band, l)}</span></button>`).join('')}</div></div>
    </div>
    <p class="muted small center-t">Keys: <kbd>1</kbd>–<kbd>4</kbd> to choose · digits and <kbd>Enter</kbd> to answer · in sudoku, arrows to move and digits to fill.</p>
  </section>`;
}

/* ------------------------------------------------------------- goals */

export function viewGoals() {
  const k = kid(R.h), gs = goalsFor(k), sm = summary(k);
  return `<section>
    ${pageHead('What you’re learning', esc(MISSION.line))}
    <div class="card mission">${MISSION.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="mission-n"><b>${sm.met}</b> of <b>${sm.total}</b> goals reached${sm.going ? ` · ${sm.going} on the way` : ''}</p></div>
    <div class="strands">${gs.map((s) => `<div class="card strand">
      <h2>${s.glyph} ${esc(s.name)}</h2><p class="muted">${esc(s.why)}</p>
      <ul class="goals">${s.goals.map((g) => `<li class="g-${g.status}">
        <span class="g-st">${g.status === 'met' ? '✓' : g.status === 'later' ? '·' : ''}</span>
        <div><b>${esc(g.can)}</b><span class="muted small">${g.later ? 'For older children — it will open as you grow.' : `Goal: ${esc(g.bar)}`}</span>
          ${g.later ? '' : `<span class="bar"><i style="width:${Math.round(g.pct * 100)}%"></i></span>`}</div>
        <span class="g-lab">${STATUS[g.status]}</span>
        ${!g.later && !g.met ? `<button class="btn small" data-act="goalGo" data-arg="${g.how}">Work on it</button>` : ''}
      </li>`).join('')}</ul></div>`).join('')}</div>
  </section>`;
}

export function goalsReport(c) {
  const gs = goalsFor(c), sm = summary(c);
  return `<div class="rep-goals"><p class="kicker">Goals — ${sm.met} of ${sm.total} reached</p>
    ${gs.map((s) => `<p class="rg"><b>${s.glyph} ${esc(s.name)}</b> ${s.goals.filter((g) => !g.later).map((g) => `<span class="rg-${g.status}" title="${esc(g.can)}">${g.status === 'met' ? '✓' : Math.round(g.pct * 100) + '%'} ${esc(g.can.replace(/^I can |^I know |^I have /, '').replace(/\.$/, ''))}</span>`).join(' · ')}</p>`).join('')}</div>`;
}

/* ------------------------------------------------------------- the library */

/* The Bee's Library, for maths: painted tiles, four across, each a tool. */
export function viewLibrary(shelf) {
  return `<section>
    ${pageHead('The Maths Library', 'Tools to explore numbers, see the working, draw shapes and graphs, and look anything up.')}
    <div class="lib-grid">${shelf.map((t) => `<button class="lib-tile" data-act="openTool" data-arg="${t.id}">
      <span class="lib-art" style="background-image:url(art/${t.art}.webp)"></span>
      <span class="lib-t"><b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></span></button>`).join('')}</div>
  </section>`;
}

export function viewTool(tool, ctx) {
  const T = tool.TOOL;
  let body;
  try { body = tool.view(ctx); } catch (e) { console.error(e); body = '<div class="card center-card"><p>Something went wrong in this tool.</p></div>'; }
  return `<section class="tool-page tool-${T.id}">
    ${tool.CSS ? `<style>${tool.CSS}</style>` : ''}
    ${pageHead(esc(T.name), esc(T.blurb), back('nav', 'Library', 'library'))}
    ${body}
  </section>`;
}

/* ------------------------------------------------------------- the journey */

/* Ten levels, maths age 6 to 15+. The child's own level is a path of steps;
   any other level can be looked at (and any step opened), but only the child's
   own level moves them on. */
const LVNAME = ['', 'Warm-up', 'Stretch', 'Champion'];
const conceptOf = (id) => CONCEPTS.find((c) => c.id === CONCEPT_OF[id]) || { name: '', glyph: '' };

export function viewJourney() {
  const k = kid(R.h), j = J.rec(k), p = J.progress(k);
  if (!p) return `<section class="narrow">${pageHead('My journey', 'Ten levels, from maths age 6 to 15+')}
    <div class="card center-card"><p class="kicker">Not placed yet</p><h2>Find your level first</h2>
      <p>A few questions move up when you get them and down when you don't, until they find your maths age. Then your journey starts there.</p>
      <div class="row gap center"><button class="btn primary big" data-act="startLevelTest">Find my level</button><button class="btn" data-act="startLevel1">Start at Level 1</button></div></div></section>`;
  const show = R.ui.jlv && R.ui.jlv !== p.level ? R.ui.jlv : p.level, mine = show === p.level;
  const L = J.levelOf(show);
  const steps = J.stepsOf(j, show).map((s) => ({ ...s, done: J.stepDone(j, s), t: byId[s.stop] }));
  const next = mine ? steps.find((s) => !s.done) : null;
  const done = steps.filter((s) => s.done).length;
  const ladder = J.LEVELS.map((x) => {
    const st = j.finished.includes(x.n) ? 'fin' : x.n === p.level ? 'now' : x.n < p.level ? 'past' : 'ahead';
    return `<button class="jl ${st}${x.n === show ? ' sel' : ''}" data-act="jlv" data-arg="${x.n}" aria-label="Level ${x.n}, ${esc(J.ageOf(x.n))}"><b>${x.n}</b><span>${esc(x.age)}</span>${st === 'fin' ? '<i>✓</i>' : ''}</button>`;
  }).join('');
  return `<section class="journey-page">
    ${pageHead('My journey', 'Ten levels, from maths age 6 to 15+. Finish a journey and the next one opens.', '', `<button class="btn small" data-act="startLevelTest">Find my level again</button>`)}
    <div class="jladder" role="tablist" aria-label="The ten levels">${ladder}</div>
    <div class="card jhead">
      <div><p class="kicker">Level ${show} · ${esc(J.ageOf(show))}${mine ? ' · your journey' : show < p.level ? ' · behind you' : ' · ahead'}</p>
        <h2>${esc(L.name)}</h2><p>${esc(L.blurb)}</p></div>
      <div class="jprog"><b class="mono">${done}/${steps.length}</b><span class="meter"><i style="width:${Math.round(100 * done / steps.length)}%"></i></span><span class="muted small">steps done</span></div>
    </div>
    ${!mine ? `<p class="muted center">${show < p.level ? `Every lesson from Level ${show} is open to you — here and in the Atlas. Only your own journey moves you on.` : `You are on Level ${p.level}. You can look at any step here, but only your own journey moves you on.`} <button class="btn small" data-act="jlv" data-arg="${p.level}">Back to Level ${p.level}</button></p>` : ''}
    <ol class="jsteps">${steps.map((s, i) => {
      const c = conceptOf(s.stop), w = worldOf(s.t.world);
      const cl = (s.done ? 'done' : s === next ? 'next' : '') + (s.recap ? ' recap' : '');
      const head = s.recap && i === 0 ? `<li class="jsec"><b>Recap of Level ${show - 1}</b> <span class="muted small">You started here, so first a quick look back — one step for each idea Level ${show - 1} taught.</span></li>`
        : !s.recap && i > 0 && steps[i - 1].recap ? `<li class="jsec"><b>Level ${show}</b> <span class="muted small">Now the journey itself.</span></li>` : '';
      return `${head}<li class="${cl}"><button data-act="openStep" data-arg="${s.stop}|${s.lv}">
        <span class="jn">${s.done ? '✓' : i + 1}</span>
        <span class="jx"><b>${esc(s.t.title)}</b><span class="muted small">${w.glyph} ${esc(w.short)} · ${c.glyph} ${esc(c.name)}</span></span>
        <span class="jlvtag lv${s.lv}">${LVNAME[s.lv]}</span>${s === next ? '<span class="btn primary small">Next</span>' : ''}</button></li>`;
    }).join('')}</ol>
    <p class="muted small center">A step is done when its drill is passed at that level or a harder one — here, or anywhere in the Atlas.</p>
  </section>`;
}
