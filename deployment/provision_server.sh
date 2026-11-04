#!/bin/bash
# ==============================================================================
# Script de Aprovisionamiento Maestro para AWS EC2 (Ubuntu 24.04 LTS)
# Dominio: industriascopai.com
# IP Elástica: 16.58.34.113
# ==============================================================================

set -e
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "🚀 INICIANDO APROVISIONAMIENTO EN VIVO DE INDUSTRIAS COPAI"
echo "=========================================================="

# 1. Configurar Swap de 2GB (Vital para t2.micro/t3.micro en build de Vite)
echo "📦 [1/10] Verificando memoria Swap..."
if [ ! -f /swapfile ]; then
    echo "Creando swapfile de 2GB..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    echo "✅ Swapfile de 2GB creado y activado."
else
    echo "✅ Swapfile ya existe."
fi
free -h

# 2. Desactivar prompts interactivos de needrestart en Ubuntu 24.04
echo "⚙️ [2/10] Configurando needrestart..."
sudo mkdir -p /etc/needrestart
echo '$nrconf{restart} = "a";' | sudo tee /etc/needrestart/needrestart.conf > /dev/null

# 3. Actualizar repositorios e instalar paquetes base
echo "📦 [3/10] Actualizando repositorios e instalando paquetes base..."
sudo apt-get update -y
sudo apt-get install -y git curl wget ufw nginx python3 python3-pip python3-venv mariadb-server certbot python3-certbot-nginx

# 4. Instalar Node.js 20 LTS
echo "📦 [4/10] Verificando instalación de Node.js 20 LTS..."
if ! command -v node &> /dev/null || ! node -v | grep -q "v20"; then
    echo "Instalando Node.js 20 LTS vía NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "✅ Node.js: $(node -v) | npm: $(npm -v)"

# 5. Iniciar y Configurar MariaDB / MySQL
echo "🗄️ [5/10] Configurando Base de Datos MariaDB..."
sudo systemctl enable --now mariadb

sudo mysql -e "CREATE DATABASE IF NOT EXISTS teltonika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'copay_user'@'localhost' IDENTIFIED BY 'CopayGps2026_Secure!';"
sudo mysql -e "ALTER USER 'copay_user'@'localhost' IDENTIFIED BY 'CopayGps2026_Secure!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON teltonika.* TO 'copay_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
echo "✅ Base de datos 'teltonika' y usuario 'copay_user' listos."

# 6. Directorios web y código del proyecto
echo "📁 [6/10] Preparando estructura de carpetas y repositorio..."
sudo mkdir -p /var/www/copay/html /var/www/copay/html/descargas
sudo chown -R ubuntu:ubuntu /var/www/copay

APP_DIR="/home/ubuntu/copay-telematics"
if [ ! -d "$APP_DIR" ]; then
    echo "Clonando repositorio en $APP_DIR..."
    git clone https://github.com/cristhianllanque/SistemaGPS.-CapAI.git "$APP_DIR"
else
    echo "Actualizando repositorio existente en $APP_DIR..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
fi

# 7. Configuración de Python Backend y variables .env
echo "🐍 [7/10] Configurando Backend FastAPI y entorno virtual..."
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Clave SMTP Brevo (leída de variable de entorno o parámetro $1)
BREVO_KEY="${BREVO_KEY:-$1}"
if [ -z "$BREVO_KEY" ]; then
    BREVO_KEY="xsmtp_configure_en_servidor"
fi

# Escribir archivo .env con credenciales
cat << EOF > .env
PROJECT_NAME="Industrias Copai Telematics"
DATABASE_URL="mysql+pymysql://copay_user:CopayGps2026_Secure!@localhost:3306/teltonika"
SECRET_KEY="super_secret_jwt_key_copay_production_2026_xYz987"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Configuración SMTP Brevo (notificaciones@industriascopai.com)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="bea0f3001@smtp-brevo.com"
SMTP_PASSWORD="\${BREVO_KEY}"
EMAIL_FROM="notificaciones@industriascopai.com"
EMAIL_FROM_NAME="Industrias Copai Telematics"
FRONTEND_URL="https://industriascopai.com"
EOF

mkdir -p uploads/logos uploads/banners
chmod -R 775 uploads

echo "Inicializando tablas en la base de datos y superadministradores..."
python3 -c "from app.db.database import engine, Base; from app.db import models; Base.metadata.create_all(bind=engine)"
python3 create_superadmin.py

# 8. Registrar e iniciar servicio systemd copay-backend (FastAPI + TCP 5000)
echo "⚙️ [8/10] Registrando e iniciando servicio systemd copay-backend..."
sudo cp "$APP_DIR/deployment/copay-backend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable copay-backend
sudo systemctl restart copay-backend

# Esperar unos segundos y validar estado
sleep 3
if sudo systemctl is-active --quiet copay-backend; then
    echo "✅ Servicio copay-backend activo y corriendo."
else
    echo "❌ Error al iniciar copay-backend. Logs:"
    sudo journalctl -u copay-backend -n 30 --no-pager
    exit 1
fi

# 9. Compilación inicial de Frontend
echo "⚛️ [9/10] Compilando Frontend de Producción..."
cd "$APP_DIR/frontend"
npm install --legacy-peer-deps
npm run build
sudo cp -r dist/* /var/www/copay/html/
sudo chown -R www-data:www-data /var/www/copay/html

# 10. Configuración Nginx y Certificados SSL Certbot
echo "🌐 [10/10] Configurando Nginx y Certificados SSL..."

# Paso 10a: Configurar sitio HTTP inicial para verificación ACME de Certbot si no hay certificados aún
if [ ! -f /etc/letsencrypt/live/industriascopai.com/fullchain.pem ]; then
    echo "Preparando Nginx en modo HTTP para emisión de certificados Let's Encrypt..."
    cat << 'EOF' | sudo tee /etc/nginx/sites-available/industriascopai.com > /dev/null
server {
    listen 80;
    listen [::]:80;
    server_name industriascopai.com www.industriascopai.com *.industriascopai.com;

    location /.well-known/acme-challenge/ {
        root /var/www/copay/html;
    }

    location / {
        root /var/www/copay/html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/industriascopai.com /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx

    echo "Solicitando certificado SSL a Let's Encrypt para industriascopai.com y www.industriascopai.com..."
    sudo certbot certonly --webroot -w /var/www/copay/html \
        -d industriascopai.com -d www.industriascopai.com \
        --agree-tos --email cristhianllanque65@gmail.com --non-interactive

    # Generar archivos de parámetros si certbot no los creó automáticamente
    if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
        sudo curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -o /etc/letsencrypt/options-ssl-nginx.conf
    fi
    if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
        sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
    fi
fi

# Paso 10b: Instalar la configuración Nginx completa de producción (con SSL y Proxy a Backend)
echo "Instalando configuración definitiva de Nginx con SSL y WebSockets..."
sudo cp "$APP_DIR/deployment/nginx_industriascopai.conf" /etc/nginx/sites-available/industriascopai.com
sudo ln -sf /etc/nginx/sites-available/industriascopai.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 11. Configurar Firewall UFW
echo "🛡️ Configurando Firewall UFW..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000/tcp comment "Teltonika GPS AVL TCP Port"
echo "y" | sudo ufw enable || true

echo "=========================================================="
echo "🎉 ¡APROVISIONAMIENTO COMPLETADO EXITOSAMENTE!"
echo "=========================================================="

