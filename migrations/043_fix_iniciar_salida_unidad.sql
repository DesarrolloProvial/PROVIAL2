-- Migración 043: Fix función iniciar_salida_unidad
-- Problema: Existían dos versiones de la función con diferentes tipos de parámetros (integer vs numeric)
-- lo que causaba error "function is not unique"
-- Solución: Eliminar todas las versiones y recrear con parámetros INT únicamente
-- También se agrega soporte para tripulación de turno si no hay asignación permanente

-- Eliminar todas las versiones existentes
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, integer, integer, text);
DROP FUNCTION IF EXISTS iniciar_salida_unidad(integer, integer, numeric, numeric, text);

-- Crear la función con soporte para asignaciones permanentes y de turno
CREATE OR REPLACE FUNCTION iniciar_salida_unidad(
    p_unidad_id INT,
    p_ruta_inicial_id INT DEFAULT NULL,
    p_km_inicial INT DEFAULT NULL,
    p_combustible_inicial INT DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_salida_id INT;
    v_tripulacion JSONB;
    v_salida_existente INT;
    v_sede_id INT;
BEGIN
    -- Verificar que no haya salida activa
    SELECT id INTO v_salida_existente
    FROM salida_unidad
    WHERE unidad_id = p_unidad_id
      AND estado = 'EN_SALIDA';

    IF v_salida_existente IS NOT NULL THEN
        RAISE EXCEPTION 'La unidad ya tiene una salida activa (ID: %)', v_salida_existente;
    END IF;

    -- Obtener sede de la unidad
    SELECT sede_id INTO v_sede_id FROM unidad WHERE id = p_unidad_id;

    -- Obtener tripulación de asignaciones permanentes
    SELECT json_agg(
        json_build_object(
            'brigada_id', u.id,
            'chapa', u.chapa,
            'nombre', u.nombre_completo,
            'rol', bu.rol_tripulacion
        )
        ORDER BY
            CASE bu.rol_tripulacion
                WHEN 'PILOTO' THEN 1
                WHEN 'COPILOTO' THEN 2
                WHEN 'ACOMPAÑANTE' THEN 3
            END
    )
    INTO v_tripulacion
    FROM brigada_unidad bu
    JOIN usuario u ON bu.brigada_id = u.id
    WHERE bu.unidad_id = p_unidad_id
      AND bu.activo = TRUE;

    -- Si no hay tripulación permanente, buscar en turnos (incluyendo mañana)
    IF v_tripulacion IS NULL THEN
        SELECT json_agg(
            json_build_object(
                'brigada_id', u.id,
                'chapa', u.chapa,
                'nombre', u.nombre_completo,
                'rol', tt.rol_tripulacion
            )
            ORDER BY
                CASE tt.rol_tripulacion
                    WHEN 'PILOTO' THEN 1
                    WHEN 'COPILOTO' THEN 2
                    WHEN 'ACOMPAÑANTE' THEN 3
                END
        )
        INTO v_tripulacion
        FROM tripulacion_turno tt
        JOIN asignacion_unidad au ON tt.asignacion_id = au.id
        JOIN turno t ON au.turno_id = t.id
        JOIN usuario u ON tt.usuario_id = u.id
        WHERE au.unidad_id = p_unidad_id
          AND (
            -- Turno de hoy
            t.fecha = CURRENT_DATE
            -- Turno de mañana (permite trabajo adelantado)
            OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
            -- Turno con rango que incluye hoy
            OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
            -- Turno activo o planificado reciente
            OR (t.estado IN ('ACTIVO', 'PLANIFICADO') AND t.fecha >= CURRENT_DATE - INTERVAL '1 day')
          );
    END IF;

    -- Crear salida
    INSERT INTO salida_unidad (
        unidad_id,
        ruta_inicial_id,
        km_inicial,
        combustible_inicial,
        tripulacion,
        observaciones_salida,
        estado
    )
    VALUES (
        p_unidad_id,
        p_ruta_inicial_id,
        p_km_inicial,
        p_combustible_inicial,
        v_tripulacion,
        p_observaciones,
        'EN_SALIDA'
    )
    RETURNING id INTO v_salida_id;

    RETURN v_salida_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION iniciar_salida_unidad(INT, INT, INT, INT, TEXT) IS 'Inicia una nueva salida para una unidad. Crea snapshot de tripulación actual (permanente o turno).';
