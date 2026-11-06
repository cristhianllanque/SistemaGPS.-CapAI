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

  // Tenant / Empresa White-Label
  const [tenantSlug, setTenantSlug] = useState(() => detectTenantSlug());
  const [companyPortal, setCompanyPortal] = useState(() => {
    const slug = detectTenantSlug();
    if (!slug && isNativeApp) {
      try {
        const last = localStorage.getItem('last_empresa');
        if (last) {
          const parsed = JSON.parse(last);
          if (parsed && parsed.id && parsed.id !== 0) return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
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

  // Detección de dispositivo móvil vs escritorio (App Nativa siempre es móvil)
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNativeApp || window.innerWidth <= 768;
  });
  const [showFullWebPortal, setShowFullWebPortal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(isNativeApp || window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    } else if (!isNativeApp) {
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
      if (isNativeApp && activeEmpresa && activeEmpresa.id !== 0) {
        localStorage.setItem('last_empresa', JSON.stringify(activeEmpresa));
      } else {
        localStorage.removeItem('last_empresa');
      }
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      // Navegar a dashboard
      window.location.href = '/dashboard';
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

  // EXPERIENCIA MÓVIL DEDICADA (Si está en celular y no ha solicitado ver el portal web de escritorio)
  if (isMobileScreen && !showFullWebPortal) {
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
          isStandalone={isStandalone}
          isIOS={isIOS}
          isAndroid={isAndroid}
          onResetCompany={() => {
            localStorage.removeItem('last_empresa');
            setCompanyPortal(null);
          }}
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
          onInstall={triggerInstall}
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
    <div 
      className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-300 ${
        companyPortal
          ? (isLightPortal ? 'text-slate-900' : 'text-slate-100')
          : 'bg-[#020617] text-slate-100'
      }`}
      style={companyPortal ? {
        backgroundColor: isLightPortal ? cTerciario : '#020617',
        color: isLightPortal ? '#0F172A' : '#F8FAFC'
      } : {
        backgroundColor: '#020617',
        color: '#F8FAFC'
      }}
    >
      {/* ========================================================================= */}
      {/* CASO A: PORTAL WHITE-LABEL DE EMPRESA CLIENTE (Huaynarroque, Nazareth, etc) */}
      {/* ========================================================================= */}
      {companyPortal ? (
        <div 
          className="relative z-10 flex flex-col min-h-screen transition-colors duration-300"
          style={{
            backgroundColor: isLightPortal ? cTerciario : '#020617',
            color: isLightPortal ? '#0F172A' : '#F8FAFC'
          }}
        >
          
          {/* Header Superior Corporativo de la Empresa con Menú Completo */}
          <header 
            className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b transition-colors shadow-xs"
            style={{
              backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(2, 6, 23, 0.88)',
              borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
              
              {/* Logo y Nombre de la Empresa Cliente */}
              <div 
                className="flex items-center gap-3 sm:gap-4 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {companyPortal.logo_url ? (
                  <img 
                    src={getAssetUrl(companyPortal.logo_url)} 
                    alt={companyPortal.nombre} 
                    className="h-10 sm:h-12 w-auto max-w-[170px] object-contain drop-shadow-sm"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-md border"
                    style={{ 
                      backgroundColor: cPrimario, 
                      color: cSecundario,
                      borderColor: `${cSecundario}30` 
                    }}
                  >
                    {companyPortal.nombre.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 
                    className="text-base sm:text-lg font-black tracking-tight leading-none"
                    style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                  >
                    {companyPortal.nombre}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cPrimario }} />
                    <span 
                      className="text-[11px] font-bold font-mono tracking-wide uppercase"
                      style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                    >
                      Monitoreo Activo 24/7
                    </span>
                    {companyPortal.documento && (
                      <span 
                        className="hidden sm:inline text-[11px] font-mono"
                        style={{ color: isLightPortal ? '#64748B' : '#64748B' }}
                      >
                        | RUC: {companyPortal.documento}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* MENÚ DE NAVEGACIÓN DEDICADO PARA LA EMPRESA */}
              <nav className="hidden lg:flex items-center gap-2 text-xs font-bold tracking-wide">
                <button 
                  onClick={() => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100/80 active:scale-95"
                  style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}
                >
                  Inicio
                </button>
                {companyPortal.servicios && (
                  <button 
                    onClick={() => document.getElementById('rutas')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-3.5 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100/80 active:scale-95"
                    style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}
                  >
                    Rutas & Cobertura
                  </button>
                )}
                <button 
                  onClick={() => document.getElementById('telemetria')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100/80 active:scale-95"
                  style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}
                >
                  Telemetría GPS
                </button>
                <button 
                  onClick={() => document.getElementById('seguridad')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100/80 active:scale-95"
                  style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}
                >
                  Seguridad
                </button>
                <button 
                  onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-3.5 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-100/80 active:scale-95"
                  style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}
                >
                  Contacto
                </button>
              </nav>

              {/* Acciones Superiores */}
              <div className="flex items-center gap-3 sm:gap-4">
                <a 
                  href="https://industriascopai.com" 
                  className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                  style={{
                    color: isLightPortal ? '#475569' : '#94A3B8',
                    borderColor: isLightPortal ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                    backgroundColor: isLightPortal ? '#F8FAFC' : 'rgba(255,255,255,0.05)'
                  }}
                  title="Ir al portal principal de COPAI"
                >
                  <img src="/copai-symbol.png" alt="COPAI" className="h-4 w-4 object-contain" />
                  <span>Red COPAI ↗</span>
                </a>

                {!isStandalone && (
                  <button
                    onClick={() => setShowPrompt(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
                    style={{
                      backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                      color: cPrimario,
                      borderColor: `${cPrimario}40`
                    }}
                    title="Instalar App Oficial en tu teléfono (Android o iPhone)"
                  >
                    <Smartphone size={14} />
                    <span className="hidden sm:inline">Instalar App</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}

                {/* BOTÓN SUPERIOR DERECHO: ACCESO CENTRAL DE DESPACHO */}
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="group px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 border hover:brightness-110"
                  style={{
                    backgroundColor: cPrimario,
                    color: cSecundario,
                    borderColor: `${cSecundario}30`,
                    boxShadow: `0 4px 15px ${cPrimario}40`
                  }}
                >
                  <Lock size={14} className="group-hover:rotate-12 transition-transform" />
                  <span>Acceso a Central</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          </header>

          {/* CUERPO DEL PORTAL WHITE-LABEL */}
          <main className="flex-1">
            
            {/* HERO SECTION PANORÁMICO (FOTO O VIDEO EN BUCLE) */}
            <section id="inicio" className="relative w-full min-h-[85vh] sm:min-h-[88vh] flex flex-col justify-between overflow-hidden">
              
              {/* Fondo Multimedia Panorámico (Foto o Video) */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {isVideoUrl(companyPortal.banner_url) ? (
                  <video 
                    src={getAssetUrl(companyPortal.banner_url)}
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05]"
                  >
                    <source src={getAssetUrl(companyPortal.banner_url)} type={companyPortal.banner_url?.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                  </video>
                ) : (
                  <img 
                    src={companyPortal.banner_url ? getAssetUrl(companyPortal.banner_url) : '/banners/huaynarroque_banner.jpg'} 
                    alt={companyPortal.nombre} 
                    className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05]"
                    onError={(e) => {
                      e.target.src = '/banners/huaynarroque_banner.jpg';
                    }}
                  />
                )}

                {/* Gradiente de sombra superior para contraste perfecto de textos */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                
                {/* Gradiente inferior dinámico que se funde perfectamente con el color de la empresa */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: isLightPortal
                      ? `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, ${cTerciario}B3 82%, ${cTerciario} 100%)`
                      : 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(2,6,23,0.4) 50%, #020617 100%)'
                  }}
                />
              </div>

              {/* Espacio superior para compensar el header flotante */}
              <div className="h-24 sm:h-28" />

              {/* Contenido Central del Hero */}
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
                <div className="max-w-3xl space-y-5">
                  
                  {/* Badge de Estado Satelital */}
                  <div 
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md text-xs font-semibold shadow-lg w-fit"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      borderColor: `${cPrimario}50`,
                      color: '#FFFFFF'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: cPrimario }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cPrimario }} />
                    <span className="tracking-wide uppercase font-mono text-[11px]">Sistema de Telemetría & Rastreo Satelital</span>
                  </div>

                  {/* Nombre Principal de la Empresa */}
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] drop-shadow-xl">
                    {companyPortal.nombre}
                  </h1>

                  {/* Slogan Corporativo */}
                  <p className="text-base sm:text-xl text-white font-light leading-relaxed max-w-2xl drop-shadow-md">
                    {companyPortal.slogan || "Líderes en transporte seguro y puntual, con monitoreo continuo vía GPS satelital."}
                  </p>

                  {/* Botones de Acción Inmediata */}
                  <div className="pt-3 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => {
                        setShowLoginModal(true);
                        setError('');
                      }}
                      className="group px-7 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-300 flex items-center gap-2.5 active:scale-95 cursor-pointer hover:brightness-110 border"
                      style={{
                        backgroundColor: cPrimario,
                        color: cSecundario,
                        borderColor: `${cSecundario}30`,
                        boxShadow: `0 10px 30px ${cPrimario}50`
                      }}
                    >
                      <ShieldCheck size={18} />
                      <span>Iniciar Sesión de Despacho</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    {companyPortal.telefono && (
                      <a
                        href={`tel:${companyPortal.telefono}`}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-xl border backdrop-blur-md text-xs font-semibold text-white transition-all shadow-md bg-slate-900/70 hover:bg-slate-900/90 border-white/20"
                      >
                        <Phone size={14} style={{ color: cPrimario }} />
                        <span>Central: {companyPortal.telefono}</span>
                      </a>
                    )}

                    {companyPortal.documento && (
                      <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-200 backdrop-blur-sm">
                        <span>RUC: {companyPortal.documento}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Fila de Métricas y KPIs Flotantes */}
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  
                  <div 
                    className="backdrop-blur-xl border rounded-2xl p-4 sm:p-5 transition-all shadow-xl"
                    style={{
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}>
                        <Truck size={18} />
                      </div>
                      <span 
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
                      >
                        Flota en Ruta
                      </span>
                    </div>
                    <p 
                      className="text-2xl sm:text-3xl font-black"
                      style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                    >
                      {companyPortal.total_vehiculos || 0}
                      <span className="text-xs font-normal opacity-70 ml-1.5">unidades</span>
                    </p>
                  </div>

                  <div 
                    className="backdrop-blur-xl border rounded-2xl p-4 sm:p-5 transition-all shadow-xl"
                    style={{
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}>
                        <Radio size={18} />
                      </div>
                      <span 
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
                      >
                        GPS Satelital
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: cPrimario }}>
                      100%
                      <span className="text-xs font-normal opacity-70 ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>Teltonika 4G</span>
                    </p>
                  </div>

                  <div 
                    className="backdrop-blur-xl border rounded-2xl p-4 sm:p-5 transition-all shadow-xl"
                    style={{
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}>
                        <Gauge size={18} />
                      </div>
                      <span 
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
                      >
                        Límite Seguro
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black" style={{ color: cPrimario }}>
                      {companyPortal.limite_velocidad || 90}
                      <span className="text-xs font-normal opacity-70 ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>km/h máx.</span>
                    </p>
                  </div>

                  <div 
                    className="backdrop-blur-xl border rounded-2xl p-4 sm:p-5 transition-all shadow-xl"
                    style={{
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                      borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}>
                        <ShieldCheck size={18} />
                      </div>
                      <span 
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
                      >
                        Monitoreo
                      </span>
                    </div>
                    <p 
                      className="text-2xl sm:text-3xl font-black"
                      style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                    >
                      24 / 7
                      <span className="text-xs font-normal opacity-70 ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>telemetría</span>
                    </p>
                  </div>

                </div>
              </div>

            </section>

            {/* SECCIÓN RUTAS, COBERTURA Y TECNOLOGÍA */}
            <div 
              className="py-16 sm:py-24 transition-colors"
              style={{
                backgroundColor: isLightPortal ? cTerciario : '#020617'
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                
                {/* Rutas y Cobertura Operativa de la Flota */}
                {companyPortal.servicios && (
                  <section id="rutas" className="scroll-mt-24">
                    <div 
                      className="rounded-3xl p-6 sm:p-10 border shadow-lg transition-all"
                      style={{
                        backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(15, 23, 42, 0.7)',
                        borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                          style={{ backgroundColor: cPrimario, color: cSecundario }}
                        >
                          <Route size={28} />
                        </div>
                        <div className="flex-1 space-y-3">
                          <h3 
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                          >
                            Rutas & Destinos Oficiales
                          </h3>
                          <p 
                            className="text-sm sm:text-base leading-relaxed"
                            style={{ color: isLightPortal ? '#475569' : '#CBD5E1' }}
                          >
                            {companyPortal.servicios}
                          </p>
                          
                          {/* Tags de destinos */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {companyPortal.servicios.split(/[-–—,]/).map((tramo, idx) => {
                              const cleanTramo = tramo.trim();
                              if (!cleanTramo || cleanTramo.toLowerCase().startsWith('rutas')) return null;
                              return (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                                  style={{
                                    backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 41, 59, 0.8)',
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
                  </section>
                )}

                {/* Pilares Tecnológicos de la Flota */}
                <section id="telemetria" className="scroll-mt-24">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <h3 
                      className="text-3xl sm:text-4xl font-black tracking-tight"
                      style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                    >
                      Telemetría & Monitoreo en Tiempo Real
                    </h3>
                    <p 
                      className="text-sm mt-2"
                      style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                    >
                      Nuestra flota opera con tecnología de grado industrial homologada y monitoreada continuamente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div 
                      className="rounded-3xl p-7 border transition-all hover:shadow-lg"
                      style={{
                        backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(15, 23, 42, 0.6)',
                        borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                        style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}
                      >
                        <Navigation size={24} />
                      </div>
                      <h4 
                        className="font-bold text-lg mb-2"
                        style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                      >
                        Rastreo Satelital GNSS 4G
                      </h4>
                      <p 
                        className="text-xs sm:text-sm leading-relaxed"
                        style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                      >
                        Transmisión continua de posición, velocidad, odómetro satelital y estado de ignición con redundancia multi-operador Teltonika.
                      </p>
                    </div>

                    <div 
                      id="seguridad"
                      className="rounded-3xl p-7 border transition-all hover:shadow-lg scroll-mt-24"
                      style={{
                        backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(15, 23, 42, 0.6)',
                        borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}>
                        <Gauge size={24} />
                      </div>
                      <h4 
                        className="font-bold text-lg mb-2"
                        style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                      >
                        Límite Seguro ({companyPortal.limite_velocidad || 90} km/h)
                      </h4>
                      <p 
                        className="text-xs sm:text-sm leading-relaxed"
                        style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                      >
                        Control riguroso de velocidad configurado por contrato para prevenir incidentes y proteger a los pasajeros en carretera.
                      </p>
                    </div>

                    <div 
                      className="rounded-3xl p-7 border transition-all hover:shadow-lg"
                      style={{
                        backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(15, 23, 42, 0.6)',
                        borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                        style={{ backgroundColor: `${cPrimario}20`, color: cPrimario }}
                      >
                        <ShieldCheck size={24} />
                      </div>
                      <h4 
                        className="font-bold text-lg mb-2"
                        style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                      >
                        Seguridad & Botón de Pánico
                      </h4>
                      <p 
                        className="text-xs sm:text-sm leading-relaxed"
                        style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                      >
                        Detección de paradas no autorizadas, avisos ante desconexión de batería y botón de emergencia con alerta sonora inmediata.
                      </p>
                    </div>

                  </div>
                </section>

                {/* SECCIÓN CONTACTO & CENTRAL */}
                <section id="contacto" className="scroll-mt-24">
                  <div 
                    className="rounded-3xl p-8 sm:p-12 border shadow-xl flex flex-col md:flex-row items-center justify-between gap-8"
                    style={{
                      backgroundColor: isLightPortal ? '#FFFFFF' : 'rgba(15, 23, 42, 0.9)',
                      borderColor: isLightPortal ? `${cPrimario}30` : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="space-y-3 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}>
                        <Building2 size={13} />
                        <span>Central de Despacho & Flota</span>
                      </div>
                      <h3 
                        className="text-2xl sm:text-3xl font-black tracking-tight"
                        style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}
                      >
                        ¿Necesitas comunicarte con {companyPortal.nombre}?
                      </h3>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}
                      >
                        Nuestros operadores y conductores se encuentran enlazados al centro de monitoreo satelital en tiempo real.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                      {companyPortal.telefono && (
                        <a
                          href={`tel:${companyPortal.telefono}`}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95"
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
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:bg-slate-50 active:scale-95"
                        style={{
                          borderColor: isLightPortal ? '#CBD5E1' : '#334155',
                          color: isLightPortal ? '#0F172A' : '#FFFFFF'
                        }}
                      >
                        <Lock size={15} />
                        <span>Acceso para Conductores</span>
                      </button>
                    </div>
                  </div>
                </section>

              </div>
            </div>

          </main>

          {/* Footer White-Label */}
          <footer 
            className="border-t py-10 px-4 text-center transition-colors"
            style={{
              backgroundColor: isLightPortal ? '#FFFFFF' : '#020617',
              borderColor: isLightPortal ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>{companyPortal.nombre}</span>
                {companyPortal.documento && (
                  <span style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>• RUC {companyPortal.documento}</span>
                )}
              </div>
              <p style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>
                Infraestructura y telemetría vehicular provista por{' '}
                <a 
                  href="https://industriascopai.com" 
                  className="hover:underline font-bold" 
                  style={{ color: cPrimario }}
                >
                  COPAI Telematics
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
      {/* MODAL UNIFICADO DE INICIAR SESIÓN (Adaptado para CopAI o Empresa Cliente) */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md p-7 sm:p-9 rounded-3xl border transition-all animate-in zoom-in-95 duration-200 shadow-2xl"
            style={{
              backgroundColor: companyPortal ? (isLightPortal ? '#FFFFFF' : '#0B1320') : '#081022',
              borderColor: companyPortal ? `${cPrimario}50` : 'rgba(6, 182, 212, 0.35)',
              boxShadow: companyPortal ? `0 25px 60px ${cPrimario}30` : '0 25px 70px rgba(6, 182, 212, 0.22)'
            }}
          >
            
            {/* Botón Cerrar Modal */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl transition-colors cursor-pointer"
              style={{ color: companyPortal && isLightPortal ? '#64748B' : '#94A3B8' }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>

            {/* Encabezado del Modal */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-3">
                {companyPortal?.logo_url ? (
                  <img 
                    src={getAssetUrl(companyPortal.logo_url)} 
                    alt={companyPortal.nombre} 
                    className="h-12 object-contain"
                  />
                ) : (
                  <img 
                    src="/copai-media/logo-copai-dark.png" 
                    alt="CopAI Industrias" 
                    className="h-12 object-contain"
                  />
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: companyPortal && isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                {companyPortal ? `Central: ${companyPortal.nombre}` : 'Acceso a Plataforma COPAI'}
              </h2>
              <p 
                className="text-xs mt-1 font-semibold tracking-wide"
                style={{ color: companyPortal ? cPrimario : '#22D3EE' }}
              >
                {companyPortal ? 'Autenticación de Flota & Despacho' : 'Autenticación Segura de Clientes & Flota'}
              </p>
            </div>

            {/* Error de credenciales */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl flex items-center gap-2.5 text-xs animate-shake">
                <ShieldAlert size={18} className="text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: companyPortal && isLightPortal ? '#334155' : '#E2E8F0' }}>
                  <Mail size={13} style={{ color: companyPortal ? cPrimario : '#22D3EE' }} />
                  <span>Correo Electrónico / Usuario</span>
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all border"
                  style={{
                    backgroundColor: companyPortal && isLightPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.75)',
                    borderColor: companyPortal && isLightPortal ? '#E2E8F0' : '#334155',
                    color: companyPortal && isLightPortal ? '#0F172A' : '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: companyPortal && isLightPortal ? '#334155' : '#E2E8F0' }}>
                    <Lock size={13} style={{ color: companyPortal ? cPrimario : '#22D3EE' }} />
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
                    style={{ color: companyPortal ? cPrimario : '#22D3EE' }}
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
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all pr-11 border"
                    style={{
                      backgroundColor: companyPortal && isLightPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.75)',
                      borderColor: companyPortal && isLightPortal ? '#E2E8F0' : '#334155',
                      color: companyPortal && isLightPortal ? '#0F172A' : '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: companyPortal && isLightPortal ? '#64748B' : '#94A3B8' }}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-2 font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95 border"
                style={companyPortal ? {
                  backgroundColor: cPrimario,
                  color: cSecundario,
                  borderColor: `${cSecundario}40`,
                  boxShadow: `0 8px 25px ${cPrimario}50`
                } : {
                  background: 'linear-gradient(90deg, #2563EB 0%, #06B6D4 100%)',
                  color: '#FFFFFF',
                  borderColor: 'rgba(34,211,238,0.4)',
                  boxShadow: '0 8px 25px rgba(6,182,212,0.35)'
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

            <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: companyPortal && isLightPortal ? '#E2E8F0' : '#1E293B' }}>
              <p className="text-[11px]" style={{ color: companyPortal && isLightPortal ? '#64748B' : '#94A3B8' }}>
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
        onInstall={triggerInstall}
        isIOS={isIOS}
        isAndroid={isAndroid}
        companyName={companyPortal ? companyPortal.nombre : 'COPAI Telematics'}
        logoUrl={companyPortal ? getAssetUrl(companyPortal.logo_url) : '/copai-symbol.png'}
        primaryColor={cPrimario}
      />

    </div>
  );
}
