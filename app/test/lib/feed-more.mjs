/* test/lib/feed-more.mjs — the kinds tools/feed-more.mjs cuts, held to the app's own rules (test/feed.mjs
   calls these before its own branches). Each returns null when the card is not one of its kinds, else ''
   when the card is right, or what is wrong with it.

   Every question is re-made from its source and proved by a route that does not share the cutter's:
     paper     the template's own solve() — exactly one answer, the stated one; no wrong option among
               its answers; not a fixed paper's problem; no picture; the strategy stop on this road
     machine   the card's PRECONDITION (machine.js holds) decides the right card, independently of the
               options' order; the sum's expr is its answer; a trick's own working ends on it
     explorer  n % d — not the Explorer's digit rules that wrote the card — divides for the right one only
     missing   the answer put in the gap makes the sentence true, and no wrong option does
     timer     the same, for a bond; for the rest the form's expr; and the theme exists
     balance   every weighing of 1..12 that balances the scales gives the asked shape the one weight
     worked    the stop's own work(), its plain expr and its answer agree
     curious   a step of THIS land, asked one notch harder, three routes agreeing */
import { byId, worldOf, correct, parseNum } from '../../src/tricks.js';
import { LEVELS } from '../../src/levels.js';
import * as F from '../../src/facts.js';
import * as FT from '../../src/facts-timed.js';
import { seeded } from '../../src/rand.js';
import { evalSum } from '../../src/stories.js';
import { ALL as TEMPLATES, paper } from '../../src/papers/engine.js';
import { BAND_IDS as PB, FIXED, BANDS as PBANDS } from '../../src/papers/bands.js';
import * as M from '../../src/machine.js';
import * as TT from '../../src/timer-themes.js';
import * as EX from '../../src/library/explorer.js';
import * as DICT from '../../src/library/dictionary.js';
import * as FORM from '../../src/library/formulas.js';
import { MEDALS } from '../../src/medals.js';
import { STRANDS } from '../../src/objectives.js';
import { SECRET_KINDS } from '../../src/journey.js';
import { scalesQuestion, solveScales } from '../../src/puzzles.js';
import { HEROES } from '../../src/arcade.js';
import { WALKS, bandsFrom, leaks, workedText, NEEDS_PICTURE } from '../../../tools/build-feed.mjs';
import { paperSeed, machineSeed, machineLv, workSeed, explorerSeed, balanceSeed, curiousSeed, PAPER_AGE, scalesText } from '../../../tools/feed-more.mjs';

const near = (a, b) => Math.abs(Number(typeof a === 'number' ? a : parseNum(String(a))) - Number(typeof b === 'number' ? b : parseNum(String(b)))) < 1e-9;
const evalExpr = (e) => Function(`return (${e})`)();
const walks = (id, level) => (WALKS[id] || []).some((w) => w.level === level);
const sub = (a, b) => a.every((x) => b.includes(x));

/* every problem of every fixed paper, made by the paper engine itself: the feed never shows one */
const FIXED_TEXTS = new Set();
for (const b of PB) for (let no = 1; no <= FIXED; no++) for (const it of paper(b, no).items) FIXED_TEXTS.add(it.text);
const BY_HEAD = new Map();
for (const x of FIXED_TEXTS) { const h = x.slice(0, 24); if (!BY_HEAD.has(h)) BY_HEAD.set(h, []); BY_HEAD.get(h).push(x); }
/* a card's question, or the start of its body, is a fixed paper's problem word for word */
export const showsFixedPaper = (c) => [c.body, c.play && c.play.q].some((t) => t && (BY_HEAD.get(t.slice(0, 24)) || []).some((x) => t.startsWith(x)));
export const FIXED_ONE = [...FIXED_TEXTS][7];

/* a sentence with a gap, "? × 8 = 56" or "3 + ? = 10", is TRUE with v in the gap: both sides evaluated */
export function fills(text, v) {
  const js = (s) => s.replace(/\?²/g, `(${v})**2`).replace(/\?/g, `(${v})`).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const [l, r] = text.split('=');
  try { return Math.abs(Function(`return (${js(l)})`)() - Function(`return (${js(r)})`)()) < 1e-9; } catch { return false; }
}

