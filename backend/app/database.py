"""
Este archivo configura la conexión entre Python y PostgreSQL.
No necesitas tocarlo por ahora, solo entender qué hace cada parte.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carga las variables del archivo .env (como DATABASE_URL)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada")

# Render puede entregar URLs de PostgreSQL con el prefijo "postgres://".
# SQLAlchemy 2 requiere "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# El "engine" es el objeto que sabe hablar con PostgreSQL
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Cada vez que atendemos una petición, abrimos una "sesión" (conversación con la BD)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Todas nuestras tablas (modelos) van a heredar de esta clase base
Base = declarative_base()


def get_db():
    """
    Esta función se usa en cada endpoint que necesite hablar con la base de datos.
    Abre una sesión, la entrega, y al terminar la cierra automáticamente.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
