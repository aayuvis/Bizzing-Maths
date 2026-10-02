/* bizzing-shell.js — Bizzing Bee's chrome and home grid, as one drop-in for every Bizzing app
   (FAMILY-STANDARD §3 top bar and ☰, §4 tabs, §6 home). Pairs with bizzing-shell.css.

   It returns HTML strings, so it fits the family's state → render() idiom:

     import { shell, home, bindShell } from './bizzing-shell.js';
     root.innerHTML = shell({ app: 'geography', name: 'Geography', mascot: 'mascot/shelly-head.webp',
       tabs: [{ id: 'home', label: 'Home', icon: 'home', href: '#/home' }, …], active: 'home',
       coins: 40, dark: false, kid: { name: 'Asha', avatar: 'avatars/koi.webp' },
       search: 'Search places', drawer: { sub: 'Level 3 · Wanderer', app: [{ icon: 'compass', label: 'Expeditions', sub: '…', href: '#/exp' }] },
       content: home({ … }) });
     bindShell({ onTheme, onLock, onKid, onCoins, onSearch, onSound });   // once, at start-up

   Geometry is Bee's, measured; an app sets colours with --bz-* tokens only. Everything the
   check measures carries a data-bz attribute, so integration/shell-check.mjs can hold any app
   to Bee's layout. Esc closes the drawer; focus moves into it and back to ☰ when it closes. */

const HIVE = 'https://aayuvis.github.io/Bizzing_Schedule/';
/* Bee gives every tab icon its own colour (white on the active pill). An app may pass t.color. */
const TAB_INK = ['#6C4FE0', '#6C4FE0', '#E0457B', '#16956B', '#3D7DF0', '#E8842C'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* The family line icons: 24 grid, 2px round stroke, currentColor. */
const P = {
  hive: '<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4Z"/><path d="M12 8.2 15.3 10v4L12 15.8 8.7 14v-4Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/>',
  map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5Z"/><path d="M9 4v13.5M15 6.5V20"/>',
  pen: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5Z"/><path d="M13.5 7l3 3"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
  play: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1"/><circle cx="17.5" cy="13.5" r="1"/>',
  flag: '<path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  puzzle: '<path d="M9 4h3.5a2 2 0 1 1 3 2.2V9h3a2 2 0 1 1 0 3.5H18.5V18a2 2 0 0 1-2 2H13a2 2 0 1 0-3.5 0H6a2 2 0 0 1-2-2v-4.5a2 2 0 1 0 0-3.5V6a2 2 0 0 1 2-2Z"/>',
  town: '<path d="M3 20h18M5 20V10l4-3 4 3v10M13 20V7l3-3 3 3v13"/><path d="M8 13h2M8 16h2M15.5 10h1M15.5 13h1"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5S14.5 12.4 14.5 11V7"/><ellipse cx="15" cy="14" rx="5.5" ry="2.5"/><path d="M9.5 14v3.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V14"/>',
  learn: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5Z"/><path d="M6.5 11v5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-5"/>',
  lamp: '<path d="M9 21h6M10 17.5h4M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  bag: '<path d="M5 8h14l-1 12.5H6Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3.5 10.5 9.8M15.5 3.5 13.5 9.8M8 3.5h8"/><path d="m12 12.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.8"/><path d="M12 17h.01"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6Z"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
  next: '<path d="M9.5 6l6 6-6 6"/>',
  quote: '<path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5V12h5v5H5M19 7h-3.5A1.5 1.5 0 0 0 14 8.5V12h5v5h-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  path: '<path d="M4 19c3 0 3-4 6-4s3 4 6 4M8 9c3 0 3-4 6-4s3 4 6 4"/><circle cx="4" cy="19" r="1.4"/><circle cx="20" cy="9" r="1.4"/>',
  feed: '<rect x="4" y="3" width="16" height="8" rx="2.5"/><rect x="4" y="13" width="16" height="8" rx="2.5"/><path d="M7.5 6.5h6M7.5 16.5h9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
};
export const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.star}</svg>`;
export const ICONS = Object.keys(P);

/* The drawer's family entries, in the standard order. An app may relabel the subtitles and
   point the hrefs at its own routes; it may not reorder or drop them. */
const FAMILY_TOP = [['me', 'user', 'My page', 'your level, your week and your medals'], ['shop', 'bag', 'Shop', 'avatars, worlds and extras'],
  ['collection', 'star', 'Collection', 'your avatars'], ['medals', 'medal', 'Medals', 'what you have done, and what is next']];
const FAMILY_END = [['settings', 'settings', 'Settings', 'me, sound, look and comfort'], ['grownups', 'lock', 'Grown-ups', 'report card, plan and backup — needs the PIN'],
  ['help', 'help', 'Help', 'how coins, worlds and mastery work'], ['privacy', 'shield', 'Privacy', 'what stays on this device']];

function drawerHTML(o) {
  const d = o.drawer || {}, routes = d.routes || {}, subs = d.subs || {};
  const item = ([id, ic, label, sub]) => `<a href="${esc(routes[id] || '#/' + id)}" data-bz-dr="${id}">${icon(ic)}<b>${esc(label)}</b><small>${esc(subs[id] || sub)}</small></a>`;
  const appItems = (d.app || []).slice(0, 4).map((x) => `<a href="${esc(x.href)}" data-bz-dr="app">${icon(x.icon)}<b>${esc(x.label)}</b><small>${esc(x.sub || '')}</small></a>`).join('');
  return `<div class="bz-scrim" data-bz="scrim" data-bz-act="close" hidden></div>
