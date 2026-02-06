-- ========================================
-- Migración 108: Unificar catalogo_tipo_situacion y tipo_situacion_catalogo
-- en una sola tabla: catalogo_tipo_situacion
-- ========================================

BEGIN;

-- 1. Agregar columnas faltantes a catalogo_tipo_situacion
ALTER TABLE catalogo_tipo_situacion ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE catalogo_tipo_situacion ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- 2. Mapear categoria_id numérico a texto en registros existentes
UPDATE catalogo_tipo_situacion SET categoria = 'OPERATIVO' WHERE categoria_id = 4 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'APOYO' WHERE categoria_id = 5 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'ADMINISTRATIVO' WHERE categoria_id = 6 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'OTRO' WHERE categoria IS NULL;

-- 3. Ajustar secuencia para nuevos IDs
SELECT setval('catalogo_tipo_situacion_id_seq', GREATEST(
  (SELECT COALESCE(MAX(id), 0) FROM catalogo_tipo_situacion),
  (SELECT COALESCE(MAX(id), 0) FROM tipo_situacion_catalogo)
) + 1);

-- 4. Insertar registros de tipo_situacion_catalogo con IDs NUEVOS
INSERT INTO catalogo_tipo_situacion (categoria, nombre, icono, color, formulario_tipo, activo, orden)
SELECT
  tsc.categoria,
  tsc.nombre,
  tsc.icono,
  tsc.color,
  CASE
    WHEN tsc.categoria = 'HECHO_TRANSITO' THEN 'INCIDENTE'
    WHEN tsc.categoria = 'ASISTENCIA' THEN 'ASISTENCIA'
    WHEN tsc.categoria = 'EMERGENCIA' THEN 'EMERGENCIA'
    ELSE 'OTROS'
  END as formulario_tipo,
  tsc.activo,
  0 as orden
FROM tipo_situacion_catalogo tsc;

-- 5. Crear mapeo de IDs viejos → nuevos
CREATE TEMP TABLE id_mapping AS
SELECT
  tsc.id as old_id,
  cts.id as new_id
FROM tipo_situacion_catalogo tsc
JOIN catalogo_tipo_situacion cts
  ON cts.nombre = tsc.nombre
  AND cts.categoria = tsc.categoria
  AND cts.formulario_tipo IN ('INCIDENTE', 'ASISTENCIA', 'EMERGENCIA');

-- 6. Eliminar foreign keys viejas que apuntan a tipo_situacion_catalogo
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_tipo_hecho_id_fkey;
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_subtipo_hecho_id_fkey;
ALTER TABLE situacion_persistente DROP CONSTRAINT IF EXISTS situacion_persistente_tipo_emergencia_id_fkey;

-- 7. Actualizar todas las referencias en situacion
UPDATE situacion s SET tipo_situacion_id = m.new_id
FROM id_mapping m WHERE s.tipo_situacion_id = m.old_id;

UPDATE situacion s SET tipo_hecho_id = m.new_id
FROM id_mapping m WHERE s.tipo_hecho_id = m.old_id;

UPDATE situacion s SET subtipo_hecho_id = m.new_id
FROM id_mapping m WHERE s.subtipo_hecho_id = m.old_id;

-- 8. Actualizar referencias en situacion_persistente (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'situacion_persistente') THEN
    EXECUTE '
      UPDATE situacion_persistente sp SET tipo_emergencia_id = m.new_id
      FROM id_mapping m WHERE sp.tipo_emergencia_id = m.old_id
    ';
  END IF;
END $$;

-- 9. Eliminar tabla vieja
DROP TABLE IF EXISTS tipo_situacion_catalogo CASCADE;

-- 10. Crear nuevas foreign keys apuntando a catalogo_tipo_situacion
ALTER TABLE situacion ADD CONSTRAINT situacion_tipo_hecho_id_fkey
  FOREIGN KEY (tipo_hecho_id) REFERENCES catalogo_tipo_situacion(id);

ALTER TABLE situacion ADD CONSTRAINT situacion_subtipo_hecho_id_fkey
  FOREIGN KEY (subtipo_hecho_id) REFERENCES catalogo_tipo_situacion(id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'situacion_persistente') THEN
    EXECUTE '
      ALTER TABLE situacion_persistente ADD CONSTRAINT situacion_persistente_tipo_emergencia_id_fkey
        FOREIGN KEY (tipo_emergencia_id) REFERENCES catalogo_tipo_situacion(id)
    ';
  END IF;
END $$;

-- 11. Crear índice por categoría
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo_situacion_categoria
  ON catalogo_tipo_situacion(categoria);

-- 12. Limpiar
DROP TABLE IF EXISTS id_mapping;

-- 13. Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada';
  RAISE NOTICE 'Total registros: %', (SELECT COUNT(*) FROM catalogo_tipo_situacion);
  RAISE NOTICE 'Categorías: %', (SELECT string_agg(DISTINCT categoria, ', ' ORDER BY categoria) FROM catalogo_tipo_situacion);
END $$;

COMMIT;
