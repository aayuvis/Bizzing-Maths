/* challenge.mjs — today's challenge (src/challenge.js, audit v4 B4, owner approved 4 Oct 2026).
     · the same day + band (and the same stops reached) gives the same named set, always
     · every question comes from a stop the child has OPENED — by the app's own gate
       (model.js levelOpen, a star, a drill passed) — or, for a brand-new child, from Level 1–2
     · finishing it pays a fixed bonus once a day, through Family.earn with a STANDARD event,
       under the family's cap, never touching xp; the wallet history says it in words
     · no streak: nothing counts days, nothing nags, a missed day costs nothing
   Run with a fake localStorage so the family wallet runs as in the browser. */
import { readFileSync } from 'node:fs';
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.window = globalThis; globalThis.document = { visibilityState: 'visible', baseURI: 'http://x/' };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};

const { Family } = await import('../src/store.js');
const { newKid, newHousehold, levelOpen } = await import('../src/model.js');
const { LEVELS } = await import('../src/levels.js');
const { byId, worldOf, correct } = await import('../src/tricks.js');
const { dayKey } = await import('../src/rand.js');
const CH = await import('../src/challenge.js');
const { R } = await import('../src/runtime.js');
const V = await import('../src/views.js');
const { ledgerLines } = await import('../src/views3.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 30) console.log('  ✗', m); } else if (process.env.V) console.log('  ✓', m); };
const src = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const BANDS = ['6-7', '8-10', '11-14'], DAYS = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-12-25', '2027-02-28'];
const sig = (c) => JSON.stringify({ name: c.name, items: c.items.map((q) => [q.trick, q.qlv, q.text, String(q.ans)]) });

/* children at many places: brand new, on each journey level part-way, and Atlas-only with stars */
function kidAt(band, level, steps, name = 'Asha') {
  const k = newKid(name, band, 'cubebot');
  if (level) { k.journey.level = level; for (const s of LEVELS[level - 1].steps.slice(0, steps)) k.journey.done[`${s.stop}@${s.lv}`] = true; }
  return k;
}
const STARTER = new Set(LEVELS.slice(0, 2).flatMap((L) => L.steps.map((s) => s.stop)));
/* reached, by the app's own gate — a second route, never challenge.js's own list */
const reached = (k, id) => levelOpen(k, id) || ((k.tricks[id] || {}).stars > 0) || Object.keys(k.journey.done).some((x) => x.split('@')[0] === id);

/* ---- the same day + band → the same set; a different day or band → a different one */
for (const band of BANDS) for (const day of DAYS) for (const [lv, st] of [[0, 0], [1, 0], [2, 3], [4, 6], [7, 2], [10, 9]]) {
  const a = CH.challengeOf(kidAt(band, lv, st, 'Asha'), day), b = CH.challengeOf(kidAt(band, lv, st, 'Ravi'), day);
  ok(sig(a) === sig(b), `${band} ${day} L${lv}+${st}: two children who reached the same stops get the same set (${a.name})`);
  ok(a.items.length === CH.N && CH.N >= 8 && CH.N <= 12, `${band} ${day} L${lv}: a short set of about ten (${a.items.length})`);
  ok(new Set(a.items.map((q) => q.text)).size === a.items.length, `${band} ${day} L${lv}: no question twice in one set`);
  ok(a.items.every((q) => q.ans != null && correct(q, String(q.ans))), `${band} ${day} L${lv}: every question is answerable by its own answer`);
  ok(a.name && a.name.length <= 30 && a.name.includes(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(day + 'T12:00').getDay()]), `${band} ${day}: a short name with the day in it (${a.name})`);
}
{ const k = kidAt('8-10', 3, 2), a = CH.challengeOf(k, DAYS[0]);
  ok(DAYS.slice(1).every((d) => sig(CH.challengeOf(k, d)) !== sig(a)), 'another day is another set');
  ok(sig(CH.challengeOf(kidAt('6-7', 3, 2), DAYS[0])) !== sig(a), 'another band is another set');
  // the order a record was written in cannot move the questions
  const k2 = kidAt('8-10', 3, 2); k2.journey.done = Object.fromEntries(Object.entries(k2.journey.done).reverse());
  ok(sig(CH.challengeOf(k2, DAYS[0])) === sig(a), 'the same stops written in another order give the same set');
  ok(sig(CH.challengeOf(k)) === sig(CH.challengeOf(k, dayKey())), 'with no day given, it is today’s (dayKey)'); }

