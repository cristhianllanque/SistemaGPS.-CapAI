import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Truck, Users, Link2, Map, AlertTriangle, Route,
  LogOut, ChevronLeft, ChevronRight, Activity, Menu, Shield, Building2, Car
} from 'lucide-react';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import AlertaPanicoModal from './AlertaPanicoModal';
import { siren } from '../utils/sound';
import { WS_BASE_URL, getAssetUrl } from '../config';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin', 'admin'] },
  { to: '/empresas', icon: Building2, label: 'Empresas Clientes', roles: ['superadmin'] },
  { to: '/particulares', icon: Car, label: 'Clientes Particulares', roles: ['superadmin'] },
  { to: '/dispositivos', icon: Radio, label: 'Dispositivos GPS', roles: ['superadmin'] },
  { to: '/vehiculos', icon: Truck, label: 'Vehículos', roles: ['superadmin', 'admin'] },
  { to: '/conductores', icon: Users, label: 'Conductores', roles: ['superadmin', 'admin'] },
  { to: '/vinculacion', icon: Link2, label: 'Vinculación', roles: ['superadmin', 'admin'] },
  { to: '/monitoreo', icon: Map, label: 'Monitoreo GPS', roles: ['superadmin', 'admin', 'operador'] },
  { to: '/historial-rutas', icon: Route, label: 'Historial de Rutas', roles: ['superadmin', 'admin', 'operador'] },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas', roles: ['superadmin', 'admin', 'operador'] },
  { to: '/reportes', icon: Activity, label: 'Reportes', roles: ['superadmin', 'admin'] },
  { to: '/usuarios', icon: Shield, label: 'Usuarios y Accesos', roles: ['superadmin', 'admin'] },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const rawEmpresa = localStorage.getItem('empresa');
  const empresa = (rawEmpresa && rawEmpresa !== 'null' && rawEmpresa !== 'undefined')
    ? (JSON.parse(rawEmpresa) || {})
    : {};
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const token = localStorage.getItem('token');
  const primaryColor = empresa?.color_primario || '#4F46E5';

  const [activeAlert, setActiveAlert] = useState(null);

  // Authenticated WebSocket connection with JWT token query parameter
  const activeEmpresaId = empresa?.id || 1;
  const WS_URL = token 
    ? `${WS_BASE_URL}/ws/flota/${activeEmpresaId}?token=${token}` 
    : null;
  
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (!lastJsonMessage) return;

    // Aislamiento Multi-empresa (estricto): usuarios que no son superadmin SOLO procesan
    // eventos cuyo empresa_id coincide exactamente con su propia empresa.
    if (usuario?.rol !== 'superadmin') {
      if (!lastJsonMessage.empresa_id || !empresa?.id || Number(lastJsonMessage.empresa_id) !== Number(empresa.id)) {
        return;
      }
    }

    if (lastJsonMessage.type === 'panic_alert') {
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
        tipo: 'panico',
        fecha_hora: new Date().toISOString()
      });
    } else if (lastJsonMessage.type === 'speed_alert') {
      // Show modal for speed excess alert
      setActiveAlert({
        id: lastJsonMessage.alerta_id,
        vehiculo_id: lastJsonMessage.vehiculo_id,
        placa: lastJsonMessage.placa,
        conductor_nombre: lastJsonMessage.conductor,
        latitud: lastJsonMessage.latitud,
        longitud: lastJsonMessage.longitud,
        tipo: 'exceso_velocidad',
        velocidad: lastJsonMessage.velocidad,
        limite: lastJsonMessage.limite,
        fecha_hora: new Date().toISOString()
      });
    } else if (lastJsonMessage.type === 'sabotage_alert') {
      // Trigger emergency siren sound for battery sabotage
      siren.start();
      setActiveAlert({
        id: lastJsonMessage.alerta_id,
        vehiculo_id: lastJsonMessage.vehiculo_id,
        placa: lastJsonMessage.placa,
        conductor_nombre: lastJsonMessage.conductor,
        latitud: lastJsonMessage.latitud,
        longitud: lastJsonMessage.longitud,
        bateria_ext: lastJsonMessage.bateria_ext,
        bateria_int: lastJsonMessage.bateria_int,
        tipo: 'sabotaje',
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
        {/* Logo & Corporate Identity Area */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 gap-3">
          {empresa?.logo_url ? (
            <img 
              src={getAssetUrl(empresa.logo_url)} 
              alt={empresa.nombre || 'Empresa'} 
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shadow flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <img 
              src="/logo-copai-white.png" 
              alt="Industrias CopAI" 
              className="h-8 max-w-[36px] object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight truncate text-white">
                {empresa?.nombre || (usuario?.rol === 'superadmin' ? 'Copai Central' : 'Copai GPS')}
              </h1>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>
                  {usuario?.rol === 'superadmin' ? 'Superadmin Copai' : (usuario?.rol === 'admin' ? 'Gerencia / Admin' : 'Operador')}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {(empresa?.tipo === 'particular'
            ? [
                { to: '/monitoreo', icon: Map, label: 'Mi Vehículo (En Vivo)' },
                { to: '/historial-rutas', icon: Route, label: 'Historial de Rutas' },
                { to: '/alertas', icon: AlertTriangle, label: 'Mis Alertas' },
              ]
            : NAV_ITEMS.filter(item => !item.roles || item.roles.includes(usuario.rol || 'operador'))
          ).map((item) => (
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
