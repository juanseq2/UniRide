/**
 * Nominatim devuelve direcciones muy largas, por ejemplo:
 * "Uniminuto, Carrera 87A, Cerezos, UPZs de Bogotá, Localidad Engativá,
 *  Bogotá ciudad, Bogotá, Distrito Capital, RAP (Especial) Central, 111021, Colombia"
 *
 * Esta función se queda solo con las primeras partes (las más específicas,
 * Nominatim siempre las pone primero) y recorta el resto. Úsala en
 * cualquier lugar donde muestres origen/destino en una tarjeta o lista.
 */
export function acortarDireccion(direccion: string, partes = 2, maxCaracteres = 42): string {
  const segmentos = direccion
    .split(",")
    .map((segmento) => segmento.trim())
    .filter(Boolean);

  let resultado = segmentos.slice(0, partes).join(", ");

  if (resultado.length > maxCaracteres) {
    resultado = `${resultado.slice(0, maxCaracteres - 1)}…`;
  }

  return resultado || direccion;
}
