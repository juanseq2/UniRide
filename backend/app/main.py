"""
Este es el archivo que arranca el servidor.
Se corre con:  uvicorn app.main:app --reload
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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


PROJECT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"
ASSETS_DIR = FRONTEND_DIST / "assets"

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{ruta:path}", include_in_schema=False)
def servir_frontend(ruta: str):
    if FRONTEND_DIST.is_dir():
        archivo = (FRONTEND_DIST / ruta).resolve()
        if archivo.is_relative_to(FRONTEND_DIST.resolve()) and archivo.is_file():
            return FileResponse(archivo)
        index = FRONTEND_DIST / "index.html"
        if index.is_file():
            return FileResponse(index)
    return {"mensaje": "UniRide API funcionando 🚗"}
