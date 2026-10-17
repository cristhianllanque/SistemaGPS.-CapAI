import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, Car, Shield, Phone, Mail, Plus, Search, Edit2, Trash2, Key, 
  Check, X, AlertTriangle, ExternalLink, Battery, Radio, Gauge, MapPin,
  Sparkles, CheckCircle2, UserCheck, ShieldCheck, RefreshCw
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const TIPOS_VEHICULO = [
  { value: 'sedan', label: 'Auto Sedán / Particular' },
  { value: 'camioneta', label: 'Camioneta / SUV' },
  { value: 'minivan', label: 'Minivan / Familiar' },
  { value: 'otro', label: 'Moto / Otro Vehículo' },
];

const emptyForm = {
  nombre: '',
  documento: '',
  telefono: '',
  email: '',
  password: '',
  limite_velocidad: 90,
  placa: '',
  marca: '',
  modelo: '',
  color: '',
  tipo_vehiculo: 'sedan',
  anio: new Date().getFullYear(),
  dispositivo_id: '',
  imei: ''
};

export default function ParticularesPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [dispositivosDisp, setDispositivosDisp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPart, resDisp] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/particulares/`, { headers }),
        axios.get(`${API_BASE_URL}/api/dispositivos/`, { headers })
      ]);
      setClientes(resPart.data);
      // Filtrar dispositivos disponibles para asignación rápida
      setDispositivosDisp(resDisp.data.filter(d => d.estado === 'disponible'));
    } catch (err) {
      console.error("Error al cargar clientes particulares", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        nombre: form.nombre.trim(),
        documento: form.documento.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        limite_velocidad: parseInt(form.limite_velocidad) || 90,
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim() || null,
        modelo: form.modelo.trim() || null,
        color: form.color.trim() || null,
        tipo_vehiculo: form.tipo_vehiculo,
        anio: form.anio ? parseInt(form.anio) : null,
        dispositivo_id: form.dispositivo_id ? parseInt(form.dispositivo_id) : null,
        imei: form.imei.trim() || null
      };

      const res = await axios.post(`${API_BASE_URL}/api/particulares/`, payload, { headers });
      setSuccessData({
        ...res.data,
        password: form.password
      });
      setForm({ ...emptyForm });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Error al registrar cliente particular");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de dar de baja al cliente particular ${nombre}? El GPS quedará liberado para otro vehículo.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/particulares/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al dar de baja al cliente");
    }
  };

  const filteredClientes = clientes.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchNombre = c.nombre?.toLowerCase().includes(q);
    const matchPlaca = c.vehiculo?.placa?.toLowerCase().includes(q);
    const matchDni = c.documento?.toLowerCase().includes(q);
    const matchImei = c.dispositivo?.imei?.toLowerCase().includes(q);
    return matchNombre || matchPlaca || matchDni || matchImei;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Car className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Clientes Particulares</h1>
              <p className="text-sm text-slate-500">Gestión de autos individuales, camionetas y personas naturales con rastreo GPS</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setShowCreateModal(true); setSuccessData(null); setError(''); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente Particular
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Particulares</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{clientes.length}</p>
            <p className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" /> Clientes Activos
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehículos Monitoreados</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {clientes.filter(c => c.vehiculo && c.vehiculo.placa !== 'Sin asignar').length}
            </p>
            <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
              <Car className="w-3.5 h-3.5" /> Autos y camionetas
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GPS Teltonika Vinculados</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {clientes.filter(c => c.dispositivo).length}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" /> Enlazados al servidor
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, DNI, placa vehicular o IMEI de GPS..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center"
          title="Actualizar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando clientes particulares...</div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No se encontraron clientes particulares</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Registra tu primer cliente particular con vehículo individual para permitirle acceso a su cuenta de rastreo.
          </p>
          <button
            onClick={() => { setShowCreateModal(true); setSuccessData(null); }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente Particular
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClientes.map((c) => (
            <div 
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/50 to-white flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{c.nombre}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {c.documento && <span>DNI: <strong className="text-slate-700">{c.documento}</strong></span>}
                      {c.documento && c.telefono && <span>•</span>}
                      {c.telefono && <span>Tel: {c.telefono}</span>}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full">
                  Particular
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 space-y-4">
                {/* Vehicle details box */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-teal-600" /> Vehículo
                    </span>
                    {c.vehiculo?.placa && (
                      <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded border border-slate-700 tracking-wider shadow-xs">
                        {c.vehiculo.placa}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-800">
                    {c.vehiculo?.marca || 'Vehículo'} {c.vehiculo?.modelo || ''}
                    {c.vehiculo?.color && <span className="text-xs font-normal text-slate-500 ml-1">({c.vehiculo.color})</span>}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                    <span>Tipo: <strong className="text-slate-700 capitalize">{c.vehiculo?.tipo || 'Sedán'}</strong></span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-500" />
                      Límite: <strong className="text-slate-700">{c.limite_velocidad} km/h</strong>
                    </span>
                  </div>
                </div>

                {/* GPS Device details box */}
                <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {c.dispositivo ? `GPS: ${c.dispositivo.modelo || 'FMC130'}` : 'Sin GPS vinculado'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {c.dispositivo ? `IMEI: ${c.dispositivo.imei}` : 'Pendiente de asignación'}
                      </p>
                    </div>
                  </div>

                  {c.dispositivo ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="GPS Asignado"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" title="Sin GPS"></span>
                  )}
                </div>

                {/* Account credentials info */}
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{c.email || 'Sin correo asignado'}</span>
                </div>
              </div>

              {/* Card Footer / Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/monitoreo`)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Rastrear
                </button>

                <button
                  onClick={() => navigate(`/historial-rutas`)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Historial
                </button>

                <button
                  onClick={() => handleDelete(c.id, c.nombre)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 p-1"
                  title="Dar de baja"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo Cliente Particular */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Registrar Cliente Particular</h2>
                  <p className="text-xs text-slate-500">Alta de propietario, auto y asignación de GPS en 1 solo paso</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success State Screen */}
            {successData ? (
              <div className="py-6 space-y-5 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">¡Cliente Particular Registrado!</h3>
                  <p className="text-sm text-slate-500 mt-1">El vehículo ya está listo para transmitir y el cliente tiene su cuenta activa.</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Credenciales de Acceso para el Cliente:</p>
                  <div className="text-sm">
                    <span className="text-slate-500">Plataforma Web:</span> <strong>industriascopai.com</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Usuario / Correo:</span> <strong className="text-teal-700">{successData.email}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Contraseña:</span> <strong className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{successData.password}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Vehículo:</span> <strong className="text-slate-800">{successData.vehiculo?.placa}</strong> ({successData.vehiculo?.marca || ''})
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all shadow-sm"
                >
                  Aceptar y Volver al Listado
                </button>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateSubmit} className="space-y-5 mt-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Section 1: Cliente / Propietario */}
                <div>
                  <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <User className="w-3.5 h-3.5" /> 1. Datos del Cliente / Propietario
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        placeholder="Ej: Juan Carlos Pérez Gómez"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">DNI / RUC</label>
                      <input
                        type="text"
                        value={form.documento}
                        onChange={(e) => setForm({ ...form, documento: e.target.value })}
                        placeholder="Ej: 74859612"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        placeholder="Ej: 951234567"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Correo de Acceso *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="juan.perez@gmail.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña de Acceso *</label>
                      <input
                        type="password"
                        required
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehículo */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Car className="w-3.5 h-3.5" /> 2. Datos del Vehículo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Placa Vehicular *</label>
                      <input
                        type="text"
                        required
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        placeholder="V5B-123"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Marca</label>
                      <input
                        type="text"
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        placeholder="Toyota, Kia, Hyundai..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo</label>
                      <input
                        type="text"
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        placeholder="Yaris, Cerato, Hilux..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Color</label>
                      <input
                        type="text"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        placeholder="Negro, Plata, Blanco..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Vehículo</label>
                      <select
                        value={form.tipo_vehiculo}
                        onChange={(e) => setForm({ ...form, tipo_vehiculo: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        {TIPOS_VEHICULO.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Límite Velocidad (km/h)</label>
                      <input
                        type="number"
                        value={form.limite_velocidad}
                        onChange={(e) => setForm({ ...form, limite_velocidad: e.target.value })}
                        min="40"
                        max="180"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: GPS Teltonika */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Radio className="w-3.5 h-3.5" /> 3. Asignación de GPS Teltonika
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">GPS Disponible en Almacén</label>
                      <select
                        value={form.dispositivo_id}
                        onChange={(e) => setForm({ ...form, dispositivo_id: e.target.value, imei: '' })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="">-- Seleccionar de la lista --</option>
                        {dispositivosDisp.map(d => (
                          <option key={d.id} value={d.id}>
                            IMEI: {d.imei} ({d.modelo} - {d.operador_sim || 'SIM'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">O Escribir IMEI Directamente</label>
                      <input
                        type="text"
                        value={form.imei}
                        onChange={(e) => setForm({ ...form, imei: e.target.value, dispositivo_id: '' })}
                        placeholder="Ej: 865124071781266"
                        maxLength="15"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? 'Registrando...' : 'Registrar y Activar Rastreo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
