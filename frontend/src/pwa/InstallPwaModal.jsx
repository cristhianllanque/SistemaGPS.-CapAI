import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone, ShieldCheck, Bell } from 'lucide-react';

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
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
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
        <div className="p-4 pt-2 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          {!isIOS ? (
            <button
              onClick={onInstall}
              className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <Download size={18} />
              <span>Instalar Aplicación en Celular</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <span>¡Entendido! Lo instalaré ahora</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors text-center cursor-pointer"
          >
            Continuar en el navegador web
          </button>
        </div>
      </div>
    </div>
  );
}
