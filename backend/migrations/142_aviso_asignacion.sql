-- Migration 142: Crear tabla aviso_asignacion
-- Referenciada por AsignacionAvanzadaModel pero nunca creada en BD.

CREATE TABLE IF NOT EXISTS aviso_asignacion (
  id             SERIAL PRIMARY KEY,
  asignacion_id  INTEGER NOT NULL REFERENCES asignacion_unidad(id) ON DELETE CASCADE,
  tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('ADVERTENCIA', 'INFO', 'URGENTE')),
  mensaje        TEXT NOT NULL,
  color          VARCHAR(20) NOT NULL DEFAULT '#f59e0b',
  creado_por     INTEGER NOT NULL REFERENCES usuario(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aviso_asignacion_asignacion ON aviso_asignacion(asignacion_id);
