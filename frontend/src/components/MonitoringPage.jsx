import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import { Gauge, Sliders, Check, X, Navigation, ChevronRight, LocateFixed, Building2 } from 'lucide-react';
import LiveMap from './LiveMap';
import Sidebar from './Sidebar';
import PanicAlert from './PanicAlert';
import { siren } from '../utils/sound';
import { API_BASE_URL as API, WS_BASE_URL, isNativeApp } from '../config';
import { emitLiveSync, useLiveSync } from '../utils/liveSync';

// Distancia Haversine en metros entre dos coordenadas
function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MonitoringPage() {
  const [searchParams] = useSearchParams();
  const [vehiculos, setVehiculos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [emergencyVehicleId, setEmergencyVehicleId] = useState(null);
  const [isFleetCollapsed, setIsFleetCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const [empresa, setEmpresa] = useState(() => JSON.parse(localStorage.getItem('empresa') || '{}'));
  const [limiteVelocidad, setLimiteVelocidad] = useState(empresa?.limite_velocidad || 90);
  
  // Speed Limit modal
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [tempSpeed, setTempSpeed] = useState(limiteVelocidad);
  const [speedTargetEmpresaId, setSpeedTargetEmpresaId] = useState('');
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [speedToast, setSpeedToast] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  // wsEmpresaId mantiene la misma URL compartida con Layout.jsx (Superadmin recibe todas las empresas en el mismo socket)
  const wsEmpresaId = empresa?.id || 1;
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const canEditSpeedLimit = usuario?.rol === 'superadmin' || usuario?.rol === 'admin';

  // Filtro de flota (solo Superadmin): 'all' | 'particulares' | '<empresa_id>'
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [empresasList, setEmpresasList] = useState([]);
  const [particularIds, setParticularIds] = useState([]);
  const [allEmpresasMap, setAllEmpresasMap] = useState({});

  // ================= ESTADO EXCLUSIVO APLICATIVO MÓVIL: MI UBICACIÓN & RUTA AL VEHÍCULO =================
  const [isMobileApp, setIsMobileApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNativeApp || window.innerWidth < 768;
  });
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const raw = sessionStorage.getItem('copai_last_user_gps');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && Date.now() - (parsed.ts || 0) < 15 * 60 * 1000) {
        return { lat: parsed.lat, lng: parsed.lng, accuracy: parsed.accuracy || 25 };
      }
    } catch {}
    return null;
  });
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [routeTargetVehicleId, setRouteTargetVehicleId] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [fitRouteTrigger, setFitRouteTrigger] = useState(0);
  const [centerUserTrigger, setCenterUserTrigger] = useState(0);

  const geoWatchIdRef = useRef(null);
  const lastRoutedCoordsRef = useRef(null);
  const inFlightRouteRef = useRef(null);
  const routeReqIdRef = useRef(0);
  const routeCacheRef = useRef({});

  const saveUserGpsToCache = useCallback((coords) => {
    setUserLocation(coords);
    try {
      sessionStorage.setItem('copai_last_user_gps', JSON.stringify({ ...coords, ts: Date.now() }));
    } catch {}
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobileApp(isNativeApp || window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Limpiar watchPosition al desmontar la página
  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, []);

  const ensureUserLocationWatching = useCallback((shouldCenterOnUser = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setSpeedToast('El GPS de este dispositivo no está disponible');
      setTimeout(() => setSpeedToast(''), 3500);
      return;
    }

    setIsLocatingUser(true);

    // 1. Nivel Ultrarrápido (< 50 ms): Usa caché/red inmediata para no hacer esperar al usuario
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 25
        };
        saveUserGpsToCache(coords);
        setIsLocatingUser(false);
        if (shouldCenterOnUser) {
          setCenterUserTrigger((prev) => prev + 1);
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 180000 }
    );

    // 2. Nivel Alta Precisión GPS en paralelo
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15
        };
        saveUserGpsToCache(coords);
        setIsLocatingUser(false);
        if (shouldCenterOnUser) {
          setCenterUserTrigger((prev) => prev + 1);
        }
      },
      () => {
        setIsLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );

    if (geoWatchIdRef.current === null) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          saveUserGpsToCache({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 20
          });
          setIsLocatingUser(false);
        },
        (err) => {
          console.warn('Aviso GPS móvil:', err?.message);
          setIsLocatingUser(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 4000 }
      );
    }
  }, [saveUserGpsToCache]);

  // Pre-calentar silenciosamente el GPS en móvil si el permiso ya fue otorgado previamente
  useEffect(() => {
    if (!isMobileApp || typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          if (res.state === 'granted') {
            ensureUserLocationWatching(false);
          }
        })
        .catch(() => {});
    }
  }, [isMobileApp, ensureUserLocationWatching]);

  const handleLocateMe = () => {
    if (userLocation) {
      setCenterUserTrigger((prev) => prev + 1);
    }
    ensureUserLocationWatching(true);
  };

  const handleStartRouteToVehicle = (vehiculoId) => {
    routeReqIdRef.current += 1;
    inFlightRouteRef.current = null;
    lastRoutedCoordsRef.current = null;
    if (routeTargetVehicleId !== vehiculoId && !routeCacheRef.current[vehiculoId]) {
      setRoutePoints([]);
      setRouteSummary(null);
    }
    setSelectedVehicleId(vehiculoId);
    setRouteTargetVehicleId(vehiculoId);
    ensureUserLocationWatching(false);
    setFitRouteTrigger((prev) => prev + 1);
  };

  const handleStopRoute = () => {
    routeReqIdRef.current += 1;
    inFlightRouteRef.current = null;
    lastRoutedCoordsRef.current = null;
    setRouteTargetVehicleId(null);
    setRoutePoints([]);
    setRouteSummary(null);
    setRouteLoading(false);
  };

  const WS_URL = token 
    ? `${WS_BASE_URL}/ws/flota/${wsEmpresaId}?token=${token}` 
    : null;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  // Check URL search parameters (e.g., ?vehiculo=12 or ?vehiculo=12&ruta=1)
  useEffect(() => {
    const urlVehiculoId = searchParams.get('vehiculo');
    const urlRuta = searchParams.get('ruta');
    if (urlVehiculoId) {
      const parsedId = parseInt(urlVehiculoId, 10);
      if (!isNaN(parsedId)) {
        setSelectedVehicleId(parsedId);
        if (urlRuta === '1' || urlRuta === 'true') {
          setRouteTargetVehicleId(parsedId);
          ensureUserLocationWatching(false);
          setFitRouteTrigger((prev) => prev + 1);
        }
      }
    }
  }, [searchParams, ensureUserLocationWatching]);

  const refreshVehiculosSilently = useCallback(async () => {
    try {
      const vehRes = await axios.get(`${API}/api/vehiculos/`, { headers });
      setVehiculos((vehRes.data || []).filter((v) => v.dispositivo_id != null));
    } catch (err) {
      console.error('Error refrescando vehículos en vivo:', err);
    }
  }, [token]);

  const loadEmpresasCatalog = useCallback(async () => {
    if (!isSuperAdmin) {
      if (!empresa?.id) return;
      try {
        const empRes = await axios.get(`${API}/api/empresas/${empresa.id}`, { headers });
        if (empRes?.data) {
          const emp = empRes.data;
          setAllEmpresasMap((prev) => ({ ...prev, [emp.id]: emp }));
          if (emp.limite_velocidad) {
            setLimiteVelocidad(emp.limite_velocidad);
            setTempSpeed(emp.limite_velocidad);
          }
          setEmpresa((prev) => {
            const merged = { ...prev, ...emp };
            localStorage.setItem('empresa', JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        // Silencioso si no aplica
      }
      return;
    }

    try {
      const [empRes, partRes] = await Promise.all([
        axios.get(`${API}/api/empresas/`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/api/empresas/`, { headers, params: { tipo: 'particular' } }).catch(() => ({ data: [] })),
      ]);
      const empArr = empRes.data || [];
      const partArr = partRes.data || [];
      setEmpresasList(empArr.map((e) => ({ id: e.id, nombre: e.nombre, limite_velocidad: e.limite_velocidad })));
      setParticularIds(partArr.map((p) => Number(p.id)));
      const nextMap = {};
      [...empArr, ...partArr].forEach((item) => {
        nextMap[item.id] = {
          id: item.id,
          nombre: item.nombre,
          tipo: item.tipo || 'empresa',
          limite_velocidad: item.limite_velocidad || 90,
        };
      });
      setAllEmpresasMap(nextMap);
    } catch (err) {
      console.error('Error cargando catálogo de empresas:', err);
    }
  }, [isSuperAdmin, empresa?.id, token]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, alertRes] = await Promise.all([
          axios.get(`${API}/api/vehiculos/`, { headers }),
          axios.get(`${API}/api/alertas/`, { headers }),
        ]);
        
        // Solo vehículos activos Y con dispositivo vinculado
        setVehiculos((vehRes.data || []).filter((v) => v.dispositivo_id != null));
        setAlertas(alertRes.data || []);

        // If there are pending panic/sabotage alerts on load, focus on the most recent one
        const pendingPanics = (alertRes.data || []).filter((a) => a.estado === 'pendiente' && a.tipo !== 'exceso_velocidad');
        if (pendingPanics.length > 0) {
          setEmergencyVehicleId(pendingPanics[0].vehiculo_id);
          setSelectedVehicleId(pendingPanics[0].vehiculo_id);
          siren.start();
        }
      } catch (err) {
        console.error("Error al cargar datos de monitoreo:", err);
      }
    };
    fetchData();
    loadEmpresasCatalog();
  }, []);

  const vehiculosFiltrados = useMemo(() => {
    if (!isSuperAdmin || empresaFilter === 'all') return vehiculos;
    if (empresaFilter === 'particulares') {
      return vehiculos.filter(v => particularIds.includes(Number(v.empresa_id)));
    }
    return vehiculos.filter(v => Number(v.empresa_id) === Number(empresaFilter));
  }, [vehiculos, empresaFilter, particularIds, isSuperAdmin]);

  // Empresa efectiva para mostrar/ajustar el límite de velocidad sin mezclar empresas en Superadmin
  const effectiveSpeedEmpresaId = useMemo(() => {
    if (!isSuperAdmin) {
      return Number(empresa?.id || 1);
    }
    if (empresaFilter !== 'all' && empresaFilter !== 'particulares') {
      return Number(empresaFilter);
    }
    if (selectedVehicleId) {
      const selVeh = vehiculos.find((v) => v.id === selectedVehicleId);
      if (selVeh?.empresa_id) return Number(selVeh.empresa_id);
    }
    if (vehiculosFiltrados.length > 0 && vehiculosFiltrados[0]?.empresa_id) {
      return Number(vehiculosFiltrados[0].empresa_id);
    }
    if (empresasList.length > 0) {
      return Number(empresasList[0].id);
    }
    return 1;
  }, [isSuperAdmin, empresa?.id, empresaFilter, selectedVehicleId, vehiculos, vehiculosFiltrados, empresasList]);

  const effectiveEmpresaNombre = useMemo(() => {
    if (!isSuperAdmin) return empresa?.nombre || 'la flota';
    return (
      allEmpresasMap[effectiveSpeedEmpresaId]?.nombre ||
      vehiculos.find((v) => Number(v.empresa_id) === Number(effectiveSpeedEmpresaId))?.empresa_nombre ||
      'la flota'
    );
  }, [isSuperAdmin, empresa?.nombre, allEmpresasMap, effectiveSpeedEmpresaId, vehiculos]);

  // Mantener limiteVelocidad sincronizado con la empresa efectiva en pantalla
  useEffect(() => {
    const mappedLimit = allEmpresasMap[effectiveSpeedEmpresaId]?.limite_velocidad;
    if (mappedLimit) {
      setLimiteVelocidad(mappedLimit);
      return;
    }
    const vehLimit = vehiculos.find((v) => Number(v.empresa_id) === Number(effectiveSpeedEmpresaId))?.empresa_limite_velocidad;
    if (vehLimit) {
      setLimiteVelocidad(vehLimit);
    }
  }, [effectiveSpeedEmpresaId, allEmpresasMap, vehiculos]);

  // Sincronización 100% autónoma en vivo (sin F5 ni cambiar de menú)
  useLiveSync(['vehiculos', 'conductores', 'dispositivos', 'particulares', 'empresas', 'alertas'], (detail) => {
    if (!detail) return;

    if (detail.type === 'alert_resolved') {
      const resolvedId = Number(detail.alerta_id);
      const targetVehId = Number(detail.vehiculo_id);
      const keepSabotaje = Boolean(detail.has_pending_sabotaje);
      const keepPanico = Boolean(detail.has_pending_panico);

      setAlertas((prev) => {
        const next = prev.filter((a) => Number(a.alerta_id || a.id) !== resolvedId);
        const stillHasCritical = next.some((a) => a.tipo !== 'exceso_velocidad');
        if (!stillHasCritical && !keepSabotaje && !keepPanico) {
          siren.stop();
          setEmergencyVehicleId((curr) => (curr === targetVehId ? null : curr));
        }
        return next;
      });

      if (targetVehId) {
        setVehiculos((prev) =>
          prev.map((v) => {
            if (v.id !== targetVehId || !v.ultima_lectura) return v;
            return {
              ...v,
              ultima_lectura: {
                ...v.ultima_lectura,
                sabotaje: keepSabotaje,
                boton_panico: keepPanico,
              },
            };
          })
        );
      }
      return;
    }

    if (detail.type === 'empresa_updated' && detail.empresa) {
      const emp = detail.empresa;
      setAllEmpresasMap((prev) => ({
        ...prev,
        [emp.id]: {
          ...(prev[emp.id] || {}),
          id: emp.id,
          nombre: emp.nombre,
          tipo: emp.tipo || prev[emp.id]?.tipo || 'empresa',
          limite_velocidad: emp.limite_velocidad || prev[emp.id]?.limite_velocidad || 90,
        },
      }));
      setEmpresasList((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(emp.id)
            ? { ...item, nombre: emp.nombre, limite_velocidad: emp.limite_velocidad || item.limite_velocidad }
            : item
        )
      );
      setVehiculos((prev) =>
        prev.map((v) =>
          Number(v.empresa_id) === Number(emp.id)
            ? {
                ...v,
                empresa_nombre: emp.nombre || v.empresa_nombre,
                empresa_limite_velocidad: emp.limite_velocidad || v.empresa_limite_velocidad,
              }
            : v
        )
      );
      if (!isSuperAdmin && Number(emp.id) === Number(empresa?.id)) {
        setEmpresa((prev) => ({ ...prev, ...emp }));
        if (emp.limite_velocidad) setLimiteVelocidad(emp.limite_velocidad);
      } else if (isSuperAdmin && Number(emp.id) === Number(effectiveSpeedEmpresaId) && emp.limite_velocidad) {
        setLimiteVelocidad(emp.limite_velocidad);
      }
      return;
    }

    // Cambios estructurales (vehículos, conductores, vinculaciones, particulares, nuevas empresas)
    refreshVehiculosSilently();
    if (isSuperAdmin && (detail.entity === 'empresas' || detail.entity === 'particulares')) {
      loadEmpresasCatalog();
    }
  });

  // En el mapa, un vehículo en emergencia SIEMPRE se muestra aunque esté fuera del filtro
  const vehiculosMapa = useMemo(() => {
    if (!emergencyVehicleId || vehiculosFiltrados.some(v => v.id === emergencyVehicleId)) return vehiculosFiltrados;
    const emergencia = vehiculos.find(v => v.id === emergencyVehicleId);
    return emergencia ? [...vehiculosFiltrados, emergencia] : vehiculosFiltrados;
  }, [vehiculosFiltrados, vehiculos, emergencyVehicleId]);

  const filterCounts = useMemo(() => {
    const counts = { all: vehiculos.length, particulares: 0 };
    vehiculos.forEach(v => {
      const key = String(v.empresa_id);
      counts[key] = (counts[key] || 0) + 1;
      if (particularIds.includes(Number(v.empresa_id))) counts.particulares += 1;
    });
    return counts;
  }, [vehiculos, particularIds]);

  useEffect(() => {
    if (lastJsonMessage) {
      // Aislamiento Multi-empresa: ignorar eventos de otras empresas (salvo Superadmin)
      if (!isSuperAdmin && (!lastJsonMessage.empresa_id || !empresa?.id || Number(lastJsonMessage.empresa_id) !== Number(empresa.id))) {
        return;
      }
      if (lastJsonMessage.type === 'telemetria') {
        if (lastJsonMessage.limite_velocidad && Number(lastJsonMessage.empresa_id) === Number(effectiveSpeedEmpresaId)) {
          setLimiteVelocidad(lastJsonMessage.limite_velocidad);
        }
        setVehiculos(prev => prev.map(v => {
          if (v.id === lastJsonMessage.vehiculo_id) {
            return {
              ...v,
              empresa_limite_velocidad: lastJsonMessage.limite_velocidad || v.empresa_limite_velocidad,
              ultima_lectura: { ...lastJsonMessage.data }
            };
          }
          return v;
        }));
      } else if (lastJsonMessage.type === 'alerta_panico' || lastJsonMessage.type === 'panic_alert') {
        // Start siren and focus directly on the vehicle in emergency
        siren.start();
        setEmergencyVehicleId(lastJsonMessage.vehiculo_id);
        setSelectedVehicleId(lastJsonMessage.vehiculo_id);
        setVehiculos((prev) =>
          prev.map((v) =>
            v.id === lastJsonMessage.vehiculo_id && v.ultima_lectura
              ? { ...v, ultima_lectura: { ...v.ultima_lectura, boton_panico: true } }
              : v
          )
        );

        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [{ ...lastJsonMessage, tipo: 'panico' }, ...prev];
        });
      } else if (lastJsonMessage.type === 'sabotage_alert') {
        siren.start();
        setEmergencyVehicleId(lastJsonMessage.vehiculo_id);
        setSelectedVehicleId(lastJsonMessage.vehiculo_id);
        setVehiculos((prev) =>
          prev.map((v) =>
            v.id === lastJsonMessage.vehiculo_id && v.ultima_lectura
              ? { ...v, ultima_lectura: { ...v.ultima_lectura, sabotaje: true } }
              : v
          )
        );

        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [{
            id: lastJsonMessage.alerta_id,
            alerta_id: lastJsonMessage.alerta_id,
            vehiculo_id: lastJsonMessage.vehiculo_id,
            placa: lastJsonMessage.placa,
            conductor_nombre: lastJsonMessage.conductor,
            latitud: lastJsonMessage.latitud,
            longitud: lastJsonMessage.longitud,
            bateria_ext: lastJsonMessage.bateria_ext,
            tipo: 'sabotaje',
            fecha_hora: lastJsonMessage.fecha_hora || new Date().toISOString()
          }, ...prev];
        });
      } else if (lastJsonMessage.type === 'speed_alert') {
        // Real-time speed alert
        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [{
            id: lastJsonMessage.alerta_id,
            alerta_id: lastJsonMessage.alerta_id,
            vehiculo_id: lastJsonMessage.vehiculo_id,
            placa: lastJsonMessage.placa,
            conductor_nombre: lastJsonMessage.conductor,
            latitud: lastJsonMessage.latitud,
            longitud: lastJsonMessage.longitud,
            tipo: 'exceso_velocidad',
            velocidad: lastJsonMessage.velocidad,
            limite: lastJsonMessage.limite,
            fecha_hora: lastJsonMessage.fecha_hora || new Date().toISOString()
          }, ...prev];
        });
      }
    }
  }, [lastJsonMessage, effectiveSpeedEmpresaId, isSuperAdmin, empresa?.id]);

  const handleAtenderAlerta = async (alertaId) => {
    try {
      const targetAlert = alertas.find((a) => Number(a.alerta_id || a.id) === Number(alertaId));
      await axios.put(`${API}/api/alertas/${alertaId}/atender`, { estado: 'atendida' }, { headers });
      const remaining = alertas.filter((a) => Number(a.alerta_id || a.id) !== Number(alertaId));
      setAlertas(remaining);

      if (targetAlert?.vehiculo_id) {
        const stillSab = remaining.some((a) => a.vehiculo_id === targetAlert.vehiculo_id && a.tipo === 'sabotaje');
        const stillPanic = remaining.some((a) => a.vehiculo_id === targetAlert.vehiculo_id && a.tipo === 'panico');
        setVehiculos((prev) =>
          prev.map((v) =>
            v.id === targetAlert.vehiculo_id && v.ultima_lectura
              ? {
                  ...v,
                  ultima_lectura: {
                    ...v.ultima_lectura,
                    sabotaje: stillSab,
                    boton_panico: stillPanic,
                  },
                }
              : v
          )
        );
        emitLiveSync({
          type: 'alert_resolved',
          alerta_id: alertaId,
          vehiculo_id: targetAlert.vehiculo_id,
          alerta_tipo: targetAlert.tipo,
          has_pending_sabotaje: stillSab,
          has_pending_panico: stillPanic,
        });
      }

      // Si ya no quedan alertas críticas pendientes, apagar sirena y modo emergencia
      if (!remaining.some((a) => a.tipo !== 'exceso_velocidad')) {
        siren.stop();
        setEmergencyVehicleId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearFocus = () => {
    setSelectedVehicleId(null);
    setEmergencyVehicleId(null);
    handleStopRoute();
    siren.stop();
  };

  // Coordenadas primitivas del vehículo objetivo (evita que actualizaciones WebSocket de otros carros cancelen la petición OSRM en vuelo)
  const routedTargetVeh = useMemo(
    () => (routeTargetVehicleId ? vehiculos.find((v) => v.id === routeTargetVehicleId) : null),
    [vehiculos, routeTargetVehicleId]
  );
  const targetVehLat = routedTargetVeh?.ultima_lectura?.latitud != null ? Number(routedTargetVeh.ultima_lectura.latitud) : null;
  const targetVehLng = routedTargetVeh?.ultima_lectura?.longitud != null ? Number(routedTargetVeh.ultima_lectura.longitud) : null;

  // Calcular la ruta vial real por calles desde el celular hasta el vehículo objetivo
  useEffect(() => {
    if (!isMobileApp || !routeTargetVehicleId || !userLocation) return;
    if (targetVehLat === null || targetVehLng === null) return;

    const uLat = Number(userLocation.lat);
    const uLng = Number(userLocation.lng);
    const vLat = targetVehLat;
    const vLng = targetVehLng;

    if (isNaN(uLat) || isNaN(uLng) || isNaN(vLat) || isNaN(vLng)) return;

    // 1. Si tenemos ruta vial en caché a menos de 30m, usarla al instante
    const cached = routeCacheRef.current[routeTargetVehicleId];
    if (
      cached &&
      calcDistanceMeters(cached.uLat, cached.uLng, uLat, uLng) < 30 &&
      calcDistanceMeters(cached.vLat, cached.vLng, vLat, vLng) < 30
    ) {
      setRoutePoints(cached.points);
      setRouteSummary(cached.summary);
      setRouteLoading(false);
      if (!lastRoutedCoordsRef.current || lastRoutedCoordsRef.current.vehId !== routeTargetVehicleId) {
        lastRoutedCoordsRef.current = { vehId: routeTargetVehicleId, uLat, uLng, vLat, vLng };
        setFitRouteTrigger((t) => t + 1);
      }
      return;
    }

    // 2. Evitar recalcular si ya se trazó la ruta vial (o ya está en vuelo) y ni el usuario ni el vehículo se han movido al menos 25 metros
    const prev = lastRoutedCoordsRef.current;
    if (prev && prev.vehId === routeTargetVehicleId) {
      const movedUser = calcDistanceMeters(prev.uLat, prev.uLng, uLat, uLng);
      const movedVeh = calcDistanceMeters(prev.vLat, prev.vLng, vLat, vLng);
      if (movedUser < 25 && movedVeh < 25) {
        return;
      }
    }

    const inFlight = inFlightRouteRef.current;
    if (inFlight && inFlight.vehId === routeTargetVehicleId) {
      const movedUser = calcDistanceMeters(inFlight.uLat, inFlight.uLng, uLat, uLng);
      const movedVeh = calcDistanceMeters(inFlight.vLat, inFlight.vLng, vLat, vLng);
      if (movedUser < 30 && movedVeh < 30) {
        return;
      }
    }

    const isFirstRouteForVeh = !prev || prev.vehId !== routeTargetVehicleId;
    if (isFirstRouteForVeh) {
      // Encuadrar la cámara de inmediato mostrando "Tú" y el vehículo mientras se traza por las calles
      setFitRouteTrigger((t) => t + 1);
    }

    const reqId = ++routeReqIdRef.current;
    inFlightRouteRef.current = { reqId, vehId: routeTargetVehicleId, uLat, uLng, vLat, vLng };
    setRouteLoading(true);

    const directMeters = calcDistanceMeters(uLat, uLng, vLat, vLng);
    const estimatedRoadMeters = Math.round(directMeters * 1.25);
    const estimatedDurationSec = Math.max(60, Math.round((estimatedRoadMeters / 1000 / 30) * 3600));

    // 3. Competencia en paralelo: Servidor propio EC2 (/api/pwa/route) + OpenStreetMap DE + OSRM Oficial
    const coordPair = `${uLng},${uLat};${vLng},${vLat}`;
    const parseRouteResponse = (res) => {
      const r = res.data?.routes?.[0];
      if (!r || !r.geometry?.coordinates || r.geometry.coordinates.length < 2) {
        throw new Error('Ruta sin geometría vial');
      }
      return r;
    };

    Promise.any([
      axios
        .get(`${API}/api/pwa/route`, {
          params: { u_lat: uLat, u_lng: uLng, v_lat: vLat, v_lng: vLng },
          timeout: 8000
        })
        .then(parseRouteResponse),
      axios
        .get(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordPair}?overview=full&geometries=geojson`, {
          timeout: 8000
        })
        .then(parseRouteResponse),
      axios
        .get(`https://router.project-osrm.org/route/v1/driving/${coordPair}?overview=full&geometries=geojson`, {
          timeout: 8000
        })
        .then(parseRouteResponse)
    ])
      .then((route) => {
        if (routeReqIdRef.current !== reqId) return;
        const coordsLatLng = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        const summary = {
          distanceMeters: route.distance ?? estimatedRoadMeters,
          durationSeconds: route.duration ?? estimatedDurationSec,
          isDirectFallback: false
        };
        lastRoutedCoordsRef.current = { vehId: routeTargetVehicleId, uLat, uLng, vLat, vLng };
        routeCacheRef.current[routeTargetVehicleId] = {
          uLat,
          uLng,
          vLat,
          vLng,
          points: coordsLatLng,
          summary
        };
        setRoutePoints(coordsLatLng);
        setRouteSummary(summary);
        if (isFirstRouteForVeh) {
          setFitRouteTrigger((t) => t + 1);
        }
      })
      .catch((err) => {
        if (routeReqIdRef.current !== reqId) return;
        console.warn('Aviso ruteo vial:', err);
      })
      .finally(() => {
        if (routeReqIdRef.current === reqId) {
          inFlightRouteRef.current = null;
          setRouteLoading(false);
        }
      });
  }, [isMobileApp, routeTargetVehicleId, userLocation?.lat, userLocation?.lng, targetVehLat, targetVehLng]);

  const handleSaveSpeedLimit = async (e) => {
    e.preventDefault();
    if (tempSpeed < 20 || tempSpeed > 160) return;
    try {
      setSavingSpeed(true);
      const catalogIds = Object.keys(allEmpresasMap).map((k) => Number(k)).filter(Boolean);
      const targetIds =
        isSuperAdmin && speedTargetEmpresaId === 'ALL'
          ? (catalogIds.length > 0 ? catalogIds : [effectiveSpeedEmpresaId])
          : [Number((isSuperAdmin && speedTargetEmpresaId) ? speedTargetEmpresaId : effectiveSpeedEmpresaId)];

      await Promise.all(
        targetIds.map((id) =>
          axios.put(
            `${API}/api/empresas/${id}/limite-velocidad`,
            { limite_velocidad: tempSpeed },
            { headers }
          )
        )
      );

      setAllEmpresasMap((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          if (next[id]) {
            next[id] = { ...next[id], limite_velocidad: tempSpeed };
          }
        });
        return next;
      });

      setVehiculos((prev) =>
        prev.map((v) =>
          targetIds.includes(Number(v.empresa_id))
            ? { ...v, empresa_limite_velocidad: tempSpeed }
            : v
        )
      );

      if (targetIds.includes(Number(effectiveSpeedEmpresaId))) {
        setLimiteVelocidad(tempSpeed);
      }

      if (!isSuperAdmin) {
        const currentEmpresa = JSON.parse(localStorage.getItem('empresa') || '{}');
        currentEmpresa.limite_velocidad = tempSpeed;
        localStorage.setItem('empresa', JSON.stringify(currentEmpresa));
        setEmpresa(currentEmpresa);
      }

      targetIds.forEach((id) => {
        const empInfo = allEmpresasMap[id] || { id, nombre: effectiveEmpresaNombre };
        emitLiveSync({
          type: 'empresa_updated',
          empresa_id: id,
          empresa: { ...empInfo, id, limite_velocidad: tempSpeed },
        });
      });

      const targetLabel =
        isSuperAdmin && speedTargetEmpresaId === 'ALL'
          ? 'todas las empresas y unidades'
          : (allEmpresasMap[targetIds[0]]?.nombre || effectiveEmpresaNombre);

      setShowSpeedModal(false);
      setSpeedToast(`Límite actualizado a ${tempSpeed} km/h (${targetLabel})`);
      setTimeout(() => setSpeedToast(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al actualizar límite de velocidad");
    } finally {
      setSavingSpeed(false);
    }
  };

  const primaryColor = empresa.color_primario || '#1E40AF';

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100 relative">
      {/* Toast Notification */}
      {speedToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom">
          <Check size={20} className="bg-white/20 p-0.5 rounded-full" />
          <span className="font-medium text-sm">{speedToast}</span>
        </div>
      )}

      {/* Sidebar with fleet list */}
      <Sidebar 
        vehiculos={vehiculosFiltrados} 
        color={primaryColor} 
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
        limiteVelocidad={limiteVelocidad}
        showEmpresaFilter={isSuperAdmin}
        empresas={empresasList}
        empresaFilter={empresaFilter}
        onEmpresaFilterChange={setEmpresaFilter}
        filterCounts={filterCounts}
        hasParticulares={particularIds.length > 0}
        collapsed={isFleetCollapsed}
        onToggleCollapse={() => setIsFleetCollapsed(!isFleetCollapsed)}
        isMobileApp={isMobileApp}
        routeTargetVehicleId={routeTargetVehicleId}
        onStartRouteToVehicle={handleStartRouteToVehicle}
        onStopRoute={handleStopRoute}
      />

      <div className="monitoring-map flex-1 relative h-full w-full overflow-hidden">
        {/* Floating Top Controls (Botón de Reapertura y Widget Límite de Velocidad) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 md:top-4 md:left-4 md:right-auto z-[1000] flex items-center justify-between md:justify-start gap-2 md:gap-2.5 flex-wrap pointer-events-none">
          {/* Botón flotante para reabrir panel de flota */}
          {isFleetCollapsed && (
            <button
              onClick={() => setIsFleetCollapsed(false)}
              className="pointer-events-auto bg-white/95 hover:bg-white backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-xl border border-slate-200/90 flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer text-slate-800 animate-in fade-in slide-in-from-left duration-200"
              title="Mostrar lista de vehículos"
            >
              <div 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold shadow-xs" 
                style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
              >
                <Navigation size={13} />
              </div>
              <span className="font-bold text-xs tracking-wide">Flota ({vehiculosFiltrados.length})</span>
              <ChevronRight size={14} className="text-slate-400" />
            </button>
          )}

          {/* Floating Speed Limit Widget on Map */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-xl border border-slate-200/80 flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Gauge size={15} />
            </div>
            <div className="max-w-[140px] sm:max-w-[200px]">
              <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none truncate">
                {isSuperAdmin ? `Límite · ${effectiveEmpresaNombre}` : 'Límite'}
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1 leading-tight mt-0.5">
                <span>{limiteVelocidad} km/h</span>
                <span className="hidden sm:inline text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Activo
                </span>
              </div>
            </div>
            {canEditSpeedLimit && (
              <button
                onClick={() => {
                  const defaultTarget = String(effectiveSpeedEmpresaId);
                  setSpeedTargetEmpresaId(defaultTarget);
                  const currentTargetLimit = allEmpresasMap[effectiveSpeedEmpresaId]?.limite_velocidad || limiteVelocidad;
                  setTempSpeed(currentTargetLimit);
                  setShowSpeedModal(true);
                }}
                className="ml-0.5 sm:ml-2 text-[11px] sm:text-xs font-semibold px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-sm shadow-amber-500/30 flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Ajustar límite de velocidad"
              >
                <Sliders size={12} />
                <span className="hidden sm:inline">Ajustar</span>
              </button>
            )}
          </div>
        </div>

        {/* Botón flotante inferior para Móviles cuando la flota esté colapsada */}
        {isFleetCollapsed && (
          <button
            onClick={() => setIsFleetCollapsed(false)}
            className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/95 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-xs tracking-wide active:scale-95 border border-slate-700 animate-in fade-in slide-in-from-bottom duration-300 cursor-pointer"
          >
            <Navigation size={14} style={{ color: primaryColor }} />
            <span>Ver Unidades ({vehiculosFiltrados.length})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>
        )}

        {/* Botón flotante exclusivo Móvil: Ver Mi Ubicación en el Mapa */}
        <button
          type="button"
          onClick={handleLocateMe}
          className={`md:hidden absolute bottom-3 right-3 z-[500] w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
            userLocation
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/40'
              : 'bg-white/95 text-slate-700 border-slate-200'
          }`}
          title="Mostrar mi ubicación actual en el mapa"
        >
          <LocateFixed size={18} className={isLocatingUser ? 'animate-spin text-blue-500' : ''} />
        </button>

        {/* Live Map */}
        <LiveMap 
          vehiculos={vehiculosMapa} 
          selectedVehicleId={selectedVehicleId}
          emergencyVehicleId={emergencyVehicleId}
          limiteVelocidad={limiteVelocidad}
          onSelectVehicle={(id) => setSelectedVehicleId(id)}
          onClearFocus={handleClearFocus}
          isMobileApp={isMobileApp}
          userLocation={userLocation}
          routeTargetVehicleId={routeTargetVehicleId}
          routePoints={routePoints}
          routeSummary={routeSummary}
          routeLoading={routeLoading}
          fitRouteTrigger={fitRouteTrigger}
          centerUserTrigger={centerUserTrigger}
          onStartRouteToVehicle={handleStartRouteToVehicle}
          onStopRoute={handleStopRoute}
          onFitRouteBounds={() => setFitRouteTrigger((t) => t + 1)}
        />
        
        {/* Alerts Overlay (Panic, Sabotage & Speed alerts) */}
        <div className="absolute top-14 left-2.5 right-2.5 sm:top-4 sm:left-auto sm:right-4 z-[1000] space-y-2.5 sm:space-y-4 sm:max-w-sm">
          {alertas.filter((a) => !a.estado || a.estado === 'pendiente').map((alerta, idx) => (
            <PanicAlert 
              key={alerta.alerta_id || alerta.id || idx} 
              alerta={alerta} 
              onAtender={() => handleAtenderAlerta(alerta.alerta_id || alerta.id)} 
            />
          ))}
        </div>
      </div>

      {/* Modal: Ajustar Límite de Velocidad */}
      {showSpeedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Gauge size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Límite de Velocidad Máxima</h3>
                  <p className="text-xs text-slate-400">
                    Configuración para{' '}
                    {isSuperAdmin
                      ? (speedTargetEmpresaId === 'ALL'
                          ? 'todas las empresas y unidades'
                          : (allEmpresasMap[Number(speedTargetEmpresaId)]?.nombre || effectiveEmpresaNombre))
                      : effectiveEmpresaNombre}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSpeedModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSpeedLimit} className="p-6 space-y-5">
              {isSuperAdmin && Object.keys(allEmpresasMap).length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <Building2 size={14} className="text-amber-600" />
                    <span>Empresa o Cliente Particular a configurar:</span>
                  </label>
                  <select
                    value={speedTargetEmpresaId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpeedTargetEmpresaId(val);
                      if (val !== 'ALL' && allEmpresasMap[Number(val)]?.limite_velocidad) {
                        setTempSpeed(allEmpresasMap[Number(val)].limite_velocidad);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.values(allEmpresasMap).map((empItem) => (
                      <option key={empItem.id} value={String(empItem.id)}>
                        {empItem.tipo === 'particular' ? `🚗 Particular: ${empItem.nombre}` : `🏢 ${empItem.nombre}`} (Actual: {empItem.limite_velocidad || 90} km/h)
                      </option>
                    ))}
                    <option value="ALL">🌐 Todas las empresas y unidades del sistema</option>
                  </select>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-700">Velocidad Límite Permitida:</label>
                  <span className="text-base font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 font-mono">
                    {tempSpeed} km/h
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="20"
                  max="160"
                  step="5"
                  value={tempSpeed}
                  onChange={(e) => setTempSpeed(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
                  <span>20 km/h</span>
                  <span>90 km/h</span>
                  <span>160 km/h</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Valores rápidos recomendados:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { speed: 40, label: 'Urbana (40)' },
                    { speed: 60, label: 'Avenida (60)' },
                    { speed: 80, label: 'Carretera (80)' },
                    { speed: 90, label: 'Ruta (90)' },
                    { speed: 100, label: 'Autopista (100)' },
                    { speed: 110, label: 'Rápida (110)' },
                  ].map(item => (
                    <button
                      key={item.speed}
                      type="button"
                      onClick={() => setTempSpeed(item.speed)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${tempSpeed === item.speed ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                🔔 <strong>Notificación inmediata:</strong> Cuando cualquier unidad de la flota supere los <strong>{tempSpeed} km/h</strong>, el sistema generará una alerta de exceso de velocidad en tiempo real para gerentes, administradores y operadores.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSpeedModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSpeed}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  {savingSpeed ? 'Guardando...' : 'Aplicar Límite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
