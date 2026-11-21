// Este archivo centraliza TODAS las llamadas al backend.

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "");

export interface DatosRegistro {
  nombre: string;
  correo_institucional: string;
  telefono?: string;
  password: string;
  rol: "pasajero" | "conductor" | "admin";
  codigo_admin?: string;
}

export interface DatosLogin {
  correo_institucional: string;
  password: string;
}

export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo_institucional: string;
  rol: "pasajero" | "conductor" | "admin";
  calificacion_promedio: number;
}

export interface Ruta {
  id_ruta: number;
  id_conductor: number;
  origen: string;
  destino: string;
  origen_lat?: number | null;
  origen_lng?: number | null;
  destino_lat?: number | null;
  destino_lng?: number | null;
  fecha: string;
  hora_salida: string;
  cupos_disponibles: number;
  aporte_sugerido: number;
  ruta_segura: boolean;
  nombre_conductor?: string;
  calificacion_conductor?: number;
}

export interface Vehiculo {
  id_vehiculo: number;
  placa: string;
  modelo: string | null;
  capacidad: number;
}

export interface DatosRuta {
  id_vehiculo: number;
  origen: string;
  destino: string;
  origen_lat: number;
  origen_lng: number;
  destino_lat: number;
  destino_lng: number;
  fecha: string;
  hora_salida: string;
  cupos_disponibles: number;
  aporte_sugerido: number;
  ruta_segura: boolean;
}

export interface FiltrosBusqueda {
  origen?: string;
  destino?: string;
  fecha?: string;
  solo_seguras?: boolean;
}

export interface DatosReserva {
  id_ruta: number;
  cantidad_cupos: number;
}

export interface Reserva {
  id_reserva: number;
  id_ruta: number;
  id_pasajero: number;
  estado: "pendiente" | "confirmada" | "rechazada" | "cancelada";
  cantidad_cupos: number;
  fecha_reserva: string;
}

export interface PerfilConductor {
  id_usuario: number;
  documentos_aprobados: boolean;
}

export interface ConductorPendiente {
  id_usuario: number;
  nombre: string;
  correo_institucional: string;
}

export interface ReservaDetalle {
  id_reserva: number;
  id_ruta: number;
  estado: "pendiente" | "confirmada" | "rechazada" | "cancelada";
  cantidad_cupos: number;
  fecha_reserva: string;
  nombre_pasajero: string;
  origen: string;
  destino: string;
  fecha_viaje: string;
  hora_salida: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function manejarRespuesta(res: Response) {
  const texto = await res.text();
  let data: unknown = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    if (!res.ok) {
      throw new ApiError(
        texto?.trim() || "El servidor devolvió una respuesta no válida",
        res.status,
      );
    }
    throw new ApiError("El servidor devolvió una respuesta no válida", res.status);
  }
  if (!res.ok) {
    const contenido =
      data && typeof data === "object"
        ? data as { detail?: string | { msg?: string }[] }
        : null;
    const detalle = Array.isArray(contenido?.detail)
      ? contenido.detail.map((error) => error.msg).filter(Boolean).join(", ")
      : contenido?.detail;
    throw new ApiError(detalle || "Ocurrió un error inesperado", res.status);
  }
  return data;
}

export async function buscarRutas(filtros: FiltrosBusqueda = {}): Promise<Ruta[]> {
  const params = new URLSearchParams();
  if (filtros.origen) params.set("origen", filtros.origen);
  if (filtros.destino) params.set("destino", filtros.destino);
  if (filtros.fecha) params.set("fecha", filtros.fecha);
  if (filtros.solo_seguras) params.set("solo_seguras", "true");

  const query = params.toString();
  const res = await fetch(`${API_URL}/rutas/${query ? `?${query}` : ""}`);
  return manejarRespuesta(res);
}

export async function listarMisVehiculos(token: string): Promise<Vehiculo[]> {
  const res = await fetch(`${API_URL}/vehiculos/mios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function registrarVehiculo(
  token: string,
  datos: { placa: string; modelo: string; capacidad: number },
): Promise<Vehiculo> {
  const res = await fetch(`${API_URL}/vehiculos/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}

export async function publicarRuta(token: string, datos: DatosRuta): Promise<Ruta> {
  const res = await fetch(`${API_URL}/rutas/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}

// ---- Conductor: documentos (archivo, no texto) ----
export async function obtenerPerfilConductor(token: string): Promise<PerfilConductor> {
  const res = await fetch(`${API_URL}/conductores/perfil`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function completarPerfilConductor(
  token: string,
  archivos: { licencia: File; soat: File; tarjetaPropiedad: File },
): Promise<PerfilConductor> {
  const formData = new FormData();
  formData.append("licencia", archivos.licencia);
  formData.append("soat", archivos.soat);
  formData.append("tarjeta_propiedad", archivos.tarjetaPropiedad);

  const res = await fetch(`${API_URL}/conductores/perfil`, {
    method: "POST",
    // OJO: no pongas "Content-Type" aquí. El navegador lo arma solo con
    // el "boundary" correcto para multipart/form-data; si lo fijas a mano, se rompe.
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return manejarRespuesta(res);
}

// ---- Reservas ----
export async function reservarCupo(token: string, datos: DatosReserva): Promise<Reserva> {
  const res = await fetch(`${API_URL}/reservas/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}

export async function misReservas(token: string): Promise<Reserva[]> {
  const res = await fetch(`${API_URL}/reservas/mias`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function cancelarReserva(token: string, idReserva: number): Promise<Reserva> {
  const res = await fetch(`${API_URL}/reservas/${idReserva}/cancelar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function registrarUsuario(datos: DatosRegistro) {
  const res = await fetch(`${API_URL}/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}

export async function iniciarSesion(datos: DatosLogin) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}

export async function obtenerPerfil(token: string): Promise<Usuario> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

// ---- Admin ----
export async function listarUsuarios(token: string): Promise<Usuario[]> {
  const res = await fetch(`${API_URL}/admin/usuarios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function listarConductoresPendientes(token: string): Promise<ConductorPendiente[]> {
  const res = await fetch(`${API_URL}/admin/conductores/pendientes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function aprobarConductor(token: string, idUsuario: number) {
  const res = await fetch(`${API_URL}/admin/conductores/${idUsuario}/aprobar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function rechazarConductor(token: string, idUsuario: number) {
  const res = await fetch(`${API_URL}/admin/conductores/${idUsuario}/rechazar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

/** Descarga un documento protegido y devuelve una URL local para abrirlo/mostrarlo. */
export async function obtenerDocumentoConductor(
  token: string,
  idUsuario: number,
  tipo: "licencia" | "soat" | "tarjeta_propiedad",
): Promise<string> {
  const res = await fetch(`${API_URL}/admin/conductores/${idUsuario}/documento/${tipo}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError("No se pudo cargar el documento", res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function reservasRecibidas(token: string): Promise<ReservaDetalle[]> {
  const res = await fetch(`${API_URL}/reservas/recibidas`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function confirmarReserva(token: string, idReserva: number): Promise<Reserva> {
  const res = await fetch(`${API_URL}/reservas/${idReserva}/confirmar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

export async function rechazarReserva(token: string, idReserva: number): Promise<Reserva> {
  const res = await fetch(`${API_URL}/reservas/${idReserva}/rechazar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return manejarRespuesta(res);
}

