-- Migration: 107_refactor_accidentologia_to_situacion.sql
-- Description: Eliminar hoja_accidentologia y vincular vehiculo_accidente/persona_accidente directamente a situacion
-- Date: 2026-01-25
-- Reason: hoja_accidentologia era una tabla intermedia vacía. situacion es la tabla padre con todos los datos.

-- ========================================
-- 1. Agregar columna situacion_id a vehiculo_accidente
-- ========================================

-- Agregar columna nullable temporalmente
ALTER TABLE vehiculo_accidente
ADD COLUMN IF NOT EXISTS situacion_id bigint;

-- Migrar datos existentes (si hay): copiar situacion_id desde hoja_accidentologia
UPDATE vehiculo_accidente va
SET situacion_id = ha.situacion_id
FROM hoja_accidentologia ha
WHERE va.hoja_accidentologia_id = ha.id
  AND va.situacion_id IS NULL;

-- Hacer NOT NULL después de migrar datos
ALTER TABLE vehiculo_accidente
ALTER COLUMN situacion_id SET NOT NULL;

-- Agregar FK a situacion
ALTER TABLE vehiculo_accidente
ADD CONSTRAINT fk_vehiculo_accidente_situacion
FOREIGN KEY (situacion_id) REFERENCES situacion(id) ON DELETE CASCADE;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_vehiculo_accidente_situacion ON vehiculo_accidente(situacion_id);

-- Eliminar FK vieja a hoja_accidentologia
ALTER TABLE vehiculo_accidente
DROP CONSTRAINT IF EXISTS vehiculo_accidente_hoja_accidentologia_id_fkey;

-- Eliminar columna vieja
ALTER TABLE vehiculo_accidente
DROP COLUMN IF EXISTS hoja_accidentologia_id;

-- ========================================
-- 2. Agregar columna situacion_id a persona_accidente
-- ========================================

-- Agregar columna nullable temporalmente
ALTER TABLE persona_accidente
ADD COLUMN IF NOT EXISTS situacion_id bigint;

-- Migrar datos existentes (si hay): copiar situacion_id desde hoja_accidentologia
UPDATE persona_accidente pa
SET situacion_id = ha.situacion_id
FROM hoja_accidentologia ha
WHERE pa.hoja_accidentologia_id = ha.id
  AND pa.situacion_id IS NULL;

-- Hacer NOT NULL después de migrar datos
ALTER TABLE persona_accidente
ALTER COLUMN situacion_id SET NOT NULL;

-- Agregar FK a situacion
ALTER TABLE persona_accidente
ADD CONSTRAINT fk_persona_accidente_situacion
FOREIGN KEY (situacion_id) REFERENCES situacion(id) ON DELETE CASCADE;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_persona_accidente_situacion ON persona_accidente(situacion_id);

-- Eliminar FK vieja a hoja_accidentologia
ALTER TABLE persona_accidente
DROP CONSTRAINT IF EXISTS persona_accidente_hoja_accidentologia_id_fkey;

-- Eliminar columna vieja
ALTER TABLE persona_accidente
DROP COLUMN IF EXISTS hoja_accidentologia_id;

-- ========================================
-- 3. Eliminar tabla hoja_accidentologia
-- ========================================

DROP TABLE IF EXISTS hoja_accidentologia CASCADE;

-- ========================================
-- 4. Comentarios actualizados
-- ========================================

COMMENT ON TABLE vehiculo_accidente IS 'Vehículos involucrados en HECHO_TRANSITO (accidentes de tránsito). Vinculados directamente a situacion.';
COMMENT ON COLUMN vehiculo_accidente.situacion_id IS 'FK a situacion (tabla padre). Solo para tipo_situacion=HECHO_TRANSITO';

COMMENT ON TABLE persona_accidente IS 'Personas afectadas en HECHO_TRANSITO (heridos/fallecidos). Vinculados directamente a situacion.';
COMMENT ON COLUMN persona_accidente.situacion_id IS 'FK a situacion (tabla padre). Solo para tipo_situacion=HECHO_TRANSITO';

-- ========================================
-- MIGRACIÓN COMPLETADA
-- ========================================
-- Verificaciones:
-- SELECT COUNT(*) FROM vehiculo_accidente WHERE situacion_id IS NOT NULL;
-- SELECT COUNT(*) FROM persona_accidente WHERE situacion_id IS NOT NULL;
-- \d vehiculo_accidente
-- \d persona_accidente
