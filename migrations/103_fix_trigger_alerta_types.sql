-- ========================================
-- FIX: Corregir tipos en trigger_alerta_emergencia y función crear_alerta
-- Error: function crear_alerta(unknown, text, text, unknown, jsonb, unknown, integer, unknown, bigint, unknown) does not exist
-- El problema es que NEW.id es BIGINT pero la función espera INTEGER
-- ========================================

-- Opción 1: Recrear la función crear_alerta para aceptar BIGINT
DROP FUNCTION IF EXISTS crear_alerta(tipo_alerta, VARCHAR, TEXT, severidad_alerta, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION crear_alerta(
  p_tipo tipo_alerta,
  p_titulo VARCHAR(200),
  p_mensaje TEXT,
  p_severidad severidad_alerta DEFAULT NULL,
  p_datos JSONB DEFAULT NULL,
  p_sede_id INTEGER DEFAULT NULL,
  p_unidad_id INTEGER DEFAULT NULL,
  p_brigada_id INTEGER DEFAULT NULL,
  p_situacion_id BIGINT DEFAULT NULL,  -- Cambiado de INTEGER a BIGINT
  p_expira_en_minutos INTEGER DEFAULT NULL
) RETURNS alerta AS $$
DECLARE
  v_config configuracion_alerta;
  v_alerta alerta;
  v_fecha_exp TIMESTAMP;
BEGIN
  -- Obtener configuración
  SELECT * INTO v_config FROM configuracion_alerta WHERE tipo = p_tipo;

  -- Si no hay config o está desactivada, no crear alerta
  IF v_config IS NULL OR NOT v_config.activa THEN
    RETURN NULL;
  END IF;

  -- Calcular fecha de expiración
  IF p_expira_en_minutos IS NOT NULL THEN
    v_fecha_exp := CURRENT_TIMESTAMP + (p_expira_en_minutos || ' minutes')::INTERVAL;
  END IF;

  -- Insertar alerta
  INSERT INTO alerta (
    tipo, severidad, titulo, mensaje, datos,
    sede_id, unidad_id, brigada_id, situacion_id,
    fecha_expiracion
  ) VALUES (
    p_tipo,
    COALESCE(p_severidad, v_config.severidad_default),
    p_titulo,
    p_mensaje,
    p_datos,
    p_sede_id,
    p_unidad_id,
    p_brigada_id,
    p_situacion_id::INTEGER, -- Cast a INTEGER para la tabla
    v_fecha_exp
  ) RETURNING * INTO v_alerta;

  RETURN v_alerta;
END;
$$ LANGUAGE plpgsql;

-- Opción 2: Recrear el trigger con cast explícito
DROP TRIGGER IF EXISTS trg_alerta_emergencia ON situacion;
DROP FUNCTION IF EXISTS trigger_alerta_emergencia();

CREATE OR REPLACE FUNCTION trigger_alerta_emergencia()
RETURNS TRIGGER AS $$
DECLARE
    v_ubicacion TEXT;
BEGIN
    -- Validar si es emergencia o incidente
    IF NEW.tipo_situacion IN ('EMERGENCIA', 'INCIDENTE', 'OTROS') THEN

        -- Obtener ubicación legible
        IF NEW.ubicacion_manual THEN
            v_ubicacion := 'Ubicación Manual Lat: ' || COALESCE(NEW.latitud::TEXT, 'N/A') || ' Lng: ' || COALESCE(NEW.longitud::TEXT, 'N/A');
        ELSE
            v_ubicacion := 'Ruta Km ' || COALESCE(NEW.km::TEXT, '0');
        END IF;

        -- Llamar crear_alerta con casts explícitos
        PERFORM crear_alerta(
            'EMERGENCIA'::tipo_alerta,
            ('EMERGENCIA: ' || NEW.tipo_situacion)::VARCHAR(200),
            ('Se ha reportado una situación de tipo ' || NEW.tipo_situacion || '. ' || v_ubicacion)::TEXT,
            'CRITICA'::severidad_alerta,
            jsonb_build_object(
                'situacion_id', NEW.id,
                'descripcion', COALESCE(NEW.descripcion, ''),
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

CREATE TRIGGER trg_alerta_emergencia
    AFTER INSERT ON situacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_alerta_emergencia();

-- Verificar
SELECT 'Trigger y función crear_alerta actualizados para manejar BIGINT' as resultado;
