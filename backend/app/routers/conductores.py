from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Conductor
from app import schemas
from app.deps import obtener_usuario_actual

router = APIRouter(prefix="/conductores", tags=["Conductores"])


@router.post("/perfil", response_model=schemas.ConductorOut)
def completar_perfil_conductor(
    datos: schemas.ConductorPerfil,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """
    RF-02: un usuario que se registró con rol='conductor' usa este endpoint
    para agregar su licencia y SOAT. Sin esto, no puede publicar rutas
    (lo exige obtener_conductor_actual en deps.py).
    """
    if usuario.rol.value != "conductor":
        raise HTTPException(
            status_code=403,
            detail="Solo los usuarios registrados con rol 'conductor' pueden completar este perfil",
        )

    existente = db.query(Conductor).filter(Conductor.id_usuario == usuario.id_usuario).first()

    if existente:
        # Ya tenía perfil, solo actualizamos los datos
        existente.licencia = datos.licencia
        existente.soat = datos.soat
        existente.propiedad_vehiculo = datos.propiedad_vehiculo
        db.commit()
        db.refresh(existente)
        return existente

    # Primera vez que completa su perfil
    nuevo = Conductor(
        id_usuario=usuario.id_usuario,
        licencia=datos.licencia,
        soat=datos.soat,
        propiedad_vehiculo=datos.propiedad_vehiculo,
        documentos_aprobados=False,  # en un sistema real, un admin lo aprobaría después de revisar
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo
