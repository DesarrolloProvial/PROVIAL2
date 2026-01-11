-- Migración 086: Asegurar consistencia en tabla situacion
-- Soluciona posible Crash 500 si falta la columna o restricciones incorrectas

-- 1. Asegurar que salida_unidad_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'situacion'
        AND column_name = 'salida_unidad_id'
    ) THEN
        ALTER TABLE situacion ADD COLUMN salida_unidad_id INT REFERENCES salida_unidad(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Asegurar que campos opcionales para asignaciones permanentes sean NULLABLE
ALTER TABLE situacion ALTER COLUMN turno_id DROP NOT NULL;
ALTER TABLE situacion ALTER COLUMN asignacion_id DROP NOT NULL;
ALTER TABLE situacion ALTER COLUMN salida_unidad_id DROP NOT NULL;

-- 3. Asegurar que fecha_aprobacion en inspeccion_360 exista (para compatibilidad)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'inspeccion_360'
        AND column_name = 'fecha_aprobacion'
    ) THEN
        ALTER TABLE inspeccion_360 ADD COLUMN fecha_aprobacion TIMESTAMPTZ;
    END IF;
END $$;
