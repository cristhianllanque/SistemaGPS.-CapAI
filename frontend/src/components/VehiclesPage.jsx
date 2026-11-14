import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import axios from 'axios';
import {
  Truck, Plus, Search, Edit2, Trash2, X, Check, AlertCircle, Building2,
  MapPin, User, BatteryCharging, Gauge, Compass, Map as MapIcon, Moon, Power,
  Radio, RefreshCw, Car
} from 'lucide-react';
import { API_BASE_URL as API, WS_BASE_URL, getAssetUrl } from '../config';
import { useLiveSync } from '../utils/liveSync';
import { useVehicleAddresses } from '../utils/reverseGeocode';
import { parseServerUTC } from '../utils/peruTime';

const TIPOS = ['minivan', 'bus', 'camioneta', 'sedan', 'otro'];

const ESTADO_COLORS = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-slate-100 text-slate-600',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
};

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatHumanPeruDateTime(ts) {
  const date = parseServerUTC(ts);
  if (!date || isNaN(date.getTime())) return 'Sin reporte reciente';
  try {
    const parts = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const map = {};
    parts.forEach((p) => { map[p.type] = p.value; });
    const day = map.day || '';
    const monthIdx = Math.max(0, (parseInt(map.month || '1', 10) || 1) - 1);
    const monthName = MESES_ES[monthIdx] || '';
    const hour = map.hour || '00';
    const minute = map.minute || '00';
    return `${day} de ${monthName} a las ${hour}:${minute}`;
  } catch {
    return 'Reporte registrado';
  }
}

