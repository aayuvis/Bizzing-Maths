/* views.js — every screen, as a function from state to a string.
   Views never compute progress; model.js, facts.js and contest.js do. */

import { R } from './runtime.js';
import { esc, cls, nWord } from './ui.js';
import * as J from './journey.js';
import { TRICKS, WORLDS, byId, worldOf, tricksIn, example, learnCases, droot, correct, engineReady } from './tricks.js';
import * as W from './widgets.js';
import { LEVELS } from './levels.js';
import { TRY } from './landing-try.js';
import { OPS, OP_NAME, tally, grid, parseKey, why, text as ftext, STATE_LABEL, state as fstate } from './facts.js';
import { GUIDE, guideSay } from './lines.js';
import { BANDS, AVATARS, STARTER_AVATARS, AVATAR_PACKS, AVATAR_NAME, avatarFile, RANKS, rankOf, kid, ROUTE, isOpen, frontier, nodeDone, trickRec, atlasSummary, PASS, readOn } from './model.js';
import { RIVALS, bot, live, timeFor } from './contest.js';
import { keypad } from './keypad.js';
import { fig } from './figs.js';
import { storyTab, goalsReport } from './views2.js';
import { summary } from './objectives.js';
import { greetingLine } from './greeting.js';
import { seeded, int, dayKey } from './rand.js';
import { THEMES, themeOf, worldIsOpen, plate } from './themes.js';
import { certsFor } from './cert.js';
import { Family } from './store.js';
import { MEDALS, medalStates, earnedCount, medalById } from './medals.js';
import { FRAMES, owns, worn } from './shop.js';
import { arcadeModes } from './extras-view.js';
import { reportCard } from './report.js';
import { icon, glyph } from './icons.js';
import { walletSheet, octo, worldStage, HIVE as HIVE3 } from './views3.js';
import { shell as bzShell, home as bzHome } from './integration/bizzing-shell.js';
import * as MD from './mistakes.js';
import { HEROES, GAMES } from './arcade.js';
import { challengeOf, doneToday, BONUS_EVENT } from './challenge.js';
import { ownsAvatar, byAvatar } from './avatars.js';
import { TIERS } from './integration/bizzing-avatars.js';

/* ------------------------------------------------------------- helpers */

/* An id with no file (a child from some older build) draws as the first
   picker face rather than a broken image — model.js avatarFile(). */
export const av = (id, size = 48, alt = '') =>
  `<img class="av" src="avatars/${esc(avatarFile(id))}.webp" width="${size}" height="${size}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

/* The child's own face, in the frame they bought (shop.js). Only ever the
   child's — Aryabhata and the rivals are drawn with plain av(). */
export const mine = (k, size = 48, alt = '') => { const f = worn(k); return f ? `<span class="frame fr-${f}">${av(k.avatar, size, alt)}</span>` : av(k.avatar, size, alt); };

/* The avatar picker: five labelled packs of six, all free. One tab stop (the
   chosen face); arrow keys move through the grid (main.js avKey), Enter or
   Space chooses; a tap chooses. Used by the welcome form and by viewMe. */
export function avatarPicker(cur, act, where) {
  const on = AVATARS.includes(cur) ? cur : AVATARS[0];
  return `<div class="av-packs" data-avgrid>${AVATAR_PACKS.map((p) => `
    <div class="av-pack" role="radiogroup" aria-labelledby="avp-${where}-${p.id}">
      <p class="av-pack-h" id="avp-${where}-${p.id}"><b>${esc(p.name)}</b> <span>${esc(p.blurb)}</span></p>
      <div class="avs">${p.avatars.map((a) => `<button id="av-${where}-${a}" class="av-pick${cur === a ? ' on' : ''}" role="radio" aria-checked="${cur === a}" tabindex="${on === a ? 0 : -1}" data-act="${act}" data-arg="${a}" aria-label="${esc(AVATAR_NAME[a] || a)}" title="${esc(AVATAR_NAME[a] || a)}">${av(a, 64)}</button>`).join('')}</div>
    </div>`).join('')}</div>`;
}

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.75 5.6 6.15.9-4.45 4.3 1.05 6.1L12 17.2l-5.5 2.9 1.05-6.1L3.1 9.7l6.15-.9Z"/></svg>';
export const starRow = (n, max = 3, big = false) =>
  `<span class="stars${big ? ' big' : ''}" role="img" aria-label="${n} of ${max} stars">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">${STAR}</span>`).join('')}</span>`;
export const starsInline = (n) => `<span class="stars mini" role="img" aria-label="${n} star${n === 1 ? '' : 's'}">${Array.from({ length: n }, () => `<span class="on">${STAR}</span>`).join('')}</span>`;

const btn = (label, act, arg = '', kind = '', extra = '') =>
  `<button class="btn ${kind}" data-act="${act}"${arg !== '' ? ` data-arg="${esc(arg)}"` : ''} ${extra}>${label}</button>`;

const back = (act, label = 'Back', arg = '') =>
  `<button class="back" data-act="${act}"${arg ? ` data-arg="${esc(arg)}"` : ''} aria-label="${esc(label)}"><span aria-hidden="true">←</span> ${esc(label)}</button>`;

export function pageHead(title, sub = '', backBtn = '', right = '') {
  return `<header class="phead">${backBtn || '<span></span>'}<div class="phead-t"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="phead-r">${right}</div></header>`;
}

/* Maths text as a voice would say it. */
export function spoken(t) {
  return String(t).replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ').replace(/\+/g, ' plus ')
    .replace(/(\d+)²/g, '$1 squared').replace(/%/g, ' percent');
}

/* ------------------------------------------------------------- the shell */

const NAV_OF = { facts: 'library', lib: 'library', stop: 'atlas', check: 'atlas', world: 'atlas', stories: 'library', intro: 'atlas', run: null, me: null, journey: 'atlas', goals: null, grownups: null, game: 'play', contest: 'play', hall: 'play', paper: null,
  shop: null, collection: null, medals: null, settings: null, help: null, mistakes: null, search: null, privacy: null, who: null, start: null, welcome: null };
export { icon };

/* The family shell is Bizzing Bee's, as ONE measured drop-in (integration/bizzing-shell.js,
   copied verbatim): the top bar ⬡ ☰ Octo+wordmark … search | coins theme 🔒 avatar ▾, the tab
   row, the phone tab bar and the ☰ drawer in the family order. This app passes its words,
   its mascot, its tabs and its colours (--bz-* tokens in styles/shell.css) — never geometry.
   Inside a timed contest question ⬡ hides and nothing else moves (inRun). */
export const HIVE = HIVE3;
export const BZ_TABS = [
  { id: 'home', label: 'Home', icon: 'home', href: '#/home' },
  { id: 'atlas', label: 'Atlas', icon: 'map', href: '#/atlas' },
  { id: 'library', label: 'Library', icon: 'book', href: '#/library' },
  { id: 'puzzles', label: 'Puzzles', icon: 'puzzle', href: '#/puzzles' },
  { id: 'play', label: 'Play', icon: 'play', href: '#/play' },
];
/* My Feed is the LAST tab, after Play (owner, 2 Oct 2026; standard §6a) — unless a grown-up switched it off */
const FEED_TAB = { id: 'feed', label: 'My Feed', icon: 'feed', href: '#/feed' };
export const tabsFor = (h) => (h.parent.feedOff ? BZ_TABS : [...BZ_TABS, FEED_TAB]);
const FOOT = `Bizzing Maths · part of the Bizzing family with <a href="https://www.bizzingbee.com/" rel="noopener">Bizzing Bee</a>, <a href="https://aayuvis.github.io/bizzingindia.com/" rel="noopener">Bizzing India</a>, <a href="https://aayuvis.github.io/bizzingfinance/" rel="noopener">Bizzing Finance</a> and the <a href="${HIVE3}" rel="noopener">Hive</a> · No ads, no tracking, nothing leaves this device. <a href="#/privacy">Privacy</a>`;
export function shell(body) {
  const h = R.h, k = kid(h);
  const nav = NAV_OF[R.ui.nav] !== undefined ? NAV_OF[R.ui.nav] : R.ui.nav;
  const timed = R.ui.nav === 'contest' && R.contest && (R.contest.phase === 'ask' || R.contest.phase === 'champ');
  const p = k ? J.progress(k) : null;
  const top = `${R.fromHive && !timed ? `<a class="hive-chip" href="${HIVE}">← back to my day</a>` : ''}${k && k.sample ? demoBar(k) : ''}${h.parent.tester ? '<div class="tester" role="note">TESTER MODE — every stop is open. Nothing about the child changes. <button data-act="testerOff">Turn off</button></div>' : ''}`;
  return `<a class="skip" href="#main">Skip to the content</a>` + bzShell({
    app: 'maths', name: 'Maths', mascot: 'mascot/octo-logo.webp', tabs: tabsFor(h), active: nav,
    coins: k ? Family.balance(k.name) : 0, dark: document.documentElement.getAttribute('data-mode') === 'dark',
    kid: k ? { name: k.name, avatar: `avatars/${avatarFile(k.avatar)}.webp` } : null,
    search: 'Search stops, stories, words', query: R.ui.nav === 'search' ? R.ui.q || '' : '', inRun: timed,
    drawer: { sub: k ? (p ? `Level ${p.level} · ${p.L.name}` : `Rank ${rankOf(k.xp).n}`) : '',
      app: [{ icon: 'flag', label: 'My mistakes', sub: 'questions that come back after a gap', href: '#/mistakes' },
        { icon: 'learn', label: 'What I’m learning', sub: 'every goal, measured from what you did', href: '#/goals' },
        { icon: 'book', label: 'The Story Shelf', sub: 'a story for every trick', href: '#/stories' },
        // the shell's ☰ holds four of the app's own rows: with My Feed on, it takes the fourth (the contest is on the Play tab)
        h.parent.feedOff ? { icon: 'medal', label: 'Mock contest', sub: 'you and ten rivals', href: '#/contest' }
          : { icon: 'feed', label: 'My Feed', sub: 'about twenty cards from across the app, and then it ends', href: '#/feed' }] },
    content: top + body + (R.ui.nav === 'home' && k ? '' : `<footer class="foot">${FOOT}</footer>`),
  }) + `${k && R.ui.sheet ? kidSheet(h, k) : ''}${k && R.ui.wallet ? walletSheet(k) : ''}${k && R.ui.cels && R.ui.cels.length ? celebration() : ''}`;
}

/* ?demo and ?demo=try: a labelled sample, held in memory only (store.js DEMO). */
function demoBar(k) {
  return k.sample === 'try'
    ? '<div class="demo-bar" role="note"><b>Trying a trick</b> — nothing here is saved. <a href="./">Make my own →</a></div>'
    : '<div class="demo-bar" role="note"><b>Sample</b> — Asha is a made-up child with three weeks of play. Nothing here is saved or sent to the family. <a href="./">Leave the sample</a></div>';
}

