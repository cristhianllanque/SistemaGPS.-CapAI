import { Capacitor } from '@capacitor/core';

// Configuración dinámica centralizada de API y WebSockets
// Soporta desarrollo local en localhost:8000, App Móvil Nativa (Android/iOS) y producción en industriascopai.com

// Detección de entorno: App Nativa Capacitor vs Web Localhost vs Web Producción
export function checkIsNativeApp() {
  if (typeof window === 'undefined') return false;
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  return Boolean(
    Capacitor.isNativePlatform() || 
    Capacitor.getPlatform() === 'android' ||
    Capacitor.getPlatform() === 'ios' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    window.__COPAI_NATIVE_FRAMED === true ||
    (typeof document !== 'undefined' && document.documentElement?.classList?.contains('is-android-native-framed')) ||
    /; wv\)/i.test(ua) ||
    (window.location.hostname === 'localhost' && Boolean(window.Capacitor))
  );
}

export const isNativeApp = checkIsNativeApp();

const isLocalhost = Boolean(
  !isNativeApp && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname === '127.0.0.1'
  )
);

const isCopaiCloudHost = Boolean(
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase().endsWith('industriascopai.com')
);

// En App Nativa sobre industriascopai.com / *.industriascopai.com usamos el origen actual (cero preflight CORS).
// Si corre offline desde esquema local de Capacitor, cae a https://industriascopai.com.
export const API_BASE_URL = isNativeApp
  ? (isCopaiCloudHost ? window.location.origin : 'https://industriascopai.com')
  : (isLocalhost
      ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
      : (import.meta.env.VITE_API_URL || window.location.origin));

// WebSocket URL sincronizada con el origen seguro
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_BASE_URL = isNativeApp
  ? (isCopaiCloudHost ? `${wsProtocol}//${window.location.host}` : 'wss://industriascopai.com')
  : (isLocalhost
      ? (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
      : (import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`));

/**
 * Obtiene la URL completa para un recurso estático (p. ej. logotipos y banners subidos)
 */
export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (isNativeApp) {
    return `https://industriascopai.com${cleanPath}`;
  }
  if (cleanPath.includes('/uploads/')) {
    return isLocalhost ? `${API_BASE_URL}${cleanPath}` : cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

export const PLAY_STORE_APP_URL = 'https://play.google.com/store/apps/details?id=com.industriascopai.gps';
export const PLAY_STORE_TESTING_URL = 'https://play.google.com/apps/testing/com.industriascopai.gps';
export const APK_DOWNLOAD_URL = 'https://industriascopai.com/descargas/CopaiGPS.apk';

export default {
  API_BASE_URL,
  WS_BASE_URL,
  getAssetUrl,
  PLAY_STORE_APP_URL,
  PLAY_STORE_TESTING_URL,
  APK_DOWNLOAD_URL,
};
