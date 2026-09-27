/* views.js — every screen, as a function from state to a string.
   Views never compute progress; model.js, facts.js and contest.js do. */

import { R } from './runtime.js';
import { esc, cls, nWord } from './ui.js';
import { TRICKS, WORLDS, byId, worldOf, tricksIn, example, droot } from './tricks.js';
import { OPS, OP_NAME, tally, grid, parseKey, why, text as ftext, STATE_LABEL, state as fstate } from './facts.js';
import { BANDS, AVATARS, RANKS, rankOf, kid, ROUTE, isOpen, frontier, nodeDone, trickRec, atlasSummary, PASS } from './model.js';
import { RIVALS, bot, live, timeFor } from './contest.js';
import { keypad } from './games.js';
import { fig } from './figs.js';
import { storyTab, goalsReport } from './views2.js';
import { summary } from './objectives.js';
import { seeded, int, dayKey } from './rand.js';

/* ------------------------------------------------------------- helpers */

export const av = (id, size = 48, alt = '') =>
  `<img class="av" src="avatars/${esc(id)}.png" width="${size}" height="${size}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

export const starRow = (n, max = 3, big = false) =>
  `<span class="stars${big ? ' big' : ''}" aria-label="${n} of ${max} stars">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join('')}</span>`;

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

export const TABS = [
  { k: 'home', n: 'Home', icon: 'home' },
  { k: 'atlas', n: 'Atlas', icon: 'map' },
  { k: 'facts', n: 'Facts', icon: 'grid' },
  { k: 'puzzles', n: 'Puzzles', icon: 'puzzle' },
  { k: 'arcade', n: 'Arcade', icon: 'play' },
];
const NAV_OF = { stop: 'atlas', check: 'atlas', world: 'atlas', stories: 'atlas', intro: 'atlas', run: null, me: 'home', goals: 'home', grownups: null, game: 'arcade', contest: 'arcade' };

export function icon(k) {
  const p = {
    home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14" class="i2"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" class="i2"/><rect x="4" y="13" width="7" height="7" rx="1.5" class="i2"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    play: '<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 10.5v4M6 12.5h4" class="i2"/><circle cx="15.5" cy="11.5" r="1.1"/><circle cx="17.5" cy="13.8" r="1.1"/>',
    puzzle: '<path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z"/><path d="M12 8h8v12h-4" class="i2"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4M12 14v3M8.5 20h7l-1-3h-5z" class="i2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" class="i2"/>',
    sound: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" class="i2"/>',
    mute: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5" class="i2"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  }[k] || '';
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

export function shell(body) {
  const h = R.h, k = kid(h);
  const nav = NAV_OF[R.ui.nav] !== undefined ? NAV_OF[R.ui.nav] : R.ui.nav;
  const rk = k ? rankOf(k.xp) : null;
  const tabs = (cl) => TABS.map((t) => `<button class="${cl}${nav === t.k ? ' on' : ''}" data-act="nav" data-arg="${t.k}" ${nav === t.k ? 'aria-current="page"' : ''}>${icon(t.icon)}<span>${t.n}</span></button>`).join('');
  return `
  <a class="skip" href="#main">Skip to the content</a>
  <header class="top">
    <button class="brand" data-act="nav" data-arg="home" aria-label="Bizzing Maths — home">
      <svg viewBox="0 0 40 40" class="brand-mark" aria-hidden="true"><rect width="40" height="40" rx="11" class="bm-bg"/><path d="M20 9v22M9 20h22" class="bm-plus"/><path d="M13 13l14 14M27 13 13 27" class="bm-x"/></svg>
      <span class="brand-t">Bizzing <em>Maths</em></span>
    </button>
    ${k ? `<nav class="tabs" aria-label="Main">${tabs('tab')}</nav>` : '<span class="grow"></span>'}
    <div class="tools">
      ${k ? `<button class="rank-pill" data-act="nav" data-arg="me" aria-label="Your rank: ${rk.n}. ${k.xp} points.">
        <span class="rp-ico" aria-hidden="true">${rk.i + 1}</span><span class="rp-t"><b>${esc(rk.n)}</b><i style="--p:${rk.pct}%"></i></span></button>
        <button class="who" data-act="nav" data-arg="me" aria-label="${esc(k.name)}'s page">${av(k.avatar, 34, '')}</button>` : ''}
      <button class="tool" data-act="sound" aria-label="Sound ${R.sound ? 'on' : 'off'}">${icon(R.sound ? 'sound' : 'mute')}</button>
      <button class="tool" data-act="mode" aria-label="Light or dark">${icon('moon')}</button>
      <button class="tool" data-act="nav" data-arg="grownups" aria-label="Grown-ups" title="Grown-ups">${icon('lock')}</button>
    </div>
  </header>
  ${h.parent.tester ? '<div class="tester" role="note">TESTER MODE — every stop is open. Nothing about the child changes. <button data-act="testerOff">Turn off</button></div>' : ''}
  <main id="main" class="content" tabindex="-1">${body}</main>
  ${k ? `<nav class="tabbar" aria-label="Main">${tabs('tb')}</nav>` : ''}
  <footer class="foot">Bizzing Maths · part of the Bizzing family with
    <a href="https://www.bizzingbee.com/" rel="noopener">Bizzing Bee</a>,
    <a href="https://aayuvis.github.io/bizzingindia.com/" rel="noopener">Bizzing India</a> and
    <a href="https://aayuvis.github.io/bizzingfinance/" rel="noopener">Bizzing Finance</a>
    · No ads, no tracking, nothing leaves this device. <button class="linkish" data-act="nav" data-arg="privacy">Privacy</button></footer>`;
}

/* ------------------------------------------------------------- welcome */

export function viewWelcome() {
  const d = R.ui.draft || (R.ui.draft = { name: '', band: '', avatar: AVATARS[0] });
  const first = !R.h.kids.length;
  return `<section class="welcome">
    <div class="wel-hero">
      ${av('aryabhatta', 132, 'Aryabhata')}
      <div>
        <p class="kicker">${first ? 'Welcome to Bizzing Maths' : 'Add a mathematician'}</p>
        <h1 class="display">Fast and fearless with numbers — <em>and knowing why the trick works.</em></h1>
        <p class="lead">Times tables that stick, mental maths that feels like a magic trick, and the Vedic methods with the reason each one works. For ages 6 to 14.</p>
      </div>
    </div>
    <div class="card form">
      <label class="lab" for="kname">First name or nickname</label>
      <input id="kname" class="inp" data-draft="name" value="${esc(d.name)}" maxlength="20" autocomplete="off" autocapitalize="words" placeholder="e.g. Ahana">
      <p class="hint">Just a first name. We never ask for a surname, a birthday, a photo or an email — and nothing you type leaves this device.</p>
      <p class="lab">Age</p>
      <div class="chips" role="radiogroup" aria-label="Age">
        ${BANDS.map((b) => `<button class="chip-btn${d.band === b.id ? ' on' : ''}" role="radio" aria-checked="${d.band === b.id}" data-act="draftBand" data-arg="${b.id}"><b>${b.label}</b><span>${b.blurb}</span></button>`).join('')}
      </div>
      <p class="lab">Pick a face</p>
      <div class="avs" role="radiogroup" aria-label="Avatar">
        ${AVATARS.map((a) => `<button class="av-pick${d.avatar === a ? ' on' : ''}" role="radio" aria-checked="${d.avatar === a}" data-act="draftAv" data-arg="${a}" aria-label="${a}">${av(a, 64)}</button>`).join('')}
      </div>
      <div class="row gap end">
        ${!first ? btn('Cancel', 'nav', 'home') : ''}
        ${btn("Let's go →", 'createKid', '', 'primary', !d.name.trim() || !d.band ? 'disabled' : '')}
      </div>
    </div>
    <p class="fam">Bizzing Maths is part of the Bizzing family, with <a href="https://www.bizzingbee.com/">Bizzing Bee</a>, <a href="https://aayuvis.github.io/bizzingindia.com/">Bizzing India</a> and <a href="https://aayuvis.github.io/bizzingfinance/">Bizzing Finance</a>. The faces are the Bee's own.</p>
  </section>`;
}

export function viewStart() {
  const k = kid(R.h);
  return `<section class="narrow">
    ${pageHead(`Hello, ${esc(k.name)}`, 'Where would you like to start?')}
    <div class="two">
      <button class="door" data-act="startPlace">
        <span class="door-i">🧭</span><b>Find my start</b>
        <span>Twelve quick questions, getting harder. Stop whenever they get tricky — it only decides which parts of the Atlas open first. It is not a test and there is no score.</span>
      </button>
      <button class="door" data-act="skipPlace">
        <span class="door-i">🌱</span><b>Start at the beginning</b>
        <span>Walk the Atlas from the first stop. ${k.band !== '6-7' ? 'Stops meant for younger children stay open, so you can skip ahead.' : 'Every stop opens as you pass the one before.'}</span>
      </button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- home */

