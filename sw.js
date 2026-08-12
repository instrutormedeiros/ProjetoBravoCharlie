/* sw.js — Service Worker V40 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v221';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=221',
  '/tools_logic.js?v=221',
  '/firebase-init.js?v=221',
  '/app_final.js?v=221',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/js/app-utils.js?v=221',
  '/js/data/module-media-assets.js?v=221',
  '/js/data/student-resources.js?v=221',
  '/js/library-manager.js?v=221',
  '/js/feedback-manager.js?v=221',
  '/js/student-experience.js?v=221',
  '/js/student-pages.js?v=221',
  '/js/course-navigation.js?v=221',
  '/js/training-modes.js?v=221',
  '/js/narrated-audio.js?v=221',
  '/js/module-media-renderer.js?v=221',
  '/js/module-loader.js?v=221',
  '/js/academic-core.js?v=221',
  '/js/student-profile-renderers.js?v=221',
  '/js/instructor-announcements.js?v=221',
  '/js/certificates.js?v=221',
  '/js/academic-import-manager.js?v=221',
  '/js/manual-grades.js?v=221',
  '/js/payment-manager.js?v=221',
  '/js/auth-ui.js?v=221',
  '/js/coupon-manager.js?v=221',
  '/js/instructor-panel.js?v=221',
  '/js/admin-panel.js?v=221',
  '/js/manager-panel.js?v=221'
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
