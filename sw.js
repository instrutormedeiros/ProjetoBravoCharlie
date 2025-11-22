/* sw.js — Service Worker V3 (Forçando atualização)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v3'; // <--- MUDAMOS PARA V3 PARA FORÇAR ATUALIZAÇÃO
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css',
  '/app_final.js',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/firebase-init.js' // Adicionado para garantir
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
  clients.claim(); // Controla as páginas abertas imediatamente
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)) // Deleta o cache antigo (v1 e v2)
    ))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)) // Tenta rede primeiro, depois cache
  );
});
