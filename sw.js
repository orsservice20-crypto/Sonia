// Sonia Service Worker — toujours la dernière version (network-first pour la page principale)
const CACHE_NAME = "sonia-cache-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Firebase et APIs externes → toujours réseau direct, jamais de cache
  if(url.hostname.includes("firebase") ||
     url.hostname.includes("googleapis.com") ||
     url.hostname.includes("gstatic.com") ||
     url.hostname.includes("seven.io") ||
     url.hostname.includes("allorigins")){
    return;
  }

  // Page principale (navigation) → toujours demander la dernière version au serveur
  if(e.request.mode === "navigate" || e.request.destination === "document"){
    e.respondWith(
      fetch(e.request, {cache: "no-store"}).catch(() =>
        caches.match(e.request).then(c => c || caches.match("./index.html"))
      )
    );
    return;
  }

  // Autres ressources (polices, etc.) → réseau d'abord, cache en secours hors-ligne
  e.respondWith(
    fetch(e.request).then(resp => {
      if(resp && resp.status === 200 && resp.type !== "opaque"){
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
