import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone, ShieldCheck, Bell, ExternalLink } from 'lucide-react';
import { PLAY_STORE_APP_URL, PLAY_STORE_TESTING_URL, APK_DOWNLOAD_URL } from '../config';

function GooglePlayIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className="flex-shrink-0">
      <path d="M47.2 24.3C38.3 33.7 33 47.9 33 65.6v380.8c0 17.7 5.3 31.9 14.2 41.3l2.3 2.1 213.6-213.6v-5L49.5 22.2l-2.3 2.1z" fill="#00E676" />
      <path d="M333.6 344.2l-70.5-70.5v-5l70.5-70.5 1.6.9 83.5 47.4c23.8 13.5 23.8 35.7 0 49.3l-83.5 47.4-1.7 1z" fill="#FFD600" />
      <path d="M263.1 273.7L49.5 487.3c7.8 8.3 20.8 9.3 35.3 1.1l248.8-141.4-70.5-73.3z" fill="#FF3D00" />
      <path d="M263.1 238.3l70.5-73.3L84.8 23.6C70.3 15.4 57.3 16.4 49.5 24.7l213.6 213.6z" fill="#00B0FF" />
    </svg>
  );
}

export default function InstallPwaModal({
  show,
  onClose,
  onInstall,
  isIOS,
  isAndroid,
  companyName = 'COPAI Telematics',
  logoUrl = '/copai-symbol.png',
  primaryColor = '#16A34A'
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-3 sm:px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{
        paddingTop: 'calc(0.75rem + var(--android-safe-top, 0px))',
        paddingBottom: 'calc(0.75rem + var(--android-safe-bottom, 0px))'
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '90vh' }}
      >
        {/* Cabecera con degradado sutil */}
        <div 
          className="p-5 pb-4 flex items-center justify-between border-b border-slate-100"
          style={{ backgroundColor: `${primaryColor}08` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={companyName} 
                className="w-full h-full object-contain"
                onError={(e) => { e.target.src = '/copai-symbol.png'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  App Oficial
                </span>
                <span className="text-[10px] text-slate-400 font-medium">v1.0</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {companyName}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Central */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Beneficios */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
              <Bell size={16} style={{ color: primaryColor }} className="flex-shrink-0" />
              <span className="font-semibold">Alertas sonoras al celular</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
              <ShieldCheck size={16} style={{ color: primaryColor }} className="flex-shrink-0" />
              <span className="font-semibold">Acceso rápido 24/7</span>
            </div>
          </div>

          {/* Guía Específica para iPhone (iOS Safari) */}
          {isIOS ? (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Smartphone size={16} className="text-amber-600" />
                <span>Instalación directa en iPhone</span>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Pulsa el botón <strong>Compartir</strong> en la barra inferior de Safari (<Share size={13} className="inline text-blue-600" />).
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Desplaza hacia abajo y selecciona <strong className="text-slate-900">"Agregar a inicio"</strong> (<PlusSquare size={13} className="inline text-slate-700" />).
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Pulsa <strong className="text-blue-600">"Agregar"</strong> arriba a la derecha. ¡La app aparecerá en tu pantalla con su propio icono!
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* Guía para Android / PC */
            <div className="text-center py-2 space-y-2">
              <p className="text-xs text-slate-600">
                Instala la aplicación en tu pantalla de inicio para una experiencia fluida a pantalla completa, sin barras de navegador.
              </p>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="p-4 pt-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
          {!isIOS ? (
            <div className="flex flex-col gap-2.5">
              {/* Botón Principal Oficial: Google Play Store */}
              <a
                href={PLAY_STORE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 no-underline border border-slate-800 text-left cursor-pointer"
              >
                <GooglePlayIcon size={24} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider leading-none">
                    Descarga Oficial Verificada
                  </div>
                  <div className="text-sm font-black text-white tracking-wide mt-0.5">
                    Disponible en Google Play
                  </div>
                </div>
                <ExternalLink size={16} className="text-slate-400" />
              </a>

              {/* Botón de Instalación Directa PWA de la Empresa (si está soportado en el navegador) */}
              {onInstall && companyName && (
                <button
                  type="button"
                  onClick={onInstall}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Smartphone size={15} style={{ color: primaryColor }} />
                  <span>Agregar icono de {companyName} a Pantalla</span>
                </button>
              )}

              {/* Enlaces de Verificador de Pruebas y Fallback APK */}
              <div className="flex items-center justify-between px-1.5 pt-0.5 text-[11px]">
                <a
                  href={PLAY_STORE_TESTING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                >
                  <span>¿Verificador de pruebas? Unirse aquí</span>
                </a>
                <a
                  href={APK_DOWNLOAD_URL}
                  download="CopaiGPS.apk"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:underline"
                  title="Descarga manual de instalador APK directo para dispositivos sin Google Play"
                >
                  Descargar APK directo
                </a>
              </div>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <span>¡Entendido! Lo instalaré en mi iPhone</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors text-center cursor-pointer"
          >
            Continuar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
