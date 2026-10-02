/* views3.js — the family layer's screens (FAMILY-STANDARD v2 §1–§9, §16).

   The top bar and the ☰ drawer (§3), the tabs (§4), Settings in the family's five sections
   (§5), the Shop with its wallet history (§1), the Collection of 96 (§8), Medals, Help,
   search (C4), the mistakes deck (F3), the world stage with its ambient life and its
   painted night (§7), and Octo (§2). Views only: they read state and return strings. */

import { R } from './runtime.js';
import { esc } from './ui.js';
import { icon, glyph } from './icons.js';
import { kid, rankOf, RANKS, readOn, BANDS } from './model.js';
import { Family, DEMO } from './store.js';
import { CATALOGUE, PACKS, byAvatar, avatarCtx, problems } from './avatars.js';
import { stateOf, TIERS, WORLD_PRICE } from './integration/bizzing-avatars.js';
import { THEMES, byTheme, themeOf, worldIsOpen, plate } from './themes.js';
import { FRAMES, owns, worn } from './shop.js';
import { medalStates } from './medals.js';
import { worldOf } from './tricks.js';
import * as MD from './mistakes.js';
import { byId } from './tricks.js';

export const HIVE = 'https://aayuvis.github.io/Bizzing_Schedule/';
export const VERSION = '2.0';

/* ------------------------------------------------------------------ Octo */
export const POSES = ['wave', 'cheer', 'think', 'point', 'sleep', 'oops'];
export const octo = (pose = 'wave', size = 96, cls = '', alt = '') =>
  `<img class="octo octo-${pose}${cls ? ' ' + cls : ''}" src="mascot/octo-${POSES.includes(pose) ? pose : 'wave'}.webp" width="${size}" height="${size}" alt="${esc(alt)}" decoding="async">`;
/* an empty or error state: Octo, one sentence, one button (§16) */
export const octoState = (pose, line, btnHtml = '') => `<div class="card octo-state">${octo(pose, 120, '', '')}<p>${line}</p>${btnHtml}</div>`;

/* ------------------------------------------------------------------ the top bar (§3) */
const isDark = () => document.documentElement.getAttribute('data-mode') === 'dark';
export function topBar(k, { timed, av }) {
  const coins = k ? Family.balance(k.name) : 0;
  return `<header class="top" role="banner">
    ${timed ? '' : `<a class="hive" href="${HIVE}" aria-label="Back to the Bizzing Hive" title="The Bizzing Hive">${icon('hex', 24)}</a>`}
    <button class="tool menu-btn" data-act="drawer" aria-haspopup="dialog" aria-expanded="${!!R.ui.drawer}" aria-controls="drawer" aria-label="Menu">${icon('menu', 22)}</button>
    <button class="brand" data-act="nav" data-arg="home" aria-label="Bizzing Maths — home">
      <img class="brand-octo" src="mascot/octo-head.webp" width="28" height="28" alt="">
      <span class="brand-t"><b>Bizzing</b> <em>Maths</em></span>
    </button>
    <span class="grow"></span>
    ${k ? `<button class="search-pill" data-act="nav" data-arg="search" aria-label="Search">${icon('search', 18)}<span>Search stops, stories, words…</span></button>` : ''}
    ${k ? `<button class="coin-chip" data-act="wallet" aria-haspopup="dialog" aria-label="${coins} Bizzing coins — open your wallet">${icon('coin', 20)}<b class="mono">${coins}</b></button>` : ''}
    <button class="tool mode-btn" data-act="mode" aria-label="${isDark() ? 'Switch to light' : 'Switch to dark'} — hold for worlds" title="Light or dark (hold for worlds)">${icon(isDark() ? 'sun' : 'moon', 20)}</button>
    <button class="tool lock-btn" data-act="nav" data-arg="grownups" aria-label="Grown-ups" title="Grown-ups">${icon('lock', 20)}</button>
    ${k ? `<button class="who" data-act="sheet" aria-haspopup="dialog" aria-expanded="${!!R.ui.sheet}" aria-label="${esc(k.name)} — switch child">${av}<span class="caret-d" aria-hidden="true">${icon('chevronDown', 14)}</span></button>` : ''}
  </header>`;
}

