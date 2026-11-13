import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User, Mail, Building2, Shield, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, LogOut, ShieldCheck, FileText, Trash2
} from 'lucide-react';
import { API_BASE_URL, getAssetUrl } from '../config';
import { siren } from '../utils/sound';

export default function ProfilePage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
  const rawEmpresa = localStorage.getItem('empresa');
  const empresa = (rawEmpresa && rawEmpresa !== 'null' && rawEmpresa !== 'undefined')
    ? (JSON.parse(rawEmpresa) || {})
    : {};

  const primaryColor = empresa?.color_primario || '#2563EB';
  const isParticular = empresa?.tipo === 'particular';
  const roleLabel = isParticular
    ? 'Cliente Particular'
    : (usuario?.rol === 'superadmin'
        ? 'Superadministrador Central'
        : (usuario?.rol === 'admin' ? 'Gerencia / Administrador' : 'Operador de Monitoreo'));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.trim().length < 6) {
      setError('La nueva contraseña debe tener como mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess(res.data?.message || 'Tu contraseña ha sido actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo actualizar la contraseña. Verifica tu clave actual.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanLogout = () => {
    siren.stop();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresa');
    localStorage.removeItem('last_empresa');
    localStorage.clear();
    document.title = 'COPAI';
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5 pb-8">
      {/* Cabecera de Identidad Personal y Empresa */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div
          className="h-16 sm:h-20 w-full relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0f172a 0%, ${primaryColor} 100%)`
          }}
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          />
        </div>
        <div className="px-4 sm:px-5 pb-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="-mt-8 sm:-mt-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-lg border border-slate-200 ring-4 ring-white flex items-center justify-center flex-shrink-0 relative z-10 overflow-hidden"
              style={{ width: '68px', height: '68px', minWidth: '68px', minHeight: '68px' }}
            >
              {empresa?.logo_url ? (
                <img
                  src={getAssetUrl(empresa.logo_url)}
                  alt={empresa.nombre || 'Empresa'}
                  className="w-14 h-14 object-contain rounded-xl"
                  style={{ width: '54px', height: '54px', maxWidth: '54px', maxHeight: '54px' }}
                  onError={(e) => { e.target.src = '/copai-symbol.png'; }}
                />
              ) : usuario?.rol === 'superadmin' ? (
                <img
                  src="/copai-symbol.png"
                  alt="COPAI"
                  className="w-14 h-14 object-contain rounded-xl"
                  style={{ width: '54px', height: '54px', maxWidth: '54px', maxHeight: '54px' }}
                />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-white text-2xl font-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(usuario?.nombre || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-white shadow-xs mb-1"
                style={{ backgroundColor: primaryColor }}
              >
                <Shield size={11} />
                <span>{roleLabel}</span>
              </span>
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 truncate leading-tight">
                {usuario?.nombre || 'Usuario Activo'}
              </h1>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <Mail size={13} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{usuario?.email || 'Sin correo'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCleanLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition-colors cursor-pointer flex-shrink-0"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Building2 size={16} style={{ color: primaryColor }} className="flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Organización / Cuenta</span>
              <strong className="font-bold text-slate-800 truncate block">
                {empresa?.nombre && empresa.id !== 0 ? empresa.nombre : 'COPAI Telematics Central'}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <User size={16} style={{ color: primaryColor }} className="flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Estado de Acceso</span>
              <strong className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Sesión Verificada y Cifrada</span>
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Cambio de Contraseña Personal */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            <Lock size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Cambiar mi Contraseña</h2>
            <p className="text-xs text-slate-500">Actualiza tu clave personal de ingreso de forma inmediata</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contraseña Actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primaryColor }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primaryColor }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primaryColor }}
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Actualizando clave...' : 'Guardar Nueva Contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Información de Privacidad y Gestión de Datos (Cumplimiento Google Play Store) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Privacidad, Seguridad de Datos y Gestión de Cuenta</p>
            <p className="text-slate-500 mt-0.5">
              Tus datos y telemetría están aislados para tu empresa bajo cifrado TLS. Puedes consultar nuestra política o solicitar baja de datos en cualquier momento.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/privacidad"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold no-underline transition-colors"
          >
            <FileText size={14} />
            <span>Privacidad</span>
          </Link>
          <a
            href="mailto:industriascopai@gmail.com?subject=Solicitud%20de%20Eliminacion%20de%20Cuenta%20COPAI%20GPS"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold no-underline transition-colors"
          >
            <Trash2 size={14} />
            <span>Baja de Datos</span>
          </a>
        </div>
      </div>
    </div>
  );
}
