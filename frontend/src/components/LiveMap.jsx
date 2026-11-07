import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AlertTriangle, Navigation, RotateCcw, Compass, X, ExternalLink, LocateFixed } from 'lucide-react';
import { parseServerUTC, formatPeruTime } from '../utils/peruTime';

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

// Icono exclusivo para la ubicación en tiempo real del celular del usuario ("Tú")
const userLocationIcon = L.divIcon({
  className: 'user-gps-icon',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background-color: rgba(37, 99, 235, 0.28);
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
        border: 3px solid #ffffff;
        box-shadow: 0 2px 10px rgba(37, 99, 235, 0.7);
      "></div>
      <div style="
        position: absolute;
        top: -16px;
        background: #0f172a;
        color: #38bdf8;
        font-size: 9px;
        font-weight: 800;
        padding: 1px 5px;
        border-radius: 6px;
        border: 1px solid rgba(56, 189, 248, 0.4);
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">Tú</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
});

// Internal map controller for programmatic camera movement, route bounds & live tracking
function MapController({
  targetCoords,
  isEmergency,
  userCoords,
  routeActive,
  fitRouteTrigger,
  centerUserTrigger
}) {
  const map = useMap();
  const prevCoordsRef = useRef(null);
  const lastFitTriggerRef = useRef(0);
  const lastCenterUserRef = useRef(0);

  // 1. Centrar en la ubicación del usuario cuando presione "Mi Ubicación"
  useEffect(() => {
    if (!centerUserTrigger || centerUserTrigger === lastCenterUserRef.current) return;
    if (!userCoords || isNaN(userCoords[0]) || isNaN(userCoords[1])) return;
    lastCenterUserRef.current = centerUserTrigger;
    map.flyTo(userCoords, 16, { animate: true, duration: 1.0 });
  }, [centerUserTrigger, userCoords, map]);

  // 2. Encuadrar tanto la ubicación del usuario como el vehículo cuando se active "Cómo llegar"
  useEffect(() => {
    if (!routeActive || !fitRouteTrigger || fitRouteTrigger === lastFitTriggerRef.current) return;
    if (!userCoords || !targetCoords) return;
    if (isNaN(userCoords[0]) || isNaN(targetCoords[0])) return;

    lastFitTriggerRef.current = fitRouteTrigger;
    const bounds = L.latLngBounds([userCoords, targetCoords]);
    map.fitBounds(bounds, {
      paddingTopLeft: [45, 95],
      paddingBottomRight: [45, 75],
      maxZoom: 17,
      animate: true,
      duration: 1.1
    });
  }, [routeActive, fitRouteTrigger, userCoords, targetCoords, map]);

  // 3. Seguimiento normal de vehículo o acercamiento de emergencia (cuando no esté encuadrando ruta inicial)
  useEffect(() => {
    if (routeActive) return;
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
  }, [targetCoords, isEmergency, routeActive, map]);

  return null;
}

