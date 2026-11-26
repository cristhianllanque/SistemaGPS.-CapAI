// ==============================================================================
// Service Worker Oficial de COPAI Telematics GPS & PWA Multi-Tenant
// Gestión de Cache Inteligente, Soporte Standalone y Notificaciones Push
// ==============================================================================

const CACHE_NAME = 'copai-pwa-v2';

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
    silent: false, // Garantiza reproducción del sonido de notificación nativo del teléfono (iOS y Android)
    vibrate: [500, 120, 500, 120, 700, 120, 900],
    // En iOS Safari WebKit, usar un tag único por evento garantiza que cada alerta nueva suene y encienda la pantalla bloqueada
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
    self.registration.showNotification(data.title, options)
  );
});

// 4. Clic en la Notificación (Lleva al usuario directo a la unidad en el mapa y activa la sirena)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/monitoreo';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta, le avisamos para que active sirena + modal central y la enfocamos
      for (let client of windowClients) {
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
      // Si está cerrada, abrimos la app con parámetro alerta=1 para disparar el modal y la sirena al entrar
      if (clients.openWindow) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        return clients.openWindow(`${targetUrl}${sep}alerta=1`);
      }
    })
  );
});
