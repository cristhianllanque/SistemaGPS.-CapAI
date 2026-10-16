import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, X, ShieldAlert, MapPin } from 'lucide-react';
import { siren } from '../utils/sound';

export default function AlertaPanicoModal({ alertData, onClose, onAttended }) {
  const [estado, setEstado] = useState('atendida');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-4 border-red-600 animate-pulse-border">
        
        {/* Header */}
        <div className="bg-red-600 text-white p-4 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider">¡ALERTA DE PÁNICO!</h2>
              <p className="text-red-100 text-sm">Evento crítico detectado en tiempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-100 hover:text-white transition-colors">
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
                {new Date(alertData.fecha_hora).toLocaleTimeString()}
              </p>
            </div>
            <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-full">
                <ShieldAlert size={20} className="text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Conductor</p>
                <p className="font-bold text-slate-800">{alertData.conductor_nombre || 'Sin conductor asignado'}</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 mb-6" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Resolución</label>
              <select 
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 font-medium"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="atendida">Atendida / Caso Policial En Curso</option>
                <option value="falsa_alarma">Falsa Alarma / Error de Hardware</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Observaciones / Detalles</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows="3"
                placeholder="Escriba los detalles de la comunicación con el chofer o las acciones tomadas..."
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-red-500/30 flex justify-center items-center gap-2"
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
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
      `}} />
    </div>
  );
}
