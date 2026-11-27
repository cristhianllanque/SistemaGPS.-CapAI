import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, X, ShieldAlert, MapPin, Zap, Gauge } from 'lucide-react';
import { siren } from '../utils/sound';
import { API_BASE_URL } from '../config';
import { formatPeruTime } from '../utils/peruTime';

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
      const finalObs =
        (observaciones || '').trim() ||
        (isSabotage
          ? 'Sabotaje verificado desde el aplicativo'
          : isSpeed
          ? 'Exceso de velocidad verificado desde el aplicativo'
          : 'Alerta SOS verificada desde el aplicativo');

      await axios.put(
        `${API_BASE_URL}/api/alertas/${alertData.id}/atender`,
        {
          estado,
          observaciones_atencion: finalObs
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      onAttended();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al registrar atención');
    } finally {
      setLoading(false);
    }
  };

  if (!alertData) return null;

  const headerBg = isSabotage ? 'bg-rose-700' : isSpeed ? 'bg-amber-600' : 'bg-red-600';
  const borderClass = isSabotage
    ? 'border-rose-600 animate-pulse-border'
    : isSpeed
    ? 'border-amber-500 animate-pulse-border-amber'
    : 'border-red-600 animate-pulse-border';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-[2px] px-4"
      style={{
        paddingTop: 'calc(0.5rem + var(--android-safe-top, 0px))',
        paddingBottom: 'calc(0.5rem + var(--android-safe-bottom, 0px))'
      }}
    >
      {/* Modal Compacto: ocupa solo el espacio necesario en móvil sin tapar toda la pantalla */}
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-[338px] sm:max-w-md flex flex-col overflow-hidden border-[3px] ${borderClass}`}
      >
        {/* Cabecera Compacta */}
        <div className={`${headerBg} text-white px-3.5 py-2.5 sm:px-4 sm:py-3 flex justify-between items-center`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-full animate-pulse flex-shrink-0">
              {isSabotage ? (
                <ShieldAlert size={18} />
              ) : isSpeed ? (
                <Zap size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide leading-tight truncate">
                {isSabotage
                  ? '¡ALERTA DE SABOTAJE / BATERÍA!'
                  : isSpeed
                  ? '¡EXCESO DE VELOCIDAD!'
                  : '¡BOTÓN DE PÁNICO SOS!'}
              </h2>
              <p className="text-[11px] text-white/90 leading-tight truncate mt-0.5">
                {isSabotage
                  ? 'Corte de energía principal detectado'
                  : isSpeed
                  ? 'Superó el límite de velocidad'
                  : 'Emergencia activada en tiempo real'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/85 hover:text-white p-1 rounded-lg flex-shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo Compacto */}
        <div className="p-3 sm:p-4 space-y-2.5">
          {/* Fila Placa + Hora */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Vehículo</p>
              <p className="text-sm font-black text-slate-800 truncate">
                {alertData.placa || 'Unidad'}
              </p>
            </div>
            <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Hora (Perú)</p>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {formatPeruTime(alertData.fecha_hora || new Date(), true)}
              </p>
            </div>
          </div>

          {/* Tira compacta de telemetría según tipo de alerta */}
          {isSabotage && (
            <div className="bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-700 block">
                  Batería Vehículo
                </span>
                <span className="text-sm font-black text-rose-900">{batExt} V (Corte)</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                  Respaldo GPS
                </span>
                <span className="text-xs font-extrabold text-emerald-800">
                  🔋{' '}
                  {alertData.bateria_porcentaje !== undefined &&
                  alertData.bateria_porcentaje !== null
                    ? `${alertData.bateria_porcentaje}%`
                    : '88%'}{' '}
                  Activo
                </span>
              </div>
            </div>
          )}

          {isSpeed && (
            <div className="bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-amber-700 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">
                    Velocidad
                  </span>
                  <span className="text-sm font-black text-amber-900">{velocidad} km/h</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-amber-800 block">
                  Límite: {limite} km/h
                </span>
                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                  +{Math.max(0, (velocidad || 0) - limite)} km/h
                </span>
              </div>
            </div>
          )}

          {/* Conductor en línea compacta */}
          <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Conductor:</span>
            <span className="font-bold text-slate-700 truncate max-w-[190px]">
              {alertData.conductor_nombre || alertData.conductor || 'Titular / Unidad'}
            </span>
          </div>

          {/* Formulario de Atención Rápida */}
          <form onSubmit={handleSubmit} className="space-y-2 pt-1 border-t border-slate-100">
            <select
              className="w-full py-1.5 px-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none font-semibold text-slate-700 bg-white"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {isSabotage ? (
                <>
                  <option value="atendida">Atendida / Vehículo y Batería Verificados</option>
                  <option value="falsa_alarma">Falsa Alarma / Mantenimiento de Batería</option>
                </>
              ) : isSpeed ? (
                <>
                  <option value="atendida">Atendida / Conductor Notificado</option>
                  <option value="falsa_alarma">Falsa Alarma / Revisión GPS</option>
                </>
              ) : (
                <>
                  <option value="atendida">Atendida / Emergencia Verificada</option>
                  <option value="falsa_alarma">Falsa Alarma / Prueba de Botón</option>
                </>
              )}
            </select>

            <input
              type="text"
              className="w-full py-1.5 px-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none text-slate-700"
              placeholder="Nota opcional (o toca Atender directo)..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />

            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleGoToMap}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-3 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin size={14} />
                <span>Ver Mapa</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 ${
                  isSabotage
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : isSpeed
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white font-bold py-2 px-3 rounded-xl text-xs sm:text-sm transition-colors shadow-md flex justify-center items-center cursor-pointer`}
              >
                {loading ? 'Guardando...' : 'Atender'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse-border {
          0%, 100% { border-color: #dc2626; box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.65); }
          50% { border-color: #fca5a5; box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
        }
        @keyframes pulse-border-amber {
          0%, 100% { border-color: #d97706; box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.65); }
          50% { border-color: #fcd34d; box-shadow: 0 0 0 10px rgba(217, 119, 6, 0); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
        .animate-pulse-border-amber {
          animation: pulse-border-amber 2s infinite;
        }
      `
        }}
      />
    </div>
  );
}
