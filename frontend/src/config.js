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
 * Obtiene la URL completa para un recurso estático (p. ej. logotipos y banners subidos)
 * Soporta de manera robusta subdominios (huaynaroque.industriascopai.com), producción y localhost
 */
export function getAssetUrl(path) {
  if (!path) return '';
  // Si contiene la ruta /uploads/, extraer la parte relativa para cargar desde el host actual
  if (path.includes('/uploads/')) {
    const uploadIdx = path.indexOf('/uploads/');
    const relPath = path.substring(uploadIdx);
    return isLocalhost ? `${API_BASE_URL}${relPath}` : relPath;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}

export default {
  API_BASE_URL,
  WS_BASE_URL,
  getAssetUrl,
};
