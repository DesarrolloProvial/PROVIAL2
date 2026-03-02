-- Migración 119: Agregar publicado, en_ruta y salida_estado a v_asignaciones_pendientes
-- Fecha: 2026-03-02
--
-- OBJETIVO: El dashboard de operaciones necesita clasificar asignaciones en 3 estados:
--   1. Sin publicar   (turno.publicado = false)
--   2. Publicadas pendientes (turno.publicado = true, sin salida activa)
--   3. En ruta        (salida_unidad.estado = 'EN_SALIDA')
--
-- La vista anterior (migración 067) no incluía publicado, en_ruta ni salida_estado.

DROP VIEW IF EXISTS v_asignaciones_pendientes;

CREATE VIEW v_asignaciones_pendientes AS
SELECT
    t.id                        AS turno_id,
    t.fecha,
    t.fecha_fin,
    t.estado                    AS turno_estado,
    t.sede_id,
    -- Estado de publicación del turno
    COALESCE(t.publicado, false) AS publicado,
    t.fecha_publicacion,

    a.id                        AS asignacion_id,
    a.id,
    u.id                        AS unidad_id,
    u.codigo                    AS unidad_codigo,
    u.tipo_unidad,

    r.id                        AS ruta_id,
    r.codigo                    AS ruta_codigo,
    r.nombre                    AS ruta_nombre,

    a.km_inicio,
    a.km_final,
    a.sentido,
    a.hora_salida,
    a.hora_entrada_estimada,
    a.hora_salida_real,
    a.acciones,

    -- Etiqueta legible de fecha para el frontend
    CASE
        WHEN t.fecha = CURRENT_DATE             THEN 'HOY'
        WHEN t.fecha = CURRENT_DATE + INTERVAL '1 day' THEN 'MAÑANA'
        WHEN t.fecha < CURRENT_DATE             THEN 'PENDIENTE (' || t.fecha || ')'
        ELSE t.fecha::TEXT
    END AS dia_salida,

    -- Estado de la salida en tiempo real (de salida_unidad)
    su.estado                   AS salida_estado,

    -- Flag booleano: ¿tiene salida activa EN_SALIDA?
    CASE
        WHEN su.estado = 'EN_SALIDA' THEN true
        ELSE false
    END                         AS en_ruta,

    -- Timestamp de cuándo salió (útil para mostrar "en ruta desde hace X")
    su.fecha_hora_salida        AS salida_hora_real,

    -- Tripulación como JSON ordenado por rol
    (
        SELECT json_agg(
            json_build_object(
                'usuario_id',      usr.id,
                'nombre_completo', usr.nombre_completo,
                'nombre',          usr.nombre_completo,
                'chapa',           usr.chapa,
                'telefono',        usr.telefono,
                'rol_tripulacion', tc.rol_tripulacion,
                'rol',             tc.rol_tripulacion
            )
            ORDER BY
                CASE tc.rol_tripulacion
                    WHEN 'PILOTO'      THEN 1
                    WHEN 'COPILOTO'    THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                    ELSE 4
                END
        )
        FROM tripulacion_turno tc
        JOIN usuario usr ON tc.usuario_id = usr.id
        WHERE tc.asignacion_id = a.id
    ) AS tripulacion

FROM turno t
JOIN asignacion_unidad a  ON t.id = a.turno_id
JOIN unidad u             ON a.unidad_id = u.id
LEFT JOIN ruta r          ON a.ruta_id = r.id
LEFT JOIN salida_unidad su
    ON  a.unidad_id = su.unidad_id
    AND su.estado = 'EN_SALIDA'
    AND DATE(su.fecha_hora_salida) = t.fecha

WHERE
    t.estado IN ('PLANIFICADO', 'ACTIVO')

ORDER BY t.fecha, a.hora_salida;

COMMENT ON VIEW v_asignaciones_pendientes IS
'Asignaciones activas (PLANIFICADO/ACTIVO) con estado de publicación y salida en tiempo real.
Clasificación: publicado=false → borrador; publicado=true + !en_ruta → pendiente; en_ruta=true → en servicio.';

SELECT 'Migración 119: Vista v_asignaciones_pendientes actualizada con publicado, en_ruta, salida_estado' AS resultado;
