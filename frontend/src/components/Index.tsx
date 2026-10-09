interface IndexProps {
  irAlLogin: () => void;
  irAlRegistro: () => void;
  irAlMapa: () => void;
}

function Index({
  irAlLogin,
  irAlRegistro,
  irAlMapa,
}: IndexProps) {
  return (
    <div className="index-page">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">
          🚗 UniRide
        </div>

        <div className="navbar-buttons">

          <button
            onClick={irAlMapa}
            className="btn-secondary"
          >
            Mapa
          </button>

          <button
            onClick={irAlLogin}
            className="btn-secondary"
          >
            Iniciar sesión
          </button>

          <button
            onClick={irAlRegistro}
            className="btn-primary"
          >
            Registrarse
          </button>

        </div>

      </nav>

      {/* HERO */}

      <main className="hero">

        <div className="hero-text">

          <span className="badge">
            Movilidad universitaria
          </span>

          <h1>
            Muévete por la ciudad
            <br />
            con <span>UniRide</span>
          </h1>

          <p>
            Encuentra y comparte trayectos con otros
            estudiantes de tu comunidad universitaria
            de una forma segura, sencilla y económica.
          </p>

          <div className="hero-buttons">

            <button
              onClick={irAlRegistro}
              className="btn-primary btn-large"
            >
              Comenzar ahora
            </button>

            <button
              onClick={irAlLogin}
              className="btn-outline btn-large"
            >
              Ya tengo una cuenta
            </button>

          </div>

        </div>

        {/* TARJETA */}

        <div className="hero-card">

          <div className="car-icon">
            🚗
          </div>

          <h2>
            Tu movilidad, más fácil
          </h2>

          <div className="feature">

            <span>📍</span>

            <div>

              <strong>
                Encuentra rutas
              </strong>

              <p>
                Busca trayectos disponibles.
              </p>

            </div>

          </div>

          <div className="feature">

            <span>👥</span>

            <div>

              <strong>
                Comparte viajes
              </strong>

              <p>
                Viaja con otros miembros de la comunidad.
              </p>

            </div>

          </div>

          <div className="feature">

            <span>⭐</span>

            <div>

              <strong>
                Viaja con confianza
              </strong>

              <p>
                Consulta las calificaciones de los usuarios.
              </p>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Index;