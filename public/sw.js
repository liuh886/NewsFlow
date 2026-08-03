const CACHE_NAME = 'newsflow-editorial-v2.2.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './polish.css',
  './editorial-app.js',
  './polish.js',
  './icon.svg',
  './manifest.webmanifest',
  './data/topics.json',
  './data/news.json',
  './data/ai_digest.json'
];

const cacheResponse = async (cache, request, response) => {
  if (response?.ok) await cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request, fallbackRequest = request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    return await cacheResponse(cache, request, await fetch(request));
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackRequest)) || Response.error();
  }
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

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkUpdate = fetch(event.request)
        .then((response) => cacheResponse(cache, event.request, response))
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkUpdate.then(() => undefined));
        return cached;
      }

      return (await networkUpdate) || Response.error();
    })
  );
});
