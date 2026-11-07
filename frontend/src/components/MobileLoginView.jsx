import React from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Download, Globe, Smartphone, Radio } from 'lucide-react';
import { getAssetUrl, isNativeApp } from '../config';

export default function MobileLoginView({
  companyPortal,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  error,
  handleLogin,
  onOpenForgot,
  onViewWebPortal,
  onOpenInstallModal,
  onTriggerInstall,
  isInstallable,
  isStandalone,
  isIOS,
  isAndroid,
  onResetCompany
}) {
  const primaryColor = companyPortal?.color_primario || '#0284c7';
  const companyName = companyPortal?.nombre || 'COPAI Telematics GPS';
  const logoSrc = companyPortal?.logo_url ? getAssetUrl(companyPortal.logo_url) : '/copai-symbol.png';
  const apkHref = 'https://industriascopai.com/descargas/CopaiGPS.apk';
  const apkFileName = 'CopaiGPS.apk';

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col justify-between px-5 relative overflow-hidden select-none"
      style={{
        paddingTop: 'calc(1.5rem + var(--android-safe-top, 0px))',
        paddingBottom: 'calc(1.5rem + var(--android-safe-bottom, 0px))',
        boxShadow: '0 -100px 0 100px #020617, 0 100px 0 100px #020617'
      }}
    >
      
      {/* Luces y degradados de fondo inmersivos (alejados del borde superior para mantener el status bar 100% oscuro) */}
      <div className="absolute top-[18%] left-[10%] w-[320px] h-[320px] rounded-full blur-[120px] opacity-15 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />
      <div className="absolute bottom-[-10%] right-[10%] w-[300px] h-[300px] rounded-full blur-[120px] bg-blue-600 opacity-20 pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Cabecera / Identidad de la Empresa */}
      <div className="relative z-10 text-center pt-4">
        <div className="inline-flex items-center justify-center p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl mb-4">
          <img 
            src={logoSrc} 
            alt={companyName}
            className="w-16 h-16 object-contain drop-shadow"
            onError={(e) => { e.target.src = '/copai-symbol.png'; }}
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
          <span>Telemetría & Rastreo Satelital</span>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight px-2">
          {companyName}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {companyPortal ? 'Acceso a Monitoreo y Despacho' : 'Control Central de Flotas IoT'}
        </p>
        {companyPortal && onResetCompany && (
          <button
            type="button"
            onClick={onResetCompany}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline mt-2 inline-block cursor-pointer"
          >
            ¿Cambiar de empresa?
          </button>
        )}
      </div>

      {/* Tarjeta Central de Inicio de Sesión Móvil */}
      <div className="relative z-10 my-auto py-6">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Iniciar Sesión
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={13} />
              <span>Conexión Segura SSL</span>
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Correo / Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Correo Electrónico o Usuario
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ focusRingColor: primaryColor }}
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={onOpenForgot}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón de Ingreso Táctil Grande */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 rounded-2xl font-black text-sm tracking-wide text-white shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 8px 25px ${primaryColor}50`
              }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando Credenciales...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar a Mi Flota</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Pie de Página Móvil: Instalación Inteligente según iOS / Android y Ver Portal Web */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 pt-2">
        {!isNativeApp && !isStandalone && (
          isIOS ? (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <Smartphone size={16} className="text-sky-400" />
              <span>Instalar App en mi iPhone (Pantalla Completa)</span>
            </button>
          ) : (
            <div className="w-full flex flex-col gap-2">
              {companyPortal && (
                <button
                  type="button"
                  onClick={() => {
                    if (isInstallable && onTriggerInstall) {
                      onTriggerInstall();
                    } else if (onOpenInstallModal) {
                      onOpenInstallModal();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Smartphone size={16} />
                  <span>Instalar App {companyName}</span>
                </button>
              )}
              <a
                href={apkHref}
                download={apkFileName}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 no-underline shadow-lg"
              >
                <Download size={16} className="text-emerald-400" />
                <span>Descargar App Oficial COPAI (.APK)</span>
              </a>
            </div>
          )
        )}

        {(isNativeApp || isStandalone) && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
            <ShieldCheck size={12} />
            <span>Aplicativo Móvil Oficial Activo</span>
          </div>
        )}

        {companyPortal && !isStandalone && !isNativeApp && (
          <button
            type="button"
            onClick={onViewWebPortal}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1 cursor-pointer"
          >
            <Globe size={14} />
            <span>Ver portal corporativo web completo</span>
          </button>
        )}

        <p className="text-[10px] text-slate-500 text-center">
          © 2026 Industrias CopAi • Telematics IoT
        </p>
      </div>

    </div>
  );
}
