import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldAlert, Radio, Bot, Brain, FileCode, Lock, Mail, X, CheckCircle2, 
  ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, Cpu, Activity, 
  Satellite, Navigation, Layers, ChevronRight, Check, Building2, Phone,
  FileText, ExternalLink, MapPin, Gauge, Shield, Truck, Route, Smartphone, Download
} from 'lucide-react';
import { API_BASE_URL, getAssetUrl, isNativeApp } from '../config';
import { usePWA } from '../pwa/usePWA';
import InstallPwaModal from '../pwa/InstallPwaModal';
import MobileLoginView from './MobileLoginView';
import CopaiMasterPortal from './CopaiMasterPortal';

// Detecta si la petición proviene de un subdominio de cliente o parámetro local
function detectTenantSlug() {
  if (typeof window === 'undefined') return null;

  // 1. Prioridad: Parámetro de URL (ideal para pruebas locales: localhost:5173/?empresa=huaynarroque)
  const params = new URLSearchParams(window.location.search);
  const qTenant = params.get('empresa') || params.get('tenant') || params.get('subdominio');
  if (qTenant) return qTenant.toLowerCase().trim();

  // 2. Subdominio en producción (ej. huaynarroque.industriascopai.com)
  const host = window.location.hostname.toLowerCase();
  // Ignorar IPs y localhost puro
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    const reserved = ['www', 'api', 'ws', 'mail', 'app', 'admin', 'copai', 'industriascopai'];
    if (!reserved.includes(sub)) {
      return sub;
    }
  }
  return null;
}

