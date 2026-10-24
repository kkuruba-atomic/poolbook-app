// PoolBook service worker: keeps a copy of the app on the phone so it opens with no signal.
// Customer data is NOT cached here; it always comes live from Supabase.
// Bump VERSION whenever you want phones to drop the old saved copy.
const VERSION = 'poolbook-v4';
const APP_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];

self.addEventListener('install', e => {
  // Save each file on its own, so one missing file (e.g. an icon) can't stop offline mode from installing.
  // The page itself must be saved, though; without it there's nothing to open offline.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(APP_FILES.map(f =>
    c.add(f).catch(err => { if (f === '/' || f === '/index.html') throw err; })
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch saves
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;       // never cache customer data or logins
  if (url.pathname === '/sw.js') return;                   // let the browser check for updates normally

  // The page itself: try the network first so updates show up right away; fall back to the saved copy offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('/index.html', copy)); return res; })
        .catch(() => caches.match('/index.html', { ignoreVary: true }))
    );
    return;
  }

  // Icons, manifest and the Supabase library: use the saved copy, fetch and save it if missing.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
