import React, { useState } from 'react';
import { Search, Navigation, AlertCircle, Power, PowerOff } from 'lucide-react';

export default function Sidebar({ vehiculos, color, selectedVehicleId, onSelectVehicle, limiteVelocidad = 90 }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.conductor && v.conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-80 bg-white shadow-xl flex flex-col h-full z-20 border-r border-slate-200">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Navigation size={18} style={{ color }} />
          Flota Activa ({vehiculos.length})
        </h2>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar placa o conductor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            style={{ '--tw-ring-color': color }}
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.map(v => {
          const u = v.ultima_lectura;
          const readingDate = u?.timestamp ? new Date(u.timestamp) : null;
          const isOnline = Boolean(
            u && 
            u.online !== false && 
            readingDate && 
            (Date.now() - readingDate.getTime() < 5 * 60 * 1000)
          );

          const isPanic = u && isOnline && Boolean(u.boton_panico);
          const isSpeeding = u && isOnline && u.velocidad > (limiteVelocidad || 90);
          const isMoving = u && isOnline && u.velocidad > 0;
          const isStoppedWithIgnition = u && isOnline && u.velocidad === 0 && u.ignicion;
          const isSelected = selectedVehicleId === v.id;

          let statusColor = 'bg-slate-50 border-slate-200';
          let statusDot = 'bg-slate-400';
          let statusLabel = 'Desconectado (Apagado)';

          if (isPanic) { 
            statusColor = 'bg-red-50 border-red-300 ring-2 ring-red-400'; 
            statusDot = 'bg-red-500 animate-pulse'; 
            statusLabel = '¡Pánico!';
          } else if (isSpeeding) {
            statusColor = 'bg-amber-50 border-amber-300 ring-2 ring-amber-400';
            statusDot = 'bg-amber-500 animate-pulse';
            statusLabel = '¡Exceso de velocidad!';
          } else if (isSelected) { 
            statusColor = 'bg-blue-50 border-blue-300 ring-2 ring-blue-500'; 
            statusDot = isOnline ? (isMoving ? 'bg-green-500' : (isStoppedWithIgnition ? 'bg-yellow-500' : 'bg-slate-400')) : 'bg-slate-400'; 
            statusLabel = isOnline ? (isMoving ? 'En ruta' : (isStoppedWithIgnition ? 'Motor ON' : 'Detenido')) : 'Desconectado';
          } else if (isMoving) { 
            statusColor = 'bg-green-50 border-green-200'; 
            statusDot = 'bg-green-500'; 
            statusLabel = 'En movimiento';
          } else if (isStoppedWithIgnition) { 
            statusColor = 'bg-yellow-50 border-yellow-200'; 
            statusDot = 'bg-yellow-500'; 
            statusLabel = 'Motor encendido';
          } else if (isOnline) {
            statusLabel = 'Detenido';
          }

          return (
            <div 
              key={v.id} 
              onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
              className={`p-3 rounded-lg border ${statusColor} transition-all hover:shadow-md cursor-pointer group`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {v.placa}
                    <span className={`w-2 h-2 rounded-full ${statusDot}`} title={statusLabel}></span>
                  </h3>
                  <p className="text-xs text-slate-500">{v.conductor?.nombre || 'Sin conductor asignado'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-semibold ${isSpeeding ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                    {statusLabel}
                  </span>
                  {isPanic && <AlertCircle size={16} className="text-red-500 animate-bounce" />}
                  {isSpeeding && !isPanic && <span className="text-xs">⚡</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div className={`p-2 rounded flex flex-col items-center shadow-sm ${isSpeeding ? 'bg-amber-100/70 border border-amber-300' : 'bg-white'}`}>
                  <span className="text-[11px] text-slate-400 mb-0.5">Velocidad</span>
                  <span className={`font-bold ${isSpeeding ? 'text-amber-800 text-sm' : 'text-slate-700'}`}>
                    {isOnline && u ? u.velocidad : 0} km/h
                  </span>
                  {isSpeeding && (
                    <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded mt-0.5">
                      Lím: {limiteVelocidad}k
                    </span>
                  )}
                </div>
                <div className="bg-white p-2 rounded flex flex-col items-center justify-center shadow-sm">
                  {isOnline && u && u.ignicion ? (
                    <div className="flex items-center gap-1 text-green-600 font-medium text-xs">
                      <Power size={14} /> Motor ON
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
                      <PowerOff size={14} /> Motor OFF
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center p-6 text-slate-400 text-sm">
            No se encontraron vehículos.
          </div>
        )}
      </div>
    </div>
  );
}
