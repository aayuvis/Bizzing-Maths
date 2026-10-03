/* bizzing-feed.js — My Feed for every Bizzing app: one engine, one card, one ending
   (FAMILY-STANDARD §6a). Grown out of Bizzing India's app/feed.js (docs/30-feed.md there).

   The owner (2 Oct 2026): a scrollable feed "like Instagram and Reddit", of content from across
   the app, chosen by where the child is and what level they are at, and changing with what they
   do. A feed for children differs from the ones it borrows its shape from in three ways, and
   this file holds all three so no app can drift from them:

     1. It is built only from what the app already says. Each app cuts its cards from its own
        corpus at build time (tools/build-feed.*); every card names the object it came from
        (`src`) and the app's test resolves it. Nothing is typed for the feed.
     2. It ranks by what the child is doing and learning — never by what holds attention.
        Score = context (signals the app passes) + extra (the app's level-fit rule) + due
        (something that slipped, its gap over) + novelty − what was seen this week. Every card
        carries the plain-words reason it is there.
     3. It ENDS. One session is `limit` cards (20) and then a finished card. Nothing loads more,
        nothing autoplays, there are no likes, counts or streaks, and scrolling earns nothing:
        only a right answer to a card's question pays, once, through the wallet's `answer`.

   Pure and DOM-free in the engine half (feedFor, order, hash), so the app's node tests run the
   same file. The render half returns HTML strings in the shell's idiom.

     import { feedFor, feedCard, feedEnd, feedHead } from './bizzing-feed.js';
     const list = feedFor({ items, band, signals, due, seen, now, unlocked, extra });
     html = feedHead({ name: 'My Feed' }) + list.map((x) => feedCard(byId[x.id], x, state)).join('') + feedEnd(next);

   An item: { id, kind, bands:[…], topics:[…], key?, src, badge?, title, body?, art?, route, cta,
              script?, roman?, source?, play?: { q, opts:[right, …wrong], after } }  */

export const LIMIT = 20, MAX_PLAY = 5, MAX_KIND = 6, MAX_WHY = 6;
const SPREAD = 1.5, WHY_COST = 1.6, DAY = 864e5;

export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* opts = { items, band, now, signals:[{topic, w, why}], due:{ topicOrKey: why }, seen:{ id: dayNumber },
            unlocked(item) → bool, skip(item) → bool, extra(item) → { s, why } | null,
            level, levelName(n) → 'Level 3' | 'the Deep Mine', limit, maxPlay, maxKind, maxWhy }
            → [{ id, kind, why, score, tier: 'now'|'review'|'next'|'any' }]

   LEVEL AND PROGRESS (owner, 2 Oct 2026: "structured by level and progress of the kid"). Every
   card carries `level`: its place on the app's own ladder (a level, a band of stops, a rung).
   Given the child's `level`, the session is built in three tiers, by arithmetic:
     now     cards AT the child's level — most of the session (≥ 60%)
     review  cards from levels already passed — what slipped first, then a few to keep (≤ 25%)
     next    at most 2 cards from the very next level, labelled "Coming up on …" — a peek, never more
     any     LEVEL-AGNOSTIC cards (no `level`: a festival, a fun fact, a game) — at most 25%,
             so they season a session and never crowd out the child's own level
   Nothing beyond the next level ever appears. A child who climbs gets a different feed.
   Content rule (owner): at least 100 cards per level, plus at least 300 level-agnostic ones. */
