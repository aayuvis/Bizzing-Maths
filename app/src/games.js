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
import { esc, sfx, confetti } from './ui.js';
import { makeSudoku, conflicts, SUDOKU } from './puzzles.js';

/* ------------------------------------------------------------ the frame */

let current = null;
export const active = () => current;

function frame(title, sub, onClose) {
  const el = document.createElement('div');
  el.className = 'play';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.innerHTML = `
    <div class="play-bar">
      <button class="play-x" data-g="close" aria-label="Close the game (Escape)">✕</button>
      <div class="play-t"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
      <div class="play-hud" aria-live="polite"></div>
    </div>
    <div class="play-body"></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('playing');
  el.querySelector('[data-g=close]').addEventListener('click', () => onClose());
  return { el, body: el.querySelector('.play-body'), hud: el.querySelector('.play-hud') };
}

function end(g) {
  if (!g) return;
  try { g.stop && g.stop(); } catch (e) {}
  g.f.el.remove();
  document.documentElement.classList.remove('playing');
  if (current === g) current = null;
}

export function closeGame() { if (current) current.quit(); }

/* Global keys route here while a game is up (main.js checks active()). */
export function gameKey(ev) { if (current && current.key) return current.key(ev); return false; }

function resultCard(f, { title, lines, stars, again, done }) {
  const s = [1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}">★</span>`).join('');
  f.body.innerHTML = `<div class="play-end">
      <div class="stars big" aria-label="${stars} of 3 stars">${s}</div>
      <h2>${esc(title)}</h2>
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="row gap">
        <button class="btn primary" data-g="again">Play again</button>
        <button class="btn" data-g="done">Back to the Arcade</button>
      </div></div>`;
  f.body.querySelector('[data-g=again]').onclick = again;
  f.body.querySelector('[data-g=done]').onclick = done;
  f.body.querySelector('[data-g=again]').focus();
  if (stars >= 2) confetti(30);
}

/* The on-screen keypad every game and drill shares. */
export function keypad(extra = '') {
  const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  return `<div class="pad" role="group" aria-label="Number pad">${k.map((x) =>
    `<button class="pk${x === '✓' ? ' go' : x === '⌫' ? ' del' : ''}" data-k="${x}" aria-label="${x === '⌫' ? 'Delete' : x === '✓' ? 'Enter' : x}">${x}</button>`).join('')}${extra}</div>`;
}

/* ============================================================ NUMBER RUSH */

/* Facts fall; type the answer to pop one. The facts are the child's OWN —
   the ones they have met, weighted to the ones not yet fluent — so the game
   is fact practice at speed. Lives, not a clock: three misses and it ends. */
