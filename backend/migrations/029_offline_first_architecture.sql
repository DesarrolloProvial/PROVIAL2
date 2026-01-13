-- ========================================
-- MIGRACIÓN 029: Arquitectura Offline-First
-- ========================================
-- Objetivo: Permitir guardar incidentes + evidencia local primero,
--           luego sincronizar al backend con reintentos seguros.
--
-- Cambios:
-- 1. Tabla incidente_draft (borrador local que se sincroniza después)
-- 2. Modificar situacion_multimedia (permitir draft_uuid, idempotencia)
-- 3. Tabla idempotency_keys (reintentos seguros sin duplicar)
-- ========================================

-- ========================================
-- 1. TABLA: incidente_draft
-- ========================================
-- Almacena borradores de incidentes antes de crear el registro final
CREATE TABLE IF NOT EXISTS incidente_draft (
  draft_uuid UUID PRIMARY KEY,

  -- Estado de sincronización
  estado_sync VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
  -- Estados: LOCAL | EN_PROCESO | SINCRONIZADO | ERROR

  -- Payload completo del formulario (JSON)
  payload_json JSONB NOT NULL,

  -- Metadata
  usuario_id INT NOT NULL REFERENCES usuario(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP NULL,

  -- Referencia al incidente final (cuando se sincroniza)
  incidente_id INT NULL REFERENCES incidente(id),
  situacion_id INT NULL REFERENCES situacion(id),

  -- Información de errores
  error_message TEXT NULL,
  sync_attempts INT DEFAULT 0,
  last_sync_attempt TIMESTAMP NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_incidente_draft_estado ON incidente_draft(estado_sync);
CREATE INDEX IF NOT EXISTS idx_incidente_draft_usuario ON incidente_draft(usuario_id);
CREATE INDEX IF NOT EXISTS idx_incidente_draft_created ON incidente_draft(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidente_draft_sync_attempts ON incidente_draft(sync_attempts) WHERE estado_sync IN ('LOCAL', 'ERROR');

-- Comentarios
COMMENT ON TABLE incidente_draft IS 'Borradores de incidentes que se sincronizan desde la app móvil';
COMMENT ON COLUMN incidente_draft.draft_uuid IS 'UUID generado en el cliente (móvil)';
COMMENT ON COLUMN incidente_draft.estado_sync IS 'LOCAL: guardado solo local | EN_PROCESO: sincronizando | SINCRONIZADO: exitoso | ERROR: falló';
COMMENT ON COLUMN incidente_draft.payload_json IS 'JSON completo del formulario de incidente';

-- ========================================
-- 2. MODIFICAR: situacion_multimedia
-- ========================================
-- Permitir evidencia sin situacion_id (asociada a draft_uuid)
-- Agregar idempotencia con cloudinary_public_id único

-- Hacer situacion_id opcional (ahora puede ser NULL)
ALTER TABLE situacion_multimedia
  ALTER COLUMN situacion_id DROP NOT NULL;

-- Agregar columnas para offline-first
ALTER TABLE situacion_multimedia
  ADD COLUMN IF NOT EXISTS draft_uuid UUID NULL,
  ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS upload_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP NULL;

-- Estados de evidencia:
-- PENDIENTE: no subida aún
-- SUBIDA: subida a Cloudinary, no registrada en BD
-- REGISTRADA: registrada exitosamente en BD
-- ERROR: falló la subida o registro

-- Índices
CREATE INDEX IF NOT EXISTS idx_multimedia_draft ON situacion_multimedia(draft_uuid) WHERE draft_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_multimedia_estado ON situacion_multimedia(estado);
CREATE INDEX IF NOT EXISTS idx_multimedia_cloudinary ON situacion_multimedia(cloudinary_public_id) WHERE cloudinary_public_id IS NOT NULL;

-- Constraint único: evitar duplicados por cloudinary_public_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_multimedia_cloudinary_public_id
  ON situacion_multimedia(cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;

-- Constraint: debe tener draft_uuid O situacion_id (al menos uno)
ALTER TABLE situacion_multimedia
  DROP CONSTRAINT IF EXISTS chk_multimedia_ref,
  ADD CONSTRAINT chk_multimedia_ref CHECK (
    (draft_uuid IS NOT NULL) OR (situacion_id IS NOT NULL)
  );

-- Comentarios
COMMENT ON COLUMN situacion_multimedia.draft_uuid IS 'UUID del draft al que pertenece (antes de sincronizar)';
COMMENT ON COLUMN situacion_multimedia.cloudinary_public_id IS 'Public ID de Cloudinary (único, evita duplicados)';
COMMENT ON COLUMN situacion_multimedia.estado IS 'PENDIENTE | SUBIDA | REGISTRADA | ERROR';
COMMENT ON COLUMN situacion_multimedia.upload_attempts IS 'Número de intentos de subida/registro';

-- ========================================
-- 3. TABLA: idempotency_keys
-- ========================================
-- Almacena respuestas de endpoints para reintentos seguros
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key UUID PRIMARY KEY,
  endpoint VARCHAR(500) NOT NULL,
  request_body_hash VARCHAR(64) NULL, -- SHA256 del body para validación extra
  response_status INT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Índice para expiración (cleanup)
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_endpoint ON idempotency_keys(endpoint);

-- Comentarios
COMMENT ON TABLE idempotency_keys IS 'Cache de respuestas para reintentos idempotentes';
COMMENT ON COLUMN idempotency_keys.key IS 'UUID enviado en header Idempotency-Key';
COMMENT ON COLUMN idempotency_keys.endpoint IS 'Ruta del endpoint llamado';
COMMENT ON COLUMN idempotency_keys.response_json IS 'Respuesta original cacheada';

-- ========================================
-- 4. FUNCIÓN: Limpiar idempotency_keys viejas
-- ========================================
-- Job para ejecutar diariamente
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_idempotency_keys IS 'Elimina idempotency_keys expiradas (ejecutar diariamente)';

-- ========================================
-- 5. TABLAS PARA EMERGENCIA Y ASISTENCIA DRAFTS
-- ========================================
-- Misma estructura que incidente_draft pero para otros tipos

CREATE TABLE IF NOT EXISTS emergencia_draft (
  draft_uuid UUID PRIMARY KEY,
  estado_sync VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
  payload_json JSONB NOT NULL,
  usuario_id INT NOT NULL REFERENCES usuario(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP NULL,
  emergencia_id INT NULL,
  situacion_id INT NULL REFERENCES situacion(id),
  error_message TEXT NULL,
  sync_attempts INT DEFAULT 0,
  last_sync_attempt TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_emergencia_draft_estado ON emergencia_draft(estado_sync);
CREATE INDEX IF NOT EXISTS idx_emergencia_draft_usuario ON emergencia_draft(usuario_id);

CREATE TABLE IF NOT EXISTS asistencia_draft (
  draft_uuid UUID PRIMARY KEY,
  estado_sync VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
  payload_json JSONB NOT NULL,
  usuario_id INT NOT NULL REFERENCES usuario(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP NULL,
  asistencia_id INT NULL,
  situacion_id INT NULL REFERENCES situacion(id),
  error_message TEXT NULL,
  sync_attempts INT DEFAULT 0,
  last_sync_attempt TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_asistencia_draft_estado ON asistencia_draft(estado_sync);
CREATE INDEX IF NOT EXISTS idx_asistencia_draft_usuario ON asistencia_draft(usuario_id);

-- ========================================
-- 6. VISTA: Resumen de drafts pendientes
-- ========================================
CREATE OR REPLACE VIEW v_drafts_pendientes AS
SELECT
  'INCIDENTE' as tipo_draft,
  draft_uuid,
  estado_sync,
  usuario_id,
  created_at,
  sync_attempts,
  last_sync_attempt,
  error_message,
  (SELECT COUNT(*) FROM situacion_multimedia WHERE draft_uuid = id.draft_uuid) as evidencias_count
FROM incidente_draft id
WHERE estado_sync IN ('LOCAL', 'ERROR')

UNION ALL

SELECT
  'EMERGENCIA' as tipo_draft,
  draft_uuid,
  estado_sync,
  usuario_id,
  created_at,
  sync_attempts,
  last_sync_attempt,
  error_message,
  (SELECT COUNT(*) FROM situacion_multimedia WHERE draft_uuid = ed.draft_uuid) as evidencias_count
FROM emergencia_draft ed
WHERE estado_sync IN ('LOCAL', 'ERROR')

UNION ALL

SELECT
  'ASISTENCIA' as tipo_draft,
  draft_uuid,
  estado_sync,
  usuario_id,
  created_at,
  sync_attempts,
  last_sync_attempt,
  error_message,
  (SELECT COUNT(*) FROM situacion_multimedia WHERE draft_uuid = ad.draft_uuid) as evidencias_count
FROM asistencia_draft ad
WHERE estado_sync IN ('LOCAL', 'ERROR')

ORDER BY created_at DESC;

COMMENT ON VIEW v_drafts_pendientes IS 'Vista unificada de todos los drafts pendientes de sincronización';

-- ========================================
-- MIGRACIÓN COMPLETADA
-- ========================================
-- Verificaciones:
-- SELECT COUNT(*) FROM incidente_draft;
-- SELECT COUNT(*) FROM idempotency_keys;
-- SELECT COUNT(*) FROM situacion_multimedia WHERE draft_uuid IS NOT NULL;
-- SELECT * FROM v_drafts_pendientes;
