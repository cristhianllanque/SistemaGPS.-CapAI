import React, { useState } from 'react';
import {
  Bot, ShieldCheck, Cpu, Satellite,
  ChevronRight, ChevronDown, Check, Smartphone, Lock, ArrowRight,
  Eye, MapPin, Globe, Camera, Compass,
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
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Desplegables (accordions) abiertos en las 4 divisiones
  const [expandedCards, setExpandedCards] = useState({
    gps: true,
    camara: false,
    robot: false,
    turistico: false
  });

  // Desplegable del menú superior "Divisiones"
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  // Modal Lightbox de inspección de imagen en pantalla completa
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

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white overflow-x-hidden">
      {/* ================= BARRA SUPERIOR AMPLIA DE PARED A PARED (BLANCA TRANSLÚCIDA) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-b border-slate-200/80 transition-all shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 h-20 flex items-center justify-between gap-4">
          {/* ESQUINA IZQUIERDA: LOGOTIPO OFICIAL COPAI SOBRE BLANCO */}
          <div className="flex items-center gap-4">
            <a href="#inicio" className="flex items-center gap-3 group">
              <img
                src="/logo-copai.png"
                alt="CopAI Industrias"
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>

            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500">
                Ingeniería &amp; Tecnología
              </span>
            </div>
          </div>

          {/* NAVEGACIÓN CENTRAL */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <div
              className="relative"
              onMouseEnter={() => setNavDropdownOpen(true)}
              onMouseLeave={() => setNavDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className="flex items-center gap-1.5 py-2 text-slate-700 hover:text-blue-600 transition-colors cursor-pointer font-bold"
              >
                <span>Divisiones</span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform duration-200 ${
                    navDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {navDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 w-84 z-50 animate-in fade-in duration-150">
                  <div className="p-2.5 rounded-2xl bg-white/98 backdrop-blur-2xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.14)] space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 border-b border-slate-100">
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
                          <div className="p-2 rounded-xl bg-sky-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mt-0.5">
                            <IconComp size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
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
              className="hover:text-blue-600 transition-colors py-2"
            >
              Proyectos &amp; Sistemas
            </a>

            <a
              href="#ecosistema"
              className="hover:text-blue-600 transition-colors py-2"
            >
              Ecosistema 360°
            </a>

            <a
              href="#arquitectura"
              className="hover:text-blue-600 transition-colors py-2"
            >
              Preguntas
            </a>

            <a
              href="#contacto-copai"
              className="hover:text-blue-600 transition-colors py-2"
            >
              Contacto
            </a>
          </nav>

          {/* BOTONES DERECHA: DESCARGAR APP E INICIAR SESIÓN */}
          <div className="flex items-center gap-3">
            {!isStandalone && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all cursor-pointer active:scale-95"
                title="Instalar Aplicativo Oficial COPAI en iPhone o Google Play"
              >
                <Smartphone size={14} className="text-blue-600" />
                <span className="hidden sm:inline">Descargar App</span>
                <span className="sm:hidden">App</span>
              </button>
            )}

            <button
              onClick={onOpenLoginModal}
              className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-600/20 transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Lock size={14} />
              <span>Iniciar Sesión</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ================= SECCIÓN 1: HERO PANORÁMICO DE PARED A PARED (VIDEO PROTAGONISTA 100% ANCHO) ================= */}
      <section
        id="inicio"
        className="relative w-full min-h-[88vh] sm:min-h-[92vh] flex flex-col justify-between overflow-hidden bg-slate-950"
      >
        {/* VIDEO EN BUCLE DE PARED A PARED (SIN BORDES VACÍOS A LOS COSTADOS) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/copai-media/video-poster.jpg"
            className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05]"
          >
            <source src="/copai-media/video-fondo.mp4" type="video/mp4" />
          </video>

          {/* Gradiente lateral limpio para lectura nítida sin tapar el protagonismo del video */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/20" />
        </div>

        {/* Espacio para compensar la barra superior fija */}
        <div className="h-24 sm:h-28" />

        {/* Contenido Principal sobre el Video Panorámico */}
        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 py-8 sm:py-12 flex-1 flex flex-col justify-center">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 text-slate-950 text-xs font-bold shadow-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="tracking-wide uppercase text-[11px]">
                INGENIERÍA &amp; TECNOLOGÍA EN VIVO • JULIACA, PERÚ
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] drop-shadow-xl">
              Industrias CopAI
            </h1>

            <p className="text-lg sm:text-2xl text-white/95 font-normal leading-relaxed max-w-2xl drop-shadow-md">
              Telemetría satelital GPS y seguridad de flotas, visión computacional antirrobo para tiendas, robótica autónoma 3D y plataformas digitales de alto impacto.
            </p>

            {/* Botones de Acción Inmediata */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenLoginModal}
                className="group px-8 py-4 rounded-full font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-600/30 transition-all duration-200 flex items-center gap-2.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck size={18} />
                <span>Acceso a la Plataforma</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#divisiones"
                className="px-7 py-4 rounded-full font-bold text-sm bg-white/95 hover:bg-white text-slate-950 transition-all shadow-lg flex items-center gap-2"
              >
                <span>Ver nuestras 4 Divisiones</span>
                <ChevronRight size={16} />
              </a>

              <a
                href="https://wa.me/51974342536?text=Hola%20Industrias%20CopAI,%20deseo%20informaci%C3%B3n%20sobre%20sus%20sistemas."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-4 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white border border-white/25 backdrop-blur-md text-xs sm:text-sm font-bold transition-all shadow-lg"
              >
                <Phone size={15} className="text-cyan-400" />
                <span>Central WhatsApp: +51 974 342 536</span>
              </a>
            </div>
          </div>
        </div>

        {/* Fila de 4 Tarjetas Blancas Flotantes al Pie del Video (Igual al diseño amplio de Empresa) */}
        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14 pb-8 sm:pb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Satellite size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Telemetría GPS
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-950">
                100%
                <span className="text-xs font-medium text-slate-500 ml-1.5">Teltonika 4G</span>
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Camera size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Visión IA Antirrobo
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">
                30 FPS
                <span className="text-xs font-medium text-slate-500 ml-1.5">Anillo IR Nocturno</span>
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Bot size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Robótica &amp; Diseño 3D
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-950">
                Autónomo
                <span className="text-xs font-medium text-slate-500 ml-1.5">Asistente V3</span>
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <ShieldCheck size={18} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Operación Continua
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">
                24 / 7
                <span className="text-xs font-medium text-slate-500 ml-1.5">Web • iOS • Android</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BARRA DE NAVEGACIÓN DE LAS 4 DIVISIONES (FONDO BLANCO DE PARED A PARED) ================= */}
      <section id="divisiones" className="w-full bg-white pt-16 pb-8 border-b border-slate-200/70">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                NUESTRAS 4 DIVISIONES PROTAGONISTAS
              </span>
              <h2 className="mt-1.5 text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                Ingeniería visual y operativa en cada sector.
              </h2>
            </div>

            {/* Selector Rápido de División */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'
                }`}
              >
                Ver Todas (4)
              </button>
              {DIVISIONES_PRINCIPALES.map((div) => {
                const BtnIcon = div.icono;
                const isSelected = selectedFilter === div.id;
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => setSelectedFilter(div.id)}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'
                    }`}
                  >
                    <BtnIcon size={14} />
                    <span>{div.titulo.split('&')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= LAS 4 DIVISIONES EN BANDAS DE PARED A PARED CON IMÁGENES GIGANTES PROTAGONISTAS ================= */}
      <div>
        {filteredDivisiones.map((div, index) => {
          const CardIcon = div.icono;
          const isExpanded = !!expandedCards[div.id];
          const isImageRight = index % 2 === 1;

          // Alternancia de bandas de pared a pared:
          // 0: Blanco Puro (#FFFFFF)
          // 1: Azul-Celeste Corporativo CopAI de pared a pared (como la franja de color de empresa)
          // 2: Gris Perla Suave (#F4F7FB)
          // 3: Blanco Puro (#FFFFFF)
          const isBlueBand = index === 1;
          const isSoftGrayBand = index === 2;

          return (
            <section
              key={div.id}
              id={`div-${div.id}`}
              className={`w-full py-16 sm:py-24 border-b transition-colors scroll-mt-20 ${
                isBlueBand
                  ? 'bg-gradient-to-r from-[#0369A1] via-[#0284C7] to-[#0891B2] text-white border-sky-700'
                  : isSoftGrayBand
                  ? 'bg-[#F1F5F9] text-slate-900 border-slate-200/80'
                  : 'bg-white text-slate-900 border-slate-200/80'
              }`}
            >
              <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* COLUMNA DE IMAGEN GIGANTE PROTAGONISTA (7 de 12 columnas = ~60% del ancho de pantalla) */}
                  <div
                    className={`lg:col-span-7 ${
                      isImageRight ? 'lg:order-2' : 'lg:order-1'
                    }`}
                  >
                    <div
                      onClick={() => setInspectedDivision(div)}
                      className="group relative rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(15,23,42,0.18)] border border-black/10 bg-slate-950 cursor-pointer"
                    >
                      <img
                        src={div.imagen}
                        alt={div.titulo}
                        className="w-full h-[340px] sm:h-[460px] lg:h-[560px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

                      {/* Etiqueta superior flotante */}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 text-slate-950 text-xs font-extrabold shadow-md backdrop-blur-md">
                          <CardIcon size={14} className="text-blue-600" />
                          <span>
                            DIVISIÓN {div.numero} • {div.estado}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedDivision(div);
                          }}
                          className="px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer"
                        >
                          <Maximize2 size={13} />
                          <span>Pantalla Completa</span>
                        </button>
                      </div>

                      {/* Pie de foto sobre la imagen */}
                      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
                            {div.codigoHud}
                          </p>
                          <p className="text-lg sm:text-2xl font-black text-white mt-0.5 drop-shadow-md">
                            {div.subtitulo}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DE CONTENIDO E INFORMACIÓN (5 de 12 columnas) */}
                  <div
                    className={`lg:col-span-5 space-y-6 ${
                      isImageRight ? 'lg:order-1' : 'lg:order-2'
                    }`}
                  >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-sky-500/15 text-sky-600 border border-sky-500/20"
                      style={
                        isBlueBand
                          ? { backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }
                          : {}
                      }
                    >
                      <CardIcon size={13} />
                      <span>{div.codigoHud}</span>
                    </div>

                    <h3
                      className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] ${
                        isBlueBand ? 'text-white' : 'text-slate-950'
                      }`}
                    >
                      {div.titulo}
                    </h3>

                    <p
                      className={`text-sm sm:text-base leading-relaxed ${
                        isBlueBand ? 'text-white/90' : 'text-slate-600'
                      }`}
                    >
                      {div.resumen}
                    </p>

                    {/* 3 Métricas Destacadas */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      {div.metricas.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border ${
                            isBlueBand
                              ? 'bg-white text-slate-950 border-white shadow-lg'
                              : 'bg-white border-slate-200/90 shadow-xs'
                          }`}
                        >
                          <div className="text-sm sm:text-base font-black text-slate-950">
                            {m.valor}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Puntos Clave */}
                    <ul
                      className={`space-y-3 text-xs sm:text-sm ${
                        isBlueBand ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {div.puntosClave.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${
                              isBlueBand
                                ? 'bg-white text-blue-600'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            <Check size={12} />
                          </div>
                          <span className="font-medium leading-snug">{pt}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Desplegable de Especificaciones */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => toggleCardAccordion(div.id)}
                        className={`w-full py-3.5 px-5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                          isBlueBand
                            ? 'bg-white/15 hover:bg-white/25 text-white border-white/30'
                            : 'bg-slate-100 hover:bg-slate-200/80 text-slate-900 border-slate-200'
                        }`}
                      >
                        <span>
                          {isExpanded
                            ? 'Ocultar especificaciones técnicas'
                            : 'Desplegar especificaciones técnicas'}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
                          {div.especificacionesDesplegables.map((spec, sIdx) => (
                            <div
                              key={sIdx}
                              className={`p-4 rounded-2xl border ${
                                isBlueBand
                                  ? 'bg-white/95 text-slate-900 border-white'
                                  : 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                              }`}
                            >
                              <div className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mb-1">
                                {spec.titulo}
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {spec.detalle}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botones de Acción de la División */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={onOpenLoginModal}
                        className={`px-7 py-3.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                          isBlueBand
                            ? 'bg-white text-slate-950 hover:bg-slate-100'
                            : 'bg-slate-950 text-white hover:bg-blue-600'
                        }`}
                      >
                        <span>Acceder a Plataforma</span>
                        <ArrowRight size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectedDivision(div)}
                        className={`px-6 py-3.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all border ${
                          isBlueBand
                            ? 'border-white/40 text-white hover:bg-white/10'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Maximize2 size={14} />
                        <span>Ver Fotografía Completa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ================= SECCIÓN 3: ECOSISTEMA 360° (BANDA OSCURA DE PARED A PARED #0B0F17) ================= */}
      <section
        id="ecosistema"
        className="w-full py-24 bg-[#0B0F17] text-white"
      >
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                ECOSISTEMA DE INGENIERÍA 360°
              </span>
              <h2 className="mt-2 text-3xl sm:text-5xl font-black text-white tracking-tight">
                Desarrollo integral bajo un mismo estándar.
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              Integramos arquitectura de software en la nube, inteligencia artificial, diseño electrónico, robótica 3D y telecomunicaciones satelitales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {ECOSISTEMA_360.map((mod) => {
              const ModIcon = mod.icono;
              return (
                <div
                  key={mod.id}
                  className="p-8 sm:p-9 rounded-3xl bg-[#131926] border border-white/10 hover:border-sky-400/50 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-13 h-13 rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-400 flex items-center justify-center p-3">
                        <ModIcon size={24} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/5 text-slate-300">
                        {mod.etiqueta}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">
                      {mod.titulo}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                      {mod.descripcion}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-5 border-t border-white/10 text-xs sm:text-sm text-slate-300">
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

      {/* ================= SECCIÓN 4: PREGUNTAS & ARQUITECTURA (BANDA AMPLIA BLANCO-CELESTE DE PARED A PARED) ================= */}
      <section
        id="arquitectura"
        className="w-full py-24 bg-gradient-to-b from-[#EBF5FF] via-[#F5FAFF] to-white border-b border-slate-200/80"
      >
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Columna Izquierda: Título amplio y resumen */}
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                ARQUITECTURA &amp; RESPUESTAS
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                Conoce cómo opera nuestra tecnología.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Cada sistema de Industrias CopAI está diseñado para funcionar 24/7 con alta disponibilidad, seguridad en tiempo real y soporte directo.
              </p>

              <div className="pt-2">
                <img
                  src="/copai-media/gps.jpg"
                  alt="Operación CopAI"
                  className="w-full h-64 sm:h-72 object-cover rounded-3xl shadow-lg border border-slate-200"
                />
              </div>
            </div>

            {/* Columna Derecha: Acordeón amplio */}
            <div className="lg:col-span-7 space-y-4">
              {PREGUNTAS_ARQUITECTURA.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl bg-white border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? 'border-blue-400 shadow-[0_12px_35px_rgba(37,99,235,0.10)]'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                      className="w-full px-6 sm:px-8 py-5 sm:py-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                          0{idx + 1}
                        </span>
                        <span>{faq.pregunta}</span>
                      </span>
                      <ChevronDown
                        size={20}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-6 sm:px-8 pb-6 pt-2 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.respuesta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECCIÓN 5: CONTACTO OFICIAL DE PARED A PARED (AZUL COPAI + BLANCO) ================= */}
      <section
        id="contacto-copai"
        className="w-full py-20 sm:py-24 bg-gradient-to-r from-[#0F172A] via-[#0B2545] to-[#0369A1] text-white"
      >
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs font-bold text-sky-300 uppercase tracking-widest">
                <span>Atención Directa &amp; Soporte Corporativo</span>
              </div>
              <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Conecta directamente con Industrias CopAI.
              </h3>
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
                Implementamos telemetría satelital GPS para flotas, cámaras de visión computacional antirrobo, robótica y software corporativo a medida.
              </p>

              {/* Tarjetas de Contacto Directo (WhatsApp +51 974 342 536 y Correos Reales) */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="https://wa.me/51974342536?text=Hola%20Industrias%20CopAI,%20deseo%20informaci%C3%B3n%20sobre%20sus%20servicios."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 transition-all flex items-start gap-4 shadow-xl group"
                >
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      WhatsApp &amp; Celular (Perú)
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-950 mt-0.5">
                      +51 974 342 536
                    </div>
                    <div className="text-xs text-emerald-600 font-bold mt-0.5">
                      Escribir por WhatsApp ➔
                    </div>
                  </div>
                </a>

                <div className="p-5 rounded-2xl bg-white text-slate-900 flex items-start gap-4 shadow-xl">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <Mail size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Correos Oficiales
                    </div>
                    <a
                      href="mailto:industriascopai@gmail.com"
                      className="block text-xs sm:text-sm font-black text-slate-950 hover:text-blue-600 truncate mt-0.5"
                    >
                      industriascopai@gmail.com
                    </a>
                    <a
                      href="mailto:cristhianllanque65@gmail.com"
                      className="block text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 truncate mt-0.5"
                    >
                      cristhianllanque65@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Acceso Directo a Plataforma y App */}
            <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src="/logo-copai.png"
                  alt="CopAI"
                  className="h-11 w-auto object-contain"
                />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Plataforma Central &amp; Portales
                </div>
                <div className="text-2xl font-black text-slate-950 mt-0.5">
                  Monitoreo &amp; Gestión 24/7
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                  Ingresa a tu central de monitoreo satelital o instala el aplicativo móvil oficial en tu iPhone o Android.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="w-full py-4 px-6 rounded-full font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock size={15} />
                  <span>Iniciar Sesión en la Plataforma</span>
                  <ArrowRight size={15} />
                </button>

                {!isStandalone && (
                  <button
                    type="button"
                    onClick={onOpenInstallModal}
                    className="w-full py-3.5 px-6 rounded-full font-bold text-xs text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone size={15} className="text-blue-600" />
                    <span>Descargar Aplicativo Móvil (iOS / Android)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PIE DE PÁGINA CORPORATIVO AMPLIO ================= */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-10 px-4 sm:px-8 lg:px-14">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src="/logo-copai.png"
              alt="Industrias CopAI"
              className="h-9 w-auto object-contain"
            />
            <span className="text-xs text-slate-500 text-center sm:text-left">
              © 2026 <strong className="text-slate-800">Industrias CopAI</strong> • Telemetría GPS, Visión IA, Robótica &amp; Sistemas Turísticos.
            </span>
          </div>

          <div className="text-xs text-slate-600 flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin size={14} className="text-blue-600" />
              Juliaca • Puno, Perú
            </span>
            <a
              href="tel:+51974342536"
              className="hover:text-blue-600 font-bold"
            >
              +51 974 342 536
            </a>
            <a
              href="mailto:industriascopai@gmail.com"
              className="hover:text-blue-600 font-bold"
            >
              industriascopai@gmail.com
            </a>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="text-blue-600 hover:text-blue-700 font-extrabold cursor-pointer"
            >
              Acceso a Central ➔
            </button>
          </div>
        </div>
      </footer>

      {/* ================= MODAL LIGHTBOX LIMPIO PARA INSPECCIONAR IMAGEN ================= */}
      {inspectedDivision && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setInspectedDivision(null)}
        >
          <div
            className="relative max-w-5xl w-full rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
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

            <div className="relative bg-slate-950 max-h-[70vh] overflow-hidden flex items-center justify-center">
              <img
                src={inspectedDivision.imagen}
                alt={inspectedDivision.titulo}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-6 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                {inspectedDivision.resumen}
              </p>
              <button
                type="button"
                onClick={() => {
                  setInspectedDivision(null);
                  onOpenLoginModal();
                }}
                className="px-6 py-3 rounded-full bg-slate-950 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 flex-shrink-0 cursor-pointer transition-colors"
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
