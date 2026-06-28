const CACHE_VERSION = 'mizan-al-hikmah-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/favicon.png',
    '/manifest.webmanifest',
];

const DATA_URLS = [
    '/data/mizan_al_hikmah_vol1.json',
    '/data/mizan_al_hikmah_vol2.json',
    '/data/mizan_al_hikmah_vol3.json',
    '/data/mizan_al_hikmah_vol4.json',
    '/data/questions_index.json',
];

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
        cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const fresh = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);

    return cached || fresh;
}

self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(APP_SHELL_CACHE).then(cache => cache.addAll(APP_SHELL_URLS)),
            caches.open(DATA_CACHE).then(cache => cache.addAll(DATA_URLS)),
        ]).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames =>
                Promise.all(
                    cacheNames
                        .filter(cacheName => !cacheName.startsWith(CACHE_VERSION))
                        .map(cacheName => caches.delete(cacheName))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (DATA_URLS.includes(url.pathname)) {
        event.respondWith(cacheFirst(request, DATA_CACHE));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(APP_SHELL_CACHE).then(cache => cache.put('/index.html', copy));
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    if (url.pathname.startsWith('/assets/') || APP_SHELL_URLS.includes(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
    }
});
