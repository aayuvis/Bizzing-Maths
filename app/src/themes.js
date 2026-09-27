/* themes.js — the six looks, and which one is on.

   A theme belongs to the child (k.prefs.theme), so two children on one
   tablet each keep their own; light/dark stays a device setting. The
   colours, faces and moving motif live in styles/themes.css, keyed by
   data-theme on <html>. This file is the list the picker shows and the one
   place that decides what an unknown or missing value means: Graph Paper. */

export const THEMES = [
  { id: 'graph', name: 'Graph Paper', blurb: 'A fresh squared page. A curve plots itself.',
    display: 'Baloo 2', ui: 'Nunito', mono: 'Sono' },
  { id: 'chalk', name: 'Chalkboard', blurb: 'Chalk on green. Last lesson’s shapes drift by.',
    display: 'Kalam', ui: 'Atkinson Hyperlegible Next', mono: 'Atkinson Hyperlegible Mono' },
  { id: 'blueprint', name: 'Blueprint', blurb: 'An engineer’s sheet. A compass sweeps round.',
    display: 'Space Grotesk', ui: 'Archivo', mono: 'JetBrains Mono' },
  { id: 'orbit', name: 'Orbit', blurb: 'Deep space. Planets keep their ellipses.',
    display: 'Orbitron', ui: 'Exo 2', mono: 'Azeret Mono' },
  { id: 'rangoli', name: 'Rangoli', blurb: 'Marigold and magenta. Eight-fold symmetry turns.',
    display: 'Yatra One', ui: 'Mukta', mono: 'Red Hat Mono' },
  { id: 'arcade', name: 'Arcade', blurb: 'Pixels and neon. Blocks fall into place.',
    display: 'Pixelify Sans', ui: 'Lexend', mono: 'Kode Mono' },
];

export const DEFAULT_THEME = 'graph';
const IDS = new Set(THEMES.map((t) => t.id));

/* A child from before themes existed has no prefs.theme: they get the default. */
export function themeOf(k) {
  const t = k && k.prefs && k.prefs.theme;
  return IDS.has(t) ? t : DEFAULT_THEME;
}
export const isTheme = (id) => IDS.has(id);

/* Put a theme on the page. Cheap to call on every render: it only touches the
   DOM when the theme actually changes. */
export function applyTheme(id) {
  const el = document.documentElement;
  if (el.getAttribute('data-theme') === id) return;
  el.setAttribute('data-theme', id);
  syncThemeColor();
}

/* the browser's own chrome (a phone's status bar) follows the page */
export function syncThemeColor() {
  const m = document.querySelector('meta[name="theme-color"]');
  if (!m) return;
  const c = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  if (c) m.setAttribute('content', c);
}

/* The picker on the child's page: one card per theme, each wearing its own
   theme (data-theme on the card scopes that theme's colours and faces to it),
   so a child sees the real fonts and colours before choosing. A radio group:
   the chosen card is the one tab stop, arrows move the choice (main.js). */
export function themePicker(k) {
  const cur = themeOf(k);
  return `<div class="card" id="themes">
    <p class="kicker">Your theme</p>
    <p class="muted small">Colours, letters and a moving maths picture behind everything. Yours alone — nobody else on this device gets it.</p>
    <div class="themes" role="radiogroup" aria-label="Theme">${THEMES.map((t) => {
      const on = t.id === cur;
      return `<button class="theme-card" id="theme-${t.id}" data-theme="${t.id}" data-act="theme" data-arg="${t.id}" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}">
        <span class="tc-sw" aria-hidden="true"><i style="--c:var(--action)"></i><i style="--c:var(--sw2)"></i><i style="--c:var(--treasure)"></i><span class="tc-aa">Aa</span>${on ? '<span class="tc-on">On</span>' : ''}</span>
        <span class="tc-t"><b>${t.name}</b><span class="tc-n" aria-hidden="true">1234567890</span><span>${t.blurb}</span><span>${t.display} · ${t.ui} · ${t.mono}</span></span>
      </button>`;
    }).join('')}</div>
  </div>`;
}
