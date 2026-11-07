import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, MapPin, Trash2, Mail, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 no-underline"
          >
            <ArrowLeft size={15} />
            <span>Volver al Portal COPAI</span>
          </Link>
          <span className="text-[11px] text-slate-400">Última actualización: Noviembre 2026</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Política de Privacidad y Seguridad de Datos
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                COPAI Telematics GPS • Industrias CopAi (Perú)
              </p>
            </div>
          </div>

          <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock size={17} className="text-emerald-400" />
              <span>1. Responsable del Tratamiento</span>
            </h2>
            <p>
              <strong>Industrias CopAi</strong> (&ldquo;COPAI Telematics GPS&rdquo;) opera la plataforma web y aplicación móvil oficial
              para monitoreo satelital de flotas corporativas y vehículos particulares. Nos comprometemos a proteger la privacidad,
              confidencialidad y seguridad de la información de nuestros clientes, conductores y operadores.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin size={17} className="text-sky-400" />
              <span>2. Uso de Datos de Ubicación (GPS)</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>
                <strong>Telemetría del Vehículo:</strong> Las coordenadas GPS, velocidad, estado de motor y alertas de seguridad
                provienen de los equipos hardware Teltonika instalados en las unidades autorizadas por la empresa titular o propietario.
              </li>
              <li>
                <strong>Ubicación del Dispositivo Móvil (Permiso de Ubicación Precisa):</strong> La aplicación móvil solicita acceso
                opcional al GPS del teléfono únicamente <strong>mientras la aplicación está en uso</strong> para mostrar la posición
                actual del usuario en el mapa y trazar la ruta asistida (&ldquo;Cómo llegar al vehículo&rdquo;). No rastreamos ni vendemos
                la ubicación del teléfono móvil a terceros con fines publicitarios.
              </li>
            </ul>
          </section>

          <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-white">3. Cifrado y Almacenamiento Seguro</h2>
            <p>
              Todas las comunicaciones entre la aplicación móvil, los navegadores web y nuestros servidores se transmiten mediante
              cifrado <strong>HTTPS / TLS (SSL)</strong> y autenticación mediante tokens seguros. El acceso está estrictamente aislado
              por empresa cliente (arquitectura Multi-Tenant).
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 size={17} className="text-rose-400" />
              <span>4. Retención y Solicitud de Eliminación de Cuenta / Datos</span>
            </h2>
            <p>
              Los titulares de cuenta o administradores corporativos pueden solicitar en cualquier momento la actualización, exportación
              o eliminación definitiva de su cuenta de usuario y datos asociados escribiendo a nuestro canal oficial de soporte y privacidad:
            </p>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-2 text-xs font-semibold text-sky-400">
              <Mail size={15} />
              <a href="mailto:industriascopai@gmail.com" className="text-sky-400 hover:underline">
                industriascopai@gmail.com
              </a>
              <span className="text-slate-500">• Atención en máximo 48 horas hábiles.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

