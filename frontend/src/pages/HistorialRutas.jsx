import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Play, Pause, FastForward, Info } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
const movingIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const stopIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export default function HistorialRutas() {
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  
  // Default to today, from 00:00 to 23:59
  const today = new Date();
  const startStr = new Date(today.setHours(0,0,0,0)).toISOString().slice(0, 16);
  const endStr = new Date(today.setHours(23,59,59,999)).toISOString().slice(0, 16);
  
  const [fechaInicio, setFechaInicio] = useState(startStr);
  const [fechaFin, setFechaFin] = useState(endStr);
  const [loading, setLoading] = useState(false);
  
  const [historialData, setHistorialData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
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
    } catch (error) {
      console.error("Error cargando vehículos", error);
    }
  };

  const handleSearch = async () => {
    if (!selectedVehiculo) return;
    setLoading(true);
    setHistorialData(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    
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
      alert("Error al cargar historial");
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
      }, 1000 / playbackSpeed); // Base speed: 1 point per second
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
  
  // Center map on the first point or a default
  const mapCenter = polylinePositions.length > 0 ? polylinePositions[0] : [-15.5, -70.1];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Top Control Bar */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex flex-wrap gap-4 items-end">
        <div className="w-48">
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Vehículo</label>
          <select 
            className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={selectedVehiculo}
            onChange={(e) => setSelectedVehiculo(e.target.value)}
          >
            <option value="">Seleccione...</option>
            {vehiculos.map(v => (
              <option key={v.id} value={v.id}>{v.placa}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Desde</label>
          <input 
            type="datetime-local" 
            className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Hasta</label>
          <input 
            type="datetime-local" 
            className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        
        <button 
          onClick={handleSearch}
          disabled={!selectedVehiculo || loading}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
        >
          <Search size={16} /> {loading ? 'Consultando...' : 'Consultar Recorrido'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col">
        {/* Map */}
        <div className="flex-1 relative z-0">
          <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {polylinePositions.length > 0 && (
              <Polyline positions={polylinePositions} color="#4f46e5" weight={4} opacity={0.7} />
            )}
            
            {/* Stops */}
            {historialData?.paradas.map((parada, idx) => (
              <Marker key={`stop-${idx}`} position={[parada.latitud, parada.longitud]} icon={stopIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>Parada</strong><br/>
                    Duración: {parada.duracion_minutos} min<br/>
                    {new Date(parada.timestamp_inicio).toLocaleTimeString()} - {new Date(parada.timestamp_fin).toLocaleTimeString()}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Current Playback Marker */}
            {currentPoint && (
              <Marker position={[currentPoint.latitud, currentPoint.longitud]} icon={movingIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>Velocidad:</strong> {currentPoint.velocidad} km/h<br/>
                    <strong>Motor:</strong> {currentPoint.ignicion ? 'ON' : 'OFF'}<br/>
                    <strong>Hora:</strong> {new Date(currentPoint.timestamp).toLocaleTimeString()}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Playback Controls & Stats overlay */}
        {historialData && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[1000] flex flex-col md:flex-row gap-6">
            {/* Stats Panel */}
            <div className="flex md:flex-col gap-4 md:gap-2 justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 min-w-[200px]">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Distancia Total</p>
                <p className="text-xl font-bold text-slate-800">{historialData.estadisticas.distancia_km} <span className="text-sm font-normal text-slate-500">km</span></p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Vel. Máx</p>
                  <p className="font-bold text-slate-800">{historialData.estadisticas.velocidad_maxima} <span className="text-xs font-normal">km/h</span></p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Motor ON</p>
                  <p className="font-bold text-slate-800">{historialData.estadisticas.tiempo_encendido_minutos} <span className="text-xs font-normal">min</span></p>
                </div>
              </div>
            </div>

            {/* Player */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  {[1, 2, 4, 8].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${playbackSpeed === speed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>{historialData.coordenadas.length > 0 ? new Date(historialData.coordenadas[0].timestamp).toLocaleTimeString() : '--:--'}</span>
                {currentPoint && (
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-2 rounded-full">
                    Actual: {new Date(currentPoint.timestamp).toLocaleTimeString()} ({currentPoint.velocidad} km/h)
                  </span>
                )}
                <span>{historialData.coordenadas.length > 0 ? new Date(historialData.coordenadas[historialData.coordenadas.length-1].timestamp).toLocaleTimeString() : '--:--'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
