ALTER TABLE conductores
ADD COLUMN IF NOT EXISTS licencia_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS soat_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS tarjeta_propiedad_archivo VARCHAR(255),
ADD COLUMN IF NOT EXISTS documentos_aprobados BOOLEAN DEFAULT FALSE;

ALTER TABLE conductores
ALTER COLUMN licencia_archivo DROP NOT NULL,
ALTER COLUMN soat_archivo DROP NOT NULL,
ALTER COLUMN tarjeta_propiedad_archivo DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conductores' AND column_name = 'licencia'
    ) THEN
        ALTER TABLE conductores ALTER COLUMN licencia DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conductores' AND column_name = 'soat'
    ) THEN
        ALTER TABLE conductores ALTER COLUMN soat DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conductores' AND column_name = 'propiedad_vehiculo'
    ) THEN
        ALTER TABLE conductores ALTER COLUMN propiedad_vehiculo DROP NOT NULL;
    END IF;
END
$$;
