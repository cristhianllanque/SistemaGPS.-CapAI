import { useEffect, useRef } from 'react';

export const LIVE_SYNC_EVENT = 'copai:live-sync';

/**
 * Emite un evento reactivo en toda la aplicación (Web, iPhone PWA y Android APK)
 * cuando llega un cambio en vivo por WebSocket o tras guardar una acción local.
 */
export function emitLiveSync(detail) {
  if (typeof window === 'undefined' || !detail) return;
  window.dispatchEvent(new CustomEvent(LIVE_SYNC_EVENT, { detail }));
}

/**
 * Hook reactivo para que cualquier vista o componente actualice sus datos de forma
 * 100% autónoma (sin F5 ni cambiar de menú) cuando cambian entidades relacionadas.
 *
 * @param {string[]} watchTargets - Lista de entidades/eventos a observar
 *   (ej: ['vehiculos', 'conductores', 'dispositivos', 'empresas', 'alertas', 'particulares'])
 * @param {(detail: any) => void} onSync - Función que refresca o aplica el cambio en vivo
 */
export function useLiveSync(watchTargets, onSync) {
  const callbackRef = useRef(onSync);
  const targetsKey = Array.isArray(watchTargets) ? watchTargets.join(',') : String(watchTargets || '');

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = targetsKey.split(',').map((s) => s.trim()).filter(Boolean);
    let timerId = null;

    const handler = (ev) => {
      const detail = ev?.detail || {};
      const eventType = detail.type;
      const entity = detail.entity;

      const matches =
        targets.includes('*') ||
        (entity && targets.includes(entity)) ||
        (eventType === 'empresa_updated' && targets.includes('empresas')) ||
        (eventType === 'alert_resolved' && targets.includes('alertas')) ||
        (eventType && targets.includes(eventType));

      if (!matches) return;

      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        if (callbackRef.current) {
          callbackRef.current(detail);
        }
      }, 100);
    };

    window.addEventListener(LIVE_SYNC_EVENT, handler);
    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener(LIVE_SYNC_EVENT, handler);
    };
  }, [targetsKey]);
}
