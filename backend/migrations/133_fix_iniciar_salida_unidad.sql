-- Fix: columna observaciones_inicio no existe, debe ser observaciones_salida
CREATE OR REPLACE FUNCTION iniciar_salida_unidad(
    p_unidad_id INT,
    p_ruta_inicial_id INT,
    p_km_inicial NUMERIC,
    p_combustible_inicial NUMERIC,
    p_observaciones TEXT
) RETURNS INT AS $$
DECLARE
    v_salida_id INT;
    v_tripulacion JSONB;
    v_salida_existente INT;
BEGIN
    SELECT id INTO v_salida_existente FROM salida_unidad
    WHERE unidad_id = p_unidad_id AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

    -- Obtener tripulacion del turno activo
    SELECT json_agg(
        json_build_object(
            'brigada_id', u.id,
            'chapa', u.chapa,
            'nombre', u.nombre_completo,
            'rol', tt.rol_tripulacion
        )
        ORDER BY CASE tt.rol_tripulacion
            WHEN 'PILOTO' THEN 1 WHEN 'COPILOTO' THEN 2 WHEN 'ACOMPANANTE' THEN 3 ELSE 4
        END
    )
    INTO v_tripulacion
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    JOIN usuario u ON tt.usuario_id = u.id
    WHERE au.unidad_id = p_unidad_id
      AND t.fecha = CURRENT_DATE
      AND t.estado IN ('ACTIVO', 'PLANIFICADO');

    INSERT INTO salida_unidad (unidad_id, ruta_inicial_id, km_inicial, combustible_inicial, observaciones_salida, tripulacion)
    VALUES (p_unidad_id, p_ruta_inicial_id, p_km_inicial, p_combustible_inicial, p_observaciones, v_tripulacion)
    RETURNING id INTO v_salida_id;

    UPDATE unidad SET updated_at = NOW() WHERE id = p_unidad_id;

    RETURN v_salida_id;
END;
$$ LANGUAGE plpgsql;
