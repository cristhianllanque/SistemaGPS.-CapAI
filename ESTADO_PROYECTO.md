# 📋 Estado del Proyecto: Industrias Copai Telematics GPS

> **Documento de Memoria y Continuidad para la siguiente sesión**  
> *Última actualización: 18 de Octubre, 2026*

---

## 🌐 1. Infraestructura Activa en Producción (AWS EC2)

| Componente | Detalle / Configuración | Estado |
| :--- | :--- | :--- |
| **Dominio Principal** | `https://industriascopai.com` | ✅ 100% Operativo con SSL Let's Encrypt |
| **Subdominios Directos** | `https://*.industriascopai.com` (ej: `huaynaroque.industriascopai.com`) | ✅ Subdominio nativo sin redirección; cada empresa mantiene su URL independiente |
| **Servidor Cloud** | AWS EC2 Ubuntu 24.04 (`18.225.237.174`) | ✅ Activo y Estable |
| **IP Elástica Asignada** | `18.225.237.174` (Fija y vinculada a los dominios DNS) | ✅ Vinculada a la instancia EC2 |
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

---

## 🎯 3. Siguientes Pasos Programados (Pruebas de Campo con Vehículos Reales)

- [ ] **Pruebas en Ruta con Vehículo Real en Movimiento**:
  - Validar la **alarma sonora y notificación acústica** en cabina/despacho al superar el límite de velocidad (ej. > 100 km/h o el estipulado por contrato en el panel).
  - Verificación en campo del **Botón de Pánico** físico (recepción de la alerta SOS inmediata en el panel de monitoreo).
  - Verificación de la **Alarma de Sabotaje** (desconexión o corte de alimentación física del GPS Teltonika).
- [ ] **Validación de Telemetría Continua con GPS Teltonika físico**:
  - Comprobación de tramas AVL Codec 8 / 8 Extended por el puerto TCP `5000` (`copay-backend.service`).
  - Trazado en tiempo real sobre el mapa satelital (odómetro, estado de ignición on/off, satélites y nivel de batería).
- [ ] **Historial de Rutas y Reproductor de Recorridos**:
  - Comprobación del trazado histórico diario, puntos de parada y tiempos de espera en ruta.

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
   - **La IP Elástica `18.225.237.174` se mantiene fija y asignada**: No cambiará de dirección IP pública, por lo que tus dominios en Cloudflare/DNS seguirán apuntando exactamente al mismo lugar.
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
