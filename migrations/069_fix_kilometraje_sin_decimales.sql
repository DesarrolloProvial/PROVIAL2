-- Migración: Documentación sobre kilometraje_unidad
-- NOTA: No se puede cambiar el tipo de la columna porque hay vistas dependientes
-- En su lugar, el truncado de decimales se hace en la capa de aplicación (API)

-- El odómetro de los vehículos no tiene decimales, pero la BD mantiene NUMERIC
-- para compatibilidad con vistas existentes. El frontend muestra valores enteros.

COMMENT ON COLUMN situacion.kilometraje_unidad IS 'Odómetro del vehículo (km). Aunque es NUMERIC, siempre almacenar enteros.';
COMMENT ON COLUMN salida_unidad.km_inicial IS 'Odómetro al iniciar salida (km). Aunque es NUMERIC, siempre almacenar enteros.';
COMMENT ON COLUMN salida_unidad.km_final IS 'Odómetro al finalizar salida (km). Aunque es NUMERIC, siempre almacenar enteros.';
