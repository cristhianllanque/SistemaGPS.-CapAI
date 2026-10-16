import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AlertTriangle, Navigation, RotateCcw } from 'lucide-react';

// Create custom icons based on status
const createIcon = (color, isPanic = false) => {
  const size = isPanic ? 28 : 22;
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 0 ${isPanic ? '15px #dc2626' : '6px rgba(0,0,0,0.4)'};
        display: flex;
        align-items: center;
        justify-content: center;
        ${isPanic ? 'animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}
      ">
        ${isPanic ? '<div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

const icons = {
  moving: createIcon('#22c55e'),       // Green (En ruta)
  stopped_on: createIcon('#eab308'),   // Yellow (Detenido con motor encendido)
  stopped_off: createIcon('#94a3b8'),  // Gray (Apagado)
  panic: createIcon('#ef4444', true)   // Red (¡Botón de pánico activo!)
};

// Internal map controller for programmatic camera movement & live tracking
function MapController({ targetCoords, isEmergency }) {
  const map = useMap();
  const prevCoordsRef = useRef(null);

  useEffect(() => {
    if (!targetCoords || isNaN(targetCoords[0]) || isNaN(targetCoords[1])) return;

    const [lat, lng] = targetCoords;
    const isFirstTime = !prevCoordsRef.current;
    prevCoordsRef.current = targetCoords;

    if (isEmergency || isFirstTime) {
      // Emergency: smooth flyTo with deep zoom to immediate street level
      map.flyTo([lat, lng], 17, {
        animate: true,
        duration: 1.4
      });
    } else {
      // Normal follow mode: pan smoothly to follow vehicle movement
      map.panTo([lat, lng], {
        animate: true,
        duration: 0.8
      });
    }
  }, [targetCoords, isEmergency, map]);

  return null;
}

export default function LiveMap({ 
  vehiculos = [], 
  selectedVehicleId = null, 
  emergencyVehicleId = null,
  onSelectVehicle,
  onClearFocus
}) {
  // Center in default coordinates (Peru)
  const defaultCenter = [-15.5, -70.1];

  const activeId = emergencyVehicleId || selectedVehicleId;
  const trackedVehicle = vehiculos.find(v => v.id === activeId);
  const targetCoords = trackedVehicle?.ultima_lectura 
    ? [trackedVehicle.ultima_lectura.latitud, trackedVehicle.ultima_lectura.longitud] 
    : null;

  return (
    <div className="h-full w-full relative">
      {/* Floating Emergency Status Banner */}
      {emergencyVehicleId && trackedVehicle && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white animate-pulse">
          <AlertTriangle size={20} className="animate-bounce" />
          <span className="font-bold text-sm tracking-wide">
            SEGUIMIENTO DE EMERGENCIA: {trackedVehicle.placa} ({trackedVehicle.conductor?.nombre || 'Sin conductor'})
          </span>
          <button 
            onClick={onClearFocus}
            className="ml-2 bg-white/20 hover:bg-white/30 text-xs px-3 py-1 rounded-full transition-colors font-medium flex items-center gap-1"
            title="Ver toda la flota"
          >
            <RotateCcw size={12} />
            Ver flota
          </button>
        </div>
      )}

      {/* Floating Normal Follow Banner */}
      {!emergencyVehicleId && selectedVehicleId && trackedVehicle && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-3 border border-slate-700 text-sm">
          <Navigation size={16} className="text-blue-400" />
          <span>Siguiendo: <strong>{trackedVehicle.placa}</strong></span>
          <button 
            onClick={onClearFocus}
            className="ml-2 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-600 transition-colors"
          >
            Restablecer
          </button>
        </div>
      )}

      <MapContainer center={defaultCenter} zoom={13} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController 
          targetCoords={targetCoords} 
          isEmergency={Boolean(emergencyVehicleId)} 
        />

        {vehiculos.map(v => {
          if (!v.ultima_lectura) return null;
          
          const u = v.ultima_lectura;
          const readingDate = u?.timestamp ? new Date(u.timestamp) : null;
          const isOnline = Boolean(
            u && 
            u.online !== false && 
            readingDate && 
            (Date.now() - readingDate.getTime() < 5 * 60 * 1000)
          );

          const isThisEmergency = isOnline && (emergencyVehicleId === v.id || Boolean(u.boton_panico));
          
          let icon = icons.stopped_off; // Default is gray (offline / apagado)
          if (isThisEmergency) icon = icons.panic;
          else if (isOnline && u.velocidad > 0) icon = icons.moving;
          else if (isOnline && u.ignicion) icon = icons.stopped_on;

          return (
            <Marker 
              key={v.id} 
              position={[u.latitud, u.longitud]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectVehicle && onSelectVehicle(v.id)
              }}
            >
              <Popup>
                <div className="p-1 min-w-[190px]">
                  <div className="flex items-center justify-between border-b pb-1 mb-1">
                    <h3 className="font-bold text-sm text-slate-800">{v.placa}</h3>
                    {isThisEmergency ? (
                      <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                        ¡PÁNICO!
                      </span>
                    ) : (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isOnline ? 'Conectado' : 'Desconectado'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{v.conductor?.nombre || 'Sin conductor asignado'}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold text-slate-600">Estado:</span>
                    <span className={isOnline ? "text-green-600 font-bold" : "text-slate-500 font-medium"}>
                      {isOnline ? (u.velocidad > 0 ? 'En movimiento' : (u.ignicion ? 'Motor ON' : 'Detenido')) : 'Apagado'}
                    </span>
                    <span className="font-semibold text-slate-600">Velocidad:</span>
                    <span className="font-bold text-slate-700">{isOnline ? `${u.velocidad} km/h` : '0 km/h'}</span>
                    <span className="font-semibold text-slate-600">Motor:</span>
                    <span className={isOnline && u.ignicion ? "text-green-600 font-bold" : "text-slate-500 font-medium"}>
                      {isOnline && u.ignicion ? 'ON' : 'OFF'}
                    </span>
                    <span className="font-semibold text-slate-600">Último reporte:</span>
                    <span className="text-slate-600">{readingDate ? readingDate.toLocaleTimeString() : '—'}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
