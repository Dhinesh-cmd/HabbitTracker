/**
 * My Daily Habit Tracker - Service Worker
 * Handles offline caching and fast load times.
 */

const CACHE_NAME = "habit-tracker-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./history.html",
  "./stats.html",
  "./settings.html",
  "./css/style.css",
  "./css/history.css",
  "./css/stats.css",
  "./css/settings.css",
  "./js/storage.js",
  "./js/utils.js",
  "./js/app.js",
  "./js/history.js",
  "./js/stats.js",
  "./js/settings.js",
  "./manifest.json"
];

// Install Event - Caching Assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching files for offline accessibility.");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleaning Up Old Caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache: ", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache First, Network Fallback
self.addEventListener("fetch", (e) => {
  // Avoid caching non-GET queries or extension triggers (like chrome-extension://)
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately
        return cachedResponse;
      }

      // Fallback to fetch from internet network
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache new fetched resources dynamically
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Offline backup error fallback
        console.warn("[Service Worker] Fetch failed offline. Resource unavailable: ", e.request.url);
      });
    })
  );
});
