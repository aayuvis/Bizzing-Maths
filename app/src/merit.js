/* merit.js — contest coins on merit (games spec §1.1, §5). Coins are for learning, never
   for finishing: a key-masher or a blank paper used to reach the family's daily cap in a
   minute, because the Mock Contest and a handed-in paper paid `contest` 10 at any score.

   Mock Contest: `contest` 10 only for reaching round 4 or getting 4 right, once a day.
   Below that, the right answers have already paid their `answer` coin each.
   A paper: `contest` 10 only if at least half of it was tried AND its net score beats the
   paper's own blank score (every question left empty, under its ¼ penalty) by 20 points or
   more. Once per paper, once a day per band.

   Pure: the caller passes `earn(event, note)` (main.js → Family.earn, so the family's cap
   still applies) and, for a paper, its blank score from papers/engine.js score(p, []) —
   computed, never assumed — so this file loads no problem bank (rule 30). Records live on
   the child: k.payDay[day].mock, k.payDay[day].paper[band], k.papers.paid[band:no]. */
import { dayKey } from './rand.js';

export const MOCK_ROUND = 4, MOCK_RIGHT = 4;
export const PAPER_BEAT = 20;
const s = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function today(k, day) {
  const P = k.payDay || (k.payDay = {});
  // keep a fortnight: the record only ever asks about today
  for (const d of Object.keys(P)) if (d < dayKey(new Date(Date.now() - 14 * 864e5)) && d !== day) delete P[d];
  return P[day] || (P[day] = {});
}

/* ---------------------------------------------------------------- the Mock Contest */

/* c.you is kept by contest.js: questions the child answered, how many right, the last round reached. */
export function mockMerit(c) {
  const y = (c && c.you) || { asked: 0, right: 0, round: 0 };
  const round = Math.max(1, y.round || 0);
  return { round, right: y.right, asked: y.asked, merit: round >= MOCK_ROUND || y.right >= MOCK_RIGHT, by: round >= MOCK_ROUND ? 'round' : y.right >= MOCK_RIGHT ? 'right' : null };
}

/* `answered` = the answer coins this contest actually paid (the finish card says what was paid). */
export function payMock(k, c, earn, { day = dayKey(), answered = null } = {}) {
  const m = mockMerit(c), d = today(k, day);
  const rights = answered == null ? m.right : answered;
  const per = rights ? `${s(rights, 'coin')} for your right answer${rights === 1 ? '' : 's'}` : 'no coins this time';
  if (!m.merit) return { coins: 0, merit: false, line: `Round ${m.round}: ${per}. Reach round ${MOCK_ROUND}, or get ${MOCK_RIGHT} right, for contest coins.` };
  const what = m.by === 'round' ? `You reached round ${m.round}` : `You got ${m.right} right`;
  if (d.mock) return { coins: 0, merit: true, line: `${what}. Contest coins come once a day, and today’s are already yours.` };
  const coins = earn('contest', `the Mock Contest — ${m.by === 'round' ? `round ${m.round}` : `${m.right} right`}`);
  if (coins) d.mock = true;   // a day already at the family cap pays nothing, so it is not spent
  return { coins, merit: true, line: coins ? `${what}: +${coins} contest coins` : `${what}. Today’s coins are all earned — come back tomorrow for more.` };
}

/* ---------------------------------------------------------------- a paper */

/* sc = score(p, answers); blank = score(p, []).points — the paper's own baseline. */
export function paperMerit(p, sc, blank) {
  const n = p.items.length, tried = sc.right + sc.wrong;
  const beat = Math.round((sc.points - blank) * 100) / 100;
  const half = tried * 2 >= n;
  return { n, tried, half, blank, beat, merit: half && beat >= PAPER_BEAT };
}

export function payPaper(k, p, sc, blank, earn, { day = dayKey(), label = p.band } = {}) {
  const m = paperMerit(p, sc, blank);
  if (!m.half) return { ...m, coins: 0, line: 'Hand in a paper you’ve tried at least half of to earn contest coins.' };
  if (!m.merit) return { ...m, coins: 0, line: `Contest coins come for beating a blank paper (${blank} points) by ${PAPER_BEAT} or more. This one beat it by ${+m.beat.toFixed(2)} — every question you are sure of counts.` };
  const P = k.papers || (k.papers = { best: {}, log: [] }), paid = P.paid || (P.paid = {}), key = `${p.band}:${p.no}`;
  if (paid[key]) return { ...m, coins: 0, line: 'This paper has paid its contest coins already — a new one can.' };
  const d = today(k, day), bands = d.paper || (d.paper = {});
  if (bands[p.band]) return { ...m, coins: 0, line: `Contest coins for ${label} papers come once a day, and today’s are already yours.` };
  const coins = earn('contest', `a paper, ${+m.beat.toFixed(2)} points above blank`);
  if (coins) { paid[key] = day; bands[p.band] = true; }
  return { ...m, coins, line: coins ? `+${coins} contest coins: you beat a blank paper by ${+m.beat.toFixed(2)} points.` : 'Today’s coins are all earned — come back tomorrow for more.' };
}
