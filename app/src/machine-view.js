/* machine-view.js — Beat the Machine's screens and its clock (games spec §2.3). Loaded on
   #/machine only (rule 30); the engine is machine.js, the hero card machine-card.js.

   main.js hands in a context on every draw — the child, save, render, earn (the ONLY door to
   coins), go — and forwards the keypad and the keyboard here while #/machine is up.

   The setup and the finish are pages in the shell. A heat is a full-bleed stage (fixed, edge to
   edge, the tab bar hidden: html.stage-on), symmetric: the child's slate on the left, the
   machine and its tape on the right, mirrored, the cards in a rail between. On a phone the tape
   is a strip on top, the slate the middle, the cards a scrolling row above the keypad.
   The tape's clock is wall time and stops while the tab is hidden. */
import '../styles/machine.css';
import * as M from './machine.js';
import { esc, sfx, confetti, on } from './ui.js';
import { icon } from './icons.js';
import { keypad } from './keypad.js';
import { correct, byId } from './tricks.js';
import { dayKey } from './rand.js';
import { levelOf, setLevel, afterRound, verdictLine } from './game-level.js';
import { pageHead } from './views.js';

let C = null;                                   // the context main.js handed in on the last draw
let S = { phase: 'setup', foe: null, lv: null }; // this screen's state; a match lives in S.m
let paid = 0;                                   // answer coins paid this session (≤ M.ANSWER_CAP)
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced';
const mc = (k) => k.machine || (k.machine = { lv: 1, foe: 0, heats: 0, won: 0, seen: {} });
const inStage = () => ['pick', 'type', 'fb', 'heat'].includes(S.phase);
const sum = () => S.m.sums[S.i];
const mid = (name) => name.replace(/^The /, 'the ');   // "beat the Abacus Twins", not "beat The Abacus Twins"

/* ------------------------------------------------------------------ the clock */
let timer = null, due = 0, left = 0;
function schedule(ms) { clearTimeout(timer); due = performance.now() + ms; timer = setTimeout(tick, ms); }
function stopClock() { clearTimeout(timer); timer = null; left = 0; }
function tick() {
  timer = null;
  if (!S.m || !['pick', 'type'].includes(S.phase)) return;
  S.lines++;
  if (S.lines >= S.tape.length) { S.tapeDone = true; S.lines = S.tape.length; sfx.drop(); }
  else schedule(M.lineMs(sum(), S.m.lv, S.m.foe));
  patchTape();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (timer) { left = Math.max(0, due - performance.now()); clearTimeout(timer); timer = null; } }
  else if (left && S.m && ['pick', 'type'].includes(S.phase)) { const l = left; left = 0; schedule(l); }
});
/* one new line of tape, without redrawing the stage (the gears keep turning) */
function patchTape() {
  const t = document.getElementById('ms-tape');
  if (!t) return C && C.render();
  t.outerHTML = tapeHtml();
  const m = document.querySelector('.ms-mach'); if (m) m.classList.toggle('done', !!S.tapeDone);
}

