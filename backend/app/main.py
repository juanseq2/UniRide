"""
Este es el archivo que arranca el servidor.
Se corre con:  uvicorn app.main:app --reload
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
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


@app.get("/")
def raiz():
    return {"mensaje": "UniRide API funcionando 🚗"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "conectada"}
