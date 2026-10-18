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
| **Puerto Teltonika GPS** | TCP `5000` (`0.0.0.0:5000`) | ✅ En escucha para tramas Codec 8 / 8 Extended |
| **Backend REST & WS** | FastAPI + Uvicorn (`copay-backend.service`) | ✅ Activo en `127.0.0.1:8000` |
| **Servidor Multimedia** | Proxy `/uploads/` en Nginx -> FastAPI StaticFiles | ✅ Logos y fotos panorámicas cargan 200 OK en cualquier subdominio |
| **Base de Datos** | MariaDB (`teltonika`), usuario `copay_user` | ✅ Tablas y datos sincronizados |
| **Frontend Web** | React 19 + Vite 8 en `/var/www/copay/html` | ✅ Servido por Nginx con gzip y cache |
| **Pipeline CI/CD** | GitHub Actions (`.github/workflows/deploy.yml`) | ✅ 100% Automatizado (un push despliega en ~50s) |
| **Servicio de Correos** | Brevo SMTP (`notificaciones@industriascopai.com`) | ✅ Entrega de credenciales corporativas activa |

---

## 🚀 2. Lo que dejamos completado y funcionando hoy

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

---

## 🎯 3. Siguientes Pasos Programados

- [ ] **Prueba de Transmisión del Dispositivo GPS Teltonika**:
  - Probar con el equipo GPS físico encendido la llegada de tramas AVL por el puerto TCP 5000 (`copay-backend.service`).
- [ ] **Panel de Monitoreo en Vivo (Mapa Satelital)**:
  - Verificar la recepción en tiempo real de coordenadas y telemetría sobre el mapa interactivo.
- [ ] **Historial de Rutas y Alertas**:
  - Validación del trazado histórico y las alertas de velocidad configuradas por empresa.

---

## 🔑 4. Cuentas y Accesos Rápidos Configurados

- **Superadministrador Central**:
  - Correo: `cristhianllanque65@gmail.com` o `industriascopai@gmail.com`
- **Gerente de Transporte Huayna Roque**:
  - Correo: `cristhianllanque64@gmail.com`
  - Contraseña inicial: `gerente123`
  - Portal directo: `https://industriascopai.com/login?empresa=huaynaroque`
