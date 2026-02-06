-- ========================================
-- Migración 109: Agregar campo grupo a situacion
-- Para la boleta de accidentología (grupo 1 o 2)
-- ========================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS grupo SMALLINT;
