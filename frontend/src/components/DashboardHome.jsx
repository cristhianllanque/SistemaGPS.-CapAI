import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Radio, Truck, Users, AlertTriangle, Link2, ShieldCheck, Building2,
  Map, Route, Car, Power, PowerOff, Gauge, Battery, Clock, UserCheck,
  Calendar, Zap, MessageCircle
} from 'lucide-react';
import { API_BASE_URL as API } from '../config';
import { parseServerUTC, formatPeruDate, formatPeruTime } from '../utils/peruTime';
import { useLiveSync } from '../utils/liveSync';
import {
  SuscripcionModal,
  formatearFechaLatam,
  obtenerEtiquetaPlan
} from './SuscripcionControl';

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [particulares, setParticulares] = useState([]);
  const [dispositivosSim, setDispositivosSim] = useState([]);
  const [misVehiculos, setMisVehiculos] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [suscripcionModalItem, setSuscripcionModalItem] = useState(null);

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const isOperador = usuario?.rol === 'operador';
  const rawEmpresa = localStorage.getItem('empresa');
  const empresa = (rawEmpresa && rawEmpresa !== 'null' && rawEmpresa !== 'undefined')
    ? (JSON.parse(rawEmpresa) || {})
    : {};
  const isParticular = empresa?.tipo === 'particular';
  const primaryColor = empresa?.color_primario || '#4F46E5';

  const fetchEmpresasList = React.useCallback(() => {
    if (isSuperAdmin) {
      const headers = { Authorization: `Bearer ${token}` };
      axios.get(`${API}/api/empresas/`, { headers }).then(res => setEmpresas(res.data)).catch(console.error);
      axios.get(`${API}/api/particulares/`, { headers }).then(res => setParticulares(res.data)).catch(console.error);
      axios.get(`${API}/api/dispositivos/`, { headers }).then(res => setDispositivosSim(res.data || [])).catch(console.error);
    }
  }, [isSuperAdmin, token]);

  const fetchStats = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = {};
      if (isSuperAdmin && selectedEmpresa) {
        params.empresa_id = selectedEmpresa;
      }
      const requests = [
        axios.get(`${API}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        })
      ];
      if (isParticular || isOperador) {
        requests.push(
          axios.get(`${API}/api/vehiculos/`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: [] }))
        );
      }
      const [statsRes, vehRes] = await Promise.all(requests);
      setStats(statsRes.data);
      if (vehRes?.data) {
        setMisVehiculos(vehRes.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, selectedEmpresa, isSuperAdmin, isParticular, isOperador]);

  useEffect(() => {
    fetchEmpresasList();
  }, [fetchEmpresasList]);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  useLiveSync(['vehiculos', 'conductores', 'dispositivos', 'alertas', 'empresas', 'particulares'], () => {
    fetchStats(true);
    fetchEmpresasList();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[320px]">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full"></div>
      </div>
    );
  }

  // ============================================================================
  // VISTA EXCLUSIVA: CLIENTE PARTICULAR (SOPORTA 1, 2, 3, 5 O MÁS VEHÍCULOS)
  // ============================================================================
  if (isParticular) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        {/* Tarjeta de Bienvenida del Propietario */}
        <div
          className="rounded-3xl p-5 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0f172a 0%, ${primaryColor} 160%)`
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">
                <ShieldCheck size={12} />
                <span>Protección Satelital Personal ({misVehiculos.length} {misVehiculos.length === 1 ? 'vehículo' : 'vehículos'})</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Hola, {usuario?.nombre || empresa?.nombre}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">{usuario?.email}</p>
            </div>
            <button
              onClick={() => navigate('/vehiculos')}
              className="px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Car size={16} />
              <span>Ver Lista en Vivo</span>
            </button>
          </div>
        </div>

        {/* Estado en Tiempo Real de todos los Vehículos del Cliente Particular */}
        {misVehiculos.length > 0 ? (
          <div className={`grid grid-cols-1 ${misVehiculos.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
            {misVehiculos.map((vItem) => {
              const u = vItem?.ultima_lectura || null;
              const readingDate = parseServerUTC(u?.timestamp);
              const diffMinutes = readingDate ? Math.abs(Date.now() - readingDate.getTime()) / (60 * 1000) : 9999;
              const isOnline = Boolean(u && u.online === true && diffMinutes < 15);
              const isIgnitionOn = Boolean(isOnline && u?.ignicion);
              const liveSpeed = isOnline && u ? (u.velocidad || 0) : 0;
              const isMoving = Boolean(isOnline && liveSpeed > 0);

              return (
                <div key={vItem.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Vehículo Vinculado
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h2 className="text-xl font-black text-slate-900 font-mono">{vItem.placa}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isMoving
                              ? 'bg-emerald-100 text-emerald-800'
                              : isIgnitionOn
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isMoving ? 'En Movimiento' : isIgnitionOn ? 'Motor Encendido' : 'Estacionado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[vItem.marca, vItem.modelo, vItem.color].filter(Boolean).join(' • ') || 'Unidad con GPS Teltonika Activo'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/monitoreo?vehiculo=${vItem.id}`)}
                      className="px-4 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Map size={15} />
                      <span>Ver en Mapa</span>
                    </button>
                  </div>

                  {/* Telemetría Rápida */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <Gauge size={16} className="mx-auto text-indigo-600 mb-1" />
                      <p className="text-[10px] font-bold uppercase text-slate-400">Velocidad</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">{liveSpeed} km/h</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      {isIgnitionOn ? (
                        <Power size={16} className="mx-auto text-emerald-600 mb-1" />
                      ) : (
                        <PowerOff size={16} className="mx-auto text-slate-400 mb-1" />
                      )}
                      <p className="text-[10px] font-bold uppercase text-slate-400">Motor</p>
                      <p className={`text-base font-black mt-0.5 ${isIgnitionOn ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {isIgnitionOn ? 'ENCENDIDO' : 'APAGADO'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <Battery size={16} className="mx-auto text-sky-600 mb-1" />
                      <p className="text-[10px] font-bold uppercase text-slate-400">Batería Auto</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {u?.bateria_ext !== undefined && u?.bateria_ext !== null ? `${u.bateria_ext} V` : '12.6 V'}
                      </p>
                    </div>
                  </div>

                  {readingDate && (
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>Último reporte GPS:</span>
                      </span>
                      <span className="font-bold text-slate-700">
                        {formatPeruDate(readingDate)} • {formatPeruTime(readingDate, true)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-2">
            <Car size={32} className="mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">Tus vehículos están en proceso de activación</h3>
            <p className="text-xs text-slate-500">
              En cuanto el equipo GPS reporte señal, verás aquí su ubicación y batería en vivo.
            </p>
          </div>
        )}

        {/* Acciones Directas para Cliente Particular */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/monitoreo')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-left active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Map size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Ubicación en Vivo</p>
              <p className="text-xs text-slate-400">Seguir mi vehículo en el mapa</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/historial-rutas')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-left active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Route size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Mis Recorridos</p>
              <p className="text-xs text-slate-400">Ver viajes, horarios y paradas</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/alertas')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-left active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Alertas de Seguridad</p>
              <p className="text-xs text-slate-400">
                {stats?.alertas_pendientes > 0 ? `${stats.alertas_pendientes} alerta(s) activa(s)` : 'Sin incidentes pendientes'}
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA GENERAL: SUPERADMIN, GERENTE DE FLOTA Y OPERADOR DE DESPACHO
  // ============================================================================
  const cards = [
    ...(isSuperAdmin && !selectedEmpresa ? [{
      title: 'Empresas Clientes',
      value: empresas.length,
      icon: Building2,
      color: '#4F46E5',
      bg: 'bg-indigo-50',
      sub: `${empresas.filter(e => e.activo !== false).length} empresas activas`
    }] : []),
    ...(!isOperador ? [{
      title: 'Dispositivos GPS',
      value: stats?.total_dispositivos || 0,
      icon: Radio,
      color: '#3B82F6',
      bg: 'bg-blue-50',
      sub: `${stats?.dispositivos_disponibles || 0} libres · ${stats?.dispositivos_asignados || 0} en uso`
    }] : []),
    {
      title: 'Vehículos en Flota',
      value: stats?.total_vehiculos || 0,
      icon: Truck,
      color: '#10B981',
      bg: 'bg-emerald-50',
      sub: `${stats?.vehiculos_activos || 0} activos · ${stats?.vehiculos_sin_dispositivo || 0} sin GPS`
    },
    {
      title: 'Conductores',
      value: stats?.total_conductores || 0,
      icon: Users,
      color: '#8B5CF6',
      bg: 'bg-violet-50',
      sub: 'Conductores registrados'
    },
    {
      title: 'Alertas Pendientes',
      value: stats?.alertas_pendientes || 0,
      icon: AlertTriangle,
      color: stats?.alertas_pendientes > 0 ? '#EF4444' : '#6B7280',
      bg: stats?.alertas_pendientes > 0 ? 'bg-red-50' : 'bg-slate-50',
      sub: stats?.alertas_pendientes > 0 ? '¡Requieren atención!' : 'Sin emergencias activas'
    },
  ];

  const quickActions = isOperador
    ? [
        { step: '1', title: 'Mapa de Monitoreo en Vivo', desc: 'Supervise en tiempo real todas las unidades en ruta y atienda emergencias SOS.', icon: Map, path: '/monitoreo' },
        { step: '2', title: 'Historial de Recorridos', desc: 'Reproduzca las rutas, velocidades y paradas de cualquier unidad por fecha.', icon: Route, path: '/historial-rutas' },
        { step: '3', title: 'Bandeja de Alertas', desc: 'Gestione alertas de botón de pánico, corte de batería y excesos de velocidad.', icon: AlertTriangle, path: '/alertas' },
        { step: '4', title: 'Padrón de Unidades', desc: 'Consulte las placas, conductores asignados y estado de cada vehículo.', icon: Truck, path: '/vehiculos' },
      ]
    : [
        ...(isSuperAdmin ? [{ step: '1', title: 'Empresas Clientes', desc: 'Registre y personalice el branding y usuarios de cada empresa de transporte.', icon: Building2, path: '/empresas' }] : []),
        ...(isSuperAdmin ? [{ step: '2', title: 'Dispositivos GPS', desc: 'Gestione el inventario de equipos Teltonika FMC130.', icon: Radio, path: '/dispositivos' }] : []),
        { step: isSuperAdmin ? '3' : '1', title: 'Flota de Vehículos', desc: 'Consulte las unidades registradas y su información técnica.', icon: Truck, path: '/vehiculos' },
        { step: isSuperAdmin ? '4' : '2', title: 'Monitoreo GPS en Vivo', desc: 'Rastree en tiempo real la ubicación y telemetría de las unidades.', icon: Link2, path: '/monitoreo' },
        ...(!isSuperAdmin ? [
          { step: '3', title: 'Historial de Rutas', desc: 'Revise los recorridos, kilómetros y paradas de su flota.', icon: Route, path: '/historial-rutas' },
          { step: '4', title: 'Conductores y Accesos', desc: 'Administre los choferes y operadores de su empresa.', icon: UserCheck, path: '/conductores' },
        ] : [])
      ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            {isSuperAdmin
              ? 'Centro de Control COPAI'
              : isOperador
              ? `Central de Despacho • ${empresa?.nombre || 'Flota'}`
              : 'Panel de Control'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            {isSuperAdmin
              ? (selectedEmpresa ? 'Vista filtrada por empresa' : 'Gestión global de flotas y telemetría')
              : `Resumen operativo en tiempo real de ${empresa?.nombre || 'su empresa'}`}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:w-auto flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 flex-shrink-0">Empresa:</span>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              className="w-full sm:w-auto bg-transparent text-xs md:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">Todas las Empresas (Global)</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards: 2 columnas compactas en móvil, 4/5 columnas en escritorio */}
      <div className={`grid grid-cols-2 md:grid-cols-2 ${isSuperAdmin && !selectedEmpresa ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-3 md:gap-4`}>
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3.5 md:p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-none">{card.value}</p>
            <p className="text-xs md:text-sm font-semibold text-slate-700 mt-1.5 leading-tight">{card.title}</p>
            <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 leading-snug">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Superadmin: Panel de Suscripciones por Vencer / Renovaciones */}
      {isSuperAdmin && !selectedEmpresa && (() => {
        const todasCuentas = [
          ...empresas.map(e => ({ ...e, _categoria: 'Empresa Flota' })),
          ...particulares.map(p => ({ ...p, _categoria: 'Particular' }))
        ];
        const cuentasPrioritarias = todasCuentas.sort((a, b) => {
          const peso = (item) => {
            if (item.estado_suscripcion === 'vencido' || item.estado_suscripcion === 'suspendido' || item.activo === false) return 0;
            if (item.estado_suscripcion === 'por_vencer') return 1;
            if (item.estado_suscripcion === 'al_dia') return 2;
            return 3;
          };
          return peso(a) - peso(b);
        });

        const abrirRecordatorioWhatsApp = (item) => {
          const rawPhone = String(item.telefono || '').replace(/\D/g, '');
          const phone = rawPhone.length === 9 ? `51${rawPhone}` : rawPhone;
          const fechaTxt = item.fecha_vencimiento ? formatearFechaLatam(item.fecha_vencimiento) : 'próximamente';
          const msg = `Hola ${item.nombre}, te saludamos de *Industrias CopAI*. Te recordamos que la suscripción de tu servicio de rastreo satelital GPS (${obtenerEtiquetaPlan(item.plan_servicio)}) vence el *${fechaTxt}*. Quedamos atentos para ayudarte con tu renovación.`;
          const url = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        };

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600 flex-shrink-0" />
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800">
                    Control de Suscripciones y Vencimientos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Seguimiento de periodos contratados (1M, 3M, 6M, 1A), recordatorio por WhatsApp y renovación en 1 clic
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Por vencer: {todasCuentas.filter(c => c.estado_suscripcion === 'por_vencer').length}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Vencidos/Pausa: {todasCuentas.filter(c => c.estado_suscripcion === 'vencido' || c.estado_suscripcion === 'suspendido' || c.activo === false).length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="text-left py-2.5 font-semibold">Cliente</th>
                    <th className="text-left py-2.5 font-semibold">Tipo</th>
                    <th className="text-left py-2.5 font-semibold">Plan</th>
                    <th className="text-left py-2.5 font-semibold">Estado / Días</th>
                    <th className="text-right py-2.5 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cuentasPrioritarias.map((cItem) => {
                    const est = cItem.estado_suscripcion || (cItem.activo === false ? 'suspendido' : 'ilimitado');
                    const dias = cItem.dias_restantes;
                    let pillClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    let pillLabel = dias != null ? `Activo (${dias} días)` : 'Activo • Ilimitado';
                    if (est === 'suspendido' || cItem.activo === false) {
                      pillClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      pillLabel = 'Suspendido';
                    } else if (est === 'vencido') {
                      pillClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      pillLabel = dias != null ? `Vencido hace ${Math.abs(dias)}d` : 'Vencido';
                    } else if (est === 'por_vencer') {
                      pillClass = 'bg-amber-50 text-amber-800 border-amber-300';
                      pillLabel = dias === 0 ? '¡Vence Hoy!' : `Vence en ${dias}d`;
                    }

                    return (
                      <tr key={`${cItem._categoria}-${cItem.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-semibold text-slate-800 text-xs md:text-sm">
                          <div>{cItem.nombre}</div>
                          {cItem.telefono && (
                            <div className="text-[11px] text-slate-400 font-normal">Tel: {cItem.telefono}</div>
                          )}
                        </td>
                        <td className="py-3 text-xs text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {cItem._categoria}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-slate-700 font-medium">
                          <div>{obtenerEtiquetaPlan(cItem.plan_servicio)}</div>
                          {cItem.fecha_vencimiento && cItem.plan_servicio !== 'ilimitado' && (
                            <div className="text-[11px] text-slate-400">
                              Vence: {formatearFechaLatam(cItem.fecha_vencimiento)}
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${pillClass}`}>
                            {pillLabel}
                          </span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirRecordatorioWhatsApp(cItem)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Enviar recordatorio de renovación por WhatsApp"
                            >
                              <MessageCircle size={13} />
                              <span className="hidden sm:inline">Recordar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSuscripcionModalItem(cItem)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Renovar o cambiar tiempo de suscripción"
                            >
                              <Zap size={12} className="text-amber-400" />
                              <span>Renovar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Superadmin: Control Anual de Chips SIM M2M (Teca IoT) */}
      {isSuperAdmin && !selectedEmpresa && (() => {
        const simsConFecha = (dispositivosSim || []).filter(d => d.fecha_vencimiento_sim || d.iccid_sim || d.plan_sim);
        if (simsConFecha.length === 0) return null;

        const calcDiasSim = (fIso) => {
          if (!fIso) return null;
          const target = new Date(`${String(fIso).split('T')[0]}T23:59:59`);
          if (isNaN(target.getTime())) return null;
          return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        };

        const simsOrdenados = [...simsConFecha].sort((a, b) => {
          const da = calcDiasSim(a.fecha_vencimiento_sim) ?? 9999;
          const db = calcDiasSim(b.fecha_vencimiento_sim) ?? 9999;
          return da - db;
        });

        const handleRenovarSimDashboard = async (dispId) => {
          try {
            await axios.post(`${API}/api/dispositivos/${dispId}/renovar-sim`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchEmpresasList();
          } catch (err) {
            alert(err.response?.data?.detail || 'Error al renovar chip SIM');
          }
        };

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Radio size={20} className="text-blue-600 flex-shrink-0" />
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800">
                    Control Anual de Chips SIM M2M (Teca IoT)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Recordatorio de renovación anual de planes de datos SIMCARD, ICCID y costo a pagar por cada GPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dispositivos')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer self-start sm:self-auto"
              >
                Gestionar SIMs →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="text-left py-2.5 font-semibold">Dispositivo / Vehículo</th>
                    <th className="text-left py-2.5 font-semibold">ICCID / Operador</th>
                    <th className="text-left py-2.5 font-semibold">Plan Contratado</th>
                    <th className="text-left py-2.5 font-semibold">Costo Anual</th>
                    <th className="text-left py-2.5 font-semibold">Vigencia / Días</th>
                    <th className="text-right py-2.5 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simsOrdenados.map((d) => {
                    const dias = calcDiasSim(d.fecha_vencimiento_sim);
                    let badgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    let badgeTxt = dias != null ? `Activo (${dias} días)` : 'Sin fecha';
                    if (dias != null && dias < 0) {
                      badgeCls = 'bg-rose-50 text-rose-700 border-rose-200';
                      badgeTxt = `🚨 Vencido hace ${Math.abs(dias)}d`;
                    } else if (dias != null && dias <= 30) {
                      badgeCls = 'bg-amber-50 text-amber-800 border-amber-300';
                      badgeTxt = `⚠️ Renovar en ${dias}d`;
                    }

                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 text-xs">
                          <div className="font-bold text-slate-800">{d.vehiculo_placa || 'En Stock'} ({d.modelo})</div>
                          <div className="font-mono text-[11px] text-slate-400">IMEI: {d.imei}</div>
                        </td>
                        <td className="py-2.5 text-xs">
                          <div className="font-semibold text-slate-700">{d.operador_sim || 'Teca IoT'}</div>
                          {d.iccid_sim && <div className="font-mono text-[11px] text-slate-500">ICC: {d.iccid_sim}</div>}
                        </td>
                        <td className="py-2.5 text-xs text-slate-700 max-w-[240px] truncate" title={d.plan_sim || ''}>
                          {d.plan_sim || 'Plan M2M Estándar'}
                        </td>
                        <td className="py-2.5 text-xs">
                          {d.costo_sim != null ? (
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              S/ {Number(d.costo_sim).toFixed(2)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 text-xs">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeCls}`}>
                            {badgeTxt}
                          </span>
                          {d.fecha_vencimiento_sim && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Vence: {formatearFechaLatam(d.fecha_vencimiento_sim)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRenovarSimDashboard(d.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Extender vigencia del chip SIM por +1 Año"
                          >
                            <Zap size={12} className="text-amber-400" />
                            <span>+1 Año</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Superadmin Directory of Companies */}
      {isSuperAdmin && !selectedEmpresa && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-indigo-600 flex-shrink-0" />
              <h2 className="text-base md:text-lg font-bold text-slate-800">Directorio de Empresas</h2>
            </div>
            <button 
              onClick={() => navigate('/empresas')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              Ver Todas →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs">
                  <th className="text-left py-2.5 font-semibold">Empresa</th>
                  <th className="hidden sm:table-cell text-left py-2.5 font-semibold">Identidad Visual</th>
                  <th className="text-center py-2.5 font-semibold">Vehículos</th>
                  <th className="text-center py-2.5 font-semibold">GPS</th>
                  <th className="hidden sm:table-cell text-center py-2.5 font-semibold">Usuarios</th>
                  <th className="text-right py-2.5 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empresas.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-semibold text-slate-800 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full sm:hidden flex-shrink-0" style={{ backgroundColor: emp.color_primario || '#4F46E5' }} />
                        <span className="truncate max-w-[140px] sm:max-w-none">{emp.nombre}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: emp.color_primario || '#4F46E5' }}></span>
                        <span className="text-xs text-slate-500 font-mono">{emp.color_primario || '#4F46E5'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-medium text-slate-700 text-xs md:text-sm">{emp.total_vehiculos || 0}</td>
                    <td className="py-3 text-center font-medium text-slate-700 text-xs md:text-sm">{emp.total_dispositivos || 0}</td>
                    <td className="hidden sm:table-cell py-3 text-center font-medium text-slate-700">{emp.total_usuarios || 0}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedEmpresa(String(emp.id))}
                        className="text-xs font-medium text-indigo-600 hover:underline mr-2.5 cursor-pointer"
                      >
                        Filtrar
                      </button>
                      <button 
                        onClick={() => navigate('/empresas')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
          <ShieldCheck size={20} style={{ color: primaryColor }} />
          {isSuperAdmin ? 'Accesos Rápidos de Administración' : 'Módulos Operativos'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((s, i) => (
            <div
              key={i}
              className="relative p-3.5 md:p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
              onClick={() => navigate(s.path)}
            >
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  {s.step}
                </span>
                <s.icon size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-0.5 md:mb-1">{s.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Renovación desde el Dashboard */}
      <SuscripcionModal
        show={Boolean(suscripcionModalItem)}
        entidad={suscripcionModalItem}
        onClose={() => setSuscripcionModalItem(null)}
        onUpdated={() => {
          fetchEmpresasList();
          fetchStats(true);
        }}
      />
    </div>
  );
}
