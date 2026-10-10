/* geo3d-play.js — the player for the geometry explainers (geo3d.js draws; this only moves time).

   Loaded on first need: main.js imports it when a screen has a .g3d on it, so it is never part of
   the first load. Every explainer is the child's to drive:
     · Play runs to the end of the sequence and STOPS — no loop, and no frame is asked for once
       it has stopped (window.__g3.frames counts them, so the browser check can see it).
     · ← → step, Home / End jump, Space plays or pauses; ↑ ↓ (and the Turn button, or a drag)
       turn a solid round. All 44px buttons, so touch has every one of these too.
     · Reduced motion (the device's setting, or Settings' own switch): no tweening at all — Play
       is hidden and every step is a still picture the child moves through.
   Where it is in its sequence survives a re-render: the state is kept by the explainer's key. */
import { frame, model, lastStep } from './geo3d.js';
import { icon } from './icons.js';

const STATE = new Map();
const G3 = (globalThis.__g3 = globalThis.__g3 || { frames: 0, playing: 0 });
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-motion') === 'reduced';

export function mount(root) {
  for (const el of root.querySelectorAll('.g3d:not([data-g3on])')) wire(el);
}

function wire(el) {
  el.setAttribute('data-g3on', '');
  const spec = JSON.parse(el.dataset.g3spec), mode = el.dataset.g3mode || 'full', key = el.dataset.g3key;
  const n = lastStep(spec, mode), ms = model(spec, mode).ms || [], three = !!model(spec, mode).three;
  const st = STATE.get(key) || { t: 0, playing: false, yaw: 0, to: 0 };
  STATE.set(key, st);
  st.owner = el;
  const stage = el.querySelector('.g3-stage'), cap = el.querySelector('.g3-cap'), pos = el.querySelector('.g3-pos');
  const btn = (a) => el.querySelector(`[data-g3b=${a}]`);
  if (three) stage.classList.add('turnable');
  let last = 0;

  const draw = () => {
    const f = frame(spec, st.t, mode, { yaw: st.yaw });
    stage.innerHTML = f.svg;
    if (cap.textContent !== f.cap) cap.textContent = f.cap;
    pos.textContent = mode === 'ask' ? `Step ${f.i + 1}` : `${f.i + 1} / ${n + 1}`;   // in ask mode the length of the sequence could count the answer's rows
    const calm = still();
    btn('play').hidden = calm;
    btn('play').innerHTML = icon(st.playing ? 'pause' : 'play', 22);
    btn('play').setAttribute('aria-label', st.playing ? 'Pause' : st.t >= n ? 'Play again' : 'Play');
    btn('play').title = btn('play').getAttribute('aria-label');
    btn('first').disabled = btn('prev').disabled = st.t <= 0;
    btn('next').disabled = st.t >= n;
    el.dataset.g3t = String(Math.round(st.t * 1000) / 1000);
    el.toggleAttribute('data-g3playing', st.playing);
  };
  const stop = () => { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; if (st.playing) G3.playing--; st.playing = false; };
  const loop = (now) => {
    if (st.owner !== el || !el.isConnected) return;            // this explainer was re-drawn: its new copy carries on
    st.raf = null;
    G3.frames++;
    const dt = Math.min(100, now - last); last = now;
    const step = Math.min(n, Math.floor(st.t) + 1);
    st.t = Math.min(st.to, st.t + dt / (ms[step] || 1100));
    if (st.t >= st.to - 1e-9) { st.t = st.to; stop(); draw(); return; }
    draw();
    st.raf = requestAnimationFrame(loop);
  };
  const go = (to) => {
    to = Math.max(0, Math.min(n, to));
    if (still()) { stop(); st.t = to; draw(); return; }
    if (!st.playing) G3.playing++;
    st.playing = true; st.to = to; last = performance.now();
    if (!st.raf) st.raf = requestAnimationFrame(loop);
    draw();
  };
  const act = (a) => {
    if (a === 'play') { if (st.playing) { stop(); draw(); } else { if (st.t >= n) st.t = 0; go(n); } }
    else if (a === 'next') { stop(); go(Math.floor(st.t + 1e-9) + 1); }
    else if (a === 'prev') { stop(); st.t = Math.max(0, Math.ceil(st.t - 1e-9) - 1); draw(); }
    else if (a === 'first') { stop(); st.t = 0; draw(); }
    else if (a === 'last') { stop(); st.t = n; draw(); }
    else if (a === 'turn' || a === 'turnBack') { st.yaw += (a === 'turn' ? 1 : -1) * Math.PI / 4; draw(); }
  };
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-g3b]'); if (!b || !el.contains(b)) return; e.preventDefault(); act(b.dataset.g3b); });
  el.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onBtn = e.target.closest && e.target.closest('button');
    const map = { ArrowRight: 'next', ArrowLeft: 'prev', Home: 'first', End: 'last', ...(three ? { ArrowUp: 'turn', ArrowDown: 'turnBack' } : {}) };
    let a = map[e.key];
    if (!a && e.key === ' ' && !onBtn && !still()) a = 'play';
    if (a) { e.preventDefault(); e.stopPropagation(); act(a); return; }
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();   // a button's own click; the page's Enter (Next question) is not ours to fire
  });
  if (three) {
    let drag = null;
    stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw: st.yaw, moved: false }; });
    stage.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) { drag.moved = true; st.yaw = drag.yaw + dx / 80; draw(); } });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) stage.addEventListener(ev, () => { drag = null; });
  }
  if (st.playing) { if (st.raf) cancelAnimationFrame(st.raf); last = performance.now(); st.raf = requestAnimationFrame(loop); }   // a re-render mid-play: carry on here
  draw();
}
