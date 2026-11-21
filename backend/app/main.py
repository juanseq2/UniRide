"""
Este es el archivo que arranca el servidor.
Se corre con:  uvicorn app.main:app --reload
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db, Base, engine
from app.routers import auth, conductores, vehiculos, rutas, admin, reservas


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not os.getenv("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY no está configurada")

    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("""
            ALTER TABLE rutas
            ADD COLUMN IF NOT EXISTS origen_lat DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS origen_lng DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS destino_lat DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS destino_lng DOUBLE PRECISION
        """))
    yield

app = FastAPI(
    title="UniRide API",
    description="API del sistema de movilidad universitaria compartida",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "")
allow_origins = [
    origin.strip()
    for origin in cors_origins.split(",")
    if origin.strip()
] or ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conductores.router)
app.include_router(vehiculos.router)
app.include_router(rutas.router)
app.include_router(admin.router)
app.include_router(reservas.router) 


@app.get("/")
def raiz():
    return {"mensaje": "UniRide API funcionando 🚗"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "conectada"}
