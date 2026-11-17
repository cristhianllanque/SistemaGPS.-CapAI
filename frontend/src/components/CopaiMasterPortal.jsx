import React, { useState } from 'react';
import {
  Bot, ShieldCheck, Cpu, Satellite,
  ChevronRight, ChevronDown, Check, Smartphone, Lock, ArrowRight,
  Eye, MapPin, Layers, Globe, Camera, Compass,
  Maximize2, X, Play, Code2, Wifi, Mail, Phone, MessageCircle
} from 'lucide-react';

const DIVISIONES_PRINCIPALES = [
  {
    id: 'gps',
    numero: '01',
    codigoHud: 'DIVISIÓN 01 • TELEMETRÍA VEHICULAR',
    titulo: 'Telemetría Satelital GPS & Seguridad de Flotas',
    subtitulo: 'Rastreo en tiempo real, antirrobo vehicular y despacho inteligente',
    estado: 'EN PRODUCCIÓN ACTIVA',
    imagen: '/copai-media/gps.jpg',
    icono: Satellite,
    resumen:
      'Plataforma satelital de grado industrial conectada a dispositivos Teltonika de última generación. Brindamos seguridad integral para flotas de transporte y vehículos particulares con detección instantánea de botón de pánico, alerta de sabotaje por corte de energía, geocercas inteligentes y subdominios corporativos propios.',
    metricas: [
      { label: 'Latencia TCP/WS', valor: '< 100ms' },
      { label: 'Seguridad Activa', valor: 'Pánico + Sabotaje' },
      { label: 'Multi-Plataforma', valor: 'Web • iOS • Android' }
    ],
    puntosClave: [
      'Detección inmediata de Botón de Pánico en cabina y Sabotaje de batería en tiempo real',
      'Reproducción histórica de rutas con telemetría de velocidad, paradas, avenidas y motor ON/OFF',
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
    codigoHud: 'DIVISIÓN 02 • VISIÓN COMPUTACIONAL',
    titulo: 'Visión Computacional IA & Antirrobo en Tiendas',
    subtitulo: 'Cámaras inteligentes con visión nocturna infrarroja y detección preventiva',
    estado: 'TECNOLOGÍA IA ACTIVA',
    imagen: '/copai-media/camara.jpg',
    icono: Camera,
    resumen:
      'Sistemas de videovigilancia neuronal con iluminación infrarroja (IR) y modelos de Visión Computacional entrenados para detectar robos, hurtos y comportamientos sospechosos en tiendas comerciales, minimarkets, almacenes y galerías antes de que ocurra la pérdida.',
    metricas: [
      { label: 'Visión Nocturna', valor: 'Anillo IR Activo' },
      { label: 'Inferencia IA', valor: 'Tiempo Real 30fps' },
      { label: 'Alertas', valor: 'Directas al Móvil' }
    ],
    puntosClave: [
      'Detección automática de sustracción de prendas o productos y alertas inmediatas al encargado',
      'Anillo de LEDs infrarrojos de alta sensibilidad para operación continua día y noche (0 Lux)',
      'Reconocimiento de zonas restringidas, conteo de clientes y analítica visual en tienda'
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
    codigoHud: 'DIVISIÓN 03 • ROBÓTICA & MECATRÓNICA',
    titulo: 'Robótica Autónoma & Asistentes Inteligentes',
    subtitulo: 'Asistente robótico para alquiler de pañeras y artefactos en mercados',
    estado: 'INGENIERÍA 3D & PROTOTIPADO',
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
        titulo: 'Conectividad con la Nube CopAI',
        detalle: 'Sincronización inalámbrica con el panel administrativo para monitorear batería, ubicación del robot y arqueo diario de alquileres.'
      }
    ]
  },
  {
    id: 'turistico',
    numero: '04',
    codigoHud: 'DIVISIÓN 04 • TURISMO INTELIGENTE',
    titulo: 'Sistemas Turísticos Inteligentes & Rutas Digitales',
    subtitulo: 'Plataformas tecnológicas para turismo, arqueología y transporte turístico',
    estado: 'SOLUCIÓN INTEGRAL',
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
    items: ['Disponible en Google Play Store para Android', 'Experiencia WebApp nativa en iPhone (iOS)', 'Alertas sonoras y vibración en tiempo real']
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
      'Trabajamos con hardware Teltonika homologado que reporta ubicación exacta al segundo, avenida o calle en vivo, velocidad, estado de motor (ON/OFF), voltaje de batería del vehículo y nivel de batería interna. Si alguien intenta desconectar la batería (sabotaje) o el conductor presiona el botón de pánico, la central y el celular reciben una alarma sonora instantánea.'
  }
];

