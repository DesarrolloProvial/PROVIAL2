-- Migration 128: Table unidad_reparacion
-- Tracks repair periods (time in workshop) for fleet units

CREATE TABLE IF NOT EXISTS unidad_reparacion (
  id             SERIAL PRIMARY KEY,
  unidad_id      INTEGER      NOT NULL REFERENCES unidad(id) ON DELETE CASCADE,
  motivo         VARCHAR(200) NOT NULL,
  descripcion    TEXT,
  fecha_inicio   DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin      DATE,
  estado         VARCHAR(20)  NOT NULL DEFAULT 'EN_REPARACION'
                   CHECK (estado IN ('EN_REPARACION', 'COMPLETADA', 'CANCELADA')),
  registrado_por INTEGER      REFERENCES usuario(id),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reparacion_unidad ON unidad_reparacion(unidad_id);
CREATE INDEX IF NOT EXISTS idx_reparacion_estado  ON unidad_reparacion(estado);
