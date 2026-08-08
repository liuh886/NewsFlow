const ASSET_VERSION = '2.10.0';
const CACHE_NAME = 'newsflow-editorial-governance-v2.10.0';
const NETWORK_TIMEOUT_MS = 5000;
const versioned = (path) => `${path}?v=${ASSET_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  versioned('./styles.css'),
  versioned('./polish.css'),
  versioned('./edition-layer.css'),
  versioned('./magazine-polish.css'),
  versioned('./reading-surface.css'),
  versioned('./account-integration.css'),
  versioned('./editorial-mode.css'),
  versioned('./review-game.css'),
  versioned('./editorial-governance.css'),
  versioned('./startup-resilience.js'),
  versioned('./editorial-app.js'),
  versioned('./polish.js'),
  versioned('./edition-layer.js'),
  versioned('./magazine-polish.js'),
  versioned('./reading-surface.js'),
  versioned('./supabase-feedback.js'),
  versioned('./membership-config.js'),
  versioned('./account-integration.js'),
  versioned('./review-game.js'),
  versioned('./editorial-governance.js'),
  versioned('./editorial-office.js'),
  './icon.svg',
  './manifest.webmanifest',
  './data/topics.json',
  './data/news.json',
  './data/edition.json',
  './data/issues.json',
  './data/storylines.json',
  './data/source-registry.json',
  './data/editorial-reactions.json',
  './data/supabase-config.json',
  './data/data-status.json',
  './data/governance-status.json'
];

const fetchWithTimeout = (request) => fetch(request, {
  signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS)
});

const cacheResponse = async (cache, request, response) => {
  if (response?.ok) await cache.put(request, response.clone());
  return response;
};

const warmAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async (path) => {
    try {
      const request = new Request(path, { cache: 'reload' });
      const response = await fetchWithTimeout(request);
      if (response.ok) await cache.put(request, response);
    } catch {
      // A missed optional asset must not block activation.
    }
  }));
};

const networkFirst = async (request, fallbackRequest = request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (!response.ok) throw new Error(`Network response: ${response.status}`);
    return await cacheResponse(cache, request, response);
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackRequest)) || Response.error();
  }
};

const staleWhileRevalidate = (event) => {
  const request = event.request;
  const networkUpdate = caches.open(CACHE_NAME)
    .then((cache) => fetchWithTimeout(request).then((response) => cacheResponse(cache, request, response)))
    .catch(() => null);

  event.waitUntil(networkUpdate.then(() => undefined));
  return caches.match(request).then(async (cached) => cached || (await networkUpdate) || Response.error());
};

self.addEventListener('install', (event) => {
  event.waitUntil(warmAppShell());
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
  if (/\.(?:js|css)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});