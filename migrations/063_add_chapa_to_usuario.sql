-- Migración 063: Agregar columna chapa a usuario
-- Fecha: 2025-12-14

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS chapa VARCHAR(50);

COMMENT ON COLUMN usuario.chapa IS 'Número de chapa/identificación del agente';

-- Opcional: Crear índice si se va a buscar por chapa
CREATE INDEX IF NOT EXISTS idx_usuario_chapa ON usuario(chapa);
