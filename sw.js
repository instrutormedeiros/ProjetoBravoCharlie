/* sw.js — Service Worker V40 (Styled footer)
   - Cache-then-network strategy
*/
const CACHE_NAME = 'pbc-static-v224';
const PRECACHE_URLS = [
  '/', 
  '/index.html',
  '/style.css?v=224',
  '/tools_logic.js?v=224',
  '/firebase-init.js?v=224',
  '/app_final.js?v=224',
  '/data.js',
  '/quizzes.js',
  '/course.js',
  '/js/app-utils.js?v=224',
  '/js/data/module-media-assets.js?v=224',
  '/js/data/student-resources.js?v=224',
  '/js/library-manager.js?v=224',
  '/js/feedback-manager.js?v=224',
  '/js/student-experience.js?v=224',
  '/js/student-pages.js?v=224',
  '/js/course-navigation.js?v=224',
  '/js/training-modes.js?v=224',
  '/js/narrated-audio.js?v=224',
  '/js/module-media-renderer.js?v=224',
  '/js/module-loader.js?v=224',
  '/js/academic-core.js?v=224',
  '/js/student-profile-renderers.js?v=224',
  '/js/instructor-announcements.js?v=224',
  '/js/certificates.js?v=224',
  '/js/academic-import-manager.js?v=224',
  '/js/manual-grades.js?v=224',
  '/js/payment-manager.js?v=224',
  '/js/auth-ui.js?v=224',
  '/js/coupon-manager.js?v=224',
  '/js/instructor-panel.js?v=224',
  '/js/admin-panel.js?v=224',
  '/js/manager-panel.js?v=224'
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
