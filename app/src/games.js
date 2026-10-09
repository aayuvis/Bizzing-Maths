/* games.js — the Arcade. Four games (and Sudoku), every one with keyboard AND touch.

   Each game runs in its own fullscreen overlay appended to <body> — Bizzing
   Bee's `.arc-play` lesson: the app re-renders its whole DOM on a tap, and a
   game that lives inside that DOM loses its frame every time a toast fires.
   A game here owns its overlay, its loop and its keys until it calls done().

   Each game is fed from what the child is actually learning — Number Rush
   serves the child's own facts off their ramp, Make the Target sizes its
   numbers to the age band — so a game is practice with a costume on, not a
   detour from it. Games pay XP only for right answers, through the same
   `tick()` every drill uses. */

import { ramp, key as fkey, answer, text as ftext, state as fstate } from './facts.js';
import * as RU from './rush.js';
import { setLevel, verdictLine } from './game-level.js';
import { int, pick, shuffle, seeded, dayKey } from './rand.js';
import { esc, sfx, confetti, music } from './ui.js';
import { icon } from './icons.js';
import { makeSudoku, conflicts, SUDOKU } from './puzzles.js';
import { cubePuzzle, viewsOf, sameViews, count as cubeCount, LEVELS as CUBE_LEVELS, BANK as CUBE_BANK, bandLevel as cubeLevel } from './cubes.js';

/* ------------------------------------------------------------ the frame */

/* Every game here meets Family Standard §10, and the shared kit below is how:
   a title card with a three-second how-to (`intro`), motion on every answer
   (`pop` on a right one, `wobble` on a wrong one — a wobble of the thing that
   was wrong, never a screen shake), a small sound per action, a soft music
   loop (ui.js `music`), a combo meter, and a finish screen that names what was
   practised (`resultCard`). Keyboard and touch reach all of it.

   The combo is DISPLAY ONLY. It counts consecutive right answers and drops to
   nought on a miss, so it rewards accuracy — a decision — and never luck; but
   it is never passed to onTick/onEnd/onSolve, so it cannot change a wage, a
   score, a star or a rank. What pays is what was already paid: right answers. */

let current = null;
let musicOff = false;           // the ♪ button in the play bar: this session only
export const active = () => current;
/* For the headless walk only (as main.js's window.__bzm): it reads the bubbles
   in the air and can end a long game early. Never read by the app. */
if (typeof window !== 'undefined') window.__bzmGames = { active };
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced';

/* A GAME HAS A HASH (audit C2). Opening one pushes #/game/<id> onto the history, so the
   browser's Back closes the game and lands on the screen it was opened from — instead of
   leaving that screen. Closing it any other way (Back button in the bar, Escape, Done)
   steps the history back off that entry, so the address is never left on a closed game.
   "Play again" replaces the entry rather than stacking another one. */
const GSTATE = 'bzmGame';
const onGameEntry = () => { try { return !!(history.state && history.state[GSTATE]); } catch { return false; } };
let backPending = false, queued = null, restarting = false;
function pushGame(gid) {
  // a game opened while the last one's step back is still under way waits for it to land
  if (backPending) { queued = gid; return; }
  try {
    if (onGameEntry()) history.replaceState({ [GSTATE]: gid }, '', '#/game/' + gid);
    else history.pushState({ [GSTATE]: gid }, '', '#/game/' + gid);
  } catch (e) {}
}
function stepBack() { if (!restarting && !backPending && onGameEntry()) { backPending = true; history.back(); } }
if (typeof window !== 'undefined') addEventListener('popstate', () => {
  if (backPending) { backPending = false; if (queued) { const q = queued; queued = null; pushGame(q); } return; }
  if (current && !onGameEntry()) current.quit();   // the browser's Back: close the game
});
/* "Play again" closes the round and opens the next one as ONE step: the entry stays. */
function restart(again) {
  restarting = true;
  try { again(); } finally { restarting = false; }
  if (!current) stepBack();
}

function frame(title, sub, onClose, art, gid = art || 'game') {
  pushGame(gid);
  const el = document.createElement('div');
  el.className = 'play' + (art ? ' has-art g-' + art : '');
  // inline, so the plate resolves against the page like every other plate (a url in a
  // custom property would resolve against the hashed stylesheet in assets/)
  if (art) el.style.backgroundImage = `linear-gradient(var(--veil), var(--veil)), url(art/g-${art}.webp)`;
  el.dataset.juice = '0';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.innerHTML = `
    <div class="play-bar">
      <button class="play-x" data-g="close" aria-label="Back — close the game (Escape)">${icon('back', 20)}<span>Back</span></button>
      <div class="play-t"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
      <div class="gcombo" aria-hidden="true"></div>
      <div class="play-hud" aria-live="polite"></div>
      <button class="play-m" data-g="music" aria-label="Music (M)" aria-pressed="${musicOff ? 'false' : 'true'}">${icon('music', 20)}</button>
    </div>
    <div class="play-body"></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('playing');
  el.querySelector('[data-g=close]').addEventListener('click', () => onClose());
  el.querySelector('[data-g=music]').addEventListener('click', () => toggleMusic());
  return { el, body: el.querySelector('.play-body'), hud: el.querySelector('.play-hud'), combo: el.querySelector('.gcombo') };
}

function toggleMusic() {
  musicOff = !musicOff;
  if (!current) return;
  current.f.el.querySelector('[data-g=music]').setAttribute('aria-pressed', musicOff ? 'false' : 'true');
  if (musicOff) music.stop(); else if (current.tune && current.begun && !current.ended) music.start(current.tune);
}

function end(g) {
  if (!g) return;
  try { g.stop && g.stop(); } catch (e) {}
  clearTimeout(g.introT);
  music.stop();
  g.f.el.remove();
  document.documentElement.classList.remove('playing');
  if (current === g) current = null;
  // closed from inside the game (not by the browser's Back): take its entry off the history
  stepBack();
}

export function closeGame() { if (current) current.quit(); }

/* Global keys route here while a game is up (main.js checks active()). */
export function gameKey(ev) {
  if (!current) return false;
  if (current.intro) return current.intro(ev);
  if ((ev.key === 'm' || ev.key === 'M') && !current.ended) { toggleMusic(); return true; }
  if (current.key) return current.key(ev);
  return false;
}

/* ---------------------------------------------------------------- juice */

/* How many motion events a game has made: at least one per answer. The
   headless walk reads it to prove that every answer moves something. */
function juice(g) { g.f.el.dataset.juice = String(+g.f.el.dataset.juice + 1); }

/* Pop particles at (x, y) inside `host` (which must be position:relative).
   Under reduced motion it is one soft ring that fades where it stands. */
const POPH = [45, 200, 330, 150, 265, 20];
function pop(g, host, x, y, label = '') {
  juice(g);
  const el = document.createElement('div');
  const still = calm();
  el.className = 'gpop' + (still ? ' calm' : '');
  el.setAttribute('aria-hidden', 'true');
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  el.innerHTML = (still ? '' : Array.from({ length: 12 }, (_, i) =>
    `<i style="--a:${i * 30 + int(-10, 10)}deg;--d:${int(44, 86)}px;--h:${POPH[i % POPH.length]};--s:${int(6, 11)}px"></i>`).join('')) +
    `<span class="gpop-ring"></span>${label ? `<b>${esc(label)}</b>` : ''}`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 900);
  return el;
}
/* A popped Rush bubble splashes: droplets of its own colour and a ring its own size, where it was.
   Under reduced motion the ring stands still for a moment and goes (games.css .gsplash.calm). */
function splash(host, b) {
  const el = document.createElement('div'), still = calm();
  el.className = 'gsplash' + (still ? ' calm' : '');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `left:${Math.round(b.x)}px;top:${Math.round(b.y)}px;--r:${Math.round(b.r)}px;--h:${b.hue}`;
  el.innerHTML = '<span class="gs-ring"></span>' + Array.from({ length: 10 }, (_, i) =>
    `<i style="--a:${i * 36 + int(-12, 12)}deg;--d:${Math.round(b.r * 0.9 + int(10, 34))}px;--s:${int(7, 12)}px"></i>`).join('');
  host.appendChild(el);
  setTimeout(() => el.remove(), still ? 450 : 700);
}
/* The answer flies up to the score: the number the child typed goes where it counts (G6). */
function fly(g, host, x, y, text) {
  if (calm()) return;
  const to = g.f.hud.getBoundingClientRect(), from = host.getBoundingClientRect();
  const el = document.createElement('b');
  el.className = 'gfly'; el.setAttribute('aria-hidden', 'true'); el.textContent = text;
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
  el.style.setProperty('--dx', Math.round(to.left + to.width / 2 - from.left - x) + 'px');
  el.style.setProperty('--dy', Math.round(to.top + to.height / 2 - from.top - y) + 'px');
  host.appendChild(el); setTimeout(() => el.remove(), 800);
}
/* A wrong answer wobbles the thing that was wrong. Never the screen. */
function wobble(g, el) {
  juice(g);
  if (!el) return;
  el.classList.remove('gwob'); void el.offsetWidth; el.classList.add('gwob');
  setTimeout(() => el.classList.remove('gwob'), 520);
}
/* the centre of `el` in `host`'s coordinates */
function centre(el, host) {
  const a = el.getBoundingClientRect(), b = host.getBoundingClientRect();
  return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2];
}

/* The combo: consecutive right answers. Pure, so a test can hold it to its
   one rule — it moves only with right answers and a miss returns it to nought. */
export const comboNext = (n, right) => (right ? n + 1 : 0);
function comboMeter(g) {
  const c = { n: 0, best: 0 };
  const show = (cls) => {
    const el = g.f.combo, lit = c.n && c.n % 5 === 0 ? 5 : c.n % 5;
    el.className = 'gcombo' + (c.n ? ' on' : '') + (c.n >= 5 ? ' hot' : '') + (cls ? ' ' + cls : '');
    el.innerHTML = c.n ? `<span class="gc-pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lit ? 'lit' : ''}"></i>`).join('')}</span><b>${c.n}</b><span class="gc-l">in a row</span>` : '';
    el.dataset.n = String(c.n);
    // the screen's edge glows on a run of three, and warms on five (G6) — a glow, never a shake
    g.f.el.classList.toggle('edge', c.n >= 3); g.f.el.classList.toggle('edge-hot', c.n >= 5);
  };
  c.hit = () => { c.n = comboNext(c.n, true); c.best = Math.max(c.best, c.n); if (c.n > 1) sfx.combo(c.n); show('bump'); };
  c.miss = () => { const had = c.n; c.n = comboNext(c.n, false); show(had ? 'drop' : ''); };
  show();
  return c;
}