<aside class="bz-dr" data-bz="drawer" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="bz-dr-who">${o.kid?.avatar ? `<img src="${esc(o.kid.avatar)}" alt="">` : ''}<div><strong>${esc(o.kid?.name || '')}</strong><small>${esc(d.sub || '')}${o.coins != null ? ` · ${o.coins} coins` : ''}</small></div>
    <button class="bz-ib" data-bz-act="sound" aria-label="Sound on or off">${icon('sound')}</button><button class="bz-ib" data-bz-act="close" aria-label="Close menu">${icon('close')}</button></div>
  ${FAMILY_TOP.map(item).join('')}
  ${appItems ? `<hr><h6>Bizzing ${esc(o.name)}</h6>${appItems}` : ''}
  <hr>${FAMILY_END.map(item).join('')}
  <a href="${HIVE}" data-bz-dr="hive">${icon('hive')}<b>Back to the Hive</b><small>your day across every Bizzing app</small></a>
</aside>`;
}

/* The whole chrome around a screen. `content` is the screen's own HTML. */
export function shell(o) {
  const tabs = (o.tabs || []);
  if (tabs.length < 4 || tabs.length > 6) throw new Error('bizzing-shell: an app has 4 to 6 tabs (FAMILY-STANDARD §4)');
  if (tabs[0].id !== 'home') throw new Error('bizzing-shell: Home is always the first tab');
  const cur = (t) => (t.id === o.active ? ' aria-current="page"' : '');
  const inRun = !!o.inRun;   // inside a timed drill: ⬡ hides, nothing else moves
  return `<header class="bz-hdr" data-bz="header">
  <div class="bz-bar" data-bz="bar">
    <a class="bz-ib" data-bz="hive" href="${HIVE}" aria-label="Back to the Bizzing Hive"${inRun ? ' style="visibility:hidden"' : ''}>${icon('hive')}</a>
    <button class="bz-ib" data-bz="menu" data-bz-act="menu" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
    <a class="bz-brand" data-bz="brand" href="${esc(tabs[0].href)}" aria-label="Bizzing ${esc(o.name)} — home">${o.mascot ? `<img src="${esc(o.mascot)}" alt="">` : ''}<span class="bz-word"><i>Bizzing</i> <b>${esc(o.name)}</b></span></a>
    <form class="bz-search" data-bz="search" role="search" data-bz-act="search"><label>${icon('search')}<input type="search" name="q" placeholder="${esc(o.search || 'Search')}" aria-label="${esc(o.search || 'Search')}" value="${esc(o.query || '')}"></label></form>
    <button class="bz-coins" data-bz="coins" data-bz-act="coins" aria-label="${o.coins ?? 0} Bizzing coins — your coin history">${icon('coin')}<span>${o.coins ?? 0}</span></button>
    <button class="bz-ib" data-bz="theme" data-bz-act="theme" aria-label="${o.dark ? 'Light' : 'Dark'} mode">${icon(o.dark ? 'sun' : 'moon')}</button>
    <button class="bz-ib" data-bz="lock" data-bz-act="lock" aria-label="Grown-ups (needs the PIN)">${icon('lock')}</button>
    <button class="bz-kid" data-bz="kid" data-bz-act="kid" aria-label="${esc(o.kid?.name || 'Child')} — switch child">${o.kid?.avatar ? `<img src="${esc(o.kid.avatar)}" alt="">` : ''}<span aria-hidden="true">▾</span></button>
  </div>
  <nav class="bz-tabs" data-bz="tabs" aria-label="Main">${tabs.map((t, i) => `<a class="bz-tab" data-bz="tab" href="${esc(t.href)}"${cur(t)} style="--tab-ink:${esc(t.color || TAB_INK[i])}">${icon(t.icon)}<span>${esc(t.label)}</span></a>`).join('')}</nav>
