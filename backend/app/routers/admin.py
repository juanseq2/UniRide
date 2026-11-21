from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
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
        )
        for u, c in resultados
    ]


@router.get("/conductores/{id_usuario}/documento/{tipo}")
def ver_documento_conductor(
    id_usuario: int,
    tipo: str,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """
    Sirve el archivo (licencia, soat o tarjeta_propiedad) de un conductor.
    Protegido: solo un admin autenticado puede verlo, nunca es un archivo público.
    """
    _verificar_admin(usuario)
    conductor = db.query(Conductor).filter(Conductor.id_usuario == id_usuario).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    mapa = {
        "licencia": conductor.licencia_archivo,
        "soat": conductor.soat_archivo,
        "tarjeta_propiedad": conductor.tarjeta_propiedad_archivo,
    }
    ruta = mapa.get(tipo)
    if not ruta or not Path(ruta).exists():
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    return FileResponse(ruta)


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
