/* games.js — the Arcade. Three games, every one with keyboard AND touch.

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
import { int, pick, shuffle, seeded, dayKey } from './rand.js';
import { esc, sfx, confetti, music } from './ui.js';
import { icon } from './icons.js';
import { makeSudoku, conflicts, SUDOKU } from './puzzles.js';

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
  sudoku: { practises: 'logic: every row, column and box once', steps: [['▢', 'Pick an empty square.'], ['✎', 'Fill it in, by tap or by key.'], ['✓', 'No row, column or box may repeat one.']] },
  // the bonus modes (extras.js): each its own how-to, the same keys and pad as its game
  'rush:mixed': { practises: 'all four operations, at speed', steps: [['±', 'Adding, taking away, times and sharing — all falling at once.'], ['⌨', 'Type the answer on the keys or the pad.'], ['✦', 'Right pops it. Three landings and it ends.']] },
  'rush:squares': { practises: 'square numbers, at speed', steps: [['▢', 'Every bubble is a number times itself.'], ['⌨', 'Type the square on the keys or the pad.'], ['✦', 'Right pops it. Three landings and it ends.']] },
  'target:five': { practises: 'joining five numbers with + − × ÷', steps: [['☝', 'Tap a number, then + − × or ÷, then another.'], ['⊕', 'Five numbers this time: keys 1 to 5.'], ['◎', 'Use every number to make the target.']] },
  'target:hard': { practises: 'reaching big targets with × and ÷', steps: [['☝', 'Tap a number, then + − × or ÷, then another.'], ['×', 'Adding alone will not get there: you need × or ÷.'], ['◎', 'Use every number to make the target.']] },
  'line:fractions': { practises: 'where a fraction sits between 0 and 1', steps: [['½', 'A fraction appears above the line.'], ['↔', 'Drag, tap, or use ← → to move the marker.'], ['▼', 'Halves first, then quarters. The closer, the more points.']] },
  'line:negatives': { practises: 'numbers below nought', steps: [['0', 'Nought is in the middle; below it, the negatives.'], ['↔', 'Drag, tap, or use ← → to move the marker.'], ['▼', 'Place it. The closer, the more points.']] },
};
const MODE_NAME = { 'rush:mixed': 'Mixed operations', 'rush:squares': 'Squares', 'target:five': 'Five numbers', 'target:hard': 'Hard target', 'line:fractions': 'Fractions', 'line:negatives': 'Negatives' };
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
export function keypad(keys = []) {
  const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  const name = { '⌫': 'Delete', '✓': 'Enter', '.': 'Point', '−': 'Minus', '/': 'Fraction bar' };
  const extra = (Array.isArray(keys) ? keys : []).filter((x) => ['.', '−', '/'].includes(x));
  return `<div class="pad" role="group" aria-label="Number pad">${extra.length ? `<div class="pad-x">${extra.map((x) => `<button class="pk alt" data-k="${x}" aria-label="${name[x]}">${x}</button>`).join('')}</div>` : ''}${k.map((x) =>
    `<button class="pk${x === '✓' ? ' go' : x === '⌫' ? ' del' : ''}" data-k="${x}" aria-label="${name[x] || x}">${x}</button>`).join('')}</div>`;
}

/* ============================================================ NUMBER RUSH */

/* Facts fall; type the answer to pop one. The facts are the child's OWN —
   the ones they have met, weighted to the ones not yet fluent — so the game
   is fact practice at speed. Lives, not a clock: three misses and it ends. */
/* What falls. The standard game serves the child's own facts for their band; "mixed"
   serves all four operations; "squares" serves the squares bank (facts.js '²', the
   squares the app asks every child to know), up to 10² / 12² / 20² by band. */
