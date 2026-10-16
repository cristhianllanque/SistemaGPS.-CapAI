# Sistema de Rastreo y Telemetría IoT - Teltonika FMC130

Plataforma integral de monitoreo telemático, rastreo vehicular en tiempo real y gestión de emergencias (botón de pánico) para flotas con dispositivos **Teltonika FMC130**.

---

## 🚀 Arquitectura General

* **Hardware:** Teltonika FMC130 con SIM Card Entel (APN `entel.pe`), protocolo Codec 8 / Codec 8 Extended.
* **Backend:** Python 3.12 + FastAPI + Asyncio TCP Listener (Puerto 5000) + WebSockets.
* **Base de Datos:** MySQL (con índices compuestos optimizados para alta concurrencia).
* **Frontend:** React + Vite + TailwindCSS + React-Leaflet + Web Audio API (Sirena de emergencia sintetizada).
* **Infraestructura:** Servidor Ubuntu en AWS EC2 (Ohio `us-east-2`) con IP Elástica fija.

---

## 🛠️ Estructura del Proyecto

```text
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints REST (auth, vehículos, alertas, reportes)
│   │   ├── core/         # Configuración y seguridad (JWT, hashing)
│   │   ├── db/           # Modelos SQLAlchemy y conexión a MySQL
│   │   ├── services/     # Parser binario Codec 8/8E y TCP Server
│   │   └── websockets/   # Distribución en tiempo real por empresa
│   ├── tests/            # Pruebas unitarias de parsing y CRC-16
│   ├── main.py           # Punto de entrada FastAPI + TCP Lifespan
│   └── requirements.txt  # Dependencias Python
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Mapas, modales de pánico, sidebar, panel
│   │   ├── pages/        # Historial de rutas, reportes, usuarios
│   │   ├── utils/        # Sintetizador de audio de emergencia Web Audio API
│   │   └── App.jsx       # Rutas y layout principal
│   └── package.json
└── README.md
```

---

## ⚙️ Características Principales

1. **Recepción TCP Resiliente:**
   * Búfer de reensamblado contra fragmentación de paquetes en redes celulares.
   * Validación matemática de checksum **CRC-16 Teltonika**.
   * Handshake y autenticación previa de IMEI contra base de datos.
2. **Gestión de Emergencias (Botón de Pánico DIN2):**
   * Deduplicación de eventos para evitar tormentas de tickets.
   * Rastreo dinámico de coordenadas durante la emergencia.
   * Sirena sonora de alarma nativa en el navegador y auto-enfoque de cámara en el mapa.
3. **Escalabilidad y Seguridad:**
   * Arquitectura Multi-Tenant (`empresa_id`).
   * Autenticación JWT en endpoints REST y canales WebSocket.
   * Índices compuestos en `lecturas_gps` y `alertas_panico` para soporte de cientos de vehículos.

---

## 💻 Ejecución Local en Desarrollo

### 1. Backend (FastAPI + TCP Listener):
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```

### 3. Pruebas Unitarias:
```bash
cd backend
python -m unittest discover tests
```
