import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldAlert, Radio, Bot, Brain, FileCode, Lock, Mail, X, CheckCircle2, 
  ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, Cpu, Activity, 
  Satellite, Navigation, Layers, ChevronRight, Check, Building2, Phone,
  FileText, ExternalLink, MapPin, Gauge, Shield, Truck, Route
} from 'lucide-react';
import { API_BASE_URL, getAssetUrl } from '../config';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tenant / Empresa White-Label
  const [tenantSlug, setTenantSlug] = useState(() => detectTenantSlug());
  const [companyPortal, setCompanyPortal] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Modal de Login
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Modal de Recuperación de Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Cargar datos de la empresa si existe un tenant detectado
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

      // Si es superadmin entrando a un subdominio de cliente, contextualizar la empresa activa a este tenant
      const activeEmpresa = (companyPortal && (usuario.rol === 'superadmin' || !empresa || empresa.id === 0))
        ? companyPortal
        : (empresa || { id: 0, nombre: 'COPAI', color_primario: '#2563EB' });

      localStorage.setItem('token', access_token);
      localStorage.setItem('empresa', JSON.stringify(activeEmpresa));
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

  return (
    <div 
      className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-300 ${
        companyPortal
          ? (isLightPortal ? 'text-slate-900' : 'text-slate-100')
          : 'bg-[#F8FAFC] text-slate-800'
      }`}
      style={companyPortal ? {
        backgroundColor: isLightPortal ? cTerciario : '#020617',
        color: isLightPortal ? '#0F172A' : '#F8FAFC'
      } : {
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 40%, #F1F5F9 100%)'
      }}
    >
      
      {/* Luces sutiles sólo para el portal corporativo CopAI */}
      {!companyPortal && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] rounded-full blur-[140px] bg-blue-500 opacity-[0.07]" />
          <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[140px] bg-indigo-500 opacity-[0.05]" />
          <div 
            className="absolute inset-0 opacity-[0.025]" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 1px 1px, #0284c7 1px, transparent 0)',
              backgroundSize: '36px 36px' 
            }} 
          />
        </div>
      )}

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
        <>
          {/* ================= BARRA SUPERIOR / NAVBAR COPAI ================= */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 transition-all shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              
              {/* Logo Oficial COPAI */}
              <div className="flex items-center gap-4">
                <a href="#inicio" className="flex items-center gap-3 group">
                  <img 
                    src="/copai-symbol.png" 
                    alt="COPAI" 
                    className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform group-hover:scale-105"
                  />
                  <span className="text-2xl font-black tracking-wider text-slate-900 group-hover:text-blue-600 transition-colors">
                    COPAI
                  </span>
                </a>
                <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                    Ecosistema Telematics 4.0
                  </span>
                </div>
              </div>

              {/* Enlaces de Navegación */}
              <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
                <a href="#telemetria" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <Radio size={16} className="text-blue-600" /> Telemetría GPS
                </a>
                <a href="#robotica" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <Bot size={16} className="text-blue-600" /> Automatización
                </a>
                <a href="#ia" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <Brain size={16} className="text-blue-600" /> Analítica Predictiva
                </a>
                <a href="#contratos" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <FileCode size={16} className="text-blue-600" /> Trazabilidad
                </a>
              </nav>

              {/* BOTÓN SUPERIOR DERECHO: INICIAR SESIÓN */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="px-5 sm:px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Lock size={15} />
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={15} />
                </button>
              </div>

            </div>
          </header>

          {/* ================= CONTENIDO PRINCIPAL MASTER COPAI ================= */}
          <main className="relative z-10 pt-28 sm:pt-36 pb-20">
            
            {/* HERO SECTION */}
            <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-16 pb-16">
              
              {/* Badge Natural */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-700 mb-6 shadow-xs">
                <Radio size={14} className="text-blue-600" />
                <span>TECNOLOGÍA SATELITAL & GESTIÓN DE FLOTA</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.18]">
                Innovación sin Límites para la <br className="hidden sm:inline" />
                <span className="text-blue-600">
                  Industria del Futuro
                </span>
              </h1>

              {/* Bajada Narrativa */}
              <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
                En <strong>Industrias CopAI</strong> fusionamos telemetría satelital GPS de grado industrial, robótica autónoma, inteligencia artificial predictiva y arquitectura de contratos inteligentes para liderar la transformación digital del transporte y la industria pesada.
              </p>

              {/* Botones de Acción */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <Cpu size={17} />
                  <span>Acceso a la Plataforma</span>
                  <ArrowRight size={17} />
                </button>
                <a
                  href="#telemetria"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Explorar Tecnologías</span>
                  <ChevronRight size={17} />
                </a>
              </div>

              {/* Indicadores / Metricas Naturales */}
              <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-extrabold text-slate-900">99.98%</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Disponibilidad Uptime</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-extrabold text-slate-900">&lt; 100ms</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Latencia Telemetría</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-extrabold text-slate-900">256-bit</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Cifrado de Datos</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
                  <div className="text-3xl font-extrabold text-blue-600">Multi-Tenant</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Portales Dedicados</div>
                </div>
              </div>

            </section>

            {/* LAS 4 DIVISIONES TECNOLÓGICAS DE INDUSTRIAS COPAI */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <div className="text-center mb-12">
                <h2 className="text-xs font-bold text-blue-600 tracking-widest uppercase mb-2">
                  ÁREAS DE EXCELENCIA TÉCNICA
                </h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                  Pilares de Transformación Operativa
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. TELEMETRÍA GPS INDUSTRIAL */}
                <div id="telemetria" className="p-8 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-300 shadow-xs hover:shadow-md">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                    <Radio size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                    Telemetría Satelital GPS & IoT
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Arquitectura de alta concurrencia capaz de procesar miles de tramas TCP por segundo desde dispositivos Teltonika (FMC130, FMM130, etc.). Telemetría en tiempo real de velocidad, odómetro satelital, geocercas poligonales inteligentes y control remoto de corte de ignición.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-blue-600 flex-shrink-0" /> Protocolo asíncrono Teltonika Codec 8 y Codec 8 Extended
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-blue-600 flex-shrink-0" /> WebSockets bi-direccionales de latencia sub-segundo
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-blue-600 flex-shrink-0" /> Alertas automáticas de velocidad y corte de energía
                    </li>
                  </ul>
                </div>

                {/* 2. ROBÓTICA INDUSTRIAL */}
                <div id="robotica" className="p-8 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-300 shadow-xs hover:shadow-md">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                    <Bot size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                    Robótica y Automatización Autónoma
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Diseño, desarrollo e integración de sistemas mecatrónicos y vehículos de guiado automático (AGVs) para logística y almacenes inteligentes. Automatización integral de procesos industriales para eliminar tiempos muertos y maximizar la precisión operativa.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-indigo-600 flex-shrink-0" /> Integración con PLCs industriales y buses de campo Modbus/CAN
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-indigo-600 flex-shrink-0" /> Control cinemático en tiempo real y visión computacional
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-indigo-600 flex-shrink-0" /> Monitoreo y diagnóstico remoto de salud mecánica
                    </li>
                  </ul>
                </div>

                {/* 3. INTELIGENCIA ARTIFICIAL */}
                <div id="ia" className="p-8 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-300 shadow-xs hover:shadow-md">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                    <Brain size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                    Inteligencia Artificial Predictiva
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Modelos de Machine Learning entrenados sobre datos de sensores para mantenimiento predictivo de motores, análisis de comportamiento del conductor (frenados bruscos, aceleraciones excesivas) y optimización de rutas y consumo de combustible.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-emerald-600 flex-shrink-0" /> Detección temprana de anomalías antes de fallas críticas
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-emerald-600 flex-shrink-0" /> Calificación automática de conducción segura
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-emerald-600 flex-shrink-0" /> Optimización de consumo energético y eficiencia térmica
                    </li>
                  </ul>
                </div>

                {/* 4. SMART CONTRACTS */}
                <div id="contratos" className="p-8 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-300 shadow-xs hover:shadow-md">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5">
                    <FileCode size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2.5">
                    Smart Contracts & Trazabilidad
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Certificación de registros de telemetría y ejecución de auditorías de despacho logístico mediante contratos inteligentes. Garantía técnica de cumplimiento de horarios, temperatura en cadena de frío e itinerarios transparentes.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-sky-600 flex-shrink-0" /> Registro inmutable de eventos críticos y kilometraje
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-sky-600 flex-shrink-0" /> Liquidación verificable de servicios contra entrega
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={15} className="text-sky-600 flex-shrink-0" /> Trazabilidad punta a punta para auditorías operativas
                    </li>
                  </ul>
                </div>

              </div>
            </section>

          </main>

          {/* ================= PIE DE PÁGINA COPAI ================= */}
          <footer className="relative z-10 border-t border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-copai.png" 
                  alt="Industrias CopAI" 
                  className="h-8 object-contain"
                />
                <span className="text-xs text-slate-500">
                  © 2026 Industrias CopAI. Todos los derechos reservados.
                </span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-6">
                <span>RUC: 20601847291</span>
                <span>Puno • Arequipa • Lima, Perú</span>
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Acceso a la Central ➔
                </button>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL UNIFICADO DE INICIAR SESIÓN (Adaptado para CopAI o Empresa Cliente) */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md p-7 sm:p-9 rounded-3xl border transition-all animate-in zoom-in-95 duration-200 shadow-2xl"
            style={{
              backgroundColor: isLightPortal || !companyPortal ? '#FFFFFF' : '#0B1320',
              borderColor: companyPortal ? `${cPrimario}50` : '#E2E8F0',
              boxShadow: companyPortal ? `0 25px 60px ${cPrimario}30` : '0 20px 45px rgba(15,23,42,0.12)'
            }}
          >
            
            {/* Botón Cerrar Modal */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl transition-colors cursor-pointer"
              style={{ color: isLightPortal || !companyPortal ? '#64748B' : '#94A3B8' }}
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
                  <div className="flex items-center gap-3">
                    <img 
                      src="/copai-symbol.png" 
                      alt="COPAI" 
                      className="h-10 w-10 object-contain"
                    />
                    <span className="text-2xl font-black tracking-wider" style={{ color: isLightPortal || !companyPortal ? '#0F172A' : '#FFFFFF' }}>
                      COPAI
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: isLightPortal || !companyPortal ? '#0F172A' : '#FFFFFF' }}>
                {companyPortal ? `Central: ${companyPortal.nombre}` : 'Acceso a Plataforma COPAI'}
              </h2>
              <p 
                className="text-xs mt-1 font-semibold tracking-wide"
                style={{ color: companyPortal ? cPrimario : '#2563EB' }}
              >
                {companyPortal ? 'Autenticación de Flota & Despacho' : 'Autenticación Segura de Clientes & Flota'}
              </p>
            </div>

            {/* Error de credenciales */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2.5 text-xs animate-shake">
                <ShieldAlert size={18} className="text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLightPortal || !companyPortal ? '#334155' : '#E2E8F0' }}>
                  <Mail size={13} style={{ color: companyPortal ? cPrimario : '#2563EB' }} />
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
                    backgroundColor: isLightPortal || !companyPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.7)',
                    borderColor: isLightPortal || !companyPortal ? '#E2E8F0' : '#334155',
                    color: isLightPortal || !companyPortal ? '#0F172A' : '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: isLightPortal || !companyPortal ? '#334155' : '#E2E8F0' }}>
                    <Lock size={13} style={{ color: companyPortal ? cPrimario : '#2563EB' }} />
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
                    style={{ color: companyPortal ? cPrimario : '#2563EB' }}
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
                      backgroundColor: isLightPortal || !companyPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.7)',
                      borderColor: isLightPortal || !companyPortal ? '#E2E8F0' : '#334155',
                      color: isLightPortal || !companyPortal ? '#0F172A' : '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: isLightPortal || !companyPortal ? '#64748B' : '#94A3B8' }}
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
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderColor: '#1D4ED8',
                  boxShadow: '0 4px 15px rgba(37,99,235,0.3)'
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

            <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: isLightPortal || !companyPortal ? '#E2E8F0' : '#1E293B' }}>
              <p className="text-[11px]" style={{ color: isLightPortal || !companyPortal ? '#64748B' : '#94A3B8' }}>
                {companyPortal 
                  ? `Acceso para operadores autorizados de ${companyPortal.nombre}`
                  : 'Acceso exclusivo para clientes y operadores de COPAI'}
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

    </div>
  );
}
