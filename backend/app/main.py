"""
Este es el archivo que arranca el servidor.
Se corre con:  uvicorn app.main:app --reload
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.database import Base, engine
from app.models import ruta, usuario
from app.routers import auth, conductores, vehiculos, rutas, admin

app = FastAPI(
    title="UniRide API",
    description="API del sistema de movilidad universitaria compartida",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conductores.router)
app.include_router(vehiculos.router)
app.include_router(rutas.router)
app.include_router(admin.router)


@app.on_event("startup")
def crear_tablas():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "conectada"}


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
