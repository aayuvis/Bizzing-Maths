/* main.js — the shell: boot, hash routing, the question runner, the contest
   driver, keys, and every data-act in one table. */

import { R } from './runtime.js';
import { Store } from './store.js';
import { on, fire, bindRoot, sfx, setSound, toast, confetti, say, hush } from './ui.js';
import { byId, drill, correct, stepRight, tricksIn, worldOf } from './tricks.js';
import * as F from './facts.js';
import { newHousehold, newKid, kid, tick, trickRec, scoreRun, RUNGS, placeFrom, CHECK_PASS, ROUTE, isOpen, rankOf } from './model.js';
import { newContest, childQuestion, playRound, championship, runOut, timeFor } from './contest.js';
import * as G from './games.js';
import { dayKey, shuffle } from './rand.js';
import * as V from './views.js';
import * as V2 from './views2.js';
import { toolById, SHELF } from './library/index.js';
import { STORIES } from './stories.js';
import { floorSet, familySet, famOf, isBoss, floorLevel, FLOOR_PASS, sudokuSize } from './puzzles.js';

const root = document.getElementById('app');

/* ------------------------------------------------------------- boot */

R.h = Store.loadHousehold() || newHousehold();
R.sound = Store.loadDevice('sound', true); setSound(R.sound);
const mode = Store.loadDevice('mode', null);
if (mode) document.documentElement.setAttribute('data-mode', mode);

function save() { Store.saveHousehold(R.h); }

/* ---------- the Library's context: everything a tool may touch, and no more
   (docs/LIBRARY-CONTRACT.md). ui is per-screen state, data is the child's
   record for this tool, kept by the Store seam. */
function libCtx(id) {
  const k = kid(R.h); R.ui.lib = R.ui.lib || {};
  const ui = R.ui.lib[id] || (R.ui.lib[id] = {});
  k.lib = k.lib || {};
  const data = k.lib[id] || (k.lib[id] = {});
  return {
    id, kid: k, band: k.band, ui, data, save, render, toast, sfx, confetti, say,
    keypad: G.keypad, F,
    tick: (right, xp = 1) => { tick(k, right, xp); save(); },
    record: (fact, right, ms) => { F.record(k.facts[F.key(fact)] || (k.facts[F.key(fact)] = F.blank()), right, ms, k.band); save(); },
    startRun: (title, items, extra = {}) => startRun('lib', title, items, { ...extra, lib: id }),
    go: (nav, arg) => go(nav, arg),
    openStop: (sid) => fire('openStop', sid),
  };
}

/* Stars earned today — the gold ring on Home. Kept for a week, never more. */
function starToday(k, n) {
  if (!n) return;
  const d = dayKey(); const m = k.dayStops || (k.dayStops = {});
  m[d] = (m[d] || 0) + n;
  for (const key of Object.keys(m)) if (key < dayKey(new Date(Date.now() - 7 * 864e5))) delete m[key];
}

/* ------------------------------------------------------------- routing */

let selfHash = false;
function writeHash() {
  const { nav, arg } = R.ui;
  const h = '#/' + nav + (arg ? '/' + encodeURIComponent(arg) : '');
  if (location.hash !== h) { selfHash = true; location.hash = h; }
}
function readHash() {
  const m = /^#\/([a-z]+)(?:\/(.+))?$/.exec(location.hash || '');
  if (!m) return;
  go(m[1], m[2] ? decodeURIComponent(m[2]) : null, true);
}
addEventListener('hashchange', () => { if (selfHash) { selfHash = false; return; } readHash(); });

const TRANSIENT = ['run'];     // screens that cannot be deep-linked back into

function go(nav, arg = null, fromHash = false) {
  if (fromHash && TRANSIENT.includes(nav) && !R.run) nav = 'home';
  if (nav === 'stop' && !byId[arg]) nav = 'atlas';
  if (nav !== 'run' && R.run && R.run.kind !== 'guided') R.run = null;
  if (nav !== 'stop' && R.run && R.run.kind === 'guided') R.run = null;
  if (nav === 'grownups' && R.ui.nav !== 'grownups') { R.ui.gate = false; R.ui.gateIn = ''; }
  R.ui.nav = nav; R.ui.arg = arg; R.ui.confirm = null;
  hush();
  if (!fromHash) writeHash();
  render();
  const m = document.getElementById('main'); if (m && !fromHash) { scrollTo(0, 0); }
}

/* ------------------------------------------------------------- render */

