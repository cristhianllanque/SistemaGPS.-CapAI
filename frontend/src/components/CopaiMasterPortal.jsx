import React, { useState } from 'react';
import {
  Radio, Bot, Brain, ShieldCheck, Cpu, Activity, Satellite,
  ChevronRight, ChevronDown, Check, Smartphone, Lock, ArrowRight,
  Eye, Sparkles, MapPin, Shield, Layers, Globe, Camera, Compass,
  Terminal, Zap, Maximize2, X, Play, Code2, Server, Wifi
} from 'lucide-react';

const DIVISIONES_PRINCIPALES = [
  {
    id: 'gps',
    numero: '01',
    codigoHud: 'SYS-GPS // TELTONIKA-IOT',
    titulo: 'Telemetría Satelital GPS & Seguridad de Flotas',
    subtitulo: 'Rastreo en Tiempo Real, Antirrobo Vehicular y Despacho Inteligente',
    estado: 'EN PRODUCCIÓN ACTIVA',
    estadoColor: 'emerald',
    acento: '#06B6D4', // cyan-500
    gradiente: 'from-cyan-500 to-blue-600',
    imagen: '/copai-media/gps.jpg',
    icono: Satellite,
    resumen:
      'Plataforma satelital de grado industrial conectada a dispositivos Teltonika de última generación. Brindamos seguridad total para flotas de transporte y vehículos particulares con detección instantánea de botón de pánico, alerta de sabotaje por corte de energía, geocercas inteligentes y subdominios corporativos propios.',
    metricas: [
      { label: 'Latencia TCP/WS', valor: '< 100ms' },
      { label: 'Seguridad Activa', valor: 'Pánico + Sabotaje' },
      { label: 'Multi-Plataforma', valor: 'Web + iOS + Android' }
    ],
    puntosClave: [
      'Detección inmediata de Botón de Pánico en cabina y Sabotaje de batería en tiempo real',
      'Reproducción histórica de rutas con telemetría de velocidad, paradas y motor ON/OFF',
      'Portales corporativos dedicados (tuempresa.industriascopai.com) y Apps nativas por rol'
    ],
    especificacionesDesplegables: [
      {
        titulo: 'Protocolos & Hardware Satelital',
        detalle: 'Integración nativa con equipos Teltonika (FMC130, FMM130, FMB920) mediante Codec 8 y Codec 8 Extended sobre sockets asíncronos de alta disponibilidad.'
      },
      {
        titulo: 'Seguridad Vehicular 24/7',
        detalle: 'Sirena de emergencia en vivo en central de monitoreo, auditoría de eventos críticos, control de límites de velocidad y despacho multi-operador.'
      },
      {
        titulo: 'Experiencia Personalizada por Rol',
        detalle: 'Interfaces dedicadas para Superadmin, Gerente de Flota, Operador de Despacho y Propietario Particular desde computadora, iPhone o Android.'
      }
    ]
  },
  {
    id: 'camara',
    numero: '02',
    codigoHud: 'SYS-VISION // AI-SECURITY-IR',
    titulo: 'Visión Computacional IA & Antirrobo en Tiendas',
    subtitulo: 'Cámaras Inteligentes con Visión Nocturna Infrarroja y Detección Preventiva',
    estado: 'TECNOLOGÍA IA ACTIVA',
    estadoColor: 'blue',
    acento: '#EC4899', // pink/magenta IR accent + blue
    gradiente: 'from-fuchsia-500 to-blue-600',
    imagen: '/copai-media/camara.jpg',
    icono: Camera,
    resumen:
      'Sistemas de videovigilancia neuronal con iluminación infrarroja (IR) y modelos de Visión Computacional entrenados para detectar robos, hurtos y comportamientos sospechosos en tiendas comerciales, minimarkets, almacenes y galerías antes de que ocurra la pérdida.',
    metricas: [
      { label: 'Visión Nocturna', valor: 'Anillo IR Activo' },
      { label: 'Inferencia IA', valor: 'Tiempo Real 30fps' },
      { label: 'Alertas', valor: 'Instantáneas Móvil' }
    ],
    puntosClave: [
      'Detección automática de sustracción de prendas o productos y alertas silenciosas al encargado',
      'Anillo de LEDs infrarrojos de alta sensibilidad para operación continua día y noche (0 Lux)',
      'Reconocimiento de zonas restringidas, conteo de clientes y mapas de calor en tienda'
    ],
    especificacionesDesplegables: [
      {
        titulo: 'Redes Neuronales en Tiempo Real',
        detalle: 'Procesamiento de video en el borde (Edge AI) y en servidor para identificar gestos de ocultamiento de mercadería e intrusión fuera de horario.'
      },
      {
        titulo: 'Óptica Infrarroja de Grado Industrial',
        detalle: 'Cámaras equipadas con matriz IR de espectro profundo que garantizan nitidez total incluso en almacenes oscuros o cortes de fluido eléctrico.'
      },
      {
        titulo: 'Integración con Central de Alertas CopAI',
        detalle: 'Envío inmediato de capturas de evidencia y notificación sonora directa al aplicativo móvil del propietario o personal de seguridad.'
      }
    ]
  },
  {
    id: 'robot',
    numero: '03',
    codigoHud: 'SYS-ROBOTICS // ASISTENTE-3D',
    titulo: 'Robótica Autónoma & Asistentes Inteligentes',
    subtitulo: 'Asistente Robótico para Alquiler de Pañeras y Artefactos en Mercados',
    estado: 'INGENIERÍA 3D & PROTOTIPADO',
    estadoColor: 'violet',
    acento: '#8B5CF6', // violet-500
    gradiente: 'from-violet-500 to-cyan-500',
    imagen: '/copai-media/robot.jpg',
    icono: Bot,
    resumen:
      'Diseñamos y construimos asistentes robóticos físicos con inteligencia artificial e interfaz expresiva (Proyecto Apolleras Robot V3). Creados para asistir en mercados, centros comerciales y ferias en el alquiler automatizado de pañeras, balanzas o artefactos mediante llamado directo.',
    metricas: [
      { label: 'Diseño & CAD', valor: 'Modelado 3D Propio' },
      { label: 'Interacción', valor: 'Voz + Pantalla LED' },
      { label: 'Operación', valor: 'Llamado Inteligente' }
    ],
    puntosClave: [
      'Asistente inteligente que acude al llamado de comerciantes en mercados para entrega y alquiler de pañeras o artefactos',
      'Diseño industrial 3D propio integrado con microcontroladores, sensores ultrasónicos/LiDAR y pantalla interactiva',
      'Registro digital automático de préstamos, devoluciones, cobros y control de inventario en tiempo real'
    ],
    especificacionesDesplegables: [
      {
        titulo: 'Mecatrónica & Diseño Industrial Propio',
        detalle: 'Chasis ergonómico modelado íntegramente en 3D por Industrias CopAI, optimizado para desplazarse en pasillos de mercados y zonas de alto tránsito.'
      },
      {
        titulo: 'Automatización de Alquiler en Mercados',
        detalle: 'Permite a los comerciantes solicitar pañeras, bandejas o equipos desde su puesto con un toque o comando, reduciendo tiempos muertos.'
      },
      {
        titulo: 'Cerebro Conectado a la Nube CopAI',
        detalle: 'Sincronización inalámbrica con el panel administrativo para monitorear batería, ubicación del robot y arqueo diario de alquileres.'
      }
    ]
  },
  {
    id: 'turistico',
    numero: '04',
    codigoHud: 'SYS-TOURISM // SMART-HERITAGE',
    titulo: 'Sistemas Turísticos Inteligentes & Rutas Digitales',
    subtitulo: 'Plataformas Tecnológicas para Turismo, Arqueología y Transporte Turístico',
    estado: 'SOLUCIÓN INTEGRAL',
    estadoColor: 'amber',
    acento: '#0EA5E9', // sky-500
    gradiente: 'from-sky-500 to-emerald-500',
    imagen: '/copai-media/turistico.jpg',
    icono: Compass,
    resumen:
      'Digitalizamos la experiencia turística regional y nacional. Desarrollamos sistemas integrales para agencias, corredores turísticos y complejos arqueológicos: boletaje digital QR, rutas guiadas por GPS, control de flotas turísticas y seguridad del visitante en todo su recorrido.',
    metricas: [
      { label: 'Cobertura', valor: 'Rutas & Sitios' },
      { label: 'Experiencia', valor: 'Guía GPS + QR' },
      { label: 'Seguridad', valor: 'Monitoreo Turista' }
    ],
    puntosClave: [
      'Plataformas de reservas online, tickets digitales con validación QR y gestión de aforo en sitios turísticos',
      'Integración directa con nuestra telemetría GPS para monitoreo en vivo de buses y vans de transporte turístico',
      'Guías interactivas geolocalizadas e información cultural inteligente desde el celular del viajero'
    ],
    especificacionesDesplegables: [
      {
        titulo: 'Gestión Digital para Agencias & Operadores',
        detalle: 'Control unificado de itinerarios, pasajeros, unidades de transporte asignadas, horarios de salida y reportes gerenciales.'
      },
      {
        titulo: 'Seguridad en Corredores Turísticos',
        detalle: 'Seguimiento satelital continuo en rutas interprovinciales y zonas de alta montaña con alertas de desvío o parada no programada.'
      },
      {
        titulo: 'Escalabilidad Multi-Destino',
        detalle: 'Adaptable a circuitos arqueológicos, turismo vivencial, transporte lacustre/terrestre y portales municipales o privados.'
      }
    ]
  }
];

