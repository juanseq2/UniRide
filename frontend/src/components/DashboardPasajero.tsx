import type { Usuario } from "../api"

interface DashboardPasajeroProps {
  usuario: Usuario;
  cerrarSesion: () => void;
}

function DashboardPasajero({ usuario, cerrarSesion }: DashboardPasajeroProps) {
  const primerNombre = usuario.nombre.split(" ")[0];
  const inicial = usuario.nombre.charAt(0).toUpperCase();

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

          <button className="menu-item">
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

        <section className="search-card">

          <h2>¿A dónde quieres ir?</h2>

          <div className="search-fields">

            <div className="input-group">
              <label>Origen</label>
              <input
                type="text"
                placeholder="¿Desde dónde?"
              />
            </div>

            <div className="input-group">
              <label>Destino</label>
              <input
                type="text"
                placeholder="¿A dónde?"
              />
            </div>

            <button className="btn-primary search-button">
              🔎 Buscar
            </button>

          </div>

        </section>

        {/* Nota: estas rutas todavía son datos de ejemplo.
            Cuando conectemos "buscar rutas" al backend (GET /rutas/),
            esto se reemplaza por los resultados reales. */}

        <section>

          <div className="section-title">
            <h2>Rutas disponibles</h2>
            <button className="link-button">
              Ver todas
            </button>
          </div>

          <div className="routes-grid">

            <div className="route-card">

              <div className="route-top">
                <span className="route-time">
                  8:00 AM
                </span>

                <span className="available">
                  3 cupos
                </span>
              </div>

              <h3>
                Bogotá → Universidad
              </h3>

              <p>
                📍 Portal Norte → UNIMINUTO
              </p>

              <div className="route-driver">
                <div className="small-avatar">
                  C
                </div>

                <div>
                  <strong>Carlos Rodríguez</strong>
                  <span>⭐ 4.8</span>
                </div>
              </div>

              <button className="btn-primary full-button">
                Reservar cupo
              </button>

            </div>

            <div className="route-card">

              <div className="route-top">
                <span className="route-time">
                  9:30 AM
                </span>

                <span className="available">
                  2 cupos
                </span>
              </div>

              <h3>
                Suba → Universidad
              </h3>

              <p>
                📍 Suba → UNIMINUTO
              </p>

              <div className="route-driver">
                <div className="small-avatar">
                  A
                </div>

                <div>
                  <strong>Andrés Gómez</strong>
                  <span>⭐ 4.6</span>
                </div>
              </div>

              <button className="btn-primary full-button">
                Reservar cupo
              </button>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default DashboardPasajero;