export function feedFor(o) {
  const now = o.now ?? Date.now(), today = Math.floor(now / DAY), limit = o.limit ?? LIMIT;
  const ctx = {};
  for (const sg of o.signals || []) if (!ctx[sg.topic] || ctx[sg.topic].w < sg.w) ctx[sg.topic] = sg;
  const scored = [], L = o.level, nm = o.levelName || ((n) => 'Level ' + n);
  const tierOf = (it) => (it.level == null ? (L == null ? 'now' : 'any') : L == null || it.level === L ? 'now' : it.level < L ? 'review' : it.level === L + 1 ? 'next' : null);
  for (const it of o.items || []) {
    const tier = tierOf(it); if (!tier) continue;                               // nothing beyond the next level
    if (o.band && it.bands && !it.bands.includes(o.band)) continue;              // never above the band
    if (o.unlocked && !o.unlocked(it)) continue;                                // not reached yet
    if (o.skip && o.skip(it)) continue;                                         // already done (a story read)
    let s = 0, why = null, best = 0;
    for (const t of it.topics || []) { const c = ctx[t]; if (c && c.w > best) { best = c.w; why = c.why; } }
    s += best;
    const ex = o.extra && o.extra(it); if (ex && ex.s) { s += ex.s; if (ex.why && ex.s >= best) why = ex.why; }
    const dueWhy = o.due && ((it.key && o.due[it.key]) || (it.topics || []).map((t) => o.due[t]).find(Boolean));
    if (dueWhy) { s += 9; why = dueWhy; }
    const seen = o.seen && o.seen[it.id];
    if (seen == null) s += 2; else if (today - seen < 7) s -= 12; else s -= 2;
    if (tier === 'now') s += 6;
    else if (tier === 'review') { s += dueWhy ? 0 : -1 - Math.min(4, L - it.level); if (!why) why = 'To keep: from ' + nm(it.level); }
    else if (tier === 'next') { s += 1; why = 'Coming up on ' + nm(it.level); }
    s += (hash(it.id + ':' + today) % 1000) / 600;                               // variety, the same all day
    scored.push({ it, s, why, tier });
  }
  scored.sort((a, b) => b.s - a.s);
  const out = [], kinds = {}, whys = {}, tiers = { now: 0, review: 0, next: 0, any: 0 }; let plays = 0;
  const cap = { review: Math.floor(limit * 0.25), next: 2, any: Math.floor(limit * 0.25) };
  const pool = scored.slice(), maxPlay = o.maxPlay ?? MAX_PLAY, maxKind = o.maxKind ?? MAX_KIND, maxWhy = o.maxWhy ?? MAX_WHY;
  while (out.length < limit && pool.length) {
    let pick = -1, bestS = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const k = pool[i].it.kind, n = out.length;
      if (n >= 2 && out[n - 1].kind === k && out[n - 2].kind === k) continue;     // never three of a kind in a row
      if (pool[i].it.play && plays >= maxPlay) continue;
      const tr = pool[i].tier; if (cap[tr] != null && tiers[tr] >= cap[tr]) continue;
      if ((kinds[k] || 0) >= maxKind) continue;
      const wn = pool[i].why ? (whys[pool[i].why] || 0) : 0;
      if (wn >= maxWhy) continue;                                               // one reason is not the whole feed
      const eff = pool[i].s - SPREAD * (kinds[k] || 0) - WHY_COST * wn;
      if (eff > bestS) { bestS = eff; pick = i; }
    }
    if (pick < 0) break;
    const p = pool.splice(pick, 1)[0];
    kinds[p.it.kind] = (kinds[p.it.kind] || 0) + 1; if (p.it.play) plays++;
    if (p.why) whys[p.why] = (whys[p.why] || 0) + 1;
    tiers[p.tier]++;
    out.push({ id: p.it.id, kind: p.it.kind, why: p.why || (L != null ? 'For ' + nm(L) : o.fallbackWhy || 'New for you'), score: p.s, tier: p.tier });
  }
  return out;
}

/* a question's options in an order taken from the card id: the right one is written first, so
   written order would leak it; this spreads it evenly and is the same every time */
export function order(id, n) {
  const idx = [...Array(n).keys()]; let h = hash(id);
  for (let j = n - 1; j > 0; j--) { const r = h % (j + 1); h = Math.floor(h / (j + 1)) + 7919 * j; [idx[j], idx[r]] = [idx[r], idx[j]]; }
  return idx;
}

/* ------------------------------ render ------------------------------ */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function feedHead(p = {}) {
  return `<div class="bz-phead bz-phead-root" data-bz="phead"><h1><span>${esc(p.name || 'My Feed')}</span><small>${esc(p.sub || 'Picked for you from across the app — about twenty, and then it ends.')}</small></h1></div>`;
}

