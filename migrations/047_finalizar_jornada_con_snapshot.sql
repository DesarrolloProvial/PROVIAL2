-- ============================================================================
-- Migración: Modificar flujo de finalización de jornada
-- Descripción: Al finalizar una jornada:
--   1. Crear snapshot en bitacora_historica
--   2. Limpiar registros de las tablas operacionales (turno, asignacion_unidad, tripulacion_turno)
-- ============================================================================

-- ============================================================================
-- FUNCIÓN PRINCIPAL: Finalizar jornada completa
-- ============================================================================

CREATE OR REPLACE FUNCTION finalizar_jornada_completa(
    p_salida_id INTEGER,
    p_km_final NUMERIC(8,2),
    p_combustible_final NUMERIC(5,2),
    p_observaciones TEXT,
    p_finalizada_por INTEGER
) RETURNS TABLE (
    success BOOLEAN,
    bitacora_id BIGINT,
    mensaje TEXT
) AS $$
DECLARE
    v_salida RECORD;
    v_bitacora_id BIGINT;
    v_asignacion_id INTEGER;
    v_turno_id INTEGER;
BEGIN
    -- 1. Verificar que la salida existe y está EN_SALIDA
    SELECT
        s.*,
        u.codigo as unidad_codigo
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id
    AND s.estado = 'EN_SALIDA';

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Salida no encontrada o ya finalizada'::TEXT;
        RETURN;
    END IF;

    -- 2. Actualizar la salida como FINALIZADA
    UPDATE salida_unidad SET
        estado = 'FINALIZADA',
        fecha_hora_regreso = NOW(),
        km_final = p_km_final,
        combustible_final = p_combustible_final,
        km_recorridos = ABS(COALESCE(p_km_final, 0) - COALESCE(km_inicial, 0)),
        observaciones_regreso = p_observaciones,
        finalizada_por = p_finalizada_por,
        updated_at = NOW()
    WHERE id = p_salida_id;

    -- 3. Crear snapshot en bitacora_historica
    v_bitacora_id := crear_snapshot_bitacora(p_salida_id, p_finalizada_por);

    -- 4. Buscar la asignación y turno relacionados
    -- La fecha está en turno.fecha, no en asignacion_unidad
    SELECT tt.asignacion_id, au.turno_id
    INTO v_asignacion_id, v_turno_id
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    WHERE au.unidad_id = v_salida.unidad_id
    AND t.fecha = v_salida.fecha_hora_salida::DATE
    LIMIT 1;

    -- 5. Si encontramos una asignación de turno, limpiar las tablas operacionales
    IF v_asignacion_id IS NOT NULL THEN
        -- Eliminar tripulación del turno
        DELETE FROM tripulacion_turno WHERE asignacion_id = v_asignacion_id;

        -- Eliminar la asignación de unidad
        DELETE FROM asignacion_unidad WHERE id = v_asignacion_id;

        -- Verificar si el turno quedó sin asignaciones y eliminarlo también
        IF NOT EXISTS (SELECT 1 FROM asignacion_unidad WHERE turno_id = v_turno_id) THEN
            DELETE FROM turno WHERE id = v_turno_id;
        END IF;
    END IF;

    -- 6. Retornar éxito
    RETURN QUERY SELECT
        TRUE,
        v_bitacora_id,
        format('Jornada finalizada. Unidad %s liberada. Bitácora #%s creada.', v_salida.unidad_codigo, v_bitacora_id)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN AUXILIAR: Limpiar asignaciones expiradas (job nocturno)
-- ============================================================================

CREATE OR REPLACE FUNCTION limpiar_asignaciones_expiradas() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_asignacion RECORD;
BEGIN
    -- Buscar asignaciones de días anteriores que no tienen salida activa
    FOR v_asignacion IN
        SELECT au.id, au.turno_id
        FROM asignacion_unidad au
        WHERE au.fecha_asignacion < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM salida_unidad s
            WHERE s.unidad_id = au.unidad_id
            AND s.estado = 'EN_SALIDA'
        )
    LOOP
        -- Eliminar tripulación
        DELETE FROM tripulacion_turno WHERE asignacion_id = v_asignacion.id;
        -- Eliminar asignación
        DELETE FROM asignacion_unidad WHERE id = v_asignacion.id;
        v_count := v_count + 1;

        -- Eliminar turno si quedó vacío
        IF NOT EXISTS (SELECT 1 FROM asignacion_unidad WHERE turno_id = v_asignacion.turno_id) THEN
            DELETE FROM turno WHERE id = v_asignacion.turno_id;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACTUALIZAR: registrar_ingreso_sede para llamar finalizar_jornada_completa
-- ============================================================================

-- Primero hacer DROP porque los nombres de parámetros cambiaron
DROP FUNCTION IF EXISTS registrar_ingreso_sede(integer,integer,character varying,numeric,numeric,text,boolean,integer);

CREATE OR REPLACE FUNCTION registrar_ingreso_sede(
    p_salida_id INTEGER,
    p_sede_id INTEGER,
    p_tipo_ingreso VARCHAR(30),
    p_km NUMERIC(8,2),
    p_combustible NUMERIC(5,2),
    p_observaciones TEXT,
    p_es_ingreso_final BOOLEAN,
    p_registrado_por INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_ingreso_id INTEGER;
    v_ingreso_activo INTEGER;
    v_result RECORD;
BEGIN
    -- Verificar si ya hay un ingreso activo para esta salida
    SELECT id INTO v_ingreso_activo
    FROM ingreso_sede
    WHERE salida_unidad_id = p_salida_id
    AND fecha_hora_salida IS NULL;

    IF v_ingreso_activo IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un ingreso activo (ID: %) para esta salida. Debe registrar salida de sede primero.', v_ingreso_activo;
    END IF;

    -- Insertar el ingreso
    INSERT INTO ingreso_sede (
        salida_unidad_id,
        sede_id,
        tipo_ingreso,
        km_ingreso,
        combustible_ingreso,
        observaciones_ingreso,
        es_ingreso_final,
        registrado_por
    ) VALUES (
        p_salida_id,
        p_sede_id,
        p_tipo_ingreso,
        p_km,
        p_combustible,
        p_observaciones,
        p_es_ingreso_final,
        p_registrado_por
    )
    RETURNING id INTO v_ingreso_id;

    -- Si es ingreso final, llamar a finalizar_jornada_completa
    IF p_es_ingreso_final THEN
        SELECT * INTO v_result
        FROM finalizar_jornada_completa(
            p_salida_id,
            p_km,
            p_combustible,
            p_observaciones,
            p_registrado_por
        );

        IF NOT v_result.success THEN
            RAISE EXCEPTION 'Error al finalizar jornada: %', v_result.mensaje;
        END IF;
    END IF;

    RETURN v_ingreso_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION finalizar_jornada_completa IS
'Finaliza una jornada laboral completa:
1. Marca la salida como FINALIZADA
2. Crea snapshot en bitacora_historica
3. Limpia registros de turno/asignacion_unidad/tripulacion_turno
Esto mantiene las tablas operacionales con SOLO unidades activas.';

COMMENT ON FUNCTION limpiar_asignaciones_expiradas IS
'Job nocturno para limpiar asignaciones de días anteriores que quedaron huérfanas.
Debería ejecutarse con pg_cron o similar a las 00:00.';
