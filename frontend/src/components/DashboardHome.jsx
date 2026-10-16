import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radio, Truck, Users, AlertTriangle, Link2, TrendingUp, Package, ShieldCheck } from 'lucide-react';

const API = 'http://localhost:8000';

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
  const primaryColor = empresa.color_primario || '#1E40AF';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Dispositivos Registrados',
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
      sub: 'Conductores registrados'
    },
    {
      title: 'Alertas Pendientes',
      value: stats?.alertas_pendientes || 0,
      icon: AlertTriangle,
      color: stats?.alertas_pendientes > 0 ? '#EF4444' : '#6B7280',
      bg: stats?.alertas_pendientes > 0 ? 'bg-red-50' : 'bg-slate-50',
      sub: stats?.alertas_pendientes > 0 ? '¡Requieren atención!' : 'Sin alertas pendientes'
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500 mt-1">Resumen general de {empresa.nombre}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
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

      {/* Quick Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={20} style={{ color: primaryColor }} />
          Flujo de Registro
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Registrar Dispositivo', desc: 'Ingrese el dispositivo Teltonika FMC130 al inventario con su IMEI, SIM y datos.', icon: Radio, path: '/dispositivos' },
            { step: '2', title: 'Registrar Conductor', desc: 'Registre al conductor con su DNI, licencia de conducir y datos de contacto.', icon: Users, path: '/conductores' },
            { step: '3', title: 'Registrar Vehículo', desc: 'Registre la minivan con su placa, marca, modelo y datos del vehículo.', icon: Truck, path: '/vehiculos' },
            { step: '4', title: 'Vincular Todo', desc: 'Asigne el dispositivo GPS y conductor al vehículo para activar el monitoreo.', icon: Link2, path: '/vinculacion' },
          ].map((s, i) => (
            <div key={i} className="relative p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => window.location.href = s.path}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  {s.step}
                </span>
                <s.icon size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
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
