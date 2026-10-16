import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import LiveMap from './LiveMap';
import Sidebar from './Sidebar';
import PanicAlert from './PanicAlert';
import { siren } from '../utils/sound';

const API = 'http://localhost:8000';

export default function MonitoringPage() {
  const [searchParams] = useSearchParams();
  const [vehiculos, setVehiculos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [emergencyVehicleId, setEmergencyVehicleId] = useState(null);

  const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  const activeEmpresaId = empresa?.id || 1;
  const WS_URL = token 
    ? `ws://localhost:8000/ws/flota/${activeEmpresaId}?token=${token}` 
    : null;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  // Check URL search parameters (e.g., ?vehiculo=12)
  useEffect(() => {
    const urlVehiculoId = searchParams.get('vehiculo');
    if (urlVehiculoId) {
      const parsedId = parseInt(urlVehiculoId, 10);
      if (!isNaN(parsedId)) {
        setSelectedVehicleId(parsedId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehRes, alertRes] = await Promise.all([
          axios.get(`${API}/api/vehiculos/`, { headers }),
          axios.get(`${API}/api/alertas/`, { headers })
        ]);
        // Solo vehículos activos Y con dispositivo vinculado
        setVehiculos(vehRes.data.filter(v => v.dispositivo_id != null));
        setAlertas(alertRes.data);

        // If there are pending panic alerts on load, focus on the most recent one
        const pendingPanics = alertRes.data.filter(a => a.estado === 'pendiente');
        if (pendingPanics.length > 0) {
          setEmergencyVehicleId(pendingPanics[0].vehiculo_id);
          setSelectedVehicleId(pendingPanics[0].vehiculo_id);
          siren.start();
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

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
      } else if (lastJsonMessage.type === 'alerta_panico' || lastJsonMessage.type === 'panic_alert') {
        // Start siren and focus directly on the vehicle in emergency
        siren.start();
        setEmergencyVehicleId(lastJsonMessage.vehiculo_id);
        setSelectedVehicleId(lastJsonMessage.vehiculo_id);

        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [lastJsonMessage, ...prev];
        });
      }
    }
  }, [lastJsonMessage]);

  const handleAtenderAlerta = async (alertaId) => {
    try {
      await axios.put(`${API}/api/alertas/${alertaId}/atender`, { estado: 'atendida' }, { headers });
      setAlertas(prev => prev.filter(a => a.alerta_id !== alertaId && a.id !== alertaId));
      
      // If no more alerts, stop siren and clear emergency mode
      if (alertas.length <= 1) {
        siren.stop();
        setEmergencyVehicleId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearFocus = () => {
    setSelectedVehicleId(null);
    setEmergencyVehicleId(null);
    siren.stop();
  };

  const primaryColor = empresa.color_primario || '#1E40AF';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 relative">
      <Sidebar 
        vehiculos={vehiculos} 
        color={primaryColor} 
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
      />
      <div className="flex-1 relative">
        <LiveMap 
          vehiculos={vehiculos} 
          selectedVehicleId={selectedVehicleId}
          emergencyVehicleId={emergencyVehicleId}
          onSelectVehicle={(id) => setSelectedVehicleId(id)}
          onClearFocus={handleClearFocus}
        />
        
        {/* Panic Alerts Overlay */}
        <div className="absolute top-4 right-4 z-[1000] space-y-4 max-w-sm w-full">
          {alertas.map((alerta, idx) => (
            <PanicAlert 
              key={idx} 
              alerta={alerta} 
              onAtender={() => handleAtenderAlerta(alerta.alerta_id || alerta.id)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
