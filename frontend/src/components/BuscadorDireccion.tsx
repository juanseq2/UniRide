import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Sugerencia {
  display_name: string;
  lat: string;
  lon: string;
}

interface BuscadorDireccionProps {
  etiqueta: string;
  valor: string;
  onSeleccionar: (direccion: string, lat: number, lng: number) => void;
  placeholder?: string;
}

/**
 * Campo de dirección con autocompletado (usa Nominatim, el buscador
 * gratuito de OpenStreetMap) + botón para elegir el punto directamente
 * en un mapa. Al seleccionar, siempre entrega texto + lat/lng juntos.
 */
function BuscadorDireccion({ etiqueta, valor, onSeleccionar, placeholder }: BuscadorDireccionProps) {
  const [texto, setTexto] = useState(valor);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const temporizadorRef = useRef<number | null>(null);

  useEffect(() => {
    setTexto(valor);
  }, [valor]);

  function manejarCambio(nuevoTexto: string) {
    setTexto(nuevoTexto);
    setMostrarSugerencias(true);

    if (temporizadorRef.current) window.clearTimeout(temporizadorRef.current);

    if (nuevoTexto.trim().length < 3) {
      setSugerencias([]);
      return;
    }

    // Esperamos 450ms sin que el usuario escriba más, para no saturar a Nominatim
    temporizadorRef.current = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const params = new URLSearchParams({
          format: "json",
          q: nuevoTexto,
          countrycodes: "co",
          limit: "5",
          "accept-language": "es",
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        const datos = (await res.json()) as Sugerencia[];
        setSugerencias(datos);
      } catch {
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 450);
  }

  function elegirSugerencia(sugerencia: Sugerencia) {
    setTexto(sugerencia.display_name);
    setSugerencias([]);
    setMostrarSugerencias(false);
    onSeleccionar(sugerencia.display_name, parseFloat(sugerencia.lat), parseFloat(sugerencia.lon));
  }

  function elegirEnElMapa(direccion: string, lat: number, lng: number) {
    setTexto(direccion);
    setMostrarMapa(false);
    onSeleccionar(direccion, lat, lng);
  }

  return (
    <div className="buscador-direccion">
      <label>{etiqueta}</label>
      <div className="buscador-direccion-fila">
        <input
          value={texto}
          placeholder={placeholder}
          onChange={(e) => manejarCambio(e.target.value)}
          onFocus={() => setMostrarSugerencias(true)}
          onBlur={() => window.setTimeout(() => setMostrarSugerencias(false), 150)}
          autoComplete="off"
          required
        />
        <button type="button" className="btn-outline btn-pequeno" onClick={() => setMostrarMapa(true)}>
          📍 Mapa
        </button>
      </div>

      {mostrarSugerencias && (buscando || sugerencias.length > 0) && (
        <ul className="buscador-direccion-sugerencias">
          {buscando && <li className="buscador-direccion-cargando">Buscando...</li>}
          {sugerencias.map((sugerencia, indice) => (
            // onMouseDown (no onClick) para que dispare ANTES del onBlur del input
            <li key={indice} onMouseDown={() => elegirSugerencia(sugerencia)}>
              {sugerencia.display_name}
            </li>
          ))}
        </ul>
      )}

      {mostrarMapa && <SelectorMapa onConfirmar={elegirEnElMapa} onCancelar={() => setMostrarMapa(false)} />}
    </div>
  );
}

function SelectorMapa({
  onConfirmar,
  onCancelar,
}: {
  onConfirmar: (direccion: string, lat: number, lng: number) => void;
  onCancelar: () => void;
}) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const [puntoElegido, setPuntoElegido] = useState<{ lat: number; lng: number } | null>(null);
  const [direccionTexto, setDireccionTexto] = useState("Toca el mapa para elegir el punto");
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);

  useEffect(() => {
    if (!contenedorRef.current) return;

    const mapa = L.map(contenedorRef.current).setView([4.6533, -74.0836], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);

    mapa.on("click", async (evento: L.LeafletMouseEvent) => {
      const { lat, lng } = evento.latlng;
      setPuntoElegido({ lat, lng });

      if (marcadorRef.current) marcadorRef.current.remove();
      marcadorRef.current = L.marker([lat, lng]).addTo(mapa);

      setBuscandoDireccion(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
        );
        const datos = await res.json();
        setDireccionTexto(datos.display_name || `Ubicación (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      } catch {
        setDireccionTexto(`Ubicación (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      } finally {
        setBuscandoDireccion(false);
      }
    });

    mapaRef.current = mapa;
    window.setTimeout(() => mapa.invalidateSize(), 100);

    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  return (
    <div
      className="selector-mapa-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="selector-mapa">
        <div className="selector-mapa-header">
          <strong>Elige un punto en el mapa</strong>
          <button type="button" onClick={onCancelar} aria-label="Cerrar">×</button>
        </div>

        <div ref={contenedorRef} className="selector-mapa-lienzo" />

        <div className="selector-mapa-footer">
          <span>{buscandoDireccion ? "Buscando dirección..." : direccionTexto}</span>
          <button
            type="button"
            className="btn-primary btn-pequeno"
            disabled={!puntoElegido}
            onClick={() => puntoElegido && onConfirmar(direccionTexto, puntoElegido.lat, puntoElegido.lng)}
          >
            Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuscadorDireccion;
