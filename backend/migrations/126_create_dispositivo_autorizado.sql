-- Migración 126: Tabla de dispositivos autorizados
-- Fecha: 2026-02-22
-- Descripción: Estructura para control de acceso por dispositivo móvil.
--   El cumplimiento es opcional y se activa con DEVICE_AUTH_ENABLED=true en .env
--   Mientras esté desactivado, los dispositivos se registran pero no se bloquean.

CREATE TABLE IF NOT EXISTS dispositivo_autorizado (
  id                SERIAL PRIMARY KEY,
  device_id         VARCHAR(255) NOT NULL UNIQUE,   -- Android ID (único por dispositivo)
  usuario_id        INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  device_model      VARCHAR(255),                   -- Ej: "Samsung Galaxy A15"
  device_os         VARCHAR(100),                   -- Ej: "Android"
  device_os_version VARCHAR(50),                    -- Ej: "14"
  app_version       VARCHAR(50),                    -- Versión de la app instalada
  estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
                    -- PENDIENTE: recién visto, sin aprobar
                    -- APROBADO:  autorizado por informática
                    -- BLOQUEADO: revocado
  notas             TEXT,
  aprobado_por      INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_dispositivo_estado CHECK (estado IN ('PENDIENTE', 'APROBADO', 'BLOQUEADO'))
);

CREATE INDEX idx_dispositivo_device_id  ON dispositivo_autorizado(device_id);
CREATE INDEX idx_dispositivo_estado     ON dispositivo_autorizado(estado);
CREATE INDEX idx_dispositivo_usuario_id ON dispositivo_autorizado(usuario_id);

COMMENT ON TABLE dispositivo_autorizado IS
  'Registro de dispositivos móviles que intentaron acceder al sistema. '
  'Control de acceso activable con env DEVICE_AUTH_ENABLED=true.';
