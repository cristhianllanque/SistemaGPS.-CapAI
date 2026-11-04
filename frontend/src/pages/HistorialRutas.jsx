import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  Search, Play, Pause, RotateCcw, Gauge, AlertTriangle,
  SlidersHorizontal, ChevronUp, ChevronDown, Truck
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
const movingVehicleIcon = L.divIcon({
  className: 'custom-moving-icon',
  html: `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: bold;">
        🚗
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const startIcon = L.divIcon({
  className: 'custom-start-icon',
  html: `<div style="background-color: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">A</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const endIcon = L.divIcon({
  className: 'custom-end-icon',
  html: `<div style="background-color: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">B</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const stopIcon = L.divIcon({
  className: 'custom-stop-icon',
  html: `<div style="background-color: #f59e0b; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Helper component to center and zoom map when route updates
function MapController({ bounds, flyToTarget }) {
  const map = useMap();

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo(flyToTarget, 16, { duration: 1 });
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, flyToTarget, map]);

  return null;
}

// Local datetime-local input formatter (preserves local timezone)
const formatLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
};

export default function HistorialRutas() {
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  
  // Initialize to today from 00:00 to 23:59 local time
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [fechaInicio, setFechaInicio] = useState(formatLocalInput(startOfDay));
  const [fechaFin, setFechaFin] = useState(formatLocalInput(endOfDay));
  const [activePreset, setActivePreset] = useState('hoy');
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
  const [mobileStatsCollapsed, setMobileStatsCollapsed] = useState(false);
  
  const [historialData, setHistorialData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [showStopsList, setShowStopsList] = useState(false);
  
  const playIntervalRef = useRef(null);

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const fetchVehiculos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/vehiculos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehiculos(res.data);
      if (res.data.length > 0) {
        setSelectedVehiculo(String(res.data[0].id));
      }
    } catch (error) {
      console.error("Error cargando vehículos", error);
    }
  };

  const setPreset = (type) => {
    setActivePreset(type);
    const cur = new Date();
    if (type === 'hoy') {
      const s = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0);
      const e = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59);
      setFechaInicio(formatLocalInput(s));
      setFechaFin(formatLocalInput(e));
    } else if (type === 'ayer') {
      const y = new Date(cur);
      y.setDate(y.getDate() - 1);
      const s = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      const e = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
      setFechaInicio(formatLocalInput(s));
      setFechaFin(formatLocalInput(e));
    } else if (type === '24h') {
      const s = new Date(cur.getTime() - 24 * 60 * 60 * 1000);
      setFechaInicio(formatLocalInput(s));
      setFechaFin(formatLocalInput(cur));
    } else if (type === '7d') {
      const s = new Date(cur.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFechaInicio(formatLocalInput(s));
      setFechaFin(formatLocalInput(cur));
    }
  };

  const handleSearch = async () => {
    if (!selectedVehiculo) return;
    setLoading(true);
    setHistorialData(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setFlyToTarget(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/vehiculos/${selectedVehiculo}/historial`, {
        params: { 
          fecha_inicio: new Date(fechaInicio).toISOString(), 
          fecha_fin: new Date(fechaFin).toISOString() 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorialData(res.data);
      // En móvil, contraer automáticamente el panel de filtros para dejar el mapa libre
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileFiltersOpen(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error al cargar historial. Verifique el rango de fechas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPlaying && historialData && historialData.coordenadas.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= historialData.coordenadas.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      clearInterval(playIntervalRef.current);
    }
    
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, playbackSpeed, historialData]);

  const togglePlay = () => {
    if (currentIndex >= (historialData?.coordenadas.length || 0) - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const polylinePositions = historialData?.coordenadas.map(c => [c.latitud, c.longitud]) || [];
  const currentPoint = historialData?.coordenadas[currentIndex];
  const startPoint = historialData?.coordenadas?.[0];
  const endPoint = historialData?.coordenadas?.[historialData.coordenadas.length - 1];
  
  const mapCenter = polylinePositions.length > 0 ? polylinePositions[0] : [-15.498, -70.133];

  const formatMinutes = (mins) => {
    if (!mins) return '0 min';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const selectedVehObj = vehiculos.find(v => String(v.id) === String(selectedVehiculo));
  const presetLabelMap = {
    hoy: 'Hoy',
    ayer: 'Ayer',
    '24h': 'Últimas 24h',
    '7d': '7 días',
    custom: 'Personalizado'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* ===================================================================== */}
      {/* BARRA DE FILTROS ESCRITORIO (md:flex - Intacta para PC/Laptop)         */}
      {/* ===================================================================== */}
      <div className="hidden md:flex bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-44">
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Vehículo</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 bg-slate-50"
              value={selectedVehiculo}
              onChange={(e) => setSelectedVehiculo(e.target.value)}
            >
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>{v.placa} ({v.empresa?.nombre || 'Flota'})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Fecha y Hora Desde</label>
            <input 
              type="datetime-local" 
              className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
              value={fechaInicio}
              onChange={(e) => { setActivePreset('custom'); setFechaInicio(e.target.value); }}
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Fecha y Hora Hasta</label>
            <input 
              type="datetime-local" 
              className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
              value={fechaFin}
              onChange={(e) => { setActivePreset('custom'); setFechaFin(e.target.value); }}
            />
          </div>

          <button 
            onClick={handleSearch}
            disabled={!selectedVehiculo || loading}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm shadow-sm cursor-pointer"
          >
            <Search size={16} /> {loading ? 'Cargando Recorrido...' : 'Consultar'}
          </button>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold self-end">
          <button onClick={() => setPreset('hoy')} className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors cursor-pointer">Hoy</button>
          <button onClick={() => setPreset('ayer')} className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors cursor-pointer">Ayer</button>
          <button onClick={() => setPreset('24h')} className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors cursor-pointer">Últimas 24h</button>
          <button onClick={() => setPreset('7d')} className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors cursor-pointer">Últimos 7 días</button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BARRA DE FILTROS MÓVIL COLAPSABLE (md:hidden - Optimizada para iPhone/Android) */}
      {/* ===================================================================== */}
      <div className="md:hidden bg-white border-b border-slate-200 shadow-xs z-20 flex-shrink-0">
        {/* Barra Resumen Compacta de 1 línea */}
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <div
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Truck size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 truncate">
                  {selectedVehObj ? selectedVehObj.placa : 'Seleccionar Unidad'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {presetLabelMap[activePreset] || 'Rango'}
                </span>
                {historialData?.estadisticas && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {historialData.estadisticas.distancia_km} km
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!mobileFiltersOpen && (
              <button
                type="button"
                onClick={handleSearch}
                disabled={!selectedVehiculo || loading}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
              >
                <Search size={12} />
                <span>{loading ? '...' : 'Actualizar'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              <span>{mobileFiltersOpen ? 'Ocultar' : 'Filtros'}</span>
              {mobileFiltersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Filtros en Móvil */}
        {mobileFiltersOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
            {/* Selector de Vehículo y Accesos Rápidos de Fecha */}
            <div className="grid grid-cols-1 gap-2">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 bg-slate-50"
                value={selectedVehiculo}
                onChange={(e) => setSelectedVehiculo(e.target.value)}
              >
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    🚐 {v.placa} — {v.empresa?.nombre || 'Mi Flota'}
                  </option>
                ))}
              </select>

              {/* Chips Rápidos de Tiempo */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                {[
                  { id: 'hoy', label: 'Hoy' },
                  { id: 'ayer', label: 'Ayer' },
                  { id: '24h', label: '24 Horas' },
                  { id: '7d', label: '7 Días' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id)}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                      activePreset === item.id
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fechas Desde y Hasta en 2 columnas paralelas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Desde</label>
                <input
                  type="datetime-local"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50"
                  value={fechaInicio}
                  onChange={(e) => { setActivePreset('custom'); setFechaInicio(e.target.value); }}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Hasta</label>
                <input
                  type="datetime-local"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-50"
                  value={fechaFin}
                  onChange={(e) => { setActivePreset('custom'); setFechaFin(e.target.value); }}
                />
              </div>
            </div>

            {/* Botón Consultar */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={!selectedVehiculo || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Search size={15} />
              <span>{loading ? 'Buscando Recorrido...' : 'Consultar Recorrido en Mapa'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Leaflet Map */}
        <div className="flex-1 relative z-0">
          <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController bounds={polylinePositions} flyToTarget={flyToTarget} />

            {/* Polyline Route */}
            {polylinePositions.length > 0 && (
              <Polyline positions={polylinePositions} color="#4f46e5" weight={5} opacity={0.8} />
            )}
            
            {/* Start Marker (Green Flag) */}
            {startPoint && (
              <Marker position={[startPoint.latitud, startPoint.longitud]} icon={startIcon}>
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-emerald-700 font-bold block mb-1">🏁 Punto de Inicio</strong>
                    Hora: {new Date(startPoint.timestamp).toLocaleTimeString()}<br/>
                    Fecha: {new Date(startPoint.timestamp).toLocaleDateString()}<br/>
                    Motor: {startPoint.ignicion ? 'ON' : 'OFF'}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* End Marker (Red Flag) */}
            {endPoint && polylinePositions.length > 1 && (
              <Marker position={[endPoint.latitud, endPoint.longitud]} icon={endIcon}>
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-red-700 font-bold block mb-1">🏁 Punto Final / Último Reporte</strong>
                    Hora: {new Date(endPoint.timestamp).toLocaleTimeString()}<br/>
                    Fecha: {new Date(endPoint.timestamp).toLocaleDateString()}<br/>
                    Velocidad: {endPoint.velocidad} km/h
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Stops Markers */}
            {historialData?.paradas?.map((parada, idx) => (
              <Marker key={`stop-${idx}`} position={[parada.latitud, parada.longitud]} icon={stopIcon}>
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-amber-800 font-bold block mb-1">🛑 Parada #{idx + 1}</strong>
                    <strong>Duración:</strong> {formatMinutes(parada.duracion_minutos)}<br/>
                    <strong>Inicio:</strong> {new Date(parada.timestamp_inicio).toLocaleTimeString()}<br/>
                    <strong>Fin:</strong> {new Date(parada.timestamp_fin).toLocaleTimeString()}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Current Active Playback Marker */}
            {currentPoint && (
              <Marker position={[currentPoint.latitud, currentPoint.longitud]} icon={movingVehicleIcon}>
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-blue-700 font-bold block mb-1">Posición en Reproducción</strong>
                    <strong>Hora:</strong> {new Date(currentPoint.timestamp).toLocaleTimeString()}<br/>
                    <strong>Velocidad:</strong> {currentPoint.velocidad} km/h<br/>
                    <strong>Motor:</strong> {currentPoint.ignicion ? 'ENCENDIDO (ON)' : 'APAGADO (OFF)'}<br/>
                    {currentPoint.bateria_ext !== undefined && currentPoint.bateria_ext !== null && (
                      <span><strong>Batería:</strong> {currentPoint.bateria_ext} V<br/></span>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Stops Floating Drawer Toggle Button */}
        {historialData && historialData.paradas && historialData.paradas.length > 0 && (
          <button
            onClick={() => setShowStopsList(!showStopsList)}
            className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/95 backdrop-blur shadow-md border border-slate-200 px-3 py-1.5 md:py-2 rounded-lg text-[11px] md:text-xs font-bold text-slate-700 hover:bg-slate-50 z-[1000] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            🛑 {showStopsList ? 'Ocultar Paradas' : `Paradas (${historialData.paradas.length})`}
          </button>
        )}

        {/* Stops Floating List */}
        {showStopsList && historialData?.paradas && (
          <div className="absolute top-12 right-3 md:top-16 md:right-4 w-64 md:w-72 max-h-64 md:max-h-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-3 z-[1000] overflow-y-auto space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold text-slate-800">
              <span>Paradas Registradas ({historialData.paradas.length})</span>
              <button onClick={() => setShowStopsList(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            {historialData.paradas.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setFlyToTarget([p.latitud, p.longitud]);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setShowStopsList(false);
                  }
                }}
                className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/80 hover:bg-amber-100/70 cursor-pointer transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-amber-950">Parada #{idx + 1}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(p.timestamp_inicio).toLocaleTimeString()} - {new Date(p.timestamp_fin).toLocaleTimeString()}
                  </p>
                </div>
                <span className="font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full text-[10px]">
                  {formatMinutes(p.duracion_minutos)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty State Banner */}
        {historialData && historialData.coordenadas.length === 0 && (
          <div className="absolute top-4 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-slate-200 px-4 py-2.5 md:px-6 md:py-3 rounded-xl z-[1000] text-xs md:text-sm text-slate-600 flex items-center gap-2.5">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
            <span>No se encontraron recorridos en el rango seleccionado.</span>
          </div>
        )}

        {/* Playback Controls & Stats Dashboard Bar (Compacto y Plegable en Móvil, Completo en Escritorio) */}
        {historialData && historialData.coordenadas.length > 0 && (
          <div
            className={`${
              mobileFiltersOpen ? 'hidden md:flex' : 'flex'
            } absolute bottom-2.5 left-2.5 right-2.5 md:bottom-4 md:left-4 md:right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-2.5 md:p-4 z-[900] flex-col md:flex-row gap-2 md:gap-5 items-center`}
          >
            {/* Barra superior móvil del reproductor para minimizar/expandir métricas */}
            <div className="flex md:hidden items-center justify-between w-full pb-1 border-b border-slate-100 text-[10px]">
              {currentPoint ? (
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 truncate">
                  <span>⏱ {new Date(currentPoint.timestamp).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{currentPoint.velocidad} km/h</span>
                  <span>•</span>
                  <span className={currentPoint.ignicion ? 'text-emerald-600' : 'text-slate-400'}>
                    {currentPoint.ignicion ? 'ON' : 'OFF'}
                  </span>
                  {currentPoint.bateria_ext !== undefined && currentPoint.bateria_ext !== null && (
                    <>
                      <span>•</span>
                      <span className={currentPoint.bateria_ext < 6 ? 'text-rose-600' : 'text-slate-600'}>
                        ⚡ {currentPoint.bateria_ext}V
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="font-bold text-slate-600">Reproductor de Recorrido</span>
              )}
              <button
                type="button"
                onClick={() => setMobileStatsCollapsed(!mobileStatsCollapsed)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold cursor-pointer flex-shrink-0"
              >
                <span>{mobileStatsCollapsed ? 'Ver datos' : 'Minimizar'}</span>
                {mobileStatsCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Key Trip Metrics: Plegables en móvil para no tapar el mapa */}
            <div
              className={`${
                mobileStatsCollapsed ? 'hidden md:grid' : 'grid'
              } grid-cols-5 gap-1.5 md:gap-3 border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-5 w-full md:w-auto flex-shrink-0 text-center md:text-left`}
            >
              <div className="bg-slate-50 p-1.5 md:p-2 rounded-lg border border-slate-100">
                <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold truncate">Distancia</p>
                <p className="text-xs md:text-base font-extrabold text-slate-800 leading-tight">
                  {historialData.estadisticas.distancia_km} <span className="text-[9px] md:text-[11px] font-normal text-slate-500">km</span>
                </p>
              </div>
              <div className="bg-slate-50 p-1.5 md:p-2 rounded-lg border border-slate-100">
                <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold truncate">Vel. Máx</p>
                <p className="text-xs md:text-base font-extrabold text-slate-800 leading-tight">
                  {historialData.estadisticas.velocidad_maxima} <span className="text-[9px] md:text-[11px] font-normal text-slate-500">k/h</span>
                </p>
              </div>
              <div className="bg-slate-50 p-1.5 md:p-2 rounded-lg border border-slate-100">
                <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-bold truncate">Promedio</p>
                <p className="text-xs md:text-base font-extrabold text-slate-800 leading-tight">
                  {historialData.estadisticas.velocidad_promedio} <span className="text-[9px] md:text-[11px] font-normal text-slate-500">k/h</span>
                </p>
              </div>
              <div className="bg-emerald-50/70 p-1.5 md:p-2 rounded-lg border border-emerald-100">
                <p className="text-[8px] md:text-[10px] text-emerald-700 uppercase font-bold truncate">Motor ON</p>
                <p className="text-xs md:text-base font-extrabold text-emerald-900 leading-tight">
                  {formatMinutes(historialData.estadisticas.tiempo_encendido_minutos)}
                </p>
              </div>
              <div className="bg-amber-50/70 p-1.5 md:p-2 rounded-lg border border-amber-100">
                <p className="text-[8px] md:text-[10px] text-amber-700 uppercase font-bold truncate">Paradas</p>
                <p className="text-xs md:text-base font-extrabold text-amber-900 leading-tight">
                  {historialData.estadisticas.total_paradas || historialData.paradas?.length || 0}
                </p>
              </div>
            </div>

            {/* Playback Controls & Timeline Slider */}
            <div className="flex-1 w-full flex flex-col justify-center">
              <div className="flex items-center gap-2 md:gap-3 mb-0 md:mb-2">
                <button 
                  onClick={togglePlay}
                  className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                </button>

                <button
                  onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                  className="p-1.5 md:p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                  title="Reiniciar ruta"
                >
                  <RotateCcw size={14} />
                </button>
                
                {/* Timeline Slider */}
                <div className="flex-1 relative flex items-center group">
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.max(0, historialData.coordenadas.length - 1)} 
                    value={currentIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentIndex(parseInt(e.target.value));
                    }}
                    className="w-full h-2 md:h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                
                {/* Playback Speeds */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 md:p-1 gap-0.5 flex-shrink-0">
                  {[1, 2, 5, 10].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-1.5 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold rounded-md transition-colors cursor-pointer ${playbackSpeed === speed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Telemetry Footer of Playback (Solo en Escritorio, ya que en móvil va integrado arriba) */}
              <div className="hidden md:flex justify-between items-center text-xs text-slate-500 font-medium gap-1">
                <span>
                  {new Date(startPoint.timestamp).toLocaleTimeString()} ({new Date(startPoint.timestamp).toLocaleDateString()})
                </span>
                
                {currentPoint && (
                  <div className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-bold text-xs">
                    <span>⏱ {new Date(currentPoint.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Gauge size={11} /> {currentPoint.velocidad} km/h</span>
                    <span>•</span>
                    <span className={currentPoint.ignicion ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {currentPoint.ignicion ? 'ON' : 'OFF'}
                    </span>
                    {currentPoint.bateria_ext !== undefined && currentPoint.bateria_ext !== null && (
                      <>
                        <span>•</span>
                        <span className={currentPoint.bateria_ext < 6 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          ⚡ {currentPoint.bateria_ext}V
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                <span>
                  {new Date(endPoint.timestamp).toLocaleTimeString()} ({new Date(endPoint.timestamp).toLocaleDateString()})
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
