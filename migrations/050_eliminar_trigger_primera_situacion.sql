-- ================================================
-- Migración 050: Eliminar trigger primera situacion
-- Fecha: 2025-12-11
-- Descripción: El trigger que exigía SALIDA_SEDE como primera situación
--              no es necesario porque la salida se registra en salida_unidad,
--              no como situación.
-- ================================================

-- Eliminar el trigger
DROP TRIGGER IF EXISTS trigger_verificar_primera_situacion ON situacion;

-- Eliminar la función
DROP FUNCTION IF EXISTS verificar_primera_situacion_es_salida();
