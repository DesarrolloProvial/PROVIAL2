-- 094_boleta_campos_faltantes.sql
-- Objetivo: cubrir campos de la boleta que suelen faltar, sin romper compatibilidad.
-- Solo agrega columnas/constraints (no borra nada).

BEGIN;

-- ============================
-- 1) Campos de encabezado (boleta)
-- ============================

ALTER TABLE hoja_accidentologia
  ADD COLUMN IF NOT EXISTS area VARCHAR(10),
  ADD COLUMN IF NOT EXISTS no_grupo_operativo VARCHAR(30),
  ADD COLUMN IF NOT EXISTS material_via VARCHAR(20);

-- CHECKs (suaves; puedes endurecerlos luego)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ck_hoja_acc_area'
  ) THEN
    ALTER TABLE hoja_accidentologia
      ADD CONSTRAINT ck_hoja_acc_area
      CHECK (area IS NULL OR area IN ('URBANA','RURAL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ck_hoja_acc_material_via'
  ) THEN
    ALTER TABLE hoja_accidentologia
      ADD CONSTRAINT ck_hoja_acc_material_via
      CHECK (
        material_via IS NULL OR material_via IN
        ('ASFALTO','PAVIMENTO','ADOQUIN','TERRACERIA','EMPEDRADO','BALASTRO')
      );
  END IF;
END$$;

COMMENT ON COLUMN hoja_accidentologia.area IS 'Boleta: Area donde ocurrio el hecho (URBANA/RURAL).';
COMMENT ON COLUMN hoja_accidentologia.no_grupo_operativo IS 'Boleta: No. Grupo Operativo.';
COMMENT ON COLUMN hoja_accidentologia.material_via IS 'Boleta: Material de la via (catalogo fisico).';

-- ============================
-- 2) Documentos consignados (boleta) - por vehiculo
-- ============================

ALTER TABLE vehiculo_accidente
  ADD COLUMN IF NOT EXISTS doc_consignado_tarjeta_circulacion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_consignado_licencia_transporte BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_consignado_tarjeta_operaciones BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_consignado_poliza BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN vehiculo_accidente.doc_consignado_tarjeta_circulacion IS 'Boleta: Tarjeta de circulacion consignada.';
COMMENT ON COLUMN vehiculo_accidente.doc_consignado_licencia_transporte IS 'Boleta: Licencia de transporte consignada.';
COMMENT ON COLUMN vehiculo_accidente.doc_consignado_tarjeta_operaciones IS 'Boleta: Tarjeta de operaciones consignada.';
COMMENT ON COLUMN vehiculo_accidente.doc_consignado_poliza IS 'Boleta: Poliza/seguro consignado.';

COMMIT;
