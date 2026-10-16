import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, Plus, Edit3, Users, Truck, Radio, Search, Check, X, 
  ExternalLink, ShieldCheck, Mail, Key, Sparkles, RefreshCw, UploadCloud, Gauge, Image as ImageIcon
} from 'lucide-react';

const API = 'http://localhost:8000';

const COLOR_PRESETS = [
  { name: 'Azul Real', hex: '#1E40AF' },
  { name: 'Índigo Copay', hex: '#4F46E5' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Ámbar Transporte', hex: '#D97706' },
  { name: 'Rojo Carmesí', hex: '#DC2626' },
  { name: 'Púrpura Imperial', hex: '#7C3AED' },
  { name: 'Pizarra Oscura', hex: '#334155' },
  { name: 'Cian Nórdico', hex: '#0891B2' },
];

export default function CompaniesPage() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGerenteModal, setShowGerenteModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    nombre: '',
    slug: '',
    logo_url: '',
    color_primario: '#1E40AF',
    limite_velocidad: 90,
    gerente_nombre: '',
    gerente_email: '',
    gerente_password: ''
  });

  const [editForm, setEditForm] = useState({
    nombre: '',
    logo_url: '',
    color_primario: '#1E40AF',
    limite_velocidad: 90,
    activo: true
  });

  const [gerenteForm, setGerenteForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'admin'
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/empresas/`, { headers });
      setEmpresas(res.data);
    } catch (err) {
      console.error("Error al cargar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Open Edit Modal
  const openEdit = (emp) => {
    setSelectedEmpresa(emp);
    setEditForm({
      nombre: emp.nombre,
      logo_url: emp.logo_url || '',
      color_primario: emp.color_primario || '#1E40AF',
      limite_velocidad: emp.limite_velocidad || 90,
      activo: emp.activo
    });
    setErrorMsg('');
    setShowEditModal(true);
  };

  // Upload Logo file directly from desktop/computer (PNG only)
  const handleLogoUpload = async (e, formType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
      setErrorMsg('Formato de imagen inválido: Solo se permiten archivos PNG (.png).');
      return;
    }

    try {
      setUploadingLogo(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API}/api/empresas/upload-logo`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (formType === 'create') {
        setCreateForm(prev => ({ ...prev, logo_url: res.data.logo_url }));
      } else {
        setEditForm(prev => ({ ...prev, logo_url: res.data.logo_url }));
      }
      showToast('Logotipo PNG cargado exitosamente.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al subir el logotipo PNG');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Open Quick Gerente Modal
  const openAddGerente = (emp) => {
    setSelectedEmpresa(emp);
    setGerenteForm({
      nombre: '',
      email: '',
      password: '',
      rol: 'admin'
    });
    setErrorMsg('');
    setShowGerenteModal(true);
  };

  // Submit New Empresa
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nombre.trim()) {
      setErrorMsg('El nombre de la empresa es obligatorio');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await axios.post(`${API}/api/empresas/`, createForm, { headers });
      showToast(`Empresa "${res.data.nombre}" creada con éxito.`);
      setShowCreateModal(false);
      setCreateForm({
        nombre: '',
        slug: '',
        logo_url: '',
        color_primario: '#1E40AF',
        limite_velocidad: 90,
        gerente_nombre: '',
        gerente_email: '',
        gerente_password: ''
      });
      fetchEmpresas();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear la empresa');
    } finally {
      setSaving(false);
    }
  };

  // Submit Edit Empresa
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpresa) return;
    try {
      setSaving(true);
      setErrorMsg('');
      await axios.put(`${API}/api/empresas/${selectedEmpresa.id}`, editForm, { headers });
      showToast(`Empresa "${editForm.nombre}" actualizada correctamente.`);
      setShowEditModal(false);
      fetchEmpresas();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al actualizar la empresa');
    } finally {
      setSaving(false);
    }
  };

  // Submit New Gerente for existing Empresa
  const handleGerenteSubmit = async (e) => {
    e.preventDefault();
    if (!gerenteForm.nombre || !gerenteForm.email || !gerenteForm.password) {
      setErrorMsg('Todos los campos son obligatorios');
      return;
    }
    try {
      setSaving(true);
      setErrorMsg('');
      await axios.post(`${API}/api/usuarios/`, {
        ...gerenteForm,
        empresa_id: selectedEmpresa.id
      }, { headers });
      showToast(`Gerente creado con éxito para ${selectedEmpresa.nombre}.`);
      setShowGerenteModal(false);
      fetchEmpresas();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al crear el gerente');
    } finally {
      setSaving(false);
    }
  };

  const filtered = empresas.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom">
          <Check size={20} className="bg-white/20 p-0.5 rounded-full" />
          <span className="font-medium text-sm">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="text-indigo-600" size={28} />
            Gestión Multi-Empresa Copay
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra las empresas clientes, personaliza su identidad corporativa y aprovisiona sus cuentas de gerencia.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowCreateModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 text-sm"
        >
          <Plus size={18} />
          Nueva Empresa Cliente
        </button>
      </div>

      {/* Search and Overview Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Buscar por nombre o identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
            {empresas.length}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Empresas Clientes</p>
            <p className="text-sm font-bold text-slate-800">Registradas</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            {empresas.reduce((acc, curr) => acc + (curr.total_vehiculos || 0), 0)}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Vehículos Totales</p>
            <p className="text-sm font-bold text-slate-800">En Plataforma</p>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-indigo-500" />
          <p className="text-sm">Cargando empresas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700">No se encontraron empresas</h3>
          <p className="text-sm text-slate-400 mt-1">Crea una nueva empresa cliente para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(emp => {
            const primaryColor = emp.color_primario || '#1E40AF';
            return (
              <div 
                key={emp.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group relative"
              >
                {/* Color Banner */}
                <div 
                  className="h-2 w-full transition-all" 
                  style={{ backgroundColor: primaryColor }}
                />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Top: Logo & Name */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {emp.logo_url ? (
                        <img 
                          src={emp.logo_url} 
                          alt={emp.nombre} 
                          className="w-12 h-12 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {emp.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h2 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {emp.nombre}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {emp.slug}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openEdit(emp)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar Empresa"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>

                  {/* Brand Color Tag */}
                  <div className="flex items-center gap-2 mb-5">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" 
                      style={{ backgroundColor: primaryColor }} 
                    />
                    <span className="text-xs text-slate-500 font-mono">
                      Color Marca: {primaryColor}
                    </span>
                    <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${emp.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {emp.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-1.5 py-3 border-y border-slate-100 mb-4 bg-slate-50/50 rounded-xl px-2">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Flota</p>
                      <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Truck size={13} className="text-slate-500" />
                        {emp.total_vehiculos || 0}
                      </p>
                    </div>
                    <div className="text-center border-l border-slate-200/60">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">GPS</p>
                      <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Radio size={13} className="text-slate-500" />
                        {emp.total_dispositivos || 0}
                      </p>
                    </div>
                    <div className="text-center border-l border-slate-200/60">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Usuarios</p>
                      <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Users size={13} className="text-slate-500" />
                        {emp.total_usuarios || 0}
                      </p>
                    </div>
                    <div className="text-center border-l border-slate-200/60">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Límite</p>
                      <p className="text-sm font-bold text-amber-700 flex items-center justify-center gap-0.5 mt-0.5" title="Límite de velocidad configurado">
                        <Gauge size={13} className="text-amber-600" />
                        {emp.limite_velocidad || 90}k
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Quick Actions */}
                  <div className="mt-auto pt-2 flex gap-2">
                    <button
                      onClick={() => openAddGerente(emp)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 font-medium py-2 px-3 rounded-lg text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <Users size={14} />
                      + Crear Gerente
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: NUEVA EMPRESA ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Registrar Nueva Empresa Cliente</h2>
                  <p className="text-xs text-indigo-100">Crea el espacio multi-tenant corporativo y su usuario gerente</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Identidad Corporativa</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Transportes San Martín S.A.C."
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Logotipo Oficial de la Empresa</span>
                    <span className="text-[11px] text-indigo-600 font-normal">Formato obligatorio: PNG</span>
                  </label>
                  
                  {createForm.logo_url ? (
                    <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="w-14 h-14 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shadow-sm">
                        <img 
                          src={createForm.logo_url} 
                          alt="Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">Logotipo PNG cargado</p>
                        <p className="text-[11px] text-emerald-600 font-medium">✓ Listo para identidad visual</p>
                      </div>
                      <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors">
                        Cambiar PNG
                        <input 
                          type="file" 
                          accept=".png,image/png" 
                          className="hidden" 
                          onChange={(e) => handleLogoUpload(e, 'create')}
                          disabled={uploadingLogo}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, logo_url: '' })}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                        title="Quitar logotipo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30 rounded-xl cursor-pointer transition-all group">
                      <div className="p-2.5 bg-white rounded-full shadow-sm text-indigo-600 group-hover:scale-110 transition-transform mb-2">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">
                        {uploadingLogo ? 'Subiendo imagen PNG...' : 'Subir logotipo PNG desde su computadora'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Seleccione un archivo .png desde su escritorio o carpeta
                      </p>
                      <input 
                        type="file" 
                        accept=".png,image/png" 
                        className="hidden" 
                        onChange={(e) => handleLogoUpload(e, 'create')}
                        disabled={uploadingLogo}
                      />
                    </label>
                  )}
                </div>

                {/* Speed Limit Setting */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Gauge size={14} className="text-amber-600" />
                      Límite de Velocidad Máxima
                    </label>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {createForm.limite_velocidad || 90} km/h
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Si una unidad supera esta velocidad, se emitirá una alerta inmediata al Superadmin y a la Empresa.
                  </p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="30" 
                      max="140" 
                      step="5"
                      value={createForm.limite_velocidad || 90}
                      onChange={(e) => setCreateForm({ ...createForm, limite_velocidad: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <input 
                      type="number" 
                      min="20" 
                      max="160"
                      value={createForm.limite_velocidad || 90}
                      onChange={(e) => setCreateForm({ ...createForm, limite_velocidad: parseInt(e.target.value, 10) || 90 })}
                      className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[60, 80, 90, 100, 110].map(speed => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, limite_velocidad: speed })}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${createForm.limite_velocidad === speed ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {speed} km/h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color Corporativo Primario</label>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        type="button"
                        key={preset.hex}
                        onClick={() => setCreateForm({ ...createForm, color_primario: preset.hex })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${createForm.color_primario === preset.hex ? 'scale-110 border-indigo-600 shadow-md' : 'border-white'}`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={createForm.color_primario}
                      onChange={(e) => setCreateForm({ ...createForm, color_primario: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={createForm.color_primario}
                      onChange={(e) => setCreateForm({ ...createForm, color_primario: e.target.value })}
                      className="w-32 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Gerente User Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Usuario Gerente Inicial (Acceso)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={createForm.gerente_nombre}
                      onChange={(e) => setCreateForm({ ...createForm, gerente_nombre: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico Real</label>
                    <input
                      type="email"
                      placeholder="gerencia@transporte.com"
                      value={createForm.gerente_email}
                      onChange={(e) => setCreateForm({ ...createForm, gerente_email: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={createForm.gerente_password}
                    onChange={(e) => setCreateForm({ ...createForm, gerente_password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    El gerente podrá ingresar inmediatamente con estas credenciales y ver solo su flota.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  {saving ? 'Registrando...' : 'Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR EMPRESA ================= */}
      {showEditModal && selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-600" />
                Editar Empresa: {selectedEmpresa.nombre}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Logotipo Oficial de la Empresa</span>
                  <span className="text-[11px] text-indigo-600 font-normal">Formato obligatorio: PNG</span>
                </label>
                
                {editForm.logo_url ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shadow-sm">
                      <img 
                        src={editForm.logo_url} 
                        alt="Logo" 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">Logotipo PNG cargado</p>
                      <p className="text-[11px] text-emerald-600 font-medium">✓ Logotipo activo</p>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors">
                      Cambiar PNG
                      <input 
                        type="file" 
                        accept=".png,image/png" 
                        className="hidden" 
                        onChange={(e) => handleLogoUpload(e, 'edit')}
                        disabled={uploadingLogo}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, logo_url: '' })}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Quitar logotipo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30 rounded-xl cursor-pointer transition-all group">
                    <div className="p-2.5 bg-white rounded-full shadow-sm text-indigo-600 group-hover:scale-110 transition-transform mb-2">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">
                      {uploadingLogo ? 'Subiendo imagen PNG...' : 'Subir logotipo PNG desde su computadora'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Seleccione un archivo .png desde su escritorio o carpeta
                    </p>
                    <input 
                      type="file" 
                      accept=".png,image/png" 
                      className="hidden" 
                      onChange={(e) => handleLogoUpload(e, 'edit')}
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
              </div>

              {/* Speed Limit in Edit Modal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Gauge size={14} className="text-amber-600" />
                    Límite de Velocidad Máxima
                  </label>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {editForm.limite_velocidad || 90} km/h
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="30" 
                    max="140" 
                    step="5"
                    value={editForm.limite_velocidad || 90}
                    onChange={(e) => setEditForm({ ...editForm, limite_velocidad: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="20" 
                    max="160"
                    value={editForm.limite_velocidad || 90}
                    onChange={(e) => setEditForm({ ...editForm, limite_velocidad: parseInt(e.target.value, 10) || 90 })}
                    className="w-16 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[60, 80, 90, 100, 110].map(speed => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, limite_velocidad: speed })}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${editForm.limite_velocidad === speed ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {speed} km/h
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color Corporativo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editForm.color_primario}
                    onChange={(e) => setEditForm({ ...editForm, color_primario: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={editForm.color_primario}
                    onChange={(e) => setEditForm({ ...editForm, color_primario: e.target.value })}
                    className="w-32 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.activo}
                    onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Empresa activa en la plataforma</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  {saving ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVO GERENTE PARA EMPRESA ================= */}
      {showGerenteModal && selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-800">Crear Gerente / Usuario</h2>
                <p className="text-xs text-slate-400">Para: {selectedEmpresa.nombre}</p>
              </div>
              <button onClick={() => setShowGerenteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGerenteSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={gerenteForm.nombre}
                  onChange={(e) => setGerenteForm({ ...gerenteForm, nombre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico Real</label>
                <input
                  type="email"
                  required
                  placeholder="gerente@empresa.com"
                  value={gerenteForm.email}
                  onChange={(e) => setGerenteForm({ ...gerenteForm, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={gerenteForm.password}
                  onChange={(e) => setGerenteForm({ ...gerenteForm, password: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rol de Acceso</label>
                <select
                  value={gerenteForm.rol}
                  onChange={(e) => setGerenteForm({ ...gerenteForm, rol: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="admin">Gerente / Administrador (Ve dashboard, reportes y mapa)</option>
                  <option value="operador">Operador (Solo monitoreo de mapas y alertas)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGerenteModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  {saving ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
