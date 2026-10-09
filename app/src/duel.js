/* duel.js — the Journey's rival duel (games spec §3.6, T13).

   One of the Bee's ten children waits in a clearing on the map. The duel used to show
   "You 3 · Kwame 0" — which was only the child's own misses: the rival never answered. Now the
   rival REALLY answers, by the Mock Contest's own rule (contest.js `rivalGets`, read here and
   never copied), on the same question, with a thinking time drawn from their own pace and the
   time the child would be given for a question that hard (contest.js `timeFor`).

   A round:  you right, rival wrong → yours;  rival right, you wrong → theirs;
             both right → the quicker one (your time against their thinking time);
             both wrong → nobody's, and another question.
   Best of three: first to two rounds wins. A duel never runs past DUEL_MAX questions; if it gets
   there, whoever is ahead wins it, and level is a draw (the clearing waits). */

import { rivalGets, timeFor, bot, newContest } from './contest.js';

export const DUEL_WIN = 2, DUEL_MAX = 5;

/* How hard the land's question is on the contest's own scale: the child's band start (the same
   place the Mock Contest starts this child) plus the step's level. */
export const duelH = (start, lv) => start + 0.3 + 0.08 * ((lv || 1) - 1);

export function newDuel(band, rivalId) {
  const b = bot(rivalId);
  if (!b) throw new Error('no such rival ' + rivalId);
  return { rival: rivalId, band, start: newContest(band, 1).start, round: 0, you: 0, them: 0, rounds: [], over: false };
}

/* The rival's go at question `q` (a land question carrying its step level `lv`): decided by
   rivalGets, with a thinking time in ms. Drawn when the question is asked, shown as it runs. */
export function rivalTurn(d, q, r = Math.random) {
  const b = bot(d.rival), h = duelH(d.start, q.lv), round = d.round + 1;
  const right = rivalGets(b, { h, tag: q.tag || null }, round, d.start, r);
  const think = Math.round(timeFor(d.band, h) * 1000 * (0.3 + 0.3 * b.pace / 2100) * (0.85 + 0.3 * r()));
  return { right, think, h, round };
}

/* Settle a round: `you` = { right, ms }, `them` = rivalTurn's result. */
export function settle(d, you, them) {
  const who = you.right && !them.right ? 'you' : !you.right && them.right ? 'them'
    : you.right && them.right ? (you.ms <= them.think ? 'you' : 'them') : null;
  d.round++;
  if (who) d[who]++;
  d.rounds.push({ you: { right: !!you.right, ms: Math.round(you.ms) }, them: { right: them.right, think: them.think }, who });
  if (d.you >= DUEL_WIN || d.them >= DUEL_WIN || d.round >= DUEL_MAX) d.over = true;
  return who;
}

export const duelWon = (d) => d.over && d.you > d.them && (d.you >= DUEL_WIN || d.round >= DUEL_MAX);
export const roundWords = (d, x, name) => !x.who ? 'Nobody takes it — you both missed. Another question.'
  : x.who === 'you' ? (x.them.right ? `Yours — quicker than ${name}.` : `Yours — ${name} missed it.`)
    : (x.you.right ? `${name} takes it — right, and quicker.` : `${name} takes it.`);