function screen() {
  const k = kid(R.h);
  const n = R.ui.nav;
  if (n === 'privacy') return V.viewPrivacy();
  if (n === 'grownups') return V.viewGrownups();
  if (!k || n === 'welcome') return V.viewWelcome();
  if (n === 'start') return V.viewStart();
  if (n === 'run' && R.run) return V.viewRun();
  switch (n) {
    case 'atlas': return V2.viewAtlasMap();
    case 'world': return worldOf(R.ui.arg) ? V2.viewWorld(R.ui.arg) : V2.viewAtlasMap();
    case 'stories': return V2.viewStories();
    case 'puzzles': return V2.viewTower();
    case 'library': return V2.viewLibrary(SHELF);
    case 'lib': return toolById[R.ui.arg] ? V2.viewTool(toolById[R.ui.arg], libCtx(R.ui.arg)) : V2.viewLibrary(SHELF);
    case 'goals': return V2.viewGoals();
    case 'intro': return worldOf(R.ui.arg) && worldOf(R.ui.arg).intro ? V.viewWorldIntro(R.ui.arg) : V.viewAtlas();
    case 'stop': return V.viewStop(R.ui.arg);
    case 'facts': return V.viewFacts();
    case 'arcade': return V.viewArcade();
    case 'contest': return V.viewContest();
    case 'me': return V.viewMe();
    case 'who': return V.viewWho();
    default: return V.viewHome();
  }
}

function render() {
  const focusId = document.activeElement && document.activeElement.id;
  root.innerHTML = V.shell(screen());
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (el.setSelectionRange && el.value != null) el.setSelectionRange(el.value.length, el.value.length); } }
  armTimer();
  // a world board opens scrolled to the stop you are standing on (phones pan it)
  const sc = root.querySelector('.board-scroll[data-autoscroll]');
  if (sc && R.ui.scrolled !== R.ui.arg + ':' + R.ui.pick) {
    R.ui.scrolled = R.ui.arg + ':' + R.ui.pick;
    const x = +sc.dataset.autoscroll / 100 * sc.scrollWidth - sc.clientWidth / 2;
    sc.scrollLeft = Math.max(0, x);
  }
}
R.render = render;

/* ------------------------------------------------------------- the runner */

/* One runner serves the facts session, a trick's drill, a checkpoint and
   placement. A run is a list of questions; right answers auto-advance, a
   wrong one holds until the child moves on — Bizzing Bee's rule, because a
   wrong answer that flashes past teaches nothing. */

function startRun(kind, title, items, extra = {}) {
  R.run = { kind, title, items, i: 0, input: '', fb: null, results: [], missed: [], t0: 0, over: false, ...extra };
  go('run');
  ask();
}

function ask() {
  const run = R.run; if (!run || run.over) return;
  run.t0 = performance.now(); run.input = ''; run.fb = null;
  render();
  const k = kid(R.h), q = run.items[run.i];
  if (k && k.prefs.read) say(q.say || V.spoken(q.text));
}

