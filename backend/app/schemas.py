"""
Los 'schemas' son distintos de los 'models' (app/models/...).
- models = cómo se ve la tabla en la base de datos
- schemas = cómo se ve el JSON que entra/sale de la API
"""
from datetime import date, time
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.models.usuario import RolUsuario

from datetime import datetime
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
    codigo_admin: Optional[str] = None  # solo se valida si rol == admin

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
    rol: RolUsuario  # lo agregaste tú: así el frontend sabe a qué dashboard mandar sin otra petición


# ============================================================
# Conductor (RF-02: verificación de conductor)
# ============================================================
class ConductorPerfil(BaseModel):
    licencia: str
    soat: str
    propiedad_vehiculo: Optional[str] = None


class ConductorOut(BaseModel):
    id_usuario: int
    licencia: str
    soat: str
    documentos_aprobados: bool

    class Config:
        from_attributes = True


class ConductorPendienteOut(BaseModel):
    """Lo que ve el admin en la lista de conductores por aprobar (junta datos de 2 tablas)."""
    id_usuario: int
    nombre: str
    correo_institucional: str
    licencia: str
    soat: str


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
# Ruta (RF-03: publicar, RF-04: buscar)
# ============================================================
class RutaCreate(BaseModel):
    id_vehiculo: int
    origen: str
    destino: str
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
# Reserva (RF-05)
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


# ============================================================
# Aporte (pago asociado a una reserva)
# ============================================================
class AporteOut(BaseModel):
    id_aporte: int
    id_reserva: int
    valor: float
    estado: EstadoAporte

    class Config:
        from_attributes = True
