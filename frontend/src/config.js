// Configuración dinámica centralizada de API y WebSockets
// Soporta desarrollo local en localhost:8000 y producción en industriascopai.com sin tocar código

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname === '127.0.0.1'
);

// En desarrollo local (puerto 5173 de Vite), nos conectamos directamente a FastAPI en el puerto 8000.
// En producción (desplegado en AWS EC2 con Nginx), usamos window.location.origin (HTTPS)
export const API_BASE_URL = isLocalhost
  ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  : (import.meta.env.VITE_API_URL || window.location.origin);

// WebSocket URL: ws:// para local y wss:// para producción segura con SSL
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_BASE_URL = isLocalhost
  ? (import.meta.env.VITE_WS_URL || 'ws://localhost:8000')
  : (import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`);

/**
 * Obtiene la URL completa para un recurso estático (p. ej. logotipos subidos)
 */
export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Si fue guardado con localhost pero estamos en producción, ajustar dinámicamente
    if (!isLocalhost && path.includes('localhost:8000')) {
      return path.replace(/http:\/\/localhost:8000/, window.location.origin);
    }
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}

export default {
  API_BASE_URL,
  WS_BASE_URL,
  getAssetUrl,
};
