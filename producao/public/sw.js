/* Elos 360° Global — service worker do aplicativo.
   Páginas: rede primeiro, cópia local só se estiver sem internet.
   /api nunca é guardado em cache (dados sempre do servidor). */
const CACHE = 'elos-app-v4';
const BASE = ['/sistema', '/', '/elos-shim.js', '/elora.js', '/elora.css', '/elos-i18n.js', '/logo-circular.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || /^\/(api|projeto|docs|programas)(\/|$)/i.test(url.pathname)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === 'basic' && !/no-store/i.test(res.headers.get('Cache-Control') || '')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/sistema') : Response.error())))
  );
});