// Helper para verificar si la URL multimedia corresponde a un video en bucle
function isVideoUrl(url) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm');
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tenant / Empresa White-Label (en la app universal Play Store arranca limpio como COPAI al cerrar sesión)
  const [tenantSlug, setTenantSlug] = useState(() => detectTenantSlug());
  const [companyPortal, setCompanyPortal] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Modal de Login
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Hook de PWA oficial para Android e iOS
  const {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    showPrompt,
    setShowPrompt,
    triggerInstall,
    dismissPrompt
  } = usePWA(companyPortal);
  
  // Modal de Recuperación de Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Detección de ejecución como Aplicativo Instalado vs Navegador Web
  // Si está navegando desde un navegador web (Safari, Chrome móvil o PC), siempre renderiza el sitio web corporativo oficial.
  // Solo entra directamente a MobileLoginView si corre como app instalada (Play Store o PWA agregada a inicio en iPhone).
  const [showFullWebPortal, setShowFullWebPortal] = useState(false);

  // Si ya tiene sesión activa, redirigir automáticamente al dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Cargar datos de la empresa si existe un tenant detectado en subdominio
  useEffect(() => {
    const slug = detectTenantSlug();
    setTenantSlug(slug);
    if (slug) {
      setPortalLoading(true);
      axios.get(`${API_BASE_URL}/api/empresas/portal/${slug}`)
        .then(res => {
          setCompanyPortal(res.data);
        })
        .catch(err => {
          console.warn(`Portal white-label para '${slug}' no encontrado:`, err);
          setCompanyPortal(null);
        })
        .finally(() => {
          setPortalLoading(false);
        });
    } else {
      setCompanyPortal(null);
    }
  }, [location.search]);

  // Actualizar título de la pestaña del navegador según la empresa o COPAI
  useEffect(() => {
    if (companyPortal?.nombre) {
      document.title = `${companyPortal.nombre} | Telematics GPS`;
    } else {
      document.title = 'COPAI';
    }
  }, [companyPortal]);

  // Abrir modal si la URL contiene ?login=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('login') === 'true') {
      setShowLoginModal(true);
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, empresa, usuario } = response.data;

      // Validación Multi-Tenant: Si el usuario no es superadmin e intenta ingresar en un subdominio que no es el suyo
      if (companyPortal && usuario.rol !== 'superadmin' && usuario.empresa_id && Number(usuario.empresa_id) !== Number(companyPortal.id)) {
        setError(`Esta cuenta pertenece a otra empresa. Por favor ingresa desde tu portal oficial.`);
        setLoading(false);
        return;
      }

      // Si es superadmin entrando a un subdominio de cliente real, contextualizar la empresa activa a este tenant
      const activeEmpresa = (tenantSlug && companyPortal && (usuario.rol === 'superadmin' || !empresa || empresa.id === 0))
        ? companyPortal
        : (empresa || { id: 0, nombre: 'COPAI', color_primario: '#2563EB' });

      localStorage.setItem('token', access_token);
      localStorage.setItem('empresa', JSON.stringify(activeEmpresa));
      localStorage.removeItem('last_empresa');
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      // Navegar a dashboard vía SPA para transición instantánea y conservar insets de pantalla
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas o usuario inactivo');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email: forgotEmail.trim()
      });
      setForgotSuccess(true);
      setForgotMsg(res.data.message || 'Enlace enviado a tu correo corporativo.');
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Error al solicitar recuperación de contraseña.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Calcular luminancia de un color hexadecimal (#RRGGBB o #RGB)
  const getLuminance = (hex) => {
    if (!hex || typeof hex !== 'string') return 0;
    const clean = hex.replace('#', '').trim();
    let r = 0, g = 0, b = 0;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    }
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  // Trío de colores de marca corporativa (Color Primario, Secundario y Terciario)
  const cPrimario = companyPortal?.color_primario || '#16A34A';
  const cSecundario = companyPortal?.color_secundario || '#FFFFFF';
  const cTerciario = companyPortal?.color_terciario || (companyPortal ? '#CCF5DC' : '#0F172A');

  // Evaluar si el portal de la empresa es de temática clara (ej. fondo menta/blanco) u oscura
  const isLightPortal = companyPortal ? (getLuminance(cTerciario) > 0.45 || (getLuminance(cSecundario) > 0.85 && getLuminance(cTerciario) > 0.35)) : false;

  // EXPERIENCIA MÓVIL DEDICADA:
  // Se activa ÚNICAMENTE si está corriendo como aplicación instalada (Google Play Store o PWA agregada a inicio en iPhone),
  // o si el usuario solicita explícitamente ?app=true en la URL.
  // En cualquier navegador web (Safari / Chrome móvil o PC), siempre se muestra el sitio web oficial de la empresa.
  const isRunningAsApp = Boolean(
    isNativeApp ||
    isStandalone ||
    (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('app') === 'true' || new URLSearchParams(window.location.search).get('mode') === 'app'))
  );

  if (isRunningAsApp && !showFullWebPortal) {
    return (
      <>
        <MobileLoginView
          companyPortal={companyPortal}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loading={loading}
          error={error}
          handleLogin={handleLogin}
          onOpenForgot={() => setShowForgotModal(true)}
          onViewWebPortal={() => setShowFullWebPortal(true)}
          onOpenInstallModal={() => setShowPrompt(true)}
          onTriggerInstall={triggerInstall}
          isInstallable={isInstallable}
          isStandalone={isStandalone}
          isIOS={isIOS}
          isAndroid={isAndroid}
          onResetCompany={null}
        />

        {/* Modal de Recuperación de Contraseña si se activa en móvil */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-white p-7 rounded-3xl border border-slate-200 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-600">
                  <Mail size={20} />
                  <h3 className="font-bold text-base text-slate-900">Recuperar Contraseña</h3>
                </div>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="pt-5">
                {forgotSuccess ? (
                  <div className="text-center py-4 space-y-3">
                    <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                    <p className="text-sm text-slate-800 font-semibold">{forgotMsg}</p>
                    <button
                      onClick={() => setShowForgotModal(false)}
                      className="w-full mt-4 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm"
                    >
                      Volver
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu-correo@empresa.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="px-4 py-2 border text-slate-600 text-xs font-semibold rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                      >
                        {forgotLoading ? 'Enviando...' : 'Enviar Enlace'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        <InstallPwaModal
          show={showPrompt}
          onClose={dismissPrompt}
          onInstall={isInstallable ? triggerInstall : null}
          isIOS={isIOS}
          isAndroid={isAndroid}
          companyName={companyPortal ? companyPortal.nombre : 'COPAI Telematics'}
          logoUrl={companyPortal ? getAssetUrl(companyPortal.logo_url) : '/copai-symbol.png'}
          primaryColor={cPrimario}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden relative bg-white text-slate-900">
      {/* ========================================================================= */}
      {/* CASO A: PORTAL WHITE-LABEL DE EMPRESA CLIENTE (Huaynarroque, Nazareth, etc) */}
      {/* ========================================================================= */}
      {companyPortal ? (
        <div className="relative z-10 flex flex-col min-h-screen bg-white text-slate-900">
          
          {/* Header Superior Corporativo Limpio (Blanco Translúcido estilo Apple) */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-b border-slate-200/80 transition-colors shadow-2xs">
            <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 h-20 flex items-center justify-between gap-4">
              
              {/* Logo y Nombre de la Empresa Cliente */}
              <div 
                className="flex items-center gap-3 sm:gap-4 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {companyPortal.logo_url ? (
                  <img 
                    src={getAssetUrl(companyPortal.logo_url)} 
                    alt={companyPortal.nombre} 
                    className="h-10 sm:h-12 w-auto max-w-[170px] object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-xs border"
                    style={{ 
                      backgroundColor: cPrimario, 
                      color: cSecundario,
                      borderColor: `${cPrimario}30` 
                    }}
                  >
                    {companyPortal.nombre.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-slate-950">
                    {companyPortal.nombre}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cPrimario }} />
                    <span className="text-[11px] font-bold tracking-wide uppercase text-slate-500">
                      Monitoreo Activo 24/7
                    </span>
                    {companyPortal.documento && (
                      <span className="hidden sm:inline text-[11px] font-medium text-slate-400">
                        | RUC: {companyPortal.documento}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* MENÚ DE NAVEGACIÓN DEDICADO PARA LA EMPRESA */}
              <nav className="hidden lg:flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600">
                <button 
                  onClick={() => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-full transition-all cursor-pointer hover:bg-slate-100 hover:text-slate-950"
                >
                  Inicio
                </button>
                {companyPortal.servicios && (
                  <button 
                    onClick={() => document.getElementById('rutas')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-3.5 py-2 rounded-full transition-all cursor-pointer hover:bg-slate-100 hover:text-slate-950"
                  >
                    Rutas &amp; Cobertura
                  </button>
                )}
                <button 
                  onClick={() => document.getElementById('telemetria')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-full transition-all cursor-pointer hover:bg-slate-100 hover:text-slate-950"
                >
                  Telemetría GPS
                </button>
                <button 
                  onClick={() => document.getElementById('seguridad')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-full transition-all cursor-pointer hover:bg-slate-100 hover:text-slate-950"
                >
                  Seguridad
                </button>
                <button 
                  onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-full transition-all cursor-pointer hover:bg-slate-100 hover:text-slate-950"
                >
                  Contacto
                </button>
              </nav>

              {/* Acciones Superiores */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <a 
                  href="https://industriascopai.com" 
                  className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-all"
                  title="Ir al portal principal de COPAI"
                >
                  <img src="/copai-symbol.png" alt="COPAI" className="h-4 w-4 object-contain" />
                  <span>Red COPAI ↗</span>
                </a>

                {!isStandalone && (
                  <button
                    onClick={() => setShowPrompt(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border bg-white hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
                    style={{
                      color: cPrimario,
                      borderColor: `${cPrimario}45`
                    }}
                    title="Instalar App Oficial en tu teléfono (Android o iPhone)"
                  >
                    <Smartphone size={14} />
                    <span className="hidden sm:inline">Instalar App</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}

                {/* BOTÓN SUPERIOR DERECHO: ACCESO CENTRAL DE DESPACHO (Respeta color de la empresa) */}
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="group px-5 sm:px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 hover:brightness-105"
                  style={{
                    backgroundColor: cPrimario,
                    color: cSecundario
                  }}
                >
                  <Lock size={14} />
                  <span>Acceso a Central</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>
          </header>

          {/* CUERPO DEL PORTAL WHITE-LABEL (Alternancia limpia de secciones respetando colores de empresa) */}
          <main className="flex-1">
            
            {/* HERO SECTION PANORÁMICO (FOTO O VIDEO DE LA EMPRESA EN BUCLE) */}
            <section id="inicio" className="relative w-full min-h-[84vh] sm:min-h-[86vh] flex flex-col justify-between overflow-hidden bg-slate-950">
              
              {/* Fondo Multimedia Panorámico (Foto o Video de la empresa) */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {isVideoUrl(companyPortal.banner_url) ? (
                  <video 
                    src={getAssetUrl(companyPortal.banner_url)}
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover object-center filter brightness-[0.88]"
                  >
                    <source src={getAssetUrl(companyPortal.banner_url)} type={companyPortal.banner_url?.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                  </video>
                ) : (
                  <img 
                    src={companyPortal.banner_url ? getAssetUrl(companyPortal.banner_url) : '/banners/huaynarroque_banner.jpg'} 
                    alt={companyPortal.nombre} 
                    className="w-full h-full object-cover object-center filter brightness-[0.88]"
                    onError={(e) => {
                      e.target.src = '/banners/huaynarroque_banner.jpg';
                    }}
                  />
                )}

                {/* Sombra lateral limpia para lectura nítida del título */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              </div>

              {/* Espacio superior para compensar el header flotante */}
              <div className="h-24 sm:h-28" />

              {/* Contenido Central del Hero */}
              <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 py-8 sm:py-12 flex-1 flex flex-col justify-center">
                <div className="max-w-3xl space-y-5">
                  
                  {/* Badge de Estado Satelital con el color primario de la empresa */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold shadow-md w-fit">
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: cPrimario }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cPrimario }} />
                    <span className="tracking-wide uppercase text-[11px]">Sistema de Telemetría &amp; Rastreo Satelital</span>
                  </div>

                  {/* Nombre Principal de la Empresa */}
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.06] drop-shadow-lg">
                    {companyPortal.nombre}
                  </h1>

                  {/* Slogan Corporativo */}
                  <p className="text-base sm:text-xl text-white/95 font-normal leading-relaxed max-w-2xl drop-shadow-sm">
                    {companyPortal.slogan || "Líderes en transporte seguro y puntual, con monitoreo continuo vía GPS satelital."}
                  </p>

                  {/* Botones de Acción Inmediata */}
                  <div className="pt-3 flex flex-wrap items-center gap-3.5">
                    <button
                      onClick={() => {
                        setShowLoginModal(true);
                        setError('');
                      }}
                      className="group px-7 py-3.5 rounded-full font-bold text-sm shadow-xl transition-all duration-200 flex items-center gap-2.5 active:scale-95 cursor-pointer hover:brightness-105"
                      style={{
                        backgroundColor: cPrimario,
                        color: cSecundario
                      }}
                    >
                      <ShieldCheck size={18} />
                      <span>Iniciar Sesión de Despacho</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    {companyPortal.telefono && (
                      <a
                        href={`tel:${companyPortal.telefono}`}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/95 hover:bg-white text-slate-900 text-xs font-bold transition-all shadow-md"
                      >
                        <Phone size={14} style={{ color: cPrimario }} />
                        <span>Central: {companyPortal.telefono}</span>
                      </a>
                    )}

                    {companyPortal.documento && (
                      <div className="hidden sm:flex items-center gap-1.5 px-4 py-3 rounded-full bg-black/45 border border-white/20 text-xs font-semibold text-white backdrop-blur-md">
                        <span>RUC: {companyPortal.documento}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Fila de Métricas y KPIs en Tarjetas Blancas Limpias */}
              <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 pb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  
                  <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${cPrimario}18`, color: cPrimario }}>
                        <Truck size={18} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Flota en Ruta
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-950">
                      {companyPortal.total_vehiculos || 0}
                      <span className="text-xs font-medium text-slate-500 ml-1.5">unidades</span>
                    </p>
                  </div>

                  <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${cPrimario}18`, color: cPrimario }}>
                        <Radio size={18} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        GPS Satelital
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: cPrimario }}>
                      100%
                      <span className="text-xs font-medium text-slate-500 ml-1.5">Teltonika 4G</span>
                    </p>
                  </div>

                  <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${cPrimario}18`, color: cPrimario }}>
                        <Gauge size={18} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Límite Seguro
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: cPrimario }}>
                      {companyPortal.limite_velocidad || 90}
                      <span className="text-xs font-medium text-slate-500 ml-1.5">km/h máx.</span>
                    </p>
                  </div>

                  <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: `${cPrimario}18`, color: cPrimario }}>
                        <ShieldCheck size={18} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Monitoreo
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-950">
                      24 / 7
                      <span className="text-xs font-medium text-slate-500 ml-1.5">telemetría</span>
                    </p>
                  </div>

                </div>
              </div>

            </section>

            {/* SECCIÓN 1 (BLANCA): RUTAS & COBERTURA DE LA EMPRESA */}
            {companyPortal.servicios && (
              <section id="rutas" className="w-full py-16 sm:py-20 bg-white border-b border-slate-200/70 scroll-mt-20">
                <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
                  <div className="rounded-3xl p-7 sm:p-12 bg-[#F5F5F7] border border-slate-200/80">
                    <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: cPrimario, color: cSecundario }}
                      >
                        <Route size={28} />
                      </div>
                      <div className="flex-1 space-y-3">
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cPrimario }}>
                          COBERTURA OPERATIVA
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                          Rutas &amp; Destinos Oficiales
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed text-slate-600">
                          {companyPortal.servicios}
                        </p>
                        
                        {/* Tags de destinos con el color de la empresa */}
                        <div className="flex flex-wrap gap-2 pt-3">
                          {companyPortal.servicios.split(/[-–—,]/).map((tramo, idx) => {
                            const cleanTramo = tramo.trim();
                            if (!cleanTramo || cleanTramo.toLowerCase().startsWith('rutas')) return null;
                            return (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white shadow-2xs"
                                style={{
                                  color: cPrimario,
                                  border: `1px solid ${cPrimario}35`
                                }}
                              >
                                <MapPin size={12} style={{ color: cPrimario }} />
                                <span>{cleanTramo}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SECCIÓN 2 (DE PARED A PARED EN EL COLOR DE LA EMPRESA): TELEMETRÍA & MONITOREO */}
            {(() => {
              const telemetriaBg = isLightPortal ? cTerciario : cPrimario;
              const isVeryLightBand = getLuminance(telemetriaBg) > 0.72;
              return (
                <section
                  id="telemetria"
                  className="w-full py-20 border-b border-slate-200/70 scroll-mt-20"
                  style={{
                    backgroundColor: telemetriaBg
                  }}
                >
                  <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: isVeryLightBand ? cPrimario : '#FFFFFF' }}
                      >
                        TECNOLOGÍA DE FLOTA
                      </span>
                      <h3
                        className="mt-2 text-3xl sm:text-5xl font-black tracking-tight"
                        style={{ color: isVeryLightBand ? '#0F172A' : '#FFFFFF' }}
                      >
                        Telemetría &amp; Monitoreo en Tiempo Real
                      </h3>
                      <p
                        className="text-sm sm:text-base mt-2.5"
                        style={{ color: isVeryLightBand ? '#475569' : 'rgba(255, 255, 255, 0.9)' }}
                      >
                        Nuestra flota opera con tecnología satelital homologada y monitoreada continuamente.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                      
                      <div className="rounded-3xl p-8 sm:p-9 bg-white border border-slate-200/80 shadow-xl">
                        <div 
                          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-6"
                          style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                        >
                          <Navigation size={24} />
                        </div>
                        <h4 className="font-bold text-xl text-slate-950 mb-2.5">
                          Rastreo Satelital GNSS 4G
                        </h4>
                        <p className="text-sm leading-relaxed text-slate-600">
                          Transmisión continua de posición, avenida exacta, velocidad, odómetro satelital y estado de ignición con equipos Teltonika.
                        </p>
                      </div>

                      <div 
                        id="seguridad"
                        className="rounded-3xl p-8 sm:p-9 bg-white border border-slate-200/80 shadow-xl scroll-mt-24"
                      >
                        <div
                          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-6"
                          style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                        >
                          <Gauge size={24} />
                        </div>
                        <h4 className="font-bold text-xl text-slate-950 mb-2.5">
                          Límite Seguro ({companyPortal.limite_velocidad || 90} km/h)
                        </h4>
                        <p className="text-sm leading-relaxed text-slate-600">
                          Control riguroso de velocidad configurado para prevenir incidentes y proteger a los pasajeros en todo el trayecto.
                        </p>
                      </div>

                      <div className="rounded-3xl p-8 sm:p-9 bg-white border border-slate-200/80 shadow-xl">
                        <div 
                          className="w-13 h-13 rounded-2xl flex items-center justify-center mb-6"
                          style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                        >
                          <ShieldCheck size={24} />
                        </div>
                        <h4 className="font-bold text-xl text-slate-950 mb-2.5">
                          Seguridad &amp; Botón de Pánico
                        </h4>
                        <p className="text-sm leading-relaxed text-slate-600">
                          Detección de paradas no autorizadas, avisos ante desconexión de batería y botón de emergencia SOS con alerta sonora inmediata.
                        </p>
                      </div>

                    </div>
                  </div>
                </section>
              );
            })()}

            {/* SECCIÓN 3 (CONTRASTE OSCURO ELEGANTE + BLANCO): CONTACTO & CENTRAL DE DESPACHO */}
            <section id="contacto" className="w-full py-20 bg-white scroll-mt-20">
              <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
                <div className="rounded-3xl p-8 sm:p-14 bg-[#0B0F17] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-3 max-w-xl">
                    <div
                      className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${cPrimario}25`, color: '#FFFFFF' }}
                    >
                      <Building2 size={13} />
                      <span>Central de Despacho &amp; Flota</span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                      ¿Necesitas comunicarte con {companyPortal.nombre}?
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Nuestros operadores y conductores se encuentran enlazados al centro de monitoreo satelital en tiempo real.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {companyPortal.telefono && (
                      <a
                        href={`tel:${companyPortal.telefono}`}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95"
                        style={{
                          backgroundColor: cPrimario,
                          color: cSecundario
                        }}
                      >
                        <Phone size={16} />
                        <span>Llamar: {companyPortal.telefono}</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setShowLoginModal(true);
                        setError('');
                      }}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-sm bg-white text-slate-950 hover:bg-slate-100 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Lock size={15} />
                      <span>Acceso para Operadores</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </main>

          {/* Footer White-Label Limpio */}
          <footer className="w-full border-t border-slate-200/80 bg-[#F5F5F7] py-10 px-4 sm:px-8 lg:px-14 text-center">
            <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm text-slate-900">{companyPortal.nombre}</span>
                {companyPortal.documento && (
                  <span>• RUC {companyPortal.documento}</span>
                )}
              </div>
              <p>
                Infraestructura y telemetría vehicular provista por{' '}
                <a 
                  href="https://industriascopai.com" 
                  className="hover:underline font-bold" 
                  style={{ color: cPrimario }}
                >
                  Industrias CopAI
                </a>
              </p>
            </div>
          </footer>

        </div>
      ) : (

        /* ========================================================================= */
        /* CASO B: MASTER CORPORATE PORTAL DE INDUSTRIAS COPAI (Cuando no hay tenant) */
        /* ========================================================================= */
        <CopaiMasterPortal
          isStandalone={isStandalone}
          onOpenLoginModal={() => {
            setShowLoginModal(true);
            setError('');
          }}
          onOpenInstallModal={() => setShowPrompt(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL UNIFICADO DE INICIAR SESIÓN (Diseño Limpio Blanco estilo Apple)     */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/90 transition-all animate-in zoom-in-95 duration-200 shadow-[0_25px_70px_rgba(15,23,42,0.25)]">
            
            {/* Botón Cerrar Modal */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>

            {/* Encabezado del Modal */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-3.5">
                {companyPortal?.logo_url ? (
                  <img 
                    src={getAssetUrl(companyPortal.logo_url)} 
                    alt={companyPortal.nombre} 
                    className="h-12 object-contain"
                  />
                ) : (
                  <img 
                    src="/logo-copai.png" 
                    alt="CopAI Industrias" 
                    className="h-11 object-contain"
                  />
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {companyPortal ? `Central: ${companyPortal.nombre}` : 'Acceso a Plataforma COPAI'}
              </h2>
              <p 
                className="text-xs mt-1 font-semibold tracking-wide"
                style={{ color: companyPortal ? cPrimario : '#0284C7' }}
              >
                {companyPortal ? 'Autenticación de Flota & Despacho' : 'Autenticación Segura de Clientes & Flota'}
              </p>
            </div>

            {/* Error de credenciales o Aviso de Renovación de Suscripción */}
            {error && (
              (error.startsWith('SERVICIO_SUSPENDIDO:') || error.startsWith('SERVICIO_VENCIDO:')) ? (
                <div className="mb-5 p-4 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl space-y-2.5 text-xs">
                  <div className="font-extrabold text-amber-900 flex items-center gap-2 text-sm">
                    <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
                    <span>Servicio pendiente de renovación</span>
                  </div>
                  <p className="leading-relaxed text-amber-900/90">
                    {error.replace(/^SERVICIO_(SUSPENDIDO|VENCIDO):\s*/, '')}
                  </p>
                  <a
                    href="https://wa.me/51974342536?text=Hola%20Industrias%20CopAI,%20deseo%20renovar%20mi%20suscripci%C3%B3n%20del%20sistema%20GPS."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                  >
                    <Phone size={13} />
                    <span>Contactar Soporte por WhatsApp (+51 974 342 536)</span>
                  </a>
                </div>
              ) : (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2.5 text-xs">
                  <ShieldAlert size={18} className="text-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} style={{ color: companyPortal ? cPrimario : '#0284C7' }} />
                  <span>Correo Electrónico / Usuario</span>
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#F5F5F7] focus:bg-white border border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock size={13} style={{ color: companyPortal ? cPrimario : '#0284C7' }} />
                    <span>Contraseña</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setShowForgotModal(true);
                      setForgotSuccess(false);
                      setForgotError('');
                      setForgotEmail('');
                    }}
                    className="text-xs font-bold hover:underline transition-colors cursor-pointer"
                    style={{ color: companyPortal ? cPrimario : '#0284C7' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-[#F5F5F7] focus:bg-white border border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400 focus:outline-none transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-2 font-bold py-3.5 px-4 rounded-full transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95 shadow-md"
                style={companyPortal ? {
                  backgroundColor: cPrimario,
                  color: cSecundario
                } : {
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF'
                }}
              >
                {loading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <span>Ingresar a la Plataforma</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                {companyPortal 
                  ? `Acceso para operadores autorizados de ${companyPortal.nombre}`
                  : 'Acceso exclusivo para clientes y operadores de Industrias CopAI'}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL RECUPERACIÓN DE CONTRASEÑA ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white p-7 rounded-3xl border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <Mail size={20} />
                <h3 className="font-bold text-base text-slate-900">Recuperar Contraseña</h3>
              </div>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pt-5">
              {forgotSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto animate-bounce" />
                  <p className="text-sm text-slate-800 font-semibold">{forgotMsg}</p>
                  <p className="text-xs text-slate-500">
                    Revisa tu bandeja de entrada o spam. El enlace expira en 2 horas.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setShowLoginModal(true);
                    }}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm"
                  >
                    Volver a Iniciar Sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ingresa el correo corporativo registrado en tu cuenta y te enviaremos de inmediato un enlace seguro desde <strong>notificaciones@industriascopai.com</strong>.
                  </p>

                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                      {forgotError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu-correo@empresa.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                    >
                      {forgotLoading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE INSTALACIÓN PWA MULTI-TENANT (Android / iPhone) */}
      <InstallPwaModal
        show={showPrompt}
        onClose={dismissPrompt}
        onInstall={isInstallable ? triggerInstall : null}
        isIOS={isIOS}
        isAndroid={isAndroid}
        companyName={companyPortal ? companyPortal.nombre : 'COPAI Telematics'}
        logoUrl={companyPortal ? getAssetUrl(companyPortal.logo_url) : '/copai-symbol.png'}
        primaryColor={cPrimario}
      />

    </div>
  );
}
