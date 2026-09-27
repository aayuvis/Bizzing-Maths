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
import { kid, ROUTE, isOpen, frontier, nodeDone } from './model.js';
import { STORIES } from './stories.js';
import { ROOM, bandLevel, sudokuSize } from './puzzles.js';
import { MISSION, goalsFor, summary, STATUS } from './objectives.js';
import { av, starRow, pageHead } from './views.js';
import { bot } from './contest.js';

const back = (act, label = 'Back', arg = '') =>
  `<button class="back" data-act="${act}"${arg ? ` data-arg="${esc(arg)}"` : ''}><span aria-hidden="true">←</span> ${esc(label)}</button>`;

/* ------------------------------------------------------------- the map */

/* Where each world sits on the painted island, MEASURED against atlas.webp in
   its own 0–100 space (x and y). Regenerating the map means re-measuring. */
export const MAP_PINS = {
  gardens: { x: 20, y: 66 }, market: { x: 31, y: 42 }, workshop: { x: 51, y: 50 },
  observatory: { x: 63, y: 25 }, harbour: { x: 83, y: 34 },
};

export function viewAtlasMap() {
  const h = R.h, k = kid(h), f = frontier(k);
  const here = ROUTE[f] ? ROUTE[f].world : WORLDS.at(-1).id;
  const stars = TRICKS.reduce((s, t) => s + ((k.tricks[t.id] || {}).stars || 0), 0);
  return `<section>
    ${pageHead('The Number Atlas', 'Five places, each with its own tricks. Tap a place to travel there.', '', `<button class="btn small" data-act="nav" data-arg="stories">📖 Story shelf</button><span class="chip gold">★ ${stars}</span>`)}
    <div class="map-board">
      <img src="art/atlas.webp" alt="A painted island with a garden, a market, a workshop village, a hilltop observatory and a harbour, joined by one road." width="1920" height="1072">
      <div class="map-amb" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i style="--i:${i}"></i>`).join('')}</div>
      ${WORLDS.map((w) => {
        const nodes = ROUTE.map((n, i) => ({ n, i })).filter((x) => x.n.world === w.id);
        const open = nodes.some((x) => isOpen(h, k, x.i));
        const done = nodes.every((x) => nodeDone(k, x.n));
        const p = MAP_PINS[w.id];
        return `<button class="map-pin${open ? '' : ' shut'}${here === w.id ? ' here' : ''}${done ? ' done' : ''}" style="left:${p.x}%;top:${p.y}%;--wi:${w.ink};--wt:${w.tint}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" aria-label="${esc(w.name)}${open ? '' : ', not reached yet'}">
          <span class="mp-g">${w.glyph}</span><span class="mp-t"><b>${esc(w.name)}</b>${here === w.id ? '<i>You are here</i>' : done ? '<i>Done ✓</i>' : open ? '' : '<i>Not reached yet</i>'}</span></button>`;
      }).join('')}
    </div>
    <div class="world-list">
      ${WORLDS.map((w) => {
        const ts = tricksIn(w.id); const s = ts.reduce((a, t) => a + ((k.tricks[t.id] || {}).stars || 0), 0);
        const open = ROUTE.some((n, i) => n.world === w.id && isOpen(h, k, i));
        return `<button class="wl${open ? '' : ' shut'}" data-act="${open ? 'openWorld' : 'shutWorld'}" data-arg="${w.id}" style="--wt:${w.tint};--wi:${w.ink}">
          <img src="art/w-${w.id}.webp" alt="" loading="lazy" width="1920" height="815">
          <span class="wl-t"><span class="kicker">Part ${w.n}</span><b>${esc(w.name)}</b><span>${esc(w.blurb)}</span><span class="wl-s">${starRow(Math.round(s / ts.length))} ${open ? '' : '· not reached yet'}</span></span></button>`;
      }).join('')}
    </div>
  </section>`;
}

/* ------------------------------------------------------------- a world */

/* The road across a board: a gentle wave, in the board's own 0–100 space. */
const ROAD = { gardens: [72, 7, 1.3], market: [78, 5, 1.1], workshop: [80, 5, 1.6], observatory: [72, 6, 1.2], harbour: [82, 4, 1.4] };
function roadY(wid, x) { const [b, a, f] = ROAD[wid]; return b + a * Math.sin((x / 100) * Math.PI * 2 * f + 0.6); }

export function viewWorld(wid) {
  const w = worldOf(wid), h = R.h, k = kid(h), f = frontier(k);
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

/* ------------------------------------------------------------- puzzles */

export function viewPuzzles() {
  const k = kid(R.h), lv = bandLevel(k.band);
  const p = (id) => (k.puzzles && k.puzzles[id]) || { right: 0, solved: {} };
  return `<section>
    ${pageHead('The Puzzle Room', 'Thinking, not just calculating — the kind of maths contests are made of. Every puzzle is checked by the app before you see it.')}
    <div class="room">${ROOM.map((r) => {
      const rec = p(r.id);
      const count = r.id === 'sudoku' ? Object.values(rec.solved || {}).reduce((a, b) => a + b, 0) : rec.right;
      return `<div class="pz-card pz-${r.id}">
        <span class="pz-g" aria-hidden="true">${r.glyph}</span>
        <div><h2>${esc(r.name)}</h2><p>${esc(r.blurb)}</p><p class="muted small">${count ? `${count} ${r.id === 'sudoku' ? 'solved' : 'right'} so far` : 'Not tried yet'}</p></div>
        <div class="seg small" role="group" aria-label="Level">${[1, 2, 3].map((l) => `<button class="${l === lv ? 'on' : ''}" data-act="startPuzzle" data-arg="${r.id}:${l}">${['', 'Easy', 'Medium', 'Hard'][l]}${r.id === 'sudoku' ? ` <span class="mono">${sudokuSize(k.band, l)}×${sudokuSize(k.band, l)}</span>` : ''}</button>`).join('')}</div>
      </div>`;
    }).join('')}</div>
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
