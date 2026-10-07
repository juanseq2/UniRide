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

async function manejarRespuesta(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    // FastAPI manda los errores en un campo llamado "detail"
    throw new Error(data.detail || "Ocurrió un error inesperado");
  }
  return data;
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
