-- ========================================
-- Migracion 118: Corregir categorias y eliminar duplicados
-- ========================================
-- La migracion 108 no mapeo categoria_id 1,2,3 correctamente.
-- Ademas creo duplicados al insertar desde tipo_situacion_catalogo.
-- Este script:
--   1. Mapea old IDs -> new IDs en situacion
--   2. Desactiva los registros viejos duplicados
--   3. Corrige la categoria de registros que no tienen duplicado nuevo
--   4. Elimina la columna categoria_id

-- ============================================================
-- PASO 1: Mapeo de IDs viejos a nuevos para HECHO_TRANSITO
-- ============================================================
-- Registros viejos (categoria_id=1) -> nuevos (categoria='HECHO_TRANSITO')
CREATE TEMP TABLE id_fix_mapping (old_id INT, new_id INT, old_name TEXT, new_name TEXT);

INSERT INTO id_fix_mapping (old_id, new_id, old_name, new_name) VALUES
  (1,  128, 'Colision',                    'Colision'),
  (2,  127, 'Choque',                      'Choque'),
  (3,  139, 'Salida de pista',             'Salida De Pista'),
  (4,  130, 'Derrape',                     'Derrape'),
  (5,  126, 'Caida de carga',              'Caida De Carga'),
  (6,  132, 'Desprendimiento de carga',    'Desprendimiento'),
  (7,  131, 'Desbalance de carga',         'Desbalance De Carga'),
  (8,  135, 'Desprendimiento de neumatico','Desprendimiento De Neumatico'),
  (9,  134, 'Desprendimiento de eje',      'Desprendimiento De Eje'),
  (10, 140, 'Vehiculo incendiado',         'Vehiculo Incendiado'),
  (12, 141, 'Vuelco',                      'Vuelco'),
  (13, 137, 'Atropello',                   'Persona Atropellada'),
  (14, 138, 'Persona Fallecida',           'Persona Fallecida');

-- Casos especiales: estos no tienen equivalente exacto en HECHO_TRANSITO
-- id=11 (Ataque armado) -> 95 existe pero es ASISTENCIA
-- id=15 (Asistencia vial) -> no tiene equivalente exacto, sera corregido abajo

-- ============================================================
-- PASO 2: Actualizar referencias en situacion
-- ============================================================
-- tipo_situacion_id
UPDATE situacion s
  SET tipo_situacion_id = m.new_id
  FROM id_fix_mapping m
  WHERE s.tipo_situacion_id = m.old_id;

-- tipo_hecho_id (si existe y tiene valor viejo)
UPDATE situacion s
  SET tipo_hecho_id = m.new_id
  FROM id_fix_mapping m
  WHERE s.tipo_hecho_id = m.old_id;

-- subtipo_hecho_id
UPDATE situacion s
  SET subtipo_hecho_id = m.new_id
  FROM id_fix_mapping m
  WHERE s.subtipo_hecho_id = m.old_id;

-- ============================================================
-- PASO 3: Mapeo para EMERGENCIA (categoria_id=3)
-- ============================================================
TRUNCATE id_fix_mapping;
INSERT INTO id_fix_mapping (old_id, new_id, old_name, new_name) VALUES
  (19, 81,  'Caida de arbol',           'Caida De Arbol'),
  (20, 87,  'Desprendimiento de rocas', 'Desprendimiento De Rocas'),
  (21, 84,  'Derrumbe',                 'Derrumbe'),
  (22, 86,  'Deslave',                  'Deslave'),
  (24, 88,  'Hundimiento',              'Hundimiento'),
  (25, 90,  'Socavamiento',             'Socavamiento'),
  (26, 85,  'Desbordamiento de rio',    'Desbordamiento De Rio'),
  (28, 79,  'Acumulacion de agua',      'Acumulacion De Agua');

-- Sin equivalente nuevo: 16 (Derrame combustible), 17 (Vehiculo abandonado),
-- 18 (Detencion vehiculo), 23 (Deslizamiento tierra), 27 (Inundacion), 29 (Erupcion volcanica)

UPDATE situacion s
  SET tipo_situacion_id = m.new_id
  FROM id_fix_mapping m
  WHERE s.tipo_situacion_id = m.old_id;

-- ============================================================
-- PASO 4: Desactivar registros viejos que ya tienen reemplazo
-- ============================================================
UPDATE catalogo_tipo_situacion SET activo = false
WHERE id IN (1,2,3,4,5,6,7,8,9,10,12,13,14,  -- HECHO_TRANSITO con reemplazo
             19,20,21,22,24,25,26,28);          -- EMERGENCIA con reemplazo

-- ============================================================
-- PASO 5: Corregir categoria de registros viejos SIN reemplazo
-- (se quedan activos con la categoria correcta)
-- ============================================================
-- categoria_id=1 sin reemplazo -> HECHO_TRANSITO
UPDATE catalogo_tipo_situacion
  SET categoria = 'HECHO_TRANSITO', formulario_tipo = 'INCIDENTE'
  WHERE id = 11; -- Ataque armado (no tiene duplicado en HECHO_TRANSITO)

-- categoria_id=2 -> ASISTENCIA
UPDATE catalogo_tipo_situacion
  SET categoria = 'ASISTENCIA', formulario_tipo = 'ASISTENCIA'
  WHERE id = 15; -- Asistencia vial

-- categoria_id=3 sin reemplazo -> EMERGENCIA
UPDATE catalogo_tipo_situacion
  SET categoria = 'EMERGENCIA', formulario_tipo = 'EMERGENCIA'
  WHERE id IN (16, 17, 18, 23, 27, 29);

-- ============================================================
-- PASO 6: Eliminar columna categoria_id (ya no se usa)
-- ============================================================
ALTER TABLE catalogo_tipo_situacion DROP COLUMN IF EXISTS categoria_id;

-- ============================================================
-- PASO 7: Verificacion
-- ============================================================
SELECT categoria, COUNT(*) as total, COUNT(*) FILTER (WHERE activo) as activos
FROM catalogo_tipo_situacion
GROUP BY categoria
ORDER BY categoria;

DROP TABLE IF EXISTS id_fix_mapping;
