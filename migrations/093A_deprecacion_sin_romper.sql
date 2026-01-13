-- Migración 093: Limpieza de Redundancias (FASE A - Deprecación sin romper)
-- Fecha: 2026-01-12
-- 
-- ESTRATEGIA DE 3 FASES:
-- 093A (ESTE ARCHIVO) - Deprecación sin romper: vistas de compatibilidad, triggers sync
-- 093B (FUTURO) - Backfill + constraints NOT VALID
-- 093C (FUTURO) - Limpieza final: DROP de legacy
--
-- RIESGO: 🟢 BAJO - No elimina nada, solo agrega capas de compatibilidad

-- ========================================
-- BLOQUE 1: SEDE - Campos texto redundantes
-- Problema: sede.departamento/municipio (texto) vs sede.departamento_id/municipio_id (FK)
-- Solución: Vista + trigger de sincronización
-- ========================================

-- 1.1 Vista de sede con datos normalizados
CREATE OR REPLACE VIEW v_sede_completa AS
SELECT 
    s.id,
    s.nombre,
    s.codigo,
    s.codigo_boleta,
    s.direccion,
    s.telefono,
    s.activa,
    s.es_sede_central,
    -- Datos de FK (FUENTE DE VERDAD)
    s.departamento_id,
    s.municipio_id,
    d.nombre AS departamento_nombre,
    m.nombre AS municipio_nombre,
    -- Campos legacy (para compatibilidad)
    s.departamento AS departamento_legacy,
    s.municipio AS municipio_legacy,
    -- Flag de inconsistencia
    CASE 
        WHEN s.departamento IS NOT NULL AND d.nombre IS NOT NULL AND s.departamento != d.nombre
        THEN TRUE ELSE FALSE 
    END AS tiene_inconsistencia_depto,
    CASE 
        WHEN s.municipio IS NOT NULL AND m.nombre IS NOT NULL AND s.municipio != m.nombre
        THEN TRUE ELSE FALSE 
    END AS tiene_inconsistencia_muni
FROM sede s
LEFT JOIN departamento d ON s.departamento_id = d.id
LEFT JOIN municipio m ON s.municipio_id = m.id;

COMMENT ON VIEW v_sede_completa IS 'Vista de sede con datos normalizados. Usar esta en lugar de leer campos texto legacy.';


-- 1.2 Trigger para mantener sincronizados los campos texto (TEMPORAL)
-- Esto permite que código viejo que lee los campos texto siga funcionando
CREATE OR REPLACE FUNCTION tr_fn_sync_sede_ubicacion()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se actualiza departamento_id, sincronizar campo texto
    IF NEW.departamento_id IS NOT NULL AND NEW.departamento_id != OLD.departamento_id THEN
        SELECT nombre INTO NEW.departamento FROM departamento WHERE id = NEW.departamento_id;
    END IF;
    
    -- Si se actualiza municipio_id, sincronizar campo texto
    IF NEW.municipio_id IS NOT NULL AND NEW.municipio_id != OLD.municipio_id THEN
        SELECT nombre INTO NEW.municipio FROM municipio WHERE id = NEW.municipio_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_sede_ubicacion ON sede;
CREATE TRIGGER tr_sync_sede_ubicacion
    BEFORE UPDATE ON sede
    FOR EACH ROW
    EXECUTE FUNCTION tr_fn_sync_sede_ubicacion();

COMMENT ON FUNCTION tr_fn_sync_sede_ubicacion() IS 'TEMPORAL: Sincroniza campos texto legacy desde FKs. Eliminar en 093C.';

-- 1.3 Backfill: actualizar campos texto desde FKs donde estén vacíos o inconsistentes
UPDATE sede s SET 
    departamento = d.nombre
FROM departamento d 
WHERE s.departamento_id = d.id 
  AND (s.departamento IS NULL OR s.departamento != d.nombre);

UPDATE sede s SET 
    municipio = m.nombre
FROM municipio m 
WHERE s.municipio_id = m.id 
  AND (s.municipio IS NULL OR s.municipio != m.nombre);

