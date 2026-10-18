from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date


# ============ EMPRESA ============
class EmpresaBase(BaseModel):
    nombre: str
    slug: str
    tipo: Optional[str] = "flota"
    documento: Optional[str] = None
    telefono: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    slogan: Optional[str] = None
    servicios: Optional[str] = None
    color_primario: Optional[str] = "#1E40AF"
    color_secundario: Optional[str] = "#FFFFFF"
    color_terciario: Optional[str] = None
    limite_velocidad: Optional[int] = 90

class EmpresaCreate(BaseModel):
    nombre: str
    slug: Optional[str] = None
    tipo: Optional[str] = "flota"
    documento: Optional[str] = None
    telefono: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    slogan: Optional[str] = None
    servicios: Optional[str] = None
    color_primario: Optional[str] = "#1E40AF"
    color_secundario: Optional[str] = "#FFFFFF"
    color_terciario: Optional[str] = None
    limite_velocidad: Optional[int] = 90
    # Optional initial Gerente user creation
    gerente_nombre: Optional[str] = None
    gerente_email: Optional[EmailStr] = None
    gerente_password: Optional[str] = None

class ClienteParticularCreate(BaseModel):
    # Datos del Cliente / Propietario
    nombre: str
    documento: Optional[str] = None # DNI / RUC
    telefono: Optional[str] = None
    email: EmailStr
    password: str
    limite_velocidad: Optional[int] = 90
    # Datos del Vehículo
    placa: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    color: Optional[str] = None
    tipo_vehiculo: Optional[str] = "sedan"
    anio: Optional[int] = None
    # GPS asignado
    dispositivo_id: Optional[int] = None
    imei: Optional[str] = None

class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    slug: Optional[str] = None
    tipo: Optional[str] = None
    documento: Optional[str] = None
    telefono: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    slogan: Optional[str] = None
    servicios: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    color_terciario: Optional[str] = None
    limite_velocidad: Optional[int] = None
    activo: Optional[bool] = None

class EmpresaPublicPortal(BaseModel):
    id: int
    nombre: str
    slug: str
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    color_primario: Optional[str] = "#1E40AF"
    color_secundario: Optional[str] = "#FFFFFF"
    color_terciario: Optional[str] = None
    slogan: Optional[str] = None
    servicios: Optional[str] = None
    telefono: Optional[str] = None
    documento: Optional[str] = None
    total_vehiculos: Optional[int] = 0
    limite_velocidad: Optional[int] = 90
    class Config:
        from_attributes = True

class LimiteVelocidadUpdate(BaseModel):
    limite_velocidad: int

class Empresa(EmpresaBase):
    id: int
    activo: bool
    class Config:
        from_attributes = True

class EmpresaOut(EmpresaBase):
    id: int
    activo: bool
    created_at: Optional[datetime] = None
    total_vehiculos: Optional[int] = 0
    total_dispositivos: Optional[int] = 0
    total_usuarios: Optional[int] = 0
    class Config:
        from_attributes = True


# ============ USUARIO ============
class UsuarioBase(BaseModel):
    email: EmailStr
    nombre: str
    rol: str

class UsuarioCreate(UsuarioBase):
    password: str
    empresa_id: Optional[int] = None

class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = None
    rol: Optional[str] = None
    password: Optional[str] = None
    activo: Optional[bool] = None
    empresa_id: Optional[int] = None

class UsuarioOut(UsuarioBase):
    id: int
    empresa_id: Optional[int] = None
    empresa_nombre: Optional[str] = None
    activo: bool
    class Config:
        from_attributes = True

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class UsuarioToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
    empresa: Optional[Empresa] = None


# ============ DISPOSITIVO ============
class DispositivoCreate(BaseModel):
    empresa_id: Optional[int] = None
    imei: str = Field(..., pattern=r"^\d{15}$")
    numero_serie: str
    modelo: str = "FMC130"
    version_firmware: Optional[str] = None
    numero_sim: Optional[str] = None
    operador_sim: Optional[str] = None
    iccid_sim: Optional[str] = Field(None, min_length=19, max_length=20, pattern=r"^\d{19,20}$")
    tiene_boton_panico: bool = True
    fecha_compra: Optional[date] = None
    notas: Optional[str] = None

class DispositivoUpdate(BaseModel):
    empresa_id: Optional[int] = None
    imei: Optional[str] = Field(None, pattern=r"^\d{15}$")
    numero_serie: Optional[str] = None
    modelo: Optional[str] = None
    version_firmware: Optional[str] = None
    numero_sim: Optional[str] = None
    operador_sim: Optional[str] = None
    iccid_sim: Optional[str] = Field(None, min_length=19, max_length=20, pattern=r"^\d{19,20}$")
    tiene_boton_panico: Optional[bool] = None
    fecha_compra: Optional[date] = None
    notas: Optional[str] = None
    estado: Optional[str] = None

class DispositivoOut(BaseModel):
    id: int
    empresa_id: Optional[int] = None
    empresa_nombre: Optional[str] = None
    imei: str
    numero_serie: str
    modelo: str
    version_firmware: Optional[str] = None
    numero_sim: Optional[str] = None
    operador_sim: Optional[str] = None
    iccid_sim: Optional[str] = None
    tiene_boton_panico: bool
    fecha_compra: Optional[date] = None
    notas: Optional[str] = None
    estado: str
    activo: bool
    created_at: Optional[datetime] = None
    # nombre del vehiculo asignado, si existe
    vehiculo_placa: Optional[str] = None
    class Config:
        from_attributes = True