/* ------------------------------------------------------------------ tabs (§4) */
export const TABS = [
  { k: 'home', n: 'Home', icon: 'home' },
  { k: 'atlas', n: 'Atlas', icon: 'map' },
  { k: 'library', n: 'Library', icon: 'book' },
  { k: 'puzzles', n: 'Puzzles', icon: 'puzzle' },
  { k: 'play', n: 'Play', icon: 'gamepad' },
];
export const tabRow = (nav, cl, label) => `<nav class="${cl}" aria-label="${label}">${TABS.map((t) => `<button class="${cl === 'tabs' ? 'tab' : 'tb'}${nav === t.k ? ' on' : ''}" data-act="nav" data-arg="${t.k}" ${nav === t.k ? 'aria-current="page"' : ''}>${icon(t.icon, 24)}<span>${t.n}</span></button>`).join('')}</nav>`;

/* ------------------------------------------------------------------ the ☰ drawer (§3) */
const DRAWER = [
  ['me', 'My page', 'user'], ['shop', 'Shop', 'shop'], ['collection', 'Collection', 'cards'], ['medals', 'Medals', 'medal'],
  null,
  ['mistakes', 'My mistakes', 'retry'], ['goals', 'What I’m learning', 'target'], ['stories', 'The Story Shelf', 'book'], ['contest', 'Mock contest', 'trophy'],
  null,
  ['settings', 'Settings', 'gear'], ['grownups', 'Grown-ups', 'lock'], ['help', 'Help', 'help'], ['privacy', 'Privacy', 'shield'],
];
export function drawer(k) {
  const due = k ? MD.count(k).due : 0;
  return `<div class="drawer-back" data-act="drawer" aria-hidden="true"></div>
  <nav class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="dr-head"><img src="mascot/octo-head.webp" width="32" height="32" alt=""><b>Bizzing <em>Maths</em></b>
      <button class="tool dr-x" data-act="drawer" aria-label="Close the menu">${icon('x', 20)}</button></div>
    <div class="dr-quick">
      <button class="dr-q" data-act="nav" data-arg="search">${icon('search', 20)}<span>Search</span></button>
      <button class="dr-q" data-act="sound" aria-pressed="${!R.sound}">${icon(R.sound ? 'speaker' : 'mute', 20)}<span>${R.sound ? 'Mute' : 'Sound on'}</span></button>
      <button class="dr-q" data-act="mode">${icon(isDark() ? 'sun' : 'moon', 20)}<span>${isDark() ? 'Light' : 'Dark'}</span></button>
    </div>
    <ul class="dr-list">${DRAWER.map((x) => x ? `<li><button data-act="nav" data-arg="${x[0]}"${R.ui.nav === x[0] ? ' aria-current="page"' : ''}>${icon(x[2], 22)}<span>${x[1]}</span>${x[0] === 'mistakes' && due ? `<b class="dr-n">${due}</b>` : ''}</button></li>` : '<li class="dr-sep" role="separator"></li>').join('')}
      <li><a href="${HIVE}">${icon('hex', 22)}<span>Back to the Hive</span></a></li></ul>
  </nav>`;
}

/* ------------------------------------------------------------------ the world stage (§7) */
/* Three layers of ambient life over the painted plate: the plate drifts slowly behind a
   nearer plane of the place (parallax, two planes), the place's own particles, and one idle
   traveller looping across. CSS only, paused when the page is hidden (data-hidden on <html>),
   frozen to the still under reduced motion. The night is a separately painted plate. */
