-- =====================================================
-- MIGRACIÓN 106: Identificadores Deterministas
-- =====================================================
-- Fecha: 2026-01-24
-- IDEMPOTENTE: Puede ejecutarse múltiples veces
-- =====================================================
--
-- FORMATO SITUACION:
-- YYYYMMDD-{SEDE}-{UNIDAD}-{TIPO}-{RUTA}-{KM}-{NUM_SALIDA}
-- Ejemplo: 20260124-1-030-70-86-52-4
--
-- FORMATO SITUACION_PERSISTENTE:
-- {NUM_ANUAL}-YYYYMMDD-{RUTA}-{KM}
-- Ejemplo: 1-20260124-86-52
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 0: ELIMINAR VISTAS DEPENDIENTES
-- =====================================================

DROP VIEW IF EXISTS v_situaciones_persistentes_completas CASCADE;

-- =====================================================
-- PARTE 1: LIMPIAR TABLA SITUACION
-- =====================================================

-- 1.1 Eliminar triggers viejos
DROP TRIGGER IF EXISTS trigger_generar_numero_situacion ON situacion;
DROP FUNCTION IF EXISTS generar_numero_situacion() CASCADE;

-- 1.2 Eliminar constraint de uuid si existe
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_uuid_key;

-- 1.3 Eliminar constraint de numero_situacion si existe
ALTER TABLE situacion DROP CONSTRAINT IF EXISTS situacion_numero_situacion_key;

-- 1.4 Eliminar columnas obsoletas
ALTER TABLE situacion DROP COLUMN IF EXISTS uuid;
ALTER TABLE situacion DROP COLUMN IF EXISTS numero_situacion;

-- 1.5 Asegurar que codigo_situacion existe y es NOT NULL
-- Si hay registros sin codigo_situacion, generar uno temporal
UPDATE situacion
SET codigo_situacion = 'TEMP-' || id::TEXT || '-' || TO_CHAR(created_at, 'YYYYMMDD')
WHERE codigo_situacion IS NULL;

-- Ahora hacer NOT NULL
ALTER TABLE situacion ALTER COLUMN codigo_situacion SET NOT NULL;

-- =====================================================
-- PARTE 2: FUNCIONES PARA SITUACION
-- =====================================================

