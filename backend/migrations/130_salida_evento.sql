-- Migration 130: Tabla salida_evento para auditoría del timeline de bitácora
-- Registra ediciones, cambios de ruta, inicio por COP, relevos, etc.
-- Aparece en la bitácora como "EVENTO" con quién lo hizo y qué cambió.

CREATE TABLE IF NOT EXISTS salida_evento (
  id          SERIAL PRIMARY KEY,
  salida_id   INTEGER NOT NULL REFERENCES salida_unidad(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL,
    -- 'EDICION_KM'          — brigada o COP editó km_inicial
    -- 'EDICION_COMBUSTIBLE' — brigada o COP editó combustible_inicial
    -- 'CAMBIO_RUTA'         — brigada cambió ruta durante la salida
    -- 'INICIO_COP'          — COP inició la salida (sin brigada en dispositivo)
    -- 'OBSERVACION'         — nota manual añadida por COP/brigada
  descripcion TEXT NOT NULL,
  datos_ant   JSONB,           -- valores antes del cambio
  datos_new   JSONB,           -- valores después del cambio
  realizado_por INTEGER REFERENCES usuario(id),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_salida_evento_salida ON salida_evento(salida_id);
CREATE INDEX IF NOT EXISTS idx_salida_evento_ts     ON salida_evento(created_at);