const ECOSISTEMA_360 = [
  {
    id: 'software',
    icono: Code2,
    titulo: 'Software a Medida & Cloud Multi-Tenant',
    etiqueta: 'FULL-STACK & SAAS',
    descripcion: 'Desarrollamos plataformas web empresariales, sistemas ERP/CRM, facturación y arquitecturas Multi-Tenant donde cada empresa cliente recibe su propio subdominio seguro.',
    items: ['Subdominios automáticos con SSL (*.industriascopai.com)', 'Paneles gerenciales en tiempo real', 'APIs de alta velocidad con FastAPI & React']
  },
  {
    id: 'apps',
    icono: Smartphone,
    titulo: 'Aplicaciones Móviles Nativas (iOS & Android)',
    etiqueta: 'EXPERIENCIA MÓVIL',
    descripcion: 'Creamos aplicativos móviles de alto rendimiento con interfaz nativa de pantalla completa, notificaciones instantáneas y vistas adaptadas a cada perfil de usuario.',
    items: ['Disponible en Google Play Store para Android', 'Experiencia WebApp nativa en iPhone (iOS)', 'Modo oscuro de alto contraste y bajo consumo']
  },
  {
    id: 'vision',
    icono: Eye,
    titulo: 'Visión Computacional & IA Predictiva',
    etiqueta: 'REDES NEURONALES',
    descripcion: 'Entrenamos e implementamos modelos de inteligencia artificial para cámaras de seguridad antirrobo, reconocimiento de patrones, conteo de objetos y analítica.',
    items: ['Detección de hurtos en tiendas comerciales', 'Cámaras con visión nocturna infrarroja (IR)', 'Alertas automáticas con evidencia visual']
  },
  {
    id: 'robotica',
    icono: Bot,
    titulo: 'Robótica, Mecatrónica & Diseño 3D',
    etiqueta: 'HARDWARE + IA',
    descripcion: 'Desde el modelado CAD/Blender en 3D hasta la electrónica y programación de robots asistentes para mercados, comercios y automatización física.',
    items: ['Asistentes autónomos para alquiler de artefactos', 'Integración de sensores, motores y pantallas', 'Control y telemetría remota del robot']
  },
  {
    id: 'iot',
    icono: Wifi,
    titulo: 'IoT Industrial & Telemetría Satelital',
    etiqueta: 'CONECTIVIDAD 24/7',
    descripcion: 'Ingeniería de telecomunicaciones para conectar vehículos, sensores industriales, botones de pánico y equipos GPS Teltonika con latencia sub-segundo.',
    items: ['Servidores TCP/IP de alta concurrencia', 'Detección de sabotaje de energía y pánico', 'Mapas interactivos y geocercas inteligentes']
  },
  {
    id: 'turismo',
    icono: Globe,
    titulo: 'Sistemas Turísticos & Comercio Digital',
    etiqueta: 'TRANSFORMACIÓN DIGITAL',
    descripcion: 'Soluciones tecnológicas para modernizar el turismo, mercados, galerías comerciales y empresas de servicios en toda la región y el país.',
    items: ['Boletaje electrónico y control de rutas', 'Catálogos interactivos y reservas en línea', 'Trazabilidad operativa de punta a punta']
  }
];

