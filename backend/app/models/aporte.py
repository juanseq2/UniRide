from sqlalchemy import Column, Integer, Numeric, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.sql import func
import enum

from app.database import Base


class EstadoAporte(str, enum.Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    fallido = "fallido"


class Aporte(Base):
    __tablename__ = "aportes"

    id_aporte = Column(Integer, primary_key=True, index=True)
    id_reserva = Column(Integer, ForeignKey("reservas.id_reserva", ondelete="CASCADE"), unique=True, nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    fecha = Column(TIMESTAMP, server_default=func.now())
    estado = Column(Enum(EstadoAporte, name="estado_aporte"), default=EstadoAporte.pendiente)