-- ========================================
-- BLOQUE 2: BRIGADA → USUARIO (Unificación gradual)
-- Problema: Tabla brigada duplica datos de usuario
-- Solución FASE A: Vista de compatibilidad que lea de usuario
-- ========================================

-- 2.1 Primero verificar estructura actual de brigada
-- NOTA: Esta vista mapea brigada a usuario para código legacy
CREATE OR REPLACE VIEW v_brigada AS
SELECT 
    b.id,
    b.usuario_id,
    COALESCE(u.nombre_completo, b.nombre) AS nombre,
    COALESCE(u.chapa, b.codigo) AS codigo,
    COALESCE(u.telefono, b.telefono) AS telefono,
    COALESCE(u.email, b.email) AS email,
    COALESCE(u.sede_id, b.sede_id) AS sede_id,
    COALESCE(u.activo, b.activa) AS activo,  -- usuario.activo vs brigada.activa
    -- Info de usuario asociado
    u.id AS usuario_id_real,
    u.username,
    u.rol_id,
    u.grupo,
    u.rol_brigada,
    u.genero,
    -- Flag: tiene usuario vinculado
    (b.usuario_id IS NOT NULL) AS tiene_usuario_vinculado,
    -- Flag: datos inconsistentes
    CASE 
        WHEN b.usuario_id IS NOT NULL AND b.nombre IS NOT NULL AND u.nombre_completo IS NOT NULL 
             AND b.nombre != u.nombre_completo
        THEN TRUE ELSE FALSE 
    END AS tiene_inconsistencia
FROM brigada b
LEFT JOIN usuario u ON b.usuario_id = u.id;

COMMENT ON VIEW v_brigada IS 'Vista de compatibilidad brigada→usuario. Usar esta en lugar de tabla brigada directa.';


-- 2.2 Función para obtener usuario_id desde brigada_id (para migrar FKs gradualmente)
CREATE OR REPLACE FUNCTION fn_brigada_to_usuario(p_brigada_id INT)
RETURNS INT AS $$
DECLARE
    v_usuario_id INT;
BEGIN
    -- Primero buscar en la relación directa
    SELECT usuario_id INTO v_usuario_id FROM brigada WHERE id = p_brigada_id;
    
    -- Si no hay relación directa, buscar por chapa
    IF v_usuario_id IS NULL THEN
        SELECT u.id INTO v_usuario_id 
        FROM brigada b
        JOIN usuario u ON u.chapa = b.codigo
        WHERE b.id = p_brigada_id
        LIMIT 1;
    END IF;
    
    RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_brigada_to_usuario IS 'Convierte brigada_id a usuario_id. Para migración gradual de FKs.';

-- ========================================
-- BLOQUE 3: INCIDENTE - Campos duplicados de obstrucción
-- Problema: obstruccion_detalle vs obstruccion_data
-- Solución: Vista que unifique + marcar uno como deprecated
-- ========================================

-- 3.1 Vista que muestra la obstrucción consolidada
CREATE OR REPLACE VIEW v_incidente_obstruccion AS
SELECT 
    i.id AS incidente_id,
    i.uuid,
    -- Usar obstruccion_data como preferido (más nuevo/completo)
    COALESCE(i.obstruccion_data, i.obstruccion_detalle) AS obstruccion,
    -- Flags de cuál tiene datos
    (i.obstruccion_data IS NOT NULL) AS tiene_obstruccion_data,
    (i.obstruccion_detalle IS NOT NULL) AS tiene_obstruccion_detalle,
    -- Flag de inconsistencia (ambos tienen datos diferentes)
    CASE 
        WHEN i.obstruccion_data IS NOT NULL AND i.obstruccion_detalle IS NOT NULL 
             AND i.obstruccion_data::TEXT != i.obstruccion_detalle::TEXT
        THEN TRUE ELSE FALSE 
    END AS tiene_inconsistencia
FROM incidente i
WHERE i.obstruccion_data IS NOT NULL OR i.obstruccion_detalle IS NOT NULL;

