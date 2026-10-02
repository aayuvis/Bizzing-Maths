/* bizzing-wallet.js — Bizzing coins, the one family currency (FAMILY-STANDARD §1).

   Every Bizzing app earns into, and spends from, the same wallet per child. Bizzing
   Finance shows it as the child's income and teaches with it. The Hive pays nothing.

     import { earn, spend, balance } from './bizzing-wallet.js';
     earn('maths', 'Anaya', 'answer');            // +1, standard amount
     spend('bee', 'Anaya', 40, 'outfit:crown');   // fixed price; false if not enough

   Rules this file enforces (an app cannot override them):
   • Only the standard events pay, at the standard amounts. Nothing pays for time,
     logins, streaks, dice or luck — there is no event for them.
   • 100 coins per app per child per day, at most.
   • No randomness anywhere: spend() takes a fixed price.
   • Never transmitted; no network code exists in this file.

   localStorage['bizzing.wallet'] = { v:1, kids: { "<first name, lower case>":
     { coins, ledger:[{ a, t, n, why }] } } }. Append-only ledger, trimmed to 2,000.
   The family server replaces this key later; the shape stays. */

const KEY = 'bizzing.wallet';
const APPS = /^(bee|maths|geography|india|finance)$/;
export const EARN = { answer: 1, stop: 5, contest: 10, mastery: 20 };
export const DAILY_CAP = 100;
const MAX = 2000;

const day = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const kidKey = (who) => String(who || '').trim().toLowerCase();

function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1 && o.kids) return o; } catch {}
  return { v: 1, kids: {} };
}
function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch { return false; } }
function kid(o, who) { const k = kidKey(who); return k ? (o.kids[k] || (o.kids[k] = { coins: 0, ledger: [] })) : null; }

export function balance(who) { const k = load().kids[kidKey(who)]; return k ? k.coins : 0; }

/* Returns the coins actually paid (0 if the event is unknown or the cap is reached). */
export function earn(app, who, event, now = Date.now()) {
  if (!APPS.test(app) || !(event in EARN)) return 0;
  const o = load(), k = kid(o, who);
  if (!k) return 0;
  const today = k.ledger.filter((x) => x.a === app && x.n > 0 && day(x.t) === day(now)).reduce((a, x) => a + x.n, 0);
  const n = Math.min(EARN[event], Math.max(0, DAILY_CAP - today));
  if (!n) return 0;
  k.coins += n;
  k.ledger.push({ a: app, t: now, n, why: event });
  if (k.ledger.length > MAX) k.ledger.splice(0, k.ledger.length - MAX);
  save(o);
  return n;
}

/* A fixed-price purchase. Returns true if paid. */
export function spend(app, who, price, why, now = Date.now()) {
  if (!APPS.test(app) || !Number.isInteger(price) || price <= 0) return false;
  const o = load(), k = kid(o, who);
  if (!k || k.coins < price) return false;
  k.coins -= price;
  k.ledger.push({ a: app, t: now, n: -price, why: String(why).slice(0, 60) });
  if (k.ledger.length > MAX) k.ledger.splice(0, k.ledger.length - MAX);
  save(o);
  return true;
}

/* One-time 1:1 migration of an app's old currency (Bee coins, India sikke…). */
export function migrateFrom(app, who, amount, now = Date.now()) {
  if (!APPS.test(app) || !Number.isInteger(amount) || amount <= 0) return 0;
  const o = load(), k = kid(o, who);
  if (!k || k.ledger.some((x) => x.a === app && x.why === 'migrated')) return 0;
  k.coins += amount;
  k.ledger.push({ a: app, t: now, n: amount, why: 'migrated' });
  save(o);
  return amount;
}

/* Give back what a child paid for something the family has withdrawn (a sacred figure or a
   real person retired from a shop). Once per item, for exactly what the ledger shows was paid. */
export function refund(app, who, item, now = Date.now()) {
  if (!APPS.test(app)) return 0;
  const o = load(), k = kid(o, who);
  if (!k) return 0;
  const why = String(item).slice(0, 52);
  if (k.ledger.some((x) => x.a === app && x.why === `refund:${why}`)) return 0;
  const paid = k.ledger.filter((x) => x.a === app && x.n < 0 && x.why === why).reduce((a, x) => a - x.n, 0);
  if (!paid) return 0;
  k.coins += paid;
  k.ledger.push({ a: app, t: now, n: paid, why: `refund:${why}` });
  save(o);
  return paid;
}

export function ledger(who) { const k = load().kids[kidKey(who)]; return k ? k.ledger.slice() : []; }
