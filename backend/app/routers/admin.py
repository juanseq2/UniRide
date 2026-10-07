from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Conductor
from app import schemas
from app.deps import obtener_usuario_actual

router = APIRouter(prefix="/admin", tags=["Administración"])


def _verificar_admin(usuario: Usuario):
    if usuario.rol.value != "admin":
        raise HTTPException(status_code=403, detail="Esta acción es solo para administradores")


@router.get("/usuarios", response_model=List[schemas.UsuarioOut])
def listar_usuarios(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_admin(usuario)
    return db.query(Usuario).order_by(Usuario.id_usuario).all()


@router.get("/conductores/pendientes", response_model=List[schemas.ConductorPendienteOut])
def conductores_pendientes(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_admin(usuario)
    resultados = (
        db.query(Usuario, Conductor)
        .join(Conductor, Conductor.id_usuario == Usuario.id_usuario)
        .filter(Conductor.documentos_aprobados.is_(False))
        .all()
    )
    return [
        schemas.ConductorPendienteOut(
            id_usuario=u.id_usuario,
            nombre=u.nombre,
            correo_institucional=u.correo_institucional,
            licencia=c.licencia,
            soat=c.soat,
        )
        for u, c in resultados
    ]


@router.patch("/conductores/{id_usuario}/aprobar", response_model=schemas.ConductorOut)
def aprobar_conductor(
    id_usuario: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_admin(usuario)
    conductor = db.query(Conductor).filter(Conductor.id_usuario == id_usuario).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    conductor.documentos_aprobados = True
    db.commit()
    db.refresh(conductor)
    return conductor


@router.patch("/conductores/{id_usuario}/rechazar", response_model=schemas.ConductorOut)
def rechazar_conductor(
    id_usuario: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    _verificar_admin(usuario)
    conductor = db.query(Conductor).filter(Conductor.id_usuario == id_usuario).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    conductor.documentos_aprobados = False
    db.commit()
    db.refresh(conductor)
    return conductor
