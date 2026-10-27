/**
 * CALORA Service Worker
 * Enables offline caching, PWA installation, and offline draft queue sync.
 */

const CACHE_NAME = "calora-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/static/manifest.json",
  "/static/favicon.svg",
  "/static/css/app.css",
  "/static/js/offline_database.js",
  "/static/js/app.js",
  "/static/js/dashboard.js",
  "/static/js/food_log.js",
  "/static/js/history.js",
  "/static/js/recipes.js",
  "/static/js/progress.js",
  "/static/js/profile.js",
  "/static/js/assistant.js",
  "/static/js/wellness_workouts.js",
  "/static/js/gym_partner.js",
  "/static/js/admin.js",
  "/static/offline.html"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Some static assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network first for API, cache first with fallback for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // For API calls: Network first, never store stale POST/PUT requests in cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: "offline",
            message: "You are currently offline. Actions will be synced when connection is restored."
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // For pages & assets: Stale-while-revalidate or offline fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/static/offline.html");
        }
      });
    })
  );
});
