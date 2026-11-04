# 📋 Estado del Proyecto: Industrias Copai Telematics GPS

> **Documento de Memoria y Continuidad para la siguiente sesión**  
> *Última actualización: 3 de Noviembre, 2026*

---

## 🌐 1. Infraestructura Activa en Producción (AWS EC2)

| Componente | Detalle / Configuración | Estado |
| :--- | :--- | :--- |
| **Dominio Principal** | `https://industriascopai.com` | ✅ 100% Operativo con SSL Let's Encrypt |
| **Subdominios Directos** | `https://*.industriascopai.com` (ej: `huaynaroque.industriascopai.com`) | ✅ Subdominio nativo sin redirección; cada empresa mantiene su URL independiente |
| **Servidor Cloud** | AWS EC2 Ubuntu 24.04 (`16.58.34.113` - `i-045aa9d782b3730c5`) | ✅ Activo y Estable |
| **IP Elástica Asignada** | `16.58.34.113` (Fija y vinculada a los dominios DNS) | ✅ Vinculada a la instancia EC2 |
| **Puerto Teltonika GPS** | TCP `5000` (`0.0.0.0:5000`) | ✅ En escucha para tramas Codec 8 / 8 Extended |
| **Backend REST & WS** | FastAPI + Uvicorn (`copay-backend.service`) | ✅ Activo en `127.0.0.1:8000` |
| **Servidor Multimedia** | Proxy `/uploads/` en Nginx -> FastAPI StaticFiles | ✅ Logos y fotos panorámicas cargan 200 OK en cualquier subdominio |
| **Base de Datos** | MariaDB (`teltonika`), usuario `copay_user` | ✅ Tablas y datos sincronizados en disco persistente EBS |
| **Frontend Web** | React 19 + Vite 8 en `/var/www/copay/html` | ✅ Servido por Nginx con gzip y cache |
| **Pipeline CI/CD** | GitHub Actions (`.github/workflows/deploy.yml`) | ✅ 100% Automatizado (un push despliega en ~50s) |
| **Servicio de Correos** | Brevo SMTP (`notificaciones@industriascopai.com`) | ✅ Entrega de credenciales corporativas activa |

---

## 🚀 2. Lo que dejamos completado y funcionando

1. **Subdominios Nativos por Empresa (Aislamiento Total)**:
   - Eliminada la redirección que enviaba al dominio raíz `industriascopai.com/?empresa=...`.
   - Ahora `https://huaynaroque.industriascopai.com/` se mantiene permanentemente en la barra de direcciones.
   - El frontend detecta automáticamente el subdominio (`huaynaroque`), carga su portal white-label exclusivo y autentica exclusivamente a los usuarios de esa empresa.
   - La sesión de Superadmin en `industriascopai.com` queda 100% aislada y ya no invade los portales de las empresas.

2. **Personalización Dinámica con Paleta de 3 Colores (Cero Tonos Ajenos)**:
   - Los portales white-label ahora se adaptan con fidelidad 100% a la paleta contratada:
     - Primario (ej. `#16A34A` para Huayna Roque): botones, insignias, iconos satelitales, velocidad y acentos.
     - Secundario (ej. `#FFFFFF`): textos de contraste, fondos de tarjetas y tipografías legibles.
     - Fondo / Terciario (ej. `#CCF5DC`): fondo limpio, suave y fresco del portal, sin tintes negros forzados ni tonos oscuros espaciales que parecían "IA genérica".
   - Eliminados todos los tonos amarillos/ámbar o púrpuras que desentonaban; cada portal respeta estrictamente los colores de la empresa cliente.

3. **Soporte Multimedia Dual: Foto Panorámica y Video en Bucle (MP4 / WEBM)**:
   - Se habilitó la subida tanto de imágenes (`.png`, `.jpg`, `.webp`) como de videos en bucle (`.mp4`, `.webm`) para el fondo del hero principal (ideal para videos de 10 segundos).
   - Nginx configurado con el modificador prioritario `location ^~ /uploads/` y `client_max_body_size 60M`, resolviendo definitivamente los errores 404 al solicitar fotos o videos de la flota.
   - La foto real del vehículo (miniván Mercedes-Benz de Huayna Roque) y su logotipo oficial cargan inmediatamente en alta resolución.

