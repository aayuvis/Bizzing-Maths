/* sw.js — offline-first is a hard rule, inherited from Bizzing Finance.

   Freshness follows the URL: a Vite-hashed asset is immutable by construction,
   so it is cache-first; everything else (navigations, sw.js, manifest, icon,
   dev's unhashed modules) is network-first with a cache fallback. Serving a
   cached index.html cache-first once shipped a blank page in Finance, because
   it asked for hashed assets a deploy had already deleted. Bump CACHE whenever
   the caching strategy changes. */

const CACHE = 'bizzing-maths-v1';
const ENTRY = ['./', './index.html'];

/* Vite writes assets/<name>-<hash>.<ext>. The hash is what makes cache-first
   safe here, so match on it rather than on the directory: an unhashed file
   that happens to live in assets/ must not be pinned for ever. */
const immutable = (url) => /\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(url.pathname);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ENTRY.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();

    /* Tempting to also client.navigate() every open window, so a visitor stuck
       on the old worker recovers without touching anything. Tried it: it
       deadlocks a window that is itself mid-navigation, which is exactly when
       activate fires. One reload is the honest cost of a worker upgrade, and
       the point of this version is that there is never a next time. */
  })());
});

const put = (req, res) => {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // anything third-party: let the network decide

  /* Immutable by name — the cache can never be wrong about it. */
  if (immutable(url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  /* Everything else: what is published wins, and the cache is the safety net. */
  e.respondWith(
    fetch(req)
      .then((res) => put(req, res))
      .catch(async () =>
        (await caches.match(req)) ||
        /* offline and never seen: a navigation still gets the app shell */
        (req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('offline'))))
  );
});

/* The update bar (main.js) asks the waiting worker to take over; the page
   reloads on controllerchange so the child sees the new build once, cleanly. */
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