# ============ CONDUCTOR ============
class ConductorCreate(BaseModel):
    empresa_id: Optional[int] = None
    nombre: str
    dni: str
    licencia_conducir: Optional[str] = None
    categoria_licencia: Optional[str] = None
    telefono: Optional[str] = None
    foto_url: Optional[str] = None

class ConductorUpdate(BaseModel):
    empresa_id: Optional[int] = None
    nombre: Optional[str] = None
    dni: Optional[str] = None
    licencia_conducir: Optional[str] = None
    categoria_licencia: Optional[str] = None
    telefono: Optional[str] = None
    foto_url: Optional[str] = None

class ConductorOut(BaseModel):
    id: int
    empresa_id: int
    empresa_nombre: Optional[str] = None
    nombre: str
    dni: str
    licencia_conducir: Optional[str] = None
    categoria_licencia: Optional[str] = None
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    activo: bool
    created_at: Optional[datetime] = None
    vehiculo_placa: Optional[str] = None
    class Config:
        from_attributes = True


# ============ VEHICULO ============
class VehiculoCreate(BaseModel):
    empresa_id: Optional[int] = None
    padron: str
    placa: str = Field(..., pattern=r"^[A-Z0-9]{3}-[A-Z0-9]{3}$")
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    color: Optional[str] = None
    tipo: str = "minivan"
    numero_asientos: Optional[int] = None
    foto_url: Optional[str] = None

class VehiculoUpdate(BaseModel):
    empresa_id: Optional[int] = None
    padron: Optional[str] = None
    placa: Optional[str] = Field(None, pattern=r"^[A-Z0-9]{3}-[A-Z0-9]{3}$")
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    color: Optional[str] = None
    tipo: Optional[str] = None
    numero_asientos: Optional[int] = None
    foto_url: Optional[str] = None
    estado: Optional[str] = None

class VehiculoVincular(BaseModel):
    dispositivo_id: Optional[int] = None
    conductor_id: Optional[int] = None

class LecturaGPSBase(BaseModel):
    latitud: float
    longitud: float
    velocidad: int
    ignicion: bool
    boton_panico: bool
    bateria_ext: Optional[float] = None
    bateria_int: Optional[float] = None
    bateria_porcentaje: Optional[int] = None
    sabotaje: Optional[bool] = False
    timestamp: datetime
    online: Optional[bool] = False
    class Config:
        from_attributes = True

class DispositivoMini(BaseModel):
    id: int
    imei: str
    modelo: str
    class Config:
        from_attributes = True

class ConductorMini(BaseModel):
    id: int
    nombre: str
    dni: str
    telefono: Optional[str] = None
    class Config:
        from_attributes = True

class VehiculoOut(BaseModel):
    id: int
    empresa_id: int
    empresa_nombre: Optional[str] = None
    padron: str
    placa: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    color: Optional[str] = None
    tipo: Optional[str] = None
    numero_asientos: Optional[int] = None
    foto_url: Optional[str] = None
    estado: str
    activo: bool
    dispositivo_id: Optional[int] = None
    conductor_id: Optional[int] = None
    dispositivo: Optional[DispositivoMini] = None
    conductor: Optional[ConductorMini] = None
    ultima_lectura: Optional[LecturaGPSBase] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ============ ALERTAS ============
class AlertaPanicoOut(BaseModel):
    id: int
    vehiculo_id: int
    latitud: float
    longitud: float
    estado: str
    tipo: Optional[str] = 'panico'
    velocidad: Optional[int] = None
    fecha_hora: datetime
    placa: Optional[str] = None
    conductor_nombre: Optional[str] = None
    usuario_atendio_id: Optional[int] = None
    observaciones_atencion: Optional[str] = None
    fecha_atencion: Optional[datetime] = None
    usuario_atendio_nombre: Optional[str] = None
    class Config:
        from_attributes = True

class AlertaAtender(BaseModel):
    estado: str
    observaciones_atencion: Optional[str] = None


# ============ HISTORIAL ============
class CoordenadaHistorial(BaseModel):
    latitud: float
    longitud: float
    velocidad: int
    ignicion: bool
    bateria_ext: Optional[float] = None
    bateria_int: Optional[float] = None
    bateria_porcentaje: Optional[int] = None
    timestamp: datetime

class EstadisticasHistorial(BaseModel):
    distancia_km: float
    velocidad_maxima: int
    velocidad_promedio: float
    tiempo_encendido_minutos: float
    tiempo_detenido_minutos: Optional[float] = 0.0
    total_paradas: Optional[int] = 0

class ParadaHistorial(BaseModel):
    latitud: float
    longitud: float
    timestamp_inicio: datetime
    timestamp_fin: datetime
    duracion_minutos: float

class HistorialResponse(BaseModel):
    coordenadas: List[CoordenadaHistorial]
    estadisticas: EstadisticasHistorial
    paradas: List[ParadaHistorial]


# ============ DASHBOARD STATS ============
class DashboardStats(BaseModel):
    total_dispositivos: int = 0
    dispositivos_disponibles: int = 0
    dispositivos_asignados: int = 0
    total_vehiculos: int = 0
    vehiculos_activos: int = 0
    vehiculos_sin_dispositivo: int = 0
    total_conductores: int = 0
    alertas_pendientes: int = 0


# ============ AUTH RECOVERY ============
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