/* ------------------------------------------------------------------ actions */
function start() {
  const k = C.k, ids = M.earnedIds(k);
  if (ids.length < M.MIN_EARNED) return;
  S.lv = S.lv || levelOf(k, M.GAME);
  S.foe = S.foe == null ? mc(k).foe : S.foe;
  S.m = M.newMatch(ids, S.lv, S.foe);
  S.i = 0; S.algs = [];
  startSum();
}
function startSum() {
  S.phase = 'pick'; S.pick = null; S.typed = ''; S.fb = null; S.stall = false;
  S.tape = M.tape(sum()); S.lines = 0; S.tapeDone = false;
  schedule(M.START_MS + M.lineMs(sum(), S.m.lv, S.m.foe));
  C.render();
}
function pickCard(i) {
  if (S.phase !== 'pick') return;
  const id = S.m.rail[i]; if (!id) return;
  const q = sum(), right = M.rightCards(q, S.m.rail).includes(id);
  S.pick = id;
  if (right) {
    if (id !== M.STRAIGHT) { M.noteSeen(C.k, id, dayKey()); C.save(); }   // rule 4: a later day counts
    S.phase = 'type'; sfx.click();
  } else {
    stopClock(); M.judge(S.m, S.i, id, false, !S.tapeDone);
    S.lines = S.tape.length; S.tapeDone = true;
    S.phase = 'fb'; S.fb = { kind: 'card', text: M.explain(id, q, S.m.rail) };
    sfx.bad();
  }
  C.render();
}
function submit() {
  if (S.phase !== 'type' || !S.typed) return;
  const q = sum(), okAns = correct({ ans: q.ans }, S.typed), before = !S.tapeDone;
  stopClock();
  const res = M.judge(S.m, S.i, S.pick, okAns, before);
  if (res.beat) {
    S.stall = true; S.phase = 'fb'; S.fb = { kind: 'beat', text: `${q.text} = ${q.ans}. The machine stalls!` };
    sfx.good();   // the steam puff is the celebration; confetti is kept for a clean sweep
    C.render();
    const at = S.i; setTimeout(() => { if (S.phase === 'fb' && S.i === at) next(); }, 1500);   // a right one moves on by itself
    return;
  }
  S.lines = S.tape.length; S.tapeDone = true; S.phase = 'fb';
  S.fb = okAns ? { kind: 'late', text: `Right: ${q.text} = ${q.ans}. But the machine got there first.` }
    : { kind: 'wrong', text: `Not quite: ${q.text} = ${q.ans}.` };
  okAns ? sfx.good() : sfx.bad();
  C.render();
}
function next() {
  if (S.phase === 'fb') {
    S.i++;
    if (S.i % M.PER_HEAT === 0) return endHeat();
    return startSum();
  }
  if (S.phase === 'heat') { if (S.i >= M.SUMS) return finish(); return startSum(); }
}
/* After a heat: what it pays, and one trick's algebra — the trick of a sum the child missed, if any. */
function endHeat() {
  const h = M.heatOf(S.i - 1), sc = M.heatScore(S.m, h), k = C.k;
  const coin = M.payHeat(sc.won, paid);
  if (coin && C.earn('answer', 'Beat the Machine: a heat won')) paid++;
  const rs = S.m.results.slice(h * M.PER_HEAT, h * M.PER_HEAT + M.PER_HEAT);
  const miss = rs.find((x) => !x.beat && x.right[0] !== M.STRAIGHT), own = rs.find((x) => x.right[0] !== M.STRAIGHT);
  const fresh = S.m.rail.find((id) => id !== M.STRAIGHT && !S.algs.includes(id));
  const id = (miss && miss.right[0]) || fresh || (own && own.right[0]) || S.m.rail[0];
  S.algs.push(id);
  S.heat = { h, sc, coin: !!coin, alg: M.algebra(id) };
  S.phase = 'heat';
  if (sc.won) sfx.level();
  C.save(); C.render();
}
function finish() {
  const k = C.k, s = M.summary(S.m), day = dayKey(), rec = mc(k);
  const v = afterRound(k, M.GAME, s.right, s.total);
  let contest = false;
  if (M.payContest(k, s, day)) { (k.payDay || (k.payDay = {})).machine = day; contest = !!C.earn('contest', `Beat the Machine: all five heats, ${M.FOES[S.m.foe].name}`); if (!still()) confetti(90); }
  let met = null;
  if (s.sweep && S.m.foe === rec.foe && rec.foe < M.FOES.length - 1) { rec.foe++; met = M.FOES[rec.foe].name; }
  rec.heats += M.HEATS; rec.won += s.won;
  S.done = { s, v, contest, met, foe: S.m.foe, lv: S.m.lv, results: S.m.results, sums: S.m.sums };
  S.lv = v.lv; S.phase = 'done'; S.m = null;
  C.save(); C.render();
}
function quit() { stopClock(); S.m = null; S.phase = 'setup'; C.render(); }

on('machStart', () => start());
on('machPick', (i) => pickCard(+i));
on('machNext', () => next());
on('machQuit', () => quit());
on('machLv', (lv) => { S.lv = Math.min(5, Math.max(1, +lv)); setLevel(C.k, M.GAME, S.lv); C.save(); C.render(); });
on('machFoe', (f) => { if (+f <= mc(C.k).foe) { S.foe = +f; C.render(); } });
on('machAgain', () => { S.phase = 'setup'; C.render(); });
on('machTake', (lv) => { S.lv = +lv; setLevel(C.k, M.GAME, S.lv); C.save(); S.phase = 'setup'; C.render(); });

