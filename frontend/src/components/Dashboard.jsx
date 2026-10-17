import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import { LogOut, Map as MapIcon, Activity } from 'lucide-react';
import LiveMap from './LiveMap';
import Sidebar from './Sidebar';
import PanicAlert from './PanicAlert';
import { API_BASE_URL, WS_BASE_URL } from '../config';

export default function Dashboard() {
  const [vehiculos, setVehiculos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const token = localStorage.getItem('token');
  
  const WS_URL = `${WS_BASE_URL}/ws/flota/${empresa.id}`;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    shouldReconnect: (closeEvent) => true,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    // Fetch initial state
    const fetchData = async () => {
      try {
        const [vehRes, alertRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/vehiculos`, { headers: { Authorization: `Bearer ${token}` }}),
          axios.get(`${API_BASE_URL}/api/alertas`, { headers: { Authorization: `Bearer ${token}` }})
        ]);
        setVehiculos(vehRes.data);
        setAlertas(alertRes.data);
      } catch (err) {
        if (err.response?.status === 401) {
          handleLogout();
        }
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.type === 'telemetria') {
        setVehiculos(prev => prev.map(v => {
          if (v.id === lastJsonMessage.vehiculo_id) {
            return {
              ...v,
              ultima_lectura: { ...lastJsonMessage.data }
            };
          }
          return v;
        }));
      } else if (lastJsonMessage.type === 'alerta_panico') {
        setAlertas(prev => [lastJsonMessage, ...prev]);
      }
    }
  }, [lastJsonMessage]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleAtenderAlerta = async (alertaId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/alertas/${alertaId}/atender`, { estado: 'atendida' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlertas(prev => prev.filter(a => a.alerta_id !== alertaId && a.id !== alertaId));
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic branding
  const primaryColor = empresa.color_primario || '#1E40AF';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <Sidebar vehiculos={vehiculos} color={primaryColor} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-opacity-20 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Activity size={20} style={{ color: primaryColor }} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">{empresa.nombre}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Operador: <strong className="text-slate-700">{usuario.nombre}</strong></span>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Map Area */}
        <main className="flex-1 relative">
          <LiveMap vehiculos={vehiculos} />
          
          {/* Panic Alerts Overlay */}
          <div className="absolute top-4 right-4 z-[1000] space-y-4 max-w-sm w-full">
            {alertas.map((alerta, idx) => (
              <PanicAlert key={idx} alerta={alerta} onAtender={() => handleAtenderAlerta(alerta.alerta_id || alerta.id)} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
