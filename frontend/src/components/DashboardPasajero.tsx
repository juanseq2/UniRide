import { useEffect, useState } from "react";
import type { Usuario, Ruta } from "../api";
import { buscarRutas, reservarCupo, ApiError } from "../api";

interface DashboardPasajeroProps {
  usuario: Usuario;
  token: string;
  cerrarSesion: () => void;
  abrirMapa: () => void;
}

function DashboardPasajero({ usuario, token, cerrarSesion, abrirMapa }: DashboardPasajeroProps) {
  const primerNombre = usuario.nombre.split(" ")[0];
  const inicial = usuario.nombre.charAt(0).toUpperCase();

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // id de la ruta que se está reservando en este momento (para mostrar "Reservando..." solo en esa tarjeta)
  const [reservandoId, setReservandoId] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  async function cargarRutas(filtros: { origen?: string; destino?: string } = {}) {
    setCargando(true);
    setError(null);
    try {
      const resultado = await buscarRutas(filtros);
      setRutas(resultado);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las rutas");
    } finally {
      setCargando(false);
    }
  }

  // Carga inicial: todas las rutas disponibles
  useEffect(() => {
    cargarRutas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function manejarBuscar(e: React.FormEvent) {
    e.preventDefault();
    cargarRutas({ origen: origen || undefined, destino: destino || undefined });
  }

  async function manejarReservar(idRuta: number) {
    setReservandoId(idRuta);
    setError(null);
    setMensajeExito(null);
    try {
      await reservarCupo(token, { id_ruta: idRuta, cantidad_cupos: 1 });
      setMensajeExito("¡Cupo reservado! Queda pendiente de que el conductor la confirme.");
      // Refrescamos la lista: esa ruta ahora tiene un cupo menos
      cargarRutas({ origen: origen || undefined, destino: destino || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reservar el cupo");
    } finally {
      setReservandoId(null);
    }
  }

  return (
    <div className="dashboard">

      <aside className="sidebar">

        <div className="sidebar-logo">
          🚗 UniRide
        </div>

        <div className="sidebar-menu">

          <button className="menu-item active">
            🏠 Inicio
          </button>

          <button className="menu-item" onClick={abrirMapa}>
            🔎 Buscar rutas
          </button>

          <button className="menu-item">
            📅 Mis viajes
          </button>

          <button className="menu-item">
            ⭐ Calificaciones
          </button>

          <button className="menu-item">
            👤 Mi perfil
          </button>

        </div>

        <button
          className="logout-button"
          onClick={cerrarSesion}
        >
          🚪 Cerrar sesión
        </button>

      </aside>

      <main className="dashboard-content">

        <header className="dashboard-header">

          <div>
            <h1>¡Hola, {primerNombre}! 👋</h1>
            <p>
              Encuentra tu próximo viaje.
            </p>
          </div>

          <div className="profile">
            <div className="profile-avatar">
              {inicial}
            </div>

            <div>
              <strong>{usuario.nombre}</strong>
              <span>Pasajero</span>
            </div>

          </div>

        </header>

        {error && <p className="error">{error}</p>}
        {mensajeExito && <p className="exito">{mensajeExito}</p>}

        <section className="search-card">

          <h2>¿A dónde quieres ir?</h2>

          <form className="search-fields" onSubmit={manejarBuscar}>

            <div className="input-group">
              <label>Origen</label>
              <input
                type="text"
                placeholder="¿Desde dónde?"
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Destino</label>
              <input
                type="text"
                placeholder="¿A dónde?"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary search-button">
              🔎 Buscar
            </button>

          </form>

        </section>

        <section>

          <div className="section-title">
            <h2>Rutas disponibles</h2>
          </div>

          {cargando ? (
            <p>Buscando rutas...</p>
          ) : rutas.length === 0 ? (
            <p>No hay rutas disponibles con esos filtros por ahora.</p>
          ) : (
            <div className="routes-grid">
              {rutas.map((ruta) => (
                <div className="route-card" key={ruta.id_ruta}>

                  <div className="route-top">
                    <span className="route-time">
                      {ruta.hora_salida.slice(0, 5)}
                    </span>

                    <span className="available">
                      {ruta.cupos_disponibles} cupo{ruta.cupos_disponibles !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <h3>
                    {ruta.origen} → {ruta.destino}
                  </h3>

                  <p>
                    📅 {ruta.fecha} · ${Number(ruta.aporte_sugerido).toLocaleString("es-CO")}
                  </p>

                  {ruta.nombre_conductor && (
                    <div className="route-driver">
                      <div className="small-avatar">
                        {ruta.nombre_conductor.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <strong>{ruta.nombre_conductor}</strong>
                        <span>⭐ {ruta.calificacion_conductor ?? 0}</span>
                      </div>
                    </div>
                  )}

                  {ruta.ruta_segura && <span className="available">🛡️ Ruta segura</span>}

                  <button
                    className="btn-primary full-button"
                    disabled={reservandoId === ruta.id_ruta}
                    onClick={() => manejarReservar(ruta.id_ruta)}
                  >
                    {reservandoId === ruta.id_ruta ? "Reservando..." : "Reservar cupo"}
                  </button>

                </div>
              ))}
            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default DashboardPasajero;
