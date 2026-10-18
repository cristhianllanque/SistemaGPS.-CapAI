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

2. **Carga y Visualización de Logos y Fotos de Portada / Flota**:
   - Solucionado el error 404 al solicitar imágenes en `/uploads/logos` y `/uploads/banners`.
   - Nginx ahora delega `/uploads/` directamente al motor de FastAPI `StaticFiles`, eliminando incompatibilidades con `alias` y permisos en Linux.
   - La función `getAssetUrl()` normaliza las rutas a rutas relativas para que funcionen bajo cualquier subdominio sin bloqueos CORS ni mixed-content.
   - Las imágenes subidas por el usuario reemplazan inmediatamente cualquier foto por defecto.

3. **Isotipo Oficial y Marca Corporativa COPAI**:
   - Eliminado el icono genérico de Vite (el rayito morado `favicon.svg`) y la palabra "frontend" en la pestaña.
   - Integrado el isotipo oficial "C" de red neuronal en alta definición con fondo transparente (`copai-symbol.png`, `favicon.png`, `favicon.ico`).
   - El título en la pestaña del navegador ahora muestra **`COPAI`** en el portal central y `${empresa} | Telematics GPS` en subdominios de clientes.
   - En la barra lateral y barras de navegación ahora dice **`COPAI`** de forma limpia y profesional.

---

## 🎯 3. Pendientes y Mejoras Programadas para Mañana

- [ ] **Prueba de Transmisión del Dispositivo GPS Teltonika**:
  - Vincular el dispositivo GPS físico que tienes encendido y verificar en los registros del servidor (`sudo journalctl -u copay-backend -f`) o en la base de datos la llegada de coordenadas y paquetes AVL por el puerto 5000.
- [ ] **Panel de Monitoreo en Vivo (Mapa Satelital)**:
  - Revisar y pulir la experiencia visual del mapa en tiempo real (`/monitoreo`) con los marcadores de vehículos y estados de motor/velocidad.
- [ ] **Historial de Rutas y Telemetría**:
  - Optimizar el reproductor de rutas y filtrado por fechas.
- [ ] **Alertas y Geocercas**:
  - Ajustar avisos sonoros y notificaciones automáticas ante eventos de exceso de velocidad o corte de batería.
- [ ] **Nuevas mejoras de diseño**:
  - Cualquier ajuste estético o de interfaz que desees afinar en el panel interior o en los módulos de administración.

---

## 🔑 4. Cuentas y Accesos Rápidos Configurados

- **Superadministrador Central**:
  - Correo: `cristhianllanque65@gmail.com` o `industriascopai@gmail.com`
- **Gerente de Transporte Huayna Roque**:
  - Correo: `cristhianllanque64@gmail.com`
  - Contraseña inicial: `gerente123`
  - Portal directo: `https://industriascopai.com/login?empresa=huaynaroque`