export function numberRush(kid, { onTick, onEnd }) {
  const ops = kid.band === '6-7' ? ['+', '-'] : kid.band === '8-10' ? ['×', '+', '-', '÷'] : ['×', '÷'];
  const pool = [];
  for (const op of ops) {
    const r = ramp(op).filter((f) => f.a > 0 && f.b > 0);
    const met = r.filter((f) => kid.facts[fkey(f)] && kid.facts[fkey(f)].n);
    const edge = r.filter((f) => !met.includes(f)).slice(0, 12);
    pool.push(...(met.length > 8 ? met : r.slice(0, 30)), ...edge);
  }
  const f = frame('Number Rush', 'Type the answer to pop a bubble', () => g.quit());
  const g = { f };
  let raf = 0, bubbles = [], input = '', score = 0, lives = 3, t0 = 0, last = 0, spawnAt = 0, speed = 0.05, over = false, streak = 0;

  f.body.innerHTML = `<div class="rush">
      <canvas class="rush-c" aria-hidden="true"></canvas>
      <div class="rush-in" aria-live="assertive"><span class="rush-typed"></span><span class="rush-caret"></span></div>
      ${keypad()}
    </div>`;
  const cv = f.body.querySelector('canvas'), ctx = cv.getContext('2d');
  const typed = f.body.querySelector('.rush-typed');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  function size() {
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);

  const hud = () => { f.hud.innerHTML = `<span class="chip">Score <b>${score}</b></span><span class="chip lives">${'♥'.repeat(lives)}${'<i>♥</i>'.repeat(3 - lives)}</span>`; };
  hud();

  function spawn(now) {
    const fact = pick(pool);
    const g = (fact.op === '×' || fact.op === '+') && Math.random() < 0.5 ? { ...fact, a: fact.b, b: fact.a } : fact;
    const r = 38 + Math.min(10, ftext(g).length);
    const lanes = Math.max(2, Math.floor(W / (r * 2.4)));
    const lane = int(0, lanes - 1);
    bubbles.push({ fact, text: ftext(g), ans: answer(g), x: (lane + 0.5) * (W / lanes), y: -r, r, hue: pick([218, 150, 32, 268, 190]), born: now });
  }
  function pop(b) {
    bubbles = bubbles.filter((x) => x !== b);
    score++; streak++; sfx.good();
    if (score % 5 === 0) speed *= 1.12;
    burst.push({ x: b.x, y: b.y, t: 0, hue: b.hue });
    onTick(true, b.fact);
    hud();
  }
  const burst = [];

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    // graph paper
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--line-soft') || '#E9ECF5';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
    // the floor
    const fl = ctx.createLinearGradient(0, H - 26, 0, H);
    fl.addColorStop(0, 'rgba(196,69,60,0)'); fl.addColorStop(1, 'rgba(196,69,60,.28)');
    ctx.fillStyle = fl; ctx.fillRect(0, H - 26, W, 26);
    for (const b of bubbles) {
      const gr = ctx.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, b.r * .1, b.x, b.y, b.r);
      gr.addColorStop(0, `hsl(${b.hue} 90% 92%)`); gr.addColorStop(.55, `hsl(${b.hue} 75% 70%)`); gr.addColorStop(1, `hsl(${b.hue} 65% 48%)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(b.x - b.r * .38, b.y - b.r * .45, b.r * .22, b.r * .12, -0.6, 0, Math.PI * 2); ctx.fill();
      // size the sum to fit INSIDE its bubble: a monospace glyph is ~0.6em wide
      const fs = Math.min(b.r * 0.5, (b.r * 1.7) / (b.text.length * 0.6));
      ctx.fillStyle = '#10162c'; ctx.font = `700 ${Math.round(fs)}px Sono, ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, b.x, b.y + 1);
    }
    for (const p of burst) {
      p.t += 0.04; const rr = 20 + p.t * 60;
      ctx.strokeStyle = `hsla(${p.hue} 80% 55% / ${1 - p.t})`; ctx.lineWidth = 4 * (1 - p.t);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
    }
    for (let i = burst.length - 1; i >= 0; i--) if (burst[i].t >= 1) burst.splice(i, 1);
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
        lives--; streak = 0; sfx.bad(); onTick(false, b.fact); hud();
        if (lives <= 0) return finish();
      }
    }
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function setInput(v) {
    input = v.slice(0, 4); typed.textContent = input;
    const hit = bubbles.filter((b) => String(b.ans) === input).sort((a, b) => b.y - a.y)[0];
    if (hit) { pop(hit); input = ''; typed.textContent = ''; }
  }
  function press(k) {
    if (over) return;
    if (k === '⌫') setInput(input.slice(0, -1));
    else if (k === '✓') { if (input) { sfx.click(); setInput(''); } }
    else if (/^\d$/.test(k)) setInput(input + k);
  }
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
  function finish() {
    over = true; cancelAnimationFrame(raf);
    const stars = score >= 30 ? 3 : score >= 15 ? 2 : score >= 5 ? 1 : 0;
    onEnd(score, stars);
    resultCard(f, {
      title: score ? `${score} popped` : 'The bubbles won that one',
      lines: [score >= 15 ? 'That is real speed.' : 'The ones you know best go fastest. Keep playing and more of them will be.'],
      stars, again: () => { g.quit(); numberRush(kid, { onTick, onEnd }); }, done: () => g.quit(),
    });
  }
  g.stop = () => { over = true; cancelAnimationFrame(raf); removeEventListener('resize', size); };
  g.quit = () => end(g);
  current = g;
  raf = requestAnimationFrame(loop);
  return g;
}

/* ======================================================= MAKE THE TARGET */

/* Four numbers, one target, + − × ÷. Pick a number, an operation, another
   number; they combine into one. Reach the target using every number.
   Division must come out whole and subtraction must not go below zero, so a
   child never has to hold a fraction in their head to find a solution — and
   every puzzle served has been SOLVED before it is shown. */

const OPS = { '+': (a, b) => a + b, '−': (a, b) => (a >= b ? a - b : null), '×': (a, b) => a * b, '÷': (a, b) => (b && a % b === 0 ? a / b : null) };

