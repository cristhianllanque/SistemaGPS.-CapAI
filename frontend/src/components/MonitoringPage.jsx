import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import { Gauge, Sliders, Check, X, Navigation, ChevronRight, LocateFixed } from 'lucide-react';
import LiveMap from './LiveMap';
import Sidebar from './Sidebar';
import PanicAlert from './PanicAlert';
import { siren } from '../utils/sound';
import { API_BASE_URL as API, WS_BASE_URL, isNativeApp } from '../config';

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
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [speedToast, setSpeedToast] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  const activeEmpresaId = empresa?.id || 1;
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const canEditSpeedLimit = usuario?.rol === 'superadmin' || usuario?.rol === 'admin';

  // Filtro de flota (solo Superadmin): 'all' | 'particulares' | '<empresa_id>'
  const [empresaFilter, setEmpresaFilter] = useState('all');
  const [empresasList, setEmpresasList] = useState([]);
  const [particularIds, setParticularIds] = useState([]);

  // ================= ESTADO EXCLUSIVO APLICATIVO MÓVIL: MI UBICACIÓN & RUTA AL VEHÍCULO =================
  const [isMobileApp, setIsMobileApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNativeApp || window.innerWidth < 768;
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [routeTargetVehicleId, setRouteTargetVehicleId] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [fitRouteTrigger, setFitRouteTrigger] = useState(0);
  const [centerUserTrigger, setCenterUserTrigger] = useState(0);

  const geoWatchIdRef = useRef(null);
  const lastRoutedCoordsRef = useRef(null);

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

    // Lectura rápida inicial + seguimiento continuo de alta precisión
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 20
        };
        setUserLocation(coords);
        setIsLocatingUser(false);
        if (shouldCenterOnUser) {
          setCenterUserTrigger((prev) => prev + 1);
        }
      },
      () => {
        setIsLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    if (geoWatchIdRef.current === null) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
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
  }, []);

  const handleLocateMe = () => {
    if (userLocation) {
      setCenterUserTrigger((prev) => prev + 1);
    }
    ensureUserLocationWatching(true);
  };

  const handleStartRouteToVehicle = (vehiculoId) => {
    setSelectedVehicleId(vehiculoId);
    setRouteTargetVehicleId(vehiculoId);
    lastRoutedCoordsRef.current = null;
    ensureUserLocationWatching(false);
    setFitRouteTrigger((prev) => prev + 1);
  };

  const handleStopRoute = () => {
    setRouteTargetVehicleId(null);
    setRoutePoints([]);
    setRouteSummary(null);
    setRouteLoading(false);
    lastRoutedCoordsRef.current = null;
  };

  const WS_URL = token 
    ? `${WS_BASE_URL}/ws/flota/${activeEmpresaId}?token=${token}` 
    : null;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  // Check URL search parameters (e.g., ?vehiculo=12)
  useEffect(() => {
    const urlVehiculoId = searchParams.get('vehiculo');
    if (urlVehiculoId) {
      const parsedId = parseInt(urlVehiculoId, 10);
      if (!isNaN(parsedId)) {
        setSelectedVehicleId(parsedId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, alertRes, empRes] = await Promise.all([
          axios.get(`${API}/api/vehiculos/`, { headers }),
          axios.get(`${API}/api/alertas/`, { headers }),
          axios.get(`${API}/api/empresas/${activeEmpresaId}`, { headers }).catch(() => null)
        ]);
        
        // Solo vehículos activos Y con dispositivo vinculado
        setVehiculos(vehRes.data.filter(v => v.dispositivo_id != null));
        setAlertas(alertRes.data);

        if (empRes?.data?.limite_velocidad) {
          setLimiteVelocidad(empRes.data.limite_velocidad);
          setTempSpeed(empRes.data.limite_velocidad);
        }

        // If there are pending panic alerts on load, focus on the most recent one
        const pendingPanics = alertRes.data.filter(a => a.estado === 'pendiente' && a.tipo !== 'exceso_velocidad');
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
  }, []);

  // Carga de empresas y clientes particulares para el filtro del Superadmin
  useEffect(() => {
    if (!isSuperAdmin) return;
    Promise.all([
      axios.get(`${API}/api/empresas/`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${API}/api/empresas/`, { headers, params: { tipo: 'particular' } }).catch(() => ({ data: [] })),
    ]).then(([empRes, partRes]) => {
      setEmpresasList((empRes.data || []).map(e => ({ id: e.id, nombre: e.nombre })));
      setParticularIds((partRes.data || []).map(p => Number(p.id)));
    });
  }, [isSuperAdmin]);

  const vehiculosFiltrados = useMemo(() => {
    if (!isSuperAdmin || empresaFilter === 'all') return vehiculos;
    if (empresaFilter === 'particulares') {
      return vehiculos.filter(v => particularIds.includes(Number(v.empresa_id)));
    }
    return vehiculos.filter(v => Number(v.empresa_id) === Number(empresaFilter));
  }, [vehiculos, empresaFilter, particularIds, isSuperAdmin]);

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
        if (lastJsonMessage.limite_velocidad) {
          setLimiteVelocidad(lastJsonMessage.limite_velocidad);
        }
        setVehiculos(prev => prev.map(v => {
          if (v.id === lastJsonMessage.vehiculo_id) {
            return {
              ...v,
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

        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [lastJsonMessage, ...prev];
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
  }, [lastJsonMessage]);

  const handleAtenderAlerta = async (alertaId) => {
    try {
      await axios.put(`${API}/api/alertas/${alertaId}/atender`, { estado: 'atendida' }, { headers });
      setAlertas(prev => prev.filter(a => a.alerta_id !== alertaId && a.id !== alertaId));
      
      // If no more alerts, stop siren and clear emergency mode
      if (alertas.length <= 1) {
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

  // Calcular la ruta vial por calles (OSRM) desde el celular hasta el vehículo objetivo
  useEffect(() => {
    if (!isMobileApp || !routeTargetVehicleId || !userLocation) return;

    const targetVeh = vehiculos.find((v) => v.id === routeTargetVehicleId);
    const u = targetVeh?.ultima_lectura;
    if (!u || u.latitud == null || u.longitud == null) return;

    const uLat = Number(userLocation.lat);
    const uLng = Number(userLocation.lng);
    const vLat = Number(u.latitud);
    const vLng = Number(u.longitud);

    if (isNaN(uLat) || isNaN(uLng) || isNaN(vLat) || isNaN(vLng)) return;

    // Evitar recalcular OSRM si ni el usuario ni el vehículo se han movido al menos 18 metros
    const prev = lastRoutedCoordsRef.current;
    if (prev) {
      const movedUser = calcDistanceMeters(prev.uLat, prev.uLng, uLat, uLng);
      const movedVeh = calcDistanceMeters(prev.vLat, prev.vLng, vLat, vLng);
      if (movedUser < 18 && movedVeh < 18) {
        return;
      }
    }

    const isFirstRouteCalc = !prev;
    lastRoutedCoordsRef.current = { uLat, uLng, vLat, vLng };

    let cancelled = false;
    setRouteLoading(true);

    const directMeters = calcDistanceMeters(uLat, uLng, vLat, vLng);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${vLng},${vLat}?overview=full&geometries=geojson`;

    axios
      .get(osrmUrl, { timeout: 6000 })
      .then((res) => {
        if (cancelled) return;
        const route = res.data?.routes?.[0];
        if (route && route.geometry?.coordinates?.length >= 2) {
          const coordsLatLng = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          setRoutePoints(coordsLatLng);
          setRouteSummary({
            distanceMeters: route.distance ?? directMeters,
            durationSeconds: route.duration ?? Math.max(60, (directMeters / 1000 / 30) * 3600),
            isDirectFallback: false
          });
        } else {
          setRoutePoints([
            [uLat, uLng],
            [vLat, vLng]
          ]);
          setRouteSummary({
            distanceMeters: directMeters,
            durationSeconds: Math.max(60, (directMeters / 1000 / 30) * 3600),
            isDirectFallback: true
          });
        }
        if (isFirstRouteCalc) {
          setFitRouteTrigger((t) => t + 1);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Respaldo instantáneo si no hay respuesta del servidor OSRM
        setRoutePoints([
          [uLat, uLng],
          [vLat, vLng]
        ]);
        setRouteSummary({
          distanceMeters: directMeters,
          durationSeconds: Math.max(60, (directMeters / 1000 / 30) * 3600),
          isDirectFallback: true
        });
        if (isFirstRouteCalc) {
          setFitRouteTrigger((t) => t + 1);
        }
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMobileApp, routeTargetVehicleId, userLocation, vehiculos]);

  const handleSaveSpeedLimit = async (e) => {
    e.preventDefault();
    if (tempSpeed < 20 || tempSpeed > 160) return;
    try {
      setSavingSpeed(true);
      await axios.put(`${API}/api/empresas/${activeEmpresaId}/limite-velocidad`, {
        limite_velocidad: tempSpeed
      }, { headers });

      setLimiteVelocidad(tempSpeed);
      
      // Update local storage
      const currentEmpresa = JSON.parse(localStorage.getItem('empresa') || '{}');
      currentEmpresa.limite_velocidad = tempSpeed;
      localStorage.setItem('empresa', JSON.stringify(currentEmpresa));
      setEmpresa(currentEmpresa);

      setShowSpeedModal(false);
      setSpeedToast(`Límite de velocidad actualizado a ${tempSpeed} km/h`);
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
            <div>
              <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">Límite</div>
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
                  setTempSpeed(limiteVelocidad);
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
        
        {/* Alerts Overlay (Panic & Speed alerts) */}
        <div className="absolute top-14 left-2.5 right-2.5 sm:top-4 sm:left-auto sm:right-4 z-[1000] space-y-2.5 sm:space-y-4 sm:max-w-sm">
          {alertas.map((alerta, idx) => (
            <PanicAlert 
              key={idx} 
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
                  <p className="text-xs text-slate-400">Configuración para {empresa?.nombre || 'la flota'}</p>
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
