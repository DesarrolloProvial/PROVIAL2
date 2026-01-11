-- Migración 090: Mejorar visibilidad de unidades en COP
-- Problema: Unidades desaparecen del mapa/tabla cuando cierran situaciones
-- Solución: Mostrar todas las unidades en salida activa con su última situación (activa o cerrada)

-- ========================================
-- REDEFINIR VISTA: v_ultima_situacion_unidad
-- ========================================

DROP VIEW IF EXISTS v_ultima_situacion_unidad CASCADE;

CREATE OR REPLACE VIEW v_ultima_situacion_unidad AS
WITH ultima_situacion_por_salida AS (
  SELECT DISTINCT ON (salida_unidad_id)
    id,
    uuid,
    tipo_situacion,
    estado,
    ruta_id,
    km,
    sentido,
    latitud,
    longitud,
    combustible,
    combustible_fraccion,
    kilometraje_unidad,
    descripcion,
    created_at,
    turno_id,
    salida_unidad_id
  FROM situacion
  WHERE salida_unidad_id IS NOT NULL
  ORDER BY salida_unidad_id, created_at DESC
)
SELECT
  sal.unidad_id,
  u.codigo AS unidad_codigo,
  u.tipo_unidad,
  
  -- Información de la situación (puede ser NULL si no hay situaciones aún)
  s.id AS situacion_id,
  s.uuid AS situacion_uuid,
  s.tipo_situacion,
  s.estado,
  s.ruta_id,
  r.codigo AS ruta_codigo,
  r.nombre AS ruta_nombre,
  s.km,
  s.sentido,
  s.latitud,
  s.longitud,
  s.combustible,
  s.combustible_fraccion,
  s.kilometraje_unidad,
  s.descripcion,
  s.created_at AS situacion_fecha,
  s.turno_id,
  t.fecha AS turno_fecha,
  
  -- Información de la salida
  sal.id AS salida_id,
  sal.estado AS salida_estado,
  sal.fecha_hora_salida

FROM salida_unidad sal
JOIN unidad u ON sal.unidad_id = u.id
LEFT JOIN ultima_situacion_por_salida s ON s.salida_unidad_id = sal.id
LEFT JOIN ruta r ON s.ruta_id = r.id
LEFT JOIN turno t ON s.turno_id = t.id

-- CAMBIO CLAVE: Mostrar unidades EN_SALIDA, sin importar el estado de la situación
WHERE sal.estado = 'EN_SALIDA'

ORDER BY u.codigo;

COMMENT ON VIEW v_ultima_situacion_unidad IS 
  'Unidades con salida activa y su ultima situacion reportada (activa o cerrada). Permite visualizar unidades en ruta aunque hayan cerrado su ultima situacion.';
