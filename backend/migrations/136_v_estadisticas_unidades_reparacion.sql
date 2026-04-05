-- Migration 136: Agregar en_reparacion y reparacion_motivo a v_estadisticas_unidades
-- Permite que analytics muestre estado de taller sin query separado

CREATE OR REPLACE VIEW v_estadisticas_unidades AS
  WITH turnos_stats AS (
    SELECT
      au.unidad_id,
      count(
        CASE WHEN t.fecha >= (CURRENT_DATE - 30) THEN 1 ELSE NULL::integer END
      ) AS turnos_ultimo_mes,
      count(
        CASE WHEN t.fecha >= (CURRENT_DATE - 90) THEN 1 ELSE NULL::integer END
      ) AS turnos_ultimo_trimestre,
      max(t.fecha) AS ultimo_turno_fecha,
      min(
        CASE WHEN t.fecha > CURRENT_DATE THEN t.fecha ELSE NULL::date END
      ) AS proximo_turno_fecha
    FROM asignacion_unidad au
    JOIN turno t ON au.turno_id = t.id
    GROUP BY au.unidad_id
  ),
  km_stats AS (
    SELECT
      combustible_registro.unidad_id,
      sum(combustible_registro.km_recorridos) AS km_ultimo_mes
    FROM combustible_registro
    WHERE combustible_registro.created_at >= (now() - '30 days'::interval)
      AND combustible_registro.km_recorridos IS NOT NULL
    GROUP BY combustible_registro.unidad_id
  )
  SELECT
    u.id                                          AS unidad_id,
    u.codigo                                      AS unidad_codigo,
    u.tipo_unidad,
    u.marca,
    u.modelo,
    u.sede_id,
    s.nombre                                      AS sede_nombre,
    u.activa,
    u.nivel_combustible,
    u.combustible_actual,
    u.tipo_combustible,
    COALESCE(u.odometro_actual, 0::numeric)        AS odometro_actual,
    COALESCE(ts.turnos_ultimo_mes, 0::bigint)      AS turnos_ultimo_mes,
    COALESCE(ts.turnos_ultimo_trimestre, 0::bigint) AS turnos_ultimo_trimestre,
    ts.ultimo_turno_fecha,
    CURRENT_DATE - ts.ultimo_turno_fecha           AS dias_desde_ultimo_uso,
    ts.proximo_turno_fecha,
    ks.km_ultimo_mes,
    (rep.id IS NOT NULL)                           AS en_reparacion,
    rep.motivo                                     AS reparacion_motivo
  FROM unidad u
  JOIN sede s ON u.sede_id = s.id
  LEFT JOIN turnos_stats ts ON ts.unidad_id = u.id
  LEFT JOIN km_stats ks ON ks.unidad_id = u.id
  LEFT JOIN unidad_reparacion rep
         ON rep.unidad_id = u.id AND rep.estado = 'EN_REPARACION';
