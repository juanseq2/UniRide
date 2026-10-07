from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Vehiculo, Conductor
from app import schemas
from app.deps import obtener_conductor_actual

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


@router.post("/", response_model=schemas.VehiculoOut)
def registrar_vehiculo(
    datos: schemas.VehiculoCreate,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    """Requiere token + perfil de conductor ya completado (POST /conductores/perfil)."""
    nuevo = Vehiculo(
        id_conductor=conductor.id_usuario,
        placa=datos.placa,
        modelo=datos.modelo,
        capacidad=datos.capacidad,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/mios", response_model=List[schemas.VehiculoOut])
def mis_vehiculos(
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    return db.query(Vehiculo).filter(Vehiculo.id_conductor == conductor.id_usuario).all()
