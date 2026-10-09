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

export async function buscarRutas(): Promise<Ruta[]> {
  const res = await fetch(`${API_URL}/rutas/`);
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
