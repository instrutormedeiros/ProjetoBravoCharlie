/* sw.js — Service Worker V40 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v222';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=222',
  '/tools_logic.js?v=222',
  '/firebase-init.js?v=222',
  '/app_final.js?v=222',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/js/app-utils.js?v=222',
  '/js/data/module-media-assets.js?v=222',
  '/js/data/student-resources.js?v=222',
  '/js/library-manager.js?v=222',
  '/js/feedback-manager.js?v=222',
  '/js/student-experience.js?v=222',
  '/js/student-pages.js?v=222',
  '/js/course-navigation.js?v=222',
  '/js/training-modes.js?v=222',
  '/js/narrated-audio.js?v=222',
  '/js/module-media-renderer.js?v=222',
  '/js/module-loader.js?v=222',
  '/js/academic-core.js?v=222',
  '/js/student-profile-renderers.js?v=222',
  '/js/instructor-announcements.js?v=222',
  '/js/certificates.js?v=222',
  '/js/academic-import-manager.js?v=222',
  '/js/manual-grades.js?v=222',
  '/js/payment-manager.js?v=222',
  '/js/auth-ui.js?v=222',
  '/js/coupon-manager.js?v=222',
  '/js/instructor-panel.js?v=222',
  '/js/admin-panel.js?v=222',
  '/js/manager-panel.js?v=222'
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
