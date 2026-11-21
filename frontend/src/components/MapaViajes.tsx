
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { buscarRutas, reservarCupo, ApiError } from "../api";
import type { Ruta, Usuario } from "../api";
import { acortarDireccion } from "../utils"; 

interface MapaViajesProps {
  usuario: Usuario | null;
  token: string | null;
  volver: () => void;
  iniciarSesion: () => void;
  cerrarSesion: () => void;
}

function MapaViajes({
  usuario,
  token,
  volver,
  iniciarSesion,
  cerrarSesion,
}: MapaViajesProps) {
  const mapaRef = useRef<L.Map | null>(null);
  const elementoMapaRef = useRef<HTMLDivElement | null>(null);
  const listaRef = useRef<HTMLElement | null>(null);
  const capaRutaRef = useRef<L.LayerGroup | null>(null);

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [rutaSeleccionada, setRutaSeleccionada] =
    useState<Ruta | null>(null);

  const [cargando, setCargando] = useState(true);
  const [trazandoRuta, setTrazandoRuta] = useState(false);
  const [reservandoId, setReservandoId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [mensajeReserva, setMensajeReserva] = useState<string | null>(null);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);

  // --------------------------------------------------
  // INICIALIZAR MAPA
  // --------------------------------------------------

  useEffect(() => {
    if (!elementoMapaRef.current) return;

    const mapa = L.map(elementoMapaRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView([4.6533, -74.0836], 12);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(mapa);

    mapaRef.current = mapa;

    const invalidarTamaño = window.setTimeout(
      () => mapa.invalidateSize(),
      100
    );

    return () => {
      window.clearTimeout(invalidarTamaño);
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // --------------------------------------------------
  // CARGAR VIAJES
  // --------------------------------------------------

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
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los viajes."
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // --------------------------------------------------
  // DIBUJAR RUTA SELECCIONADA
  // --------------------------------------------------

  useEffect(() => {
    const mapa = mapaRef.current;

    if (!mapa) return;

    if (capaRutaRef.current) {
      capaRutaRef.current.remove();
      capaRutaRef.current = null;
    }

    const tieneCoordenadas =
      rutaSeleccionada?.origen_lat != null &&
      rutaSeleccionada?.origen_lng != null &&
      rutaSeleccionada?.destino_lat != null &&
      rutaSeleccionada?.destino_lng != null;

    if (!rutaSeleccionada || !tieneCoordenadas) {
      return;
    }

    const origenLat = rutaSeleccionada.origen_lat as number;
    const origenLng = rutaSeleccionada.origen_lng as number;
    const destinoLat = rutaSeleccionada.destino_lat as number;
    const destinoLng = rutaSeleccionada.destino_lng as number;

    let cancelado = false;

    setTrazandoRuta(true);

    const iconoOrigen = L.divIcon({
      className: "marcador-punto marcador-origen",
      html: "●",
      iconSize: [16, 16],
    });

    const iconoDestino = L.divIcon({
      className: "marcador-punto marcador-destino",
      html: "●",
      iconSize: [16, 16],
    });

    function dibujarSoloMarcadores() {
      if (cancelado) return;
      if (!mapa) return;

      const capa = L.layerGroup();

      L.marker([origenLat, origenLng], {
        icon: iconoOrigen,
      }).addTo(capa);

      L.marker([destinoLat, destinoLng], {
        icon: iconoDestino,
      }).addTo(capa);

      capa.addTo(mapa);
      capaRutaRef.current = capa;

      mapa.fitBounds(
        L.latLngBounds(
          [origenLat, origenLng],
          [destinoLat, destinoLng]
        ),
        { padding: [60, 60] }
      );
    }

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("No se pudo calcular el trayecto");
        }

        return res.json();
      })
      .then((datos) => {
        if (cancelado) return;
        if (!mapa) return;

        const coordenadas = datos.routes?.[0]?.geometry
          ?.coordinates as [number, number][] | undefined;

        const capa = L.layerGroup();

        L.marker([origenLat, origenLng], {
          icon: iconoOrigen,
        }).addTo(capa);

        L.marker([destinoLat, destinoLng], {
          icon: iconoDestino,
        }).addTo(capa);

        if (coordenadas && coordenadas.length > 0) {
          const puntos = coordenadas.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );

          const linea = L.polyline(puntos, {
            color: "#2563eb",
            weight: 5,
            opacity: 0.85,
          });

          linea.addTo(capa);
          capa.addTo(mapa);
          capaRutaRef.current = capa;

          mapa.fitBounds(linea.getBounds(), {
            padding: [60, 60],
          });
        } else {
          capa.addTo(mapa);
          capaRutaRef.current = capa;

          mapa.fitBounds(
            L.latLngBounds(
              [origenLat, origenLng],
              [destinoLat, destinoLng]
            ),
            { padding: [60, 60] }
          );
        }
      })
      .catch(() => {
        dibujarSoloMarcadores();
      })
      .finally(() => {
        if (!cancelado) setTrazandoRuta(false);
      });

    return () => {
      cancelado = true;
    };
  }, [rutaSeleccionada]);

  // --------------------------------------------------
  // FORMATEAR FECHA Y HORA
  // --------------------------------------------------

  function formatearFecha(fecha: string) {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString(
      "es-CO",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatearHora(hora: string) {
    return hora.slice(0, 5);
  }

  function formatearDinero(valor: number | string) {
    return `$${Number(valor).toLocaleString("es-CO")}`;
  }

  // --------------------------------------------------
  // RESERVAR CUPO DESDE EL MAPA
  // --------------------------------------------------

  async function manejarReservar() {
    if (!rutaSeleccionada) return;

    // Si no hay sesión, dirigimos al usuario al login.
    if (!usuario || !token) {
      iniciarSesion();
      return;
    }

    if (rutaSeleccionada.cupos_disponibles <= 0) {
      setErrorReserva("Esta ruta ya no tiene cupos disponibles.");
      return;
    }

    const idRuta = rutaSeleccionada.id_ruta;

    setReservandoId(idRuta);
    setErrorReserva(null);
    setMensajeReserva(null);

    try {
      await reservarCupo(token, {
        id_ruta: idRuta,
        cantidad_cupos: 1,
      });

      setMensajeReserva(
        "¡Cupo reservado! Tu solicitud queda pendiente de confirmación del conductor."
      );

      // Actualizamos los viajes después de reservar.
      try {
        const rutasActualizadas = await buscarRutas();

        setRutas(rutasActualizadas);

        const rutaActualizada = rutasActualizadas.find(
          (ruta) => ruta.id_ruta === idRuta
        );

        if (rutaActualizada) {
          setRutaSeleccionada(rutaActualizada);
        } else {
          // Si dejó de aparecer entre los viajes disponibles,
          // conservamos su información y actualizamos los cupos.
          setRutaSeleccionada((actual) =>
            actual && actual.id_ruta === idRuta
              ? { ...actual, cupos_disponibles: 0 }
              : actual
          );
        }
      } catch {
        // La reserva ya fue exitosa; este error solo afecta
        // la actualización visual de la lista.
        setErrorReserva(
          "La reserva se realizó, pero no se pudo actualizar la lista. Recarga los viajes para ver los cupos actuales."
        );
      }
    } catch (err: unknown) {
      setErrorReserva(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo reservar el cupo."
      );
    } finally {
      setReservandoId(null);
    }
  }

  // --------------------------------------------------
  // DATOS DE LA RUTA SELECCIONADA
  // --------------------------------------------------

  const nombreUsuario = usuario?.nombre.split(" ")[0];

  const tieneCoordenadas =
    rutaSeleccionada?.origen_lat != null &&
    rutaSeleccionada?.origen_lng != null &&
    rutaSeleccionada?.destino_lat != null &&
    rutaSeleccionada?.destino_lng != null;

  const urlGoogleMaps = tieneCoordenadas
    ? `https://www.google.com/maps/dir/?api=1&origin=${rutaSeleccionada!.origen_lat},${rutaSeleccionada!.origen_lng}&destination=${rutaSeleccionada!.destino_lat},${rutaSeleccionada!.destino_lng}&travelmode=driving`
    : null;

  const urlWaze = tieneCoordenadas
    ? `https://waze.com/ul?ll=${rutaSeleccionada!.destino_lat},${rutaSeleccionada!.destino_lng}&navigate=yes`
    : null;

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

const esDashboardPasajero = usuario?.rol === "pasajero"; const paginaDelMapa = ( 
    
    <main className="mapa-pagina">
      <header className="mapa-navbar">
        <button
          className="mapa-marca"
          onClick={volver}
          aria-label="Volver al inicio"
        >
          <span className="mapa-marca-icono">◎</span>
          <span>UniRide</span>
        </button>

        <nav
          className="mapa-navegacion"
          aria-label="Navegación principal"
        >
  

          <button
            className="seleccionado"
            onClick={() =>
              elementoMapaRef.current?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            Inicio
          </button>

          <button
            onClick={() =>
              listaRef.current?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            Viajes
          </button>
        </nav>

        <div className="mapa-sesion">
          {usuario ? (
            <>
              <span>
                {nombreUsuario} · {usuario.rol}
              </span>

              <button
                className="mapa-sesion-boton"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              className="mapa-sesion-boton"
              onClick={iniciarSesion}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <div className="mapa-contenido">
        {/* MAPA */}

        <section
          className="mapa-lienzo"
          aria-label="Mapa de Bogotá"
        >
          <div
            className="mapa-interactivo"
            ref={elementoMapaRef}
          />

          <div
            className="mapa-controles"
            aria-label="Controles del mapa"
          >
            <button
              onClick={() =>
                mapaRef.current?.setView([4.6533, -74.0836], 12)
              }
              aria-label="Centrar mapa"
            >
              ⌖
            </button>

            <button
              onClick={() => mapaRef.current?.zoomIn()}
              aria-label="Acercar"
            >
              +
            </button>

            <button
              onClick={() => mapaRef.current?.zoomOut()}
              aria-label="Alejar"
            >
              −
            </button>
          </div>

          <div className="mapa-leyenda">
            {rutaSeleccionada ? (
              <>
                <strong> {acortarDireccion(rutaSeleccionada.origen)} →{" "} {acortarDireccion(rutaSeleccionada.destino)} </strong>

                {tieneCoordenadas ? (
                  <div className="mapa-navegar-botones">
                    {trazandoRuta && (
                      <span className="mapa-trazando">
                        Trazando ruta...
                      </span>
                    )}

                    <a
                      href={urlGoogleMaps!}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline btn-pequeno"
                    >
                      🧭 Google Maps
                    </a>

                    <a
                      href={urlWaze!}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline btn-pequeno"
                    >
                      🧭 Waze
                    </a>
                  </div>
                ) : (
                  <span>
                    Esta ruta no tiene coordenadas registradas.
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>Mapa de Bogotá</strong>
                <span>
                  Selecciona un viaje para consultar sus detalles.
                </span>
              </>
            )}
          </div>
        </section>

        {/* PANEL LATERAL */}

        <aside className="mapa-panel">
          <section className="mapa-resumen">
            <div className="mapa-resumen-encabezado">
              <div className="mapa-avatar">
                {usuario
                  ? usuario.nombre.charAt(0).toUpperCase()
                  : "UR"}
              </div>

              <div>
                <span className="mapa-etiqueta">
                  {usuario
                    ? "Tu cuenta UniRide"
                    : "Viajes de tu comunidad"}
                </span>

                <h1>
                  {usuario
                    ? `Hola, ${nombreUsuario}`
                    : "Explora UniRide"}
                </h1>
              </div>
            </div>

            <div className="mapa-resumen-ruta">
              <span className="mapa-punto" />

              <div>
                <strong>
                  {rutaSeleccionada
                    ? "Viaje seleccionado"
                    : "Selecciona un viaje para ver sus detalles."}
                </strong>

                <span>
                  {rutaSeleccionada
                    ? `${formatearHora(
                        rutaSeleccionada.hora_salida
                      )} · ${formatearFecha(
                        rutaSeleccionada.fecha
                      )}`
                    : `${rutas.length} publicados`}
                </span>
              </div>
            </div>
              
          </section>



          {rutaSeleccionada && (
            <section className="mapa-detalle-ruta">
              <div className="mapa-detalle-encabezado">
                <div>
                  <span className="mapa-etiqueta">
                    DETALLES DEL VIAJE
                  </span>
                  <h5><strong> {acortarDireccion(rutaSeleccionada.origen)} ➡️{" "} {acortarDireccion(rutaSeleccionada.destino)} </strong></h5>
                </div>

                <button
                  type="button"
                  className="mapa-cerrar-detalle"
                  onClick={() => {
                    setRutaSeleccionada(null);
                    setMensajeReserva(null);
                    setErrorReserva(null);
                  }}
                  aria-label="Cerrar detalles del viaje"
                >
                  ×
                </button>
              </div>

              <div className="mapa-datos-viaje">
                <div>
                  <span>📅 Fecha</span>
                  <strong>
                    {formatearFecha(rutaSeleccionada.fecha)}
                  </strong>
                </div>

                <div>
                  <span>🕒 Hora de salida</span>
                  <strong>
                    {formatearHora(rutaSeleccionada.hora_salida)}
                  </strong>
                </div>

                <div>
                  <span>💺 Cupos disponibles</span>
                  <strong>
                    {rutaSeleccionada.cupos_disponibles}
                  </strong>
                </div>

                <div>
                  <span>💰 Aporte sugerido</span>
                  <strong>
                    {formatearDinero(
                      rutaSeleccionada.aporte_sugerido
                    )}
                  </strong>
                </div>
              </div>

              <div className="mapa-conductor">
                <div className="mapa-conductor-avatar">
                  {rutaSeleccionada.nombre_conductor
                    ? rutaSeleccionada.nombre_conductor
                        .charAt(0)
                        .toUpperCase()
                    : "?"}
                </div>

                <div className="mapa-conductor-datos">
                  <span>Tu conductor</span>

                  <strong>
                    {rutaSeleccionada.nombre_conductor ||
                      "Información no disponible"}
                  </strong>

                  <span className="mapa-calificacion">
                    ⭐{" "}
                    {rutaSeleccionada.calificacion_conductor ??
                      0}{" "}
                    <span>Calificación</span>
                  </span>
                </div>
              </div>

              {rutaSeleccionada.ruta_segura && (
                <div className="mapa-ruta-segura">
                  🛡️ Ruta segura
                </div>
              )}

              {mensajeReserva && (
                <p className="mapa-reserva-exito" role="status">
                  ✓ {mensajeReserva}
                </p>
              )}

              {errorReserva && (
                <p className="mapa-reserva-error" role="alert">
                  {errorReserva}
                </p>
              )}

              <button
                type="button"
                className="mapa-reservar-boton"
                onClick={manejarReservar}
                disabled={
                  reservandoId === rutaSeleccionada.id_ruta ||
                  rutaSeleccionada.cupos_disponibles <= 0
                }
              >
                {reservandoId === rutaSeleccionada.id_ruta
                  ? "Reservando cupo..."
                  : rutaSeleccionada.cupos_disponibles <= 0
                    ? "Sin cupos disponibles"
                    : !usuario
                      ? "Inicia sesión para reservar"
                      : "Reservar cupo"}
              </button>

              <p className="mapa-nota-reserva">
                La reserva queda sujeta a la confirmación del conductor.
              </p>
            </section>
          )}

          {/* LISTA DE VIAJES */}

          <section className="mapa-lista" ref={listaRef}>
            <div className="mapa-lista-titulo">
              <h2>Viajes disponibles</h2>
              <span>{rutas.length}</span>
            </div>

            {cargando ? (
              <p className="mapa-mensaje">
                Cargando viajes...
              </p>
            ) : error ? (
              <div className="mapa-mensaje mapa-error">
                <p>{error}</p>

                <button
                  onClick={() => window.location.reload()}
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : rutas.length === 0 ? (
              <p className="mapa-mensaje">
                Todavía no hay viajes publicados.
              </p>
            ) : (
              <div className="mapa-rutas">
                {rutas.map((ruta) => (
                  <button
                    type="button"
                    className={`mapa-viaje${
                      rutaSeleccionada?.id_ruta === ruta.id_ruta
                        ? " activo"
                        : ""
                    }`}
                    key={ruta.id_ruta}
                    onClick={() => {
                      setRutaSeleccionada(ruta);
                      setMensajeReserva(null);
                      setErrorReserva(null);
                    }}
                  >
                    <span className="mapa-viaje-hora">
                      {formatearHora(ruta.hora_salida)}
                    </span>

                    <span className="mapa-viaje-contenido">
                      <strong> {acortarDireccion(ruta.origen)} → {acortarDireccion(ruta.destino)} </strong>

                      <span>
                        {formatearFecha(ruta.fecha)} ·{" "}
                        {ruta.cupos_disponibles} cupos ·{" "}
                        {formatearDinero(ruta.aporte_sugerido)}
                      </span>
                    </span>

                    <span
                      className="mapa-viaje-flecha"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main> ); if (esDashboardPasajero) { return ( <div className="dashboard"> <aside className="sidebar"> <div className="sidebar-logo">🚗 UniRide</div> <div className="sidebar-menu"> <button className="menu-item active">🏠 Inicio</button> <button className="menu-item" onClick={() => listaRef.current?.scrollIntoView({ behavior: "smooth" })} > 🔎 Buscar rutas </button> <button className="menu-item">📅 Mis viajes</button> <button className="menu-item">⭐ Calificaciones</button> <button className="menu-item">👤 Mi perfil</button> </div> <button className="logout-button" onClick={cerrarSesion}> 🚪 Cerrar sesión </button> </aside> {paginaDelMapa} </div> ); } return paginaDelMapa; } export default MapaViajes;