/* ---- only opened stops; a brand-new child gets Levels 1–2 */
for (const band of BANDS) for (const day of DAYS.slice(0, 3)) {
  const fresh = CH.challengeOf(newKid('N', band, 'cubebot'), day);
  ok(fresh.pool === 'start' && fresh.items.every((q) => STARTER.has(q.trick)), `${band} ${day}: a brand-new child's set is all Level 1–2 stops (${fresh.items.map((q) => q.trick).filter((t) => !STARTER.has(t))})`);
  for (let lv = 1; lv <= 10; lv++) for (const st of [0, 2, 5]) {
    const k = kidAt(band, lv, st), c = CH.challengeOf(k, day);
    if (c.pool !== 'opened') { ok(lv === 1 && c.items.every((q) => STARTER.has(q.trick) || reached(k, q.trick)), `${band} L${lv}+${st}: the starter set only where little is open yet`); continue; }
    const out = c.items.filter((q) => !reached(k, q.trick));
    ok(!out.length, `${band} L${lv}+${st} ${day}: never a stop not reached (${out.map((q) => q.trick)})`);
    ok(c.items.every((q) => (worldOf(byId[q.trick].world) || {}).track !== 'contest'), `${band} L${lv}: no Contest Hall strategy stop in the mix`);
    // and the level each stop is asked at was reached: nothing harder than the road has gone
    const top = {}; for (const L of LEVELS.slice(0, lv)) for (const s of L.steps) if (L.n < lv || reached(k, s.stop)) top[s.stop] = Math.max(top[s.stop] || 0, s.lv);
    ok(c.items.every((q) => q.qlv <= (top[q.trick] || 1)), `${band} L${lv}+${st}: no stop asked harder than the road has reached it`);
  }
}
{ // the Atlas: a stop worked on (a star) is open; one not yet reached never appears
  const k = newKid('A', '8-10', 'cubebot'); for (const id of ['make-ten', 'times-nine', 'split-multiply']) k.tricks[id] = { stars: 2, best: 9, learned: true, runs: 1 };
  const c = CH.challengeOf(k, DAYS[0]);
  ok(c.pool === 'opened' && c.items.every((q) => ['make-ten', 'times-nine', 'split-multiply'].includes(q.trick)), `an Atlas child's set comes only from the stops they have worked on (${[...new Set(c.items.map((q) => q.trick))]})`); }

/* ---- the bonus: once a day, a STANDARD event, the family's cap, never xp, in words */
ok(CH.BONUS_EVENT in Family.EARN && Family.EARN[CH.BONUS_EVENT] === 5, `the bonus is the standard 'stop' event, 5 coins (${CH.BONUS_EVENT})`);
let T = new Date('2026-10-04T10:00:00').getTime();
const k = kidAt('8-10', 3, 2, 'Meera');
/* main.js's own earn helper, as it is written there: Family.earn, then the coin note at the ledger's time */
const earn = (ev, note) => { const now = ++T, n = Family.earn(k.name, ev, now); if (n && note) k.coinNotes[now] = String(note).slice(0, 60); return n; };
const ch = CH.challengeOf(k, '2026-10-04'), all = ch.items.map((q, i) => ({ right: i % 3 !== 0 }));
ok(CH.finish(k, ch, all.slice(0, 9), earn) === 0 && !CH.doneToday(k, '2026-10-04') && Family.balance('Meera') === 0, 'a set left part-way pays nothing and records nothing');
const paid = CH.finish(k, ch, all, earn);
ok(paid === 5 && Family.balance('Meera') === 5, `finished at any score (${all.filter((x) => x.right).length} of ${all.length}): 5 coins (paid ${paid})`);
ok(k.xp === 0, 'the bonus never touches xp');
const rec = CH.doneToday(k, '2026-10-04');
ok(rec && rec.paid && rec.n === ch.items.length && rec.right === all.filter((x) => x.right).length, `today is recorded: ${JSON.stringify(rec)}`);
ok(CH.finish(k, ch, all.map(() => ({ right: true })), earn) === 0 && Family.balance('Meera') === 5, 'finishing it again the same day pays nothing more');
ok(CH.doneToday(k, '2026-10-04').right === all.length, 'and a better score is still kept');
const led = JSON.parse(mem['bizzing.wallet']).kids.meera.ledger;
ok(led.length === 1 && led[0].why === 'stop' && led[0].n === 5 && led[0].a === 'maths', `one ledger line, the standard event (${JSON.stringify(led)})`);
const lines = ledgerLines(k).map((x) => x.say).join(' | ');
ok(/finished today’s challenge/.test(lines) && lines.includes(ch.name), `the wallet history says it in words (${lines})`);
{ const ch2 = CH.challengeOf(k, '2026-10-05');
  T = new Date('2026-10-05T09:00:00').getTime();
  ok(CH.finish(k, ch2, ch2.items.map(() => ({ right: false })), earn) === 5, 'the next day is a new day: it pays again, even with nothing right'); }
{ // the cap: a day already at the family's 100 pays nothing — and that day's bonus is spent, not owed
  T = new Date('2026-10-06T09:00:00').getTime();
  for (let i = 0; i < 100; i++) earn('answer');
  const b = Family.balance('Meera'), ch3 = CH.challengeOf(k, '2026-10-06');
  ok(CH.finish(k, ch3, ch3.items.map(() => ({ right: true })), earn) === 0 && Family.balance('Meera') === b && CH.doneToday(k, '2026-10-06').paid, 'under the daily cap the bonus is 0 and it is not paid later the same day');
  ok(CH.finish(k, ch3, ch3.items.map(() => ({ right: true })), earn) === 0, 'still nothing on a second finish'); }

