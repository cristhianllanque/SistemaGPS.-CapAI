import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { parseServerUTC } from './peruTime';

export function hasValidPosition(reading) {
  const lat = reading?.latitud;
  const lng = reading?.longitud;
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
}

export function vehicleConnectionLabel(vehicle) {
  if (!vehicle.dispositivo_id) return 'Sin GPS vinculado';
  const u = vehicle.ultima_lectura;
  const latest = parseServerUTC(u?.timestamp);
  const assigned = parseServerUTC(vehicle.gps_asignado_at);
  if (!latest || (assigned && latest.getTime() < Math.floor(assigned.getTime() / 1000) * 1000)) {
    return 'Esperando primera posición';
  }
  const diffMinutes = Math.abs(Date.now() - latest.getTime()) / (60 * 1000);
  const isOnline = Boolean(u?.online === true && diffMinutes < 15);
  if (!hasValidPosition(u)) {
    return isOnline ? 'En línea (Buscando satélites GPS)' : 'Esperando primera posición';
  }
  return 'Sin señal reciente';
}

export function applyVehicleTelemetry(vehicle, message) {
  const reading = message.data;
  const timestamp = parseServerUTC(reading?.timestamp);
  const previous = parseServerUTC(vehicle.ultima_lectura?.timestamp);
  const assigned = parseServerUTC(vehicle.gps_asignado_at);
  if (vehicle.id !== message.vehiculo_id || !vehicle.activo || !vehicle.dispositivo_id
    || (message.dispositivo_id != null && message.dispositivo_id !== vehicle.dispositivo_id)
    || !reading || !timestamp
    || (assigned && timestamp < assigned) || (previous && timestamp < previous)) {
    return vehicle;
  }
  const validPos = hasValidPosition(reading);
  const prevReading = vehicle.ultima_lectura;
  return {
    ...vehicle,
    empresa_limite_velocidad: message.limite_velocidad || vehicle.empresa_limite_velocidad,
    ultima_lectura: {
      ...prevReading,
      ...reading,
      latitud: validPos ? reading.latitud : (prevReading?.latitud ?? null),
      longitud: validPos ? reading.longitud : (prevReading?.longitud ?? null),
    },
  };
}

function getFleetCacheKey(empresaId, archived) {
  try {
    const rawUser = localStorage.getItem('usuario');
    const rawEmp = localStorage.getItem('empresa');
    const user = (rawUser && rawUser !== 'null' && rawUser !== 'undefined') ? JSON.parse(rawUser) : {};
    const emp = (rawEmp && rawEmp !== 'null' && rawEmp !== 'undefined') ? JSON.parse(rawEmp) : {};
    const uid = user?.id || 'anon';
    const eid = empresaId || user?.empresa_id || emp?.id || 'all';
    return `copai_fleet_v3:${uid}:${eid}:${archived ? '1' : '0'}`;
  } catch {
    return `copai_fleet_v3:default:${empresaId || 'all'}:${archived ? '1' : '0'}`;
  }
}

function readCachedFleet(empresaId, archived) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getFleetCacheKey(empresaId, archived));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedFleet(empresaId, archived, list) {
  if (typeof window === 'undefined' || !Array.isArray(list)) return;
  try {
    localStorage.setItem(getFleetCacheKey(empresaId, archived), JSON.stringify(list));
  } catch {}
}

