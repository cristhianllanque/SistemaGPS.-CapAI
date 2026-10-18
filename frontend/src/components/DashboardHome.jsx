import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Radio, Truck, Users, AlertTriangle, Link2, TrendingUp, Package, ShieldCheck, Building2 } from 'lucide-react';
import { API_BASE_URL as API } from '../config';

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const rawEmpresa = localStorage.getItem('empresa');
  const empresa = (rawEmpresa && rawEmpresa !== 'null' && rawEmpresa !== 'undefined')
    ? (JSON.parse(rawEmpresa) || {})
    : {};
  const primaryColor = empresa?.color_primario || '#4F46E5';

  useEffect(() => {
    if (isSuperAdmin) {
      axios.get(`${API}/api/empresas/`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setEmpresas(res.data)).catch(console.error);
    }
  }, [isSuperAdmin, token]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params = {};
        if (isSuperAdmin && selectedEmpresa) {
          params.empresa_id = selectedEmpresa;
        }
        const res = await axios.get(`${API}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, selectedEmpresa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full"></div>
      </div>
    );
  }

  const cards = [
    ...(isSuperAdmin && !selectedEmpresa ? [{
      title: 'Empresas Clientes',
      value: empresas.length,
      icon: Building2,
      color: '#4F46E5',
      bg: 'bg-indigo-50',
      sub: `${empresas.filter(e => e.activo !== false).length} empresas activas`
    }] : []),
    {
      title: 'Dispositivos GPS',
      value: stats?.total_dispositivos || 0,
      icon: Radio,
      color: '#3B82F6',
      bg: 'bg-blue-50',
      sub: `${stats?.dispositivos_disponibles || 0} disponibles · ${stats?.dispositivos_asignados || 0} asignados`
    },
    {
      title: 'Vehículos Registrados',
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
      sub: 'Conductores en sistema'
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isSuperAdmin ? 'Centro de Control COPAI' : 'Panel de Control'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isSuperAdmin
              ? (selectedEmpresa ? `Vista filtrada por empresa` : `Gestión global de flotas y telemetría`)
              : `Resumen operativo de ${empresa?.nombre || 'su empresa'}`}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Building2 size={18} className="text-indigo-600" />
            <span className="text-xs font-semibold text-slate-600">Filtrar Empresa:</span>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">Todas las Empresas (Global)</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isSuperAdmin && !selectedEmpresa ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-4`}>
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
            <p className="text-sm font-medium text-slate-700 mt-1">{card.title}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Superadmin Directory of Companies */}
      {isSuperAdmin && !selectedEmpresa && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Directorio de Empresas de Transporte</h2>
            </div>
            <button 
              onClick={() => navigate('/empresas')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Ver Todas las Empresas →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs">
                  <th className="text-left py-2.5 font-semibold">Empresa</th>
                  <th className="text-left py-2.5 font-semibold">Identidad Visual</th>
                  <th className="text-center py-2.5 font-semibold">Vehículos</th>
                  <th className="text-center py-2.5 font-semibold">Dispositivos GPS</th>
                  <th className="text-center py-2.5 font-semibold">Usuarios</th>
                  <th className="text-right py-2.5 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empresas.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">{emp.nombre}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: emp.color_primario || '#4F46E5' }}></span>
                        <span className="text-xs text-slate-500 font-mono">{emp.color_primario || '#4F46E5'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-medium text-slate-700">{emp.total_vehiculos || 0}</td>
                    <td className="py-3 text-center font-medium text-slate-700">{emp.total_dispositivos || 0}</td>
                    <td className="py-3 text-center font-medium text-slate-700">{emp.total_usuarios || 0}</td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => setSelectedEmpresa(String(emp.id))}
                        className="text-xs font-medium text-indigo-600 hover:underline mr-3"
                      >
                        Filtrar Métricas
                      </button>
                      <button 
                        onClick={() => navigate('/empresas')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Configurar
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={20} style={{ color: primaryColor }} />
          {isSuperAdmin ? 'Accesos Rápidos de Administración' : 'Módulos Disponibles'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ...(isSuperAdmin ? [{ step: '1', title: 'Empresas Clientes', desc: 'Registre y personalice el branding y usuarios de cada empresa de transporte.', icon: Building2, path: '/empresas' }] : []),
            ...(isSuperAdmin ? [{ step: '2', title: 'Dispositivos GPS', desc: 'Gestione el inventario de equipos Teltonika FMC130.', icon: Radio, path: '/dispositivos' }] : []),
            { step: isSuperAdmin ? '3' : '1', title: 'Flota de Vehículos', desc: 'Consulte las unidades registradas y su información técnica.', icon: Truck, path: '/vehiculos' },
            { step: isSuperAdmin ? '4' : '2', title: 'Monitoreo GPS en Vivo', desc: 'Rastree en tiempo real la ubicación y telemetría de las minivans.', icon: Link2, path: '/monitoreo' },
          ].map((s, i) => (
            <div key={i} className="relative p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => navigate(s.path)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  {s.step}
                </span>
                <s.icon size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">{s.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