/* main.js: the bonus goes through its family earn helper (which writes the coin note), right answers pay as practice */
const main = code('../src/main.js');
ok(/const PRACTICE = \[[^\]]*'challenge'[^\]]*\]/.test(main), 'a right answer in the challenge pays its usual coin (a PRACTICE run)');
ok(/CH\.finish\(k, run\.ch, run\.results, \(ev, note\) => earn\(k, ev, note\)\)/.test(main), 'main.js pays the bonus through its family earn helper, once, at the end of the run');
ok(/const earn = \(k, ev, note\) => \{\s*const now = Date\.now\(\), n = Family\.earn\(k\.name, ev, now\);\s*if \(n && note\) \{ const cn = k\.coinNotes/.test(main), 'that helper is Family.earn plus the coin note');
ok(!/Family\.(earn|spend)/.test(code('../src/challenge.js')) && !/\bxp\b|tick\(/.test(code('../src/challenge.js')), 'challenge.js never touches the wallet or xp itself');

/* ---- where it lives: the Play tab, never a Home row */
const h = newHousehold(); h.kids.push(k); h.active = k.id; R.h = h; R.ui = { nav: 'play' };
const play = V.viewArcade(), today = CH.challengeOf(k);
ok(/class="card chal/.test(play) && play.includes(today.name) && /data-act="challenge"/.test(play), 'the Play tab carries today’s challenge card, named');
// T16 (games spec §4): one in, one out — Twenty facts became Rush · Calm, Beat the Machine took its
// hero card, and the owner's Beat the Timer is the ninth. Nine cards, no more.
{ const heroes = (play.match(/class="card hero-t /g) || []).length, tiles = (play.match(/class="gtile[ "]/g) || []).length;
  ok(heroes === 4 && tiles === 5 && heroes + tiles === 9, `T16: Play shows 9 cards — 4 heroes and 5 games (got ${heroes} + ${tiles})`);
  ok(!/Twenty facts/.test(play) && /Beat the Machine/.test(play) && /Beat the Timer/.test(play), 'T16: Twenty facts is out; Beat the Machine and Beat the Timer are in'); }
ok(play.indexOf('class="card chal') > play.indexOf('hero-tiles') && play.indexOf('class="card chal') < play.indexOf('class="gtiles"'), 'it sits at the top of the games, under the heroes');
ok(/Finish it for 5 coins, once today/.test(play) || /Finished today/.test(play), 'the card prints the fixed bonus');
const home = src('../src/views.js'), hv = home.slice(home.indexOf('export function viewHome('), home.indexOf('function trickOfHour('));
ok(hv.length > 500 && !/challenge|chal/i.test(hv), 'Home is untouched: no challenge row (rule 17)');

/* ---- no streak pressure, anywhere a child reads */
const NAG = /\bstreaks?\b|days? (in a row|running)|come back tomorrow|don.?t (miss|break|lose)|keep (it|the|your) [a-z ]{0,10}(going|alive)|before it.?s gone|last chance|missed a day|lose your/i;
for (const f of ['../src/challenge.js', '../src/views.js', '../src/views2.js', '../src/views3.js', '../src/extras-view.js', '../src/games.js', '../src/arcade.js']) {
  const words = code(f).replace(/no ads, no streaks/gi, '');
  const m = words.match(NAG);
  ok(!m, `${f.slice(7)}: no streak or come-back wording (${m && m[0]})`);
}
{ const branch = main.slice(main.indexOf("if (run.kind === 'challenge')"), main.indexOf("if (run.kind === 'check')"));
  ok(branch.length > 100 && !NAG.test(branch) && !/tomorrow/i.test(branch), 'the finish screen asks nobody back'); }
ok(!/864e5|86400000|yesterday|setDate|getTime\(\) -/.test(code('../src/challenge.js')), 'challenge.js reads only the day it is given — it never counts days');
ok(!NAG.test(play) && !/tomorrow|in a row/i.test(play.slice(play.indexOf('class="card chal'), play.indexOf('class="gtiles"'))), 'the card says nothing about other days');

console.log(`${fails ? 'FAIL' : 'ok'} challenge — one named set a day per band from opened stops, a fixed bonus once a day through the wallet, no streak`);
if (fails) process.exit(1);
