-- Eliminar tabla tipo_actividad (no se usa en código)
-- Fecha: 2026-02-02

-- Eliminar tabla actividad_unidad que depende de tipo_actividad
DROP TABLE IF EXISTS actividad_unidad CASCADE;

-- Eliminar tabla tipo_actividad
DROP TABLE IF EXISTS tipo_actividad CASCADE;

-- Eliminar secuencia
DROP SEQUENCE IF EXISTS tipo_actividad_id_seq;
