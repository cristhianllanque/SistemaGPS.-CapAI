import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radio, Plus, Search, Edit2, Trash2, X, Check, Wifi, WifiOff, AlertCircle, Shield, Calendar, RefreshCw } from 'lucide-react';
import { API_BASE_URL as API } from '../config';
import { useLiveSync } from '../utils/liveSync';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'asignado', label: 'Asignado' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'baja', label: 'Baja' },
];

const OPERADORES = [
  'Teca IoT (Multioperador M2M)',
  'Teca IoT (Claro M2M)',
  'Claro',
  'Movistar',
  'Bitel',
  'Entel',
  'Multioperador M2M'
];

// Catálogo oficial de Planes Teca Soluciones IoT (Planes 1 al 18)
const PLANES_SIM_PARTICULARES = [
  { id: '1) PLAN SIMCARD IOT-M2M 5MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '1) 5MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '2) PLAN SIMCARD IOT-M2M 10MB/MES x 1AÑO (MOVISTAR, CLARO, ENTEL Y BITEL)', shortLabel: '2) 10MB/MES x 1AÑO (Movistar, Claro, Entel y Bitel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '3) PLAN SIMCARD IOT-M2M 10MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '3) 10MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '4) PLAN SIMCARD IOT-M2M 15MB/MES + SMS x 1AÑO (CLARO)', shortLabel: '4) 15MB/MES + SMS x 1AÑO (Claro)', operador: 'Teca IoT (Claro M2M)', suggestedCost: '' },
  { id: '5) PLAN SIMCARD IOT-M2M 20MB/MES x 1AÑO (MOVISTAR Y CLARO)', shortLabel: '5) 20MB/MES x 1AÑO (Movistar y Claro)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '6) PLAN SIMCARD IOT-M2M 20MB/MES x 1AÑO (MOVISTAR, CLARO, ENTEL Y BITEL)', shortLabel: '6) 20MB/MES x 1AÑO (Movistar, Claro, Entel y Bitel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '7) PLAN SIMCARD IOT-M2M 20MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '7) 20MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '8) PLAN SIMCARD IOT-M2M 30MB/MES + SMS x 1AÑO (CLARO)', shortLabel: '8) 30MB/MES + SMS x 1AÑO (Claro)', operador: 'Teca IoT (Claro M2M)', suggestedCost: '' },
  { id: '9) PLAN SIMCARD IOT-M2M 30MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '9) 30MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '10) PLAN SIMCARD IOT-M2M 30MB/MES x 1AÑO (MOVISTAR, CLARO, ENTEL Y BITEL)', shortLabel: '10) 30MB/MES x 1AÑO (Movistar, Claro, Entel y Bitel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
];

const PLANES_SIM_FLOTAS = [
  { id: '11) PLAN SIMCARD IOT-M2M 60MB/MES x 1AÑO (MOVISTAR, CLARO, ENTEL Y BITEL)', shortLabel: '11) 60MB/MES x 1AÑO (Movistar, Claro, Entel y Bitel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '12) PLAN SIMCARD IOT-M2M 60MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '⭐ 12) 60MB/MES x 1AÑO (Movistar, Claro y Entel) — S/ 164.80', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '164.80' },
  { id: '13) PLAN SIMCARD IOT-M2M 60MB/MES + SMS x 1AÑO (CLARO)', shortLabel: '13) 60MB/MES + SMS x 1AÑO (Claro)', operador: 'Teca IoT (Claro M2M)', suggestedCost: '' },
  { id: '14) PLAN SIMCARD IOT-M2M 100MB/MES + SMS x 1AÑO (CLARO)', shortLabel: '14) 100MB/MES + SMS x 1AÑO (Claro)', operador: 'Teca IoT (Claro M2M)', suggestedCost: '' },
  { id: '15) PLAN SIMCARD IOT-M2M 450MB/MES + SMS x 1AÑO (CLARO)', shortLabel: '15) 450MB/MES + SMS x 1AÑO (Claro)', operador: 'Teca IoT (Claro M2M)', suggestedCost: '' },
  { id: '16) PLAN SIMCARD IOT-M2M 100MB/MES x 1AÑO (MOVISTAR, CLARO, ENTEL Y BITEL)', shortLabel: '16) 100MB/MES x 1AÑO (Movistar, Claro, Entel y Bitel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '17) PLAN SIMCARD IOT-M2M 100MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '17) 100MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
  { id: '18) PLAN SIMCARD IOT-M2M 200MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)', shortLabel: '18) 200MB/MES x 1AÑO (Movistar, Claro y Entel)', operador: 'Teca IoT (Multioperador M2M)', suggestedCost: '' },
];

