/* sw.js — Service Worker V39 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v216';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=216',
  '/tools_logic.js?v=216',
  '/firebase-init.js?v=216',
  '/app_final.js?v=216',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/js/app-utils.js?v=216',
  '/js/data/module-media-assets.js?v=216',
  '/js/data/student-resources.js?v=216',
  '/js/library-manager.js?v=216',
  '/js/feedback-manager.js?v=216',
  '/js/student-experience.js?v=216',
  '/js/student-pages.js?v=216',
  '/js/course-navigation.js?v=216',
  '/js/training-modes.js?v=216',
  '/js/narrated-audio.js?v=216',
  '/js/module-media-renderer.js?v=216',
  '/js/module-loader.js?v=216',
  '/js/academic-core.js?v=216',
  '/js/student-profile-renderers.js?v=216',
  '/js/instructor-announcements.js?v=216',
  '/js/certificates.js?v=216',
  '/js/academic-import-manager.js?v=216',
  '/js/manual-grades.js?v=216',
  '/js/payment-manager.js?v=216',
  '/js/auth-ui.js?v=216',
  '/js/coupon-manager.js?v=216',
  '/js/instructor-panel.js?v=216',
  '/js/admin-panel.js?v=216',
  '/js/manager-panel.js?v=216'
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
