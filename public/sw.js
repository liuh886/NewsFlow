const CACHE_NAME = 'newsflow-editorial-v2.3.1-magazine-v2.4.1-mobile-reader-fix-1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './polish.css',
  './edition-layer.css',
  './magazine-polish.css',
  './editorial-app.js',
  './polish.js',
  './edition-layer.js',
  './magazine-polish.js',
  './language-polish.js',
  './supabase-feedback.js',
  './membership-config.js',
  './icon.svg',
  './manifest.webmanifest',
  './data/topics.json',
  './data/news.json',
  './data/ai_digest.json',
  './data/edition.json',
  './data/issues.json',
  './data/storylines.json',
  './data/supabase-config.json'
];

const cacheResponse = async (cache, request, response) => {
  if (response?.ok) await cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request, fallbackRequest = request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Network response: ${response.status}`);
    return await cacheResponse(cache, request, response);
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackRequest)) || Response.error();
  }
};

const staleWhileRevalidate = (event) => {
  const request = event.request;
  const networkUpdate = caches.open(CACHE_NAME)
    .then((cache) => fetch(request).then((response) => cacheResponse(cache, request, response)))
    .catch(() => null);

  event.waitUntil(networkUpdate.then(() => undefined));

  return caches.match(request).then(async (cached) => cached || (await networkUpdate) || Response.error());
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, './index.html'));
    return;
  }

  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event));
});