/* ------------------------------------------------------- the title card */

/* The title card and a three-second how-to. It starts by itself when the bar
   has filled; any key, or a tap anywhere on the card, starts it now; Escape
   leaves. `practises` says what the game practises in a child's words, and the
   same idea heads the finish screen. */
export const HOWTO = {
  rush: { practises: 'your own facts, at speed', steps: [['○', 'Sums drift down from the sky.'], ['⌨', 'Type the answer on the keys or the pad.'], ['✦', 'Right pops it. Three landings and it ends.']] },
  target: { practises: 'joining numbers with + − × ÷', steps: [['☝', 'Tap a number, then + − × or ÷, then another.'], ['⊕', 'The two join into one new number.'], ['◎', 'Use every number to make the target.']] },
  line: { practises: 'estimating where a number sits', steps: [['?', 'A number appears above the line.'], ['↔', 'Drag, tap, or use ← → to move the marker.'], ['▼', 'Place it. The closer, the more points.']] },
  cubes: { practises: 'reading a shape from its front, side and top', steps: [['▦', 'Three views show a stack of cubes: front, side, top.'], ['▲', 'Pick a square, then raise or lower its tower.'], ['✓', 'Match all three views. Fewest cubes earns a third star.']] },
  sudoku: { practises: 'logic: every row, column and box once', steps: [['▢', 'Pick an empty square.'], ['✎', 'Fill it in, by tap or by key.'], ['✓', 'No row, column or box may repeat one.']] },
  // the bonus modes (extras.js): each its own how-to, the same keys and pad as its game
  'rush:mixed': { practises: 'fact families: 7 × 8, 8 × 7, 56 ÷ 7, 56 ÷ 8', steps: [['⇄', 'A whole fact family falls together: 7 × 8, 8 × 7, 56 ÷ 8, 56 ÷ 7.'], ['⌨', 'Type each answer on the keys or the pad.'], ['✦', 'Know one and you know the family. Three landings ends it.']] },
  'rush:squares': { practises: 'square numbers, at speed', steps: [['▢', 'Every bubble is a number times itself, the trickiest last.'], ['⌨', 'Type the square on the keys or the pad.'], ['✦', 'A miss shows why: n² is (n − 1)², plus 2n, take 1.']] },
  'target:five': { practises: 'joining five numbers with + − × ÷', steps: [['☝', 'Tap a number, then + − × or ÷, then another.'], ['⊕', 'Five numbers this time: keys 1 to 5.'], ['◎', 'Use every number to make the target.']] },
  'target:hard': { practises: 'reaching big targets with × and ÷', steps: [['☝', 'Tap a number, then + − × or ÷, then another.'], ['×', 'Adding alone will not get there: you need × or ÷.'], ['◎', 'Use every number to make the target.']] },
  'line:fractions': { practises: 'where a fraction sits between 0 and 1', steps: [['½', 'A fraction appears above the line.'], ['↔', 'Drag, tap, or use ← → to move the marker.'], ['▼', 'Halves first, then quarters. The closer, the more points.']] },
  'line:negatives': { practises: 'numbers below nought', steps: [['0', 'Nought is in the middle; below it, the negatives.'], ['↔', 'Drag, tap, or use ← → to move the marker.'], ['▼', 'Place it. The closer, the more points.']] },
};
const MODE_NAME = { 'rush:mixed': 'Inverse', 'rush:squares': 'Squares', 'target:five': 'Five numbers', 'target:hard': 'Hard target', 'line:fractions': 'Fractions', 'line:negatives': 'Negatives' };
const modeKey = (game, mode) => (mode && HOWTO[game + ':' + mode] ? game + ':' + mode : null);
const titled = (t, mk) => (mk ? `${t} · ${MODE_NAME[mk]}` : t);
export const INTRO_MS = 3000;
function intro(g, title, id, begin) {
  const h = HOWTO[id];
  g.f.el.classList.add('intro-on');
  g.f.body.innerHTML = `<div class="g-intro" role="group" aria-label="How to play ${esc(title)}">
      <div class="g-card">
        <p class="kicker">Practises ${esc(h.practises)}</p>
        <h2>${esc(title)}</h2>
        <ol class="g-how">${h.steps.map(([ic, t], i) => `<li style="--i:${i}"><span class="g-ico" aria-hidden="true">${ic}</span><span>${esc(t)}</span></li>`).join('')}</ol>
        <div class="g-bar" aria-hidden="true"><i style="animation-duration:${INTRO_MS}ms"></i></div>
        <button class="btn primary big" data-g="go">Play <kbd>Enter</kbd></button>
        <p class="g-skip">Starts by itself · tap or press any key to start now</p>
      </div></div>`;
  let gone = false;
  const go = () => {
    if (gone || current !== g) return; gone = true;
    clearTimeout(g.introT); g.intro = null; g.begun = true;
    g.f.el.classList.remove('intro-on');
    sfx.pop();
    if (!musicOff && g.tune) music.start(g.tune);
    begin();
  };
  g.f.body.querySelector('.g-intro').addEventListener('click', go);
  g.intro = (e) => { if (e.key === 'Escape') { g.quit(); return true; } if (/^(Tab|Shift|Control|Alt|Meta)$/.test(e.key)) return false; go(); return true; };
  g.introT = setTimeout(go, INTRO_MS);
  g.f.body.querySelector('button[data-g=go]').focus({ preventScroll: true });
}

/* --------------------------------------------------------- the finish */

/* The finish screen names what was practised — the facts, the sums, the
   numbers placed — so a child (and a grown-up looking over a shoulder) can see
   the learning, not just a number. `practised.items` are what went well,
   `practised.again` what to come back to. Enter plays again, Escape leaves. */
function resultCard(g, { title, lines, stars, again, done, practised, best }) {
  const f = g.f;
  g.ended = true;
  music.stop();
  const s = [1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('');
  const P = practised || {};
  const list = (xs, cls) => (xs && xs.length ? `<ul class="g-facts ${cls}">${xs.map((x) => `<li class="mono">${esc(x)}</li>`).join('')}</ul>` : '');
  f.combo.innerHTML = ''; f.combo.className = 'gcombo';
  f.body.innerHTML = `<div class="play-end">
      <div class="stars big" aria-label="${stars} of 3 stars">${s}</div>
      <h2>${esc(title)}</h2>
      <div class="g-practised">
        <p class="kicker">You practised</p>
        <p class="g-skill">${esc(P.skill || '')}</p>
        ${list(P.items, 'ok')}
        ${P.again && P.again.length ? `<p class="kicker">Worth another go</p>${list(P.again, 'again')}` : ''}
      </div>
      ${best > 1 ? `<p class="muted">Longest run: <b>${best}</b> right in a row.</p>` : ''}
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="row gap center">
        <button class="btn primary" data-g="again">Play again <kbd>Enter</kbd></button>
        <button class="btn" data-g="done">Back <kbd>Esc</kbd></button>
      </div></div>`;
  f.body.querySelector('[data-g=again]').onclick = () => restart(again);
  f.body.querySelector('[data-g=done]').onclick = done;
  f.body.querySelector('[data-g=again]').focus({ preventScroll: true });
  g.key = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { restart(again); return true; }
    if (e.key === 'Escape' || e.key === 'Backspace') { done(); return true; }
    return false;
  };
  sfx.fanfare();
  if (stars >= 2) confetti(30);
}

/* What a game practised, in words — the skill line on the finish screen. */
const OPNAME = { '×': 'times tables', '÷': 'division facts', '+': 'adding facts', '-': 'taking-away facts' };
export function rushSkill(ops) {
  const n = ops.map((o) => OPNAME[o]).filter(Boolean);
  return n.length ? n.slice(0, -1).join(', ') + (n.length > 1 ? ' and ' : '') + n[n.length - 1] + ', at speed' : 'facts, at speed';
}
const uniq = (xs) => [...new Set(xs)];

/* The on-screen keypad every game and drill shares. */
/* `keys` adds the extra keys a question needs: '.', '−', '/'. */
import { keypad } from './keypad.js';
export { keypad };   // the number pad lives on its own: the runner needs it, the games load later

/* ============================================================ NUMBER RUSH */

