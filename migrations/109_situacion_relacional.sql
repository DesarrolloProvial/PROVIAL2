-- ============================================================
-- 109: Migrar detalle_situacion a tablas relacionales
-- Reemplaza el blob JSON (detalle_situacion) con:
--   - Tablas maestras con upsert (vehiculo, piloto, grua)
--   - Tablas per-situacion (autoridad, ajustador)
--   - Junction tables (situacion_vehiculo)
--   - Junction a vehiculo (vehiculo_grua, vehiculo_ajustador)
-- ============================================================

BEGIN;

-- ========================================
-- 1. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ========================================

-- situacion: soporte para situaciones persistentes
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS persistente BOOLEAN DEFAULT false;

-- vehiculo: origen del registro
ALTER TABLE vehiculo ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT 'SITUACION';

-- aseguradora: quitar columnas obsoletas, agregar nuevas
ALTER TABLE aseguradora DROP COLUMN IF EXISTS email;
ALTER TABLE aseguradora DROP COLUMN IF EXISTS total_incidentes;
ALTER TABLE aseguradora ADD COLUMN IF NOT EXISTS tipo_licencia VARCHAR(50);
ALTER TABLE aseguradora ADD COLUMN IF NOT EXISTS vehiculo_id INTEGER REFERENCES vehiculo(id);

-- grua: quitar nit, agregar columnas operativas
ALTER TABLE grua DROP COLUMN IF EXISTS nit;
ALTER TABLE grua ADD COLUMN IF NOT EXISTS ruta_id INTEGER REFERENCES ruta(id);
ALTER TABLE grua ADD COLUMN IF NOT EXISTS tipo_grua VARCHAR(50);
ALTER TABLE grua ADD COLUMN IF NOT EXISTS rango_km VARCHAR(100);
ALTER TABLE grua ADD COLUMN IF NOT EXISTS tipos_vehiculo TEXT[];

-- ========================================
-- 2. SITUACION_SESION (situaciones persistentes)
-- ========================================

CREATE TABLE IF NOT EXISTS situacion_sesion (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,
  unidad_id INTEGER NOT NULL REFERENCES unidad(id),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  reporte JSONB DEFAULT '{"entradas": []}',
  inicio TIMESTAMPTZ DEFAULT NOW(),
  fin TIMESTAMPTZ,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_situacion_sesion_situacion ON situacion_sesion(situacion_id);
CREATE INDEX IF NOT EXISTS idx_situacion_sesion_unidad ON situacion_sesion(unidad_id);

-- ========================================
-- 3. SITUACION_VEHICULO (junction situacion <-> vehiculo)
-- N vehiculos por situacion, mismo vehiculo en N situaciones
-- ========================================

CREATE TABLE IF NOT EXISTS situacion_vehiculo (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,
  vehiculo_id INTEGER NOT NULL REFERENCES vehiculo(id),
  piloto_id INTEGER REFERENCES piloto(id),
  estado_piloto VARCHAR(50),
  numero_poliza VARCHAR(100),
  personas_asistidas INTEGER DEFAULT 0,
  heridos_en_vehiculo INTEGER DEFAULT 0,
  fallecidos_en_vehiculo INTEGER DEFAULT 0,
  danos_estimados TEXT,
  observaciones TEXT,
  sancion BOOLEAN DEFAULT false,
  sancion_detalle JSONB,
  documentos_consignados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_situacion_vehiculo_sit ON situacion_vehiculo(situacion_id);
CREATE INDEX IF NOT EXISTS idx_situacion_vehiculo_veh ON situacion_vehiculo(vehiculo_id);

-- ========================================
-- 4. VEHICULO_GRUA (junction situacion_vehiculo <-> grua)
-- N gruas por vehiculo (ej: 3 gruas para mover un cabezal)
-- ========================================

CREATE TABLE IF NOT EXISTS vehiculo_grua (
  id SERIAL PRIMARY KEY,
  situacion_vehiculo_id INTEGER NOT NULL REFERENCES situacion_vehiculo(id) ON DELETE CASCADE,
  grua_id INTEGER NOT NULL REFERENCES grua(id),
  datos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehiculo_grua_sv ON vehiculo_grua(situacion_vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_grua_grua ON vehiculo_grua(grua_id);

-- ========================================
-- 5. VEHICULO_AJUSTADOR (junction situacion_vehiculo <-> aseguradora)
-- N ajustadores por vehiculo
-- empresa es el unico campo mapeable, resto en JSONB
-- ========================================

CREATE TABLE IF NOT EXISTS vehiculo_ajustador (
  id SERIAL PRIMARY KEY,
  situacion_vehiculo_id INTEGER NOT NULL REFERENCES situacion_vehiculo(id) ON DELETE CASCADE,
  aseguradora_id INTEGER REFERENCES aseguradora(id),
  datos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehiculo_ajustador_sv ON vehiculo_ajustador(situacion_vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_vehiculo_ajustador_aseg ON vehiculo_ajustador(aseguradora_id);

-- ========================================
-- 6. AUTORIDAD (per-situacion, multiples por situacion)
-- Campos mapeables: tipo, hora_llegada, hora_salida
-- Resto: datos JSONB
-- ========================================

CREATE TABLE IF NOT EXISTS autoridad (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER NOT NULL REFERENCES situacion(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  hora_llegada TIMESTAMPTZ,
  hora_salida TIMESTAMPTZ,
  datos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autoridad_situacion ON autoridad(situacion_id);
CREATE INDEX IF NOT EXISTS idx_autoridad_tipo ON autoridad(tipo);

COMMIT;
