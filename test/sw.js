const CACHE = 'statikaTest-v2.3.0-rc1';
const PRECACHE = ['./', './index.html', './styles.css', './app.js', './visuals.js', './v21-engine.js', '../config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './media/hang-rest.webp', './media/hang-ready.webp', './media/hang-active.webp', './media/hang-sequence.webp'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n.startsWith('statikaTest-') && n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // Никогда не кэшируем Supabase и другие API
  e.respondWith(fetch(req).then(response => {
    if (response.ok && (new URL(req.url).pathname.startsWith(new URL(self.registration.scope).pathname))) {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, clone));
    }
    return response;
  }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
