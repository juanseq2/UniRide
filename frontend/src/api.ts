// Este archivo centraliza TODAS las llamadas al backend.

const API_URL = "http://localhost:8000";

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

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function manejarRespuesta(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    // FastAPI manda los errores en un campo llamado "detail"
    const detalle = Array.isArray(data.detail)
      ? data.detail.map((error: { msg?: string }) => error.msg).filter(Boolean).join(", ")
      : data.detail;
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

export async function completarPerfilConductor(
  token: string,
  datos: { licencia: string; soat: string },
) {
  const res = await fetch(`${API_URL}/conductores/perfil`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
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

export async function listarConductoresPendientes(token: string) {
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
