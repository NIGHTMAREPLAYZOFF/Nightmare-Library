
/**
 * Service Worker for Offline Support
 * Caches assets and enables offline reading
 */

const CACHE_NAME = 'nightmare-library-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/frontend/dashboard.html',
    '/frontend/reader.html',
    '/frontend/styles/main.css',
    '/frontend/styles/reader.css',
    '/frontend/scripts/main.js',
    '/frontend/scripts/reader.js',
    '/frontend/scripts/dom-helpers.js',
    '/frontend/scripts/fuzzy-search.js',
    '/frontend/scripts/sanitizer.js',
    '/frontend/assets/favicon.svg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then(response => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/frontend/dashboard.html');
                }
            })
    );
});
