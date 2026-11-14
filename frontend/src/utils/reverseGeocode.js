import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL as API } from '../config';

const STORAGE_KEY = 'copai_addr_cache_v1';
const memoryCache = new Map();
const inFlightRequests = new Map();

// Inicializar caché en memoria desde sessionStorage para lectura instantánea (0 ms) al cambiar de página
try {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) {
          memoryCache.set(k, v);
        }
      });
    }
  }
} catch {}

function persistCache() {
  try {
    if (memoryCache.size > 600) {
      const firstKeys = Array.from(memoryCache.keys()).slice(0, 200);
      firstKeys.forEach((k) => memoryCache.delete(k));
    }
    const obj = {};
    memoryCache.forEach((val, key) => {
      obj[key] = val;
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

export function getCoordCacheKey(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  return `${nLat.toFixed(4)},${nLng.toFixed(4)}`;
}

export function getCachedAddressSync(lat, lng) {
  const key = getCoordCacheKey(lat, lng);
  if (!key) return null;
  return memoryCache.get(key) || null;
}

export async function resolveStreetAddress(lat, lng) {
  const key = getCoordCacheKey(lat, lng);
  if (!key) return null;

  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const nLat = Number(lat);
  const nLng = Number(lng);

  const promise = (async () => {
    try {
      const res = await axios.get(`${API}/api/pwa/reverse-geocode`, {
        params: { lat: nLat, lng: nLng },
        timeout: 5000
      });
      const addr = res.data?.address;
      if (addr && typeof addr === 'string' && !addr.startsWith('Lat ')) {
        memoryCache.set(key, addr);
        persistCache();
        return addr;
      }
    } catch {}

    // Respaldo directo con Nominatim desde el navegador si fuera necesario
    try {
      const nomRes = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nLat}&lon=${nLng}&zoom=18&addressdetails=1`,
        { timeout: 4500 }
      );
      const data = nomRes.data || {};
      const a = data.address || {};
      const road = (
        a.road ||
        a.pedestrian ||
        a.highway ||
        a.path ||
        a.amenity ||
        data.name ||
        ''
      ).trim();
      const num = (a.house_number || '').trim();
      const suburb = (a.suburb || a.neighbourhood || a.quarter || a.residential || '').trim();
      const city = (a.city || a.town || a.municipality || a.village || a.county || '').trim();

      const parts = [];
      if (road) parts.push(num ? `${road} ${num}` : road);
      if (suburb && suburb.toLowerCase() !== road.toLowerCase()) parts.push(suburb);
      if (city && city.toLowerCase() !== suburb.toLowerCase()) parts.push(city);

      const formatted = parts.join(', ');
      if (formatted) {
        memoryCache.set(key, formatted);
        persistCache();
        return formatted;
      }
    } catch {}

    return `${nLat.toFixed(5)}, ${nLng.toFixed(5)}`;
  })().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Hook React que mantiene actualizado en tiempo real el diccionario { [vehiculoId]: "Av. ..., Ciudad" }
 * para toda la lista de vehículos visible en pantalla.
 */
export function useVehicleAddresses(vehiculos = []) {
  const [addresses, setAddresses] = useState(() => {
    const initial = {};
    (vehiculos || []).forEach((v) => {
      const u = v?.ultima_lectura;
      if (u && u.latitud != null && u.longitud != null) {
        const cached = getCachedAddressSync(u.latitud, u.longitud);
        if (cached) initial[v.id] = cached;
      }
    });
    return initial;
  });

  const lastKeysRef = useRef({});

  useEffect(() => {
    if (!Array.isArray(vehiculos) || vehiculos.length === 0) return;

    let isMounted = true;
    const immediateUpdates = {};
    const toFetch = [];

    vehiculos.forEach((v) => {
      const u = v?.ultima_lectura;
      if (!u || u.latitud == null || u.longitud == null) return;
      const key = getCoordCacheKey(u.latitud, u.longitud);
      if (!key) return;

      const cached = memoryCache.get(key);
      if (cached) {
        if (addresses[v.id] !== cached) {
          immediateUpdates[v.id] = cached;
        }
        lastKeysRef.current[v.id] = key;
        return;
      }

      if (lastKeysRef.current[v.id] !== key) {
        lastKeysRef.current[v.id] = key;
        toFetch.push({ id: v.id, lat: u.latitud, lng: u.longitud, key });
      }
    });

    if (Object.keys(immediateUpdates).length > 0) {
      setAddresses((prev) => ({ ...prev, ...immediateUpdates }));
    }

    toFetch.forEach((item, idx) => {
      setTimeout(() => {
        resolveStreetAddress(item.lat, item.lng).then((addr) => {
          if (!isMounted || !addr) return;
          setAddresses((prev) => {
            if (prev[item.id] === addr) return prev;
            return { ...prev, [item.id]: addr };
          });
        });
      }, idx * 140);
    });

    return () => {
      isMounted = false;
    };
  }, [vehiculos]);

  return addresses;
}