/* Facts fall; type the answer to pop one. What falls, in what order, when a typed number
   pops a bubble and how far the sky moves in a frame are rush.js's rules (games spec §1.3,
   §3.1), held by test/rush.mjs; this is the sky. The standard game has the owner's level
   ladder 1–5 (a chip on the title card, the child's last level by default) and climbs inside
   the round; Squares and Inverse are the paid modes. Lives, not a clock: three landings and
   it ends. Rush · Calm is the Twenty facts drill in Rush's costume — main.js runs it, on the
   drill's own engine, from the title card's Calm button (onCalm). */
export const rushPool = RU.rushPool;
/* How fast the bubbles fall (audit v4 G8). A gentle rise with the run of pops in a row —
   3% a pop, at most +30% — on top of the slow climb with the score (12% every five pops,
   never more than double). A landing or a wrong Enter ends the run, so a child who is
   struggling gets the slower sky back at once. The run of pops in a row is the game's own count, never
   the combo meter, and it only sets a speed: it pays nothing. A level's pace multiplies it. */
export const RUSH_BASE = 0.05;
export function rushSpeed(score, inARow) {
  return RUSH_BASE * Math.min(2, 1.12 ** Math.floor(score / 5)) * (1 + 0.03 * Math.min(10, Math.max(0, inARow)));
}
/* Dot patterns for the pre-readers' level, in a bubble of radius 1: dice faces to five, a
   ten-frame (a row of five, then the rest) from six to ten — the two shapes children are
   taught to see without counting. */
export function dotLayout(n) {
  const D = { 1: [[0, 0]], 2: [[-0.42, 0], [0.42, 0]], 3: [[0, -0.42], [-0.42, 0.34], [0.42, 0.34]],
    4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.42, -0.42], [0.42, -0.42], [0, 0], [-0.42, 0.42], [0.42, 0.42]] };
  if (n <= 5) return D[n] || [];
  return Array.from({ length: n }, (_, i) => [-0.72 + (i % 5) * 0.36, i < 5 ? -0.22 : 0.22]);
}
export function numberRush(kid, { onTick, onEnd, mode = null, onCalm = null }) {
  const mk = modeKey('rush', mode), std = !mk;
  let lv = std ? RU.rushLevel(kid) : null;
  const f = frame(titled('Number Rush', mk), mode === 'squares' && mk ? 'Pop each square: a number times itself' : mode === 'mixed' && mk ? 'A whole fact family falls together' : 'Type the answer to pop a bubble', () => g.quit(), 'rush', mk || 'rush');
  const g = { f, tune: 'bright' };
  let raf = 0, bubbles = [], input = '', score = 0, inARow = 0, lives = 3, t0 = 0, last = 0, gt = 0, spawnAt = 0, over = false, resync = false;
  let pool = [], fams = null, start = 0, pace = 1, served = 0, spawned = 0, recent = [], recentFam = [], queue = [], lastLane = -1, speed = rushSpeed(0, 0);
  const popped = [], landed = [];
  let cv, ctx, typed, stage, inp, W = 0, H = 0, combo;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function size() {
    if (!cv) return;
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const hud = () => { f.hud.innerHTML = `${std ? `<span class="chip rush-lv">Level <b>${lv}</b></span>` : ''}<span class="chip">Score <b>${score}</b></span><span class="chip lives">${'♥'.repeat(lives)}${'<i>♥</i>'.repeat(3 - lives)}</span>`; };
  // a hidden tab stops the sky: the next frame after it comes back moves nothing (T9)
  const onVis = () => { if (!document.hidden) resync = true; };

  function begin() {
    pool = RU.rushPool(kid, mk ? mode : null, lv);
    fams = mode === 'mixed' && mk ? RU.families(kid.band) : null;
    start = std ? RU.startAt(kid, pool, lv) : 0;
    pace = std ? RU.LEVELS[lv].pace : 1;
    speed = rushSpeed(0, 0) * pace;
    f.body.innerHTML = `<div class="rush">
        <div class="rush-stage"><canvas class="rush-c" aria-hidden="true"></canvas></div>
        <div class="rush-in" aria-live="assertive"><span class="rush-typed"></span><span class="rush-caret"></span></div>
        ${keypad()}
      </div>`;
    cv = f.body.querySelector('canvas'); ctx = cv.getContext('2d');
    typed = f.body.querySelector('.rush-typed'); stage = f.body.querySelector('.rush-stage'); inp = f.body.querySelector('.rush-in');
    combo = comboMeter(g);
    size(); addEventListener('resize', size); document.addEventListener('visibilitychange', onVis);
    hud();
    f.body.querySelector('.pad').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); press(b.dataset.k);
    });
    g.key = (e) => {
      if (e.key === 'Escape') { g.quit(); return true; }
      if (/^\d$/.test(e.key)) { press(e.key); return true; }
      if (e.key === 'Backspace') { press('⌫'); return true; }
      if (e.key === 'Enter') { press('✓'); return true; }
      return false;
    };
    raf = requestAnimationFrame(loop);
  }

  function spawn() {
    let it;
    if (fams) {
      // Inverse: a whole family is queued at once and falls together, member by member
      if (!queue.length) { const fam = RU.nextFamily(fams, { served: spawned, recent: recentFam }); recentFam = [fam.id, ...recentFam].slice(0, 3); queue = shuffle(fam.members); }
      it = queue.shift();
    } else it = RU.nextItem(pool, { start, served: spawned, due: RU.dueIn(kid, pool), recent });
    recent = [it.text, ...recent].slice(0, 4); spawned++;
    // times and adding either way round — never a family member or a missing number, whose order is the point
    const text = !it.fam && !it.missing && (it.op === '×' || it.op === '+') && Math.random() < 0.5 ? ftext({ op: it.op, a: it.b, b: it.a }) : it.text;
    // big enough to read at arm's length on a phone (audit v4 G5), and born WHOLE inside the stage:
    // a bubble half-hidden behind the bar read as cut, so it swells in where it starts instead
    const r = (W < 500 ? 46 : 52) + Math.min(8, it.op === 'dots' ? 8 : text.length);
    const lanes = Math.max(2, Math.floor(W / (r * 2.3)));
    let lane = int(0, lanes - 1); if (lane === lastLane) lane = (lane + 1) % lanes; lastLane = lane;
    bubbles.push({ fact: it.fact, item: it, text, ans: it.ans, dots: it.op === 'dots' ? it.n : 0, x: (lane + 0.5) * (W / lanes), y: r + 2, r, hue: pick([218, 150, 32, 268, 190]), born: performance.now(), shown: false });
  }
  /* A miss teaches (§1.3): the sum flashes with its answer for one second — and in Squares,
     why the square is what it is. */
  function flash(b) {
    const old = stage.querySelector('.rush-flash'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'rush-flash'; el.setAttribute('role', 'status');
    const sq = b.item && b.item.op === '²';
    el.innerHTML = `<b class="mono">${esc(b.dots ? `${b.dots} dots = ${b.ans}` : `${b.text} = ${b.ans}`)}</b>${sq ? `<small class="mono">${esc(RU.squareWhy(b.item.a))}</small>` : ''}`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
  function popIt(b) {
    bubbles = bubbles.filter((x) => x !== b); served++;
    score++; inARow++; combo.hit(); sfx.pop(); sfx.good();
    speed = rushSpeed(score, inARow) * pace;
    popped.push(b.dots ? `${b.dots} dots` : b.text);
    pop(g, stage, b.x, b.y, '+1');
    splash(stage, b);
    fly(g, stage, b.x, b.y, String(b.ans));
    onTick(true, b.fact);
    hud();
  }
  // a bubble whose answer was already shown, typed now: it goes, and scores nothing
  function clearIt(b) {
    bubbles = bubbles.filter((x) => x !== b); served++;
    sfx.click(); splash(stage, b);
  }
  // Enter on a number no bubble has: the bubble it was aimed at shows its answer and is
  // recorded as a miss; it stays in the sky, worth nothing now, until it is typed or lands
  function wrongEnter() {
    sfx.bad(); inARow = 0; speed = rushSpeed(score, inARow) * pace; combo.miss(); wobble(g, inp);
    const b = RU.aimedAt(input, bubbles.filter((x) => !x.shown));
    if (b) { b.shown = true; flash(b); landed.push(b.dots ? `${b.dots} dots = ${b.ans}` : `${b.text} = ${b.ans}`); onTick(false, b.fact); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // the floor: a soft glow where the meadow is, so a landing has somewhere to land
    const fl = ctx.createLinearGradient(0, H - 26, 0, H);
    fl.addColorStop(0, 'rgba(196,69,60,0)'); fl.addColorStop(1, 'rgba(196,69,60,.16)');
    ctx.fillStyle = fl; ctx.fillRect(0, H - 26, W, 26);
    const face = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'ui-monospace, monospace'; // the theme's digits
    const t = performance.now(), still = calm();
    for (const b of bubbles) {
      // bold and solid, so a real bubble never reads as one of the plate's painted ones; a shown one greys
      const R0 = still ? b.r : b.r * Math.min(1, 0.55 + (t - b.born) / 400), sat = b.shown ? 8 : 1;
      ctx.save(); ctx.shadowColor = 'rgba(16,22,44,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      const gr = ctx.createRadialGradient(b.x - R0 * .35, b.y - R0 * .4, R0 * .1, b.x, b.y, R0);
      gr.addColorStop(0, `hsl(${b.hue} ${95 / sat}% 96%)`); gr.addColorStop(.55, `hsl(${b.hue} ${85 / sat}% 84%)`); gr.addColorStop(1, `hsl(${b.hue} ${70 / sat}% 62%)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, R0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = `hsl(${b.hue} ${60 / sat}% 34%)`; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(b.x, b.y, R0 - 1.75, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, R0 - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(b.x - R0 * .4, b.y - R0 * .47, R0 * .2, R0 * .11, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b1020';
      if (b.dots) {
        // the pre-readers' bubble: dots, drawn, never a glyph
        const dr = R0 * (b.dots > 5 ? 0.12 : 0.15), s = R0 * 0.68;
        for (const [dx, dy] of dotLayout(b.dots)) { ctx.beginPath(); ctx.arc(b.x + dx * s, b.y + dy * s, dr, 0, Math.PI * 2); ctx.fill(); }
        continue;
      }
      // size the sum to fit INSIDE its bubble: a monospace glyph is ~0.6em wide
      const fs = Math.min(R0 * 0.52, (R0 * 1.6) / (b.text.length * 0.6));
      ctx.font = `800 ${Math.round(fs)}px ${face}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, b.x, b.y + 1);
    }
  }

  function loop(now) {
    if (over) return;
    if (!t0) { t0 = now; last = now; spawnAt = 300; }
    if (document.hidden || resync) { last = now; resync = false; }
    // wall-clock time, clamped for a returning tab: the same seconds to land at 60 or 12 fps (§1.3)
    const dt = RU.stepMs(last, now); last = now; gt += dt;
    if (gt >= spawnAt) { spawn(); spawnAt = gt + (queue.length ? 650 : Math.max(900, 2600 - score * 45) / pace); }
    for (const b of bubbles) b.y += speed * dt * (H / 520);
    for (const b of bubbles.slice()) {
      if (b.y - b.r > H - 20) {
        bubbles = bubbles.filter((x) => x !== b); served++;
        lives--; inARow = 0; speed = rushSpeed(score, inARow) * pace; combo.miss(); sfx.drop();
        // a bubble whose answer was already shown was recorded as a miss then, not twice
        if (!b.shown) { landed.push(b.dots ? `${b.dots} dots = ${b.ans}` : `${b.text} = ${b.ans}`); onTick(false, b.fact); flash(b); }
        hud();
        pop(g, stage, b.x, H - 14);
        wobble(g, f.hud.querySelector('.lives'));
        if (lives <= 0) return finish();
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  /* A bubble pops only on Enter, or without Enter only when no other bubble's answer starts
     with what is typed (rush.js decide): "12" never pops "1" on the way. */
  function setInput(v, enter = false) {
    input = v.slice(0, 4); typed.textContent = input;
    const d = RU.decide(input, bubbles.map((b) => b.ans), enter);
    if (d === 'pop') {
      const hit = bubbles.filter((b) => String(b.ans) === input).sort((a, b) => a.shown - b.shown || b.y - a.y)[0];
      if (hit.shown) clearIt(hit); else popIt(hit);
      input = ''; typed.textContent = '';
    } else if (d === 'wrong') { wrongEnter(); input = ''; typed.textContent = ''; }
  }
  function press(k) {
    if (over) return;
    if (k === '⌫') setInput(input.slice(0, -1));
    else if (k === '✓') { if (input) setInput(input, true); }      // ✓ on the pad is Enter
    else if (/^\d$/.test(k)) { sfx.click(); setInput(input + k); }
  }
  function finish() {
    over = true; cancelAnimationFrame(raf);
    const stars = score >= 30 ? 3 : score >= 15 ? 2 : score >= 5 ? 1 : 0;
    // the owner's level rule: right = bubbles popped, out of the bubbles served
    const v = std ? RU.rushVerdict(kid, score, Math.max(served, score)) : null;
    onEnd(score, stars);
    const said = mode === 'squares' && mk ? 'square numbers, at speed' : fams ? 'fact families, at speed' : lv === 1 ? 'seeing how many dots, and adding to ten, at speed' : rushSkill(uniq(pool.map((x) => x.op)));
    resultCard(g, {
      title: score ? `${score} popped` : 'The bubbles won that one',
      practised: { skill: said, items: uniq(popped).slice(0, 12), again: uniq(landed).slice(0, 6) },
      best: combo.best,
      lines: [score >= 15 ? 'That is real speed.' : 'The ones you know best go fastest. Keep playing and more of them will be.',
        ...(v ? [`<span class="rush-verdict">${esc(verdictLine(v))}</span>${v.offer ? ` <button class="btn small" data-g="up">Play Level ${v.offer}</button>` : ''}`] : [])],
      stars, again: () => { g.quit(); numberRush(kid, { onTick, onEnd, mode, onCalm }); }, done: () => g.quit(),
    });
    const up = f.body.querySelector('[data-g=up]');
    if (up && v) up.onclick = () => { setLevel(kid, RU.GAME, v.offer); restart(() => { g.quit(); numberRush(kid, { onTick, onEnd, mode, onCalm }); }); };
  }
  g.stop = () => { over = true; cancelAnimationFrame(raf); removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVis); };
  g.quit = () => end(g);
  // the headless walk's window on the sky (never read by the app); inject() puts a known sum up, for the prefix check
  g.probe = { answers: () => bubbles.filter((b) => b.y > 0).map((b) => String(b.ans)), bubbles: () => bubbles.map((b) => ({ x: b.x, y: b.y, r: b.r, text: b.text, ans: b.ans, dots: b.dots, shown: b.shown })),
    state: () => ({ lv, score, lives, served, gt, start, pool: pool.length, over }), finish: () => !over && finish(),
    inject: (items) => { for (const [text, ans, fact = null] of items) bubbles.push({ fact, item: { op: 'x', text }, text, ans, dots: 0, x: W * (0.25 + 0.5 * (bubbles.length % 2)), y: 80, r: 50, hue: 218, born: 0, shown: false }); } };
  current = g;
  intro(g, titled('Number Rush', mk), mk || 'rush', begin);
  if (std) levelPicker();
  return g;

  /* The title card's level chip (§1.4) and the way into Calm. Picking a level holds the card
     (the three-second start waits for Play); keys 1–5 pick too. */
  function levelPicker() {
    const card = f.body.querySelector('.g-card'); if (!card) return;
    const el = document.createElement('div');
    el.className = 'rush-pick';
    const paint = () => {
      el.innerHTML = `<div class="g-lv" role="radiogroup" aria-label="Level">${[1, 2, 3, 4, 5].map((l) => `<button role="radio" class="g-lvb${l === lv ? ' on' : ''}" aria-checked="${l === lv}" data-rl="${l}" aria-label="Level ${l}: ${esc(RU.LEVELS[l].name)}">${l}</button>`).join('')}</div>
        <p class="g-lvw">${esc(RU.LEVELS[lv].words)}</p>
        ${onCalm ? `<button class="btn rush-calm" data-g="calm">${icon('leaf', 18)}<span>Calm: no clock, nothing falls</span></button>` : ''}`;
    };
    paint();
    card.insertBefore(el, card.querySelector('.g-bar'));
    const hold = () => { clearTimeout(g.introT); card.classList.add('held'); };
    const choose = (l) => { lv = l; setLevel(kid, RU.GAME, l); hold(); paint(); const b = el.querySelector(`[data-rl="${l}"]`); if (b) b.focus({ preventScroll: true }); };
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-rl]'); if (b) return choose(+b.dataset.rl);
      if (e.target.closest('[data-g=calm]')) toCalm();
    });
    // Calm is a screen of the app, not an overlay: close the game, let its history entry go, then open it
    const toCalm = () => { g.quit(); const t0 = Date.now(), t = setInterval(() => { if (!backPending || Date.now() - t0 > 1500) { clearInterval(t); setTimeout(onCalm, 40); } }, 16); };
    const base = g.intro;
    g.intro = (e) => {
      if (/^[1-5]$/.test(e.key)) { choose(+e.key); return true; }
      const a = document.activeElement;
      if ((e.key === 'Enter' || e.key === ' ') && a && el.contains(a)) { if (a.dataset.g === 'calm') toCalm(); else choose(+a.dataset.rl); return true; }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && a && a.dataset.rl) { choose(Math.min(5, Math.max(1, +a.dataset.rl + (e.key === 'ArrowRight' ? 1 : -1)))); return true; }
      return base(e);
    };
  }
}

