-- Migración: Agregar sede_id a la vista v_asignaciones_pendientes
-- Fecha: 2025-12-15
-- Descripción: Permite filtrar asignaciones por sede del usuario

DROP VIEW IF EXISTS v_asignaciones_pendientes CASCADE;

CREATE OR REPLACE VIEW v_asignaciones_pendientes AS
SELECT
  t.id AS turno_id,
  t.fecha,
  t.fecha_fin,
  t.estado AS turno_estado,
  t.sede_id,  -- Nuevo campo para filtrar por sede
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
    WHEN t.fecha = CURRENT_DATE + 1 THEN 'MANANA'
    ELSE t.fecha::text
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
      )
      ORDER BY
        CASE tc.rol_tripulacion
          WHEN 'PILOTO' THEN 1
          WHEN 'COPILOTO' THEN 2
          WHEN 'ACOMPANANTE' THEN 3
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
  (t.fecha >= CURRENT_DATE OR (t.fecha_fin IS NOT NULL AND t.fecha_fin >= CURRENT_DATE))
  AND t.estado IN ('PLANIFICADO', 'ACTIVO')
ORDER BY t.fecha, a.hora_salida;

-- Índice para mejorar búsquedas por sede
CREATE INDEX IF NOT EXISTS idx_turno_sede_fecha ON turno(sede_id, fecha);
