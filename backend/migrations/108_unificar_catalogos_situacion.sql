-- ========================================
-- Migración 108: Unificar catalogos
-- ========================================

-- PASO 1: Agregar columnas
ALTER TABLE catalogo_tipo_situacion ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE catalogo_tipo_situacion ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- PASO 2: Mapear categoria_id a texto
UPDATE catalogo_tipo_situacion SET categoria = 'OPERATIVO' WHERE categoria_id = 4 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'APOYO' WHERE categoria_id = 5 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'ADMINISTRATIVO' WHERE categoria_id = 6 AND categoria IS NULL;
UPDATE catalogo_tipo_situacion SET categoria = 'OTRO' WHERE categoria IS NULL;

-- PASO 3: Ajustar secuencia
SELECT setval('catalogo_tipo_situacion_id_seq', GREATEST((SELECT COALESCE(MAX(id),0) FROM catalogo_tipo_situacion),(SELECT COALESCE(MAX(id),0) FROM tipo_situacion_catalogo)) + 1);

-- PASO 4: Insertar registros
INSERT INTO catalogo_tipo_situacion (categoria, nombre, icono, color, formulario_tipo, activo, orden) SELECT tsc.categoria, tsc.nombre, tsc.icono, tsc.color, CASE WHEN tsc.categoria = 'HECHO_TRANSITO' THEN 'INCIDENTE' WHEN tsc.categoria = 'ASISTENCIA' THEN 'ASISTENCIA' WHEN tsc.categoria = 'EMERGENCIA' THEN 'EMERGENCIA' ELSE 'OTROS' END, tsc.activo, 0 FROM tipo_situacion_catalogo tsc;

-- PASO 5: Mapeo IDs
CREATE TEMP TABLE id_mapping AS SELECT tsc.id as old_id, cts.id as new_id FROM tipo_situacion_catalogo tsc JOIN catalogo_tipo_situacion cts ON cts.nombre = tsc.nombre AND cts.categoria = tsc.categoria AND cts.formulario_tipo IN ('INCIDENTE','ASISTENCIA','EMERGENCIA');

-- PASO 6: Drop FKs viejas
DO $$ BEGIN ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_tipo_hecho_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_subtipo_hecho_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE situacion_persistente DROP CONSTRAINT IF EXISTS situacion_persistente_tipo_emergencia_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- PASO 7: Actualizar referencias
UPDATE situacion s SET tipo_situacion_id = m.new_id FROM id_mapping m WHERE s.tipo_situacion_id = m.old_id;
UPDATE situacion s SET tipo_hecho_id = m.new_id FROM id_mapping m WHERE s.tipo_hecho_id = m.old_id;
UPDATE situacion s SET subtipo_hecho_id = m.new_id FROM id_mapping m WHERE s.subtipo_hecho_id = m.old_id;

-- PASO 8: Actualizar situacion_persistente
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='situacion_persistente') THEN EXECUTE 'UPDATE situacion_persistente sp SET tipo_emergencia_id = m.new_id FROM id_mapping m WHERE sp.tipo_emergencia_id = m.old_id'; END IF; END $$;

-- PASO 9: Eliminar tabla vieja
DROP TABLE IF EXISTS tipo_situacion_catalogo CASCADE;

-- PASO 10: Nuevas FKs
DO $$ BEGIN ALTER TABLE situacion ADD CONSTRAINT situacion_tipo_hecho_id_fkey FOREIGN KEY (tipo_hecho_id) REFERENCES catalogo_tipo_situacion(id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE situacion ADD CONSTRAINT situacion_subtipo_hecho_id_fkey FOREIGN KEY (subtipo_hecho_id) REFERENCES catalogo_tipo_situacion(id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='situacion_persistente') THEN EXECUTE 'ALTER TABLE situacion_persistente ADD CONSTRAINT situacion_persistente_tipo_emergencia_id_fkey FOREIGN KEY (tipo_emergencia_id) REFERENCES catalogo_tipo_situacion(id)'; END IF; END $$;

-- PASO 11: Indice
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo_situacion_categoria ON catalogo_tipo_situacion(categoria);

-- PASO 12: Verificar
SELECT categoria, COUNT(*) as total FROM catalogo_tipo_situacion GROUP BY categoria ORDER BY categoria;
