import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, Plus, Edit3, Users, Truck, Radio, Search, Check, X, 
  ExternalLink, ShieldCheck, Mail, Key, Sparkles, RefreshCw, UploadCloud, Gauge, Image as ImageIcon,
  Phone, FileText, Globe, Palette
} from 'lucide-react';

import { API_BASE_URL as API, getAssetUrl } from '../config';

const COLOR_PALETTE_PRESETS = [
  { name: 'Huayna Verde & Blanco', primario: '#16A34A', secundario: '#FFFFFF', terciario: '#CCF5DC' },
  { name: 'CopAI Azul & Blanco', primario: '#1E40AF', secundario: '#FFFFFF', terciario: '#E0F2FE' },
  { name: 'Transporte Oro & Blanco', primario: '#D97706', secundario: '#FFFFFF', terciario: '#FEF3C7' },
  { name: 'Nazareth Esmeralda & Plata', primario: '#059669', secundario: '#FFFFFF', terciario: '#D1FAE5' },
  { name: 'Rojo Carmesí & Blanco', primario: '#DC2626', secundario: '#FFFFFF', terciario: '#FEE2E2' },
  { name: 'Púrpura & Blanco', primario: '#7C3AED', secundario: '#FFFFFF', terciario: '#F3E8FF' },
  { name: 'Cian & Marino', primario: '#0891B2', secundario: '#FFFFFF', terciario: '#CFFAFE' },
  { name: 'Pizarra Grafito & Blanco', primario: '#334155', secundario: '#FFFFFF', terciario: '#F1F5F9' },
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

  // Helper para generar slug en tiempo real
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  // Forms
  const [createForm, setCreateForm] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    slug: '',
    slogan: '',
    banner_url: '',
    servicios: '',
    logo_url: '',
    color_primario: '#16A34A',
    color_secundario: '#FFFFFF',
    color_terciario: '#14532D',
    limite_velocidad: 90,
    gerente_nombre: '',
    gerente_email: '',
    gerente_password: ''
  });

  const [editForm, setEditForm] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    slug: '',
    slogan: '',
    banner_url: '',
    servicios: '',
    logo_url: '',
    color_primario: '#16A34A',
    color_secundario: '#FFFFFF',
    color_terciario: '#14532D',
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
  const [uploadingBanner, setUploadingBanner] = useState(false);
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
      documento: emp.documento || '',
      telefono: emp.telefono || '',
      slug: emp.slug || '',
      slogan: emp.slogan || '',
      banner_url: emp.banner_url || '',
      servicios: emp.servicios || '',
      logo_url: emp.logo_url || '',
      color_primario: emp.color_primario || '#16A34A',
      color_secundario: emp.color_secundario || '#FFFFFF',
      color_terciario: emp.color_terciario || '#14532D',
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

  // Upload Banner / Foto de Portada (PNG, JPG, WEBP)
  const handleBannerUpload = async (e, formType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const filename = file.name.toLowerCase();
    if (!allowed.some(ext => filename.endsWith(ext))) {
      setErrorMsg('Formato inválido: Se admiten imágenes PNG, JPG o WEBP.');
      return;
    }

    try {
      setUploadingBanner(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API}/api/empresas/upload-banner`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (formType === 'create') {
        setCreateForm(prev => ({ ...prev, banner_url: res.data.banner_url }));
      } else {
        setEditForm(prev => ({ ...prev, banner_url: res.data.banner_url }));
      }
      showToast('Foto panorámica de flota cargada con éxito.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error al subir el banner de la flota');
    } finally {
      setUploadingBanner(false);
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
        documento: '',
        telefono: '',
        slug: '',
        slogan: '',
        banner_url: '',
        servicios: '',
        logo_url: '',
        color_primario: '#16A34A',
        color_secundario: '#FFFFFF',
        color_terciario: '#14532D',
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
    e.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.documento && e.documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.telefono && e.telefono.toLowerCase().includes(searchTerm.toLowerCase()))
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
            Gestión Multi-Empresa Copai
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
            const primaryColor = emp.color_primario || '#16A34A';
            const secondaryColor = emp.color_secundario || '#FFFFFF';
            const tertiaryColor = emp.color_terciario || primaryColor;
            return (
              <div 
                key={emp.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group relative"
              >
                {/* Color Banner Tricolor */}
                <div 
                  className="h-2.5 w-full transition-all" 
                  style={{ 
                    background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${tertiaryColor} 100%)` 
                  }}
                />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Top: Logo & Name */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {emp.logo_url ? (
                        <img 
                          src={getAssetUrl(emp.logo_url)} 
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
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {emp.documento && (
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                              RUC: {emp.documento}
                            </span>
                          )}
                          {emp.telefono && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Phone size={11} className="text-slate-400" /> {emp.telefono}
                            </span>
                          )}
                        </div>

                        {/* Subdomain Badge */}
                        <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-mono mt-1 bg-indigo-50/70 border border-indigo-200/60 px-2 py-0.5 rounded-md w-fit">
                          <Globe size={11} className="text-indigo-600 shrink-0" />
                          <span>{emp.slug}.industriascopai.com</span>
                        </div>
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

                  {/* Slogan Preview */}
                  {emp.slogan && (
                    <p className="text-xs text-slate-500 italic line-clamp-1 mb-3">
                      "{emp.slogan}"
                    </p>
                  )}

                  {/* Brand Color Tag Tricolor */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" 
                      style={{ backgroundColor: primaryColor }} 
                      title="Color Primario"
                    />
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-sm" 
                      style={{ backgroundColor: secondaryColor }} 
                      title="Color Secundario"
                    />
                    {emp.color_terciario && (
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" 
                        style={{ backgroundColor: emp.color_terciario }} 
                        title="Color Terciario"
                      />
                    )}
                    <span className="text-xs text-slate-500 font-mono ml-1">
                      Paleta de Marca
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
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 font-medium py-2 px-2.5 rounded-lg text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <Users size={14} />
                      + Gerente
                    </button>
                    <a
                      href={`/?empresa=${emp.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-3 rounded-lg text-xs transition-colors border border-indigo-200 flex items-center justify-center gap-1 shadow-sm"
                      title="Ver portal público de la empresa"
                    >
                      <ExternalLink size={13} />
                      Portal Web ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: NUEVA EMPRESA (LAYOUT 2 COLUMNAS) ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in zoom-in-95">
            
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Registrar Nueva Empresa Cliente</h2>
                  <p className="text-xs text-indigo-100">Configura la identidad corporativa, colores de marca y portal exclusivo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* GRID 2 COLUMNAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUMNA IZQUIERDA: DATOS, SLUG, RUTAS Y PALETA DE 3 COLORES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <FileText size={14} className="text-indigo-600" />
                    1. Datos de Empresa & Portal Web
                  </h3>

                  {/* Nombre & Subdominio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre o Razón Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Transportes Huaynarroque S.A.C."
                      value={createForm.nombre}
                      onChange={(e) => {
                        const newNombre = e.target.value;
                        setCreateForm(prev => ({
                          ...prev,
                          nombre: newNombre,
                          slug: !prev.slug || prev.slug === generateSlug(prev.nombre) ? generateSlug(newNombre) : prev.slug
                        }));
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe size={13} className="text-indigo-600" />
                        Subdominio Web Exclusivo *
                      </span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="huaynarroque"
                        value={createForm.slug}
                        onChange={(e) => setCreateForm({ ...createForm, slug: generateSlug(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-l-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="px-2.5 py-2.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-xs font-mono text-slate-500 whitespace-nowrap">
                        .industriascopai.com
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">RUC (11 dígitos)</label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="Ej. 20601234567"
                        value={createForm.documento}
                        onChange={(e) => setCreateForm({ ...createForm, documento: e.target.value.replace(/\D/g, '') })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / Central</label>
                      <input
                        type="text"
                        placeholder="Ej. (051) 328-940"
                        value={createForm.telefono}
                        onChange={(e) => setCreateForm({ ...createForm, telefono: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slogan o Frase de Presentación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Líderes en transporte seguro y puntual 24/7"
                      value={createForm.slogan}
                      onChange={(e) => setCreateForm({ ...createForm, slogan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rutas y Servicios Ofrecidos
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Rutas Juliaca - Puno - Arequipa | Encomiendas express y turismo"
                      value={createForm.servicios}
                      onChange={(e) => setCreateForm({ ...createForm, servicios: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  {/* PALETA DE 3 COLORES */}
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 mb-3">
                      <Palette size={14} className="text-indigo-600" />
                      2. Paleta Corporativa de 3 Colores
                    </h3>

                    {/* Presets de Combinaciones */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {COLOR_PALETTE_PRESETS.map(p => (
                        <button
                          type="button"
                          key={p.name}
                          onClick={() => setCreateForm(prev => ({
                            ...prev,
                            color_primario: p.primario,
                            color_secundario: p.secundario,
                            color_terciario: p.terciario
                          }))}
                          className="flex items-center gap-1.5 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-left transition-all text-[11px]"
                          title={p.name}
                        >
                          <div className="flex -space-x-1">
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.primario }} />
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.secundario }} />
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.terciario }} />
                          </div>
                          <span className="truncate font-medium text-slate-700 text-[10px]">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>

                    {/* 3 Selectores de Color Manuales */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">1. Primario *</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={createForm.color_primario}
                            onChange={(e) => setCreateForm({ ...createForm, color_primario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={createForm.color_primario}
                            onChange={(e) => setCreateForm({ ...createForm, color_primario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">2. Secundario *</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={createForm.color_secundario || '#FFFFFF'}
                            onChange={(e) => setCreateForm({ ...createForm, color_secundario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={createForm.color_secundario || '#FFFFFF'}
                            onChange={(e) => setCreateForm({ ...createForm, color_secundario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          3. Fondo / Acento
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={createForm.color_terciario || '#CCF5DC'}
                            onChange={(e) => setCreateForm({ ...createForm, color_terciario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={createForm.color_terciario || ''}
                            placeholder="#CCF5DC"
                            onChange={(e) => setCreateForm({ ...createForm, color_terciario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Previsualización de los 3 Colores */}
                    <div 
                      className="mt-3 p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${createForm.color_terciario || '#CCF5DC'} 0%, #FFFFFF 100%)`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: createForm.color_primario }} />
                        <span className="text-xs font-bold text-slate-900">
                          Fondo del Portal
                        </span>
                      </div>
                      <div 
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 border"
                        style={{
                          backgroundColor: createForm.color_primario,
                          color: createForm.color_secundario || '#FFFFFF',
                          borderColor: `${createForm.color_secundario || '#FFFFFF'}40`
                        }}
                      >
                        <span>Botón Portal Web →</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: LOGOTIPO, FOTO FLOTA, LÍMITE VELOCIDAD Y GERENTE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <ImageIcon size={14} className="text-indigo-600" />
                    3. Identidad Visual & Multimedia
                  </h3>

                  {/* Logotipo Oficial PNG */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Logotipo Oficial de la Empresa</span>
                      <span className="text-[11px] text-indigo-600 font-normal">Obligatorio: PNG</span>
                    </label>
                    
                    {createForm.logo_url ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shadow-sm">
                          <img 
                            src={getAssetUrl(createForm.logo_url)} 
                            alt="Logo" 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">Logotipo PNG cargado</p>
                          <p className="text-[11px] text-emerald-600 font-medium">✓ Listo para portal</p>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg">
                          Cambiar
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
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 rounded-xl cursor-pointer transition-all">
                        <UploadCloud size={20} className="text-indigo-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Subir logotipo PNG</p>
                        <p className="text-[10px] text-slate-400">Seleccione archivo .png</p>
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

                  {/* Banner / Foto de la Flota */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Foto de Portada / Flota para el Portal Web</span>
                      <span className="text-[11px] text-slate-400 font-normal">PNG, JPG, WEBP</span>
                    </label>
                    
                    {createForm.banner_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                        <img 
                          src={getAssetUrl(createForm.banner_url)} 
                          alt="Banner de la Flota" 
                          className="w-full h-24 object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                          <span className="text-[11px] text-white font-medium flex items-center gap-1">
                            <Check size={12} className="text-emerald-400" />
                            Foto cargada
                          </span>
                          <div className="flex gap-1.5">
                            <label className="cursor-pointer px-2 py-0.5 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-semibold rounded-md">
                              Cambiar
                              <input 
                                type="file" 
                                accept=".png,.jpg,.jpeg,.webp,image/*" 
                                className="hidden" 
                                onChange={(e) => handleBannerUpload(e, 'create')}
                                disabled={uploadingBanner}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreateForm({ ...createForm, banner_url: '' })}
                              className="p-1 bg-rose-600 text-white rounded-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 rounded-xl cursor-pointer transition-all">
                        <ImageIcon size={20} className="text-indigo-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Subir foto panorámica de unidades / flota</p>
                        <p className="text-[10px] text-slate-400">Aparecerá en el portal web de la empresa</p>
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg,.webp,image/*" 
                          className="hidden" 
                          onChange={(e) => handleBannerUpload(e, 'create')}
                          disabled={uploadingBanner}
                        />
                      </label>
                    )}
                  </div>

                  {/* Límite de Velocidad */}
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
                    <div className="flex gap-1.5 mt-2">
                      {[60, 80, 90, 100, 110].map(speed => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, limite_velocidad: speed })}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${createForm.limite_velocidad === speed ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {speed}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gerente Inicial */}
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 mb-2">
                      <ShieldCheck size={14} className="text-indigo-600" />
                      4. Usuario Gerente Inicial (Acceso)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre Gerente</label>
                        <input
                          type="text"
                          placeholder="Ej. Juan Pérez"
                          value={createForm.gerente_nombre}
                          onChange={(e) => setCreateForm({ ...createForm, gerente_nombre: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                        <input
                          type="email"
                          placeholder="gerencia@empresa.com"
                          value={createForm.gerente_email}
                          onChange={(e) => setCreateForm({ ...createForm, gerente_email: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contraseña Inicial</label>
                      <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={createForm.gerente_password}
                        onChange={(e) => setCreateForm({ ...createForm, gerente_password: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Botones de Acción Fijos */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? 'Registrando...' : 'Guardar Empresa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR EMPRESA (LAYOUT 2 COLUMNAS) ================= */}
      {showEditModal && selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in zoom-in-95">
            
            {/* Header del Modal */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-slate-50/70">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-600" />
                Editar Empresa: {selectedEmpresa.nombre}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* GRID 2 COLUMNAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUMNA IZQUIERDA: DATOS, SLUG, RUTAS Y PALETA DE 3 COLORES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <FileText size={14} className="text-indigo-600" />
                    1. Datos de Empresa & Portal Web
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre o Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Globe size={13} className="text-indigo-600" />
                      Subdominio Web Corporativo
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="huaynarroque"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: generateSlug(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-l-xl text-sm font-mono"
                      />
                      <span className="px-2.5 py-2.5 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-xs font-mono text-slate-500 whitespace-nowrap">
                        .industriascopai.com
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">RUC (11 dígitos)</label>
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="Ej. 20601234567"
                        value={editForm.documento}
                        onChange={(e) => setEditForm({ ...editForm, documento: e.target.value.replace(/\D/g, '') })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / Central</label>
                      <input
                        type="text"
                        placeholder="Ej. (051) 328-940"
                        value={editForm.telefono}
                        onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Slogan o Frase de Presentación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Líderes en transporte seguro y puntual 24/7"
                      value={editForm.slogan}
                      onChange={(e) => setEditForm({ ...editForm, slogan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rutas y Servicios Ofrecidos
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Rutas Juliaca - Puno - Arequipa | Encomiendas express y turismo"
                      value={editForm.servicios}
                      onChange={(e) => setEditForm({ ...editForm, servicios: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  {/* PALETA DE 3 COLORES EN EDITAR */}
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100 mb-3">
                      <Palette size={14} className="text-indigo-600" />
                      2. Paleta Corporativa de 3 Colores
                    </h3>

                    {/* Presets de Combinaciones */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {COLOR_PALETTE_PRESETS.map(p => (
                        <button
                          type="button"
                          key={p.name}
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            color_primario: p.primario,
                            color_secundario: p.secundario,
                            color_terciario: p.terciario
                          }))}
                          className="flex items-center gap-1.5 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-left transition-all text-[11px]"
                          title={p.name}
                        >
                          <div className="flex -space-x-1">
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.primario }} />
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.secundario }} />
                            <span className="w-3 h-3 rounded-full border border-white" style={{ backgroundColor: p.terciario }} />
                          </div>
                          <span className="truncate font-medium text-slate-700 text-[10px]">{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>

                    {/* 3 Selectores de Color Manuales */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">1. Primario *</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={editForm.color_primario || '#16A34A'}
                            onChange={(e) => setEditForm({ ...editForm, color_primario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={editForm.color_primario || '#16A34A'}
                            onChange={(e) => setEditForm({ ...editForm, color_primario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">2. Secundario *</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={editForm.color_secundario || '#FFFFFF'}
                            onChange={(e) => setEditForm({ ...editForm, color_secundario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={editForm.color_secundario || '#FFFFFF'}
                            onChange={(e) => setEditForm({ ...editForm, color_secundario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          3. Fondo / Acento
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={editForm.color_terciario || '#CCF5DC'}
                            onChange={(e) => setEditForm({ ...editForm, color_terciario: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input 
                            type="text" 
                            value={editForm.color_terciario || ''}
                            placeholder="#CCF5DC"
                            onChange={(e) => setEditForm({ ...editForm, color_terciario: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Previsualización de los 3 Colores */}
                    <div 
                      className="mt-3 p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${editForm.color_terciario || '#CCF5DC'} 0%, #FFFFFF 100%)`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: editForm.color_primario }} />
                        <span className="text-xs font-bold text-slate-900">
                          Fondo del Portal
                        </span>
                      </div>
                      <div 
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 border"
                        style={{
                          backgroundColor: editForm.color_primario,
                          color: editForm.color_secundario || '#FFFFFF',
                          borderColor: `${editForm.color_secundario || '#FFFFFF'}40`
                        }}
                      >
                        <span>Botón Portal Web →</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: LOGO, BANNER, LÍMITE VELOCIDAD Y ESTADO */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <ImageIcon size={14} className="text-indigo-600" />
                    3. Identidad Visual & Multimedia
                  </h3>

                  {/* Logotipo Oficial PNG */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Logotipo Oficial de la Empresa</span>
                      <span className="text-[11px] text-indigo-600 font-normal">Obligatorio: PNG</span>
                    </label>
                    
                    {editForm.logo_url ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shadow-sm">
                          <img 
                            src={getAssetUrl(editForm.logo_url)} 
                            alt="Logo" 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">Logotipo PNG cargado</p>
                          <p className="text-[11px] text-emerald-600 font-medium">✓ Logotipo activo</p>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg">
                          Cambiar
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
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 rounded-xl cursor-pointer transition-all">
                        <UploadCloud size={20} className="text-indigo-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Subir logotipo PNG</p>
                        <p className="text-[10px] text-slate-400">Seleccione archivo .png</p>
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

                  {/* Banner / Foto de la Flota */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Foto de Portada / Flota para el Portal Web</span>
                      <span className="text-[11px] text-slate-400 font-normal">PNG, JPG, WEBP</span>
                    </label>
                    
                    {editForm.banner_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                        <img 
                          src={getAssetUrl(editForm.banner_url)} 
                          alt="Banner de la Flota" 
                          className="w-full h-24 object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                          <span className="text-[11px] text-white font-medium flex items-center gap-1">
                            <Check size={12} className="text-emerald-400" />
                            Foto activa en el portal
                          </span>
                          <div className="flex gap-1.5">
                            <label className="cursor-pointer px-2 py-0.5 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-semibold rounded-md">
                              Cambiar
                              <input 
                                type="file" 
                                accept=".png,.jpg,.jpeg,.webp,image/*" 
                                className="hidden" 
                                onChange={(e) => handleBannerUpload(e, 'edit')}
                                disabled={uploadingBanner}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, banner_url: '' })}
                              className="p-1 bg-rose-600 text-white rounded-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 rounded-xl cursor-pointer transition-all">
                        <ImageIcon size={20} className="text-indigo-600 mb-1" />
                        <p className="text-xs font-bold text-slate-700">Subir foto panorámica de unidades / flota</p>
                        <p className="text-[10px] text-slate-400">Aparecerá en el portal web de la empresa</p>
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg,.webp,image/*" 
                          className="hidden" 
                          onChange={(e) => handleBannerUpload(e, 'edit')}
                          disabled={uploadingBanner}
                        />
                      </label>
                    )}
                  </div>

                  {/* Límite de Velocidad */}
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
                    <div className="flex gap-1.5 mt-2">
                      {[60, 80, 90, 100, 110].map(speed => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, limite_velocidad: speed })}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${editForm.limite_velocidad === speed ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {speed}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estado Activa / Inactiva */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={editForm.activo}
                        onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Empresa activa en la plataforma</span>
                        <span className="text-[10px] text-slate-400">Si se desactiva, los usuarios de esta empresa no podrán iniciar sesión.</span>
                      </div>
                    </label>
                  </div>

                </div>

              </div>

              {/* Botones de Acción Fijos */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Actualizar Empresa'}
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
                  placeholder="Ej. Carlos Mendoza"
                  value={gerenteForm.nombre}
                  onChange={(e) => setGerenteForm({ ...gerenteForm, nombre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="gerencia@transporte.com"
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
                  className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20"
                >
                  {saving ? 'Creando...' : 'Crear Gerente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
