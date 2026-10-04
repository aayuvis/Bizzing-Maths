/* main.js — the shell: boot, hash routing, the question runner, the contest
   driver, keys, and every data-act in one table. */

import { R } from './runtime.js';
import { Store, DEMO, Family } from './store.js';
import { sampleHousehold, tasterHousehold, tasterStop } from './demo.js';
import { award, medalById } from './medals.js';
import { buy } from './shop.js';
import { applySkin } from './extras-actions.js';
import { ownsMode } from './extras.js';
import { snapshot } from './report.js';
/* The Contest Hall and its problem banks load on the hall's own route — 133 proved
   templates are not part of a first screen (the family budget, standard §11). */
let H = null, P = null, hallLoading = null;
function loadHall() {
  if (H) return Promise.resolve();
  return hallLoading || (hallLoading = Promise.all([import('./hall.js'), import('./papers/engine.js')]).then(([h, p]) => { H = h; P = p; }));
}
const whenHall = (fn) => (...a) => (H ? fn(...a) : loadHall().then(() => fn(...a)));
import { esc as escH, on, fire, bindRoot, sfx, setSound, toast, confetti, clearConfetti, say, hush } from './ui.js';
import * as J from './journey.js';
import { TRICKS, byId, drill, correct, stepRight, tricksIn, worldOf, learnCases } from './tricks.js';
import * as F from './facts.js';
import { onJourney } from './model.js';
import { readOn } from './model.js';
import { guideSay, FEEDBACK } from './lines.js';
import { newHousehold, newKid, kid, AVATARS, STARTER_AVATARS, tick, payout, trickRec, raiseLevel, scoreRun, RUNGS, placeFrom, CHECK_PASS, ROUTE, isOpen, rankOf } from './model.js';
import { newContest, childQuestion, playRound, championship, runOut, timeFor, bot } from './contest.js';
import * as G from './games.js';
import { dayKey, shuffle } from './rand.js';
import * as V from './views.js';
import * as V2 from './views2.js';
import { toolById, SHELF, isTool, loadTool } from './library/index.js';
import { STORIES, storiesReady, loadStories } from './stories.js';
import { floorSet, familySet, famOf, isBoss, floorLevel, FLOOR_PASS, sudokuSize, bandLevel } from './puzzles.js';
import { THEMES, themeOf, isTheme, applyTheme, syncThemeColor, byTheme, worldIsOpen } from './themes.js';
import * as V3 from './views3.js';
import * as MD from './mistakes.js';
import * as W from './widgets.js';
import { search as searchCore, searchMore } from './search.js';
import * as AU from './audio.js';
import { music } from './ui.js';
import { setSayRate } from './voice.js';
import { byAvatar, avatarCtx, ownsAvatar } from './avatars.js';
import { makeCert } from './cert.js';
import { bindShell } from './integration/bizzing-shell.js';
import { bindFeedKeys } from './integration/bizzing-feed.js';
import * as FV from './feed-view.js';
import { pinHash, pinOk } from './pin.js';
import { GAMES } from './arcade.js';
const GAME_IDS = GAMES.map((g) => g.id);
import { pay as feedPay } from './feed.js';

const root = document.getElementById('app');

/* ------------------------------------------------------------- boot */

/* ?demo is a sample child, ?demo=try a one-stop taster; both live in memory
   only (store.js DEMO) and are thrown away when the tab closes. */
const TRY = DEMO && /[?&]demo=try\b/.test(location.search);
R.h = DEMO ? (TRY ? tasterHousehold() : sampleHousehold()) : Store.loadHousehold() || newHousehold();
if (DEMO) Family.showDemo((kid(R.h) || {}).sampleWallet);
R.fromHive = /[?&]from=hive\b/.test(location.search);   // the Hive sent us: offer the way back
R.ui.cels = [];
R.sound = Store.loadDevice('sound', true);
/* the device's settings (standard §5): sound is the one-tap mute in ☰; the rest are Settings' */
R.dev = { sfx: Store.loadDevice('sfx', true), music: Store.loadDevice('music', true), volume: Store.loadDevice('volume', 0.4),
  calm: Store.loadDevice('calm', false), motion: Store.loadDevice('motion', false), text: Store.loadDevice('text', 'M'),
  mode: Store.loadDevice('mode', null), rate: Store.loadDevice('rate', 1) };
function applyDev() {
  AU.configure({ sound: R.sound, sfx: R.dev.sfx, music: R.dev.music, volume: R.dev.volume, calm: R.dev.calm });
  const el = document.documentElement;
  if (R.dev.motion) el.setAttribute('data-motion', 'reduced'); else el.removeAttribute('data-motion');
  el.setAttribute('data-text', R.dev.text || 'M');
  setSayRate(R.dev.rate || 1); music.refresh();
}
setSound(R.sound); applyDev();
/* Light/dark is the device's. data-mode is ALWAYS set, so themes.css never has
   to guess the system scheme: a saved choice wins, otherwise the system's,
   followed live until the child picks one with the moon button. */
const mode = Store.loadDevice('mode', null);
const sysDark = matchMedia('(prefers-color-scheme: dark)');
document.documentElement.setAttribute('data-mode', mode || (sysDark.matches ? 'dark' : 'light'));
sysDark.addEventListener && sysDark.addEventListener('change', (e) => {
  if (Store.loadDevice('mode', null)) return;
  document.documentElement.setAttribute('data-mode', e.matches ? 'dark' : 'light'); syncThemeColor();
});

function save() { Store.saveHousehold(R.h); }

/* ---------- the family layer: coins, milestones, medals, ceremonies.
   Coins come only from the standard events at the standard amounts (the
   family wallet enforces both, and the daily cap); they never touch xp, so
   they can never move a rank. */
/* `note` says in words what the coins were for; the wallet history shows it (standard §1.1) */
const earn = (k, ev, note) => {
  const now = Date.now(), n = Family.earn(k.name, ev, now);
  if (n && note) { const cn = k.coinNotes || (k.coinNotes = {}); cn[now] = String(note).slice(0, 60); const ks = Object.keys(cn); if (ks.length > 120) ks.sort().slice(0, ks.length - 120).forEach((x) => delete cn[x]); }
  return n;
};
const mile = (k, ev, label) => Family.milestone(k.name, ev, label);
function celebrate(c) { R.ui.cels.push(c); }
/* Award what the evidence now supports; each new medal gets its ceremony. */
function medals(k) {
  for (const m of award(k)) {
    celebrate({ kind: 'medal', id: m.id, title: m.name, say: `${m.did || m.desc} It is on your shelf now.` });
    mile(k, 'mastery', `Medal: ${m.name}`);
  }
}
/* Medals earned before the shelf existed go on it quietly, already seen — a
   child opening the new build should not sit through a parade. */
/* A medal earned but never seen (the tab closed on the ceremony) is
   celebrated on the next visit — once: tapping "Brilliant!" marks it seen. */
function unseen(k) {
  for (const [id, m] of Object.entries((k && k.medals) || {})) if (!m.seen && medalById[id] && !R.ui.cels.some((c) => c.id === id)) {
    const md = medalById[id];
    celebrate({ kind: 'medal', id, title: md.name, say: `${md.did || md.desc} It is on your shelf now.` });
  }
}
function backfill() {
  for (const k of R.h.kids) if (!k.sample && !k.medalsFilled) {
    for (const m of award(k)) k.medals[m.id].seen = true;
    k.medalsFilled = true;
  }
}

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
    tester: !!R.h.parent.tester,   // tester mode opens every stone and road stop; it never writes the record
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
const hashNow = () => '#/' + R.ui.nav + (R.ui.arg ? '/' + encodeURIComponent(R.ui.arg) : '');
function writeHash() {
  const h = hashNow();
  if (location.hash !== h) { selfHash = true; location.hash = h; }
}
function readHash() {
  const m = /^#\/([a-z]+)(?:\/(.+))?$/.exec(location.hash || '');
  if (!m) return go('home', null, true);
  go(m[1], m[2] ? decodeURIComponent(m[2]) : null, true);
}
// a hash naming the screen already up is not a navigation: closing a game steps back onto it (games.js)
addEventListener('hashchange', () => { if (selfHash) { selfHash = false; return; } if (location.hash === hashNow()) return; readHash(); });

const TRANSIENT = ['run', 'paper'];     // screens that cannot be deep-linked back into
/* Every screen a hash may name. Anything else — a typo, an old link, #/nonsense —
   lands on Home, never on the welcome hero (FIX-MATHS §1). A screen that needs an
   argument and is given a bad one (#/stop/bad, #/world/bad, #/lib/bad) lands on Home too. */
export const ROUTES = ['home', 'atlas', 'world', 'stories', 'puzzles', 'library', 'lib', 'goals', 'journey', 'intro', 'stop', 'facts',
  'arcade', 'play', 'contest', 'me', 'who', 'grownups', 'privacy', 'welcome', 'start', 'run', 'continue', 'shop', 'collection', 'medals',
  'settings', 'help', 'mistakes', 'search', 'wallet', 'feed', 'hall', 'paper'];
const head = (a) => String(a || '').split('|')[0];
const NEEDS_ARG = { stop: (a) => !!byId[head(a)], world: (a) => !!worldOf(a), lib: (a) => isTool(head(a)) || !!toolById[head(a)], intro: (a) => !!(worldOf(a) && worldOf(a).intro) };
/* DEEP LINKS (owner, 3 Oct 2026): a link goes to the THING, not the room it is in.
     #/stop/<id>|<tab>[|<n>]      a stop on its tab — learn (n: the worked idea), story (n: the beat), turn, drill
     #/lib/<tool>|<item>          a Library tool opened on one item: a word, a formula card, a journey stone
     #/facts/<op>[|<fact>]        the facts grid for an operation, with one fact picked
     #/journey/<n>                one level's road
     #/play/<game>  #/puzzles/<family>   straight into that game, or six puzzles of that family
   Returns the bare arg the screen expects; the rest is state set here. */
