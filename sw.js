/* sw.js — Service Worker V4 (Forçando atualização para exibir Ferramentas)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v4'; // <--- MUDAMOS PARA V4
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css',
  '/app_final.js',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/firebase-init.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(u => new Request(u, {cache: 'reload'}))).catch(()=>{ return; });
    })
  );
});

self.addEventListener('activate', event => {
  clients.claim(); 
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)) // Limpa cache antigo
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)) 
  );
});