</header>
<main class="bz-content" data-bz="content" id="main">${o.content || ''}</main>
<nav class="bz-tabbar" data-bz="tabbar" aria-label="Main">${tabs.map((t) => `<a href="${esc(t.href)}"${cur(t)}>${icon(t.icon)}<span>${esc(t.label)}</span></a>`).join('')}</nav>
${drawerHTML(o)}`;
}

/* Bee's home: row 1 greeting · daily ring · "… of the hour"; row 2 the two journey cards (only
   the first has the filled button); row 3 tip · quote. Every slot takes the app's own words. */
export function home(h) {
  const prog = (p) => (p ? `<div class="bz-prog"><i><b style="width:${Math.max(0, Math.min(100, p.pct || 0))}%"></b></i>${p.label ? `<small>${esc(p.label)}</small>` : ''}</div>` : '');
  const journey = (j, primary) => j ? `<article class="bz-journey ${primary ? 'bz-next' : 'bz-second'}" data-bz="${primary ? 'next' : 'second'}">
    <div class="bz-plate" style="background-image:url('${esc(j.plate)}')"><span class="bz-badge">${icon(j.icon || 'path')}</span></div>
    <div class="bz-chiprow">${j.chip ? `<span>${esc(j.chip)}</span>` : ''}</div>
    <div class="bz-jbody"><small>${esc(j.kicker)}</small><h3>${esc(j.title)}</h3><p>${esc(j.sub || '')}</p>
      <div class="bz-jrow"><a class="bz-btn${primary ? '' : ' out'}" data-bz="${primary ? 'continue' : 'secondary'}" href="${esc(j.href)}">${icon(primary ? 'next' : j.ctaIcon || 'pen')}${esc(j.cta || (primary ? 'Continue' : 'Open'))}</a>${prog(j.progress)}</div></div></article>` : '';
  const g = h.greet || {}, r = h.ring || {}, w = h.hour || {};
  return `<div class="bz-home" data-bz="home">
  <div class="bz-r1" data-bz="r1">
    <section class="bz-card bz-greet" data-bz="greet">${g.mascot ? `<img src="${esc(g.mascot)}" alt="">` : ''}<div><small>${esc(g.hello || 'Hello,')}</small><strong>${esc(g.name || '')}</strong><div class="bz-bubble">${esc(g.line || '')}</div></div></section>
    <section class="bz-card bz-ringcard" data-bz="ring"><div>${r.html || ''}</div>${r.foot ? `<a class="bz-ringfoot" href="${esc(r.foot.href || '#/me')}"><span><small>${esc(r.foot.kicker || 'Your level')}</small><b>${esc(r.foot.title || '')}</b></span><span style="margin-left:auto">${icon('next')}</span></a>` : ''}</section>
    <a class="bz-card bz-hour" data-bz="hour" href="${esc(w.href || '#')}"><span class="bz-badge">${icon(w.icon || 'clock')}</span><span><span class="bz-kicker">${esc(w.kicker || '')}</span><h3>${esc(w.title || '')}</h3><p>${esc(w.sub || '')}</p></span></a>
  </div>
  <div class="bz-r2" data-bz="r2">${journey(h.next, true)}${journey(h.second, false)}</div>
  <div class="bz-r3" data-bz="r3">
    ${h.tip ? `<a class="bz-card bz-small bz-tip" data-bz="tip" href="${esc(h.tip.href || '#')}"><span><span class="bz-kicker">${esc(h.tip.kicker || 'Tip')}</span><p>${esc(h.tip.text)}</p></span><span class="bz-badge" style="margin-left:auto;border-radius:50%">${icon('next')}</span></a>` : ''}
    ${h.quote ? `<a class="bz-card bz-small bz-quote" data-bz="quote" href="${esc(h.quote.href || '#')}"><span class="bz-badge">${icon('quote')}</span><span><span class="bz-kicker">${esc(h.quote.kicker || 'Quote of the hour')}</span><blockquote>“${esc(h.quote.text)}”</blockquote>${h.quote.who ? `<small>— ${esc(h.quote.who)}</small>` : ''}</span></a>` : ''}
  </div>
  ${h.foot ? `<div class="bz-foot">${h.foot}</div>` : ''}