/* ======================================================= MAKE THE TARGET */

/* Four numbers, one target, + − × ÷. Pick a number, an operation, another
   number; they combine into one. Reach the target using every number.
   Division must come out whole and subtraction must not go below zero, so a
   child never has to hold a fraction in their head to find a solution — and
   every puzzle served has been SOLVED before it is shown. */

const OPS = { '+': (a, b) => a + b, '−': (a, b) => (a >= b ? a - b : null), '×': (a, b) => a * b, '÷': (a, b) => (b && a % b === 0 ? a / b : null) };

export function solve(nums, target, ops = OPS) {
  const memo = new Set();
  function go(items) {
    if (items.length === 1) return items[0].v === target ? items[0].s : null;
    const k = items.map((x) => x.v).sort((a, b) => a - b).join(',');
    if (memo.has(k)) return null;
    for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i], b = items[j], rest = items.filter((_, x) => x !== i && x !== j);
      for (const [op, fn] of Object.entries(ops)) {
        if ((op === '+' || op === '×') && i > j) continue;
        const v = fn(a.v, b.v); if (v == null || v > 10000) continue;
        const s = go([...rest, { v, s: `(${a.s} ${op} ${b.s})` }]);
        if (s) return s;
      }
    }
    memo.add(k);
    return null;
  }
  const s = go(nums.map((v) => ({ v, s: String(v) })));
  return s ? s.replace(/^\((.*)\)$/, '$1') : null;
}

