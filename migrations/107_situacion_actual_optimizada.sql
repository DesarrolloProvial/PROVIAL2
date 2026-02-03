-- =====================================================
-- MIGRACIÓN 107: Sistema situacion_actual optimizado
-- Tabla de estado actual por unidad para consultas ultra-rápidas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREAR TABLA situacion_actual
-- Una fila por unidad con su última situación reportada
-- =====================================================

CREATE TABLE IF NOT EXISTS situacion_actual (
    unidad_id INTEGER PRIMARY KEY REFERENCES unidad(id) ON DELETE CASCADE,
    situacion_id BIGINT REFERENCES situacion(id) ON DELETE SET NULL,

    -- Datos desnormalizados para evitar JOINs
    tipo_situacion VARCHAR(50),
    estado VARCHAR(20),
    descripcion TEXT,

    -- Ubicación
    latitud DECIMAL(10, 7),
    longitud DECIMAL(10, 7),
    km DECIMAL(6, 2),
    sentido VARCHAR(20),

    -- Ruta
    ruta_id INTEGER REFERENCES ruta(id),
    ruta_codigo VARCHAR(20),

    -- Timestamps
    situacion_created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_situacion_actual_estado ON situacion_actual(estado);
CREATE INDEX IF NOT EXISTS idx_situacion_actual_tipo ON situacion_actual(tipo_situacion);
CREATE INDEX IF NOT EXISTS idx_situacion_actual_updated ON situacion_actual(updated_at DESC);

COMMENT ON TABLE situacion_actual IS 'Cache de última situación por unidad. Se actualiza automáticamente con trigger.';

-- =====================================================
-- 2. FUNCIÓN para actualizar situacion_actual
-- =====================================================

CREATE OR REPLACE FUNCTION fn_actualizar_situacion_actual()
RETURNS TRIGGER AS $$
DECLARE
    v_ruta_codigo VARCHAR(20);
BEGIN
    -- Obtener código de ruta
    SELECT codigo INTO v_ruta_codigo
    FROM ruta
    WHERE id = NEW.ruta_id;

    -- UPSERT: insertar o actualizar
    INSERT INTO situacion_actual (
        unidad_id,
        situacion_id,
        tipo_situacion,
        estado,
        descripcion,
        latitud,
        longitud,
        km,
        sentido,
        ruta_id,
        ruta_codigo,
        situacion_created_at,
        updated_at
    ) VALUES (
        NEW.unidad_id,
        NEW.id,
        NEW.tipo_situacion,
        NEW.estado,
        NEW.descripcion,
        NEW.latitud,
        NEW.longitud,
        NEW.km,
        NEW.sentido,
        NEW.ruta_id,
        v_ruta_codigo,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (unidad_id) DO UPDATE SET
        situacion_id = EXCLUDED.situacion_id,
        tipo_situacion = EXCLUDED.tipo_situacion,
        estado = EXCLUDED.estado,
        descripcion = EXCLUDED.descripcion,
        latitud = EXCLUDED.latitud,
        longitud = EXCLUDED.longitud,
        km = EXCLUDED.km,
        sentido = EXCLUDED.sentido,
        ruta_id = EXCLUDED.ruta_id,
        ruta_codigo = EXCLUDED.ruta_codigo,
        situacion_created_at = EXCLUDED.situacion_created_at,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TRIGGER en tabla situacion
-- Se dispara en INSERT y UPDATE
-- =====================================================

DROP TRIGGER IF EXISTS trg_situacion_actualizar_actual ON situacion;

CREATE TRIGGER trg_situacion_actualizar_actual
AFTER INSERT OR UPDATE ON situacion
FOR EACH ROW
WHEN (NEW.unidad_id IS NOT NULL)
EXECUTE FUNCTION fn_actualizar_situacion_actual();

-- =====================================================
-- 4. POBLAR DATOS INICIALES
-- Migrar última situación de cada unidad
-- =====================================================

INSERT INTO situacion_actual (
    unidad_id,
    situacion_id,
    tipo_situacion,
    estado,
    descripcion,
    latitud,
    longitud,
    km,
    sentido,
    ruta_id,
    ruta_codigo,
    situacion_created_at,
    updated_at
)
SELECT DISTINCT ON (s.unidad_id)
    s.unidad_id,
    s.id,
    s.tipo_situacion,
    s.estado,
    s.descripcion,
    s.latitud,
    s.longitud,
    s.km,
    s.sentido,
    s.ruta_id,
    r.codigo,
    s.created_at,
    NOW()
FROM situacion s
LEFT JOIN ruta r ON s.ruta_id = r.id
WHERE s.unidad_id IS NOT NULL
ORDER BY s.unidad_id, s.created_at DESC
ON CONFLICT (unidad_id) DO NOTHING;

-- =====================================================
-- 5. FUNCIÓN para limpiar situacion_actual al finalizar jornada
-- (Opcional: se llama cuando la unidad ingresa a sede definitivamente)
-- =====================================================

CREATE OR REPLACE FUNCTION fn_limpiar_situacion_actual_unidad(p_unidad_id INTEGER)
RETURNS VOID AS $$
BEGIN
    DELETE FROM situacion_actual WHERE unidad_id = p_unidad_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- SELECT COUNT(*) FROM situacion_actual;
-- SELECT * FROM situacion_actual LIMIT 5;
