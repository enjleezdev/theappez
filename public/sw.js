// public/sw.js
const CACHE_NAME = 'ez-inventory-cache-v1';
// IMPORTANT: Add the actual paths to your core assets once known.
// For Next.js, these paths will often include hashes and are best managed
// by a build tool like next-pwa. For a manual setup, start with key pages.
const urlsToCache = [
  '/',
  '/warehouses',
  '/manifest.json',
  '/logo.svg', // Your main SVG logo
  // Add other important, non-hashed public assets if any
  // Example (if you had a global stylesheet not processed by Next.js):
  // '/styles/globals.css'
];

// Install a service worker
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add known, unhashed assets.
        // For dynamically generated Next.js assets (_next/static),
        // a more sophisticated strategy or a plugin like next-pwa is needed for robust caching.
        return cache.addAll(urlsToCache)
          .catch(err => {
            console.error('Failed to cache initial URLs:', err);
            // Log individual URL failures if addAll fails
            urlsToCache.forEach(url => {
              cache.add(url).catch(e => console.warn(`Failed to cache ${url}:`, e));
            });
          });
      })
      .catch(err => {
        console.error('Failed to open cache:', err);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
          console.error('Fetch failed; returning offline page instead.', err);
          // Optionally, return a fallback offline page if the fetch fails
          // For example: return caches.match('/offline.html');
          // For now, just let the browser handle the fetch error
        });
      })
  );
});

// Update a service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