const TABS = ['story', 'learn', 'turn', 'drill'];
function deepen(nav, arg) {
  if (arg == null) return arg;
  const parts = String(arg).split('|'), [a, b, c] = parts;
  if (nav === 'stop' && b && TABS.includes(b)) {
    R.ui.tab = b; R.ui.watch = 0; R.ui.lcase = b === 'learn' ? Math.max(0, +c || 0) : 0; R.ui.beat = b === 'story' ? Math.max(0, +c || 0) : 0;
    return a;
  }
  if (nav === 'lib' && b) { R.ui.libOpen = { id: a, item: parts.slice(1).join('|') }; return a; }
  if (nav === 'facts') { if (F.OPS.includes(a)) { R.ui.factOp = a; R.ui.cell = b || null; } return null; }
  if (nav === 'journey') { const n = +a; if (n >= 1 && n <= 10) R.ui.jlv = n; return null; }
  return arg;
}

function go(nav, arg = null, fromHash = false) {
  // #/continue — the Hive's deep link — goes wherever Home's Continue would
  if (nav === 'continue') {
    const k = kid(R.h); if (!k) return go('welcome');
    const c = V.continueTarget(k);
    if (c.act === 'nav') return go(c.arg);
    history.replaceState(null, '', '#/home'); R.ui.nav = 'home';
    return fire(c.act, c.arg || undefined);
  }
  // #/mix — Home's five-minute card — starts today's mix; the address settles on Home
  if (nav === 'mix') {
    if (!kid(R.h)) return go('welcome');
    history.replaceState(null, '', '#/home'); R.ui.nav = 'home';
    return fire('dailyMix');
  }
  if (fromHash && TRANSIENT.includes(nav) && !R.run) nav = 'home';
  if (nav === 'arcade') nav = 'play';                       // the tab was renamed; old links still work
  // #/game/<id> is a game's own history entry (games.js): with a game up it is already handled;
  // without one (Forward, a reload) it opens the game from the Play room, as #/play/<id> does
  if (nav === 'game') { if (G.active()) return; nav = 'play'; }
  if (!ROUTES.includes(nav) || (NEEDS_ARG[nav] && !NEEDS_ARG[nav](arg))) { nav = 'home'; arg = null; if (fromHash) history.replaceState(null, '', '#/home'); }
  // a game or a puzzle family named in the link starts it — the address then settles on its room
  if ((nav === 'play' || nav === 'puzzles') && arg) {
    const what = arg; history.replaceState(null, '', `#/${nav}`); arg = null;
    if (nav === 'play' && GAME_IDS.includes(what.split(':')[0])) setTimeout(() => fire('play', what));
    if (nav === 'puzzles' && famOf(what)) { const k = kid(R.h); setTimeout(() => fire('practise', `${what}:${bandLevel(k ? k.band : '8-10')}`)); }
  }
  arg = deepen(nav, arg);
  if (nav !== R.ui.nav && !fromHash) R.ui.prev = R.ui.nav;
  R.ui.sheet = false; R.ui.drawer = false; R.ui.wallet = false;
  if (nav === 'search' && R.ui.nav !== 'search') { R.ui.q = R.ui.q || ''; R.ui.more = []; }
  if (nav !== 'paper' && R.paper) { keepDraft(); stopClock(); R.paper = null; }   // the draft is kept; the clock is a deadline
  if (nav !== 'run' && R.run && R.run.kind !== 'guided') R.run = null;
  if (nav !== 'stop' && R.run && R.run.kind === 'guided') R.run = null;
  if (nav === 'grownups' && R.ui.nav !== 'grownups') { R.ui.gate = false; R.ui.gateIn = ''; }
  if (nav !== 'me') R.ui.avEdit = false;
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
  if (n === 'help') return V3.viewHelp();
  if (n === 'grownups') return V.viewGrownups();
  if (!k || n === 'welcome') return V.viewWelcome();
  if (n === 'start') return V.viewStart();
  if (n === 'run' && R.run) return V.viewRun();
  switch (n) {
    case 'atlas': return onJourney(kid(R.h)) && R.ui.atlasView !== 'islands' ? V2.viewJourney() : V2.viewAtlasMap();
    case 'world': return worldOf(R.ui.arg) ? V2.viewWorld(R.ui.arg) : V2.viewAtlasMap();
    case 'stories': return V2.viewStories();
    case 'puzzles': return V2.viewTower();
    case 'library': return V2.viewLibrary(SHELF);
    case 'lib':
      if (toolById[R.ui.arg]) {
        const o = R.ui.libOpen, tool = toolById[R.ui.arg];
        if (o && o.id === R.ui.arg) { R.ui.libOpen = null; const ctx = libCtx(R.ui.arg); (tool.openItem || ((it, cx) => tool.act && tool.act('open', it, cx)))(o.item, ctx); }
        return V2.viewTool(tool, libCtx(R.ui.arg));
      }
      if (isTool(R.ui.arg)) { const id = R.ui.arg; loadTool(id).then(() => { if (R.ui.arg === id) render(); }); return '<section class="narrow"><div class="card center-card"><p class="muted">Opening the tool…</p></div></section>'; }
      return V2.viewLibrary(SHELF);
    case 'goals': return V2.viewGoals();
    case 'journey': return V2.viewJourney();
    case 'intro': return worldOf(R.ui.arg) && worldOf(R.ui.arg).intro ? V.viewWorldIntro(R.ui.arg) : V.viewAtlas();
    case 'stop': return V.viewStop(R.ui.arg);
    case 'facts': return V.viewFacts();
    case 'play': return V.viewArcade();
    case 'contest': return V.viewContest();
    case 'hall': case 'paper':
      if (!H) { loadHall().then(render); return '<section class="narrow"><div class="card center-card"><p class="muted">Opening the Contest Hall…</p></div></section>'; }
      return n === 'paper' && R.paper ? H.viewPaper() : H.viewHall();
    case 'me': return V.viewMe();
    case 'shop': return V3.viewShop();
    case 'collection': return V3.viewCollection();
    case 'medals': return V3.viewMedals();
    case 'settings': return V3.viewSettings();
    case 'help': return V3.viewHelp();
    case 'mistakes': return V3.viewMistakes();
    case 'search': return V3.viewSearch(searchCore(R.ui.q || ''), R.ui.more);
    case 'who': return V.viewWho();
    case 'feed':
      if (!FV.feedData() && !R.h.parent.feedOff) FV.loadFeed().then(() => { if (R.ui.nav === 'feed') render(); });
      return FV.viewFeed(save);
    default: return V.viewHome();
  }
}

let celShown = null;
let STORY_FAIL = false;   // offline before the stories chunk was ever cached: open on Learn rather than hang
const STORY_SCREENS = ['stop', 'world', 'stories', 'search', 'atlas', 'journey'];   // the screens that tell or list a story
function render() {
  if (!storiesReady() && !STORY_FAIL && STORY_SCREENS.includes(R.ui.nav)) loadStories().then(() => { render(); speakBeat(); }, () => { STORY_FAIL = true; if (R.ui.nav === 'stop' && R.ui.tab === 'story') { R.ui.tab = 'learn'; render(); } });
  const focusId = document.activeElement && document.activeElement.id;
  if (R.ui.cels.length && celShown !== R.ui.cels[0]) { const c = celShown = R.ui.cels[0]; sfx.level(); setTimeout(() => confetti(90), 250); if (readOn(kid(R.h))) setTimeout(() => say(`${c.title}. ${c.say}`), 700); }
  applyTheme(themeOf(kid(R.h), R.h));   // the active child's world; switching child switches it
  applySkin(kid(R.h));                  // and the road skin they wear (extras.js)
  document.documentElement.toggleAttribute('data-bz-dark', document.documentElement.getAttribute('data-mode') === 'dark');   // the avatar glow (§8)
  document.documentElement.toggleAttribute('data-nokid', !kid(R.h));   // no child yet: no empty avatar pill, no tabs (shell.css)
  root.innerHTML = V.shell(screen());
  for (const i of root.querySelectorAll('.bz-av img')) if (i.complete && i.naturalWidth) i.classList.add('in');   // already in memory: no placeholder flash
  if (root.querySelector('img[data-lsrc]')) import('./landing.js').then((m) => m.wire(root));   // the landing's screenshots, as they scroll near
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (el.setSelectionRange && el.value != null) el.setSelectionRange(el.value.length, el.value.length); } }
  armTimer();
  syncMusic();
  if (R.ui.cels.length) { const b = root.querySelector('.cel .btn'); if (b && document.activeElement !== b) b.focus(); }
  // a world board opens scrolled to the stop you are standing on (phones pan it)
  const sc = root.querySelector('.board-scroll[data-autoscroll]');
  if (sc && R.ui.scrolled !== R.ui.arg + ':' + R.ui.pick) {
    R.ui.scrolled = R.ui.arg + ':' + R.ui.pick;
    const x = +sc.dataset.autoscroll / 100 * sc.scrollWidth - sc.clientWidth / 2;
    sc.scrollLeft = Math.max(0, x);
  }
}
R.render = render;
/* an avatar card's picture has arrived: drop its placeholder (shell.css .bz-av img.in). One capturing
   listener for every card the app will ever draw — load does not bubble, but it does capture. */
document.addEventListener('load', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest('.bz-av')) t.classList.add('in'); }, true);

/* Music follows the screen (standard §11): Home has its own loop, every other screen its
   world's, a game its own (games.js starts that). It starts only after the child's first tap
   or key — a browser would not let it sound before, and so the composer is never part of the
   first load. */
