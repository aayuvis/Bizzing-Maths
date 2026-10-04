/* hall.js — the Contest Hall: the contest-preparation track (docs/PAPER-CONTRACT.md).

   One painted road with four places on it — the three strategy worlds (thirty
   stops, each a way into a non-routine problem) and the Paper Hall, where
   contest-style papers are sat against the clock. Views only: the papers are
   assembled and scored by papers/engine.js, and main.js owns the actions.

   Contest-STYLE, everywhere: no real competition is named, and none of its
   problems is used. */
import { R } from './runtime.js';
import { esc } from './ui.js';
import { glyph, icon } from './icons.js';
import { kid, avatarFile } from './model.js';
import { byId, worldOf, tricksIn } from './tricks.js';
import { paintedRoad } from './board.js';
import { BANDS, BAND_IDS, FIXED, LETTERS, bandFor, practiseNext } from './papers/engine.js';
import { METHOD_OF } from './papers/methods.js';

export const HALL_WORLDS = ['strategy', 'logic', 'figures'];
const stars = (k, id) => ((k.tricks[id] || {}).stars || 0);

function worldStat(k, wid) {
  const ts = tricksIn(wid), passed = ts.filter((t) => stars(k, t.id) >= 2).length;
  return { ts, passed, n: ts.length };
}

/* The road: three worlds and the Paper Hall. A world is "done" when every stop
   in it is passed; the hall is "done" once a paper has been sat. */
function hallStops(k) {
  const ws = HALL_WORLDS.filter((w) => worldOf(w)).map((w) => {
    const W = worldOf(w), s = worldStat(k, w);
    return { kind: 'world', id: w, label: W.name, glyph: W.glyph, blurb: W.blurb, s, done: s.n && s.passed === s.n };
  });
  const log = (k.papers || {}).log || [];
  return [...ws, { kind: 'papers', id: 'papers', label: 'The Paper Hall', glyph: '📝', blurb: 'Contest-style papers against the clock: three sections, worth 3, 4 and 5 points.', done: log.length > 0 }];
}

export function viewHall() {
  const k = kid(R.h), stops = hallStops(k);
  const here = stops.findIndex((x) => !x.done), sel = R.ui.hsel != null && stops[R.ui.hsel] ? R.ui.hsel : Math.max(0, here);
  const me = `<img class="av" src="avatars/${esc(avatarFile(k.avatar))}.webp" width="34" height="34" alt="">`;
  const board = paintedRoad({ img: 'j-contest', here, sel, me, minWidth: 980, aspect: '1920/640', band: [76, 6, 1.1],
    stops: stops.map((s, i) => ({ label: s.label, state: s.done ? 'done' : 'open', act: 'hallPick', arg: String(i), badge: `<em class="hall-g" aria-hidden="true">${glyph(s.glyph, 24)}</em>` })) });
  const x = stops[sel];
  const card = x.kind === 'world'
    ? `<div class="pick-t"><p class="kicker">${x.s.passed} of ${x.s.n} strategies passed</p><h2 class="hall-h">${glyph(x.glyph, 26)} ${esc(x.label)}</h2><p class="pick-hook">${esc(x.blurb || '')}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="openWorld" data-arg="${x.id}">Go in</button></div>`
    : `<div class="pick-t"><p class="kicker">${((k.papers || {}).log || []).length} papers sat</p><h2 class="hall-h">${glyph('📝', 26)} The Paper Hall</h2><p class="pick-hook">${esc(x.blurb)}</p></div>
       <div class="pick-go"><button class="btn primary big" data-act="hallPapers">Choose a paper</button></div>`;
  return `<section class="hall">
    <div class="hall-head"><h1 class="hall-t">The Contest Hall</h1><span class="muted small">Contest-style practice · every problem proved to have one answer</span></div>
    ${board}
    <div class="card pick">${card}</div>
    ${papersPanel(k)}
    ${strategyIndex(k)}
  </section>`;
}

