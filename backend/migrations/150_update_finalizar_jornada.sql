-- Migration 150: Actualizar finalizar_jornada_completa para usar salida_unidad.asignacion_id
-- Antes: buscaba la asignacion por tripulacion_turno + unidad_id + fecha (frágil)
-- Ahora: lee salida_unidad.asignacion_id directamente (exacto), con fallback al método anterior
--        para salidas creadas antes de mig 148 que no tengan asignacion_id

CREATE OR REPLACE FUNCTION public.finalizar_jornada_completa(
    p_salida_id integer,
    p_km_final numeric DEFAULT NULL,
    p_combustible_final numeric DEFAULT NULL,
    p_observaciones text DEFAULT NULL,
    p_finalizada_por integer DEFAULT NULL
) RETURNS TABLE(success boolean, bitacora_id bigint, mensaje text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida                RECORD;
    v_bitacora_id           BIGINT;
    v_asignacion_id         INTEGER;
    v_turno_id              INTEGER;
    v_situaciones_eliminadas INTEGER;
    v_situaciones_persistentes INTEGER;
BEGIN
    -- 1. Verificar que la salida existe y está EN_SALIDA
    SELECT s.*, u.codigo AS unidad_codigo
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id AND s.estado = 'EN_SALIDA';

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Salida no encontrada o ya finalizada'::TEXT;
        RETURN;
    END IF;

    -- 2. Cerrar todos los ingresos activos de esta salida
    UPDATE ingreso_sede
    SET fecha_hora_salida = NOW()
    WHERE salida_unidad_id = p_salida_id AND fecha_hora_salida IS NULL;

    -- 3. Actualizar la salida como FINALIZADA
    UPDATE salida_unidad SET
        estado             = 'FINALIZADA',
        fecha_hora_regreso = NOW(),
        km_final           = p_km_final,
        combustible_final  = p_combustible_final,
        km_recorridos      = ABS(COALESCE(p_km_final, 0) - COALESCE(km_inicial, 0)),
        observaciones_regreso = p_observaciones,
        finalizada_por     = p_finalizada_por,
        updated_at         = NOW()
    WHERE id = p_salida_id;

    -- 4. Crear snapshot en bitacora_historica ANTES de eliminar datos temporales
    --    crear_snapshot_bitacora (mig 149) ya lee y persiste asignacion_id
    v_bitacora_id := crear_snapshot_bitacora(p_salida_id, p_finalizada_por);

    -- 5. Buscar la asignación relacionada
    --    Ruta directa: salida_unidad.asignacion_id (mig 148, exacto)
    --    Fallback: join por tripulacion_turno + fecha (para salidas sin asignacion_id)
    IF v_salida.asignacion_id IS NOT NULL THEN
        SELECT v_salida.asignacion_id, au.turno_id
        INTO v_asignacion_id, v_turno_id
        FROM asignacion_unidad au
        WHERE au.id = v_salida.asignacion_id;
    ELSE
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
    END IF;

    -- 6. Limpiar asignación de turno si existe
    IF v_asignacion_id IS NOT NULL THEN
        DELETE FROM tripulacion_turno WHERE asignacion_id = v_asignacion_id;
        DELETE FROM asignacion_unidad WHERE id = v_asignacion_id;
        IF NOT EXISTS (SELECT 1 FROM asignacion_unidad WHERE turno_id = v_turno_id) THEN
            DELETE FROM turno WHERE id = v_turno_id;
        END IF;
    END IF;

    -- 7. Eliminar solo situaciones temporales (ya están en bitacora como resumen)
    DELETE FROM situacion
    WHERE salida_unidad_id = p_salida_id
      AND tipo_situacion IN (
          'PATRULLAJE', 'COMIDA', 'DESCANSO',
          'PARADA_ESTRATEGICA', 'CAMBIO_RUTA',
          'REGULACION_TRAFICO', 'SALIDA_SEDE'
      );
    GET DIAGNOSTICS v_situaciones_eliminadas = ROW_COUNT;

    -- 8. Contar situaciones persistentes que se mantienen
    SELECT COUNT(*) INTO v_situaciones_persistentes
    FROM situacion WHERE salida_unidad_id = p_salida_id;

    -- 9. Desvincular situaciones persistentes de la salida
    UPDATE situacion SET salida_unidad_id = NULL
    WHERE salida_unidad_id = p_salida_id
      AND tipo_situacion IN ('INCIDENTE', 'ASISTENCIA_VEHICULAR', 'OTROS');

    -- 10. Eliminar ingresos y la salida (ya fue copiada a bitacora_historica)
    DELETE FROM ingreso_sede WHERE salida_unidad_id = p_salida_id;
    DELETE FROM salida_unidad WHERE id = p_salida_id;

    -- 11. Retornar éxito
    RETURN QUERY SELECT
        TRUE,
        v_bitacora_id,
        format(
            'Jornada finalizada. Unidad %s liberada. Bitácora #%s. Situaciones eliminadas: %s, persistentes: %s',
            v_salida.unidad_codigo, v_bitacora_id,
            v_situaciones_eliminadas, v_situaciones_persistentes
        )::TEXT;
END;
$$;
