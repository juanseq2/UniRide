import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  buscarRutas,
  listarMisVehiculos,
  publicarRuta,
  reservasRecibidas,
  confirmarReserva,
  rechazarReserva,
  iniciarViaje,
  registrarVehiculo,
} from "../api";
import type { Ruta, Usuario, Vehiculo, ReservaDetalle } from "../api";
import BuscadorDireccion from "./BuscadorDireccion";

interface DashboardConductorProps {
  usuario: Usuario;
  token: string;
  cerrarSesion: () => void;
  abrirMapa: () => void;
}

function fechaLocalActual() {
  const hoy = new Date();
  const zonaHoraria = hoy.getTimezoneOffset() * 60_000;
  return new Date(hoy.getTime() - zonaHoraria).toISOString().slice(0, 10);
}

function DashboardConductor({ usuario, token, cerrarSesion }: DashboardConductorProps) {
  const primerNombre = usuario.nombre.split(" ")[0];
  const inicial = usuario.nombre.charAt(0).toUpperCase();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [reservas, setReservas] = useState<ReservaDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [procesandoReserva, setProcesandoReserva] = useState<number | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState("");

  const [origen, setOrigen] = useState("");
  const [origenLat, setOrigenLat] = useState<number | null>(null);
  const [origenLng, setOrigenLng] = useState<number | null>(null);
  const [destino, setDestino] = useState("");
  const [destinoLat, setDestinoLat] = useState<number | null>(null);
  const [destinoLng, setDestinoLng] = useState<number | null>(null);

  const [fecha, setFecha] = useState(fechaLocalActual);
  const [horaSalida, setHoraSalida] = useState("");
  const [cupos, setCupos] = useState("1");
  const [rutaSegura, setRutaSegura] = useState(false);
  const [iniciandoRuta, setIniciandoRuta] = useState<number | null>(null);
  const [placaVehiculo, setPlacaVehiculo] = useState("");
  const [modeloVehiculo, setModeloVehiculo] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState<"moto" | "carro">("carro");
  const [capacidadVehiculo, setCapacidadVehiculo] = useState("4");
  const [registrandoVehiculo, setRegistrandoVehiculo] = useState(false);

  async function cargarTodo() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [resultadoRutas, resultadoVehiculos, resultadoReservas] = await Promise.allSettled([
        buscarRutas(),
        listarMisVehiculos(token),
        reservasRecibidas(token),
      ]);

      if (resultadoRutas.status === "fulfilled") {
        setRutas(resultadoRutas.value.filter((ruta) => ruta.id_conductor === usuario.id_usuario));
      }

      if (resultadoVehiculos.status === "fulfilled") {
        setVehiculos(resultadoVehiculos.value);
        setVehiculoSeleccionado(
          resultadoVehiculos.value[0]
            ? String(resultadoVehiculos.value[0].id_vehiculo)
            : "",
        );
      }

      if (resultadoReservas.status === "fulfilled") {
        setReservas(resultadoReservas.value);
      }

      const errores = [resultadoRutas, resultadoVehiculos, resultadoReservas]
        .filter((resultado): resultado is PromiseRejectedResult => resultado.status === "rejected")
        .map((resultado) => resultado.reason instanceof Error ? resultado.reason.message : "Error desconocido");

      if (errores.length > 0) {
        setErrorCarga(`No se pudo cargar: ${errores.join(". ")}`);
      }
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo cargar tu información.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, usuario.id_usuario]);

  async function manejarConfirmar(idReserva: number) {
    setProcesandoReserva(idReserva);
    try {
      await confirmarReserva(token, idReserva);
      await cargarTodo();
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo confirmar la reserva.");
    } finally {
      setProcesandoReserva(null);
    }
  }

  async function manejarRechazar(idReserva: number) {
    setProcesandoReserva(idReserva);
    try {
      await rechazarReserva(token, idReserva);
      await cargarTodo();
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo rechazar la reserva.");
    } finally {
      setProcesandoReserva(null);
    }
  }

  async function manejarIniciarViaje(idRuta: number) {
    setIniciandoRuta(idRuta);
    setErrorCarga(null);
    setMensajeExito(null);
    try {
      const rutaActualizada = await iniciarViaje(token, idRuta);
      setRutas((actuales) =>
        actuales.map((ruta) =>
          ruta.id_ruta === idRuta ? rutaActualizada : ruta,
        ),
      );
      setMensajeExito("¡Viaje iniciado! Los pasajeros pueden ver el estado en curso.");
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo iniciar el viaje.");
    } finally {
      setIniciandoRuta(null);
    }
  }

  async function manejarRegistrarVehiculo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setRegistrandoVehiculo(true);
    setErrorCarga(null);
    setMensajeExito(null);
    try {
      const nuevoVehiculo = await registrarVehiculo(token, {
        placa: placaVehiculo.trim().toUpperCase(),
        modelo: modeloVehiculo.trim(),
        tipo: tipoVehiculo,
        capacidad: Number(capacidadVehiculo),
      });
      setVehiculos((actuales) => [...actuales, nuevoVehiculo]);
      setVehiculoSeleccionado(String(nuevoVehiculo.id_vehiculo));
      setPlacaVehiculo("");
      setModeloVehiculo("");
      setMensajeExito("Vehículo registrado correctamente.");
    } catch (error: unknown) {
      setErrorCarga(error instanceof Error ? error.message : "No se pudo registrar el vehículo.");
    } finally {
      setRegistrandoVehiculo(false);
    }
  }

  function abrirFormularioRuta() {
    setErrorFormulario(null);
    setMensajeExito(null);
    if (vehiculos.length === 0) {
      setErrorCarga("Primero registra un vehículo en la sección Mi vehículo.");
    }
    setModalAbierto(true);
  }

  async function manejarPublicacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorFormulario(null);
    setMensajeExito(null);

    if (origenLat == null || origenLng == null || destinoLat == null || destinoLng == null) {
      setErrorFormulario("Elige el origen y el destino de la lista de sugerencias o desde el mapa.");
      return;
    }

    setPublicando(true);
    try {
      const nuevaRuta = await publicarRuta(token, {
        id_vehiculo: Number(vehiculoSeleccionado),
        origen: origen.trim(),
        destino: destino.trim(),
        origen_lat: origenLat,
        origen_lng: origenLng,
        destino_lat: destinoLat,
        destino_lng: destinoLng,
        fecha,
        hora_salida: horaSalida,
        cupos_disponibles: Number(cupos),
        aporte_sugerido: 0,
        ruta_segura: rutaSegura,
      });

      setRutas((actuales) =>
        [...actuales, nuevaRuta].sort((a, b) =>
          `${a.fecha}T${a.hora_salida}`.localeCompare(`${b.fecha}T${b.hora_salida}`),
        ),
      );
      setMensajeExito("¡Ruta publicada! Ya aparece en tus rutas y en el mapa.");
      setModalAbierto(false);
      setOrigen("");
      setOrigenLat(null);
      setOrigenLng(null);
      setDestino("");
      setDestinoLat(null);
      setDestinoLng(null);
      setHoraSalida("");
      setRutaSegura(false);
    } catch (error: unknown) {
      setErrorFormulario(error instanceof Error ? error.message : "No se pudo publicar la ruta.");
    } finally {
      setPublicando(false);
    }
  }

  const reservasPendientes = reservas.filter((reserva) => reserva.estado === "pendiente");
  const vehiculoSeleccionadoInfo = vehiculos.find(
    (vehiculo) => String(vehiculo.id_vehiculo) === vehiculoSeleccionado,
  );

  function calcularCobroEstimado() {
    if (
      origenLat == null ||
      origenLng == null ||
      destinoLat == null ||
      destinoLng == null
    ) return null;

    const radioTierraKm = 6371;
    const latOrigen = origenLat * Math.PI / 180;
    const latDestino = destinoLat * Math.PI / 180;
    const diferenciaLat = (destinoLat - origenLat) * Math.PI / 180;
    const diferenciaLng = (destinoLng - origenLng) * Math.PI / 180;
    const a =
      Math.sin(diferenciaLat / 2) ** 2 +
      Math.cos(latOrigen) * Math.cos(latDestino) * Math.sin(diferenciaLng / 2) ** 2;
    const distanciaKm = radioTierraKm * 2 * Math.asin(Math.sqrt(a));
    const tarifa = vehiculoSeleccionadoInfo?.tipo === "moto" ? 500 : 1000;
    return {
      distanciaKm,
      cobro: Math.round(distanciaKm * tarifa),
    };
  }

  const cobroEstimado = calcularCobroEstimado();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">🚗 UniRide</div>
        <div className="sidebar-menu">
          <button
            className="menu-item active"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            🏠 Inicio
          </button>
          <button
            className="menu-item"
            onClick={() => document.querySelector("#vehiculos-conductor")?.scrollIntoView({ behavior: "smooth" })}
          >
            🚗 Mi vehículo
          </button>
          <button
            className="menu-item"
            onClick={() => document.querySelector("#historial-rutas")?.scrollIntoView({ behavior: "smooth" })}
          >
            📊 Historial
          </button>
          <button
            className="menu-item"
            onClick={() => document.querySelector("#perfil-conductor")?.scrollIntoView({ behavior: "smooth" })}
          >
            👤 Mi perfil
          </button>
        </div>
        <button className="logout-button" onClick={cerrarSesion}>🚪 Cerrar sesión</button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header" id="perfil-conductor">
          <div>
            <h1>¡Hola, {primerNombre}! 👋</h1>
            <p>Este es el resumen de tus viajes.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">{inicial}</div>
            <div>
              <strong>{usuario.nombre}</strong>
              <span>Conductor ⭐ {usuario.calificacion_promedio}</span>
            </div>
          </div>
        </header>

        <section className="route-card" aria-label="Perfil del conductor">
          <h2>Mi perfil</h2>
          <p><strong>Nombre:</strong> {usuario.nombre}</p>
          <p><strong>Correo:</strong> {usuario.correo_institucional}</p>
          <p><strong>Rol:</strong> Conductor</p>
          <p><strong>Calificación:</strong> ⭐ {usuario.calificacion_promedio}</p>
        </section>

        <section className="route-card" id="vehiculos-conductor" aria-label="Mis vehículos">
          <h2>Mis vehículos</h2>
          {vehiculos.length === 0 ? (
            <p>Completa el onboarding para registrar tu primer vehículo.</p>
          ) : (
            vehiculos.map((vehiculo) => (
              <p key={vehiculo.id_vehiculo}>
                <strong>{vehiculo.tipo === "moto" ? "Moto" : "Carro"}</strong>
                {" · "}{vehiculo.placa}
                {" · "}{vehiculo.modelo || "Modelo no registrado"}
                {" · "}{vehiculo.capacidad} pasajeros
              </p>
            ))
          )}
          <form className="route-form" onSubmit={manejarRegistrarVehiculo}>
            <label>
              Placa
              <input
                value={placaVehiculo}
                onChange={(evento) => setPlacaVehiculo(evento.target.value)}
                maxLength={10}
                required
              />
            </label>
            <label>
              Modelo
              <input
                value={modeloVehiculo}
                onChange={(evento) => setModeloVehiculo(evento.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Tipo
              <select value={tipoVehiculo} onChange={(evento) => setTipoVehiculo(evento.target.value as "moto" | "carro")}>
                <option value="carro">Carro - $1.000 por km</option>
                <option value="moto">Moto - $500 por km</option>
              </select>
            </label>
            <label>
              Capacidad
              <input
                type="number"
                min="1"
                max="100"
                value={capacidadVehiculo}
                onChange={(evento) => setCapacidadVehiculo(evento.target.value)}
                required
              />
            </label>
            <button className="btn-primary" type="submit" disabled={registrandoVehiculo}>
              {registrandoVehiculo ? "Registrando..." : "Registrar vehículo"}
            </button>
          </form>
        </section>

        {mensajeExito && <p className="exito">{mensajeExito}</p>}
        {errorCarga && <p className="error">{errorCarga}</p>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>🚗</span>
            <div><p>Rutas publicadas</p><strong>{rutas.length}</strong></div>
          </div>
          <div className="stat-card">
            <span>🕓</span>
            <div><p>Reservas pendientes</p><strong>{reservasPendientes.length}</strong></div>
          </div>
          <div className="stat-card">
            <span>⭐</span>
            <div><p>Calificación</p><strong>{usuario.calificacion_promedio}</strong></div>
          </div>
        </section>

        <section className="create-route-section">
          <div>
            <h2>Reservas pendientes</h2>
            <p>Pasajeros esperando que confirmes su cupo.</p>
          </div>
        </section>

        {cargando ? (
          <p>Cargando reservas...</p>
        ) : reservasPendientes.length === 0 ? (
          <p>No tienes reservas pendientes por el momento.</p>
        ) : (
          <div className="tabla-admin-contenedor">
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>Pasajero</th>
                  <th>Ruta</th>
                  <th>Fecha</th>
                  <th>Cupos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasPendientes.map((reserva) => (
                  <tr key={reserva.id_reserva}>
                    <td>{reserva.nombre_pasajero}</td>
                    <td>{reserva.origen} → {reserva.destino}</td>
                    <td>{new Date(`${reserva.fecha_viaje}T00:00:00`).toLocaleDateString("es-CO")} · {reserva.hora_salida.slice(0, 5)}</td>
                    <td>{reserva.cantidad_cupos}</td>
                    <td className="celda-acciones">
                      <button
                        className="btn-primary btn-pequeno"
                        disabled={procesandoReserva === reserva.id_reserva}
                        onClick={() => manejarConfirmar(reserva.id_reserva)}
                      >
                        {procesandoReserva === reserva.id_reserva ? "..." : "Confirmar"}
                      </button>
                      <button
                        className="btn-outline btn-pequeno"
                        disabled={procesandoReserva === reserva.id_reserva}
                        onClick={() => manejarRechazar(reserva.id_reserva)}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="create-route-section" id="historial-rutas">
          <div>
            <h2>Mis rutas</h2>
            <p>Administra los trayectos que tienes publicados.</p>
          </div>
          <button className="btn-primary" onClick={abrirFormularioRuta}>
            + Crear nueva ruta
          </button>
        </section>

        {cargando ? (
          <p>Cargando tus rutas...</p>
        ) : rutas.length === 0 ? (
          <section className="route-empty">
            <h3>Aún no tienes rutas publicadas</h3>
            <p>Crea una ruta para que otros pasajeros puedan encontrarla.</p>
          </section>
        ) : (
          <section className="routes-grid">
            {rutas.map((ruta) => (
              <article className="route-card" key={ruta.id_ruta}>
                <div className="route-top">
                  <span className="route-time">{ruta.hora_salida.slice(0, 5)}</span>
                  <span className="available">{ruta.cupos_disponibles} cupos</span>
                </div>
                <h3>{ruta.origen} → {ruta.destino}</h3>
                <p>📅 {new Date(`${ruta.fecha}T00:00:00`).toLocaleDateString("es-CO")}</p>
                <div className="driver-info">
                  Cobro por viaje · ${Number(ruta.aporte_sugerido).toLocaleString("es-CO")}
                  {" "}· {ruta.estado_viaje === "en_curso" ? "En curso" : "Publicada"}
                </div>
                {ruta.estado_viaje !== "en_curso" && ruta.estado_viaje !== "finalizada" && (
                  <button
                    className="btn-primary full-button"
                    disabled={
                      iniciandoRuta === ruta.id_ruta ||
                      !reservas.some(
                        (reserva) =>
                          reserva.id_ruta === ruta.id_ruta &&
                          reserva.estado === "confirmada",
                      )
                    }
                    onClick={() => manejarIniciarViaje(ruta.id_ruta)}
                  >
                    {iniciandoRuta === ruta.id_ruta
                      ? "Iniciando..."
                      : reservas.some(
                            (reserva) =>
                              reserva.id_ruta === ruta.id_ruta &&
                              reserva.estado === "confirmada",
                          )
                        ? "Iniciar viaje"
                        : "Confirma una reserva"}
                  </button>
                )}
              </article>
            ))}
          </section>
        )}
      </main>

      {modalAbierto && (
        <div
          className="route-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !publicando) setModalAbierto(false);
          }}
        >
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
            <div className="route-modal-header">
              <div>
                <h2 id="route-modal-title">Publicar nueva ruta</h2>
                <p>Completa los datos del viaje para que los pasajeros puedan encontrarlo.</p>
              </div>
              <button type="button" className="route-modal-close" onClick={() => setModalAbierto(false)} disabled={publicando} aria-label="Cerrar">×</button>
            </div>

            <form className="route-form" onSubmit={manejarPublicacion}>
              <label>
                Vehículo
                <select value={vehiculoSeleccionado} onChange={(event) => setVehiculoSeleccionado(event.target.value)} required>
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id_vehiculo} value={vehiculo.id_vehiculo}>
                      {[vehiculo.modelo, vehiculo.placa].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              </label>

              <BuscadorDireccion
                etiqueta="Origen"
                valor={origen}
                placeholder="Ej. Centro Comercial Santafé, Bogotá"
                onSeleccionar={(direccion, lat, lng) => {
                  setOrigen(direccion);
                  setOrigenLat(lat);
                  setOrigenLng(lng);
                }}
              />

              <BuscadorDireccion
                etiqueta="Destino"
                valor={destino}
                placeholder="Ej. UNIMINUTO, Bogotá"
                onSeleccionar={(direccion, lat, lng) => {
                  setDestino(direccion);
                  setDestinoLat(lat);
                  setDestinoLng(lng);
                }}
              />

              <div className="route-form-grid">
                <label>
                  Fecha
                  <input type="date" min={fechaLocalActual()} value={fecha} onChange={(event) => setFecha(event.target.value)} required />
                </label>
                <label>
                  Hora de salida
                  <input type="time" value={horaSalida} onChange={(event) => setHoraSalida(event.target.value)} required />
                </label>
                <label>
                  Cupos disponibles
                  <input
                    type="number"
                    min="1"
                    max={vehiculos.find((v) => String(v.id_vehiculo) === vehiculoSeleccionado)?.capacidad}
                    value={cupos}
                    onChange={(event) => setCupos(event.target.value)}
                    required
                  />
                </label>
                <div className="route-charge-preview">
                  <span>Cobro sugerido por distancia</span>
                  <strong>
                    {cobroEstimado
                      ? `$${cobroEstimado.cobro.toLocaleString("es-CO")} COP · ${cobroEstimado.distanciaKm.toFixed(1)} km`
                      : "Selecciona origen y destino"}
                  </strong>
                  <small>
                    {vehiculoSeleccionadoInfo?.tipo === "moto"
                      ? "Tarifa: $500 COP por km"
                      : "Tarifa: $1.000 COP por km"}
                  </small>
                </div>
              </div>

              <label className="route-checkbox">
                <input type="checkbox" checked={rutaSegura} onChange={(event) => setRutaSegura(event.target.checked)} />
                Marcar como ruta segura
              </label>

              {errorFormulario && <p className="error" role="alert">{errorFormulario}</p>}

              <div className="route-form-actions">
                <button type="button" className="btn-outline" onClick={() => setModalAbierto(false)} disabled={publicando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={publicando}>
                  {publicando ? "Publicando..." : "Publicar ruta"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default DashboardConductor;
