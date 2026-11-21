from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario, Conductor
from app.models.ruta import Ruta
from app.models.reserva import Reserva, EstadoReserva
from app.models.aporte import Aporte, EstadoAporte
from app import schemas
from app.deps import obtener_usuario_actual, obtener_conductor_actual

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.post("/", response_model=schemas.ReservaOut)
def reservar_cupo(
    datos: schemas.ReservaCreate,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    if usuario.rol.value != "pasajero":
        raise HTTPException(status_code=403, detail="Solo los pasajeros pueden reservar cupos")

    ruta = db.query(Ruta).filter(Ruta.id_ruta == datos.id_ruta).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    if ruta.cupos_disponibles < datos.cantidad_cupos:
        raise HTTPException(status_code=400, detail="No hay suficientes cupos disponibles")

    nueva_reserva = Reserva(
        id_ruta=ruta.id_ruta,
        id_pasajero=usuario.id_usuario,
        cantidad_cupos=datos.cantidad_cupos,
        estado=EstadoReserva.pendiente,
    )
    db.add(nueva_reserva)
    ruta.cupos_disponibles -= datos.cantidad_cupos
    db.commit()
    db.refresh(nueva_reserva)

    nuevo_aporte = Aporte(
        id_reserva=nueva_reserva.id_reserva,
        valor=float(ruta.aporte_sugerido) * datos.cantidad_cupos,
        estado=EstadoAporte.pendiente,
    )
    db.add(nuevo_aporte)
    db.commit()

    return nueva_reserva


@router.get("/mias", response_model=List[schemas.ReservaOut])
def mis_reservas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return db.query(Reserva).filter(Reserva.id_pasajero == usuario.id_usuario).all()


@router.get("/recibidas", response_model=List[schemas.ReservaDetalleOut])
def reservas_recibidas(
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    """Reservas que los pasajeros han hecho sobre las rutas de este conductor, con detalle."""
    try:
        resultados = (
            db.query(Reserva, Ruta, Usuario)
            .join(Ruta, Reserva.id_ruta == Ruta.id_ruta)
            .join(Usuario, Reserva.id_pasajero == Usuario.id_usuario)
            .filter(Ruta.id_conductor == conductor.id_usuario)
            .order_by(Reserva.fecha_reserva.desc())
            .all()
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudieron consultar las reservas recibidas",
        ) from exc
    return [
        schemas.ReservaDetalleOut(
            id_reserva=reserva.id_reserva,
            id_ruta=reserva.id_ruta,
            estado=reserva.estado,
            cantidad_cupos=reserva.cantidad_cupos,
            fecha_reserva=reserva.fecha_reserva,
            nombre_pasajero=pasajero.nombre,
            origen=ruta.origen,
            destino=ruta.destino,
            fecha_viaje=ruta.fecha,
            hora_salida=ruta.hora_salida,
        )
        for reserva, ruta, pasajero in resultados
    ]


def _reserva_de_una_ruta_del_conductor(id_reserva: int, conductor: Conductor, db: Session) -> Reserva:
    reserva = db.query(Reserva).filter(Reserva.id_reserva == id_reserva).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    ruta = db.query(Ruta).filter(Ruta.id_ruta == reserva.id_ruta).first()
    if not ruta or ruta.id_conductor != conductor.id_usuario:
        raise HTTPException(status_code=403, detail="Esta reserva no pertenece a una de tus rutas")
    return reserva


@router.patch("/{id_reserva}/confirmar", response_model=schemas.ReservaOut)
def confirmar_reserva(
    id_reserva: int,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    reserva = _reserva_de_una_ruta_del_conductor(id_reserva, conductor, db)
    reserva.estado = EstadoReserva.confirmada
    db.commit()
    db.refresh(reserva)
    return reserva


@router.patch("/{id_reserva}/rechazar", response_model=schemas.ReservaOut)
def rechazar_reserva(
    id_reserva: int,
    conductor: Conductor = Depends(obtener_conductor_actual),
    db: Session = Depends(get_db),
):
    reserva = _reserva_de_una_ruta_del_conductor(id_reserva, conductor, db)
    if reserva.estado != EstadoReserva.rechazada:
        ruta = db.query(Ruta).filter(Ruta.id_ruta == reserva.id_ruta).first()
        ruta.cupos_disponibles += reserva.cantidad_cupos
        reserva.estado = EstadoReserva.rechazada
        db.commit()
        db.refresh(reserva)
    return reserva


@router.patch("/{id_reserva}/cancelar", response_model=schemas.ReservaOut)
def cancelar_reserva(
    id_reserva: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    reserva = db.query(Reserva).filter(Reserva.id_reserva == id_reserva).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    if reserva.id_pasajero != usuario.id_usuario:
        raise HTTPException(status_code=403, detail="Esta no es tu reserva")

    if reserva.estado != EstadoReserva.cancelada:
        ruta = db.query(Ruta).filter(Ruta.id_ruta == reserva.id_ruta).first()
        ruta.cupos_disponibles += reserva.cantidad_cupos
        reserva.estado = EstadoReserva.cancelada
        db.commit()
        db.refresh(reserva)

    return reserva
