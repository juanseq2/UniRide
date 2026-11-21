"""
Este archivo es el 'guardia de seguridad' de la API.

Cuando un endpoint necesita saber "¿quién está haciendo esta petición?",
usa una de las dos funciones de aquí como Depends(). FastAPI se encarga
de leer el token que el frontend manda en el header 'Authorization',
validarlo, y entregarle al endpoint el usuario (o conductor) real.

Si el token no existe, está vencido o es inválido, el endpoint nunca
se ejecuta: FastAPI responde automáticamente con error 401.
"""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Conductor

# Esto le dice a FastAPI/Swagger dónde se consigue el token (para el botón "Authorize" en /docs)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    """Úsala en cualquier endpoint que requiera: 'debes estar logueado'."""
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesión, inicia sesión de nuevo",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id_usuario = payload.get("sub")
        if id_usuario is None:
            raise credenciales_invalidas
    except JWTError:
        raise credenciales_invalidas

    usuario = db.query(Usuario).filter(Usuario.id_usuario == int(id_usuario)).first()
    if usuario is None:
        raise credenciales_invalidas
    return usuario


def obtener_conductor_actual(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Conductor:
    """Úsala en endpoints donde ADEMÁS de estar logueado, debe ser conductor con perfil completo."""
    if usuario.rol.value != "conductor":
        raise HTTPException(status_code=403, detail="Esta acción es solo para conductores")

    conductor = db.query(Conductor).filter(Conductor.id_usuario == usuario.id_usuario).first()
    if conductor is None:
        raise HTTPException(
            status_code=400,
            detail="Primero completa tu perfil de conductor en POST /conductores/perfil",
        )
    return conductor
