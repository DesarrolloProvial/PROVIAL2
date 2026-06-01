-- Migration 153: Agregar actividades_resumen a bitacora_historica
--               + actualizar crear_snapshot_bitacora para incluirlas
--               + función reconstruir_bitacora_historica()
--
-- Dado que los datos operacionales ya no se borran (mig 152), bitacora_historica
-- puede reconstruirse completamente desde las tablas fuente. Esta migración:
--   1. Agrega actividades_resumen JSONB a bitacora_historica
--   2. Actualiza crear_snapshot_bitacora para capturar actividades
--   3. Crea reconstruir_bitacora_historica(fecha_inicio, fecha_fin) que permite
--      borrar bitacora_historica y regenerarla exactamente

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Agregar columna actividades_resumen a bitacora_historica
--    (propagada automáticamente a las particiones en PG11+)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bitacora_historica
  ADD COLUMN IF NOT EXISTS actividades_resumen JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bitacora_historica
  ADD COLUMN IF NOT EXISTS total_actividades INTEGER NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Actualizar crear_snapshot_bitacora para incluir actividades
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crear_snapshot_bitacora(
    p_salida_id    integer,
    p_finalizado_por integer
) RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida        RECORD;
    v_situaciones   JSONB;
    v_actividades   JSONB;
    v_ingresos      JSONB;
    v_tripulacion   JSONB;
    v_contadores    RECORD;
    v_bitacora_id   BIGINT;
BEGIN
    -- Obtener datos de la salida
    SELECT s.*, s.fecha_hora_salida::DATE AS fecha_jornada
    INTO v_salida
    FROM salida_unidad s
    JOIN unidad u ON s.unidad_id = u.id
    WHERE s.id = p_salida_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Salida no encontrada: %', p_salida_id;
    END IF;

    -- Resumen de situaciones (todas — ya no se borran)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',      id,
        'tipo',    tipo_situacion,
        'km',      km,
        'hora',    to_char(created_at, 'HH24:MI'),
        'estado',  estado,
        'ruta_id', ruta_id
    ) ORDER BY created_at), '[]'::jsonb)
    INTO v_situaciones
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Resumen de actividades
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',              a.id,
        'codigo',          a.codigo_actividad,
        'tipo_id',         a.tipo_actividad_id,
        'tipo_nombre',     cts.nombre,
        'km',              a.km,
        'hora',            to_char(a.created_at, 'HH24:MI'),
        'estado',          a.estado,
        'ruta_id',         a.ruta_id,
        'clima',           a.clima,
        'carga_vehicular', a.carga_vehicular
    ) ORDER BY a.created_at), '[]'::jsonb)
    INTO v_actividades
    FROM actividad a
    LEFT JOIN catalogo_tipo_situacion cts ON a.tipo_actividad_id = cts.id
    WHERE a.salida_unidad_id = p_salida_id;

    -- Resumen de ingresos a sede
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',           id,
        'tipo',         tipo_ingreso,
        'sede_id',      sede_id,
        'duracion_min', EXTRACT(EPOCH FROM (
            COALESCE(fecha_hora_salida, NOW()) - fecha_hora_ingreso
        ))/60,
        'es_final',     es_ingreso_final
    ) ORDER BY fecha_hora_ingreso), '[]'::jsonb)
    INTO v_ingresos
    FROM ingreso_sede
    WHERE salida_unidad_id = p_salida_id;

    -- Tripulación (snapshot tomado al salir, guardado en salida_unidad.tripulacion)
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object(
            'usuario_id', (elem->>'brigada_id')::INTEGER,
            'rol',        UPPER(elem->>'rol')
        )) FILTER (WHERE elem->>'brigada_id' IS NOT NULL),
        '[]'::jsonb
    )
    INTO v_tripulacion
    FROM jsonb_array_elements(COALESCE(v_salida.tripulacion, '[]'::jsonb)) elem;

    -- Contadores de situaciones
    SELECT
        COUNT(*) FILTER (WHERE tipo_situacion = 'INCIDENTE')                             AS incidentes,
        COUNT(*) FILTER (WHERE tipo_situacion = 'ASISTENCIA')                            AS asistencias,
        COUNT(*) FILTER (WHERE tipo_situacion = 'EMERGENCIA')                            AS emergencias,
        COUNT(*) FILTER (WHERE tipo_situacion IN ('REGULACION','REGULACION_TRANSITO'))   AS regulaciones,
        COUNT(*) FILTER (WHERE tipo_situacion = 'PATRULLAJE')                            AS patrullajes,
        COUNT(*)                                                                          AS total
    INTO v_contadores
    FROM situacion
    WHERE salida_unidad_id = p_salida_id;

    -- Insertar / actualizar snapshot
    INSERT INTO bitacora_historica (
        fecha, unidad_id, salida_id, asignacion_id,
        sede_origen_id, ruta_inicial_id,
        km_inicial, km_final, km_recorridos,
        combustible_inicial, combustible_final,
        hora_inicio, hora_fin, duracion_minutos,
        tripulacion_ids,
        situaciones_resumen, total_situaciones,
        actividades_resumen, total_actividades,
        ingresos_resumen,    total_ingresos,
        total_incidentes, total_asistencias, total_emergencias,
        total_regulaciones, total_patrullajes,
        observaciones_inicio, observaciones_fin,
        finalizado_por
    ) VALUES (
        v_salida.fecha_jornada,
        v_salida.unidad_id,
        p_salida_id,
        v_salida.asignacion_id,
        v_salida.sede_origen_id,
        v_salida.ruta_inicial_id,
        v_salida.km_inicial,
        v_salida.km_final,
        v_salida.km_recorridos,
        v_salida.combustible_inicial,
        v_salida.combustible_final,
        v_salida.fecha_hora_salida,
        v_salida.fecha_hora_regreso,
        EXTRACT(EPOCH FROM (
            COALESCE(v_salida.fecha_hora_regreso, NOW()) - v_salida.fecha_hora_salida
        ))/60,
        v_tripulacion,
        v_situaciones,
        COALESCE(v_contadores.total, 0),
        v_actividades,
        (SELECT COUNT(*) FROM actividad WHERE salida_unidad_id = p_salida_id),
        v_ingresos,
        (SELECT COUNT(*) FROM ingreso_sede WHERE salida_unidad_id = p_salida_id),
        COALESCE(v_contadores.incidentes,   0),
        COALESCE(v_contadores.asistencias,  0),
        COALESCE(v_contadores.emergencias,  0),
        COALESCE(v_contadores.regulaciones, 0),
        COALESCE(v_contadores.patrullajes,  0),
        v_salida.observaciones_salida,
        v_salida.observaciones_regreso,
        p_finalizado_por
    )
    ON CONFLICT (fecha, unidad_id)
    DO UPDATE SET
        salida_id           = EXCLUDED.salida_id,
        asignacion_id       = EXCLUDED.asignacion_id,
        km_final            = EXCLUDED.km_final,
        km_recorridos       = EXCLUDED.km_recorridos,
        combustible_final   = EXCLUDED.combustible_final,
        hora_fin            = EXCLUDED.hora_fin,
        duracion_minutos    = EXCLUDED.duracion_minutos,
        situaciones_resumen = EXCLUDED.situaciones_resumen,
        total_situaciones   = EXCLUDED.total_situaciones,
        actividades_resumen = EXCLUDED.actividades_resumen,
        total_actividades   = EXCLUDED.total_actividades,
        ingresos_resumen    = EXCLUDED.ingresos_resumen,
        total_ingresos      = EXCLUDED.total_ingresos,
        total_incidentes    = EXCLUDED.total_incidentes,
        total_asistencias   = EXCLUDED.total_asistencias,
        total_emergencias   = EXCLUDED.total_emergencias,
        total_regulaciones  = EXCLUDED.total_regulaciones,
        total_patrullajes   = EXCLUDED.total_patrullajes,
        observaciones_fin   = EXCLUDED.observaciones_fin,
        finalizado_por      = EXCLUDED.finalizado_por
    RETURNING id INTO v_bitacora_id;

    RETURN v_bitacora_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Función de reconstrucción
