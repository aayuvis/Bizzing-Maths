/* widgets.js — new ways to ANSWER a question the engine already checks (audit v4 E4).

   A stop's gen() may set q.input on some questions:
     'fracbar' — build a fraction: choose how many equal parts, shade some (q.bar says what is handed in);
     'blocks'  — build a number with hundreds, tens and ones blocks;
     'chart'   — tap the bar, row or dot the question asks for (the label is handed in as the choice).
   The widget only BUILDS a value. What it hands in is the same string a child could type (or the same
   choice they could pick), and correct() in tricks.js judges it — so q.ans, q.expr and work() stay the
   single source of truth, and test/widgets.mjs proves every widget question can be built at all.

   State lives on the run (run.w), is made by init(q), and is pure data; view() draws it. Every control
   is a real button (touch), every control has a key (keyboard), and nothing in the first state is the
   answer (test/widgets.mjs). */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const KINDS = ['fracbar', 'blocks', 'chart'];
export const FRAC_MAX = 12;            // the most equal parts a bar may be cut into
export const BLOCKS_MAX = 9;           // the most blocks in one column — a column holds one digit
const COLS = [['h', 'Hundreds', 'hundred', 100], ['t', 'Tens', 'ten', 10], ['o', 'Ones', 'one', 1]];

export const isWidget = (q) => !!q && KINDS.includes(q.input);
const bar = (q) => ({ give: 'frac', ...(q.bar || {}) });

/* ------------------------------------------------------------- the model */

export function init(q) {
  if (q.input === 'fracbar') {
    const b = bar(q);
    if (b.lockK) return { n: b.lockK, on: Array.from({ length: b.lockK }, (_, i) => i), cur: 0 };
    return { n: b.lockN || 1, on: [], cur: 0 };
  }
  if (q.input === 'blocks') return { h: 0, t: 0, o: 0, col: 2 };
  if (q.input === 'chart') return { cur: -1 };
  return null;
}

/* what the widget hands in, as the string a child could have typed (or the choice they could pick) */
export function value(q, w) {
  if (q.input === 'fracbar') { const b = bar(q), k = w.on.length; return b.give === 'k' ? String(k) : b.give === 'n' ? String(w.n) : `${k}/${w.n}`; }
  if (q.input === 'blocks') return String(100 * w.h + 10 * w.t + w.o);
  if (q.input === 'chart') return w.cur >= 0 ? q.choices[w.cur] : '';
  return '';
}

/* every state the widget can reach (for the test that it can build the answer) */
export function* states(q) {
  if (q.input === 'fracbar') {
    const b = bar(q);
    if (b.lockK) { for (let n = b.lockK; n <= FRAC_MAX; n++) yield { n, on: Array.from({ length: b.lockK }, (_, i) => i), cur: 0 }; return; }
    for (const n of b.lockN ? [b.lockN] : Array.from({ length: FRAC_MAX }, (_, i) => i + 1))
      for (let k = 0; k <= n; k++) yield { n, on: Array.from({ length: k }, (_, i) => i), cur: 0 };
    return;
  }
  if (q.input === 'blocks') { for (let h = 0; h <= BLOCKS_MAX; h++) for (let t = 0; t <= BLOCKS_MAX; t++) for (let o = 0; o <= BLOCKS_MAX; o++) yield { h, t, o, col: 2 }; return; }
  if (q.input === 'chart') for (let i = 0; i < q.choices.length; i++) yield { cur: i };
}

