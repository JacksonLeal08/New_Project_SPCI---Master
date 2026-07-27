const CACHE_NAME = 'spci-pwa-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.svg',
  '/icons/omega-icon.svg',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo-omg.png',
  '/login-bg.png',
];

// Instalação do Service Worker e cache estático
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cache inicial v3 carregado.');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.warn('[Service Worker] Erro no cache install:', err))
  );
  self.skipWaiting();
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptador de requisições seguro (Network First para rotas dinâmicas do Next.js)
self.addEventListener('fetch', (event) => {
  // Apenas intercepta requisições locais GET
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);

  // Ignora APIs e rotas internas do Next.js no cache rígido para evitar erros offline no dev/prod
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response('', { status: 404, statusText: 'Offline' });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        }).catch(console.warn);

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        return new Response('Rede indisponível.', { status: 503, statusText: 'Offline' });
      })
  );
});
