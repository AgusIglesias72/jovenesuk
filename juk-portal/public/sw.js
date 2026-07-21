/* Service worker de Jóvenes en UK — PWA segura.
   Reglas: solo GET same-origin. Nunca toca datos/auth. Nunca cachea HTML
   de páginas de la app (salvo /offline). Navegaciones network-first con
   fallback offline; assets estáticos cache-first (stale-while-revalidate). */

const VERSION = "juk-v1";
const STATIC_CACHE = "juk-static-" + VERSION;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isBypassedPath(pathname) {
  return (
    pathname.includes("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth")
  );
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/fonts/") ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(
      pathname
    )
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_e) {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (isBypassedPath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error())
      )
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response && response.ok && response.type === "basic") {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
