-- ========================================
-- FIX: Agregar ORIENTE y OCCIDENTE al constraint de sentido
-- ========================================

-- Eliminar el constraint existente
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_sentido_check;

-- Agregar el nuevo constraint con ORIENTE y OCCIDENTE
ALTER TABLE situacion ADD CONSTRAINT situacion_sentido_check
CHECK (sentido IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));

-- Verificar
SELECT 'Constraint actualizado: NORTE, SUR, ESTE, OESTE, ORIENTE, OCCIDENTE, ASCENDENTE, DESCENDENTE, AMBOS' as resultado;
