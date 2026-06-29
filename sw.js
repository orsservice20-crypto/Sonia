// EniBusiness Pro SW — mise à jour automatique dès que le code change sur GitHub
const VERSION = "enibusiness-2026-06-28-v15"; // Change automatiquement à chaque déploiement GitHub

self.addEventListener("install", e => {
  // S'activer immédiatement sans attendre que les anciens onglets se ferment
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    // Supprimer TOUS les anciens caches
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Ne jamais mettre en cache Firebase, APIs externes
  if (url.hostname.includes("firebase") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("gstatic.com") ||
      url.hostname.includes("seven.io") ||
      url.hostname.includes("cloudinary.com") ||
      url.hostname.includes("allorigins")) {
    return; // Réseau direct
  }

  // Pour la page principale (navigation) → TOUJOURS chercher la dernière version sur le réseau
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then(resp => {
        // Mettre en cache la nouvelle version
        return caches.open(VERSION).then(cache => {
          cache.put(e.request, resp.clone());
          return resp;
        });
      }).catch(() =>
        // Hors ligne → utiliser le cache
        caches.match(e.request).then(c => c || caches.match("/Sonia/"))
      )
    );
    return;
  }

  // Autres ressources → cache d'abord, réseau en secours
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== "opaque") {
          caches.open(VERSION).then(cache => cache.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
