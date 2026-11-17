import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Zap, PauseCircle, PlayCircle, ShieldCheck, AlertTriangle, Check, X, Infinity as InfinityIcon } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const PLANES_SERVICIO = [
  { id: 'mensual', label: 'Mensual (1 Mes)', short: '1 Mes', dias: 30 },
  { id: 'trimestral', label: 'Trimestral (3 Meses)', short: '3 Meses', dias: 90 },
  { id: 'semestral', label: 'Semestral (6 Meses)', short: '6 Meses', dias: 180 },
  { id: 'anual', label: 'Anual (1 Año)', short: '1 Año', dias: 365 },
  { id: 'ilimitado', label: 'Ilimitado / Permanente', short: 'Ilimitado', dias: null },
];

export function calcularFechaPorPlan(planId) {
  const found = PLANES_SERVICIO.find((p) => p.id === planId);
  if (!found || !found.dias) return '';
  const d = new Date();
  d.setDate(d.getDate() + found.dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatearFechaLatam(fechaStr) {
  if (!fechaStr) return 'Sin vencimiento';
  const clean = String(fechaStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function obtenerEtiquetaPlan(planId) {
  const p = (planId || 'mensual').toLowerCase();
  if (p === 'trimestral') return 'Trimestral (3M)';
  if (p === 'semestral') return 'Semestral (6M)';
  if (p === 'anual') return 'Anual (1A)';
  if (p === 'ilimitado') return 'Ilimitado';
  return 'Mensual (1M)';
}

/**
 * Selector limpio de Plan y Tiempo de Servicio para los formularios de Crear / Editar
 */
export function SuscripcionSelectorForm({
  planServicio = 'mensual',
  fechaVencimiento = '',
  corteAutomatico = true,
  onChange
}) {
  const handleSelectPlan = (planId) => {
    const nuevaFecha = planId === 'ilimitado' ? '' : calcularFechaPorPlan(planId);
    onChange({
      plan_servicio: planId,
      fecha_vencimiento: nuevaFecha,
      corte_automatico: corteAutomatico
    });
  };

  return (
    <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar size={14} className="text-indigo-600" />
          <span>Plan y Tiempo de Suscripción del Cliente</span>
        </span>
        <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
          {obtenerEtiquetaPlan(planServicio)}
        </span>
      </div>

      {/* Botones rápidos de periodo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {PLANES_SERVICIO.map((p) => {
          const active = (planServicio || 'mensual') === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPlan(p.id)}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.short}
            </button>
          );
        })}
      </div>

      {planServicio !== 'ilimitado' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Fecha de Vencimiento / Corte
            </label>
            <input
              type="date"
              value={fechaVencimiento || ''}
              onChange={(e) =>
                onChange({
                  plan_servicio: planServicio,
                  fecha_vencimiento: e.target.value,
                  corte_automatico: corteAutomatico
                })
              }
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 mt-1 sm:mt-4">
            <input
              type="checkbox"
              checked={corteAutomatico !== false}
              onChange={(e) =>
                onChange({
                  plan_servicio: planServicio,
                  fecha_vencimiento: fechaVencimiento,
                  corte_automatico: e.target.checked
                })
              }
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
              Cortar acceso automáticamente al vencer
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * Insignia / Semáforo Visual de Suscripción para las tarjetas de Empresas y Clientes Particulares
 */
export function SuscripcionCardBar({ entidad, onOpenModal }) {
  const estado = entidad.estado_suscripcion || (entidad.activo === false ? 'suspendido' : 'ilimitado');
  const dias = entidad.dias_restantes;
  const plan = entidad.plan_servicio || 'mensual';
  const fechaVenc = entidad.fecha_vencimiento;

  let badgeStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  let dotStyle = 'bg-emerald-500';
  let statusText = 'Al día';

  if (estado === 'suspendido' || entidad.activo === false) {
    badgeStyle = 'bg-rose-50 border-rose-200 text-rose-800';
    dotStyle = 'bg-rose-500';
    statusText = 'Servicio Suspendido';
  } else if (estado === 'vencido') {
    badgeStyle = 'bg-rose-50 border-rose-200 text-rose-800';
    dotStyle = 'bg-rose-500 animate-pulse';
    statusText = dias !== null && dias !== undefined ? `Vencido hace ${Math.abs(dias)} día(s)` : 'Suscripción Vencida';
  } else if (estado === 'por_vencer') {
    badgeStyle = 'bg-amber-50 border-amber-300 text-amber-900';
    dotStyle = 'bg-amber-500 animate-ping';
    statusText = dias === 0 ? '¡Vence Hoy!' : `Por vencer (${dias} día${dias === 1 ? '' : 's'})`;
  } else if (estado === 'ilimitado' || !fechaVenc) {
    badgeStyle = 'bg-sky-50 border-sky-200 text-sky-800';
    dotStyle = 'bg-sky-500';
    statusText = 'Activo • Ilimitado';
  } else {
    badgeStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    dotStyle = 'bg-emerald-500';
    statusText = `Activo • Quedan ${dias} días`;
  }

  return (
    <div className={`p-3 rounded-xl border ${badgeStyle} flex items-center justify-between gap-2 mb-3`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotStyle}`} />
          <span className="text-xs font-extrabold truncate">{statusText}</span>
        </div>
        <div className="text-[11px] opacity-85 font-medium mt-0.5 truncate">
          Plan: <strong>{obtenerEtiquetaPlan(plan)}</strong>
          {fechaVenc && plan !== 'ilimitado' ? ` • Vence: ${formatearFechaLatam(fechaVenc)}` : ''}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenModal(entidad)}
        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-colors cursor-pointer shadow-2xs"
        title="Renovar suscripción, cambiar tiempo o pausar servicio"
      >
        <Zap size={12} className="text-amber-400" />
        <span>Tiempo / Renovar</span>
      </button>
    </div>
  );
}

/**
 * Modal de Gestión Rápida de Suscripción (1 Clic para Renovar +1M, +3M, +6M, +1A o Suspender/Reactivar)
 */
export function SuscripcionModal({ show, entidad, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [corteAuto, setCorteAuto] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (entidad) {
      setCustomDate(entidad.fecha_vencimiento ? String(entidad.fecha_vencimiento).split('T')[0] : calcularFechaPorPlan('mensual'));
      setCorteAuto(entidad.corte_automatico !== false);
      setError('');
    }
  }, [entidad]);

  if (!show || !entidad) return null;

  const ejecutarAccion = async (accion, planServicio = null, fechaExplicita = null) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/api/empresas/${entidad.id}/suscripcion`,
        {
          accion,
          plan_servicio: planServicio || entidad.plan_servicio || 'mensual',
          fecha_vencimiento: fechaExplicita,
          corte_automatico: corteAuto
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (onUpdated) onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar la suscripción del cliente.');
    } finally {
      setLoading(false);
    }
  };

  const isSuspended = entidad.activo === false || entidad.estado_suscripcion === 'suspendido';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">
                Control de Suscripción &amp; Corte
              </h3>
              <p className="text-xs text-slate-400 truncate">{entidad.nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Estado actual */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Estado Actual del Cliente
              </span>
              <span className="text-sm font-black text-slate-900">
                {isSuspended
                  ? '🔴 Servicio en Pausa / Suspendido'
                  : entidad.estado_suscripcion === 'vencido'
                  ? `🔴 Vencido (${formatearFechaLatam(entidad.fecha_vencimiento)})`
                  : entidad.plan_servicio === 'ilimitado' || !entidad.fecha_vencimiento
                  ? '🟢 Activo Permanente (Ilimitado)'
                  : `🟢 Activo hasta el ${formatearFechaLatam(entidad.fecha_vencimiento)} (${entidad.dias_restantes} días)`}
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {obtenerEtiquetaPlan(entidad.plan_servicio)}
            </span>
          </div>

          {/* 1. RENOVACIÓN RÁPIDA EN 1 CLIC */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>1. Renovar y Sumar Tiempo en 1 Clic</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('renovar', 'mensual')}
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-center transition-all cursor-pointer group"
              >
                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600">+1 Mes</div>
                <div className="text-[10px] font-semibold text-slate-400">+30 días</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('renovar', 'trimestral')}
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-center transition-all cursor-pointer group"
              >
                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600">+3 Meses</div>
                <div className="text-[10px] font-semibold text-slate-400">+90 días</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('renovar', 'semestral')}
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-center transition-all cursor-pointer group"
              >
                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600">+6 Meses</div>
                <div className="text-[10px] font-semibold text-slate-400">+180 días</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('renovar', 'anual')}
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-center transition-all cursor-pointer group"
              >
                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600">+1 Año</div>
                <div className="text-[10px] font-semibold text-slate-400">+365 días</div>
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => ejecutarAccion('renovar', 'ilimitado')}
              className="mt-2 w-full py-2.5 px-4 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/70 text-sky-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <InfinityIcon size={15} />
              <span>Marcar como Cuenta Permanente / Sin Fecha de Vencimiento</span>
            </button>
          </div>

          {/* 2. FECHA EXACTA EN CALENDARIO */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              2. O elegir una fecha exacta de vencimiento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <button
                type="button"
                disabled={loading || !customDate}
                onClick={() => ejecutarAccion('configurar', entidad.plan_servicio || 'mensual', customDate)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Guardar Fecha
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={corteAuto}
                onChange={(e) => setCorteAuto(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-xs text-slate-600 font-medium">
                Suspender acceso automáticamente si pasa la fecha de vencimiento
              </span>
            </label>
          </div>

          {/* 3. CORTE / REACTIVACIÓN MANUAL INMEDIATA */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {isSuspended ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('reactivar')}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <PlayCircle size={16} />
                <span>Reactivar Servicio del Cliente Ahora</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => ejecutarAccion('suspender')}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PauseCircle size={16} />
                <span>Pausar / Cortar Servicio por Falta de Pago (Sin borrar GPS)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
