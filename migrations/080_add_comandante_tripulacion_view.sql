-- Migración 080: Agregar es_comandante y tripulacion completa a v_mi_asignacion_hoy
-- Problema: Faltaba el campo es_comandante y la tripulación completa (no solo compañeros)
-- Fecha: 2026-01-09

DROP VIEW IF EXISTS v_mi_asignacion_hoy;

CREATE VIEW v_mi_asignacion_hoy AS
SELECT
    usr.id AS usuario_id,
    usr.nombre_completo,
    t.id AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado AS turno_estado,
    a.id AS asignacion_id,
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    tc.rol_tripulacion AS mi_rol,
    tc.es_comandante,  -- NUEVO: Indica si el usuario es comandante de la unidad
    r.id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    a.acciones,
    a.estado_nomina,  -- NUEVO: Para filtrar por asignaciones liberadas
    CASE
        WHEN a.km_inicio IS NOT NULL AND a.km_final IS NOT NULL
            THEN 'Km ' || a.km_inicio || ' - Km ' || a.km_final
        WHEN a.km_inicio IS NOT NULL THEN 'Desde Km ' || a.km_inicio
        WHEN a.km_final IS NOT NULL THEN 'Hasta Km ' || a.km_final
        ELSE NULL
    END AS recorrido_permitido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    -- Calcular dias hasta la asignacion
    CASE
        WHEN t.fecha = CURRENT_DATE THEN 0
        ELSE t.fecha - CURRENT_DATE
    END AS dias_para_salida,
    -- NUEVO: Tripulación COMPLETA (incluyendo al usuario actual)
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', u2.id,
                'nombre', u2.nombre_completo,
                'chapa', u2.chapa,
                'rol', tc2.rol_tripulacion,
                'telefono', u2.telefono,
                'es_comandante', tc2.es_comandante
            ) ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPANANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id
    ) AS tripulacion,
    -- Mantenemos compañeros para compatibilidad
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', u2.id,
                'nombre', u2.nombre_completo,
                'chapa', u2.chapa,
                'rol', tc2.rol_tripulacion,
                'telefono', u2.telefono
            ) ORDER BY
                CASE tc2.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPANANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc2
        JOIN usuario u2 ON tc2.usuario_id = u2.id
        WHERE tc2.asignacion_id = a.id
        AND tc2.usuario_id <> usr.id
    ) AS companeros
FROM usuario usr
JOIN tripulacion_turno tc ON usr.id = tc.usuario_id
JOIN asignacion_unidad a ON tc.asignacion_id = a.id
JOIN turno t ON a.turno_id = t.id
JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN ruta r ON a.ruta_id = r.id
WHERE
    -- Mostrar asignaciones de hoy en adelante (no pasadas)
    (t.fecha >= CURRENT_DATE OR (t.fecha_fin IS NOT NULL AND t.fecha_fin >= CURRENT_DATE))
    -- Solo turnos planificados o activos
    AND t.estado IN ('PLANIFICADO', 'ACTIVO')
    -- No mostrar asignaciones que ya finalizaron (tienen hora_entrada_real)
    AND a.hora_entrada_real IS NULL;

COMMENT ON VIEW v_mi_asignacion_hoy IS 'Muestra la próxima asignación del brigada (hoy o futura). Incluye ruta_id, es_comandante, tripulación completa, estado_nomina y detalles.';

-- Confirmar
SELECT 'Migración 080 completada: agregado es_comandante, tripulacion y estado_nomina a v_mi_asignacion_hoy' AS resultado;
