-- Agregar SOLEADO al CHECK constraint de situacion.clima
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_clima_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_clima_check
  CHECK (clima IS NULL OR clima = ANY(ARRAY[
    'DESPEJADO','NUBLADO','LLUVIA','NEBLINA','TORMENTA','SOLEADO'
  ]));