/* adding and taking away only: a "hard target" is one these cannot reach */
const ADD_ONLY = { '+': OPS['+'], '−': OPS['−'] };
/* Modes (extras.js): "five" serves one more number than the band's standard game;
   "hard" serves a bigger target that + and − alone cannot make from these numbers —
   proved by the solver run with only + and −. Either way the puzzle is solved first. */
export function makePuzzle(band, r = Math.random, mode = null) {
  const n = (band === '6-7' ? 3 : 4) + (mode === 'five' ? 1 : 0);
  const hi = band === '6-7' ? 9 : band === '8-10' ? 10 : 13;
  const hard = mode === 'hard';
  for (let tries = 0; tries < (mode ? 3000 : 400); tries++) {
    const nums = Array.from({ length: n }, () => int(1, hi, r));
    // build a target by combining the numbers at random
    let items = nums.slice();
    while (items.length > 1) {
      items = shuffle(items, r);
      const a = items.pop(), b = items.pop();
      const ops = Object.keys(OPS).filter((o) => OPS[o](a, b) != null && !(band === '6-7' && !hard && (o === '×' || o === '÷')));
      items.push(OPS[pick(ops, r)](a, b));
    }
    const target = items[0];
    const lo = hard ? (band === '6-7' ? 21 : band === '8-10' ? 61 : 151) : band === '6-7' ? 5 : 10;
    const top = hard ? (band === '6-7' ? 60 : band === '8-10' ? 200 : 600) : band === '6-7' ? 20 : band === '8-10' ? 60 : 150;
    if (target < lo || target > top || nums.includes(target)) continue;
    if (hard && solve(nums, target, ADD_ONLY)) continue;
    const sol = solve(nums, target);
    if (sol) return { nums, target, sol };
  }
  // never reached in practice (test/games.mjs walks hundreds of seeds); still solved, never typed
  const fb = mode === 'five' ? [[2, 3, 4, 6, 1], 24] : hard ? (band === '6-7' ? [[7, 8, 9], 47] : band === '8-10' ? [[7, 8, 9, 3], 159] : [[7, 8, 9, 3], 501]) : null;
  if (fb) return { nums: fb[0], target: fb[1], sol: solve(fb[0], fb[1]) };
  return { nums: [2, 3, 4, 6], target: 24, sol: '(6 × 4) × (3 − 2)' };
}

export function makeTarget(kid, { daily = false, onSolve, onEnd, mode = null }) {
  const mk = daily ? null : modeKey('target', mode);
  const title = daily ? "Today's puzzle" : titled('Make the Target', mk);
  const f = frame(title, daily ? 'The same puzzle in every house today' : 'Use every number to hit the target', () => g.quit(), 'target', daily ? 'daily' : mk || 'target');
  const g = { f, tune: 'calm' };
  let round = 0, solved = 0, puzzle, cards, pickA = null, op = null, history = [], shown = false, born = null, combo;
  const made = [], showed = [];
  const ROUNDS = daily ? 1 : 5;
  const strip = (s) => s.replace(/^\((.*)\)$/, '$1');

  function next() {
    round++; shown = false;
    puzzle = daily ? makePuzzle(kid.band, seeded('daily:' + dayKey())) : makePuzzle(kid.band, Math.random, mk ? mode : null);
    cards = puzzle.nums.map((v, i) => ({ id: i, v, s: String(v) }));
    pickA = null; op = null; history = []; born = null;
    draw();
  }
  function draw(msg = '') {
    f.hud.innerHTML = daily ? '' : `<span class="chip">Puzzle <b>${round}</b> of ${ROUNDS}</span><span class="chip">Solved <b>${solved}</b></span>`;
    f.body.innerHTML = `<div class="mt">
      <div class="mt-target" aria-label="Target ${puzzle.target}"><span>Target</span><b>${puzzle.target}</b></div>
      <div class="mt-cards">${cards.map((c, i) => `<button class="mt-card${pickA === c.id ? ' on' : ''}${born === c.id ? ' born' : ''}" data-c="${c.id}" aria-label="Number ${c.v}, key ${i + 1}"><b>${c.v}</b><i>${i + 1}</i></button>`).join('')}</div>
      <div class="mt-ops">${Object.keys(OPS).map((o) => `<button class="mt-op${op === o ? ' on' : ''}" data-o="${o}" aria-label="${o}">${o}</button>`).join('')}</div>
      <div class="mt-msg" aria-live="polite">${msg || (pickA == null ? 'Pick a number.' : op == null ? 'Now pick + − × or ÷.' : 'Now pick another number.')}</div>
      <div class="mt-tools">
        <button class="btn" data-t="undo" ${history.length ? '' : 'disabled'}>Undo <kbd>⌫</kbd></button>
        <button class="btn" data-t="reset">Start again <kbd>R</kbd></button>
        <button class="btn ghost" data-t="show">Show me <kbd>S</kbd></button>
      </div>
      <p class="mt-keys">Keys: <kbd>1</kbd>–<kbd>${cards.length}</kbd> numbers · <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> operations</p>
    </div>`;
    f.body.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => pickCard(+b.dataset.c));
    f.body.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => pickOp(b.dataset.o));
    f.body.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => tool(b.dataset.t));
  }
  function pickCard(id) {
    if (shown) return;
    if (pickA == null || op == null) { pickA = pickA === id ? null : id; sfx.click(); born = null; return draw(); }
    if (id === pickA) return;
    const a = cards.find((c) => c.id === pickA), b = cards.find((c) => c.id === id);
    const v = OPS[op](a.v, b.v);
    if (v == null) {
      const was = op; sfx.bad(); pickA = null; op = null; born = null;
      draw(was === '÷' ? 'That does not share out evenly — try another way.' : 'That would go below zero — try the other way round.');
      return wobble(g, f.body.querySelector('.mt-cards'));
    }
    history.push(cards.map((c) => ({ ...c })));
    const nc = { id: Math.max(...cards.map((c) => c.id)) + 1, v, s: `(${a.s} ${op} ${b.s})` };
    cards = cards.filter((c) => c !== a && c !== b); cards.splice(0, 0, nc);
    pickA = cards.length > 1 ? nc.id : null; op = null; born = nc.id; sfx.pop();
    juice(g);                       // the new card is born with a pop (CSS .born)
    if (cards.length === 1) {
      if (v === puzzle.target) return win(nc);
      sfx.bad(); combo.miss();
      draw(`That makes ${v}, not ${puzzle.target}. Undo, or start again.`);
      return wobble(g, f.body.querySelector('.mt-card'));
    }
    draw();
  }
  function pickOp(o) { if (shown || pickA == null) return; op = op === o ? null : o; sfx.click(); born = null; draw(); }
  function tool(t) {
    if (t === 'undo' && history.length) { cards = history.pop(); pickA = null; op = null; born = null; sfx.click(); draw(); }
    if (t === 'reset') { cards = puzzle.nums.map((v, i) => ({ id: i, v, s: String(v) })); history = []; pickA = null; op = null; born = null; sfx.click(); draw(); }
    if (t === 'show' && !shown) {
      shown = true; combo.miss(); showed.push(`${puzzle.sol} = ${puzzle.target}`);
      f.body.querySelector('.mt-msg').innerHTML = `One way: <b class="mono">${esc(puzzle.sol)} = ${puzzle.target}</b>`;
      wobble(g, f.body.querySelector('.mt-target'));
      setTimeout(() => (current === g && !daily ? (round < ROUNDS ? next() : finish()) : 0), 3200);
      if (daily) { onEnd(false); f.body.querySelector('.mt-tools').innerHTML = '<button class="btn primary" data-t="done">Done</button>'; f.body.querySelector('[data-t=done]').onclick = () => resultCard(g, { title: "Today's puzzle", practised: { skill: 'Joining numbers with + − × ÷ to make a target', items: [], again: showed }, lines: ['Tomorrow brings a new one. Everybody in your house gets the same puzzle.'], stars: 0, again: () => g.quit(), done: () => g.quit() }); }
    }
  }
  function win(nc) {
    solved++; combo.hit(); sfx.level(); onSolve();
    made.push(`${strip(nc.s)} = ${puzzle.target}`);
    draw(`<b>You made ${puzzle.target}!</b>`);
    const tg = f.body.querySelector('.mt-target'); tg.classList.add('won');
    const [x, y] = centre(tg, f.body.querySelector('.mt'));
    pop(g, f.body.querySelector('.mt'), x, y);
    if (daily) {
      onEnd(true);
      setTimeout(() => current === g && resultCard(g, { title: "Today's puzzle — solved", practised: { skill: 'Joining numbers with + − × ÷ to make a target', items: made }, lines: ['Tomorrow brings a new one. Everybody in your house gets the same puzzle.'], stars: 3, again: () => g.quit(), done: () => g.quit() }), 1100);
      return;
    }
    setTimeout(() => current === g && (round < ROUNDS ? next() : finish()), 1100);
  }
  function finish() {
    const stars = solved >= 5 ? 3 : solved >= 3 ? 2 : solved >= 1 ? 1 : 0;
    onEnd(solved, stars);
    resultCard(g, { title: `${solved} of ${ROUNDS} made`, practised: { skill: 'Joining numbers with + − × ÷ to make a target', items: made, again: showed }, best: combo.best,
      lines: ['There is usually more than one way. The one "Show me" gives is just one of them.'], stars,
      again: () => { g.quit(); makeTarget(kid, { onSolve, onEnd, mode }); }, done: () => g.quit() });
  }
  function begin() {
    combo = comboMeter(g);
    g.key = (e) => {
      if (e.key === 'Escape') { g.quit(); return true; }
      const i = +e.key; if (i >= 1 && i <= cards.length) { pickCard(cards[i - 1].id); return true; }
      const map = { '+': '+', '-': '−', '*': '×', 'x': '×', 'X': '×', '/': '÷' };
      if (map[e.key]) { pickOp(map[e.key]); return true; }
      if (e.key === 'Backspace') { tool('undo'); return true; }
      if (e.key === 'r' || e.key === 'R') { tool('reset'); return true; }
      if (e.key === 's' || e.key === 'S') { tool('show'); return true; }
      return false;
    };
    next();
  }
  g.quit = () => end(g);
  g.probe = { finish: () => !g.ended && finish() };
  current = g;
  intro(g, title, mk || 'target', begin);
  return g;
}

