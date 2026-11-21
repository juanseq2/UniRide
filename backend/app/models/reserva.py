from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.sql import func
import enum

from app.database import Base


class EstadoReserva(str, enum.Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    rechazada = "rechazada"
    cancelada = "cancelada"


class Reserva(Base):
    __tablename__ = "reservas"

    id_reserva = Column(Integer, primary_key=True, index=True)
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), nullable=False)
    id_pasajero = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_reserva = Column(TIMESTAMP, server_default=func.now())
    estado = Column(Enum(EstadoReserva, name="estado_reserva"), default=EstadoReserva.pendiente)
    cantidad_cupos = Column(Integer, nullable=False, default=1)