const IDLE = {
  kite: '<svg viewBox="0 0 40 60" class="idle-svg"><path d="M20 2 36 20 20 40 4 20Z" fill="#E0457B"/><path d="M20 2v38M4 20h32" stroke="#fff" stroke-width="1.6"/><path d="M20 40c-4 6 4 9 0 14s4 6 0 6" stroke="#F0B429" stroke-width="2" fill="none"/></svg>',
  plane: '<svg viewBox="0 0 64 32" class="idle-svg"><path d="M2 16 62 2 40 30 30 20Z" fill="#fff" stroke="#3A2A5C" stroke-width="2" stroke-linejoin="round"/><path d="M30 20 62 2" stroke="#3A2A5C" stroke-width="1.6"/></svg>',
  gear: '<svg viewBox="0 0 48 48" class="idle-svg"><g fill="#C9A44C" stroke="#6B4E16" stroke-width="2"><path d="M24 4l4 6 7-2 1 7 7 2-2 7 6 4-6 4 2 7-7 2-1 7-7-2-4 6-4-6-7 2-1-7-7-2 2-7-6-4 6-4-2-7 7-2 1-7 7 2Z"/><circle cx="24" cy="24" r="7" fill="#F4E3B5"/></g></svg>',
  comet: '<svg viewBox="0 0 80 30" class="idle-svg"><defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><path d="M2 15 66 9v12Z" fill="url(#cg)"/><circle cx="68" cy="15" r="8" fill="#FFF3D6"/></svg>',
  car: '<img src="avatars/rally.webp" width="64" height="64" alt="" class="idle-img">',
};
export function worldStage(themeId, cls = '') {
  const t = byTheme[themeId] || THEMES[0];
  // absolute URLs: a url() inside a custom property resolves against the stylesheet that USES it
  const u = (p) => (typeof document !== 'undefined' ? new URL(p, document.baseURI).href : p);
  const st = `--pd:url(${u(plate(t.id))});--pn:url(${u(plate(t.id, true))});--pds:url(${u(plate(t.id, false, true))});--pns:url(${u(plate(t.id, true, true))})`;
  return `<div class="wstage ws-${t.id}${cls ? ' ' + cls : ''}" style="${st}" aria-hidden="true" data-world="${t.id}">
    <div class="ws-plate"></div>
    <div class="ws-near"></div>
    <div class="ws-parts">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="ws-idle ws-idle-${t.idle}">${IDLE[t.idle]}</div>
  </div>`;
}