4. **Navegación Corporativa Dedicada por Empresa**:
   - Barra superior con menú de secciones ejecutivas: `Inicio`, `Rutas & Cobertura`, `Telemetría GPS`, `Seguridad` y `Contacto`.
   - Navegación fluida con scroll suave a cada pilar tecnológico de la empresa.

5. **Corrección de Enlaces desde el Superadmin**:
   - Corregido el botón de previsualización en el modal de empresas para que no envíe el formulario ni redirija al usuario al Dashboard.
   - Incorporado botón directo **"Ver Portal Web ↗"** en la cabecera del modal de edición que abre el subdominio de la empresa en una nueva pestaña.

6. **Isotipo Oficial y Marca Corporativa COPAI**:
   - Eliminado el icono genérico de Vite (el rayito morado `favicon.svg`) y la palabra "frontend" en la pestaña.
   - Integrado el isotipo oficial "C" de red neuronal en alta definición con fondo transparente (`copai-symbol.png`, `favicon.png`, `favicon.ico`).
   - El título en la pestaña del navegador ahora muestra **`COPAI`** en el portal central y `${empresa} | Telematics GPS` en subdominios de clientes.
   - En la barra lateral y barras de navegación ahora dice **`COPAI`** de forma limpia y profesional.

7. **Panel de Flota Colapsable y Responsive para Móviles y Pantalla Dividida**:
   - En el panel de monitoreo (`MonitoringPage.jsx`, `Sidebar.jsx`, `LiveMap.jsx`), se integró el botón **"Colapsar"** que oculta la lista de vehículos para permitir ver el mapa satelital al 100% de la pantalla sin estorbos.
   - Botón flotante superior en el mapa `Flota (N)` para reabrir la lista de vehículos al instante.
   - Adaptabilidad móvil completa: la lista se abre como drawer lateral con fondo translúcido (`backdrop`). Al tocar un vehículo, el panel se auto-cierra para mostrar la unidad en el mapa.
   - Botón flotante inferior en móviles para consultar la lista de vehículos rápidamente con una mano.
   - Auto-recálculo de Leaflet (`map.invalidateSize()`) tras colapsar/expandir para que el mapa no se corte ni se desplace.
   - Widget flotante de límite de velocidad integrado sobre el mapa con opción de ajuste rápido según permisos.

8. **Aplicación Móvil PWA Multi-Tenant Instalable (Android & iOS - Costo $0)**:
   - **Manifiesto Dinámico por Empresa (`/api/pwa/manifest.json`)**: El backend de FastAPI detecta el subdominio del cliente (`huaynaroque.industriascopai.com`, `solorzano.industriascopai.com`, etc.) y entrega automáticamente el nombre, icono oficial (`logo_url`) y color de tema correspondientes a esa empresa, o el isotipo oficial `COPAI GPS` en el portal central.
   - **Instalación Oficial en Android**: Soporte nativo de un toque que añade la aplicación a la pantalla de inicio con su propio icono y abre en modo `standalone` a pantalla completa.
   - **Instalación Oficial en iPhone (iOS Safari)**: Inyección dinámica de meta-etiquetas (`apple-touch-icon`, `apple-mobile-web-app-title`, `apple-mobile-web-app-capable`) y modal asistido de 3 pasos (Compartir ➔ Agregar a Inicio) para abrir sin barras de Safari.
   - **Service Worker Activo (`/sw.js`)**: Soporte para notificaciones push en segundo plano (alarmas de pánico, sabotaje y exceso de velocidad) con vibración háptica y redirección directa al vehículo en alerta.
   - **Botón de Instalación en Correos de Bienvenida**: Añadido el botón directo `[ 📲 Instalar App Móvil Oficial ]` en los correos de credenciales de Brevo SMTP.
   - **Botón "Instalar App" en Cabeceras y Menú Lateral**: Disponible de forma no intrusiva en el encabezado de cada portal y en la barra lateral del sistema para usuarios autenticados.

