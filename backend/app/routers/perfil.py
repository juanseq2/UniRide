from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import obtener_usuario_actual
from app.models.usuario import Usuario, Conductor, RolUsuario
from app import schemas, security

router = APIRouter(prefix="/perfil", tags=["Perfil de usuario"])


@router.get("/yo", response_model=schemas.PerfilUsuarioOut)
def consultar_mi_perfil(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Devuelve únicamente el perfil del usuario autenticado."""
    perfil = (
        db.query(Usuario)
        .options(joinedload(Usuario.conductor))
        .filter(Usuario.id_usuario == usuario.id_usuario)
        .first()
    )
    if perfil is None:
        raise HTTPException(status_code=404, detail="No se encontró el perfil")
    return perfil


@router.put("/yo", response_model=schemas.PerfilUsuarioOut)
def actualizar_mi_perfil(
    datos: schemas.PerfilUsuarioActualizar,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Actualiza los campos permitidos; correo y rol no son editables aquí."""
    cambios = datos.model_dump(exclude_unset=True)

    if "nombre" in cambios:
        nombre = (cambios["nombre"] or "").strip()
        if not nombre:
            raise HTTPException(status_code=422, detail="El nombre no puede estar vacío")
        usuario.nombre = nombre

    if "telefono" in cambios:
        telefono = cambios["telefono"]
        usuario.telefono = telefono.strip() if isinstance(telefono, str) else None

    campos_conductor = {"licencia", "soat", "propiedad_vehiculo"}
    if campos_conductor.intersection(cambios):
        if usuario.rol != RolUsuario.conductor:
            raise HTTPException(status_code=403, detail="Solo los conductores pueden editar esos datos")

        conductor = db.query(Conductor).filter(
            Conductor.id_usuario == usuario.id_usuario
        ).first()

        if conductor is None:
            # No se crea un perfil incompleto accidentalmente.
            if not cambios.get("licencia") or not cambios.get("soat"):
                raise HTTPException(
                    status_code=400,
                    detail="Para crear el perfil de conductor debes indicar licencia y SOAT",
                )
            conductor = Conductor(
                id_usuario=usuario.id_usuario,
                licencia=cambios["licencia"].strip(),
                soat=cambios["soat"].strip(),
                propiedad_vehiculo=cambios.get("propiedad_vehiculo"),
                documentos_aprobados=False,
            )
            db.add(conductor)
        else:
            for campo in campos_conductor.intersection(cambios):
                valor = cambios[campo]
                if campo in {"licencia", "soat"} and not (valor or "").strip():
                    raise HTTPException(status_code=422, detail=f"{campo.capitalize()} no puede estar vacío")
                setattr(conductor, campo, valor.strip() if isinstance(valor, str) else valor)

    try:
        db.commit()
        db.refresh(usuario)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="No se pudieron guardar los cambios")

    return (
        db.query(Usuario)
        .options(joinedload(Usuario.conductor))
        .filter(Usuario.id_usuario == usuario.id_usuario)
        .first()
    )


@router.delete("/mi-cuenta", status_code=status.HTTP_200_OK)
def eliminar_mi_cuenta(
    datos: schemas.EliminarCuentaIn,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Elimina la cuenta autenticada y sus registros dependientes en orden seguro."""
    if not security.verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña no es correcta")

    uid = usuario.id_usuario
    try:
        # Primero eliminamos referencias que impedirían borrar rutas o usuario.
        # Se hace dentro de una transacción: si algo falla, se revierte todo.
        db.execute(text("""
            DELETE FROM aportes
            WHERE id_reserva IN (
                SELECT r.id_reserva FROM reservas r
                LEFT JOIN rutas rt ON rt.id_ruta = r.id_ruta
                WHERE r.id_pasajero = :uid OR rt.id_conductor = :uid
            )
        """), {"uid": uid})

        db.execute(text("""
            DELETE FROM reservas
            WHERE id_pasajero = :uid
               OR id_ruta IN (SELECT id_ruta FROM rutas WHERE id_conductor = :uid)
        """), {"uid": uid})

        # Estas tablas tienen FK hacia usuarios/rutas sin ON DELETE CASCADE.
        db.execute(text("""
            DELETE FROM calificaciones
            WHERE id_calificador = :uid
               OR id_calificado = :uid
               OR id_ruta IN (SELECT id_ruta FROM rutas WHERE id_conductor = :uid)
        """), {"uid": uid})

        db.execute(text("""
            DELETE FROM alertas_sos
            WHERE id_usuario = :uid
               OR id_ruta IN (SELECT id_ruta FROM rutas WHERE id_conductor = :uid)
        """), {"uid": uid})

        # Borrar rutas antes que vehículos, porque rutas.id_vehiculo no tiene cascade.
        db.execute(text("""
            DELETE FROM rutas WHERE id_conductor = :uid
        """), {"uid": uid})

        # Los datos de seguimiento/seguridad de las rutas propias normalmente
        # se borran por cascade al borrar rutas. Se limpian explícitamente también.
        # Las filas de vehículos desaparecen antes que el conductor.
        db.execute(text("""
            DELETE FROM vehiculos WHERE id_conductor = :uid
        """), {"uid": uid})

        # La FK conductores.id_usuario sí tiene ON DELETE CASCADE, pero se borra
        # explícitamente para dejar claro el orden y evitar dependencias ORM.
        db.execute(text("DELETE FROM conductores WHERE id_usuario = :uid"), {"uid": uid})

        db.delete(usuario)
        db.commit()
        return {"mensaje": "La cuenta y sus datos asociados fueron eliminados."}
    except Exception as exc:
        db.rollback()
        # No se devuelve el detalle interno de SQL a la interfaz.
        raise HTTPException(
            status_code=500,
            detail="No se pudo eliminar la cuenta. No se guardaron cambios; revisa las relaciones de la base de datos.",
        ) from exc
