import React from 'react';
import { AlertTriangle, MapPin, Zap } from 'lucide-react';

export default function PanicAlert({ alerta, onAtender }) {
  const isSpeed = alerta.tipo === 'exceso_velocidad';
  const velocidad = alerta.velocidad || alerta.data?.velocidad;
  const limite = alerta.limite || alerta.limite_velocidad || 90;

  return (
    <div className={`${isSpeed ? 'bg-amber-600 border-amber-400' : 'bg-red-600 border-red-400'} rounded-xl shadow-2xl p-4 text-white border-2 animate-in slide-in-from-right relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${isSpeed ? 'bg-amber-300' : 'bg-red-400'} animate-pulse`}></div>
      <div className="flex gap-4">
        <div className={`${isSpeed ? 'bg-amber-500' : 'bg-red-500'} rounded-full p-3 flex items-center justify-center animate-bounce shadow-inner`}>
          {isSpeed ? <Zap size={24} className="text-white" /> : <AlertTriangle size={24} className="text-white" />}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            {isSpeed ? '¡EXCESO DE VELOCIDAD!' : '¡BOTÓN DE PÁNICO ACTIVADO!'}
          </h3>
          <p className={`${isSpeed ? 'text-amber-100' : 'text-red-100'} text-sm mb-3`}>
            Vehículo <strong className={`text-white ${isSpeed ? 'bg-amber-700' : 'bg-red-700'} px-1.5 py-0.5 rounded font-mono`}>{alerta.placa || 'Desconocido'}</strong>
            {isSpeed ? (
              <span> circula a <strong className="text-white font-bold">{velocidad} km/h</strong> (Límite: {limite} km/h).</span>
            ) : (
              <span> ha reportado una emergencia crítica.</span>
            )}
          </p>
          {(alerta.latitud || alerta.longitud) && (
            <div className={`flex items-center gap-2 text-xs ${isSpeed ? 'text-amber-200 bg-amber-700/50' : 'text-red-200 bg-red-700/50'} mb-4 p-2 rounded`}>
              <MapPin size={12} />
              GPS: {alerta.latitud?.toFixed ? alerta.latitud.toFixed(5) : alerta.latitud}, {alerta.longitud?.toFixed ? alerta.longitud.toFixed(5) : alerta.longitud}
            </div>
          )}
          <button 
            onClick={onAtender}
            className={`w-full bg-white ${isSpeed ? 'text-amber-700 hover:bg-amber-50' : 'text-red-600 hover:bg-red-50'} font-bold py-2 rounded-lg transition-colors shadow-lg active:scale-95`}
          >
            {isSpeed ? 'Atender Exceso de Velocidad' : 'Atender Emergencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

