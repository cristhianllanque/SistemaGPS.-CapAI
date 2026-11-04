import { Capacitor } from '@capacitor/core';

// Configuración dinámica centralizada de API y WebSockets
// Soporta desarrollo local en localhost:8000, App Móvil Nativa (Android/iOS) y producción en industriascopai.com

// Detección de entorno: App Nativa Capacitor vs Web Localhost vs Web Producción
export const isNativeApp = Boolean(
  typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() || 
    Capacitor.getPlatform() === 'android' ||
    Capacitor.getPlatform() === 'ios' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (window.location.hostname === 'localhost' && Boolean(window.Capacitor))
  )
);

const isLocalhost = Boolean(
  !isNativeApp && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname === '127.0.0.1'
  )
);

// En App Nativa conectamos a la API de producción en HTTPS. En web local a localhost:8000. En producción web al origen actual.
export const API_BASE_URL = isNativeApp
  ? 'https://industriascopai.com'
  : (isLocalhost
      ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
      : (import.meta.env.VITE_API_URL || window.location.origin));

// WebSocket URL: wss://industriascopai.com para la App Nativa
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_BASE_URL = isNativeApp
  ? 'wss://industriascopai.com'
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

export default {
  API_BASE_URL,
  WS_BASE_URL,
  getAssetUrl,
};
