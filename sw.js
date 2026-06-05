// Sonia Service Worker — Cache hors ligne
const CACHE_NAME = "sonia-v1";
const ASSETS = [
  "./",
  "./index.html",
  "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap",
];

// Installation : mise en cache des ressources essentielles
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Interception des requêtes : cache-first pour les assets, network-first pour Firebase
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Firebase et APIs → toujours réseau
  if(url.hostname.includes("firebase") ||
     url.hostname.includes("googleapis.com") ||
     url.hostname.includes("seven.io") ||
     url.hostname.includes("allorigins")){
    return; // laisser passer normalement
  }

  // Assets de l'app → cache d'abord, réseau en fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200 && resp.type !== "opaque"){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Hors ligne et pas en cache : retourner la page principale
        if(e.request.mode === "navigate"){
          return caches.match("./index.html") || caches.match("./");
        }
      });
    })
  );
});

