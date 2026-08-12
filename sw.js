/* sw.js — Service Worker V40 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v220';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=220',
  '/tools_logic.js?v=220',
  '/firebase-init.js?v=220',
  '/app_final.js?v=220',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/js/app-utils.js?v=220',
  '/js/data/module-media-assets.js?v=220',
  '/js/data/student-resources.js?v=220',
  '/js/library-manager.js?v=220',
  '/js/feedback-manager.js?v=220',
  '/js/student-experience.js?v=220',
  '/js/student-pages.js?v=220',
  '/js/course-navigation.js?v=220',
  '/js/training-modes.js?v=220',
  '/js/narrated-audio.js?v=220',
  '/js/module-media-renderer.js?v=220',
  '/js/module-loader.js?v=220',
  '/js/academic-core.js?v=220',
  '/js/student-profile-renderers.js?v=220',
  '/js/instructor-announcements.js?v=220',
  '/js/certificates.js?v=220',
  '/js/academic-import-manager.js?v=220',
  '/js/manual-grades.js?v=220',
  '/js/payment-manager.js?v=220',
  '/js/auth-ui.js?v=220',
  '/js/coupon-manager.js?v=220',
  '/js/instructor-panel.js?v=220',
  '/js/admin-panel.js?v=220',
  '/js/manager-panel.js?v=220'
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
