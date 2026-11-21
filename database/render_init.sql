DO $$
BEGIN
    CREATE TYPE rol_usuario AS ENUM ('pasajero', 'conductor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN
        ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin';
END $$;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL,
    calificacion_promedio NUMERIC(2,1) DEFAULT 0.0,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conductores (
    id_usuario INTEGER PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    licencia VARCHAR(50) NOT NULL,
    soat VARCHAR(50) NOT NULL,
    propiedad_vehiculo VARCHAR(100),
    documentos_aprobados BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS vehiculos (
    id_vehiculo SERIAL PRIMARY KEY,
    id_conductor INTEGER NOT NULL REFERENCES conductores(id_usuario) ON DELETE CASCADE,
    placa VARCHAR(10) NOT NULL UNIQUE,
    modelo VARCHAR(100),
    capacidad INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rutas (
    id_ruta SERIAL PRIMARY KEY,
    id_conductor INTEGER NOT NULL REFERENCES conductores(id_usuario) ON DELETE CASCADE,
    id_vehiculo INTEGER NOT NULL REFERENCES vehiculos(id_vehiculo),
    origen VARCHAR(200) NOT NULL,
    destino VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    hora_salida TIME NOT NULL,
    cupos_disponibles INTEGER NOT NULL,
    aporte_sugerido NUMERIC(10,2) NOT NULL,
    ruta_segura BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT NOW()
);
