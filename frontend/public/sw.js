// ==============================================================================
// Service Worker Oficial de COPAI Telematics GPS & PWA Multi-Tenant
// Gestión de Cache Inteligente, Soporte Standalone y Notificaciones Push
// ==============================================================================

const CACHE_NAME = 'copai-pwa-v1';

// 1. Instalación del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activación y limpieza
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Notificaciones Push en Segundo Plano (Exceso de Velocidad, Botón de Pánico, Sabotaje)
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 ALERTA - Copai GPS',
    body: 'Notificación de telemetría y seguridad vehicular.',
    icon: '/copai-symbol.png',
    badge: '/copai-symbol.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/copai-symbol.png',
    badge: data.badge || '/copai-symbol.png',
    vibrate: [250, 100, 250, 100, 400],
    tag: data.tag || 'copai-vehicle-alert',
    renotify: true,
    requireInteraction: true, // Se mantiene visible en pantalla hasta que el usuario interactúe
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 4. Clic en la Notificación (Lleva al usuario directo a la unidad en el mapa)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta, la enfocamos y navegamos
      for (let client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Si está cerrada, abrimos la app en pantalla completa
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