/* the widget's actions — one vocabulary for the buttons, the keys and the drag */
export function act(q, w, a, arg) {
  if (q.input === 'fracbar') {
    const b = bar(q), clamp = (i) => Math.max(0, Math.min(w.n - 1, i));
    if (a === 'n+' && !b.lockN && w.n < FRAC_MAX) { w.n++; }
    else if (a === 'n-' && !b.lockN && w.n > Math.max(1, b.lockK || 1)) { w.n--; w.on = w.on.filter((i) => i < w.n); }
    else if (b.lockK) { /* the shaded parts are given; only the number of parts moves */ }
    else if (a === 'toggle') { const i = arg == null ? w.cur : +arg; w.on = w.on.includes(i) ? w.on.filter((x) => x !== i) : [...w.on, i].sort((x, y) => x - y); w.cur = i; }
    else if (a === 'paint') { const [i, on] = arg; if (on && !w.on.includes(i)) w.on = [...w.on, i].sort((x, y) => x - y); if (!on) w.on = w.on.filter((x) => x !== i); w.cur = i; }
    else if (a === 'k+') { const i = [...Array(w.n).keys()].find((x) => !w.on.includes(x)); if (i != null) { w.on = [...w.on, i].sort((x, y) => x - y); w.cur = i; } }
    else if (a === 'k-') { if (w.on.length) w.on = w.on.slice(0, -1); }
    else if (a === 'cur') w.cur = clamp(w.cur + arg);
    w.cur = clamp(w.cur);
    return w;
  }
  if (q.input === 'blocks') {
    const c = a.slice(0, -1), d = a.at(-1);
    if (COLS.some(([k]) => k === c) && (d === '+' || d === '-')) w[c] = Math.max(0, Math.min(BLOCKS_MAX, w[c] + (d === '+' ? 1 : -1)));
    if (a === 'col') w.col = Math.max(0, Math.min(2, w.col + arg));
    if (a === 'set') { const v = Math.max(0, Math.min(999, arg)); w.h = Math.floor(v / 100); w.t = Math.floor(v / 10) % 10; w.o = v % 10; }
    return w;
  }
  if (q.input === 'chart') { if (a === 'cur') { const n = q.choices.length; w.cur = w.cur < 0 ? (arg > 0 ? 0 : n - 1) : (w.cur + arg + n) % n; } return w; }
  return w;
}

/* A typed answer on the keyboard shows in the widget, so the two routes never disagree: digits shift
   into the blocks the way a number is written (3, 34, 340), and a typed fraction cuts and shades the bar. */
export function mirror(q, w, typed) {
  if (q.input === 'blocks') { const v = Number(typed || 0); if (Number.isInteger(v) && v <= 999) act(q, w, 'set', v); return w; }
  if (q.input === 'fracbar') {
    const b = bar(q), s = String(typed || '');
    if (b.give === 'frac') { const m = /^(\d+)\/(\d+)$/.exec(s); if (m && +m[2] >= 1 && +m[2] <= FRAC_MAX && +m[1] <= +m[2]) { w.n = +m[2]; w.on = [...Array(+m[1]).keys()]; } }
    else if (/^\d+$/.test(s)) {
      const v = +s;
      if (b.give === 'k' && v <= w.n) w.on = [...Array(v).keys()];
      if (b.give === 'n' && v >= (b.lockK || 1) && v <= FRAC_MAX) w.n = v;
    }
  }
  return w;
}

/* ------------------------------------------------------------- the views */

const btn = (label, a, arg, aria, extra = '') => `<button class="wbtn" data-act="${a}" data-arg="${esc(arg)}" aria-label="${esc(aria)}"${extra}>${label}</button>`;
const MINUS = '−';
const CHECK = '<div class="row center"><button class="btn primary big" data-act="wCheck">Check <kbd>Enter</kbd></button></div>';