/* =========================================================== NUMBER LINE */

/* Where does it go? Estimation is the number sense contests lean on and
   drills never train. Drag, tap, or arrow keys; Enter to place. Scored on
   how close, never on speed. */
/* The line a round is played on. Standard: 0 to 20 / 100 / 1000 by band. "fractions":
   0 to 1, placing a proper fraction (halves and quarters for the youngest, then thirds,
   fifths, eighths, tenths; twelfths for the oldest). "negatives": −N to N with nought in
   the middle. Every target is a real point on its line, and a round never asks for the
   exact middle (that is the one place anybody can put a marker without thinking). */
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/* The line widens as a child gets them close (audit v4 G8). A round starts on the band's own line
   (0–20 / 0–100 / 0–1000, unchanged); after 2 close answers (four points or more) it is the second
   width, after 4 the third. It never narrows inside a game, and the points are a share of the line,
   so a longer line is harder to place on but never worth less. */
export const LINE_WIDTHS = { '6-7': [20, 50, 100], '8-10': [100, 500, 1000], '11-14': [1000, 5000, 10000] };
export const NEG_WIDTHS = { '6-7': [10, 20, 50], '8-10': [50, 100, 200], '11-14': [500, 1000, 5000] };
export const lineStep = (closeCount) => Math.min(2, Math.floor(Math.max(0, closeCount) / 2));
export function lineSpec(band, mode = null, step = 0) {
  if (mode === 'fractions') {
    const dens = band === '6-7' ? [2, 4] : band === '8-10' ? [2, 3, 4, 5, 8, 10] : [3, 4, 5, 6, 8, 10, 12];
    return { lo: 0, hi: 1, snap: 100, ends: ['0', '1'], skill: 'Placing fractions between 0 and 1',
      pick(r = Math.random) {
        for (;;) { const d = dens[int(0, dens.length - 1, r)], n = int(1, d - 1, r); if (gcd(n, d) === 1 && 2 * n !== d) return { v: n / d, label: `${n}/${d}` }; }
      } };
  }
  const max = LINE_WIDTHS[band in LINE_WIDTHS ? band : '8-10'][Math.max(0, Math.min(2, step))];
  if (mode === 'negatives') {
    const m = NEG_WIDTHS[band in NEG_WIDTHS ? band : '8-10'][Math.max(0, Math.min(2, step))];
    return { lo: -m, hi: m, snap: m <= 10 ? 2 : 1, ends: [`−${m}`, String(m)], mid: '0', skill: `Placing numbers between −${m} and ${m}`,
      pick(r = Math.random) { for (;;) { const v = int(-m + 1, m - 1, r); if (v !== 0 && Math.abs(v) >= m * 0.06) return { v, label: v < 0 ? `−${-v}` : String(v) }; } } };
  }
  return { lo: 0, hi: max, snap: max <= 20 ? 2 : 1, ends: ['0', String(max)], skill: `Estimating where a number sits between 0 and ${max}`,
    pick(r = Math.random) { let v; do { v = int(1, max - 1, r); } while (Math.abs(v - max / 2) < max * 0.06); return { v, label: String(v) }; } };
}
export function numberLine(kid, { onTick, onEnd, mode = null }) {
  const mk = modeKey('line', mode), FULL = lineSpec(kid.band, mk ? mode : null);
  const f = frame(titled('Number Line', mk), `Place the number between ${FULL.ends[0]} and ${FULL.ends[1]}`, () => g.quit(), 'line', mk || 'line');
  const g = { f, tune: 'sea' };
  const ROUNDS = 8;
  const close = [], far = [];
  // the line for this round: it widens with the close answers so far (lineStep), never narrows
  let L, lo, hi, span, mid;
  const widen = () => { L = lineSpec(kid.band, mk ? mode : null, lineStep(close.length)); ({ lo, hi } = L); span = hi - lo; mid = (lo + hi) / 2; };
  widen();
  let round = 0, total = 0, target = 0, label = '', pos = mid, placed = false, combo;

  function next() {
    const was = hi; widen();
    round++; placed = false; pos = mid;
    const sub = f.el.querySelector('.play-t span'); if (sub) sub.textContent = hi !== was ? `The line grows: now ${L.ends[0]} to ${L.ends[1]}` : `Place the number between ${L.ends[0]} and ${L.ends[1]}`;
    ({ v: target, label } = L.pick());
    draw();
  }
  function pct(v) { return ((v - lo) / span) * 100; }
  function draw(msg = '') {
    const ticks = [0, 1, 2, 3, 4].map((i) => lo + (span * i) / 4);
    f.hud.innerHTML = `<span class="chip">Round <b>${round}</b> of ${ROUNDS}</span><span class="chip">Points <b>${total}</b></span>`;
    f.body.innerHTML = `<div class="nl">
      <p class="nl-q">Where does <b class="mono">${esc(label)}</b> go?</p>
      <div class="nl-track" role="slider" tabindex="0" aria-label="Position" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${+pos.toFixed(2)}">
        <div class="nl-line"></div>
        ${ticks.map((t, i) => `<span class="nl-tick" style="left:${pct(t)}%"><i></i>${i === 0 ? L.ends[0] : i === 4 ? L.ends[1] : i === 2 && L.mid ? L.mid : ''}</span>`).join('')}
        <div class="nl-mark${placed ? ' set' : ''}" style="left:${pct(pos)}%"><span>▼</span></div>
        ${placed ? `<div class="nl-true" style="left:${pct(target)}%"><span>${esc(label)}</span></div>` : ''}
      </div>
      <div class="nl-msg" aria-live="polite">${msg || 'Drag the marker, tap the line, or use ← → (hold Shift for big steps).'}</div>
      <div class="row gap center">
        ${placed ? `<button class="btn primary" data-n="next">${round < ROUNDS ? 'Next number' : 'See how you did'} <kbd>Enter</kbd></button>` : `<button class="btn primary" data-n="place">Place it here <kbd>Enter</kbd></button>`}
      </div></div>`;
    const tr = f.body.querySelector('.nl-track');
    const at = (e) => { const r = tr.getBoundingClientRect(); return Math.max(lo, Math.min(hi, lo + ((e.clientX - r.left) / r.width) * span)); };
    let drag = false;
    tr.onpointerdown = (e) => { if (placed) return; drag = true; tr.setPointerCapture(e.pointerId); move(at(e)); };
    tr.onpointermove = (e) => { if (drag) move(at(e)); };
    tr.onpointerup = () => { drag = false; };
    const b = f.body.querySelector('[data-n]'); b.onclick = () => (placed ? advance() : place());
  }
  function move(v) {
    pos = Math.max(lo, Math.min(hi, Math.round(v * L.snap) / L.snap));
    const m = f.body.querySelector('.nl-mark'); if (m) m.style.left = pct(pos) + '%';
    const tr = f.body.querySelector('.nl-track'); if (tr) tr.setAttribute('aria-valuenow', +pos.toFixed(2));
  }
  function place() {
    placed = true;
    const err = Math.abs(pos - target) / span;
    const pts = err <= 0.02 ? 10 : err <= 0.05 ? 7 : err <= 0.1 ? 4 : err <= 0.2 ? 1 : 0;
    total += pts;
    onTick(pts >= 4);
    const off = Math.abs(pos - target), offs = `${label} — ${off < 1e-9 ? 'bang on' : `${+off.toFixed(span <= 1 ? 2 : 1)} away`}`;
    (pts >= 4 ? close : far).push(offs);
    draw(pts === 10 ? 'Bang on.' : pts >= 7 ? 'Very close.' : pts >= 4 ? 'Close.' : `It was here — ${Math.round(err * 100)} hundredths of the line away.`);
    sfx.place();
    const tr = f.body.querySelector('.nl-track');
    if (pts >= 4) {
      combo.hit(); pts >= 7 ? sfx.good() : sfx.click();
      pop(g, tr, (pct(target) / 100) * tr.clientWidth, 70, `+${pts}`);
    } else {
      combo.miss(); pts ? sfx.click() : sfx.bad();
      wobble(g, f.body.querySelector('.nl-mark'));
    }
  }
  function advance() { sfx.click(); round < ROUNDS ? next() : finish(); }
  function finish() {
    const stars = total >= 60 ? 3 : total >= 40 ? 2 : total >= 20 ? 1 : 0;
    onEnd(total, stars);
    resultCard(g, { title: `${total} points`, practised: { skill: L.skill, items: close, again: far }, best: combo.best,
      lines: [mode === 'fractions' && mk ? 'Find the half first, then the quarters: every fraction sits beside one of them.' : 'Halfway, then quarters: find those first and the rest falls between them.'], stars,
      again: () => { g.quit(); numberLine(kid, { onTick, onEnd, mode }); }, done: () => g.quit() });
  }
  function begin() {
    combo = comboMeter(g);
    g.key = (e) => {
      if (e.key === 'Escape') { g.quit(); return true; }
      const step = e.shiftKey ? span / 10 : 1 / L.snap > span / 100 ? 1 / L.snap : span / 100;
      if (!placed && e.key === 'ArrowLeft') { move(pos - step); return true; }
      if (!placed && e.key === 'ArrowRight') { move(pos + step); return true; }
      if (e.key === 'Enter' || e.key === ' ') { placed ? advance() : place(); return true; }
      return false;
    };
    next();
  }
  g.quit = () => end(g);
  g.probe = { target: () => target, place: (v) => { move(v); place(); }, finish: () => !g.ended && finish() };
  current = g;
  intro(g, titled('Number Line', mk), mk || 'line', begin);
  return g;
}

