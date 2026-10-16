import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, X, ShieldAlert, MapPin, Zap, Gauge } from 'lucide-react';
import { siren } from '../utils/sound';

export default function AlertaPanicoModal({ alertData, onClose, onAttended }) {
  const [estado, setEstado] = useState('atendida');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isSpeed = alertData?.tipo === 'exceso_velocidad';
  const isSabotage = alertData?.tipo === 'sabotaje';
  const velocidad = alertData?.velocidad || alertData?.data?.velocidad;
  const limite = alertData?.limite || alertData?.limite_velocidad || 90;
  const batExt = alertData?.bateria_ext !== undefined ? alertData.bateria_ext : 0.0;
  const batInt = alertData?.bateria_int !== undefined ? alertData.bateria_int : null;

  const handleGoToMap = () => {
    siren.stop();
    onClose();
    if (alertData?.vehiculo_id) {
      navigate(`/monitoreo?vehiculo=${alertData.vehiculo_id}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/alertas/${alertData.id}/atender`, {
        estado,
        observaciones_atencion: observaciones
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onAttended();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al registrar atención");
    } finally {
      setLoading(false);
    }
  };

  if (!alertData) return null;

  const headerBg = isSabotage ? 'bg-rose-700' : (isSpeed ? 'bg-amber-600' : 'bg-red-600');
  const borderClass = isSabotage 
    ? 'border-rose-600 animate-pulse-border' 
    : (isSpeed ? 'border-amber-500 animate-pulse-border-amber' : 'border-red-600 animate-pulse-border');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-4 ${borderClass}`}>
        
        {/* Header */}
        <div className={`${headerBg} text-white p-4 flex justify-between items-start`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              {isSabotage ? <ShieldAlert size={32} /> : (isSpeed ? <Zap size={32} /> : <AlertTriangle size={32} />)}
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider">
                {isSabotage 
                  ? '¡ALERTA DE SABOTAJE / CORTE DE BATERÍA!' 
                  : (isSpeed ? '¡ALERTA DE EXCESO DE VELOCIDAD!' : '¡ALERTA DE PÁNICO!')}
              </h2>
              <p className={isSabotage ? 'text-rose-100 text-sm' : (isSpeed ? 'text-amber-100 text-sm' : 'text-red-100 text-sm')}>
                {isSabotage
                  ? 'Batería principal desconectada (0.0 V). Posible intento de robo.'
                  : (isSpeed 
                    ? 'Unidad sobrepasó la velocidad máxima permitida' 
                    : 'Evento crítico detectado en tiempo real')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Vehículo (Placa)</p>
              <p className="text-lg font-bold text-slate-800">{alertData.placa || 'Desconocido'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Hora del Evento</p>
              <p className="text-lg font-bold text-slate-800">
                {alertData.fecha_hora ? new Date(alertData.fecha_hora).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </p>
            </div>

            {isSabotage && (
              <div className="col-span-2 bg-rose-50 p-3 rounded-lg border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-700 font-bold uppercase">Batería Principal (Vehículo)</p>
                    <p className="text-xl font-black text-rose-900">{batExt} V</p>
                  </div>
                  <span className="text-xs font-bold bg-rose-200 text-rose-800 px-2.5 py-1 rounded-full">
                    ⚠️ Corte / Desconectada
                  </span>
                </div>
                <div className="text-xs text-rose-800 flex items-center justify-between pt-1 border-t border-rose-200/60">
                  <span>Batería interna de respaldo GPS:</span>
                  <span className="font-bold text-emerald-700">
                    🔋 {alertData.bateria_porcentaje !== undefined && alertData.bateria_porcentaje !== null ? `${alertData.bateria_porcentaje}%` : '88%'} (Operativa y transmitiendo)
                  </span>
                </div>
              </div>
            )}

            {isSpeed ? (
              <div className="col-span-2 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Gauge size={22} />
                  </div>
                  <div>
                    <p className="text-xs text-amber-700 font-semibold uppercase">Velocidad Detectada</p>
                    <p className="text-xl font-black text-amber-900">{velocidad} km/h</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-amber-800">Límite Configurado:</span>
                  <div className="text-sm font-bold text-slate-700">{limite} km/h</div>
                  <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    +{Math.max(0, (velocidad || 0) - limite)} km/h de exceso
                  </span>
                </div>
              </div>
            ) : null}

            <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-full">
                <ShieldAlert size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Conductor</p>
                <p className="font-bold text-slate-800">{alertData.conductor_nombre || alertData.conductor || 'Sin conductor asignado'}</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 mb-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Resolución</label>
              <select 
                className={`w-full p-2.5 border border-slate-300 rounded-lg outline-none font-medium focus:ring-2 ${isSabotage ? 'focus:ring-rose-500' : (isSpeed ? 'focus:ring-amber-500' : 'focus:ring-red-500')}`}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {isSabotage ? (
                  <>
                    <option value="atendida">Atendida / Verificación del Vehículo y Batería Realizada</option>
                    <option value="falsa_alarma">Falsa Alarma / Mantenimiento Programado de Batería</option>
                  </>
                ) : isSpeed ? (
                  <>
                    <option value="atendida">Atendida / Conductor Notificado / Llamada de Advertencia</option>
                    <option value="falsa_alarma">Falsa Alarma / Error de Medición GPS</option>
                  </>
                ) : (
                  <>
                    <option value="atendida">Atendida / Caso Policial En Curso</option>
                    <option value="falsa_alarma">Falsa Alarma / Error de Hardware</option>
                  </>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Observaciones / Detalles</label>
              <textarea 
                className={`w-full p-3 border border-slate-300 rounded-lg outline-none resize-none focus:ring-2 ${isSabotage ? 'focus:ring-rose-500' : (isSpeed ? 'focus:ring-amber-500' : 'focus:ring-red-500')}`}
                rows="3"
                placeholder={isSabotage ? "Detalles de la inspección de batería o corte de cables..." : (isSpeed ? "Escriba la acción correctiva realizada con el chofer..." : "Escriba los detalles de la comunicación con el chofer...")}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleGoToMap}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Ver en Mapa
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className={`flex-1 ${isSabotage ? 'bg-rose-700 hover:bg-rose-800 shadow-rose-500/30' : (isSpeed ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30')} text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg flex justify-center items-center gap-2`}
              >
                {loading ? 'Registrando...' : 'Registrar Atención'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-border {
          0%, 100% { border-color: #dc2626; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          50% { border-color: #fca5a5; box-shadow: 0 0 0 15px rgba(220, 38, 38, 0); }
        }
        @keyframes pulse-border-amber {
          0%, 100% { border-color: #d97706; box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7); }
          50% { border-color: #fcd34d; box-shadow: 0 0 0 15px rgba(217, 119, 6, 0); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
        .animate-pulse-border-amber {
          animation: pulse-border-amber 2s infinite;
        }
      `}} />
    </div>
  );
}

