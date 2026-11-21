import { useEffect, useState } from "react";
import type { Usuario } from "../api"
import {
  listarUsuarios,
  listarConductoresPendientes,
  aprobarConductor,
  rechazarConductor,
} from "../api";

interface ConductorPendiente {
  id_usuario: number;
  nombre: string;
  correo_institucional: string;
  licencia: string;
  soat: string;
}

interface AdminDashboardProps {
  usuario: Usuario;
  token: string;
  cerrarSesion: () => void;
}

function AdminDashboard({ usuario, token, cerrarSesion }: AdminDashboardProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pendientes, setPendientes] = useState<ConductorPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inicial = usuario.nombre.charAt(0).toUpperCase();

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [listaUsuarios, listaPendientes] = await Promise.all([
        listarUsuarios(token),
        listarConductoresPendientes(token),
      ]);
      setUsuarios(listaUsuarios);
      setPendientes(listaPendientes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarAprobar(idUsuario: number) {
    try {
      await aprobarConductor(token, idUsuario);
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function manejarRechazar(idUsuario: number) {
    try {
      await rechazarConductor(token, idUsuario);
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="dashboard">

      <aside className="sidebar">

        <div className="sidebar-logo">
          🚗 UniRide
        </div>

        <div className="sidebar-menu">
          <button className="menu-item active">🛡️ Panel admin</button>
          <button className="menu-item">👥 Usuarios</button>
          <button className="menu-item">✅ Conductores</button>
        </div>

        <button className="logout-button" onClick={cerrarSesion}>
          🚪 Cerrar sesión
        </button>

      </aside>

      <main className="dashboard-content">

        <header className="dashboard-header">
          <div>
            <h1>Panel de administración 🛡️</h1>
            <p>Gestiona usuarios y aprueba conductores nuevos.</p>
          </div>

          <div className="profile">
            <div className="profile-avatar">{inicial}</div>
            <div>
              <strong>{usuario.nombre}</strong>
              <span>Administrador</span>
            </div>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>👥</span>
            <div>
              <p>Usuarios totales</p>
              <strong>{usuarios.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>🕓</span>
            <div>
              <p>Conductores pendientes</p>
              <strong>{pendientes.length}</strong>
            </div>
          </div>
        </section>

        <section className="create-route-section">
          <div>
            <h2>Conductores por aprobar</h2>
            <p>Revisa licencia y SOAT antes de aprobar.</p>
          </div>
        </section>

        {cargando ? (
          <p>Cargando...</p>
        ) : pendientes.length === 0 ? (
          <p>No hay conductores pendientes por el momento.</p>
        ) : (
          <div className="tabla-admin-contenedor">
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Licencia</th>
                  <th>SOAT</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((c) => (
                  <tr key={c.id_usuario}>
                    <td>{c.nombre}</td>
                    <td>{c.correo_institucional}</td>
                    <td>{c.licencia}</td>
                    <td>{c.soat}</td>
                    <td className="celda-acciones">
                      <button className="btn-primary btn-pequeno" onClick={() => manejarAprobar(c.id_usuario)}>
                        Aprobar
                      </button>
                      <button className="btn-outline btn-pequeno" onClick={() => manejarRechazar(c.id_usuario)}>
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="create-route-section">
          <div>
            <h2>Todos los usuarios</h2>
            <p>{usuarios.length} registrados en la plataforma.</p>
          </div>
        </section>

        <div className="tabla-admin-contenedor">
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre}</td>
                  <td>{u.correo_institucional}</td>
                  <td><span className={`etiqueta-rol etiqueta-${u.rol}`}>{u.rol}</span></td>
                  <td>{u.calificacion_promedio} ⭐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;
