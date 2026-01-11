-- Migración 088: Corregir error de columna en trigger_alerta_emergencia
-- Soluciona error: record "new" has no field "tipo"

DROP TRIGGER IF EXISTS trg_alerta_emergencia ON situacion;
DROP FUNCTION IF EXISTS trigger_alerta_emergencia();

CREATE OR REPLACE FUNCTION trigger_alerta_emergencia()
RETURNS TRIGGER AS $$
DECLARE
    v_ubicacion TEXT;
BEGIN
    -- Validar si es emergencia (usando el campo correcto tipo_situacion)
    -- Nota: El tipo 'EMERGENCIA' no existe en el ENUM estándar, pero se mantiene la lógica
    -- por si se agrega en el futuro. Se agrega 'INCIDENTE' como posible emergencia.
    IF NEW.tipo_situacion = 'EMERGENCIA' OR NEW.tipo_situacion = 'INCIDENTE' THEN
        
        -- Obtener ubicación legible
        IF NEW.ubicacion_manual THEN
            v_ubicacion := 'Ubicación Manual Lat: ' || NEW.latitud || ' Lng: ' || NEW.longitud;
        ELSE
            -- Si ruta_id es nulo, no intentar buscar
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
            NULL, -- sede_id
            NEW.unidad_id, -- unidad_id (disponible en situacion)
            NULL, -- brigada_id
            NEW.id,
            NULL -- sin expiración
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alerta_emergencia
    AFTER INSERT ON situacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_alerta_emergencia();
