// Nombre de la caché
const CACHE_NAME = 'wikifol-v1';

// Archivos a cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar el Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar el Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Devolver respuesta de cache si está disponible
        if (response) {
          return response;
        }
        
        // Clonar la petición
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          function(response) {
            // Verificar si la respuesta es válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            // Guardar en cache
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
    );
});