</div>`;
}

/* Every screen below Home opens with one of Bee's two heads (measured from Bee's #/atlas and
   #/library): a TAB ROOT gets the title on the left and its actions as chips on the right; a
   page DEEPER than a tab gets a back pill to its parent and a centred title with a subtitle.
   `tabs` (optional) is a sub-nav of 2–6 chips under the head; `strip` an optional progress card. */
export function pageHead(p) {
  const chips = (p.actions || []).map((a) => `<a class="bz-chip" href="${esc(a.href)}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</a>`).join('');
  const head = p.back
    ? `<div class="bz-phead bz-phead-back" data-bz="phead"><a class="bz-backpill" data-bz="back" href="${esc(p.back.href)}">${icon('back')}${esc(p.back.label || 'Home')}</a>
        <h1><span>${esc(p.title)}</span>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</h1>${chips ? `<span class="bz-pactions">${chips}</span>` : '<span></span>'}</div>`
    : `<div class="bz-phead bz-phead-root" data-bz="phead"><h1><span>${esc(p.title)}</span>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</h1>${chips ? `<span class="bz-pactions">${chips}</span>` : ''}</div>`;
  const sub = (p.tabs || []).length ? `<nav class="bz-subnav" data-bz="subnav" aria-label="${esc(p.title)} sections">${p.tabs.slice(0, 6).map((t) => `<a class="bz-chip" href="${esc(t.href)}"${t.id === p.active ? ' aria-current="page"' : ''}>${t.icon ? icon(t.icon) : ''}${esc(t.label)}</a>`).join('')}</nav>` : '';
  const strip = p.strip ? `<div class="bz-strip" data-bz="strip">${p.strip.chip ? `<span class="bz-stripchip">${esc(p.strip.chip)}</span>` : ''}<span class="bz-prog"><i><b style="width:${Math.max(0, Math.min(100, p.strip.pct || 0))}%"></b></i></span>${p.strip.label ? `<small>${esc(p.strip.label)}</small>` : ''}</div>` : '';
  return head + sub + strip;
}

/* Wire the chrome once. Delegated, so it survives every re-render. */
let bound = null;
export function bindShell(on = {}) {
  if (bound) { bound.on = on; return; }
  bound = { on, last: null };
  const $ = (s) => document.querySelector(s);
  const open = () => { const d = $('[data-bz="drawer"]'), s = $('[data-bz="scrim"]'); if (!d) return; bound.last = document.activeElement;
    d.hidden = false; s.hidden = false; $('[data-bz="menu"]')?.setAttribute('aria-expanded', 'true'); d.querySelector('a,button')?.focus(); };
  const close = () => { const d = $('[data-bz="drawer"]'), s = $('[data-bz="scrim"]'); if (!d || d.hidden) return; d.hidden = true; s.hidden = true;
    $('[data-bz="menu"]')?.setAttribute('aria-expanded', 'false'); (bound.last && document.contains(bound.last) ? bound.last : $('[data-bz="menu"]'))?.focus(); };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-bz-act],[data-bz-dr]'); if (!t) return;
    if (t.dataset.bzDr) { close(); return; }                     // a drawer link: follow it, close the drawer
    const a = t.dataset.bzAct;
    if (a === 'search') return;
    if (a === 'menu') { e.preventDefault(); open(); return; }
    if (a === 'close') { e.preventDefault(); close(); return; }
    const f = bound.on['on' + a[0].toUpperCase() + a.slice(1)]; if (f) { e.preventDefault(); f(e); }
  });
  document.addEventListener('submit', (e) => { const f = e.target.closest('[data-bz="search"]'); if (!f) return; e.preventDefault(); bound.on.onSearch?.(f.q.value.trim()); });
  document.addEventListener('keydown', (e) => {
    const d = $('[data-bz="drawer"]'); if (!d || d.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { const f = [...d.querySelectorAll('a,button')]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  });
  window.addEventListener('hashchange', close);
}
