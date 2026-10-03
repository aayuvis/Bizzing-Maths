/* search.js — one search over the whole app (FAMILY-STANDARD §3, FIX-MATHS C4).

   It finds any stop (by its title, its idea or its story), any story (by its title or who
   is in it), any place on the Atlas, any Library tool or game — at once, from what Home
   already has — and, a moment later, any word in the Dictionary and any card in the
   Formula Book, which load only when a search needs them (they are their own chunks).

   A result is { kind, title, sub, act, arg } and is opened with the same action a tap on
   it anywhere else in the app would fire, so search can never open something its owner
   screen would not (a locked stop still says it is locked). */

import { TRICKS, WORLDS, worldOf } from './tricks.js';
import { STORIES, storiesReady } from './stories.js';
import { SHELF } from './library/shelf.js';
import { bot } from './contest.js';
import { FAMILIES } from './puzzles.js';

export const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9×÷+%\-]+/g, ' ').trim();

const GAMES = [
  { title: 'Number Rush', sub: 'A game · facts fall, pop them', act: 'play', arg: 'rush', words: 'game bubbles facts speed' },
  { title: 'Make the Target', sub: 'A game · four numbers, one target', act: 'play', arg: 'target', words: 'game target countdown' },
  { title: 'Number Line', sub: 'A game · estimate where it goes', act: 'play', arg: 'line', words: 'game estimate estimation' },
  { title: 'Mock Contest', sub: 'Play · you and ten rivals', act: 'nav', arg: 'contest', words: 'contest rivals competition' },
  { title: 'The Puzzle Tower', sub: 'Puzzles · twelve floors', act: 'nav', arg: 'puzzles', words: 'puzzle tower sudoku nets balance logic' },
  { title: 'Twenty facts', sub: 'Practice · facts picked for you', act: 'nav', arg: 'facts', words: 'facts times tables practice fluency' },
  { title: 'My mistakes', sub: 'Practice · questions worth another look', act: 'nav', arg: 'mistakes', words: 'mistakes wrong review again' },
  { title: 'Today’s mix', sub: 'Practice · five minutes: facts, a stop, a puzzle', act: 'dailyMix', arg: '', words: 'daily mix five minutes session practice today' },
  { title: 'Today’s puzzle', sub: 'Puzzles · one a day', act: 'daily', arg: '', words: 'daily puzzle today one' },
  { title: 'The Contest Hall', sub: 'Contest · strategies and contest-style papers', act: 'nav', arg: 'hall', words: 'contest hall papers olympiad competition strategy exam mock paper' },
  { title: 'Sudoku', sub: 'Puzzles · a grid with exactly one answer', act: 'sudokuPlay', arg: '1', words: 'sudoku logic grid magic square' },
];

let INDEX = null;
function index() {
  if (INDEX && (INDEX.stories || !storiesReady())) return INDEX;   // rebuilt once, when the stories arrive
  const out = [];
  for (const t of TRICKS) {
    const w = worldOf(t.world);
    out.push({ kind: 'Stop', title: t.title, sub: `A stop · ${w ? w.name : ''}`, act: 'openStop', arg: t.id, words: `${t.idea || ''} ${t.hook || ''} ${(t.sutra && t.sutra.sa) || ''}` });
    const s = STORIES[t.id];
    if (s) out.push({ kind: 'Story', title: s.title, sub: `A story · ${t.title}`, act: 'openStory', arg: t.id, words: (s.cast || []).map((c) => (bot(c) || {}).name || '').join(' ') });
  }
  for (const w of WORLDS) out.push({ kind: 'Place', title: w.name, sub: `A place on the Atlas · ${w.short}`, act: 'openWorld', arg: w.id, words: w.blurb || '' });
  for (const t of SHELF) out.push({ kind: 'Library', title: t.name, sub: 'A Library tool', act: 'openTool', arg: t.id, words: t.blurb || '' });
  for (const g of GAMES) out.push({ kind: 'Play', ...g });
  for (const f of FAMILIES) out.push({ kind: 'Puzzle', title: f.name, sub: 'Puzzles · six to practise', act: 'practise', arg: `${f.id}:2`, words: `puzzle ${f.blurb || ''}` });
  for (const e of out) { e.nt = norm(e.title); e.nw = norm(e.words); }
  out.stories = storiesReady();
  return (INDEX = out);
}

/* rank: title is the query · title starts with it · a word of the title starts with it ·
   the title contains it · a word of the rest starts with it */
function rank(e, n) {
  if (e.nt === n) return 0;
  if (e.nt.startsWith(n)) return 1;
  if (e.nt.split(' ').some((w) => w.startsWith(n))) return 2;
  if (e.nt.includes(n)) return 3;
  if (n.length > 2 && e.nw.split(' ').some((w) => w.startsWith(n))) return 4;
  return -1;
}
export function search(q, limit = 30) {
  const n = norm(q); if (!n) return [];
  const words = n.split(' ');
  return index().map((e) => {
    const rs = words.map((w) => rank(e, w));
    return rs.every((r) => r >= 0) ? [Math.max(...rs), e] : null;
  }).filter(Boolean).sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title)).slice(0, limit).map((x) => x[1]);
}

/* The Dictionary and the Formula Book, searched once their chunks have arrived. */
export async function searchMore(q, limit = 20) {
  const n = norm(q); if (n.length < 2) return [];
  const [d, f] = await Promise.all([import('./library/dictionary.js'), import('./library/formulas.js')]);
  const words = d.search(q).slice(0, limit).map((e) => ({ kind: 'Word', title: e.word, sub: `In the Dictionary · ${e.def.slice(0, 70)}${e.def.length > 70 ? '…' : ''}`, act: 'searchOpen', arg: `dictionary|${e.word}` }));
  const cards = f.CARDS.filter((c) => rank({ nt: norm(c.title), nw: norm(`${c.topic} ${c.formula}`) }, n) >= 0)
    .slice(0, 8).map((c) => ({ kind: 'Formula', title: c.title, sub: `In the Formula Book · ${c.formula}`, act: 'searchOpen', arg: `formulas|${c.id}` }));
  return [...words, ...cards];
}
