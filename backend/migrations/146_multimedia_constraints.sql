-- Migración 146: Constraints de integridad para situacion_multimedia
-- Previene orden duplicado de fotos y video duplicado por infografía

-- Limpiar duplicados de fotos antes de crear el índice único
-- (ante subidas simultáneas o reintentos que hayan generado duplicados)
DELETE FROM situacion_multimedia sm1
USING situacion_multimedia sm2
WHERE sm1.id < sm2.id
  AND sm1.situacion_id IS NOT NULL
  AND sm1.situacion_id = sm2.situacion_id
  AND sm1.infografia_numero = sm2.infografia_numero
  AND sm1.tipo = 'FOTO'
  AND sm1.orden IS NOT NULL
  AND sm1.orden = sm2.orden;

DELETE FROM situacion_multimedia sm1
USING situacion_multimedia sm2
WHERE sm1.id < sm2.id
  AND sm1.actividad_id IS NOT NULL
  AND sm1.actividad_id = sm2.actividad_id
  AND sm1.infografia_numero = sm2.infografia_numero
  AND sm1.tipo = 'FOTO'
  AND sm1.orden IS NOT NULL
  AND sm1.orden = sm2.orden;

-- Limpiar videos duplicados por infografía (mantener el más reciente)
DELETE FROM situacion_multimedia sm1
USING situacion_multimedia sm2
WHERE sm1.id < sm2.id
  AND sm1.situacion_id IS NOT NULL
  AND sm1.situacion_id = sm2.situacion_id
  AND sm1.infografia_numero = sm2.infografia_numero
  AND sm1.tipo = 'VIDEO';

DELETE FROM situacion_multimedia sm1
USING situacion_multimedia sm2
WHERE sm1.id < sm2.id
  AND sm1.actividad_id IS NOT NULL
  AND sm1.actividad_id = sm2.actividad_id
  AND sm1.infografia_numero = sm2.infografia_numero
  AND sm1.tipo = 'VIDEO';

-- Índice único: una foto no puede repetir orden en la misma infografía/situación
CREATE UNIQUE INDEX IF NOT EXISTS uq_sm_situacion_inf_foto_orden
  ON situacion_multimedia(situacion_id, infografia_numero, orden)
  WHERE situacion_id IS NOT NULL AND tipo = 'FOTO' AND orden IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sm_actividad_inf_foto_orden
  ON situacion_multimedia(actividad_id, infografia_numero, orden)
  WHERE actividad_id IS NOT NULL AND tipo = 'FOTO' AND orden IS NOT NULL;

-- Índice único: un solo video por infografía/entidad
CREATE UNIQUE INDEX IF NOT EXISTS uq_sm_situacion_inf_video
  ON situacion_multimedia(situacion_id, infografia_numero)
  WHERE situacion_id IS NOT NULL AND tipo = 'VIDEO';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sm_actividad_inf_video
  ON situacion_multimedia(actividad_id, infografia_numero)
  WHERE actividad_id IS NOT NULL AND tipo = 'VIDEO';
