import { useState, useEffect, FormEvent } from "react";
import "./App.css";
import { registrarUsuario, iniciarSesion, obtenerPerfil} from "./api";
import type { Usuario } from "./api"
import Index from "./components/Index";
import DashboardConductor from "./components/DashboardConductor";
import DashboardPasajero from "./components/DashboardPasajero";
import AdminDashboard from "./components/AdminDashboard";

type Vista = "index" | "formulario" | "dashboard";

function App() {
  const [vista, setVista] = useState<Vista>("index");
  const [formulario, setFormulario] = useState<"login" | "registro">("login");
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Campos de los formularios
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"pasajero" | "conductor" | "admin">("pasajero");
  const [codigoAdmin, setCodigoAdmin] = useState("");

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Al cargar la app, si hay un token guardado, intenta recuperar la sesión
  // (para que recargar la página no mande siempre al inicio)
  useEffect(() => {
    const tokenGuardado = localStorage.getItem("token");
    if (!tokenGuardado) {
      setCargandoInicial(false);
      return;
    }
    obtenerPerfil(tokenGuardado)
      .then((perfil) => {
        setToken(tokenGuardado);
        setUsuario(perfil);
        setVista("dashboard");
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setCargandoInicial(false));
  }, []);

  async function manejarRegistro(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const nuevoUsuario = await registrarUsuario({
        nombre,
        correo_institucional: correo,
        telefono: telefono || undefined,
        password,
        rol,
        codigo_admin: rol === "admin" ? codigoAdmin : undefined,
      });
      setMensaje(`¡Cuenta creada para ${nuevoUsuario.nombre}! Ahora inicia sesión.`);
      setFormulario("login");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function manejarLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const resultado = await iniciarSesion({ correo_institucional: correo, password });
      localStorage.setItem("token", resultado.access_token);
      setToken(resultado.access_token);

      const perfil = await obtenerPerfil(resultado.access_token);
      setUsuario(perfil);
      setVista("dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("token");
    setToken(null);
    setUsuario(null);
    setCorreo("");
    setPassword("");
    setVista("index");
    setFormulario("login");
  }

  if (cargandoInicial) {
    return <div className="cargando-pantalla">Cargando UniRide...</div>;
  }

  // --- Dashboard según el rol ---
  if (vista === "dashboard" && usuario && token) {
    if (usuario.rol === "admin") {
      return <AdminDashboard usuario={usuario} token={token} cerrarSesion={cerrarSesion} />;
    }
    if (usuario.rol === "conductor") {
      return <DashboardConductor usuario={usuario} cerrarSesion={cerrarSesion} />;
    }
    return <DashboardPasajero usuario={usuario} cerrarSesion={cerrarSesion} />;
  }

  // --- Página de inicio (landing) ---
  if (vista === "index") {
    return (
      <Index
        irAlLogin={() => {
          setFormulario("login");
          setError(null);
          setMensaje(null);
          setVista("formulario");
        }}
        irAlRegistro={() => {
          setFormulario("registro");
          setError(null);
          setMensaje(null);
          setVista("formulario");
        }}
      />
    );
  }

  // --- Formularios de login / registro ---
  return (
    <div className="contenedor">
      <button className="volver-index" onClick={() => setVista("index")}>
        ← Volver al inicio
      </button>

      <h1>UniRide 🚗</h1>
      <p className="subtitulo">Movilidad universitaria más segura y compartida</p>

      <div className="tabs">
        <button
          className={formulario === "login" ? "tab activo" : "tab"}
          onClick={() => { setFormulario("login"); setError(null); setMensaje(null); }}
        >
          Iniciar sesión
        </button>
        <button
          className={formulario === "registro" ? "tab activo" : "tab"}
          onClick={() => { setFormulario("registro"); setError(null); setMensaje(null); }}
        >
          Registrarme
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {mensaje && <p className="exito">{mensaje}</p>}

      {formulario === "login" ? (
        <form onSubmit={manejarLogin} className="formulario">
          <label>Correo institucional</label>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />

          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit">Iniciar sesión</button>
        </form>
      ) : (
        <form onSubmit={manejarRegistro} className="formulario">
          <label>Nombre completo</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />

          <label>Correo institucional</label>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />

          <label>Teléfono (opcional)</label>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

          <label>Rol</label>
          <select value={rol} onChange={(e) => setRol(e.target.value as "pasajero" | "conductor" | "admin")}>
            <option value="pasajero">Pasajero</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Administrador</option>
          </select>

          {rol === "admin" && (
            <>
              <label>Código de administrador</label>
              <input
                type="password"
                value={codigoAdmin}
                onChange={(e) => setCodigoAdmin(e.target.value)}
                placeholder="Solo lo conoce el equipo del proyecto"
                required
              />
            </>
          )}

          <button type="submit">Crear cuenta</button>
        </form>
      )}
    </div>
  );
}

export default App;