export function solve(nums, target) {
  const memo = new Set();
  function go(items) {
    if (items.length === 1) return items[0].v === target ? items[0].s : null;
    const k = items.map((x) => x.v).sort((a, b) => a - b).join(',');
    if (memo.has(k)) return null;
    for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i], b = items[j], rest = items.filter((_, x) => x !== i && x !== j);
      for (const [op, fn] of Object.entries(OPS)) {
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

export function makePuzzle(band, r = Math.random) {
  const n = band === '6-7' ? 3 : 4;
  const hi = band === '6-7' ? 9 : band === '8-10' ? 10 : 13;
  for (let tries = 0; tries < 400; tries++) {
    const nums = Array.from({ length: n }, () => int(1, hi, r));
    // build a target by combining the numbers at random
    let items = nums.slice();
    while (items.length > 1) {
      items = shuffle(items, r);
      const a = items.pop(), b = items.pop();
      const ops = Object.keys(OPS).filter((o) => OPS[o](a, b) != null && !(band === '6-7' && (o === '×' || o === '÷')));
      items.push(OPS[pick(ops, r)](a, b));
    }
    const target = items[0];
    const lo = band === '6-7' ? 5 : 10, top = band === '6-7' ? 20 : band === '8-10' ? 60 : 150;
    if (target < lo || target > top || nums.includes(target)) continue;
    const sol = solve(nums, target);
    if (sol) return { nums, target, sol };
  }
  return { nums: [2, 3, 4, 6], target: 24, sol: '(6 × 4) × (3 − 2)' };
}

export function makeTarget(kid, { daily = false, onSolve, onEnd }) {
  const title = daily ? "Today's puzzle" : 'Make the Target';
  const f = frame(title, daily ? 'The same puzzle in every house today' : 'Use every number to hit the target', () => g.quit());
  const g = { f };
  let round = 0, solved = 0, puzzle, cards, pickA = null, op = null, history = [], shown = false;
  const ROUNDS = daily ? 1 : 5;

  function next() {
    round++; shown = false;
    puzzle = daily ? makePuzzle(kid.band, seeded('daily:' + dayKey())) : makePuzzle(kid.band);
    cards = puzzle.nums.map((v, i) => ({ id: i, v, s: String(v) }));
    pickA = null; op = null; history = [];
    draw();
  }
  function draw(msg = '') {
    f.hud.innerHTML = daily ? '' : `<span class="chip">Puzzle <b>${round}</b> of ${ROUNDS}</span><span class="chip">Solved <b>${solved}</b></span>`;
    f.body.innerHTML = `<div class="mt">
      <div class="mt-target" aria-label="Target ${puzzle.target}"><span>Target</span><b>${puzzle.target}</b></div>
      <div class="mt-cards">${cards.map((c, i) => `<button class="mt-card${pickA === c.id ? ' on' : ''}" data-c="${c.id}" aria-label="Number ${c.v}, key ${i + 1}"><b>${c.v}</b><i>${i + 1}</i></button>`).join('')}</div>
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
    if (pickA == null || op == null) { pickA = pickA === id ? null : id; sfx.click(); return draw(); }
    if (id === pickA) return;
    const a = cards.find((c) => c.id === pickA), b = cards.find((c) => c.id === id);
    const v = OPS[op](a.v, b.v);
    if (v == null) { const was = op; sfx.bad(); pickA = null; op = null; return draw(was === '÷' ? 'That does not share out evenly — try another way.' : 'That would go below zero — try the other way round.'); }
    history.push(cards.map((c) => ({ ...c })));
    const nc = { id: Math.max(...cards.map((c) => c.id)) + 1, v, s: `(${a.s} ${op} ${b.s})` };
    cards = cards.filter((c) => c !== a && c !== b); cards.splice(0, 0, nc);
    pickA = cards.length > 1 ? nc.id : null; op = null; sfx.click();
    if (cards.length === 1) {
      if (v === puzzle.target) return win();
      sfx.bad(); return draw(`That makes ${v}, not ${puzzle.target}. Undo, or start again.`);
    }
    draw();
  }
  function pickOp(o) { if (shown || pickA == null) return; op = op === o ? null : o; sfx.click(); draw(); }
  function tool(t) {
    if (t === 'undo' && history.length) { cards = history.pop(); pickA = null; op = null; draw(); }
    if (t === 'reset') { cards = puzzle.nums.map((v, i) => ({ id: i, v, s: String(v) })); history = []; pickA = null; op = null; draw(); }
    if (t === 'show') {
      shown = true;
      f.body.querySelector('.mt-msg').innerHTML = `One way: <b class="mono">${esc(puzzle.sol)} = ${puzzle.target}</b>`;
      setTimeout(() => (round < ROUNDS ? next() : finish()), daily ? 99999999 : 3200);
      if (daily) { onEnd(false); f.body.querySelector('.mt-tools').innerHTML = '<button class="btn primary" data-t="done">Done</button>'; f.body.querySelector('[data-t=done]').onclick = () => g.quit(); }
    }
  }
  function win() {
    solved++; sfx.level(); onSolve();
    f.body.querySelector('.mt-msg').innerHTML = `<b>You made ${puzzle.target}!</b>`;
    f.body.querySelector('.mt-target').classList.add('won');
    if (daily) { onEnd(true); confetti(40); setTimeout(() => resultCard(f, { title: "Today's puzzle — solved", lines: ['Come back tomorrow for the next one. Everybody in your house gets the same puzzle.'], stars: 3, again: () => g.quit(), done: () => g.quit() }), 1100); return; }
    setTimeout(() => (round < ROUNDS ? next() : finish()), 1100);
  }
  function finish() {
    const stars = solved >= 5 ? 3 : solved >= 3 ? 2 : solved >= 1 ? 1 : 0;
    onEnd(solved, stars);
    resultCard(f, { title: `${solved} of ${ROUNDS} made`, lines: ['There is usually more than one way. The one "Show me" gives is just one of them.'], stars,
      again: () => { g.quit(); makeTarget(kid, { onSolve, onEnd }); }, done: () => g.quit() });
  }
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
  g.quit = () => end(g);
  current = g;
  next();
  return g;
}

/* =========================================================== NUMBER LINE */

/* Where does it go? Estimation is the number sense contests lean on and
   drills never train. Drag, tap, or arrow keys; Enter to place. Scored on
   how close, never on speed. */
export function numberLine(kid, { onTick, onEnd }) {
  const max = kid.band === '6-7' ? 20 : kid.band === '8-10' ? 100 : 1000;
  const f = frame('Number Line', `Place the number between 0 and ${max}`, () => g.quit());
  const g = { f };
  const ROUNDS = 8;
  let round = 0, total = 0, target = 0, pos = max / 2, placed = false;

  function next() {
    round++; placed = false; pos = max / 2;
    do { target = int(1, max - 1); } while (Math.abs(target - max / 2) < max * 0.06);
    draw();
  }
  function pct(v) { return (v / max) * 100; }
  function draw(msg = '') {
    const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
    f.hud.innerHTML = `<span class="chip">Round <b>${round}</b> of ${ROUNDS}</span><span class="chip">Points <b>${total}</b></span>`;
    f.body.innerHTML = `<div class="nl">
      <p class="nl-q">Where does <b class="mono">${target}</b> go?</p>
      <div class="nl-track" role="slider" tabindex="0" aria-label="Position" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(pos)}">
        <div class="nl-line"></div>
        ${ticks.map((t) => `<span class="nl-tick" style="left:${pct(t)}%"><i></i>${t === 0 || t === max ? t : ''}</span>`).join('')}
        <div class="nl-mark${placed ? ' set' : ''}" style="left:${pct(pos)}%"><span>▼</span></div>
        ${placed ? `<div class="nl-true" style="left:${pct(target)}%"><span>${target}</span></div>` : ''}
      </div>
      <div class="nl-msg" aria-live="polite">${msg || 'Drag the marker, tap the line, or use ← → (hold Shift for big steps).'}</div>
      <div class="row gap center">
        ${placed ? `<button class="btn primary" data-n="next">${round < ROUNDS ? 'Next number' : 'See how you did'} <kbd>Enter</kbd></button>` : `<button class="btn primary" data-n="place">Place it here <kbd>Enter</kbd></button>`}
      </div></div>`;
    const tr = f.body.querySelector('.nl-track');
    const at = (e) => { const r = tr.getBoundingClientRect(); return Math.max(0, Math.min(max, ((e.clientX - r.left) / r.width) * max)); };
    let drag = false;
    tr.onpointerdown = (e) => { if (placed) return; drag = true; tr.setPointerCapture(e.pointerId); move(at(e)); };
    tr.onpointermove = (e) => { if (drag) move(at(e)); };
    tr.onpointerup = () => { drag = false; };
    const b = f.body.querySelector('[data-n]'); b.onclick = () => (placed ? advance() : place());
  }
  function move(v) {
    pos = Math.round(v * (max <= 20 ? 2 : 1)) / (max <= 20 ? 2 : 1);
    const m = f.body.querySelector('.nl-mark'); if (m) m.style.left = pct(pos) + '%';
    const tr = f.body.querySelector('.nl-track'); if (tr) tr.setAttribute('aria-valuenow', Math.round(pos));
  }
  function place() {
    placed = true;
    const err = Math.abs(pos - target) / max;
    const pts = err <= 0.02 ? 10 : err <= 0.05 ? 7 : err <= 0.1 ? 4 : err <= 0.2 ? 1 : 0;
    total += pts;
    onTick(pts >= 4);
    pts >= 7 ? sfx.good() : pts ? sfx.click() : sfx.bad();
    draw(pts === 10 ? 'Bang on.' : pts >= 7 ? 'Very close.' : pts >= 4 ? 'Close.' : `It was here — ${Math.round(err * 100)} hundredths of the line away.`);
  }
  function advance() { round < ROUNDS ? next() : finish(); }
  function finish() {
    const stars = total >= 60 ? 3 : total >= 40 ? 2 : total >= 20 ? 1 : 0;
    onEnd(total, stars);
    resultCard(f, { title: `${total} points`, lines: ['Halfway, then quarters: find those first and the rest falls between them.'], stars,
      again: () => { g.quit(); numberLine(kid, { onTick, onEnd }); }, done: () => g.quit() });
  }
  g.key = (e) => {
    if (e.key === 'Escape') { g.quit(); return true; }
    const step = e.shiftKey ? max / 10 : max <= 20 ? 0.5 : max / 100;
    if (!placed && e.key === 'ArrowLeft') { move(Math.max(0, pos - step)); return true; }
    if (!placed && e.key === 'ArrowRight') { move(Math.min(max, pos + step)); return true; }
    if (e.key === 'Enter' || e.key === ' ') { placed ? advance() : place(); return true; }
    return false;
  };
  g.quit = () => end(g);
  current = g;
  next();
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
  const f = frame('Sudoku', `${n}×${n} — each row, column and box holds 1 to ${n} once`, () => g.quit());
  const g = { f };
  const p = makeSudoku(n, lv);
  const given = p.grid.map(Boolean);
  const cur = p.grid.slice();
  let sel = cur.findIndex((v) => !v), hints = 0, done = false;
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
        return `<button class="sc${given[i] ? ' given' : ''}${i === sel ? ' sel' : ''}${bad.has(i) ? ' bad' : ''}${edge}${same}${peer}" data-i="${i}" aria-label="Row ${r + 1}, column ${c + 1}${v ? ', ' + v : ', empty'}">${v || ''}</button>`;
      }).join('')}</div>
      <div class="sdk-nums">${Array.from({ length: n }, (_, i) => `<button class="pk" data-v="${i + 1}">${i + 1}</button>`).join('')}<button class="pk del" data-v="0" aria-label="Clear">⌫</button></div>
      <div class="row gap center"><button class="btn ghost" data-t="hint">Hint <kbd>H</kbd></button></div>
      <p class="mt-keys">Keys: arrows move · <kbd>1</kbd>–<kbd>${n}</kbd> fill · <kbd>⌫</kbd> clear · <kbd>H</kbd> hint</p>
    </div>`;
    f.body.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { sel = +b.dataset.i; draw(); });
    f.body.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => put(+b.dataset.v));
    f.body.querySelector('[data-t=hint]').onclick = hint;
  }
  function put(v) {
    if (done || sel < 0 || given[sel] || v > n) return;
    cur[sel] = v; sfx.click();
    if (cur.every(Boolean) && conflicts(cur, n).size === 0) return win();
    draw();
  }
  function hint() {
    if (done) return;
    let i = sel >= 0 && !given[sel] && cur[sel] !== p.solution[sel] ? sel : cur.findIndex((v, j) => v !== p.solution[j]);
    if (i < 0) return;
    cur[i] = p.solution[i]; given[i] = true; hints++; sel = i; sfx.coin();
    if (cur.every(Boolean) && conflicts(cur, n).size === 0) return win();
    draw();
  }
  function win() {
    done = true; draw(); sfx.level();
    const stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
    onEnd(true, stars);
    setTimeout(() => resultCard(f, { title: 'Solved!', lines: [hints ? `With ${hints} hint${hints > 1 ? 's' : ''}. Try the next one with none.` : 'No hints at all — pure logic.'], stars,
      again: () => { g.quit(); sudoku(kid, n, lv, { onEnd }); }, done: () => g.quit() }), 700);
  }
  g.key = (e) => {
    if (e.key === 'Escape') { g.quit(); return true; }
    const mv = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (mv) { const j = sel + mv; if (j >= 0 && j < n * n && !(mv === -1 && sel % n === 0) && !(mv === 1 && sel % n === n - 1)) { sel = j; draw(); } return true; }
    if (/^[1-9]$/.test(e.key)) { put(+e.key); return true; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { put(0); return true; }
    if (e.key === 'h' || e.key === 'H') { hint(); return true; }
    return false;
  };
  g.quit = () => { if (!done) onEnd(false, 0); end(g); };
  current = g;
  draw();
  return g;
}