/* The avatar ▾ menu, in Bizzing Bee's words and order: every child in the
   household (✓ on the one playing; one tap switches), then My page, Settings,
   and adding a child — which is a grown-up's job, and says so. */
function kidSheet(h, k) {
  return `<div class="sheet-back" data-act="sheet" aria-hidden="true"></div>
  <div class="sheet kid-menu" role="dialog" aria-modal="true" aria-label="Who is playing">
    <div class="km-kids">${h.kids.map((c) => `<button class="km-kid${c.id === k.id ? ' on' : ''}" data-act="switchKid" data-arg="${c.id}" ${c.id === k.id ? 'aria-current="true"' : ''}>${av(c.avatar, 52, '')}<b>${esc(c.name)}</b>${c.id === k.id ? `<span class="km-tick" aria-label="playing now">${icon('check', 22)}</span>` : ''}</button>`).join('')}</div>
    <hr class="km-rule">
    <button class="km-row" data-act="nav" data-arg="me">My page — avatar, badges, collection</button>
    <button class="km-row" data-act="nav" data-arg="settings">Settings</button>
    ${k.sample ? '' : '<button class="km-row" data-act="addKid">+ Add a child <span class="km-note">grown-ups</span></button>'}
  </div>`;
}

/* ------------------------------------------------------------- welcome */

/* A new child, one question at a time — Bizzing Finance's onboarding: a
   landing the first time, then Octo, the mascot, asks for a name, an
   age, a face from five and a world from two. Everything else waits until
   they are in. Nothing typed here leaves the device. */
const OB_STEPS = ['name', 'band', 'face', 'world'];
export const OB_THEMES = ['graph', 'chalk'];   // worlds 1–2: open to everyone
function guide(text, line) {
  return `<div class="ob-say">${octo('wave', 84, '', 'Octo')}<p class="bubble2">${text}${sayBtn(guideSay(line), 'Hear Octo say it')}</p></div>`;
}
/* 🔊 — read this line aloud (voice.js). Any band, any time; a plain button, so Tab and Space reach it. */
export const sayBtn = (line, label = 'Read it aloud') =>
  `<button class="say-btn" data-act="sayIt" data-arg="${esc(line)}" aria-label="${esc(label)}" title="${esc(label)}">${icon('speaker', 18)}</button>`;
export function viewWelcome() {
  const d = R.ui.draft || (R.ui.draft = { name: '', band: '', avatar: STARTER_AVATARS[0], step: 0 });
  const first = !R.h.kids.length, step = d.step || 0;
  if (first && !d.go) return landing();
  const dots = `<div class="ob-dots" aria-label="Step ${step + 1} of ${OB_STEPS.length}">${OB_STEPS.map((_, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}"></i>`).join('')}</div>`;
  const back = step > 0 ? btn('← Back', 'obBack', '', 'small') : !first ? btn('Cancel', 'nav', 'home', 'small') : btn('← Back', 'obLand', '', 'small');
  let body;
  if (step === 0) body = `${guide(first ? GUIDE.nameFirst : GUIDE.nameMore, first ? 'nameFirst' : 'nameMore')}
    <div class="card ob-card">
      <label class="lab" for="kname">First name or nickname</label>
      <input id="kname" class="inp" data-draft="name" value="${esc(d.name)}" maxlength="20" autocomplete="off" autocapitalize="words" placeholder="e.g. Ahana">
      <p class="hint">Just a first name — never a surname, a birthday or a photo.</p>
      ${btn('Next →', 'obNext', '', 'primary big')}
    </div>`;
  else if (step === 1) body = `${guide(`${GUIDE.bandHi}, <b>${esc(d.name)}</b>. ${GUIDE.bandAsk}`, 'band')}
    <div class="ob-opts">${BANDS.map((b) => `<button class="ob-opt${d.band === b.id ? ' on' : ''}" data-act="draftBand" data-arg="${b.id}"><b>${b.label}</b><span>${b.blurb}</span></button>`).join('')}</div>`;
  else if (step === 2) body = `${guide(GUIDE.face, 'face')}
    <div class="ob-faces" role="radiogroup" aria-label="Pick a face">${STARTER_AVATARS.map((a) => `<button class="ob-face${d.avatar === a ? ' on' : ''}" role="radio" aria-checked="${d.avatar === a}" data-act="draftAv" data-arg="${a}">${av(a, 96, AVATAR_NAME[a] || a).replace('loading="lazy"', 'loading="eager"')}<span>${esc(AVATAR_NAME[a] || a)}</span></button>`).join('')}</div>`;
  else body = `${guide(GUIDE.world, 'world')}
    <div class="ob-worlds">${THEMES.filter((t) => OB_THEMES.includes(t.id)).map((t) => `<button class="ob-world ob-w-${t.id}" data-act="obTheme" data-arg="${t.id}"><span class="ob-sw" style="background-image:url(${plate(t.id, false, true)})"><b style="font-family:'${t.display}'">Aa</b><i style="font-family:'Sono'">7 × 8</i></span><b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></button>`).join('')}</div>`;
  return `<section class="welcome ob">
    <div class="ob-top">${back}${dots}<span></span></div>
    ${body}
  </section>`;
}

/* The first-visit landing, in Bizzing Bee's shape (owner, 4 Oct 2026: "landing page can have
   screenshots... look at bizzingbee"). The hero renders at once — the promise, the age line,
   Start and the two ways to look first — beside a trick worked by the app's own work(), the
   same stop "Try a trick first" opens. Everything below it is landing.js, a lazy chunk, so
   Home never downloads it. The numbers are counted from the code; nothing here is typed. */
let LAND = null, landing0 = null;
const AGE_MIN = parseInt(BANDS[0].id, 10), AGE_MAX = parseInt(BANDS[BANDS.length - 1].id.split('-').pop(), 10);
export const PRIVACY_LINE = 'There are no accounts, no analytics, no advertising, no trackers and no third-party scripts.';
function landTry() {
  // cut at build time from the stop's own working (landing-try.js; test/light.mjs holds it to the stop): the
  // landing draws before the stops' code loads, and must not load it just for this card
  const t = TRY, steps = t.steps;
  return `<aside class="land-try" aria-label="A trick, worked">
    <div class="land-try-top">${octo('wave', 56, '', '')}<span><span class="kicker">A trick, worked</span><b>${esc(t.title)}</b></span></div>
    <p class="land-try-q" data-code="try">${esc(t.text)}</p>
    <ol class="land-try-steps" data-code="try">${steps.map((s) => `<li><span>${esc(s.t)}</span><b>${esc(s.v)}</b></li>`).join('')}</ol>
    <p class="land-try-why" data-code="try"><b>Why it works:</b> ${esc(t.why)}</p>
    <a class="ob-try btn" href="./?demo=try">Try a trick first — nothing is saved</a>
  </aside>`;
}
function landing() {
  if (!LAND && !landing0) landing0 = import('./landing.js').then((m) => { LAND = m; if (!kid(R.h) && R.render) R.render(); });
  const faces = AVATAR_PACKS.slice(0, 8).map((p) => p.avatars[0]).map((a) => `<span class="land-face sm" title="${esc(AVATAR_NAME[a] || a)}">${av(a, 40, '')}</span>`).join('');
  return `<section class="ob-land land">
    <div class="land-hero">
      <div class="land-hero-t">
        <p class="land-kick">Fact fluency · Mental maths · Vedic and Chinese methods</p>
        <h1 class="display">Fast and fearless with numbers — <em>and knowing why the trick works.</em></h1>
        <p class="lead land-age">For ages <b data-n="ageMin">${AGE_MIN}</b> to <b data-n="ageMax">${AGE_MAX}</b>. <b data-n="levels">${LEVELS.length}</b> levels, each one road through painted lands; every trick shown with the reason it works.</p>
        <div class="land-ctas">${btn('Start →', 'obStart', '', 'primary big')}<a class="btn big land-sample" href="./?demo">See a sample child</a></div>
        <p class="ob-grown">For grown-ups: a report card of what your child has learned — not minutes played — sits behind a PIN on the Grown-ups page.</p>
        <div class="land-hero-faces">${faces}</div>
      </div>
      ${landTry()}
    </div>
    ${LAND ? LAND.landingRest({ privacy: PRIVACY_LINE, face: (id, name) => av(id, 64, name) }) : ''}
  </section>`;
}

export function viewStart() {
  const k = kid(R.h);
  return `<section class="narrow">
    ${pageHead(`Hello, ${esc(k.name)}`, 'Where would you like to start?')}
    <div class="two">
      <button class="door" data-act="startLevelTest">
        <span class="door-i">${icon('compass', 30)}</span><b>Find my level</b>
        <span>A few questions that move up when you get them and down when you don't, until they find your maths age — from 6 to 15+. Then you start that level's journey. It is not a score.</span>
      </button>
      <button class="door" data-act="startLevel1">
        <span class="door-i">${icon('sprout', 30)}</span><b>Start at Level 1</b>
        <span>Walk every journey from the very first step. Each one you finish opens the next. The whole Atlas stays open to explore as well.</span>
      </button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- home */

export function numberFacts(n) {
  const facts = [];
  const divs = []; for (let d = 1; d <= n; d++) if (n % d === 0) divs.push(d);
  if (divs.length === 2) facts.push('It is <b>prime</b> — only 1 and itself divide it.');
  else if (divs.length <= 12) facts.push(`It divides exactly by <b>${divs.join(', ')}</b>.`);
  else facts.push(`It has <b>${divs.length}</b> different numbers that divide into it exactly.`);
  const sq = Math.round(Math.sqrt(n)); if (sq * sq === n) facts.push(`It is a square: <b>${sq} × ${sq}</b>.`);
  facts.push(`Its digits add up to <b>${String(n).split('').reduce((a, b) => a + +b, 0)}</b>, and its digit root is <b>${droot(n)}</b>${droot(n) === 9 ? ' — so it is in the nine times table' : droot(n) % 3 === 0 ? ' — so it is in the three times table' : ''}.`);
  facts.push(n % 2 ? 'It is <b>odd</b>.' : `It is <b>even</b> — half of it is ${n / 2}.`);
  return { n, facts: facts.slice(0, 3) };
}

/* Home, in the family anatomy (standard §2, Bee's home as the template):
   1 the top bar · 2 a greeting from the child's own face, with today's ring ·
   3 ONE Continue — the only filled button on the screen · 4 Today's three,
   small and skippable · 5 at most six ways in · then, below the fold, the
   number and the trick of the hour and the honest progress panel. */