let gestured = false;
function syncMusic() {
  if (!gestured || G.active() || !kid(R.h)) return;
  const want = R.ui.nav === 'home' ? 'home' : byTheme[themeOf(kid(R.h), R.h)].tune;
  if (music.wanted() !== want) music.start(want);
}
const firstGesture = () => { if (gestured) return; gestured = true; setTimeout(syncMusic, 0); };
addEventListener('pointerdown', firstGesture, { capture: true });
addEventListener('keydown', firstGesture, { capture: true });
/* the world's ambient life pauses whenever the page is hidden (standard §7) */
document.addEventListener('visibilitychange', () => document.documentElement.toggleAttribute('data-hidden', document.hidden));

/* ------------------------------------------------------------- the runner */

/* One runner serves the facts session, a trick's drill, a checkpoint and
   placement. A run is a list of questions; right answers auto-advance, a
   wrong one holds until the child moves on — Bizzing Bee's rule, because a
   wrong answer that flashes past teaches nothing. */

function startRun(kind, title, items, extra = {}) {
  clearConfetti();   // never over a question
  R.run = { kind, title, items, i: 0, input: '', fb: null, results: [], missed: [], t0: 0, over: false, ...extra };
  go('run');
  ask();
}

function ask() {
  const run = R.run; if (!run || run.over) return;
  run.t0 = performance.now(); run.input = ''; run.fb = null;
  run.w = W.init(run.items[run.i]);   // a question answered by building (widgets.js) starts empty
  render();
  const k = kid(R.h), q = run.items[run.i];
  if (readOn(k)) say(q.say || V.spoken(q.text));
}
/* A wrong answer holds until the child moves on, so its reply can be heard in
   full: "Not this time. It is fifty-six." A right one moves on by itself, and
   the chime says it. */
function speakFeedback(q, fb) { say([fb.given === '' ? FEEDBACK.late : FEEDBACK.wrong, FEEDBACK.itIs, String(q.ans)]); }