const TODOS_PLANES_SIM = [...PLANES_SIM_PARTICULARES, ...PLANES_SIM_FLOTAS];

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonthsToDateISO(baseIsoStr, monthsToAdd = 12) {
  const base = baseIsoStr ? new Date(`${baseIsoStr}T12:00:00`) : new Date();
  if (isNaN(base.getTime())) return getTodayISO();
  base.setMonth(base.getMonth() + monthsToAdd);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLatam(isoDate) {
  if (!isoDate) return '—';
  const parts = String(isoDate).split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calcularDiasRestantesSim(fechaVencimientoIso) {
  if (!fechaVencimientoIso) return null;
  const target = new Date(`${String(fechaVencimientoIso).split('T')[0]}T23:59:59`);
  if (isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

const ESTADO_COLORS = {
  disponible: 'bg-green-100 text-green-700',
  asignado: 'bg-blue-100 text-blue-700',
  instalado: 'bg-blue-100 text-blue-700',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-red-100 text-red-700',
};

const emptyForm = {
  empresa_id: '', imei: '', numero_serie: '', modelo: 'FMC130', version_firmware: '',
  numero_sim: '', operador_sim: 'Teca IoT (Multioperador M2M)', iccid_sim: '',
  plan_sim: '12) PLAN SIMCARD IOT-M2M 60MB/MES x 1AÑO (MOVISTAR, CLARO Y ENTEL)',
  costo_sim: '164.80',
  fecha_activacion_sim: getTodayISO(),
  fecha_vencimiento_sim: addMonthsToDateISO(getTodayISO(), 12),
  tiene_boton_panico: true,
  fecha_compra: '', notas: ''
};

export default function DevicesPage() {
  const [dispositivos, setDispositivos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterEstado, setFilterEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const usuarioInfo = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isSuperAdmin = usuarioInfo.rol === 'superadmin';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const params = {};
      if (filterEstado) params.estado = filterEstado;
      if (searchTerm) params.search = searchTerm;
      const requests = [axios.get(`${API}/api/dispositivos/`, { headers, params })];
      if (isSuperAdmin) {
        requests.push(axios.get(`${API}/api/empresas/`, { headers }));
      }
      const [res, empRes] = await Promise.all(requests);
      setDispositivos(res.data);
      if (empRes) setEmpresas(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterEstado, searchTerm]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(timer);
  }, [filterEstado, searchTerm]);

  useLiveSync(['dispositivos', 'vehiculos', 'empresas', 'particulares'], () => {
    fetchData();
  });

  const renderSignalStatus = (ultimaConexion) => {
    if (!ultimaConexion) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Esperando 1ra señal</span>
        </span>
      );
    }
    const lastMs = new Date(ultimaConexion).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - lastMs) / 1000));
    if (diffSec <= 180) {
      const label = diffSec < 60 ? `hace ${diffSec}s` : `hace ${Math.floor(diffSec / 60)}m`;
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Transmitiendo ({label})</span>
        </span>
      );
    }
    if (diffSec <= 86400) {
      const mins = Math.floor(diffSec / 60);
      const label = mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)} h`;
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Señal {label}</span>
        </span>
      );
    }
    const days = Math.floor(diffSec / 86400);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span>Inactivo ({days}d)</span>
      </span>
    );
  };

  const openCreate = () => {
    setEditingId(null);
    const today = getTodayISO();
    setForm({
      ...emptyForm,
      fecha_activacion_sim: today,
      fecha_vencimiento_sim: addMonthsToDateISO(today, 12)
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setForm({
      empresa_id: d.empresa_id || '',
      imei: d.imei, numero_serie: d.numero_serie, modelo: d.modelo,
      version_firmware: d.version_firmware || '', numero_sim: d.numero_sim || '',
      operador_sim: d.operador_sim || '', iccid_sim: d.iccid_sim || '',
      plan_sim: d.plan_sim || '',
      costo_sim: d.costo_sim !== null && d.costo_sim !== undefined ? String(d.costo_sim) : '',
      fecha_activacion_sim: d.fecha_activacion_sim || '',
      fecha_vencimiento_sim: d.fecha_vencimiento_sim || '',
      tiene_boton_panico: d.tiene_boton_panico,
      fecha_compra: d.fecha_compra || '', notas: d.notas || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSelectPlanSim = (selectedPlanId) => {
    const found = TODOS_PLANES_SIM.find((p) => p.id === selectedPlanId);
    const actDate = form.fecha_activacion_sim || getTodayISO();
    setForm((prev) => ({
      ...prev,
      plan_sim: selectedPlanId,
      operador_sim: found ? found.operador : prev.operador_sim,
      costo_sim: found && found.suggestedCost ? found.suggestedCost : prev.costo_sim,
      fecha_activacion_sim: actDate,
      fecha_vencimiento_sim: selectedPlanId ? addMonthsToDateISO(actDate, 12) : prev.fecha_vencimiento_sim
    }));
  };

  const handleRenovarSimAnual = async (disp) => {
    try {
      await axios.post(`${API}/api/dispositivos/${disp.id}/renovar-sim`, {}, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al renovar vigencia del SIM');
    }
  };

  const renderSimPlanSemaphore = (d) => {
    if (!d.fecha_vencimiento_sim) return null;
    const dias = calcularDiasRestantesSim(d.fecha_vencimiento_sim);
    if (dias === null) return null;

    const costoTxt = d.costo_sim ? ` · S/ ${Number(d.costo_sim).toFixed(2)}` : '';
    if (dias < 0) {
      return (
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <span>🚨 SIM Vencido ({Math.abs(dias)}d){costoTxt}</span>
          </span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => handleRenovarSimAnual(d)}
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 hover:bg-blue-600 text-white transition-colors cursor-pointer"
              title="Renovar chip SIM por +1 Año"
            >
              🔄 +1 Año
            </button>
          )}
        </div>
      );
    }
    if (dias <= 30) {
      return (
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
            <span>⚠️ Renovar SIM en {dias}d{costoTxt}</span>
          </span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => handleRenovarSimAnual(d)}
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 hover:bg-blue-600 text-white transition-colors cursor-pointer"
              title="Renovar chip SIM por +1 Año"
            >
              🔄 +1 Año
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
          title={`Vence el ${formatDateLatam(d.fecha_vencimiento_sim)}`}
        >
          <span>🟢 SIM {dias}d · Vence {formatDateLatam(d.fecha_vencimiento_sim)}</span>
        </span>
      </div>
    );
  };

  const handleSave = async () => {
    if (!form.imei || !form.numero_serie) {
      setError('IMEI y Número de Serie son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.fecha_compra) delete payload.fecha_compra;
      if (!payload.version_firmware) delete payload.version_firmware;
      if (!payload.numero_sim) delete payload.numero_sim;
      if (!payload.operador_sim) delete payload.operador_sim;
      if (!payload.iccid_sim) delete payload.iccid_sim;
      if (!payload.plan_sim) delete payload.plan_sim;
      if (payload.costo_sim !== '' && payload.costo_sim !== null && payload.costo_sim !== undefined) {
        const parsedCost = parseFloat(payload.costo_sim);
        if (!isNaN(parsedCost)) payload.costo_sim = parsedCost;
        else delete payload.costo_sim;
      } else {
        delete payload.costo_sim;
      }
      if (!payload.fecha_activacion_sim) delete payload.fecha_activacion_sim;
      if (!payload.fecha_vencimiento_sim) delete payload.fecha_vencimiento_sim;
      if (!payload.notas) delete payload.notas;
      
      if (payload.empresa_id) payload.empresa_id = parseInt(payload.empresa_id, 10);
      else delete payload.empresa_id;

      if (editingId) {
        await axios.put(`${API}/api/dispositivos/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/dispositivos/`, payload, { headers });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de dar de baja este dispositivo?')) return;
    try {
      await axios.delete(`${API}/api/dispositivos/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Radio size={24} className="text-blue-600" />
            Dispositivos Teltonika
          </h1>
          <p className="text-slate-500 text-sm mt-1">Inventario de dispositivos GPS (FMC130, FMC920, FMC150, FMC650)</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Registrar Dispositivo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input type="text" placeholder="Buscar por IMEI o N° Serie..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {ESTADOS.map(e => (
            <button key={e.value} onClick={() => setFilterEstado(e.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                filterEstado === e.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">IMEI</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">N° Serie</th>
                {isSuperAdmin && (
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Empresa</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Modelo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">SIM / Operador</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Señal en Vivo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pánico</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vehículo</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispositivos.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "10" : "9"} className="text-center py-12 text-slate-400">
                    <Radio size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay dispositivos registrados</p>
                    <p className="text-xs mt-1">Registre su primer dispositivo Teltonika FMC130</p>
                  </td>
                </tr>
              ) : dispositivos.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{d.imei}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.numero_serie}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded font-mono">
                        {d.empresa_nombre || 'En Stock Copai'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-700">{d.modelo}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {d.operador_sim || d.numero_sim || '—'}
                      </span>
                      {d.costo_sim != null && (
                        <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                          S/ {Number(d.costo_sim).toFixed(2)}/año
                        </span>
                      )}
                    </div>
                    {d.plan_sim && (
                      <div className="text-[11px] font-medium text-blue-700 truncate max-w-[230px]" title={d.plan_sim}>
                        {d.plan_sim}
                      </div>
                    )}
                    {d.iccid_sim && (
                      <div className="text-[11px] font-mono text-slate-500">
                        ICC: {d.iccid_sim}
                      </div>
                    )}
                    {d.numero_sim && d.operador_sim && (
                      <div className="text-[11px] text-slate-400">N°: {d.numero_sim}</div>
                    )}
                    {renderSimPlanSemaphore(d)}
                  </td>
                  <td className="px-4 py-3">
                    {renderSignalStatus(d.ultima_conexion)}
                  </td>
                  <td className="px-4 py-3">
                    {d.tiene_boton_panico ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <Shield size={12} /> Sí
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${ESTADO_COLORS[d.estado] || 'bg-slate-100 text-slate-600'}`}>
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.vehiculo_placa ? (
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{d.vehiculo_placa}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                        <Edit2 size={15} />
                      </button>
                      {d.estado !== 'asignado' && d.estado !== 'instalado' && !d.vehiculo_placa && (
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Dar de baja">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (Cabecera y Botones Fijos) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0 bg-white">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {editingId ? 'Editar Dispositivo' : 'Registrar Nuevo Dispositivo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Cliente Asignada</label>
                  <select 
                    value={form.empresa_id || ''} 
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">En Stock Copai (Sin asignar a cliente)</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IMEI * (15 dígitos)</label>
                  <input type="text" maxLength="15" pattern="\d{15}" required value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value.replace(/\D/g,'') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="861234567890123" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">N° Serie *</label>
                  <input type="text" value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SN-FMC130-0001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo Teltonika</label>
                  <select value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="FMC130">FMC130 (4G Flotas · 12 Pines)</option>
                    <option value="FMC920">FMC920 (4G Compacto · 5 Pines)</option>
                    <option value="FMC150">FMC150 (4G CAN-Bus)</option>
                    <option value="FMC650">FMC650 (4G Transporte Pesado)</option>
                    <option value="FMC640">FMC640 (4G LTE Profesional)</option>
                    <option value="FMB920">FMB920 (2G Compacto · 5 Pines)</option>
                    <option value="FMB130">FMB130 (2G Flotas)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Versión Firmware</label>
                  <input type="text" value={form.version_firmware} onChange={(e) => setForm({ ...form, version_firmware: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="03.27.07.Rev.00" />
                </div>
              </div>

              {/* Bloque Especial: Chip SIM M2M (Teca IoT / Operador), Plan, Costo Anual y Contador de 1 Año */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>Plan SIMCARD IoT-M2M &amp; Vigencia Anual</span>
                  </span>
                  {form.costo_sim && (
                    <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      Recordatorio pago: S/ {form.costo_sim} / año
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selecciona el Plan SIMCARD (Catálogo Teca IoT 1 al 18)
                  </label>
                  <select
                    value={form.plan_sim}
                    onChange={(e) => handleSelectPlanSim(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sin plan Teca / Chip estándar --</option>
                    <optgroup label="🚐 Flotas, Minivanes y Rutas Interprovinciales (60MB a 200MB/mes)">
                      {PLANES_SIM_FLOTAS.map((p) => (
                        <option key={p.id} value={p.id}>{p.shortLabel}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🚗 Vehículos Particulares / Rutas Urbanas (5MB a 30MB/mes)">
                      {PLANES_SIM_PARTICULARES.map((p) => (
                        <option key={p.id} value={p.id}>{p.shortLabel}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ICCID SIM (18 a 20 dígitos, ej. Teca 89357...)
                    </label>
                    <input
                      type="text"
                      maxLength="22"
                      value={form.iccid_sim}
                      onChange={(e) => setForm({ ...form, iccid_sim: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="8935711001103892037"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Costo Anual (S/)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      value={form.costo_sim}
                      onChange={(e) => setForm({ ...form, costo_sim: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="164.80"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor / Operador</label>
                    <select
                      value={form.operador_sim}
                      onChange={(e) => setForm({ ...form, operador_sim: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {OPERADORES.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">N° SIM (Opcional en M2M)</label>
                    <input
                      type="text"
                      maxLength="15"
                      value={form.numero_sim}
                      onChange={(e) => setForm({ ...form, numero_sim: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha Compra / Activación SIM
                    </label>
                    <input
                      type="date"
                      value={form.fecha_activacion_sim}
                      onChange={(e) => {
                        const newAct = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          fecha_activacion_sim: newAct,
                          fecha_vencimiento_sim: newAct ? addMonthsToDateISO(newAct, 12) : prev.fecha_vencimiento_sim
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Vencimiento / Renovación SIM
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            fecha_vencimiento_sim: addMonthsToDateISO(prev.fecha_activacion_sim || getTodayISO(), 12)
                          }))}
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                          title="Calcular +1 Año exacto desde la fecha de activación"
                        >
                          +1 Año
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            fecha_vencimiento_sim: addMonthsToDateISO(prev.fecha_activacion_sim || getTodayISO(), 6)
                          }))}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                        >
                          +6M
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={form.fecha_vencimiento_sim}
                      onChange={(e) => setForm({ ...form, fecha_vencimiento_sim: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Compra</label>
                  <input type="date" value={form.fecha_compra} onChange={(e) => setForm({ ...form, fecha_compra: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer p-2">
                    <input type="checkbox" checked={form.tiene_boton_panico}
                      onChange={(e) => setForm({ ...form, tiene_boton_panico: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm font-medium text-slate-700">Tiene botón de pánico</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea rows="2" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Observaciones adicionales..." />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID Empresa Destino (Stock Global si está vacío)</label>
                  <input type="number" value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 1" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-3.5 border-t border-slate-200 flex-shrink-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Check size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar Dispositivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
