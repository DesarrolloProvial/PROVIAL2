-- Migración 138: eliminar sistema de alertas
-- El sistema de alertas automáticas (UNIDAD_SIN_MOVIMIENTO, BRIGADA_FUERA_ZONA, etc.)
-- no es viable sin GPS tracking externo. Los tipos manuales están cubiertos por
-- el sistema de notificaciones. Se elimina todo el stack.

-- 1. Vistas
DROP VIEW IF EXISTS v_mis_alertas_no_leidas CASCADE;
DROP VIEW IF EXISTS v_alertas_activas CASCADE;

-- 2. Funciones almacenadas
DROP FUNCTION IF EXISTS crear_alerta(TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS atender_alerta(INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS resolver_alerta(INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verificar_unidades_inactivas(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS verificar_inspecciones_pendientes(INTEGER) CASCADE;

-- 3. Tablas (orden: dependientes primero)
DROP TABLE IF EXISTS suscripcion_alerta CASCADE;
DROP TABLE IF EXISTS alerta_leida CASCADE;
DROP TABLE IF EXISTS alerta CASCADE;
DROP TABLE IF EXISTS configuracion_alerta CASCADE;
