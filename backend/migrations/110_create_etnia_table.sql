-- ========================================
-- Migración 110: Crear tabla etnia
-- ========================================

CREATE TABLE IF NOT EXISTS etnia (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true
);

INSERT INTO etnia (nombre) VALUES
  ('Ladino'),
  ('Maya'),
  ('Garífuna'),
  ('Xinca'),
  ('Mestizo'),
  ('Extranjero'),
  ('No determinado')
ON CONFLICT (nombre) DO NOTHING;
