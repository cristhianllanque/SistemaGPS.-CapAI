import React from 'react';
import { AlertTriangle, MapPin, Zap, ShieldAlert, Check } from 'lucide-react';

export default function PanicAlert({ alerta, onAtender }) {
  const isSpeed = alerta.tipo === 'exceso_velocidad';
  const isSabotage = alerta.tipo === 'sabotaje';
  const velocidad = alerta.velocidad || alerta.data?.velocidad;
  const limite = alerta.limite || alerta.limite_velocidad || 90;

  const bgClass = isSpeed
    ? 'bg-amber-600/95 border-amber-400'
    : isSabotage
      ? 'bg-rose-700/95 border-rose-400'
      : 'bg-red-600/95 border-red-400';

  const iconBgClass = isSpeed
    ? 'bg-amber-500'
    : isSabotage
      ? 'bg-rose-600'
      : 'bg-red-500';

  const badgeBgClass = isSpeed
    ? 'bg-amber-800/80'
    : isSabotage
      ? 'bg-rose-900/80'
      : 'bg-red-800/80';

  const btnTextClass = isSpeed
    ? 'text-amber-700 hover:bg-amber-50'
    : isSabotage
      ? 'text-rose-700 hover:bg-rose-50'
      : 'text-red-600 hover:bg-red-50';

  return (
    <div className={`${bgClass} backdrop-blur-md rounded-xl shadow-2xl text-white border animate-in slide-in-from-right relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-0.5 sm:h-1 ${isSpeed ? 'bg-amber-300' : (isSabotage ? 'bg-rose-300' : 'bg-red-400')} animate-pulse`} />

      {/* VISTA COMPACTA MÓVIL (< 640px): Cápsula de 1 sola línea que no tapa el mapa */}
      <div className=" flex sm:hidden items-center justify-between gap-2 px-2.5 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`${iconBgClass} rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner`}>
            {isSpeed ? <Zap size={15} className="text-white" /> : (isSabotage ? <ShieldAlert size={15} className="text-white" /> : <AlertTriangle size={15} className="text-white" />)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-black font-mono px-1.5 py-0.5 rounded ${badgeBgClass} text-white flex-shrink-0`}>
                {alerta.placa || 'UNIDAD'}
              </span>
              <span className="text-[11px] font-extrabold truncate">
                {isSpeed ? `${velocidad} km/h` : (isSabotage ? 'Sabotaje Batería' : '¡Botón Pánico!')}
              </span>
            </div>
            <p className="text-[10px] text-white/85 truncate leading-tight mt-0.5">
              {isSpeed
                ? `Exceso velocidad (Lím: ${limite} km/h)`
                : isSabotage
                  ? `Corte de energía (${alerta.bateria_ext ?? 0}V)`
                  : 'Emergencia SOS en curso'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAtender}
          className={`bg-white ${btnTextClass} font-extrabold px-2.5 py-1.5 text-[11px] rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer`}
        >
          <Check size={12} />
          <span>Atender</span>
        </button>
      </div>

      {/* VISTA COMPLETA ESCRITORIO / TABLET (>= 640px) */}
      <div className="hidden sm:flex gap-4 items-start p-4">
        <div className={`${iconBgClass} rounded-full p-3 flex items-center justify-center animate-bounce shadow-inner flex-shrink-0`}>
          {isSpeed ? <Zap size={20} className="text-white" /> : (isSabotage ? <ShieldAlert size={20} className="text-white" /> : <AlertTriangle size={20} className="text-white" />)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2 leading-tight">
            {isSpeed ? '¡EXCESO DE VELOCIDAD!' : (isSabotage ? '¡SABOTAJE / CORTE BATERÍA!' : '¡BOTÓN DE PÁNICO ACTIVADO!')}
          </h3>
          <p className={`${isSpeed ? 'text-amber-100' : (isSabotage ? 'text-rose-100' : 'text-red-100')} text-sm mb-3`}>
            Vehículo <strong className={`text-white ${isSpeed ? 'bg-amber-700' : (isSabotage ? 'bg-rose-800' : 'bg-red-700')} px-1.5 py-0.5 rounded font-mono`}>{alerta.placa || 'Desconocido'}</strong>
            {isSpeed ? (
              <span> circula a <strong className="text-white font-bold">{velocidad} km/h</strong> (Límite: {limite} km/h).</span>
            ) : isSabotage ? (
              <span> sufrió desconexión de batería principal ({alerta.bateria_ext ?? 0}V).</span>
            ) : (
              <span> ha reportado una emergencia crítica.</span>
            )}
          </p>
          {(alerta.latitud || alerta.longitud) && (
            <div className={`flex items-center gap-1.5 text-xs ${isSpeed ? 'text-amber-200 bg-amber-700/50' : (isSabotage ? 'text-rose-200 bg-rose-800/50' : 'text-red-200 bg-red-700/50')} mb-4 p-2 rounded`}>
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">GPS: {alerta.latitud?.toFixed ? alerta.latitud.toFixed(5) : alerta.latitud}, {alerta.longitud?.toFixed ? alerta.longitud.toFixed(5) : alerta.longitud}</span>
            </div>
          )}
          <button 
            onClick={onAtender}
            className={`w-full bg-white ${btnTextClass} font-bold py-2 text-sm rounded-lg transition-colors shadow-lg active:scale-95 cursor-pointer`}
          >
            {isSpeed ? 'Atender Exceso de Velocidad' : (isSabotage ? 'Atender Alerta de Sabotaje' : 'Atender Emergencia')}
          </button>
        </div>
      </div>
    </div>
  );
}

