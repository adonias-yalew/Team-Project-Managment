const CACHE_NAME = "flowtask-static-v1";
const APP_SHELL = ["/", "/index.html"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

function isSupabaseRequest(url) {
  return (
    url.hostname.endsWith(".supabase.co") ||
    /\/(?:rest|auth|storage|functions|graphql)\/v1(?:\/|$)/i.test(url.pathname)
  );
}

function isCacheableResponse(response) {
  return response && response.status === 200 && response.type !== "opaque";
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // Cache quota or storage errors must not interfere with the network response.
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (MUTATING_METHODS.has(request.method)) return;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      let cache;
      try {
        cache = await caches.open(CACHE_NAME);
      } catch {
        return fetch(request);
      }

      if (request.mode === "navigate") {
        try {
          return await fetchAndCache(request, cache);
        } catch {
          try {
            return (
              (await cache.match("/index.html")) || (await cache.match("/")) || Response.error()
            );
          } catch {
            return Response.error();
          }
        }
      }

      try {
        const cached = await cache.match(request);
        if (cached) return cached;
      } catch {
        // Continue to the network if the cache cannot be read.
      }
      return fetchAndCache(request, cache);
    })(),
  );
});
