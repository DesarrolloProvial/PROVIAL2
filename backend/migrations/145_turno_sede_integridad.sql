-- ============================================================
-- Migración 145: Integridad turno ↔ sede
-- Garantiza que (fecha, sede_id) sea único en turno,
-- que unidades no se mezclen entre sedes en asignaciones,
-- y que brigadistas no aparezcan en dos asignaciones el mismo día.
-- ============================================================

-- 1. sede_id NOT NULL en turno (ya verificado: 0 filas NULL)
ALTER TABLE turno
  ALTER COLUMN sede_id SET NOT NULL;

-- 2. Un solo turno por fecha y sede
CREATE UNIQUE INDEX IF NOT EXISTS uq_turno_fecha_sede
  ON turno (fecha, sede_id);

-- ============================================================
-- 3. Trigger: unidad debe pertenecer a la misma sede que el turno
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validar_asignacion_sede()
RETURNS trigger AS $$
DECLARE
  v_turno_sede  INTEGER;
  v_unidad_sede INTEGER;
BEGIN
  IF NEW.unidad_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT sede_id INTO v_turno_sede  FROM turno  WHERE id = NEW.turno_id;
  SELECT sede_id INTO v_unidad_sede FROM unidad WHERE id = NEW.unidad_id;

  IF v_turno_sede IS DISTINCT FROM v_unidad_sede THEN
    RAISE EXCEPTION 'SEDE_MISMATCH: La unidad (sede_id=%) no pertenece a la sede del turno (sede_id=%)',
      v_unidad_sede, v_turno_sede;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_asignacion_sede ON asignacion_unidad;
CREATE TRIGGER trg_validar_asignacion_sede
  BEFORE INSERT OR UPDATE OF unidad_id, turno_id
  ON asignacion_unidad
  FOR EACH ROW EXECUTE FUNCTION fn_validar_asignacion_sede();

-- ============================================================
-- 4. Trigger: brigadista único por fecha (no puede estar en dos
--    unidades distintas el mismo día)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validar_tripulacion_fecha_unica()
RETURNS trigger AS $$
DECLARE
  v_fecha DATE;
  v_nombre TEXT;
BEGIN
  SELECT t.fecha INTO v_fecha
  FROM asignacion_unidad au
  JOIN turno t ON t.id = au.turno_id
  WHERE au.id = NEW.asignacion_id;

  IF EXISTS (
    SELECT 1
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON au.id = tt.asignacion_id
    JOIN turno t              ON t.id  = au.turno_id
    WHERE tt.usuario_id      = NEW.usuario_id
      AND t.fecha            = v_fecha
      AND tt.asignacion_id  <> NEW.asignacion_id
  ) THEN
    SELECT nombre_completo INTO v_nombre FROM usuario WHERE id = NEW.usuario_id;
    RAISE EXCEPTION 'USUARIO_DUPLICADO: % ya está asignado a otra unidad el %',
      COALESCE(v_nombre, 'El usuario'), v_fecha;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_tripulacion_fecha_unica ON tripulacion_turno;
CREATE TRIGGER trg_validar_tripulacion_fecha_unica
  BEFORE INSERT
  ON tripulacion_turno
  FOR EACH ROW EXECUTE FUNCTION fn_validar_tripulacion_fecha_unica();
