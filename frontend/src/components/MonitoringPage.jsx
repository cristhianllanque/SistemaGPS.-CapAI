import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import { Gauge, Sliders, Check, X } from 'lucide-react';
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

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const [empresa, setEmpresa] = useState(() => JSON.parse(localStorage.getItem('empresa') || '{}'));
  const [limiteVelocidad, setLimiteVelocidad] = useState(empresa?.limite_velocidad || 90);
  
  // Speed Limit modal
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [tempSpeed, setTempSpeed] = useState(limiteVelocidad);
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [speedToast, setSpeedToast] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  const activeEmpresaId = empresa?.id || 1;
  const canEditSpeedLimit = usuario?.rol === 'superadmin' || usuario?.rol === 'admin';

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
        const [vehRes, alertRes, empRes] = await Promise.all([
          axios.get(`${API}/api/vehiculos/`, { headers }),
          axios.get(`${API}/api/alertas/`, { headers }),
          axios.get(`${API}/api/empresas/${activeEmpresaId}`, { headers }).catch(() => null)
        ]);
        
        // Solo vehículos activos Y con dispositivo vinculado
        setVehiculos(vehRes.data.filter(v => v.dispositivo_id != null));
        setAlertas(alertRes.data);

        if (empRes?.data?.limite_velocidad) {
          setLimiteVelocidad(empRes.data.limite_velocidad);
          setTempSpeed(empRes.data.limite_velocidad);
        }

        // If there are pending panic alerts on load, focus on the most recent one
        const pendingPanics = alertRes.data.filter(a => a.estado === 'pendiente' && a.tipo !== 'exceso_velocidad');
        if (pendingPanics.length > 0) {
          setEmergencyVehicleId(pendingPanics[0].vehiculo_id);
          setSelectedVehicleId(pendingPanics[0].vehiculo_id);
          siren.start();
        }
      } catch (err) {
        console.error("Error al cargar datos de monitoreo:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.type === 'telemetria') {
        if (lastJsonMessage.limite_velocidad) {
          setLimiteVelocidad(lastJsonMessage.limite_velocidad);
        }
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
      } else if (lastJsonMessage.type === 'speed_alert') {
        // Real-time speed alert
        setAlertas(prev => {
          const exists = prev.some(a => (a.id || a.alerta_id) === (lastJsonMessage.alerta_id || lastJsonMessage.id));
          if (exists) return prev;
          return [{
            id: lastJsonMessage.alerta_id,
            alerta_id: lastJsonMessage.alerta_id,
            vehiculo_id: lastJsonMessage.vehiculo_id,
            placa: lastJsonMessage.placa,
            conductor_nombre: lastJsonMessage.conductor,
            latitud: lastJsonMessage.latitud,
            longitud: lastJsonMessage.longitud,
            tipo: 'exceso_velocidad',
            velocidad: lastJsonMessage.velocidad,
            limite: lastJsonMessage.limite,
            fecha_hora: new Date().toISOString()
          }, ...prev];
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

  const handleSaveSpeedLimit = async (e) => {
    e.preventDefault();
    if (tempSpeed < 20 || tempSpeed > 160) return;
    try {
      setSavingSpeed(true);
      await axios.put(`${API}/api/empresas/${activeEmpresaId}/limite-velocidad`, {
        limite_velocidad: tempSpeed
      }, { headers });

      setLimiteVelocidad(tempSpeed);
      
      // Update local storage
      const currentEmpresa = JSON.parse(localStorage.getItem('empresa') || '{}');
      currentEmpresa.limite_velocidad = tempSpeed;
      localStorage.setItem('empresa', JSON.stringify(currentEmpresa));
      setEmpresa(currentEmpresa);

      setShowSpeedModal(false);
      setSpeedToast(`Límite de velocidad actualizado a ${tempSpeed} km/h`);
      setTimeout(() => setSpeedToast(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al actualizar límite de velocidad");
    } finally {
      setSavingSpeed(false);
    }
  };

  const primaryColor = empresa.color_primario || '#1E40AF';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 relative">
      {/* Toast Notification */}
      {speedToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom">
          <Check size={20} className="bg-white/20 p-0.5 rounded-full" />
          <span className="font-medium text-sm">{speedToast}</span>
        </div>
      )}

      {/* Sidebar with fleet list */}
      <Sidebar 
        vehiculos={vehiculos} 
        color={primaryColor} 
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
        limiteVelocidad={limiteVelocidad}
      />

      <div className="flex-1 relative">
        {/* Floating Speed Limit Widget on Map */}
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Gauge size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Límite de Velocidad</div>
            <div className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>{limiteVelocidad} km/h</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Activo
              </span>
            </div>
          </div>
          {canEditSpeedLimit && (
            <button
              onClick={() => {
                setTempSpeed(limiteVelocidad);
                setShowSpeedModal(true);
              }}
              className="ml-2 text-xs font-semibold px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-sm shadow-amber-500/30 flex items-center gap-1 active:scale-95"
              title="Ajustar límite de velocidad"
            >
              <Sliders size={13} />
              <span>Ajustar</span>
            </button>
          )}
        </div>

        {/* Live Map */}
        <LiveMap 
          vehiculos={vehiculos} 
          selectedVehicleId={selectedVehicleId}
          emergencyVehicleId={emergencyVehicleId}
          limiteVelocidad={limiteVelocidad}
          onSelectVehicle={(id) => setSelectedVehicleId(id)}
          onClearFocus={handleClearFocus}
        />
        
        {/* Alerts Overlay (Panic & Speed alerts) */}
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

      {/* Modal: Ajustar Límite de Velocidad */}
      {showSpeedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Gauge size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Límite de Velocidad Máxima</h3>
                  <p className="text-xs text-slate-400">Configuración para {empresa?.nombre || 'la flota'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSpeedModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSpeedLimit} className="p-6 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-700">Velocidad Límite Permitida:</label>
                  <span className="text-base font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 font-mono">
                    {tempSpeed} km/h
                  </span>
                </div>
                
                <input 
                  type="range"
                  min="20"
                  max="160"
                  step="5"
                  value={tempSpeed}
                  onChange={(e) => setTempSpeed(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
                  <span>20 km/h</span>
                  <span>90 km/h</span>
                  <span>160 km/h</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Valores rápidos recomendados:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { speed: 40, label: 'Urbana (40)' },
                    { speed: 60, label: 'Avenida (60)' },
                    { speed: 80, label: 'Carretera (80)' },
                    { speed: 90, label: 'Ruta (90)' },
                    { speed: 100, label: 'Autopista (100)' },
                    { speed: 110, label: 'Rápida (110)' },
                  ].map(item => (
                    <button
                      key={item.speed}
                      type="button"
                      onClick={() => setTempSpeed(item.speed)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${tempSpeed === item.speed ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                🔔 <strong>Notificación inmediata:</strong> Cuando cualquier unidad de la flota supere los <strong>{tempSpeed} km/h</strong>, el sistema generará una alerta de exceso de velocidad en tiempo real para gerentes, administradores y operadores.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSpeedModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSpeed}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  {savingSpeed ? 'Guardando...' : 'Aplicar Límite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
