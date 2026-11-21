import { useState } from "react";
import type { FormEvent } from "react";
import { completarPerfilConductor, registrarVehiculo, ApiError } from "../api";

interface OnboardingConductorProps {
  token: string;
  paso: "perfil" | "vehiculo";
  onPerfilCompleto: () => void;
  onVehiculoCompleto: () => void;
  cerrarSesion: () => void;
}

function OnboardingConductor({
  token,
  paso,
  onPerfilCompleto,
  onVehiculoCompleto,
  cerrarSesion,
}: OnboardingConductorProps) {
  const [licencia, setLicencia] = useState<File | null>(null);
  const [soat, setSoat] = useState<File | null>(null);
  const [tarjetaPropiedad, setTarjetaPropiedad] = useState<File | null>(null);

  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState<"moto" | "carro">("carro");
  const [capacidad, setCapacidad] = useState("4");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarPerfil(e: FormEvent) {
    e.preventDefault();
    if (!licencia || !soat || !tarjetaPropiedad) {
      setError("Sube los 3 documentos para continuar.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await completarPerfilConductor(token, { licencia, soat, tarjetaPropiedad });
      onPerfilCompleto();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron subir los documentos.");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarVehiculo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await registrarVehiculo(token, {
        placa: placa.trim().toUpperCase(),
        modelo: modelo.trim(),
        tipo: tipoVehiculo,
        capacidad: Number(capacidad),
      });
      onVehiculoCompleto();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el vehículo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor onboarding">
      <h1>UniRide 🚗</h1>
      <p className="subtitulo">
        {paso === "perfil"
          ? "Antes de empezar, sube tus documentos de conductor"
          : "Un paso más: registra tu vehículo"}
      </p>

      <div className="onboarding-pasos">
        <span className={paso === "perfil" ? "paso activo" : "paso completo"}>1. Documentos</span>
        <span className={paso === "vehiculo" ? "paso activo" : "paso"}>2. Vehículo</span>
      </div>

      {error && <p className="error">{error}</p>}

      {paso === "perfil" ? (
        <form className="formulario" onSubmit={manejarPerfil}>
          <label>Licencia de conducción (foto o PDF)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setLicencia(e.target.files?.[0] ?? null)}
            required
          />

          <label>SOAT vigente (foto o PDF)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setSoat(e.target.files?.[0] ?? null)}
            required
          />

          <label>Tarjeta de propiedad (foto o PDF)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setTarjetaPropiedad(e.target.files?.[0] ?? null)}
            required
          />

          <p className="onboarding-ayuda">Formatos aceptados: JPG, PNG o PDF. Máximo 5 MB por archivo.</p>

          <button type="submit" disabled={enviando}>
            {enviando ? "Subiendo..." : "Continuar"}
          </button>
        </form>
      ) : (
        <form className="formulario" onSubmit={manejarVehiculo}>
          <label>Placa</label>
          <input value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={10} required />

          <label>Modelo (opcional)</label>
          <input value={modelo} onChange={(e) => setModelo(e.target.value)} maxLength={100} />

          <label>Tipo de vehículo</label>
          <select
            value={tipoVehiculo}
            onChange={(e) => setTipoVehiculo(e.target.value as "moto" | "carro")}
            required
          >
            <option value="carro">Carro - $1.000 por km</option>
            <option value="moto">Moto - $500 por km</option>
          </select>

          <label>Capacidad de pasajeros</label>
          <input
            type="number"
            min="2"
            max="100"
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            required
          />

          <button type="submit" disabled={enviando}>
            {enviando ? "Guardando..." : "Finalizar"}
          </button>
        </form>
      )}

      <button className="link-button onboarding-salir" onClick={cerrarSesion}>
        Cancelar y cerrar sesión
      </button>
    </div>
  );
}

export default OnboardingConductor;
