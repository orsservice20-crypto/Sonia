// EniBusiness Pro SW — la version du cache est calculée automatiquement à partir du
// contenu réel de la page (Index.html), donc plus besoin d'éditer une chaîne à la main
// à chaque déploiement : republier suffit, le nouveau cache est créé tout seul.

function hashString(src){
  let h = 5381;
  for (let i = 0; i < src.length; i++) { h = ((h * 33) ^ src.charCodeAt(i)) >>> 0; }
  return "enibusiness-" + h.toString(36);
}

// Résolu une fois, au démarrage du service worker, à partir du contenu actuel de la page
// principale. Tant qu'aucune requête n'a encore abouti, on retombe sur un nom générique
// (les tout premiers appels avant la résolution utiliseront ce nom, sans conséquence
// puisque le cache sera de toute façon recréé au prochain redémarrage du SW).
let VERSION_PROMISE = fetch("./Index.html", { cache: "no-cache" })
  .then(r => r.text())
  .then(text => hashString(text))
  .catch(() => "enibusiness-fallback");

self.addEventListener("install", e => {
  // S'activer immédiatement sans attendre que les anciens onglets se ferment
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    VERSION_PROMISE.then(VERSION =>
      // Supprimer TOUS les anciens caches, sauf celui de la version actuelle
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
      )
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
        // Recalculer la version à partir de cette réponse fraîche, et mettre à jour le cache
        const cloned = resp.clone();
        cloned.text().then(text => {
          const freshVersion = hashString(text);
          VERSION_PROMISE = Promise.resolve(freshVersion);
          caches.open(freshVersion).then(cache => {
            cache.put(e.request, resp.clone());
            // Nettoyer les anciens caches dès qu'on détecte une nouvelle version
            caches.keys().then(keys =>
              Promise.all(keys.filter(k => k !== freshVersion).map(k => caches.delete(k)))
            );
          });
        }).catch(() => {});
        return resp;
      }).catch(() =>
        // Hors ligne → utiliser le cache
        VERSION_PROMISE.then(VERSION => caches.match(e.request)).then(c => c || caches.match("/Sonia/"))
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
          VERSION_PROMISE.then(VERSION => caches.open(VERSION)).then(cache => cache.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
