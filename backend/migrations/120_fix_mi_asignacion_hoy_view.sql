-- Migración 120: Mejorar vista v_mi_asignacion_hoy con tripulación completa
-- Fecha: 2026-02-08
-- Descripción: Actualiza la vista v_mi_asignacion_hoy para incluir:
--   1. Tripulación completa (incluyendo al usuario actual)
--   2. Indicador es_comandante (si el usuario es el piloto)
--   3. Días hasta la salida
--   4. Recorrido permitido (descripción del rango de kms)

-- ========================================
-- ACTUALIZAR VISTA v_mi_asignacion_hoy
-- ========================================

CREATE OR REPLACE VIEW v_mi_asignacion_hoy AS
SELECT
    usr.id AS usuario_id,
    usr.nombre_completo,

    -- Turno
    t.id AS turno_id,
    t.fecha,
    t.estado AS turno_estado,
    
    -- Días hasta la fecha del turno
    (t.fecha - CURRENT_DATE) AS dias_para_salida,

    -- Asignación
    a.id AS asignacion_id,
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,

    -- Mi rol
    tc.rol_tripulacion AS mi_rol,
    
    -- Soy comandante si soy PILOTO
    (tc.rol_tripulacion = 'PILOTO') AS es_comandante,

    -- Zona asignada
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    
    -- Recorrido permitido (descripción)
    CASE
        WHEN a.km_inicio IS NOT NULL AND a.km_final IS NOT NULL THEN
            'Km ' || a.km_inicio || ' - Km ' || a.km_final
        WHEN a.km_inicio IS NOT NULL THEN
            'Desde Km ' || a.km_inicio
        WHEN a.km_final IS NOT NULL THEN
            'Hasta Km ' || a.km_final
        ELSE NULL
    END AS recorrido_permitido,
    
    a.acciones,

    -- Horario
    a.hora_salida,
    a.hora_entrada_estimada,

    -- Tripulación COMPLETA (incluyendo al usuario actual)
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', u2.id,
                'nombre', u2.nombre_completo,
                'rol', tc2.rol_tripulacion,
                'es_comandante', (tc2.rol_tripulacion = 'PILOTO')
            )
            ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id
    ) AS tripulacion,
    
    -- Compañeros de tripulación (excluyendo al usuario actual) - DEPRECATED
    -- Mantenido por compatibilidad pero se recomienda usar 'tripulacion'
    (
        SELECT json_agg(
            json_build_object(
                'nombre', u2.nombre_completo,
                'rol', tc2.rol_tripulacion
            )
            ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id
          AND tc2.usuario_id != usr.id
    ) AS companeros

FROM usuario usr
JOIN tripulacion_turno tc ON usr.id = tc.usuario_id
JOIN asignacion_unidad a ON tc.asignacion_id = a.id
JOIN turno t ON a.turno_id = t.id
JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN ruta r ON a.ruta_id = r.id
WHERE t.fecha = CURRENT_DATE
  AND t.estado IN ('PLANIFICADO', 'ACTIVO');

COMMENT ON VIEW v_mi_asignacion_hoy IS 'Asignación del día para un usuario (usado en app móvil) - Incluye tripulación completa';

-- ========================================
-- VERIFICACIÓN
-- =========================================

-- Para verificar la vista actualizada:
-- SELECT * FROM v_mi_asignacion_hoy WHERE usuario_id = <ID_USUARIO>;
