from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ruta import Ruta
from app.models.usuario import Vehiculo, Conductor
from app import schemas
from app.deps import obtener_conductor_actual

router = APIRouter(prefix="/rutas", tags=["Rutas"])


@router.post("/", response_model=schemas.RutaOut)
def publicar_ruta(
    datos: schemas.RutaCreate,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    """RF-03: requiere token + ser conductor con perfil completo + dueño del vehículo indicado."""
    vehiculo = db.query(Vehiculo).filter(
        Vehiculo.id_vehiculo == datos.id_vehiculo,
        Vehiculo.id_conductor == conductor.id_usuario,
    ).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Ese vehículo no existe o no te pertenece")

    nueva_ruta = Ruta(
        id_conductor=conductor.id_usuario,
        id_vehiculo=datos.id_vehiculo,
        origen=datos.origen,
        destino=datos.destino,
        fecha=datos.fecha,
        hora_salida=datos.hora_salida,
        cupos_disponibles=datos.cupos_disponibles,
        aporte_sugerido=datos.aporte_sugerido,
        ruta_segura=datos.ruta_segura,
    )
    db.add(nueva_ruta)
    db.commit()
    db.refresh(nueva_ruta)
    return nueva_ruta


@router.get("/", response_model=List[schemas.RutaOut])
def buscar_rutas(
    origen: Optional[str] = None,
    destino: Optional[str] = None,
    fecha: Optional[date] = None,
    solo_seguras: bool = False,
    db: Session = Depends(get_db),
):
    """
    RF-04: búsqueda filtrada de rutas. A propósito NO requiere login:
    cualquiera puede buscar y comparar, solo se necesita login para reservar.
    """
    query = db.query(Ruta).filter(Ruta.cupos_disponibles > 0)

    if origen:
        query = query.filter(Ruta.origen.ilike(f"%{origen}%"))
    if destino:
        query = query.filter(Ruta.destino.ilike(f"%{destino}%"))
    if fecha:
        query = query.filter(Ruta.fecha == fecha)
    if solo_seguras:
        query = query.filter(Ruta.ruta_segura.is_(True))

    return query.order_by(Ruta.fecha, Ruta.hora_salida).all()
