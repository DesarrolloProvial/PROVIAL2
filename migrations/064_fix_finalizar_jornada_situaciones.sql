-- Migración: Modificar finalizar_jornada_completa para mantener situaciones persistentes
-- Fecha: 2025-12-15
-- Descripción: Solo elimina situaciones temporales (patrullaje, comida, etc.)
--              Mantiene situaciones persistentes (incidentes, asistencias, emergencias)

-- Tipos de situaciones:
-- TEMPORALES (se eliminan): PATRULLAJE, COMIDA, DESCANSO, PARADA_ESTRATEGICA, CAMBIO_RUTA, REGULACION_TRAFICO, SALIDA_SEDE
-- PERSISTENTES (se mantienen): INCIDENTE, ASISTENCIA_VEHICULAR, OTROS

CREATE OR REPLACE FUNCTION finalizar_jornada_completa(
    p_salida_id INTEGER,
    p_km_final NUMERIC DEFAULT NULL,
    p_combustible_final NUMERIC DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_finalizada_por INTEGER DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, bitacora_id BIGINT, mensaje TEXT) AS $$
DECLARE
    v_salida RECORD;
    v_bitacora_id BIGINT;
    v_asignacion_id INTEGER;
    v_turno_id INTEGER;
    v_situaciones_eliminadas INTEGER;
    v_situaciones_persistentes INTEGER;
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

    -- 3. Actualizar la salida como FINALIZADA
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

    -- 4. Crear snapshot en bitacora_historica (ANTES de eliminar datos temporales)
    v_bitacora_id := crear_snapshot_bitacora(p_salida_id, p_finalizada_por);

    -- 5. Buscar la asignación relacionada
    SELECT tt.asignacion_id, au.turno_id
    INTO v_asignacion_id, v_turno_id
    FROM tripulacion_turno tt
    JOIN asignacion_unidad au ON tt.asignacion_id = au.id
    JOIN turno t ON au.turno_id = t.id
    WHERE au.unidad_id = v_salida.unidad_id
    AND (
        t.fecha = CURRENT_DATE
        OR t.fecha = CURRENT_DATE - INTERVAL '1 day'
        OR t.fecha = CURRENT_DATE + INTERVAL '1 day'
        OR (t.fecha <= CURRENT_DATE AND COALESCE(t.fecha_fin, t.fecha) >= CURRENT_DATE)
    )
    LIMIT 1;

    -- 6. Limpiar asignación de turno si existe
    IF v_asignacion_id IS NOT NULL THEN
        DELETE FROM tripulacion_turno WHERE asignacion_id = v_asignacion_id;
        DELETE FROM asignacion_unidad WHERE id = v_asignacion_id;
        IF NOT EXISTS (SELECT 1 FROM asignacion_unidad WHERE turno_id = v_turno_id) THEN
            DELETE FROM turno WHERE id = v_turno_id;
        END IF;
    END IF;

    -- 7. ELIMINAR SOLO SITUACIONES TEMPORALES (ya están en bitacora_historica como resumen)
    -- Las situaciones PERSISTENTES se mantienen para análisis de reincidencias
    DELETE FROM situacion
    WHERE salida_unidad_id = p_salida_id
    AND tipo_situacion IN (
        'PATRULLAJE',
        'COMIDA',
        'DESCANSO',
        'PARADA_ESTRATEGICA',
        'CAMBIO_RUTA',
        'REGULACION_TRAFICO',
        'SALIDA_SEDE'
    );
    GET DIAGNOSTICS v_situaciones_eliminadas = ROW_COUNT;

    -- Contar situaciones persistentes que se mantienen
    SELECT COUNT(*) INTO v_situaciones_persistentes
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- 8. Desvincular situaciones persistentes de la salida (ya no existe)
    -- pero mantenerlas en la BD con referencia a la unidad
    UPDATE situacion SET
        salida_unidad_id = NULL
    WHERE salida_unidad_id = p_salida_id
    AND tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'OTROS');

    -- 9. Eliminar ingresos y salida
    DELETE FROM ingreso_sede WHERE salida_unidad_id = p_salida_id;
    DELETE FROM salida_unidad WHERE id = p_salida_id;

    -- 10. Retornar éxito
    RETURN QUERY SELECT
        TRUE,
        v_bitacora_id,
        format('Jornada finalizada. Unidad %s liberada. Bitácora #%s. Situaciones eliminadas: %s, persistentes: %s',
               v_salida.unidad_codigo, v_bitacora_id, v_situaciones_eliminadas, v_situaciones_persistentes)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Comentario explicativo
COMMENT ON FUNCTION finalizar_jornada_completa IS
'Finaliza jornada: crea bitácora, elimina situaciones temporales (patrullaje, comida, etc.),
mantiene situaciones persistentes (incidentes, asistencias, emergencias) para análisis de reincidencias';
