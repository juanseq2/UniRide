import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ApiError,
  buscarRutas,
  completarPerfilConductor,
  listarMisVehiculos,
  publicarRuta,
  registrarVehiculo,
} from "../api";
import type { Ruta, Usuario, Vehiculo } from "../api";

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

function DashboardConductor({ usuario, token, cerrarSesion, abrirMapa }: DashboardConductorProps) {
  const primerNombre = usuario.nombre.split(" ")[0];
  const inicial = usuario.nombre.charAt(0).toUpperCase();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [requierePerfil, setRequierePerfil] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState(fechaLocalActual);
  const [horaSalida, setHoraSalida] = useState("");
  const [cupos, setCupos] = useState("1");
  const [aporte, setAporte] = useState("");
  const [rutaSegura, setRutaSegura] = useState(false);
  const [licencia, setLicencia] = useState("");
  const [soat, setSoat] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [capacidad, setCapacidad] = useState("4");

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      buscarRutas().then((todas) => {
        if (!cancelado) setRutas(todas.filter((ruta) => ruta.id_conductor === usuario.id_usuario));
      }),
      listarMisVehiculos(token)
        .then((resultado) => {
          if (!cancelado) {
            setVehiculos(resultado);
            setVehiculoSeleccionado(resultado[0] ? String(resultado[0].id_vehiculo) : "");
          }
        })
        .catch((error: unknown) => {
          if (cancelado) return;
          if (error instanceof ApiError && error.status === 400) {
            setRequierePerfil(true);
          } else {
            setErrorCarga(error instanceof Error ? error.message : "No se pudieron cargar tus vehículos.");
          }
        }),
    ])
      .catch((error: unknown) => {
        if (!cancelado) {
          setErrorCarga(error instanceof Error ? error.message : "No se pudieron cargar tus rutas.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [token, usuario.id_usuario]);

  function abrirFormularioRuta() {
    setErrorFormulario(null);
    setMensajeExito(null);
    setModalAbierto(true);
  }

  async function manejarPublicacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorFormulario(null);
    setMensajeExito(null);
    setPublicando(true);

    try {
      if (requierePerfil) {
        await completarPerfilConductor(token, { licencia, soat });
        setRequierePerfil(false);
      }

      let vehiculoId = Number(vehiculoSeleccionado);
      if (vehiculos.length === 0) {
        const vehiculo = await registrarVehiculo(token, {
          placa: placa.trim().toUpperCase(),
          modelo: modelo.trim(),
          capacidad: Number(capacidad),
        });
        setVehiculos([vehiculo]);
        setVehiculoSeleccionado(String(vehiculo.id_vehiculo));
        vehiculoId = vehiculo.id_vehiculo;
      }

      const nuevaRuta = await publicarRuta(token, {
        id_vehiculo: vehiculoId,
        origen: origen.trim(),
        destino: destino.trim(),
        fecha,
        hora_salida: horaSalida,
        cupos_disponibles: Number(cupos),
        aporte_sugerido: Number(aporte),
        ruta_segura: rutaSegura,
      });

      setRutas((actuales) => [...actuales, nuevaRuta].sort((a, b) =>
        `${a.fecha}T${a.hora_salida}`.localeCompare(`${b.fecha}T${b.hora_salida}`),
      ));
      setMensajeExito("¡Ruta publicada! Ya aparece en tus rutas y en el mapa.");
      setModalAbierto(false);
      setOrigen("");
      setDestino("");
      setHoraSalida("");
      setAporte("");
      setRutaSegura(false);
    } catch (error: unknown) {
      setErrorFormulario(error instanceof Error ? error.message : "No se pudo publicar la ruta.");
    } finally {
      setPublicando(false);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">🚗 UniRide</div>
        <div className="sidebar-menu">
          <button className="menu-item active">🏠 Inicio</button>
          <button className="menu-item" onClick={abrirMapa}>🛣️ Mis rutas</button>
          <button className="menu-item">👥 Pasajeros</button>
          <button className="menu-item">🚗 Mi vehículo</button>
          <button className="menu-item">📊 Historial</button>
          <button className="menu-item">👤 Mi perfil</button>
        </div>
        <button className="logout-button" onClick={cerrarSesion}>🚪 Cerrar sesión</button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
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

        {mensajeExito && <p className="exito">{mensajeExito}</p>}
        {errorCarga && <p className="error">{errorCarga}</p>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>🚗</span>
            <div><p>Rutas publicadas</p><strong>{rutas.length}</strong></div>
          </div>
          <div className="stat-card">
            <span>👥</span>
            <div><p>Cupos disponibles</p><strong>{rutas.reduce((total, ruta) => total + ruta.cupos_disponibles, 0)}</strong></div>
          </div>
          <div className="stat-card">
            <span>⭐</span>
            <div><p>Calificación</p><strong>{usuario.calificacion_promedio}</strong></div>
          </div>
        </section>

        <section className="create-route-section">
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
            <span>🛣️</span>
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
                  {ruta.ruta_segura ? "🛡️ Ruta segura" : "Aporte sugerido"} · ${Number(ruta.aporte_sugerido).toLocaleString("es-CO")}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {modalAbierto && (
        <div className="route-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !publicando) setModalAbierto(false);
        }}>
          <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
            <div className="route-modal-header">
              <div>
                <h2 id="route-modal-title">Publicar nueva ruta</h2>
                <p>Completa los datos del viaje para que los pasajeros puedan encontrarlo.</p>
              </div>
              <button type="button" className="route-modal-close" onClick={() => setModalAbierto(false)} disabled={publicando} aria-label="Cerrar">×</button>
            </div>

            <form className="route-form" onSubmit={manejarPublicacion}>
              {requierePerfil && (
                <fieldset className="route-form-section">
                  <legend>Completa tu perfil de conductor</legend>
                  <label>
                    Número de licencia
                    <input value={licencia} onChange={(event) => setLicencia(event.target.value)} required />
                  </label>
                  <label>
                    SOAT
                    <input value={soat} onChange={(event) => setSoat(event.target.value)} required />
                  </label>
                </fieldset>
              )}

              {vehiculos.length > 0 ? (
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
              ) : (
                <fieldset className="route-form-section">
                  <legend>Registra el vehículo</legend>
                  <label>
                    Placa
                    <input value={placa} onChange={(event) => setPlaca(event.target.value)} maxLength={10} required />
                  </label>
                  <label>
                    Modelo (opcional)
                    <input value={modelo} onChange={(event) => setModelo(event.target.value)} maxLength={100} />
                  </label>
                  <label>
                    Capacidad total del vehículo
                    <input type="number" min="2" max="100" value={capacidad} onChange={(event) => setCapacidad(event.target.value)} required />
                  </label>
                </fieldset>
              )}

              <div className="route-form-grid">
                <label>
                  Origen
                  <input value={origen} onChange={(event) => setOrigen(event.target.value)} maxLength={200} placeholder="Ej. Portal Norte, Bogotá" required />
                </label>
                <label>
                  Destino
                  <input value={destino} onChange={(event) => setDestino(event.target.value)} maxLength={200} placeholder="Ej. UNIMINUTO, Bogotá" required />
                </label>
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
                  <input type="number" min="1" max={vehiculos.find((v) => String(v.id_vehiculo) === vehiculoSeleccionado)?.capacidad ?? Number(capacidad)} value={cupos} onChange={(event) => setCupos(event.target.value)} required />
                </label>
                <label>
                  Aporte sugerido (COP)
                  <input type="number" min="0" step="100" value={aporte} onChange={(event) => setAporte(event.target.value)} required />
                </label>
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
