-- Migration 152: Rediseño de finalizar_jornada_completa — sin borrar datos operacionales
--
-- ANTES: borraba situaciones, actividades, ingreso_sede, salida_unidad, turno, asignacion.
--        bitacora_historica era la ÚNICA fuente del historial.
--
-- AHORA: todos los datos operacionales se conservan. Solo se:
--   - Marca salida_unidad como FINALIZADA (UPDATE, no DELETE)
--   - Cierra ingresos activos (UPDATE fecha_hora_salida)
--   - Crea/actualiza snapshot en bitacora_historica (consulta rápida por fecha)
--   - Marca asignacion con hora_entrada_real (cierre operacional)
--   - Cierra turno (estado=CERRADO) si todas sus unidades ya finalizaron
--   - Limpia situacion_actual (estado en tiempo real del mapa COP)
--
-- RESULTADO: si se borra bitacora_historica, se puede reconstruir exactamente
--            desde las tablas operacionales con reconstruir_bitacora_historica().

CREATE OR REPLACE FUNCTION public.finalizar_jornada_completa(
    p_salida_id      integer,
    p_km_final       numeric  DEFAULT NULL,
    p_combustible_final numeric DEFAULT NULL,
    p_observaciones  text     DEFAULT NULL,
    p_finalizada_por integer  DEFAULT NULL
) RETURNS TABLE(success boolean, bitacora_id bigint, mensaje text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida        RECORD;
    v_bitacora_id   BIGINT;
    v_asignacion_id INTEGER;
    v_turno_id      INTEGER;
BEGIN
    -- 1. Verificar que la salida existe y está EN_SALIDA
    SELECT s.*, u.codigo AS unidad_codigo
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id AND s.estado = 'EN_SALIDA';

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT,
            'Salida no encontrada o ya finalizada'::TEXT;
        RETURN;
    END IF;

    -- 2. Cerrar ingresos activos de esta salida (mantener el registro histórico)
    UPDATE ingreso_sede
    SET fecha_hora_salida = NOW()
    WHERE salida_unidad_id = p_salida_id
      AND fecha_hora_salida IS NULL;

    -- 3. Marcar salida como FINALIZADA — no se borra, queda como registro histórico
    UPDATE salida_unidad SET
        estado              = 'FINALIZADA',
        fecha_hora_regreso  = NOW(),
        km_final            = p_km_final,
        combustible_final   = p_combustible_final,
        km_recorridos       = ABS(COALESCE(p_km_final, 0) - COALESCE(km_inicial, 0)),
        observaciones_regreso = p_observaciones,
        finalizada_por      = p_finalizada_por,
        updated_at          = NOW()
    WHERE id = p_salida_id;

    -- 4. Crear snapshot en bitacora_historica para consultas históricas rápidas
    --    Los datos originales se mantienen intactos en todas sus tablas
    v_bitacora_id := crear_snapshot_bitacora(p_salida_id, p_finalizada_por);

    -- 5. Cerrar asignación operacional (sin borrar — dato histórico de planificación)
    --    Ruta directa via asignacion_id (mig 148); fallback por fecha
    IF v_salida.asignacion_id IS NOT NULL THEN
        v_asignacion_id := v_salida.asignacion_id;

        UPDATE asignacion_unidad
        SET hora_entrada_real = NOW()
        WHERE id = v_asignacion_id
          AND hora_entrada_real IS NULL;

        SELECT turno_id INTO v_turno_id
        FROM asignacion_unidad WHERE id = v_asignacion_id;

    ELSE
        -- Fallback para salidas creadas antes de mig 148 (sin asignacion_id)
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
          )
        LIMIT 1;

        IF v_asignacion_id IS NOT NULL THEN
            UPDATE asignacion_unidad
            SET hora_entrada_real = NOW()
            WHERE id = v_asignacion_id
              AND hora_entrada_real IS NULL;
        END IF;
    END IF;

    -- 6. Cerrar turno si todas sus salidas activas ya finalizaron
    IF v_turno_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM asignacion_unidad au
            JOIN salida_unidad su ON su.asignacion_id = au.id
            WHERE au.turno_id = v_turno_id
              AND su.estado = 'EN_SALIDA'
        ) THEN
            UPDATE turno
            SET estado = 'CERRADO', updated_at = NOW()
            WHERE id = v_turno_id
              AND estado != 'CERRADO';
        END IF;
    END IF;

    -- 7. Limpiar situacion_actual — solo el estado en tiempo real del mapa COP
    --    Los datos históricos están en situacion, actividad, etc.
    DELETE FROM situacion_actual WHERE unidad_id = v_salida.unidad_id;

    -- 8. Retornar éxito
    RETURN QUERY SELECT
        TRUE,
        v_bitacora_id,
        format(
            'Jornada finalizada. Unidad %s. Bitácora #%s.',
            v_salida.unidad_codigo,
            v_bitacora_id
        )::TEXT;
END;
$$;