/* ================================================================ SUDOKU */

/* Tap a square (or move with the arrows), then a number (tap or type). A
   number that breaks a rule turns red at once — that is the rule, not the
   answer: a number that is merely wrong, but breaks nothing yet, is not
   flagged, because telling would be solving it for them. Every grid has
   exactly one answer (puzzles.js proves it), so a full grid with no red is
   solved. */

export function sudoku(kid, n, lv, { onEnd }) {
  const f = frame('Sudoku', `${n}×${n} — each row, column and box holds 1 to ${n} once`, () => g.quit(), 'sudoku');
  const g = { f, tune: 'calm' };
  const p = makeSudoku(n, lv);
  const given = p.grid.map(Boolean);
  const cur = p.grid.slice();
  let sel = cur.findIndex((v) => !v), hints = 0, done = false, born = -1;
  const { br, bc } = SUDOKU[n];

  function draw() {
    const bad = conflicts(cur, n);
    const selV = cur[sel];
    f.hud.innerHTML = `<span class="chip">Hints <b>${hints}</b></span>`;
    f.body.innerHTML = `<div class="sdk-wrap">
      <div class="sdk n${n}" role="grid" style="--n:${n}">${cur.map((v, i) => {
        const r = Math.floor(i / n), c = i % n;
        const edge = `${c % bc === bc - 1 && c < n - 1 ? ' er' : ''}${r % br === br - 1 && r < n - 1 ? ' eb' : ''}`;
        const same = selV && v === selV && i !== sel ? ' same' : '';
        const peer = sel >= 0 && (Math.floor(sel / n) === r || sel % n === c) ? ' peer' : '';
        return `<button class="sc${given[i] ? ' given' : ''}${i === sel ? ' sel' : ''}${bad.has(i) ? ' bad' : ''}${i === born && v ? ' born' : ''}${edge}${same}${peer}" data-i="${i}" aria-label="Row ${r + 1}, column ${c + 1}${v ? ', ' + v : ', empty'}">${v || ''}</button>`;
      }).join('')}</div>
      <div class="sdk-nums">${Array.from({ length: n }, (_, i) => `<button class="pk" data-v="${i + 1}">${i + 1}</button>`).join('')}<button class="pk del" data-v="0" aria-label="Clear">⌫</button></div>
      <div class="row gap center"><button class="btn ghost" data-t="hint">Hint <kbd>H</kbd></button></div>
      <p class="mt-keys">Keys: arrows move · <kbd>1</kbd>–<kbd>${n}</kbd> fill · <kbd>⌫</kbd> clear · <kbd>H</kbd> hint</p>
    </div>`;
    f.body.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { sel = +b.dataset.i; born = -1; draw(); });
    f.body.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => put(+b.dataset.v));
    f.body.querySelector('[data-t=hint]').onclick = hint;
  }
  function put(v) {
    if (done || sel < 0 || given[sel] || v > n) return;
    cur[sel] = v; born = sel;
    if (cur.every(Boolean) && conflicts(cur, n).size === 0) return win();
    draw();
    juice(g);                       // the number lands with a pop (CSS .born)
    if (v && conflicts(cur, n).has(sel)) { sfx.bad(); wobble(g, f.body.querySelector('.sc.sel')); } else sfx.place();
  }
  function hint() {
    if (done) return;
    let i = sel >= 0 && !given[sel] && cur[sel] !== p.solution[sel] ? sel : cur.findIndex((v, j) => v !== p.solution[j]);
    if (i < 0) return;
    cur[i] = p.solution[i]; given[i] = true; hints++; sel = i; born = i; sfx.coin(); juice(g);
    if (cur.every(Boolean) && conflicts(cur, n).size === 0) return win();
    draw();
  }
  function win() {
    done = true; born = -1; draw(); sfx.level();
    const grid = f.body.querySelector('.sdk'), wrap = f.body.querySelector('.sdk-wrap');
    const [x, y] = centre(grid, wrap); pop(g, wrap, x, y);
    const stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
    onEnd(true, stars, hints);
    setTimeout(() => current === g && resultCard(g, { title: 'Solved!', practised: { skill: `Logic: a ${n}×${n} grid where every row, column and box holds 1 to ${n} once`, items: [] },
      lines: [hints ? `With ${hints} hint${hints > 1 ? 's' : ''}. Try the next one with none.` : 'No hints at all — pure logic.'], stars,
      again: () => { g.quit(); sudoku(kid, n, lv, { onEnd }); }, done: () => g.quit() }), 700);
  }
  function begin() {
    g.key = (e) => {
      if (e.key === 'Escape') { g.quit(); return true; }
      const mv = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mv) { const j = sel + mv; if (j >= 0 && j < n * n && !(mv === -1 && sel % n === 0) && !(mv === 1 && sel % n === n - 1)) { sel = j; born = -1; draw(); } return true; }
      if (/^[1-9]$/.test(e.key)) { put(+e.key); return true; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { put(0); return true; }
      if (e.key === 'h' || e.key === 'H') { hint(); return true; }
      return false;
    };
    draw();
  }
  g.quit = () => { if (!done) onEnd(false, 0); end(g); };
  current = g;
  intro(g, 'Sudoku', 'sudoku', begin);
  return g;
}

/* ========================================================== CUBE BUILDER */

/* Three views of a stack of cubes — front, side (from the right), top — and an empty
   floor. Pick a square, raise or lower its tower; it is solved when all three views of
   what was built match. Every puzzle is proved before it is shown (cubes.js, and the
   brute force in test/games.mjs): it has a stack, its level's promise holds, and the
   FEWEST cubes is known by search, so the third star is measured, never guessed.

   One function, `act`, changes the build. The keys, the taps on a square, the up and
   down buttons and the height pad all call it, so keyboard and touch cannot drift. */
export const CUBE_ROUNDS = 3;
export const cubeStars = (score) => (score >= 8 ? 3 : score >= 5 ? 2 : score >= 2 ? 1 : 0);

/* the stack drawn as a picture: front faces square, depth going up and to the right */
function cubeIso(h, n, hmax, sel) {
  const s = 30, d = 15, W = n * s + n * d + 4, H = hmax * s + n * d + 6, base = H - 3;
  const out = [];
  for (let k = n - 1; k >= 0; k--) {                 // k = rows from the front: draw the back row first
    const r = n - 1 - k;
    for (let c = 0; c < n; c++) {
      const i = r * n + c, X = 2 + c * s + k * d, Y0 = base - k * d, on = i === sel ? ' sel' : '';
      out.push(`<polygon class="cb-floor${on}" points="${X},${Y0} ${X + d},${Y0 - d} ${X + s + d},${Y0 - d} ${X + s},${Y0}"/>`);
      for (let z = 0; z < h[i]; z++) {
        const Y = Y0 - (z + 1) * s;
        out.push(`<g class="cb-cube${on}"><rect class="f" x="${X}" y="${Y}" width="${s}" height="${s}"/><polygon class="t" points="${X},${Y} ${X + d},${Y - d} ${X + s + d},${Y - d} ${X + s},${Y}"/><polygon class="r" points="${X + s},${Y} ${X + s + d},${Y - d} ${X + s + d},${Y + s - d} ${X + s},${Y + s}"/></g>`);
      }
    }
  }
  return `<svg class="cb-iso" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Your stack: ${cubeCount(h)} cubes">${out.join('')}</svg>`;
}

/* one view: the target's squares, and what the build shows over them */
function cubeView(name, want, have, rows, hi, ax) {
  const cols = want.length, cells = [];
  for (let y = rows - 1; y >= 0; y--) for (let x = 0; x < cols; x++) {
    const w = want[x] > y, b = have[x] > y;
    cells.push(`<i class="${w && b ? 'ok' : w ? 'miss' : b ? 'extra' : ''}${x === hi ? ' hi' : ''}"></i>`);
  }
  const match = want.join() === have.join();
  return `<figure class="cb-view${match ? ' match' : ''}" data-view="${name.split(' ')[0].toLowerCase()}"><div class="cb-vg" style="--c:${cols}">${cells.join('')}</div>${ax ? `<div class="cb-ax" aria-hidden="true"><span>${ax[0]}</span><span>${ax[1]}</span></div>` : ''}<figcaption>${match ? icon('check', 16) : ''}${esc(name)}</figcaption></figure>`;
}
function cubeTop(want, have, n, sel) {
  return `<figure class="cb-view${want.join() === have.join() ? ' match' : ''}" data-view="top"><div class="cb-vg" style="--c:${n}">${want.map((w, i) => `<i class="${w && have[i] ? 'ok' : w ? 'miss' : have[i] ? 'extra' : ''}${i === sel ? ' hi' : ''}"></i>`).join('')}</div><figcaption>${want.join() === have.join() ? icon('check', 16) : ''}Top</figcaption></figure>`;
}

