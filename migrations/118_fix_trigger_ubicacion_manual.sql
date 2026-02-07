-- Fix trigger that references dropped columns (ubicacion_manual, descripcion)
-- These were removed in migration 108 but trigger from 103 still referenced them

CREATE OR REPLACE FUNCTION trigger_alerta_emergencia()
RETURNS TRIGGER AS $$
DECLARE
    v_ubicacion TEXT;
BEGIN
    -- Validar si es emergencia o incidente
    IF NEW.tipo_situacion IN ('EMERGENCIA', 'INCIDENTE', 'OTROS') THEN

        -- Obtener ubicación legible
        v_ubicacion := 'Ruta Km ' || COALESCE(NEW.km::TEXT, '0');

        -- Llamar crear_alerta con casts explícitos
        PERFORM crear_alerta(
            'EMERGENCIA'::tipo_alerta,
            ('EMERGENCIA: ' || NEW.tipo_situacion)::VARCHAR(200),
            ('Se ha reportado una situación de tipo ' || NEW.tipo_situacion || '. ' || v_ubicacion)::TEXT,
            'CRITICA'::severidad_alerta,
            jsonb_build_object(
                'situacion_id', NEW.id,
                'observaciones', COALESCE(NEW.observaciones, ''),
                'ubicacion', v_ubicacion,
                'coordenadas', jsonb_build_object('lat', NEW.latitud, 'lng', NEW.longitud)
            ),
            NULL::INTEGER, -- sede_id
            NEW.unidad_id::INTEGER, -- unidad_id
            NULL::INTEGER, -- brigada_id
            NEW.id::BIGINT, -- situacion_id como BIGINT
            NULL::INTEGER -- sin expiración
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
