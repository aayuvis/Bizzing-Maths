/* coinstreet.js — Coin Street: finance basics. Making an amount, a budget,
   saving for a goal, the best buy, a sale, profit and loss, and then the
   price of money itself — interest, simple and compound, a shared bill, and
   what borrowing costs. The contract is docs/CHAPTER-CONTRACT.md.

   Money is counted in plain "coins", as in the Clock Tower, so no family's
   currency is assumed. Every amount belongs to the question or the story,
   never to the child's household. Every rate is the rate of "the bank in this
   story" — never a real-world figure stated as fact — and no real bank or
   security is named. Borrowing is a tool with a price, never a failing.

   Every decimal answer is built from whole numbers (hundredths of a coin) and
   divided ONCE at the end, so the answer, the plain arithmetic and the last
   step agree to the last digit. Where a stop has a rule a child might doubt
   (the fewest coins, rounding weeks UP), `expr` proves it a different way:
   a search over every way to pay, a week-by-week count. */

import { int, pick } from '../rand.js';
import { fracBar, svg, text } from './kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

/* The prompt must never show its own answer (test/tricks.mjs). */
const leaks = (q) => !q.choices && String(q.ans).length > 1 && q.text.split(/[^0-9./]/).includes(String(q.ans));
function fresh(make) { let q; for (let i = 0; i < 200; i++) { q = make(); if (!leaks(q)) return q; } return q; }

/* The Bee's ten, who live on every street of the Atlas. */
const NAMES = ['Pip', 'Nova', 'Rafi', 'Suki', 'Dax', 'Mira', 'Theo', 'Ines', 'Kwame', 'Vesper'];
const THINGS = ['kite', 'football', 'book', 'paint set', 'torch', 'puzzle', 'skipping rope', 'board game'];
const COINS = [1, 2, 5, 10, 20, 50];

/* A row of coins, each labelled with its worth. */
function coinRow(vals) {
  const r = 22, gap = 10; let s = '';
  vals.forEach((v, i) => { const cx = 6 + r + i * (2 * r + gap); s += `<circle cx="${cx}" cy="${r + 6}" r="${r}" class="dg-fill1"/>` + text(cx, r + 12, v, 'dg-text'); });
  return svg(12 + vals.length * (2 * r + gap), 2 * r + 12, s, `Coins worth ${vals.join(', ')}`);
}
/* A bar model: the whole on top, split below into labelled parts (widths by value). */
function barModel(whole, parts, wholeLabel) {
  // scaled to the longer of the two rows, so a loss shows costs running PAST the takings
  const H = 36, sum = parts.reduce((a, p) => a + p.v, 0), tot = Math.max(whole, sum) || 1, W = 320, WW = (whole / tot) * W; let s = '', x = 4;
  s += `<rect x="4" y="4" width="${WW.toFixed(1)}" height="${H}" class="dg-fill2"/>` + text((4 + WW / 2).toFixed(1), 28, wholeLabel || whole, 'dg-text');
  parts.forEach((p, i) => {
    const w = (p.v / tot) * W;
    s += `<rect x="${x.toFixed(1)}" y="${H + 12}" width="${w.toFixed(1)}" height="${H}" class="${p.ask ? 'dg-blank' : `dg-fill${(i % 2) + 1}`}"/>` + text((x + w / 2).toFixed(1), H + 36, p.label, p.ask ? 'dg-accent' : 'dg-text');
    x += w;
  });
  return svg(W + 8, 2 * H + 20, s, 'A bar model');
}
/* Two packs side by side: dots for the items, the price under each. */
function packs(n1, p1, n2, p2) {
  const panel = (ox, n, p, name) => {
    let s = `<rect x="${ox}" y="4" width="150" height="110" rx="10" class="dg-blank"/>` + text(ox + 75, 24, name, 'dg-text');
    for (let i = 0; i < n; i++) s += `<circle cx="${ox + 20 + (i % 6) * 22}" cy="${44 + Math.floor(i / 6) * 22}" r="8" class="dg-dot2"/>`;
    return s + text(ox + 75, 104, `${n} for ${p}`, 'dg-accent');
  };
  return svg(316, 118, panel(4, n1, p1, 'Pack A') + panel(162, n2, p2, 'Pack B'), 'Two packs with their prices');
}

export const WORLD = {
  id: 'coinstreet', name: 'Coin Street', short: 'Coins', band: '6-7',
  blurb: 'Paying, saving, shopping and selling — and what money costs when you borrow it.',
  tint: '#FBF3DA', ink: '#6A4600', glyph: '🪙',
};

