-- Migration 151: Actualizar v_asignaciones_por_sede para usar asignacion_id en el join
-- Antes: LEFT JOIN salida_unidad ON unidad_id + fecha + estado=EN_SALIDA (solo activas, frágil)
-- Ahora: JOIN prioritario por asignacion_id, fallback por unidad_id+fecha para retrocompat.

DROP VIEW IF EXISTS v_asignaciones_por_sede;

CREATE VIEW v_asignaciones_por_sede AS
SELECT
    t.id             AS turno_id,
    t.fecha,
    t.estado         AS turno_estado,
    t.publicado,
    t.fecha_publicacion,
    t.sede_id,
    s.nombre         AS sede_nombre,
    s.codigo         AS sede_codigo,
    t.creado_por,
    uc.nombre_completo AS creado_por_nombre,
    cv.color_fondo,
    cv.color_fondo_header,
    cv.color_texto,
    cv.color_acento,
    cv.fuente,
    cv.tamano_fuente,
    cv.alerta_rotacion_rutas_activa,
    cv.umbral_rotacion_rutas,
    au.id            AS asignacion_id,
    au.unidad_id,
    u.codigo         AS unidad_codigo,
    u.tipo_unidad,
    u.placa          AS unidad_placa,
    au.ruta_id,
    r.codigo         AS ruta_codigo,
    r.nombre         AS ruta_nombre,
    au.km_inicio,
    au.km_final,
    au.sentido,
    au.acciones,
    au.acciones_formato,
    au.hora_salida,
    au.estado_nomina,
    CASE WHEN su.estado = 'EN_SALIDA' THEN true ELSE false END AS en_ruta,
    su.estado        AS salida_estado,
    su.id            AS salida_id,
    au.created_at    AS asignacion_created_at
FROM turno t
LEFT JOIN sede s                   ON t.sede_id = s.id
LEFT JOIN usuario uc               ON t.creado_por = uc.id
LEFT JOIN configuracion_visual_sede cv ON t.sede_id = cv.sede_id
LEFT JOIN asignacion_unidad au     ON t.id = au.turno_id
LEFT JOIN unidad u                 ON au.unidad_id = u.id
LEFT JOIN ruta r                   ON au.ruta_id = r.id
-- JOIN prioritario por asignacion_id (exacto); fallback por unidad_id+fecha (retrocompat)
LEFT JOIN LATERAL (
    SELECT su_inner.*
    FROM salida_unidad su_inner
    WHERE su_inner.estado = 'EN_SALIDA'
      AND (
          su_inner.asignacion_id = au.id
          OR (
              su_inner.asignacion_id IS NULL
              AND su_inner.unidad_id = au.unidad_id
              AND DATE(su_inner.fecha_hora_salida AT TIME ZONE 'America/Guatemala') = t.fecha
          )
      )
    LIMIT 1
) su ON true
ORDER BY t.sede_id, au.hora_salida;
