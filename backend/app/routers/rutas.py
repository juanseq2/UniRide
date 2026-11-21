from datetime import date
from math import radians, sin, cos, asin, sqrt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ruta import Ruta
from app.models.usuario import Vehiculo, Conductor, Usuario
from app.models.reserva import Reserva, EstadoReserva
from app import schemas
from app.deps import obtener_conductor_actual

router = APIRouter(prefix="/rutas", tags=["Rutas"])


def distancia_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radio_tierra_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    )
    return radio_tierra_km * 2 * asin(sqrt(a))


@router.post("/", response_model=schemas.RutaOut)
def publicar_ruta(
    datos: schemas.RutaCreate,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    vehiculo = db.query(Vehiculo).filter(
        Vehiculo.id_vehiculo == datos.id_vehiculo,
        Vehiculo.id_conductor == conductor.id_usuario,
    ).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Ese vehículo no existe o no te pertenece")
    if datos.cupos_disponibles > vehiculo.capacidad:
        raise HTTPException(
            status_code=400,
            detail=f"Los cupos disponibles no pueden superar la capacidad del vehículo ({vehiculo.capacidad})",
        )

    distancia = distancia_km(
        datos.origen_lat,
        datos.origen_lng,
        datos.destino_lat,
        datos.destino_lng,
    )
    tarifa_por_km = 500 if vehiculo.tipo == "moto" else 1000
    aporte_calculado = round(distancia * tarifa_por_km)

    nueva_ruta = Ruta(
        id_conductor=conductor.id_usuario,
        id_vehiculo=datos.id_vehiculo,
        origen=datos.origen,
        destino=datos.destino,
        origen_lat=datos.origen_lat,
        origen_lng=datos.origen_lng,
        destino_lat=datos.destino_lat,
        destino_lng=datos.destino_lng,
        fecha=datos.fecha,
        hora_salida=datos.hora_salida,
        cupos_disponibles=datos.cupos_disponibles,
        aporte_sugerido=aporte_calculado,
        ruta_segura=datos.ruta_segura,
    )
    db.add(nueva_ruta)
    db.commit()
    db.refresh(nueva_ruta)
    return nueva_ruta


@router.get("/", response_model=List[schemas.RutaOut])
def buscar_rutas(
    origen: Optional[str] = None,
    destino: Optional[str] = None,
    fecha: Optional[date] = None,
    solo_seguras: bool = False,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Ruta, Usuario)
        .join(Usuario, Ruta.id_conductor == Usuario.id_usuario)
        .filter(Ruta.cupos_disponibles > 0)
    )

    if origen:
        query = query.filter(Ruta.origen.ilike(f"%{origen}%"))
    if destino:
        query = query.filter(Ruta.destino.ilike(f"%{destino}%"))
    if fecha:
        query = query.filter(Ruta.fecha == fecha)
    if solo_seguras:
        query = query.filter(Ruta.ruta_segura.is_(True))

    resultados = query.order_by(Ruta.fecha, Ruta.hora_salida).all()

    return [
        schemas.RutaOut(
            id_ruta=r.id_ruta,
            id_conductor=r.id_conductor,
            origen=r.origen,
            destino=r.destino,
            origen_lat=r.origen_lat,
            origen_lng=r.origen_lng,
            destino_lat=r.destino_lat,
            destino_lng=r.destino_lng,
            fecha=r.fecha,
            hora_salida=r.hora_salida,
            cupos_disponibles=r.cupos_disponibles,
            aporte_sugerido=r.aporte_sugerido,
            ruta_segura=r.ruta_segura,
            estado_viaje=r.estado_viaje,
            nombre_conductor=u.nombre,
            calificacion_conductor=float(u.calificacion_promedio),
        )
        for r, u in resultados
    ]


@router.patch("/{id_ruta}/iniciar", response_model=schemas.RutaOut)
def iniciar_viaje(
    id_ruta: int,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    ruta = db.query(Ruta).filter(
        Ruta.id_ruta == id_ruta,
        Ruta.id_conductor == conductor.id_usuario,
    ).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    if ruta.estado_viaje == "en_curso":
        raise HTTPException(status_code=400, detail="Esta ruta ya está en curso")
    if ruta.estado_viaje == "finalizada":
        raise HTTPException(status_code=400, detail="Esta ruta ya fue finalizada")

    reserva_confirmada = db.query(Reserva).filter(
        Reserva.id_ruta == id_ruta,
        Reserva.estado == EstadoReserva.confirmada,
    ).first()
    if not reserva_confirmada:
        raise HTTPException(
            status_code=400,
            detail="Confirma al menos una reserva antes de iniciar el viaje",
        )

    ruta.estado_viaje = "en_curso"
    db.commit()
    db.refresh(ruta)
    usuario = db.query(Usuario).filter(Usuario.id_usuario == conductor.id_usuario).first()
    return schemas.RutaOut(
        id_ruta=ruta.id_ruta,
        id_conductor=ruta.id_conductor,
        origen=ruta.origen,
        destino=ruta.destino,
        origen_lat=ruta.origen_lat,
        origen_lng=ruta.origen_lng,
        destino_lat=ruta.destino_lat,
        destino_lng=ruta.destino_lng,
        fecha=ruta.fecha,
        hora_salida=ruta.hora_salida,
        cupos_disponibles=ruta.cupos_disponibles,
        aporte_sugerido=ruta.aporte_sugerido,
        ruta_segura=ruta.ruta_segura,
        estado_viaje=ruta.estado_viaje,
        nombre_conductor=usuario.nombre if usuario else None,
        calificacion_conductor=float(usuario.calificacion_promedio) if usuario else None,
    )
