-- ========================================
-- Migración 111: Renombrar vehiculo_ajustador a vehiculo_aseguradora
-- ========================================

ALTER TABLE IF EXISTS vehiculo_ajustador RENAME TO vehiculo_aseguradora;
