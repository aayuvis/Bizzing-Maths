/* coach-view.js — "Coach speaks": Bizzing Bee's coach desk (app3.js viewCoachDesk) for Maths.

   Bee's shape, in Bee's order: a coloured band with the mascot's read on the child in ONE line and
   today's three rings beside it; then the notes, the numbers, what keeps catching you, and how ready
   you are. Octo is the face (rule 25). One filled button: the next thing to do, a link to the exact
   thing (coach.js action). Every line is drawn with the evidence it stands on (data-ev), which is how
   the browser check holds the screen to the record. Loaded with #/coach only, with its own CSS. */
import '../styles/coach.css';
import { esc, on, say } from './ui.js';
import { icon } from './icons.js';
import { octo } from './views3.js';
import { ringSVG, ringParts } from './views.js';
import * as C from './coach.js';
export { C };
import { STATE_LABEL } from './facts.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* the words Octo reads aloud: the headline, then the next step */
export function spokenRead(r) { return [...r.lines.map((l) => l.text), `Next: ${r.action.label}.`].join(' '); }

export function view(k, { canSay = false, now = Date.now() } = {}) {
  const r = C.read(k, now), g = r.g, rd = r.readiness, { m, parts } = ringParts(k);
  const head = r.lines[0], rest = r.lines.slice(1);
  const pose = !g.answersEver ? 'wave' : g.traps || g.mistakes.due ? 'think' : m.all ? 'cheer' : 'point';
  const evAttr = (ev) => `data-ev='${esc(JSON.stringify(ev))}'`;

  const ringPanel = `<div class="co-rings" aria-label="Today">
      ${ringSVG(parts)}
      <span class="co-rl"><span class="co-k">Today${m.all ? ' ✓' : ''}</span>
        ${parts.map((x) => `<span class="co-r" data-ring="${x.id}"><i style="background:${x.col}"></i><span>${esc(x.n)}</span><b>${esc(x.show)}</b></span>`).join('')}
      </span></div>`;

  const hero = `<div class="co-hero">
      <div class="co-read">
        ${octo(pose, 92, 'co-octo', '')}
        <div class="co-say">
          <p class="co-k">Octo’s read on ${esc(k.name)}</p>
          <p class="co-line" data-line="${head.id}" ${evAttr(head.ev)}>${esc(head.text)}</p>
          <div class="co-go">
            <a class="btn primary big" href="${esc(r.action.href)}" data-coach-action="${r.action.id}" ${evAttr(r.action.ev)}>${esc(r.action.label)} →</a>
            ${canSay ? `<button class="btn co-hear" data-act="coachSay" aria-label="Read it to me">${icon('speaker', 18)} Read it to me</button>` : ''}
          </div>
          <p class="co-why" ${evAttr(r.action.ev)}>${esc(r.action.why)}</p>
        </div>
      </div>
      ${ringPanel}
    </div>`;

  const notes = `<section class="card co-card"><h2>Octo’s notes</h2>
      ${rest.length ? `<ol class="co-notes">${rest.map((l) => `<li data-line="${l.id}" ${evAttr(l.ev)}>${esc(l.text)}</li>`).join('')}</ol>` : '<p class="muted">That is everything for now. Every note here comes from what you did, worked out on this device.</p>'}
    </section>`;

  const tile = (v, l, col) => `<div class="co-tile" style="--c:${col}"><b>${v}</b><span>${l}</span></div>`;
  const numbers = `<section class="card co-card"><h2>Your numbers</h2>
      <div class="co-tiles">
        ${tile(g.fluent, 'facts fluent', 'var(--mastered)')}
        ${tile(rd.stopsMastered, 'stops mastered', 'var(--action)')}
        ${tile(g.mistakes.total, 'mistakes in the deck', 'var(--fix)')}
        ${tile(g.acc7 == null ? '—' : g.acc7 + '%', 'right, last 7 days', 'var(--quick)')}
        ${tile(`${g.days14}<small>/14</small>`, 'days with maths, last two weeks', 'var(--medium)')}
      </div>
      <p class="muted small">Days with maths is a count, not a chain: a day off costs nothing, and the order of the days does not matter.</p>
    </section>`;

  const pr = r.problems;
  const catching = `<section class="card co-card"><h2>What keeps catching you</h2>
      ${pr.facts.length ? `<div class="co-chips">${pr.facts.map((f) => `<a class="co-chip" href="#/facts/${encodeURIComponent(f.op + '|' + f.key)}" title="${esc(f.why)}"><span class="mono">${esc(f.text)}</span><b>×${f.misses}</b></a>`).join('')}</div>` : ''}
      ${pr.deck.length ? `<p class="kicker co-sub">From your mistakes deck</p><div class="co-chips">${pr.deck.map((d) => `<a class="co-chip" href="#/mistakes"><span>${esc(d.text.length > 34 ? d.text.slice(0, 33) + '…' : d.text)}</span><b>×${d.misses}</b></a>`).join('')}</div>` : ''}
      ${!pr.facts.length && !pr.deck.length ? '<p class="muted">Nothing is catching you yet. When something does, it shows here — a miss teaches me where to look.</p>' : ''}
    </section>`;

  const segs = ['fluent', 'quick', 'learning', 'trap', 'new'], segCol = { fluent: '#178A4C', quick: '#3D7DF0', learning: '#F0B429', trap: '#E8458C', new: 'var(--line)' };
  const ready = `<section class="card co-card"><h2>How ready you are · ${esc(rd.opName)}</h2>
      <div class="co-bar" role="img" aria-label="${segs.map((x) => `${rd[x]} ${STATE_LABEL[x].toLowerCase()}`).join(', ')}">${segs.map((x) => (rd[x] ? `<i style="flex:${rd[x]};background:${segCol[x]}"></i>` : '')).join('')}</div>
      <ul class="co-key">${segs.map((x) => `<li><i style="background:${segCol[x]}"></i>${esc(STATE_LABEL[x])} <b>${rd[x]}</b></li>`).join('')}</ul>
      <p class="muted small">${rd.ready}% fluent, ${rd.coverage}% met, of ${plural(rd.total, 'fact', 'facts')}. Fluent means right and fast after a gap of days — five fast answers in one sitting are repetition, not memory.</p>
      ${g.phase.key !== 'none' ? `<p class="co-phase" data-line="phase-card" ${evAttr({ phase: g.phase.key, days: g.phase.d })}>${icon('flag', 16)} ${g.phase.key === 'past' ? 'The contest day has passed.' : `${plural(g.phase.d, 'day', 'days')} to the contest day · ${{ breadth: 'meet new things', depth: 'fix what trips you', sim: 'sit it like the day' }[g.phase.key]}`}</p>` : ''}
    </section>`;

  return `<section class="coach">
    <header class="phead"><a class="back" href="#/home" aria-label="Home"><span aria-hidden="true">←</span> Home</a><div class="phead-t"><h1>Coach</h1><p>${esc(k.name)}</p></div><div class="phead-r"></div></header>
    ${hero}
    <div class="co-grid">${notes}${numbers}${catching}${ready}</div>
    <p class="muted small co-foot">Everything here is worked out on this device from what you did, and nothing leaves it. Time is shown as time: it never moves your rank, your medals, your goals or your coins.</p>
  </section>`;
}

/* "Read it to me": the device's own voice (ui.js say), which is silent when Sound is off */
let readNow = null;
export const setReader = (fn) => { readNow = fn; };
on('coachSay', () => { if (readNow) say(readNow()); });
