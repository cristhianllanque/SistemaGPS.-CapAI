import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Search, Edit2, Trash2, X, Check, AlertCircle, Phone, CreditCard } from 'lucide-react';

const API = 'http://localhost:8000';

const emptyForm = {
  nombre: '', dni: '', licencia_conducir: '', categoria_licencia: '',
  telefono: '', foto_url: ''
};

export default function DriversPage() {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const res = await axios.get(`${API}/api/conductores/`, { headers, params });
      setConductores(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [searchTerm]);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setError(''); setShowModal(true); };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre, dni: c.dni,
      licencia_conducir: c.licencia_conducir || '',
      categoria_licencia: c.categoria_licencia || '',
      telefono: c.telefono || '', foto_url: c.foto_url || ''
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.dni) { setError('Nombre y DNI son obligatorios'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.licencia_conducir) delete payload.licencia_conducir;
      if (!payload.categoria_licencia) delete payload.categoria_licencia;
      if (!payload.telefono) delete payload.telefono;
      if (!payload.foto_url) delete payload.foto_url;

      if (editingId) {
        await axios.put(`${API}/api/conductores/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/conductores/`, payload, { headers });
      }
      setShowModal(false); fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de dar de baja este conductor?')) return;
    try {
      await axios.delete(`${API}/api/conductores/${id}`, { headers });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error al eliminar'); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-violet-600" /> Conductores
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registro y gestión de conductores</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Plus size={18} /> Registrar Conductor
        </button>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input type="text" placeholder="Buscar por nombre o DNI..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Conductor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">DNI</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Licencia</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vehículo Asignado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conductores.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay conductores registrados</p>
                    <p className="text-xs mt-1">Registre su primer conductor</p>
                  </td>
                </tr>
              ) : conductores.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {c.nombre?.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.dni}</td>
                  <td className="px-4 py-3 text-slate-600">{c.licencia_conducir || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.categoria_licencia || '—'}</td>
                  <td className="px-4 py-3">
                    {c.telefono ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600"><Phone size={12} /> {c.telefono}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.vehiculo_placa ? (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{c.vehiculo_placa}</span>
                    ) : (
                      <span className="text-xs text-slate-400">No asignado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"><Edit2 size={15} /></button>
                      {!c.vehiculo_placa && (
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Conductor' : 'Registrar Nuevo Conductor'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle size={16} /> {error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                  <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Juan Carlos Pérez Mamani" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DNI *</label>
                  <input type="text" maxLength="8" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="12345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="951234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Licencia de Conducir</label>
                  <input type="text" value={form.licencia_conducir} onChange={(e) => setForm({ ...form, licencia_conducir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Q-12345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría Licencia</label>
                  <select value={form.categoria_licencia} onChange={(e) => setForm({ ...form, categoria_licencia: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Seleccionar...</option>
                    <option value="A-I">A-I</option>
                    <option value="A-IIa">A-IIa</option>
                    <option value="A-IIb">A-IIb</option>
                    <option value="A-IIIa">A-IIIa</option>
                    <option value="A-IIIb">A-IIIb</option>
                    <option value="B-I">B-I</option>
                    <option value="B-IIa">B-IIa</option>
                    <option value="B-IIb">B-IIb</option>
                    <option value="B-IIc">B-IIc</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                <Check size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar Conductor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
