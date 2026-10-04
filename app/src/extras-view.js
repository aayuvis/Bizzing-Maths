/* extras-view.js — the Shop's road skins, paper skins and game modes (extras.js), and the
   bonus-mode row under the Play tab's games. Pure: state in, string out. */
import { esc } from './ui.js';
import { icon } from './icons.js';
import { bandY } from './board.js';
import { SKINS, MODES, PAPERS, ownsSkin, ownsMode, skinOf, ownsPaper, paperOf, modesFor } from './extras.js';
import { GAMES } from './arcade.js';

/* a little road in the skin, so the card shows what it buys */
function preview(id) {
  let d = ''; for (let x = 0; x <= 100; x += 4) d += `${x ? 'L' : 'M'}${x},${bandY(x, 58, 16, 1).toFixed(1)} `;
  const pin = (x, cls, n) => `<span class="bpin${cls}" style="left:${x}%;top:${bandY(x, 58, 16, 1).toFixed(1)}%"><span>${n}</span></span>`;
  return `<span class="sk-prev" data-p="${id}" aria-hidden="true">
    <svg class="road" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}" class="rd-edge"/><path d="${d}" class="rd"/><path d="${d.split(' L52')[0]}" class="rd-walk"/></svg>
    ${pin(16, ' done', icon('check', 12))}${pin(50, ' cur', 2)}${pin(84, '', 3)}</span>`;
}

const price = (p, coins, act, id) => `<button class="btn small" data-act="${act}" data-arg="${id}" ${coins < p ? 'disabled aria-disabled="true"' : ''} aria-label="Buy for ${p} coins">${icon('coin', 16)} ${p}</button>`;

export function shopSkins(k, coins) {
  const on = skinOf(k);
  return `<h2 class="ex-h">${icon('map', 20)} Road skins</h2>
    <p class="muted">How every painted road looks — the path and its pins, on the Atlas, the level roads and the Library's journeys. Never where a stop is, or what it holds.</p>
    <div class="skins">${SKINS.map((s) => { const have = ownsSkin(k, s.id); return `<div class="sk-item${on === s.id ? ' on' : ''}" data-skin-card="${s.id}">
      ${preview(s.id)}<b>${esc(s.name)}</b><span class="muted small">${esc(s.blurb)}</span>
      ${have ? `<button class="btn small" data-act="wearSkin" data-arg="${on === s.id ? '' : s.id}">${on === s.id ? 'Back to the plain road' : 'Use it'}</button>` : price(s.price, coins, 'buySkin', s.id)}
    </div>`; }).join('')}</div>`;
}

/* a little paper in the skin: its header band, a question on the paper, the clock — drawn by the
   same extras.css rules as the real paper, through .pp-prev[data-pp] */
const paperPreview = (id) => `<span class="pp-prev" data-pp="${id}" aria-hidden="true">
    <span class="pp-bar"><b>Paper 7</b><span class="pp-time">24:00</span></span>
    <span class="pp-q"><span class="pp-k">Question 3 of 24</span><span class="pp-t">48 + 37 = ?</span></span></span>`;

export function shopPapers(k, coins) {
  const on = paperOf(k);
  return `<h2 class="ex-h">${icon('pen', 20)} Paper skins</h2>
    <p class="muted">How a Contest Hall paper looks while you sit it — the paper, its header and the clock. The questions, the marks and the time stay exactly the same.</p>
    <div class="skins papers-sk">${PAPERS.map((x) => { const have = ownsPaper(k, x.id); return `<div class="pp-item${on === x.id ? ' on' : ''}" data-paper-card="${x.id}">
      ${paperPreview(x.id)}<b>${esc(x.name)}</b><span class="muted small">${esc(x.blurb)}</span>
      ${have ? `<button class="btn small" data-act="wearPaper" data-arg="${on === x.id ? '' : x.id}">${on === x.id ? 'Back to the plain paper' : 'Use it'}</button>` : price(x.price, coins, 'buyPaper', x.id)}
    </div>`; }).join('')}</div>`;
}

export function shopModes(k, coins) {
  return `<h2 class="ex-h">${icon('gamepad', 20)} Game modes</h2>
    <p class="muted">New ways to play the Arcade's games — still practice, scored on right answers and close guesses, never on luck. A mode pays what its game pays. Bought once, yours to keep.</p>
    <div class="modes">${MODES.map((m) => { const have = ownsMode(k, m.id), g = GAMES.find((x) => x.id === m.game); return `<div class="md-item${have ? ' on' : ''}" data-mode-card="${m.id}">
      <span class="md-art" style="background-image:url(art/g-${m.game}.webp)" aria-hidden="true"></span>
      <span class="md-t"><span class="kicker">${esc(g.title)}</span><b>${esc(m.name)}</b><span class="muted small">${esc(m.blurb)}</span></span>
      ${have ? `<button class="btn small" data-act="play" data-arg="${m.id}">${icon('play', 16)} Play</button>` : price(m.price, coins, 'buyMode', m.id)}
    </div>`; }).join('')}</div>`;
}

/* Under the Play tab's games: each game's modes, played if bought, or a way to the Shop. */
export function arcadeModes(k) {
  return `<h2 class="ex-h">${icon('sparkle', 20)} Bonus modes</h2>
    <div class="amodes">${GAMES.map((g) => `<div class="am-row"><b>${esc(g.title)}</b>${modesFor(g.id).map((m) => ownsMode(k, m.id)
      ? `<button class="btn small" data-act="play" data-arg="${m.id}">${icon('play', 16)} ${esc(m.name)}</button>`
      : `<button class="btn small ghost am-shut" data-act="nav" data-arg="shop" aria-label="${esc(m.name)}: in the Shop for ${m.price} coins">${icon('lock', 16)} ${esc(m.name)} · ${icon('coin', 14)} ${m.price}</button>`).join('')}</div>`).join('')}</div>`;
}