export function useFleetVehicles(token, empresaId, archived = false) {
  const [vehiculos, setVehiculos] = useState(() => readCachedFleet(empresaId, archived));
  const [loading, setLoading] = useState(() => readCachedFleet(empresaId, archived).length === 0);
  const [fleetError, setFleetError] = useState('');
  const request = useRef(null);
  const inFlightKeyRef = useRef(null);
  const inFlightStartedAtRef = useRef(0);
  const queuedRefreshRef = useRef(false);
  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const pendingTelemetry = useRef(new Map());

  const receiveTelemetry = useCallback((message) => {
    if (archived || !message?.data) return;
    const queued = pendingTelemetry.current.get(message.vehiculo_id);
    if (!queued || parseServerUTC(message.data.timestamp) >= parseServerUTC(queued.data.timestamp)) {
      pendingTelemetry.current.set(message.vehiculo_id, message);
    }
    setVehiculos((current) => {
      const next = current.map((vehicle) => applyVehicleTelemetry(vehicle, message));
      writeCachedFleet(empresaId, archived, next);
      return next;
    });
  }, [archived, empresaId]);

  const refresh = useCallback(async (forceAbort = false) => {
    const activeToken = localStorage.getItem('token') || token;
    if (!activeToken) return;
    const reqKey = `${empresaId || ''}:${archived ? '1' : '0'}`;

    // Si hay una petición idéntica en vuelo hace menos de 5 segundos y no es forzada, encolar refresco.
    // Si lleva más de 5 segundos en 4G (socket colgado), abortarla y lanzar una nueva de inmediato.
    const elapsedInFlight = Date.now() - inFlightStartedAtRef.current;
    if (!forceAbort && request.current && inFlightKeyRef.current === reqKey && elapsedInFlight < 5000) {
      queuedRefreshRef.current = true;
      return;
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    inFlightKeyRef.current = reqKey;
    inFlightStartedAtRef.current = Date.now();
    queuedRefreshRef.current = false;

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/vehiculos/`, {
        signal: controller.signal,
        timeout: 7000,
        headers: { Authorization: `Bearer ${activeToken}` },
        params: {
          empresa_id: empresaId || undefined,
          archivados: archived || undefined,
          _t: Date.now(),
        },
      });
      if (controller.signal.aborted) return;
      retryCountRef.current = 0;
      const safeData = Array.isArray(data) ? data : [];
      const pending = pendingTelemetry.current;
      pendingTelemetry.current = new Map();
      setVehiculos((current) => {
        const previous = new Map(current.map((vehicle) => [vehicle.id, vehicle]));
        const nextList = safeData.map((vehicle) => {
          const cached = previous.get(vehicle.id);
          if (vehicle.activo && vehicle.dispositivo_id && cached?.dispositivo_id === vehicle.dispositivo_id
            && cached.gps_asignado_at === vehicle.gps_asignado_at) {
            const newer = parseServerUTC(cached.ultima_lectura?.timestamp);
            const incoming = parseServerUTC(vehicle.ultima_lectura?.timestamp);
            if (newer && (!incoming || newer > incoming)) {
              return { ...vehicle, ultima_lectura: cached.ultima_lectura };
            }
          }
          const update = pending.get(vehicle.id);
          const last = parseServerUTC(vehicle.ultima_lectura?.timestamp);
          if (update && (!last || parseServerUTC(update.data.timestamp) > last)) {
            return applyVehicleTelemetry(vehicle, update);
          }
          return vehicle;
        });
        writeCachedFleet(empresaId, archived, nextList);
        return nextList;
      });
      setFleetError('');
    } catch (error) {
      if (!controller.signal.aborted) {
        const detail = error.response?.data?.detail;
        setFleetError(typeof detail === 'string' ? detail : 'Reintentando conexión con la flota...');
        // Auto-reintento rápido en redes móviles 4G/4.5G (1.5s, 3s, 6s)
        const attempt = retryCountRef.current;
        retryCountRef.current = attempt + 1;
        const delayMs = attempt === 0 ? 1500 : (attempt === 1 ? 3000 : 6000);
        retryTimerRef.current = setTimeout(() => {
          refresh(true);
        }, delayMs);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        inFlightKeyRef.current = null;
        inFlightStartedAtRef.current = 0;
      }
      if (!controller.signal.aborted) {
        setLoading(false);
        if (queuedRefreshRef.current) {
          queuedRefreshRef.current = false;
          setTimeout(() => { refresh(); }, 150);
        }
      }
    }
  }, [token, empresaId, archived]);

  useEffect(() => {
    const cached = readCachedFleet(empresaId, archived);
    if (cached.length > 0) {
      setVehiculos(cached);
      setLoading(false);
    }
    refresh(true);
    // Respaldo periódico cada 15s por si la red móvil 4G/4.5G cambia de antena
    const intervalId = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refresh(false);
      }
    }, 15000);
    return () => {
      clearInterval(intervalId);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      request.current?.abort();
    };
  }, [refresh, empresaId, archived]);

  return { vehiculos, setVehiculos, loading, fleetError, refresh, receiveTelemetry };
}