/* ------------------------------------------------------------------ the wallet (§1.1) */
const APP_NAME = { maths: 'Maths', bee: 'Bee', geography: 'Geography', india: 'India', finance: 'Finance' };
function why(x, k) {
  const note = x.a === 'maths' && k.coinNotes ? k.coinNotes[x.t] : '';
  const w = x.why || '';
  if (w === 'answer') return 'a right answer';
  if (w === 'stop') return note ? `finished ${note}` : 'finished a stop';
  if (w === 'contest') return 'finished a mock contest';
  if (w === 'mastery') return note ? `passed ${note}` : 'passed a test';
  if (w === 'migrated') return 'coins brought over';
  if (w.startsWith('avatar:')) { const a = byAvatar[w.slice(7)]; return `bought ${a ? a.name : 'an avatar'}`; }
  if (w.startsWith('world:')) { const t = THEMES[+w.slice(6) - 1]; return `opened ${t ? t.name : 'a world'}`; }
  if (w.startsWith('frame:')) { const f = FRAMES.find((y) => y.id === w.slice(6)); return `bought the ${f ? f.name : ''} frame`; }
  if (w.startsWith('refund:')) return 'a refund';
  return note || w;
}
/* the last 30 lines, in words; a run of single right answers in one sitting is one line */
export function ledgerLines(k, max = 30) {
  const led = Family.ledger(k.name).slice().reverse(), out = [];
  for (const x of led) {
    const prev = out[out.length - 1];
    if (prev && x.why === 'answer' && prev.why === 'answer' && prev.a === x.a && prev.t0 - x.t < 30 * 60e3) { prev.n += x.n; prev.k++; prev.t0 = x.t; continue; }
    out.push({ ...x, k: 1, t0: x.t });
    if (out.length >= max) break;
  }
  return out.map((x) => ({ n: x.n, app: x.a, t: x.t, say: x.why === 'answer' && x.k > 1 ? `${x.k} right answers` : why(x, k) }));
}
export function walletSheet(k) {
  const lines = ledgerLines(k);
  return `<div class="sheet-back" data-act="wallet" aria-hidden="true"></div>
  <div class="sheet wallet" role="dialog" aria-modal="true" aria-labelledby="wal-h">
    <div class="sh-head"><h2 id="wal-h">${icon('wallet', 22)} Your Bizzing coins</h2><button class="tool" data-act="wallet" aria-label="Close">${icon('x', 18)}</button></div>
    <p class="wal-bal">${icon('coin', 34)}<b class="mono">${Family.balance(k.name)}</b></p>
    ${walletList(lines)}
    <p class="muted small">Bizzing coins are earned for learning — right answers, finished stops, passed tests — in every Bizzing app, and spent on avatars, worlds and extras at prices that never change. They never buy a lesson and never move your rank.</p>
    <button class="btn" data-act="nav" data-arg="shop">${icon('shop', 18)} Open the Shop</button>
  </div>`;
}
export function walletList(lines) {
  if (!lines.length) return '<p class="muted wal-empty">Nothing yet — your first right answer earns your first coin.</p>';
  return `<ol class="wal-list">${lines.map((l) => `<li class="${l.n > 0 ? 'in' : 'out'}"><b class="mono">${l.n > 0 ? '+' : '−'}${Math.abs(l.n)}</b><span>${esc(l.say)}</span><span class="wal-app">${l.app === 'maths' ? '<img src="mascot/octo-head.webp" width="18" height="18" alt="">' : ''}${esc(APP_NAME[l.app] || l.app)}</span><time class="muted small">${new Date(l.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time></li>`).join('')}</ol>`;
}

/* ------------------------------------------------------------------ avatar cards (§8) */
export function avatarCard(h, k, a, ctx, { act = true } = {}) {
  const s = stateOf(a, ctx), wearing = k && k.avatar === a.id;
  const btn = !act ? '' : s.state === 'owned'
    ? `<button class="btn small${wearing ? ' on' : ''}" data-act="setAv" data-arg="${a.id}" ${wearing ? 'aria-pressed="true"' : ''}>${wearing ? 'Wearing' : 'Wear'}</button>`
    : s.state === 'buy' ? `<button class="btn small" data-act="buyAv" data-arg="${a.id}" ${s.short ? 'disabled aria-disabled="true"' : ''}>${icon('coin', 16)} ${s.price}</button>` : '';
  return `<figure class="bz-av${wearing ? ' wearing' : ''}" data-tier="${a.tier}" data-state="${s.state}" data-id="${a.id}">
    <img src="${a.art}" alt="" width="120" height="120" loading="lazy" decoding="async">
    <figcaption>${esc(a.name)} <b>${TIERS[a.tier].label}</b><span class="av-say">${esc(s.say)}</span></figcaption>${btn}
  </figure>`;
}
export function packGrid(h, k, { buyFirst = false } = {}) {
  const ctx = avatarCtx(h, k); if (DEMO) ctx.who = '';
  let packs = PACKS.slice();
  if (buyFirst) packs.sort((a, b) => (worldIsOpen(h, k, Math.ceil(b.n / 2)) - worldIsOpen(h, k, Math.ceil(a.n / 2))) || a.n - b.n);
  return packs.map((p) => {
    const w = THEMES[Math.ceil(p.n / 2) - 1], open = worldIsOpen(h, k, w.n);
    const avs = CATALOGUE.filter((a) => a.pack === p.n), have = avs.filter((a) => stateOf(a, ctx).state === 'owned').length;
    return `<section class="pack" aria-labelledby="pk-${p.id}">
      <header class="pack-h"><h3 id="pk-${p.id}">${esc(p.name)}</h3><span class="muted small">${esc(p.blurb)} · ${esc(w.name)}${open ? '' : ' — opens with its world'} · ${have} of 8</span></header>
      <div class="avgrid">${avs.map((a) => avatarCard(h, k, a, ctx)).join('')}</div></section>`;
  }).join('');
}

export function viewCollection() {
  const h = R.h, k = kid(h), ctx = avatarCtx(h, k); if (DEMO) ctx.who = '';
  const have = CATALOGUE.filter((a) => stateOf(a, ctx).state === 'owned').length;
  return `<section class="collection">
    ${head('Collection', `${have} of ${CATALOGUE.length} are yours. Every card says how it is earned — never by chance.`, `<button class="btn small" data-act="nav" data-arg="shop">${icon('shop', 18)} Shop</button>`)}
    ${problems().length ? '' : ''}
    <div class="tier-key">${Object.entries(TIERS).map(([t, x]) => `<span class="tk tk-${t}"><i></i>${x.label}${x.price ? ` · ${x.price} coins` : ' · free'}</span>`).join('')}</div>
    ${packGrid(h, k)}
  </section>`;
}

/* ------------------------------------------------------------------ the Shop (§1) */
export function viewShop() {
  const h = R.h, k = kid(h), tab = R.ui.shopTab || 'avatars', coins = Family.balance(k.name);
  const tabs = [['avatars', 'Avatars', 'cards'], ['worlds', 'Worlds', 'map'], ['extras', 'Extras', 'sparkle']];
  return `<section class="shop-page">
    ${head('Shop', 'Fixed prices, printed on every card. Nothing random, nothing to win.', `<button class="coin-chip big" data-act="wallet">${icon('coin', 22)}<b class="mono">${coins}</b></button>`)}
    <div class="seg shop-tabs" role="tablist" aria-label="Shop">${tabs.map(([id, n, ic]) => `<button role="tab" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}" data-act="shopTab" data-arg="${id}">${icon(ic, 18)} ${n}</button>`).join('')}</div>
    <div class="shop-body">${tab === 'worlds' ? shopWorlds(h, k, coins) : tab === 'extras' ? shopExtras(k, coins) : packGrid(h, k, { buyFirst: true })}</div>
    <div class="card wal-card"><h2>${icon('wallet', 22)} Wallet history</h2>${walletList(ledgerLines(k))}
      <p class="muted small">Coins come from learning in every Bizzing app. A Legendary also asks for something you learned first; a world opens with the family plan, or for ${WORLD_PRICE} coins.</p></div>
  </section>`;
}
function shopWorlds(h, k, coins) {
  const cur = themeOf(k, h);
  return `<div class="worlds-grid">${THEMES.map((t) => {
    const open = worldIsOpen(h, k, t.n), on = cur === t.id;
    const short = Math.max(0, WORLD_PRICE - coins);
    return `<div class="world-card${open ? '' : ' shut'}${on ? ' on' : ''}">
      <span class="wc-art" style="background-image:url(${plate(t.id, isDark(), true)})"></span>
      <div class="wc-t"><b style="font-family:'${t.display}'">${esc(t.name)}</b><span class="muted small">${esc(t.blurb)}</span>
        <span class="wc-say">${t.n <= 2 ? 'Free for everyone' : open ? 'Yours' : `Family plan, or ${WORLD_PRICE} coins${short ? ` · ${short} more to go` : ''}`}</span></div>
      ${open ? `<button class="btn small${on ? ' on' : ''}" data-act="theme" data-arg="${t.id}" ${on ? 'aria-pressed="true"' : ''}>${on ? 'Your world' : 'Use it'}</button>`
        : `<button class="btn small" data-act="buyWorld" data-arg="${t.n}" ${short ? 'disabled aria-disabled="true"' : ''}>${icon('coin', 16)} ${WORLD_PRICE}</button>`}
    </div>`;
  }).join('')}</div>`;
}
function shopExtras(k, coins) {
  const on = worn(k);
  return `<p class="muted">Frames for your face, on your page and in the top bar. They never change your rank or your road.</p>
    <div class="frames">${FRAMES.map((f) => { const have = owns(k, f.id); return `<div class="fr-item${on === f.id ? ' on' : ''}">
      <span class="frame fr-${f.id}"><img class="av" src="avatars/${esc(k.avatar)}.webp" width="56" height="56" alt=""></span><b>${esc(f.name)}</b>
      ${have ? `<button class="btn small" data-act="wearFrame" data-arg="${on === f.id ? '' : f.id}">${on === f.id ? 'Take it off' : 'Wear'}</button>` : `<button class="btn small" data-act="buyFrame" data-arg="${f.id}" ${coins < f.price ? 'disabled aria-disabled="true"' : ''}>${icon('coin', 16)} ${f.price}</button>`}
    </div>`; }).join('')}</div>`;
}

/* ------------------------------------------------------------------ Settings (§5) */
const sw = (act, on, label, arg = '') => `<button class="tog${on ? ' on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="${act}"${arg ? ` data-arg="${arg}"` : ''}><i></i></button>`;
const segb = (act, val, opts, label) => `<div class="seg small" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, n]) => `<button role="radio" aria-checked="${val === v}" class="${val === v ? 'on' : ''}" data-act="${act}" data-arg="${v}">${n}</button>`).join('')}</div>`;
export function viewSettings() {
  const h = R.h, k = kid(h), D = R.dev, cur = themeOf(k, h);
  const row = (label, ctl, sub = '') => `<div class="set"><span><b>${label}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</span>${ctl}</div>`;
  return `<section class="settings-sheet" aria-labelledby="set-h">
    <header class="sh-head big"><button class="back" data-act="back"><span aria-hidden="true">‹</span> Back</button><h1 id="set-h">${icon('gear', 24)} Settings</h1><button class="tool" data-act="nav" data-arg="home" aria-label="Close settings">${icon('x', 18)}</button></header>
    <div class="card set-sec" data-sec="me"><h2>Me</h2>
      ${row('Name', `<input class="inp short" value="${esc(k.name)}" readonly aria-readonly="true" aria-label="Your name">`, 'Your name is how your Bizzing coins find you in every app, so it stays as it was typed.')}
      ${row('Avatar', `<button class="btn small" data-act="nav" data-arg="collection"><img class="av" src="avatars/${esc(k.avatar)}.webp" width="28" height="28" alt=""> Choose</button>`)}
      ${row('Switch child', `<button class="btn small" data-act="sheet">${icon('users', 18)} ${h.kids.length} in this household</button>`)}
    </div>
    <div class="card set-sec" data-sec="sound"><h2>Sound &amp; music</h2>
      ${row('Sound effects', sw('setDev', D.sfx, 'Sound effects', 'sfx'), 'Right, wrong, finish, medal, coin, unlock — soft and short.')}
      ${row('Music', sw('setDev', D.music, 'Music', 'music'), 'A calm loop for each world, Home and the games.')}
      ${row('Volume', `<input type="range" class="slider" min="0" max="100" step="5" value="${Math.round(D.volume * 100)}" data-dev="volume" aria-label="Volume">`)}
      ${row('Read aloud', sw('toggle', readOn(k), 'Read aloud', 'read'), 'Questions and stories in this device’s own voice.')}
      ${row('Reading speed', segb('setRate', D.rate === 0.85 ? 'slow' : 'normal', [['slow', 'Slower'], ['normal', 'Normal']], 'Reading speed'))}
    </div>
    <div class="card set-sec" data-sec="look"><h2>Look</h2>
      <p class="set-l"><b>World</b> <span class="muted small">Two are open to everyone; the others open with the family plan or ${WORLD_PRICE} coins.</span></p>
      <div class="world-pick" role="radiogroup" aria-label="World">${THEMES.map((t) => { const open = worldIsOpen(h, k, t.n), on = cur === t.id; return `<button class="theme-card${open ? '' : ' shut'}" id="theme-${t.id}" data-act="${open ? 'theme' : 'nav'}" data-arg="${open ? t.id : 'shop'}" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-theme="${t.id}">
        <span class="tc-art" style="background-image:url(${plate(t.id, isDark(), true)})"></span><b>${esc(t.name)}</b><span class="muted small">${open ? (on ? 'Your world' : 'Open') : `Opens with the family plan or ${WORLD_PRICE} coins`}</span></button>`; }).join('')}</div>
      ${row('Light or dark', segb('setMode', D.mode || 'auto', [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match device']], 'Light or dark'))}
      ${row('Text size', segb('setText', D.text || 'M', [['S', 'S'], ['M', 'M'], ['L', 'L']], 'Text size'))}
    </div>
    <div class="card set-sec" data-sec="comfort"><h2>Comfort</h2>
      ${row('Reduce motion', sw('setDev', D.motion, 'Reduce motion', 'motion'), 'Worlds hold still; no confetti.')}
      ${row('Calm mode', sw('setDev', D.calm, 'Calm mode', 'calm'), 'Music off, softer effects, no confetti.')}
    </div>
    <div class="card set-sec" data-sec="grownups"><h2>Grown-ups ${icon('lock', 18)}</h2>
      ${row('Age band, daily targets, plan, backup and tester mode', `<button class="btn small" data-act="nav" data-arg="grownups">${icon('lock', 16)} Open with the PIN</button>`)}
    </div>
    <p class="set-foot muted small"><button class="linkish" data-act="nav" data-arg="privacy">Privacy</button> · <button class="linkish" data-act="nav" data-arg="help">About</button> · Bizzing Maths ${VERSION}</p>
  </section>`;
}

/* ------------------------------------------------------------------ Medals, Help */
export function viewMedals() {
  const k = kid(R.h), ms = medalStates(k), n = ms.filter((m) => m.earned).length;
  return `<section>${head('Medals', `${n} of ${ms.length} — every one from something you did, never from time on the app or a run of days.`)}
    <div class="card"><div class="medals">${ms.map((m) => `<div class="medal${m.earned ? ' on' : ''}">
      <img src="art/medal-${m.id}.webp" alt="" width="86" height="86" loading="lazy">
      <b>${esc(m.name)}</b><small>${esc(m.desc)}</small>
      ${m.earned ? `<small class="when">Earned ${new Date(m.earned.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small>` : `<span class="bar" role="img" aria-label="${m.now} of ${m.need}"><i style="width:${Math.round(100 * m.now / m.need)}%"></i></span><small>${m.now} of ${m.need}</small>`}
    </div>`).join('')}</div></div></section>`;
}
export const GLOSSARY = [
  ['Bizzing coins', 'The one money of every Bizzing app. Earned for learning; spent at fixed prices.'],
  ['World', 'A painted place that dresses the whole app — Patchwork Hills, Chalk Cliffs and four more.'],
  ['Atlas', 'The map of places and roads where the stops are.'],
  ['Stop', 'One step on a journey: a story, the trick, your turn, and a drill.'],
  ['Continue', 'The one big button on Home. It goes exactly where you left off.'],
  ['Collection', 'Your avatars — all 96, with how each one is earned.'],
  ['Shop', 'Avatars, worlds and extras at printed prices.'],
  ['Medals', 'Earned from evidence, each celebrated once.'],
  ['Grown-ups', 'The page behind the PIN: reports, targets and settings.'],
  ['Family plan', 'Opens every world for a family. Bought by a grown-up, never on a child’s screen.'],
];
export function viewHelp() {
  return `<section class="narrow">${head('Help', 'How Bizzing Maths works, in a minute.')}
    <div class="card help">${octo('point', 96, 'help-octo')}
      <p><b>Continue</b> on Home always takes you to your next stop. A stop has a story, the trick (and <i>why</i> it works), your turn — where you type every step — and a drill of ten.</p>
      <p>A right answer moves on by itself. A wrong one waits, and shows you the working on that exact question. Anything you miss goes into <button class="linkish" data-act="nav" data-arg="mistakes">My mistakes</button> and comes back after a gap.</p>
      <p>Keys work everywhere: digits and <kbd>Enter</kbd> to answer, <kbd>1</kbd>–<kbd>4</kbd> to choose, <kbd>Esc</kbd> to close.</p>
    </div>
    <div class="card"><h2>The words we use</h2><dl class="gloss">${GLOSSARY.map(([w, d]) => `<dt>${w}</dt><dd>${d}</dd>`).join('')}</dl></div>
  </section>`;
}

/* ------------------------------------------------------------------ search (C4) */
export function viewSearch(results, more) {
  const q = R.ui.q || '';
  const list = [...results, ...(more || [])];
  return `<section class="narrow search-page">${head('Search', '')}
    <div class="search-box">${icon('search', 22)}<input id="q" class="inp" type="search" value="${esc(q)}" placeholder="A stop, a story, a word, a place…" autocomplete="off" data-search aria-label="Search Bizzing Maths"></div>
    ${!q ? `<p class="muted center-t">Try “fractions”, “Suki”, “prime” or “bakery”.</p>`
      : list.length ? `<ul class="results" aria-live="polite">${list.map((r) => `<li><button data-act="${r.act}" data-arg="${esc(r.arg)}"><span class="r-kind">${esc(r.kind)}</span><b>${esc(r.title)}</b><span class="muted small">${esc(r.sub)}</span></button></li>`).join('')}</ul>`
      : more === null ? '<p class="muted center-t">Looking in the Dictionary…</p>' : octoState('think', `Nothing called “${esc(q)}” yet. Try a shorter word.`)}
  </section>`;
}

/* ------------------------------------------------------------------ the mistakes deck (F3) */
export function viewMistakes() {
  const k = kid(R.h), now = Date.now(), all = MD.all(k), ready = all.filter((m) => m.due <= now), later = all.filter((m) => m.due > now);
  const item = (m) => {
    const q = m.q, t = q.trick && byId[q.trick];
    return `<li class="mk"><details><summary><b class="mono">${esc(q.text)}</b> <span class="muted small">${m.misses > 1 ? `missed ${m.misses} times` : 'missed once'}${m.from ? ` · ${esc(m.from)}` : ''}</span></summary>
      <p>The answer is <b class="mono">${esc(q.ans)}</b>.</p>
      ${t ? `<ol class="steps">${t.work(q).map((s) => `<li class="shown"><span class="st-t">${esc(s.t)}</span><b class="st-v mono">${esc(s.v)}</b></li>`).join('')}</ol>` : q.why ? `<p class="why-chip">${esc(q.why)}</p>` : q.explain ? `<p>${esc(q.explain)}</p>` : ''}
      ${t ? `<button class="btn small" data-act="openStop" data-arg="${t.id}">Back to the stop: ${esc(t.title)}</button>` : ''}</details></li>`;
  };
  if (!all.length) return `<section class="narrow">${head('My mistakes', '')}${octoState('sleep', k.mistakesLearned ? `Nothing to look at again — ${k.mistakesLearned} mistake${k.mistakesLearned > 1 ? 's' : ''} already learned.` : 'Nothing here yet. Anything you miss comes here, and comes back after a gap.', '<button class="btn" data-act="nav" data-arg="home">Back to Home</button>')}</section>`;
  return `<section class="narrow mistakes">${head('My mistakes', 'They come back after a gap: tomorrow, then in three days, then in a week. Right each time, and they are learned.')}
    <div class="card mk-go">${octo(ready.length ? 'point' : 'sleep', 84)}<div><h2>${ready.length ? `${ready.length} ready to try again` : 'Nothing is ready today'}</h2>
      <p class="muted">${later.length ? `${later.length} more come back later.` : ''} ${k.mistakesLearned ? `${k.mistakesLearned} learned so far.` : ''}</p></div>
      ${ready.length ? `<button class="btn primary big" data-act="startMistakes">Try ${ready.length > 10 ? 'ten' : 'them'} again</button>` : ''}</div>
    ${ready.length ? `<h2 class="sec-h">Ready now</h2><ul class="mk-list">${ready.map(item).join('')}</ul>` : ''}
    ${later.length ? `<h2 class="sec-h">Coming back later</h2><ul class="mk-list">${later.map((m) => item(m).replace('<summary>', `<summary><span class="mk-when">${new Date(m.due).toLocaleDateString(undefined, { weekday: 'short' })}</span> `)).join('')}</ul>` : ''}
  </section>`;
}

/* the page head, the family's way */
export function head(title, sub = '', right = '') {
  return `<header class="phead"><span></span><div class="phead-t"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="phead-r">${right}</div></header>`;
}
export { worldOf, RANKS, rankOf, BANDS };
