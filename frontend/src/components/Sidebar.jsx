import React, { useState } from 'react';
import { Search, Navigation, AlertCircle, Power, PowerOff, Building2, ChevronDown, ChevronLeft, X } from 'lucide-react';

export default function Sidebar({
  vehiculos, color, selectedVehicleId, onSelectVehicle, limiteVelocidad = 90,
  showEmpresaFilter = false, empresas = [], empresaFilter = 'all', onEmpresaFilterChange,
  filterCounts = {}, hasParticulares = false,
  collapsed = false, onToggleCollapse
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.conductor && v.conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Backdrop en dispositivos móviles cuando el panel esté abierto */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          onClick={onToggleCollapse}
        />
      )}

      {/* Contenedor Principal del Panel de Flota */}
      <div 
        className={`
          bg-white shadow-2xl md:shadow-xl flex flex-col h-full z-40 border-r border-slate-200 transition-all duration-300 ease-in-out
          fixed md:relative inset-y-0 left-0
          ${collapsed 
            ? '-translate-x-full md:translate-x-0 md:w-0 md:min-w-0 md:max-w-0 md:opacity-0 md:overflow-hidden md:border-none pointer-events-none' 
            : 'translate-x-0 w-[310px] sm:w-80 min-w-[300px] sm:min-w-[320px] max-w-[85vw] opacity-100'
          }
        `}
      >
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Navigation size={17} style={{ color }} />
              <span>Flota Activa ({vehiculos.length})</span>
            </h2>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer border border-slate-200/70 shadow-xs"
              title="Colapsar lista de vehículos para ver mapa completo"
            >
              <ChevronLeft size={15} />
              <span>Colapsar</span>
            </button>
          </div>
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

        {showEmpresaFilter && (
          <div className="relative mt-2">
            <Building2 size={15} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <select
              id="monitoring-empresa-filter"
              value={empresaFilter}
              onChange={(e) => onEmpresaFilterChange && onEmpresaFilterChange(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent transition-all hover:bg-slate-100"
              style={{ '--tw-ring-color': color }}
            >
              <option value="all">Todas las flotas ({filterCounts.all ?? 0})</option>
              {hasParticulares && (
                <option value="particulares">Vehículos particulares ({filterCounts.particulares ?? 0})</option>
              )}
              {empresas.length > 0 && (
                <optgroup label="Empresas">
                  {empresas.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.nombre} ({filterCounts[String(emp.id)] ?? 0})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.map(v => {
          const u = v.ultima_lectura;
          const readingDate = u?.timestamp ? new Date(u.timestamp) : null;
          const diffMinutes = readingDate ? Math.abs(Date.now() - readingDate.getTime()) / (60 * 1000) : 9999;
          const isOnline = Boolean(u && (u.online === true || (u.online !== false && diffMinutes < 15)));
          const isIgnitionOn = Boolean(u && u.ignicion);

          const isSabotage = u && Boolean(u.sabotaje) && (u.bateria_ext === null || u.bateria_ext === undefined || u.bateria_ext < 7.0);
          const isPanic = u && Boolean(u.boton_panico);
          const isSpeeding = u && u.velocidad > (limiteVelocidad || 90);
          const isMoving = u && u.velocidad > 0;
          const isSelected = selectedVehicleId === v.id;

          let statusColor = 'bg-slate-50 border-slate-200';
          let statusDot = 'bg-slate-400';
          let statusLabel = 'Desconectado';

          if (isPanic) { 
            statusColor = 'bg-red-50 border-red-300 ring-2 ring-red-400'; 
            statusDot = 'bg-red-500 animate-pulse'; 
            statusLabel = '¡Pánico!';
          } else if (isSabotage) {
            statusColor = 'bg-rose-50 border-rose-300 ring-2 ring-rose-400';
            statusDot = 'bg-rose-600 animate-ping';
            statusLabel = '¡Sabotaje Batería!';
          } else if (isSpeeding) {
            statusColor = 'bg-amber-50 border-amber-300 ring-2 ring-amber-400';
            statusDot = 'bg-amber-500 animate-pulse';
            statusLabel = '¡Exceso de velocidad!';
          } else if (isSelected) { 
            statusDot = isMoving ? 'bg-green-500' : (isIgnitionOn ? 'bg-emerald-500' : 'bg-slate-400'); 
            statusLabel = isMoving ? 'En ruta' : (isIgnitionOn ? 'Motor ON' : (isOnline ? 'Detenido' : 'Desconectado'));
          } else if (isMoving) { 
            statusColor = 'bg-green-50 border-green-200'; 
            statusDot = 'bg-green-500'; 
            statusLabel = 'En movimiento';
          } else if (isIgnitionOn) { 
            statusColor = 'bg-emerald-50 border-emerald-200'; 
            statusDot = 'bg-emerald-500'; 
            statusLabel = 'Motor encendido';
          } else if (isOnline) {
            statusColor = 'bg-slate-50 border-slate-200';
            statusDot = 'bg-slate-400';
            statusLabel = 'Detenido';
          }

          return (
            <div 
              key={v.id} 
              onClick={() => {
                if (onSelectVehicle) onSelectVehicle(v.id);
                if (typeof window !== 'undefined' && window.innerWidth < 768 && onToggleCollapse) {
                  onToggleCollapse();
                }
              }}
              className={`p-3 rounded-lg border ${statusColor} transition-all hover:shadow-md cursor-pointer group`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {v.placa}
                    <span className={`w-2 h-2 rounded-full ${statusDot}`} title={statusLabel}></span>
                  </h3>
                  <p className="text-xs text-slate-500">{v.conductor?.nombre || 'Sin conductor asignado'}</p>
                  {showEmpresaFilter && v.empresa_nombre && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 size={10} /> {v.empresa_nombre}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-semibold ${isSabotage ? 'text-rose-700 font-bold' : (isSpeeding ? 'text-amber-700 font-bold' : (isIgnitionOn ? 'text-emerald-700 font-bold' : 'text-slate-400'))}`}>
                    {statusLabel}
                  </span>
                  {isPanic && <AlertCircle size={16} className="text-red-500 animate-bounce" />}
                  {isSabotage && !isPanic && <span className="text-xs">🔌</span>}
                  {isSpeeding && !isPanic && !isSabotage && <span className="text-xs">⚡</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div className={`p-2 rounded flex flex-col items-center shadow-sm ${isSpeeding ? 'bg-amber-100/70 border border-amber-300' : 'bg-white'}`}>
                  <span className="text-[11px] text-slate-400 mb-0.5">Velocidad</span>
                  <span className={`font-bold ${isSpeeding ? 'text-amber-800 text-sm' : 'text-slate-700'}`}>
                    {u ? u.velocidad || 0 : 0} km/h
                  </span>
                  {isSpeeding && (
                    <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded mt-0.5">
                      Lím: {limiteVelocidad}k
                    </span>
                  )}
                </div>
                <div className={`p-2 rounded flex flex-col items-center justify-center shadow-sm ${isIgnitionOn ? 'bg-emerald-50 border border-emerald-200' : 'bg-white'}`}>
                  {isIgnitionOn ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                      <Power size={14} className="text-emerald-600" /> Motor ON
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
                      <PowerOff size={14} /> Motor OFF
                    </div>
                  )}
                </div>
              </div>

              {u && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-medium">Vehículo:</span>
                    {isSabotage ? (
                      <span className="font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">
                        ⚠️ {u.bateria_ext !== null && u.bateria_ext !== undefined ? `${u.bateria_ext}V` : '0V'}
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        ⚡ {u.bateria_ext !== null && u.bateria_ext !== undefined ? `${u.bateria_ext}V` : '—'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1" title="Batería interna de respaldo del GPS">
                    <span className="text-slate-400 font-medium">GPS:</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      (u.bateria_porcentaje ?? 88) > 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      🔋 {u.bateria_porcentaje !== null && u.bateria_porcentaje !== undefined ? `${u.bateria_porcentaje}%` : '88%'}
                    </span>
                  </div>
                </div>
              )}
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
  </>
);
}
