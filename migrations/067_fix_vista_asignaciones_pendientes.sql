-- Migración 067: Corregir vista v_asignaciones_pendientes
-- Fecha: 2025-12-15
--
-- PROBLEMA: La vista filtraba por fecha >= CURRENT_DATE
--           Esto ocultaba asignaciones con fechas pasadas que aún no se finalizaron
--
-- LÓGICA CORRECTA: Mostrar TODAS las asignaciones activas (PLANIFICADO/ACTIVO)
--                  sin importar la fecha, hasta que se finalicen o eliminen

DROP VIEW IF EXISTS v_asignaciones_pendientes;

CREATE VIEW v_asignaciones_pendientes AS
SELECT
    t.id AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado AS turno_estado,
    t.sede_id,
    a.id AS asignacion_id,
    a.id,
    u.id AS unidad_id,
    u.codigo AS unidad_codigo,
    u.tipo_unidad,
    r.id AS ruta_id,
    r.codigo AS ruta_codigo,
    r.nombre AS ruta_nombre,
    a.km_inicio,
    a.km_final,
    a.sentido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    a.acciones,
    CASE
        WHEN t.fecha = CURRENT_DATE THEN 'HOY'
        WHEN t.fecha = CURRENT_DATE + 1 THEN 'MAÑANA'
        WHEN t.fecha < CURRENT_DATE THEN 'PENDIENTE (' || t.fecha || ')'
        ELSE t.fecha::TEXT
    END AS dia_salida,
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id', usr.id,
                'nombre_completo', usr.nombre_completo,
                'nombre', usr.nombre_completo,
                'chapa', usr.chapa,
                'telefono', usr.telefono,
                'rol_tripulacion', tc.rol_tripulacion,
                'rol', tc.rol_tripulacion
            ) ORDER BY
                CASE tc.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc
        JOIN usuario usr ON tc.usuario_id = usr.id
        WHERE tc.asignacion_id = a.id
    ) AS tripulacion
FROM turno t
JOIN asignacion_unidad a ON t.id = a.turno_id
JOIN unidad u ON a.unidad_id = u.id
LEFT JOIN ruta r ON a.ruta_id = r.id
WHERE
    -- Solo asignaciones activas, SIN IMPORTAR LA FECHA
    t.estado IN ('PLANIFICADO', 'ACTIVO')
ORDER BY t.fecha, a.hora_salida;

COMMENT ON VIEW v_asignaciones_pendientes IS
'Muestra TODAS las asignaciones activas (PLANIFICADO/ACTIVO) sin importar la fecha.
Las asignaciones permanecen visibles hasta que se finalice la jornada o se eliminen manualmente.';

-- Verificar
SELECT 'Migración 067: Vista corregida - muestra todas las asignaciones activas' AS resultado;
