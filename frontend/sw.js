/**
 * Service Worker for Nightmare Library
 * Provides offline caching for reading mode
 */

const CACHE_NAME = 'nightmare-library-v1';
const STATIC_CACHE = 'nightmare-static-v1';
const BOOK_CACHE = 'nightmare-books-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/frontend/dashboard.html',
  '/frontend/reader.html',
  '/frontend/styles/main.css',
  '/frontend/styles/reader.css',
  '/frontend/scripts/main.js',
  '/frontend/scripts/reader.js',
  '/frontend/scripts/theme.js',
  '/frontend/scripts/dom-helpers.js',
  '/frontend/scripts/ai-features.js',
  '/frontend/assets/favicon.svg',
  '/frontend/assets/broken-image.svg'
];

// API endpoints that should be cached
const CACHEABLE_API = [
  '/api/books/list',
  '/api/shelves/list',
  '/api/settings/get'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('nightmare-') && 
                     name !== CACHE_NAME && 
                     name !== STATIC_CACHE && 
                     name !== BOOK_CACHE;
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle book content requests (for offline reading)
  if (url.pathname.startsWith('/api/books/content/')) {
    event.respondWith(
      caches.open(BOOK_CACHE)
        .then((cache) => {
          return cache.match(event.request)
            .then((cached) => {
              if (cached) {
                console.log('[SW] Serving book from cache:', url.pathname);
                return cached;
              }

              return fetch(event.request)
                .then((response) => {
                  if (response.ok) {
                    cache.put(event.request, response.clone());
                  }
                  return response;
                });
            });
        })
    );
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset) ||
      url.pathname.startsWith('/frontend/')) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) {
            // Return cached but also update in background
            fetch(event.request)
              .then((response) => {
                if (response.ok) {
                  caches.open(STATIC_CACHE)
                    .then((cache) => cache.put(event.request, response));
                }
              })
              .catch(() => { /* Ignore network errors for background update */ });
            return cached;
          }

          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(event.request, response.clone()));
              }
              return response;
            });
        })
    );
    return;
  }

  // Handle cacheable API requests
  if (CACHEABLE_API.some(api => url.pathname === api)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => {
              return cache.match(event.request);
            });
        })
    );
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Message event - handle cache management commands
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'CACHE_BOOK':
      // Cache a specific book for offline reading
      if (event.data.bookId) {
        const bookUrl = `/api/books/content/${event.data.bookId}`;
        caches.open(BOOK_CACHE)
          .then((cache) => {
            fetch(bookUrl)
              .then((response) => {
                if (response.ok) {
                  cache.put(bookUrl, response);
                  event.ports[0]?.postMessage({ success: true, bookId: event.data.bookId });
                }
              })
              .catch((error) => {
                event.ports[0]?.postMessage({ success: false, error: error.message });
              });
          });
      }
      break;

    case 'UNCACHE_BOOK':
      // Remove a book from cache
      if (event.data.bookId) {
        const bookUrl = `/api/books/content/${event.data.bookId}`;
        caches.open(BOOK_CACHE)
          .then((cache) => {
            cache.delete(bookUrl)
              .then((deleted) => {
                event.ports[0]?.postMessage({ success: deleted, bookId: event.data.bookId });
              });
          });
      }
      break;

    case 'GET_CACHED_BOOKS':
      // Get list of cached books
      caches.open(BOOK_CACHE)
        .then((cache) => {
          cache.keys()
            .then((requests) => {
              const bookIds = requests
                .map(req => new URL(req.url).pathname)
                .filter(path => path.startsWith('/api/books/content/'))
                .map(path => path.replace('/api/books/content/', ''));
              event.ports[0]?.postMessage({ success: true, bookIds });
            });
        });
      break;

    case 'CLEAR_BOOK_CACHE':
      // Clear all cached books
      caches.delete(BOOK_CACHE)
        .then((deleted) => {
          event.ports[0]?.postMessage({ success: deleted });
        });
      break;

    case 'GET_CACHE_SIZE':
      // Get total cache size
      Promise.all([
        caches.open(STATIC_CACHE).then(c => c.keys()),
        caches.open(BOOK_CACHE).then(c => c.keys()),
        caches.open(CACHE_NAME).then(c => c.keys())
      ])
        .then(([staticKeys, bookKeys, apiKeys]) => {
          event.ports[0]?.postMessage({
            success: true,
            staticCount: staticKeys.length,
            bookCount: bookKeys.length,
            apiCount: apiKeys.length
          });
        });
      break;
  }
});

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncReadingProgress());
  }
});

async function syncReadingProgress() {
  // Get pending progress updates from IndexedDB
  // This would sync any reading progress made while offline
  console.log('[SW] Syncing reading progress...');
}