/* ------------------------------------------------------------------ keys (M6) */
/* 1–8 pick a card; digits type; Backspace deletes; Enter submits, and moves on after feedback. */
export function key(e, ctx) {
  C = ctx;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (!inStage()) return false;
  if (e.key === 'Escape') { quit(); return true; }
  if (S.phase === 'pick' && /^[1-8]$/.test(e.key)) { pickCard(+e.key - 1); return true; }
  if (S.phase === 'type') {
    if (/^\d$/.test(e.key)) return pad(e.key, ctx), true;
    if (e.key === 'Backspace') return pad('⌫', ctx), true;
    if (e.key === 'Enter') return pad('✓', ctx), true;
  }
  if ((S.phase === 'fb' || S.phase === 'heat') && (e.key === 'Enter' || e.key === ' ')) { next(); return true; }
  return /^\d$/.test(e.key);
}
export function pad(k, ctx) {
  C = ctx || C;
  if (S.phase !== 'type') return;
  if (k === '✓') return submit();
  if (k === '⌫') S.typed = S.typed.slice(0, -1);
  else if (/^\d$/.test(k) && S.typed.length < 7) S.typed += k;
  const a = document.getElementById('ms-ans');
  if (a) a.innerHTML = S.typed ? esc(S.typed) : '<span class="caret"></span>'; else C.render();
}
/* leaving #/machine: the clock stops and the stage comes down (a match in the middle is let go) */
export function leave() { stopClock(); if (inStage()) { S.m = null; S.phase = 'setup'; } document.documentElement.classList.remove('stage-on'); }

/* ------------------------------------------------------------------ drawing */
export function view(ctx) {
  C = ctx;
  document.documentElement.classList.toggle('stage-on', inStage());
  if (inStage() && S.m) return stage();
  if (S.phase === 'done' && S.done) return finishPage();
  return setupPage();
}

const plate = () => `art/g-machine${document.documentElement.getAttribute('data-mode') === 'dark' ? '-night' : ''}.webp`;
const vedicTag = (id) => (M.isVedic(id) ? `<span class="mc-tag">From Tirtha’s 1965 book, not the Vedas</span>` : '');

