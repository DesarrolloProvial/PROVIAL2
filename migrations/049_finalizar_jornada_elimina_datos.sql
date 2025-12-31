-- ================================================
-- Migración 049: Finalizar jornada elimina datos operacionales
-- Fecha: 2025-12-11
-- Descripción: Al finalizar jornada, eliminar situaciones, ingresos y salida
--              despues de crear el snapshot en bitacora_historica
-- ================================================

CREATE OR REPLACE FUNCTION finalizar_jornada_completa(
    p_salida_id INTEGER,
    p_km_final NUMERIC(10,2) DEFAULT NULL,
    p_combustible_final NUMERIC(5,2) DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_finalizada_por INTEGER DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, bitacora_id BIGINT, mensaje TEXT) AS $$
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

    -- 2. Cerrar todos los ingresos activos de esta salida
    UPDATE ingreso_sede SET
        fecha_hora_salida = NOW()
    WHERE salida_unidad_id = p_salida_id
    AND fecha_hora_salida IS NULL;

    -- 3. Actualizar la salida como FINALIZADA (temporalmente para el snapshot)
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

    -- 4. Crear snapshot en bitacora_historica (ANTES de eliminar datos)
    v_bitacora_id := crear_snapshot_bitacora(p_salida_id, p_finalizada_por);

    -- 5. Buscar la asignación y turno relacionados
    SELECT tt.asignacion_id, au.turno_id
    INTO v_asignacion_id, v_turno_id
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    WHERE au.unidad_id = v_salida.unidad_id
    AND t.fecha = v_salida.fecha_hora_salida::DATE
    LIMIT 1;

    -- 6. Si encontramos una asignación de turno, limpiar las tablas operacionales
    IF v_asignacion_id IS NOT NULL THEN
        DELETE FROM tripulacion_turno WHERE asignacion_id = v_asignacion_id;
        DELETE FROM asignacion_unidad WHERE id = v_asignacion_id;
        IF NOT EXISTS (SELECT 1 FROM asignacion_unidad WHERE turno_id = v_turno_id) THEN
            DELETE FROM turno WHERE id = v_turno_id;
        END IF;
    END IF;

    -- 7. ELIMINAR DATOS OPERACIONALES DE LA JORNADA (ya estan en bitacora_historica)
    -- Eliminar situaciones de esta salida
    DELETE FROM situacion WHERE salida_unidad_id = p_salida_id;

    -- Eliminar ingresos de esta salida
    DELETE FROM ingreso_sede WHERE salida_unidad_id = p_salida_id;

    -- Eliminar la salida misma
    DELETE FROM salida_unidad WHERE id = p_salida_id;

    -- 8. Retornar éxito
    RETURN QUERY SELECT
        TRUE,
        v_bitacora_id,
        format('Jornada finalizada. Unidad %s liberada. Bitácora #%s creada. Datos operacionales archivados.', v_salida.unidad_codigo, v_bitacora_id)::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION finalizar_jornada_completa IS
'Finaliza jornada completa: crea snapshot en bitacora_historica y luego elimina todos los datos operacionales (situaciones, ingresos, salida, turno, asignacion, tripulacion)';
