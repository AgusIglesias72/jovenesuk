/* Service worker de Jóvenes en UK — PWA segura.
   Reglas: solo GET same-origin. Nunca toca datos/auth. Nunca cachea HTML
   de páginas de la app (salvo /offline). Navegaciones network-first con
   fallback offline; los assets propios de la PWA (iconos y fuentes)
   cache-first con revalidación en segundo plano.

   Por qué NO cachea /_next/static ni "todo lo que tenga extensión": los
   chunks de Next ya vienen con hash en el nombre y Cache-Control immutable,
   así que el navegador los guarda solo; duplicarlos acá sumaba un juego
   completo de chunks al Cache Storage por cada deploy y no se purgaba nunca.
   Con /icons/ y /fonts/ el universo cacheable es finito (6 archivos hoy) y
   MAX_ENTRIES lo mantiene acotado ante cualquier agregado futuro.

   VERSION: bumpear a mano al cambiar /offline o este archivo. Al activarse
   una versión nueva se borran TODAS las cachés anteriores y se vuelve a
   precachear /offline, así que un solo bump purga lo viejo. */

const VERSION = "juk-v2";
const STATIC_CACHE = "juk-static-" + VERSION;
const OFFLINE_URL = "/offline";
const MAX_ENTRIES = 40;

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
  return pathname.startsWith("/icons/") || pathname.startsWith("/fonts/");
}

/* cache.keys() devuelve en orden de inserción: borrar del principio alcanza
   como poda, no hace falta un LRU real para un set de assets fijo. */
function trimCache(cache) {
  return cache.keys().then((keys) => {
    if (keys.length <= MAX_ENTRIES) return undefined;
    return Promise.all(
      keys.slice(0, keys.length - MAX_ENTRIES).map((key) => cache.delete(key))
    );
  });
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
                event.waitUntil(
                  cache
                    .put(request, response.clone())
                    .then(() => (cached ? undefined : trimCache(cache)))
                );
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
