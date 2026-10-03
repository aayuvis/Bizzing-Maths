/* test/papers.mjs — the paper simulator (docs/PAPER-CONTRACT.md), held to what a
   child sitting a paper would notice:
   - every fixed paper in every band is complete: the right number of questions
     in each of the three sections, and no template twice in one paper;
   - every question has five different choices, the answer among them, sorted —
     so the letter never gives it away;
   - every answer is proved again here: the template's own brute-force solve()
     finds exactly that answer and no other;
   - the same paper number is the same paper in every house; two numbers differ;
   - the scoring is the contest style, to the quarter point.
   Proved by breaking it: a bank whose solve() disagrees once must fail. */
import { paper, score, BANDS, BAND_IDS, FIXED, TIERS, ALL, choicesFor, practiseNext, bandFor } from '../src/papers/engine.js';
import { seeded } from '../src/rand.js';

let fails = 0; const fail = (m) => { fails++; if (fails <= 25) console.error('  ✗ ' + m); };
const ok = (c, m) => { if (!c) fail(m); };
const tById = Object.fromEntries(ALL.map((t) => [t.id, t]));

let n = 0;
function check(band, no, pool = ALL, tag = '') {
  const B = BANDS[band], p = paper(band, no, pool);
  ok(p.items.length === B.per * 3, `${tag}${band} paper ${no}: ${p.items.length} questions, not ${B.per * 3}`);
  for (const t of TIERS) ok(p.items.filter((q) => q.tier === t).length === B.per, `${tag}${band} paper ${no}: section ${t} is not ${B.per} long`);
  ok(new Set(p.items.map((q) => q.tid)).size === p.items.length, `${tag}${band} paper ${no}: a template repeats`);
  const bad = [];
  for (const q of p.items) {
    n++;
    if (q.choices.length !== 5 || new Set(q.choices).size !== 5) bad.push(`${q.tid}: choices ${q.choices}`);
    if (!q.choices.includes(q.ans)) bad.push(`${q.tid}: answer ${q.ans} is not a choice`);
    const T = (pool.find((t) => t.id === q.tid));
    const sol = T.solve(q.params).map(String);
    if (sol.length !== 1 || sol[0] !== q.ans) bad.push(`${q.tid}: solve() says ${JSON.stringify(sol)}, the paper says ${q.ans}`);
    if (/undefined|NaN/.test(q.text + q.fig)) bad.push(`${q.tid}: undefined/NaN in the question`);
  }
  for (const b of bad) fail(`${tag}${band} paper ${no}: ${b}`);
  return p;
}

for (const band of BAND_IDS) {
  // coverage: enough templates at every tier to fill a section without repeats
  for (const t of TIERS) ok(ALL.filter((x) => x.tier === t && x.bands.includes(band)).length >= BANDS[band].per, `${band}: too few tier-${t} templates to fill a section`);
  for (let no = 1; no <= FIXED; no++) check(band, no);
  check(band, 'fresh-test');
  // the same number is the same paper; different numbers differ
  const a = paper(band, 7), b = paper(band, 7), c = paper(band, 8);
  ok(JSON.stringify(a.items.map((q) => [q.tid, q.text, q.choices])) === JSON.stringify(b.items.map((q) => [q.tid, q.text, q.choices])), `${band}: paper 7 is not the same paper twice`);
  ok(a.items.map((q) => q.text).join() !== c.items.map((q) => q.text).join(), `${band}: papers 7 and 8 are the same`);
}

/* choices are sorted, numbers by value and fractions by value */
const ch = choicesFor(12, [3, 30, 7, 100, 12], seeded('x'));
ok(ch && ch.join() === [...ch].sort((x, y) => x - y).join() && ch.includes('12') && ch.length === 5, 'number choices are sorted by value');
const fr = choicesFor('1/2', ['1/3', '3/4', '2/5', '5/8'], seeded('y'));
ok(fr && fr.join() === '1/3,2/5,1/2,5/8,3/4', `fraction choices are sorted by value (${fr})`);
ok(choicesFor(5, [5, 6, 7], seeded('z')) === null, 'fewer than four wrong answers is refused, not padded');

/* scoring: start with n points; right +pts, wrong −pts/4, blank 0 */
const p = paper('g56', 1), N = p.items.length, sum = p.items.reduce((a, q) => a + q.pts, 0);
const right = score(p, p.items.map((q) => q.ans)), blank = score(p, []), wrong = score(p, p.items.map((q) => q.choices.find((c) => c !== q.ans)));
ok(right.points === N + sum && right.max === N + sum && right.right === N, `all right is full marks (${right.points}/${right.max})`);
ok(blank.points === N && blank.blank === N, 'all blank keeps the starting points');
ok(wrong.points === N - sum / 4 && wrong.wrong === N, `all wrong loses a quarter of every question (${wrong.points})`);
ok(practiseNext(wrong).reduce((a, x) => a + x.n, 0) === N, 'every miss points to a strategy to practise');
ok(bandFor({ band: '6-7' }) === 'g12' && bandFor({ band: '8-10', journey: { level: 6 } }) === 'g56' && bandFor({ journey: { level: 9 } }) === 'g78', 'a child starts in the band their level or age suggests');

/* another way in: every method link names a real template and a Sutra Ladder or Counting Court stop */
{ const { METHOD_OF } = await import('../src/papers/methods.js'), { byId } = await import('../src/tricks.js');
  const linkOk = (M) => Object.entries(M).every(([tid, stop]) => tById[tid] && byId[stop] && ['ladder', 'court'].includes(byId[stop].world));
  ok(Object.keys(METHOD_OF).length >= 8 && linkOk(METHOD_OF), 'every "another way in" link names a real template and a Ladder or Court stop');
  ok(!linkOk({ ...METHOD_OF, 'old-wheels': 'heads-and-legs' }) && !linkOk({ ...METHOD_OF, 'no-such-template': 'fangcheng' }), 'BROKEN: a link to a strategy stop or a missing template is caught'); }

/* proof by breaking it: a template whose solve() disagrees on one paper is caught */
const before = fails;
const liar = ALL.map((t, i) => (i === 0 ? { ...t, solve: (params) => t.solve(params).map((v) => (typeof v === 'number' ? v + 1 : v + '!')) } : t));
const quiet = console.error; console.error = () => {};
for (const band of ALL[0].bands) for (let no = 1; no <= 6; no++) check(band, no, liar, 'BROKEN ');
console.error = quiet;
const caught = fails > before;
fails = before;
ok(caught, 'a bank whose solve() disagrees is caught');

if (fails) { console.error(`papers: ${fails} failure(s)`); process.exit(1); }
console.log(`ok papers — ${BAND_IDS.length} bands × ${FIXED} fixed papers complete, ${n} questions re-proved, contest scoring exact; ${ALL.length} templates`);
