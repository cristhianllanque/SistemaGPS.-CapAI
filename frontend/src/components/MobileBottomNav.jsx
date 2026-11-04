import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Map, Truck, AlertTriangle, Route, User, Building2, Shield,
  LayoutGrid, Radio, Link2, Users, Car, Activity, LayoutDashboard,
  X, LogOut, Smartphone, ChevronRight
} from 'lucide-react';

export default function MobileBottomNav({
  usuario,
  empresa,
  activeAlertCount = 0,
  isIOS = false,
  isStandalone = false,
  isNativeApp = false,
  onOpenInstall,
  onLogout
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const primaryColor = empresa?.color_primario || '#16A34A';
  const rol = usuario?.rol || 'operador';
  const isParticular = empresa?.tipo === 'particular';

  // Cerrar el cajón de módulos automáticamente cuando cambia la ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  let navItems = [];
  let drawerModules = [];
  let drawerTitle = '';
  let drawerSubtitle = '';

  if (isParticular) {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mi Vehículo' },
      { to: '/historial-rutas', icon: Route, label: 'Recorridos' },
      { to: '/alertas', icon: AlertTriangle, label: 'Seguridad', badge: activeAlertCount },
      { to: '/dashboard', icon: User, label: 'Mi Cuenta' },
    ];
  } else if (rol === 'superadmin') {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa' },
      { to: '/empresas', icon: Building2, label: 'Empresas' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/dashboard', icon: Shield, label: 'Central' },
    ];
    drawerTitle = 'Módulos de Superadministrador';
    drawerSubtitle = 'Control total de equipos Teltonika, empresas y usuarios';
    drawerModules = [
      { to: '/dispositivos', icon: Radio, label: 'Dispositivos GPS', desc: 'Registrar equipos Teltonika', color: '#2563EB' },
      { to: '/vinculacion', icon: Link2, label: 'Vinculación GPS', desc: 'Unir GPS, unidad y chofer', color: '#7C3AED' },
      { to: '/empresas', icon: Building2, label: 'Empresas Clientes', desc: 'Subdominios y flotas', color: '#4F46E5' },
      { to: '/particulares', icon: Car, label: 'Particulares', desc: 'Dueños de vehículos propios', color: '#0D9488' },
      { to: '/vehiculos', icon: Truck, label: 'Vehículos', desc: 'Padrón general de unidades', color: '#16A34A' },
      { to: '/conductores', icon: Users, label: 'Conductores', desc: 'Licencias y choferes', color: '#D97706' },
      { to: '/historial-rutas', icon: Route, label: 'Historial de Rutas', desc: 'Reproducción y paradas', color: '#0284C7' },
      { to: '/usuarios', icon: Shield, label: 'Usuarios y Accesos', desc: 'Cuentas y verificación', color: '#E11D48' },
      { to: '/reportes', icon: Activity, label: 'Reportes', desc: 'Métricas y exportación', color: '#475569' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Panel Central', desc: 'Resumen global COPAI', color: '#6366F1' },
    ];
  } else if (rol === 'admin') {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa' },
      { to: '/vehiculos', icon: Truck, label: 'Mi Flota' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/historial-rutas', icon: Route, label: 'Historial' },
    ];
    drawerTitle = `Gestión de ${empresa?.nombre || 'Mi Flota'}`;
    drawerSubtitle = 'Administración operativa de unidades y personal';
    drawerModules = [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Resumen de Flota', desc: 'Indicadores de mi empresa', color: primaryColor },
      { to: '/conductores', icon: Users, label: 'Conductores', desc: 'Choferes de la empresa', color: '#D97706' },
      { to: '/vinculacion', icon: Link2, label: 'Vinculación GPS', desc: 'Asignar chofer y equipo', color: '#7C3AED' },
      { to: '/usuarios', icon: Shield, label: 'Usuarios y Accesos', desc: 'Operadores de despacho', color: '#2563EB' },
      { to: '/reportes', icon: Activity, label: 'Reportes de Flota', desc: 'Estadísticas operativas', color: '#0284C7' },
      { to: '/vehiculos', icon: Truck, label: 'Mis Vehículos', desc: 'Padrón de unidades', color: '#16A34A' },
    ];
  } else {
    // Operador de Despacho
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa Vivo' },
      { to: '/vehiculos', icon: Truck, label: 'Unidades' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/historial-rutas', icon: Route, label: 'Historial' },
      { to: '/dashboard', icon: User, label: 'Despacho' },
    ];
  }

  const hasDrawer = drawerModules.length > 0;
  const primaryPaths = navItems.map((i) => i.to);
  const isInsideDrawerModule = hasDrawer && !primaryPaths.includes(location.pathname);

  return (
    <>
      {/* Cajón Deslizable de Módulos (Bottom Sheet) para Superadmin y Gerentes */}
      {hasDrawer && menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          <div className="flex-1" onClick={() => setMenuOpen(false)} />

          <div
            className="bg-slate-900 text-white rounded-t-3xl border-t border-slate-700/80 shadow-2xl px-4 pt-3 max-h-[82dvh] flex flex-col animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: isIOS && isStandalone
                ? 'calc(4.5rem + max(env(safe-area-inset-bottom, 0px), 20px))'
                : 'calc(4.5rem + env(safe-area-inset-bottom, 0px))'
            }}
          >
            {/* Indicador superior de arrastre */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3 flex-shrink-0" />

            {/* Cabecera del Cajón */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">{drawerTitle}</h3>
                <p className="text-[11px] text-slate-400">{drawerSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuadrícula Táctil de Módulos */}
            <div className="py-3 overflow-y-auto grid grid-cols-2 gap-2.5">
              {drawerModules.map((mod) => {
                const active = location.pathname === mod.to;
                return (
                  <button
                    key={mod.to}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(mod.to);
                    }}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer ${
                      active
                        ? 'bg-slate-800 border-sky-500/60 shadow-lg'
                        : 'bg-slate-800/55 hover:bg-slate-800 border-slate-700/60'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${mod.color}25`, color: mod.color }}
                    >
                      <mod.icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-white leading-tight truncate">
                        {mod.label}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                        {mod.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Acciones Rápidas de Cuenta e Instalación */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-shrink-0">
              {!isStandalone && !isNativeApp && onOpenInstall && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenInstall();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Smartphone size={14} />
                  <span>Instalar Aplicativo</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra Inferior Fija con Safe-Area para iPhone y Android */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-1.5 pt-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.45)] select-none"
        style={{
          paddingBottom: isIOS && isStandalone
            ? 'max(env(safe-area-inset-bottom, 0px), 20px)'
            : 'max(env(safe-area-inset-bottom, 0px), 6px)'
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer flex-1
                ${isActive && !menuOpen ? 'text-white scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'}
              `}
            >
              {({ isActive }) => {
                const activeTab = isActive && !menuOpen;
                return (
                  <>
                    <div
                      className={`relative p-1.5 rounded-xl transition-all ${
                        activeTab ? 'shadow-md' : ''
                      }`}
                      style={{
                        backgroundColor: activeTab ? `${primaryColor}28` : 'transparent',
                        color: activeTab ? primaryColor : 'currentColor'
                      }}
                    >
                      <item.icon size={20} strokeWidth={activeTab ? 2.5 : 2} />

                      {/* Badge contador de alertas críticas */}
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-[10px] font-bold tracking-tight mt-0.5 leading-tight truncate max-w-[68px]"
                      style={{ color: activeTab ? '#FFFFFF' : undefined }}
                    >
                      {item.label}
                    </span>

                    {activeTab && (
                      <span
                        className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}

          {/* 5to Botón: Cajón de Módulos (para Superadmin y Gerentes) */}
          {hasDrawer && (
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer flex-1 ${
                menuOpen || isInsideDrawerModule
                  ? 'text-white scale-105'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div
                className={`relative p-1.5 rounded-xl transition-all ${
                  menuOpen || isInsideDrawerModule ? 'shadow-md' : ''
                }`}
                style={{
                  backgroundColor: menuOpen || isInsideDrawerModule ? `${primaryColor}28` : 'transparent',
                  color: menuOpen || isInsideDrawerModule ? primaryColor : 'currentColor'
                }}
              >
                <LayoutGrid size={20} strokeWidth={menuOpen || isInsideDrawerModule ? 2.5 : 2} />
              </div>

              <span
                className="text-[10px] font-bold tracking-tight mt-0.5 leading-tight"
                style={{ color: menuOpen || isInsideDrawerModule ? '#FFFFFF' : undefined }}
              >
                {rol === 'superadmin' ? 'Módulos' : 'Gestión'}
              </span>

              {(menuOpen || isInsideDrawerModule) && (
                <span
                  className="absolute bottom-0 w-3.5 h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
