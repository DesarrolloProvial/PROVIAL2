-- Migración 093C: Limpieza Final (DROP de legacy)
-- Fecha: PENDIENTE (ejecutar cuando se confirme que legacy no se usa)
-- Prerequisito: 093A + 093B ejecutadas + sistema estable por al menos 2 semanas
--
-- RIESGO: 🔴 ALTO - Elimina columnas/tablas. SIN ROLLBACK FÁCIL.
-- HACER BACKUP ANTES DE EJECUTAR

-- ========================================
-- ⚠️  ADVERTENCIA ⚠️
-- Esta migración ELIMINA datos. Asegúrate de:
-- 1. Tener backup reciente
-- 2. Haber probado en staging
-- 3. Que nadie esté usando los campos legacy
-- ========================================

-- ========================================
-- BLOQUE 1: SEDE - Eliminar campos texto
-- ========================================

/*
-- Primero eliminar el trigger de sincronización
DROP TRIGGER IF EXISTS tr_sync_sede_ubicacion ON sede;
DROP FUNCTION IF EXISTS tr_fn_sync_sede_ubicacion();

-- Luego eliminar columnas
ALTER TABLE sede DROP COLUMN IF EXISTS departamento;
ALTER TABLE sede DROP COLUMN IF EXISTS municipio;
*/

-- ========================================
-- BLOQUE 2: INCIDENTE - Eliminar obstruccion_detalle
-- ========================================

/*
ALTER TABLE incidente DROP COLUMN IF EXISTS obstruccion_detalle;
*/

-- ========================================
-- BLOQUE 3: BRIGADA - Deprecar tabla completa
-- ========================================

-- OPCIÓN A: Renombrar (permite rollback)
/*
ALTER TABLE brigada RENAME TO _brigada_deprecated;
*/

-- OPCIÓN B: Eliminar (sin rollback)
/*
DROP TABLE IF EXISTS brigada CASCADE;
*/

-- ========================================
-- BLOQUE 4: PERMISOS JSONB - Eliminar columna
-- ========================================

/*
ALTER TABLE rol DROP COLUMN IF EXISTS permisos;
*/

-- ========================================
-- BLOQUE 5: Actualizar vistas (eliminar columnas legacy)
-- ========================================

/*
-- Recrear v_sede_completa sin columnas legacy
CREATE OR REPLACE VIEW v_sede_completa AS
SELECT 
    s.id,
    s.nombre,
    s.codigo,
    s.codigo_boleta,
    s.direccion,
    s.telefono,
    s.latitud,
    s.longitud,
    s.activa,
    s.es_sede_central,
    s.departamento_id,
    s.municipio_id,
    d.nombre AS departamento_nombre,
    m.nombre AS municipio_nombre
FROM sede s
LEFT JOIN departamento d ON s.departamento_id = d.id
LEFT JOIN municipio m ON s.municipio_id = m.id;

-- Eliminar v_brigada (ya no necesaria si brigada no existe)
DROP VIEW IF EXISTS v_brigada;
DROP FUNCTION IF EXISTS fn_brigada_to_usuario(INT);
*/

-- ========================================
-- BLOQUE 6: Actualizar diccionario de datos
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '093C - Limpieza Final';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'TODAS LAS OPERACIONES ESTÁN COMENTADAS';
    RAISE NOTICE 'Revisar y descomentar selectivamente después de:';
    RAISE NOTICE '  1. Backup completo de la BD';
    RAISE NOTICE '  2. Pruebas en staging';
    RAISE NOTICE '  3. Confirmación de que legacy no se usa';
    RAISE NOTICE '===========================================';
END $$;

-- ========================================
-- FIN MIGRACIÓN 093C
-- ========================================
