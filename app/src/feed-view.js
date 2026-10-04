/* feed-view.js — the #/feed screen: the family's head, about twenty of the family's cards, and
   the family's ending pointing at Continue (FAMILY-STANDARD §6a). The cards' data is lazy:
   an index and one group per level (src/feed/, built by tools/build-feed.mjs), so none of it is on the first screen. */
import { R } from './runtime.js';
import { feedCard, feedEnd, feedHead } from './integration/bizzing-feed.js';
import { session, markSeen, dayNo, feedLevel, levelName, showOpts } from './feed.js';
import { kid } from './model.js';
import { continueTarget } from './views.js';
import { octoState } from './views3.js';

/* Two steps, both lazy: the index (the ranking's fields, no words) when #/feed opens, then only
   the level groups that today's session draws from (feed/g-L3.js, feed/g-any.js, …). */
let DATA = null, loading = null;
const BODY = {}, have = new Set(), pending = {};
export const feedData = () => DATA;
export const groupsLoaded = () => [...have];
export function loadFeed() {
  if (DATA) return Promise.resolve(DATA);
  return loading || (loading = import('./feed/index.js').then((m) => { DATA = m.INDEX; return DATA; }));
}
const GROUP_OF = (x) => (x.level == null ? 'any' : 'L' + x.level);
const LOAD = (g) => import(`./feed/g-${g}.js`);
function needGroups(list, then) {
  const want = [...new Set(list.map((x) => GROUP_OF(INDEX_BY[x.id])))].filter((g) => !have.has(g));
  if (!want.length) return true;
  for (const g of want) if (!pending[g]) pending[g] = LOAD(g).then((m) => { Object.assign(BODY, m.BODY); have.add(g); then(); });
  return false;
}
let INDEX_BY = {};
/* the groups today's session needs — for the headless check that nothing more was loaded */
export const sessionGroups = () => [...new Set(((R.ui.feedS || {}).list || []).map((x) => GROUP_OF(INDEX_BY[x.id])))].sort();

const stampOf = (k) => [dayNo(), k.id, k.xp, feedLevel(k), Object.keys((k.journey || {}).done || {}).length, k.last ? k.last.at : 0, Object.keys(k.stories || {}).length].join('|');

/* today's session, drawn again only when the child has done something new */
export function todays(h, k) {
  const st = stampOf(k), S = R.ui.feedS;
  if (S && S.stamp === st) return S.list;
  const list = session(h, k, DATA);
  R.ui.feedS = { stamp: st, list }; R.ui.feedPlay = {};
  markSeen(k, list.map((x) => x.id));
  return list;
}

/* The family's card (integration/bizzing-feed.js, never edited here) shows a title and a body.
   A Maths card also carries WHERE it lives (a place line above the title) and MORE (a second
   line under the body) — both cut from the corpus like everything else (tools/build-feed.mjs). */
const escH = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function withMore(html, it) {
  if (!it || !html) return html;
  let out = html;
  if (it.where) out = out.replace('<h3>', `<p class="bzf-where">${escH(it.where)}</p><h3>`);
  if (it.more) {
    const at = ['<p class="bzf-q">', '<div class="bzf-row">'].map((m) => out.indexOf(m)).filter((i) => i >= 0);
    const i = at.length ? Math.min(...at) : out.lastIndexOf('</div></article>');
    out = out.slice(0, i) + `<p class="bzf-more">${escH(it.more)}</p>` + out.slice(i);
  }
  return out;
}

export function viewFeed(save) {
  const h = R.h, k = kid(h);
  const head = feedHead({ name: 'My Feed', sub: `Picked for you from across the app, for ${levelName(feedLevel(k))} — about twenty, and then it ends.` });
  if (h.parent.feedOff) return `<section class="feed-page">${octoState('sleep', 'My Feed is switched off on this device. A grown-up can switch it back on behind the PIN.', '<a class="btn" href="#/home">Back to Home</a>')}</section>`;
  if (!DATA) return `<section class="feed-page">${head}<div class="bzf-list"><article class="bzf-card bz-card" role="status"><div class="bzf-in"><h3>Opening your feed…</h3></div></article></div></section>`;
  if (Object.keys(INDEX_BY).length !== DATA.length) INDEX_BY = Object.fromEntries(DATA.map((x) => [x.id, x]));
  const list = todays(h, k); save();
  if (!needGroups(list, () => { if (R.ui.nav === 'feed') R.render(); })) return `<section class="feed-page">${head}<div class="bzf-list"><article class="bzf-card bz-card" role="status"><div class="bzf-in"><h3>Opening your feed…</h3></div></article></div></section>`;
  const P = R.ui.feedPlay || (R.ui.feedPlay = {});
  const c = continueTarget(k);
  const cards = list.map((x) => {
    let it = BODY[x.id] && { ...BODY[x.id], kind: x.kind }, st = P[x.id] || {};
    if (it && it.play && st.st === 'done') { it = { ...it, play: undefined }; st = {}; }
    return withMore(showOpts(feedCard(it, x, st), it && it.play && it.play.show), it);
  }).join('');
  return `<section class="feed-page">${head}<div class="bzf-list" data-feed="1">${cards}${feedEnd({ href: '#/continue', label: `${c.label}: ${c.title}`, alt: { href: '#/home', label: 'Home' } })}</div></section>`;
}

/* the one question a card may ask: right pays once (the caller's earn), wrong holds until Continue */
export function answer(id, o, { pay, good, bad }) {
  const it = BODY[id], P = R.ui.feedPlay || (R.ui.feedPlay = {});
  if (!it || !it.play || (P[id] && P[id].st)) return;
  if (+o === 0) { P[id] = { st: 'right', o: 0 }; pay(id); good(); } else { P[id] = { st: 'wrong', o: +o }; bad(); }
}
export function cont(id) { const P = R.ui.feedPlay || (R.ui.feedPlay = {}); if (P[id]) P[id].st = 'done'; }
