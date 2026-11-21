from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Vehiculo, Conductor
from app import schemas
from app.deps import obtener_usuario_actual

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


@router.post("/", response_model=schemas.VehiculoOut)
def registrar_vehiculo(
    datos: schemas.VehiculoCreate,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Requiere token + perfil de conductor ya completado (POST /conductores/perfil)."""
    if usuario.rol.value != "conductor":
        raise HTTPException(status_code=403, detail="Solo los conductores pueden registrar vehículos")

    conductor = db.query(Conductor).filter(
        Conductor.id_usuario == usuario.id_usuario
    ).first()
    if conductor is None:
        conductor = Conductor(
            id_usuario=usuario.id_usuario,
            documentos_aprobados=False,
        )
        db.add(conductor)
        db.flush()

    existente = db.query(Vehiculo).filter(
        Vehiculo.placa == datos.placa.strip().upper()
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un vehículo con esa placa")

    nuevo = Vehiculo(
        id_conductor=conductor.id_usuario,
        placa=datos.placa.strip().upper(),
        modelo=datos.modelo,
        capacidad=datos.capacidad,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/mios", response_model=List[schemas.VehiculoOut])
def mis_vehiculos(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    if usuario.rol.value != "conductor":
        return []
    conductor = db.query(Conductor).filter(
        Conductor.id_usuario == usuario.id_usuario
    ).first()
    if conductor is None:
        return []
    return db.query(Vehiculo).filter(Vehiculo.id_conductor == conductor.id_usuario).all()
