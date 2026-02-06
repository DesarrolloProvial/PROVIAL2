-- ========================================
-- Migración 112: Agregar sexo al piloto
-- ========================================

ALTER TABLE piloto ADD COLUMN IF NOT EXISTS sexo VARCHAR(20);