--    Permite borrar bitacora_historica y regenerarla desde los datos fuente.
--    Solo funciona para salidas FINALIZADAS que siguen en salida_unidad.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reconstruir_bitacora_historica(
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin    DATE DEFAULT NULL
) RETURNS TABLE(reconstruidos integer, mensaje text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_salida    RECORD;
    v_count     INTEGER := 0;
    v_fecha_ini DATE := COALESCE(p_fecha_inicio, '2024-01-01');
    v_fecha_fin DATE := COALESCE(p_fecha_fin, CURRENT_DATE);
BEGIN
    FOR v_salida IN
        SELECT su.id, su.finalizada_por
        FROM salida_unidad su
        WHERE su.estado = 'FINALIZADA'
          AND DATE(su.fecha_hora_salida AT TIME ZONE 'America/Guatemala')
              BETWEEN v_fecha_ini AND v_fecha_fin
        ORDER BY su.fecha_hora_salida
    LOOP
        BEGIN
            PERFORM crear_snapshot_bitacora(v_salida.id, v_salida.finalizada_por);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Continuar aunque una salida falle (datos corruptos, etc.)
            NULL;
        END;
    END LOOP;

    RETURN QUERY SELECT
        v_count,
        format('Reconstruidas %s entradas de bitácora entre %s y %s.',
               v_count, v_fecha_ini, v_fecha_fin)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.reconstruir_bitacora_historica(DATE, DATE) IS
'Regenera bitacora_historica desde las tablas operacionales (salida_unidad, situacion, actividad, ingreso_sede). Útil si se borra o corrompe la tabla de snapshots. Solo procesa salidas con estado=FINALIZADA que existan en salida_unidad.';
