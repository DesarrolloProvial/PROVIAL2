-- Migración 140: soporte completo para situaciones persistentes (Opción A)
-- Las situaciones persistentes SON situaciones normales con persistente=true.
-- Una brigada llega, confirma datos, y el COP promueve la situación a persistente.

-- ============================================================
-- 1. Campos adicionales en situacion para uso persistente
-- ============================================================
ALTER TABLE situacion
  ADD COLUMN IF NOT EXISTS titulo          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS descripcion     TEXT,
  ADD COLUMN IF NOT EXISTS importancia     VARCHAR(20) DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS km_fin          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS fecha_fin_estimada TIMESTAMPTZ;

-- Constraint de importancia (nullable: solo relevante cuando persistente=true)
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_importancia_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_importancia_check
  CHECK (importancia IS NULL OR importancia IN ('BAJA', 'NORMAL', 'ALTA', 'CRITICA'));

-- ============================================================
-- 2. Ampliar estados de situacion para flujo persistente
-- ============================================================
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_estado_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_estado_check
  CHECK (estado IN ('ACTIVA', 'CERRADA', 'CANCELADA', 'EN_PAUSA', 'FINALIZADA'));

-- ============================================================
-- 3. Categoría en tabla autoridad para diferenciar autorid. vs socorro
-- ============================================================
ALTER TABLE autoridad
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) DEFAULT 'AUTORIDAD';

ALTER TABLE autoridad DROP CONSTRAINT IF EXISTS autoridad_categoria_check;
ALTER TABLE autoridad ADD CONSTRAINT autoridad_categoria_check
  CHECK (categoria IN ('AUTORIDAD', 'SOCORRO'));

-- ============================================================
-- 4. Tabla de asignaciones de unidades a situaciones persistentes
-- ============================================================
CREATE TABLE IF NOT EXISTS situacion_persistente_asignacion (
  id                       SERIAL PRIMARY KEY,
  situacion_id             INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,
  unidad_id                INTEGER NOT NULL REFERENCES unidad(id),
  asignacion_unidad_id     INTEGER REFERENCES asignacion_unidad(id),
  km_asignacion            NUMERIC(8,2),
  fecha_hora_asignacion    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_hora_desasignacion TIMESTAMPTZ,
  observaciones_asignacion TEXT,
  asignado_por             INTEGER REFERENCES usuario(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spa_situacion
  ON situacion_persistente_asignacion(situacion_id);

CREATE INDEX IF NOT EXISTS idx_spa_activa
  ON situacion_persistente_asignacion(situacion_id)
  WHERE fecha_hora_desasignacion IS NULL;

-- ============================================================
-- 5. Índice para consultas rápidas de situaciones persistentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_situacion_persistente
  ON situacion(estado) WHERE persistente = true;
