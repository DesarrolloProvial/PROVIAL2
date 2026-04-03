-- Agregar columna origen a salida_unidad para distinguir cómo se inició la salida
ALTER TABLE salida_unidad
  ADD COLUMN IF NOT EXISTS origen VARCHAR(30) DEFAULT 'APP'
    CHECK (origen IN ('APP', 'COP_EMERGENCIA', 'MANUAL'));

-- Marcar salidas anteriores iniciadas por COP como COP_EMERGENCIA
UPDATE salida_unidad su
SET origen = 'COP_EMERGENCIA'
WHERE EXISTS (
  SELECT 1 FROM salida_evento se
  WHERE se.salida_id = su.id AND se.tipo = 'INICIO_COP'
)
AND su.origen = 'APP';

CREATE INDEX IF NOT EXISTS idx_salida_unidad_origen ON salida_unidad(origen);