9. **Aplicación Nativa Android APK (Capacitor Standalone v1.2)**:
   - **Arquitectura Local 100% Empaquetada (Offline-First)**: Eliminada cualquier carga remota de WebView (`server.url` removido de Capacitor). El APK incluye todo el bundle de React (`dist/assets`) instalado físicamente dentro del celular.
   - **Conexión de Red Centralizada**: El APK utiliza `https://industriascopai.com` para peticiones REST y `wss://industriascopai.com` para telemetría satelital en tiempo real por WebSockets.
   - **Pantalla de Login Móvil Dedicada (`MobileLoginView.jsx`)**:
     - Estética Dark Tech / Glassmorphism inmersiva con degradados, destellos y el nuevo logotipo constelación CopAi.
     - Entradas táctiles para correo y contraseña con visualizador de clave.
     - Memoria de empresa local (`last_empresa`): Si el chofer o gerente ya inició sesión una vez, la app recuerda su empresa y carga su logo y color oficial al abrirse, con botón para cambiar de empresa.
     - Cero textos de marketing o landing de escritorio en el celular.
   - **Navegación Móvil Inferior Nativa (`MobileBottomNav.jsx`)**:
     - 🗺️ **Mapa:** Pantalla completa limpia (la barra lateral de escritorio se oculta automáticamente en móviles `hidden md:flex`).
     - 🚛 **Mi Flota:** Lista de vehículos y unidades activas. Los administradores de empresa (`admin`) pueden editar parámetros y límites.
     - 🚨 **Alertas:** Monitor de alarmas críticas (pánico, exceso de velocidad, sabotaje) con contador dinámico en vivo.
     - 🛣️ **Historial:** Consulta de recorridos y paradas.
     - 👤 **Perfil / Ajustes:** Datos de la cuenta activa, rol y cierre de sesión.
   - **Cabecera Móvil Compacta:** Con el logo oficial del cliente, nombre de la flota y badge de alerta de emergencia.
   - **Archivos Compilados Listos para Distribución**:
     - `d:\Teltonika\CopaiGPS.apk` (Versión 1.2, Build 3).
     - `d:\Teltonika\HuaynaRoque_GPS.apk` (Sincronizado con la misma compilación).
     - Disponibles en `frontend/dist/descargas/` para descarga web directa.
   - **Regla de Oro Preservada**: El sitio web de escritorio corporativo en computadoras (`window.innerWidth > 768`) permanece 100% idéntico e inalterado.

---

## 📌 3. RECORDATORIO DE CONTINUIDAD: DÓNDE NOS QUEDAMOS PARA MAÑANA

> [!NOTE]  
> **Estado de Cierre de Sesión (18/10/2026 - 23:55)**:  
> El APK nativo Android ya quedó probado exitosamente en el dispositivo por el usuario. Ya no abre el navegador web ni carga la web antigua; ahora se comporta y se ve como una verdadera aplicación móvil nativa con su login táctil, pantalla completa para el mapa y barra de navegación inferior.

### 📋 Roadmap de Mejoras Pendientes para la Siguiente Sesión:

1. [ ] **Pulido y Mejoras de Vistas en la App Móvil**:
   - Optimizar el diseño táctil de la pantalla **"Mi Flota"** (`/vehiculos`) para que las tarjetas de minivanes/buses se vean como una app de catálogo vehicular nativo.
   - Adaptar la vista de **"Historial de Rutas"** (`/historial-rutas`) con selector de fecha/hora simplificado para uso con una sola mano.
   - Enriquecer la pestaña **"Perfil / Ajustes"** (`/dashboard` en móvil) con información del conductor/gerente, versión del APK instalada (v1.2) y botón de soporte técnico.
   - Ajustar el espaciado de controles táctiles en el mapa (zoom, capas satélite/callejero y centrado de unidad).