export default function CopaiMasterPortal({
  isStandalone,
  onOpenLoginModal,
  onOpenInstallModal
}) {
  // Modo activo en el escaparate principal: 'video' (Video de Juliaca) o índice 0..3 de división
  const [activeShowcase, setActiveShowcase] = useState('video');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Desplegables (accordions) abiertos en las 4 tarjetas principales
  const [expandedCards, setExpandedCards] = useState({
    gps: true,
    camara: false,
    robot: false,
    turistico: false
  });

  // Desplegable del menú superior "Divisiones"
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  // Modal Lightbox de inspección de imagen/división en pantalla completa
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

  const activeDivisionObj =
    typeof activeShowcase === 'number'
      ? DIVISIONES_PRINCIPALES[activeShowcase] || DIVISIONES_PRINCIPALES[0]
      : DIVISIONES_PRINCIPALES[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* ================= BARRA SUPERIOR LIMPIA ESTILO APPLE (BLANCA TRANSLÚCIDA) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* ESQUINA IZQUIERDA: LOGOTIPO OFICIAL COPAI SOBRE BLANCO */}
          <div className="flex items-center gap-4">
            <a href="#inicio" className="flex items-center gap-3 group">
              <img
                src="/logo-copai.png"
                alt="CopAI Industrias"
                className="h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>

            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
                Ingeniería &amp; Tecnología
              </span>
            </div>
          </div>

          {/* NAVEGACIÓN CENTRAL MINIMALISTA */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <div
              className="relative"
              onMouseEnter={() => setNavDropdownOpen(true)}
              onMouseLeave={() => setNavDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className="flex items-center gap-1.5 py-2 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-semibold"
              >
                <span>Divisiones</span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform duration-200 ${
                    navDropdownOpen ? 'rotate-180 text-slate-900' : ''
                  }`}
                />
              </button>

              {navDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 w-80 z-50 animate-in fade-in duration-150">
                  <div className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.12)] space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      4 Divisiones de Ingeniería
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
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors mt-0.5">
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                              {div.titulo}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
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
              className="hover:text-slate-950 transition-colors py-2"
            >
              Proyectos &amp; Sistemas
            </a>

            <a
              href="#ecosistema"
              className="hover:text-slate-950 transition-colors py-2"
            >
              Ecosistema 360°
            </a>

            <a
              href="#arquitectura"
              className="hover:text-slate-950 transition-colors py-2"
            >
              Preguntas
            </a>

            <a
              href="#contacto-copai"
              className="hover:text-slate-950 transition-colors py-2"
            >
              Contacto
            </a>
          </nav>

          {/* BOTONES DERECHA: DESCARGAR APP E INICIAR SESIÓN */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {!isStandalone && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all cursor-pointer active:scale-95"
                title="Instalar Aplicativo Oficial COPAI en iPhone o Google Play"
              >
                <Smartphone size={14} className="text-sky-600" />
                <span className="hidden sm:inline">Descargar App</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            <button
              onClick={onOpenLoginModal}
              className="px-5 sm:px-6 py-2.5 rounded-full font-semibold text-xs sm:text-sm text-white bg-slate-950 hover:bg-blue-600 shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Lock size={14} />
              <span>Iniciar Sesión</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ================= SECCIÓN 1: HERO EDITORIAL LIMPIO (FONDO BLANCO #FFFFFF) ================= */}
      <section
        id="inicio"
        className="relative pt-28 sm:pt-32 pb-20 bg-white border-b border-slate-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabecera Centrada Estilo Apple / Tesla */}
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>INGENIERÍA EN VIVO • JULIACA, PUNO, PERÚ</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 leading-[1.06]">
              Tecnología diseñada para{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                el mundo real.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-normal">
              En <strong className="text-slate-950 font-semibold">Industrias CopAI</strong> desarrollamos soluciones de alta ingeniería: telemetría satelital GPS y seguridad de flotas, visión computacional antirrobo para comercios, robótica autónoma y plataformas digitales a medida.
            </p>

            {/* Botones Principales */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={onOpenLoginModal}
                className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-sm text-white bg-slate-950 hover:bg-blue-600 shadow-lg shadow-slate-950/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <span>Acceso a la Plataforma</span>
                <ArrowRight size={17} />
              </button>

              <a
                href="#divisiones"
                className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-sm text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition-all flex items-center justify-center gap-2"
              >
                <span>Explorar las 4 Divisiones</span>
                <ChevronRight size={17} />
              </a>

              <a
                href="https://wa.me/51974342536?text=Hola%20Industrias%20CopAI,%20deseo%20informaci%C3%B3n%20sobre%20sus%20sistemas."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-4 rounded-full font-semibold text-sm text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 bg-white transition-all flex items-center justify-center gap-2"
              >
                <Phone size={15} className="text-sky-600" />
                <span>+51 974 342 536</span>
              </a>
            </div>
          </div>

          {/* ESCAPARATE CINEMATOGRÁFICO PANORÁMICO (VIDEO DE JULIACA + 4 DIVISIONES) */}
          <div className="mt-12 sm:mt-16">
            {/* Pestañas limpias estilo Apple para alternar entre Video en Vivo y las 4 Divisiones */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveShowcase('video')}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeShowcase === 'video'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Play size={13} className={activeShowcase === 'video' ? 'text-sky-400' : 'text-slate-500'} />
                <span>Operación en Vivo (Video)</span>
              </button>

              {DIVISIONES_PRINCIPALES.map((div, idx) => {
                const TabIcon = div.icono;
                const isSelected = activeShowcase === idx;
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => setActiveShowcase(idx)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    <TabIcon size={13} className={isSelected ? 'text-sky-400' : 'text-slate-500'} />
                    <span>
                      {div.id === 'gps'
                        ? '01. Telemetría GPS'
                        : div.id === 'camara'
                        ? '02. Visión IA'
                        : div.id === 'robot'
                        ? '03. Robótica 3D'
                        : '04. Turismo Digital'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Marco Panorámico Redondeado con el Video Real o la División Seleccionada */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 shadow-[0_25px_70px_rgba(15,23,42,0.12)]">
              {activeShowcase === 'video' ? (
                <div className="relative h-[380px] sm:h-[480px] lg:h-[540px] w-full overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/copai-media/video-poster.jpg"
                    className="w-full h-full object-cover"
                  >
                    <source src="/copai-media/video-fondo.mp4" type="video/mp4" />
                  </video>

                  {/* Sombra inferior sutil solo para apoyar el texto informativo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-2xl space-y-2">
                      <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20">
                        Monitoreo &amp; Despliegue Real
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                        Control absoluto de flotas, comercios y operaciones.
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        Infraestructura conectada 24/7 con servidores de baja latencia, aplicaciones móviles nativas y portales independientes para cada empresa cliente.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={onOpenLoginModal}
                        className="px-6 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Ingresar al Sistema</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 bg-white">
                  <div className="lg:col-span-7 relative h-[300px] sm:h-[420px] lg:h-[480px] overflow-hidden bg-slate-100">
                    <img
                      src={activeDivisionObj.imagen}
                      alt={activeDivisionObj.titulo}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setInspectedDivision(activeDivisionObj)}
                      className="absolute top-4 right-4 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-slate-900 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Maximize2 size={13} />
                      <span>Ampliar imagen</span>
                    </button>
                  </div>

                  <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white text-slate-900">
                    <div className="space-y-4">
                      <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-sky-600">
                        {activeDivisionObj.codigoHud}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                        {activeDivisionObj.titulo}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {activeDivisionObj.resumen}
                      </p>

                      <div className="grid grid-cols-3 gap-2.5 pt-2">
                        {activeDivisionObj.metricas.map((m, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center"
                          >
                            <div className="text-xs sm:text-sm font-black text-slate-950 truncate">
                              {m.valor}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              {m.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`#div-${activeDivisionObj.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <span>Ver especificaciones completas</span>
                        <ChevronRight size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={onOpenLoginModal}
                        className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Acceder
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4 Indicadores Clave Minimalistas en Blanco */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-2xl sm:text-3xl font-black text-slate-950">99.98%</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Disponibilidad y Uptime Satelital
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-2xl sm:text-3xl font-black text-slate-950">&lt; 100ms</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Transmisión de Telemetría e IA
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-2xl sm:text-3xl font-black text-blue-600">4 Divisiones</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  GPS • Visión IA • Robótica • Turismo
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-2xl sm:text-3xl font-black text-slate-950">Multi-Tenant</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Portales Web y Apps iOS / Android
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 2: LAS 4 DIVISIONES PRINCIPALES (FONDO GRIS PERLA #F5F5F7 ESTILO APPLE) ================= */}
      <section id="divisiones" className="py-24 bg-[#F5F5F7] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Encabezado de Sección */}
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              DIVISIONES TECNOLÓGICAS
            </span>
            <h2 className="mt-2 text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
              Cuatro pilares de innovación real.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              Soluciones diseñadas, programadas y desplegadas por nuestro equipo de ingeniería para resolver desafíos reales en transporte, seguridad comercial, mercados y turismo.
            </p>
          </div>

          {/* Barra de Filtros Limpia */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-950 border border-slate-200/90'
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
                  className={`px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-950 border border-slate-200/90'
                  }`}
                >
                  <BtnIcon size={14} className={isSelected ? 'text-sky-400' : 'text-slate-500'} />
                  <span>{div.titulo.split('&')[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Grid de 4 Tarjetas Blancas Limpias (Estilo Apple Bento) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredDivisiones.map((div) => {
              const CardIcon = div.icono;
              const isExpanded = !!expandedCards[div.id];

              return (
                <div
                  key={div.id}
                  id={`div-${div.id}`}
                  className="group rounded-3xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all duration-300 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col"
                >
                  {/* Fotografía Real Limpia sin Filtros Oscuros Excesivos */}
                  <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-100">
                    <img
                      src={div.imagen}
                      alt={div.titulo}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Etiquetas Superiores */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-900 text-[11px] font-bold shadow-sm backdrop-blur-md">
                        <CardIcon size={12} className="text-blue-600" />
                        <span>
                          {div.numero} • {div.estado}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setInspectedDivision(div)}
                        className="px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer"
                      >
                        <Maximize2 size={12} />
                        <span>Ampliar</span>
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta en Blanco Puro */}
                  <div className="p-7 sm:p-9 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                          {div.subtitulo}
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-snug">
                          {div.titulo}
                        </h3>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {div.resumen}
                      </p>

                      {/* 3 Mini-Métricas Sobrias */}
                      <div className="grid grid-cols-3 gap-3">
                        {div.metricas.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-slate-200/60"
                          >
                            <div className="text-xs sm:text-sm font-black text-slate-950">
                              {m.valor}
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                              {m.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Puntos Clave */}
                      <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                        {div.puntosClave.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <div className="mt-1 p-0.5 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
                              <Check size={13} />
                            </div>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Desplegable Limpio de Especificaciones */}
                    <div className="pt-5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleCardAccordion(div.id)}
                        className="w-full py-3 px-4 rounded-2xl bg-[#F5F5F7] hover:bg-slate-200/70 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 transition-all cursor-pointer"
                      >
                        <span>
                          {isExpanded
                            ? 'Ocultar especificaciones técnicas'
                            : 'Ver especificaciones técnicas y arquitectura'}
                        </span>
                        <ChevronDown
                          size={17}
                          className={`transition-transform duration-300 ${
                            isExpanded ? 'rotate-180 text-blue-600' : 'text-slate-500'
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                          {div.especificacionesDesplegables.map((spec, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70"
                            >
                              <div className="text-xs font-bold text-slate-900 mb-1">
                                {spec.titulo}
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {spec.detalle}
                              </div>
                            </div>
                          ))}

                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={onOpenLoginModal}
                              className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <span>Acceder al Sistema</span>
                              <ArrowRight size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setInspectedDivision(div)}
                              className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Maximize2 size={13} />
                              <span>Ver foto completa</span>
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
        </div>
      </section>

      {/* ================= SECCIÓN 3: ECOSISTEMA 360° (SECCIÓN OSCURA DE CONTRASTE #0B0F17 ESTILO APPLE PRO / TESLA) ================= */}
      <section
        id="ecosistema"
        className="py-24 bg-[#0B0F17] text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                ECOSISTEMA DE INGENIERÍA 360°
              </span>
              <h2 className="mt-2 text-3xl sm:text-5xl font-black text-white tracking-tight">
                Desarrollo integral bajo un mismo estándar.
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Integramos arquitectura de software en la nube, inteligencia artificial, diseño electrónico, robótica 3D y telecomunicaciones satelitales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ECOSISTEMA_360.map((mod) => {
              const ModIcon = mod.icono;
              return (
                <div
                  key={mod.id}
                  className="p-8 rounded-3xl bg-[#131926] border border-white/10 hover:border-sky-400/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-sky-400 flex items-center justify-center">
                        <ModIcon size={22} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/5 text-slate-300">
                        {mod.etiqueta}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2.5">
                      {mod.titulo}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                      {mod.descripcion}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                    {mod.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
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

      {/* ================= SECCIÓN 4: PREGUNTAS FRECUENTES (TRANSICIÓN BLANCO CON MATIZ CELESTE SUAVE #F0F7FF -> #FFFFFF) ================= */}
      <section
        id="arquitectura"
        className="py-24 bg-gradient-to-b from-[#F0F7FF] via-[#F8FBFF] to-white border-b border-slate-200/70"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
              ARQUITECTURA &amp; RESPUESTAS
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Conoce cómo opera nuestra tecnología.
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Respuestas claras sobre nuestros sistemas de rastreo satelital, visión artificial, robótica y portales corporativos.
            </p>
          </div>

          <div className="space-y-3.5">
            {PREGUNTAS_ARQUITECTURA.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl bg-white border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-blue-300 shadow-[0_10px_30px_rgba(37,99,235,0.08)]'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        0{idx + 1}
                      </span>
                      <span>{faq.pregunta}</span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.respuesta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 5: CONTACTO CORPORATIVO OFICIAL (FONDO BLANCO #FFFFFF) ================= */}
      <section id="contacto-copai" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#F5F5F7] border border-slate-200/80 p-8 sm:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-blue-600">
                  <span>Atención Directa &amp; Soporte Corporativo</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                  Conecta con el equipo de Industrias CopAI.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                  ¿Deseas implementar rastreo satelital GPS en tu flota, cámaras de visión computacional en tu negocio o desarrollar un sistema a medida? Escríbenos o llámanos directamente.
                </p>

                {/* Tarjetas de Contacto Directo (Correos Reales y WhatsApp +51 974 342 536) */}
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="https://wa.me/51974342536?text=Hola%20Industrias%20CopAI,%20deseo%20informaci%C3%B3n%20sobre%20sus%20servicios."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 transition-all flex items-start gap-3.5 shadow-2xs group"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        WhatsApp &amp; Celular (Perú)
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                        +51 974 342 536
                      </div>
                      <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                        Atención inmediata ➔
                      </div>
                    </div>
                  </a>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 flex items-start gap-3.5 shadow-2xs">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Mail size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Correos Oficiales
                      </div>
                      <a
                        href="mailto:industriascopai@gmail.com"
                        className="block text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 truncate mt-0.5"
                      >
                        industriascopai@gmail.com
                      </a>
                      <a
                        href="mailto:cristhianllanque65@gmail.com"
                        className="block text-xs text-slate-600 hover:text-blue-600 truncate mt-0.5"
                      >
                        cristhianllanque65@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Acceso Directo a Plataforma y App */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/copai-symbol.png"
                    alt="CopAI"
                    className="w-12 h-12 rounded-2xl object-contain border border-slate-100 p-1"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Plataforma Central
                    </div>
                    <div className="text-lg font-black text-slate-950">
                      Monitoreo &amp; Gestión 24/7
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Si ya eres cliente, gerente u operador autorizado, ingresa a tu central de monitoreo o descarga el aplicativo móvil oficial en tu iPhone o Android.
                </p>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-slate-950 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock size={15} />
                    <span>Iniciar Sesión en la Plataforma</span>
                    <ArrowRight size={15} />
                  </button>

                  {!isStandalone && (
                    <button
                      type="button"
                      onClick={onOpenInstallModal}
                      className="w-full py-3.5 px-6 rounded-full font-semibold text-xs text-slate-800 bg-slate-100 hover:bg-slate-200/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone size={15} className="text-blue-600" />
                      <span>Descargar Aplicativo Móvil (iOS / Android)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PIE DE PÁGINA CORPORATIVO LIMPIO ================= */}
      <footer className="border-t border-slate-200/80 bg-[#F5F5F7] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src="/logo-copai.png"
              alt="Industrias CopAI"
              className="h-8 w-auto object-contain"
            />
            <span className="text-xs text-slate-500 text-center sm:text-left">
              © 2026 <strong className="text-slate-800">Industrias CopAI</strong> • Telemetría GPS, Visión IA, Robótica &amp; Sistemas Turísticos.
            </span>
          </div>

          <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-600" />
              Juliaca • Puno, Perú
            </span>
            <a
              href="tel:+51974342536"
              className="hover:text-slate-900 font-semibold"
            >
              +51 974 342 536
            </a>
            <a
              href="mailto:industriascopai@gmail.com"
              className="hover:text-slate-900 font-semibold"
            >
              industriascopai@gmail.com
            </a>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
            >
              Acceso a Central ➔
            </button>
          </div>
        </div>
      </footer>

      {/* ================= MODAL LIGHTBOX LIMPIO PARA INSPECCIONAR IMAGEN ================= */}
      {inspectedDivision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setInspectedDivision(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-blue-600">
                  {inspectedDivision.codigoHud}
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-sm font-bold text-slate-900">{inspectedDivision.titulo}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDivision(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-slate-950 max-h-[65vh] overflow-hidden flex items-center justify-center">
              <img
                src={inspectedDivision.imagen}
                alt={inspectedDivision.titulo}
                className="w-full max-h-[65vh] object-contain"
              />
            </div>

            <div className="p-6 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                {inspectedDivision.resumen}
              </p>
              <button
                type="button"
                onClick={() => {
                  setInspectedDivision(null);
                  onOpenLoginModal();
                }}
                className="px-6 py-2.5 rounded-full bg-slate-950 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 flex-shrink-0 cursor-pointer transition-colors"
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
