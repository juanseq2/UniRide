"""
Los 'schemas' son distintos de los 'models' (app/models/...).
- models = cómo se ve la tabla en la base de datos
- schemas = cómo se ve el JSON que entra/sale de la API
"""
from datetime import date, time, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.models.usuario import RolUsuario
from app.models.reserva import EstadoReserva
from app.models.aporte import EstadoAporte


# ============================================================
# Usuario / Autenticación
# ============================================================
class UsuarioRegistro(BaseModel):
    nombre: str
    correo_institucional: EmailStr
    telefono: Optional[str] = None
    password: str
    rol: RolUsuario
    codigo_admin: Optional[str] = None

    @field_validator("correo_institucional")
    @classmethod
    def validar_dominio_institucional(cls, valor: str) -> str:
        if not valor.lower().endswith("@uniminuto.edu.co"):
            raise ValueError("Debes registrarte con tu correo institucional @uniminuto.edu.co")
        return valor


class UsuarioLogin(BaseModel):
    correo_institucional: EmailStr
    password: str


class UsuarioOut(BaseModel):
    id_usuario: int
    nombre: str
    correo_institucional: str
    rol: RolUsuario
    calificacion_promedio: float

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: RolUsuario


# ============================================================
# Conductor (RF-02)
# ============================================================
class ConductorOut(BaseModel):
    id_usuario: int
    documentos_aprobados: bool

    class Config:
        from_attributes = True


class ConductorPendienteOut(BaseModel):
    id_usuario: int
    nombre: str
    correo_institucional: str


# ============================================================
# Vehículo
# ============================================================
class VehiculoCreate(BaseModel):
    placa: str
    modelo: Optional[str] = None
    capacidad: int


class VehiculoOut(BaseModel):
    id_vehiculo: int
    placa: str
    modelo: Optional[str] = None
    capacidad: int

    class Config:
        from_attributes = True


# ============================================================
# Ruta (RF-03, RF-04) — ahora con coordenadas de origen/destino
# ============================================================
class RutaCreate(BaseModel):
    id_vehiculo: int
    origen: str
    destino: str
    origen_lat: float
    origen_lng: float
    destino_lat: float
    destino_lng: float
    fecha: date
    hora_salida: time
    cupos_disponibles: int
    aporte_sugerido: float
    ruta_segura: bool = False


class RutaOut(BaseModel):
    id_ruta: int
    id_conductor: int
    origen: str
    destino: str
    origen_lat: Optional[float] = None
    origen_lng: Optional[float] = None
    destino_lat: Optional[float] = None
    destino_lng: Optional[float] = None
    fecha: date
    hora_salida: time
    cupos_disponibles: int
    aporte_sugerido: float
    ruta_segura: bool
    nombre_conductor: Optional[str] = None
    calificacion_conductor: Optional[float] = None

    class Config:
        from_attributes = True


# ============================================================
# Reserva
# ============================================================
class ReservaCreate(BaseModel):
    id_ruta: int
    cantidad_cupos: int = 1


class ReservaOut(BaseModel):
    id_reserva: int
    id_ruta: int
    id_pasajero: int
    estado: EstadoReserva
    cantidad_cupos: int
    fecha_reserva: datetime

    class Config:
        from_attributes = True


class ReservaDetalleOut(BaseModel):
    id_reserva: int
    id_ruta: int
    estado: EstadoReserva
    cantidad_cupos: int
    fecha_reserva: datetime
    nombre_pasajero: str
    origen: str
    destino: str
    fecha_viaje: date
    hora_salida: time


# ============================================================
# Aporte
# ============================================================
class AporteOut(BaseModel):
    id_aporte: int
    id_reserva: int
    valor: float
    estado: EstadoAporte

    class Config:
        from_attributes = True