const PREGUNTAS_ARQUITECTURA = [
  {
    pregunta: '¿Qué tipo de soluciones tecnológicas desarrolla Industrias CopAI?',
    respuesta:
      'Industrias CopAI es una casa matriz de ingeniería y tecnología integral. Desarrollamos desde sistemas de Telemetría Satelital GPS para flotas y vehículos particulares, cámaras de Visión Computacional con IA para evitar robos en tiendas, y robots asistentes autónomos para mercados, hasta plataformas digitales para el sector turístico y software empresarial a medida.'
  },
  {
    pregunta: '¿Cómo funciona el sistema de portales dedicados para cada empresa cliente?',
    respuesta:
      'Nuestra arquitectura Multi-Tenant crea automáticamente un entorno exclusivo para cada empresa registrada (por ejemplo: tuempresa.industriascopai.com), personalizado con su propio logotipo, colores corporativos, flota de vehículos, usuarios y aplicativo móvil independiente para iOS y Android.'
  },
  {
    pregunta: '¿Cómo protege la cámara de Visión Computacional contra robos en tiendas?',
    respuesta:
      'Nuestras cámaras cuentan con iluminación infrarroja (IR) y algoritmos de visión artificial que analizan en tiempo real los movimientos dentro del local comercial. Ante patrones de hurto, ocultamiento de productos o ingreso a zonas no autorizadas, el sistema dispara una alerta inmediata al propietario.'
  },
  {
    pregunta: '¿Qué hace el Robot Asistente Inteligente en los mercados?',
    respuesta:
      'Es un asistente robótico diseñado en 3D y programado por Industrias CopAI para desplazarse en mercados y centros de abastos. Permite a los comerciantes o usuarios solicitar el alquiler de pañeras, balanzas o artefactos llamándolo directamente, automatizando la entrega y el registro del servicio.'
  },
  {
    pregunta: '¿Qué nivel de seguridad ofrece el rastreo GPS con equipos Teltonika?',
    respuesta:
      'Trabajamos con hardware Teltonika homologado que reporta ubicación exacta al segundo, velocidad, estado de motor (ON/OFF), voltaje de batería del vehículo y nivel de batería interna. Si alguien intenta desconectar la batería (sabotaje) o el conductor presiona el botón de pánico, la central y el celular reciben una alarma sonora instantánea.'
  }
];

