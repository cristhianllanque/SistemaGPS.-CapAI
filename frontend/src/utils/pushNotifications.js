import axios from 'axios';
import { API_BASE_URL, checkIsNativeApp } from '../config';

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

function isAndroidEnvironment() {
  if (typeof window === 'undefined') return false;
  if (checkIsNativeApp()) return true;
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
  return /android/.test(ua);
}

export function getNotificationPermissionState() {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }
  if ('Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (isAndroidEnvironment() && localStorage.getItem('copai_push_enabled') === 'true' && Notification.permission !== 'denied') {
      return 'granted';
    }
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }
  // En el APK nativo de Android (Google Play Store / Android WebView), window.Notification
  // no existe porque es una App nativa y no un navegador web. Soportamos alertas nativas de la App:
  if (isAndroidEnvironment()) {
    return localStorage.getItem('copai_push_enabled') === 'true' ? 'granted' : 'default';
  }
  return 'unsupported';
}

export async function subscribeUserToPush(token, requestPermissionIfNeeded = true) {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  const hasWebNotification = 'Notification' in window;
  const isAndroidApp = isAndroidEnvironment();

  if (!hasWebNotification && !isAndroidApp) {
    return { ok: false, reason: 'unsupported' };
  }

  if (hasWebNotification) {
    let permission = Notification.permission;
    if (permission === 'default' && requestPermissionIfNeeded) {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = Notification.permission;
      }
    }

    if (permission !== 'granted' && !isAndroidApp) {
      return { ok: false, reason: permission };
    }
    if (permission === 'denied' && !checkIsNativeApp()) {
      return { ok: false, reason: 'denied' };
    }
  }

  // En APK nativo Android o dispositivo Android: activar vibración háptica de confirmación y persistir estado
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate && requestPermissionIfNeeded) {
      navigator.vibrate([180, 80, 220]);
    }
  } catch {}

  localStorage.setItem('copai_push_enabled', 'true');

  if (!('serviceWorker' in navigator)) {
    return { ok: true, mode: checkIsNativeApp() ? 'native-android' : 'local-only' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg || !reg.pushManager) {
      return { ok: true, mode: checkIsNativeApp() ? 'native-android' : 'local-only' };
    }

    const keyRes = await axios.get(`${API_BASE_URL}/api/pwa/vapid-public-key`);
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      return { ok: true, mode: checkIsNativeApp() ? 'native-android' : 'local-only' };
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

    return { ok: true, mode: checkIsNativeApp() ? 'native-android' : 'web-push' };
  } catch (err) {
    console.warn('Aviso al sincronizar Web Push:', err);
    return { ok: true, mode: checkIsNativeApp() ? 'native-android' : 'local-fallback' };
  }
}

export async function sendTestPushNotification(token) {
  try {
    if (!checkIsNativeApp()) {
      await axios.post(
        `${API_BASE_URL}/api/pwa/push/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    }
  } catch {}

  // Fallback local / APK Nativo Android
  await showSystemNotification(
    '🔔 Alertas COPAI GPS Activas',
    'Tu aplicativo sonará y vibrará ante Botón de Pánico, Sabotaje o Exceso de Velocidad.',
    'copai-test-alert'
  );
  return true;
}

export async function showSystemNotification(title, body, tag = 'copai-vehicle-alert') {
  if (typeof window === 'undefined') return;

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([250, 100, 250, 100, 400]);
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
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
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/copai-symbol.png', tag });
    }
  } catch (e) {
    console.warn('Aviso mostrando notificación del sistema:', e);
  }
}

