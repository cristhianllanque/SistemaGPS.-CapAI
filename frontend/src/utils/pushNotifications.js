import axios from 'axios';
import { API_BASE_URL } from '../config';
import { siren } from './sound';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function doesSubscriptionMatchVapidKey(sub, expectedKeyBytes) {
  try {
    const currentBuffer = sub?.options?.applicationServerKey;
    if (!currentBuffer) return false;
    const currentBytes = new Uint8Array(currentBuffer);
    if (currentBytes.length !== expectedKeyBytes.length) return false;
    for (let i = 0; i < currentBytes.length; i += 1) {
      if (currentBytes[i] !== expectedKeyBytes[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function getReadyServiceWorkerRegistration(timeoutMs = 3000) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    }
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(reg || null), timeoutMs));
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

/**
 * Devuelve `'granted'` ÚNICAMENTE cuando:
 * 1. El navegador/dispositivo soporta notificaciones y tiene permiso concedido (`Notification.permission === 'granted'`),
 * 2. El usuario no desactivó la campana (`copai_push_enabled !== 'false'`), y
 * 3. El servidor confirmó el registro Push de este dispositivo (`copai_push_server_synced === 'true'`).
 * En cualquier otro caso devuelve `'default'`, `'denied'` o `'unsupported'` (la campana se mantiene en PLOMO).
 */
export function getNotificationPermissionState() {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  const userPreference = localStorage.getItem('copai_push_enabled');
  const serverSynced = localStorage.getItem('copai_push_server_synced') === 'true';

  if (userPreference === 'false') {
    return 'default';
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  if (Notification.permission === 'granted' && serverSynced) {
    return 'granted';
  }

  return 'default';
}

/**
 * Desactiva o desvincula las notificaciones Push de este dispositivo en el servidor.
 * - Si `preservePreference` es `true` (ej. al cerrar sesión para cambiar de cuenta),
 *   desvincula el teléfono en la base de datos sin forzar a 'false' la preferencia del usuario.
 * - Si `preservePreference` es `false` (cuando el usuario toca la campana para apagarla),
 *   la pone en PLOMO (`copai_push_enabled = 'false'`).
 */
export async function unsubscribeUserFromPush(token, options = {}) {
  const { preservePreference = false } = options;

  if (!preservePreference) {
    localStorage.setItem('copai_push_enabled', 'false');
  }
  localStorage.setItem('copai_push_server_synced', 'false');
  siren.stop();
  siren.setKeepAlive(false);

  let endpoint = localStorage.getItem('copai_push_endpoint') || null;
  try {
    const reg = await getReadyServiceWorkerRegistration(2000);
    if (reg && reg.pushManager) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint || endpoint;
        if (!preservePreference) {
          await sub.unsubscribe();
        }
      }
    }
  } catch {}

  if (token) {
    try {
      await axios.post(
        `${API_BASE_URL}/api/pwa/push/unsubscribe`,
        { endpoint },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
    } catch {}
  }

  if (!preservePreference) {
    localStorage.removeItem('copai_push_endpoint');
  }

  return { ok: true, active: false };
}

/**
 * Solicita permiso real al sistema operativo, registra el dispositivo en el servidor para la cuenta actual
 * y SOLO marca la campana en VERDE si el sistema concedió permiso y el servidor confirmó el registro.
 */
export async function subscribeUserToPush(token, requestPermissionIfNeeded = true) {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    localStorage.setItem('copai_push_server_synced', 'false');
    return { ok: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default' && requestPermissionIfNeeded) {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
  }

  if (permission !== 'granted') {
    localStorage.setItem('copai_push_server_synced', 'false');
    return { ok: false, reason: permission };
  }

  if (!token) {
    localStorage.setItem('copai_push_server_synced', 'false');
    return { ok: false, reason: 'no_token' };
  }

  try {
    const reg = await getReadyServiceWorkerRegistration(3000);
    if (!reg || !reg.pushManager) {
      localStorage.setItem('copai_push_server_synced', 'false');
      return { ok: false, reason: 'push_manager_unavailable' };
    }

    const keyRes = await axios.get(`${API_BASE_URL}/api/pwa/vapid-public-key`, { timeout: 6000 });
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      localStorage.setItem('copai_push_server_synced', 'false');
      return { ok: false, reason: 'no_vapid_key' };
    }

    const expectedKeyBytes = urlBase64ToUint8Array(publicKey);
    const savedVapidKey = localStorage.getItem('copai_vapid_public_key');
    let sub = await reg.pushManager.getSubscription();

    if (
      sub &&
      (savedVapidKey !== publicKey || !doesSubscriptionMatchVapidKey(sub, expectedKeyBytes))
    ) {
      try {
        await sub.unsubscribe();
      } catch {}
      sub = null;
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKeyBytes
      });
    }

    if (!sub) {
      localStorage.setItem('copai_push_server_synced', 'false');
      return { ok: false, reason: 'subscription_failed' };
    }

    const subJson = sub.toJSON();
    const subRes = await axios.post(
      `${API_BASE_URL}/api/pwa/push/subscribe`,
      {
        endpoint: subJson.endpoint,
        keys: subJson.keys || {}
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 6000
      }
    );

    if (subRes.data?.status !== 'subscribed') {
      localStorage.setItem('copai_push_server_synced', 'false');
      return { ok: false, reason: 'server_rejected' };
    }

    localStorage.setItem('copai_vapid_public_key', publicKey);
    localStorage.setItem('copai_push_endpoint', subJson.endpoint || '');
    localStorage.setItem('copai_push_enabled', 'true');
    localStorage.setItem('copai_push_server_synced', 'true');
    siren.setKeepAlive(true);

    if (requestPermissionIfNeeded) {
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([250, 90, 250, 90, 400]);
        }
      } catch {}
    }

    return { ok: true, mode: 'web-push', endpoint: subJson.endpoint };
  } catch (err) {
    console.warn('No se pudo completar el registro Web Push en este entorno:', err);
    localStorage.setItem('copai_push_server_synced', 'false');
    return { ok: false, reason: 'push_unavailable' };
  }
}

export async function sendTestPushNotification(token, endpoint = null) {
  const targetEndpoint = endpoint || localStorage.getItem('copai_push_endpoint') || null;
  if (!token) return false;
  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/pwa/push/test`,
      { endpoint: targetEndpoint },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 6000
      }
    );
    return (res.data?.sent || 0) > 0;
  } catch {
    return false;
  }
}

export async function showSystemNotification(title, body, tag = 'copai-vehicle-alert') {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('copai_push_enabled') === 'false') return;

  const vibrationPattern = [600, 150, 600, 150, 800, 150, 1000];

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(vibrationPattern);
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      const reg = await getReadyServiceWorkerRegistration(2500);
      if (reg && typeof reg.showNotification === 'function' && 'Notification' in window && Notification.permission === 'granted') {
        await reg.showNotification(title, {
          body,
          icon: '/copai-symbol.png',
          badge: '/copai-symbol.png',
          silent: false,
          vibrate: vibrationPattern,
          tag: `${tag}-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          data: { url: '/monitoreo' }
        });
        return;
      }
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/copai-symbol.png',
        tag: `${tag}-${Date.now()}`,
        vibrate: vibrationPattern
      });
    }
  } catch (e) {
    console.warn('Aviso mostrando notificación del sistema:', e);
  }
}