2. [x] **Migración y Despliegue en Nueva Cuenta AWS EC2 (16.58.34.113)**:
   - Servidor Ubuntu 24.04 LTS (`i-045aa9d782b3730c5` en us-east-2) aprovisionado desde cero.
   - MariaDB, Nginx, Certbot SSL Let's Encrypt para `industriascopai.com` y `www.industriascopai.com` 100% operativos.
   - Variables de entorno `.env` con conexión Brevo SMTP y credenciales seguras.
   - Servicio `copay-backend` en `systemd` activo en puerto 8000 (FastAPI) y puerto 5000 (Teltonika TCP AVL).
   - Firewall UFW activo con puertos 22, 80, 443, 5000 y 8000.
   - APKs instaladores (`CopaiGPS.apk` y `HuaynaRoque_GPS.apk`) disponibles en almacenamiento persistente y descargables vía HTTPS en `/descargas/`.

3. [ ] **Soporte y Estrategia para Dispositivos iOS (iPhone)**:
   - Afinar la experiencia de instalación guiada en iOS (Safari PWA de pantalla completa con el icono constelación CopAi / Huayna Roque).

4. [ ] **Pruebas de Campo con Vehículos Reales en Ruta**:
   - Validar la **alarma sonora y notificación acústica** en cabina/despacho al superar el límite de velocidad fijado para la empresa.
   - Verificación en campo del **Botón de Pánico físico SOS** del GPS Teltonika.
   - Verificación de la **Alarma de Sabotaje** (desconexión o corte de alimentación física).
   - Trazado en tiempo real de tramas Codec 8 / 8 Extended por el puerto TCP `5000` con vehículo en marcha.

---

## 🛑 4. Guía de Apagado y Encendido de AWS EC2 (Ahorro de Costos y Saldo)

> **Tranquilidad para el Administrador**:  
> Si decides apagar la instancia para que descanse y no consuma saldo de cómputo en AWS:

1. **¿Qué ocurre al "Detener" (Stop Instance)?**:
   - **NO se borra absolutamente nada de nada**. El disco de almacenamiento EBS (SSD en la nube de AWS) almacena de forma persistente:
     - Todo el código fuente del proyecto (`/var/www/copay` y `/home/ubuntu/teltonika`).
     - La base de datos MariaDB con todas las empresas, usuarios, credenciales y coordenadas.
     - Las fotos y videos subidos (`/uploads/`).
     - Los certificados de seguridad SSL Let's Encrypt de todos los dominios y subdominios.
     - Las configuraciones de Nginx y servicios del sistema.
   - **La IP Elástica `16.58.34.113` se mantiene fija y asignada**: No cambiará de dirección IP pública, por lo que tus dominios en Cloudflare/DNS seguirán apuntando exactamente al mismo lugar.
   - **Ahorro de saldo**: Se detiene por completo el cobro por hora de CPU y memoria RAM de la máquina virtual EC2. (Solo se mantiene el costo mínimo de almacenamiento del disco EBS).
   - Obviamente, mientras la instancia esté detenida (apagada), cualquier persona que ingrese a `industriascopai.com` o `huaynaroque.industriascopai.com` verá un aviso de que no se puede conectar al servidor.

2. **¿Cómo volver a encenderla (Start Instance)?**:
   - En la consola de AWS EC2, ve a **Instancias**, selecciona la máquina, pulsa **Estado de la instancia** y haz clic en **Iniciar instancia (Start instance)**.
   - Espera aproximadamente 1 a 2 minutos para que complete la inicialización.
   - **Todo arranca automáticamente**: Todos los servicios están registrados en `systemd` para iniciar solos en el arranque del sistema operativo:
     - `copay-backend.service` (FastAPI + servidor TCP Teltonika en puerto 5000) arranca solo.
     - `nginx` arranca solo.
     - `mariadb` arranca solo.
   - En cuanto termine de arrancar, al abrir el navegador todos tus dominios y subdominios estarán exactamente como los dejaste, sin necesidad de reconfigurar nada.

---

## 🔑 5. Cuentas y Accesos Rápidos Configurados

- **Superadministrador Central**:
  - Correo: `cristhianllanque65@gmail.com` o `industriascopai@gmail.com`
  - Portal: `https://industriascopai.com/login`
- **Gerente de Transporte Huayna Roque**:
  - Correo: `cristhianllanque64@gmail.com`
  - Contraseña inicial: `gerente123`
  - Portal directo: `https://huaynaroque.industriascopai.com/` o `https://industriascopai.com/login?empresa=huaynaroque`
