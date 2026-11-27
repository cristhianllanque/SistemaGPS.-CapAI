// ==============================================================================
// Service Worker Oficial de COPAI Telematics GPS & PWA Multi-Tenant
// Gestión de Cache Inteligente, Soporte Standalone y Notificaciones Push
// ==============================================================================

const CACHE_NAME = 'copai-pwa-v3';

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
    url: '/monitoreo'
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
    silent: false, // Sonido de notificación nativo del teléfono (Android e iOS)
    vibrate: data.vibrate || [600, 150, 600, 150, 800, 150, 1000],
    tag: `${data.tag || 'copai-vehicle-alert'}-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open', title: '🚨 Abrir y Atender Ahora' }
    ],
    data: {
      url: data.url || '/monitoreo'
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          try {
            client.postMessage({
              type: 'COPAI_PUSH_RECEIVED',
              title: data.title,
              body: data.body,
              tag: data.tag || '',
              url: data.url || '/monitoreo'
            });
          } catch (e) {}
        }
      })
    ])
  );
});

// 4. Clic en la Notificación (Lleva al usuario directo a la unidad en el mapa y activa la sirena)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/monitoreo';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            try {
              client.postMessage({ type: 'COPAI_NOTIFICATION_CLICK', url: targetUrl });
            } catch (e) {}
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        return clients.openWindow(`${targetUrl}${sep}alerta=1`);
      }
    })
  );
});
