ALTER TABLE conductores
ADD COLUMN IF NOT EXISTS licencia_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS soat_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS tarjeta_propiedad_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS documentos_aprobados BOOLEAN DEFAULT FALSE;

ALTER TABLE conductores
ALTER COLUMN licencia_archivo DROP NOT NULL,
ALTER COLUMN soat_archivo DROP NOT NULL,
ALTER COLUMN tarjeta_propiedad_archivo DROP NOT NULL;
