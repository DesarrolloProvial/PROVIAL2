-- =====================================================
-- MIGRACIÓN 104: Unificar situacion + incidente (Parte 1)
-- Agregar campos de incidente a tabla situacion
-- =====================================================
-- Fecha: 2026-01-24
-- IDEMPOTENTE: Puede ejecutarse múltiples veces
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CAMPOS DE CLASIFICACIÓN
-- =====================================================

-- Origen del reporte
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS origen VARCHAR(30) DEFAULT 'BRIGADA';
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_origen_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_origen_check CHECK (origen IN ('BRIGADA', 'USUARIO_PUBLICO', 'CENTRO_CONTROL'));

-- Tipo de hecho
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS tipo_hecho_id INTEGER;
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_tipo_hecho_id_fkey;
ALTER TABLE situacion ADD CONSTRAINT situacion_tipo_hecho_id_fkey FOREIGN KEY (tipo_hecho_id) REFERENCES tipo_hecho(id) ON DELETE SET NULL;

-- Subtipo de hecho
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS subtipo_hecho_id INTEGER;
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_subtipo_hecho_id_fkey;
ALTER TABLE situacion ADD CONSTRAINT situacion_subtipo_hecho_id_fkey FOREIGN KEY (subtipo_hecho_id) REFERENCES subtipo_hecho(id) ON DELETE SET NULL;

-- =====================================================
-- 2. CAMPOS DE CRONOLOGÍA
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fecha_hora_aviso TIMESTAMPTZ;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fecha_hora_asignacion TIMESTAMPTZ;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fecha_hora_llegada TIMESTAMPTZ;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fecha_hora_estabilizacion TIMESTAMPTZ;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fecha_hora_finalizacion TIMESTAMPTZ;

-- =====================================================
-- 3. CAMPOS DE VÍCTIMAS
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS hay_heridos BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS cantidad_heridos INTEGER DEFAULT 0;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS hay_fallecidos BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS cantidad_fallecidos INTEGER DEFAULT 0;

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_chk_heridos;
ALTER TABLE situacion ADD CONSTRAINT situacion_chk_heridos CHECK (
    (hay_heridos = FALSE AND cantidad_heridos = 0) OR
    (hay_heridos = TRUE AND cantidad_heridos > 0)
);

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_chk_fallecidos;
ALTER TABLE situacion ADD CONSTRAINT situacion_chk_fallecidos CHECK (
    (hay_fallecidos = FALSE AND cantidad_fallecidos = 0) OR
    (hay_fallecidos = TRUE AND cantidad_fallecidos > 0)
);

-- =====================================================
-- 4. CAMPOS DE RECURSOS REQUERIDOS
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS requiere_bomberos BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS requiere_pnc BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS requiere_ambulancia BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 5. CAMPOS DE CONDICIONES DE VÍA
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS tipo_pavimento VARCHAR(50);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS iluminacion VARCHAR(50);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS senalizacion VARCHAR(50);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS visibilidad VARCHAR(50);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS area VARCHAR(10);

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_area_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_area_check CHECK (area IS NULL OR area IN ('URBANA', 'RURAL'));

-- =====================================================
-- 6. CAMPOS DE CAUSA
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS causa_probable TEXT;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS causa_especificar TEXT;

-- =====================================================
-- 7. CAMPOS DE REPORTADOR
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS reportado_por_nombre VARCHAR(150);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS reportado_por_telefono VARCHAR(20);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS reportado_por_email VARCHAR(100);

-- =====================================================
-- 8. CAMPOS DE DAÑOS
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS danios_materiales BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS danios_infraestructura BOOLEAN DEFAULT FALSE;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS danios_descripcion TEXT;

-- =====================================================
-- 9. CAMPOS DE BOLETA
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS numero_boleta VARCHAR(20);
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS numero_boleta_secuencia INTEGER;

DROP INDEX IF EXISTS idx_situacion_numero_boleta;
CREATE UNIQUE INDEX idx_situacion_numero_boleta ON situacion(numero_boleta) WHERE numero_boleta IS NOT NULL;

-- =====================================================
-- 10. CAMPOS DE UBICACIÓN ADICIONALES
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS referencia_ubicacion TEXT;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS direccion_detallada TEXT;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS jurisdiccion VARCHAR(255);

-- =====================================================
-- 11. CAMPOS DE MULTIMEDIA
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS fotos_urls TEXT[];
ALTER TABLE situacion ADD COLUMN IF NOT EXISTS croquis_url TEXT;

-- =====================================================
-- 12. FK A SITUACION_PERSISTENTE
-- =====================================================

ALTER TABLE situacion ADD COLUMN IF NOT EXISTS situacion_persistente_id INTEGER;
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_situacion_persistente_id_fkey;
ALTER TABLE situacion ADD CONSTRAINT situacion_situacion_persistente_id_fkey
    FOREIGN KEY (situacion_persistente_id) REFERENCES situacion_persistente(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_situacion_persistente;
CREATE INDEX idx_situacion_persistente ON situacion(situacion_persistente_id) WHERE situacion_persistente_id IS NOT NULL;

-- =====================================================
-- 13. ÍNDICES
-- =====================================================

DROP INDEX IF EXISTS idx_situacion_tipo_hecho;
CREATE INDEX idx_situacion_tipo_hecho ON situacion(tipo_hecho_id) WHERE tipo_hecho_id IS NOT NULL;

DROP INDEX IF EXISTS idx_situacion_subtipo_hecho;
CREATE INDEX idx_situacion_subtipo_hecho ON situacion(subtipo_hecho_id) WHERE subtipo_hecho_id IS NOT NULL;

DROP INDEX IF EXISTS idx_situacion_origen;
CREATE INDEX idx_situacion_origen ON situacion(origen);

DROP INDEX IF EXISTS idx_situacion_hay_heridos;
CREATE INDEX idx_situacion_hay_heridos ON situacion(hay_heridos) WHERE hay_heridos = TRUE;

DROP INDEX IF EXISTS idx_situacion_hay_fallecidos;
CREATE INDEX idx_situacion_hay_fallecidos ON situacion(hay_fallecidos) WHERE hay_fallecidos = TRUE;

DROP INDEX IF EXISTS idx_situacion_fecha_aviso;
CREATE INDEX idx_situacion_fecha_aviso ON situacion(fecha_hora_aviso) WHERE fecha_hora_aviso IS NOT NULL;

-- =====================================================
-- 14. ACTUALIZAR TIPO_SITUACION CHECK
-- =====================================================

ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_tipo_situacion_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_tipo_situacion_check CHECK (tipo_situacion IN (
    'SALIDA_SEDE', 'PATRULLAJE', 'CAMBIO_RUTA', 'PARADA_ESTRATEGICA',
    'COMIDA', 'DESCANSO', 'INCIDENTE', 'EMERGENCIA', 'REGULACION_TRAFICO',
    'ASISTENCIA_VEHICULAR', 'OTROS'
));

COMMIT;

SELECT 'Migración 104 completada exitosamente' as status;
