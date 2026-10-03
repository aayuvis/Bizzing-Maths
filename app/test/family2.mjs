/* test/family2.mjs — the family v2 engines, without a browser:
   · music (§11): every loop composed in code is 60–90 s, wraps on the beat, never empty, never
     outside a child-friendly range, and a world, Home and the games each have one;
   · the mistakes deck (F3): a miss comes back after a gap, right on the day moves it on,
     three gaps and it is learned, a miss is one step back, placement is never a mistake;
   · search (C4): stops, stories, places, tools and games, ranked by the title first;
   · CREDITS.md says the music is composed in code for Bizzing. */
import { readFileSync, existsSync } from 'node:fs';
import { TUNES, score, loopSeconds } from '../src/music.js';
import { THEMES } from '../src/themes.js';
import * as MD from '../src/mistakes.js';
import { search } from '../src/search.js';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('  ✗ ' + m); } };

for (const t of [...THEMES.map((w) => w.tune), 'home', 'bright', 'calm', 'sea']) ok(TUNES[t], `a loop for ${t}`);
for (const n of Object.keys(TUNES)) {
  const s = loopSeconds(n), sc = score(n), notes = sc.flatMap((b) => b.lead);
  ok(s >= 60 && s <= 90, `${n}: ${s.toFixed(1)} s is 60–90 s`);
  ok(sc.length % 8 === 0 && notes.length >= sc.length * 2, `${n}: whole sections, a melody in every bar`);
  ok(notes.every((x) => x.m >= 60 && x.m <= 96 && x.s >= 0 && x.s < 8), `${n}: every note within the bar and a gentle range`);
  ok(JSON.stringify(score(n)) === JSON.stringify(sc), `${n}: the same loop every time (seeded, not random)`);
}
ok(existsSync(new URL('../../music/CREDITS.md', import.meta.url)) && /composed in code for Bizzing/i.test(readFileSync(new URL('../../music/CREDITS.md', import.meta.url), 'utf8')), 'music/CREDITS.md names the source');

const k = { mistakes: {} }, t0 = new Date(2026, 9, 2, 18, 0).getTime(), DAY = 864e5;
const q = { text: '7 × 8', ans: 56, fact: { op: '×', a: 7, b: 8 } };
ok(MD.add(k, q, t0, 'Twenty facts') && MD.count(k, t0).total === 1 && MD.count(k, t0).due === 0, 'a miss goes in, not due the same day');
ok(MD.count(k, t0 + DAY).due === 1, 'it comes back the next day');
const key = MD.keyOf(q);
ok(MD.answer(k, key, true, t0 + 3600e3) === 'early', 'right before its gap is practice, not evidence');
ok(MD.answer(k, key, true, t0 + DAY) === 'moved' && k.mistakes[key].box === 1, 'right on the day moves it on');
ok(MD.answer(k, key, true, t0 + 2 * DAY) === 'early' && MD.answer(k, key, true, t0 + 4 * DAY) === 'moved', 'then it waits three days');
ok(MD.answer(k, key, false, t0 + 11 * DAY) === 'again' && k.mistakes[key].box === 0 && k.mistakes[key].misses === 2, 'a miss is one step back, and counted — never hidden');
for (const d of [12, 15, 22]) MD.answer(k, key, true, t0 + d * DAY);
ok(!k.mistakes[key] && k.mistakesLearned === 1, 'right after three gaps: learned, and out of the deck');
ok(MD.NOT_A_MISTAKE.includes('place') && MD.NOT_A_MISTAKE.includes('leveltest'), 'finding a starting place is never a mistake');
for (let i = 0; i < 100; i++) MD.add(k, { text: `${i} + 1`, ans: i + 1 }, t0 + i);
ok(Object.keys(k.mistakes).length === MD.CAP, `the deck keeps the most recent ${MD.CAP}`);
ok(!MD.add(k, { text: 'big', ans: 1, html: 'x'.repeat(7000) }, t0), 'a question too big to keep without its picture is not kept half-made');

const top = (s) => search(s)[0] || {};
ok(top('bakery').title === 'The Fraction Bakery' && top('bakery').kind === 'Place', 'search: a place by name');
ok(search('number rush').some((r) => r.kind === 'Play'), 'search: a game');
ok(search('explorer').some((r) => r.kind === 'Library'), 'search: a Library tool');
ok(search('fractions').length >= 3 && search('fractions').some((r) => r.kind === 'Stop'), 'search: stops by their idea');
ok(top('sudoku').act === 'sudokuPlay' && top('contest hall').arg === 'hall' && top('today mix').act === 'dailyMix', 'search: sudoku, the Contest Hall and today\'s mix');
{ const { loadStories } = await import('../src/stories.js'), STORIES = await loadStories(), st = Object.values(STORIES).find((x) => x && x.title);
  ok(search(st.title).some((r) => r.kind === 'Story' && r.title === st.title), 'search: a story by its title'); }
ok(search('cube nets').some((r) => r.kind === 'Puzzle'), 'search: a puzzle family by what is in it');
ok(search('').length === 0 && search('zzqqxx').length === 0, 'search: nothing for nothing');

if (fails) { console.error(`family2: ${fails} failure(s)`); process.exit(1); }
console.log('ok family2 — music loops 60–90 s and seeded, the mistakes deck and its gaps, search');
