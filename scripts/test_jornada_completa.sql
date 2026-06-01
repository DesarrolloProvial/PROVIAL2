-- Test completo: simula jornada COP emergencia + finaliza + destruye bitacora + reconstruye
-- Uso: psql $DATABASE_URL -f scripts/test_jornada_completa.sql
-- Todo en una transaccion — ROLLBACK al final para no contaminar produccion

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- FASE 1: Crear datos de jornada
-- Unidad 382 (006), Sede 4 (San Cristobal), Ruta 71 (CA-1 Oriente)
-- COP: 1855, Brigadas: 1865, 293
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_turno_id      INTEGER;
    v_asig_id       INTEGER;
    v_salida_id     INTEGER;
    v_sit_inc_id    BIGINT;
    v_sit_pat_id    BIGINT;
    v_act_id        BIGINT;
    v_ingreso_id    INTEGER;
    v_bitacora_id   BIGINT;

    -- Snapshot antes de destruir
    r_original      bitacora_historica%ROWTYPE;
    r_reconstruida  bitacora_historica%ROWTYPE;

    v_ok            BOOLEAN;
    v_msg           TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE 'FASE 1: Creando datos de jornada (emergencia COP)';
    RAISE NOTICE '══════════════════════════════════════════════════════';

    -- 1. Turno de emergencia para hoy, sede 4
    INSERT INTO turno (fecha, sede_id, estado, publicado, publicado_por, creado_por)
    VALUES (CURRENT_DATE, 4, 'ACTIVO', true, 1855, 1855)
    RETURNING id INTO v_turno_id;
    RAISE NOTICE 'Turno creado: %', v_turno_id;

    -- 2. Asignacion
    INSERT INTO asignacion_unidad (turno_id, unidad_id, ruta_id, tipo_asignacion, km_inicio)
    VALUES (v_turno_id, 382, 71, 'PATRULLA', 5500)
    RETURNING id INTO v_asig_id;
    RAISE NOTICE 'Asignacion creada: %', v_asig_id;

    -- 3. Tripulacion
    INSERT INTO tripulacion_turno (asignacion_id, usuario_id, rol_tripulacion, es_comandante)
    VALUES (v_asig_id, 1865, 'PILOTO',   true),
           (v_asig_id, 293,  'COPILOTO', false);
    RAISE NOTICE 'Tripulacion registrada: 2 integrantes';

    -- 4. Iniciar salida (la PG fn lee la tripulacion recien creada)
    SELECT iniciar_salida_unidad(382, 71, 5500, 0.75, 'Test emergencia COP')
    INTO v_salida_id;
    RAISE NOTICE 'Salida iniciada: salida_id=%', v_salida_id;

    -- 5. Vincular salida con asignacion
    UPDATE salida_unidad
    SET asignacion_id = v_asig_id, origen = 'COP_EMERGENCIA'
    WHERE id = v_salida_id;

    UPDATE asignacion_unidad SET hora_salida_real = NOW() WHERE id = v_asig_id;
    RAISE NOTICE 'asignacion_id vinculado en salida_unidad';

    RAISE NOTICE '';
    RAISE NOTICE '── Registrando situaciones y actividades ──';

    -- 6a. Situacion INCIDENTE (Choque - catalogo 127)
    INSERT INTO situacion (
        codigo_situacion, tipo_situacion, tipo_situacion_id,
        unidad_id, salida_unidad_id, ruta_id, creado_por,
        km, sentido, estado
    ) VALUES (
        'TEST-INC-001', 'INCIDENTE', 127,
        382, v_salida_id, 71, 1855,
        5502, 'NORTE', 'CERRADA'
    ) RETURNING id INTO v_sit_inc_id;
    RAISE NOTICE 'Situacion INCIDENTE creada: id=%', v_sit_inc_id;

    -- 6b. Situacion PATRULLAJE (catalogo 50)
    INSERT INTO situacion (
        codigo_situacion, tipo_situacion, tipo_situacion_id,
        unidad_id, salida_unidad_id, ruta_id, creado_por,
        km, sentido, estado
    ) VALUES (
        'TEST-PAT-001', 'PATRULLAJE', 50,
        382, v_salida_id, 71, 1865,
        5501, 'NORTE', 'CERRADA'
    ) RETURNING id INTO v_sit_pat_id;
    RAISE NOTICE 'Situacion PATRULLAJE creada: id=%', v_sit_pat_id;

    -- 7. Actividad (Parada Estrategica - catalogo 31)
    INSERT INTO actividad (
        codigo_actividad, tipo_actividad_id,
        unidad_id, salida_unidad_id, ruta_id, creado_por,
        km, sentido, estado, datos, observaciones
    ) VALUES (
        'TEST-ACT-001', 31,
        382, v_salida_id, 71, 1865,
        5502, 'NORTE', 'CERRADA',
        '{"conteo": 42}'::jsonb, '[]'::jsonb
    ) RETURNING id INTO v_act_id;
    RAISE NOTICE 'Actividad creada: id=%', v_act_id;

    -- 8. Ingreso a sede intermedio (combustible)
    INSERT INTO ingreso_sede (
        salida_unidad_id, sede_id, tipo_ingreso, es_ingreso_final,
        fecha_hora_ingreso, fecha_hora_salida, registrado_por, km_ingreso
    ) VALUES (
        v_salida_id, 4, 'COMBUSTIBLE', false,
        NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes',
        1865, 5502
    ) RETURNING id INTO v_ingreso_id;
    RAISE NOTICE 'Ingreso a sede creado: id=%', v_ingreso_id;

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE 'FASE 2: Finalizar jornada';
    RAISE NOTICE '══════════════════════════════════════════════════════';

    -- 9. Finalizar jornada
    SELECT success, bitacora_id, mensaje
    INTO v_ok, v_bitacora_id, v_msg
    FROM finalizar_jornada_completa(v_salida_id, 5510, 0.25, 'Fin test', 1855);

    RAISE NOTICE 'finalizar_jornada_completa: ok=%, bitacora_id=%, msg=%',
        v_ok, v_bitacora_id, v_msg;

    RAISE NOTICE '';
    RAISE NOTICE '── Verificando que los datos se conservaron ──';

    -- Verificar que salida_unidad quedo como FINALIZADA (no borrada)
    PERFORM id FROM salida_unidad WHERE id = v_salida_id AND estado = 'FINALIZADA';
    IF FOUND THEN
        RAISE NOTICE 'OK salida_unidad id=% -> FINALIZADA (no borrada)', v_salida_id;
    ELSE
        RAISE NOTICE 'ERROR: salida_unidad no encontrada o estado incorrecto';
    END IF;

    -- Verificar situaciones
    PERFORM id FROM situacion WHERE id = v_sit_inc_id AND salida_unidad_id = v_salida_id;
    IF FOUND THEN
        RAISE NOTICE 'OK situacion INCIDENTE id=% -> conservada con salida_unidad_id intacto', v_sit_inc_id;
    ELSE
        RAISE NOTICE 'ERROR: situacion INCIDENTE no encontrada';
    END IF;

    PERFORM id FROM situacion WHERE id = v_sit_pat_id AND salida_unidad_id = v_salida_id;
    IF FOUND THEN
        RAISE NOTICE 'OK situacion PATRULLAJE id=% -> conservada (antes se borraba!)', v_sit_pat_id;
    ELSE
        RAISE NOTICE 'ERROR: situacion PATRULLAJE no encontrada';
    END IF;

    -- Verificar actividades
    PERFORM id FROM actividad WHERE id = v_act_id AND salida_unidad_id = v_salida_id;
    IF FOUND THEN
        RAISE NOTICE 'OK actividad id=% -> conservada con FK intacta', v_act_id;
    ELSE
        RAISE NOTICE 'ERROR: actividad no encontrada';
    END IF;

    -- Verificar ingreso_sede conservado
    PERFORM id FROM ingreso_sede WHERE id = v_ingreso_id;
    IF FOUND THEN
        RAISE NOTICE 'OK ingreso_sede id=% -> conservado (antes se borraba!)', v_ingreso_id;
    ELSE
        RAISE NOTICE 'ERROR: ingreso_sede no encontrado';
    END IF;

    -- Verificar turno quedo CERRADO (no borrado)
    PERFORM id FROM turno WHERE id = v_turno_id AND estado = 'CERRADO';
    IF FOUND THEN
        RAISE NOTICE 'OK turno id=% -> CERRADO (no borrado)', v_turno_id;
    ELSE
        RAISE NOTICE 'ERROR: turno no encontrado o no cerrado';
    END IF;

    -- Guardar snapshot original para comparar
    SELECT * INTO r_original FROM bitacora_historica WHERE id = v_bitacora_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Snapshot bitacora_historica original (id=%):',  v_bitacora_id;
    RAISE NOTICE '  fecha=%  unidad_id=%  salida_id=%  asignacion_id=%',
        r_original.fecha, r_original.unidad_id, r_original.salida_id, r_original.asignacion_id;
    RAISE NOTICE '  km: %->%  (%km recorridos)',
        r_original.km_inicial, r_original.km_final, r_original.km_recorridos;
    RAISE NOTICE '  total_situaciones=%  total_actividades=%  total_ingresos=%',
        r_original.total_situaciones, r_original.total_actividades, r_original.total_ingresos;
    RAISE NOTICE '  situaciones_resumen: %', r_original.situaciones_resumen;
    RAISE NOTICE '  actividades_resumen: %', r_original.actividades_resumen;
    RAISE NOTICE '  ingresos_resumen: %', r_original.ingresos_resumen;

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE 'FASE 3: Destruir bitacora_historica y reconstruir';
    RAISE NOTICE '══════════════════════════════════════════════════════';

    -- Borrar el snapshot
    DELETE FROM bitacora_historica WHERE id = v_bitacora_id;
    PERFORM id FROM bitacora_historica WHERE id = v_bitacora_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'OK bitacora_historica id=% ELIMINADA', v_bitacora_id;
    ELSE
        RAISE NOTICE 'ERROR: no se elimino';
    END IF;

    -- Reconstruir desde datos operacionales
    PERFORM reconstruir_bitacora_historica(CURRENT_DATE, CURRENT_DATE);
    RAISE NOTICE 'reconstruir_bitacora_historica() ejecutado';

    -- Verificar que existe de nuevo
    SELECT * INTO r_reconstruida
    FROM bitacora_historica
    WHERE salida_id = v_salida_id;

    IF r_reconstruida IS NULL THEN
        RAISE NOTICE 'ERROR: bitacora no fue reconstruida';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '── COMPARACION ORIGINAL vs RECONSTRUIDA ──';
        RAISE NOTICE 'fecha:              % = % -> %',
            r_original.fecha = r_reconstruida.fecha,
            r_original.fecha, r_reconstruida.fecha;
        RAISE NOTICE 'salida_id:          % = % -> %',
            r_original.salida_id = r_reconstruida.salida_id,
            r_original.salida_id, r_reconstruida.salida_id;
        RAISE NOTICE 'asignacion_id:      % = % -> %',
            r_original.asignacion_id = r_reconstruida.asignacion_id,
            r_original.asignacion_id, r_reconstruida.asignacion_id;
        RAISE NOTICE 'km_inicial:         % = % -> %',
            r_original.km_inicial = r_reconstruida.km_inicial,
            r_original.km_inicial, r_reconstruida.km_inicial;
        RAISE NOTICE 'km_final:           % = % -> %',
            r_original.km_final = r_reconstruida.km_final,
            r_original.km_final, r_reconstruida.km_final;
        RAISE NOTICE 'combustible_ini:    % = % -> %',
            r_original.combustible_inicial = r_reconstruida.combustible_inicial,
            r_original.combustible_inicial, r_reconstruida.combustible_inicial;
        RAISE NOTICE 'total_situaciones:  % = % -> %',
            r_original.total_situaciones = r_reconstruida.total_situaciones,
            r_original.total_situaciones, r_reconstruida.total_situaciones;
        RAISE NOTICE 'total_actividades:  % = % -> %',
            r_original.total_actividades = r_reconstruida.total_actividades,
            r_original.total_actividades, r_reconstruida.total_actividades;
        RAISE NOTICE 'total_ingresos:     % = % -> %',
            r_original.total_ingresos = r_reconstruida.total_ingresos,
            r_original.total_ingresos, r_reconstruida.total_ingresos;
        RAISE NOTICE 'total_incidentes:   % = % -> %',
            r_original.total_incidentes = r_reconstruida.total_incidentes,
            r_original.total_incidentes, r_reconstruida.total_incidentes;
        RAISE NOTICE 'situaciones_resumen igual: %',
            r_original.situaciones_resumen = r_reconstruida.situaciones_resumen;
        RAISE NOTICE 'actividades_resumen igual: %',
            r_original.actividades_resumen = r_reconstruida.actividades_resumen;
        RAISE NOTICE 'ingresos_resumen igual:    %',
            r_original.ingresos_resumen = r_reconstruida.ingresos_resumen;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════';
    RAISE NOTICE 'FASE 4: ROLLBACK — datos de prueba eliminados';
    RAISE NOTICE '══════════════════════════════════════════════════════';

END;
$$;

ROLLBACK;
