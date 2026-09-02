// Link Direto V22 - atualização de cache e carregamento fresco
const CACHE_NAME = 'link-direto-v22-nav-autoplay';

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './brand-icon-v193.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // Não deixa um ficheiro em falta bloquear a instalação inteira.
        await Promise.allSettled(
          CORE_ASSETS.map(asset => cache.add(new Request(asset, { cache: 'reload' })))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Páginas HTML: sempre tenta a versão online primeiro.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches.open(CACHE_NAME).then(cache =>
            cache.match('./index.html').then(cached => cached || Response.error())
          )
        )
    );
    return;
  }

  // Ficheiros do próprio projeto: rede primeiro para receber alterações logo.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.open(CACHE_NAME).then(cache => cache.match(event.request))
        )
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      for (const client of windows) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('./?v=22');
    })
  );
});
