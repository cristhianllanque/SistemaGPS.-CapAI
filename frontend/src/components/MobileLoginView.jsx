import React from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Download, Globe, Smartphone, Radio, ExternalLink } from 'lucide-react';
import { getAssetUrl, isNativeApp, PLAY_STORE_APP_URL, PLAY_STORE_TESTING_URL, APK_DOWNLOAD_URL } from '../config';

function GooglePlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className="flex-shrink-0">
      <path d="M47.2 24.3C38.3 33.7 33 47.9 33 65.6v380.8c0 17.7 5.3 31.9 14.2 41.3l2.3 2.1 213.6-213.6v-5L49.5 22.2l-2.3 2.1z" fill="#00E676" />
      <path d="M333.6 344.2l-70.5-70.5v-5l70.5-70.5 1.6.9 83.5 47.4c23.8 13.5 23.8 35.7 0 49.3l-83.5 47.4-1.7 1z" fill="#FFD600" />
      <path d="M263.1 273.7L49.5 487.3c7.8 8.3 20.8 9.3 35.3 1.1l248.8-141.4-70.5-73.3z" fill="#FF3D00" />
      <path d="M263.1 238.3l70.5-73.3L84.8 23.6C70.3 15.4 57.3 16.4 49.5 24.7l213.6 213.6z" fill="#00B0FF" />
    </svg>
  );
}

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
  const isCopaiMaster = !companyPortal;
  const primaryColor = companyPortal?.color_primario || '#0284c7';
  const companyName = companyPortal?.nombre || 'COPAI Telematics GPS';
  const logoSrc = companyPortal?.logo_url ? getAssetUrl(companyPortal.logo_url) : '/copai-symbol.png';

  return (
    <div
      className="h-[100dvh] max-h-[100dvh] bg-slate-950 text-white flex flex-col justify-center px-5 relative overflow-hidden select-none"
      style={{
        paddingTop: 'max(0.85rem, calc(0.5rem + var(--android-safe-top, 0px)), calc(0.5rem + env(safe-area-inset-top, 0px)))',
        paddingBottom: 'max(0.9rem, calc(0.65rem + var(--android-safe-bottom, 0px)), calc(0.65rem + env(safe-area-inset-bottom, 0px)))',
        boxShadow: '0 -100px 0 100px #020617, 0 100px 0 100px #020617'
      }}
    >
      
      {/* Luces y degradados de fondo inmersivos (Blanco/Azul Cian Corporativo CopAI o color de empresa) */}
      <div
        className="absolute top-[12%] left-[8%] w-[280px] h-[280px] rounded-full blur-[110px] opacity-25 pointer-events-none"
        style={{ backgroundColor: isCopaiMaster ? '#0ea5e9' : primaryColor }}
      />
      <div
        className="absolute bottom-[-8%] right-[8%] w-[260px] h-[260px] rounded-full blur-[110px] opacity-20 pointer-events-none"
        style={{ backgroundColor: isCopaiMaster ? '#2563eb' : primaryColor }}
      />
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
          backgroundSize: '22px 22px' 
        }} 
      />

      {/* Contenedor Central Unificado (Sin huecos vacíos entre cabecera, tarjeta y pie) */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col gap-4 sm:gap-5">

        {/* Cabecera / Identidad de la Empresa (Compacta y luminosa) */}
        <div className="text-center flex-shrink-0">
          <div
            className="inline-flex items-center justify-center p-2 bg-white rounded-2xl shadow-2xl mb-2.5 ring-2 transition-transform"
            style={{
              width: '68px',
              height: '68px',
              borderColor: isCopaiMaster ? '#38bdf8' : primaryColor,
              boxShadow: isCopaiMaster
                ? '0 8px 28px rgba(14, 165, 233, 0.38), 0 0 0 3px rgba(56, 189, 248, 0.28)'
                : `0 8px 28px ${primaryColor}45, 0 0 0 3px ${primaryColor}30`
            }}
          >
            <img 
              src={logoSrc} 
              alt={companyName}
              className="object-contain rounded-xl"
              style={{ width: '52px', height: '52px', maxWidth: '52px', maxHeight: '52px' }}
              onError={(e) => { e.target.src = '/copai-symbol.png'; }}
            />
          </div>

          <div className="flex items-center justify-center mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-sky-400/25 text-[10px] font-bold uppercase tracking-wider text-sky-200">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: isCopaiMaster ? '#38bdf8' : primaryColor }}
              />
              <span>Telemetría & Rastreo Satelital</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight px-2 truncate">
            {companyName}
          </h1>
          <p className="text-xs text-sky-200/75 mt-0.5 leading-tight">
            {companyPortal ? 'Acceso a Monitoreo y Despacho' : 'Control Central de Flotas IoT'}
          </p>
          {companyPortal && onResetCompany && (
            <button
              type="button"
              onClick={onResetCompany}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline mt-1 inline-block cursor-pointer"
            >
              ¿Cambiar de empresa?
            </button>
          )}
        </div>

        {/* Tarjeta Central de Inicio de Sesión Móvil (Unida armónicamente a cabecera y pie) */}
        <div className="flex-shrink-0">
          <div
            className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3.5 border"
            style={{
              borderColor: isCopaiMaster ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.12)',
              boxShadow: isCopaiMaster
                ? '0 20px 50px rgba(2, 132, 199, 0.18)'
                : '0 20px 50px rgba(0, 0, 0, 0.45)'
            }}
          >
            
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isCopaiMaster ? '#38bdf8' : primaryColor }}
                />
                <span>Iniciar Sesión</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Conexión Segura SSL</span>
              </span>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium animate-in fade-in duration-200 leading-snug">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Input Correo / Usuario */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  Correo Electrónico o Usuario
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400/80" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-white/[0.07] border border-white/15 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:border-sky-400 transition-all"
                    style={{ '--tw-ring-color': isCopaiMaster ? '#38bdf8' : primaryColor }}
                  />
                </div>
              </div>

              {/* Input Contraseña */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={onOpenForgot}
                    className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400/80" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.07] border border-white/15 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:border-sky-400 transition-all"
                    style={{ '--tw-ring-color': isCopaiMaster ? '#38bdf8' : primaryColor }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botón de Ingreso Táctil */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer mt-1"
                style={{
                  background: isCopaiMaster
                    ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                    : primaryColor,
                  boxShadow: isCopaiMaster
                    ? '0 8px 22px rgba(14, 165, 233, 0.4)'
                    : `0 8px 22px ${primaryColor}50`
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
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

        {/* Pie de Página Móvil: Unido inmediatamente debajo de la tarjeta */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
        {!isNativeApp && !isStandalone && (
          isIOS ? (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <Smartphone size={15} className="text-sky-400" />
              <span>Instalar App en mi iPhone (Pantalla Completa)</span>
            </button>
          ) : (
            <div className="w-full flex flex-col gap-1.5">
              {/* Botón Principal: Google Play Store */}
              <a
                href={PLAY_STORE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 no-underline shadow-lg"
              >
                <GooglePlayIcon size={16} />
                <span>Disponible en Google Play</span>
              </a>

              {/* Acceso Directo de Empresa (PWA) si está disponible */}
              {companyPortal && onOpenInstallModal && (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Smartphone size={12} style={{ color: primaryColor }} />
                  <span className="truncate">Agregar icono de {companyName} a Pantalla</span>
                </button>
              )}

              {/* Enlaces de Verificador de Pruebas y Fallback APK */}
              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <a
                  href={PLAY_STORE_TESTING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 font-bold hover:underline"
                >
                  Unirse a prueba cerrada
                </a>
                <a
                  href={APK_DOWNLOAD_URL}
                  download="CopaiGPS.apk"
                  className="hover:text-slate-300 hover:underline"
                >
                  Descargar APK directo
                </a>
              </div>
            </div>
          )
        )}

        {(isNativeApp || isStandalone) && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400">
            <ShieldCheck size={12} />
            <span>Aplicativo Móvil Oficial Activo</span>
          </div>
        )}

        {companyPortal && !isStandalone && !isNativeApp && (
          <button
            type="button"
            onClick={onViewWebPortal}
            className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white transition-colors py-0.5 cursor-pointer"
          >
            <Globe size={13} />
            <span>Ver portal corporativo web completo</span>
          </button>
        )}

        <p className="text-[10px] text-slate-400 text-center leading-tight">
          © 2026 Industrias CopAi • Telematics IoT
        </p>
      </div>
      </div>

    </div>
  );
}
