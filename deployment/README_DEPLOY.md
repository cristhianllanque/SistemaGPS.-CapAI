# 🚀 Guía de Despliegue Autónomo y CI/CD en AWS EC2
## Dominio: industriascopai.com | Plataforma Copay Telematics GPS

Esta arquitectura permite que cada vez que hagas `git push origin main` desde tu computadora, GitHub Actions valide el código, lo compile y actualice automáticamente el servidor en AWS EC2 sin intervención manual.

---

### 1. Puertos a Abrir en el Security Group de AWS EC2
En la consola de AWS (`EC2 > Security Groups > Inbound rules`), asegúrate de tener abiertas las siguientes reglas de entrada:

| Tipo | Protocolo | Puerto | Origen | Descripción |
|---|---|---|---|---|
| SSH | TCP | `22` | Tu IP o `0.0.0.0/0` | Acceso seguro del operador y GitHub Actions |
| HTTP | TCP | `80` | `0.0.0.0/0` | Acceso Web y renovación de certificados Let's Encrypt |
| HTTPS | TCP | `443` | `0.0.0.0/0` | Acceso Web Seguro SSL (industriascopai.com) |
| Personalizado TCP | TCP | `5000` | `0.0.0.0/0` | **Recepción de tramas AVL de los GPS Teltonika (FMC130, FMB630, etc.)** |

---

### 2. Configurar los 3 Secretos en GitHub Actions
En tu repositorio de GitHub:
1. Ve a **Settings** > **Secrets and variables** > **Actions**.
2. Haz clic en **New repository secret** y agrega:

- **`EC2_HOST`**: Tu dirección IP Elástica de AWS (o `industriascopai.com` si el DNS ya propagó).
- **`EC2_USER`**: `ubuntu`
- **`EC2_SSH_KEY`**: El contenido completo de tu llave privada `.pem` que descargaste de AWS (desde `-----BEGIN RSA PRIVATE KEY-----` hasta `-----END RSA PRIVATE KEY-----`).

*(Opcional: si cambiaste el puerto SSH, puedes agregar `EC2_PORT` con valor `22`).*

---

### 3. Aprovisionamiento Inicial del Servidor EC2 (Una sola vez)
Conéctate por primera vez a tu servidor EC2 por terminal y ejecuta este comando de configuración automática:

```bash
curl -sSL https://raw.githubusercontent.com/cristhianllanque/SistemaGPS.-CapAI/main/deployment/setup_aws_ec2.sh | bash
```

Este script automático instala:
- Python 3.11 y entorno virtual (`venv`)
- Node.js 18 LTS
- Servidor Web Nginx de alto rendimiento con Proxy inverso y WebSockets
- Base de datos MySQL / MariaDB configurada y protegida
- Servicio `copay-backend` gestionado por `systemd` (reinicio automático ante fallos)
- Certbot para SSL gratuito

---

### 4. Apuntar tu Dominio DNS a la IP Elástica de AWS
En tu proveedor de dominio (donde compraste `industriascopai.com`):
- **Tipo A**: `@` -> Tu IP Elástica de AWS
- **Tipo A o CNAME**: `www` -> Tu IP Elástica de AWS

---

### 5. Activar Certificado SSL Gratis (HTTPS)
Una vez propagado el DNS, ejecuta en la consola de tu servidor EC2:

```bash
sudo certbot --nginx -d industriascopai.com -d www.industriascopai.com
```

¡Listo! Nginx se configurará automáticamente con HTTPS y redirección forzada de HTTP a HTTPS.

---

### 6. Configuración de los Dispositivos GPS Teltonika
En el software **Teltonika Configurator** (o vía SMS de configuración) de tus equipos GPS:
- **Server Address**: `industriascopai.com` (o la IP Elástica de tu servidor AWS)
- **Server Port**: `5000`
- **Protocol**: `TCP`
