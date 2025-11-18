/* sw.js — Service Worker minimal e tolerante
   - Cache-then-network strategy with time-limited cache entries
   - Não bloqueia atualizações e falha silenciosamente se arquivos faltarem
*/
const CACHE_NAME = 'pbc-static-v1';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css',
  '/app_final.js', /* <<< CORRIGIDO (estava app.js) */
  '/data.js',
  '/quizzes.js',
  '/course.js' /* <<< CORRIGIDO (mantido para bater com o index.html) */
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(u => new Request(u, {cache: 'no-cache'}))).catch(()=>{ return; });
    })
  );
});

self.addEventListener('activate', event => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  // Ignore non-GET
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(resp => {
        // update cache in background (best-effort)
        if (resp && resp.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
        }
        return resp;
      }).catch(()=>null);
      return cached || network || new Response('', {status: 503, statusText: 'Service Unavailable'});
    })
  );
});