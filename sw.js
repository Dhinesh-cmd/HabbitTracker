/**
 * My Daily Habit Tracker - Service Worker
 * Handles offline caching and fast load times.
 */

const CACHE_NAME = "habit-tracker-v2";
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
  console.log("[SW] Installed");
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
  console.log("[SW] Activated");
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

// Fetch Event - Network First, Cache Fallback
self.addEventListener("fetch", (e) => {
  // Avoid caching non-GET queries or extension triggers (like chrome-extension://)
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // If we got a valid response, cache it and return it
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), try to serve from cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          console.warn("[Service Worker] Fetch failed offline. Resource unavailable: ", e.request.url);
        });
      })
  );
});

// Background Push Event
self.addEventListener("push", (e) => {
  console.log("[SW] Push Received");
  let data = { title: "My Habit Tracker", body: "Reminder Alert!" };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: "My Habit Tracker", body: e.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event
self.addEventListener("notificationclick", (e) => {
  console.log("[SW] Notification Clicked");
  e.notification.close();

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus if window already exists
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Or open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html");
      }
    })
  );
});

// Notification Close Event
self.addEventListener("notificationclose", (e) => {
  console.log("[SW] Notification Closed");
});