export function rushPool(kid, mode = null) {
  if (mode === 'squares') {
    const top = kid.band === '6-7' ? 10 : kid.band === '8-10' ? 12 : 20;
    return ramp('²').filter((f) => f.a >= 2 && f.a <= top).map((f) => ({ fact: f, ...f }));
  }
  const ops = mode === 'mixed' ? ['+', '-', '×', '÷'] : kid.band === '6-7' ? ['+', '-'] : kid.band === '8-10' ? ['×', '+', '-', '÷'] : ['×', '÷'];
  const pool = [];
  for (const op of ops) {
    const r = ramp(op).filter((f) => f.a > 0 && f.b > 0);
    const met = r.filter((f) => kid.facts[fkey(f)] && kid.facts[fkey(f)].n);
    const edge = r.filter((f) => !met.includes(f)).slice(0, 12);
    pool.push(...(met.length > 8 ? met : r.slice(0, 30)), ...edge);
  }
  return pool.map((f) => ({ fact: f, a: f.a, b: f.b, op: f.op }));
}
export function numberRush(kid, { onTick, onEnd, mode = null }) {
  const mk = modeKey('rush', mode);
  const pool = rushPool(kid, mk ? mode : null);
  const ops = uniq(pool.map((x) => x.op));
  const f = frame(titled('Number Rush', mk), mode === 'squares' && mk ? 'Pop each square: a number times itself' : 'Type the answer to pop a bubble', () => g.quit(), 'rush', mk || 'rush');
  const g = { f, tune: 'bright' };
  let raf = 0, bubbles = [], input = '', score = 0, lives = 3, t0 = 0, last = 0, spawnAt = 0, speed = 0.05, over = false;
  const popped = [], landed = [];
  let cv, ctx, typed, stage, inp, W = 0, H = 0, combo;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function size() {
    if (!cv) return;
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const hud = () => { f.hud.innerHTML = `<span class="chip">Score <b>${score}</b></span><span class="chip lives">${'♥'.repeat(lives)}${'<i>♥</i>'.repeat(3 - lives)}</span>`; };

  function begin() {
    f.body.innerHTML = `<div class="rush">
        <div class="rush-stage"><canvas class="rush-c" aria-hidden="true"></canvas></div>
        <div class="rush-in" aria-live="assertive"><span class="rush-typed"></span><span class="rush-caret"></span></div>
        ${keypad()}
      </div>`;
    cv = f.body.querySelector('canvas'); ctx = cv.getContext('2d');
    typed = f.body.querySelector('.rush-typed'); stage = f.body.querySelector('.rush-stage'); inp = f.body.querySelector('.rush-in');
    combo = comboMeter(g);
    size(); addEventListener('resize', size);
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

  function spawn(now) {
    const { fact, ...q } = pick(pool);
    const g = (q.op === '×' || q.op === '+') && Math.random() < 0.5 ? { ...q, a: q.b, b: q.a } : q;
    const r = 38 + Math.min(10, ftext(g).length);
    const lanes = Math.max(2, Math.floor(W / (r * 2.4)));
    const lane = int(0, lanes - 1);
    bubbles.push({ fact, text: ftext(g), ans: answer(g), x: (lane + 0.5) * (W / lanes), y: -r, r, hue: pick([218, 150, 32, 268, 190]), born: now });
  }
  function popIt(b) {
    bubbles = bubbles.filter((x) => x !== b);
    score++; combo.hit(); sfx.pop(); sfx.good();
    if (score % 5 === 0) speed *= 1.12;
    popped.push(b.text);
    pop(g, stage, b.x, b.y, '+1');
    fly(g, stage, b.x, b.y, String(b.ans));
    onTick(true, b.fact);
    hud();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // the floor: a soft glow where the meadow is, so a landing has somewhere to land
    const fl = ctx.createLinearGradient(0, H - 26, 0, H);
    fl.addColorStop(0, 'rgba(196,69,60,0)'); fl.addColorStop(1, 'rgba(196,69,60,.16)');
    ctx.fillStyle = fl; ctx.fillRect(0, H - 26, W, 26);
    const face = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'ui-monospace, monospace'; // the theme's digits
    for (const b of bubbles) {
      const gr = ctx.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, b.r * .1, b.x, b.y, b.r);
      gr.addColorStop(0, `hsl(${b.hue} 90% 94%)`); gr.addColorStop(.6, `hsl(${b.hue} 80% 80%)`); gr.addColorStop(1, `hsl(${b.hue} 65% 58%)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(b.x - b.r * .38, b.y - b.r * .45, b.r * .22, b.r * .12, -0.6, 0, Math.PI * 2); ctx.fill();
      // size the sum to fit INSIDE its bubble: a monospace glyph is ~0.6em wide
      const fs = Math.min(b.r * 0.5, (b.r * 1.7) / (b.text.length * 0.6));
      ctx.fillStyle = '#10162c'; ctx.font = `700 ${Math.round(fs)}px ${face}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, b.x, b.y + 1);
    }
  }

  function loop(now) {
    if (over) return;
    if (!t0) { t0 = now; last = now; spawnAt = now + 300; }
    const dt = Math.min(34, now - last); last = now;
    if (now >= spawnAt) { spawn(now); spawnAt = now + Math.max(900, 2600 - score * 45); }
    for (const b of bubbles) b.y += speed * dt * (H / 520);
    for (const b of bubbles.slice()) {
      if (b.y - b.r > H - 20) {
        bubbles = bubbles.filter((x) => x !== b);
        lives--; combo.miss(); sfx.drop(); landed.push(`${b.text} = ${b.ans}`); onTick(false, b.fact); hud();
        pop(g, stage, b.x, H - 14);
        wobble(g, f.hud.querySelector('.lives'));
        if (lives <= 0) return finish();
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  function setInput(v) {
    input = v.slice(0, 4); typed.textContent = input;
    const hit = bubbles.filter((b) => String(b.ans) === input).sort((a, b) => b.y - a.y)[0];
    if (hit) { popIt(hit); input = ''; typed.textContent = ''; }
  }
  function press(k) {
    if (over) return;
    if (k === '⌫') setInput(input.slice(0, -1));
    // Enter on an answer that popped nothing: it was wrong for every bubble up
    else if (k === '✓') { if (input) { sfx.bad(); combo.miss(); wobble(g, inp); setInput(''); } }
    else if (/^\d$/.test(k)) { sfx.click(); setInput(input + k); }
  }
  function finish() {
    over = true; cancelAnimationFrame(raf);
    const stars = score >= 30 ? 3 : score >= 15 ? 2 : score >= 5 ? 1 : 0;
    onEnd(score, stars);
    resultCard(g, {
      title: score ? `${score} popped` : 'The bubbles won that one',
      practised: { skill: mode === 'squares' && mk ? 'square numbers, at speed' : rushSkill(ops), items: uniq(popped).slice(0, 12), again: uniq(landed).slice(0, 6) },
      best: combo.best,
      lines: [score >= 15 ? 'That is real speed.' : 'The ones you know best go fastest. Keep playing and more of them will be.'],
      stars, again: () => { g.quit(); numberRush(kid, { onTick, onEnd, mode }); }, done: () => g.quit(),
    });
  }
  g.stop = () => { over = true; cancelAnimationFrame(raf); removeEventListener('resize', size); };
  g.quit = () => end(g);
  g.probe = { answers: () => bubbles.filter((b) => b.y > 0).map((b) => String(b.ans)), finish: () => !over && finish() };
  current = g;
  intro(g, titled('Number Rush', mk), mk || 'rush', begin);
  return g;
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
      setTimeout(() => current === g && resultCard(g, { title: "Today's puzzle — solved", practised: { skill: 'Joining numbers with + − × ÷ to make a target', items: made }, lines: ['Come back tomorrow for the next one. Everybody in your house gets the same puzzle.'], stars: 3, again: () => g.quit(), done: () => g.quit() }), 1100);
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
export function lineSpec(band, mode = null) {
  if (mode === 'fractions') {
    const dens = band === '6-7' ? [2, 4] : band === '8-10' ? [2, 3, 4, 5, 8, 10] : [3, 4, 5, 6, 8, 10, 12];
    return { lo: 0, hi: 1, snap: 100, ends: ['0', '1'], skill: 'Placing fractions between 0 and 1',
      pick(r = Math.random) {
        for (;;) { const d = dens[int(0, dens.length - 1, r)], n = int(1, d - 1, r); if (gcd(n, d) === 1 && 2 * n !== d) return { v: n / d, label: `${n}/${d}` }; }
      } };
  }
  const max = band === '6-7' ? 20 : band === '8-10' ? 100 : 1000;
  if (mode === 'negatives') {
    const m = band === '6-7' ? 10 : band === '8-10' ? 50 : 500;
    return { lo: -m, hi: m, snap: m <= 10 ? 2 : 1, ends: [`−${m}`, String(m)], mid: '0', skill: `Placing numbers between −${m} and ${m}`,
      pick(r = Math.random) { for (;;) { const v = int(-m + 1, m - 1, r); if (v !== 0 && Math.abs(v) >= m * 0.06) return { v, label: v < 0 ? `−${-v}` : String(v) }; } } };
  }
  return { lo: 0, hi: max, snap: max <= 20 ? 2 : 1, ends: ['0', String(max)], skill: `Estimating where a number sits between 0 and ${max}`,
    pick(r = Math.random) { let v; do { v = int(1, max - 1, r); } while (Math.abs(v - max / 2) < max * 0.06); return { v, label: String(v) }; } };
}
export function numberLine(kid, { onTick, onEnd, mode = null }) {
  const mk = modeKey('line', mode), L = lineSpec(kid.band, mk ? mode : null);
  const { lo, hi } = L, span = hi - lo, mid = (lo + hi) / 2;
  const f = frame(titled('Number Line', mk), `Place the number between ${L.ends[0]} and ${L.ends[1]}`, () => g.quit(), 'line', mk || 'line');
  const g = { f, tune: 'sea' };
  const ROUNDS = 8;
  let round = 0, total = 0, target = 0, label = '', pos = mid, placed = false, combo;
  const close = [], far = [];

  function next() {
    round++; placed = false; pos = mid;
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
