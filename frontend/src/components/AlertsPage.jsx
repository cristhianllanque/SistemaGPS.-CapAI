import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Clock, XCircle, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import AlertaPanicoModal from './AlertaPanicoModal';

const API = 'http://localhost:8000';

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
    if (filterTipo === 'panico') return a.tipo !== 'exceso_velocidad';
    if (filterTipo === 'velocidad') return a.tipo === 'exceso_velocidad';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {selectedAlert && (
        <AlertaPanicoModal 
          alertData={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAttended={() => {
            fetchAlertas();
          }}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={26} className="text-red-600" /> Historial de Alertas de Seguridad y Flota
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro, auditoría y despacho de eventos de pánico y excesos de velocidad en tiempo real.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold gap-1 self-start">
          <button
            onClick={() => setFilterTipo('todos')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterTipo === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Todas ({alertas.length})
          </button>
          <button
            onClick={() => setFilterTipo('panico')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterTipo === 'panico' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pánico ({alertas.filter(a => a.tipo !== 'exceso_velocidad').length})
          </button>
          <button
            onClick={() => setFilterTipo('velocidad')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterTipo === 'velocidad' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Exceso Velocidad ({alertas.filter(a => a.tipo === 'exceso_velocidad').length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
              {filteredAlertas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-50" />
                    <p className="font-medium text-slate-600">No hay alertas registradas en esta vista</p>
                  </td>
                </tr>
              ) : filteredAlertas.map(a => (
                <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${a.estado === 'pendiente' ? (a.tipo === 'exceso_velocidad' ? 'bg-amber-50/40' : 'bg-red-50/30') : ''}`}>
                  <td className="px-6 py-4 text-slate-700 whitespace-nowrap align-top">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock size={16} className="text-slate-400" />
                      {format(new Date(a.fecha_hora), 'dd/MM/yyyy HH:mm')}
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
                            <span className="text-slate-600">{format(new Date(a.fecha_atencion), 'dd/MM/yyyy HH:mm')}</span>
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
    </div>
  );
}