export default function LiveMap({ 
  vehiculos = [], 
  selectedVehicleId = null, 
  emergencyVehicleId = null,
  limiteVelocidad = 90,
  onSelectVehicle,
  onClearFocus,
  // Props exclusivas para navegación móvil hacia el vehículo
  isMobileApp = false,
  userLocation = null,
  routeTargetVehicleId = null,
  routePoints = [],
  routeSummary = null,
  routeLoading = false,
  fitRouteTrigger = 0,
  centerUserTrigger = 0,
  onStartRouteToVehicle,
  onStopRoute,
  onFitRouteBounds
}) {
  // Center in default coordinates (Peru)
  const defaultCenter = [-15.5, -70.1];

  const activeId = routeTargetVehicleId || emergencyVehicleId || selectedVehicleId;
  const trackedVehicle = vehiculos.find(v => v.id === activeId);
  const targetCoords = trackedVehicle?.ultima_lectura 
    ? [trackedVehicle.ultima_lectura.latitud, trackedVehicle.ultima_lectura.longitud] 
    : null;

  const userCoords = userLocation
    ? [userLocation.lat, userLocation.lng]
    : null;

  const isRouteActive = Boolean(isMobileApp && routeTargetVehicleId && trackedVehicle);

  const isTrackedSpeeding = Boolean(
    trackedVehicle?.ultima_lectura && 
    trackedVehicle.ultima_lectura.velocidad > (limiteVelocidad || 90)
  );

  const formatDistance = (meters) => {
    if (meters === null || meters === undefined) return '—';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  return (
    <div className="h-full w-full relative">
      {/* BARRA MÓVIL DE RUTA ACTIVA ("CÓMO LLEGAR AL VEHÍCULO") - Exclusiva Móvil */}
      {isRouteActive && (
        <div className="md:hidden absolute top-14 left-2.5 right-2.5 z-[950] bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/25 border border-blue-400/40 text-cyan-300 flex items-center justify-center shrink-0">
              <Compass size={17} className={routeLoading ? 'animate-spin' : ''} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                  Ruta a {trackedVehicle.placa}
                </span>
                {routeSummary?.isDirectFallback && (
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                    Línea directa
                  </span>
                )}
              </div>
              <div className="text-xs font-black text-white truncate mt-0.5">
                {routeLoading && !routeSummary ? (
                  <span className="text-slate-300 font-semibold">Trazando camino desde tu GPS...</span>
                ) : routeSummary ? (
                  <span>
                    {formatDistance(routeSummary.distanceMeters)} • ~{formatDuration(routeSummary.durationSeconds)}
                  </span>
                ) : (
                  <span className="text-slate-300 font-semibold">Obteniendo tu ubicación GPS...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {userCoords && targetCoords && (
              <button
                type="button"
                onClick={onFitRouteBounds}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                title="Encuadrar ruta completa"
              >
                <LocateFixed size={12} />
                <span>Ver todo</span>
              </button>
            )}
            {targetCoords && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${targetCoords[0]},${targetCoords[1]}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                title="Abrir navegación por voz en Google Maps"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={onStopRoute}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer active:scale-95"
              title="Cerrar ruta"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Emergency Status Banner */}
      {emergencyVehicleId && trackedVehicle && !isRouteActive && (
        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 border-2 border-white animate-pulse max-w-[94vw]">
          <AlertTriangle size={17} className="animate-bounce shrink-0" />
          <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
            EMERGENCIA: {trackedVehicle.placa}
          </span>
          {isMobileApp && onStartRouteToVehicle && (
            <button
              type="button"
              onClick={() => onStartRouteToVehicle(trackedVehicle.id)}
              className="md:hidden bg-white text-red-700 text-[11px] px-2.5 py-1 rounded-full font-extrabold flex items-center gap-1 shrink-0 shadow-sm active:scale-95 cursor-pointer"
            >
              <Compass size={12} />
              <span>Ir al vehículo</span>
            </button>
          )}
          <button 
            onClick={onClearFocus}
            className="ml-1 bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded-full transition-colors font-medium flex items-center gap-1 shrink-0 cursor-pointer"
            title="Ver toda la flota"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Ver flota</span>
          </button>
        </div>
      )}

      {/* Floating Normal Follow Banner */}
      {!emergencyVehicleId && selectedVehicleId && trackedVehicle && !isRouteActive && (
        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-xl flex items-center gap-2 sm:gap-3 border border-slate-700 text-xs sm:text-sm max-w-[94vw]">
          <Navigation size={14} className="text-blue-400 shrink-0" />
          <span className="truncate">Siguiendo: <strong>{trackedVehicle.placa}</strong></span>
          {isTrackedSpeeding && (
            <span className="text-[10px] sm:text-xs bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shrink-0">
              ⚡ {trackedVehicle.ultima_lectura?.velocidad} km/h
            </span>
          )}
          {isMobileApp && onStartRouteToVehicle && (
            <button
              type="button"
              onClick={() => onStartRouteToVehicle(trackedVehicle.id)}
              className="md:hidden text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm active:scale-95 cursor-pointer"
            >
              <Compass size={12} />
              <span>Cómo llegar</span>
            </button>
          )}
          <button 
            onClick={onClearFocus}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-600 transition-colors shrink-0 cursor-pointer"
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
          userCoords={userCoords}
          routeActive={isRouteActive}
          fitRouteTrigger={fitRouteTrigger}
          centerUserTrigger={centerUserTrigger}
        />

        {/* MARCADOR DE LA UBICACIÓN ACTUAL DEL CELULAR (Exclusivo Móvil) */}
        {isMobileApp && userCoords && (
          <>
            <Circle
              center={userCoords}
              radius={Math.min(Math.max(userLocation?.accuracy || 20, 12), 75)}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#38bdf8',
                fillOpacity: 0.12,
                weight: 1
              }}
            />
            <Marker position={userCoords} icon={userLocationIcon}>
              <Popup>
                <div className="p-1 text-center">
                  <div className="font-bold text-xs text-blue-700">📍 Tu ubicación actual</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">GPS de tu dispositivo móvil</div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* TRAZADO DE RUTA DESDE EL CELULAR HASTA EL VEHÍCULO (Exclusivo Móvil) */}
        {isRouteActive && routePoints && routePoints.length >= 2 && (
          <>
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#0f172a',
                weight: 8,
                opacity: 0.75,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: routeSummary?.isDirectFallback ? '8, 8' : undefined
              }}
            />
          </>
        )}

        {vehiculos.map(v => {
          if (!v.ultima_lectura) return null;
          
          const u = v.ultima_lectura;
          const readingDate = parseServerUTC(u?.timestamp);
          const diffMinutes = readingDate ? Math.abs(Date.now() - readingDate.getTime()) / (60 * 1000) : 9999;
          const isOnline = Boolean(u && (u.online === true || (u.online !== false && diffMinutes < 15)));
          const isIgnitionOn = Boolean(u && u.ignicion);

          const isSabotage = u && Boolean(u.sabotaje) && (u.bateria_ext === null || u.bateria_ext === undefined || u.bateria_ext < 7.0);
          const isThisEmergency = isOnline && (emergencyVehicleId === v.id || Boolean(u.boton_panico));
          const isSpeeding = isOnline && (u.velocidad > (limiteVelocidad || 90));
          const isThisRouted = routeTargetVehicleId === v.id;
          
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
                <div className="p-1 min-w-[215px]">
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
                    <span className="text-slate-600">{readingDate ? formatPeruTime(readingDate, true) : '—'}</span>
                  </div>

                  {/* BOTÓN EXCLUSIVO MÓVIL: LLEGAR HASTA EL VEHÍCULO */}
                  {isMobileApp && onStartRouteToVehicle && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200">
                      {isThisRouted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onStopRoute) onStopRoute();
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <X size={13} />
                          <span>Ocultar ruta al vehículo</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartRouteToVehicle(v.id);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                        >
                          <Compass size={13} />
                          <span>Llegar hasta el vehículo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
