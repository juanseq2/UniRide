from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, Time, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Ruta(Base):
    __tablename__ = "rutas"

    id_ruta = Column(Integer, primary_key=True, index=True)
    id_conductor = Column(Integer, ForeignKey("conductores.id_usuario", ondelete="CASCADE"), nullable=False)
    id_vehiculo = Column(Integer, ForeignKey("vehiculos.id_vehiculo"), nullable=False)
    origen = Column(String(200), nullable=False)
    destino = Column(String(200), nullable=False)
    fecha = Column(Date, nullable=False)
    hora_salida = Column(Time, nullable=False)
    cupos_disponibles = Column(Integer, nullable=False)
    aporte_sugerido = Column(Numeric(10, 2), nullable=False)
    ruta_segura = Column(Boolean, default=False)
    creado_en = Column(TIMESTAMP, server_default=func.now())
