import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';

export default function PanicAlert({ alerta, onAtender }) {
  return (
    <div className="bg-red-600 rounded-xl shadow-2xl p-4 text-white border-2 border-red-400 animate-in slide-in-from-right relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-red-400 animate-pulse"></div>
      <div className="flex gap-4">
        <div className="bg-red-500 rounded-full p-3 flex items-center justify-center animate-bounce shadow-inner">
          <AlertTriangle size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            ¡BOTÓN DE PÁNICO ACTIVADO!
          </h3>
          <p className="text-red-100 text-sm mb-3">
            Vehículo <strong className="text-white bg-red-700 px-1 rounded">{alerta.placa || 'Desconocido'}</strong> ha reportado una emergencia.
          </p>
          <div className="flex items-center gap-2 text-xs text-red-200 mb-4 bg-red-700/50 p-2 rounded">
            <MapPin size={12} />
            {alerta.latitud}, {alerta.longitud}
          </div>
          <button 
            onClick={onAtender}
            className="w-full bg-white text-red-600 hover:bg-red-50 font-bold py-2 rounded-lg transition-colors shadow-lg active:scale-95"
          >
            Atender Emergencia
          </button>
        </div>
      </div>
    </div>
  );
}
