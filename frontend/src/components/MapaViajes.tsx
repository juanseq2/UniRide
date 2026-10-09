import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { buscarRutas } from "../api";
import type { Ruta, Usuario } from "../api";

interface MapaViajesProps {
  usuario: Usuario | null;
  volver: () => void;
  iniciarSesion: () => void;
  cerrarSesion: () => void;
}

function MapaViajes({ usuario, volver, iniciarSesion, cerrarSesion }: MapaViajesProps) {
  const mapaRef = useRef<L.Map | null>(null);
  const elementoMapaRef = useRef<HTMLDivElement | null>(null);
  const listaRef = useRef<HTMLElement | null>(null);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!elementoMapaRef.current) return;

    const mapa = L.map(elementoMapaRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView([4.6533, -74.0836], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);

    mapaRef.current = mapa;
    const invalidarTamaño = window.setTimeout(() => mapa.invalidateSize(), 100);

    return () => {
      window.clearTimeout(invalidarTamaño);
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    buscarRutas()
      .then((resultado) => {
        if (!cancelado) {
          setRutas(resultado);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los viajes.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  function formatearFecha(fecha: string) {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  }

  function formatearHora(hora: string) {
    return hora.slice(0, 5);
  }

  const nombreUsuario = usuario?.nombre.split(" ")[0];

  return (
    <main className="mapa-pagina">
      <header className="mapa-navbar">
        <button className="mapa-marca" onClick={volver} aria-label="Volver al inicio">
          <span className="mapa-marca-icono">◎</span>
          <span>UniRide</span>
        </button>

        <nav className="mapa-navegacion" aria-label="Navegación principal">
          <button onClick={volver}>Inicio</button>
          <button
            className="seleccionado"
            onClick={() => elementoMapaRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            Mapa
          </button>
          <button onClick={() => listaRef.current?.scrollIntoView({ behavior: "smooth" })}>
            Viajes
          </button>
        </nav>

        <div className="mapa-sesion">
          {usuario ? (
            <>
              <span>{nombreUsuario} · {usuario.rol}</span>
              <button className="mapa-sesion-boton" onClick={cerrarSesion}>Cerrar sesión</button>
            </>
          ) : (
            <button className="mapa-sesion-boton" onClick={iniciarSesion}>Iniciar sesión</button>
          )}
        </div>
      </header>

      <div className="mapa-contenido">
        <section className="mapa-lienzo" aria-label="Mapa de Bogotá">
          <div className="mapa-interactivo" ref={elementoMapaRef} />
          <div className="mapa-controles" aria-label="Controles del mapa">
            <button onClick={() => mapaRef.current?.setView([4.6533, -74.0836], 12)} aria-label="Centrar mapa">⌖</button>
            <button onClick={() => mapaRef.current?.zoomIn()} aria-label="Acercar">+</button>
            <button onClick={() => mapaRef.current?.zoomOut()} aria-label="Alejar">−</button>
          </div>
          <div className="mapa-leyenda">
            {rutaSeleccionada ? (
              <>
                <strong>{rutaSeleccionada.origen} → {rutaSeleccionada.destino}</strong>
                <span>El mapa muestra Bogotá; esta ruta aún no tiene coordenadas para trazarla.</span>
              </>
            ) : (
              <>
                <strong>Mapa de Bogotá</strong>
                <span>Selecciona un viaje para consultar sus detalles.</span>
              </>
            )}
          </div>
        </section>

        <aside className="mapa-panel">
          <section className="mapa-resumen">
            <div className="mapa-resumen-encabezado">
              <div className="mapa-avatar">{usuario ? usuario.nombre.charAt(0).toUpperCase() : "UR"}</div>
              <div>
                <span className="mapa-etiqueta">{usuario ? "Tu cuenta UniRide" : "Viajes de tu comunidad"}</span>
                <h1>{usuario ? `Hola, ${nombreUsuario}` : "Explora UniRide"}</h1>
              </div>
            </div>
            <div className="mapa-resumen-ruta">
              <span className="mapa-punto" />
              <div>
                <strong>{rutaSeleccionada ? "Viaje seleccionado" : "Viajes disponibles"}</strong>
                <span>{rutaSeleccionada ? `${formatearHora(rutaSeleccionada.hora_salida)} · ${formatearFecha(rutaSeleccionada.fecha)}` : `${rutas.length} publicados`}</span>
              </div>
            </div>
            <div className="mapa-progreso"><span /></div>
            <div className="mapa-ruta-resumen">
              {rutaSeleccionada ? `${rutaSeleccionada.origen} → ${rutaSeleccionada.destino}` : "Elige un viaje para ver sus detalles"}
            </div>
            <div className="mapa-metricas">
              <div>
                <strong>{rutaSeleccionada ? rutaSeleccionada.cupos_disponibles : rutas.length}</strong>
                <span>{rutaSeleccionada ? "Cupos" : "Viajes"}</span>
              </div>
              <div>
                <strong>{rutaSeleccionada ? `$${Number(rutaSeleccionada.aporte_sugerido).toLocaleString("es-CO")}` : "Bogotá"}</strong>
                <span>{rutaSeleccionada ? "Aporte sugerido" : "Zona del mapa"}</span>
              </div>
            </div>
          </section>

          <section className="mapa-lista" ref={listaRef}>
            <div className="mapa-lista-titulo">
              <h2>Viajes disponibles</h2>
              <span>{rutas.length}</span>
            </div>
            {cargando ? (
              <p className="mapa-mensaje">Cargando viajes...</p>
            ) : error ? (
              <div className="mapa-mensaje mapa-error">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Intentar de nuevo</button>
              </div>
            ) : rutas.length === 0 ? (
              <p className="mapa-mensaje">Todavía no hay viajes publicados.</p>
            ) : (
              <div className="mapa-rutas">
                {rutas.map((ruta) => (
                  <button
                    className={`mapa-viaje${rutaSeleccionada?.id_ruta === ruta.id_ruta ? " activo" : ""}`}
                    key={ruta.id_ruta}
                    onClick={() => setRutaSeleccionada(ruta)}
                  >
                    <span className="mapa-viaje-hora">{formatearHora(ruta.hora_salida)}</span>
                    <span className="mapa-viaje-contenido">
                      <strong>{ruta.origen} → {ruta.destino}</strong>
                      <span>{formatearFecha(ruta.fecha)} · {ruta.cupos_disponibles} cupos · ${Number(ruta.aporte_sugerido).toLocaleString("es-CO")}</span>
                    </span>
                    <span className="mapa-viaje-flecha" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

export default MapaViajes;
