import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, Truck, AlertTriangle, Route, User, Building2, Shield, Settings } from 'lucide-react';

export default function MobileBottomNav({ usuario, empresa, activeAlertCount = 0 }) {
  const primaryColor = empresa?.color_primario || '#16A34A';
  const rol = usuario?.rol || 'operador';
  const isParticular = empresa?.tipo === 'particular';

  let navItems = [];

  if (isParticular) {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mi Vehículo' },
      { to: '/historial-rutas', icon: Route, label: 'Historial' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/dashboard', icon: User, label: 'Perfil' },
    ];
  } else if (rol === 'superadmin') {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa' },
      { to: '/vehiculos', icon: Truck, label: 'Flotas' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/empresas', icon: Building2, label: 'Empresas' },
      { to: '/dashboard', icon: Shield, label: 'Central' },
    ];
  } else if (rol === 'admin') {
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa' },
      { to: '/vehiculos', icon: Truck, label: 'Mi Flota' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/historial-rutas', icon: Route, label: 'Historial' },
      { to: '/dashboard', icon: Settings, label: 'Ajustes' },
    ];
  } else {
    // Operador / Chofer
    navItems = [
      { to: '/monitoreo', icon: Map, label: 'Mapa' },
      { to: '/vehiculos', icon: Truck, label: 'Mi Flota' },
      { to: '/alertas', icon: AlertTriangle, label: 'Alertas', badge: activeAlertCount },
      { to: '/historial-rutas', icon: Route, label: 'Historial' },
      { to: '/dashboard', icon: User, label: 'Perfil' },
    ];
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.45)] select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer
              ${isActive ? 'text-white scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'}
            `}
          >
            {({ isActive }) => (
              <>
                <div 
                  className={`relative p-1.5 rounded-xl transition-all ${
                    isActive ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? `${primaryColor}25` : 'transparent',
                    color: isActive ? primaryColor : 'currentColor'
                  }}
                >
                  <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {/* Badge contador de alertas críticas */}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                <span 
                  className="text-[10px] font-bold tracking-tight mt-0.5 leading-tight"
                  style={{ color: isActive ? '#FFFFFF' : undefined }}
                >
                  {item.label}
                </span>

                {/* Indicador de pestaña activa */}
                {isActive && (
                  <span 
                    className="absolute bottom-0 w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
