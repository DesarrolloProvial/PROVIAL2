-- Add actividad_id column to situacion_multimedia to support activity multimedia
ALTER TABLE situacion_multimedia ADD COLUMN IF NOT EXISTS actividad_id BIGINT REFERENCES actividad(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_multimedia_actividad ON situacion_multimedia(actividad_id);

-- Update check constraint to allow actividad_id as valid reference
ALTER TABLE situacion_multimedia DROP CONSTRAINT IF EXISTS chk_multimedia_ref;
ALTER TABLE situacion_multimedia ADD CONSTRAINT chk_multimedia_ref
  CHECK (draft_uuid IS NOT NULL OR situacion_id IS NOT NULL OR actividad_id IS NOT NULL);

-- Drop old unique constraint and create separate partial constraints
ALTER TABLE situacion_multimedia DROP CONSTRAINT IF EXISTS uq_situacion_infografia_tipo_orden;
CREATE UNIQUE INDEX IF NOT EXISTS uq_situacion_infografia_tipo_orden
  ON situacion_multimedia (situacion_id, infografia_numero, tipo, orden)
  WHERE situacion_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividad_infografia_tipo_orden
  ON situacion_multimedia (actividad_id, infografia_numero, tipo, orden)
  WHERE actividad_id IS NOT NULL;