function setupPage() {
  const k = C.k, ids = M.earnedIds(k), rec = mc(k), lv = S.lv || levelOf(k, M.GAME), foe = S.foe == null ? rec.foe : Math.min(S.foe, rec.foe);
  S.lv = lv; S.foe = foe;
  const head = pageHead('Beat the Machine', 'Spot the shortcut before the machine finishes the sum the long way.', `<button class="back" data-act="nav" data-arg="play" aria-label="Back to Play"><span aria-hidden="true">←</span> Play</button>`);
  const stars = (id) => ((k.tricks || {})[id] || {}).stars || 0;
  const cardRow = (id) => {
    const t = byId[id], own = ids.includes(id);
    return `<li class="mc-row${own ? ' own' : ''}" data-card="${id}"><div><b>${esc(M.cardName(id))}</b> <span class="muted">· ${esc(M.CARDS[id].rule)}</span>
      ${M.isVedic(id) ? `<p class="mc-label" data-vedic>${esc(M.VEDIC_LABEL)}</p>` : '<p class="mc-label plain">A plain shortcut — no Sanskrit name, nothing to label.</p>'}</div>
      ${own ? `<span class="chip ok">${icon('check', 16)} Yours</span>` : `<a class="btn ghost small" href="#/stop/${encodeURIComponent(id)}|drill" data-earn="${id}">Earn it: ${esc(t.title)} · ${stars(id)} of 2 stars</a>`}</li>`;
  };
  if (ids.length < M.MIN_EARNED) {
    const need = M.CARD_IDS.filter((id) => !ids.includes(id));
    return `<section class="mach-page">${head}
      <div class="mach-hero" style="background-image:url(${plate()})"><div class="mh-machine" aria-hidden="true">${machineSvg(false)}</div></div>
      <div class="card mach-gate" data-gate>
        <h2>Earn three tricks first</h2>
        <p>The machine only races children who have a few shortcuts up their sleeve. You have ${ids.length} of the ${M.MIN_EARNED} you need: get <b>2 stars</b> on ${M.MIN_EARNED - ids.length === 1 ? 'one more' : `${M.MIN_EARNED - ids.length} more`} of these stops on the Atlas.</p>
        <ul class="mc-list">${[...ids, ...need].map(cardRow).join('')}</ul>
      </div></section>`;
  }
  const foes = M.FOES.map((f, i) => `<button class="lvchip foe${i === foe ? ' on' : ''}" data-act="machFoe" data-arg="${i}" aria-pressed="${i === foe}"${i > rec.foe ? ' disabled' : ''}><b>${esc(f.name)}</b><span>${i > rec.foe ? `Beat ${esc(mid(M.FOES[i - 1].name))} in all five heats at Level 3 or above to meet them` : esc(f.line)}</span></button>`).join('');
  const lvs = M.LEVELS.map((L) => `<button class="lvchip lv${L.lv === lv ? ' on' : ''}" data-act="machLv" data-arg="${L.lv}" aria-pressed="${L.lv === lv}"><b>${L.lv}</b><span>${L.speed}</span></button>`).join('');
  return `<section class="mach-page">${head}
    <div class="mach-hero" style="background-image:url(${plate()})"><div class="mh-machine" aria-hidden="true">${machineSvg(false)}</div>
      <div class="mh-copy"><p>Every sum, the machine works the long way, column by column, and you can watch its tape grow. Pick the trick card that fits — or <b>Straight</b> when none does — then answer before the tape reaches the bottom. Beat it in three sums of four to win a heat; five heats make a match.</p></div></div>
    <div class="mach-set">
      <div class="card"><p class="kicker">Your opponent</p><div class="lvrow foes">${foes}</div><p class="muted small">${esc(M.INVENTED)} None of them is a rival you can pay to race.</p></div>
      <div class="card"><p class="kicker">Level</p><div class="lvrow" role="group" aria-label="Level">${lvs}</div><p class="lv-words" data-lvwords>${esc(M.levelWords(lv))} · ${esc(M.LEVELS[lv - 1].nums)}</p>
        <button class="btn primary big" data-act="machStart">${icon('play', 20)} Start the match</button>
        <p class="muted small">Keys: 1–8 pick a card · digits type · Enter submits. A heat won pays 1 coin (10 a session); all five heats at Level 3 or above with 80% right pays 10, once a day.</p></div>
    </div>
    <div class="card"><p class="kicker">Your trick cards</p><ul class="mc-list">${M.CARD_IDS.map(cardRow).join('')}</ul></div>
  </section>`;
}

function machineSvg(run, stall) {
  const gear = (cx, cy, r, cls) => `<g class="gear ${cls}" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r}" class="g-body"/><circle cx="${cx}" cy="${cy}" r="${r + 5}" class="g-teeth" stroke-dasharray="6 6"/><circle cx="${cx}" cy="${cy}" r="${r * 0.32}" class="g-hub"/></g>`;
  return `<svg class="msvg${run ? ' run' : ''}${stall ? ' stall' : ''}" viewBox="0 0 200 170" role="img" aria-label="The machine">
    <rect x="58" y="6" width="16" height="30" rx="3" class="m-chim"/>
    <g class="steam"><circle cx="66" cy="2" r="9"/><circle cx="80" cy="-6" r="7"/><circle cx="56" cy="-8" r="6"/></g>
    <rect x="18" y="34" width="164" height="110" rx="16" class="m-box"/>
    <rect x="30" y="46" width="140" height="50" rx="10" class="m-win"/>
    ${gear(62, 71, 15, 'g1')}${gear(102, 71, 11, 'g2')}${gear(138, 71, 14, 'g3')}
    <rect x="70" y="112" width="60" height="10" rx="5" class="m-slot"/>
    <rect x="34" y="144" width="20" height="16" rx="4" class="m-foot"/><rect x="146" y="144" width="20" height="16" rx="4" class="m-foot"/>
    <circle cx="160" cy="124" r="6" class="m-lamp"/></svg>`;
}

