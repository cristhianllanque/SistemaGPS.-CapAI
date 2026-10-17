import React, { useState } from 'react';
import axios from 'axios';
import { Route, X, Calendar, Search } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { API_BASE_URL } from '../config';

export default function HistoryModule({ vehiculos, onHistoryData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  const [fechaInicio, setFechaInicio] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [fechaFin, setFechaFin] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!selectedVehiculo) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/vehiculos/${selectedVehiculo}/historial`, {
        params: { fecha_inicio: new Date(fechaInicio).toISOString(), fecha_fin: new Date(fechaFin).toISOString() },
        headers: { Authorization: `Bearer ${token}` }
      });
      onHistoryData(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar historial");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onHistoryData([]);
    setSelectedVehiculo('');
  };

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-white p-3 rounded-lg shadow-lg text-slate-700 hover:text-indigo-600 transition-colors"
          title="Historial de Rutas"
        >
          <Route size={24} />
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-xl w-80 overflow-hidden animate-in slide-in-from-right">
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
            <h3 className="font-bold flex items-center gap-2">
              <Route size={18} /> Historial de Rutas
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-indigo-200">
              <X size={18} />
            </button>
          </div>
          <div className="p-4 space-y-4 text-sm">
            <div>
              <label className="block text-slate-600 mb-1">Vehículo</label>
              <select 
                className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500"
                value={selectedVehiculo}
                onChange={(e) => setSelectedVehiculo(e.target.value)}
              >
                <option value="">Seleccione un vehículo...</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} ({v.alias_conductor || 'Sin conductor'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Desde</label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Hasta</label>
              <input 
                type="datetime-local" 
                className="w-full p-2 border border-slate-200 rounded outline-none focus:border-indigo-500"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSearch}
                disabled={!selectedVehiculo || loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <Search size={16} /> {loading ? 'Buscando...' : 'Dibujar Ruta'}
              </button>
              <button 
                onClick={handleClear}
                className="px-3 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                title="Limpiar Mapa"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
