import type { Usuario } from "../api"

interface DashboardConductorProps {
  usuario: Usuario;
  cerrarSesion: () => void;
}

function DashboardConductor({ usuario, cerrarSesion }: DashboardConductorProps) {
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
            🛣️ Mis rutas
          </button>

          <button className="menu-item">
            👥 Pasajeros
          </button>

          <button className="menu-item">
            🚗 Mi vehículo
          </button>

          <button className="menu-item">
            📊 Historial
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
              Este es el resumen de tus viajes.
            </p>
          </div>

          <div className="profile">

            <div className="profile-avatar">
              {inicial}
            </div>

            <div>
              <strong>{usuario.nombre}</strong>
              <span>Conductor ⭐ {usuario.calificacion_promedio}</span>
            </div>

          </div>

        </header>

        {/* Nota: las tarjetas de abajo todavía son datos de ejemplo.
            Cuando construyamos "mis rutas" conectado al backend, esto
            se reemplaza por las rutas reales que publicaste. */}

        <section className="stats-grid">

          <div className="stat-card">
            <span>🚗</span>
            <div>
              <p>Viajes hoy</p>
              <strong>3</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>👥</span>
            <div>
              <p>Pasajeros</p>
              <strong>8</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>⭐</span>
            <div>
              <p>Calificación</p>
              <strong>{usuario.calificacion_promedio}</strong>
            </div>
          </div>

        </section>

        <section className="create-route-section">

          <div>
            <h2>Mis rutas</h2>
            <p>
              Administra los trayectos que tienes publicados.
            </p>
          </div>

          <button className="btn-primary">
            + Crear nueva ruta
          </button>

        </section>

        <section className="routes-grid">

          <div className="route-card">

            <div className="route-top">

              <span className="route-time">
                5:30 PM
              </span>

              <span className="available">
                Activa
              </span>

            </div>

            <h3>
              Universidad → Bogotá
            </h3>

            <p>
              📍 UNIMINUTO → Portal Norte
            </p>

            <div className="driver-info">
              👥 5 pasajeros
            </div>

            <button className="btn-outline full-button">
              Gestionar ruta
            </button>

          </div>

          <div className="route-card">

            <div className="route-top">

              <span className="route-time">
                7:00 PM
              </span>

              <span className="available">
                Activa
              </span>

            </div>

            <h3>
              Universidad → Suba
            </h3>

            <p>
              📍 UNIMINUTO → Suba
            </p>

            <div className="driver-info">
              👥 2 pasajeros
            </div>

            <button className="btn-outline full-button">
              Gestionar ruta
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default DashboardConductor;
