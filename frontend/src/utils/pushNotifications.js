import axios from 'axios';
import { API_BASE_URL, checkIsNativeApp } from '../config';
import { siren } from './sound';

function isAndroidNativeOrWebView() {
  if (typeof window === 'undefined') return false;
  if (window.CopaiAndroidBridge || window.__COPAI_NATIVE_FRAMED) return true;
  if (checkIsNativeApp()) return true;
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (/Android/i.test(ua) && (/; wv\)/i.test(ua) || !('Notification' in window))) {
    return true;
  }
  return false;
}

function getOrCreateAndroidDeviceEndpoint() {
  try {
    if (
      typeof window !== 'undefined' &&
      window.CopaiAndroidBridge &&
      typeof window.CopaiAndroidBridge.getFcmToken === 'function'
    ) {
      const fcmTok = String(window.CopaiAndroidBridge.getFcmToken() || '').trim();
      if (fcmTok) {
        return `fcm://${fcmTok}`;
      }
    }
  } catch {}

  let devId = localStorage.getItem('copai_android_device_id');
  if (!devId) {
    devId = `and-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('copai_android_device_id', devId);
  }
  return `copai-android://${devId}`;
}

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

  if (isAndroidNativeOrWebView()) {
    try {
      if (
        window.CopaiAndroidBridge &&
        typeof window.CopaiAndroidBridge.areNotificationsEnabled === 'function' &&
        !window.CopaiAndroidBridge.areNotificationsEnabled()
      ) {
        return 'default';
      }
    } catch {}
    return serverSynced ? 'granted' : 'default';
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
  try {
    if (
      typeof window !== 'undefined' &&
      window.CopaiAndroidBridge &&
      typeof window.CopaiAndroidBridge.setBackgroundProtection === 'function'
    ) {
      window.CopaiAndroidBridge.setBackgroundProtection(false);
    }
  } catch {}

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

  if (!token) {
    localStorage.setItem('copai_push_server_synced', 'false');
    return { ok: false, reason: 'no_token' };
  }

  const registerAndroidNativeSubscription = async () => {
    try {
      if (
        requestPermissionIfNeeded &&
        window.CopaiAndroidBridge &&
        typeof window.CopaiAndroidBridge.requestNotificationPermission === 'function'
      ) {
        window.CopaiAndroidBridge.requestNotificationPermission();
      }
    } catch {}

    try {
      const endpoint = getOrCreateAndroidDeviceEndpoint();
      const subRes = await axios.post(
        `${API_BASE_URL}/api/pwa/push/subscribe`,
        {
          endpoint,
          keys: {
            p256dh: 'android-native-bridge',
            auth: 'android-native-bridge'
          }
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

      localStorage.setItem('copai_push_endpoint', endpoint);
      localStorage.setItem('copai_push_enabled', 'true');
      localStorage.setItem('copai_push_server_synced', 'true');
      siren.setKeepAlive(true);
      try {
        if (
          window.CopaiAndroidBridge &&
          typeof window.CopaiAndroidBridge.setBackgroundProtection === 'function'
        ) {
          window.CopaiAndroidBridge.setBackgroundProtection(true);
        }
      } catch {}

      if (requestPermissionIfNeeded) {
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([250, 90, 250, 90, 400]);
          }
        } catch {}
      }

      return { ok: true, mode: endpoint.startsWith('fcm://') ? 'fcm-native' : 'android-native', endpoint };
    } catch (err) {
      console.warn('Error registrando suscripción Android en el servidor:', err);
      localStorage.setItem('copai_push_server_synced', 'false');
      return { ok: false, reason: 'server_error' };
    }
  };

  if (isAndroidNativeOrWebView()) {
    return await registerAndroidNativeSubscription();
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

  try {
    const reg = await getReadyServiceWorkerRegistration(3000);
    if (!reg || !reg.pushManager) {
      if (/Android/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '')) {
        return await registerAndroidNativeSubscription();
      }
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
  if (targetEndpoint && targetEndpoint.startsWith('copai-android://')) {
    await showSystemNotification(
      '🔔 Alertas COPAI GPS Activas',
      'Tu teléfono sonará y vibrará ante Botón de Pánico, Sabotaje o Exceso de Velocidad.',
      'copai-test-alert'
    );
  }
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
    if (
      window.CopaiAndroidBridge &&
      typeof window.CopaiAndroidBridge.showNotification === 'function'
    ) {
      window.CopaiAndroidBridge.showNotification(String(title || ''), String(body || ''), String(tag || 'copai-alert'));
      return;
    }
  } catch {}

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
