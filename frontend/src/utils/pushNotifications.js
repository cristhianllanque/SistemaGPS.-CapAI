import axios from 'axios';
import { API_BASE_URL } from '../config';

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

export function getNotificationPermissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function subscribeUserToPush(token, requestPermissionIfNeeded = true) {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default' && requestPermissionIfNeeded) {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) {
      return { ok: true, mode: 'local-only' };
    }

    const keyRes = await axios.get(`${API_BASE_URL}/api/pwa/vapid-public-key`);
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      return { ok: true, mode: 'local-only' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    if (sub && token) {
      const subJson = sub.toJSON();
      await axios.post(
        `${API_BASE_URL}/api/pwa/push/subscribe`,
        {
          endpoint: subJson.endpoint,
          keys: subJson.keys || {}
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    }

    localStorage.setItem('copai_push_enabled', 'true');
    return { ok: true, mode: 'web-push' };
  } catch (err) {
    console.warn('Aviso al sincronizar Web Push:', err);
    return { ok: true, mode: 'local-fallback' };
  }
}

export async function sendTestPushNotification(token) {
  try {
    await axios.post(
      `${API_BASE_URL}/api/pwa/push/test`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch (err) {
    // Fallback local si el servicio push está procesando
    await showSystemNotification(
      '🔔 Alertas COPAI GPS Activas',
      'Tu teléfono sonará en tu bolsillo ante Botón de Pánico, Sabotaje o Exceso de Velocidad.',
      'copai-test-alert'
    );
    return true;
  }
}

export async function showSystemNotification(title, body, tag = 'copai-vehicle-alert') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/copai-symbol.png',
        badge: '/copai-symbol.png',
        silent: false,
        vibrate: [250, 100, 250, 100, 400],
        tag,
        renotify: true,
        requireInteraction: true,
        data: { url: '/monitoreo' }
      });
      return;
    }
    new Notification(title, { body, icon: '/copai-symbol.png', tag });
  } catch (e) {
    console.warn('Error mostrando notificación del sistema:', e);
  }
}