function tapeHtml() {
  const n = S.tape.length, shown = S.tape.slice(0, S.lines);
  return `<div class="ms-tape" id="ms-tape" data-lines="${S.lines}" data-of="${n}"><ol>${shown.map((l, i) => `<li${l.v != null ? ' class="last"' : ''}>${esc(l.t)}${l.v != null ? ` <b>${l.v}</b>` : ''}</li>`).join('')}${S.lines < n ? '<li class="next" aria-hidden="true"></li>' : ''}</ol>
    <div class="ms-prog" role="progressbar" aria-label="The machine's tape" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${S.lines}"><i style="width:${Math.round(100 * S.lines / n)}%"></i></div></div>`;
}

function stage() {
  // during the heat panel S.i is already the next heat's first sum: the stage shows the heat just played
  const m = S.m, at = S.phase === 'heat' ? S.i - 1 : S.i, q = m.sums[at], foe = M.FOES[m.foe], h = M.heatOf(at), sc = M.heatScore(m, h);
  const pips = Array.from({ length: M.PER_HEAT }, (_, j) => { const r = m.results[h * M.PER_HEAT + j]; return `<i class="${r ? (r.beat ? 'w' : 'l') : j === at % M.PER_HEAT ? 'now' : ''}"></i>`; }).join('');
  const right = S.phase === 'fb' || S.phase === 'heat' ? (m.results[at] || {}).right || [] : [];
  const rail = m.rail.map((id, i) => {
    const st = S.pick === id ? (right.length && !right.includes(id) ? ' wrong' : ' picked') : right.includes(id) && S.phase === 'fb' && S.fb && S.fb.kind === 'card' ? ' right' : '';
    return `<button class="mcard${id === M.STRAIGHT ? ' straight' : ''}${st}" data-act="machPick" data-arg="${i}" aria-keyshortcuts="${i + 1}"${M.isVedic(id) ? ` title="${esc(M.VEDIC_LABEL)}" aria-description="${esc(M.VEDIC_LABEL)}"` : ''}${S.phase !== 'pick' ? ' aria-disabled="true"' : ''}>
      <kbd>${i + 1}</kbd><b>${esc(M.cardName(id))}</b>${m.lv <= 2 && id !== M.STRAIGHT ? `<span class="mc-rule">${esc(M.CARDS[id].rule)}</span>` : ''}${vedicTag(id)}</button>`;
  }).join('');
  let work = '';
  if (S.phase === 'pick') work = `<p class="ms-ask">Which trick fits? Pick a card${matchMedia('(hover:hover)').matches ? ' (keys 1–' + m.rail.length + ')' : ''}.</p>`;
  else if (S.phase === 'type' || (S.phase === 'fb' && S.fb.kind !== 'card')) {
    const sp = M.slateParts(q, S.pick);
    work = `<p class="ms-card">${S.pick === M.STRAIGHT ? 'Straight' : esc(M.cardName(S.pick))}</p>${sp.fig ? `<div class="ms-fig">${sp.fig}</div>` : ''}<ol class="ms-steps">${sp.steps.map((x) => `<li>${esc(x)}</li>`).join('')}<li class="muted">…and the answer.</li></ol>`;
  }
  if (S.phase === 'fb') work = `<div class="ms-fb ${S.fb.kind}" role="status"><p>${esc(S.fb.text)}</p>${S.fb.kind === 'beat' ? '' : `<button class="btn primary" data-act="machNext">Next sum <kbd>Enter</kbd></button>`}</div>` + (S.fb.kind === 'card' ? '' : work);
  const heat = S.phase === 'heat' ? heatPanel() : '';
  return `<div class="mach-stage" style="background-image:url(${plate()})" data-phase="${S.phase}">
    <div class="ms-bar"><button class="ms-x" data-act="machQuit" aria-label="Stop the match">${icon('x', 22)}</button>
      <b class="ms-foe">${esc(foe.name)}</b><span class="chip">Heat ${h + 1} of ${M.HEATS}</span><span class="ms-pips" role="img" aria-label="${sc.beat} of ${M.PER_HEAT} beaten in this heat">${pips}</span><span class="chip ms-lv">Level ${m.lv}</span></div>
    <div class="ms-grid">
      <section class="ms-slate" aria-label="Your slate">
        <p class="ms-sum mono"><span class="ms-q">${esc(q.text)}</span> = <span class="ms-ans" id="ms-ans">${S.typed ? esc(S.typed) : '<span class="caret"></span>'}</span></p>
        <div class="ms-work">${work}</div>
      </section>
      <nav class="ms-rail" aria-label="Your trick cards">${rail}</nav>
      <section class="ms-mach${S.tapeDone ? ' done' : ''}${S.stall ? ' stall' : ''}" aria-label="${esc(foe.name)}">
        <div class="ms-svg">${machineSvg(['pick', 'type'].includes(S.phase), S.stall)}</div>${tapeHtml()}
      </section>
      <div class="ms-pad${S.phase === 'type' ? '' : ' off'}">${keypad()}</div>
    </div>${heat}
  </div>`;
}

