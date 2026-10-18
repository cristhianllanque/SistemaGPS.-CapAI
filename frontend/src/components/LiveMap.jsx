import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AlertTriangle, Navigation, RotateCcw } from 'lucide-react';

// Create custom icons based on status
const createIcon = (color, isPanic = false, isSpeed = false) => {
  const size = isPanic ? 28 : (isSpeed ? 26 : 22);
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 0 ${isPanic ? '15px #dc2626' : (isSpeed ? '12px #d97706' : '6px rgba(0,0,0,0.4)')};
        display: flex;
        align-items: center;
        justify-content: center;
        ${isPanic ? 'animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;' : (isSpeed ? 'animation: pulse 1.2s infinite;' : '')}
      ">
        ${isPanic ? '<div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>' : (isSpeed ? '<div style="font-size: 11px; color: white; font-weight: 900; line-height: 1;">⚡</div>' : '')}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

const icons = {
  moving: createIcon('#22c55e'),                 // Green (En ruta)
  speeding: createIcon('#f59e0b', false, true),  // Amber / Orange (¡Exceso de velocidad!)
  stopped_on: createIcon('#eab308'),             // Yellow (Detenido con motor encendido)
  stopped_off: createIcon('#94a3b8'),            // Gray (Apagado)
  panic: createIcon('#ef4444', true)             // Red (¡Botón de pánico activo!)
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
  limiteVelocidad = 90,
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

  const isTrackedSpeeding = Boolean(
    trackedVehicle?.ultima_lectura && 
    trackedVehicle.ultima_lectura.velocidad > (limiteVelocidad || 90)
  );

  return (
    <div className="h-full w-full relative">
      {/* Floating Emergency Status Banner */}
      {emergencyVehicleId && trackedVehicle && (
        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 sm:gap-3 border-2 border-white animate-pulse max-w-[92vw]">
          <AlertTriangle size={18} className="animate-bounce shrink-0" />
          <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
            EMERGENCIA: {trackedVehicle.placa} ({trackedVehicle.conductor?.nombre || 'Sin conductor'})
          </span>
          <button 
            onClick={onClearFocus}
            className="ml-2 bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded-full transition-colors font-medium flex items-center gap-1 shrink-0 cursor-pointer"
            title="Ver toda la flota"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Ver flota</span>
          </button>
        </div>
      )}

      {/* Floating Normal Follow Banner */}
      {!emergencyVehicleId && selectedVehicleId && trackedVehicle && (
        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-xl flex items-center gap-2 sm:gap-3 border border-slate-700 text-xs sm:text-sm max-w-[92vw]">
          <Navigation size={15} className="text-blue-400 shrink-0" />
          <span className="truncate">Siguiendo: <strong>{trackedVehicle.placa}</strong></span>
          {isTrackedSpeeding && (
            <span className="text-[10px] sm:text-xs bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shrink-0">
              ⚡ {trackedVehicle.ultima_lectura?.velocidad} km/h (&gt;{limiteVelocidad}k)
            </span>
          )}
          <button 
            onClick={onClearFocus}
            className="ml-1 sm:ml-2 text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-600 transition-colors shrink-0 cursor-pointer"
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
          const diffMinutes = readingDate ? Math.abs(Date.now() - readingDate.getTime()) / (60 * 1000) : 9999;
          const isOnline = Boolean(u && (u.online === true || (u.online !== false && diffMinutes < 15)));
          const isIgnitionOn = Boolean(u && u.ignicion);

          const isSabotage = u && Boolean(u.sabotaje) && (u.bateria_ext === null || u.bateria_ext === undefined || u.bateria_ext < 7.0);
          const isThisEmergency = isOnline && (emergencyVehicleId === v.id || Boolean(u.boton_panico));
          const isSpeeding = isOnline && (u.velocidad > (limiteVelocidad || 90));
          
          let icon = icons.stopped_off; // Default is gray (offline / apagado)
          if (isThisEmergency) icon = icons.panic;
          else if (isSabotage) icon = icons.panic;
          else if (isSpeeding) icon = icons.speeding;
          else if (isOnline && u.velocidad > 0) icon = icons.moving;
          else if (isIgnitionOn) icon = icons.stopped_on; // Yellow with motor ON!

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
                <div className="p-1 min-w-[210px]">
                  <div className="flex items-center justify-between border-b pb-1 mb-1">
                    <h3 className="font-bold text-sm text-slate-800">{v.placa}</h3>
                    {isThisEmergency ? (
                      <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                        ¡PÁNICO!
                      </span>
                    ) : isSabotage ? (
                      <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded animate-pulse">
                        ¡SABOTAJE!
                      </span>
                    ) : isSpeeding ? (
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                        ¡EXCESO DE VELOCIDAD!
                      </span>
                    ) : isIgnitionOn ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Motor ON
                      </span>
                    ) : (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isOnline ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isOnline ? 'Detenido' : 'Desconectado'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{v.conductor?.nombre || 'Sin conductor asignado'}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <span className="font-semibold text-slate-600">Estado:</span>
                    <span className={isSabotage ? "text-rose-600 font-bold" : (isSpeeding ? "text-amber-600 font-bold" : (u.velocidad > 0 ? "text-green-600 font-bold" : (isIgnitionOn ? "text-emerald-600 font-bold" : "text-slate-500 font-medium")))}>
                      {isSabotage ? '¡Sabotaje de Batería!' : (isSpeeding ? 'Exceso de velocidad' : (u.velocidad > 0 ? 'En movimiento' : (isIgnitionOn ? 'Motor encendido' : 'Detenido')))}
                    </span>
                    <span className="font-semibold text-slate-600">Velocidad:</span>
                    <div className="flex items-center gap-1">
                      <span className={`font-bold ${isSpeeding ? 'text-amber-700' : 'text-slate-700'}`}>
                        {u ? `${u.velocidad || 0} km/h` : '0 km/h'}
                      </span>
                      {isSpeeding && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 rounded border border-amber-300">
                          &gt;{limiteVelocidad}k
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-600">Motor:</span>
                    <span className={isIgnitionOn ? "text-emerald-600 font-bold" : "text-slate-500 font-medium"}>
                      {isIgnitionOn ? 'ON' : 'OFF'}
                    </span>
                    {u && (
                      <>
                        <span className="font-semibold text-slate-600">Batería Carro:</span>
                        <span className={isSabotage ? "text-rose-600 font-bold" : "text-slate-700 font-semibold"}>
                          {isSabotage ? `⚠️ ${u.bateria_ext !== null && u.bateria_ext !== undefined ? u.bateria_ext : 0} V (Corte)` : `⚡ ${u.bateria_ext !== null && u.bateria_ext !== undefined ? u.bateria_ext : '—'} V`}
                        </span>
                        <span className="font-semibold text-slate-600">Batería GPS:</span>
                        <span className="text-emerald-700 font-bold">
                          🔋 {u.bateria_porcentaje !== null && u.bateria_porcentaje !== undefined ? `${u.bateria_porcentaje}%` : '88%'}
                        </span>
                      </>
                    )}
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
