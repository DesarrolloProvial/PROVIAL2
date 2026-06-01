-- Migration 127: View v_estadisticas_unidades
-- Provides per-unit stats used by analytics (turnos, km, combustible)

DROP VIEW IF EXISTS v_estadisticas_unidades;
CREATE VIEW v_estadisticas_unidades AS
WITH turnos_stats AS (
  SELECT
    au.unidad_id,
    COUNT(CASE WHEN t.fecha >= CURRENT_DATE - 30 THEN 1 END)  AS turnos_ultimo_mes,
    COUNT(CASE WHEN t.fecha >= CURRENT_DATE - 90 THEN 1 END)  AS turnos_ultimo_trimestre,
    MAX(t.fecha)                                               AS ultimo_turno_fecha,
    MIN(CASE WHEN t.fecha > CURRENT_DATE THEN t.fecha END)    AS proximo_turno_fecha
  FROM asignacion_unidad au
  JOIN turno t ON au.turno_id = t.id
  GROUP BY au.unidad_id
),
km_stats AS (
  SELECT
    unidad_id,
    SUM(km_recorridos) AS km_ultimo_mes
  FROM combustible_registro
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND km_recorridos IS NOT NULL
  GROUP BY unidad_id
)
SELECT
  u.id                                    AS unidad_id,
  u.codigo                                AS unidad_codigo,
  u.tipo_unidad,
  u.marca,
  u.modelo,
  u.sede_id,
  s.nombre                                AS sede_nombre,
  u.activa,
  u.nivel_combustible,
  u.combustible_actual,
  u.tipo_combustible,
  COALESCE(u.odometro_actual, 0)          AS odometro_actual,
  COALESCE(ts.turnos_ultimo_mes, 0)       AS turnos_ultimo_mes,
  COALESCE(ts.turnos_ultimo_trimestre, 0) AS turnos_ultimo_trimestre,
  ts.ultimo_turno_fecha,
  (CURRENT_DATE - ts.ultimo_turno_fecha)::int AS dias_desde_ultimo_uso,
  ts.proximo_turno_fecha,
  ks.km_ultimo_mes
FROM unidad u
JOIN sede s ON u.sede_id = s.id
LEFT JOIN turnos_stats ts ON ts.unidad_id = u.id
LEFT JOIN km_stats     ks ON ks.unidad_id = u.id;
