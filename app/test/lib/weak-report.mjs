/* node test/lib/weak-report.mjs — every middle step whose check only restates its value, one line each (the same rules test/tricks.mjs enforces). */
import { TRICKS } from '../../src/tricks.js';
import { JOURNEY as V } from '../../src/library/vedic.js';
import { JOURNEY as C } from '../../src/library/chinese.js';
import { seeded } from '../../src/rand.js';
import { checkSteps, constReport } from './steps.mjs';
const out = new Map();
const rec = (m) => { const k = m.replace(/: .*? — step/, ' — step').replace(/x \(.*?\) (adds|multiplies|square|takes|counts)/, '$1').replace(/\d+/g, '#').slice(0, 170); out.set(k, (out.get(k) || 0) + 1); };
const run = (id, st, svgOf) => { const r = seeded(id); for (const lv of [1, 2, 3]) for (let i = 0; i < 120; i++) { const q = st.gen(r, lv); checkSteps(id, q, st.work(q), (c, m) => { if (!c) rec(m); }, svgOf(q)); } };
for (const t of TRICKS) run(t.id, t, (q) => (t.draw ? t.draw(q) : q.html || ''));
for (const [n, J] of [['vedic', V], ['chinese', C]]) for (const st of J) if (st.gen && st.work) run(`${n}/${st.id}`, st, (q) => q.html || '');
constReport((c, m) => { if (!c) rec(m); });
const rows = [...out.keys()].sort();
console.log(rows.length + ' weak sites'); for (const r of rows) console.log(' - ' + r);
