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
      localStorage.setItem('token', access_token);
      localStorage.setItem('empresa', JSON.stringify(empresa || { id: 0, nombre: 'Copai Central', color_primario: '#2563EB' }));
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
      className={`min-h-screen font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden relative transition-colors duration-300 ${
        companyPortal
          ? isLightPortal ? 'text-slate-900' : 'text-slate-100'
          : 'bg-[#070B14] text-slate-100'
      }`}
      style={companyPortal ? {
        background: isLightPortal 
          ? `radial-gradient(circle at 15% 15%, ${cTerciario} 0%, #FFFFFF 55%, ${cTerciario}80 100%)`
          : `radial-gradient(circle at 15% 15%, ${cTerciario} 0%, #030805 70%, ${cTerciario}50 100%)`
      } : undefined}
    >
      
      {/* Luces y Gradientes de Fondo Adaptativos */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute top-[-15%] left-[10%] w-[650px] h-[650px] rounded-full blur-[160px]" 
          style={{ 
            backgroundColor: companyPortal ? cPrimario : '#2563EB',
            opacity: companyPortal ? (isLightPortal ? 0.20 : 0.35) : 0.25 
          }}
        />
        <div 
          className="absolute top-[20%] right-[-10%] w-[550px] h-[550px] rounded-full blur-[150px]" 
          style={{ 
            backgroundColor: companyPortal ? cTerciario : 'rgba(6, 182, 212, 0.15)',
            opacity: companyPortal ? (isLightPortal ? 0.35 : 0.35) : 0.15 
          }}
        />
        <div 
          className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] rounded-full blur-[150px]" 
          style={{ 
            backgroundColor: companyPortal ? cSecundario : 'rgba(79, 70, 229, 0.10)',
            opacity: companyPortal ? (isLightPortal ? 0.25 : 0.08) : 0.10 
          }}
        />
        
        {/* Grilla sutil de fondo adaptativa */}
        <div 
          className="absolute inset-0" 
          style={{ 
            opacity: companyPortal ? (isLightPortal ? 0.08 : 0.05) : 0.03,
            backgroundImage: `radial-gradient(circle at 1px 1px, ${companyPortal ? cPrimario : '#38bdf8'} 1px, transparent 0)`,
            backgroundSize: '36px 36px' 
          }} 
        />
      </div>

      {/* ========================================================================= */}
      {/* CASO A: PORTAL WHITE-LABEL DE EMPRESA CLIENTE (Huaynarroque, Nazareth, etc) */}
      {/* ========================================================================= */}
      {companyPortal ? (
        <div className="relative z-10 flex flex-col min-h-screen">
          
          {/* Header Superior Corporativo de la Empresa */}
          <header 
            className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b transition-colors shadow-sm"
            style={{ 
              backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 20, 15, 0.90)',
              borderBottomColor: `${cPrimario}30` 
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              
              {/* Logo y Nombre de la Empresa Cliente */}
              <div className="flex items-center gap-3 sm:gap-4">
                {companyPortal.logo_url ? (
                  <img 
                    src={getAssetUrl(companyPortal.logo_url)} 
                    alt={companyPortal.nombre} 
                    className="h-10 sm:h-12 w-auto max-w-[160px] object-contain drop-shadow-md"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-lg border"
                    style={{ 
                      backgroundColor: cPrimario, 
                      color: cSecundario,
                      borderColor: `${cSecundario}40` 
                    }}
                  >
                    {companyPortal.nombre.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-none" style={{ color: isLightPortal ? '#0F172A' : cSecundario }}>
                    {companyPortal.nombre}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cPrimario }} />
                    <span className="text-[11px] font-bold font-mono tracking-wide uppercase" style={{ color: cPrimario }}>
                      Central Satelital 24/7
                    </span>
                    {companyPortal.documento && (
                      <span className="hidden sm:inline text-[11px] font-mono" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>
                        | RUC: {companyPortal.documento}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones Superiores */}
              <div className="flex items-center gap-3 sm:gap-5">
                <a 
                  href="/" 
                  className="hidden md:flex items-center gap-1.5 text-xs transition-colors font-semibold"
                  style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
                  title="Ir al portal principal de Industrias CopAI"
                >
                  <img src="/logo-copai-white.png" alt="CopAI" className="h-4 object-contain opacity-70 hover:opacity-100" />
                  <span>Red CopAI ↗</span>
                </a>

                {/* BOTÓN SUPERIOR DERECHO: ACCESO CENTRAL DE DESPACHO */}
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="relative group px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all duration-300 flex items-center gap-2.5 cursor-pointer active:scale-95 border"
                  style={{
                    backgroundColor: cPrimario,
                    color: cSecundario,
                    borderColor: `${cSecundario}40`,
                    boxShadow: `0 4px 20px ${cPrimario}50`
                  }}
                >
                  <Lock size={15} className="group-hover:rotate-12 transition-transform" />
                  <span>Acceso a Central</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          </header>

          {/* CUERPO DEL PORTAL WHITE-LABEL */}
          <main className="flex-1 pt-24 sm:pt-28 pb-16">
            
            {/* HERO SECTION DE LA EMPRESA CON FOTO DE FLOTA / BANNER */}
            <section className="relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
                
                {/* Contenedor Banner Panorámico */}
                <div 
                  className="relative rounded-3xl overflow-hidden border shadow-2xl min-h-[420px] sm:min-h-[500px] flex items-end p-6 sm:p-12"
                  style={{ 
                    borderColor: `${cPrimario}50`,
                    boxShadow: isLightPortal ? `0 25px 60px -10px ${cPrimario}30` : `0 20px 60px ${cPrimario}20`
                  }}
                >
                  
                  {/* Foto de Portada / Flota */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={companyPortal.banner_url ? getAssetUrl(companyPortal.banner_url) : '/banners/huaynarroque_banner.jpg'} 
                      alt={companyPortal.nombre} 
                      className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.05]"
                      onError={(e) => {
                        e.target.src = '/banners/huaynarroque_banner.jpg';
                      }}
                    />
                    {/* Degradado sobre la imagen para legibilidad impecable */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
                    <div 
                      className="absolute inset-0 opacity-25 mix-blend-color" 
                      style={{ backgroundColor: cPrimario }} 
                    />
                  </div>

                  {/* Texto y Contenido Superpuesto */}
                  <div className="relative z-10 max-w-3xl space-y-4">
                    
                    {/* Badge */}
                    <div 
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md shadow-md"
                      style={{
                        backgroundColor: 'rgba(8, 14, 18, 0.85)',
                        borderColor: `${cPrimario}60`,
                        color: '#FFFFFF'
                      }}
                    >
                      <Satellite size={14} style={{ color: cPrimario }} className="animate-pulse" />
                      <span>TELEMETRÍA SATELITAL & GESTIÓN DE FLOTA EN TIEMPO REAL</span>
                    </div>

                    {/* Nombre y Slogan */}
                    <h2 
                      className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-md"
                    >
                      {companyPortal.nombre}
                    </h2>

                    <p className="text-base sm:text-xl text-slate-100 font-normal leading-relaxed drop-shadow">
                      {companyPortal.slogan || "Líderes en transporte seguro y puntual, con monitoreo continuo vía GPS satelital."}
                    </p>

                    {/* Botón de Ingreso Directo */}
                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => {
                          setShowLoginModal(true);
                          setError('');
                        }}
                        className="px-7 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-300 flex items-center gap-2.5 active:scale-95 border"
                        style={{
                          backgroundColor: cPrimario,
                          color: cSecundario,
                          borderColor: `${cSecundario}30`,
                          boxShadow: `0 8px 30px ${cPrimario}70`
                        }}
                      >
                        <ShieldCheck size={18} />
                        <span>Iniciar Sesión de Despacho</span>
                        <ArrowRight size={16} />
                      </button>

                      {companyPortal.telefono && (
                        <div 
                          className="flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold backdrop-blur-md"
                          style={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.80)',
                            borderColor: `${cPrimario}50`, 
                            color: '#FFFFFF' 
                          }}
                        >
                          <Phone size={14} style={{ color: cPrimario }} />
                          <span>Central: {companyPortal.telefono}</span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>

                {/* Métricas y Datos Rápidos de la Flota */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  
                  <div 
                    className="border rounded-2xl p-5 backdrop-blur-md transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.70)',
                      borderTop: `4px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}30`,
                      boxShadow: isLightPortal ? `0 10px 25px -5px ${cPrimario}20` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                      >
                        <Truck size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                        Flota en Ruta
                      </span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                      {companyPortal.total_vehiculos || 0}
                      <span className="text-xs font-medium ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>unidades activas</span>
                    </p>
                  </div>

                  <div 
                    className="border rounded-2xl p-5 backdrop-blur-md transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.70)',
                      borderTop: `4px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}30`,
                      boxShadow: isLightPortal ? `0 10px 25px -5px ${cPrimario}20` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                      >
                        <Radio size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                        GPS Satelital
                      </span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: cPrimario }}>
                      100%
                      <span className="text-xs font-medium ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>Teltonika 4G</span>
                    </p>
                  </div>

                  <div 
                    className="border rounded-2xl p-5 backdrop-blur-md transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.70)',
                      borderTop: `4px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}30`,
                      boxShadow: isLightPortal ? `0 10px 25px -5px ${cPrimario}20` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                      >
                        <Gauge size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                        Límite de Ruta
                      </span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">
                      {companyPortal.limite_velocidad || 90}
                      <span className="text-xs font-medium ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>km/h máx.</span>
                    </p>
                  </div>

                  <div 
                    className="border rounded-2xl p-5 backdrop-blur-md transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.70)',
                      borderTop: `4px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}30`,
                      boxShadow: isLightPortal ? `0 10px 25px -5px ${cPrimario}20` : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                        Seguridad
                      </span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                      24 / 7
                      <span className="text-xs font-medium ml-1.5" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>telemetría continua</span>
                    </p>
                  </div>

                </div>

                {/* Sección de Rutas y Servicios */}
                {companyPortal.servicios && (
                  <div 
                    className="mt-8 border rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-md"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.60)',
                      borderColor: `${cPrimario}35`,
                      boxShadow: isLightPortal ? `0 15px 35px -5px ${cPrimario}15` : undefined
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="p-3.5 rounded-2xl shadow-md flex-shrink-0"
                        style={{ 
                          backgroundColor: cPrimario,
                          color: cSecundario
                        }}
                      >
                        <Route size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1.5" style={{ color: isLightPortal ? '#0F172A' : cSecundario }}>
                          Rutas y Cobertura Operativa de la Flota
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: isLightPortal ? '#334155' : '#CBD5E1' }}>
                          {companyPortal.servicios}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3 Pilares Tecnológicos de la Flota */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  
                  <div 
                    className="border rounded-2xl p-6 transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.80)',
                      borderTop: `3px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}25`,
                      boxShadow: isLightPortal ? `0 8px 20px rgba(0,0,0,0.04)` : undefined
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                    >
                      <Navigation size={20} />
                    </div>
                    <h4 className="font-bold text-base mb-2" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                      Rastreo Satelital en Tiempo Real
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                      Transmisión continua de coordenadas geográficas, odómetro virtual, estado del motor y cálculo automático de tiempos de llegada a cada estación.
                    </p>
                  </div>

                  <div 
                    className="border rounded-2xl p-6 transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.80)',
                      borderTop: `3px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}25`,
                      boxShadow: isLightPortal ? `0 8px 20px rgba(0,0,0,0.04)` : undefined
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                    >
                      <Gauge size={20} />
                    </div>
                    <h4 className="font-bold text-base mb-2" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                      Control Estricto de Velocidad
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                      Detección instantánea de excesos sobre el límite configurado ({companyPortal.limite_velocidad || 90} km/h) con alarmas sonoras y alertas por correo al centro de control.
                    </p>
                  </div>

                  <div 
                    className="border rounded-2xl p-6 transition-all hover:translate-y-[-2px] shadow-sm"
                    style={{ 
                      backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.80)',
                      borderTop: `3px solid ${cPrimario}`, 
                      borderColor: `${cPrimario}25`,
                      boxShadow: isLightPortal ? `0 8px 20px rgba(0,0,0,0.04)` : undefined
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cPrimario}15`, color: cPrimario }}
                    >
                      <Shield size={20} />
                    </div>
                    <h4 className="font-bold text-base mb-2" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                      Seguridad para Pasajeros y Carga
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: isLightPortal ? '#475569' : '#94A3B8' }}>
                      Geocercas de seguridad en carretera, monitoreo de desvíos no autorizados y registro inviolable de telemetría certificado para cumplimiento de normas.
                    </p>
                  </div>

                </div>

              </div>
            </section>

          </main>

          {/* Footer White-Label */}
          <footer 
            className="border-t py-8 px-4 text-center transition-colors"
            style={{ 
              backgroundColor: isLightPortal ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.90)',
              borderTopColor: `${cPrimario}25` 
            }}
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: isLightPortal ? '#0F172A' : cSecundario }}>{companyPortal.nombre}</span>
                {companyPortal.documento && <span style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>• RUC {companyPortal.documento}</span>}
              </div>
              <p style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>
                Infraestructura satelital y telemetría de vanguardia provista por{' '}
                <a href="/" className="hover:underline font-semibold" style={{ color: cPrimario }}>
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
        <>
          {/* ================= BARRA SUPERIOR / NAVBAR COPAI ================= */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/15 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              
              {/* Logo Oficial Industrias CopAI */}
              <div className="flex items-center gap-4">
                <a href="#inicio" className="flex items-center group">
                  <img 
                    src="/logo-copai-white.png" 
                    alt="Industrias CopAI" 
                    className="h-10 sm:h-11 object-contain transition-transform group-hover:scale-105"
                  />
                </a>
                <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-cyan-400 tracking-wider uppercase font-mono">
                    Ecosistema Industrial 4.0
                  </span>
                </div>
              </div>

              {/* Enlaces de Navegación */}
              <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
                <a href="#telemetria" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Radio size={15} className="text-cyan-400" /> Telemetría GPS
                </a>
                <a href="#robotica" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Bot size={15} className="text-blue-400" /> Robótica
                </a>
                <a href="#ia" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Brain size={15} className="text-cyan-300" /> Inteligencia Artificial
                </a>
                <a href="#contratos" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <FileCode size={15} className="text-indigo-400" /> Smart Contracts
                </a>
              </nav>

              {/* BOTÓN SUPERIOR DERECHO: INICIAR SESIÓN */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="relative group px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300 flex items-center gap-2.5 border border-cyan-400/40 cursor-pointer active:scale-95"
                >
                  <Lock size={15} className="text-cyan-200 group-hover:rotate-12 transition-transform" />
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          </header>

          {/* ================= CONTENIDO PRINCIPAL MASTER COPAI ================= */}
          <main className="relative z-10 pt-28 sm:pt-36 pb-20">
            
            {/* HERO SECTION */}
            <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 sm:pt-16 pb-20">
              
              {/* Badge de Vanguardia */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-semibold text-cyan-300 mb-6 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Sparkles size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>INGENIERÍA TECNOLÓGICA & AUTOMATIZACIÓN AVANZADA</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.15]">
                Innovación sin Límites para la <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                  Industria del Futuro
                </span>
              </h1>

              {/* Bajada Narrativa */}
              <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
                En <strong>Industrias CopAI</strong> fusionamos telemetría satelital GPS de grado industrial, robótica autónoma, inteligencia artificial predictiva y arquitectura de contratos inteligentes para liderar la transformación digital del transporte y la industria pesada.
              </p>

              {/* Botones de Acción */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer active:scale-95"
                >
                  <Cpu size={18} />
                  <span>Acceso a la Plataforma</span>
                  <ArrowRight size={18} />
                </button>
                <a
                  href="#telemetria"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 hover:border-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Explorar Tecnologías</span>
                  <ChevronRight size={18} />
                </a>
              </div>

              {/* HUD / Indicadores en Vivo */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">99.98%</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">Disponibilidad Uptime</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">&lt; 100ms</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">Latencia Telemetría</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">256-bit</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">Cifrado Militar</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">Multi-Tenant</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">White-Label Dedicado</div>
                </div>
              </div>

            </section>

            {/* LAS 4 DIVISIONES TECNOLÓGICAS DE INDUSTRIAS COPAI */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center mb-16">
                <h2 className="text-xs font-bold text-cyan-400 tracking-widest uppercase font-mono mb-2">
                  ÁREAS DE EXCELENCIA TÉCNICA
                </h2>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">
                  Pilares de Transformación Industrial
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. TELEMETRÍA GPS INDUSTRIAL */}
                <div id="telemetria" className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    <Radio size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                    <span>Telemetría Satelital GPS & IoT</span>
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    Arquitectura de alta concurrencia capaz de procesar miles de tramas TCP por segundo desde dispositivos Teltonika (FMC130, FMM130, etc.). Telemetría en tiempo real de velocidad, odómetro satelital, geocercas poligonales inteligentes y control remoto de corte de ignición.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-400" /> Servidor TCP asíncrono con protocolo Teltonika Codec 8/8 Extended
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-400" /> WebSockets bi-direccionales de latencia sub-segundo
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-400" /> Notificaciones automáticas de exceso de velocidad por correo y panel
                    </li>
                  </ul>
                </div>

                {/* 2. ROBÓTICA INDUSTRIAL */}
                <div id="robotica" className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-blue-500/20 hover:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                    <Bot size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Robótica y Automatización Autónoma
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    Diseño, desarrollo e integración de sistemas mecatrónicos y vehículos de guiado automático (AGVs) para logística y almacenes inteligentes. Automatización integral de procesos industriales para eliminar tiempos muertos y maximizar la precisión operativa.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-blue-400" /> Integración con PLCs industriales y buses de campo Modbus/CAN
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-blue-400" /> Control cinemático en tiempo real y visión por computadora
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-blue-400" /> Monitoreo y diagnóstico remoto de salud mecánica
                    </li>
                  </ul>
                </div>

                {/* 3. INTELIGENCIA ARTIFICIAL */}
                <div id="ia" className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-400/20 hover:border-cyan-300/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-6 group-hover:scale-110 transition-transform">
                    <Brain size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Inteligencia Artificial Predictiva
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    Modelos de Machine Learning entrenados sobre millones de datos de sensores para mantenimiento predictivo de motores, análisis de comportamiento del conductor (frenados bruscos, aceleraciones excesivas) y optimización de rutas y consumo de combustible.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-300" /> Detección temprana de fallas mecánicas antes de que ocurran
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-300" /> Scoring automático de seguridad para conductores
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-cyan-300" /> Optimización de consumo energético y huella de carbono
                    </li>
                  </ul>
                </div>

                {/* 4. SMART CONTRACTS */}
                <div id="contratos" className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-indigo-500/20 hover:border-indigo-400/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                    <FileCode size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Smart Contracts & Blockchain Logística
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    Certificación inviolable de registros de telemetría y ejecución automática de contratos de despacho logístico mediante contratos inteligentes. Garantía criptográfica de cumplimiento de horarios, temperatura en cadena de frío e itinerarios auditables.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-400" /> Registro inmutable de eventos críticos y kilometraje
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-400" /> Liquidación automática de servicios logísticos contra entrega confirmada
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-400" /> Trazabilidad punta a punta para auditorías y aseguradoras
                    </li>
                  </ul>
                </div>

              </div>
            </section>

          </main>

          {/* ================= PIE DE PÁGINA COPAI ================= */}
          <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 py-12 px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-copai-white.png" 
                  alt="Industrias CopAI" 
                  className="h-8 object-contain"
                />
                <span className="text-xs text-slate-500 font-mono">
                  © 2026 Industrias CopAI. Todos los derechos reservados.
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-6">
                <span>RUC: 20601847291</span>
                <span>Puno • Arequipa • Lima, Perú</span>
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                >
                  Acceso Empleados / Clientes ➔
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md p-7 sm:p-9 rounded-3xl border transition-all animate-in zoom-in-95 duration-200 shadow-2xl"
            style={{
              backgroundColor: isLightPortal ? '#FFFFFF' : '#0B1320',
              borderColor: companyPortal ? `${cPrimario}50` : 'rgba(6,182,212,0.4)',
              boxShadow: companyPortal ? `0 25px 60px ${cPrimario}30` : '0 0 60px rgba(6,182,212,0.3)'
            }}
          >
            
            {/* Botón Cerrar Modal */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl transition-colors cursor-pointer"
              style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
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
                    src="/logo-copai-white.png" 
                    alt="Industrias CopAI" 
                    className="h-10 object-contain"
                  />
                )}
              </div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: isLightPortal ? '#0F172A' : '#FFFFFF' }}>
                {companyPortal ? `Central: ${companyPortal.nombre}` : 'Portal de Acceso CopAI'}
              </h2>
              <p 
                className="text-xs mt-1 font-mono tracking-wide font-bold"
                style={{ color: cPrimario }}
              >
                {companyPortal ? 'Autenticación de Flota & Despacho' : 'Autenticación Segura Multi-Tenant'}
              </p>
            </div>

            {/* Error de credenciales */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-950/50 border border-red-500/40 text-red-200 rounded-xl flex items-center gap-2.5 text-xs animate-shake">
                <ShieldAlert size={18} className="text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}>
                  <Mail size={13} style={{ color: cPrimario }} />
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
                    backgroundColor: isLightPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.7)',
                    borderColor: isLightPortal ? '#CBD5E1' : '#334155',
                    color: isLightPortal ? '#0F172A' : '#FFFFFF'
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: isLightPortal ? '#334155' : '#E2E8F0' }}>
                    <Lock size={13} style={{ color: cPrimario }} />
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
                    style={{ color: cPrimario }}
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
                      backgroundColor: isLightPortal ? '#F8FAFC' : 'rgba(2, 6, 23, 0.7)',
                      borderColor: isLightPortal ? '#CBD5E1' : '#334155',
                      color: isLightPortal ? '#0F172A' : '#FFFFFF'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}
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
                  background: 'linear-gradient(to right, #2563eb, #4f46e5, #06b6d4)',
                  color: '#ffffff',
                  borderColor: 'rgba(6,182,212,0.4)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.4)'
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

            <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: isLightPortal ? '#E2E8F0' : '#1E293B' }}>
              <p className="text-[11px]" style={{ color: isLightPortal ? '#64748B' : '#94A3B8' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 p-7 rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Mail size={20} />
                <h3 className="font-bold text-base text-white">Recuperar Contraseña</h3>
              </div>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pt-5">
              {forgotSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto animate-bounce" />
                  <p className="text-sm text-slate-200 font-semibold">{forgotMsg}</p>
                  <p className="text-xs text-slate-400">
                    Revisa tu bandeja de entrada o spam. El enlace expira en 2 horas.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setShowLoginModal(true);
                    }}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
                  >
                    Volver a Iniciar Sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ingresa el correo corporativo registrado en tu cuenta y te enviaremos de inmediato un enlace seguro desde <strong>notificaciones@industriascopai.com</strong>.
                  </p>

                  {forgotError && (
                    <div className="p-3 bg-red-950/50 border border-red-500/40 text-red-200 text-xs rounded-xl">
                      {forgotError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu-correo@empresa.com"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-60 cursor-pointer"
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