/* What Octo says is about the child, from their own record (greeting.js, audit v4 B1/B5). */
function ring(parts) {
  // concentric rings, one per part of today; each fills to its own goal
  const R0 = 46, W = 9;
  return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">${parts.map((p, i) => {
    const r = R0 - i * (W + 3), c = 2 * Math.PI * r, f = Math.min(1, p.v / p.goal);
    return `<circle cx="60" cy="60" r="${r}" class="rg-bg" style="stroke:${p.tint}"/><circle cx="60" cy="60" r="${r}" class="rg-fg" style="stroke:${p.col};stroke-dasharray:${(c * f).toFixed(1)} ${c.toFixed(1)}"/>`;
  }).join('')}</svg>`;
}

/* Where Continue goes — Home's card and the Hive's #/continue deep link share it. */
export function continueTarget(k) {
  const p = J.progress(k);
  if (!p) return { act: 'nav', arg: 'start', label: 'Start my road', title: 'Find your level, or start at Level 1', p };
  if (p.next) return { act: 'openStep', arg: `${p.next.stop}|${p.next.lv}`, label: 'Continue', title: p.next.t.title, world: p.next.t.world, p };
  if (p.nextTest && p.nextTest.kind === 'landtest') return { act: 'startLandTest', arg: p.nextTest.land.id, label: 'Take the test', title: `${p.nextTest.land.name} test`, world: p.nextTest.land.world, p };
  if (p.nextTest && !p.finishedTop) return { act: 'startLevelExam', arg: '', label: `Take the Level ${p.level} test`, title: `The Level ${p.level} test`, p };
  return { act: 'nav', arg: 'atlas', label: 'See my road', title: 'Every road walked', p };
}

/* The ONE Continue card, painted with the world the next station is in. */
function continueCard(k) {
  const c = continueTarget(k), p = c.p;
  const art = c.world ? `art/w-${c.world}.webp` : 'art/atlas.webp';
  const pct = p ? Math.round(100 * p.done / p.total) : 0;
  return `<div class="hcard ccard" id="continue">
    <span class="cc-art" style="background-image:url(${art})" aria-hidden="true"></span>
    <span class="cc-t">
      <span class="kick">${p ? `Next on your journey · Level ${p.level} · ${esc(p.age)}` : 'Ten levels · maths age 6 to 15+'}</span>
      <b>${esc(c.title)}</b>
      ${p ? `<span class="meter"><i style="width:${pct}%"></i></span><span class="muted small">Stop ${Math.min(p.done + 1, p.total)} of ${p.total} · ${esc(p.L.name)}</span>` : '<span class="muted small">A few questions find where your road starts.</span>'}
    </span>
    <button class="btn primary big cc-go" data-act="${c.act}" data-arg="${esc(c.arg)}">${esc(c.label)} →</button>
  </div>`;
}

export function viewHome() {
  const k = kid(R.h), d = dayKey(), today = k.days[d] || { q: 0, ok: 0 };
  const puzzleDone = k.daily[d] && k.daily[d].puzzle;
  const stopsToday = (k.dayStops || {})[d] || 0;
  const tg = (k.prefs && k.prefs.targets) || { answers: 20, stops: 1, puzzle: 1 };
  const parts = [
    { n: 'Right answers', s: 'Right', v: today.ok, goal: tg.answers || 20, col: 'var(--action)', tint: 'color-mix(in srgb,var(--action) 14%,transparent)' },
    { n: 'Stops passed', s: 'Stops', v: stopsToday, goal: tg.stops || 1, col: '#F0B429', tint: 'rgb(240 180 41 / .2)' },
    ...(tg.puzzle ? [{ n: 'Today’s puzzle', s: 'Puzzle', v: puzzleDone ? 1 : 0, goal: 1, col: '#178A4C', tint: 'rgb(23 138 76 / .15)' }] : []),
  ];
  const c = continueTarget(k), p = c.p, nh = numberOfHour(), mk = MD.count(k), rk = rankOf(k.xp);
  const floors = Object.values(k.quest || {}).filter((x) => x.passed).length;
  const plain = (html) => String(html).replace(/<[^>]+>/g, '');
  const tip = trickOfHour(k), fact = RANKS[Math.floor(seeded('fact:' + dayKey() + new Date().getHours())() * RANKS.length)];
  /* Bee's home, three rows (standard §6): greeting · daily ring · number of the hour; the next
     stop (the ONE filled button) beside a second journey; a tip and a fact from the story of
     numbers. The world's painting lies behind it all. */
  return `<section class="home2">
    ${worldStage(themeOfKid(k), 'home-stage')}
    ${bzHome({
      greet: { mascot: `avatars/${avatarFile(k.avatar)}.webp`, hello: `${greet()},`, name: k.name, line: plain(greetingLine(k)) },
      ring: { html: `<div class="ring-in">${ring(parts)}<div><b class="ct">Today’s ring</b><ul class="legend2">${parts.map((x) => `<li><i style="background:${x.col}"></i><span class="lg-l">${x.n}</span><span class="lg-s">${x.s}</span><b class="mono">${Math.min(x.v, x.goal)}/${x.goal}</b></li>`).join('')}</ul><p class="muted small">Nothing expires. A day off costs nothing.</p></div></div>`,
        foot: { kicker: p ? 'Your level' : 'Your rank', title: p ? `Level ${p.level} · ${p.L.name}` : `Rank ${rk.i + 1} · ${rk.n}`, href: p ? `#/journey/${p.level}` : '#/me' } },
      hour: { kicker: 'Five minutes', title: 'Today’s mix', sub: mk.due ? `Facts, a stop, a puzzle — and ${mk.due} mistake${mk.due > 1 ? 's' : ''} due.` : 'Facts picked for you, your next stop and a puzzle.', icon: 'bolt', href: '#/mix' },
      next: { plate: c.world ? `art/w-${c.world}.webp` : 'art/atlas.webp', icon: 'path', chip: p ? `stop ${Math.min(p.done + 1, p.total)} of ${p.total}` : 'ten levels',
        kicker: p ? `Next on your journey · Level ${p.level} · ${p.age}` : 'Ten levels · maths age 6 to 15+', title: c.title, sub: p ? p.L.name : 'A few questions find where your road starts.',
        href: '#/continue', cta: c.label, progress: p ? { pct: Math.round(100 * p.done / p.total), label: `${p.done} of ${p.total} stops on this road` } : null },
      second: mk.due ? { plate: 'art/lib-working.webp', icon: 'flag', chip: `${mk.due} ready`, kicker: 'My mistakes', title: `${mk.due} to try again`, sub: 'They come back after a gap — that is how they stick.', href: '#/mistakes', cta: 'Look again', ctaIcon: 'pen', progress: null }
        : { plate: 'art/q-tower.webp', icon: 'puzzle', chip: `floor ${Math.min(12, floors + 1)} of 12`, kicker: 'Your puzzle journey', title: 'The Puzzle Tower', sub: 'Twelve floors of thinking puzzles — the kind contests are made of.', href: '#/puzzles', cta: 'Climb', ctaIcon: 'puzzle', progress: { pct: Math.round(100 * floors / 12), label: `${floors} of 12 floors cleared` } },
      tip: { kicker: 'Trick of the hour', text: `${tip.title}${/\?$/.test(tip.title) ? '' : ':'} ${tip.idea} ${workedLine(tip, 110)}`, href: `#/stop/${tip.id}|learn` },
      quote: { kicker: 'From the story of numbers', text: fact.why, who: '', href: '#/me' },
      foot: FOOT,
    })}
  </section>`;
}
/* The daily cards have ONE cadence and one name everywhere (audit v4 B8): "… of the hour", the
   family's own (Bee's "Quote of the hour"). Home, the Library and My page show the same trick and
   the same number in the same hour. */
export function trickOfHour(k, at = new Date()) {
  const learned = TRICKS.filter((t) => (k.tricks[t.id] || {}).stars);
  const pool = learned.length ? learned : TRICKS.slice(0, 3);
  return pool[Math.floor(seeded('toh:' + dayKey(at) + at.getHours())() * pool.length)];
}
/* One worked example of a trick, in a line: the chapter's own example run through its own steps,
   so the line is checked by the same tests as the trick (test/tricks.mjs). */
export function workedLine(t, max = Infinity) {
  // Home and My page draw before the stops' code arrives (rule 30): the example joins them when it does
  if (!engineReady()) return '';
  const q = example(t), steps = t.work(q);
  if (max < Infinity) { const full = workedLine(t); if (full.length <= max) return full; return `For example — ${q.text}${/\?$/.test(q.text) ? '' : ' ='} ${q.ans}.`; }
  const say = (x) => (/^[\d\s+−\-×÷()., ]+$/.test(x.t) ? `${x.t} = ${x.v}.` : /\?$/.test(x.t) ? `${x.t} ${x.v}.` : `${x.t.replace(/[.:]\s*$/, '')}: ${x.v}.`);
  return `For example — ${q.text}${/\?$/.test(q.text) ? '' : ':'} ${steps.map(say).join(' ')}`;
}

/* The number of the HOUR (standard §6 card 3): the same number in every house this hour. */
export function numberOfHour(at = new Date()) {
  const r = seeded('noh:' + dayKey(at) + ':' + at.getHours());
  return numberFacts(int(12, 999, r));
}
export const themeOfKid = (k) => themeOf(k, R.h);

export function trickOfHourCard(k) {
  const t = trickOfHour(k), learned = TRICKS.some((x) => (k.tricks[x.id] || {}).stars);
  return `<b>${esc(t.title)}</b><p>${esc(t.idea)}</p><p class="worked">${esc(workedLine(t))}</p><button class="linkish" data-act="openStop" data-arg="${t.id}">${learned ? 'Practise it again' : 'Learn it'} →</button>`;
}

function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
export const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ------------------------------------------------------------- atlas */

export function viewAtlas() {
  const h = R.h, k = kid(h), f = frontier(k);
  const at = atlasSummary(k);
  return `<section>
    ${pageHead('The Number Atlas', 'Five places, each with its own tricks. Walk the road; every stop teaches one idea and why it works.', '', `<span class="chip gold">${icon('star', 16)} ${at.stars}</span>`)}
    <div class="atlas">
      ${WORLDS.map((w) => {
        const nodes = ROUTE.map((n, i) => ({ n, i })).filter((x) => x.n.world === w.id);
        const anyOpen = nodes.some((x) => isOpen(h, k, x.i));
        const here = nodes.some((x) => x.i === f);
        return `<article class="world${anyOpen ? '' : ' locked'}${here ? ' here' : ''}" style="--wt:${w.tint};--wi:${w.ink}">
          <header class="world-h">
            <span class="world-g" aria-hidden="true">${glyph(w.glyph, 28)}</span>
            <div><p class="kicker">Part ${w.n}</p><h2>${esc(w.name)}</h2><p>${esc(w.blurb)}</p></div>
            ${w.intro ? `<button class="btn small ghost" data-act="worldIntro" data-arg="${w.id}">${esc(w.intro.title)}</button>` : ''}
          </header>
          <ol class="rail">
            ${nodes.map(({ n, i }) => {
              const open = isOpen(h, k, i), done = nodeDone(k, n), cur = i === f;
              if (n.kind === 'check') {
                const c = k.checks[w.id];
                return `<li class="${cls('stop', 'check', done && 'done', cur && 'cur', !open && 'shut')}">
                  <button ${open ? `data-act="openCheck" data-arg="${w.id}"` : 'disabled'} aria-label="Checkpoint${done ? ', passed' : open ? '' : ', locked'}">
                    <span class="pin">${icon(done ? 'medal' : 'flag', 18)}</span><span class="st">Checkpoint</span><span class="ss">${done ? `Passed · ${c.best}%` : open ? 'Mixed round' : 'Locked'}</span></button></li>`;
              }
              const t = byId[n.id], r = k.tricks[t.id] || {};
              return `<li class="${cls('stop', done && 'done', cur && 'cur', !open && 'shut')}">
                <button ${open ? `data-act="openStop" data-arg="${t.id}"` : 'disabled'} aria-label="${esc(t.title)}${open ? '' : ', locked'}">
                  <span class="pin">${open ? i + 1 : icon('lock', 16)}</span><span class="st">${esc(t.title)}</span>
                  <span class="ss">${starRow(r.stars || 0)}${t.sutra ? '<i class="sutra-dot" title="A sutra from Bharati Krishna Tirtha’s 1965 book">S</i>' : ''}</span></button></li>`;
            }).join('')}
          </ol>
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

export function viewWorldIntro(wid) {
  const w = worldOf(wid);
  return `<section class="narrow">
    ${pageHead(esc(w.intro.title), esc(w.name), back('nav', 'Atlas', 'atlas'))}
    <div class="card prose" style="--wt:${w.tint};--wi:${w.ink}">
      ${w.intro.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      <h3>Sources</h3><ul class="src">${w.intro.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- a stop */

export function viewStop(id) {
  const t = byId[id], k = kid(R.h), w = worldOf(t.world), rec = k.tricks[id] || { stars: 0 };
  const tab = R.ui.tab || 'learn';
  const tabs = [['story', `${icon('book', 18)} Story`], ['learn', '1 · Learn'], ['turn', '2 · Your turn'], ['drill', '3 · Drill']];
  return `<section class="stop-page" style="--wt:${w.tint};--wi:${w.ink}">
    ${pageHead(esc(t.title), `${glyph(w.glyph, 18)} ${esc(w.name)}`, back('openWorld', worldOf(t.world).short, t.world), starRow(rec.stars || 0, 3, true))}
    ${t.sutra ? `<p class="sutra"><span lang="sa-Latn">${esc(t.sutra.sa)}</span> — “${esc(t.sutra.en)}”</p>` : ''}
    <div class="seg" role="tablist">${tabs.map(([k2, n]) => `<button role="tab" aria-selected="${tab === k2}" class="${tab === k2 ? 'on' : ''}" data-act="stopTab" data-arg="${k2}">${n}</button>`).join('')}</div>
    ${tab === 'story' ? storyTab(t) : tab === 'learn' ? learnTab(t) : tab === 'turn' ? turnTab(t, rec) : drillTab(t, rec, k)}
  </section>`;
}

function learnTab(t) {
  const cs = learnCases(t), ci = Math.min(R.ui.lcase || 0, cs.length - 1), c = cs[ci];
  const q = c.q, steps = t.work(q), shown = R.ui.watch || 0, more = ci < cs.length - 1;
  const strip = cs.length > 1 ? `<div class="case-bar" aria-label="${cs.length} ideas in this stop, ${ci + 1} of ${cs.length}">
      <div class="case-chips" role="tablist">${cs.map((x, i) => `<button role="tab" aria-selected="${i === ci}" class="chip case-chip${i === ci ? ' on' : ''}${i < ci ? ' seen' : ''}" data-act="learnCase" data-arg="${i}"><b>${i + 1}</b> ${esc(x.label)}</button>`).join('')}</div>
</div>` : '';
  const note = cs.length > 1 && c.note ? `<p class="case-note"><b>${esc(c.label)}.</b> ${esc(c.note)}</p>` : '';
  const next = more ? btn(`Next: ${esc(cs[ci + 1].label)} →`, 'learnCase', String(ci + 1), 'primary') : btn('Your turn →', 'stopTab', 'turn', 'primary');
  const figure = t.fig ? fig(t.fig(q)) : '';
  // a case answered by building shows the widget too: empty while the steps are watched, built at the end
  const wq = W.isWidget(q) ? { ...q, html: t.draw ? t.draw(q) : '', ...(q.input === 'chart' && t.hits ? { hits: t.hits(q) } : {}) } : null;
  const built = wq ? `<div class="learn-wid">${W.demo(wq, shown >= steps.length, correct)}</div>` : '';
  return `<div class="learn">
    <div class="card hook">${strip}${note ? '' : '<p class="kicker">Try this</p>'}${wq && q.input === 'chart' ? '' : t.draw ? t.draw(q) : ''}<p class="${q.text.length > 22 ? 'long-q' : 'big-q mono'}">${esc(q.text)}</p>${note}${q.text === t.q(t.ex).text ? `<p>${esc(t.hook)}</p>` : ''}${built}</div>
    <div class="card"><p class="kicker">The trick</p><p class="idea">${esc(t.idea)}</p>
      <ol class="steps">${steps.map((s, i) => `<li class="${i < shown ? 'shown' : ''}"><span class="st-t">${esc(s.t)}</span><b class="st-v mono">${i < shown ? esc(s.v) : '?'}</b></li>`).join('')}</ol>
      <div class="row gap">${shown < steps.length ? btn(shown ? 'Next step' : 'Watch it work', 'watch', '', 'primary') + (shown ? '' : btn('Show every step', 'watchAll')) : `<p class="done-line">${q.text.length > 22 || q.choices ? `So the answer is <b class="mono">${esc(q.ans)}</b>.` : `So <b class="mono">${esc(q.text.replace(/\s*=\s*\?\s*$/, ''))} = ${esc(q.ans)}</b>.`} ${next}</p>`}</div>
    </div>
    <div class="card why"><p class="kicker">Why it works</p>
      ${t.why.map((p) => `<p>${esc(p)}</p>`).join('')}
      ${figure ? `<div class="fig-wrap">${figure}</div>` : ''}
      <details><summary>The algebra, for the curious</summary><p class="alg mono">${esc(t.alg)}</p></details>
    </div>
  </div>`;
}

function turnTab(t, rec) {
  const g = R.run && R.run.kind === 'guided' && R.run.trick === t.id ? R.run : null;
  if (!g) return `<div class="card center-card">
      <p class="kicker">Your turn</p><h2>Do the working yourself</h2>
      <p>Two questions. You type every step of the trick — not just the answer — so the method is yours, not just the result. Get a step wrong twice and it shows you, then carries on.</p>
      ${rec.learned ? `<p class="gold-line">${icon('star', 16)} You have already earned this star. Do it again any time.</p>` : '<p class="muted">Finishing both earns this stop\'s first star.</p>'}
      ${btn('Start', 'startGuided', t.id, 'primary big')}
    </div>`;
  const q = g.items[g.i], steps = g.steps;
  return `<div class="card guided">
    <p class="kicker">Question ${g.i + 1} of ${g.items.length}</p>
    ${q.html || ''}<p class="${q.text.length > 22 ? 'long-q' : 'big-q mono'}">${esc(q.text)}</p>
    <ol class="steps live">${steps.map((s, i) => `<li class="${i < g.si ? 'shown' : i === g.si ? 'now' : ''}">
      <span class="st-t">${esc(s.t)}</span>
      ${i < g.si ? `<b class="st-v mono${g.revealed.includes(i) ? ' shown-by' : ''}">${esc(s.v)}</b>` : i === g.si ? (s.choices ? `<span class="choice-row">${s.choices.map((c, ci) => `<button class="btn" data-act="gChoice" data-arg="${esc(c)}">${esc(c)} <kbd>${ci + 1}</kbd></button>`).join('')}</span>` : `<b class="st-v mono ans" id="ans" aria-live="polite">${esc(g.input) || '&nbsp;'}</b>`) : '<b class="st-v mono">·</b>'}
    </li>`).join('')}</ol>
    <p class="msg ${g.msgKind || ''}" aria-live="polite">${g.msg || (g.si < steps.length ? 'Type the number for this step, then Enter.' : '')}</p>
    ${g.si >= steps.length ? `<div class="row gap">${btn(g.i + 1 < g.items.length ? 'Next question →' : 'Finish', 'gNext', '', 'primary')}</div>` : (steps[g.si].choices ? '' : keypad(q.keys || t.keys))}
  </div>`;
}

function drillTab(t, rec, k) {
  const lv = R.ui.level || 1, js = R.ui.jstep && R.ui.jstep.stop === t.id ? R.ui.jstep : null;
  return `${js ? `<p class="jstep-note">${icon('compass', 18)} Journey step: pass this drill at <b>${['', 'Warm-up', 'Stretch', 'Champion'][js.lv]}</b>${js.lv > 1 ? ' or harder' : ''} to tick it off.</p>` : ''}<div class="card center-card">
    <div class="drill-go">${btn('Start the drill — ten questions', 'startDrill', t.id, 'primary big')}
    <div class="seg small" role="radiogroup" aria-label="Level">${[1, 2, 3].map((l) => `<button role="radio" aria-checked="${lv === l}" class="${lv === l ? 'on' : ''}" data-act="level" data-arg="${l}">${['', 'Warm-up', 'Stretch', 'Champion'][l]}</button>`).join('')}</div></div>
    ${rec.recent && rec.recent.length && lv === (rec.lvNext || 1) ? `<p class="muted small picked">${['', 'Warm-up', 'Stretch', 'Champion'][lv]} is picked from your last runs here — change it if you like.</p>` : ''}
    <p class="muted small">Seven right passes the stop. Nine right at a good pace is the third star. A wrong answer shows you the trick on that exact question.${rec.best ? ` Your best: ${rec.best}%.` : ''}</p>
    ${!rec.learned ? '<p class="hint">Tip: “Your turn” first, if you have not done the working yourself yet.</p>' : ''}
  </div>`;
}

/* ------------------------------------------------------------- the runner */

export function viewRun() {
  const run = R.run;
  if (run.over) return viewRunEnd(run);
  const q = run.items[run.i];
  const fb = run.fb;
  const wid = W.isWidget(q) && run.w;   // answered by building (widgets.js): the widget replaces the answer line and the pad
  return `<section class="runner ${fb ? (fb.right ? 'is-right' : 'is-wrong') : ''}">
    ${pageHead(esc(run.title), esc(run.sub || ''), back('quitRun', 'Stop'))}
    ${run.kind === 'mix' ? mixTicks(run) : ''}
    <div class="dots" aria-label="Question ${run.i + 1} of ${run.items.length}">${run.items.map((_, i) => `<i class="${i < run.results.length ? (run.results[i].right ? 'r' : 'w') : i === run.i ? 'c' : ''}"></i>`).join('')}</div>
    <div class="card qcard">
      ${q.fresh ? '<span class="chip new">New fact</span>' : ''}
      ${q.bonus ? `<p class="bonus-bar"><span class="chip gold">Bonus ×2 · optional</span> <span class="muted small">Almost next-level hard. Only adds points — it cannot lose you the test.</span> ${fb ? '' : btn('Finish without the bonus', 'skipBonus', '', 'small')}</p>` : ''}
      ${q.puzzle ? `<p class="pz-q" aria-live="polite">${esc(q.kind === 'pattern' ? '' : q.text)}</p>${q.html || ''}${q.kind === 'pattern' ? `<p class="big-q mono">${esc(q.text)}</p>` : ''}` : `${wid && q.input === 'chart' ? '' : q.html || ''}<p class="${q.text.length > 22 ? 'long-q' : 'big-q mono'}" aria-live="polite">${esc(q.text)}${q.choices || q.text.length > 22 ? '' : ' ='}</p>`}
      <button class="say-btn say-q" data-act="sayQ" aria-label="Read the question aloud" title="Read it aloud (R)">${icon('speaker', 20)}</button>
      ${wid ? W.view(q, run.w, { fb })
        : q.choices
        ? `<div class="choice-row big${q.choiceHtml ? ' pics' : ''}">${q.choices.map((c, i) => `<button class="btn big${q.choiceHtml ? ' pic' : ''}${fb && c === q.ans ? ' right' : ''}${fb && !fb.right && c === fb.given ? ' wrong' : ''}" data-act="choose" data-arg="${esc(c)}" ${fb ? 'disabled' : ''}>${q.choiceHtml ? q.choiceHtml[i] : ''}<span>${esc(c)} <kbd>${i + 1}</kbd></span></button>`).join('')}</div>`
        : `<p class="answer mono" id="ans" aria-live="polite">${fb ? esc(fb.given) : esc(run.input) || '<span class="caret"></span>'}</p>`}
      ${fb ? feedback(q, fb, run) : hintFor(run, q)}${fb || q.choices || wid ? '' : `<p class="hint">${run.kind === 'facts' && q.fresh && q.why ? `<span class="why-chip">${esc(q.why)}</span>` : 'Type the answer, then Enter.'}</p>`}
    </div>
    ${!fb && !q.choices && !wid ? keypad(q.keys) : ''}
    ${fb && (!fb.right || q.puzzle) ? `<div class="row center">${btn('Next <kbd>Enter</kbd>', 'nextQ', '', 'primary big')}</div>` : ''}
  </section>`;
}

/* A hint for the youngest (audit E6): before a 6–7-year-old gets one wrong, they may ask for
   the trick's first step — its words, never its number, which the step tests prove leak-free. */
function hintFor(run, q) {
  const k = kid(R.h), t = q.trick && byId[q.trick];
  if (!t || !k || k.band !== '6-7' || !['drill', 'warmup', 'mix'].includes(run.kind)) return '';
  const first = (t.work(q)[0] || {}).t, num = new RegExp(`(^|[^0-9])${String(q.ans).replace(/[^0-9.]/g, '')}([^0-9]|$)`);
  if (!first || (num.test(first) && !num.test(q.text || ''))) return '';      // a hint never says what the question has not
  return run.hinted === run.i ? `<p class="hint-chip">${octo('think', 36, '', '')}<span><b>Hint:</b> ${esc(first)}</span></p>`
    : `<p class="row center"><button class="btn small" data-act="runHint">${icon('bulb', 16)} Need a hint?</button></p>`;
}

function feedback(q, fb, run = {}) {
  // the very first question of a first-ever warm-up gets Octo's cheer (audit A8)
  if (fb.right && run.kind === 'warmup' && run.i === 0) return `<p class="fb good cheer">${octo('cheer', 72, '', 'Octo cheering')}<span>Right! That is your first one — and you did it.</span></p>`;
  if (fb.right) return `<p class="fb good">${fb.fast ? 'Right — and quick.' : 'Right.'}</p>${q.explain ? `<p class="explain">${esc(q.explain)}</p>` : ''}`;
  let work = q.explain ? `<p class="explain">${esc(q.explain)}</p>` : '';
  if (q.trick) {
    const t = byId[q.trick];
    work = `<div class="fb-work"><p class="kicker">The trick, on this one — ${esc(t.title)}</p><ol class="steps">${t.work(q).map((s) => `<li class="shown"><span class="st-t">${esc(s.t)}</span><b class="st-v mono">${esc(s.v)}</b></li>`).join('')}</ol></div>`;
  } else if (q.why && !q.explain) work = `<p class="why-chip">${esc(q.why)}</p>`;
  return `<p class="fb bad">${fb.given === '' ? 'Out of time.' : 'Not this time.'} It is <b class="mono">${esc(q.ans)}</b>.</p>${work}`;
}

/* Today's mix, part by part (audit v4 F1): how many of each part were answered and right,
   counted from the run's own results. A part with no items (no stop yet) is left out. */
export function mixParts(run) {
  const NAMES = { facts: 'Facts', stop: 'Your stop', puzzle: 'The puzzle' };
  return ['facts', 'stop', 'puzzle'].map((id) => {
    const idx = run.items.map((q, i) => (q.part === id ? i : -1)).filter((i) => i >= 0);
    const done = idx.filter((i) => run.results[i]).length, ok = idx.filter((i) => run.results[i] && run.results[i].right).length;
    return { id, name: NAMES[id], n: idx.length, done, ok, finished: idx.length > 0 && done === idx.length, title: id === 'stop' && idx.length ? (byId[run.items[idx[0]].trick] || {}).title : '' };
  }).filter((x) => x.n);
}
/* Three ticks over the mix — facts · stop · puzzle — each filled when its part is done. */
function mixTicks(run) {
  const cur = (run.items[run.i] || {}).part;
  return `<ol class="mix-ticks" aria-label="Today’s mix">${mixParts(run).map((p) => `<li class="${p.finished ? 'done' : p.id === cur ? 'now' : ''}" data-part="${p.id}"><span class="mt-box">${p.finished ? icon('check', 16) : ''}</span>${esc(p.name)}<small>${p.done}/${p.n}</small></li>`).join('')}</ol>`;
}
function mixSummary(parts) {
  return `<div class="mix-sum" aria-label="Today’s mix, part by part">${parts.map((p) => `<div class="ms-part" data-part="${p.id}">
    <span class="ms-n"><b>${p.ok}</b>/${p.n}</span><span class="ms-t"><b>${esc(p.name)}</b><small>${p.id === 'facts' ? (p.ok === p.n ? 'every fact right' : `${p.ok} right — the others come back after a gap`) : p.id === 'stop' ? `${esc(p.title || 'your next stop')} · ${p.ok} right` : p.ok ? 'solved' : 'its rule was shown — the next one will feel easier'}</small></span>
  </div>`).join('')}</div>`;
}

/* The warm-up's sticker (audit v4 A8): built from the three answers — a gold star for each one
   right, a hollow one for a try — so it always says exactly what happened. */
function winCard(w) {
  return `<div class="win-card" role="img" aria-label="Warm-up sticker: ${w.right} of ${w.n} right on ${esc(w.title)}">
    <span class="win-seal">${icon('star', 34)}</span>
    <span class="win-t"><small>Warm-up sticker</small><b>${esc(w.title)}</b>
      <span class="win-stars">${w.done.map((d) => `<i class="${d.right ? 'on' : ''}" title="${esc(d.text)}">★</i>`).join('')}</span>
      <span class="win-qs">${w.done.map((d) => `<span class="${d.right ? 'ok' : ''}">${esc(d.text)} = ${esc(d.ans)}</span>`).join('')}</span></span>
  </div>`;
}

function viewRunEnd(run) {
  const right = run.results.filter((r) => r.right).length, n = run.results.length;
  const s = run.summary || {}, placing = run.kind === 'leveltest' || run.kind === 'place';   // finding a place is never scored
  const pose = placing ? 'point' : (s.stars || 0) >= 2 || (n && right / n >= 0.7) ? 'cheer' : 'think';
  return `<section class="narrow">
    ${pageHead(esc(run.title), '', back('endRun', 'Done'))}
    <div class="card end-card">
      ${octo(pose, 110, 'end-octo', '')}
      ${s.stars != null ? starRow(s.stars, 3, true) : ''}
      ${s.win ? winCard(s.win) : ''}
      ${s.parts ? mixSummary(s.parts) : ''}
      ${placing ? '' : `<h2>${s.head || `${right} of ${n} right`}</h2>`}
      ${(s.lines || []).map((l) => `<p>${l}</p>`).join('')}
      ${!placing && run.missed && run.missed.length ? `<div class="missed"><p class="kicker">Worth another look</p><ul>${run.missed.map((q) => `<li><b class="mono">${esc(q.text)} = ${esc(q.ans)}</b>${q.why ? ` <span class="why-chip">${esc(q.why)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="row gap center">${(s.buttons || []).join('')}${btn('Done', 'endRun', '', s.buttons && s.buttons.length ? '' : 'primary')}</div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- facts */

export function viewFacts() {
  const k = kid(R.h), op = R.ui.factOp || k.prefs.op;
  const t = tally(k.facts, op);
  const showGrid = op === '×' || op === '+';
  const cell = R.ui.cell && parseKey(R.ui.cell);
  return `<section>
    ${pageHead('Facts', 'Number facts you know without working them out — the thing every trick is built on.')}
    <div class="seg" role="tablist" aria-label="Which facts">${[...OPS, 'mix'].map((o) => `<button role="tab" aria-selected="${op === o}" class="${op === o ? 'on' : ''}" data-act="factOp" data-arg="${o}">${o === 'mix' ? 'Mixed' : `<b class="mono">${o === '-' ? '−' : o}</b> ${OP_NAME[o]}`}</button>`).join('')}</div>
    <div class="facts-top">
      <div class="card fact-go">
        <p class="kicker">${op === 'mix' ? 'Everything, mixed' : OP_NAME[op]}</p>
        <h2>Twenty facts, picked for you</h2>
        <p>Your traps first, then anything due for review, then a few new ones — easiest-feeling first. Not in table order: 12 × 12 is easier than 7 × 8, and this knows it.</p>
        <div class="row gap">${btn('Start', 'startFacts', op, 'primary big')}${t.trap ? btn(`My traps (${t.trap})`, 'startTraps', op, 'big') : ''}</div>
      </div>
      <div class="card tallies">
        ${['fluent', 'quick', 'learning', 'trap'].map((s) => `<div class="tly ${s}"><b>${t[s]}</b><span>${STATE_LABEL[s]}</span></div>`).join('')}
        <p class="muted small">Fluent means right, fast, and still right a week later.</p>
      </div>
    </div>
    ${showGrid ? `<div class="card">
      <div class="row between"><p class="kicker">The ${op === '×' ? 'times table' : 'adding square'}</p><span class="legend">${['fluent', 'quick', 'learning', 'trap', 'new'].map((s) => `<i class="lg ${s}"></i>${STATE_LABEL[s]}`).join(' ')}</span></div>
      <div class="fgrid${op === '+' ? ' ten' : ''}" role="grid">
        <div class="fg-h">${op}</div>${grid(k.facts, op)[0].map((c) => `<div class="fg-h">${c.b}</div>`).join('')}
        ${grid(k.facts, op).map((row) => `<div class="fg-h">${row[0].a}</div>${row.map((c) => `<button class="fc ${c.st}${R.ui.cell === c.k ? ' sel' : ''}" data-act="cell" data-arg="${c.k}" aria-label="${c.a} ${op} ${c.b}: ${STATE_LABEL[c.st]}"></button>`).join('')}`).join('')}
      </div>
      ${cell ? `<div class="cell-card"><b class="mono">${esc(ftext(cell))}</b><span class="why-chip">${esc(why(cell))}</span><span class="muted">${STATE_LABEL[fstate(k.facts[R.ui.cell])]}</span></div>` : '<p class="muted small">Tap a square to see what makes that fact tricky.</p>'}
    </div>` : ''}
  </section>`;
}

/* ------------------------------------------------------------- arcade */

const HERO_ICON = { hall: 'medal', contest: 'trophy', facts: 'bolt', daily: 'target' };
export function viewArcade() {
  const k = kid(R.h), g = (id) => k.games[id] || {};
  const puzzleDone = k.daily[dayKey()] && k.daily[dayKey()].puzzle;
  const tile = (id, title, blurb, art, keys) => `<button class="gtile" data-act="play" data-arg="${id}">
      <span class="gart ${art}" style="background-image:url(art/g-${id}.webp)" aria-hidden="true"></span>
      <span class="gtxt"><b>${title}</b><span>${blurb}</span>${g(id).best != null ? `<span class="gbest" data-best="${g(id).best}">${icon('trophy', 14)} Best: ${g(id).best}</span>` : ''}<span class="gmeta">${keys}</span></span></button>`;
  return `<section>
    ${pageHead('Play')}
    <div class="hero-tiles">
      ${HEROES.map((x) => `<button class="card hero-t ${x.id}-t" data-act="${x.act}"${x.id === 'facts' ? ` data-arg="${k.prefs.op}"` : x.arg ? ` data-arg="${x.arg}"` : ''}><span class="hero-ic" aria-hidden="true">${icon(HERO_ICON[x.id] || 'sparkle', 52)}</span><span class="kicker">${esc(x.kicker)}</span><b>${x.id === 'daily' && puzzleDone ? 'Solved' : esc(x.title)}</b><span>${esc(x.blurb)}</span></button>`).join('')}
    </div>
    ${challengeCard(k)}
    <div class="gtiles">
      ${GAMES.map((x) => tile(x.id, esc(x.title), esc(x.blurb), x.art, esc(x.keys))).join('')}
    </div>
    ${arcadeModes(k)}
  </section>`;
}

/* Today's challenge (challenge.js): a card at the top of the games, never a Home row (rule 17).
   It names the set and its fixed bonus; it never counts days and never asks anyone back. */
function challengeCard(k) {
  const ch = challengeOf(k), done = doneToday(k, ch.day), coins = Family.EARN[BONUS_EVENT];
  const from = ch.pool === 'start' ? 'the first stops on the road' : 'stops you have opened';
  return `<div class="card chal${done ? ' done' : ''}" data-challenge="${esc(ch.day)}">
    <span class="chal-ic" aria-hidden="true">${icon('flag', 34)}</span>
    <span class="chal-t"><span class="kicker">Today’s challenge</span><b>${esc(ch.name)}</b>
      <span class="muted">${ch.items.length} questions from ${from}. Everyone aged ${esc(k.band.replace('-', '–'))} plays ${esc(ch.name)} today.</span>
      <span class="chal-pay">${done ? `${icon('check', 16)} Finished today · ${done.right} of ${done.n} right${done.paid ? ' · bonus paid' : ''}` : `${icon('coin', 16)} Finish it for ${coins} coins, once today — any score counts.`}</span></span>
    <button class="btn${done ? '' : ' primary'}" data-act="challenge">${done ? 'Play it again' : 'Start'}</button>
  </div>`;
}

/* ------------------------------------------------------------- contest */

export function viewContest() {
  const k = kid(R.h), C = R.contest;
  if (!C) return contestLobby(k);
  const c = C.c;
  if (C.phase === 'end') return contestEnd(k, C);
  const you = c.field.find((f) => f.you);
  const field = `<ol class="field">${c.field.map((f) => {
    const b = f.you ? null : bot(f.id);
    const r = C.last && C.last.res[f.id];
    return `<li class="${cls(f.you && 'you', f.out && 'out', r === true && 'r', r === false && 'w')}" title="${f.you ? esc(k.name) : esc(b.name)}">${av(f.you ? k.avatar : f.id, 40, '')}<span>${f.you ? 'You' : esc(b.name)}</span>${f.out ? '<i>out</i>' : ''}</li>`;
  }).join('')}</ol>`;
  const head = pageHead(`Round ${C.phase === 'round' ? c.round - 1 : c.round}`, `${live(c).length} still standing`, back('quitContest', 'Leave'));
  if (C.phase === 'ask' || C.phase === 'champ') {
    const q = C.q, T = timeFor(k.band, q.h);
    return `<section class="contest">
      ${head}${field}
      <div class="card qcard contest-q">
        ${C.phase === 'champ' ? '<p class="chip gold">Championship question — get this and you win</p>' : '<p class="kicker">Your question</p>'}
        <div class="timer"><i style="animation-duration:${T}s;--t:${T}s" data-timer="${T}"></i></div>
        <p class="big-q mono">${esc(q.text)}${q.choices ? '' : ' ='}</p>
        ${q.choices ? `<div class="choice-row big">${q.choices.map((ch, i) => `<button class="btn big" data-act="cChoose" data-arg="${esc(ch)}">${esc(ch)} <kbd>${i + 1}</kbd></button>`).join('')}</div>` : `<p class="answer mono" id="ans">${esc(C.input) || '<span class="caret"></span>'}</p>`}
      </div>
      ${q.choices ? '' : keypad()}
    </section>`;
  }
  // phase 'round' — the round's results
  const e = C.last;
  const outs = (e.out || []).map((id) => (id === 'you' ? 'you' : bot(id).name));
  return `<section class="contest">
    ${head}${field}
    <div class="card round-card">
      <p class="kicker">${C.youRight == null ? '' : C.youRight ? 'You got yours' : 'You missed yours'}</p>
      ${C.youRight === false ? `<p>It was <b class="mono">${esc(C.q.text)} = ${esc(C.q.ans)}</b>.</p>` : ''}
      ${e.note ? `<p>${esc(e.note)}</p>` : ''}
      ${outs.length ? `<p><b>Sitting down:</b> ${outs.map(esc).join(', ')}.</p>` : (!e.note ? '<p>Nobody sat down this round.</p>' : '')}
      ${you.out ? '<p class="muted">You are out — we will play the rest through to see who wins.</p>' : ''}
      <div class="row center">${btn(you.out || c.over ? 'See the result' : 'Next round <kbd>Enter</kbd>', 'cNext', '', 'primary big')}</div>
    </div>
  </section>`;
}

function contestLobby(k) {
  return `<section>
    ${pageHead('Mock Contest', 'Eleven mathematicians, one question each, every round. Miss and you sit down. The last one standing wins.')}
    <div class="card rules">
      <ul>
        <li>Round one: nobody sits down, whatever happens.</li>
        <li>If everybody misses a round, it is played again.</li>
        <li>With two left, a miss is not the end: the other one has to get theirs <i>and</i> a championship question.</li>
        <li>The questions get harder every round — ${k.band === '6-7' ? 'starting from adding facts' : k.band === '8-10' ? 'starting from times tables' : 'starting from the tricks'}.</li>
      </ul>
      ${btn('Start the contest', 'startContest', '', 'primary big')}
    </div>
    <h2 class="sec-h">Today's field</h2>
    <p class="muted">The same ten who line up at Bizzing Bee's mock spelling bee. Suki is still unshakeable.</p>
    <div class="rivals">${RIVALS.map((b) => `<div class="rival">${av(b.id, 56, b.name)}<div><b>${esc(b.name)}, ${b.age}</b><p>${esc(b.note)}</p><p class="tell">Tell: ${esc(b.tell)}</p></div></div>`).join('')}</div>
  </section>`;
}

function contestEnd(k, C) {
  const c = C.c, you = c.field.find((f) => f.you), win = c.winner === 'you';
  const w = win ? null : bot(c.winner);
  const podium = c.field.slice().sort((a, b) => a.place - b.place).slice(0, 3);
  return `<section class="narrow">
    ${pageHead('Contest over', '', back('quitContest', 'Done'))}
    <div class="card end-card">
      ${octo(win || you.place <= 3 ? 'cheer' : 'think', 104, 'end-octo', '')}
      <p class="place-big">${ordinal(you.place)}</p>
      <h2>${win ? 'You won the contest!' : `You finished ${ordinal(you.place)} of 11.`}</h2>
      ${!win ? `<p>${esc(w.name)} won it, in round ${c.round - 1}.</p>` : `<p>It took ${c.round - 1} rounds.</p>`}
      <div class="podium">${podium.map((f) => `<div class="pod p${f.place}">${av(f.you ? k.avatar : f.id, 56, '')}<b>${f.you ? 'You' : esc(bot(f.id).name)}</b><span>${ordinal(f.place)}</span></div>`).join('')}</div>
      ${k.contest.best ? `<p class="muted">Your best so far: ${ordinal(k.contest.best)} of 11.</p>` : ''}
      <div class="row gap center">${btn('Again', 'startContest', '', 'primary')}${btn('Done', 'quitContest')}</div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- me */

export function viewMe() {
  const k = kid(R.h), rk = rankOf(k.xp), at = atlasSummary(k), sm = summary(k);
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); days.push({ d, k: dayKey(d), v: k.days[dayKey(d)] || { q: 0, ok: 0 } }); }
  const maxQ = Math.max(10, ...days.map((d) => d.v.q));
  const top = medalStates(k).filter((m) => m.earned).sort((a, b) => b.earned.at - a.earned.at).slice(0, 3);
  const owned = AVATARS.filter((a) => ownsAvatar(R.h, k, a)).length;
  const tier = (byAvatar[k.avatar] || {}).tier || 'common';
  const fluent = OPS.reduce((a, o) => a + tally(k.facts, o).fluent, 0), floors = Object.values(k.quest || {}).filter((x) => x.passed).length;
  return `<section class="me-page">
    <div class="showcase" data-tier="${tier}">
      <button class="sc-face sc-open" data-act="avDeck" aria-label="Your avatar cards — ${owned} owned" title="Your avatar cards">${mine(k, 168, '')}</button>
      <div class="sc-t">
        <p class="kicker">${esc(TIERS[tier].label)} · Age ${esc(k.band.replace('-', '–'))}</p>
        <h1>${esc(k.name)}</h1>
        <p class="sc-rank"><b>Rank ${rk.i + 1} · ${esc(rk.n)}</b> <span class="muted">— ${k.xp} right answers</span></p>
        <div class="sc-medals">${top.length ? top.map((m) => `<img src="art/medal-${m.id}.webp" alt="${esc(m.name)}" title="${esc(m.name)}" width="56" height="56">`).join('') : '<span class="muted small">Your first medal comes from your first stop.</span>'}</div>
        <div class="row gap wrap"><button class="btn small" data-act="avDeck">${icon('sparkle', 16)} Avatar cards</button><button class="btn small" data-act="nav" data-arg="collection">${icon('cards', 16)} ${owned} of ${AVATARS.length} avatars</button><button class="btn small" data-act="nav" data-arg="medals">${icon('medal', 16)} Medals</button><button class="btn small" data-act="nav" data-arg="who">${icon('users', 16)} Switch or add</button></div>
      </div>
    </div>
    <button class="hcard yatra" data-act="nav" data-arg="goals">
      <span class="kick">Your progress · ${sm.met} of ${sm.total} goals reached</span>
      <span class="ycells">
        <span class="yc"><b>${rk.i + 1}</b><span>rank · ${esc(rk.n)}<br>${rk.next ? `${rk.next.xp - k.xp} answers to ${esc(rk.next.n)}` : 'the top'}</span></span>
        <span class="yc"><b>${at.stars}</b><span>Atlas stars<br>of ${at.maxStars}</span></span>
        <span class="yc"><b>${fluent}</b><span>facts fluent<br>still fast after a week</span></span>
        <span class="yc"><b>${floors}</b><span>tower floors<br>of 12 cleared</span></span>
      </span>
      <span class="jgo2">See what you’re learning →</span>
    </button>
    <div class="card trick-day"><span class="kick gold">Trick of the hour</span>${av('aryabhatta', 56, 'Aryabhata')}<div class="td-body">${trickOfHourCard(k)}</div></div>
    <div class="two">
      <div class="card">
        <p class="kicker">Your rank — ${k.xp} right answers</p>
        <ol class="ladder">${RANKS.map((r, i) => `<li class="${i < rk.i ? 'past' : i === rk.i ? 'now' : ''}"><span class="lb">${i + 1}</span><div><b>${esc(r.n)}</b><p>${esc(r.why)}</p></div><span class="lx">${r.xp}</span></li>`).join('')}</ol>
        <p class="muted small">Rank moves only with right answers — never with time spent. So it always tells the truth.</p>
      </div>
      <div>
        <div class="card"><p class="kicker">This week</p>
          <div class="week">${days.map((d) => `<div class="wd"><span class="wb"><i style="height:${Math.round(100 * d.v.q / maxQ)}%"></i><i class="ok" style="height:${Math.round(100 * d.v.ok / maxQ)}%"></i></span><span>${d.d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>`).join('')}</div>
          <p class="muted small">Light bar: questions tried. Dark: right.</p></div>
        <div class="card"><p class="kicker">The Atlas</p><p><b>${at.stars}</b> stars across ${TRICKS.length} stops.</p>
          ${WORLDS.map((w) => { const ts = tricksIn(w.id); const s = ts.reduce((a, t) => a + ((k.tricks[t.id] || {}).stars || 0), 0); return `<div class="wrow"><span>${glyph(w.glyph, 18)} ${esc(w.short)}</span><span class="bar"><i style="width:${Math.round(100 * s / (ts.length * 3))}%"></i></span></div>`; }).join('')}</div>
        <div class="card"><p class="kicker">Facts</p>${OPS.map((o) => { const t = tally(k.facts, o); return `<div class="wrow"><span><b class="mono">${o}</b> ${OP_NAME[o]}</span><span class="bar"><i style="width:${Math.round(100 * t.fluent / t.total)}%"></i></span><span class="muted small">${t.fluent} fluent</span></div>`; }).join('')}</div>
      </div>
    </div>
  </section>`;
}

/* The medal shelf: every medal, earned or not, with exactly what earns it
   and how far along the child is — Finance's deeds shelf in the Hive's style. */
export function medalShelf(k) {
  const ms = medalStates(k), n = ms.filter((m) => m.earned).length;
  return `<div class="card" id="medals"><p class="kicker">Medals · ${n} of ${ms.length}</p>
    <div class="medals">${ms.map((m) => `<div class="medal${m.earned ? ' on' : ''}">
      <img src="art/medal-${m.id}.webp" alt="" width="86" height="86" loading="lazy">
      <b>${esc(m.name)}</b><small>${esc(m.desc)}</small>
      ${m.earned ? `<small class="when">Earned ${new Date(m.earned.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small>` : `<span class="bar" role="img" aria-label="${m.now} of ${m.need}"><i style="width:${Math.round(100 * m.now / m.need)}%"></i></span><small>${m.now} of ${m.need}</small>`}
    </div>`).join('')}</div>
    <p class="muted small">Every medal comes from something you did — never from time on the app or a run of days.</p></div>`;
}

/* The celebration (audit J1): a short, specific ceremony when a land, a level
   or a medal is reached — the child's own face and Aryabhata, naming exactly
   what was done. One at a time; each medal once (its `seen` flag). Never a
   comparison with anyone. */
export function celebration() {
  const c = (R.ui.cels || [])[0]; if (!c) return '';
  const k = kid(R.h);
  // the level-up scene (audit v4 L4): its own stage — the new level's first land, painted, with
  // its number and name, Octo cheering and the child's own face. Once per level (journey.seenUp).
  if (c.kind === 'levelup') return `<div class="cel-back" aria-hidden="true"></div>
  <div class="cel lvup" role="dialog" aria-modal="true" aria-labelledby="celh" data-level="${c.n}">
    <div class="lvup-plate" style="background-image:url(${esc(c.plate)})">
      <span class="lvup-n" aria-hidden="true"><small>Level</small>${c.n}</span>
      <span class="lvup-octo">${octo('cheer', 132, '', 'Octo cheering')}</span>
      <span class="lvup-kid">${mine(k, 84, '')}</span>
    </div>
    <p class="kicker">Level up · ${esc(c.age || '')}</p>
    <h2 id="celh">${esc(c.title)}</h2>
    <p class="cel-say"><b>Octo:</b> “${esc(c.say)}”</p>
    ${c.coins ? `<p class="muted small cel-coins">${icon('coin', 18)} +${c.coins} Bizzing coins</p>` : ''}
    <button class="btn primary big" data-act="celDone" autofocus>Onto my new road</button>
  </div>`;
  const art = c.kind === 'medal' ? `<img class="cel-medal" src="art/medal-${c.id}.webp" alt="" width="180" height="180">`
    : `<span class="cel-badge" aria-hidden="true">${c.kind === 'level' ? c.n : icon('flag', 64)}</span>`;
  return `<div class="cel-back" aria-hidden="true"></div>
  <div class="cel" role="dialog" aria-modal="true" aria-labelledby="celh">
    <div class="cel-stage">${art}
      <span class="cel-kid">${mine(k, 96, '')}</span>
      <span class="cel-ary">${av('aryabhatta', 84, 'Aryabhata')}</span>
      <span class="cel-octo">${octo('cheer', 96, '', '')}</span>
    </div>
    <p class="kicker">${c.kind === 'medal' ? 'New medal' : c.kind === 'level' ? 'Level up' : 'Land crossed'}</p>
    <h2 id="celh">${esc(c.title)}</h2>
    <p class="cel-say"><b>Aryabhata:</b> “${esc(c.say)}”</p>
    ${c.coins ? `<p class="muted small cel-coins">${icon('coin', 18)} +${c.coins} Bizzing coins</p>` : ''}
    <button class="btn primary big" data-act="celDone" autofocus>Brilliant!</button>
  </div>`;
}

export function viewWho() {
  const h = R.h;
  return `<section class="narrow">
    ${pageHead('Who is playing?', '', back('nav', 'Back', 'me'))}
    <div class="who-list">${h.kids.map((k) => `<button class="card who-row${k.id === h.active ? ' on' : ''}" data-act="switchKid" data-arg="${k.id}">${av(k.avatar, 56, '')}<span><b>${esc(k.name)}</b><span class="muted">Age ${esc(k.band.replace('-', '–'))} · ${esc(rankOf(k.xp).n)}</span></span></button>`).join('')}
      <button class="card who-row add" data-act="addKid"><span class="plus">${icon('plus', 26)}</span><span><b>Add a mathematician</b><span class="muted">Every child gets their own facts, stars and rank.</span></span></button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- grown-ups */

export function viewGrownups() {
  const h = R.h;
  if (!R.ui.gate) {
    const setting = !h.parent.pinHash;
    return `<section class="narrow">
      ${pageHead("Grown-ups", setting ? 'Choose a four-digit PIN for this page.' : 'Enter your PIN.', back('nav', 'Back', 'home'))}
      <div class="card center-card">
        <p class="answer mono pin-dots">${'●'.repeat(R.ui.gateIn.length)}${'○'.repeat(4 - R.ui.gateIn.length)}</p>
        ${keypad()}
        <p class="hint">This PIN is a deterrent, not a lock — it keeps small fingers out of the settings. It is stored on this device only.${!setting ? ' Forgotten it? Clearing this site\'s data in your browser resets everything, including progress.' : ''}</p>
      </div>
    </section>`;
  }
  const k = kid(h);
  return `<section>
    ${pageHead("Grown-ups", 'What your child has learned, and the settings.', back('nav', 'Back', 'home'), btn('Lock', 'lock', '', 'small'))}
    ${h.kids.map((c) => report(c)).join('')}
    <p class="muted small rc-hive">Every Bizzing app keeps the same three measures. <a href="https://aayuvis.github.io/Bizzing_Schedule/#grown" rel="noopener">See the whole family's week in the Hive →</a></p>
    <div class="card certs"><p class="kicker">${icon('certificate', 18)} Certificates</p>
      <p class="muted small">One for every place on the Atlas finished and every level passed. Saved as a picture on this device — a first name, an avatar and what was mastered; nothing else.</p>
      ${h.kids.map((c) => { const cs = certsFor(c); return `<div class="cert-row"><b>${esc(c.name)}</b>${cs.length ? `<span class="chips">${cs.map((x) => `<button class="chip-btn small" data-act="cert" data-arg="${c.id}|${esc(x.id)}">${icon('download', 14)} ${esc(x.title)}</button>`).join('')}</span>` : '<span class="muted small">The first one comes with the first place finished.</span>'}</div>`; }).join('')}
    </div>
    <div class="two">
      <div class="card">
        <p class="kicker">Settings${k ? ` for ${esc(k.name)}` : ''}</p>
        ${k ? `<div class="set"><span>Age band</span><span class="chips">${BANDS.map((b) => `<button class="chip-btn small${k.band === b.id ? ' on' : ''}" data-act="setBand" data-arg="${b.id}">${b.label}</button>`).join('')}</span></div>
        <div class="set"><span>Daily ring: right answers</span><span class="chips">${[10, 20, 30].map((n) => `<button class="chip-btn small${(k.prefs.targets || {}).answers === n ? ' on' : ''}" data-act="setTarget" data-arg="answers|${n}">${n}</button>`).join('')}</span></div>
        <div class="set"><span>Daily ring: stops</span><span class="chips">${[1, 2, 3].map((n) => `<button class="chip-btn small${(k.prefs.targets || {}).stops === n ? ' on' : ''}" data-act="setTarget" data-arg="stops|${n}">${n}</button>`).join('')}</span></div>
        <div class="set"><span>Daily ring: today’s puzzle <span class="muted small">the shared Make the Target</span></span>${toggle('puzzleTarget', (k.prefs.targets || {}).puzzle !== 0)}</div>
        <div class="set"><span>Read questions aloud <span class="muted small">on by itself for 6–7; the speaker button on any question for everyone</span></span>${toggle('read', readOn(k))}</div>
        <div class="set"><span>World <span class="muted small">the child can change it too, among the open ones</span></span><span class="chips">${THEMES.filter((t) => worldIsOpen(h, k, t.n)).map((t) => `<button class="chip-btn small${themeOf(k, h) === t.id ? ' on' : ''}" data-act="theme" data-arg="${t.id}">${esc(t.name)}</button>`).join('')}</span></div>
        <div class="set"><span>Sound on this device</span>${toggle('sound', R.sound)}</div>
        <button class="btn small" data-act="addKid">${icon('plus', 16)} Add a child</button>` : ''}
        <div class="set"><span>Family plan <span class="muted small">opens all six worlds for every child here. A preview until the family's shared billing exists — no payment is taken, and a child's screen never shows a price in money.</span></span>${toggle('plan', h.parent.plan === 'family')}</div>
        <div class="set"><span>My Feed <span class="muted small">about twenty cards from across the app, then it ends. Off removes the tab and its ☰ row for every child here</span></span>${toggle('feed', !h.parent.feedOff)}</div>
        <div class="set"><span>Tester mode <span class="muted small">opens every stop; changes nothing about the child</span></span>${toggle('tester', h.parent.tester)}</div>
      </div>
      <div class="card">
        <p class="kicker">Your data</p>
        <p>Everything — names, progress, settings — is kept in this browser on this device. There are no accounts, no analytics, no ads and no network requests about your child.</p>
        <div class="row gap">${btn('Save a backup file', 'backup')}${btn('Restore from a file', 'restore')}</div>
        <input type="file" id="restoreFile" accept="application/json,.json" hidden>
        <p class="kicker" style="margin-top:18px">Remove a child</p>
        <div class="row gap wrap">${h.kids.map((c) => btn(R.ui.confirm === c.id ? `Tap again to delete ${esc(c.name)}` : `Delete ${esc(c.name)}`, 'delKid', c.id, R.ui.confirm === c.id ? 'danger' : 'small')).join('')}</div>
      </div>
    </div>
  </section>`;
}

const toggle = (key, on) => `<button class="tog${on ? ' on' : ''}" role="switch" aria-checked="${!!on}" data-act="toggle" data-arg="${key}"><i></i></button>`;

/* The report card, in the family's three measures (report.js): TIME, PROGRESS,
   MASTERY — then the detail a grown-up can act on. Weekly bars for the trend,
   one bar per strand for where the learning is. Never usage as achievement. */
function report(c) {
  const rc = reportCard(c, c.sampleFeed || Family.feed());
  const learned = TRICKS.filter((t) => (c.tricks[t.id] || {}).stars >= 2);
  const lapsed = Object.entries(c.facts).filter(([, r]) => r.lapsed).map(([k2]) => parseKey(k2)).filter(Boolean);
  const traps = Object.entries(c.facts).filter(([, r]) => fstate(r) === 'trap').map(([k2]) => parseKey(k2)).filter(Boolean);
  const wk = rc.weeks, maxM = Math.max(10, ...wk.map((w) => w.minutes)), maxF = Math.max(5, ...wk.map((w) => w.fluent || 0));
  const bars = (vals, max, cls) => `<span class="rc-bars ${cls}">${vals.map((v, i) => `<i style="height:${Math.round(100 * (v || 0) / max)}%" title="${v || 0}"${i === vals.length - 1 ? ' class="now"' : ''}></i>`).join('')}</span>`;
  const day = (t) => new Date(t + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const whenTot = rc.time.when.morning + rc.time.when.afternoon + rc.time.when.evening;
  return `<div class="card report rc" data-report='${esc(JSON.stringify({ v: rc.v, app: rc.app, who: rc.who, time: rc.time.week, progress: rc.progress.stations, mastery: rc.mastery.fluent }))}'>
    <div class="row gap">${av(c.avatar, 48, '')}<div><h2>${esc(c.name)}${c.sample ? ' <span class="chip-s">Sample</span>' : ''}</h2><p class="muted">Age ${esc(c.band.replace('-', '–'))} · rank ${esc(rankOf(c.xp).n)}</p></div></div>
    <div class="rc-three">
      <div class="rc-cell"><p class="kicker">Time</p><b class="rc-big">${rc.time.week}<small> min this week</small></b>
        ${bars(wk.map((w) => w.minutes), maxM, 'time')}<span class="rc-axis"><span>${day(wk[0].wk)}</span><span>this week</span></span>
        <p class="muted small">${whenTot ? `Mostly in the ${Object.entries(rc.time.when).sort((x, y) => y[1] - x[1])[0][0]}. ` : ''}Active minutes only — the app stops counting when nobody is touching it.</p></div>
      <div class="rc-cell"><p class="kicker">Progress</p><b class="rc-big">${rc.progress.level ? `Level ${rc.progress.level}` : '—'}<small>${rc.progress.level ? ` · ${rc.progress.stations} of ${rc.progress.total} stops` : ''}</small></b>
        ${rc.progress.total ? `<span class="meter"><i style="width:${Math.round(100 * rc.progress.stations / rc.progress.total)}%"></i></span>` : ''}
        <p class="muted small">${esc(rc.progress.label)}. ${rc.progress.lands} land test${rc.progress.lands === 1 ? '' : 's'} and ${rc.progress.levels} level test${rc.progress.levels === 1 ? '' : 's'} passed.</p></div>
      <div class="rc-cell"><p class="kicker">Mastery</p><b class="rc-big">${rc.mastery.fluent}<small> facts fluent</small></b>
        ${bars(wk.map((w) => w.fluent), maxF, 'mast')}<span class="rc-axis"><span>${day(wk[0].wk)}</span><span>this week</span></span>
        <p class="muted small">${rc.mastery.mastered} stops mastered · ${rc.mastery.goals} of ${rc.mastery.goalsTotal} goals. Fluent means still fast after a gap of days.</p></div>
    </div>
    <div class="rc-strands"><p class="kicker">Where the learning is — goals met, by strand</p>
      ${rc.mastery.strands.map((st) => `<div class="rc-st"><span>${glyph(st.glyph, 16)} ${esc(st.name)}</span><span class="bar"><i style="width:${st.total ? Math.round(100 * st.met / st.total) : 0}%"></i></span>${st.started ? `<b class="mono">${st.met}/${st.total}</b>` : '<b class="rc-none muted small">not started yet</b>'}</div>`).join('')}</div>
    <div class="rep-grid">
      <div><p class="kicker">Tricks mastered</p><p>${learned.length ? learned.map((t) => esc(t.title)).join(' · ') : 'None yet.'}</p></div>
      <div><p class="kicker">Worth a hand with</p><p>${traps.length ? traps.slice(0, 8).map((f) => `<span class="mono">${esc(ftext(f))}</span>`).join(', ') : 'Nothing is tripping them up right now.'}</p>
        ${lapsed.length ? `<p class="muted small">Slipped since they were fluent: ${lapsed.slice(0, 8).map((f) => esc(ftext(f))).join(', ')}. That is normal — it comes back quickly.</p>` : ''}</div>
    </div>
    ${goalsReport(c)}
    <p class="muted small">Talk about it: ask ${esc(c.name)} to show you one trick and explain <i>why</i> it works. Explaining it is the best practice there is.</p>
  </div>`;
}

/* ------------------------------------------------------------- privacy */

export function viewPrivacy() {
  return `<section class="narrow">
    ${pageHead('Privacy', 'The short version: nothing leaves this device.', back('nav', 'Back', 'home'))}
    <div class="card prose">
      <p>Bizzing Maths keeps a child's first name, age band, chosen avatar and progress in this browser's local storage, on this device. That is all it stores.</p>
      <p>${PRIVACY_LINE} The app makes no network requests about your child. The pages themselves are served by GitHub Pages, which, like any web host, sees the request for the page.</p>
      <p>We never ask for a surname, a birthday, an email, a photo or a location. </p>
      <p>Read-aloud uses your device's own voice, on the device. Nothing is downloaded for it and nothing is sent.</p>
      <p>A grown-up can save a backup file, restore it, or delete a child's record at any time from the Grown-ups page.</p>
      <p><b>The Bizzing family, on this device.</b> Like every Bizzing app, this one writes two small shared notes in this browser: <i>bizzing.activity</i> — a child's first name, the date, and how many minutes they were actively using the app (and milestones such as "passed a stop"), which the Bizzing Hive planner reads to show a family's week — and <i>bizzing.wallet</i> — the Bizzing coins earned for right answers and passed stops. Neither is ever sent anywhere; they stay on this device, where the other Bizzing apps on the same site can read them. Coins are never bought with real money and never change a child's rank.</p>
      <p>The sample child at <i>?demo</i> and the "try a trick" page are held in memory only and touch none of this.</p>
    </div>
  </section>`;
}

export { nWord, PASS };
