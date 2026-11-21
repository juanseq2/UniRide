"""
Este archivo tiene dos responsabilidades:

1. Convertir una contraseña en un "hash" (una huella irreversible) para
   guardarla en la base de datos. Así, ni siquiera nosotros como
   desarrolladores podemos ver la contraseña real de un usuario.

2. Generar y (más adelante) verificar tokens JWT: una especie de
   "carnet digital" firmado que la API le entrega al usuario cuando
   hace login, para que no tenga que mandar su contraseña en cada
   petición futura.
"""
import os
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

# bcrypt es un algoritmo de hash diseñado específicamente para contraseñas
# (a propósito es "lento", para que sea costoso intentar adivinar contraseñas)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
    """Convierte una contraseña en texto plano en su versión hasheada."""
    return pwd_context.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    """Compara una contraseña escrita por el usuario contra el hash guardado."""
    return pwd_context.verify(password_plano, password_hash)


def crear_token(datos: dict) -> str:
    """Genera un JWT firmado que expira después de EXPIRE_MINUTES."""
    datos_a_codificar = datos.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    datos_a_codificar.update({"exp": expiracion})
    return jwt.encode(datos_a_codificar, SECRET_KEY, algorithm=ALGORITHM)
