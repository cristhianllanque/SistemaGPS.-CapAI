import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit2, Shield, User, ToggleLeft, ToggleRight, AlertCircle, X, Check } from 'lucide-react';

const API = 'http://localhost:8000';

const ROLES = ['admin', 'operador'];

const emptyForm = { nombre: '', email: '', password: '', rol: 'operador', empresa_id: '' };

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  const currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isSuperadmin = currentUser.rol === 'superadmin';
  const isAdmin = currentUser.rol === 'admin' || isSuperadmin;

  const fetchData = async () => {
    try {
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

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, empresa_id: isSuperadmin ? '' : currentUser.empresa_id });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ 
      nombre: u.nombre, 
      email: u.email, 
      password: '', 
      rol: u.rol,
      empresa_id: u.empresa_id || '' 
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.email || !form.rol) {
      setError('Nombre, email y rol son obligatorios');
      return;
    }
    if (!editingId && !form.password) {
      setError('La contraseña es obligatoria para nuevos usuarios');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password; // Don't send empty password if editing
      if (payload.empresa_id) {
        payload.empresa_id = parseInt(payload.empresa_id, 10);
      } else {
        delete payload.empresa_id;
      }
      
      if (editingId) {
        await axios.put(`${API}/api/usuarios/${editingId}`, payload, { headers });
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" /> Usuarios y Accesos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de roles y permisos del sistema (RBAC)</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Plus size={18} /> Crear Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                {isSuperadmin && (
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Empresa</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? "6" : "5"} className="text-center py-12 text-slate-400">
                    <User size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  {isSuperadmin && (
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-mono">
                        {u.empresa_nombre || 'Copay Central'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full 
                      ${u.rol === 'admin' ? 'bg-blue-100 text-blue-700' : 
                        u.rol === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {u.rol === 'admin' || u.rol === 'superadmin' ? <Shield size={12} /> : <User size={12} />}
                      <span className="capitalize">{u.rol}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.activo ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">Activo</span>
                    ) : (
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Editar">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleToggleEstado(u.id)} 
                        className={`p-1.5 rounded transition-colors ${u.activo ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} 
                        title={u.activo ? 'Desactivar' : 'Activar'}>
                        {u.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>
            
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle size={16} /> {error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Juan Pérez" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo Real *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="usuario@empresa.com" />
              </div>

              {isSuperadmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Cliente</label>
                  <select 
                    value={form.empresa_id || ''} 
                    onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Copay Central (Superadmin / Global)</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize">
                  {currentUser.rol === 'superadmin' && <option value="superadmin">Superadmin</option>}
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña {editingId ? '(Opcional)' : '*'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={editingId ? 'Deja en blanco para no cambiar' : '••••••••'} />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                <Check size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
