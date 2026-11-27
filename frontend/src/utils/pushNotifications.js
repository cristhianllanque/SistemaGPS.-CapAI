import axios from 'axios';
import { API_BASE_URL, checkIsNativeApp } from '../config';
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

async function getReadyServiceWorkerRegistration(timeoutMs = 2500) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  // En el APK nativo Android (Capacitor WebView), evitar registrar Service Worker para no interceptar WebViewLocalServer
  if (checkIsNativeApp()) {
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
 * Devuelve `'granted'` cuando el usuario tiene la campana ACTIVADA (Verde),
 * o `'default'` / `'denied'` cuando la tiene DESACTIVADA (Plomo).
 * Si el usuario la dejó activa, permanece activa siempre entre sesiones.
 */
export function getNotificationPermissionState() {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  const userPreference = localStorage.getItem('copai_push_enabled');

  // Si el usuario explícitamente desactivó la campanita (plomo), respetar su decisión
  if (userPreference === 'false') {
    return 'default';
  }

  if ('Notification' in window) {
    if (Notification.permission === 'denied' && !checkIsNativeApp()) {
      return 'denied';
    }
    // En navegador Web / PWA (Android Chrome, iPhone Safari, PC), requiere permiso real + preferencia activa
    if (Notification.permission === 'granted') {
      if (userPreference === null) {
        localStorage.setItem('copai_push_enabled', 'true');
      }
      return 'granted';
    }
    // En APK Nativo Android (WebView), si el usuario ya activó la campana, mantenerla verde
    if (checkIsNativeApp() && userPreference === 'true') {
      return 'granted';
    }
    return Notification.permission;
  }

  // En APK Nativo Android donde window.Notification no está expuesto por el WebView
  if (checkIsNativeApp()) {
    return userPreference === 'true' ? 'granted' : 'default';
  }

  return 'unsupported';
}

/**
 * Desactiva las notificaciones y sirena en segundo plano (cambia la campana a color PLOMO).
 */
export async function unsubscribeUserFromPush(token) {
  localStorage.setItem('copai_push_enabled', 'false');
  siren.stop();
  siren.setKeepAlive(false);

  let endpoint = null;
  try {
    const reg = await getReadyServiceWorkerRegistration(2000);
    if (reg && reg.pushManager) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe();
      }
    }
  } catch {}

  if (token) {
    try {
      await axios.post(
        `${API_BASE_URL}/api/pwa/push/unsubscribe`,
        { endpoint },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {}
  }

  return { ok: true, active: false };
}

/**
 * Activa las notificaciones, vibración y sirena de bolsillo (cambia la campana a color VERDE).
 */
export async function subscribeUserToPush(token, requestPermissionIfNeeded = true) {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  const hasWebNotification = 'Notification' in window;
  const isNativeApk = checkIsNativeApp();

  if (!hasWebNotification && !isNativeApk) {
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

    if (permission !== 'granted' && !isNativeApk) {
      return { ok: false, reason: permission };
    }
  }

  // Persistir como ACTIVA (Verde) y encender el canal de audio de bolsillo
  localStorage.setItem('copai_push_enabled', 'true');
  siren.setKeepAlive(true);

  if (requestPermissionIfNeeded) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([250, 90, 250, 90, 400]);
      }
    } catch {}
  }

  if (!('serviceWorker' in navigator)) {
    return { ok: true, mode: isNativeApk ? 'native-android' : 'local-only' };
  }

  try {
    const reg = await getReadyServiceWorkerRegistration(3500);
    if (!reg || !reg.pushManager) {
      return { ok: true, mode: isNativeApk ? 'native-android' : 'local-only' };
    }

    const keyRes = await axios.get(`${API_BASE_URL}/api/pwa/vapid-public-key`);
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      return { ok: true, mode: isNativeApk ? 'native-android' : 'local-only' };
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

    localStorage.setItem('copai_vapid_public_key', publicKey);

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

    return { ok: true, mode: 'web-push' };
  } catch (err) {
    console.warn('Aviso al sincronizar Web Push:', err);
    return { ok: true, mode: isNativeApk ? 'native-android' : 'local-fallback' };
  }
}

export async function sendTestPushNotification(token) {
  let sentRemote = false;
  if (token) {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/pwa/push/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      sentRemote = (res.data?.sent || 0) > 0;
    } catch {}
  }

  if (!sentRemote || checkIsNativeApp()) {
    await showSystemNotification(
      '🔔 Alertas COPAI GPS Activas',
      'Tu teléfono sonará y vibrará ante Botón de Pánico, Sabotaje o Exceso de Velocidad.',
      'copai-test-alert'
    );
  }
  return true;
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
    if (window.CopaiAndroidNative && typeof window.CopaiAndroidNative.showAlertNotification === 'function') {
      window.CopaiAndroidNative.showAlertNotification(title, body, tag);
    }
  } catch {}

  try {
    if ('serviceWorker' in navigator) {
      const reg = await getReadyServiceWorkerRegistration(2500);
      if (reg && typeof reg.showNotification === 'function') {
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
