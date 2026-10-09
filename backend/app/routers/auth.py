"""
Router de autenticación: agrupa todos los endpoints relacionados con
registro e inicio de sesión.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, RolUsuario
from app import schemas, security
from app.deps import obtener_usuario_actual

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=schemas.UsuarioOut)
def registrar_usuario(datos: schemas.UsuarioRegistro, db: Session = Depends(get_db)):
    existente = db.query(Usuario).filter(
        Usuario.correo_institucional == datos.correo_institucional
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    # Solo se puede crear un usuario admin si se conoce el código secreto (guardado en .env)
    if datos.rol == RolUsuario.admin:
        codigo_esperado = os.getenv("ADMIN_SECRET_CODE")
        if not codigo_esperado or datos.codigo_admin != codigo_esperado:
            raise HTTPException(status_code=403, detail="Código de administrador incorrecto")

    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        correo_institucional=datos.correo_institucional,
        telefono=datos.telefono,
        password_hash=security.hash_password(datos.password),
        rol=datos.rol,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post("/login", response_model=schemas.Token)
def login(datos: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.correo_institucional == datos.correo_institucional
    ).first()

    if not usuario or not security.verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    token = security.crear_token({"sub": str(usuario.id_usuario), "rol": usuario.rol.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol,
    }


@router.get("/me", response_model=schemas.UsuarioOut)
def perfil_actual(usuario: Usuario = Depends(obtener_usuario_actual)):
    """
    El frontend llama esto justo después del login (y también al recargar
    la página) para traer nombre, correo y calificación del usuario actual.
    """
    return usuario