COMMENT ON VIEW v_incidente_obstruccion IS 'Vista consolidada de obstrucción. Preferir obstruccion_data sobre obstruccion_detalle.';

-- 3.2 Backfill: copiar obstruccion_detalle a obstruccion_data donde falte
UPDATE incidente SET 
    obstruccion_data = obstruccion_detalle
WHERE obstruccion_data IS NULL AND obstruccion_detalle IS NOT NULL;

-- ========================================
-- BLOQUE 4: PERMISOS - Sistema dual (JSONB vs tabla)
-- Problema: rol.permisos (JSONB) vs rol_permiso (tabla)
-- Solución FASE A: Solo documentar, no tocar aún
-- ========================================

-- 4.1 Vista para ver qué roles usan qué sistema
CREATE OR REPLACE VIEW v_rol_permisos_diagnostico AS
SELECT 
    r.id AS rol_id,
    r.nombre AS rol_nombre,
    -- JSONB
    (r.permisos IS NOT NULL AND r.permisos != '{}'::JSONB) AS usa_permisos_jsonb,
    jsonb_array_length(COALESCE(r.permisos, '[]'::JSONB)) AS cantidad_jsonb,
    -- Tabla relacional
    (SELECT COUNT(*) FROM rol_permiso rp WHERE rp.rol_id = r.id) AS cantidad_tabla,
    -- Recomendación
    CASE 
        WHEN (r.permisos IS NOT NULL AND r.permisos != '{}'::JSONB) 
             AND (SELECT COUNT(*) FROM rol_permiso rp WHERE rp.rol_id = r.id) > 0
        THEN 'CONFLICTO: Usa ambos sistemas'
        WHEN (SELECT COUNT(*) FROM rol_permiso rp WHERE rp.rol_id = r.id) > 0
        THEN 'OK: Usa tabla relacional'
        WHEN (r.permisos IS NOT NULL AND r.permisos != '{}'::JSONB)
        THEN 'LEGACY: Usa JSONB (migrar a tabla)'
        ELSE 'SIN PERMISOS'
    END AS estado
FROM rol r;

COMMENT ON VIEW v_rol_permisos_diagnostico IS 'Diagnóstico de sistema de permisos dual. Revisar antes de 093B.';

-- ========================================
-- BLOQUE 5: DOCUMENTACIÓN DE DEPRECACIÓN
-- ========================================

-- Agregar comentarios a columnas deprecated
COMMENT ON COLUMN sede.departamento IS 'DEPRECATED: Usar departamento_id + JOIN. Se sincroniza automáticamente.';
COMMENT ON COLUMN sede.municipio IS 'DEPRECATED: Usar municipio_id + JOIN. Se sincroniza automáticamente.';
COMMENT ON COLUMN incidente.obstruccion_detalle IS 'DEPRECATED: Usar obstruccion_data. Datos migrados automáticamente.';

-- Comentario general de estado
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '093A COMPLETADA - Deprecación sin romper';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Vistas creadas:';
    RAISE NOTICE '  - v_sede_completa (sede con datos normalizados)';
    RAISE NOTICE '  - v_brigada (compatibilidad brigada→usuario)';
    RAISE NOTICE '  - v_incidente_obstruccion (obstrucción consolidada)';
    RAISE NOTICE '  - v_rol_permisos_diagnostico (diagnóstico permisos)';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers creados:';
    RAISE NOTICE '  - tr_sync_sede_ubicacion (sincroniza campos texto)';
    RAISE NOTICE '';
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '  - fn_brigada_to_usuario (conversión para FKs)';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '  1. Actualizar código para usar vistas en lugar de tablas legacy';
    RAISE NOTICE '  2. Ejecutar 093B cuando código esté actualizado';
    RAISE NOTICE '  3. Ejecutar 093C cuando se confirme que legacy no se usa';
    RAISE NOTICE '===========================================';
END $$;

-- ========================================
-- FIN MIGRACIÓN 093A
-- ========================================