export default function CopaiMasterPortal({
  isStandalone,
  onOpenLoginModal,
  onOpenInstallModal
}) {
  // División activa en el visor interactivo del Hero y filtro de tarjetas
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Desplegables (accordions) abiertos en las 4 tarjetas principales
  const [expandedCards, setExpandedCards] = useState({
    gps: true,
    camara: false,
    robot: false,
    turistico: false
  });

  // Desplegable del menú superior "Divisiones Tecnológicas"
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  // Modo Video Panorámico en Hero (atenúa el overlay oscuro para apreciar más el video de Juliaca)
  const [clearVideoMode, setClearVideoMode] = useState(false);

  // Modal HUD de inspección de imagen/división en pantalla completa
  const [inspectedDivision, setInspectedDivision] = useState(null);

  // Accordion de Preguntas / Arquitectura
  const [openFaqIdx, setOpenFaqIdx] = useState(0);

  const toggleCardAccordion = (id) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredDivisiones =
    selectedFilter === 'all'
      ? DIVISIONES_PRINCIPALES
      : DIVISIONES_PRINCIPALES.filter((d) => d.id === selectedFilter);

  const heroDivision = DIVISIONES_PRINCIPALES[activeHeroIdx] || DIVISIONES_PRINCIPALES[0];
  const HeroIcon = heroDivision.icono;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative selection:bg-cyan-500 selection:text-slate-950">
      {/* ================= LUCES Y GRILLA CYBER DE FONDO GLOBAL ================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div className="absolute top-[30%] -right-40 w-[550px] h-[550px] rounded-full bg-cyan-500/12 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[25%] w-[600px] h-[600px] rounded-full bg-indigo-600/12 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* ================= BARRA SUPERIOR FUTURISTA (NAVBAR COPAI) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* ESQUINA IZQUIERDA: LOGO COMPLETO COPAI INDUSTRIAS + EMBLEMA C */}
          <div className="flex items-center gap-4">
            <a href="#inicio" className="flex items-center gap-3 group">
              <div className="relative flex items-center">
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-600/25 to-cyan-400/25 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <img
                  src="/copai-media/logo-copai-dark.png"
                  alt="CopAI Industrias"
                  className="relative h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </a>

            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>
              <span className="text-[11px] font-bold tracking-widest uppercase text-cyan-300/90">
                INGENIERÍA &amp; TECNOLOGÍA 4.0
              </span>
            </div>
          </div>

          {/* NAVEGACIÓN CENTRAL CON MENÚ DESPLEGABLE INTERACTIVO */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
            {/* Desplegable de las 4 Divisiones */}
            <div
              className="relative"
              onMouseEnter={() => setNavDropdownOpen(true)}
              onMouseLeave={() => setNavDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-900/90 hover:text-cyan-400 transition-all cursor-pointer"
              >
                <Sparkles size={15} className="text-cyan-400" />
                <span>Divisiones Tecnológicas</span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform duration-200 ${
                    navDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {navDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 w-80 z-50 animate-in fade-in duration-150">
                  <div className="p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400/80 border-b border-slate-800/80">
                      4 Pilares Principales CopAI
                    </div>
                    {DIVISIONES_PRINCIPALES.map((div) => {
                      const IconComp = div.icono;
                      return (
                        <a
                          key={div.id}
                          href={`#div-${div.id}`}
                          onClick={() => {
                            setSelectedFilter('all');
                            setExpandedCards((prev) => ({ ...prev, [div.id]: true }));
                            setNavDropdownOpen(false);
                          }}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-colors mt-0.5">
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {div.titulo}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {div.subtitulo}
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <a
              href="#divisiones"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-2"
            >
              <Layers size={15} className="text-blue-400" />
              <span>Proyectos &amp; Sistemas</span>
            </a>

            <a
              href="#ecosistema"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-2"
            >
              <Cpu size={15} className="text-cyan-400" />
              <span>Ecosistema 360°</span>
            </a>

            <a
              href="#arquitectura"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-2"
            >
              <ShieldCheck size={15} className="text-emerald-400" />
              <span>Preguntas &amp; Seguridad</span>
            </a>
          </nav>

          {/* BOTONES DERECHA: INSTALAR APP E INICIAR SESIÓN */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isStandalone && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 hover:border-cyan-400 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Instalar Aplicativo Oficial COPAI en iPhone o Google Play"
              >
                <Smartphone size={15} className="text-cyan-400" />
                <span className="hidden sm:inline">Descargar App</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            <button
              onClick={onOpenLoginModal}
              className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] border border-cyan-300/30 transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Lock size={15} />
              <span>Iniciar Sesión</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO PRINCIPAL CON VIDEO DE JULIACA EN BUCLE ================= */}
      <section
        id="inicio"
        className="relative min-h-[94vh] pt-24 pb-16 flex flex-col justify-center overflow-hidden border-b border-cyan-500/20"
      >
        {/* VIDEO DE FONDO EN BUCLE (JULIACA) */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/copai-media/video-poster.jpg"
            className={`w-full h-full object-cover transition-all duration-700 ${
              clearVideoMode
                ? 'scale-100 opacity-85 brightness-95 contrast-110'
                : 'scale-105 opacity-45 brightness-75 contrast-125'
            }`}
          >
            <source src="/copai-media/video-fondo.mp4" type="video/mp4" />
          </video>

          {/* Capas de Contraste Oscuro Futurista (Se atenúan si el usuario activa Modo Video HUD) */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              clearVideoMode
                ? 'bg-gradient-to-t from-[#020617] via-[#020617]/40 to-[#020617]/60'
                : 'bg-gradient-to-r from-[#020617]/95 via-[#020617]/80 to-[#020617]/70'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/80" />

          {/* Retícula HUD Satelital sobre el video */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, transparent 30%, #020617 100%), linear-gradient(to right, rgba(6,182,212,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.12) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 64px 64px, 64px 64px'
            }}
          />
        </div>

        {/* CONTENIDO DEL HERO */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4 sm:pt-8">
          {/* Barra superior de telemetría del video en vivo */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-cyan-300">
                NODO OPERATIVO EN VIVO: JULIACA • PUNO • PERÚ
              </span>
            </div>

            <button
              type="button"
              onClick={() => setClearVideoMode(!clearVideoMode)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-400/60 backdrop-blur-xl transition-all cursor-pointer"
              title="Alternar contraste del video de fondo grabado en Juliaca"
            >
              <Play size={13} className="text-cyan-400" />
              <span>
                {clearVideoMode ? 'Volver a Contraste Oscuro' : 'Ver Video de Fondo Más Claro'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* COLUMNA IZQUIERDA (7 cols): IDENTIDAD DE MARCA Y MENSAJE CORPORATIVO */}
            <div className="lg:col-span-7 text-left space-y-6">
              {/* Emblema C + Nombre Corporativo destacado */}
              <div className="inline-flex items-center gap-3.5 p-2 pr-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <img
                    src="/copai-media/copai-c-symbol.png"
                    alt="Símbolo C CopAI"
                    className="w-full h-full object-contain animate-copai-float"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
                    CASA MATRIZ DE TECNOLOGÍA AVANZADA
                  </div>
                  <div className="text-base sm:text-lg font-black tracking-wide text-white">
                    INDUSTRIAS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">COPAI</span>
                  </div>
                </div>
              </div>

              {/* Título Principal Futurista */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Ingeniería sin Límites para la{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400">
                  Industria del Futuro
                </span>
              </h1>

              {/* Descripción Integral */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                En <strong className="text-white font-bold">Industrias CopAI</strong> diseñamos y desplegamos tecnología de alto impacto: desde{' '}
                <span className="text-cyan-300 font-semibold">rastreo satelital GPS y seguridad de flotas</span>,{' '}
                <span className="text-fuchsia-300 font-semibold">visión computacional antirrobo para tiendas</span> y{' '}
                <span className="text-violet-300 font-semibold">robots asistentes autónomos para mercados</span>, hasta{' '}
                <span className="text-sky-300 font-semibold">sistemas turísticos inteligentes</span> y software corporativo a medida.
              </p>

              {/* Botones Principales de Acción */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <button
                  onClick={onOpenLoginModal}
                  className="px-7 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(6,182,212,0.65)] border border-cyan-300/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <Cpu size={18} />
                  <span>Acceso a la Plataforma</span>
                  <ArrowRight size={18} />
                </button>

                <a
                  href="#divisiones"
                  className="px-7 py-4 rounded-2xl font-bold text-sm text-slate-100 bg-slate-900/85 hover:bg-slate-800/90 border border-slate-700 hover:border-cyan-400/50 backdrop-blur-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={17} className="text-cyan-400" />
                  <span>Explorar las 4 Divisiones</span>
                  <ChevronRight size={17} />
                </a>
              </div>

              {/* 4 Indicadores Clave Glassmorphic */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="text-2xl font-black text-white">99.98%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mt-0.5">
                    Uptime Satelital
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="text-2xl font-black text-white">&lt; 100ms</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mt-0.5">
                    Telemetría &amp; IA
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                    4 Divisiones
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    GPS • IA • Robot • Turismo
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                  <div className="text-2xl font-black text-emerald-400">Multi-Tenant</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Subdominios &amp; Apps
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (5 cols): CONSOLA INTERACTIVA DE LAS 4 DIVISIONES */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
                {/* Barra superior tipo terminal HUD */}
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 text-[11px] font-mono font-bold text-cyan-400 tracking-wider">
                      {heroDivision.codigoHud}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    VISOR INTERACTIVO
                  </span>
                </div>

                {/* Selector rápido de las 4 divisiones dentro del Hero */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900/60 border-b border-slate-800/80">
                  {DIVISIONES_PRINCIPALES.map((div, idx) => {
                    const TabIcon = div.icono;
                    const active = idx === activeHeroIdx;
                    return (
                      <button
                        key={div.id}
                        type="button"
                        onClick={() => setActiveHeroIdx(idx)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-gradient-to-b from-blue-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <TabIcon size={15} className={active ? 'text-cyan-300 mb-1' : 'text-slate-400 mb-1'} />
                        <span className="truncate w-full text-center">
                          {div.id === 'gps'
                            ? 'GPS Flota'
                            : div.id === 'camara'
                            ? 'Cámara IA'
                            : div.id === 'robot'
                            ? 'Robot 3D'
                            : 'Turismo'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Imagen activa con escáner HUD */}
                <div className="relative h-56 sm:h-64 overflow-hidden bg-slate-900 group">
                  <img
                    src={heroDivision.imagen}
                    alt={heroDivision.titulo}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Línea de escaneo láser animada */}
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan-400/25 to-transparent pointer-events-none animate-copai-scan" />

                  {/* Botón para abrir en pantalla completa */}
                  <button
                    type="button"
                    onClick={() => setInspectedDivision(heroDivision)}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                  >
                    <Maximize2 size={13} />
                    <span>Ampliar HUD</span>
                  </button>

                  {/* Etiqueta sobre la imagen */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 mb-1.5">
                        DIVISIÓN {heroDivision.numero} • {heroDivision.estado}
                      </span>
                      <h3 className="text-lg font-black text-white leading-snug">
                        {heroDivision.titulo}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Resumen y métricas de la división seleccionada */}
                <div className="p-5 space-y-4">
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3">
                    {heroDivision.resumen}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {heroDivision.metricas.map((m, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center"
                      >
                        <div className="text-xs sm:text-sm font-black text-cyan-300 truncate">
                          {m.valor}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href={`#div-${heroDivision.id}`}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Ver arquitectura y detalles</span>
                      <ChevronRight size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveHeroIdx((prev) => (prev + 1) % DIVISIONES_PRINCIPALES.length)
                      }
                      className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Siguiente módulo ➔
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 1: LAS 4 DIVISIONES PRINCIPALES DE INDUSTRIAS COPAI ================= */}
      <section id="divisiones" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Encabezado de Sección */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles size={14} />
            <span>4 DIVISIONES TECNOLÓGICAS PRINCIPALES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Nuestros Pilares de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Innovación Real
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Selecciona una división o despliega las especificaciones técnicas de cada área para conocer cómo transformamos el transporte, la seguridad en tiendas, los mercados y el turismo.
          </p>
        </div>

        {/* Barra de Filtros Interactiva */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todas las Divisiones (4)
          </button>
          {DIVISIONES_PRINCIPALES.map((div) => {
            const BtnIcon = div.icono;
            const isSelected = selectedFilter === div.id;
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => setSelectedFilter(div.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <BtnIcon size={14} />
                <span>{div.titulo.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Grid de las 4 Tarjetas Futuristas con Fotografías Reales y Desplegables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredDivisiones.map((div) => {
            const CardIcon = div.icono;
            const isExpanded = !!expandedCards[div.id];

            return (
              <div
                key={div.id}
                id={`div-${div.id}`}
                className="group rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 shadow-[0_15px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
              >
                {/* Cabecera Visual con la Imagen Real y HUD */}
                <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-950">
                  <img
                    src={div.imagen}
                    alt={div.titulo}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Gradiente oscuro para legibilidad perfecta */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/35 to-transparent" />

                  {/* Escáner sutil en hover */}
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none animate-copai-scan transition-opacity" />

                  {/* Badges superiores sobre la foto */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/85 border border-cyan-500/40 backdrop-blur-md">
                      <span className="text-xs font-black text-cyan-400">#{div.numero}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-300 tracking-wider">
                        {div.codigoHud}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectedDivision(div)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Maximize2 size={13} />
                      <span>Ver Imagen Completa</span>
                    </button>
                  </div>

                  {/* Título superpuesto en la base de la imagen */}
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-[10px] font-bold uppercase tracking-widest mb-2">
                      <CardIcon size={12} />
                      <span>{div.estado}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      {div.titulo}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-cyan-300/90 mt-1">
                      {div.subtitulo}
                    </p>
                  </div>
                </div>

                {/* Cuerpo de la Tarjeta */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {div.resumen}
                    </p>

                    {/* 3 Mini-Métricas de la División */}
                    <div className="grid grid-cols-3 gap-3">
                      {div.metricas.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90"
                        >
                          <div className="text-xs sm:text-sm font-black text-white">{m.valor}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80 mt-0.5">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Puntos Clave */}
                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                      {div.puntosClave.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="mt-1 p-0.5 rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                            <Check size={13} />
                          </div>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* DESPLEGABLE INTERACTIVO DE ESPECIFICACIONES TÉCNICAS */}
                  <div className="pt-4 border-t border-slate-800/90">
                    <button
                      type="button"
                      onClick={() => toggleCardAccordion(div.id)}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between text-xs sm:text-sm font-bold text-cyan-300 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Terminal size={15} className="text-cyan-400" />
                        <span>
                          {isExpanded
                            ? 'Ocultar Especificaciones & Arquitectura'
                            : 'Desplegar Especificaciones & Seguridad Técnica'}
                        </span>
                      </span>
                      <ChevronDown
                        size={17}
                        className={`transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-cyan-400' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                        {div.especificacionesDesplegables.map((spec, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/20"
                          >
                            <div className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
                              {spec.titulo}
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed">
                              {spec.detalle}
                            </div>
                          </div>
                        ))}

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={onOpenLoginModal}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <span>Acceder al Sistema</span>
                            <ArrowRight size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectedDivision(div)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Maximize2 size={13} />
                            <span>Inspeccionar Imagen</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= SECCIÓN 2: ECOSISTEMA TECNOLÓGICO 360° ("HACEMOS DE TODO EN TECNOLOGÍA") ================= */}
      <section
        id="ecosistema"
        className="relative z-10 py-20 border-y border-slate-800/80 bg-slate-950/60 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
                <Cpu size={14} />
                <span>INGENIERÍA MULTIDISCIPLINARIA 360°</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Industrias CopAI Desarrolla{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Todo a Nivel Tecnológico
                </span>
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Unimos desarrollo de software cloud, inteligencia artificial, electrónica, robótica 3D y telecomunicaciones satelitales bajo una misma marca de ingeniería.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ECOSISTEMA_360.map((mod) => {
              const ModIcon = mod.icono;
              return (
                <div
                  key={mod.id}
                  className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ModIcon size={24} />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        {mod.etiqueta}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white mb-2.5 group-hover:text-cyan-300 transition-colors">
                      {mod.titulo}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-5">
                      {mod.descripcion}
                    </p>
                  </div>

                  <ul className="space-y-2 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
                    {mod.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 3: DESPLEGABLES DE ARQUITECTURA Y SEGURIDAD ================= */}
      <section id="arquitectura" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
            <ShieldCheck size={14} />
            <span>ARQUITECTURA, SEGURIDAD &amp; RESPUESTAS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Conoce Cómo Opera Nuestra Tecnología
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Haz clic en cada apartado desplegable para revisar los detalles técnicos y operativos de Industrias CopAI.
          </p>
        </div>

        <div className="space-y-3.5">
          {PREGUNTAS_ARQUITECTURA.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.12)]'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-white flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                      0{idx + 1}
                    </span>
                    <span>{faq.pregunta}</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {faq.respuesta}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Banner CTA Final */}
        <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-950/90 via-slate-900 to-cyan-950/80 border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <img
              src="/copai-media/copai-c-symbol.png"
              alt="CopAI C"
              className="w-16 h-16 object-contain hidden sm:block animate-copai-float"
            />
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">
                PLATAFORMA CENTRAL &amp; PORTALES EMPRESARIALES
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                ¿Listo para ingresar al Ecosistema CopAI?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Accede a la central de monitoreo satelital, administra tus empresas y dispositivos o instala el aplicativo oficial en tu iPhone o Android.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {!isStandalone && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-bold text-xs text-cyan-300 bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone size={16} />
                <span>Instalar App Móvil</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={16} />
              <span>Iniciar Sesión</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= PIE DE PÁGINA CORPORATIVO COPAI ================= */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#01040D] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src="/copai-media/logo-copai-dark.png"
              alt="Industrias CopAI"
              className="h-9 w-auto object-contain"
            />
            <span className="text-xs text-slate-400 text-center sm:text-left">
              © 2026 <strong className="text-slate-200">Industrias CopAI</strong> • Telemetría GPS, Visión IA, Robótica &amp; Sistemas Turísticos.
            </span>
          </div>

          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-cyan-400" />
              Juliaca • Puno • Arequipa • Lima, Perú
            </span>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
            >
              Acceso a la Central ➔
            </button>
          </div>
        </div>
      </footer>

      {/* ================= MODAL LIGHTBOX HUD PARA INSPECCIONAR IMAGEN Y DIVISIÓN ================= */}
      {inspectedDivision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-200"
          onClick={() => setInspectedDivision(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {inspectedDivision.codigoHud}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-sm font-bold text-white">{inspectedDivision.titulo}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDivision(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-black max-h-[65vh] overflow-hidden flex items-center justify-center">
              <img
                src={inspectedDivision.imagen}
                alt={inspectedDivision.titulo}
                className="w-full max-h-[65vh] object-contain"
              />
            </div>

            <div className="p-6 bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                {inspectedDivision.resumen}
              </p>
              <button
                type="button"
                onClick={() => {
                  setInspectedDivision(null);
                  onOpenLoginModal();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                <span>Iniciar Sesión</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

