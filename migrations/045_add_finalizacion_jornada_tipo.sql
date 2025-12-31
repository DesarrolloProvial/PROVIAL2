-- ========================================
-- Agregar FINALIZACION_JORNADA como tipo de ingreso válido
-- ========================================

-- Actualizar constraint de tipo_ingreso en ingreso_sede
ALTER TABLE ingreso_sede DROP CONSTRAINT IF EXISTS ingreso_sede_tipo_ingreso_check;

ALTER TABLE ingreso_sede ADD CONSTRAINT ingreso_sede_tipo_ingreso_check
CHECK (tipo_ingreso IN (
  'COMBUSTIBLE',
  'COMISION',
  'APOYO',
  'ALMUERZO',
  'MANTENIMIENTO',
  'FINALIZACION',
  'FINALIZAR_JORNADA',
  'FINALIZACION_JORNADA',  -- NUEVO: usado desde IngresoSedeScreen
  'INGRESO_TEMPORAL'
));

-- Actualizar constraint de sentido en situacion (ya aplicado, pero por consistencia)
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_sentido_check;

ALTER TABLE situacion ADD CONSTRAINT situacion_sentido_check
CHECK (sentido IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));

SELECT 'Constraints actualizados correctamente' as resultado;
