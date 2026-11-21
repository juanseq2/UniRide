from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Conductor
from app import schemas
from app.deps import obtener_usuario_actual

router = APIRouter(prefix="/conductores", tags=["Conductores"])

EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".pdf"}
TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB
BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = Path(
    os.getenv(
        "UPLOAD_DIR",
        "/tmp/uniride/uploads" if os.getenv("RENDER") else str(BASE_DIR / "uploads"),
    )
).expanduser()
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = (BASE_DIR / UPLOAD_DIR).resolve()
CARPETA_UPLOADS = UPLOAD_DIR / "conductores"


def _guardar_documento(archivo: UploadFile, id_usuario: int, nombre_campo: str) -> str:
    extension = Path(archivo.filename or "").suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido para {nombre_campo}. Usa JPG, PNG o PDF.",
        )

    contenido = archivo.file.read()
    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(status_code=400, detail=f"El archivo de {nombre_campo} supera los 5 MB.")

    carpeta = CARPETA_UPLOADS / str(id_usuario)
    try:
        carpeta.mkdir(parents=True, exist_ok=True)
        ruta_archivo = carpeta / f"{nombre_campo}{extension}"
        with open(ruta_archivo, "wb") as f:
            f.write(contenido)
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el documento en el servidor",
        ) from exc

    return str(ruta_archivo)


@router.post("/perfil", response_model=schemas.ConductorOut)
def completar_perfil_conductor(
    licencia: UploadFile = File(..., description="Foto o PDF de la licencia de conducción"),
    soat: UploadFile = File(..., description="Foto o PDF del SOAT vigente"),
    tarjeta_propiedad: UploadFile = File(..., description="Foto o PDF de la tarjeta de propiedad"),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """RF-02: el conductor sube sus 3 documentos como archivo (no como texto)."""
    if usuario.rol.value != "conductor":
        raise HTTPException(
            status_code=403,
            detail="Solo los usuarios registrados con rol 'conductor' pueden completar este perfil",
        )

    ruta_licencia = _guardar_documento(licencia, usuario.id_usuario, "licencia")
    ruta_soat = _guardar_documento(soat, usuario.id_usuario, "soat")
    ruta_tarjeta = _guardar_documento(tarjeta_propiedad, usuario.id_usuario, "tarjeta_propiedad")

    try:
        existente = db.query(Conductor).filter(
            Conductor.id_usuario == usuario.id_usuario
        ).first()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo consultar el perfil de conductor",
        ) from exc

    if existente:
        existente.licencia_archivo = ruta_licencia
        existente.soat_archivo = ruta_soat
        existente.tarjeta_propiedad_archivo = ruta_tarjeta
        existente.documentos_aprobados = False
        try:
            db.commit()
            db.refresh(existente)
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="No se pudo guardar el perfil de conductor",
            ) from exc
        return existente

    nuevo = Conductor(
        id_usuario=usuario.id_usuario,
        licencia_archivo=ruta_licencia,
        soat_archivo=ruta_soat,
        tarjeta_propiedad_archivo=ruta_tarjeta,
        documentos_aprobados=False,
    )
    try:
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el perfil de conductor",
        ) from exc
    return nuevo


@router.get("/perfil", response_model=schemas.ConductorOut)
def obtener_mi_perfil_conductor(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """El frontend llama esto para saber si el conductor ya completó sus documentos (onboarding)."""
    conductor = db.query(Conductor).filter(Conductor.id_usuario == usuario.id_usuario).first()
    if not conductor:
        raise HTTPException(status_code=404, detail="Aún no has completado tu perfil de conductor")
    return conductor
