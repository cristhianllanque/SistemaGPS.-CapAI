import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radio, Plus, Search, Edit2, Trash2, X, Check, Wifi, WifiOff, AlertCircle, Shield } from 'lucide-react';

const API = 'http://localhost:8000';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'asignado', label: 'Asignado' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'baja', label: 'Baja' },
];

const OPERADORES = ['Claro', 'Movistar', 'Bitel', 'Entel', 'Multioperador M2M'];

const ESTADO_COLORS = {
  disponible: 'bg-green-100 text-green-700',
  asignado: 'bg-blue-100 text-blue-700',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-red-100 text-red-700',
};

const emptyForm = {
  empresa_id: '', imei: '', numero_serie: '', modelo: 'FMC130', version_firmware: '',
  numero_sim: '', operador_sim: '', iccid_sim: '', tiene_boton_panico: true,
  fecha_compra: '', notas: ''
};

export default function DevicesPage() {
  const [dispositivos, setDispositivos] = useState([]);
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
      const res = await axios.get(`${API}/api/dispositivos/`, { headers, params });
      setDispositivos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterEstado, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
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
      tiene_boton_panico: d.tiene_boton_panico,
      fecha_compra: d.fecha_compra || '', notas: d.notas || ''
    });
    setError('');
    setShowModal(true);
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
          <p className="text-slate-500 text-sm mt-1">Inventario de dispositivos GPS FMC130</p>
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Modelo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">SIM</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Operador</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pánico</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vehículo</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispositivos.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <Radio size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay dispositivos registrados</p>
                    <p className="text-xs mt-1">Registre su primer dispositivo Teltonika FMC130</p>
                  </td>
                </tr>
              ) : dispositivos.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{d.imei}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.numero_serie}</td>
                  <td className="px-4 py-3 text-slate-700">{d.modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{d.numero_sim || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{d.operador_sim || '—'}</td>
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
                      {d.estado !== 'asignado' && (
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Dispositivo' : 'Registrar Nuevo Dispositivo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle size={16} /> {error}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <select value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="FMC130">FMC130 (4G)</option>
                    <option value="FMB130">FMB130 (2G)</option>
                    <option value="FMC640">FMC640 (4G LTE)</option>
                    <option value="FMB920">FMB920 (2G)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Versión Firmware</label>
                  <input type="text" value={form.version_firmware} onChange={(e) => setForm({ ...form, version_firmware: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="03.27.07.Rev.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">N° SIM / Chip</label>
                  <input type="text" maxLength="9" value={form.numero_sim} onChange={(e) => setForm({ ...form, numero_sim: e.target.value.replace(/\D/g,'') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="999888777" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Operador</label>
                  <select value={form.operador_sim} onChange={(e) => setForm({ ...form, operador_sim: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar...</option>
                    {OPERADORES.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ICCID SIM</label>
                  <input type="text" maxLength="20" minLength="19" pattern="\d{19,20}" value={form.iccid_sim} onChange={(e) => setForm({ ...form, iccid_sim: e.target.value.replace(/\D/g,'') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8951..." title="De 19 a 20 dígitos numéricos" />
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

            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
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
