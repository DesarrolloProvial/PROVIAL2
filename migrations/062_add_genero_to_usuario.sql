-- Migración 062: Agregar columna genero a usuario
-- Fecha: 2025-12-13

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS genero VARCHAR(20);

COMMENT ON COLUMN usuario.genero IS 'Género del usuario (M/F)';
