-- Migracion 052: Agregar soporte para unidades de reaccion
-- Fecha: 2025-12-11

-- 1. Agregar columna es_reaccion a asignacion_unidad
ALTER TABLE asignacion_unidad
ADD COLUMN IF NOT EXISTS es_reaccion BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN asignacion_unidad.es_reaccion IS 'Indica si la unidad es de reaccion (sin ruta fija inicial)';

-- 2. Hacer ruta_id opcional (nullable) para permitir unidades de reaccion
ALTER TABLE asignacion_unidad
ALTER COLUMN ruta_id DROP NOT NULL;

-- 3. Actualizar vista v_asignaciones_completas (si es necesario)
-- Verificamos si la vista necesita ser recreada para incluir la columna nueva
CREATE OR REPLACE VIEW v_asignaciones_completas AS
SELECT
    au.id,
    au.turno_id,
    t.fecha AS fecha_programada,
    au.unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    au.ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,
    au.acciones,
    au.hora_salida, -- Programada
    au.hora_entrada_estimada, -- Programada
    au.es_reaccion, -- NUEVO CAMPO
    
    -- Estado calculado
    CASE
        WHEN au.hora_entrada_real IS NOT NULL THEN 'FINALIZADA'
        WHEN au.hora_salida_real IS NOT NULL THEN 'EN_CURSO'
        ELSE 'PROGRAMADA'
    END AS estado,
    
    au.hora_salida_real,
    au.hora_entrada_real,
    
    -- Tripulacion
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', tt.usuario_id,
                'nombre', mu.nombre_completo,
                'rol', tt.rol_tripulacion,
                'presente', tt.presente
            )
        )
        FROM tripulacion_turno tt
        JOIN usuario mu ON tt.usuario_id = mu.id
        WHERE tt.asignacion_id = au.id
    ) AS tripulacion

FROM asignacion_unidad au
JOIN turno t ON au.turno_id = t.id
JOIN unidad u ON au.unidad_id = u.id
LEFT JOIN ruta r ON au.ruta_id = r.id;