function patchAnswer(v) {
  const el = document.getElementById('ans');
  if (el) el.innerHTML = v ? escapeHtml(v) : '<span class="caret"></span>';
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function typeKey(k) {
  const run = R.run; if (!run || run.fb || run.over) return;
  const q = run.items[run.i]; if (q.choices) return;
  if (W.isWidget(q)) return widgetType(q, k);
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
  // the mistakes deck: a miss goes in (never placement, never a bonus question); its own review moves it on
  if (run.kind === 'mistakes' || (run.kind === 'mix' && q.mkey)) { const r = MD.answer(k, q.mkey, right); run.mk = run.mk || {}; if (r) run.mk[r] = (run.mk[r] || 0) + 1; }
  else if (!right && !q.bonus && !MD.NOT_A_MISTAKE.includes(run.kind)) MD.add(k, q, Date.now(), run.title);
  // record what this question is evidence of
  if (q.fact) F.record(k.facts[F.key(q.fact)] || (k.facts[F.key(q.fact)] = F.blank()), right, ms, k.band);
  if (run.kind !== 'place' && run.kind !== 'leveltest') tick(k, right, run.kind === 'facts' ? 1 : 2);
  // a right answer in PRACTICE earns 1 coin; tests and placement pay on passing, not per answer
  if (right && PRACTICE.includes(run.kind)) earn(k, 'answer');
  // the level test grows as it goes: each answer decides the next question's level
  if (run.kind === 'leveltest' && J.answer(run.st, right)) run.items.push(J.question(run.st));
  save();
  right ? sfx.good() : sfx.bad();
  render();
  if (!right && readOn(k)) speakFeedback(q, run.fb);
  // a puzzle holds on a right answer too, so its rule can be read
  if (q.puzzle) { const p = k.puzzles[q.puzzle] || (k.puzzles[q.puzzle] = { right: 0, tries: 0, solved: {} }); p.tries++; if (right) p.right++; save(); }
  if (right && !q.puzzle) setTimeout(() => { if (R.run === run && run.fb) nextQ(); }, fast ? 420 : 650);
  // placement stops after two misses in a row
  if (run.kind === 'place' && !right && run.results.length >= 2 && !run.results.at(-2).right) setTimeout(() => { if (R.run === run) finishRun(); }, 1400);
}

/* ------------------------------------------------------------- answering by building (widgets.js)

   The widget builds a value; submit() judges it exactly as it judges a typed one, so a right build
   moves on by itself and a wrong one holds until dismissed. Building waits for Check (or Enter):
   stepping a bar or a column through every value must not find the answer by sweeping. A number typed
   on the keyboard still works, as everywhere else, and shows in the widget as it is typed. */
function patchWidget() {
  const run = R.run, el = document.getElementById('widget'); if (!run || !el) return render();
  const q = run.items[run.i];
  el.outerHTML = W.view(q, run.w, { fb: run.fb });
  if (q.input === 'chart' && run.w.cur >= 0) { const b = document.querySelector(`#widget [data-hit="${run.w.cur}"]`); if (b) b.focus(); }
}
function widgetAct(a, arg) {
  const run = R.run; if (!run || run.fb || run.over) return;
  const q = run.items[run.i]; if (!W.isWidget(q)) return;
  W.act(q, run.w, a, arg); run.input = '';   // building takes over from anything typed
  patchWidget();
}
function widgetSubmit() {
  const run = R.run; if (!run || run.fb || run.over) return;
  const q = run.items[run.i]; if (!W.isWidget(q)) return;
  const v = run.input !== '' ? run.input : W.value(q, run.w);
  if (v !== '') submit(v);
}
function widgetType(q, k) {
  const run = R.run;
  if (k === '✓') return widgetSubmit();
  if (k === '⌫') run.input = run.input.slice(0, -1);
  else if ((/^\d$/.test(k) || (q.keys || []).includes(k)) && run.input.length < 9) run.input += k;
  else return;
  W.mirror(q, run.w, run.input);
  patchWidget();
  if (correct(q, run.input)) submit(run.input);   // a typed answer is taken the moment it is right, as everywhere
}
on('wf', (a) => widgetAct(a));
on('wb', (a) => widgetAct(a));
on('wCheck', () => widgetSubmit());
/* the keys: ←/→ and ↑/↓ build, Space shades, Enter checks (a focused button keeps its own Enter/Space) */
function widgetKey(e) {
  const run = R.run, q = run.items[run.i], k = e.key, t = e.target;
  if ((k === 'Enter' || k === ' ') && t && t.tagName === 'BUTTON' && t.closest && t.closest('#widget')) return 'native';
  if (/^Arrow| /.test(k)) run.w.kb = true;   // the cursor (a part, a column) is drawn once the keys are in use
  if (q.input === 'chart') {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[k];
    if (d) { widgetAct('cur', d); return true; }
    if ((k === 'Enter' || k === ' ') && run.w.cur >= 0) { submit(q.choices[run.w.cur]); return true; }
    return false;
  }
  if (q.input === 'fracbar') {
    const a = { ArrowRight: 'n+', ArrowLeft: 'n-', ArrowUp: 'k+', ArrowDown: 'k-' }[k];
    if (a) { widgetAct(a); return true; }
    if (k === ' ') { widgetAct('toggle'); if (R.run && R.run.w) { R.run.w.cur = Math.min(R.run.w.n - 1, R.run.w.cur + 1); patchWidget(); } return true; }
  }
  if (q.input === 'blocks') {
    if (k === 'ArrowLeft' || k === 'ArrowRight') { widgetAct('col', k === 'ArrowRight' ? 1 : -1); return true; }
    const d = { ArrowUp: '+', '+': '+', '=': '+', ArrowDown: '-', '-': '-' }[k];
    if (d) { widgetAct('hto'[run.w.col] + d); return true; }
  }
  if (k === 'Enter') { widgetSubmit(); return true; }
  return false;
}
/* touch: tap a part to shade it or clear it, or drag along the bar to paint every part you pass */
let paint = null;
root.addEventListener('pointerdown', (e) => {
  const p = e.target.closest && e.target.closest('#widget .wf-p'); if (!p || p.disabled) return;
  const run = R.run; if (!run || run.fb) return;
  e.preventDefault();
  const i = +p.dataset.part; paint = { on: !run.w.on.includes(i) };
  widgetAct('paint', [i, paint.on]);
});
addEventListener('pointermove', (e) => {
  if (!paint) return;
  const el = document.elementFromPoint(e.clientX, e.clientY), p = el && el.closest && el.closest('#widget .wf-p');
  if (p && R.run && R.run.w && R.run.w.on.includes(+p.dataset.part) !== paint.on) widgetAct('paint', [+p.dataset.part, paint.on]);
});
addEventListener('pointerup', () => { paint = null; });
addEventListener('pointercancel', () => { paint = null; });
/* a part clicked from the keyboard (Tab to it, Space or Enter) — a pointer has already been handled */
root.addEventListener('click', (e) => { const p = e.target.closest && e.target.closest('#widget .wf-p'); if (p && e.detail === 0) widgetAct('toggle', +p.dataset.part); });

const PRACTICE = ['facts', 'drill', 'puzzle', 'lib', 'secret', 'mistakes', 'warmup', 'mix'];

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
    k.last = { what: 'facts', title: `${right} of ${n}`, at: Date.now() };
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
      // three stars at this difficulty: next time the stop starts one step harder (audit E7)
      const up = raiseLevel(k, run.trick, run.lv, res.pct, avg <= budget);
      if (up) s.lines.push(`<b>Three stars — next time this stop starts at ${['', 'Warm-up', 'Stretch', 'Champion'][up]}.</b>`);
      if (res.gained && res.stars - res.gained < 2) { earn(k, 'stop', t.title); mile(k, 'stop', t.title); }   // first pass of this stop
      k.last = { what: res.stars === 3 ? 'stars' : 'stop', title: t.title, at: Date.now() };
      const jr = J.passed(k, run.trick, run.lv || 1), jp = J.progress(k);
      if (jp) {
        // on a road, the road decides what is next — not the world's own order
        s.buttons = s.buttons.filter((b) => !/Next stop:|openCheck/.test(b));
        if (jr.ticked) s.lines.push(`<b>Stop ${jp.done} of ${jp.total} on your Level ${jp.level} road.</b>`);
        if (jp.nextTest) s.buttons.unshift(jp.nextTest.kind === 'landtest' ? `<button class="btn primary" data-act="startLandTest" data-arg="${jp.nextTest.land.id}">Take the ${escapeHtml(jp.nextTest.land.name)} test</button>` : `<button class="btn primary" data-act="startLevelExam">Take the Level ${jp.level} test</button>`);
        else if (jp.next) s.buttons.unshift(`<button class="btn primary" data-act="openStep" data-arg="${jp.next.stop}|${jp.next.lv}">Next stop: ${escapeHtml(jp.next.t.title)}</button>`);
      }
    } else {
      s.lines.push('Seven right passes this stop. Look at the ones below, then have another go — or go back to “Your turn”.');
      k.last = { what: 'tried', title: t.title, at: Date.now() };
      s.buttons.push(`<button class="btn primary" data-act="startDrill" data-arg="${run.trick}">Try again</button>`);
    }
    s.buttons.push(`<button class="btn" data-act="openStop" data-arg="${run.trick}">Back to the stop</button>`);
  }
  if (run.kind === 'warmup') {
    const t = byId[run.trick];
    s.head = right === n ? 'Three out of three!' : `${right} out of ${n} — a start`;
    s.lines.push(right ? `<b>You can already do these.</b> Now see why the trick works — and how far it goes.` : 'Every one showed its working. Now see the trick — it makes these easy.');
    s.buttons.push(`<button class="btn primary" data-act="openStepLearn" data-arg="${run.trick}">Learn why: ${escapeHtml(t.title)}</button>`);
    if (right) confetti(40);
  }
  if (run.kind === 'mix') {
    s.head = `${right} of ${n} right`;
    s.lines.push(right === n ? '<b>Every one — that is today done.</b>' : 'Facts that slipped come back after a gap; nothing is lost for a miss.');
    s.buttons.push('<button class="btn primary" data-act="nav" data-arg="home">Home</button>');
    if (right >= n - 1) confetti(40);
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
        if (first) { sfx.level(); confetti(60); earn(k, 'stop', `floor ${run.floor} of the Puzzle Tower`); k.last = { what: 'floor', title: `floor ${run.floor}`, at: Date.now() }; }
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
  if (run.kind === 'secret') {
    const need = run.secret === 'duel' ? 2 : 1, won = right >= need;
    s.head = run.secret === 'duel' ? `You ${right} · ${bot(run.rival).name} ${n - right}` : won ? 'Found it!' : 'Not this time';
    if (won) {
      const first = J.secretFound(k, run.land, run.secret);
      s.lines.push(run.secret === 'duel' ? `<b>You win the clearing.</b> ${escapeHtml(bot(run.rival).name)} tips their hat.` : run.secret === 'wisp' ? `<b>Right — and here is why:</b> ${escapeHtml(run.items[0].why || '')}` : '<b>The chest swings open.</b>');
      const p = J.progress(k), n2 = p && p.level;
      if (first && n2 && J.emblem(k, n2, run.land)) s.lines.push('🏅 <b>Land fully explored</b> — every secret found and its gate passed.');
      confetti(first ? 50 : 20);
    } else s.lines.push(run.secret === 'duel' ? 'Two out of three wins it. Have another go whenever you like — the rival waits.' : 'It stays hidden for now. Come back and try again any time.');
    s.buttons.push('<button class="btn primary" data-act="nav" data-arg="atlas">Back to the map</button>');
  }
  if (run.kind === 'landtest' || run.kind === 'levelexam') {
    const lvl = run.kind === 'levelexam';
    const sc = lvl ? J.levelTestDone(k, run.items, run.results) : J.landTestDone(k, run.land, run.items, run.results);
    s.stars = sc.stars;
    s.head = `${sc.core} of ${sc.N} right${sc.bonusAsked ? ` · bonus ${sc.bonus} of ${sc.B} (×2)` : ''} · ${sc.points} points`;
    if (sc.pass) {
      if (lvl && sc.moved) {
        s.lines.push(`<span class="big-age">${escapeHtml(J.ageOf(sc.to))}</span>`);
        s.lines.push(`<b>Level ${sc.from} passed!</b> You are working at ${escapeHtml(J.ageOf(sc.to))} now. The Level ${sc.to} road — ${escapeHtml(J.levelOf(sc.to).name)} — is open.`);
        s.buttons.push('<button class="btn primary" data-act="nav" data-arg="atlas">See my new road</button>'); confetti(140); sfx.level();
        const coins = earn(k, 'mastery', `the Level ${sc.from} test`); mile(k, 'band', `Level ${sc.from} passed`);
        k.last = { what: 'level', title: `Level ${sc.to} — ${J.levelOf(sc.to).name}`, at: Date.now() };
        celebrate({ kind: 'level', n: sc.to, coins, title: `Level ${sc.from} passed`, say: `${sc.core} of ${sc.N} on the Level ${sc.from} test. You are working at ${J.ageOf(sc.to)} now, and the ${J.levelOf(sc.to).name} road is yours.` });
      } else if (lvl) {
        s.lines.push(sc.from === J.TOP ? '<b>Level 10 passed. You have walked all ten roads.</b>' : '<b>Passed.</b>');
        s.buttons.push('<button class="btn primary" data-act="nav" data-arg="atlas">My road</button>');
      } else {
        s.lines.push(`<b>${escapeHtml(run.title)} passed${sc.first ? ' — the next part of your road is open' : ''}.</b>`);
        const jp = J.progress(k);
        if (jp && jp.next) s.buttons.push(`<button class="btn primary" data-act="openStep" data-arg="${jp.next.stop}|${jp.next.lv}">Next stop: ${escapeHtml(jp.next.t.title)}</button>`);
        else if (jp && jp.nextTest && jp.nextTest.kind === 'leveltest') s.buttons.push(`<button class="btn primary" data-act="startLevelExam">Take the Level ${jp.level} test</button>`);
        confetti(sc.first ? 70 : 30); if (sc.first) sfx.level();
        if (sc.first) {
          const coins = earn(k, 'mastery', `the ${run.title}`); mile(k, 'world', run.title);
          k.last = { what: 'land', title: run.title.replace(/ test$/, ''), at: Date.now() };
          celebrate({ kind: 'land', coins, title: run.title.replace(/ test$/, '') + ' — crossed', say: `${sc.core} of ${sc.N} right${sc.bonus ? `, and ${sc.bonus} bonus question${sc.bonus > 1 ? 's' : ''} that belong to the next level` : ''}. That land is yours.` });
        }
      }
    } else {
      s.lines.push(`${sc.PASS} of the ${sc.N} main questions pass. Look at the ones below — each one is a stop you can go back to — then try again.`);
      s.buttons.push(lvl ? '<button class="btn primary" data-act="startLevelExam">Try the level test again</button>' : `<button class="btn primary" data-act="startLandTest" data-arg="${run.land}">Try again</button>`);
    }
    s.buttons.push('<button class="btn" data-act="nav" data-arg="atlas">Back to my road</button>');
  }
  if (run.kind === 'mistakes') {
    const m = run.mk || {};
    if (m.learned) s.lines.push(`<b>${V.nWord(m.learned)[0].toUpperCase() + V.nWord(m.learned).slice(1)} learned for good</b> — right after every gap.`);
    if (m.moved) s.lines.push(`${m.moved} moved on. ${m.moved > 1 ? 'They come' : 'It comes'} back once more, a little later.`);
    if (m.again) s.lines.push(`${m.again} come${m.again > 1 ? '' : 's'} back tomorrow. That is how they stick.`);
    s.buttons.push('<button class="btn primary" data-act="nav" data-arg="mistakes">Back to my mistakes</button>');
  }
  if (run.kind === 'leveltest') {
    const L = J.place(k, run.st.result), lv = J.levelOf(L);
    s.lines.push(`<span class="big-age">${escapeHtml(J.ageOf(L))}</span>`);
    s.lines.push(`Your journey is <b>Level ${L} — ${escapeHtml(lv.name)}</b>. ${escapeHtml(lv.blurb)}`);
    s.lines.push('<span class="muted">This is where to start, not a score. It is never shown in a report, and the journey moves you up as you finish it.</span>');
    s.buttons.push('<button class="btn primary" data-act="nav" data-arg="journey">Start my journey</button>');
    confetti(40);
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
  medals(k); snapshot(k);
  const before = rankOf(k.xp - right * 2);
  save();
  render();
  if (rankOf(k.xp).i > before.i && run.kind !== 'place' && run.kind !== 'leveltest') setTimeout(() => toast(`New rank: ${rankOf(k.xp).n}!`), 400);
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
  const k = kid(R.h); clearConfetti();
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
  const k = kid(R.h); if (readOn(k)) say(C.q.say || V.spoken(C.q.text));
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
  if (!right) MD.add(k, C.q, Date.now(), 'Mock contest');
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
    k.contest.done = (k.contest.done || 0) + 1; earn(k, 'contest'); medals(k);
    save(); return render();
  }
  if (c.champ) return cAsk(true);
  cAsk();
}

/* ------------------------------------------------------------- the Contest Hall */

/* A paper in progress lives on the child as a tiny draft — the band, the
   paper's number and the answers — because a fixed or fresh paper is rebuilt
   exactly from its seed. Closing the tab mid-paper loses nothing but time:
   the clock is a deadline, not a stopwatch, so it keeps running. */
