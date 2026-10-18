#!/bin/bash
# ==============================================================================
# Script de Aprovisionamiento Automatizado para AWS EC2 (Ubuntu 22.04 / 24.04)
# Dominio: industriascopai.com
# Proyecto: Copay Telematics GPS & IoT Platform
# ==============================================================================

set -e

echo "🚀 Iniciando configuración inicial del servidor AWS EC2 para industriascopai.com..."

# 1. Actualizar repositorios del sistema
echo "📦 Actualizando paquetes de Ubuntu..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias básicas, Python y Nginx
echo "🐍 Instalando Python 3, venv, Git, Nginx y utilidades..."
sudo apt install -y git curl wget ufw nginx python3 python3-pip python3-venv mariadb-server certbot python3-certbot-nginx

# 3. Instalar Node.js 18 LTS
echo "📦 Instalando Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Iniciar y asegurar MariaDB/MySQL
echo "🗄️ Configurando base de datos MySQL/MariaDB..."
sudo systemctl enable --now mariadb || sudo systemctl enable --now mysql

# Crear base de datos teltonika y usuario seguro si no existen
sudo mysql -e "CREATE DATABASE IF NOT EXISTS teltonika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'copay_user'@'localhost' IDENTIFIED BY 'CopayGps2026_Secure!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON teltonika.* TO 'copay_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 5. Crear carpetas de despliegue
echo "📁 Preparando directorios web y servicios..."
sudo mkdir -p /var/www/copay/html
sudo chown -R www-data:www-data /var/www/copay
sudo chmod -R 755 /var/www/copay

APP_DIR="/home/ubuntu/copay-telematics"

if [ ! -d "$APP_DIR" ]; then
    echo "Clonando repositorio en $APP_DIR..."
    git clone https://github.com/cristhianllanque/SistemaGPS.-CapAI.git "$APP_DIR"
fi

cd "$APP_DIR"

# 6. Configurar entorno virtual de Python
echo "🐍 Configurando entorno virtual de Backend..."
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

# Crear archivo .env para producción con conexión segura
cat <<EOT > .env
PROJECT_NAME="Industrias Copai Telematics"
DATABASE_URL="mysql+pymysql://copay_user:CopayGps2026_Secure!@localhost:3306/teltonika"
SECRET_KEY="super_secret_jwt_key_copay_production_2026_xYz987"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Configuración SMTP Brevo (notificaciones@industriascopai.com)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="bea0f3001@smtp-brevo.com"
SMTP_PASSWORD="${BREVO_KEY}"
EMAIL_FROM="notificaciones@industriascopai.com"
EMAIL_FROM_NAME="Industrias Copai Telematics"
FRONTEND_URL="https://industriascopai.com"
EOT

# Asegurar directorios de uploads (logos y banners panorámicos)
mkdir -p uploads/logos uploads/banners
chmod -R 775 uploads

# Inicializar tablas y superadmin
python3 -c "from app.db.database import engine, Base; from app.db import models; Base.metadata.create_all(bind=engine)"
python3 create_superadmin.py || true

# 7. Registrar e iniciar servicio systemd
echo "⚙️ Configurando servicio systemd para FastAPI y TCP GPS..."
sudo cp "$APP_DIR/deployment/copay-backend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable copay-backend
sudo systemctl restart copay-backend

# 8. Compilar frontend de producción
echo "⚛️ Compilando frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build
sudo cp -r dist/* /var/www/copay/html/
sudo chown -R www-data:www-data /var/www/copay/html

# 9. Configurar Nginx
echo "🌐 Configurando Nginx para industriascopai.com..."
sudo cp "$APP_DIR/deployment/nginx_industriascopai.conf" /etc/nginx/sites-available/industriascopai.com
sudo ln -sf /etc/nginx/sites-available/industriascopai.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 10. Configurar firewall (UFW)
echo "🛡️ Configurando Firewall (SSH, HTTP, HTTPS y Puerto GPS 5000)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000/tcp comment "Teltonika GPS AVL TCP Port"
echo "y" | sudo ufw enable || true

echo "=============================================================================="
echo "🎉 ¡Configuración base de AWS EC2 completada con éxito!"
echo ""
echo "Para activar el certificado SSL HTTPS gratuito de Let's Encrypt:"
echo "sudo certbot --nginx -d industriascopai.com -d www.industriascopai.com"
echo "=============================================================================="
