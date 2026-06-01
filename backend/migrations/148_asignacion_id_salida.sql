-- Migration 148: Vincular salida_unidad con asignacion_unidad
-- Agrega asignacion_id a salida_unidad (FK, SET NULL al borrar asignacion)
-- Agrega asignacion_id a bitacora_historica (integer sin FK — la asignacion se borra antes del snapshot)
-- Permite reconstrucción histórica completa y elimina join frágil por unidad_id+fecha

-- 1. Columna en salida_unidad con FK soft (SET NULL cuando finalizar_jornada_completa borre la asignacion)
ALTER TABLE salida_unidad
  ADD COLUMN IF NOT EXISTS asignacion_id INTEGER
  REFERENCES asignacion_unidad(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_salida_unidad_asignacion
  ON salida_unidad(asignacion_id)
  WHERE asignacion_id IS NOT NULL;

-- 2. Columna en bitacora_historica (sin FK — la asignacion ya fue borrada cuando se lee esto)
ALTER TABLE bitacora_historica ADD COLUMN IF NOT EXISTS asignacion_id INTEGER;

-- 3. Poblar asignacion_id en salidas ACTIVAS actuales mediante el join por unidad_id+fecha
--    (las salidas ya FINALIZADAS no tienen asignacion — fue borrada por finalizar_jornada_completa)
UPDATE salida_unidad su
SET asignacion_id = (
  SELECT au.id
  FROM asignacion_unidad au
  JOIN turno t ON au.turno_id = t.id
  WHERE au.unidad_id = su.unidad_id
    AND t.fecha = DATE(su.fecha_hora_salida AT TIME ZONE 'America/Guatemala')
  ORDER BY au.id DESC
  LIMIT 1
)
WHERE su.estado = 'EN_SALIDA'
  AND su.asignacion_id IS NULL;