/* The papers: a band, sixty fixed papers, and a fresh one. */
function papersPanel(k) {
  const band = R.ui.pband || bandFor(k), B = BANDS[band];
  const best = (k.papers || {}).best || {};
  const draft = k.paperDraft;
  return `<div class="card papers" id="papers">
    <div class="papers-top"><p class="kicker">Contest-style papers</p>
      <div class="seg" role="tablist" aria-label="Grade band">${BAND_IDS.map((b) => `<button role="tab" aria-selected="${b === band}" class="${b === band ? 'on' : ''}" data-act="pband" data-arg="${b}">${BANDS[b].label}</button>`).join('')}</div></div>
    ${draft ? `<div class="paper-resume"><span>You were part-way through <b>${draft.no === 'fresh' || typeof draft.no === 'string' ? 'a fresh paper' : 'Paper ' + draft.no}</b> (${esc(BANDS[draft.band].label)}).</span><button class="btn" data-act="paperResume">Carry on</button></div>` : ''}
    <p class="muted small">${B.label} · ${B.per * 3} questions · ${B.per} each worth 3, 4 and 5 points · ${B.mins} minutes. You start with ${B.per * 3} points; a wrong answer loses a quarter of its points, a blank loses nothing.</p>
    <div class="paper-grid">${Array.from({ length: FIXED }, (_, i) => i + 1).map((n) => { const b = best[`${band}:${n}`]; const max = B.per * 3 + B.per * 12; return `<button class="pg${b != null ? ' sat' : ''}" data-act="paperStart" data-arg="${band}|${n}" aria-label="Paper ${n}${b != null ? `, best ${Math.round(b)} of ${max}` : ''}"><b>${n}</b>${b != null ? `<i>${Math.round(100 * b / max)}%</i>` : ''}</button>`; }).join('')}</div>
    <div class="row gap"><button class="btn" data-act="paperStart" data-arg="${band}|fresh">A fresh paper</button><button class="btn" data-act="nav" data-arg="contest">The mock contest</button></div>
  </div>`;
}

/* Every strategy in the hall, by world, with its stars — the index a review points into. */
function strategyIndex(k) {
  return `<div class="card hall-index"><p class="kicker">The thirty ways in</p>
    ${HALL_WORLDS.filter((w) => worldOf(w)).map((w) => `<div class="hi-w"><b class="hall-h">${glyph(worldOf(w).glyph, 20)} ${esc(worldOf(w).name)}</b>
      <div class="hi-s">${tricksIn(w).map((t) => `<button class="hi-stop${stars(k, t.id) >= 2 ? ' done' : ''}" data-act="openStop" data-arg="${t.id}">${stars(k, t.id) >= 2 ? icon('check', 14) + ' ' : ''}${esc(t.title)}</button>`).join('')}</div></div>`).join('')}
  </div>`;
}

/* ---------------------------------------------------------- sitting a paper */

const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export { mmss };