function patchAnswer(v) {
  const el = document.getElementById('ans');
  if (el) el.innerHTML = v ? escapeHtml(v) : '<span class="caret"></span>';
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function typeKey(k) {
  const run = R.run; if (!run || run.fb || run.over) return;
  const q = run.items[run.i]; if (q.choices) return;
  if (k === '⌫') run.input = run.input.slice(0, -1);
  else if (k === '✓') { if (run.input !== '') return submit(run.input); return; }
  else if ((/^\d$/.test(k) || (q.keys || []).includes(k)) && run.input.length < 9) run.input += k;
  patchAnswer(run.input);
  // right answers are taken the moment they are typed; wrong ones wait for
  // Enter, so a child is never told "wrong" halfway through typing 56
  if (correct(q, run.input)) submit(run.input);
}

function submit(given) {
  const run = R.run, q = run.items[run.i], k = kid(R.h);
  const ms = performance.now() - run.t0;
  const right = correct(q, given);
  const fast = right && ms <= (F.FLUENT_MS[k.band] || 3500);
  run.fb = { right, given, fast, ms };
  run.results.push({ right, ms });
  if (!right) run.missed.push(q);
  // record what this question is evidence of
  if (q.fact) F.record(k.facts[F.key(q.fact)] || (k.facts[F.key(q.fact)] = F.blank()), right, ms, k.band);
  if (run.kind !== 'place') tick(k, right, run.kind === 'facts' ? 1 : 2);
  save();
  right ? sfx.good() : sfx.bad();
  render();
  // a puzzle holds on a right answer too, so its rule can be read
  if (q.puzzle) { const p = k.puzzles[q.puzzle] || (k.puzzles[q.puzzle] = { right: 0, tries: 0, solved: {} }); p.tries++; if (right) p.right++; save(); }
  if (right && !q.puzzle) setTimeout(() => { if (R.run === run && run.fb) nextQ(); }, fast ? 420 : 650);
  // placement stops after two misses in a row
  if (run.kind === 'place' && !right && run.results.length >= 2 && !run.results.at(-2).right) setTimeout(() => { if (R.run === run) finishRun(); }, 1400);
}

function nextQ() {
  const run = R.run; if (!run) return;
  if (run.i + 1 >= run.items.length) return finishRun();
  run.i++; ask();
}

function finishRun() {
  const run = R.run, k = kid(R.h);
  run.over = true; hush();
  const right = run.results.filter((r) => r.right).length, n = run.results.length;
  const s = { lines: [], buttons: [] };
  if (run.kind === 'facts') {
    const moved = run.items.filter((q) => q.fact && F.state(k.facts[F.key(q.fact)]) === 'fluent').length;
    const fresh = run.items.filter((q) => q.fresh).length;
    s.lines.push(fresh ? `You met ${V.nWord(fresh)} new fact${fresh > 1 ? 's' : ''}.` : '');
    s.lines.push(moved ? `${moved} of these are fluent now.` : 'Fluent takes a few days — a fact has to still be quick after a gap.');
    s.buttons.push(`<button class="btn primary" data-act="startFacts" data-arg="${run.op}">Twenty more</button>`);
  }
  if (run.kind === 'drill') {
    const avg = run.results.reduce((a, r) => a + r.ms, 0) / Math.max(1, n);
    const t = byId[run.trick];
    const budget = (4000 + 2500 * t.work(run.items[0]).length) * (k.band === '6-7' ? 1.5 : 1);
    const res = scoreRun(k, run.trick, right, n, avg <= budget);
    starToday(k, res.gained);
    s.stars = res.stars;
    if (res.pct >= 0.7) {
      s.lines.push(res.gained ? `<b>${res.stars === 3 ? 'Three stars — fast and fearless.' : 'Stop passed.'}</b>` : 'Passed again.');
      const idx = ROUTE.findIndex((x) => x.id === run.trick);
      const nx = ROUTE[idx + 1];
      if (nx) s.buttons.push(nx.kind === 'stop' ? `<button class="btn primary" data-act="openStop" data-arg="${nx.id}">Next stop: ${escapeHtml(byId[nx.id].title)}</button>` : `<button class="btn primary" data-act="openCheck" data-arg="${nx.world}">Take the checkpoint</button>`);
      if (res.stars < 3) s.lines.push(res.pct >= 0.9 ? 'Nine or more right — do it a little quicker for the third star.' : 'Nine right at a good pace is the third star.');
      if (res.gained) { confetti(res.stars === 3 ? 60 : 36); sfx.level(); }
    } else {
      s.lines.push('Seven right passes this stop. Look at the ones below, then have another go — or go back to “Your turn”.');
      s.buttons.push(`<button class="btn primary" data-act="startDrill" data-arg="${run.trick}">Try again</button>`);
    }
    s.buttons.push(`<button class="btn" data-act="openStop" data-arg="${run.trick}">Back to the stop</button>`);
  }
  if (run.kind === 'check') {
    const pct = n ? right / n : 0;
    const c = k.checks[run.world] || (k.checks[run.world] = { best: 0, passed: false });
    c.best = Math.max(c.best, Math.round(pct * 100));
    s.stars = pct >= 0.95 ? 3 : pct >= CHECK_PASS ? 2 : pct >= 0.5 ? 1 : 0;
    if (pct >= CHECK_PASS) {
      const first = !c.passed; c.passed = true;
      s.lines.push(first ? `<b>${escapeHtml(worldOf(run.world).name)} — done.</b> The next part of the Atlas is open.` : 'Passed again.');
      if (first) { confetti(70); sfx.level(); }
      s.buttons.push('<button class="btn primary" data-act="nav" data-arg="atlas">To the Atlas</button>');
    } else {
      s.lines.push(`Ten of twelve passes. The questions you missed came from these stops — a drill on any of them helps.`);
      s.buttons.push(`<button class="btn primary" data-act="openCheck" data-arg="${run.world}">Try again</button>`);
    }
  }
  if (run.kind === 'puzzle') {
    s.stars = right === n ? 3 : right >= n - 2 ? 2 : right >= 2 ? 1 : 0;
    s.lines.push(right === n ? 'Every one. That is contest thinking.' : 'Each puzzle showed its rule afterwards — the next set will feel easier.');
    if (run.floor) {
      const q = k.quest[run.floor] || (k.quest[run.floor] = { stars: 0 });
      q.stars = Math.max(q.stars, s.stars);
      if (right >= FLOOR_PASS) {
        const first = !q.passed; q.passed = true;
        s.lines.unshift(first ? `<b>Floor ${run.floor} cleared — the stairs to floor ${run.floor + 1} are open.</b>` : 'Cleared again.');
        if (first) { sfx.level(); confetti(60); }
        if (run.floor < 12) s.buttons.push(`<button class="btn primary" data-act="climb" data-arg="${run.floor + 1}">Up to floor ${run.floor + 1}</button>`);
      } else {
        s.lines.unshift(`${FLOOR_PASS} of 6 opens the stairs. Every puzzle showed you its reason — try the floor again.`);
        s.buttons.push(`<button class="btn primary" data-act="climb" data-arg="${run.floor}">Try floor ${run.floor} again</button>`);
      }
      s.buttons.push('<button class="btn" data-act="nav" data-arg="puzzles">The tower</button>');
    } else s.buttons.push(`<button class="btn primary" data-act="practise" data-arg="${run.fam}:${run.lv}">Six more</button>`);
    if (s.stars >= 2) confetti(30);
  }
  if (run.kind === 'lib') {
    const tool = toolById[run.lib];
    const r = tool && tool.done ? tool.done(run, libCtx(run.lib)) : null;
    if (r) { if (r.stars != null) s.stars = r.stars; s.lines.push(...(r.lines || [])); s.buttons.push(...(r.buttons || [])); }
    else s.lines.push(right === n ? 'Every one.' : 'Try another set — it gets easier every time.');
  }
  if (run.kind === 'place') {
    // count rungs passed before the first pair of misses in a row
    let upto = 0, miss = 0;
    run.results.forEach((r, i) => { if (miss < 2) { if (r.right) { upto = i + 1; miss = 0; } else miss++; } });
    k.placed = placeFrom(upto);
    const at = k.placed == null ? null : ROUTE[k.placed];
    s.lines.push(at ? `We'll open the Atlas up to <b>${escapeHtml(worldOf(at.world).name)}</b>. Everything before it is open too, if you want to look back.` : 'We\'ll start at the very beginning — the Ten Gardens. That is where the tricks start.');
    s.lines.push('<span class="muted">That was not a test and there is no score. It only decided which stops open first.</span>');
    s.buttons.push('<button class="btn primary" data-act="nav" data-arg="atlas">Open my Atlas</button>');
  }
  run.summary = s;
  const before = rankOf(k.xp - right * 2);
  save();
  render();
  if (rankOf(k.xp).i > before.i && run.kind !== 'place') setTimeout(() => toast(`New rank: ${rankOf(k.xp).n}!`), 400);
}

/* ------------------------------------------------------------- guided ("Your turn") */

function startGuided(id) {
  const t = byId[id], k = kid(R.h);
  const lv = 1;
  const items = drill(t, 2, lv);
  R.run = { kind: 'guided', trick: id, items, i: 0 };
  setGuided(0);
  R.ui.tab = 'turn';
  render();
}
function setGuided(i) {
  const g = R.run, t = byId[g.trick];
  g.i = i; g.steps = t.work(g.items[i]); g.si = 0; g.input = ''; g.tries = 0; g.msg = ''; g.msgKind = ''; g.revealed = [];
}
function guidedKey(k) {
  const g = R.run; if (!g || g.kind !== 'guided' || g.si >= g.steps.length) return;
  const s = g.steps[g.si]; if (s.choices) return;
  const keys = g.items[g.i].keys || byId[g.trick].keys || [];
  if (k === '⌫') g.input = g.input.slice(0, -1);
  else if (k === '✓') return guidedSubmit(g.input);
  else if ((/^\d$/.test(k) || keys.includes(k)) && g.input.length < 9) g.input += k;
  patchAnswer(g.input);
  if (g.input !== '' && stepRight(s, g.input)) guidedSubmit(g.input);
}
function guidedSubmit(given) {
  const g = R.run, s = g.steps[g.si];
  if (String(given) === '' ) return;
  const right = stepRight(s, given);
  if (right) { sfx.good(); g.si++; g.tries = 0; g.input = ''; g.msg = g.si >= g.steps.length ? `<b>Done — ${escapeHtml(g.items[g.i].text)} = ${escapeHtml(g.items[g.i].ans)}.</b>` : 'Right. Next step.'; g.msgKind = 'good'; }
  else {
    g.tries++; sfx.bad(); g.input = '';
    if (g.tries >= 2) { g.revealed.push(g.si); g.msg = `That step is <b>${escapeHtml(s.v)}</b> — carry on from there.`; g.si++; g.tries = 0; g.msgKind = ''; }
    else { g.msg = 'Not quite — look at the step again and have another go.'; g.msgKind = 'bad'; }
  }
  render();
}
function guidedNext() {
  const g = R.run;
  if (g.i + 1 < g.items.length) { setGuided(g.i + 1); return render(); }
  const k = kid(R.h), r = trickRec(k, g.trick);
  const first = !r.learned;
  if (!r.stars) starToday(k, 1);
  r.learned = true; r.stars = Math.max(r.stars, 1);
  tick(k, true, 3); save();
  R.run = null; R.ui.tab = 'drill';
  if (first) { sfx.level(); toast('★ First star — the working is yours.'); }
  render();
}

/* ------------------------------------------------------------- contest */

function startContest() {
  const k = kid(R.h);
  R.contest = { c: newContest(k.band), phase: 'ask', input: '', last: null };
  k.contest.runs++; save();
  cAsk();
  go('contest');
}
function cAsk(champ = false) {
  const C = R.contest;
  C.q = childQuestion(C.c);
  if (champ) { C.c.rq = 1; C.q = childQuestion(C.c); C.c.rq = 0; }
  C.phase = champ ? 'champ' : 'ask'; C.input = ''; C.t0 = performance.now();
  render();
  const k = kid(R.h); if (k.prefs.read) say(C.q.say || V.spoken(C.q.text));
}
let timerT = null;
function armTimer() {
  clearTimeout(timerT);
  const C = R.contest;
  if (R.ui.nav !== 'contest' || !C || (C.phase !== 'ask' && C.phase !== 'champ')) return;
  const k = kid(R.h), T = timeFor(k.band, C.q.h) * 1000;
  const left = T - (performance.now() - C.t0);
  const bar = document.querySelector('.timer i');
  if (bar) bar.style.animationDelay = `-${((T - left) / 1000).toFixed(2)}s`;
  timerT = setTimeout(() => { if (R.contest === C && (C.phase === 'ask' || C.phase === 'champ')) cAnswer(''); }, Math.max(0, left));
}
function cKey(k) {
  const C = R.contest; if (!C || (C.phase !== 'ask' && C.phase !== 'champ') || C.q.choices) return;
  if (k === '⌫') C.input = C.input.slice(0, -1);
  else if (k === '✓') { if (C.input !== '') cAnswer(C.input); return; }
  else if (/^\d$/.test(k) && C.input.length < 7) C.input += k;
  patchAnswer(C.input);
  if (correct(C.q, C.input)) cAnswer(C.input);
}
function cAnswer(given) {
  const C = R.contest, k = kid(R.h);
  clearTimeout(timerT);
  const right = given !== '' && correct(C.q, given);
  C.youRight = right; C.given = given;
  tick(k, right, 2); save();
  right ? sfx.good() : sfx.bad();
  if (C.phase === 'champ') {
    championship(C.c, right);
    C.last = { ...C.c.log.at(-1), res: { you: right } };
  } else {
    C.last = playRound(C.c, right);
  }
  C.phase = 'round';
  render();
}
function cNext() {
  const C = R.contest, k = kid(R.h), c = C.c;
  const you = c.field.find((f) => f.you);
  if (you.out || c.over) {
    runOut(c);
    C.phase = 'end';
    if (!k.contest.best || c.field.find((f) => f.you).place < k.contest.best) k.contest.best = c.field.find((f) => f.you).place;
    if (c.winner === 'you') { k.contest.wins++; confetti(80); sfx.level(); }
    save(); return render();
  }
  if (c.champ) return cAsk(true);
  cAsk();
}

/* ------------------------------------------------------------- games */

function play(id) {
  const k = kid(R.h);
  const rec = k.games[id] || (k.games[id] = { best: null, plays: 0 });
  const onEnd = (score) => { rec.plays++; if (typeof score === 'number' && (rec.best == null || score > rec.best)) rec.best = score; save(); render(); };
  if (id === 'rush') G.numberRush(k, { onTick: (right, fact) => { if (fact) F.record(k.facts[F.key(fact)] || (k.facts[F.key(fact)] = F.blank()), right, right ? 99999 : 0, k.band); tick(k, right, 1); save(); }, onEnd });
  if (id === 'target') G.makeTarget(k, { onSolve: () => { tick(k, true, 5); save(); }, onEnd });
  if (id === 'line') G.numberLine(k, { onTick: (right) => { tick(k, right, 1); save(); }, onEnd });
}

/* A game's right answer counts for the rank, but a fact popped in Number
   Rush is recorded as a SLOW right (ms 99999): speed in a game with a
   keypad and falling bubbles is not recall speed, and it must not move a
   fact to "fluent" on its own. Misses are recorded — they are real. */

function daily() {
  const k = kid(R.h), d = dayKey();
  G.makeTarget(k, { daily: true, onSolve: () => { tick(k, true, 10); }, onEnd: (solved) => { (k.daily[d] || (k.daily[d] = {})).puzzle = !!solved || !!(k.daily[d] && k.daily[d].puzzle); save(); render(); } });
}

/* ------------------------------------------------------------- actions */

on('nav', (a) => go(a));
on('openStop', (id) => {
  const k = kid(R.h);
  // a stop opens on its story until the story has been read once
  R.ui.tab = STORIES[id] && !(k.stories && k.stories[id]) ? 'story' : 'learn';
  R.ui.watch = 0; R.ui.level = 1; R.ui.beat = 0; go('stop', id);
});
on('openStory', (id) => { R.ui.tab = 'story'; R.ui.beat = 0; R.ui.watch = 0; R.ui.level = 1; go('stop', id); });
on('openWorld', (id) => { R.ui.pick = null; R.ui.scrolled = null; go('world', id); });
on('shutWorld', () => toast('Not reached yet — finish the place before it on the road.'));
on('isle', (n) => { R.ui.isle = +n; render(); });
on('pickStop', (id) => {
  const k = kid(R.h), i = ROUTE.findIndex((n) => n.id === id);
  // a tap selects; a second tap on the selected stop goes in (the Bee's map rule)
  if (R.ui.pick === id && isOpen(R.h, k, i)) return id.startsWith('check:') ? fire('openCheck', id.slice(6)) : fire('openStop', id);
  R.ui.pick = id; render();
});
function beat(d) {
  const s = STORIES[R.ui.arg]; if (!s) return;
  const i = Math.max(0, Math.min(s.beats.length - 1, (R.ui.beat || 0) + d));
  if (i === (R.ui.beat || 0) && d > 0 && i === s.beats.length - 1) return;
  R.ui.beat = i; sfx.click();
  if (i === s.beats.length - 1) { const k = kid(R.h); if (!k.stories[R.ui.arg]) { k.stories[R.ui.arg] = true; save(); } }
  render(); speakBeat();
}
function speakBeat() {
  if (!R.ui.storyRead) return;
  const s = STORIES[R.ui.arg], b = s && s.beats[R.ui.beat || 0]; if (!b) return;
  const at = R.ui.beat;
  say(b.say, () => { if (R.ui.storyRead && R.ui.beat === at && R.ui.nav === 'stop' && R.ui.tab === 'story' && at < s.beats.length - 1) setTimeout(() => { if (R.ui.beat === at) beat(1); }, 450); });
}
on('beatNext', () => beat(1));
on('beatBack', () => beat(-1));
on('storyRead', () => { R.ui.storyRead = !R.ui.storyRead; if (!R.ui.storyRead) hush(); render(); speakBeat(); });
const sdkDone = (k, n, lv, hints) => { const p = k.puzzles.sudoku || (k.puzzles.sudoku = { right: 0, tries: 0, solved: {} }); p.tries++; p.solved[n] = (p.solved[n] || 0) + 1; tick(k, true, 5 * lv); };
on('pickFloor', (f) => { R.ui.floor = +f; render(); });
on('shutFloor', () => toast('Clear the floor below first.'));
on('climb', (f) => {
  f = +f; const k = kid(R.h); const lv = floorLevel(f, k.band);
  if (!k.quest) k.quest = {};
  if (isBoss(f)) {
    const n = sudokuSize(k.band, lv);
    return G.sudoku(k, n, lv, { onEnd: (solved, stars, hints) => {
      if (solved) { sdkDone(k, n, lv, hints); const q = k.quest[f] || (k.quest[f] = { stars: 0 }); q.stars = Math.max(q.stars, stars); if (stars >= 2 && !q.passed) { q.passed = true; confetti(60); toast(`Floor ${f} cleared — the stairs are open.`); } }
      save(); render(); } });
  }
  startRun('puzzle', `Floor ${f}`, floorSet(f, k.band), { floor: f, lv, sub: 'The Puzzle Tower · six puzzles, all kinds' });
});
on('practise', (a) => {
  const [id, l] = a.split(':'); const lv = +l || 1;
  startRun('puzzle', famOf(id).name, familySet(id, lv), { fam: id, lv, sub: ['', 'Easy', 'Medium', 'Hard'][lv] });
});
on('sudokuPlay', (l) => {
  const k = kid(R.h), lv = +l || 1, n = sudokuSize(k.band, lv);
  G.sudoku(k, n, lv, { onEnd: (solved, stars, hints) => { if (solved) sdkDone(k, n, lv, hints); save(); render(); } });
});
on('lib', (a) => {
  const id = R.ui.arg, tool = toolById[id]; if (!tool) return;
  const [name, ...rest] = String(a).split('|');
  tool.act(name, rest.join('|'), libCtx(id)); render();
});
on('openTool', (id) => { if (id === 'facts' || id === 'stories') return go(id); go('lib', id); });
on('goalGo', (how) => {
  const [a, b] = how.split(':');
  if (a === 'facts') { R.ui.factOp = b; return go('facts'); }
  if (a === 'world') return fire('openWorld', b);
  if (a === 'puzzles') return go('puzzles');
  go(a);
});
on('stopTab', (t) => { if (t !== 'turn' && R.run && R.run.kind === 'guided') R.run = null; R.ui.tab = t; render(); });
on('watch', () => { R.ui.watch = (R.ui.watch || 0) + 1; sfx.click(); render(); });
on('watchAll', () => { R.ui.watch = 99; render(); });
on('worldIntro', (w) => go('intro', w));
on('level', (l) => { R.ui.level = +l; render(); });

on('startGuided', (id) => startGuided(id));
on('gChoice', (c) => guidedSubmit(c));
on('gNext', () => guidedNext());

on('startDrill', (id) => {
  const t = byId[id], lv = R.ui.level || 1;
  const items = drill(t, 10, lv).map((q) => ({ ...q, trick: id }));
  startRun('drill', t.title, items, { trick: id, sub: ['', 'Warm-up', 'Stretch', 'Champion'][lv] });
});
on('openCheck', (wid) => {
  const k = kid(R.h), i = ROUTE.findIndex((n) => n.id === 'check:' + wid);
  if (!isOpen(R.h, k, i)) return toast('Pass the stops before it first.');
  const ts = tricksIn(wid);
  const items = shuffle(ts.flatMap((t) => drill(t, 3, 2).map((q) => ({ ...q, trick: t.id })))).slice(0, 12);
  startRun('check', `Checkpoint · ${worldOf(wid).name}`, items, { world: wid, sub: 'Twelve questions from every stop' });
});
on('startFacts', (op) => {
  const k = kid(R.h); if (op !== 'mix') { k.prefs.op = op; save(); }
  const list = F.session(k.facts, op, { band: k.band });
  const discover = list.some((f) => f.discover);
  const items = list.map((f) => ({ text: F.text(f), say: V.spoken(F.text(f)), ans: F.answer(f), fact: { op: f.op, a: f.a, b: f.b }, fresh: f.fresh, why: F.why(f) }));
  // show times and adding facts either way round: 8 × 7 is the same fact as 7 × 8
  items.forEach((q) => { if ((q.fact.op === '×' || q.fact.op === '+') && Math.random() < 0.5) q.text = `${q.fact.b} ${q.fact.op} ${q.fact.a}`; q.say = V.spoken(q.text); });
  startRun('facts', op === 'mix' ? 'Mixed facts' : F.OP_NAME[op], items, { op, sub: discover ? 'First, let\'s find out what you already know' : 'Twenty, picked for you' });
});
on('startTraps', (op) => {
  const k = kid(R.h);
  const items = F.session(k.facts, op, { only: 'traps' }).map((f) => ({ text: F.text(f), ans: F.answer(f), fact: { op: f.op, a: f.a, b: f.b }, why: F.why(f) }));
  if (!items.length) return toast('No traps right now.');
  startRun('facts', 'My traps', items, { op, sub: 'The facts that tripped you lately' });
});
on('factOp', (o) => { R.ui.factOp = o; R.ui.cell = null; render(); });
on('cell', (c) => { R.ui.cell = R.ui.cell === c ? null : c; render(); });

on('choose', (c) => { if (R.run && !R.run.fb) submit(c); });
on('nextQ', () => nextQ());
on('quitRun', () => { const r = R.run; R.run = null; hush(); if (r && r.kind === 'lib') return go('lib', r.lib); if (r && r.trick && r.kind === 'drill') { R.ui.tab = 'drill'; go('stop', r.trick); } else go(r && r.kind === 'check' ? 'atlas' : r && r.kind === 'facts' ? 'facts' : 'home'); });
on('endRun', () => { const r = R.run; R.run = null; if (r && r.kind === 'lib') return go('lib', r.lib); if (r && r.kind === 'drill') { R.ui.tab = 'drill'; go('stop', r.trick); } else if (r && r.kind === 'place') go('atlas'); else if (r && r.kind === 'check') go('atlas'); else go(r && r.kind === 'facts' ? 'facts' : 'home'); });

on('startContest', () => startContest());
on('cChoose', (c) => cAnswer(c));
on('cNext', () => cNext());
on('quitContest', () => { clearTimeout(timerT); R.contest = null; go('contest'); });

on('play', (id) => play(id));
on('daily', () => daily());

on('draftBand', (b) => { R.ui.draft.band = b; render(); });
on('draftAv', (a) => { R.ui.draft.avatar = a; render(); });
on('createKid', () => {
  const d = R.ui.draft; if (!d || !d.name.trim() || !d.band) return;
  const k = newKid(d.name, d.band, d.avatar);
  R.h.kids.push(k); R.h.active = k.id; R.ui.draft = null;
  Store.saveNow(R.h);
  go('start');
});
on('startPlace', () => {
  const items = RUNGS.map((r) => ({ ...r.q, say: V.spoken(r.q.text) }));
  startRun('place', 'Find my start', items, { sub: 'Stop whenever they get tricky' });
});
on('skipPlace', () => go('atlas'));
on('switchKid', (id) => { R.h.active = id; save(); go('home'); });
on('addKid', () => { R.ui.draft = null; go('welcome'); });

on('sound', () => { R.sound = !R.sound; setSound(R.sound); Store.saveDevice('sound', R.sound); if (R.sound) sfx.click(); render(); });
on('mode', () => {
  const cur = document.documentElement.getAttribute('data-mode') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-mode', nx); Store.saveDevice('mode', nx);
});
on('testerOff', () => { R.h.parent.tester = false; save(); render(); });

/* grown-ups */
function gateKey(k) {
  if (R.ui.gate) return;
  if (k === '⌫') R.ui.gateIn = R.ui.gateIn.slice(0, -1);
  else if (/^\d$/.test(k) && R.ui.gateIn.length < 4) R.ui.gateIn += k;
  if (R.ui.gateIn.length === 4) {
    if (!R.h.parent.pin) { R.h.parent.pin = R.ui.gateIn; R.ui.gate = true; Store.saveNow(R.h); toast('PIN set.'); }
    else if (R.ui.gateIn === R.h.parent.pin) R.ui.gate = true;
    else { toast('That is not the PIN.'); sfx.bad(); }
    R.ui.gateIn = '';
  }
  render();
}
on('lock', () => { R.ui.gate = false; go('home'); });
on('toggle', (key) => {
  const k = kid(R.h);
  if (key === 'tester') R.h.parent.tester = !R.h.parent.tester;
  if (key === 'read' && k) k.prefs.read = !k.prefs.read;
  save(); render();
});
on('setBand', (b) => { const k = kid(R.h); if (k) { k.band = b; save(); render(); } });
on('delKid', (id) => {
  if (R.ui.confirm !== id) { R.ui.confirm = id; return render(); }
  R.h.kids = R.h.kids.filter((k) => k.id !== id);
  if (R.h.active === id) R.h.active = R.h.kids[0] ? R.h.kids[0].id : null;
  R.ui.confirm = null; Store.saveNow(R.h); toast('Deleted.'); render();
});
on('backup', () => {
  const blob = new Blob([Store.exportBlob(R.h)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bizzing-maths-${dayKey()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
on('restore', () => {
  const inp = document.getElementById('restoreFile'); if (!inp) return;
  inp.onchange = async () => {
    try { const h = Store.importBlob(await inp.files[0].text()); R.h = h; Store.saveNow(h); toast('Restored.'); go('home'); }
    catch (e) { toast(e.message || 'That file could not be read.'); }
  };
  inp.click();
});

/* ------------------------------------------------------------- keys */

/* The on-screen keypad and the physical keyboard feed the same function. */
function padKey(k) {
  if (R.ui.nav === 'grownups') return gateKey(k);
  if (R.ui.nav === 'contest') return cKey(k);
  if (R.ui.nav === 'stop' && R.run && R.run.kind === 'guided') return guidedKey(k);
  if (R.ui.nav === 'run') return typeKey(k);
}
root.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.pad [data-k]'); if (!b || G.active()) return;
  e.preventDefault(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120);
  padKey(b.dataset.k);
});

addEventListener('keydown', (e) => {
  if (G.active()) { if (G.gameKey(e)) e.preventDefault(); return; }
  if (R.ui.nav === 'lib' && toolById[R.ui.arg] && toolById[R.ui.arg].key && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) { if (toolById[R.ui.arg].key(e, libCtx(R.ui.arg))) { e.preventDefault(); render(); return; } }
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const nav = R.ui.nav;
  const run = R.run;
  // choices: 1/2 (and y/n)
  const q = nav === 'run' && run && !run.fb && !run.over ? run.items[run.i] : nav === 'contest' && R.contest && (R.contest.phase === 'ask' || R.contest.phase === 'champ') ? R.contest.q : null;
  const gs = nav === 'stop' && run && run.kind === 'guided' && run.si < run.steps.length ? run.steps[run.si] : null;
  const choices = (q && q.choices) || (gs && gs.choices);
  if (choices) {
    const i = +e.key - 1; const yn = { y: 'Yes', n: 'No' }[e.key.toLowerCase()];
    const pick = choices[i] || (yn && choices.includes(yn) ? yn : null);
    if (pick) { e.preventDefault(); if (gs) return guidedSubmit(pick); if (nav === 'contest') return cAnswer(pick); return submit(pick); }
  }
  if (/^\d$/.test(e.key)) { e.preventDefault(); return padKey(e.key); }
  const alt = { '.': '.', '-': '−', '/': '/' }[e.key];
  if (alt && ['run', 'stop', 'contest'].includes(nav)) { e.preventDefault(); return padKey(alt); }
  if (e.key === 'Backspace') { e.preventDefault(); return padKey('⌫'); }
  if (e.key === 'Enter') {
    if (nav === 'run' && run && run.fb && (!run.fb.right || run.items[run.i].puzzle)) { e.preventDefault(); return nextQ(); }
    if (nav === 'contest' && R.contest && R.contest.phase === 'round') { e.preventDefault(); return cNext(); }
    if (nav === 'stop' && run && run.kind === 'guided' && run.si >= run.steps.length) { e.preventDefault(); return guidedNext(); }
    if (['run', 'contest', 'grownups'].includes(nav) || (nav === 'stop' && run)) { e.preventDefault(); return padKey('✓'); }
  }
  if (e.key === 'Escape' && nav === 'run') { fire('quitRun'); }
  if (nav === 'stop' && R.ui.tab === 'story') {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); fire('beatNext'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fire('beatBack'); }
  }
});

/* draft inputs (the name field) update without a re-render — a re-render per
   keystroke on a phone drops letters */
root.addEventListener('input', (e) => {
  const f = e.target.getAttribute && e.target.getAttribute('data-draft');
  if (f && R.ui.draft) {
    R.ui.draft[f] = e.target.value;
    const b = root.querySelector('[data-act=createKid]');
    if (b) b.disabled = !R.ui.draft.name.trim() || !R.ui.draft.band;
  }
});
root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'kname') fire('createKid'); });
/* a tool's text inputs (Number Explorer, Show Me the Working, Graphs): the
   value goes into the tool's ui state and the screen re-renders; render()
   restores focus and caret by id, so typing is never interrupted */
let libT = null;
root.addEventListener('input', (e) => {
  const f = e.target.getAttribute && e.target.getAttribute('data-lib-input');
  if (!f || R.ui.nav !== 'lib') return;
  libCtx(R.ui.arg).ui[f] = e.target.value;
  clearTimeout(libT); libT = setTimeout(render, 90);
});

bindRoot(root);

/* ------------------------------------------------------------- start */

if (!kid(R.h)) { R.ui.nav = 'welcome'; render(); }
else if (location.hash) readHash();
else go('home');

/* Offline: the service worker, registered from the page so it scopes to
   wherever the app is served (a GitHub project page is a sub-path). */
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.__bzm = { R, go, render, fire };   // for the headless checks, never for the app
