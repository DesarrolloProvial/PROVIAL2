-- =====================================================
-- MIGRACIÓN 108: Limpieza de tabla situacion
-- Eliminar columnas no utilizadas y consolidar campos
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ELIMINAR TABLAS situacion_persistente y situacion_fija
-- =====================================================

DROP TABLE IF EXISTS situacion_fija CASCADE;
DROP TABLE IF EXISTS situacion_persistente CASCADE;

-- =====================================================
-- 2. MIGRAR DATOS DE HERIDOS/FALLECIDOS ANTES DE ELIMINAR
-- Convertir hay_heridos/cantidad_heridos -> heridos (INTEGER)
-- Convertir hay_fallecidos/cantidad_fallecidos -> fallecidos (INTEGER)
-- =====================================================

-- Agregar nuevas columnas consolidadas
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS heridos INTEGER DEFAULT 0;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fallecidos INTEGER DEFAULT 0;

-- Migrar datos existentes
UPDATE situacion SET
    heridos = COALESCE(cantidad_heridos, 0),
    fallecidos = COALESCE(cantidad_fallecidos, 0);

-- =====================================================
-- 3. ELIMINAR COLUMNAS DE TABLA situacion
-- =====================================================

-- Columna ubicacion_manual
ALTER TABLE situacion DROP COLUMN IF EXISTS ubicacion_manual;

-- Columnas de combustible
ALTER TABLE situacion DROP COLUMN IF EXISTS combustible;
ALTER TABLE situacion DROP COLUMN IF EXISTS combustible_fraccion;
ALTER TABLE situacion DROP COLUMN IF EXISTS kilometraje_unidad;

-- Columna tripulacion_confirmada
ALTER TABLE situacion DROP COLUMN IF EXISTS tripulacion_confirmada;

-- Columna descripcion (se usa observaciones)
ALTER TABLE situacion DROP COLUMN IF EXISTS descripcion;

-- Columnas de modificacion post-cierre
ALTER TABLE situacion DROP COLUMN IF EXISTS modificado_despues_cierre;
ALTER TABLE situacion DROP COLUMN IF EXISTS motivo_modificacion_cierre;

-- Columnas de tipo redundantes (solo queda tipo_situacion_id)
ALTER TABLE situacion DROP COLUMN IF EXISTS tipo_hecho_id;
ALTER TABLE situacion DROP COLUMN IF EXISTS subtipo_hecho_id;

-- Columnas de fecha innecesarias
ALTER TABLE situacion DROP COLUMN IF EXISTS fecha_hora_asignacion;
ALTER TABLE situacion DROP COLUMN IF EXISTS fecha_hora_estabilizacion;

-- Columnas de heridos/fallecidos antiguas (ya migradas a heridos/fallecidos)
ALTER TABLE situacion DROP COLUMN IF EXISTS hay_heridos;
ALTER TABLE situacion DROP COLUMN IF EXISTS cantidad_heridos;
ALTER TABLE situacion DROP COLUMN IF EXISTS hay_fallecidos;
ALTER TABLE situacion DROP COLUMN IF EXISTS cantidad_fallecidos;

-- Columnas de servicios requeridos
ALTER TABLE situacion DROP COLUMN IF EXISTS requiere_bomberos;
ALTER TABLE situacion DROP COLUMN IF EXISTS requiere_pnc;
ALTER TABLE situacion DROP COLUMN IF EXISTS requiere_ambulancia;

-- Columna email
ALTER TABLE situacion DROP COLUMN IF EXISTS reportado_por_email;

-- FK a situacion_persistente (tabla ya eliminada)
ALTER TABLE situacion DROP COLUMN IF EXISTS situacion_persistente_id;

-- =====================================================
-- 4. ACTUALIZAR TABLA situacion_actual (cache)
-- Sincronizar estructura con cambios
-- =====================================================

-- Eliminar columna descripcion si existe
ALTER TABLE situacion_actual DROP COLUMN IF EXISTS descripcion;

-- =====================================================
-- 5. ACTUALIZAR TRIGGER fn_actualizar_situacion_actual
-- Remover referencia a descripcion
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

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'situacion' ORDER BY ordinal_position;