/* opts: { fb, demo } — fb: the answer is in (controls off); demo: Learn's picture, never interactive */
export function view(q, w, opts = {}) {
  const off = !!(opts.fb || opts.demo), dis = off ? ' disabled' : '';
  const how = q.how && !opts.fb ? `<p class="wid-how">${esc(q.how)}</p>` : '';   // what to build: the widget's own words, never the question's
  if (q.input === 'fracbar') {
    const b = bar(q), k = w.on.length;
    const parts = Array.from({ length: w.n }, (_, i) => `<button class="wf-p${w.on.includes(i) ? ' on' : ''}${i === w.cur && w.kb && !off ? ' cur' : ''}" data-part="${i}" aria-pressed="${w.on.includes(i)}" aria-label="Part ${i + 1} of ${w.n}${w.on.includes(i) ? ', shaded' : ''}"${dis || (b.lockK ? ' disabled' : '')}></button>`).join('');
    const read = b.give === 'k' ? `<b>${k}</b> shaded` : b.give === 'n' ? `<b>${w.n}</b> equal parts` : `<b class="mono">${k}/${w.n}</b>`;
    return `<div class="wid wfrac${off ? ' off' : ''}" id="widget" role="group" aria-label="Build the fraction on the bar">${how}
      <div class="wf-row">${b.lockN ? `<span class="wf-lab">${w.n} equal parts</span>` : `${btn(MINUS, 'wf', 'n-', 'Fewer parts', dis)}<span class="wf-lab"><b>${w.n}</b> equal part${w.n > 1 ? 's' : ''}</span>${btn('+', 'wf', 'n+', 'More parts', dis)}`}</div>
      <div class="wf-bar" role="group" aria-label="The bar, ${w.n} equal parts, ${k} shaded">${parts}</div>
      ${b.lockK ? `<p class="wf-lab">${k} parts shaded</p>` : `<div class="wf-row">${btn(MINUS, 'wf', 'k-', 'Shade one fewer', dis)}<span class="wf-lab">shade</span>${btn('+', 'wf', 'k+', 'Shade one more', dis)}</div>`}
      <p class="wid-read" aria-live="polite">${read}</p>
      ${off ? '' : `<p class="hint wid-keys">${b.lockN ? '' : '<kbd>←</kbd> <kbd>→</kbd> parts · '}${b.lockK ? '' : '<kbd>↑</kbd> <kbd>↓</kbd> or <kbd>Space</kbd> shade · '}<kbd>Enter</kbd> checks</p>
      ${CHECK}`}
    </div>`;
  }
  if (q.input === 'blocks') {
    const cols = COLS.map(([c, name, one], j) => {
      const n = w[c], pile = Array.from({ length: n }, () => `<i class="wb-${c}"></i>`).join('');
      return `<div class="wb-col${j === w.col && w.kb && !off ? ' cur' : ''}" role="group" aria-label="${name}: ${n}">
        <p class="wb-head">${name}</p>
        <div class="wb-pile wb-pile-${c}" aria-hidden="true">${pile}</div>
        <p class="wb-n mono">${n}</p>
        <div class="wb-btns">${btn(MINUS, 'wb', c + '-', `Take away a ${one}`, dis)}${btn('+', 'wb', c + '+', `Add a ${one}`, dis)}</div>
      </div>`;
    }).join('');
    return `<div class="wid wblocks${off ? ' off' : ''}" id="widget" role="group" aria-label="Build the number with blocks">${how}
      <div class="wb-cols">${cols}</div>
      <p class="wid-read mono" aria-live="polite">${value(q, w)}</p>
      ${off ? '' : `<p class="hint wid-keys"><kbd>←</kbd> <kbd>→</kbd> column · <kbd>↑</kbd> <kbd>↓</kbd> add or take away · <kbd>Enter</kbd> checks</p>
      ${CHECK}`}
    </div>`;
  }
  if (q.input === 'chart') {
    const H = q.hits || { w: 1, h: 1, hits: [] }, pct = (v, of) => (100 * v / of).toFixed(3) + '%';
    const fb = opts.fb, shown = opts.demo === 'done';
    const hits = H.hits.map((r, i) => {
      const c = q.choices[i], right = (fb || shown) && c === q.ans, wrong = fb && !fb.right && c === fb.given;
      return `<button class="tc-hit${i === w.cur && !off ? ' cur' : ''}${right ? ' right' : ''}${wrong ? ' wrong' : ''}" data-act="choose" data-arg="${esc(c)}" data-hit="${i}" aria-label="${esc(c)}"${dis} style="left:${pct(r.x, H.w)};top:${pct(r.y, H.h)};width:${pct(r.w, H.w)};height:${pct(r.h, H.h)}"></button>`;
    }).join('');
    return `<div class="wid wchart${off ? ' off' : ''}" id="widget">${how}<div class="tapchart" role="group" aria-label="Tap your answer on the chart">${q.html || ''}${hits}</div>
      ${off ? '' : '<p class="hint wid-keys">Tap it — or <kbd>←</kbd> <kbd>→</kbd> then <kbd>Enter</kbd></p>'}</div>`;
  }
  return '';
}

/* Learn's picture of the same widget: empty while the steps are being watched, built to the answer at
   the end — the first state the widget can reach that correct() accepts. */
export function demo(q, done, correct) {
  let w = init(q);
  if (done) for (const s of states(q)) if (correct(q, value(q, s))) { w = s; break; }
  return `<p class="kicker">In the drill, you build it</p>${view(q, w, { demo: done ? 'done' : 'start' })}`;
}
