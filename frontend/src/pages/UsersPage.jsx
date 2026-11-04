import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, Plus, Edit2, Shield, User, ToggleLeft, ToggleRight,
  AlertCircle, X, Check, Building2, Search, Globe, Lock,
  CheckCircle2, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';
import { API_BASE_URL as API } from '../config';

const PROTECTED_SUPERADMINS = [
  'cristhianllanque65@gmail.com',
  'industriascopai@gmail.com'
];

const ROLE_INFO = {
  superadmin: {
    label: 'Superadmin Global',
    sublabel: 'Dueño • Control total de empresas y sistema',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
  },
  admin: {
    label: 'Gerente de Empresa',
    sublabel: 'Administra vehículos, conductores y reportes de su flota',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  operador: {
    label: 'Operador de Monitoreo',
    sublabel: 'Monitoreo GPS en vivo, historial y atención de alertas',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
};

const emptyForm = {
  nombre: '',
  email: '',
  password: '',
  rol: 'admin',
  empresa_id: '',
  es_global: false,
};

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingOriginalEmail, setEditingOriginalEmail] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtros de gestión en tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [filterRol, setFilterRol] = useState('all');

  // Estado de verificación de correo en tiempo real
  const [emailCheck, setEmailCheck] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const debounceRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isSuperadmin = currentUser.rol === 'superadmin';
  const isAdmin = currentUser.rol === 'admin' || isSuperadmin;

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests = [axios.get(`${API}/api/usuarios/`, { headers })];
      if (isSuperadmin) {
        requests.push(axios.get(`${API}/api/empresas/`, { headers }));
      }
      const [usrRes, empRes] = await Promise.all(requests);
      setUsuarios(usrRes.data);
      if (empRes) setEmpresas(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
    else setLoading(false);
  }, []);

  const verifyEmailAddress = async (rawEmail, excludeUserId = null) => {
    const clean = (rawEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.split('@')[1]?.indexOf('.') === -1) {
      setEmailCheck(null);
      setEmailConfirmed(false);
      return null;
    }

    // Si estamos editando y el correo no cambió respecto al original, no requiere alerta
    if (excludeUserId && clean === editingOriginalEmail) {
      setEmailCheck({
        estado: 'mismo_correo',
        en_sistema: true,
        puede_usar: true,
        requiere_confirmacion: false,
        mensaje: 'Correo actual de este usuario.'
      });
      setEmailConfirmed(true);
      return null;
    }

    try {
      setCheckingEmail(true);
      const params = { email: clean };
      if (excludeUserId) params.exclude_id = excludeUserId;
      const res = await axios.get(`${API}/api/usuarios/verificar-email`, { headers, params });
      setEmailCheck(res.data);
      if (res.data.estado === 'disponible_verificado') {
        setEmailConfirmed(true);
      } else {
        setEmailConfirmed(false);
      }
      return res.data;
    } catch (err) {
      console.error('Error al verificar correo:', err);
      return null;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (newEmail) => {
    setForm(prev => ({ ...prev, email: newEmail }));
    setEmailConfirmed(false);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setEmailCheck(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      verifyEmailAddress(clean, editingId);
    }, 550);
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingOriginalEmail('');
    setEmailCheck(null);
    setEmailConfirmed(false);
    const defaultEmpresaId = isSuperadmin
      ? (empresas[0]?.id ? String(empresas[0].id) : '')
      : String(currentUser.empresa_id || '');
    setForm({
      nombre: '',
      email: '',
      password: '',
      rol: 'admin',
      empresa_id: defaultEmpresaId,
      es_global: false,
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setEditingOriginalEmail((u.email || '').toLowerCase());
    setEmailCheck(null);
    setEmailConfirmed(true);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      empresa_id: u.empresa_id ? String(u.empresa_id) : '',
      es_global: u.rol === 'superadmin',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.rol) {
      setError('Nombre, correo electrónico y rol son obligatorios.');
      return;
    }
    if (!editingId && !form.password) {
      setError('La contraseña es obligatoria para crear un nuevo usuario.');
      return;
    }

    // Validar que todo Gerente u Operador tenga una empresa asignada
    const rolFinal = form.es_global ? 'superadmin' : (form.rol === 'superadmin' ? 'admin' : form.rol);
    if (rolFinal !== 'superadmin' && isSuperadmin && !form.empresa_id) {
      setError('Debes seleccionar a qué Empresa Cliente pertenecerá este usuario.');
      return;
    }

    // Verificar estado del correo antes de guardar
    let currentCheck = emailCheck;
    const cleanEmail = form.email.trim().toLowerCase();
    if (!currentCheck || currentCheck.email !== cleanEmail) {
      currentCheck = await verifyEmailAddress(cleanEmail, editingId);
    }

    if (currentCheck && !currentCheck.puede_usar) {
      setError(currentCheck.mensaje || 'Este correo ya está vinculado a otra cuenta y no puede utilizarse.');
      return;
    }

    if (currentCheck && currentCheck.requiere_confirmacion && !emailConfirmed) {
      setError('Por favor revisa el aviso de verificación del correo y confirma si deseas continuar con este correo.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: cleanEmail,
        rol: rolFinal,
        empresa_id: rolFinal === 'superadmin' ? null : (form.empresa_id ? parseInt(form.empresa_id, 10) : null),
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        const res = await axios.put(`${API}/api/usuarios/${editingId}`, payload, { headers });
        if (Number(editingId) === Number(currentUser.id) && res.data) {
          localStorage.setItem('usuario', JSON.stringify(res.data));
        }
      } else {
        await axios.post(`${API}/api/usuarios/`, payload, { headers });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (id) => {
    try {
      await axios.put(`${API}/api/usuarios/${id}/toggle-estado`, {}, { headers });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-slate-500 mt-20">
        <Shield size={48} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p>No tienes los permisos necesarios para ver esta página.</p>
      </div>
    );
  }

  const filteredUsuarios = usuarios.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchText =
      u.nombre?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.empresa_nombre || 'Copai Central').toLowerCase().includes(q);

    const matchEmpresa =
      filterEmpresa === 'all'
        ? true
        : filterEmpresa === 'central'
        ? u.rol === 'superadmin'
        : String(u.empresa_id) === String(filterEmpresa);

    const matchRol = filterRol === 'all' ? true : u.rol === filterRol;

    return matchText && matchEmpresa && matchRol;
  });

  const totalSuperadmins = usuarios.filter(u => u.rol === 'superadmin').length;
  const totalGerentes = usuarios.filter(u => u.rol === 'admin').length;
  const totalOperadores = usuarios.filter(u => u.rol === 'operador').length;

  const isEditingProtectedSuperadmin =
    Boolean(editingId) && PROTECTED_SUPERADMINS.includes(editingOriginalEmail);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users size={26} className="text-indigo-600" />
            Gestión de Usuarios, Roles y Empresas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Controla qué rol cumple cada usuario (Superadmin, Gerente u Operador) y a qué empresa está vinculado.
          </p>
        </div>
        {isSuperadmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={18} /> Crear Nuevo Usuario
          </button>
        )}
      </div>

      {/* Tarjetas Resumen por Rol */}
      {isSuperadmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Superadmins Globales</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{totalSuperadmins}</p>
              <p className="text-xs text-slate-500 mt-0.5">Dueños • Copai Central</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Shield size={22} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Gerentes de Empresa</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{totalGerentes}</p>
              <p className="text-xs text-slate-500 mt-0.5">Rol Admin • Gestionan su flota</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 size={22} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Operadores de Flota</p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{totalOperadores}</p>
              <p className="text-xs text-slate-500 mt-0.5">Rol Operador • Solo monitoreo</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <User size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros por Empresa y Rol */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {isSuperadmin && (
          <div>
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🏢 Todas las Empresas y Cuentas</option>
              <option value="central">👑 Copai Central (Superadmins Globales)</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>
                  Flota: {emp.nombre} ({emp.slug}.industriascopai.com)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">🛡️ Todos los Roles</option>
            {isSuperadmin && <option value="superadmin">👑 Superadmin Global (Dueño)</option>}
            <option value="admin">🏢 Gerente de Empresa (Admin)</option>
            <option value="operador">🖥️ Operador de Monitoreo</option>
          </select>
        </div>
      </div>

      {!isSuperadmin && (
        <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 text-indigo-900 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
          <Shield size={18} className="text-indigo-600 flex-shrink-0" />
          <span>
            <strong>Directorio de Usuarios de tu Empresa:</strong> Visualiza los usuarios asignados a tu flota.
          </span>
        </div>
      )}

      {/* Tabla Detallada de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Correo de Acceso</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Empresa Asignada & Portal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Rol y Permisos</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                {isSuperadmin && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isSuperadmin ? "6" : "5"} className="text-center py-12 text-slate-400">
                    <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-indigo-500" />
                    <p>Cargando directorio de usuarios...</p>
                  </td>
                </tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? "6" : "5"} className="text-center py-12 text-slate-400">
                    <User size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No se encontraron usuarios con este filtro</p>
                  </td>
                </tr>
              ) : filteredUsuarios.map(u => {
                const isProtectedOwner = PROTECTED_SUPERADMINS.includes((u.email || '').toLowerCase());
                const roleMeta = ROLE_INFO[u.rol] || ROLE_INFO.operador;
                const isParticular = u.empresa_tipo === 'particular';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{u.nombre}</span>
                        {isProtectedOwner && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full" title="Cuenta Principal del Dueño de Copai">
                            <Lock size={10} /> Principal
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                      {u.email}
                    </td>

                    <td className="px-4 py-3.5">
                      {u.rol === 'superadmin' ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg w-fit">
                            <Shield size={12} className="text-purple-600" />
                            Copai Central (Global)
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                            industriascopai.com
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                            <Building2 size={12} className="text-indigo-600" />
                            {u.empresa_nombre || 'Sin empresa'}
                          </span>
                          {u.empresa_slug && !isParticular && (
                            <a
                              href={`https://${u.empresa_slug}.industriascopai.com`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-mono mt-0.5"
                            >
                              <Globe size={10} />
                              {u.empresa_slug}.industriascopai.com
                              <ExternalLink size={9} />
                            </a>
                          )}
                          {isParticular && (
                            <span className="text-[11px] text-teal-600 font-medium mt-0.5">
                              🚗 Cuenta Cliente Particular
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full w-fit ${roleMeta.badgeClass}`}>
                          {u.rol === 'superadmin' || u.rol === 'admin' ? <Shield size={12} /> : <User size={12} />}
                          <span>{isParticular && u.rol === 'admin' ? 'Cliente Particular' : roleMeta.label}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {isParticular && u.rol === 'admin' ? 'Monitoreo exclusivo de su vehículo' : roleMeta.sublabel}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.activo ? (
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </td>

                    {isSuperadmin && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Usuario"
                          >
                            <Edit2 size={16} />
                          </button>
                          {u.rol !== 'superadmin' && u.id !== currentUser.id ? (
                            <button
                              onClick={() => handleToggleEstado(u.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${u.activo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                              title={u.activo ? 'Desactivar acceso' : 'Activar acceso'}
                            >
                              {u.activo ? <ToggleRight size={19} /> : <ToggleLeft size={19} />}
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Cuenta Superadmin protegida">
                              <Lock size={15} />
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Usuario con Verificación de Correo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/70">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingId ? 'Editar Usuario y Asignación' : 'Crear Nuevo Usuario'}
                </h2>
                <p className="text-xs text-slate-500">
                  Define el correo, verifica su disponibilidad y asigna la empresa y rol exactos.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-200/70 rounded-lg cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Aviso de protección si se edita una cuenta principal de Superadmin */}
              {form.es_global && editingId && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-purple-800">
                    <Lock size={14} /> Cuenta de Superadministrador Global (Dueño de Copai)
                  </div>
                  <p className="text-purple-700 leading-relaxed">
                    Esta cuenta administra toda la plataforma. <strong>No la reemplaces por el correo de un gerente de empresa.</strong> Si deseas crear el usuario de una empresa (como Huayna Roque o Tranzela), cierra esta ventana y usa el botón <strong>"Crear Nuevo Usuario"</strong>.
                  </p>
                </div>
              )}

              {/* 1. Selección de Ámbito: Empresa Cliente vs Superadmin Global */}
              {isSuperadmin && !editingId && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    1. ¿Para quién es esta cuenta?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        es_global: false,
                        rol: prev.rol === 'superadmin' ? 'admin' : prev.rol,
                        empresa_id: prev.empresa_id || (empresas[0]?.id ? String(empresas[0].id) : '')
                      }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        !form.es_global
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                        <Building2 size={15} className="text-indigo-600" />
                        Empresa Cliente
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Gerente u Operador de una flota
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        es_global: true,
                        rol: 'superadmin',
                        empresa_id: ''
                      }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        form.es_global
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                        <Shield size={15} className="text-purple-600" />
                        Copai Central (Dueño)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Superadmin con acceso total
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Empresa y Rol para cuentas de Empresa Cliente */}
              {!form.es_global && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  {isSuperadmin && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Empresa Asignada *
                      </label>
                      <select
                        value={form.empresa_id || ''}
                        onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Seleccionar Empresa Cliente --</option>
                        {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombre} ({emp.slug}.industriascopai.com)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rol dentro de la Empresa *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, rol: 'admin' })}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          form.rol === 'admin'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <Shield size={13} className="text-blue-600" />
                          Gerente de Empresa (Admin)
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Gestiona su flota, conductores y reportes
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, rol: 'operador' })}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          form.rol === 'operador'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <User size={13} className="text-emerald-600" />
                          Operador de Monitoreo
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Solo visualización de mapa, rutas y alertas
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Jesús Alfredo Mamani"
                />
              </div>

              {/* Correo Electrónico con Verificación en Tiempo Real */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Correo Electrónico de Acceso *</span>
                  {checkingEmail && (
                    <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
                      <RefreshCw size={11} className="animate-spin" /> Verificando correo...
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={form.email}
                    disabled={isEditingProtectedSuperadmin}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => verifyEmailAddress(form.email, editingId)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isEditingProtectedSuperadmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-200'
                    }`}
                    placeholder="usuario@gmail.com"
                  />
                  {!isEditingProtectedSuperadmin && (
                    <button
                      type="button"
                      onClick={() => verifyEmailAddress(form.email, editingId)}
                      disabled={checkingEmail || !form.email}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Verificar
                    </button>
                  )}
                </div>

                {/* Panel de resultado de verificación de correo */}
                {emailCheck && emailCheck.estado !== 'mismo_correo' && (
                  <div className="mt-2">
                    {/* Caso 1: Correo ya existe en el sistema (Superadmin o vinculado a otra empresa) */}
                    {!emailCheck.puede_usar && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-red-700">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>Correo ya vinculado en el sistema</span>
                        </div>
                        <p>{emailCheck.mensaje}</p>
                      </div>
                    )}

                    {/* Caso 2: Correo no existe o es nuevo no registrado -> Pide confirmación "¿Desea seguir con este correo?" */}
                    {emailCheck.puede_usar && emailCheck.requiere_confirmacion && !emailConfirmed && (
                      <div className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                        emailCheck.estado === 'no_existe_buzon'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${emailCheck.estado === 'no_existe_buzon' ? 'text-amber-600' : 'text-indigo-600'}`} />
                          <div className="space-y-1">
                            <p className="font-bold">
                              {emailCheck.estado === 'no_existe_buzon'
                                ? '⚠️ Aviso: Este correo no existe como buzón activo'
                                : 'ℹ️ Verificación de correo nuevo'}
                            </p>
                            <p className="leading-relaxed">{emailCheck.mensaje}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEmailConfirmed(true)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Check size={13} />
                            Sí, seguir con este correo y crear normal
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Caso 3: Correo verificado o confirmado */}
                    {emailCheck.puede_usar && (emailConfirmed || !emailCheck.requiere_confirmacion) && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>
                          Correo verificado y confirmado para asignarse a{' '}
                          <strong>
                            {form.es_global
                              ? 'Copai Central (Superadmin)'
                              : (empresas.find(e => String(e.id) === String(form.empresa_id))?.nombre || 'esta empresa')}
                          </strong>.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña {editingId ? '(Opcional)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={editingId ? 'Deja en blanco para mantener la contraseña actual' : 'Mínimo 6 caracteres'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (emailCheck && !emailCheck.puede_usar)}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Check size={16} />
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
