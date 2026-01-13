-- 094_hotfix_tipo_servicio.sql
-- Agrega columna tipo_servicio a vehiculo_accidente
-- Ejecutar en Railway

BEGIN;

-- Columna tipo_servicio para vehiculo
ALTER TABLE vehiculo_accidente
  ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(30);

COMMENT ON COLUMN vehiculo_accidente.tipo_servicio IS 'Tipo de servicio del vehiculo: PARTICULAR, COMERCIAL, OFICIAL, DIPLOMATICO, EMERGENCIA, TRANSPORTE_PUBLICO, CARGA';

COMMIT;
