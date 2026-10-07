-- ============================================================
-- UniRide - Esquema de Base de Datos (PostgreSQL)
-- Basado en el Diagrama de Clases UML del proyecto
-- ============================================================
-- Cómo usarlo:
--   1. Crea la base de datos:  CREATE DATABASE uniride;
--   2. Conéctate a ella:       \c uniride
--   3. Corre este archivo:     \i schema.sql
-- ============================================================

-- Tipos enumerados (para que solo se puedan guardar valores válidos)
CREATE TYPE rol_usuario AS ENUM ('pasajero', 'conductor');
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'confirmada', 'rechazada', 'cancelada');
CREATE TYPE estado_aporte AS ENUM ('pendiente', 'pagado', 'fallido');
CREATE TYPE estado_alerta AS ENUM ('activa', 'atendida', 'cerrada');

-- ============================================================
-- USUARIO (clase base del diagrama: Usuario)
-- ============================================================
CREATE TABLE usuarios (
    id_usuario              SERIAL PRIMARY KEY,
    nombre                  VARCHAR(150) NOT NULL,
    correo_institucional    VARCHAR(150) NOT NULL UNIQUE,
    telefono                VARCHAR(20),
    password_hash           VARCHAR(255) NOT NULL,   -- nunca se guarda la contraseña en texto plano
    rol                     rol_usuario NOT NULL,
    calificacion_promedio   NUMERIC(2,1) DEFAULT 0.0,
    creado_en               TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONDUCTOR (hereda de Usuario en el UML -> tabla con los
-- atributos EXTRA de un conductor, enlazada 1 a 1 con usuarios)
-- ============================================================
CREATE TABLE conductores (
    id_usuario           INTEGER PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    licencia              VARCHAR(50) NOT NULL,
    soat                   VARCHAR(50) NOT NULL,
    propiedad_vehiculo     VARCHAR(100),
    documentos_aprobados   BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- VEHICULO (1 conductor -> muchos vehículos)
-- ============================================================
CREATE TABLE vehiculos (
    id_vehiculo     SERIAL PRIMARY KEY,
    id_conductor    INTEGER NOT NULL REFERENCES conductores(id_usuario) ON DELETE CASCADE,
    placa           VARCHAR(10) NOT NULL UNIQUE,
    modelo          VARCHAR(100),
    capacidad       INTEGER NOT NULL
);

-- ============================================================
-- RUTA (la publica un conductor)
-- ============================================================
CREATE TABLE rutas (
    id_ruta             SERIAL PRIMARY KEY,
    id_conductor        INTEGER NOT NULL REFERENCES conductores(id_usuario) ON DELETE CASCADE,
    id_vehiculo         INTEGER NOT NULL REFERENCES vehiculos(id_vehiculo),
    origen              VARCHAR(200) NOT NULL,
    destino             VARCHAR(200) NOT NULL,
    fecha               DATE NOT NULL,
    hora_salida         TIME NOT NULL,
    cupos_disponibles   INTEGER NOT NULL,
    aporte_sugerido     NUMERIC(10,2) NOT NULL,
    ruta_segura         BOOLEAN DEFAULT FALSE,   -- filtro "UniRide Ellas"
    creado_en           TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RESERVA (un pasajero reserva cupos en una ruta)
-- ============================================================
CREATE TABLE reservas (
    id_reserva         SERIAL PRIMARY KEY,
    id_ruta            INTEGER NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    id_pasajero        INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_reserva      TIMESTAMP DEFAULT NOW(),
    estado             estado_reserva DEFAULT 'pendiente',
    cantidad_cupos     INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- APORTE (pago asociado 1 a 1 con una reserva)
-- ============================================================
CREATE TABLE aportes (
    id_aporte     SERIAL PRIMARY KEY,
    id_reserva    INTEGER NOT NULL UNIQUE REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    valor         NUMERIC(10,2) NOT NULL,
    fecha         TIMESTAMP DEFAULT NOW(),
    estado        estado_aporte DEFAULT 'pendiente'
);

-- ============================================================
-- CALIFICACION (un usuario califica a otro tras un viaje)
-- ============================================================
CREATE TABLE calificaciones (
    id_calificacion    SERIAL PRIMARY KEY,
    id_calificador     INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_calificado      INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_ruta            INTEGER REFERENCES rutas(id_ruta),
    estrellas          INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario         TEXT,
    fecha              TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MONITOREO GPS (1 a 1 con una ruta activa)
-- ============================================================
CREATE TABLE monitoreo_gps (
    id_seguimiento    SERIAL PRIMARY KEY,
    id_ruta           INTEGER NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    latitud           DOUBLE PRECISION NOT NULL,
    longitud          DOUBLE PRECISION NOT NULL,
    fecha_hora        TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ALERTA SOS (botón de pánico)
-- ============================================================
CREATE TABLE alertas_sos (
    id_alerta      SERIAL PRIMARY KEY,
    id_usuario     INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_ruta        INTEGER REFERENCES rutas(id_ruta),
    coordenadas    VARCHAR(100) NOT NULL,
    fecha_hora     TIMESTAMP DEFAULT NOW(),
    estado         estado_alerta DEFAULT 'activa'
);

-- ============================================================
-- SEGURIDAD UNIRIDE ELLAS (depende del monitoreo de una ruta)
-- ============================================================
CREATE TABLE seguridad_uniride_ellas (
    id_ruta    INTEGER PRIMARY KEY REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    activo     BOOLEAN DEFAULT FALSE
);

-- Índices que vamos a necesitar pronto para las búsquedas de rutas
CREATE INDEX idx_rutas_origen_destino_fecha ON rutas (origen, destino, fecha);
CREATE INDEX idx_reservas_pasajero ON reservas (id_pasajero);