export function numberOfDay() {
  const r = seeded('nod:' + dayKey());
  const n = int(12, 999, r);
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

/* Home, in the family's language (Bee's viewHome, India's V.home): a painted
   sky, the child's own companion greeting them by name, today's ring, two
   painted journey cards, then small tiles and an honest progress panel.
   Three rows: who you are today · what to do next · today's reading. */
const LINES = [
  (n) => `Ready, ${n}? One stop, twenty facts and a puzzle — that is a great day.`,
  (n) => `${n}, the Atlas has a new trick waiting for you.`,
  (n) => `Every right answer moves your rank, ${n}. Nothing else does.`,
  (n) => `Let’s make a big sum small today, ${n}.`,
  (n) => `The tower is taller than it looks, ${n}. Shall we climb a floor?`,
];

function ring(parts) {
  // concentric rings, one per part of today; each fills to its own goal
  const R0 = 46, W = 9;
  return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true">${parts.map((p, i) => {
    const r = R0 - i * (W + 3), c = 2 * Math.PI * r, f = Math.min(1, p.v / p.goal);
    return `<circle cx="60" cy="60" r="${r}" class="rg-bg" style="stroke:${p.tint}"/><circle cx="60" cy="60" r="${r}" class="rg-fg" style="stroke:${p.col};stroke-dasharray:${(c * f).toFixed(1)} ${c.toFixed(1)}"/>`;
  }).join('')}</svg>`;
}

export function viewHome() {
  const k = kid(R.h), rk = rankOf(k.xp), at = atlasSummary(k);
  const nod = numberOfDay();
  const d = dayKey(), today = k.days[d] || { q: 0, ok: 0 };
  const puzzleDone = k.daily[d] && k.daily[d].puzzle;
  const t = tally(k.facts, k.prefs.op);
  const w = at.world, next = at.trick;
  const floors = Object.values(k.quest || {}).filter((x) => x.passed).length;
  const stopsToday = (k.dayStops || {})[d] || 0;
  const parts = [
    { n: 'Right answers', v: today.ok, goal: 20, col: '#2D5BD8', tint: 'rgb(45 91 216 / .14)' },
    { n: 'Atlas stars', v: stopsToday, goal: 1, col: '#F0B429', tint: 'rgb(240 180 41 / .2)' },
    { n: 'Today’s puzzle', v: puzzleDone ? 1 : 0, goal: 1, col: '#178A4C', tint: 'rgb(23 138 76 / .15)' },
  ];
  const line = LINES[Math.floor(seeded('line:' + d + k.id)() * LINES.length)](esc(k.name));
  const sm = summary(k);
  const stars = TRICKS.reduce((a, x) => a + ((k.tricks[x.id] || {}).stars || 0), 0);
  const fluent = OPS.reduce((a, o) => a + tally(k.facts, o).fluent, 0);
  return `<section class="home2">
    <div class="sky" aria-hidden="true"><img src="art/home-hero.webp" alt="" width="1920" height="815"></div>

    <div class="h-r1">
      <div class="hcard hero">
        <button class="buddy" data-act="nav" data-arg="me" aria-label="${esc(k.name)}'s page">${av(k.avatar, 150, '')}</button>
        <div class="hero-tx">
          <span class="hi">${greet()},</span>
          <b class="hname">${esc(k.name)}</b>
          <p class="bubble2">“${line}”</p>
        </div>
      </div>
      <div class="hcard today">
        ${ring(parts)}
        <div class="today-t">
          <b class="ct">Today’s ring</b>
          <ul class="legend2">${parts.map((p) => `<li><i style="background:${p.col}"></i>${p.n}<b class="mono">${Math.min(p.v, p.goal)}/${p.goal}</b></li>`).join('')}</ul>
          <p class="muted small">Nothing expires. A day off costs nothing.</p>
        </div>
        <button class="today-foot" data-act="startFacts" data-arg="${k.prefs.op}"><span><span class="kick">Start with</span> Twenty facts</span><span>Go →</span></button>
      </div>
      <div class="hcard nod2">
        <span class="kick gold">Number of the day</span>
        <div class="nod-row"><span class="nod-ico" aria-hidden="true">#</span><b class="nod-n mono">${nod.n}</b></div>
        <ul>${nod.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="h-r2">
      ${next ? `<button class="journey" data-act="openStop" data-arg="${next.id}">
        <span class="jb" style="background-image:url(art/w-${w.id}.webp)"><span class="jchip">${w.glyph}</span><span class="jtag">Part ${w.n} · ${esc(w.short)}</span></span>
        <span class="jt"><span class="kick">Next on your Atlas</span><b>${esc(next.title)}</b><span class="jh">${esc(next.hook)}</span>
        <span class="jgo"><span class="btn primary">Start</span><span class="meter"><i style="width:${Math.round(100 * at.stars / at.maxStars)}%"></i></span></span></span></button>`
      : `<button class="journey" data-act="${at.allDone ? 'nav' : 'openCheck'}" data-arg="${at.allDone ? 'atlas' : at.node.world}">
        <span class="jb" style="background-image:url(art/w-${w.id}.webp)"><span class="jchip">${w.glyph}</span><span class="jtag">${at.allDone ? 'Every stop passed' : 'Checkpoint'}</span></span>
        <span class="jt"><span class="kick">${at.allDone ? 'The Atlas' : 'Checkpoint · ' + esc(w.name)}</span><b>${at.allDone ? 'Go back for three stars' : 'Prove the ' + esc(w.short)}</b><span class="jh">${at.allDone ? 'Fast and fearless on every stop.' : 'A mixed round from every stop here. Pass it to open the next place.'}</span>
        <span class="jgo"><span class="btn primary">${at.allDone ? 'Open the Atlas' : 'Take it'}</span></span></span></button>`}
      <button class="journey" data-act="nav" data-arg="puzzles">
        <span class="jb tower" style="background-image:url(art/q-tower.webp)"><span class="jchip">🧩</span><span class="jtag">Floor ${Math.min(12, floors + 1)} of 12</span></span>
        <span class="jt"><span class="kick">The Puzzle Tower</span><b>${floors ? `${floors} floor${floors > 1 ? 's' : ''} cleared` : 'Climb the first floor'}</b><span class="jh">Nets and cube stacks, magic squares, patterns, scales — every floor mixes them.</span>
        <span class="jgo"><span class="btn">Climb</span><span class="meter"><i style="width:${Math.round(100 * floors / 12)}%"></i></span></span></span></button>
    </div>

    <div class="h-r3">
      <button class="tile2" data-act="startFacts" data-arg="${k.prefs.op}"><span class="ti" style="--c:#2D5BD8">⚡</span><span><span class="kick">Facts</span><b>${OP_NAME[k.prefs.op]}</b><span class="muted small">${t.fluent} fluent${t.trap ? ` · ${t.trap} to fix` : ''}</span></span></button>
      <button class="tile2" data-act="daily"><span class="ti" style="--c:#E0673A">🎯</span><span><span class="kick">Today’s puzzle</span><b>${puzzleDone ? 'Solved ✓' : 'Make the target'}</b><span class="muted small">Same puzzle in every house</span></span></button>
      <button class="tile2" data-act="nav" data-arg="contest"><span class="ti" style="--c:#6C4FE0">🏆</span><span><span class="kick">Mock contest</span><b>${k.contest.best ? `Best: ${ordinal(k.contest.best)}` : 'Ten rivals'}</b><span class="muted small">One question each, every round</span></span></button>
      <button class="tile2" data-act="nav" data-arg="stories"><span class="ti" style="--c:#178A4C">📖</span><span><span class="kick">Story shelf</span><b>${Object.keys(k.stories || {}).length} of 27 read</b><span class="muted small">Every trick starts as a story</span></span></button>
    </div>

    <div class="h-r4">
      <div class="hcard tipcard">
        ${av('aryabhatta', 64, 'Aryabhata')}
        <div><span class="kick gold">Trick of the day</span>${trickOfDay(k)}</div>
      </div>
      <button class="hcard yatra" data-act="nav" data-arg="goals">
        <span class="kick">Your progress · ${sm.met} of ${sm.total} goals reached</span>
        <span class="ycells">
          <span class="yc"><b>${rk.i + 1}</b><span>rank · ${esc(rk.n)}<br>${rk.next ? `${rk.next.xp - k.xp} answers to ${esc(rk.next.n)}` : 'the top'}</span></span>
          <span class="yc"><b>${stars}</b><span>Atlas stars<br>of ${at.maxStars}</span></span>
          <span class="yc"><b>${fluent}</b><span>facts fluent<br>still fast after a week</span></span>
          <span class="yc"><b>${floors}</b><span>tower floors<br>of 12 cleared</span></span>
        </span>
        <span class="jgo2">See what you’re learning →</span>
      </button>
    </div>
  </section>`;
}

function trickOfDay(k) {
  const learned = TRICKS.filter((t) => (k.tricks[t.id] || {}).stars);
  const pool = learned.length ? learned : TRICKS.slice(0, 3);
  const t = pool[Math.floor(seeded('tod:' + dayKey())() * pool.length)];
  return `<b>${esc(t.title)}</b><p>${esc(t.idea)}</p><button class="linkish" data-act="openStop" data-arg="${t.id}">${learned.length ? 'Practise it again' : 'Learn it'} →</button>`;
}

function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
export const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/* ------------------------------------------------------------- atlas */

export function viewAtlas() {
  const h = R.h, k = kid(h), f = frontier(k);
  const at = atlasSummary(k);
  return `<section>
    ${pageHead('The Number Atlas', 'Five places, each with its own tricks. Walk the road; every stop teaches one idea and why it works.', '', `<span class="chip gold">★ ${at.stars}</span>`)}
    <div class="atlas">
      ${WORLDS.map((w) => {
        const nodes = ROUTE.map((n, i) => ({ n, i })).filter((x) => x.n.world === w.id);
        const anyOpen = nodes.some((x) => isOpen(h, k, x.i));
        const here = nodes.some((x) => x.i === f);
        return `<article class="world${anyOpen ? '' : ' locked'}${here ? ' here' : ''}" style="--wt:${w.tint};--wi:${w.ink}">
          <header class="world-h">
            <span class="world-g" aria-hidden="true">${w.glyph}</span>
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
                    <span class="pin">${done ? '🏅' : '⚑'}</span><span class="st">Checkpoint</span><span class="ss">${done ? `Passed · ${c.best}%` : open ? 'Mixed round' : 'Locked'}</span></button></li>`;
              }
              const t = byId[n.id], r = k.tricks[t.id] || {};
              return `<li class="${cls('stop', done && 'done', cur && 'cur', !open && 'shut')}">
                <button ${open ? `data-act="openStop" data-arg="${t.id}"` : 'disabled'} aria-label="${esc(t.title)}${open ? '' : ', locked'}">
                  <span class="pin">${open ? i + 1 : '🔒'}</span><span class="st">${esc(t.title)}</span>
                  <span class="ss">${starRow(r.stars || 0)}${t.sutra ? '<i class="sutra-dot" title="A Vedic sutra">ॐ</i>' : ''}</span></button></li>`;
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
  const tabs = [['story', '📖 Story'], ['learn', '1 · Learn'], ['turn', '2 · Your turn'], ['drill', '3 · Drill']];
  return `<section class="stop-page" style="--wt:${w.tint};--wi:${w.ink}">
    ${pageHead(esc(t.title), `${w.glyph} ${esc(w.name)}`, back('openWorld', worldOf(t.world).short, t.world), starRow(rec.stars || 0, 3, true))}
    ${t.sutra ? `<p class="sutra"><span lang="sa-Latn">${esc(t.sutra.sa)}</span> — “${esc(t.sutra.en)}”</p>` : ''}
    <div class="seg" role="tablist">${tabs.map(([k2, n]) => `<button role="tab" aria-selected="${tab === k2}" class="${tab === k2 ? 'on' : ''}" data-act="stopTab" data-arg="${k2}">${n}</button>`).join('')}</div>
    ${tab === 'story' ? storyTab(t) : tab === 'learn' ? learnTab(t) : tab === 'turn' ? turnTab(t, rec) : drillTab(t, rec, k)}
  </section>`;
}

function learnTab(t) {
  const q = example(t), steps = t.work(q), shown = R.ui.watch || 0;
  const figure = t.fig ? fig(t.fig(q)) : '';
  return `<div class="learn">
    <div class="card hook"><p class="kicker">Try this</p><p class="big-q mono">${esc(q.text)}</p><p>${esc(t.hook)}</p></div>
    <div class="card"><p class="kicker">The trick</p><p class="idea">${esc(t.idea)}</p>
      <ol class="steps">${steps.map((s, i) => `<li class="${i < shown ? 'shown' : ''}"><span class="st-t">${esc(s.t)}</span><b class="st-v mono">${i < shown ? esc(s.v) : '?'}</b></li>`).join('')}</ol>
      <div class="row gap">${shown < steps.length ? btn(shown ? 'Next step' : 'Watch it work', 'watch', '', 'primary') + (shown ? '' : btn('Show every step', 'watchAll')) : `<p class="done-line">So <b class="mono">${esc(q.text)} = ${esc(q.ans)}</b>. ${btn('Your turn →', 'stopTab', 'turn', 'primary')}</p>`}</div>
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
      ${rec.learned ? '<p class="gold-line">★ You have already earned this star. Do it again any time.</p>' : '<p class="muted">Finishing both earns this stop\'s first star.</p>'}
      ${btn('Start', 'startGuided', t.id, 'primary big')}
    </div>`;
  const q = g.items[g.i], steps = g.steps;
  return `<div class="card guided">
    <p class="kicker">Question ${g.i + 1} of ${g.items.length}</p>
    <p class="big-q mono">${esc(q.text)}</p>
    <ol class="steps live">${steps.map((s, i) => `<li class="${i < g.si ? 'shown' : i === g.si ? 'now' : ''}">
      <span class="st-t">${esc(s.t)}</span>
      ${i < g.si ? `<b class="st-v mono${g.revealed.includes(i) ? ' shown-by' : ''}">${esc(s.v)}</b>` : i === g.si ? (s.choices ? `<span class="choice-row">${s.choices.map((c, ci) => `<button class="btn" data-act="gChoice" data-arg="${esc(c)}">${esc(c)} <kbd>${ci + 1}</kbd></button>`).join('')}</span>` : `<b class="st-v mono ans" id="ans" aria-live="polite">${esc(g.input) || '&nbsp;'}</b>`) : '<b class="st-v mono">·</b>'}
    </li>`).join('')}</ol>
    <p class="msg ${g.msgKind || ''}" aria-live="polite">${g.msg || (g.si < steps.length ? 'Type the number for this step, then Enter.' : '')}</p>
    ${g.si >= steps.length ? `<div class="row gap">${btn(g.i + 1 < g.items.length ? 'Next question →' : 'Finish', 'gNext', '', 'primary')}</div>` : (steps[g.si].choices ? '' : keypad())}
  </div>`;
}

function drillTab(t, rec, k) {
  const lv = R.ui.level || 1;
  return `<div class="card center-card">
    <p class="kicker">Drill</p><h2>Ten questions, using the trick</h2>
    <p>Get seven right to pass this stop and open the next. Nine right, at a good pace, is the third star: fast <i>and</i> fearless. Get one wrong and it shows you the trick on that exact question.</p>
    ${rec.best ? `<p class="muted">Your best so far: ${rec.best}%.</p>` : ''}
    <div class="seg small" role="radiogroup" aria-label="Level">${[1, 2, 3].map((l) => `<button role="radio" aria-checked="${lv === l}" class="${lv === l ? 'on' : ''}" data-act="level" data-arg="${l}">${['', 'Warm-up', 'Stretch', 'Champion'][l]}</button>`).join('')}</div>
    ${btn('Start the drill', 'startDrill', t.id, 'primary big')}
    ${!rec.learned ? '<p class="hint">Tip: “Your turn” first, if you have not done the working yourself yet.</p>' : ''}
  </div>`;
}

/* ------------------------------------------------------------- the runner */

export function viewRun() {
  const run = R.run;
  if (run.over) return viewRunEnd(run);
  const q = run.items[run.i];
  const fb = run.fb;
  return `<section class="runner ${fb ? (fb.right ? 'is-right' : 'is-wrong') : ''}">
    ${pageHead(esc(run.title), esc(run.sub || ''), back('quitRun', 'Stop'))}
    <div class="dots" aria-label="Question ${run.i + 1} of ${run.items.length}">${run.items.map((_, i) => `<i class="${i < run.results.length ? (run.results[i].right ? 'r' : 'w') : i === run.i ? 'c' : ''}"></i>`).join('')}</div>
    <div class="card qcard">
      ${q.fresh ? '<span class="chip new">New fact</span>' : ''}
      ${q.puzzle ? `<p class="pz-q" aria-live="polite">${esc(q.kind === 'pattern' ? '' : q.text)}</p>${q.html || ''}${q.kind === 'pattern' ? `<p class="big-q mono">${esc(q.text)}</p>` : ''}` : `<p class="big-q mono" aria-live="polite">${esc(q.text)}${q.choices ? '' : ' ='}</p>`}
      ${q.choices
        ? `<div class="choice-row big${q.choiceHtml ? ' pics' : ''}">${q.choices.map((c, i) => `<button class="btn big${q.choiceHtml ? ' pic' : ''}${fb && c === q.ans ? ' right' : ''}${fb && !fb.right && c === fb.given ? ' wrong' : ''}" data-act="choose" data-arg="${esc(c)}" ${fb ? 'disabled' : ''}>${q.choiceHtml ? q.choiceHtml[i] : ''}<span>${esc(c)} <kbd>${i + 1}</kbd></span></button>`).join('')}</div>`
        : `<p class="answer mono" id="ans" aria-live="polite">${fb ? esc(fb.given) : esc(run.input) || '<span class="caret"></span>'}</p>`}
      ${fb ? feedback(q, fb) : q.choices ? '' : `<p class="hint">${run.kind === 'facts' && q.fresh && q.why ? `<span class="why-chip">${esc(q.why)}</span>` : 'Type the answer, then Enter.'}</p>`}
    </div>
    ${!fb && !q.choices ? keypad() : ''}
    ${fb && (!fb.right || q.puzzle) ? `<div class="row center">${btn('Next <kbd>Enter</kbd>', 'nextQ', '', 'primary big')}</div>` : ''}
  </section>`;
}

function feedback(q, fb) {
  if (fb.right) return `<p class="fb good">${fb.fast ? 'Right — and quick.' : 'Right.'}</p>${q.explain ? `<p class="explain">${esc(q.explain)}</p>` : ''}`;
  let work = q.explain ? `<p class="explain">${esc(q.explain)}</p>` : '';
  if (q.trick) {
    const t = byId[q.trick];
    work = `<div class="fb-work"><p class="kicker">The trick, on this one — ${esc(t.title)}</p><ol class="steps">${t.work(q).map((s) => `<li class="shown"><span class="st-t">${esc(s.t)}</span><b class="st-v mono">${esc(s.v)}</b></li>`).join('')}</ol></div>`;
  } else if (q.why && !q.explain) work = `<p class="why-chip">${esc(q.why)}</p>`;
  return `<p class="fb bad">${fb.given === '' ? 'Out of time.' : 'Not this time.'} It is <b class="mono">${esc(q.ans)}</b>.</p>${work}`;
}

function viewRunEnd(run) {
  const right = run.results.filter((r) => r.right).length, n = run.results.length;
  const s = run.summary || {};
  return `<section class="narrow">
    ${pageHead(esc(run.title), '', back('endRun', 'Done'))}
    <div class="card end-card">
      ${s.stars != null ? starRow(s.stars, 3, true) : ''}
      <h2>${right} of ${n} right</h2>
      ${(s.lines || []).map((l) => `<p>${l}</p>`).join('')}
      ${run.missed && run.missed.length ? `<div class="missed"><p class="kicker">Worth another look</p><ul>${run.missed.map((q) => `<li><b class="mono">${esc(q.text)} = ${esc(q.ans)}</b>${q.why ? ` <span class="why-chip">${esc(q.why)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
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

export function viewArcade() {
  const k = kid(R.h), g = (id) => k.games[id] || {};
  const puzzleDone = k.daily[dayKey()] && k.daily[dayKey()].puzzle;
  const tile = (id, title, blurb, art, keys) => `<button class="gtile" data-act="play" data-arg="${id}">
      <span class="gart ${art}" aria-hidden="true"></span>
      <span class="gtxt"><b>${title}</b><span>${blurb}</span><span class="gmeta">${g(id).best != null ? `Best ${g(id).best} · ` : ''}${keys}</span></span></button>`;
  return `<section>
    ${pageHead('The Arcade', 'Games that are practice in a costume. Every one works with a keyboard and with touch.')}
    <div class="hero-tiles">
      <button class="card hero-t contest-t" data-act="nav" data-arg="contest"><span class="kicker">The main event</span><b>Mock Contest</b><span>You and ten rivals. One question each, every round. Miss and you sit down.</span></button>
      <button class="card hero-t daily-t" data-act="daily"><span class="kicker">Today's puzzle</span><b>${puzzleDone ? 'Solved ✓' : 'Make the target'}</b><span>The same puzzle in every house today. Compare notes at breakfast.</span></button>
    </div>
    <div class="gtiles">
      ${tile('rush', 'Number Rush', 'Facts fall. Type the answer to pop them before they land.', 'art-rush', 'digits + Enter')}
      ${tile('target', 'Make the Target', 'Four numbers, one target, + − × ÷. Use every number.', 'art-target', '1–4 and + − × ÷')}
      ${tile('line', 'Number Line', 'Where does 637 go between 0 and 1000? Estimation, the skill contests lean on.', 'art-line', '← → and Enter')}
    </div>
  </section>`;
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
  const k = kid(R.h), rk = rankOf(k.xp), at = atlasSummary(k);
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); days.push({ d, k: dayKey(d), v: k.days[dayKey(d)] || { q: 0, ok: 0 } }); }
  const maxQ = Math.max(10, ...days.map((d) => d.v.q));
  return `<section>
    ${pageHead(esc(k.name), `Age ${esc(k.band.replace('-', '–'))}`, '', btn('Switch or add', 'nav', 'who', 'small'))}
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
          ${WORLDS.map((w) => { const ts = tricksIn(w.id); const s = ts.reduce((a, t) => a + ((k.tricks[t.id] || {}).stars || 0), 0); return `<div class="wrow"><span>${w.glyph} ${esc(w.short)}</span><span class="bar"><i style="width:${Math.round(100 * s / (ts.length * 3))}%"></i></span></div>`; }).join('')}</div>
        <div class="card"><p class="kicker">Facts</p>${OPS.map((o) => { const t = tally(k.facts, o); return `<div class="wrow"><span><b class="mono">${o}</b> ${OP_NAME[o]}</span><span class="bar"><i style="width:${Math.round(100 * t.fluent / t.total)}%"></i></span><span class="muted small">${t.fluent} fluent</span></div>`; }).join('')}</div>
      </div>
    </div>
  </section>`;
}

export function viewWho() {
  const h = R.h;
  return `<section class="narrow">
    ${pageHead('Who is playing?', '', back('nav', 'Back', 'me'))}
    <div class="who-list">${h.kids.map((k) => `<button class="card who-row${k.id === h.active ? ' on' : ''}" data-act="switchKid" data-arg="${k.id}">${av(k.avatar, 56, '')}<span><b>${esc(k.name)}</b><span class="muted">Age ${esc(k.band.replace('-', '–'))} · ${esc(rankOf(k.xp).n)}</span></span></button>`).join('')}
      <button class="card who-row add" data-act="addKid"><span class="plus">+</span><span><b>Add a mathematician</b><span class="muted">Every child gets their own facts, stars and rank.</span></span></button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- grown-ups */

export function viewGrownups() {
  const h = R.h;
  if (!R.ui.gate) {
    const setting = !h.parent.pin;
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
    <div class="two">
      <div class="card">
        <p class="kicker">Settings${k ? ` for ${esc(k.name)}` : ''}</p>
        ${k ? `<div class="set"><span>Age band</span><span class="chips">${BANDS.map((b) => `<button class="chip-btn small${k.band === b.id ? ' on' : ''}" data-act="setBand" data-arg="${b.id}">${b.label}</button>`).join('')}</span></div>
        <div class="set"><span>Read questions aloud</span>${toggle('read', k.prefs.read)}</div>` : ''}
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

function report(c) {
  const learned = TRICKS.filter((t) => (c.tricks[t.id] || {}).stars >= 2);
  const started = TRICKS.filter((t) => { const r = c.tricks[t.id]; return r && r.stars && r.stars < 2; });
  const lapsed = Object.entries(c.facts).filter(([, r]) => r.lapsed).map(([k2]) => parseKey(k2)).filter(Boolean);
  const traps = Object.entries(c.facts).filter(([, r]) => fstate(r) === 'trap').map(([k2]) => parseKey(k2)).filter(Boolean);
  const week = []; for (let i = 0; i < 7; i++) { const v = c.days[dayKey(new Date(Date.now() - i * 86400000))]; if (v) week.push(v); }
  const wq = week.reduce((a, v) => a + v.q, 0), wok = week.reduce((a, v) => a + v.ok, 0);
  return `<div class="card report">
    <div class="row gap">${av(c.avatar, 48, '')}<div><h2>${esc(c.name)}</h2><p class="muted">Age ${esc(c.band.replace('-', '–'))} · rank ${esc(rankOf(c.xp).n)}</p></div></div>
    <div class="rep-grid">
      <div><p class="kicker">This week</p><p><b>${wq}</b> questions tried on <b>${week.length}</b> day${week.length === 1 ? '' : 's'}, <b>${wq ? Math.round(100 * wok / wq) : 0}%</b> right.</p></div>
      <div><p class="kicker">Tricks mastered</p><p>${learned.length ? learned.map((t) => esc(t.title)).join(' · ') : 'None yet.'}</p>${started.length ? `<p class="muted small">Started: ${started.map((t) => esc(t.title)).join(' · ')}</p>` : ''}</div>
      <div><p class="kicker">Facts fluent</p><p>${OPS.map((o) => `${OP_NAME[o]} <b>${tally(c.facts, o).fluent}</b>/${tally(c.facts, o).total}`).join(' · ')}</p></div>
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
      <p>There are no accounts, no analytics, no advertising, no trackers and no third-party scripts. The app makes no network requests about your child. The pages themselves are served by GitHub Pages, which, like any web host, sees the request for the page.</p>
      <p>We never ask for a surname, a birthday, an email, a photo or a location. Read-aloud uses your device's own voice, on the device.</p>
      <p>A grown-up can save a backup file, restore it, or delete a child's record at any time from the Grown-ups page.</p>
    </div>
  </section>`;
}

export { nWord, PASS };
