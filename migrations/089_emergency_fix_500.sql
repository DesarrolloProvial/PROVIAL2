-- Migración 089: Solución de Emergencia Error 500 (Consolidado)
-- Incluye:
-- 1. Fix Schema (086): Asegurar salida_unidad_id y columnas nulleables
-- 2. Refresh Triggers (087): Recompilar funciones PL/pgSQL
-- 3. Fix Logic (088): Corregir nombre de columna en trigger de alertas

-- ==========================================
-- PARTE 1: ESQUEMA (086)
-- ==========================================

-- Asegurar que salida_unidad_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'situacion'
        AND column_name = 'salida_unidad_id'
    ) THEN
        ALTER TABLE situacion ADD COLUMN salida_unidad_id INT REFERENCES salida_unidad(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Asegurar que campos opcionales sean NULLABLE
ALTER TABLE situacion ALTER COLUMN turno_id DROP NOT NULL;
ALTER TABLE situacion ALTER COLUMN asignacion_id DROP NOT NULL;
ALTER TABLE situacion ALTER COLUMN salida_unidad_id DROP NOT NULL;

-- Asegurar compatibilidad en inspeccion_360
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'inspeccion_360'
        AND column_name = 'fecha_aprobacion'
    ) THEN
        ALTER TABLE inspeccion_360 ADD COLUMN fecha_aprobacion TIMESTAMPTZ;
    END IF;
END $$;

-- ==========================================
-- PARTE 2: REFRESCAR TRIGGERS (087)
-- ==========================================

DROP TRIGGER IF EXISTS trigger_generar_numero_situacion ON situacion;
DROP FUNCTION IF EXISTS generar_numero_situacion();

CREATE OR REPLACE FUNCTION generar_numero_situacion()
RETURNS TRIGGER AS $$
DECLARE
    anio INT;
    numero_secuencial INT;
    numero_final VARCHAR(50);
BEGIN
    anio := EXTRACT(YEAR FROM NOW());

    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(numero_situacion FROM 'SIT-[0-9]{4}-([0-9]+)')
            AS INT
        )
    ), 0) + 1
    INTO numero_secuencial
    FROM situacion
    WHERE numero_situacion LIKE 'SIT-' || anio || '-%';

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


DROP TRIGGER IF EXISTS trigger_situacion_actualizar_ruta_activa ON situacion;
DROP FUNCTION IF EXISTS trigger_actualizar_ruta_activa();

CREATE OR REPLACE FUNCTION trigger_actualizar_ruta_activa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_situacion IN ('SALIDA_SEDE', 'CAMBIO_RUTA') THEN
        IF NEW.ruta_id IS NOT NULL AND NEW.asignacion_id IS NOT NULL THEN
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

-- ==========================================
-- PARTE 3: CORREGIR LÓGICA ALETA (088)
-- ==========================================

DROP TRIGGER IF EXISTS trg_alerta_emergencia ON situacion;
DROP FUNCTION IF EXISTS trigger_alerta_emergencia();

CREATE OR REPLACE FUNCTION trigger_alerta_emergencia()
RETURNS TRIGGER AS $$
DECLARE
    v_ubicacion TEXT;
BEGIN
    -- FIX: Usar 'tipo_situacion' en lugar de 'tipo'
    IF NEW.tipo_situacion = 'EMERGENCIA' OR NEW.tipo_situacion = 'INCIDENTE' THEN
        
        IF NEW.ubicacion_manual THEN
            v_ubicacion := 'Ubicación Manual Lat: ' || NEW.latitud || ' Lng: ' || NEW.longitud;
        ELSE
            v_ubicacion := 'Ruta desconocida Km ' || COALESCE(NEW.km, 0);
        END IF;

        PERFORM crear_alerta(
            'EMERGENCIA',
            'EMERGENCIA: ' || NEW.tipo_situacion,
            'Se ha reportado una situación de tipo ' || NEW.tipo_situacion || '. ' || v_ubicacion,
            'CRITICA',
            jsonb_build_object(
                'situacion_id', NEW.id,
                'descripcion', NEW.descripcion,
                'ubicacion', v_ubicacion,
                'coordenadas', jsonb_build_object('lat', NEW.latitud, 'lng', NEW.longitud)
            ),
            NULL, 
            NEW.unidad_id, 
            NULL, 
            NEW.id,
            NULL 
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alerta_emergencia
    AFTER INSERT ON situacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_alerta_emergencia();
