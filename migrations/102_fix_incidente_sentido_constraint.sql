-- ========================================
-- FIX: Agregar ORIENTE y OCCIDENTE al constraint de sentido en tabla incidente
-- Error: 23514 - violación del constraint incidente_sentido_check
-- La app móvil envía OCCIDENTE pero el constraint solo permite: NORTE, SUR, ESTE, OESTE, ASCENDENTE, DESCENDENTE
-- ========================================

-- 1. Eliminar el constraint existente en incidente
ALTER TABLE incidente DROP CONSTRAINT IF EXISTS incidente_sentido_check;

-- 2. Agregar el nuevo constraint con ORIENTE y OCCIDENTE (igual que situacion)
ALTER TABLE incidente ADD CONSTRAINT incidente_sentido_check
CHECK (sentido IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));

-- 3. También arreglar otras tablas que puedan tener el mismo problema
ALTER TABLE actividad_unidad DROP CONSTRAINT IF EXISTS actividad_unidad_sentido_check;
ALTER TABLE actividad_unidad ADD CONSTRAINT actividad_unidad_sentido_check
CHECK (sentido IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));

ALTER TABLE reporte_horario DROP CONSTRAINT IF EXISTS reporte_horario_sentido_actual_check;
ALTER TABLE reporte_horario ADD CONSTRAINT reporte_horario_sentido_actual_check
CHECK (sentido_actual IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));

-- Verificar
SELECT 'Constraints de sentido actualizados en incidente, actividad_unidad, reporte_horario' as resultado;
SELECT 'Valores permitidos: NORTE, SUR, ESTE, OESTE, ORIENTE, OCCIDENTE, ASCENDENTE, DESCENDENTE, AMBOS' as valores;