export function cubeBuilder(kid, { onTick, onEnd, level = null }) {
  const lv = level || cubeLevel(kid.band), L = CUBE_LEVELS[lv];
  const f = frame('Cube Builder', `${L.name}: ${L.blurb}`, () => g.quit(), 'cubes', 'cubes');
  const g = { f, tune: 'calm' };
  const order = shuffle(CUBE_BANK[lv].map((_, i) => i)).slice(0, CUBE_ROUNDS);
  let round = 0, score = 0, p, h, sel = 0, phase = 'build', born = -1, combo, nextT = 0;
  const made = [], again = [];

  function next() {
    round++; p = cubePuzzle(lv, order[round - 1]);
    h = new Array(p.n * p.n).fill(0); sel = Math.floor(p.n * p.n / 2); phase = 'build'; born = -1;
    draw();
  }
  const views = () => viewsOf(h, p.n);
  function draw(msg = '') {
    const v = views(), n = p.n, r = Math.floor(sel / n), c = sel % n, total = cubeCount(h);
    f.hud.innerHTML = `<span class="chip">Puzzle <b>${round}</b> of ${CUBE_ROUNDS}</span><span class="chip">Stars <b>${score}</b></span>`;
    const lock = phase === 'won' || phase === 'shown';
    f.body.innerHTML = `<div class="cb${lock ? ' lock' : ''}">
      <div class="cb-views">
        ${cubeView('Front', p.views.front, v.front, p.hmax, c)}
        ${cubeView('Side, from the right', p.views.side.slice().reverse(), v.side.slice().reverse(), p.hmax, n - 1 - r, ['front', 'back'])}
        ${cubeTop(p.views.top, v.top, n, sel)}
      </div>
      <div class="cb-main">
        <div class="cb-build">
          <div class="cb-grid" role="grid" aria-label="The floor, seen from above. The front is at the bottom." style="--n:${n}">${h.map((x, i) =>
            `<button class="cb-cell h${x}${i === sel ? ' sel' : ''}${i === born ? ' born' : ''}" data-i="${i}" aria-label="Row ${Math.floor(i / n) + 1} from the back, column ${(i % n) + 1}: ${x} cube${x === 1 ? '' : 's'}"${i === sel ? ' aria-current="true"' : ''}><b>${x || ''}</b></button>`).join('')}</div>
          <p class="cb-front">Front</p>
        </div>
        <div class="cb-side">
        ${cubeIso(h, n, p.hmax, sel)}
      <div class="cb-ctl" role="group" aria-label="Height of the chosen tower">
        <button class="btn cb-ud" data-a="down" aria-label="Lower the tower (minus key)">${icon('down', 22)}</button>
        ${Array.from({ length: p.hmax + 1 }, (_, x) => `<button class="pk cb-h${h[sel] === x ? ' on' : ''}" data-a="set" data-v="${x}" aria-label="Height ${x}">${x}</button>`).join('')}
        <button class="btn cb-ud" data-a="up" aria-label="Raise the tower (plus key)">${icon('up', 22)}</button>
      </div>
      <div class="cb-msg" aria-live="polite">${msg || (phase === 'matched' ? `All three views match, with <b>${total}</b> cubes. It can be done with fewer: take some away, or press Done.` : `<b>${total}</b> cube${total === 1 ? '' : 's'} so far. Make all three views match.`)}</div>
      <div class="mt-tools">
        ${phase === 'matched' ? `<button class="btn primary" data-a="done">Done with ${total} <kbd>Enter</kbd></button>` : `<button class="btn" data-a="done" ${lock ? 'disabled' : ''}>Check <kbd>Enter</kbd></button>`}
        <button class="btn" data-a="clear" ${lock ? 'disabled' : ''}>Clear <kbd>C</kbd></button>
        <button class="btn ghost" data-a="show" ${lock ? 'disabled' : ''}>Show me <kbd>S</kbd></button>
      </div>
        </div>
      </div>
      <p class="mt-keys">Keys: arrows choose a square · <kbd>+</kbd> <kbd>-</kbd> or <kbd>0</kbd>–<kbd>${p.hmax}</kbd> set its tower · <kbd>Enter</kbd> check</p>
    </div>`;
    f.body.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => act('sel', +b.dataset.i));
    f.body.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => act(b.dataset.a, b.dataset.v != null ? +b.dataset.v : undefined));
  }

  /* THE one way the build changes: every key and every tap comes through here */
  function act(a, x) {
    if (!p || phase === 'won' || phase === 'shown') return;
    const n = p.n;
    if (a === 'sel') { sel = x; born = -1; sfx.click(); return draw(); }
    if (a === 'move') {
      const r = Math.floor(sel / n) + x[0], c = (sel % n) + x[1];
      if (r >= 0 && r < n && c >= 0 && c < n) { sel = r * n + c; born = -1; sfx.click(); draw(); }
      return;
    }
    if (a === 'up' || a === 'down' || a === 'set') {
      const to = a === 'set' ? x : h[sel] + (a === 'up' ? 1 : -1);
      if (to < 0 || to > p.hmax) { sfx.bad(); return wobble(g, f.body.querySelector('.cb-cell.sel')); }
      if (to === h[sel]) return;
      h[sel] = to; born = sel; to > 0 ? sfx.place() : sfx.click(); juice(g);
      return settle();
    }
    if (a === 'clear') { h.fill(0); born = -1; sfx.click(); phase = 'build'; return draw(); }
    if (a === 'done') {
      if (phase === 'matched') return solved(2);
      // a check before the views match: the first view that does not, wobbles
      sfx.bad(); combo.miss();
      const v = views(), bad = ['front', 'side', 'top'].find((k) => p.views[k].join() !== v[k].join());
      draw(`The ${bad === 'side' ? 'side' : bad} view does not match yet.`);
      return wobble(g, f.body.querySelector(`[data-view="${bad}"]`));
    }
    if (a === 'show') {
      phase = 'shown'; h = p.answer.slice(); born = -1; combo.miss(); onTick(false);
      again.push(`Puzzle ${round}: shown, ${p.min} cubes`);
      draw(`One way, with the fewest cubes: <b>${p.min}</b>.`);
      wobble(g, f.body.querySelector('.cb-iso'));
      nextT = setTimeout(() => current === g && (round < CUBE_ROUNDS ? next() : finish()), 2600);
    }
  }
  function settle() {
    const match = sameViews(views(), p.views);
    if (match && cubeCount(h) === p.min) return solved(3);
    const was = phase; phase = match ? 'matched' : 'build';
    draw();
    if (match && was !== 'matched') { sfx.good(); const iso = f.body.querySelector('.cb-iso'), [x, y] = centre(iso, f.body.querySelector('.cb')); pop(g, f.body.querySelector('.cb'), x, y); }
  }
  function solved(stars) {
    phase = 'won'; score += stars; combo.hit(); sfx.level(); onTick(true);
    made.push(`Puzzle ${round}: ${cubeCount(h)} cubes${stars === 3 ? ', the fewest' : ''}`);
    if (stars < 3) again.push(`Puzzle ${round}: the fewest was ${p.min}`);
    draw(stars === 3 ? `<b>Solved, with the fewest cubes: ${p.min}.</b>` : `<b>Solved</b> with ${cubeCount(h)} cubes. The fewest was ${p.min}.`);
    const box = f.body.querySelector('.cb'), [x, y] = centre(f.body.querySelector('.cb-iso'), box);
    pop(g, box, x, y, stars === 3 ? '★★★' : '★★');
    nextT = setTimeout(() => current === g && (round < CUBE_ROUNDS ? next() : finish()), 1300);
  }
  function finish() {
    clearTimeout(nextT);
    const stars = cubeStars(score);
    onEnd(score, stars);
    resultCard(g, { title: `${score} of ${CUBE_ROUNDS * 3} stars`, practised: { skill: 'Reading a solid from its front, side and top views', items: made, again }, best: combo.best,
      lines: ['Start with the tallest towers the views need, where a front peak and a side peak meet: one tower can stand for both.'], stars,
      again: () => { g.quit(); cubeBuilder(kid, { onTick, onEnd, level }); }, done: () => g.quit() });
  }
  function begin() {
    combo = comboMeter(g);
    g.key = (e) => {
      if (e.key === 'Escape') { g.quit(); return true; }
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (mv) { act('move', mv); return true; }
      if (e.key === '+' || e.key === '=' || e.key === ']') { act('up'); return true; }
      if (e.key === '-' || e.key === '_' || e.key === '[') { act('down'); return true; }
      if (/^\d$/.test(e.key)) { act('set', +e.key); return true; }
      if (e.key === 'Backspace' || e.key === 'Delete') { act('set', 0); return true; }
      if (e.key === 'Enter' || e.key === ' ') { act('done'); return true; }
      if (e.key === 'c' || e.key === 'C') { act('clear'); return true; }
      if (e.key === 's' || e.key === 'S') { act('show'); return true; }
      return false;
    };
    next();
  }
  g.stop = () => clearTimeout(nextT);
  g.quit = () => end(g);
  g.probe = { answer: () => p && p.answer.slice(), build: () => h && h.slice(), level: () => lv, puzzle: () => p, finish: () => !g.ended && finish() };
  current = g;
  intro(g, 'Cube Builder', 'cubes', begin);
  return g;
}
