/* demo.js — the sample household for ?demo (family standard §14), and the
   one-trick taster for ?demo=try (audit A5, the Bee's landing "try it").

   The sample child's three weeks are made by DRIVING THE ENGINE — the same
   record(), passed(), landTestDone() and award() the app calls — rather than by
   writing numbers into a record. A sample built by hand drifts the day the
   engine changes; this one cannot claim progress the app would not have given.

   Store.DEMO keeps all of it in memory: nothing reads or writes the real
   household, the device prefs, the Hive's activity feed or the family wallet. */

import { newHousehold, newKid, scoreRun } from './model.js';
import * as F from './facts.js';
import * as J from './journey.js';
import { award } from './medals.js';
import { snapshot } from './report.js';
import { LEVELS } from './levels.js';
import { dayKey, seeded } from './rand.js';
import { EARN, DAILY_CAP } from './integration/bizzing-wallet.js';

const DAY = 864e5;

export function sampleHousehold(now = Date.now()) {
  const h = newHousehold(), k = newKid('Asha', '8-10', 'hexbee');
  k.sample = true; k.created = now - 24 * DAY;
  h.kids.push(k); h.active = k.id;
  const r = seeded('bizzing-maths-sample');

  // days played: about half of the last twenty-four, as a real child plays
  let xp = 0; k.sampleFeed = [];
  for (let back = 24; back >= 1; back--) {
    if (r() < 0.45) continue;
    const q = 12 + Math.floor(r() * 30), ok = Math.round(q * (0.72 + r() * 0.22));
    const d = dayKey(new Date(now - back * DAY));
    k.days[d] = { q, ok }; xp += ok;
    k.sampleFeed.push({ a: 'maths', d, t: 960 + Math.floor(r() * 180), m: Math.round(q * 0.45), who: k.name });
  }
  k.xp = xp;

  // the journey: placed at Level 3 (the 8–10 start). Five sittings over three
  // weeks: each meets the times facts again across a real gap (so the Leitner
  // boxes climb as they would), walks a couple of stations, and leaves the
  // week's snapshot the report card draws its trend from.
  const j = J.rec(k); j.level = 3; j.recap = null; j.tested = { level: 3, at: now - 24 * DAY };
  const facts = F.ramp('×').slice(0, 36);
  for (const [i, back] of [24, 22, 18, 11, 3].entries()) {
    const t = now - back * DAY;
    for (const f of facts.slice(0, 18 + i * 4)) {
      const right = r() > 0.1, ms = right ? 1400 + r() * 2200 : 6000;
      F.record(k.facts[F.key(f)] || (k.facts[F.key(f)] = F.blank()), right, ms, k.band, t);
    }
    for (let n = 0; n < 8; n++) {
      const p = J.progress(k);
      if (p.next && p.done < 2 * (i + 1)) {
        J.passed(k, p.next.stop, p.next.lv);
        scoreRun(k, p.next.stop, r() < 0.5 ? 10 : 8, 10, r() < 0.6);
        k.stories[p.next.stop] = true;
      } else if (p.nextTest && p.nextTest.kind === 'landtest') {
        const items = J.landTestItems(k, p.nextTest.land.id, r);
        J.landTestDone(k, p.nextTest.land.id, items, items.map((q, x) => ({ right: q.bonus ? x % 2 === 0 : x % 6 !== 0 })));
      } else break;
    }
    snapshot(k, t);
  }
  const land = J.landsOf(3)[0];
  if (land) { J.secretFound(k, land.id, 'wisp'); J.secretFound(k, land.id, 'duel'); }

  // the Puzzle Tower, a mock contest, some games
  for (let f = 1; f <= 4; f++) k.quest[f] = { stars: f < 4 ? 3 : 2, passed: true };
  k.puzzles = { space: { right: 9, tries: 13, solved: {} }, balance: { right: 8, tries: 10, solved: {} }, pattern: { right: 7, tries: 9, solved: {} } };
  k.contest = { best: 4, runs: 2, wins: 0, done: 2 };
  k.games = { rush: { best: 23, plays: 5 }, target: { best: 6, plays: 2 } };

  // medals the evidence supports, dated a few days back and already celebrated
  for (const m of award(k, now - 3 * DAY)) k.medals[m.id].seen = true;

  // today, part-way round the ring (audit A5): a short sitting this morning, one stop passed
  const td = dayKey(new Date(now));
  k.days[td] = { q: 14, ok: 12 }; k.xp += 12;
  k.dayStops = { ...(k.dayStops || {}), [td]: 1 };
  k.daily = { ...(k.daily || {}), [td]: { ...((k.daily || {})[td] || {}), puzzle: false } };

  // the wallet, earned from the same evidence at the family's standard amounts and daily cap:
  // a coin a right answer, five a passed stop. Held on the sample (memory only), never stored.
  const passed = Object.keys(k.journey.done || {}).length, sat = Object.keys(k.days).sort();
  k.sampleWallet = [];
  sat.forEach((d, i) => {
    const t = new Date(d + 'T16:00:00').getTime() || now - (sat.length - i) * DAY;
    const stops = Math.floor(passed / sat.length) + (i < passed % sat.length ? 1 : 0);
    const ans = Math.min(EARN.answer * k.days[d].ok, DAILY_CAP - EARN.stop * stops);
    if (ans > 0) k.sampleWallet.push({ a: 'maths', t, n: ans, why: 'answer' });
    for (let x = 0; x < stops; x++) k.sampleWallet.push({ a: 'maths', t: t + 60e3 * (x + 1), n: EARN.stop, why: 'stop' });
  });
  snapshot(k, now);
  return h;
}

/* The taster: a blank child, one stop open, nothing kept. */
export function tasterHousehold() {
  const h = newHousehold(), k = newKid('You', '8-10', 'cubebot');
  k.sample = 'try';
  h.kids.push(k); h.active = k.id;
  return h;
}
export const tasterStop = () => LEVELS[2].steps[0].stop;