function heatPanel() {
  const { h, sc, coin, alg } = S.heat;
  return `<div class="ms-heat" role="dialog" aria-modal="true" aria-label="Heat ${h + 1}">
    <div class="card">
      <p class="kicker">Heat ${h + 1} of ${M.HEATS}</p>
      <h2>${sc.won ? `You won the heat: ${sc.beat} of ${M.PER_HEAT} beaten` : `The machine took this heat: you beat it ${sc.beat} of ${M.PER_HEAT}`}</h2>
      ${coin ? `<p class="chip gold">${icon('coin', 16)} +1 coin</p>` : ''}
      <div class="ms-alg" data-alg="${alg.id}"><p class="kicker">Why it works · ${esc(alg.name)}</p><p class="mono alg">${esc(alg.alg)}</p>
        ${alg.why.map((w) => `<p>${esc(w)}</p>`).join('')}
        ${alg.fig ? `<div class="ms-fig">${alg.fig}</div>` : `<ol class="ms-steps done">${alg.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`}
        ${alg.label ? `<p class="mc-label" data-vedic>${esc(alg.label)}</p>` : ''}</div>
      <button class="btn primary big" data-act="machNext">${S.i >= M.SUMS ? 'See the match' : `Heat ${h + 2}`} <kbd>Enter</kbd></button>
    </div></div>`;
}

function finishPage() {
  const d = S.done, s = d.s, foe = M.FOES[d.foe];
  const head = pageHead('Beat the Machine', `Against ${esc(mid(foe.name))} · Level ${d.lv}`, `<button class="back" data-act="nav" data-arg="play" aria-label="Back to Play"><span aria-hidden="true">←</span> Play</button>`);
  const rows = d.sums.map((q, i) => { const r = d.results[i] || {}; return `<li class="${r.beat ? 'ok' : 'miss'}"><span class="mono">${esc(q.text)} = ${q.ans}</span><span>${r.right && r.right.length ? esc(r.right.map(M.cardName).join(' or ')) : ''}</span><span>${r.beat ? `${icon('check', 16)} beaten` : r.cardRight ? (r.answerRight ? 'right, too slow' : 'right card, wrong answer') : `you picked ${esc(M.cardName(r.pick || M.STRAIGHT))}`}</span></li>`; }).join('');
  const offer = d.v.offer ? `<button class="btn" data-act="machTake" data-arg="${d.v.offer}">Try Level ${d.v.offer}</button>` : '';
  return `<section class="mach-page">${head}
    <div class="card mach-done" data-done>
      <h2>${s.won === M.HEATS ? `You beat ${esc(mid(foe.name))} in all five heats!` : `You won ${s.won} of ${M.HEATS} heats`}</h2>
      <p>${s.right} of ${s.total} sums right (right card and right answer). ${esc(verdictLine(d.v))}</p>
      ${d.contest ? `<p class="chip gold">${icon('coin', 16)} +10 contest coins for a clean sweep</p>` : s.won === M.HEATS && d.lv < M.CONTEST_LV ? '<p class="muted">A clean sweep at Level 3 or above pays 10 contest coins, once a day.</p>' : ''}
      ${d.met ? `<p class="chip ok">${icon('sparkle', 16)} ${esc(d.met)} will race you next.</p>` : ''}
      <div class="row gap"><button class="btn primary" data-act="machAgain">Play again</button>${offer}<button class="btn ghost" data-act="nav" data-arg="play">Back to Play</button></div>
    </div>
    <div class="card"><p class="kicker">What you practised</p><ol class="ms-practised">${rows}</ol></div>
  </section>`;
}

/* for the headless checks only: the state, never written from outside */
window.__bzmMachine = { state: () => S };
