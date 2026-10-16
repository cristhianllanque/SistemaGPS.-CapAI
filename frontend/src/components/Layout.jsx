import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Truck, Users, Link2, Map, AlertTriangle, Route,
  LogOut, ChevronLeft, ChevronRight, Activity, Menu, Shield
} from 'lucide-react';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import AlertaPanicoModal from './AlertaPanicoModal';
import { siren } from '../utils/sound';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dispositivos', icon: Radio, label: 'Dispositivos' },
  { to: '/vehiculos', icon: Truck, label: 'Vehículos' },
  { to: '/conductores', icon: Users, label: 'Conductores' },
  { to: '/vinculacion', icon: Link2, label: 'Vinculación' },
  { to: '/monitoreo', icon: Map, label: 'Monitoreo GPS' },
  { to: '/historial-rutas', icon: Route, label: 'Historial de Rutas' },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas' },
  { to: '/reportes', icon: Activity, label: 'Reportes' },
  { to: '/usuarios', icon: Shield, label: 'Usuarios y Accesos', adminOnly: true },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const token = localStorage.getItem('token');
  const primaryColor = empresa.color_primario || '#1E40AF';

  const [activeAlert, setActiveAlert] = useState(null);

  // Authenticated WebSocket connection with JWT token query parameter
  const WS_URL = token && empresa?.id 
    ? `ws://localhost:8000/ws/flota/${empresa.id}?token=${token}` 
    : null;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastJsonMessage && lastJsonMessage.type === 'panic_alert') {
      // Trigger emergency siren sound in the browser
      siren.start();
      
      // Show modal when panic alert comes via websocket
      setActiveAlert({
        id: lastJsonMessage.alerta_id,
        vehiculo_id: lastJsonMessage.vehiculo_id,
        placa: lastJsonMessage.placa,
        conductor_nombre: lastJsonMessage.conductor,
        latitud: lastJsonMessage.latitud,
        longitud: lastJsonMessage.longitud,
        fecha_hora: new Date().toISOString()
      });
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    return () => {
      siren.stop();
    };
  }, []);

  const handleLogout = () => {
    siren.stop();
    localStorage.clear();
    navigate('/login');
  };

  const handleAlertClosed = () => {
    siren.stop();
    setActiveAlert(null);
  };
  
  const handleAlertAttended = () => {
    siren.stop();
    setActiveAlert(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Global Alert Modal */}
      {activeAlert && (
        <AlertaPanicoModal 
          alertData={activeAlert} 
          onClose={handleAlertClosed} 
          onAttended={handleAlertAttended} 
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-64'} bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 z-50`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Activity size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight truncate">Teltonika GPS</h1>
              <p className="text-[10px] text-slate-400 truncate">{empresa.nombre}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(item => !item.adminOnly || (usuario.rol === 'admin' || usuario.rol === 'superadmin')).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: primaryColor } : {}}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm"
          >
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /> <span>Colapsar</span></>}
          </button>
        </div>

        {/* User Info */}
        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {usuario.nombre?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{usuario.nombre}</p>
                <p className="text-[10px] text-slate-400 truncate">{usuario.rol}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
