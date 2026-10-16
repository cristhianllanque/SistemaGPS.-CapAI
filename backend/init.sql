-- ============================================
-- Teltonika Fleet Management Platform - Schema
-- ============================================

-- Drop tables in reverse dependency order if they exist (for clean reset)
DROP TABLE IF EXISTS alertas_panico;
DROP TABLE IF EXISTS lecturas_gps;
DROP TABLE IF EXISTS vehiculos;
DROP TABLE IF EXISTS conductores;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS empresas;

-- Tabla empresas
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    color_primario VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'operador') NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabla dispositivos (inventario de hardware Teltonika)
CREATE TABLE dispositivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    imei VARCHAR(20) UNIQUE NOT NULL,
    numero_serie VARCHAR(50) UNIQUE NOT NULL,
    modelo VARCHAR(50) NOT NULL DEFAULT 'FMC130',
    version_firmware VARCHAR(50),
    numero_sim VARCHAR(20),
    operador_sim VARCHAR(50),
    tiene_boton_panico BOOLEAN DEFAULT TRUE,
    fecha_compra DATE,
    notas TEXT,
    estado ENUM('disponible', 'asignado', 'mantenimiento', 'baja') DEFAULT 'disponible',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dispositivo_empresa (empresa_id),
    INDEX idx_dispositivo_estado (estado),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabla conductores
CREATE TABLE conductores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    nombre VARCHAR(255) NOT NULL,
    dni VARCHAR(15) UNIQUE NOT NULL,
    licencia_conducir VARCHAR(30),
    categoria_licencia VARCHAR(10),
    telefono VARCHAR(20),
    foto_url VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conductor_empresa (empresa_id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabla vehiculos
CREATE TABLE vehiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    dispositivo_id INT NULL,
    conductor_id INT NULL,
    placa VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    anio SMALLINT,
    color VARCHAR(50),
    tipo ENUM('minivan', 'bus', 'camioneta', 'sedan', 'otro') DEFAULT 'minivan',
    numero_asientos SMALLINT,
    foto_url VARCHAR(255),
    estado ENUM('activo', 'inactivo', 'mantenimiento') DEFAULT 'activo',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehiculo_empresa (empresa_id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL
);

-- Tabla lecturas_gps
CREATE TABLE lecturas_gps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id INT,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,
    velocidad SMALLINT,
    ignicion BOOLEAN,
    boton_panico BOOLEAN,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lectura_vehiculo_ts (vehiculo_id, timestamp),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE
);

-- Tabla alertas_panico
CREATE TABLE alertas_panico (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_id INT,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,
    estado ENUM('pendiente', 'atendida', 'falsa_alarma') DEFAULT 'pendiente',
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_atendio_id INT NULL,
    observaciones_atencion TEXT NULL,
    fecha_atencion TIMESTAMP NULL,
    INDEX idx_alerta_estado (estado),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_atendio_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ============================================
-- DATOS SEMILLA (Seed Data)
-- ============================================

-- 2 Empresas
INSERT INTO empresas (id, nombre, slug, color_primario) VALUES
(1, 'Transportes Huaynarroque', 'huaynarroque', '#1E40AF'),
(2, 'Jesús de Nazareth', 'jesus-nazareth', '#047857');

-- 2 Usuarios Admin (password: admin123 — hash will be set by update_passwords.py)
INSERT INTO usuarios (id, empresa_id, nombre, email, password_hash, rol) VALUES
(1, 1, 'Admin Huaynarroque', 'admin@huaynarroque.com', 'PLACEHOLDER_RUN_UPDATE_PASSWORDS', 'admin'),
(2, 2, 'Admin Nazareth', 'admin@nazareth.com', 'PLACEHOLDER_RUN_UPDATE_PASSWORDS', 'admin');
