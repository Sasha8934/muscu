// Service worker : garde l'application sur l'appareil pour qu'elle marche hors ligne (à la salle sans réseau).
//
// IMPORTANT : à chaque mise en ligne d'une nouvelle version, augmenter VERSION.
// C'est ce qui déclenche la mise à jour sur le téléphone et l'ordinateur.

const VERSION = "v1";
const CACHE_APP = `muscu-app-${VERSION}`;
const CACHE_PHOTOS = "muscu-photos"; // photos des exercices : gardées d'une version à l'autre

const FICHIERS_APP = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "polices/inter.css",
  "polices/inter-latin.woff2",
  "polices/inter-latin-ext.woff2",
  "data/corps.json",
  "js/app.js",
  "js/actions.js",
  "js/calculs.js",
  "js/donnees.js",
  "js/graphiques.js",
  "js/outils.js",
  "js/store.js",
  "js/ui.js",
  "js/vues/exercices.js",
  "js/vues/programme.js",
  "js/vues/progres.js",
  "js/vues/seances.js",
  "js/vues/semaine.js",
  "img/icones/icone-192.png",
  "img/icones/icone-512.png",
  "img/icones/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(FICHIERS_APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("muscu-app-") && k !== CACHE_APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Photos : prises dans l'appareil si déjà vues, sinon téléchargées puis gardées
  if (url.pathname.includes("/img/exos/")) {
    event.respondWith(
      caches.open(CACHE_PHOTOS).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }))),
    );
    return;
  }

  // Application : version de l'appareil d'abord (rapide et hors ligne), sinon le réseau
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).catch(() => caches.match("./"))),
  );
});