/* state = { st: 'right'|'wrong'|null, o: chosen index } for a card with a question */
export function feedCard(it, x, state = {}) {
  if (!it) return '';
  const badge = it.badge ? `<span class="bzf-badge" data-b="${esc(it.badge.id || '')}">${esc(it.badge.label || it.badge)}</span>` : '';
  let q = '';
  if (it.play) {
    const ord = order(it.id, it.play.opts.length), st = state.st;
    q = `<p class="bzf-q">${esc(it.play.q)}</p><div class="bzf-opts" role="group" aria-label="${esc(it.play.q)}">` +
      ord.map((o) => `<button class="bzf-opt${st && o === 0 ? ' ok' : ''}${st === 'wrong' && o === state.o ? ' no' : ''}" data-bzf="ans" data-id="${esc(it.id)}" data-o="${o}"${st ? ' disabled' : ''}>${esc(it.play.opts[o])}</button>`).join('') + '</div>' +
      (st === 'right' ? `<p class="bzf-after ok">Right. ${esc(it.play.after || '')}</p>` : '') +
      (st === 'wrong' ? `<p class="bzf-after">Not this time — it is “${esc(it.play.opts[0])}”. ${esc(it.play.after || '')}</p><button class="bz-btn out" data-bzf="cont" data-id="${esc(it.id)}">Continue</button>` : '');
  }
  return `<article class="bzf-card bz-card" tabindex="0" data-kind="${esc(it.kind)}" data-id="${esc(it.id)}" aria-label="${esc(it.title)}">
  ${it.art ? `<img class="bzf-art" src="${esc(it.art)}" alt="" loading="lazy">` : ''}
  <div class="bzf-in"><div class="bzf-top">${badge}<span class="bzf-why">${esc(x?.why || '')}</span></div>
    <h3>${esc(it.title)}</h3>
    ${it.script ? `<p class="bzf-script" lang="${esc(it.lang || '')}">${esc(it.script)}</p>` : ''}${it.roman ? `<p class="bzf-roman">${esc(it.roman)}</p>` : ''}
    ${it.body ? `<p class="bzf-body">${esc(it.body)}</p>` : ''}${it.source ? `<p class="bzf-src">${esc(it.source)}</p>` : ''}
    ${q}
    ${it.route && !(it.play && state.st === 'wrong') ? `<div class="bzf-row"><a class="bz-btn" href="${esc(it.route)}">${esc(it.cta || 'Open')} →</a></div>` : ''}
  </div></article>`;
}

export function feedEnd(next = {}) {
  return `<article class="bzf-card bz-card bzf-end" data-bz="feed-end"><div class="bzf-in"><h3>That’s today’s feed.</h3>
  <p class="bzf-body">You’ve seen it all. There is no more to scroll — go and do the real thing.</p>
  <div class="bzf-row">${next.href ? `<a class="bz-btn" href="${esc(next.href)}">${esc(next.label || 'Continue your journey')} →</a>` : ''}${next.alt ? `<a class="bz-btn out" href="${esc(next.alt.href)}">${esc(next.alt.label)}</a>` : ''}</div></div></article>`;
}

/* j/k or ↑/↓ move card to card; the app calls this once */
let keysBound = false;
export function bindFeedKeys() {
  if (keysBound || typeof document === 'undefined') return; keysBound = true;
  document.addEventListener('keydown', (e) => {
    if (!/^(j|k|ArrowDown|ArrowUp)$/.test(e.key) || e.target.closest('input,textarea,select')) return;
    const cards = [...document.querySelectorAll('.bzf-card')]; if (!cards.length) return;
    const i = cards.indexOf(document.activeElement.closest('.bzf-card'));
    const n = /j|ArrowDown/.test(e.key) ? Math.min(cards.length - 1, i + 1) : Math.max(0, i - 1);
    if (n !== i) { e.preventDefault(); cards[n].focus(); cards[n].scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  });
}
