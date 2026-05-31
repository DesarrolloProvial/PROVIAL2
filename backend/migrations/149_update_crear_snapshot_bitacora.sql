-- Migration 149: Actualizar crear_snapshot_bitacora para incluir asignacion_id
-- Lee salida_unidad.asignacion_id (ya existe por mig 148) y lo persiste en bitacora_historica
-- Así la bitácora histórica mantiene el vínculo con la asignación aunque ésta sea borrada

CREATE OR REPLACE FUNCTION public.crear_snapshot_bitacora(p_salida_id integer, p_finalizado_por integer)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida       RECORD;
    v_situaciones  JSONB;
    v_ingresos     JSONB;
    v_tripulacion  JSONB;
    v_contadores   RECORD;
    v_bitacora_id  BIGINT;
BEGIN
    -- Obtener datos de la salida (incluye asignacion_id agregado en mig 148)
    SELECT
        s.*,
        u.id as unidad_id_ref,
        s.fecha_hora_salida::DATE as fecha_jornada
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Salida no encontrada: %', p_salida_id;
    END IF;

    -- Obtener resumen de situaciones
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo_situacion,
        'km', km,
        'hora', to_char(created_at, 'HH24:MI'),
        'estado', estado,
        'ruta_id', ruta_id
    ) ORDER BY created_at), '[]'::jsonb)
    INTO v_situaciones
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Obtener resumen de ingresos
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo_ingreso,
        'sede_id', sede_id,
        'duracion_min', EXTRACT(EPOCH FROM (COALESCE(fecha_hora_salida, NOW()) - fecha_hora_ingreso))/60,
        'es_final', es_ingreso_final
    ) ORDER BY fecha_hora_ingreso), '[]'::jsonb)
    INTO v_ingresos
    FROM ingreso_sede
    WHERE salida_unidad_id = p_salida_id;

    -- Procesar tripulación (formato snapshot: [{"usuario_id": X, "rol": "PILOTO"}, ...])
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'usuario_id', (elem->>'brigada_id')::INTEGER,
            'rol', UPPER(elem->>'rol')
        )) FILTER (WHERE elem->>'brigada_id' IS NOT NULL),
        '[]'::jsonb
    )
    INTO v_tripulacion
    FROM jsonb_array_elements(COALESCE(v_salida.tripulacion, '[]'::jsonb)) elem;

    -- Calcular contadores
    SELECT
        COUNT(*) FILTER (WHERE tipo_situacion = 'INCIDENTE')                              AS incidentes,
        COUNT(*) FILTER (WHERE tipo_situacion = 'ASISTENCIA')                             AS asistencias,
        COUNT(*) FILTER (WHERE tipo_situacion = 'EMERGENCIA')                             AS emergencias,
        COUNT(*) FILTER (WHERE tipo_situacion IN ('REGULACION', 'REGULACION_TRANSITO'))   AS regulaciones,
        COUNT(*) FILTER (WHERE tipo_situacion = 'PATRULLAJE')                             AS patrullajes,
        COUNT(*)                                                                           AS total
    INTO v_contadores
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Insertar snapshot en bitacora_historica (ahora incluye asignacion_id)
    INSERT INTO bitacora_historica (
        fecha, unidad_id, salida_id, asignacion_id,
        sede_origen_id, ruta_inicial_id,
        km_inicial, km_final, km_recorridos,
        combustible_inicial, combustible_final,
        hora_inicio, hora_fin, duracion_minutos,
        tripulacion_ids, situaciones_resumen, total_situaciones,
        ingresos_resumen, total_ingresos,
        total_incidentes, total_asistencias, total_emergencias,
        total_regulaciones, total_patrullajes,
        observaciones_inicio, observaciones_fin, finalizado_por
    ) VALUES (
        v_salida.fecha_jornada,
        v_salida.unidad_id,
        p_salida_id,
        v_salida.asignacion_id,          -- ← NUEVO: persiste antes de que finalizar_jornada lo borre
        v_salida.sede_origen_id,
        v_salida.ruta_inicial_id,
        v_salida.km_inicial,
        v_salida.km_final,
        v_salida.km_recorridos,
        v_salida.combustible_inicial,
        v_salida.combustible_final,
        v_salida.fecha_hora_salida,
        v_salida.fecha_hora_regreso,
        EXTRACT(EPOCH FROM (COALESCE(v_salida.fecha_hora_regreso, NOW()) - v_salida.fecha_hora_salida))/60,
        v_tripulacion,
        v_situaciones,
        COALESCE(v_contadores.total, 0),
        v_ingresos,
        (SELECT COUNT(*) FROM ingreso_sede WHERE salida_unidad_id = p_salida_id),
        COALESCE(v_contadores.incidentes, 0),
        COALESCE(v_contadores.asistencias, 0),
        COALESCE(v_contadores.emergencias, 0),
        COALESCE(v_contadores.regulaciones, 0),
        COALESCE(v_contadores.patrullajes, 0),
        v_salida.observaciones_salida,
        v_salida.observaciones_regreso,
        p_finalizado_por
    )
    ON CONFLICT (fecha, unidad_id)
    DO UPDATE SET
        salida_id          = EXCLUDED.salida_id,
        asignacion_id      = EXCLUDED.asignacion_id,
        km_final           = EXCLUDED.km_final,
        km_recorridos      = EXCLUDED.km_recorridos,
        combustible_final  = EXCLUDED.combustible_final,
        hora_fin           = EXCLUDED.hora_fin,
        duracion_minutos   = EXCLUDED.duracion_minutos,
        situaciones_resumen  = EXCLUDED.situaciones_resumen,
        total_situaciones    = EXCLUDED.total_situaciones,
        ingresos_resumen     = EXCLUDED.ingresos_resumen,
        total_ingresos       = EXCLUDED.total_ingresos,
        total_incidentes     = EXCLUDED.total_incidentes,
        total_asistencias    = EXCLUDED.total_asistencias,
        total_emergencias    = EXCLUDED.total_emergencias,
        total_regulaciones   = EXCLUDED.total_regulaciones,
        total_patrullajes    = EXCLUDED.total_patrullajes,
        observaciones_fin    = EXCLUDED.observaciones_fin,
        finalizado_por       = EXCLUDED.finalizado_por
    RETURNING id INTO v_bitacora_id;

    RETURN v_bitacora_id;
END;
$$;
