-- Migración 087: Refrescar triggers por cambios en tabla situacion
-- Soluciona error: plpgsql_exec_get_datum_type_info (tipo de fila NEW desactualizado)

-- ========================================
-- 1. REFRESCAR GENERAR NUMERO SITUACION
-- ========================================

DROP TRIGGER IF EXISTS trigger_generar_numero_situacion ON situacion;
DROP FUNCTION IF EXISTS generar_numero_situacion();

CREATE OR REPLACE FUNCTION generar_numero_situacion()
RETURNS TRIGGER AS $$
DECLARE
    anio INT;
    numero_secuencial INT;
    numero_final VARCHAR(50);
BEGIN
    -- Obtener año actual
    anio := EXTRACT(YEAR FROM NOW());

    -- Obtener el siguiente número secuencial del año
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(numero_situacion FROM 'SIT-[0-9]{4}-([0-9]+)')
            AS INT
        )
    ), 0) + 1
    INTO numero_secuencial
    FROM situacion
    WHERE numero_situacion LIKE 'SIT-' || anio || '-%';

    -- Generar número final con padding (ej: SIT-2025-0001)
    numero_final := 'SIT-' || anio || '-' || LPAD(numero_secuencial::TEXT, 4, '0');

    NEW.numero_situacion := numero_final;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generar_numero_situacion
    BEFORE INSERT ON situacion
    FOR EACH ROW
    WHEN (NEW.numero_situacion IS NULL)
    EXECUTE FUNCTION generar_numero_situacion();


-- ========================================
-- 2. REFRESCAR ACTUALIZAR RUTA ACTIVA
-- ========================================

DROP TRIGGER IF EXISTS trigger_situacion_actualizar_ruta_activa ON situacion;
DROP FUNCTION IF EXISTS trigger_actualizar_ruta_activa();

CREATE OR REPLACE FUNCTION trigger_actualizar_ruta_activa()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es SALIDA_SEDE o CAMBIO_RUTA, actualizar la ruta activa
    IF NEW.tipo_situacion IN ('SALIDA_SEDE', 'CAMBIO_RUTA') THEN
        IF NEW.ruta_id IS NOT NULL AND NEW.asignacion_id IS NOT NULL THEN
            -- Llamar a la función auxiliar existente
            PERFORM actualizar_ruta_activa(NEW.asignacion_id, NEW.ruta_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_situacion_actualizar_ruta_activa
    AFTER INSERT ON situacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_ruta_activa();
