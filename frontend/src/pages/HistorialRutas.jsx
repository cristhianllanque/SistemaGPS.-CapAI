import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Play, Pause, RotateCcw, MapPin, Flag, 
  Clock, Gauge, Power, Battery, Calendar, AlertTriangle 
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
  const [loading, setLoading] = useState(false);
  
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
      const res = await axios.get('http://localhost:8000/api/vehiculos', {
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
      const res = await axios.get(`http://localhost:8000/api/vehiculos/${selectedVehiculo}/historial`, {
        params: { 
          fecha_inicio: new Date(fechaInicio).toISOString(), 
          fecha_fin: new Date(fechaFin).toISOString() 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorialData(res.data);
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white p-3 md:p-4 shadow-sm border-b border-slate-200 z-10 flex flex-wrap gap-3 items-end justify-between">
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
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Fecha y Hora Hasta</label>
            <input 
              type="datetime-local" 
              className="p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          <button 
            onClick={handleSearch}
            disabled={!selectedVehiculo || loading}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <Search size={16} /> {loading ? 'Cargando Recorrido...' : 'Consultar'}
          </button>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold self-end">
          <button 
            onClick={() => setPreset('hoy')} 
            className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={() => setPreset('ayer')} 
            className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors"
          >
            Ayer
          </button>
          <button 
            onClick={() => setPreset('24h')} 
            className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors"
          >
            Últimas 24h
          </button>
          <button 
            onClick={() => setPreset('7d')} 
            className="px-2.5 py-1.5 rounded hover:bg-white text-slate-600 transition-colors"
          >
            Últimos 7 días
          </button>
        </div>
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
            className="absolute top-4 right-4 bg-white/95 backdrop-blur shadow-md border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 z-[1000] flex items-center gap-2 transition-all"
          >
            🛑 {showStopsList ? 'Ocultar Paradas' : `Ver Paradas (${historialData.paradas.length})`}
          </button>
        )}

        {/* Stops Floating List */}
        {showStopsList && historialData?.paradas && (
          <div className="absolute top-16 right-4 w-72 max-h-80 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-3 z-[1000] overflow-y-auto space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold text-slate-800">
              <span>Paradas Registradas ({historialData.paradas.length})</span>
              <button onClick={() => setShowStopsList(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {historialData.paradas.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => setFlyToTarget([p.latitud, p.longitud])}
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
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-lg border border-slate-200 px-6 py-3 rounded-xl z-[1000] text-sm text-slate-600 flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={20} />
            <span>No se encontraron recorridos para este vehículo en el rango de fechas seleccionado.</span>
          </div>
        )}

        {/* Playback Controls & Stats Dashboard Bar */}
        {historialData && historialData.coordenadas.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-[1000] flex flex-col md:flex-row gap-5 items-center">
            
            {/* Key Trip Metrics */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-5 w-full md:w-auto flex-shrink-0 text-center md:text-left">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Distancia</p>
                <p className="text-base font-extrabold text-slate-800">
                  {historialData.estadisticas.distancia_km} <span className="text-[11px] font-normal text-slate-500">km</span>
                </p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Vel. Máx</p>
                <p className="text-base font-extrabold text-slate-800">
                  {historialData.estadisticas.velocidad_maxima} <span className="text-[11px] font-normal text-slate-500">km/h</span>
                </p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Vel. Prom</p>
                <p className="text-base font-extrabold text-slate-800">
                  {historialData.estadisticas.velocidad_promedio} <span className="text-[11px] font-normal text-slate-500">km/h</span>
                </p>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                <p className="text-[10px] text-emerald-700 uppercase font-bold">Motor ON</p>
                <p className="text-base font-extrabold text-emerald-900">
                  {formatMinutes(historialData.estadisticas.tiempo_encendido_minutos)}
                </p>
              </div>
              <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                <p className="text-[10px] text-amber-700 uppercase font-bold">Paradas</p>
                <p className="text-base font-extrabold text-amber-900">
                  {historialData.estadisticas.total_paradas || historialData.paradas?.length || 0}
                </p>
              </div>
            </div>

            {/* Playback Controls & Timeline Slider */}
            <div className="flex-1 w-full flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-all active:scale-95 flex-shrink-0"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                <button
                  onClick={() => { setIsPlaying(false); setCurrentIndex(0); }}
                  className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                  title="Reiniciar ruta"
                >
                  <RotateCcw size={16} />
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
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                
                {/* Playback Speeds */}
                <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5 flex-shrink-0">
                  {[1, 2, 5, 10].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${playbackSpeed === speed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Telemetry Footer of Playback */}
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>{new Date(startPoint.timestamp).toLocaleTimeString()} ({new Date(startPoint.timestamp).toLocaleDateString()})</span>
                
                {currentPoint && (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-bold">
                    <span>⏱ {new Date(currentPoint.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Gauge size={13} /> {currentPoint.velocidad} km/h</span>
                    <span>•</span>
                    <span className={currentPoint.ignicion ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {currentPoint.ignicion ? 'Motor ON' : 'Motor OFF'}
                    </span>
                    {currentPoint.bateria_ext !== undefined && currentPoint.bateria_ext !== null && (
                      <>
                        <span>•</span>
                        <span className={currentPoint.bateria_ext < 6 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          ⚡ {currentPoint.bateria_ext} V
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                <span>{new Date(endPoint.timestamp).toLocaleTimeString()} ({new Date(endPoint.timestamp).toLocaleDateString()})</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
