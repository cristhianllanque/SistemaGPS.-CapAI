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

export function useFleetVehicles(token, empresaId, archived = false) {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fleetError, setFleetError] = useState('');
  const request = useRef(null);
  const inFlightKeyRef = useRef(null);
  const queuedRefreshRef = useRef(false);
  const pendingTelemetry = useRef(new Map());

  const receiveTelemetry = useCallback((message) => {
    if (archived || !message?.data) return;
    const queued = pendingTelemetry.current.get(message.vehiculo_id);
    if (!queued || parseServerUTC(message.data.timestamp) >= parseServerUTC(queued.data.timestamp)) {
      pendingTelemetry.current.set(message.vehiculo_id, message);
    }
    setVehiculos((current) => current.map((vehicle) => applyVehicleTelemetry(vehicle, message)));
  }, [archived]);

  const refresh = useCallback(async () => {
    const activeToken = localStorage.getItem('token') || token;
    if (!activeToken) return;
    const reqKey = `${empresaId || ''}:${archived ? '1' : '0'}`;

    // En conexiones 4G móviles, si ya hay una petición idéntica en curso, no abortarla a mitad de camino;
    // dejar que entregue los vehículos de inmediato y encolar un refresco silencioso al terminar.
    if (request.current && inFlightKeyRef.current === reqKey) {
      queuedRefreshRef.current = true;
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    inFlightKeyRef.current = reqKey;
    queuedRefreshRef.current = false;

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/vehiculos/`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${activeToken}` },
        params: { empresa_id: empresaId || undefined, archivados: archived || undefined },
      });
      if (controller.signal.aborted) return;
      const pending = pendingTelemetry.current;
      pendingTelemetry.current = new Map();
      setVehiculos((current) => {
        const previous = new Map(current.map((vehicle) => [vehicle.id, vehicle]));
        return data.map((vehicle) => {
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
      });
      setFleetError('');
    } catch (error) {
      if (!controller.signal.aborted) {
        const detail = error.response?.data?.detail;
        setFleetError(typeof detail === 'string' ? detail : 'No se pudo actualizar la flota.');
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        inFlightKeyRef.current = null;
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
    refresh();
    return () => request.current?.abort();
  }, [refresh]);

  return { vehiculos, setVehiculos, loading, fleetError, refresh, receiveTelemetry };
}
