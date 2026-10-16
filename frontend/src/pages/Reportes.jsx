import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Calendar, Truck, AlertTriangle, FileSpreadsheet, Search } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

export default function Reportes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [fechaInicio, setFechaInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd'T'00:00"));
  const [fechaFin, setFechaFin] = useState(format(new Date(), "yyyy-MM-dd'T'23:59"));
  
  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:8000';

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/reportes/consolidado`, {
        params: {
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin: new Date(fechaFin).toISOString(),
          formato: 'json'
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      alert('Error al obtener la previsualización del reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const handleDownload = async (formato) => {
    try {
      const response = await axios.get(`${API_URL}/api/reportes/consolidado`, {
        params: {
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin: new Date(fechaFin).toISOString(),
          formato: formato
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('link');
      link.href = url;
      link.setAttribute('download', `reporte_flota.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Error downloading file", err);
      alert('Error al descargar el archivo');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={28} className="text-indigo-600" /> Reportes Consolidados
          </h1>
          <p className="text-slate-500 text-sm mt-1">Genera y descarga informes de la operación de toda la flota</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => handleDownload('excel')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet size={18} /> Exportar Excel
          </button>
          <button 
            onClick={() => handleDownload('pdf')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            <Download size={18} /> Descargar PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fecha Inicio</label>
          <input 
            type="datetime-local" 
            className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fecha Fin</label>
          <input 
            type="datetime-local" 
            className="w-full p-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        
        <button 
          onClick={fetchPreview}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium shadow-sm flex items-center gap-2 transition-colors text-sm"
        >
          <Search size={16} /> Generar Previsualización
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Previsualización de Datos</h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{data.length} vehículos procesados</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Vehículo</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Conductor</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Distancia Recorrida</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Tiempo Motor ON</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Velocidad Máxima</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Eventos de Pánico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-indigo-600 rounded-full mb-2"></div>
                    <p>Procesando millones de lecturas GPS...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <p>No se encontraron datos en el rango seleccionado.</p>
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <Truck size={16} className="text-indigo-400" /> {row.Placa}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.Conductor}</td>
                    <td className="px-6 py-4 font-mono">
                      {row["Km Totales"]} <span className="text-xs text-slate-400">km</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {row["Horas Motor"]} <span className="text-xs text-slate-400">hrs</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {row["Velocidad Max (km/h)"]} <span className="text-xs text-slate-400">km/h</span>
                    </td>
                    <td className="px-6 py-4">
                      {row["Alertas Pánico"] > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                          <AlertTriangle size={12} /> {row["Alertas Pánico"]} alertas
                        </span>
                      ) : (
                        <span className="text-slate-400">Sin alertas</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