let clockT = null;
function stopClock() { clearInterval(clockT); clockT = null; }
function startClock() {
  stopClock();
  clockT = setInterval(() => {
    const Pp = R.paper; if (!Pp || Pp.over) return stopClock();
    const left = Pp.endsAt - Date.now(), el = document.getElementById('ptime');
    if (el) { el.textContent = H.mmss(left); el.classList.toggle('low', left < 5 * 60e3); }
    if (left <= 0) { Pp.timeUp = true; finishPaper(); }
  }, 1000);
}
function sitPaper(band, no, draft = null) {
  const k = kid(R.h), p = P.paper(band, no);
  R.paper = { p, i: draft ? draft.i : 0, answers: draft ? draft.answers.slice() : [], endsAt: draft ? draft.endsAt : Date.now() + p.mins * 60e3, over: false };
  k.paperDraft = { band, no, i: R.paper.i, answers: R.paper.answers, endsAt: R.paper.endsAt }; save();
  go('paper'); startClock();
  if (R.paper.endsAt <= Date.now()) { R.paper.timeUp = true; finishPaper(); }
}
function keepDraft() { const k = kid(R.h), Pp = R.paper; if (k && Pp && !Pp.over) { k.paperDraft = { band: Pp.p.band, no: Pp.p.no, i: Pp.i, answers: Pp.answers, endsAt: Pp.endsAt }; save(); } }
function finishPaper() {
  const Pp = R.paper, k = kid(R.h); if (!Pp || Pp.over) return;
  stopClock(); Pp.over = true; Pp.sc = P.score(Pp.p, Pp.answers);
  P.record(k, Pp.p, Pp.sc); k.paperDraft = null;
  earn(k, 'contest'); medals(k); snapshot(k); save();
  k.last = { what: 'paper', title: typeof Pp.p.no === 'number' ? `Paper ${Pp.p.no}` : 'a fresh paper', at: Date.now() };
  sfx.level(); if (Pp.sc.pct >= 60) confetti(50);
  render(); scrollTo(0, 0);
}
on('hallPick', (i) => { const n = +i; if (R.ui.hsel === n) { const el = root.querySelector('.card.pick .btn.primary'); if (el) el.click(); return; } R.ui.hsel = n; sfx.click(); render(); });
on('hallPapers', () => { const el = document.getElementById('papers'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
on('pband', whenHall((b) => { if (P.BANDS[b]) { R.ui.pband = b; render(); } }));
on('paperStart', whenHall((a) => { const [band, n] = String(a).split('|'); const no = n === 'fresh' ? 'fresh-' + Date.now().toString(36) : +n; if (!P.BANDS[band]) return; sitPaper(band, no); }));
on('paperResume', whenHall(() => { const d = kid(R.h).paperDraft; if (d) sitPaper(d.band, d.no, d); }));
on('paperGo', (j) => { const Pp = R.paper; if (!Pp || Pp.over) return; const n = +j; if (n < 0 || n >= Pp.p.items.length) return; Pp.i = n; keepDraft(); render(); });
on('paperPick', (c) => {
  const Pp = R.paper; if (!Pp || Pp.over) return;
  Pp.answers[Pp.i] = c; sfx.click(); keepDraft(); render();
  // move on, as a paper is sat — the navigator goes back to anything
  const at = Pp.i; setTimeout(() => { if (R.paper === Pp && Pp.i === at && at < Pp.p.items.length - 1) { Pp.i++; keepDraft(); render(); } }, 380);
});
on('paperClear', () => { const Pp = R.paper; if (!Pp) return; Pp.answers[Pp.i] = undefined; keepDraft(); render(); });
on('paperFinish', () => {
  const Pp = R.paper; if (!Pp || Pp.over) return;
  const blank = Pp.p.items.length - Pp.answers.filter((a) => a != null).length;
  if (blank && R.ui.confirm !== 'paper') { R.ui.confirm = 'paper'; toast(`${blank} left blank — tap Finish again to hand it in.`); return; }
  R.ui.confirm = null; finishPaper();
});
on('paperQuit', () => { keepDraft(); stopClock(); R.paper = null; go('hall'); toast('Kept — the clock is still running. Carry on from the Contest Hall.'); });
function paperKey(e) {
  const Pp = R.paper; if (!Pp || Pp.over || R.ui.nav !== 'paper') return false;
  const L = { a: 0, b: 1, c: 2, d: 3, e: 4, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 }[e.key.toLowerCase()];
  const q = Pp.p.items[Pp.i];
  if (L != null && q.choices[L] != null) { fire('paperPick', q.choices[L]); return true; }
  if (e.key === 'ArrowRight') { fire('paperGo', String(Pp.i + 1)); return true; }
  if (e.key === 'ArrowLeft') { fire('paperGo', String(Pp.i - 1)); return true; }
  if (e.key === 'Backspace' || e.key === 'Delete') { fire('paperClear'); return true; }
  if (e.key === 'Enter') { fire('paperGo', String(Pp.i + 1)); return true; }
  return false;
}

/* ------------------------------------------------------------- games */

function play(arg, level = null) {
  const k = kid(R.h); clearConfetti();
  // a bonus mode (extras.js) is `<game>:<mode>`, locked until bought; it pays exactly what its game pays
  const [id, mode = null] = String(arg).split(':');
  if (mode && !ownsMode(k, arg)) return go('shop');
  const rec = k.games[arg] || (k.games[arg] = { best: null, plays: 0 });
  const onEnd = (score) => { rec.plays++; if (typeof score === 'number' && (rec.best == null || score > rec.best)) rec.best = score; save(); render(); };
  if (id === 'rush') G.numberRush(k, { mode, onTick: (right, fact) => { if (fact) F.record(k.facts[F.key(fact)] || (k.facts[F.key(fact)] = F.blank()), right, right ? 99999 : 0, k.band); payout(k, arg, right); save(); }, onEnd });
  if (id === 'target') G.makeTarget(k, { mode, onSolve: () => { payout(k, arg, true); save(); }, onEnd });
  if (id === 'line') G.numberLine(k, { mode, onTick: (right) => { payout(k, arg, right); save(); }, onEnd });
  if (id === 'cubes') G.cubeBuilder(k, { level, onTick: (right) => { payout(k, arg, right); save(); }, onEnd });
}

/* A game's right answer counts for the rank, but a fact popped in Number
   Rush is recorded as a SLOW right (ms 99999): speed in a game with a
   keypad and falling bubbles is not recall speed, and it must not move a
   fact to "fluent" on its own. Misses are recorded — they are real. */

function daily() {
  const k = kid(R.h), d = dayKey();
  G.makeTarget(k, { daily: true, onSolve: () => { payout(k, 'daily', true); }, onEnd: (solved) => { (k.daily[d] || (k.daily[d] = {})).puzzle = !!solved || !!(k.daily[d] && k.daily[d].puzzle); save(); render(); } });
}

/* ------------------------------------------------------------- actions */

on('nav', (a) => go(a));
on('openStop', (id) => {
  const k = kid(R.h);
  // a stop opens on its story until the story has been read once. Every stop has one (test/stories.mjs), so
  // this needs no wait: the words fill in when story-data.js arrives, and a device that cannot fetch it opens on Learn.
  R.ui.tab = (storiesReady() ? STORIES[id] : !STORY_FAIL) && !(k.stories && k.stories[id]) ? 'story' : 'learn';
  R.ui.watch = 0; R.ui.lcase = 0; R.ui.level = ((k.tricks[id] || {}).lvNext) || 1; R.ui.beat = 0; R.ui.jstep = null; storyVoice(k); go('stop', id); speakBeat();
});
on('openStory', (id) => { R.ui.tab = 'story'; R.ui.beat = 0; R.ui.watch = 0; R.ui.lcase = 0; R.ui.level = 1; storyVoice(kid(R.h)); go('stop', id); speakBeat(); });
/* 'Read it to me' starts on for a child whose questions are read aloud; once
   they switch it off it stays off for the rest of the visit. */
function storyVoice(k) { if (k && R.ui.storyFor !== k.id) { R.ui.storyFor = k.id; R.ui.storyRead = readOn(k); } }
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
  if (i === s.beats.length - 1) { const k = kid(R.h); if (!k.stories[R.ui.arg]) { k.stories[R.ui.arg] = true; medals(k); save(); } }
  render(); speakBeat();
}
function speakBeat() {
  if (!R.ui.storyRead || R.ui.nav !== 'stop' || R.ui.tab !== 'story') return;
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
  if (a === 'lib') return go('lib', b);
  go(a);
});
on('stopTab', (t) => { if (t !== 'turn' && R.run && R.run.kind === 'guided') R.run = null; R.ui.tab = t; hush(); render(); if (t === 'story') speakBeat(); });
on('watch', () => { R.ui.watch = (R.ui.watch || 0) + 1; sfx.click(); render(); });
on('watchAll', () => { R.ui.watch = 99; render(); });
on('learnCase', (i) => { R.ui.lcase = +i || 0; R.ui.watch = 0; R.ui.tab = 'learn'; sfx.click(); render(); });
on('worldIntro', (w) => go('intro', w));
on('level', (l) => { R.ui.level = +l; render(); });

on('startGuided', (id) => startGuided(id));
on('gChoice', (c) => guidedSubmit(c));
on('gNext', () => guidedNext());

on('startDrill', (id) => {
  const t = byId[id], lv = R.ui.level || 1;
  const items = drill(t, 10, lv).map((q) => ({ ...q, trick: id }));
  startRun('drill', t.title, items, { trick: id, lv, sub: ['', 'Warm-up', 'Stretch', 'Champion'][lv] });
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
/* 🔊: read this question again (the runner), or read this line (a guide, a road card) */
on('sayQ', () => { const run = R.run, q = run && run.items[run.i]; if (!q) return; if (!R.sound) return toast('Sound is off — turn it on at the top.'); if (run.fb && !run.fb.right) speakFeedback(q, run.fb); else say(q.say || V.spoken(q.text)); });
on('sayIt', (t) => { if (!R.sound) return toast('Sound is off — turn it on at the top.'); say(t); });
on('nextQ', () => nextQ());
on('quitRun', () => { const r = R.run; R.run = null; hush(); if (r && r.kind === 'mistakes') return go('mistakes'); if (r && r.kind === 'lib') return go('lib', r.lib); if (r && r.trick && r.kind === 'drill') { R.ui.tab = 'drill'; go('stop', r.trick); } else go(r && r.kind === 'check' ? 'atlas' : r && r.kind === 'facts' ? 'facts' : 'home'); });
on('endRun', () => { const r = R.run; R.run = null; if (r && r.kind === 'mistakes') return go('mistakes'); if (r && r.kind === 'lib') return go('lib', r.lib); if (r && r.kind === 'drill') { R.ui.tab = 'drill'; go('stop', r.trick); } else if (r && r.kind === 'place') go('atlas'); else if (r && ['leveltest', 'landtest', 'levelexam', 'secret'].includes(r.kind)) go('atlas'); else if (r && r.kind === 'check') go('atlas'); else go(r && r.kind === 'facts' ? 'facts' : 'home'); });

on('startContest', () => startContest());
on('cChoose', (c) => cAnswer(c));
on('cNext', () => cNext());
on('quitContest', () => { clearTimeout(timerT); R.contest = null; go('contest'); });

on('play', (id) => play(id));
on('cubesPlay', (l) => play('cubes', [1, 2, 3].includes(+l) ? +l : null));
on('daily', () => daily());

/* onboarding: one question per screen (views.js viewWelcome) */
const draft = () => R.ui.draft || (R.ui.draft = { name: '', band: '', avatar: STARTER_AVATARS[0], step: 0 });
on('obStart', () => { draft().go = true; sfx.click(); render(); });
on('obLand', () => { draft().go = false; render(); });
on('obBack', () => { const d = draft(); d.step = Math.max(0, (d.step || 0) - 1); render(); });
on('obNext', () => {
  const d = draft(), el = document.getElementById('kname');
  if (el) d.name = el.value;
  if (!String(d.name || '').trim()) { toast('Type a name first'); if (el) el.focus(); return; }
  d.step = 1; sfx.click(); render();
});
on('draftBand', (b) => { const d = draft(); d.band = b; d.step = 2; sfx.click(); render(); obSay(); });
on('draftAv', (a) => { const d = draft(); const was = d.step || 0; d.avatar = a; if (was === 2) d.step = 3; sfx.click(); render(); if (was === 2) obSay(); });
/* Octo reads the line aloud to a six- or seven-year-old, once their age is known */
function obSay() { const d = draft(); if (d.band === '6-7') say(guideSay(['name', 'band', 'face', 'world'][d.step || 0])); }
on('obTheme', (t) => { const d = draft(); d.theme = t; fire('createKid'); });
on('avEdit', () => { R.ui.avEdit = !R.ui.avEdit; render(); });
on('setAv', (a) => {
  const k = kid(R.h); if (!k || !AVATARS.includes(a)) return;
  if (!ownsAvatar(R.h, k, a)) return toast('Not yours yet — its card says how it is earned.');
  k.avatar = a; Store.saveNow(R.h); sfx.click(); render();
});
/* The Shop (standard §1, §8): fixed prices through the family engine; nothing random. */
on('buyAv', (id) => {
  const k = kid(R.h), a = byAvatar[id]; if (!k || !a) return;
  if (Family.buyAvatar(k.name, a, avatarCtx(R.h, k))) {
    (k.shop.avatars || (k.shop.avatars = [])).push(id); k.avatar = id; Store.saveNow(R.h);
    sfx.unlock(); sfx.coin(); toast(`${a.name} is yours — and you are wearing it.`);
  } else toast('Not yet — the card says what it needs.');
  render();
});
on('buyWorld', (n) => {
  n = +n; const k = kid(R.h), t = THEMES[n - 1]; if (!k || !t) return;
  if (Family.buyWorld(k.name, n, { plan: R.h.parent.plan, worlds: k.shop.worlds || [] })) {
    (k.shop.worlds || (k.shop.worlds = [])).push(n); k.prefs.theme = t.id; Store.saveNow(R.h);
    sfx.unlock(); toast(`${t.name} is open — and it is your world now.`);
  } else toast('Not enough coins yet — learning earns them.');
  render();
});
on('shopTab', (t) => { R.ui.shopTab = ['avatars', 'worlds', 'extras'].includes(t) ? t : 'avatars'; render(); });

on('wallet', () => {
  R.ui.wallet = !R.ui.wallet; R.ui.drawer = false; R.ui.sheet = false; render();
  const b = root.querySelector(R.ui.wallet ? '.wallet .tool' : '[data-bz=coins]'); if (b) b.focus();
});
on('setDev', (key) => {
  if (!['sfx', 'music', 'motion', 'calm'].includes(key)) return;
  R.dev[key] = !R.dev[key]; Store.saveDevice(key, R.dev[key]); applyDev();
  if (key === 'sfx' && R.dev.sfx) sfx.click(); render();
});
on('setRate', (v) => { R.dev.rate = v === 'slow' ? 0.85 : 1; Store.saveDevice('rate', R.dev.rate); applyDev(); render(); });
on('setMode', (v) => {
  R.dev.mode = v === 'light' || v === 'dark' ? v : null; Store.saveDevice('mode', R.dev.mode);
  document.documentElement.setAttribute('data-mode', R.dev.mode || (sysDark.matches ? 'dark' : 'light')); syncThemeColor(); render();
});
on('setText', (v) => { R.dev.text = ['S', 'M', 'L'].includes(v) ? v : 'M'; Store.saveDevice('text', R.dev.text); applyDev(); render(); });
on('back', () => go(R.ui.prev && R.ui.prev !== R.ui.nav ? R.ui.prev : 'home'));
on('searchOpen', (a) => {
  const [tool, x] = String(a).split('|'); R.ui.lib = R.ui.lib || {};
  const ui = R.ui.lib[tool] || (R.ui.lib[tool] = {});
  if (tool === 'dictionary') { ui.open = x; ui.q = x; } else if (tool === 'formulas') { ui.card = x; ui.tab = 'card'; }
  go('lib', tool);
});
/* Today's five minutes (audit F1): a few facts picked for you, mistakes that are due, the
   next stop on your road and one pattern puzzle — one short mixed session from Home. */
on('dailyMix', () => {
  const k = kid(R.h), items = [];
  for (const f of F.session(k.facts, k.prefs.op, { band: k.band }).slice(0, 6)) items.push({ text: F.text(f), say: V.spoken(F.text(f)), ans: F.answer(f), fact: { op: f.op, a: f.a, b: f.b }, fresh: f.fresh, why: F.why(f) });
  for (const m of MD.due(k).slice(0, 2)) items.push({ ...m.q, mkey: m.key });
  const p = J.progress(k), t = p && p.next ? byId[p.next.stop] : TRICKS.find((x) => (k.tricks[x.id] || {}).stars) || null;
  if (t) items.push(...drill(t, 3, p && p.next ? Math.min(2, p.next.lv) : 1).map((q) => ({ ...q, trick: t.id })));
  items.push(...familySet('patterns', bandLevel(k.band), 1));
  startRun('mix', 'Today’s five minutes', items, { sub: 'Facts, a stop, a puzzle — about five minutes' });
});
on('openStepLearn', (id) => { fire('openStop', id); R.ui.tab = 'learn'; render(); });
on('runHint', () => { if (R.run && !R.run.fb) { R.run.hinted = R.run.i; sfx.click(); render(); } });
on('startMistakes', () => {
  const k = kid(R.h), due = MD.due(k).slice(0, 10);
  if (!due.length) return toast('Nothing is ready yet — they come back after a gap.');
  startRun('mistakes', 'My mistakes', due.map((m) => ({ ...m.q, mkey: m.key })), { sub: 'They came back after a gap' });
});
on('cert', async (a) => {
  const [cid, id] = String(a).split('|'), c = R.h.kids.find((x) => x.id === cid); if (!c || !R.ui.gate) return;
  if (await makeCert(c, id)) toast('Saved as a picture on this device.');
});
on('setTarget', (a) => {
  const k = kid(R.h), [key, n] = String(a).split('|'); if (!k || !R.ui.gate || !['answers', 'stops'].includes(key)) return;
  k.prefs.targets = k.prefs.targets || { answers: 20, stops: 1, puzzle: 1 }; k.prefs.targets[key] = +n; save(); render();
});
on('createKid', () => {
  const d = R.ui.draft; if (!d || !d.name.trim() || !d.band) return;
  const k = newKid(d.name, d.band, d.avatar);
  if (d.theme) k.prefs.theme = d.theme;
  R.h.kids.push(k); R.h.active = k.id; R.ui.draft = null;
  sfx.level(); confetti(40);
  Store.saveNow(R.h);
  go('start');
});
on('startPlace', () => {
  const items = RUNGS.map((r) => ({ ...r.q, say: V.spoken(r.q.text) }));
  startRun('place', 'Find my start', items, { sub: 'Stop whenever they get tricky' });
});
on('skipPlace', () => go('atlas'));
on('roadShut', () => toast('That part of the road opens when everything before it is passed.'));
on('roadPick', (i) => {
  // a tap selects; a second tap on the selected one goes in (the Bee's map rule)
  const k = kid(R.h), p = J.progress(k), show = R.ui.jlv && p && R.ui.jlv !== p.level ? R.ui.jlv : p && p.level;
  if (R.ui.rpick === +i) {
    const nodes = (show === p.level ? p.nodes : J.roadOf(k, show)).filter((x) => x.kind !== 'land');
    const x = nodes[+i]; if (!x) return;
    if (!x.open && !R.h.parent.tester) return toast('That part of the road opens when everything before it is passed.');
    if (x.kind === 'stop') return fire('openStep', `${x.stop}|${x.lv}`);
    return x.kind === 'leveltest' ? fire('startLevelExam') : fire('startLandTest', x.land.id);
  }
  R.ui.rpick = +i; render();
  if (readOn(k)) { const b = root.querySelector('.pick .say-btn'); if (b) say(b.getAttribute('data-arg')); }
});
on('secret', (a) => {
  const [kind, landId] = a.split('|'), k = kid(R.h), s = J.SECRET_KINDS.find((x) => x.k === kind);
  const rival = kind === 'duel' ? J.secretsOf(k, landId).find((x) => x.k === 'duel').rival : null;
  let items = J.secretItems(k, landId, kind);
  if (kind === 'chest') { const fam = ['patterns', 'balance', 'space'][Math.floor(Math.random() * 3)]; items = familySet(fam, bandLevel(k.band), 1); }
  const title = kind === 'duel' ? `${bot(rival).name} challenges you!` : s.name;
  startRun('secret', title, items, { secret: kind, land: landId, rival, sub: kind === 'duel' ? 'Best of three — win two' : s.blurb });
});
on('atlasView', (v) => { R.ui.atlasView = v; go('atlas'); });
on('jlv', (n) => { R.ui.jlv = +n; render(); });
on('startLandTest', (landId) => {
  const k = kid(R.h), p = J.progress(k), t = p && p.nodes.find((x) => x.kind === 'landtest' && x.land.id === landId);
  if (!t || !t.open) return toast('Pass every stop in this land first.');
  const items = J.landTestItems(k, landId);
  startRun('landtest', `${t.land.name} test`, items, { land: landId, bonusFrom: J.LAND_N, sub: `${J.LAND_PASS} of ${J.LAND_N} to pass · then ${J.LAND_BONUS} bonus questions, double points` });
});
on('startLevelExam', () => {
  const k = kid(R.h), p = J.progress(k);
  if (!p || !p.nextTest || p.nextTest.kind !== 'leveltest') return toast('Pass every land test on the road first.');
  startRun('levelexam', `Level ${p.level} test`, J.levelTestItems(k), { bonusFrom: J.LEVEL_N, sub: `${J.LEVEL_PASS} of ${J.LEVEL_N} to pass · then ${J.LEVEL_BONUS} bonus questions, double points` });
});
on('skipBonus', () => { if (R.run && !R.run.over) finishRun(); });
/* "Start at Level 1" goes straight to a question (audit A3, §16: the first question in ≤ 5 taps):
   three warm-up questions on the road's first stop, at its easiest — a first win before
   anything is explained (A8) — then the stop itself, to learn why it works. */
on('startLevel1', () => {
  const k = kid(R.h); J.place(k, 1); R.ui.jlv = null; save();
  const p = J.progress(k), t = p && p.next ? byId[p.next.stop] : null;
  if (!t) return go('journey');
  startRun('warmup', `${t.title} — a warm-up`, drill(t, 3, 1).map((q) => ({ ...q, trick: t.id })), { trick: t.id, lv: 1, sub: 'Three to start — you can do these' });
});
on('startLevelTest', () => {
  const k = kid(R.h), st = J.newTest(k.band);
  startRun('leveltest', 'Find my level', [J.question(st)], { st, sub: 'It moves up and down to find where you are' });
});
on('openStep', (a) => {
  const [id, lv] = a.split('|'), road = J.onRoad(kid(R.h), id);
  if (road && !road.open && !R.h.parent.tester) return toast(`Stop ${road.n} opens when the one before it is passed.`);
  fire('openStop', id); R.ui.level = +lv || 1; R.ui.jstep = { stop: id, lv: +lv || 1 }; render();
});
on('switchKid', (id) => {
  // a different child is a different record: drop every per-screen state that
  // could carry the last child's run, draft or tool into this one
  if (!R.h.kids.some((c) => c.id === id)) return;
  R.h.active = id; R.run = null; R.contest = null; R.ui.lib = {}; R.ui.draft = null; R.ui.cels = []; unseen(kid(R.h));
  save(); go('home');
});
on('sheet', () => { R.ui.sheet = !R.ui.sheet; render(); if (R.ui.sheet) { const b = root.querySelector('.sheet button'); if (b) b.focus(); } });
on('celDone', () => {
  const c = R.ui.cels.shift(), k = kid(R.h);
  if (c && c.kind === 'medal' && k && k.medals[c.id]) { k.medals[c.id].seen = true; save(); }
  if (R.ui.cels.length) { sfx.bell(); }
  render();
});
on('buyFrame', (id) => {
  const k = kid(R.h); if (!k) return;
  if (buy(k, id, (price, why) => Family.spend(k.name, price, why))) { sfx.coin(); toast('Yours — and you are wearing it.'); save(); }
  else toast('Not enough coins yet — right answers earn them.');
  render();
});
on('wearFrame', (id) => { const k = kid(R.h); if (!k) return; k.shop.worn.frame = id || null; save(); render(); });
/* adding a child is a grown-up's job (standard §3): behind the PIN */
on('addKid', () => { R.ui.draft = null; if (!R.ui.gate || R.ui.nav !== 'grownups') { R.ui.after = 'addKid'; return go('grownups'); } go('welcome'); });

on('sound', () => { R.sound = !R.sound; setSound(R.sound); Store.saveDevice('sound', R.sound); applyDev(); if (R.sound) sfx.click(); render(); });
on('mode', () => {
  const cur = document.documentElement.getAttribute('data-mode') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark';
  if (R.longPressed) { R.longPressed = false; return; }
  document.documentElement.setAttribute('data-mode', nx); Store.saveDevice('mode', nx); R.dev.mode = nx; syncThemeColor(); render();
});
/* hold the sun/moon for the world picker (standard §3) */
let lpT = 0;
root.addEventListener('pointerdown', (e) => { if (!e.target.closest || !e.target.closest('[data-bz=theme]')) return; clearTimeout(lpT); lpT = setTimeout(() => { R.longPressed = true; go('settings'); const el = document.querySelector('.theme-card[aria-checked="true"]'); if (el) el.focus(); }, 550); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => root.addEventListener(ev, () => clearTimeout(lpT)));
/* themes belong to the child: chosen on their page, applied at once */
on('theme', (id) => {
  const k = kid(R.h); if (!k || !isTheme(id)) return;
  if (!worldIsOpen(R.h, k, byTheme[id].n)) return go('shop');
  k.prefs.theme = id; save(); render();
  const el = document.getElementById('theme-' + id); if (el) el.focus();
});
on('themes', () => {
  go('settings');
  const el = document.querySelector('[data-sec=look]'); if (el) el.scrollIntoView({ block: 'start' });
  const on1 = document.querySelector('.theme-card[aria-checked="true"]'); if (on1) on1.focus({ preventScroll: true });
});
on('testerOff', () => { R.h.parent.tester = false; save(); render(); });

/* grown-ups */
function gateKey(k) {
  if (R.ui.gate) return;
  if (k === '⌫') R.ui.gateIn = R.ui.gateIn.slice(0, -1);
  else if (/^\d$/.test(k) && R.ui.gateIn.length < 4) R.ui.gateIn += k;
  if (R.ui.gateIn.length === 4) {
    if (!R.h.parent.pinHash) { R.h.parent.pinHash = pinHash(R.ui.gateIn); R.ui.gate = true; Store.saveNow(R.h); toast('PIN set.'); }
    else if (pinOk(R.ui.gateIn, R.h.parent.pinHash)) { R.ui.gate = true; if (R.ui.after === 'addKid') { R.ui.after = null; R.ui.gateIn = ''; R.ui.draft = null; return go('welcome'); } }
    else { toast('That is not the PIN.'); sfx.bad(); }
    R.ui.gateIn = '';
  }
  render();
}
on('lock', () => { R.ui.gate = false; go('home'); });
on('toggle', (key) => {
  const k = kid(R.h);
  if (key === 'tester') R.h.parent.tester = !R.h.parent.tester;
  if (key === 'feed' && R.ui.gate) R.h.parent.feedOff = !R.h.parent.feedOff;
  if (key === 'plan' && R.ui.gate) R.h.parent.plan = R.h.parent.plan === 'family' ? 'free' : 'family';
  if (key === 'puzzleTarget' && k && R.ui.gate) { k.prefs.targets = k.prefs.targets || { answers: 20, stops: 1, puzzle: 1 }; k.prefs.targets.puzzle = k.prefs.targets.puzzle === 0 ? 1 : 0; }
  if (key === 'sound') return fire('sound');
  if (key === 'read' && k) k.prefs.read = !readOn(k);
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

/* the avatar picker: arrows move focus through the 6-wide grid of all five
   packs (up/down cross between packs), Home/End jump; Enter/Space choose,
   natively, because every face is a button */
function avKey(e) {
  const t = e.target; if (!t || !t.classList || !t.classList.contains('av-pick')) return false;
  const all = [...t.closest('[data-avgrid]').querySelectorAll('.av-pick')], i = all.indexOf(t);
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 }[e.key];
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : step != null ? i + step : null;
  if (j == null) return false;
  e.preventDefault();
  const n = all[Math.max(0, Math.min(all.length - 1, j))];
  all.forEach((b) => b.setAttribute('tabindex', b === n ? '0' : '-1'));
  n.focus(); n.scrollIntoView({ block: 'nearest' });
  return true;
}
addEventListener('keydown', (e) => {
  if (G.active()) { if (G.gameKey(e)) e.preventDefault(); return; }
  // the ☰ drawer is the shell's own (bindShell: Esc, focus, Tab); the wallet is ours
  { const d = document.querySelector('[data-bz=drawer]'); if (d && !d.hidden) return; }
  if (e.key === 'Escape' && R.ui.wallet) { e.preventDefault(); return fire('wallet'); }
  if (avKey(e)) return;
  if (!(e.metaKey || e.ctrlKey || e.altKey) && paperKey(e)) { e.preventDefault(); return; }
  // a question answered by building: its own keys first (widgets.js)
  if (R.ui.nav === 'run' && R.run && !R.run.fb && !R.run.over && W.isWidget(R.run.items[R.run.i]) && !(e.metaKey || e.ctrlKey || e.altKey)) {
    const h = widgetKey(e); if (h === 'native') return; if (h) { e.preventDefault(); return; }
  }
  if (R.ui.nav === 'lib' && toolById[R.ui.arg] && toolById[R.ui.arg].key && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) { if (toolById[R.ui.arg].key(e, libCtx(R.ui.arg))) { e.preventDefault(); render(); return; } }
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // the theme picker is a radio group: arrows move the choice and apply it (Enter/Space click it)
  if (t && t.classList && t.classList.contains('theme-card') && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const open = THEMES.filter((x) => worldIsOpen(R.h, kid(R.h), x.n));     // arrows move among the open worlds only
    const i = open.findIndex((x) => x.id === (t.dataset.theme || t.dataset.arg)), d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const nx = open[(i + d + open.length) % open.length].id;
    fire('theme', nx); const el = document.getElementById('theme-' + nx); if (el) el.focus(); return;
  }
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
  if (e.key === 'Escape' && R.ui.cels.length) return fire('celDone');
  if (e.key === 'Escape' && R.ui.sheet) return fire('sheet');
  if (e.key === 'Escape' && nav === 'run') { fire('quitRun'); }
  if (e.key.toLowerCase() === 'r' && nav === 'run' && run && !run.over) { e.preventDefault(); fire('sayQ'); }
  if (nav === 'stop' && R.ui.tab === 'story') {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); fire('beatNext'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fire('beatBack'); }
  }
  // Learn: → shows the next step, then moves to the next idea; ← goes back an idea
  if (nav === 'stop' && (R.ui.tab || 'learn') === 'learn' && !run) {
    const t = byId[R.ui.arg], n = t ? learnCases(t).length : 1, ci = R.ui.lcase || 0;
    if (e.key === 'ArrowRight') { e.preventDefault(); if ((R.ui.watch || 0) < t.work(learnCases(t)[ci].q).length) fire('watch'); else if (ci < n - 1) fire('learnCase', String(ci + 1)); }
    if (e.key === 'ArrowLeft' && ci > 0) { e.preventDefault(); fire('learnCase', String(ci - 1)); }
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
root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'kname') fire('obNext'); });
/* search as you type: the app's own index at once, the Dictionary and Formula Book a moment later */
let sT = null;
root.addEventListener('input', (e) => {
  if (!e.target.hasAttribute || !e.target.hasAttribute('data-search')) return;
  const q = R.ui.q = e.target.value; R.ui.more = q.trim().length > 1 ? null : [];
  render(); clearTimeout(sT);
  if (q.trim().length > 1) sT = setTimeout(() => searchMore(q).then((m) => { if (R.ui.q === q && R.ui.nav === 'search') { R.ui.more = m; render(); } }).catch(() => { R.ui.more = []; render(); }), 160);
});
root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-search')) { const b = root.querySelector('.results button'); if (b) b.click(); } });
/* type-ahead under the top bar's search (audit C4): the first six of the app's own index as the
   child types, without a re-render (so the box keeps its focus); Enter still opens the full page. */
let ta = null;
const taHide = () => { if (ta) ta.hidden = true; };
function typeAhead(input) {
  const q = input.value.trim(), res = q ? searchCore(q, 6) : [];
  if (!ta) {
    ta = document.createElement('div'); ta.className = 'ta-list'; ta.id = 'ta-list'; ta.setAttribute('role', 'listbox'); ta.setAttribute('aria-label', 'Suggestions');
    document.body.appendChild(ta);
    ta.addEventListener('mousedown', (e) => e.preventDefault());           // keep the box focused until the tap lands
    ta.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; taHide(); const box = document.querySelector('[data-bz="search"] input'); if (box) box.blur(); fire(b.dataset.act, b.dataset.arg || undefined); });
    ta.addEventListener('keydown', (e) => {
      const bs = [...ta.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < bs.length - 1) { e.preventDefault(); bs[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) bs[i - 1].focus(); else { const box = document.querySelector('[data-bz="search"] input'); if (box) box.focus(); } }
      if (e.key === 'Escape') { taHide(); const box = document.querySelector('[data-bz="search"] input'); if (box) box.focus(); }
    });
  }
  if (!res.length) return taHide();
  const r = input.getBoundingClientRect(), w = Math.min(Math.max(r.width, 300), innerWidth - 16);
  ta.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px'; ta.style.top = (r.bottom + 6) + 'px'; ta.style.width = w + 'px';
  ta.innerHTML = res.map((x) => `<button type="button" role="option" data-act="${escH(x.act)}" data-arg="${escH(x.arg)}"><b>${escH(x.title)}</b><span>${escH(x.sub)}</span></button>`).join('')
    + `<button type="button" role="option" class="ta-all" data-act="taAll" data-arg="${escH(q)}">All results for “${escH(q)}”</button>`;
  ta.hidden = false;
}
on('taAll', (q) => { R.ui.q = q; R.ui.more = null; go('search'); if (q.length > 1) searchMore(q).then((m) => { if (R.ui.q === q && R.ui.nav === 'search') { R.ui.more = m; render(); } }).catch(() => {}); });
document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('[data-bz="search"]')) typeAhead(e.target); });
document.addEventListener('keydown', (e) => {
  if (!e.target.closest || !e.target.closest('[data-bz="search"]') || !ta || ta.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); const b = ta.querySelector('button'); if (b) b.focus(); }
  if (e.key === 'Escape') taHide();
});
document.addEventListener('focusout', () => setTimeout(() => { if (ta && !ta.contains(document.activeElement) && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-bz="search"]'))) taHide(); }));
document.addEventListener('submit', taHide);
addEventListener('hashchange', taHide);
/* the one volume slider: no re-render while it moves, a click to hear it when it stops */
root.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.dev === 'volume') { R.dev.volume = Math.max(0, Math.min(1, +e.target.value / 100)); Store.saveDevice('volume', R.dev.volume); applyDev(); } });
root.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.dev === 'volume') sfx.click(); });
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
/* My Feed (standard §6a): a card's question is answered by a tap or by keys 1–4 on the focused
   card; a right answer pays once, as 'answer'; a wrong one holds until Continue. j/k and the
   arrows step card to card (the family's bindFeedKeys). Scrolling earns nothing. */