export function viewPaper() {
  const P = R.paper; if (!P) return '';
  if (P.over) return viewPaperEnd(P);
  const p = P.p, i = P.i, q = p.items[i], B = BANDS[p.band];
  const done = P.answers.filter((a) => a != null).length;
  return `<section class="paper">
    <div class="paper-bar">
      <button class="play-x" data-act="paperQuit" aria-label="Leave the paper (it is kept)">✕</button>
      <span class="paper-name"><b>${typeof p.no === 'number' ? `Paper ${p.no}` : 'A fresh paper'}</b> · ${esc(B.label)}</span>
      <span class="chip">${q.pts}-point question</span>
      <span class="paper-time mono" id="ptime" aria-live="off">${mmss(P.endsAt - Date.now())}</span>
      <button class="btn small" data-act="paperFinish">Finish</button>
    </div>
    <nav class="paper-nav" aria-label="Questions">${p.items.map((x, j) => `<button class="pn${j === i ? ' on' : ''}${P.answers[j] != null ? ' ans' : ''} t${x.tier}" data-act="paperGo" data-arg="${j}" aria-label="Question ${j + 1}${P.answers[j] != null ? ', answered' : ''}">${j + 1}</button>`).join('')}</nav>
    <div class="card paper-q">
      <p class="kicker">Question ${i + 1} of ${p.items.length} · ${done} answered</p>
      <p class="pq-text">${esc(q.text)}</p>
      ${q.fig ? `<div class="pq-fig">${q.fig}</div>` : ''}
      <div class="pq-choices" role="radiogroup" aria-label="Answers">${q.choices.map((c, j) => `<button class="pc${P.answers[i] === c ? ' on' : ''}" role="radio" aria-checked="${P.answers[i] === c}" data-act="paperPick" data-arg="${esc(c)}"><b>${LETTERS[j]}</b><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="pq-go">
        <button class="btn" data-act="paperGo" data-arg="${i - 1}" ${i ? '' : 'disabled'}>← Back</button>
        ${P.answers[i] != null ? '<button class="btn small linkish" data-act="paperClear">Leave it blank</button>' : ''}
        <button class="btn" data-act="paperGo" data-arg="${i + 1}" ${i < p.items.length - 1 ? '' : 'disabled'}>${P.answers[i] == null ? 'Skip →' : 'Next →'}</button>
      </div>
      <p class="muted small pq-keys">Keys: A–E choose · ← → move · Backspace leaves it blank</p>
    </div>
  </section>`;
}

function viewPaperEnd(P) {
  const p = P.p, sc = P.sc, B = BANDS[p.band];
  const nx = practiseNext(sc).filter((x) => byId[x.id]).slice(0, 4);
  return `<section class="paper-end">
    <div class="card pe-head">
      <p class="kicker">${typeof p.no === 'number' ? `Paper ${p.no}` : 'A fresh paper'} · ${esc(B.label)}</p>
      <h1 class="pe-score">${+sc.points.toFixed(2)} <small>of ${sc.max} points</small></h1>
      <p>${sc.right} right · ${sc.wrong} wrong · ${sc.blank} left blank${P.timeUp ? ' · the time ran out' : ''}</p>
      <div class="pe-tiers">${[3, 4, 5].map((t) => { const x = sc.tiers[t] || { right: 0, n: 0 }; return `<div><b>${x.right}/${x.n}</b><span>${t}-point questions</span></div>`; }).join('')}</div>
      ${sc.wrong ? `<p class="muted small">${sc.wrong} wrong answer${sc.wrong > 1 ? 's' : ''} cost ${+(p.items.filter((q, i) => P.answers[i] != null && P.answers[i] !== q.ans).reduce((a, q) => a + q.pts / 4, 0)).toFixed(2)} points. A blank costs nothing — guess only when you can rule some answers out.</p>` : ''}
      ${nx.length ? `<p class="pe-next"><b>Practise next:</b> ${nx.map((x) => `<button class="hi-stop" data-act="openStop" data-arg="${x.id}">${esc(byId[x.id].title)} <i>×${x.n}</i></button>`).join('')}</p>` : ''}
      <div class="row gap"><button class="btn primary" data-act="paperStart" data-arg="${p.band}|${typeof p.no === 'number' && p.no < FIXED ? p.no + 1 : 'fresh'}">${typeof p.no === 'number' && p.no < FIXED ? `Paper ${p.no + 1}` : 'A fresh paper'}</button><button class="btn" data-act="nav" data-arg="hall">The Contest Hall</button></div>
    </div>
    ${sc.missed.length ? `<h2 class="pe-rh">Every one to look at again</h2>` : '<p class="card">Every question right. That is a perfect paper.</p>'}
    ${sc.missed.map(({ i, q, given }) => `<div class="card pe-item">
      <p class="kicker">Question ${i + 1} · ${q.pts} points · ${given == null ? 'left blank' : `you chose ${esc(given)}`}</p>
      <p class="pq-text">${esc(q.text)}</p>${q.fig ? `<div class="pq-fig">${q.fig}</div>` : ''}
      <p><b>The answer is ${esc(q.ans)}.</b> ${esc(q.why)}</p>
      ${byId[q.strategy] ? `<button class="hi-stop" data-act="openStop" data-arg="${q.strategy}">The way in: ${esc(byId[q.strategy].title)} →</button>` : ''}
      ${byId[METHOD_OF[q.tid]] ? `<button class="hi-stop hi-method" data-act="openStop" data-arg="${METHOD_OF[q.tid]}">Another way in, from ${esc(worldOf(byId[METHOD_OF[q.tid]].world).name)}: ${esc(byId[METHOD_OF[q.tid]].title)} →</button>` : ''}
    </div>`).join('')}
  </section>`;
}

export const hallWorld = (wid) => HALL_WORLDS.includes(wid);
