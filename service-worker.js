const CACHE_NAME = 'creighton-registro-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './baby.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo cachear peticiones GET a nuestros propios archivos.
  // Todo lo demás (Firebase Auth, Firestore, Google APIs) pasa directo a la red,
  // sin interceptar, para no romper el login ni la sincronización en tiempo real.
  const isSameOrigin = url.origin === self.location.origin;
  const isGet = event.request.method === 'GET';

  if (!isSameOrigin || !isGet){
    return; // no respondWith => el navegador maneja la petición normalmente
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return fetch(event.request).then((response) => {
        // Solo guardamos en caché respuestas exitosas (200-299).
        // Si guardamos un error (404, etc.) por accidente, queda "pegado" para siempre.
        if (response && response.ok){
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin conexión: usamos lo cacheado si existe.
        return cached || Promise.reject('offline y sin caché para ' + event.request.url);
      });
    })
  );
});