function feedRefocus(id) { const c = root.querySelector(`.bzf-card[data-id="${CSS.escape(id)}"]`); if (c) { const b = c.querySelector('[data-bzf=cont]') || c; b.focus({ preventScroll: true }); } }
root.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-bzf]'); if (!b || R.ui.nav !== 'feed') return;
  const id = b.dataset.id, k = kid(R.h); if (!k) return;
  if (b.dataset.bzf === 'ans') FV.answer(id, b.dataset.o, { pay: (cid) => { if (feedPay(k, cid)) earn(k, 'answer', 'a question in My Feed'); }, good: () => sfx.good(), bad: () => sfx.bad() });
  else if (b.dataset.bzf === 'cont') FV.cont(id);
  save(); render(); feedRefocus(id);
});
addEventListener('keydown', (e) => {
  if (R.ui.nav !== 'feed' || !/^[1-4]$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
  const card = document.activeElement && document.activeElement.closest && document.activeElement.closest('.bzf-card'); if (!card) return;
  const opt = card.querySelectorAll('.bzf-opt:not(:disabled)')[+e.key - 1]; if (!opt) return;
  e.preventDefault(); e.stopImmediatePropagation(); opt.click();
}, true);
bindFeedKeys();
/* Bee's chrome: one delegated binding for ☰ (open, Esc, focus back), and the bar's buttons */
bindShell({
  onTheme: () => fire('mode'), onLock: () => go('grownups'), onKid: () => fire('sheet'), onCoins: () => fire('wallet'), onSound: () => fire('sound'),
  onSearch: (q) => { R.ui.q = q; R.ui.more = null; go('search'); if (q.length > 1) searchMore(q).then((m) => { if (R.ui.q === q && R.ui.nav === 'search') { R.ui.more = m; render(); } }).catch(() => {}); },
});

/* ------------------------------------------------------------- start */

backfill();
unseen(kid(R.h));
for (const k of R.h.kids) if (!k.sample) snapshot(k);   // this week's line on the report card
if (!DEMO) Family.track(() => (kid(R.h) || {}).name);   // the Hive counts active minutes, per child
if (!kid(R.h)) { R.ui.nav = 'welcome'; render(); }
else if (TRY) fire('openStop', tasterStop());
else if (location.hash) readHash();
else go('home');

/* Offline: the service worker, registered from the page so it scopes to
   wherever the app is served (a GitHub project page is a sub-path). */
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.__bzm = { R, go, render, fire, J, DEMO, tricksIn, startRun, feedGroups: () => ({ loaded: FV.groupsLoaded().sort(), needed: FV.sessionGroups() }) };   // for the headless checks, never for the app
