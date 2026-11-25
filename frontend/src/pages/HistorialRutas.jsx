import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { 
  Search, Play, Pause, RotateCcw, Gauge, AlertTriangle,
  SlidersHorizontal, ChevronUp, ChevronDown, Truck, Sun, Moon, Layers, Calendar, Check, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPeruPresetRange, peruInputToUTCISO, formatPeruTime, formatPeruDate } from '../utils/peruTime';

// Custom icons
const movingVehicleIcon = L.divIcon({
  className: 'custom-moving-icon',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 30px; height: 30px; border-radius: 50%; background: #2563eb; border: 2.5px solid white; box-shadow: 0 2px 7px rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
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

export default function HistorialRutas() {
  const [params] = useSearchParams();
  const requestedVehicle = params.get('vehiculo');
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  
  // Inicializar siempre al día de hoy (00:00 a 23:59) en Hora Oficial de Perú (America/Lima)
  const initialRange = getPeruPresetRange('hoy');
  const [fechaInicio, setFechaInicio] = useState(initialRange.inicio);
  const [fechaFin, setFechaFin] = useState(initialRange.fin);
  const [activePreset, setActivePreset] = useState('hoy');
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileVehiclePickerOpen, setMobileVehiclePickerOpen] = useState(false);
  const [mobileStatsCollapsed, setMobileStatsCollapsed] = useState(false);
  const initialAutoFetchDone = useRef(false);
  
  const [historialData, setHistorialData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [showStopsList, setShowStopsList] = useState(false);
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      return localStorage.getItem('copai_map_style') || 'day';
    } catch {
      return 'day';
    }
  });

  const handleSelectMapStyle = (style) => {
    setMapStyle(style);
    try {
      localStorage.setItem('copai_map_style', style);
    } catch {}
  };
  
  const playIntervalRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchVehiculos = async () => {
      try {
        const token = localStorage.getItem('token');
        const options = {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        };
        const { data } = await axios.get(`${API_BASE_URL}/api/vehiculos/`, options);
        const list = [...data];
        if (/^\d+$/.test(requestedVehicle || '') && !list.some((v) => String(v.id) === requestedVehicle)) {
          const { data: archivedVehicle } = await axios.get(`${API_BASE_URL}/api/vehiculos/${requestedVehicle}`, options);
          list.push(archivedVehicle);
        }
        if (!controller.signal.aborted) {
          setVehiculos(list);
          setSelectedVehiculo(list.some((v) => String(v.id) === requestedVehicle) ? requestedVehicle : String(list[0]?.id ?? ''));
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error('Error cargando vehículos', error);
      }
    };
    fetchVehiculos();
    return () => controller.abort();
  }, [requestedVehicle]);

  const fetchHistorialRange = async (vehiculoId, inicioStr, finStr) => {
    if (!vehiculoId) return;
    setLoading(true);
    setHistorialData(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setFlyToTarget(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/vehiculos/${vehiculoId}/historial`, {
        params: { 
          fecha_inicio: peruInputToUTCISO(inicioStr, false), 
          fecha_fin: peruInputToUTCISO(finStr, true) 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorialData(res.data);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileFiltersOpen(false);
        setMobileVehiclePickerOpen(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error al cargar historial. Verifique el rango de fechas.");
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type, autoFetchOnMobile = false) => {
    setActivePreset(type);
    const range = getPeruPresetRange(type);
    setFechaInicio(range.inicio);
    setFechaFin(range.fin);
    if (autoFetchOnMobile && selectedVehiculo) {
      setMobileFiltersOpen(false);
      setMobileVehiclePickerOpen(false);
      fetchHistorialRange(selectedVehiculo, range.inicio, range.fin);
    }
  };

  const handleSearch = async () => {
    await fetchHistorialRange(selectedVehiculo, fechaInicio, fechaFin);
  };

  // Cargar automáticamente el recorrido de Hoy al seleccionar vehículo por primera vez
  useEffect(() => {
    if (selectedVehiculo && !initialAutoFetchDone.current) {
      initialAutoFetchDone.current = true;
      fetchHistorialRange(selectedVehiculo, fechaInicio, fechaFin);
    }
  }, [selectedVehiculo]);

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
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Desde (Hora Perú)</label>
            <input 
              type="datetime-local" 
              className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
              value={fechaInicio}
              onChange={(e) => { setActivePreset('custom'); setFechaInicio(e.target.value); }}
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Hasta (Hora Perú)</label>
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

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* ===================================================================== */}
        {/* BARRA SUPERIOR FLOTANTE MÓVIL (Altura fija compacta, nunca tapa botones) */}
        {/* ===================================================================== */}
        <div className="md:hidden absolute top-2.5 left-2.5 right-2.5 z-[950] pointer-events-none">
          <div
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80 p-2 space-y-1.5"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
          >
            {/* Fila 1: Selector de Vehículo + Estado/Km integrado en la misma cápsula */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMobileVehiclePickerOpen(true);
                  setMobileFiltersOpen(false);
                }}
                className="flex items-center gap-2 min-w-0 flex-1 bg-slate-800/90 hover:bg-slate-800 active:scale-[0.99] px-2.5 py-1.5 rounded-xl border border-slate-700/90 transition-all cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 flex items-center justify-center flex-shrink-0">
                  <Truck size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-tight text-white truncate">
                      {selectedVehObj ? selectedVehObj.placa : (vehiculos.length === 0 ? 'Cargando...' : 'Elegir Unidad')}
                    </span>
                    {selectedVehObj?.marca && (
                      <span className="text-[10px] font-semibold text-slate-300 truncate">
                        • {selectedVehObj.marca}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-300 flex-shrink-0" />
              </button>

              {/* Estado integrado (Km recorridos o aviso compacto "Sin ruta" para no poner otro cartel abajo) */}
              {loading ? (
                <div className="px-2.5 py-1.5 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 text-[10px] font-extrabold flex items-center gap-1.5 flex-shrink-0">
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Cargando</span>
                </div>
              ) : historialData && historialData.coordenadas.length === 0 ? (
                <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1 flex-shrink-0">
                  <AlertTriangle size={11} className="text-amber-400" />
                  <span>Sin ruta</span>
                </div>
              ) : historialData?.estadisticas ? (
                <div className="px-2.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex-shrink-0">
                  {historialData.estadisticas.distancia_km} km
                </div>
              ) : null}

              {historialData?.paradas?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowStopsList(!showStopsList)}
                  className="px-2 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <span>🛑 {historialData.paradas.length}</span>
                </button>
              )}
            </div>

            {/* Fila 2: Barra Segmentada Nativa (Hoy | Ayer | 24h | 7 Días | 📅) */}
            <div className="grid grid-cols-5 gap-1 bg-slate-950/85 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'ayer', label: 'Ayer' },
                { id: '24h', label: '24h' },
                { id: '7d', label: '7 Días' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id, true)}
                  className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    activePreset === item.id && !mobileFiltersOpen
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileFiltersOpen(true);
                  setMobileVehiclePickerOpen(false);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activePreset === 'custom' || mobileFiltersOpen
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar size={11} />
                <span>Otro</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BOTTOM SHEET NATIVO DE SELECCIÓN DE VEHÍCULO (Estilo iOS / Android)    */}
        {/* ===================================================================== */}
        {mobileVehiclePickerOpen && (
          <div
            className="md:hidden fixed inset-0 z-[9995] bg-slate-950/60 backdrop-blur-xs flex items-end justify-center"
            onClick={() => setMobileVehiclePickerOpen(false)}
          >
            <div
              className="w-full bg-slate-900 text-white rounded-t-3xl border-t border-slate-700/80 p-4 pb-7 shadow-2xl space-y-3 max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">Seleccionar Vehículo</h3>
                <button
                  type="button"
                  onClick={() => setMobileVehiclePickerOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto space-y-1.5 pr-0.5">
                {vehiculos.map(v => {
                  const isSelected = String(v.id) === String(selectedVehiculo);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehiculo(String(v.id));
                        setMobileVehiclePickerOpen(false);
                        fetchHistorialRange(String(v.id), fechaInicio, fechaFin);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700/70 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-indigo-300'}`}>
                          <Truck size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{v.placa}</div>
                          <div className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {v.marca ? `${v.marca} ${v.modelo || ''}`.trim() : (v.empresa?.nombre || 'Mi Flota')}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* BOTTOM SHEET NATIVO DE FECHAS PERSONALIZADAS (No tapa el mapa arriba)  */}
        {/* ===================================================================== */}
        {mobileFiltersOpen && (
          <div
            className="md:hidden fixed inset-0 z-[9995] bg-slate-950/60 backdrop-blur-xs flex items-end justify-center"
            onClick={() => setMobileFiltersOpen(false)}
          >
            <div
              className="w-full bg-slate-900 text-white rounded-t-3xl border-t border-slate-700/80 p-4 pb-7 shadow-2xl space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-400" />
                  <span>Elegir Periodo de Recorrido</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-800/90 rounded-2xl px-3.5 py-2.5 border border-slate-700">
                  <label className="block text-[10px] font-extrabold text-indigo-300 uppercase mb-0.5">Inicio del recorrido</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-transparent text-white text-xs font-bold outline-none [color-scheme:dark]"
                    value={fechaInicio}
                    onChange={(e) => { setActivePreset('custom'); setFechaInicio(e.target.value); }}
                  />
                </div>
                <div className="bg-slate-800/90 rounded-2xl px-3.5 py-2.5 border border-slate-700">
                  <label className="block text-[10px] font-extrabold text-indigo-300 uppercase mb-0.5">Fin del recorrido</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-transparent text-white text-xs font-bold outline-none [color-scheme:dark]"
                    value={fechaFin}
                    onChange={(e) => { setActivePreset('custom'); setFechaFin(e.target.value); }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={!selectedVehiculo || loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Search size={15} />
                <span>{loading ? 'Cargando Recorrido...' : 'Aplicar y Ver en Mapa'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Selector Flotante Vertical de Capas (Ubicado más abajo al costado derecho para que nunca se cruce con la barra superior) */}
        <div className="absolute top-36 right-2.5 md:top-16 md:right-4 z-[900] pointer-events-auto">
          <div
            className="w-10 bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col items-center gap-1"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            <button
              type="button"
              onClick={() => handleSelectMapStyle('day')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                mapStyle === 'day'
                  ? 'bg-white text-amber-500 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Mapa Modo Día (Calles Claras)"
              aria-label="Mapa Modo Día"
            >
              <Sun size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleSelectMapStyle('dark')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                mapStyle === 'dark'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Mapa Modo Oscuro (Nocturno)"
              aria-label="Mapa Modo Oscuro"
            >
              <Moon size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleSelectMapStyle('satellite')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                mapStyle === 'satellite'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Mapa Satélite Real (Casitas y Calles)"
              aria-label="Mapa Satélite"
            >
              <Layers size={15} />
            </button>
          </div>
        </div>

        {/* Leaflet Map */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            maxZoom={20}
            className="h-full w-full [&_.leaflet-top.leaflet-left]:hidden md:[&_.leaflet-top.leaflet-left]:block"
            style={{
              backgroundColor: mapStyle === 'day' ? '#e2e8f0' : '#0f172a'
            }}
          >
            {mapStyle === 'dark' ? (
              <TileLayer
                key="hist-dark"
                className="copai-dark-tiles"
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={19}
                maxZoom={20}
              />
            ) : mapStyle === 'satellite' ? (
              <TileLayer
                key="hist-sat-hybrid"
                attribution='&copy; Google Satellite Hybrid'
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxNativeZoom={18}
                maxZoom={20}
              />
            ) : (
              <TileLayer
                key="hist-day"
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={19}
                maxZoom={20}
              />
            )}
            
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
                    Hora: {formatPeruTime(startPoint.timestamp, true)}<br/>
                    Fecha: {formatPeruDate(startPoint.timestamp)}<br/>
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
                    Hora: {formatPeruTime(endPoint.timestamp, true)}<br/>
                    Fecha: {formatPeruDate(endPoint.timestamp)}<br/>
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
                    <strong>Inicio:</strong> {formatPeruTime(parada.timestamp_inicio, true)}<br/>
                    <strong>Fin:</strong> {formatPeruTime(parada.timestamp_fin, true)}
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
                    <strong>Hora:</strong> {formatPeruTime(currentPoint.timestamp, true)}<br/>
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

        {/* Stops Floating Drawer Toggle Button (Escritorio) */}
        {historialData && historialData.paradas && historialData.paradas.length > 0 && (
          <button
            onClick={() => setShowStopsList(!showStopsList)}
            className="hidden md:flex absolute top-4 right-4 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 z-[920] items-center gap-1.5 transition-all cursor-pointer"
          >
            🛑 {showStopsList ? 'Ocultar Paradas' : `Paradas (${historialData.paradas.length})`}
          </button>
        )}

        {/* Stops Floating List */}
        {showStopsList && historialData?.paradas && (
          <div className="absolute top-36 left-2.5 md:top-16 md:left-auto md:right-4 w-64 md:w-72 max-h-60 md:max-h-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-3 z-[1000] overflow-y-auto space-y-2 text-xs">
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
                    {formatPeruTime(p.timestamp_inicio, true)} - {formatPeruTime(p.timestamp_fin, true)}
                  </p>
                </div>
                <span className="font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full text-[10px]">
                  {formatMinutes(p.duracion_minutos)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty State Banner (Escritorio) */}
        {historialData && historialData.coordenadas.length === 0 && (
          <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 px-6 py-3 rounded-xl z-[910] text-sm text-slate-600 items-center gap-2">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={16} />
            <span>Sin recorridos registrados en este periodo.</span>
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
                  <span>⏱ {formatPeruTime(currentPoint.timestamp, true)}</span>
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
                  {formatPeruTime(startPoint.timestamp, true)} ({formatPeruDate(startPoint.timestamp)})
                </span>
                
                {currentPoint && (
                  <div className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-bold text-xs">
                    <span>⏱ {formatPeruTime(currentPoint.timestamp, true)}</span>
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
                  {formatPeruTime(endPoint.timestamp, true)} ({formatPeruDate(endPoint.timestamp)})
                </span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
import { useSearchParams } from 'react-router-dom';
