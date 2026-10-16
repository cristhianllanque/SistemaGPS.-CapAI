import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link2, Unlink, Truck, Radio, Users, Check, AlertTriangle, Shield, Building2 } from 'lucide-react';

const API = 'http://localhost:8000';

export default function LinkingPage() {
  const [vehiculos, setVehiculos] = useState([]);
  const [dispositivosDisp, setDispositivosDisp] = useState([]);
  const [conductoresDisp, setConductoresDisp] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);
  const [selectedDispId, setSelectedDispId] = useState('');
  const [selectedCondId, setSelectedCondId] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const isSuperAdmin = usuario?.rol === 'superadmin';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (isSuperAdmin && selectedEmpresa) {
        params.empresa_id = selectedEmpresa;
      }
      const requests = [
        axios.get(`${API}/api/vehiculos/`, { headers, params }),
        axios.get(`${API}/api/dispositivos/disponibles`, { headers, params }),
        axios.get(`${API}/api/conductores/disponibles`, { headers, params })
      ];
      if (isSuperAdmin) {
        requests.push(axios.get(`${API}/api/empresas/`, { headers }));
      }
      const [vRes, dRes, cRes, empRes] = await Promise.all(requests);
      setVehiculos(vRes.data);
      setDispositivosDisp(dRes.data);
      setConductoresDisp(cRes.data);
      if (empRes) setEmpresas(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedEmpresa]);

  const filteredVehiculos = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openLinkModal = (v) => {
    setSelectedVehiculo(v);
    setSelectedDispId(v.dispositivo_id || '');
    setSelectedCondId(v.conductor_id || '');
    setShowModal(true);
  };

  const handleVincular = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/vehiculos/${selectedVehiculo.id}/vincular`, {
        dispositivo_id: selectedDispId ? parseInt(selectedDispId) : null,
        conductor_id: selectedCondId ? parseInt(selectedCondId) : null
      }, { headers });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al vincular');
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincularDisp = async (id) => {
    if (!confirm('¿Desvincular dispositivo GPS de este vehículo?')) return;
    try {
      await axios.put(`${API}/api/vehiculos/${id}/desvincular-dispositivo`, {}, { headers });
      fetchData();
    } catch (err) { alert('Error al desvincular dispositivo'); }
  };

  const handleDesvincularCond = async (id) => {
    if (!confirm('¿Desvincular conductor de este vehículo?')) return;
    try {
      await axios.put(`${API}/api/vehiculos/${id}/desvincular-conductor`, {}, { headers });
      fetchData();
    } catch (err) { alert('Error al desvincular conductor'); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Link2 size={24} className="text-pink-600" /> Vinculación de Flota
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isSuperAdmin 
            ? 'Asigne dispositivos GPS y conductores a los vehículos para habilitar el monitoreo en tiempo real'
            : 'Relación de dispositivos GPS y conductores asignados a sus unidades de transporte'}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="mb-5 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-sm flex items-center gap-3 shadow-sm">
          <Shield size={22} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-950">Asignación de Telemática Centralizada</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Modo de solo lectura. La asignación física y lógica de dispositivos GPS Teltonika FMC130 a las unidades de transporte es provista y administrada por Copay Telematics (Central).
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Buscar vehículo por placa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white" 
            />
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <select
                  value={selectedEmpresa}
                  onChange={(e) => setSelectedEmpresa(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium text-slate-700"
                >
                  <option value="">Todas las empresas</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isSuperAdmin ? (
            <div className="flex gap-4 text-sm font-medium">
              <span className="text-slate-500">Disponibles:</span>
              <span className="text-blue-600 flex items-center gap-1"><Radio size={14}/> {dispositivosDisp.length} GPS</span>
              <span className="text-violet-600 flex items-center gap-1"><Users size={14}/> {conductoresDisp.length} Conductores</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500">
              Total Unidades: <span className="text-slate-800">{vehiculos.length}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                {isSuperAdmin && (
                  <th className="text-left px-6 py-4 font-semibold text-slate-600">Empresa</th>
                )}
                <th className="text-left px-6 py-4 font-semibold text-slate-600">Vehículo</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-600">Dispositivo GPS Asignado</th>
                <th className="text-left px-6 py-4 font-semibold text-slate-600">Conductor Asignado</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">
                  {isSuperAdmin ? 'Gestión' : 'Estado'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehiculos.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "5" : "4"} className="text-center py-8 text-slate-400">
                    No se encontraron vehículos
                  </td>
                </tr>
              ) : filteredVehiculos.map(v => {
                const hasGPS = !!v.dispositivo;
                const hasDriver = !!v.conductor;
                const isReady = hasGPS && hasDriver;

                return (
                  <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${!hasGPS ? 'bg-orange-50/30' : ''}`}>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Building2 size={12} />
                          {v.empresa_nombre || 'Sin Empresa'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-base">{v.placa}</p>
                          <p className="text-xs text-slate-500 capitalize">{v.marca} {v.modelo} • {v.tipo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {hasGPS ? (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                          <div>
                            <p className="font-mono text-sm font-semibold text-blue-800">{v.dispositivo.imei}</p>
                            <p className="text-xs text-blue-600 mt-0.5">{v.dispositivo.modelo}</p>
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => handleDesvincularDisp(v.id)} className="p-1.5 text-blue-400 hover:text-red-500 hover:bg-white rounded transition-colors" title="Desvincular GPS">
                              <Unlink size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-500 text-sm font-medium">
                          <AlertTriangle size={16} /> Requiere GPS
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasDriver ? (
                        <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-lg p-2.5">
                          <div>
                            <p className="font-semibold text-violet-800 text-sm">{v.conductor.nombre}</p>
                            <p className="text-xs text-violet-600 font-mono mt-0.5">DNI: {v.conductor.dni}</p>
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => handleDesvincularCond(v.id)} className="p-1.5 text-violet-400 hover:text-red-500 hover:bg-white rounded transition-colors" title="Desvincular Conductor">
                              <Unlink size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm font-medium">Sin conductor asignado</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isSuperAdmin ? (
                        <button onClick={() => openLinkModal(v)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                          <Link2 size={16} /> Editar Asignación
                        </button>
                      ) : (
                        <div className="flex justify-end">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Shield size={14} className="text-emerald-600" /> Vinculado por Copay
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle size={14} className="text-amber-600" /> {hasGPS ? 'Sin Conductor' : 'Pendiente GPS'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Exclusively for Superadmin */}
      {isSuperAdmin && showModal && selectedVehiculo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Asignar a {selectedVehiculo.placa}</h2>
              <p className="text-sm text-slate-500 mt-1">Seleccione el GPS y el conductor para esta unidad</p>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Radio size={16} className="text-blue-500"/> Dispositivo GPS
                </label>
                <select 
                  value={selectedDispId} 
                  onChange={(e) => setSelectedDispId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Sin dispositivo --</option>
                  {selectedVehiculo.dispositivo && (
                    <option value={selectedVehiculo.dispositivo.id}>
                      {selectedVehiculo.dispositivo.imei} (Actual)
                    </option>
                  )}
                  {dispositivosDisp.map(d => (
                    <option key={d.id} value={d.id}>{d.imei} - {d.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} className="text-violet-500"/> Conductor Asignado
                </label>
                <select 
                  value={selectedCondId} 
                  onChange={(e) => setSelectedCondId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="">-- Sin conductor --</option>
                  {selectedVehiculo.conductor && (
                    <option value={selectedVehiculo.conductor.id}>
                      {selectedVehiculo.conductor.nombre} (Actual)
                    </option>
                  )}
                  {conductoresDisp.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - DNI: {c.dni}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleVincular} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg disabled:opacity-50">
                <Check size={16} /> Guardar Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
