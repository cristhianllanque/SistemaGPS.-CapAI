import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, Radio, Truck, Users, Link2, Map, AlertTriangle, Route,
  LogOut, ChevronLeft, ChevronRight, Activity, Menu, Shield, Building2, Car, Smartphone, User, Bell, BellRing
} from 'lucide-react';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import AlertaPanicoModal from './AlertaPanicoModal';
import { siren } from '../utils/sound';
import { API_BASE_URL, WS_BASE_URL, getAssetUrl, isNativeApp, checkIsNativeApp } from '../config';
import { usePWA } from '../pwa/usePWA';
import InstallPwaModal from '../pwa/InstallPwaModal';
import MobileBottomNav from './MobileBottomNav';
import { emitLiveSync, readFlotaMessage, useLiveSync } from '../utils/liveSync';
import {
  getNotificationPermissionState,
  subscribeUserToPush,
  unsubscribeUserFromPush,
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
  const [usuario, setUsuario] = useState(() => JSON.parse(localStorage.getItem('usuario') || '{}') || {});
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const primaryColor = empresa?.color_primario || '#4F46E5';

  // Sincronizar perfil y empresa activa desde el servidor (detecta en caliente si Superadmin cambió al usuario de Empresa A a Empresa B)
  const syncUserProfile = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const { access_token, usuario: freshUser, empresa: freshEmp } = res.data || {};
      const prevEmpRaw = localStorage.getItem('empresa');
      const prevEmp = (prevEmpRaw && prevEmpRaw !== 'null' && prevEmpRaw !== 'undefined') ? (JSON.parse(prevEmpRaw) || {}) : {};
      const prevUserRaw = localStorage.getItem('usuario');
      const prevUser = (prevUserRaw && prevUserRaw !== 'null' && prevUserRaw !== 'undefined') ? (JSON.parse(prevUserRaw) || {}) : {};
      const companyChanged = Boolean(freshEmp && Number(prevEmp?.id || 0) !== Number(freshEmp?.id || 0));
      const roleChanged = Boolean(freshUser && prevUser?.rol && prevUser.rol !== freshUser.rol);

      if (access_token) {
        localStorage.setItem('token', access_token);
        if (companyChanged || roleChanged) {
          setToken(access_token);
        }
      }
      if (freshUser) {
        localStorage.setItem('usuario', JSON.stringify(freshUser));
        if (companyChanged || roleChanged || prevUser?.nombre !== freshUser.nombre || prevUser?.email !== freshUser.email) {
          setUsuario(freshUser);
        }
      }
      if (freshEmp) {
        localStorage.setItem('empresa', JSON.stringify(freshEmp));
        if (companyChanged || prevEmp?.nombre !== freshEmp.nombre || prevEmp?.logo_url !== freshEmp.logo_url || prevEmp?.color_primario !== freshEmp.color_primario) {
          setEmpresa(freshEmp);
        }
        if (companyChanged) {
          emitLiveSync({
            type: 'empresa_updated',
            empresa_id: freshEmp.id,
            empresa: freshEmp,
            company_switched: true
          });
          emitLiveSync({ type: 'connection_restored' });
        }
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('empresa');
        navigate('/login', { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    syncUserProfile();
  }, [syncUserProfile]);

  const [activeAlert, setActiveAlert] = useState(null);
  const dismissedAlertIdsRef = React.useRef(new Set());
  const notifiedAlertKeysRef = React.useRef(new Set());
  const [pushPermission, setPushPermission] = useState(() => getNotificationPermissionState());
  const [pushToast, setPushToast] = useState('');

  // Verificar si hay alertas críticas pendientes (en primer y segundo plano, incluso con celular en el bolsillo)
  const checkPendingAlertsModal = useCallback(async (forceReopen = false) => {
    const activeTok = localStorage.getItem('token');
    if (!activeTok) return;
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/alertas/`, {
        headers: { Authorization: `Bearer ${activeTok}` }
      });
      const pendingList = Array.isArray(data) ? data.filter((a) => !a.estado || a.estado === 'pendiente') : [];
      if (pendingList.length === 0) return;

      // Priorizar alertas no descartadas manualmente (primero pánico/sabotaje, luego exceso de velocidad)
      const candidates = forceReopen
        ? pendingList
        : pendingList.filter((a) => !dismissedAlertIdsRef.current.has(Number(a.id || a.alerta_id)));
      const critical = candidates.find((a) => a.tipo !== 'exceso_velocidad') || candidates[0];
      if (!critical) return;

      const critId = Number(critical.id || critical.alerta_id);
      const alertKey = `${critId}-${critical.tipo || 'panico'}-${critical.velocidad || ''}`;
      const isNewDetection = !notifiedAlertKeysRef.current.has(alertKey);
      notifiedAlertKeysRef.current.add(alertKey);

      setActiveAlert((curr) => {
        if (curr && Number(curr.id) === critId) return curr;
        return {
          id: critId,
          vehiculo_id: critical.vehiculo_id,
          placa: critical.placa,
          conductor_nombre: critical.conductor_nombre || critical.conductor,
          latitud: critical.latitud,
          longitud: critical.longitud,
          bateria_ext: critical.bateria_ext,
          bateria_int: critical.bateria_int,
          bateria_porcentaje: critical.bateria_porcentaje,
          velocidad: critical.velocidad,
          limite: critical.limite,
          tipo: critical.tipo || 'panico',
          fecha_hora: critical.fecha_hora || new Date().toISOString()
        };
      });

      const bellEnabled = getNotificationPermissionState() === 'granted';
      if ((isNewDetection || forceReopen) && bellEnabled) {
        if (critical.tipo !== 'exceso_velocidad') {
          siren.start();
        } else {
          siren.playSpeedBeep();
        }
        if (
          isNewDetection &&
          (checkIsNativeApp() || (typeof document !== 'undefined' && document.visibilityState !== 'visible'))
        ) {
          const title =
            critical.tipo === 'sabotaje'
              ? `🛡️ ¡SABOTAJE DE BATERÍA! (${critical.placa || 'UNIDAD'})`
              : critical.tipo === 'exceso_velocidad'
              ? `⚡ ¡EXCESO DE VELOCIDAD! (${critical.placa || 'UNIDAD'})`
              : `🚨 ¡BOTÓN DE PÁNICO! (${critical.placa || 'UNIDAD'})`;
          const body =
            critical.tipo === 'sabotaje'
              ? `Corte de batería principal detectado (${critical.bateria_ext ?? 0}V).`
              : critical.tipo === 'exceso_velocidad'
              ? `Circula a ${critical.velocidad || 0} km/h (Límite: ${critical.limite || 90} km/h).`
              : `Emergencia SOS activada en unidad ${critical.placa || ''}.`;
          showSystemNotification(title, body, `copai-bg-${critical.tipo}-${critical.vehiculo_id}`);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const forceFromUrl = typeof window !== 'undefined' && window.location.search.includes('alerta=1');
    checkPendingAlertsModal(forceFromUrl);
    // Vigilancia continua cada 5 segundos (funciona también en segundo plano / bolsillo en Android)
    const pollInterval = setInterval(() => {
      checkPendingAlertsModal(false);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [checkPendingAlertsModal]);

  // Escuchar eventos Push del Service Worker (tanto al recibir push en el bolsillo como al tocar la notificación)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onSwMessage = (event) => {
      if (event.data?.type === 'COPAI_NOTIFICATION_CLICK') {
        dismissedAlertIdsRef.current.clear();
        if (getNotificationPermissionState() === 'granted') {
          siren.start();
        }
        checkPendingAlertsModal(true);
      } else if (event.data?.type === 'COPAI_PUSH_RECEIVED') {
        if (event.data?.tag === 'copai-test-alert') return;
        if (getNotificationPermissionState() === 'granted') {
          if (String(event.data?.tag || '').includes('speed')) {
            siren.playSpeedBeep();
          } else {
            siren.start();
          }
          checkPendingAlertsModal(false);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [checkPendingAlertsModal]);

  // Si el usuario dejó la campana activa (Verde), mantenerla siempre activa al entrar
  useEffect(() => {
    if (!token) return;
    const state = getNotificationPermissionState();
    setPushPermission(state);
    if (state === 'granted') {
      siren.setKeepAlive(true);
      subscribeUserToPush(token, false).then(() => {
        setPushPermission(getNotificationPermissionState());
      });
    } else {
      siren.setKeepAlive(false);
    }
  }, [token]);

  const handleTogglePushNotifications = async () => {
    const currentState = getNotificationPermissionState();

    // Si la campana está VERDE (activa), el usuario puede desactivarla (pasa a PLOMO)
    if (currentState === 'granted') {
      await unsubscribeUserFromPush(token);
      setPushPermission('default');
      setPushToast('🔕 Alertas desactivadas (en silencio). Toca la campana cuando quieras activarlas.');
      setTimeout(() => setPushToast(''), 3000);
      return;
    }

    // Si la campana está PLOMO (desactivada), activarla (pasa a VERDE y queda siempre activa)
    if (currentState === 'unsupported' && !checkIsNativeApp()) {
      if (isIOS && !isStandalone) {
        setShowPrompt(true);
        setPushToast('En iPhone: agrega la App a Inicio para recibir alertas en el bolsillo.');
        setTimeout(() => setPushToast(''), 3500);
        return;
      }
      setPushToast('Activa los permisos de notificación en los ajustes de tu teléfono.');
      setTimeout(() => setPushToast(''), 3500);
      return;
    }

    const result = await subscribeUserToPush(token, true);
    const nextState = getNotificationPermissionState();
    setPushPermission(nextState);

    if (result.ok && nextState === 'granted') {
      siren.playSpeedBeep();
      await sendTestPushNotification(token);
      setPushToast('🔔 Alertas activadas (sonido y vibración listos ante Pánico, Sabotaje o Velocidad).');
      setTimeout(() => setPushToast(''), 3200);
    } else {
      setPushToast('Activa el permiso de notificaciones en tu teléfono para encender la campana.');
      setTimeout(() => setPushToast(''), 3500);
    }
  };

  // Sincronizar cabecera/colores/logo y empresa asignada en caliente si se actualiza la empresa o el usuario
  useLiveSync(['empresas', 'usuarios'], (detail) => {
    if (detail?.entity === 'usuarios') {
      syncUserProfile();
    }
    const updatedEmp = detail?.empresa;
    if (updatedEmp && (detail?.company_switched || (empresa?.id && Number(updatedEmp.id) === Number(empresa.id)))) {
      setEmpresa((prev) => {
        const merged = detail?.company_switched ? { ...updatedEmp } : { ...prev, ...updatedEmp };
        localStorage.setItem('empresa', JSON.stringify(merged));
        return merged;
      });
    }
  }, true);

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
  
  const { lastJsonMessage, readyState } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
    onMessage: (event) => {
      const message = readFlotaMessage(event);
      if (!message || !['entity_updated', 'empresa_updated'].includes(message.type)) return;
      if (usuario?.rol === 'superadmin' || (empresa?.id && Number(message.empresa_id) === Number(empresa.id))) {
        emitLiveSync(message);
      }
    },
  });

  useEffect(() => {
    if (readyState === 1) emitLiveSync({ type: 'connection_restored' });
  }, [readyState]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') {
        syncUserProfile();
        checkPendingAlertsModal();
        emitLiveSync({ type: 'connection_restored' });
        const activeTok = localStorage.getItem('token');
        if (activeTok && getNotificationPermissionState() === 'granted') {
          subscribeUserToPush(activeTok, false).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('online', refreshVisible);
    window.addEventListener('pageshow', refreshVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshVisible);
      window.removeEventListener('online', refreshVisible);
      window.removeEventListener('pageshow', refreshVisible);
    };
  }, []);

  useEffect(() => {
    if (!lastJsonMessage) return;

    // Aislamiento Multi-empresa (estricto): usuarios que no son superadmin SOLO procesan
    // eventos cuyo empresa_id coincide exactamente con su propia empresa.
    if (usuario?.rol !== 'superadmin') {
      if (!lastJsonMessage.empresa_id || !empresa?.id || Number(lastJsonMessage.empresa_id) !== Number(empresa.id)) {
        return;
      }
    }

    const bellEnabled = getNotificationPermissionState() === 'granted';

    if (lastJsonMessage.type === 'panic_alert') {
      dismissedAlertIdsRef.current.delete(Number(lastJsonMessage.alerta_id));
      if (bellEnabled) {
        siren.start();
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([600, 140, 600, 140, 850]); } catch {}
        if (checkIsNativeApp() || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) {
          showSystemNotification(
            `🚨 ¡BOTÓN DE PÁNICO! (${lastJsonMessage.placa || 'UNIDAD'})`,
            `Emergencia SOS activada por ${lastJsonMessage.conductor || 'conductor'}.`,
            `copai-panic-${lastJsonMessage.vehiculo_id}`
          );
        }
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
      dismissedAlertIdsRef.current.delete(Number(lastJsonMessage.alerta_id));
      if (bellEnabled) {
        siren.playSpeedBeep();
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([450, 120, 450, 120, 650]); } catch {}
        if (checkIsNativeApp() || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) {
          showSystemNotification(
            `⚡ EXCESO DE VELOCIDAD (${lastJsonMessage.placa || 'UNIDAD'})`,
            `Circula a ${lastJsonMessage.velocidad} km/h (Límite: ${lastJsonMessage.limite} km/h).`,
            `copai-speed-${lastJsonMessage.vehiculo_id}`
          );
        }
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
      dismissedAlertIdsRef.current.delete(Number(lastJsonMessage.alerta_id));
      if (bellEnabled) {
        siren.start();
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([600, 140, 600, 140, 850]); } catch {}
        if (checkIsNativeApp() || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) {
          showSystemNotification(
            `🛡️ ¡SABOTAJE DE BATERÍA! (${lastJsonMessage.placa || 'UNIDAD'})`,
            `Corte de energía detectado (${lastJsonMessage.bateria_ext ?? 0}V).`,
            `copai-sabotage-${lastJsonMessage.vehiculo_id}`
          );
        }
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
      if (lastJsonMessage.alerta_id) {
        dismissedAlertIdsRef.current.add(Number(lastJsonMessage.alerta_id));
      }
      setActiveAlert((curr) => {
        if (curr && Number(curr.id) === Number(lastJsonMessage.alerta_id)) {
          siren.stop();
          return null;
        }
        return curr;
      });
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
    siren.setKeepAlive(false);
    const savedPushPref = localStorage.getItem('copai_push_enabled');
    const savedVapidKey = localStorage.getItem('copai_vapid_public_key');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    localStorage.removeItem('last_empresa');
    localStorage.clear();
    if (savedPushPref !== null) {
      localStorage.setItem('copai_push_enabled', savedPushPref);
    }
    if (savedVapidKey !== null) {
      localStorage.setItem('copai_vapid_public_key', savedVapidKey);
    }
    document.title = 'COPAI';
    navigate('/login', { replace: true });
  };

  const handleAlertClosed = () => {
    if (activeAlert?.id) {
      dismissedAlertIdsRef.current.add(Number(activeAlert.id));
    }
    siren.stop();
    setActiveAlert(null);
  };
  
  const handleAlertAttended = () => {
    const resolved = activeAlert;
    if (resolved?.id) {
      dismissedAlertIdsRef.current.add(Number(resolved.id));
    }
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

      {/* Toast Compacto de Confirmación de Notificaciones */}
      {pushToast && (
        <div className="fixed top-14 md:top-4 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 text-white border border-slate-700 px-3.5 py-1.5 rounded-full shadow-xl text-[11px] font-semibold flex items-center gap-2 max-w-[88vw] text-center animate-in fade-in">
          <span className="truncate">{pushToast}</span>
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
                { to: '/monitoreo', icon: Map, label: 'Mapa en Vivo' },
                { to: '/vehiculos', icon: Car, label: 'Mis Vehículos' },
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
              className={`p-2 rounded-lg transition-all cursor-pointer relative border ${
                pushPermission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 shadow-xs'
                  : 'bg-slate-800/90 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
              }`}
              title={
                pushPermission === 'granted'
                  ? 'Alertas ACTIVAS (Verde) • Toca para desactivar'
                  : 'Alertas DESACTIVADAS (Plomo) • Toca para activar'
              }
            >
              {pushPermission === 'granted' ? <BellRing size={15} /> : <Bell size={15} />}
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  pushPermission === 'granted' ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
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
