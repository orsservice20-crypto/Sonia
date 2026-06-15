// Sonia Service Worker — Cache hors ligne (network-first pour toujours avoir la dernière version)
const CACHE_NAME = "sonia-v2026-06-15-3";
const ASSETS = [
  "./",
  "./index.html",
];

// Installation : mise en cache des ressources essentielles
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activation : suppression de TOUS les anciens caches (force la mise à jour)
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Firebase et APIs externes → toujours réseau, jamais de cache
  if(url.hostname.includes("firebase") ||
     url.hostname.includes("googleapis.com") ||
     url.hostname.includes("gstatic.com") ||
     url.hostname.includes("seven.io") ||
     url.hostname.includes("allorigins")){
    return; // laisser passer normalement
  }

  // Navigation (chargement de la page) → NETWORK-FIRST : toujours essayer
  // d'obtenir la dernière version depuis le serveur en premier.
  if(e.request.mode === "navigate" || e.request.destination === "document"){
    e.respondWith(
      fetch(e.request, {cache: "no-store"}).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => {
        // Hors ligne uniquement → fallback sur le cache
        return caches.match(e.request).then(c => c || caches.match("./index.html"));
      })
    );
    return;
  }

  // Autres assets (polices, etc.) → cache d'abord, réseau en secours
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200 && resp.type !== "opaque"){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

// Permet de forcer l'activation immédiate du nouveau SW via un message depuis la page
self.addEventListener("message", e => {
  if(e.data === "SKIP_WAITING") self.skipWaiting();
});
