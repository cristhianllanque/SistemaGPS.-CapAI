import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, Search, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';

const API = 'http://localhost:8000';

const TIPOS = ['minivan', 'bus', 'camioneta', 'sedan', 'otro'];

const ESTADO_COLORS = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-slate-100 text-slate-600',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = {
  padron: '', placa: '', marca: '', modelo: '', anio: '', color: '', tipo: 'minivan',
  numero_asientos: '', foto_url: ''
};

export default function VehiclesPage() {
  const [vehiculos, setVehiculos] = useState([]);
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
      const res = await axios.get(`${API}/api/vehiculos/`, { headers, params });
      setVehiculos(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [searchTerm]);

  const openCreate = () => {
    setEditingId(null); setForm({ ...emptyForm }); setError(''); setShowModal(true);
  };

  const formatPlaca = (val) => {
    let clean = val.replace(/[^A-Z0-9]/gi, '').toUpperCase();
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
      numero_asientos: v.numero_asientos || '', foto_url: v.foto_url || ''
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.placa || !form.padron) { setError('La placa y el padrón son obligatorios'); return; }
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(form.placa)) { setError('La placa debe tener el formato XXX-XXX'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (payload.anio) payload.anio = parseInt(payload.anio);
      else delete payload.anio;
      if (payload.numero_asientos) payload.numero_asientos = parseInt(payload.numero_asientos);
      else delete payload.numero_asientos;
      if (!payload.marca) delete payload.marca;
      if (!payload.modelo) delete payload.modelo;
      if (!payload.color) delete payload.color;
      if (!payload.foto_url) delete payload.foto_url;

      if (editingId) {
        await axios.put(`${API}/api/vehiculos/${editingId}`, payload, { headers });
      } else {
        await axios.post(`${API}/api/vehiculos/`, payload, { headers });
      }
      setShowModal(false); fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de dar de baja este vehículo?')) return;
    try {
      await axios.delete(`${API}/api/vehiculos/${id}`, { headers });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error al eliminar'); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck size={24} className="text-emerald-600" /> Vehículos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registro y gestión de unidades de transporte</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm">
          <Plus size={18} /> Registrar Vehículo
        </button>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input type="text" placeholder="Buscar por placa..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Padrón / Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Marca / Modelo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Año</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Color</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Dispositivo GPS</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Conductor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehiculos.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <Truck size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay vehículos registrados</p>
                    <p className="text-xs mt-1">Registre su primer vehículo</p>
                  </td>
                </tr>
              ) : vehiculos.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{v.padron}</div>
                    <div className="text-xs text-slate-500 font-mono">{v.placa}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.anio || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{v.tipo || '—'}</td>
                  <td className="px-4 py-3">
                    {v.color ? (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: v.color }}></span>
                        <span className="text-slate-600 text-xs">{v.color}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.dispositivo ? (
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                        GPS Instalado: {v.dispositivo.imei}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500 font-medium">⚠ Sin GPS</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{v.conductor?.nombre || <span className="text-orange-500 font-medium">⚠ Sin conductor</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${ESTADO_COLORS[v.estado] || 'bg-slate-100'}`}>
                      {v.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle size={16} /> {error}</div>}
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
                    {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
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
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
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