export function resolveMore(c) {
  const kind = c.src.split(':')[0], rest = c.src.slice(kind.length + 1);
  if (kind === 'paper') {
    const mm = /^([a-z0-9-]+)\/(g\d\d)#(\d+)$/.exec(rest); if (!mm) return 'paper src';
    const [, tid, band, i] = mm, t = TEMPLATES.find((x) => x.id === tid); if (!t || !t.bands.includes(band)) return 'no such template for the band';
    const q = t.make(seeded(paperSeed(tid, band, +i)), band), st = byId[t.strategy];
    if (q.fig || NEEDS_PICTURE.test(q.text) || /picture|as shown|diagram/i.test(q.text)) return 'a problem that needs its picture';
    const s = t.solve(q.params);
    if (!(Array.isArray(s) && s.length === 1 && String(s[0]) === String(q.ans))) return `solve() does not prove ${q.ans}`;
    if (FIXED_TEXTS.has(q.text)) return 'a fixed paper\'s problem';
    if (c.key !== `stop:${t.strategy}` || !walks(t.strategy, c.level) || c.route !== `#/stop/${t.strategy}|learn`) return 'not its strategy stop on this road';
    if (!sub(c.bands, bandsFrom(PAPER_AGE[band]))) return 'younger than its paper band';
    if (!c.badge || c.badge.label !== 'Contest-style') return 'not labelled contest-style';
    if (c.more !== `The way in: ${st.title} — ${st.idea}`) return 'the way in is not the stop\'s';
    if (c.kind === 'paper-way') return c.body === `${q.text} ${q.why}` && !c.play ? '' : 'the way in is not the template\'s own solution';
    if (c.kind !== 'paper' || c.play.q !== q.text || String(c.play.opts[0]) !== String(q.ans) || c.play.after !== q.why) return 'not the template\'s problem';
    if (!c.title.startsWith(PBANDS[band].label)) return 'paper band';
    if (c.play.opts.slice(1).some((o) => s.map(String).includes(String(o)) || (Number.isFinite(parseNum(String(o))) && near(o, q.ans)))) return 'a wrong option is an answer';
    return '';
  }
  if (kind === 'machine') {
    const mm = /^([a-z0-9-]+)@(\d+)\/(\d)#(d?)(\d+)$/.exec(rest); if (!mm) return 'machine src';
    const [, id, L, lv, d, i] = mm, decoy = d === 'd', t = byId[id];
    if (!M.CARD_IDS.includes(id) || +L !== c.level || !(WALKS[id] || []).some((w) => w.level === +L && w.lv === +lv)) return 'not a card on this road';
    const q = decoy ? M.decoy(id, seeded(machineSeed(id, +L, 'd' + i))) : M.trickSum(id, machineLv(+lv), seeded(machineSeed(id, +L, +i)));
    if (c.play.q !== `Which trick fits ${q.text}?` || !near(evalExpr(q.expr), q.ans)) return 'the sum is not the machine\'s, or its expr is not its answer';
    const names = Object.fromEntries([...M.CARD_IDS, M.STRAIGHT].map((x) => [M.cardName(x), x])), ids = c.play.opts.map((o) => names[o]);
    if (ids.some((x) => !x)) return 'an option that is not a card';
    // right: its precondition holds (or, for Straight, no card's does); every other option's does not
    const right = (x) => (x === M.STRAIGHT ? M.CARD_IDS.every((y) => !M.holds(y, q)) : M.holds(x, q));
    if (!right(ids[0]) || ids.slice(1).some(right)) return 'the right card is not the only one that fits';
    if (decoy !== (ids[0] === M.STRAIGHT)) return 'a decoy that is not Straight';
    if (!decoy) { const tq = t.q(M.CARDS[id].norm(q)), last = t.work(tq).at(-1).v; if (!near(last, q.ans)) return 'the trick\'s own working does not end on the answer'; }
    if (c.play.after !== (decoy ? M.explain(id, q, M.CARD_IDS) : M.explain(M.STRAIGHT, q, [id]))) return 'the words after are not the game\'s explain()';
    return c.route === `#/stop/${id}|learn` && c.key === `stop:${id}` ? '' : 'not the trick\'s stop';
  }
  if (kind === 'explorer') {
    const mm = /^([a-z0-9-]+)@(\d+)\/(\d)#(\d+)$/.exec(rest); if (!mm) return 'explorer src';
    const [, stop, L, lv, i] = mm;
    if (!(WALKS[stop] || []).some((w) => w.level === +L && w.lv === +lv) || +L !== c.level) return 'not this road';
    const n = +String(c.route).split('|')[1];
    if (!Number.isInteger(n) || c.route !== `#/lib/explorer|${n}` || !c.title.endsWith(n.toLocaleString('en-GB')) || !c.play.q.includes(n.toLocaleString('en-GB'))) return 'not the number on the Explorer';
    void explorerSeed; void i;
    const ds = c.play.opts.map(Number);
    if (n % ds[0] !== 0 || ds.slice(1).some((d) => n % d === 0)) return `the right option is not the only divisor of ${n}`;
    const T = EX.tests(n);
    if (!ds.every((d) => c.play.after.includes(`÷${d}: ${n % d === 0 ? 'Yes' : 'No'} — ${T.find((x) => x.d === d).why}.`))) return 'the reasons are not the Explorer\'s';
    return T.find((x) => x.d === ds[0]).stop === stop ? '' : 'the right test is not the stop\'s';
  }
  if (kind === 'work') {
    const mm = /^([a-z0-9-]+)@(\d+)\/(\d)#(\d+)$/.exec(rest); if (!mm) return 'work src';
    const [, id, L, lv, i] = mm, t = byId[id];
    if (!t || +L !== c.level || !(WALKS[id] || []).some((w) => w.level === +L && w.lv === +lv)) return 'not a step on this road';
    const q = t.gen(seeded(workSeed(id, +L, +i)), +lv);
    if (NEEDS_PICTURE.test(q.text) || c.body !== workedText(t, q)) return 'not the stop\'s own working';
    return near(evalExpr(q.expr), q.ans) && near(t.work(q).at(-1).v, q.ans) ? '' : `three routes disagree on ${q.text}`;
  }
  if (kind === 'curious') {
    const mm = /^([a-z0-9-]+)\/([a-z0-9-]+)@(\d+)\/(\d)#(\d+)$/.exec(rest); if (!mm) return 'curious src';
    const [, landId, stop, L, lv, i] = mm, Lv = LEVELS[+L - 1], land = Lv && Lv.lands.find((x) => x.id === landId), step = land && land.steps.find((s) => s.stop === stop);
    if (!step || +L !== c.level || Math.min(3, step.lv + 1) !== +lv) return 'not a step of this land, one notch harder';
    if (!c.title.startsWith(land.name) || c.where !== `${land.name} · Level ${L}`) return 'not the land';
    const t = byId[stop], q = t.gen(seeded(curiousSeed(landId, stop, +i)), +lv);
    if (!c.play.q.startsWith(q.text)) return 'the question is not the stop\'s';
    const plain = evalExpr(q.expr), last = t.work(q).at(-1).v;
    if (q.choices ? plain !== q.ans || last !== q.ans : !(near(plain, q.ans) && near(last, q.ans))) return `three routes disagree on ${q.text}`;
    if (String(c.play.opts[0]) !== String(q.ans) || c.play.opts.slice(1).some((o) => correct(q, String(o)))) return 'options';
    const w = SECRET_KINDS.find((x) => x.k === 'wisp');
    return c.more === w.blurb && c.badge && c.badge.label === w.name && c.play.after === t.idea && c.route === `#/stop/${stop}|drill` ? '' : 'not the land\'s curious question';
  }
  if (kind === 'balance') {
    const [lv, i] = rest.split(':').map(Number), q = scalesQuestion(lv, seeded(balanceSeed(lv, i)));
    if (c.body !== scalesText(q) || c.play.q !== q.text || c.play.after !== q.explain) return 'not the room\'s scales';
    // every weighing of 1..12 that balances: the asked shape always weighs the answer
    const sols = solveScales(q.eqs, q.eqs[0].counts.length);
    if (!sols.length || sols.some((s) => s[q.ask] !== +c.play.opts[0])) return 'the scales do not fix the answer';
    return c.play.opts.slice(1).some((o) => +o === +c.play.opts[0]) ? 'a wrong option is right' : c.route === '#/puzzles/balance' ? '' : 'not the balance puzzles';
  }
  if (kind === 'missing') {
    const [key, side] = rest.split('|'), f = F.parseKey(key); if (!f || !F.BANK[f.op].some((x) => F.key(x) === key)) return 'not a fact in the bank';
    const q = FT.missingQ(f, side === 'L');
    if (c.play.q !== q.text || String(c.play.opts[0]) !== String(q.ans) || !near(evalExpr(q.expr), q.ans) || c.play.after !== F.why(f)) return 'not the form\'s';
    if (!fills(q.text, q.ans) || c.play.opts.slice(1).some((o) => fills(q.text, +o))) return 'the gap is not filled by the answer alone';
    // the fact underneath IS the answer: never named on the card, never its key
    const said = [c.title, c.body, c.play.q, c.more, c.where, c.cta].filter(Boolean).join(' ');
    if (said.includes(F.text(f)) || c.key) return 'the card names the fact that answers it';
    return c.route === `#/facts/${f.op}|${key}` && sub(c.bands, bandsFrom(f.op === '²' ? '8-10' : '6-7')) ? '' : 'not the fact\'s grid';
  }
  if (kind === 'timer') {
    const [theme, form] = rest.split('/'), th = TT.themeById[theme]; if (!th) return 'no such theme';
    const [k, x, y, z] = form.split(':');
    const q = k === 'bond' ? FT.bondQ(+x, +y, true) : k === 'skip' ? FT.skipQ(+x, +y, z == null ? 3 : +z) : k === 'double' ? FT.doubleQ(+x) : k === 'half' ? FT.halfQ(+x) : k === 'twostep' ? FT.twoStepQ(F.parseKey(x), +y, z === '+') : null;
    if (!q || !c.play.q.startsWith(q.text) || String(c.play.opts[0]) !== String(q.ans) || !near(evalExpr(q.expr), q.ans)) return 'not the timed form';
    if (k === 'bond' && (!fills(q.text, q.ans) || c.play.opts.slice(1).some((o) => fills(q.text, +o)))) return 'the bond is not filled by the answer alone';
    if (c.play.opts.slice(1).some((o) => near(o, q.ans))) return 'a wrong option is right';
    if (!sub(c.bands, bandsFrom(TT.bandOfGrade(th.grade[0])))) return 'younger than its grade';
    return c.route === `#/timer/${theme}` && c.title.startsWith(`Beat the Timer · ${th.name}`) ? '' : 'not the theme';
  }
  if (kind === 'medal') { const md = MEDALS.find((x) => x.id === rest); return md && c.body === md.desc && c.title === `The ${md.name} medal` && c.more.includes(md.did) && c.route === '#/collection/medals' ? '' : 'medal'; }
  if (kind === 'goal') {
    const [sid, gid] = rest.split('/'), st = STRANDS.find((x) => x.id === sid), g = st && st.goals.find((x) => x.id === gid);
    return g && c.body === g.can && c.more.includes(g.bar) && c.title.endsWith(st.name) && sub(c.bands, bandsFrom(g.band || '6-7')) && c.route === '#/goals' ? '' : 'goal';
  }
  if (kind === 'formula' && /#beat\d+$/.test(rest)) {
    const [fid, part] = rest.split('#'), f = FORM.byId[fid], b = f && f.story && f.story.beats[+part.slice(4)];
    if (!b || !b.add || !c.body.includes(b.say) || !c.body.endsWith(`${b.add.t} = ${b.add.v}`) || !near(evalSum(b.add.t), b.add.v)) return 'formula notepad';
    if (c.level && !f.stops.some((s) => walks(s, c.level))) return 'formula off its road';
    return c.route === `#/lib/formulas|${fid}` && c.more === `The formula: ${f.formula}` ? '' : 'not the formula card';
  }
  if (kind === 'dictionary' && rest.endsWith('#mean')) {
    const e = DICT.entry(rest.slice(0, -5)); if (!e) return 'no word';
    if (c.play.q !== `What does “${e.word}” mean?` || c.play.opts[0] !== e.def || c.play.after !== `For example: ${e.ex}`) return 'not the word\'s meaning';
    const others = c.play.opts.slice(1).map((d) => DICT.ENTRIES.find((x) => x.def === d));
    if (others.some((o) => !o || o.topic === e.topic || o.word === e.word)) return 'a wrong meaning shares its topic';
    if (c.play.opts.some((d) => d.toLowerCase().includes(e.word.toLowerCase()))) return 'a meaning names the word';
    return c.route === `#/lib/dictionary|${e.word}` ? '' : 'not the word';
  }
  return null;
}

/* the route opens the very thing */
export function routeMore(nav, arg, a) {
  if (nav === 'lib' && a === 'explorer') { const n = +String(arg).slice(9); return Number.isInteger(n) && n >= 0 && n <= 1e6; }
  if (nav === 'timer') return !arg || !!TT.themeById[arg];
  if (nav === 'collection') return !arg || ['medals', 'avatars', 'worlds'].includes(arg);
  return null;
}

/* the second line and the place line, cut from the corpus */
export function moreMore(c) {
  const kind = c.src.split(':')[0];
  const stop = c.key && c.key.startsWith('stop:') ? byId[c.key.slice(5)] : null;
  if (['work', 'paper', 'explorer'].includes(kind)) {
    if (!c.more || !c.more.endsWith(stop.idea)) return 'more is not the stop\'s';
    return c.where === `${worldOf(stop.world).name} · Level ${c.level}` ? '' : 'where';
  }
  if (kind === 'machine') return c.more === HEROES.find((h) => h.id === 'machine').blurb && c.where === `Beat the Machine · Level ${c.level}` ? '' : 'machine more';
  return null;
}
