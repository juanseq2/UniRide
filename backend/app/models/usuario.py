"""
Modelos ORM: son clases de Python que SQLAlchemy traduce automáticamente
a filas de las tablas que ya creamos con schema.sql.
Cada clase = una tabla. Cada atributo = una columna.
"""
from sqlalchemy import Column, Integer, String, Boolean, Numeric, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class RolUsuario(str, enum.Enum):
    pasajero = "pasajero"
    conductor = "conductor"
    admin = "admin"  # nuevo: solo se puede crear con el código secreto (ver auth.py)


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    correo_institucional = Column(String(150), nullable=False, unique=True, index=True)
    telefono = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False)
    calificacion_promedio = Column(Numeric(2, 1), default=0.0)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    conductor = relationship("Conductor", back_populates="usuario", uselist=False)


class Conductor(Base):
    __tablename__ = "conductores"

    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), primary_key=True)
    licencia = Column(String(50), nullable=False)
    soat = Column(String(50), nullable=False)
    propiedad_vehiculo = Column(String(100))
    documentos_aprobados = Column(Boolean, default=False)

    usuario = relationship("Usuario", back_populates="conductor")
    vehiculos = relationship("Vehiculo", back_populates="conductor")


class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id_vehiculo = Column(Integer, primary_key=True, index=True)
    id_conductor = Column(Integer, ForeignKey("conductores.id_usuario", ondelete="CASCADE"), nullable=False)
    placa = Column(String(10), nullable=False, unique=True)
    modelo = Column(String(100))
    capacidad = Column(Integer, nullable=False)

    conductor = relationship("Conductor", back_populates="vehiculos")