const emptyForm = {
  padron: '', placa: '', marca: '', modelo: '', anio: '', color: '', tipo: 'minivan',
  numero_asientos: '', foto_url: '', empresa_id: ''
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vehiculos, setVehiculos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filtro rápido estilo Gemelos GPS Full: 'all' | 'on' (Encendidos) | 'off' (Apagados)
  const [motorFilter, setMotorFilter] = useState('all');

  // Modo de vista: 'activos' (Telemetría en vivo + Avenida estilo Gemelos Full) | 'padron' (Ficha Técnica / Tabla)
  const [viewMode, setViewMode] = useState(() => {
    return searchParams.get('vista') === 'padron' ? 'padron' : 'activos';
  });

  useEffect(() => {
    const vistaParam = searchParams.get('vista');
    if (vistaParam === 'padron') {
      setViewMode('padron');
    } else if (vistaParam === 'activos') {
      setViewMode('activos');
    }
  }, [searchParams]);

  const handleSwitchViewMode = (mode) => {
    setViewMode(mode);
    const next = new URLSearchParams(searchParams);
    if (mode === 'padron') {
      next.set('vista', 'padron');
    } else {
      next.delete('vista');
    }
    setSearchParams(next, { replace: true });
  };

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const empresaLocal = JSON.parse(localStorage.getItem('empresa') || '{}');
  const isSuperAdmin = usuario.rol === 'superadmin';
  const canEdit = isSuperAdmin || usuario.rol === 'admin';
  const headers = { Authorization: `Bearer ${token}` };
  const primaryColor = empresaLocal?.color_primario || '#16A34A';

  // Conexión WebSocket compartida para actualizar velocidad, motor, batería y posición en tiempo real
  const wsEmpresaId = empresaLocal?.id || 1;
  const WS_URL = token ? `${WS_BASE_URL}/ws/flota/${wsEmpresaId}?token=${token}` : null;
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    shouldReconnect: (closeEvent) => closeEvent.code !== 1008,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (!lastJsonMessage) return;
    if (!isSuperAdmin && (!lastJsonMessage.empresa_id || !empresaLocal?.id || Number(lastJsonMessage.empresa_id) !== Number(empresaLocal.id))) {
      return;
    }
    if (lastJsonMessage.type === 'telemetria' && lastJsonMessage.vehiculo_id) {
      setVehiculos((prev) =>
        prev.map((v) =>
          v.id === lastJsonMessage.vehiculo_id
            ? {
                ...v,
                empresa_limite_velocidad: lastJsonMessage.limite_velocidad || v.empresa_limite_velocidad,
                ultima_lectura: { ...(v.ultima_lectura || {}), ...lastJsonMessage.data, online: true }
              }
            : v
        )
      );
    }
  }, [lastJsonMessage, isSuperAdmin, empresaLocal?.id]);

  // Geocodificación inversa en vivo (Avenida / Jirón / Calle + Distrito) con caché instantánea
  const addresses = useVehicleAddresses(vehiculos);

  const fetchEmpresas = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await axios.get(`${API}/api/empresas/`, { headers });
      setEmpresas(res.data);
    } catch (err) {
      console.error('Error fetching empresas:', err);
    }
  };

  const fetchData = async () => {
    try {
      const params = {};
      if (isSuperAdmin && selectedEmpresaFilter) params.empresa_id = selectedEmpresaFilter;
      const res = await axios.get(`${API}/api/vehiculos/`, { headers, params });
      setVehiculos(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedEmpresaFilter]);

  useLiveSync(['vehiculos', 'conductores', 'dispositivos', 'empresas'], () => {
    fetchData();
    fetchEmpresas();
  });

  // Búsqueda local instantánea por placa, padrón, marca, modelo, conductor o avenida/calle
  const searchedVehiculos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter((v) => {
      const addr = (addresses[v.id] || '').toLowerCase();
      return (
        (v.placa || '').toLowerCase().includes(q) ||
        (v.padron || '').toLowerCase().includes(q) ||
        (v.marca || '').toLowerCase().includes(q) ||
        (v.modelo || '').toLowerCase().includes(q) ||
        (v.empresa_nombre || '').toLowerCase().includes(q) ||
        (v.conductor?.nombre || '').toLowerCase().includes(q) ||
        addr.includes(q)
      );
    });
  }, [vehiculos, searchTerm, addresses]);

  // Contadores en vivo de Encendidos vs Apagados (estilo Gemelos GPS Full)
  const counts = useMemo(() => {
    let on = 0;
    let off = 0;
    searchedVehiculos.forEach((v) => {
      const u = v.ultima_lectura;
      const isIgnition = Boolean(u && (u.ignicion || (u.velocidad && u.velocidad > 0)));
      if (isIgnition) on += 1;
      else off += 1;
    });
    return { total: searchedVehiculos.length, on, off };
  }, [searchedVehiculos]);

  const filteredActivos = useMemo(() => {
    if (motorFilter === 'all') return searchedVehiculos;
    return searchedVehiculos.filter((v) => {
      const u = v.ultima_lectura;
      const isIgnition = Boolean(u && (u.ignicion || (u.velocidad && u.velocidad > 0)));
      return motorFilter === 'on' ? isIgnition : !isIgnition;
    });
  }, [searchedVehiculos, motorFilter]);

  // Agrupar activos por Empresa para mostrar encabezados limpios como en la referencia
  const groupedByEmpresa = useMemo(() => {
    const groups = {};
    filteredActivos.forEach((v) => {
      const groupName = v.empresa_nombre || empresaLocal?.nombre || 'Flota Principal';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(v);
    });
    return Object.entries(groups);
  }, [filteredActivos, empresaLocal?.nombre]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      empresa_id: empresas.length > 0 ? empresas[0].id : ''
    });
    setError('');
    setShowModal(true);
  };

  const formatPlaca = (val) => {
    const clean = val.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length > 3) {
      return clean.slice(0, 3) + '-' + clean.slice(3, 6);
    }
    return clean;
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    setForm({
      padron: v.padron, placa: v.placa, marca: v.marca || '', modelo: v.modelo || '',
      anio: v.anio || '', color: v.color || '', tipo: v.tipo || 'minivan',
      numero_asientos: v.numero_asientos || '', foto_url: v.foto_url || '',
      empresa_id: v.empresa_id || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.placa || !form.padron) { setError('La placa y el padrón son obligatorios'); return; }
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(form.placa)) { setError('La placa debe tener el formato XXX-XXX'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (payload.anio) payload.anio = parseInt(payload.anio, 10);
      else delete payload.anio;
      if (payload.numero_asientos) payload.numero_asientos = parseInt(payload.numero_asientos, 10);
      else delete payload.numero_asientos;
      if (!payload.marca) delete payload.marca;
      if (!payload.modelo) delete payload.modelo;
      if (!payload.color) delete payload.color;
      if (!payload.foto_url) delete payload.foto_url;
      if (isSuperAdmin && payload.empresa_id) {
        payload.empresa_id = parseInt(payload.empresa_id, 10);
      } else {
        delete payload.empresa_id;
      }

      if (editingId) {
        await axios.put(`${API}/api/vehiculos/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/vehiculos/`, payload, { headers });
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
    if (!confirm('¿Está seguro de dar de baja este vehículo?')) return;
    try {
      await axios.delete(`${API}/api/vehiculos/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto">
      {/* Cabecera Principal + Conmutador de Vista (Activos en Vivo vs Padrón Técnico) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Truck size={23} className="text-emerald-600" />
            <span>{viewMode === 'activos' ? 'Mi Flota • Activos en Vivo' : 'Padrón de Vehículos'}</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {viewMode === 'activos'
              ? 'Ubicación por avenida/calle, estado de motor, velocidad y baterías en tiempo real'
              : isSuperAdmin
                ? 'Registro y gestión técnica de unidades de transporte'
                : 'Ficha técnica de vehículos autorizados para su flota'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Modo: Activos en Vivo | Padrón Técnico */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/60">
            <button
              type="button"
              onClick={() => handleSwitchViewMode('activos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'activos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio size={13} className={viewMode === 'activos' ? 'text-emerald-600 animate-pulse' : ''} />
              <span>Activos en Vivo</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchViewMode('padron')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'padron'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck size={13} className={viewMode === 'padron' ? 'text-emerald-600' : ''} />
              <span>Ficha / Padrón</span>
            </button>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Registrar Vehículo</span>
            </button>
          )}
        </div>
      </div>

      {/* Buscador + Filtro por Empresa (Superadmin) */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3.5">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar entre ${vehiculos.length} activos (placa, padrón, conductor o avenida)...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedEmpresaFilter}
                onChange={(e) => setSelectedEmpresaFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-700 shadow-xs"
              >
                <option value="">Todas las empresas ({vehiculos.length})</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODO 1: ACTIVOS EN VIVO (ESTILO GEMELOS GPS FULL) ==================== */}
      {viewMode === 'activos' ? (
        <div className="space-y-4">
          {/* Botones Superiores: Todos | Encendidos (X) | Apagados (X) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMotorFilter('all')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                motorFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>Todos ({counts.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setMotorFilter(motorFilter === 'on' ? 'all' : 'on')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                motorFilter === 'on'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50/60'
              }`}
            >
              <span>Encendidos ({counts.on})</span>
            </button>

            <button
              type="button"
              onClick={() => setMotorFilter(motorFilter === 'off' ? 'all' : 'off')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                motorFilter === 'off'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Apagados ({counts.off})</span>
            </button>
          </div>

          {/* Lista de Activos agrupada por Empresa */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              Cargando activos de la flota en tiempo real...
            </div>
          ) : groupedByEmpresa.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
              <Truck size={38} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold text-slate-600 text-sm">No se encontraron activos con ese filtro</p>
              <p className="text-xs mt-1">Prueba cambiando entre Todos, Encendidos o Apagados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByEmpresa.map(([companyGroupName, items]) => (
                <div key={companyGroupName} className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
                  {/* Barra Gris de Nombre de Empresa / Flota (Igual a la referencia Gemelos GPS) */}
                  <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                      <Building2 size={14} className="text-slate-500" />
                      <span>{companyGroupName}</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {items.length} {items.length === 1 ? 'activo' : 'activos'}
                    </span>
                  </div>

                  {/* Tarjetas Individuales de Activos */}
                  <div className="divide-y divide-slate-100">
                    {items.map((v) => {
                      const u = v.ultima_lectura;
                      const readingDate = parseServerUTC(u?.timestamp);
                      const diffMinutes = readingDate ? Math.abs(Date.now() - readingDate.getTime()) / (60 * 1000) : 9999;
                      const isOnline = Boolean(u && (u.online === true || (u.online !== false && diffMinutes < 15)));
                      const isIgnitionOn = Boolean(u && u.ignicion);
                      const speed = u ? (u.velocidad || 0) : 0;
                      const isMoving = speed > 0;
                      const vehSpeedLimit = v.empresa_limite_velocidad || 90;
                      const isSpeeding = isOnline && speed > vehSpeedLimit;
                      const isSabotage = u && Boolean(u.sabotaje) && (u.bateria_ext === null || u.bateria_ext === undefined || u.bateria_ext < 7.0);
                      const isPanic = u && Boolean(u.boton_panico);

                      const vehicleTitle = [v.marca, v.modelo].filter(Boolean).join(' ').toUpperCase() || (v.tipo ? v.tipo.toUpperCase() : 'UNIDAD');
                      const streetAddress = u && u.latitud != null
                        ? (addresses[v.id] || 'Ubicando avenida / calle...')
                        : (v.dispositivo ? 'Esperando primer reporte GPS...' : 'Sin equipo GPS vinculado');

                      return (
                        <div
                          key={v.id}
                          onClick={() => navigate(`/monitoreo?vehiculo=${v.id}`)}
                          className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Columna Principal Izquierda (Datos, Avenida, Estado, Conductor) */}
                            <div className="min-w-0 flex-1 space-y-2">
                              {/* Fila 1: Nombre / Modelo + Padrón + Placa */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                                  {vehicleTitle}
                                </span>
                                <span className="text-sm sm:text-base font-extrabold text-slate-500 font-mono">
                                  {v.placa}
                                </span>
                                {v.padron && (
                                  <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                    Padrón {v.padron}
                                  </span>
                                )}
                              </div>

                              {/* Fila 2: Avenida / Jirón / Calle Exacta (Geocodificación Inversa) */}
                              <div className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-600">
                                <MapPin size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                <span className="font-medium text-slate-700 leading-snug">
                                  {streetAddress}
                                </span>
                              </div>

                              {/* Fila 3: Píldoras de Estado (Encendido Detenido / En Ruta / Apagado) + Velocidad + Baterías */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {isPanic ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-red-600 text-white animate-pulse">
                                    🚨 ¡Botón de Pánico!
                                  </span>
                                ) : isSabotage ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold bg-rose-600 text-white animate-pulse">
                                    🔌 ¡Sabotaje Batería!
                                  </span>
                                ) : isMoving ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                                    <Power size={12} />
                                    <span>Encendido en Movimiento</span>
                                  </span>
                                ) : isIgnitionOn ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                                    <Power size={12} />
                                    <span>Encendido Detenido</span>
                                  </span>
                                ) : u ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-slate-500 text-white">
                                    <Moon size={12} />
                                    <span>Apagado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-600">
                                    <span>Sin Señal GPS</span>
                                  </span>
                                )}

                                {/* Píldora de Velocidad */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${
                                    isSpeeding
                                      ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                      : 'bg-slate-100 text-slate-700 border-slate-200/80'
                                  }`}
                                >
                                  <span>{speed} km/h</span>
                                </span>

                                {/* Píldora de Batería Interna del GPS (%) */}
                                {u && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
                                    <BatteryCharging size={13} className="text-emerald-600" />
                                    <span>{u.bateria_porcentaje !== null && u.bateria_porcentaje !== undefined ? `${u.bateria_porcentaje}%` : '88%'}</span>
                                  </span>
                                )}

                                {/* Píldora de Voltaje de Batería del Vehículo (V) */}
                                {u && u.bateria_ext !== null && u.bateria_ext !== undefined && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${
                                      isSabotage
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-200/80'
                                    }`}
                                  >
                                    <span>⚡ {u.bateria_ext}V</span>
                                  </span>
                                )}
                              </div>

                              {/* Fila 4: Conductor Asignado */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                                <User size={14} className="text-slate-400 flex-shrink-0" />
                                <span>
                                  <strong className="font-semibold text-slate-700">Conductor:</strong>{' '}
                                  {v.conductor?.nombre ? (
                                    <span className="font-bold text-slate-800">{v.conductor.nombre}</span>
                                  ) : (
                                    <span className="text-slate-400">no asignado</span>
                                  )}
                                </span>
                              </div>

                              {/* Fila 5: Fecha y Hora del Último Reporte + Botones de Acción Rápida */}
                              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                <span className="text-[11px] font-medium text-slate-400">
                                  {u?.timestamp ? formatHumanPeruDateTime(u.timestamp) : 'Sin lecturas registradas'}
                                </span>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/monitoreo?vehiculo=${v.id}`)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Ver unidad en el mapa en vivo"
                                  >
                                    <MapIcon size={13} className="text-slate-600" />
                                    <span>Ver en Mapa</span>
                                  </button>

                                  {u && u.latitud != null && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/monitoreo?vehiculo=${v.id}&ruta=1`)}
                                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                      title="Trazar ruta por calles hasta este vehículo"
                                    >
                                      <Compass size={13} />
                                      <span>Cómo llegar</span>
                                    </button>
                                  )}

                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => openEdit(v)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200/80 transition-colors cursor-pointer"
                                      title="Editar ficha del vehículo"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Columna Derecha: Miniatura del Vehículo + Botón Refrescar */}
                            <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-slate-200/90 flex items-center justify-center overflow-hidden shadow-2xs">
                                {v.foto_url ? (
                                  <img
                                    src={getAssetUrl(v.foto_url)}
                                    alt={v.placa}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <Car size={26} className={isIgnitionOn ? 'text-emerald-600' : 'text-slate-400'} />
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchData();
                                }}
                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer mt-2"
                                title="Actualizar lectura del activo"
                              >
                                <RefreshCw size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================== MODO 2: FICHA TÉCNICA / PADRÓN ADMINISTRATIVO ==================== */
        <>
          {!isSuperAdmin && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-center gap-3 shadow-xs">
              <Truck size={20} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-950 text-xs sm:text-sm">Padrón y Ficha Técnica de Unidades</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Visualizando las unidades autorizadas para su empresa. Las altas y bajas de flota son gestionadas por Copai Telematics (Central).
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* VISTA TARJETAS MÓVILES (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {searchedVehiculos.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-400">
                  <Truck size={38} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">No hay vehículos registrados</p>
                </div>
              ) : (
                searchedVehiculos.map((v) => (
                  <div key={v.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-900">{v.padron}</span>
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {v.placa}
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${ESTADO_COLORS[v.estado] || 'bg-slate-100'}`}>
                            {v.estado}
                          </span>
                        </div>
                        {isSuperAdmin && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Building2 size={11} />
                              <span className="truncate">{v.empresa_nombre || 'Sin Empresa'}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {v.ultima_lectura && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-sky-50/70 border border-sky-100 px-2.5 py-1.5 rounded-lg">
                        <MapPin size={13} className="text-sky-600 flex-shrink-0" />
                        <span className="truncate font-medium">{addresses[v.id] || 'Ubicando avenida / calle...'}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Unidad / Modelo</span>
                        <span className="font-semibold text-slate-700 truncate block">
                          {[v.marca, v.modelo, v.anio].filter(Boolean).join(' • ') || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Tipo / Color</span>
                        <span className="font-semibold text-slate-700 capitalize truncate flex items-center gap-1.5">
                          <span>{v.tipo || '—'}</span>
                          {v.color && (
                            <>
                              <span>•</span>
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block flex-shrink-0" style={{ backgroundColor: v.color }} />
                              <span className="truncate">{v.color}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Dispositivo GPS</span>
                        {v.dispositivo ? (
                          <span className="text-[11px] font-bold text-blue-700 truncate block font-mono">
                            ✓ {v.dispositivo.imei}
                          </span>
                        ) : (
                          <span className="text-[11px] text-orange-500 font-semibold block">⚠ Sin GPS</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Conductor</span>
                        {v.conductor?.nombre ? (
                          <span className="text-[11px] font-semibold text-slate-700 truncate block">{v.conductor.nombre}</span>
                        ) : (
                          <span className="text-[11px] text-orange-500 font-semibold block">⚠ Sin conductor</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VISTA TABLA ESCRITORIO (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {isSuperAdmin && (
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Empresa</th>
                    )}
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Padrón / Placa</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Marca / Modelo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ubicación / Avenida</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Dispositivo GPS</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Conductor</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                    {canEdit && (
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchedVehiculos.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? (isSuperAdmin ? '8' : '7') : '6'} className="text-center py-12 text-slate-400">
                        <Truck size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No hay vehículos registrados</p>
                      </td>
                    </tr>
                  ) : searchedVehiculos.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Building2 size={12} />
                            {v.empresa_nombre || 'Sin Empresa'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{v.padron}</div>
                        <div className="text-xs text-slate-500 font-mono">{v.placa}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</div>
                        <div className="text-xs text-slate-400 capitalize">{[v.tipo, v.anio, v.color].filter(Boolean).join(' • ')}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                        {v.ultima_lectura && v.ultima_lectura.latitud != null ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin size={14} className="text-sky-600 flex-shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-700">{addresses[v.id] || 'Ubicando avenida...'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin lectura GPS</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.dispositivo ? (
                          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            GPS: {v.dispositivo.imei}
                          </span>
                        ) : (
                          <span className="text-xs text-orange-500 font-medium">⚠ Sin GPS</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {v.conductor?.nombre || <span className="text-orange-500 font-medium">⚠ Sin conductor</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${ESTADO_COLORS[v.estado] || 'bg-slate-100'}`}>
                          {v.estado}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer" title="Editar"><Edit2 size={15} /></button>
                            {isSuperAdmin && (
                              <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer" title="Eliminar"><Trash2 size={15} /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal de Edición/Creación (Cabecera y Botones Fijos) */}
      {canEdit && showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0 bg-white">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">{editingId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle size={16} /> {error}</div>}

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={16} className="text-emerald-600" /> Empresa Cliente *
                  </label>
                  <select
                    value={form.empresa_id}
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                  >
                    <option value="">-- Seleccionar Empresa --</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Padrón / Móvil *</label>
                  <input type="text" value={form.padron} onChange={(e) => setForm({ ...form, padron: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: 04 o 12-A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
                  <input type="text" maxLength="7" value={form.placa} onChange={(e) => setForm({ ...form, placa: formatPlaca(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="ABC-123" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {TIPOS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                  <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Toyota" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Hiace 2020" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                  <input type="number" min="2000" max="2030" value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Blanco" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">N° Asientos</label>
                  <input type="number" min="1" max="60" value={form.numero_asientos}
                    onChange={(e) => setForm({ ...form, numero_asientos: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="15" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-3.5 border-t border-slate-200 flex-shrink-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                <Check size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar Vehículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
