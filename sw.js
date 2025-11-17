/* sw.js - simple service worker */
const CACHE_NAME = 'bravocharlie-final-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/quizzes.js',
  '/course.js',
  '/app.js',
  '/firebase-init.js',
  '/manifest.json'
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', evt => evt.waitUntil(self.clients.claim()));
self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(caches.match(evt.request).then(c=>c||fetch(evt.request)));
});