export const TRICKS = [
  /* ------------------------------------------------------------ 6–7 */
  {
    id: 'fewest-coins', world: 'coinstreet', band: '6-7', title: 'The fewest coins',
    hook: 'Make 37 from coins worth 1, 2, 5, 10, 20 and 50. What is the fewest coins you can use?',
    idea: 'Make the tens with the big coins, then the ones with the small coins — always the biggest coin that still fits.',
    why: [
      'Picture 37 as 30 and 7. The 50, 20 and 10 coins are all whole tens, so they can only ever make the tens part. The 5, 2 and 1 coins make the ones part. The two jobs never get in each other\'s way.',
      'For each part, take the biggest coin that fits, then the biggest that fits what is left. 30 is a 20 and a 10: two coins. 7 is a 5 and a 2: two coins. So 37 takes 4 coins.',
      'Why is biggest-first the fewest? With these coins, any pile of small coins can be swapped for fewer bigger ones — two 1s for a 2, two 5s for a 10, five 10s for a 50 — so a way to pay that is not biggest-first always has a swap that makes it shorter.',
    ],
    alg: 'fewest(n) = fewest(tens of n, with 50, 20, 10) + fewest(ones of n, with 5, 2, 1)',
    ex: { n: 37 },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => this.q({ n: lv === 1 ? int(3, 19, r) : lv === 2 ? int(21, 99, r) : int(101, 199, r) }));
    },
    greedy(n, set) { let c = 0, rem = n; for (const v of set) { c += Math.floor(rem / v); rem %= v; } return c; },
    q({ n }) {
      // expr searches EVERY way to pay, so biggest-first has to earn its answer
      const expr = `(()=>{const d=[0];for(let i=1;i<=${n};i++){d[i]=1e9;for(const c of [${COINS}])if(c<=i)d[i]=Math.min(d[i],d[i-c]+1);}return d[${n}]})()`;
      return { n, text: `Make ${n} from coins worth 1, 2, 5, 10, 20 and 50. What is the fewest coins you can use?`, expr, ans: this.greedy(n, [50, 20, 10, 5, 2, 1]) };
    },
    work({ n }) {
      const T = n - (n % 10), u = n % 10, a = this.greedy(T, [50, 20, 10]), b = this.greedy(u, [5, 2, 1]), s = [];
      if (T) s.push({ t: `Fewest big coins (50, 20, 10) to make ${T}`, v: a });
      if (u) s.push({ t: `Fewest small coins (5, 2, 1) to make ${u}`, v: b });
      if (T && u) s.push({ t: 'Add them: the fewest coins', v: a + b });
      return s;
    },
    draw: () => coinRow(COINS),
  },
  {
    id: 'money-left', world: 'coinstreet', band: '6-7', title: 'What is left?',
    hook: 'Nova has 40 coins to spend at the fair. She spends 12 on a ride and 9 on a snack. How many are left?',
    idea: 'Add up everything spent first, then take it away just once.',
    why: [
      'A budget is a plan for an amount of money: what goes out, and what stays. Everything spent comes out of the same pile, so it does not matter whether you take it away one bit at a time or all together.',
      'All together is easier. 12 and 9 make 21, and 40 take away 21 is 19. One take-away instead of two, so one chance to slip instead of two.',
      'The bar shows it: the whole bar is the money at the start, the coloured pieces are what was spent, and the piece left over is what is still in the purse.',
    ],
    alg: 'left = start − (spend₁ + spend₂ + …)',
    ex: { name: 'Nova', start: 40, spends: [12, 9] },
    oneIdea: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const name = pick(NAMES, r);
        if (lv === 1) { const a = int(1, 6, r), b = int(1, 6, r); return this.q({ name, start: int(a + b + 2, 20, r), spends: [a, b] }); }
        if (lv === 2) { const a = int(5, 30, r), b = int(3, 25, r); return this.q({ name, start: int(Math.ceil((a + b + 5) / 10), 10, r) * 10, spends: [a, b] }); }
        const sp = [int(5, 40, r), int(5, 30, r), int(3, 20, r)], tot = sp.reduce((x, y) => x + y, 0);
        return this.q({ name, start: int(Math.ceil((tot + 5) / 10), 15, r) * 10, spends: sp });
      });
    },
    q({ name, start, spends }) {
      const on = ['a ride', 'a snack', 'a badge'];
      const list = spends.map((s, i) => `${s} on ${on[i]}`);
      const said = list.length === 2 ? list.join(' and ') : `${list[0]}, ${list[1]} and ${list[2]}`;
      return { name, start, spends, text: `${name} has ${start} coins to spend at the fair and spends ${said}. How many coins are left?`,
        expr: `${start}${spends.map((s) => '-' + s).join('')}`, ans: start - spends.reduce((a, b) => a + b, 0) };
    },
    work({ start, spends }) {
      const tot = spends.reduce((a, b) => a + b, 0);
      return [{ t: `Everything spent: ${spends.join(' + ')}`, v: tot }, { t: `Left: ${start} − ${tot}`, v: start - tot }];
    },
    draw: ({ start, spends }) => barModel(start, [...spends.map((v) => ({ v, label: v })), { v: Math.max(1, start - spends.reduce((a, b) => a + b, 0)), label: '?', ask: true }], `${start}`),
  },
  /* ----------------------------------------------------------- 8–10 */
  {
    id: 'saving-goal', world: 'coinstreet', band: '8-10', title: 'Saving for something',
    hook: 'A kite costs 50 coins. Rafi saves 6 coins a week. How many weeks until he can buy it?',
    idea: 'Divide what is still needed by the saving each week — and if anything is left over, round UP.',
    why: [
      'Each week adds the same amount, so the weeks are "how many 6s fit into 50". 6 × 8 = 48, so eight weeks is 48 coins.',
      'But 48 is not 50. After eight weeks Rafi still cannot buy the kite — he is 2 coins short, and the shop will not take 48. He needs a ninth week, which takes him to 54. So the answer is 9, even though 50 ÷ 6 is only 8 and a bit.',
      'That is the rule for any goal: a part-week still has to be a whole week, so a remainder always means one more. And if some coins are saved already, take them off the price first — only the rest has to be saved.',
    ],
    alg: 'weeks = ⌈(price − saved already) ÷ per week⌉',
    ex: { name: 'Rafi', thing: 'kite', goal: 50, per: 6, have: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'It fits exactly', note: 'The weekly saving goes into the price with nothing left over, so the division is the answer.',
        ex: { name: 'Mira', thing: 'book', goal: 40, per: 5, have: 0 } },
      { label: 'Round up', note: 'A bit is left over, and the shop will not take "nearly enough". Any remainder means one more whole week.',
        ex: { name: 'Rafi', thing: 'kite', goal: 50, per: 6, have: 0 } },
      { label: 'Some saved already', note: 'Take what is already saved off the price first. Only the rest has to be saved week by week.',
        ex: { name: 'Theo', thing: 'torch', goal: 60, per: 8, have: 15 } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const name = pick(NAMES, r), thing = pick(THINGS, r);
        if (lv === 1) { const per = int(2, 10, r), w = int(3, 10, r); return this.q({ name, thing, per, have: 0, goal: per * w - (r() < 0.5 ? 0 : int(1, per - 1, r)) }); }
        if (lv === 2) { const per = int(3, 12, r); return this.q({ name, thing, per, have: 0, goal: int(Math.max(3, Math.ceil((per * 3) / 5)), 30, r) * 5 }); }
        const per = int(4, 15, r), have = int(5, 40, r); return this.q({ name, thing, per, have, goal: have + int(per * 3, per * 12, r) });
      });
    },
    q({ name, thing, goal, per, have }) {
      const text = `A ${thing} costs ${goal} coins. ${name} ${have ? `has ${have} coins already and ` : ''}saves ${per} coins a week. How many weeks until there is enough?`;
      // expr counts the weeks one at a time, never dividing
      return { name, thing, goal, per, have, kind: have ? 'saved' : goal % per === 0 ? 'exact' : 'up', text, expr: `(()=>{let t=${have},w=0;while(t<${goal}){t+=${per};w++}return w})()`, ans: Math.ceil((goal - have) / per) };
    },
    work({ goal, per, have }) {
      const need = goal - have, whole = Math.floor(need / per), s = [];
      if (have) s.push({ t: `Still to save: ${goal} − ${have}`, v: need });
      if (need % per === 0) { s.push({ t: `How many ${per}s make ${need}?`, v: whole }); return s; }
      s.push({ t: `Whole ${per}s that fit in ${need} (not enough yet)`, v: whole });
      s.push({ t: 'A bit is left, so one more week', v: whole + 1 });
      return s;
    },
    draw: ({ goal, per, have }) => barModel(goal, [...(have ? [{ v: have, label: have }] : []), { v: goal - have, label: `${per} a week…`, ask: true }], `${goal}`),
  },
  {
    id: 'best-buy', world: 'coinstreet', band: '8-10', title: 'The best buy',
    hook: '4 apples for 28 coins, or 6 apples for 36 coins. Which is cheaper for each apple?',
    idea: 'Find the price of ONE from each pack — or of the same number from each — then compare like with like.',
    why: [
      'A bigger pack costs more, so the prices on their own tell you nothing. What matters is what each apple costs. 28 ÷ 4 is 7 coins an apple; 36 ÷ 6 is 6 coins an apple. The bigger pack is the better buy — this time.',
      'Sometimes one apple works out to a messy number. Then price the SAME number from both packs instead. 5 for 12 and 3 for 8: 15 apples from the first pack is 3 lots, 36 coins; 15 from the second is 5 lots, 40 coins. The first is cheaper, and nobody had to divide.',
      'Cheaper each is not always better for you — ten apples you will not eat are not a bargain. The maths tells you the price; you still decide what you need.',
    ],
    alg: 'A is the better buy when priceA ÷ countA < priceB ÷ countB (or priceA × countB < priceB × countA)',
    ex: { n1: 4, p1: 28, n2: 6, p2: 36, it: 0 },
    caseKey: 'way',
    cases: [
      { label: 'Price of one', note: 'Both prices share out evenly, so find what ONE costs from each pack and compare.',
        ex: { n1: 4, p1: 28, n2: 6, p2: 36, it: 0 } },
      { label: 'Price of the same number', note: 'One would be a messy number, so price the same number from both packs — a number both pack sizes go into.',
        ex: { n1: 5, p1: 12, n2: 3, p2: 8, it: 1 } },
    ],
    ITEMS: [['apples', 'apple'], ['pencils', 'pencil'], ['bananas', 'banana'], ['notebooks', 'notebook'], ['oranges', 'orange'], ['samosas', 'samosa'], ['balloons', 'balloon']],
    gen(r, lv = 1) {
      return fresh(() => {
        const it = int(0, this.ITEMS.length - 1, r);
        let n1, n2, p1, p2;
        do {
          if (lv < 3) {
            n1 = int(2, lv === 1 ? 5 : 10, r); n2 = int(2, lv === 1 ? 6 : 12, r);
            const u1 = int(2, lv === 1 ? 9 : 20, r), u2 = int(2, lv === 1 ? 9 : 20, r); p1 = n1 * u1; p2 = n2 * u2;
          } else { n1 = int(2, 8, r); n2 = int(2, 9, r); p1 = int(n1 + 1, n1 * 12, r); p2 = int(n2 + 1, n2 * 12, r); }
        } while (n1 === n2 || p1 * n2 === p2 * n1 || (lv === 3 && (lcm(n1, n2) > 40 || (p1 % n1 === 0 && p2 % n2 === 0))));
        return this.q({ n1, p1, n2, p2, it });
      });
    },
    q({ n1, p1, n2, p2, it }) {
      const [pl, one] = this.ITEMS[it], choices = ['Pack A', 'Pack B'];
      return { n1, p1, n2, p2, it, choices, way: p1 % n1 === 0 && p2 % n2 === 0 ? 'each' : 'same', text: `Pack A: ${n1} ${pl} for ${p1} coins. Pack B: ${n2} ${pl} for ${p2} coins. Which is cheaper for each ${one}?`,
        expr: `${p1}/${n1}<${p2}/${n2}?'Pack A':'Pack B'`, ans: p1 * n2 < p2 * n1 ? 'Pack A' : 'Pack B' };
    },
    work({ n1, p1, n2, p2, choices, ans }) {
      if (p1 % n1 === 0 && p2 % n2 === 0) return [{ t: `One from A: ${p1} ÷ ${n1}`, v: p1 / n1 }, { t: `One from B: ${p2} ÷ ${n2}`, v: p2 / n2 }, { t: 'Which is cheaper each?', v: ans, choices }];
      const L = lcm(n1, n2);
      return [
        { t: `${L} from A: ${p1} × ${L / n1}`, v: (p1 * L) / n1 },
        { t: `${L} from B: ${p2} × ${L / n2}`, v: (p2 * L) / n2 },
        { t: 'Which is cheaper each?', v: ans, choices },
      ];
    },
    draw: ({ n1, p1, n2, p2 }) => packs(n1, p1, n2, p2),
  },
  {
    id: 'fraction-off', world: 'coinstreet', band: '8-10', title: 'A sale',
    hook: 'A 40-coin kite has 1/4 off in the sale. What does it cost now?',
    idea: 'Find the fraction of the price that comes off, then take it away from the price.',
    why: [
      '"1/4 off" means the price is cut into 4 equal parts and one part is taken away. One quarter of 40 is 40 ÷ 4 = 10, so 10 coins come off and the kite costs 30.',
      'For 2/5 off, find one fifth and double it: 2/5 of 40 is 8 × 2 = 16 off, so it costs 24. The bar shows the shaded parts that come off and the plain parts you still pay.',
      'You can also count the parts you DO pay: with 1/4 off you pay 3/4 of the price, and 3/4 of 40 is 30. Same answer by a different road — a good way to check. A sale lowers the price, but it is only a saving if you wanted the thing anyway.',
    ],
    alg: 'price with k/d off = price − price ÷ d × k = price ÷ d × (d − k)',
    ex: { N: 40, k: 1, d: 4, thing: 'kite' },
    caseKey: 'off',
    cases: [
      { label: 'One part off', note: 'With 1 on top, one share comes off: divide the price by the bottom number, then take that away.',
        ex: { N: 40, k: 1, d: 4, thing: 'kite' } },
      { label: 'Several parts off', note: 'Find one share, multiply by the top number to get the whole discount, then take it off the price.',
        ex: { N: 40, k: 2, d: 5, thing: 'puzzle' } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const thing = pick(THINGS, r);
        if (lv === 1) { const d = pick([2, 4, 10], r); return this.q({ N: d * int(2, 10, r), k: 1, d, thing }); }
        if (lv === 2) { const d = pick([2, 3, 4, 5, 10], r); return this.q({ N: d * int(3, 20, r), k: 1, d, thing }); }
        let d, k; do { d = pick([3, 4, 5, 8, 10], r); k = int(2, d - 1, r); } while (gcd(k, d) !== 1);
        return this.q({ N: d * int(3, 25, r), k, d, thing });
      });
    },
    q({ N, k, d, thing }) {
      return { N, k, d, thing, off: k === 1 ? 'one' : 'several', text: `${/^(8|11|18)$|^8\d$/.test(String(N)) ? 'An' : 'A'} ${N}-coin ${thing} has ${k}/${d} off in the sale. What does it cost now?`, expr: `${N}*(${d}-${k})/${d}`, ans: N - (N / d) * k };
    },
    work({ N, k, d }) {
      const one = N / d, s = [{ t: `1/${d} of ${N}: ${N} ÷ ${d}`, v: one }];
      if (k > 1) s.push({ t: `${k}/${d} off: ${one} × ${k}`, v: one * k });
      s.push({ t: `Take it off: ${N} − ${one * k}`, v: N - one * k });
      return s;
    },
    draw: ({ k, d }) => fracBar(d, k),
  },
  {
    id: 'profit-and-loss', world: 'coinstreet', band: '8-10', title: 'Profit and loss',
    hook: 'A lemonade stall spends 30 coins on lemons and sugar and sells 14 cups at 4 coins each. What is the profit?',
    idea: 'Profit is what comes in minus what went out. If more went out than came in, it is a loss — a negative profit.',
    why: [
      'The coins that come in from selling are the takings: 14 cups at 4 coins each is 56 coins. But the stall did not get those lemons free — 30 coins went out first. Profit is what is left after paying for everything: 56 − 30 = 26.',
      'Takings are not profit. A stall that takes 56 coins and spent 60 has made a loss of 4. Writing that as −4 keeps one rule for both: profit = in − out, and the sign says which way it went. If there is more than one cost — materials and a pitch — add all the costs first. And if the takings exactly match the costs, the profit is 0: the stall has broken even.',
      'A loss is not a disaster, it is information — it tells the stall-keeper to change the price, the costs or how many they make. Every business uses this one subtraction to decide what to do next.',
    ],
    alg: 'profit = number sold × price − costs  (negative means a loss)',
    ex: { n: 14, p: 4, C: 30, fee: 0, stall: 0 },
    caseKey: 'kind',
    cases: [
      { label: 'A profit', note: 'Work out the takings first — how many sold times the price — then take away what was spent.',
        ex: { n: 14, p: 4, C: 30, fee: 0, stall: 0 } },
      { label: 'Two costs to pay', note: 'Everything that went out counts: add the materials and the pitch together before you take them away.',
        ex: { n: 12, p: 5, C: 20, fee: 10, stall: 1 } },
      { label: 'A loss', note: 'More went out than came in, so the profit is below zero. Write it with a minus sign: that is a loss.',
        ex: { n: 10, p: 6, C: 50, fee: 15, stall: 2 } },
      { label: 'Breaking even', note: 'The takings exactly cover the costs. Nothing gained, nothing lost: the profit is 0.',
        ex: { n: 8, p: 5, C: 30, fee: 10, stall: 3 } },
    ],
    keys: ['−'],
    STALLS: [['lemonade stall', 'cups', 'lemons and sugar'], ['bake stall', 'biscuits', 'flour and butter'], ['badge stall', 'badges', 'pins and card'], ['plant stall', 'seedlings', 'pots and soil'], ['bracelet stall', 'bracelets', 'beads and thread']],
    gen(r, lv = 1) {
      return fresh(() => {
        const stall = int(0, this.STALLS.length - 1, r);
        if (lv === 1) { const n = int(3, 10, r), p = int(2, 5, r); return this.q({ n, p, C: int(2, n * p - 2, r), fee: 0, stall }); }
        if (lv === 2) { const n = int(8, 30, r), p = int(2, 12, r); return this.q({ n, p, C: int(Math.ceil(n * p * 0.3), n * p - 2, r), fee: 0, stall }); }
        const n = int(8, 30, r), p = int(2, 12, r), tak = n * p, fee = int(1, 6, r) * 5;
        return this.q({ n, p, C: int(Math.max(1, Math.ceil(tak * 0.5)), tak + 10, r), fee, stall });
      });
    },
    q({ n, p, C, fee, stall }) {
      const [name, what, stuff] = this.STALLS[stall];
      const text = `A ${name} spends ${C} coins on ${stuff}${fee ? ` and pays ${fee} coins for its pitch` : ''}, then sells ${n} ${what} at ${p} coins each. What is the profit?${fee ? ' (Write a loss as a negative number.)' : ''}`;
      const P = n * p - C - fee;
      return { n, p, C, fee, stall, kind: !fee ? 'profit' : P > 0 ? 'profit-fee' : P < 0 ? 'loss' : 'even', text, expr: `${n}*${p}-(${C}+${fee})`, ans: n * p - C - fee };
    },
    work({ n, p, C, fee }) {
      const s = [{ t: `Takings: ${n} × ${p}`, v: n * p }];
      if (fee) s.push({ t: `Everything spent: ${C} + ${fee}`, v: C + fee });
      s.push({ t: `Profit: ${n * p} − ${C + fee}`, v: n * p - C - fee });
      return s;
    },
    draw: ({ n, p, C, fee }) => (C + fee > n * p
      ? barModel(n * p, [{ v: n * p, label: `costs ${C + fee}` }, { v: C + fee - n * p, label: '?', ask: true }], `takings ${n} × ${p}`)
      : barModel(n * p, [{ v: C + fee, label: `costs ${C + fee}` }, { v: Math.max(1, n * p - C - fee), label: '?', ask: true }], `takings ${n} × ${p}`)),
  },
  /* ---------------------------------------------------------- 11–14 */
  {
    id: 'interest-simple', world: 'coinstreet', band: '11-14', title: 'Simple interest',
    hook: 'The bank in this story pays 5% a year. Put 200 coins in for 3 years, taking the interest out each year. How much interest altogether?',
    idea: 'Work out one year\'s interest — the rate per cent of the amount you put in — then multiply by the years.',
    why: [
      'Interest is what a bank pays you for letting it use your money. This story\'s bank pays 5% a year: for every 100 coins you leave with it, it pays 5 coins each year. So 200 coins earns 5% of 200 = 10 coins a year.',
      'With simple interest the interest is always worked out on the amount you first put in, so every year is the same helping: 10, 10 and 10. Three years is 3 × 10 = 30 coins, and the account ends with 230.',
      'The rate here is the story\'s own number. Real rates are different in every place and change over time — the maths is the same whatever the rate is.',
    ],
    alg: 'I = P × r × t ÷ 100',
    ex: { name: 'Ines', P: 200, rate: 5, t: 3, total: false },
    caseKey: 'total',
    cases: [
      { label: 'The interest', note: 'One year\'s interest is the same every year, because it is always worked out on what was first put in. Multiply by the years.',
        ex: { name: 'Ines', P: 200, rate: 5, t: 3, total: false } },
      { label: 'What is in the account', note: 'The question asks for the account, not just the interest — so add the interest to the coins put in.',
        ex: { name: 'Dax', P: 300, rate: 4, t: 2, total: true } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const name = pick(NAMES, r);
        if (lv === 1) return this.q({ name, P: int(1, 9, r) * 100, rate: int(1, 10, r), t: int(2, 5, r), total: false });
        if (lv === 2) return this.q({ name, P: int(2, 40, r) * 20, rate: int(1, 3, r) * 5, t: int(2, 6, r), total: r() < 0.5 });
        let P, rate; do { P = int(12, 99, r) * 10; rate = int(1, 12, r); } while ((P * rate) % 100 !== 0);
        return this.q({ name, P, rate, t: int(2, 8, r), total: r() < 0.6 });
      });
    },
    q({ name, P, rate, t, total }) {
      const text = `The bank in this story pays ${rate}% a year simple interest. ${name} puts in ${P} coins for ${t} years. ${total ? 'How many coins are in the account at the end?' : 'How much interest is that altogether?'}`;
      return { name, P, rate, t, total, text, expr: `${P}*${rate}/100*${t}${total ? `+${P}` : ''}`, ans: (P * rate * t) / 100 + (total ? P : 0) };
    },
    work({ P, rate, t, total }) {
      const y = (P * rate) / 100, s = [{ t: `One year: ${rate}% of ${P}`, v: y }, { t: `${t} years: ${y} × ${t}`, v: y * t }];
      if (total) s.push({ t: `Add it to the ${P} put in`, v: P + y * t });
      return s;
    },
    draw: ({ P, rate, t }) => barModel(P, Array.from({ length: t }, (_, i) => ({ v: 1, label: `year ${i + 1}` })), `${P} coins at ${rate}%`),
  },
  {
    id: 'interest-compound', world: 'coinstreet', band: '11-14', title: 'Interest on interest',
    hook: '200 coins in the story\'s bank at 5% a year, and each year\'s interest stays in. How much after 2 years?',
    idea: 'Each year, add the interest to the account — so next year the interest is worked out on the bigger amount.',
    why: [
      'With compound interest the interest is not taken out; it joins the account. Year 1: 5% of 200 is 10, so there are 210 coins. Year 2: 5% of 210 is 10.50, so there are 220.50 — not 220.',
      'That extra half-coin is interest on the 10 coins of interest: 5% of 10 is 0.50. Every year the interest itself starts earning, so the gap from simple interest grows each year. After two years the gap is exactly r% of r% of the amount put in.',
      'The numbers here always come out to whole hundredths of a coin, so nothing needs rounding. A quick way to do one year: multiply by 1.05 for 5%, 1.1 for 10% — the 1 keeps the coins you had, the rest adds the interest. The rates are the story\'s, not a real bank\'s.',
    ],
    alg: 'A = P × (1 + r/100)ⁿ;  after 2 years, compound − simple = P × (r/100)²',
    ex: { name: 'Ines', P: 200, rate: 5, n: 2, gap: false },
    caseKey: 'gap',
    cases: [
      { label: 'The account, year by year', note: 'Each year\'s interest is worked out on the bigger amount, so go one year at a time — never multiply one year\'s interest by the years.',
        ex: { name: 'Ines', P: 200, rate: 5, n: 2, gap: false } },
      { label: 'Compound beats simple by…', note: 'Work out both accounts after two years and take one from the other. The gap is the interest earned on interest.',
        ex: { name: 'Suki', P: 200, rate: 10, n: 2, gap: true } },
    ],
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        const name = pick(NAMES, r);
        if (lv === 1) return this.q({ name, P: int(1, 30, r) * 100, rate: int(1, 10, r), n: 2, gap: false });
        if (lv === 2) return this.q({ name, P: int(1, 50, r) * 10, rate: pick([10, 20, 50], r), n: 3, gap: false });
        return this.q({ name, P: int(1, 40, r) * 100, rate: int(2, 15, r), n: 2, gap: true });
      });
    },
    /* the account in hundredths of a coin, year by year — whole numbers all the way */
    years(P, rate, n) { const v = [P * 100]; for (let i = 0; i < n; i++) v.push((v[i] * (100 + rate)) / 100); return v; },
    q({ name, P, rate, n, gap }) {
      const v = this.years(P, rate, n);
      if (gap) {
        return { name, P, rate, n, gap, text: `The story's bank pays ${rate}% a year. ${name} leaves ${P} coins for 2 years with the interest kept in (compound). How many coins more is that than simple interest would give?`,
          expr: `${P}*(1+${rate}/100)**2-${P}*(1+2*${rate}/100)`, ans: (v[2] - P * (100 + 2 * rate)) / 100 };
      }
      return { name, P, rate, n, gap, text: `The story's bank pays ${rate}% a year and each year's interest stays in the account (compound). ${name} puts in ${P} coins. How many coins after ${n} years?`,
        expr: `${P}*(1+${rate}/100)**${n}`, ans: v[n] / 100 };
    },
    work({ P, rate, n, gap }) {
      const v = this.years(P, rate, n);
      if (gap) {
        return [
          { t: `Compound: ${P} → year 1 → year 2`, v: v[2] / 100 },
          { t: `Simple: ${P} + 2 × ${rate}% of ${P}`, v: (P * (100 + 2 * rate)) / 100 },
          { t: 'The difference: interest on interest', v: (v[2] - P * (100 + 2 * rate)) / 100 },
        ];
      }
      return v.slice(1).map((x, i) => ({ t: `After year ${i + 1}: add ${rate}% of ${v[i] / 100}`, v: x / 100 }));
    },
    draw: ({ P, rate, n }) => {
      const v = [P]; for (let i = 0; i < n; i++) v.push(v[i] * (1 + rate / 100));
      return barModel(P, v.slice(0, n).map((x, i) => ({ v: x, label: `year ${i + 1}` })), `${P} coins, ${rate}% a year, kept in`);
    },
  },
  {
    id: 'bill-split', world: 'coinstreet', band: '11-14', title: 'Splitting a bill fairly',
    hook: '3 friends have a café bill of 24 + 18 + 30 coins, and the café adds 10%. They split it equally. How much does each pay?',
    idea: 'Add the bill, add the percentage on the whole bill, then divide by the number of people.',
    why: [
      'The percentage is charged on the whole bill, so add the items first: 24 + 18 + 30 = 72. Adding 10% means paying 110% of it: 72 × 1.1 = 79.20.',
      'Split equally, each of the 3 pays 79.20 ÷ 3 = 26.40. You could also add 10% to each person\'s own share of 24 coins — 26.40 again — because taking a percentage and sharing equally can be done in either order.',
      '"Equal" is one kind of fair. Another is each paying for what they had, plus 10% of it. The maths works for both; the friends choose which is fair to them.',
    ],
    alg: 'each = (sum of items) × (100 + p) ÷ 100 ÷ people',
    ex: { items: [24, 18, 30], p: 10, k: 3 },
    oneIdea: true,
    keys: ['.'], decimals: true,
    gen(r, lv = 1) {
      return fresh(() => {
        for (;;) {
          const k = lv === 1 ? 2 : lv === 2 ? int(2, 4, r) : int(3, 6, r), p = lv === 1 ? 10 : pick([5, 10, 12, 15, 20], r);
          const items = Array.from({ length: lv === 3 ? 3 : 2 }, () => int(lv === 1 ? 5 : 8, lv === 1 ? 30 : 60, r));
          const tot = items.reduce((a, b) => a + b, 0);
          if ((tot * (100 + p)) % k === 0) return this.q({ items, p, k });
        }
      });
    },
    q({ items, p, k }) {
      const tot = items.reduce((a, b) => a + b, 0);
      return { items, p, k, text: `${k} friends have a café bill of ${items.join(' + ')} coins, and the café adds ${p}%. They split it equally. How much does each pay?`,
        say: `${k} friends have a café bill of ${items.join(' plus ')} coins, and the café adds ${p} percent. They split it equally. How much does each pay?`,
        expr: `(${items.join('+')})*(1+${p}/100)/${k}`, ans: (tot * (100 + p)) / k / 100 };
    },
    work({ items, p, k }) {
      const tot = items.reduce((a, b) => a + b, 0);
      return [
        { t: `The bill: ${items.join(' + ')}`, v: tot },
        { t: `With ${p}% added: ${tot} × ${(100 + p) / 100}`, v: (tot * (100 + p)) / 100 },
        { t: `Each of ${k}: ÷ ${k}`, v: (tot * (100 + p)) / k / 100 },
      ];
    },
    draw: ({ k }) => fracBar(k, 1),
  },
  {
    id: 'cost-of-borrowing', world: 'coinstreet', band: '11-14', title: 'What borrowing costs',
    hook: 'Kwame borrows 100 coins and pays it back as 5 payments of 22 coins. How much extra did the loan cost?',
    idea: 'Add up every payment, then take away what was borrowed. The extra is the price of borrowing.',
    why: [
      'A loan lets you have something now and pay for it over time. That is useful, and like anything useful it has a price: you pay back more than you borrowed. 5 payments of 22 is 110 coins, for a loan of 100 — so the loan cost 10 coins.',
      'Small payments can hide a big price, because nobody adds them up at the shop. Always multiply out: payments × how many, then compare with what you borrowed.',
      'To compare two loans of different sizes, turn the extra into a percentage of the loan: 10 extra on 100 borrowed is 10%. Borrowing is not good or bad — it is a tool, and this is how you read its price tag.',
    ],
    alg: 'cost of the loan = payments × number of payments − amount borrowed',
    ex: { name: 'Kwame', B: 100, k: 5, m: 22, pct: false },
    caseKey: 'pct',
    cases: [
      { label: 'The extra, in coins', note: 'Multiply out the payments to see what was paid back altogether, then take away what was borrowed.',
        ex: { name: 'Kwame', B: 100, k: 5, m: 22, pct: false } },
      { label: 'The extra, as a percentage', note: 'To compare loans of different sizes, divide the extra by the loan and multiply by 100.',
        ex: { name: 'Vesper', B: 200, k: 4, m: 55, pct: true } },
    ],
    gen(r, lv = 1) {
      return fresh(() => {
        const name = pick(NAMES, r);
        if (lv === 1) { const k = int(2, 5, r), B = int(2, 15, r) * 10; return this.q({ name, B, k, m: Math.ceil(B / k) + int(1, 5, r), pct: false }); }
        if (lv === 2) { const k = int(3, 12, r), B = int(10, 60, r) * 10; return this.q({ name, B, k, m: Math.ceil(B / k) + int(1, 12, r), pct: false }); }
        for (;;) {
          const B = int(1, 12, r) * 100, pc = int(1, 8, r) * 5, k = pick([2, 3, 4, 5, 6, 8, 10, 12], r), tot = (B * (100 + pc)) / 100;
          if (tot % k === 0) return this.q({ name, B, k, m: tot / k, pct: true });
        }
      });
    },
    q({ name, B, k, m, pct }) {
      const text = `${name} borrows ${B} coins and pays it back as ${k} payments of ${m} coins. ${pct ? 'The extra paid is what percentage of the loan?' : 'How much extra did the loan cost?'}`;
      return { name, B, k, m, pct, text, expr: pct ? `(${k}*${m}/${B}-1)*100` : `${k}*${m}-${B}`, ans: pct ? ((k * m - B) * 100) / B : k * m - B };
    },
    work({ B, k, m, pct }) {
      const s = [{ t: `Paid back: ${k} × ${m}`, v: k * m }, { t: `Extra: ${k * m} − ${B}`, v: k * m - B }];
      if (pct) s.push({ t: `As a percentage: ${k * m - B} ÷ ${B} × 100`, v: ((k * m - B) * 100) / B });
      return s;
    },
    draw: ({ k, m }) => barModel(k * m, Array.from({ length: k }, () => ({ v: m, label: m })), `${k} payments`),
  },
];