-- 2.1 Función para generar ID determinista
CREATE OR REPLACE FUNCTION fn_generar_id_situacion(
    p_fecha DATE,
    p_sede_id INTEGER,
    p_unidad_codigo VARCHAR,
    p_tipo_situacion_id INTEGER,
    p_ruta_id INTEGER,
    p_km NUMERIC,
    p_num_situacion_salida INTEGER
) RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(p_fecha, 'YYYYMMDD') || '-' ||
           COALESCE(p_sede_id::TEXT, '0') || '-' ||
           COALESCE(p_unidad_codigo, '000') || '-' ||
           COALESCE(p_tipo_situacion_id::TEXT, '0') || '-' ||
           COALESCE(p_ruta_id::TEXT, '0') || '-' ||
           COALESCE(FLOOR(p_km)::TEXT, '0') || '-' ||
           COALESCE(p_num_situacion_salida::TEXT, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2.2 Función para obtener número de situación en salida
CREATE OR REPLACE FUNCTION fn_get_num_situacion_salida(
    p_salida_unidad_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM situacion
    WHERE salida_unidad_id = p_salida_unidad_id;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: LIMPIAR TABLA SITUACION_PERSISTENTE
-- =====================================================

-- 3.1 Eliminar triggers viejos
DROP TRIGGER IF EXISTS trg_numero_situacion_persistente ON situacion_persistente;
DROP FUNCTION IF EXISTS fn_generar_numero_situacion_persistente() CASCADE;

-- 3.2 Eliminar constraints
ALTER TABLE situacion_persistente DROP CONSTRAINT IF EXISTS situacion_persistente_uuid_key;
ALTER TABLE situacion_persistente DROP CONSTRAINT IF EXISTS situacion_persistente_numero_key;

-- 3.3 Eliminar columnas obsoletas
ALTER TABLE situacion_persistente DROP COLUMN IF EXISTS uuid;
ALTER TABLE situacion_persistente DROP COLUMN IF EXISTS numero;

-- 3.4 Agregar columna id_determinista
ALTER TABLE situacion_persistente ADD COLUMN IF NOT EXISTS id_determinista VARCHAR(50);

-- =====================================================
-- PARTE 4: FUNCIONES PARA SITUACION_PERSISTENTE
-- =====================================================

-- 4.1 Secuencia anual
CREATE SEQUENCE IF NOT EXISTS seq_situacion_persistente_anual START 1;

-- 4.2 Función para obtener número anual (reinicia cada año)
CREATE OR REPLACE FUNCTION fn_get_num_anual_sp() RETURNS INTEGER AS $$
DECLARE
    v_current_year INTEGER;
    v_last_year INTEGER;
    v_next_val INTEGER;
BEGIN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT EXTRACT(YEAR FROM fecha_inicio)::INTEGER INTO v_last_year
    FROM situacion_persistente
    ORDER BY id DESC
    LIMIT 1;

    IF v_last_year IS NULL OR v_last_year < v_current_year THEN
        PERFORM SETVAL('seq_situacion_persistente_anual', 1, FALSE);
    END IF;

    RETURN NEXTVAL('seq_situacion_persistente_anual');
END;
$$ LANGUAGE plpgsql;

-- 4.3 Función para generar ID
CREATE OR REPLACE FUNCTION fn_generar_id_situacion_persistente(
    p_fecha DATE,
    p_ruta_id INTEGER,
    p_km NUMERIC,
    p_num_anual INTEGER
) RETURNS TEXT AS $$
BEGIN
    -- Formato: NUM-YYYYMMDD-RUTA-KM
    RETURN p_num_anual::TEXT || '-' ||
           TO_CHAR(p_fecha, 'YYYYMMDD') || '-' ||
           COALESCE(p_ruta_id::TEXT, '0') || '-' ||
           COALESCE(FLOOR(p_km)::TEXT, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.4 Trigger para auto-generar ID
CREATE OR REPLACE FUNCTION trg_fn_id_situacion_persistente() RETURNS TRIGGER AS $$
DECLARE
    v_num_anual INTEGER;
BEGIN
    IF NEW.id_determinista IS NULL THEN
        v_num_anual := fn_get_num_anual_sp();
        NEW.id_determinista := fn_generar_id_situacion_persistente(
            COALESCE(NEW.fecha_inicio::DATE, CURRENT_DATE),
            NEW.ruta_id,
            NEW.km_inicio,
            v_num_anual
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_id_situacion_persistente ON situacion_persistente;
CREATE TRIGGER trg_id_situacion_persistente
BEFORE INSERT ON situacion_persistente
FOR EACH ROW
EXECUTE FUNCTION trg_fn_id_situacion_persistente();

-- 4.5 Actualizar registros existentes sin id_determinista
UPDATE situacion_persistente
SET id_determinista = 'SP-TEMP-' || id::TEXT
WHERE id_determinista IS NULL;

-- 4.6 Hacer NOT NULL y único
ALTER TABLE situacion_persistente ALTER COLUMN id_determinista SET NOT NULL;

DROP INDEX IF EXISTS idx_sp_id_determinista;
CREATE UNIQUE INDEX idx_sp_id_determinista ON situacion_persistente(id_determinista);

-- =====================================================
-- PARTE 5: VISTAS
-- =====================================================

DROP VIEW IF EXISTS v_situacion_decodificada;
CREATE VIEW v_situacion_decodificada AS
SELECT
    s.id,
    s.codigo_situacion,
    SUBSTRING(s.codigo_situacion FROM 1 FOR 8) AS fecha_str,
    SPLIT_PART(s.codigo_situacion, '-', 2) AS sede_id_str,
    SPLIT_PART(s.codigo_situacion, '-', 3) AS unidad_codigo,
    SPLIT_PART(s.codigo_situacion, '-', 4) AS tipo_id_str,
    SPLIT_PART(s.codigo_situacion, '-', 5) AS ruta_id_str,
    SPLIT_PART(s.codigo_situacion, '-', 6) AS km_str,
    SPLIT_PART(s.codigo_situacion, '-', 7) AS num_salida_str,
    s.tipo_situacion,
    s.estado,
    s.created_at
FROM situacion s;

DROP VIEW IF EXISTS v_situacion_persistente_decodificada;
CREATE VIEW v_situacion_persistente_decodificada AS
SELECT
    sp.id,
    sp.id_determinista,
    SPLIT_PART(sp.id_determinista, '-', 1) AS num_anual,
    SPLIT_PART(sp.id_determinista, '-', 2) AS fecha_str,
    SPLIT_PART(sp.id_determinista, '-', 3) AS ruta_id_str,
    SPLIT_PART(sp.id_determinista, '-', 4) AS km_str,
    sp.titulo,
    sp.tipo,
    sp.estado,
    sp.fecha_inicio
FROM situacion_persistente sp;

COMMIT;

SELECT 'Migración 106 completada exitosamente' as status;

-- =====================================================
-- TEST
-- =====================================================
-- SELECT fn_generar_id_situacion('2026-01-24', 1, '030', 70, 86, 52.5, 4);
-- Resultado: 20260124-1-030-70-86-52-4
--
-- SELECT fn_generar_id_situacion_persistente('2026-01-24', 86, 52.5, 1);
-- Resultado: 1-20260124-86-52
