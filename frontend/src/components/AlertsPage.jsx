import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Clock, XCircle, FileText, User } from 'lucide-react';
import { formatPeruDateTime } from '../utils/peruTime';
import AlertaPanicoModal from './AlertaPanicoModal';
import { API_BASE_URL as API } from '../config';
import { emitLiveSync, useLiveSync } from '../utils/liveSync';

export default function AlertsPage() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAlertas = async () => {
    try {
      const res = await axios.get(`${API}/api/alertas/historial`, { headers });
      setAlertas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  useLiveSync(['alertas'], () => {
    fetchAlertas();
  });

  const handleAtenderClick = (alerta) => {
    setSelectedAlert(alerta);
  };

  const [filterTipo, setFilterTipo] = useState('todos');

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200 shadow-sm animate-pulse">
            <AlertTriangle size={14} /> Pendiente
          </span>
        );
      case 'atendida':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle size={14} /> Atendida
          </span>
        );
      case 'falsa_alarma':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
            <XCircle size={14} /> Falsa Alarma
          </span>
        );
      default:
        return null;
    }
  };

  const getTipoBadge = (alerta) => {
    if (alerta.tipo === 'sabotaje') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          🔌 Sabotaje / Batería Desconectada
        </span>
      );
    }
    if (alerta.tipo === 'exceso_velocidad') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          ⚡ Exceso Velocidad: {alerta.velocidad ? `${alerta.velocidad} km/h` : 'Registrado'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-300">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
        🚨 Botón de Pánico
      </span>
    );
  };

  const filteredAlertas = alertas.filter(a => {
    if (filterTipo === 'panico') return a.tipo === 'panico';
    if (filterTipo === 'sabotaje') return a.tipo === 'sabotaje';
    if (filterTipo === 'velocidad') return a.tipo === 'exceso_velocidad';
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {selectedAlert && (
        <AlertaPanicoModal 
          alertData={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAttended={() => {
            emitLiveSync({
              type: 'alert_resolved',
              alerta_id: selectedAlert.id,
              vehiculo_id: selectedAlert.vehiculo_id,
              alerta_tipo: selectedAlert.tipo,
              has_pending_sabotaje: false,
              has_pending_panico: false,
            });
            fetchAlertas();
          }}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-600 flex-shrink-0" />
            <span>Historial de Alertas de Seguridad y Flota</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1">
            Registro, auditoría y despacho de eventos de pánico, sabotaje de batería y excesos de velocidad.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold gap-1 self-start flex-wrap w-full md:w-auto">
          <button
            onClick={() => setFilterTipo('todos')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTipo === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Todas ({alertas.length})
          </button>
          <button
            onClick={() => setFilterTipo('panico')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTipo === 'panico' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pánico ({alertas.filter(a => a.tipo === 'panico').length})
          </button>
          <button
            onClick={() => setFilterTipo('sabotaje')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTipo === 'sabotaje' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🔌 Sabotaje ({alertas.filter(a => a.tipo === 'sabotaje').length})
          </button>
          <button
            onClick={() => setFilterTipo('velocidad')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${filterTipo === 'velocidad' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Exceso Velocidad ({alertas.filter(a => a.tipo === 'exceso_velocidad').length})
          </button>
        </div>
      </div>

      {/* Estado Vacío Centrado (Sin cortar en móvil) */}
      {filteredAlertas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 text-center">
          <CheckCircle size={42} className="mx-auto mb-3 text-emerald-400 opacity-70" />
          <p className="font-semibold text-slate-700 text-sm md:text-base">
            No hay alertas registradas en esta vista
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Cualquier evento de botón de pánico, corte de batería o exceso de velocidad aparecerá aquí de inmediato.
          </p>
        </div>
      ) : (
        <>
          {/* Vista de Tarjetas para Celular (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredAlertas.map(a => (
              <div
                key={a.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 space-y-3 ${
                  a.estado === 'pendiente'
                    ? (a.tipo === 'exceso_velocidad' ? 'border-amber-300 bg-amber-50/20' : 'border-red-300 bg-red-50/20')
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock size={14} className="text-slate-400" />
                    <span>{formatPeruDateTime(a.fecha_hora, true)}</span>
                  </div>
                  {getStatusBadge(a.estado)}
                </div>

                <div>{getTipoBadge(a)}</div>

                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{a.placa || 'Desconocido'}</div>
                    <div className="text-slate-500 text-xs">{a.conductor_nombre || 'Sin conductor'}</div>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 text-right">
                    GPS:<br />{a.latitud?.toFixed(4)}, {a.longitud?.toFixed(4)}
                  </div>
                </div>

                {a.estado !== 'pendiente' ? (
                  <div className="text-xs space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User size={13} className="text-indigo-500 flex-shrink-0" />
                      <span>Atendido por: <strong className="font-semibold">{a.usuario_atendio_nombre || 'Desconocido'}</strong></span>
                    </div>
                    {a.observaciones_atencion && (
                      <div className="flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <FileText size={13} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 italic">"{a.observaciones_atencion}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleAtenderClick(a)}
                    className={`w-full text-xs ${
                      a.tipo === 'exceso_velocidad'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white font-bold py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer`}
                  >
                    Atender Alerta Ahora
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Vista de Tabla para Escritorio (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Fecha y Hora</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Tipo de Evento</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Vehículo</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Estado</th>
                    <th className="text-left px-6 py-4 font-semibold text-slate-600">Detalles de Atención</th>
                    <th className="text-right px-6 py-4 font-semibold text-slate-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlertas.map(a => (
                    <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${a.estado === 'pendiente' ? (a.tipo === 'exceso_velocidad' ? 'bg-amber-50/40' : 'bg-red-50/30') : ''}`}>
                      <td className="px-6 py-4 text-slate-700 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2 font-medium">
                          <Clock size={16} className="text-slate-400" />
                          {formatPeruDateTime(a.fecha_hora, true)}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {getTipoBadge(a)}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-800">{a.placa || 'Desconocido'}</div>
                        <div className="text-slate-500 text-xs mt-1">{a.conductor_nombre || 'Sin conductor'}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-1">GPS: {a.latitud.toFixed(5)}, {a.longitud.toFixed(5)}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {getStatusBadge(a.estado)}
                      </td>
                      <td className="px-6 py-4 align-top max-w-xs">
                        {a.estado !== 'pendiente' ? (
                          <div className="text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <User size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                              <span className="text-slate-700">Por: <span className="font-semibold">{a.usuario_atendio_nombre || 'Desconocido'}</span></span>
                            </div>
                            {a.fecha_atencion && (
                              <div className="flex items-start gap-2">
                                <Clock size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600">{formatPeruDateTime(a.fecha_atencion, false)}</span>
                              </div>
                            )}
                            {a.observaciones_atencion && (
                              <div className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                                <FileText size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-600 italic line-clamp-3" title={a.observaciones_atencion}>"{a.observaciones_atencion}"</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Esperando atención...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        {a.estado === 'pendiente' && (
                          <button 
                            onClick={() => handleAtenderClick(a)}
                            className={`text-xs ${a.tipo === 'exceso_velocidad' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'} text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95`}
                          >
                            Atender Ahora
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
