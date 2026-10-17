from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Float, DateTime, Enum, BigInteger, Text, SmallInteger, Date, Index
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime


class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    tipo = Column(String(20), default="flota") # 'flota' o 'particular'
    documento = Column(String(20), nullable=True) # DNI o RUC para clientes particulares
    telefono = Column(String(50), nullable=True)
    logo_url = Column(String(255))
    color_primario = Column(String(50))
    limite_velocidad = Column(Integer, default=90)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="empresa")
    dispositivos = relationship("Dispositivo", back_populates="empresa")
    vehiculos = relationship("Vehiculo", back_populates="empresa")
    conductores = relationship("Conductor", back_populates="empresa")


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum('superadmin', 'admin', 'operador'), nullable=False)
    activo = Column(Boolean, default=True)

    empresa = relationship("Empresa", back_populates="usuarios")


class Dispositivo(Base):
    __tablename__ = "dispositivos"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    imei = Column(String(20), unique=True, index=True, nullable=False)
    numero_serie = Column(String(50), unique=True, index=True, nullable=False)
    modelo = Column(String(50), nullable=False, default='FMC130')
    version_firmware = Column(String(50))
    numero_sim = Column(String(20))
    operador_sim = Column(String(50))
    iccid_sim = Column(String(20))
    tiene_boton_panico = Column(Boolean, default=True)
    fecha_compra = Column(Date)
    notas = Column(Text)
    estado = Column(Enum('disponible', 'instalado', 'mantenimiento', 'baja'), default='disponible')
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="dispositivos")
    vehiculo = relationship("Vehiculo", back_populates="dispositivo", uselist=False)


class Conductor(Base):
    __tablename__ = "conductores"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    nombre = Column(String(255), nullable=False)
    dni = Column(String(15), unique=True, index=True, nullable=False)
    licencia_conducir = Column(String(30))
    categoria_licencia = Column(String(10))
    telefono = Column(String(20))
    foto_url = Column(String(255))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="conductores")
    vehiculo = relationship("Vehiculo", back_populates="conductor", uselist=False)


class Vehiculo(Base):
    __tablename__ = "vehiculos"
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=True)
    conductor_id = Column(Integer, ForeignKey("conductores.id"), nullable=True)
    padron = Column(String(10), nullable=False, default='S/N')
    placa = Column(String(20), unique=True, index=True, nullable=False)
    marca = Column(String(100))
    modelo = Column(String(100))
    anio = Column(SmallInteger)
    color = Column(String(50))
    tipo = Column(Enum('minivan', 'bus', 'camioneta', 'sedan', 'otro'), default='minivan')
    numero_asientos = Column(SmallInteger)
    foto_url = Column(String(255))
    estado = Column(Enum('activo', 'inactivo', 'mantenimiento'), default='activo')
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="vehiculos")
    dispositivo = relationship("Dispositivo", back_populates="vehiculo")
    conductor = relationship("Conductor", back_populates="vehiculo")
    lecturas = relationship("LecturaGPS", back_populates="vehiculo", order_by="desc(LecturaGPS.timestamp)")
    alertas = relationship("AlertaPanico", back_populates="vehiculo", order_by="desc(AlertaPanico.fecha_hora)")


class LecturaGPS(Base):
    __tablename__ = "lecturas_gps"
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), index=True)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    velocidad = Column(SmallInteger)
    ignicion = Column(Boolean)
    boton_panico = Column(Boolean)
    bateria_ext = Column(Float, nullable=True)
    bateria_int = Column(Float, nullable=True)
    bateria_porcentaje = Column(SmallInteger, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('ix_lecturas_vehiculo_timestamp', 'vehiculo_id', 'timestamp'),
    )

    vehiculo = relationship("Vehiculo", back_populates="lecturas")


class AlertaPanico(Base):
    __tablename__ = "alertas_panico"
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), index=True)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    estado = Column(Enum('pendiente', 'atendida', 'falsa_alarma'), default='pendiente', index=True)
    tipo = Column(String(50), default='panico')
    velocidad = Column(SmallInteger, nullable=True)
    fecha_hora = Column(DateTime, default=datetime.utcnow, index=True)
    usuario_atendio_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones_atencion = Column(Text, nullable=True)
    fecha_atencion = Column(DateTime, nullable=True)

    __table_args__ = (
        Index('ix_alertas_vehiculo_estado', 'vehiculo_id', 'estado'),
    )

    vehiculo = relationship("Vehiculo", back_populates="alertas")
    usuario_atendio = relationship("Usuario")
