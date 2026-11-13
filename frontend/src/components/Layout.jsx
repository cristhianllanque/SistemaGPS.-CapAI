import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Truck, Users, Link2, Map, AlertTriangle, Route,
  LogOut, ChevronLeft, ChevronRight, Activity, Menu, Shield, Building2, Car, Smartphone, User, Bell, BellRing
} from 'lucide-react';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import AlertaPanicoModal from './AlertaPanicoModal';
import { siren } from '../utils/sound';
import { WS_BASE_URL, getAssetUrl, isNativeApp } from '../config';
import { usePWA } from '../pwa/usePWA';
import InstallPwaModal from '../pwa/InstallPwaModal';
import MobileBottomNav from './MobileBottomNav';
import { emitLiveSync, useLiveSync } from '../utils/liveSync';
import {
  getNotificationPermissionState,
  subscribeUserToPush,
  sendTestPushNotification,
  showSystemNotification
} from '../utils/pushNotifications';

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
  const location = useLocation();
  const [empresa, setEmpresa] = useState(() => {
    const raw = localStorage.getItem('empresa');
    return (raw && raw !== 'null' && raw !== 'undefined') ? (JSON.parse(raw) || {}) : {};
  });
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const token = localStorage.getItem('token');
  const primaryColor = empresa?.color_primario || '#4F46E5';

  const [activeAlert, setActiveAlert] = useState(null);
  const [pushPermission, setPushPermission] = useState(() => getNotificationPermissionState());
  const [pushToast, setPushToast] = useState('');

  // Sincronizar automáticamente suscripción Web Push si el usuario ya concedió permiso previamente
  useEffect(() => {
    if (!token) return;
    if (getNotificationPermissionState() === 'granted') {
      subscribeUserToPush(token, false).then(() => {
        setPushPermission(getNotificationPermissionState());
      });
    }
  }, [token]);

  const handleTogglePushNotifications = async () => {
    siren.playSpeedBeep();
    if (getNotificationPermissionState() === 'unsupported') {
      if (isIOS && !isStandalone) {
        setShowPrompt(true);
        setPushToast('En iPhone: primero agrega la App a Inicio para recibir alertas en el bolsillo.');
        setTimeout(() => setPushToast(''), 4500);
        return;
      }
      setPushToast('Tu navegador actual no soporta notificaciones en segundo plano.');
      setTimeout(() => setPushToast(''), 4000);
      return;
    }

    const result = await subscribeUserToPush(token, true);
    setPushPermission(getNotificationPermissionState());

    if (result.ok) {
      await sendTestPushNotification(token);
      setPushToast('🔔 ¡Alertas de bolsillo activadas! Recibirás sonido ante Pánico, Sabotaje o Velocidad.');
      setTimeout(() => setPushToast(''), 4500);
    } else if (result.reason === 'denied') {
      setPushToast('Permiso de notificaciones bloqueado en los ajustes de tu teléfono.');
      setTimeout(() => setPushToast(''), 4500);
    }
  };

  // Sincronizar cabecera/colores/logo en caliente si se actualiza la empresa localmente
  useLiveSync(['empresas'], (detail) => {
    const updatedEmp = detail?.empresa;
    if (updatedEmp && empresa?.id && Number(updatedEmp.id) === Number(empresa.id)) {
      setEmpresa((prev) => {
        const merged = { ...prev, ...updatedEmp };
        localStorage.setItem('empresa', JSON.stringify(merged));
        return merged;
      });
    }
  });

  // Hook de PWA oficial para Android e iOS
  const {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    showPrompt,
    setShowPrompt,
    triggerInstall,
    dismissPrompt
  } = usePWA(empresa);

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
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        showSystemNotification(
          `🚨 ¡BOTÓN DE PÁNICO! (${lastJsonMessage.placa || 'UNIDAD'})`,
          `Emergencia SOS activada por ${lastJsonMessage.conductor || 'conductor'}.`,
          `copai-panic-${lastJsonMessage.vehiculo_id}`
        );
      }
      
      // Show modal when panic alert comes via websocket
      setActiveAlert({
        id: lastJsonMessage.alerta_id,
        vehiculo_id: lastJsonMessage.vehiculo_id,
        placa: lastJsonMessage.placa,
        conductor_nombre: lastJsonMessage.conductor,
        latitud: lastJsonMessage.latitud,
        longitud: lastJsonMessage.longitud,
        tipo: 'panico',
        fecha_hora: lastJsonMessage.fecha_hora || new Date().toISOString()
      });
      emitLiveSync({ type: 'entity_updated', entity: 'alertas', empresa_id: lastJsonMessage.empresa_id });
    } else if (lastJsonMessage.type === 'speed_alert') {
      // Play notification tone for speed excess alert
      siren.playSpeedBeep();
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        showSystemNotification(
          `⚡ EXCESO DE VELOCIDAD (${lastJsonMessage.placa || 'UNIDAD'})`,
          `Circula a ${lastJsonMessage.velocidad} km/h (Límite: ${lastJsonMessage.limite} km/h).`,
          `copai-speed-${lastJsonMessage.vehiculo_id}`
        );
      }

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
        fecha_hora: lastJsonMessage.fecha_hora || new Date().toISOString()
      });
      emitLiveSync({ type: 'entity_updated', entity: 'alertas', empresa_id: lastJsonMessage.empresa_id });
    } else if (lastJsonMessage.type === 'sabotage_alert') {
      // Trigger emergency siren sound for battery sabotage
      siren.start();
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        showSystemNotification(
          `🛡️ ¡SABOTAJE DE BATERÍA! (${lastJsonMessage.placa || 'UNIDAD'})`,
          `Corte de energía detectado (${lastJsonMessage.bateria_ext ?? 0}V).`,
          `copai-sabotage-${lastJsonMessage.vehiculo_id}`
        );
      }
      setActiveAlert({
        id: lastJsonMessage.alerta_id,
        vehiculo_id: lastJsonMessage.vehiculo_id,
        placa: lastJsonMessage.placa,
        conductor_nombre: lastJsonMessage.conductor,
        latitud: lastJsonMessage.latitud,
        longitud: lastJsonMessage.longitud,
        bateria_ext: lastJsonMessage.bateria_ext,
        bateria_int: lastJsonMessage.bateria_int,
        bateria_porcentaje: lastJsonMessage.bateria_porcentaje,
        tipo: 'sabotaje',
        fecha_hora: lastJsonMessage.fecha_hora || new Date().toISOString()
      });
      emitLiveSync({ type: 'entity_updated', entity: 'alertas', empresa_id: lastJsonMessage.empresa_id });
    } else if (lastJsonMessage.type === 'alert_resolved') {
      setActiveAlert((curr) => {
        if (curr && Number(curr.id) === Number(lastJsonMessage.alerta_id)) {
          siren.stop();
          return null;
        }
        return curr;
      });
      emitLiveSync(lastJsonMessage);
    } else if (lastJsonMessage.type === 'empresa_updated') {
      const updatedEmp = lastJsonMessage.empresa;
      if (updatedEmp && empresa?.id && Number(updatedEmp.id) === Number(empresa.id)) {
        setEmpresa((prev) => {
          const merged = { ...prev, ...updatedEmp };
          localStorage.setItem('empresa', JSON.stringify(merged));
          return merged;
        });
      }
      emitLiveSync(lastJsonMessage);
    } else if (lastJsonMessage.type === 'entity_updated') {
      emitLiveSync(lastJsonMessage);
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    return () => {
      siren.stop();
    };
  }, []);

  useEffect(() => {
    if (empresa?.nombre && empresa.id !== 0) {
      document.title = `${empresa.nombre} | Telematics GPS`;
    } else {
      document.title = 'COPAI';
    }
  }, [empresa]);

  const handleLogout = () => {
    siren.stop();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    localStorage.removeItem('last_empresa');
    localStorage.clear();
    document.title = 'COPAI';
    navigate('/login', { replace: true });
  };

  const handleAlertClosed = () => {
    siren.stop();
    setActiveAlert(null);
  };
  
  const handleAlertAttended = () => {
    const resolved = activeAlert;
    siren.stop();
    setActiveAlert(null);
    if (resolved) {
      emitLiveSync({
        type: 'alert_resolved',
        alerta_id: resolved.id,
        vehiculo_id: resolved.vehiculo_id,
        alerta_tipo: resolved.tipo,
        has_pending_sabotaje: false,
        has_pending_panico: false
      });
    }
  };

  const isParticular = empresa?.tipo === 'particular';
  const roleLabel = isParticular
    ? 'Cliente Particular'
    : (usuario?.rol === 'superadmin'
        ? 'Superadmin'
        : (usuario?.rol === 'admin' ? 'Gerencia / Admin' : 'Operador de Despacho'));

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-slate-950 md:bg-slate-100 overscroll-none">
      {/* Global Alert Modal */}
      {activeAlert && (
        <AlertaPanicoModal 
          alertData={activeAlert} 
          onClose={handleAlertClosed} 
          onAttended={handleAlertAttended} 
        />
      )}

      {/* Toast de Confirmación de Notificaciones en Segundo Plano */}
      {pushToast && (
        <div className="fixed top-16 md:top-5 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 text-white border border-emerald-500/40 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 max-w-[92vw] animate-in fade-in">
          <span>{pushToast}</span>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-64'} bg-slate-900 text-white hidden md:flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 z-50`}
      >
        {/* Logo & Corporate Identity Area */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 gap-3">
          {empresa?.logo_url ? (
            <img 
              src={getAssetUrl(empresa.logo_url)} 
              alt={empresa.nombre || 'Empresa'} 
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shadow flex-shrink-0"
              onError={(e) => { e.target.src = '/copai-symbol.png'; }}
            />
          ) : (
            <img 
              src="/copai-symbol.png" 
              alt="COPAI" 
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shadow flex-shrink-0"
            />
          )}
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight truncate text-white tracking-wide">
                {empresa?.nombre && empresa.id !== 0 ? empresa.nombre : 'COPAI'}
              </h1>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>
                  {usuario?.rol === 'superadmin' ? 'Superadmin' : (usuario?.rol === 'admin' ? 'Gerencia / Admin' : 'Operador')}
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

        {/* Botón Instalar App en Celular si no está instalada */}
        {!isStandalone && (
          <div className="px-2 pb-2">
            <button
              onClick={() => setShowPrompt(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors text-xs font-bold cursor-pointer"
              title="Instalar App Oficial en Celular (Android / iPhone)"
            >
              <Smartphone size={16} />
              {!collapsed && <span>Instalar App Móvil</span>}
            </button>
          </div>
        )}

        {/* User Info */}
        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/perfil')}
              className={`flex items-center gap-3 flex-1 min-w-0 p-1.5 -m-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                location.pathname === '/perfil' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80'
              }`}
              title="Ver Mi Perfil y Cambiar Contraseña"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white shadow"
                style={{ backgroundColor: primaryColor }}
              >
                {usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">{usuario.nombre}</p>
                  <p className="text-[10px] text-slate-400 truncate">Mi Perfil • {usuario.rol}</p>
                </div>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors flex-shrink-0 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-100">
        {/* Mobile Top Header (100% estático e inmóvil, respeta barra superior en Android sin tocar iOS) */}
        <header
          className="md:hidden bg-slate-950 text-white flex items-center justify-between px-3.5 border-b border-slate-800/80 flex-shrink-0 z-50 select-none touch-none"
          style={{
            height: 'calc(3.5rem + var(--android-safe-top, 0px))',
            paddingTop: 'var(--android-safe-top, 0px)',
            boxShadow: '0 -80px 0 80px #020617'
          }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {empresa?.logo_url ? (
              <img 
                src={getAssetUrl(empresa.logo_url)} 
                alt={empresa.nombre || 'Empresa'} 
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow flex-shrink-0"
                onError={(e) => { e.target.src = '/copai-symbol.png'; }}
              />
            ) : (
              <img 
                src="/copai-symbol.png" 
                alt="COPAI" 
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow flex-shrink-0"
              />
            )}
            <div className="overflow-hidden">
              <h1 className="text-xs font-black tracking-tight leading-tight truncate text-white">
                {empresa?.nombre && empresa.id !== 0 ? empresa.nombre : 'COPAI TELEMATICS'}
              </h1>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                <span className="truncate">{roleLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeAlert && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                <AlertTriangle size={12} />
                <span>¡SOS!</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleTogglePushNotifications}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                pushPermission === 'granted'
                  ? 'text-emerald-400 hover:bg-slate-800'
                  : 'text-amber-400 bg-amber-500/15 border border-amber-400/30 hover:bg-amber-500/25'
              }`}
              title={
                pushPermission === 'granted'
                  ? 'Alertas con sonido en segundo plano activas (Toca para probar)'
                  : 'Activar notificaciones con sonido cuando el celular esté en el bolsillo'
              }
            >
              {pushPermission === 'granted' ? <BellRing size={15} /> : <Bell size={15} />}
              {pushPermission !== 'granted' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
            {!isStandalone && !isNativeApp && (
              <button
                onClick={() => setShowPrompt(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-emerald-400 transition-colors cursor-pointer"
                title="Instalar Aplicativo en el teléfono"
              >
                <Smartphone size={13} />
                <span>App</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/perfil')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                location.pathname === '/perfil'
                  ? 'text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              style={location.pathname === '/perfil' ? { backgroundColor: primaryColor } : {}}
              title="Mi Perfil y Contraseña"
            >
              <User size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Contenido Principal acotado estrictamente entre el Header superior y el BottomNav inferior */}
        <main
          className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden relative bg-slate-100 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </main>

        {/* Barra de Navegación Inferior Móvil (Bottom Bar) */}
        <MobileBottomNav 
          usuario={usuario} 
          empresa={empresa} 
          activeAlertCount={activeAlert ? 1 : 0}
          isIOS={isIOS}
          isStandalone={isStandalone}
          isNativeApp={isNativeApp}
          onOpenInstall={() => setShowPrompt(true)}
          onLogout={handleLogout}
        />
      </div>
      {/* Modal de Instalación PWA */}
      <InstallPwaModal
        show={showPrompt}
        onClose={dismissPrompt}
        onInstall={isInstallable ? triggerInstall : null}
        isIOS={isIOS}
        isAndroid={isAndroid}
        companyName={empresa?.nombre || 'COPAI Telematics'}
        logoUrl={empresa?.logo_url ? getAssetUrl(empresa.logo_url) : '/copai-symbol.png'}
        primaryColor={primaryColor}
      />
    </div>
  );
}
