-- Migración 144: agregar draft_created_at a situacion
-- Guarda cuándo se creó el draft en la app móvil (puede diferir de created_at
-- cuando el brigada reportó offline y sincronizó después).

ALTER TABLE situacion
  ADD COLUMN IF NOT EXISTS draft_created_at TIMESTAMPTZ;

COMMENT ON COLUMN situacion.draft_created_at IS
  'Timestamp en que se creó el draft en la app móvil. NULL si fue creado desde el panel web.';
